import { NextRequest, NextResponse } from 'next/server'
import { createR2DownloadUrl, isR2Configured } from '@/lib/r2'
import { MEDIA_PREFIX } from '@/lib/media-kinds'
import { auth } from '@/auth'
import fs from 'node:fs'
import path from 'node:path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { key: string[] }

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.png': return 'image/png'
    case '.webp': return 'image/webp'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.svg': return 'image/svg+xml'
    case '.gif': return 'image/gif'
    case '.mp4': return 'video/mp4'
    case '.pdf': return 'application/pdf'
    default: return 'application/octet-stream'
  }
}

function serveLocalFallback(key: string[]): Response | null {
  const publicDir = path.join(process.cwd(), 'public')
  const kind = key[0] || ''
  const filename = key[key.length - 1] || ''

  const candidatePaths: string[] = []

  // Check direct paths inside public
  candidatePaths.push(path.join(publicDir, ...key))
  if (key.length > 1) {
    candidatePaths.push(path.join(publicDir, ...key.slice(1)))
  }

  // Kind-specific fallbacks
  if (kind === 'instructor' || kind === 'teachers' || kind === 'avatar' || kind === 'avatars') {
    candidatePaths.push(
      path.join(publicDir, 'teacher-abdelsalam.webp'),
      path.join(publicDir, 'teacher-abdelsalam-dark.webp'),
      path.join(publicDir, 'teacher-abdelsalam.png'),
      path.join(publicDir, 'teacher.webp'),
      path.join(publicDir, 'teacher.png'),
      path.join(publicDir, 'placeholder-user.jpg')
    )
  } else if (kind === 'stages') {
    candidatePaths.push(
      path.join(publicDir, 'stages', filename),
      path.join(publicDir, 'stages', 'sec-1.png'),
      path.join(publicDir, 'stage1-illustration.png'),
      path.join(publicDir, 'placeholder.jpg')
    )
  } else if (kind === 'courses') {
    candidatePaths.push(
      path.join(publicDir, 'courses', filename),
      path.join(publicDir, 'react-course.png'),
      path.join(publicDir, 'data-science-python-course.png'),
      path.join(publicDir, 'digital-marketing-course.png'),
      path.join(publicDir, 'ui-ux-design-course.png'),
      path.join(publicDir, 'placeholder.jpg')
    )
  } else if (kind === 'lectures') {
    candidatePaths.push(
      path.join(publicDir, 'lectures', filename),
      path.join(publicDir, 'lectures', 'chem-center.png'),
      path.join(publicDir, 'placeholder.jpg')
    )
  } else if (kind === 'lessons') {
    candidatePaths.push(
      path.join(publicDir, 'lessons', filename),
      path.join(publicDir, 'lessons', 'measurement.png'),
      path.join(publicDir, 'placeholder.jpg')
    )
  } else if (kind === 'logo' || kind === 'site' || kind === 'brand') {
    candidatePaths.push(
      path.join(publicDir, 'placeholder-logo.png'),
      path.join(publicDir, 'placeholder-logo.svg'),
      path.join(publicDir, 'icon.svg')
    )
  }

  // General image fallbacks
  candidatePaths.push(
    path.join(publicDir, 'placeholder.jpg'),
    path.join(publicDir, 'placeholder.svg'),
    path.join(publicDir, 'placeholder-user.jpg')
  )

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const stat = fs.statSync(p)
        if (stat.isFile()) {
          const buffer = fs.readFileSync(p)
          const headers = new Headers()
          headers.set('Content-Type', getMimeType(p))
          headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400')
          headers.set('Content-Length', String(buffer.length))
          return new Response(buffer, { status: 200, headers })
        }
      } catch {}
    }
  }

  return null
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<Params> },
): Promise<Response> {
  const { key } = await context.params
  const objectKey = `${MEDIA_PREFIX}${key.join('/')}`

  if (key.length === 0 || objectKey.includes('..')) {
    return NextResponse.json({ error: 'المسار غير صحيح' }, { status: 400 })
  }

  const kind = key[0]
  if (kind === 'videos' || kind === 'receipts') {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'غير مصرح لك بالوصول' }, { status: 401 })
    }
  }

  if (!isR2Configured()) {
    const localFallback = serveLocalFallback(key)
    if (localFallback) return localFallback
    return NextResponse.json({ error: 'التخزين السحابي غير مهيّأ' }, { status: 503 })
  }

  try {
    const signedUrl = await createR2DownloadUrl(objectKey, 3600)
    const upstream = await fetch(signedUrl, { cache: 'no-store' })

    if (!upstream.ok || !upstream.body) {
      console.warn('[media] R2 fetch error, attempting local fallback:', upstream.status, objectKey)
      const localFallback = serveLocalFallback(key)
      if (localFallback) return localFallback
      return NextResponse.json({ error: 'تعذّر جلب الملف' }, { status: upstream.status || 502 })
    }

    const headers = new Headers()
    headers.set('Content-Type', upstream.headers.get('content-type') ?? 'application/octet-stream')
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400')

    const length = upstream.headers.get('content-length')
    if (length) headers.set('Content-Length', length)

    const disposition = upstream.headers.get('content-disposition')
    if (disposition) headers.set('Content-Disposition', disposition)

    return new Response(upstream.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.warn('[media] download error, attempting local fallback:', error)
    const localFallback = serveLocalFallback(key)
    if (localFallback) return localFallback
    return NextResponse.json({ error: 'تعذّر جلب الملف' }, { status: 500 })
  }
}
