'use client'

/**
 * lib/upload-to-r2.ts — رفع أي ملف من المتصفح مباشرةً إلى Cloudflare R2
 * الخطوات: server action تجيب presigned PUT → XHR يرفع الملف → نرجّع رابط العرض.
 */

import { getMediaUploadUrl } from '@/lib/media-actions'
import { MEDIA_KINDS, formatMaxSize, type MediaKind } from '@/lib/media-kinds'

export type UploadedMedia = { url: string; key: string; name: string }

export async function uploadToR2(
  file: File,
  kind: MediaKind,
  options?: { onProgress?: (percent: number) => void },
): Promise<UploadedMedia> {
  const config = MEDIA_KINDS[kind]

  if (!config.accept.some((prefix) => file.type.startsWith(prefix))) {
    throw new Error(`نوع الملف غير مسموح لـ ${config.label}`)
  }
  if (file.size > config.maxSize) {
    throw new Error(`حجم الملف أكبر من ${formatMaxSize(config.maxSize)}`)
  }

  const ticket = await getMediaUploadUrl(kind, file.name, file.type, file.size)
  if ('error' in ticket) throw new Error(ticket.error)

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', ticket.uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) options?.onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`فشل الرفع إلى R2 (HTTP ${xhr.status})`))
    xhr.onerror = () => reject(new Error('انقطع الاتصال أثناء الرفع'))
    xhr.send(file)
  })

  options?.onProgress?.(100)
  return { url: ticket.url, key: ticket.key, name: file.name }
}
