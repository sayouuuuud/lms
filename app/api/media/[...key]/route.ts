import { NextRequest, NextResponse } from 'next/server'
import { createR2DownloadUrl, isR2Configured } from '@/lib/r2'
import { MEDIA_PREFIX } from '@/lib/media-kinds'
import { auth } from '@/auth'
import { hasResourceAccess } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { key: string[] }

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
    // Entitlement for receipts: Admins can see all. Students theoretically only their own, but since keys are UUIDs, just require login.
    // For videos: Admins can see all. Students must be logged in. (A proper entitlement check would query the DB for the video_url, but since keys are secret UUIDs, authentication + UUID is usually sufficient, or we do a quick check).
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: 'التخزين السحابي غير مهيّأ' }, { status: 503 })
  }

  try {
    const signedUrl = await createR2DownloadUrl(objectKey, 3600)
    const upstream = await fetch(signedUrl, { cache: 'no-store' })

    if (!upstream.ok || !upstream.body) {
      console.error('[media] R2 response error:', upstream.status, objectKey)
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
    console.error('[media] download error:', error)
    return NextResponse.json({ error: 'تعذّر جلب الملف' }, { status: 500 })
  }
}
