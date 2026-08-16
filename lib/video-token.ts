import 'server-only'
import crypto from 'node:crypto'
import { prisma } from '@/lib/prisma'

// ─────────────────────────────────────────────────────────────────────────────
// Secure video playback tokens
//
// The real video file (on Cloudflare R2) is never exposed to the browser. Instead
// the player receives a short-lived, signed token that is redeemed through the
// streaming proxy (`/api/lectures/[lessonId]/stream`). The token is bound to:
//   • the lesson id
//   • the student's auth user id
//   • a random session id ("sid") that is reused for one short playback window
//
// The sid is stored in `lecture_playback_sessions`. Reusing an unexpired sid
// prevents duplicate server renders of the same lesson from invalidating the
// URL that was already handed to the browser. A copied link remains useless
// without the student's login cookie.
// ─────────────────────────────────────────────────────────────────────────────

// never reaches the client.
const SECRET =
  process.env.VIDEO_TOKEN_SECRET ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXTAUTH_SECRET ??
  ''

// Token lifetime. Long enough for a full lecture, short enough to limit misuse.
const TOKEN_TTL_SECONDS = 3 * 60 * 60 // 3 hours

export type VideoTokenPayload = {
  /** lessons.id (UUID) */
  lessonId: string
  /** auth user id of the student the token was issued to */
  userId: string
  /** random per-open session id — must match the latest stored sid */
  sid: string
  /** expiry (unix seconds) */
  exp: number
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlToBuffer(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

function sign(data: string): string {
  return b64url(crypto.createHmac('sha256', SECRET).update(data).digest())
}

/** Signs a payload into a compact `payload.signature` token. */
export function signVideoToken(payload: VideoTokenPayload): string {
  const body = b64url(JSON.stringify(payload))
  return `${body}.${sign(body)}`
}

/** Verifies signature + expiry. Returns the payload or null if invalid. */
export function verifyVideoToken(token: string | null | undefined): VideoTokenPayload | null {
  if (!token || !SECRET) return null
  const dot = token.indexOf('.')
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  // Constant-time signature comparison.
  const expected = sign(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  let payload: VideoTokenPayload
  try {
    payload = JSON.parse(b64urlToBuffer(body).toString('utf8'))
  } catch {
    return null
  }
  if (!payload?.lessonId || !payload?.userId || !payload?.sid || !payload?.exp) {
    return null
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

/**
 * Returns a signed playback token for a short session window.
 *
 * A page can be rendered more than once while the player is mounting. Rotating
 * the sid on every render made the first URL stale and caused `/api/hls` to
 * reject the request with 401. Reuse the current sid until its window expires,
 * then rotate it. The route still requires the matching logged-in user cookie.
 */
export async function createPlaybackToken(
  userId: string,
  lessonId: string,
): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const existing: Array<{ sid: string; updated_at: Date }> = await prisma.$queryRaw`
    SELECT sid, updated_at
    FROM lecture_playback_sessions
    WHERE user_id = ${userId}::uuid AND lesson_id = ${lessonId}::uuid
  `

  const current = existing[0]
  if (current) {
    const expiresAt = Math.floor(new Date(current.updated_at).getTime() / 1000) + TOKEN_TTL_SECONDS
    if (expiresAt > nowSeconds) {
      return signVideoToken({ lessonId, userId, sid: current.sid, exp: expiresAt })
    }
  }

  const sid = crypto.randomBytes(16).toString('hex')
  const now = new Date()
  await prisma.$executeRaw`
    INSERT INTO lecture_playback_sessions (user_id, lesson_id, sid, updated_at)
    VALUES (${userId}::uuid, ${lessonId}::uuid, ${sid}, ${now})
    ON CONFLICT (user_id, lesson_id)
    DO UPDATE SET sid = EXCLUDED.sid, updated_at = EXCLUDED.updated_at
  `
  const exp = nowSeconds + TOKEN_TTL_SECONDS
  return signVideoToken({ lessonId, userId, sid, exp })
}

/** Returns true only if the token's sid matches the latest stored session. */
export async function isLatestSession(
  userId: string,
  lessonId: string,
  sid: string,
): Promise<boolean> {
  const data: any[] = await prisma.$queryRaw`
    SELECT sid FROM lecture_playback_sessions
    WHERE user_id = ${userId}::uuid AND lesson_id = ${lessonId}::uuid
  `
  return data.length > 0 && data[0].sid === sid
}
