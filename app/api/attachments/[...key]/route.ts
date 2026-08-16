import { type NextRequest, NextResponse } from 'next/server'
import { createR2DownloadUrl, r2ObjectExists } from '@/lib/r2'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { key: string[] }

/**
 * GET /api/attachments/<object-name>
 *
 * روابط المرفقات المحفوظة في قاعدة البيانات تكون بالشكل:
 * /api/attachments/<uuid>.
 * وبما أن [...key] تحتوي فقط على الجزء بعد /api/attachments،
 * يجب إضافة بادئة attachments/ قبل الوصول إلى R2.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<Params> },
): Promise<Response> {
  const { key } = await context.params
  const routeKey = key.join('/')

  if (!routeKey || routeKey.includes('..') || routeKey.startsWith('/')) {
    return NextResponse.json({ error: 'المسار غير صحيح' }, { status: 400 })
  }

  // دعم الروابط القديمة والجديدة دون تغيير أي ملف مرفوع.
  const objectKey = routeKey.startsWith('attachments/')
    ? routeKey
    : `attachments/${routeKey}`

  try {
    if (!(await r2ObjectExists(objectKey))) {
      return NextResponse.json({ error: 'الملف غير موجود' }, { status: 404 })
    }

    const signedUrl = await createR2DownloadUrl(objectKey, 3600)
    const upstream = await fetch(signedUrl, { cache: 'no-store' })

    if (!upstream.ok || !upstream.body) {
      console.error('[attachments] R2 response error:', upstream.status, objectKey)
      return NextResponse.json({ error: 'تعذّر جلب الملف' }, { status: upstream.status || 502 })
    }

    const headers = new Headers()
    headers.set('Content-Type', upstream.headers.get('content-type') ?? contentTypeFor(objectKey))
    headers.set('Content-Disposition', 'inline')
    headers.set('Cache-Control', 'private, max-age=3600')

    const length = upstream.headers.get('content-length')
    if (length) headers.set('Content-Length', length)

    return new Response(upstream.body, { status: 200, headers })
  } catch (error) {
    console.error('[attachments] Download error:', error)
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب الملف' }, { status: 500 })
  }
}

function contentTypeFor(objectKey: string): string {
  const ext = objectKey.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'svg') return 'image/svg+xml'
  return 'application/octet-stream'
}
