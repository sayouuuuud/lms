'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ImagePlus, X, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { UploadDropzone } from '@/lib/uploadthing'

// Reusable image picker used by the admin curriculum forms. Shows a preview of
// the current image (URL string) and an upload zone to replace it.
export function ImageUploadField({
  value,
  onChange,
  label = 'الصورة',
  hint,
}: {
  value: string
  onChange: (url: string) => void
  label?: string
  hint?: string
}) {
  const [uploading, setUploading] = useState(false)

  return (
    <div className="space-y-3">
      <label className="block text-right text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Preview thumbnail */}
        <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary/60">
          {value ? (
            <>
              <Image
                src={value}
                alt="معاينة"
                fill
                sizes="96px"
                className="object-contain p-1"
              />
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-background/90 text-muted-foreground shadow hover:text-destructive"
                aria-label="إزالة الصورة"
              >
                <X className="size-3" />
              </button>
            </>
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImagePlus className="size-8" />
            </div>
          )}
        </div>

        {/* Upload zone */}
        <div className="flex-1">
          <UploadDropzone
            endpoint="curriculumImage"
            onUploadBegin={() => setUploading(true)}
            onClientUploadComplete={(res) => {
              setUploading(false)
              console.log('[v0] upload response:', res)
              try {
                // UploadThing returns an array-like response or single object
                const fileData = Array.isArray(res) ? res[0] : res
                const url = fileData?.url || fileData?.serverData?.url
                if (url) {
                  onChange(url)
                  toast.success('تم رفع الصورة')
                } else {
                  console.error('[v0] no URL in response:', fileData)
                  toast.error('لم نتمكن من الحصول على رابط الصورة')
                }
              } catch (err) {
                console.error('[v0] upload complete error:', err)
                toast.error('خطأ في معالجة الرفع')
              }
            }}
            onUploadError={(e) => {
              setUploading(false)
              console.error('[v0] upload error:', e)
              toast.error(`فشل الرفع: ${e?.message || 'خطأ غير معروف'}`)
            }}
            appearance={{
              label: 'text-sm text-muted-foreground',
              allowedContent: 'text-xs text-muted-foreground',
              button: 'ut-btn-upload:bg-primary ut-btn-upload:text-primary-foreground ut-btn-upload:hover:bg-primary/90',
            }}
            content={{
              label: uploading
                ? 'جاري الرفع... يرجى الانتظار'
                : 'اسحب الصورة هنا أو انقر لتحديد ملف',
              allowedContent: uploading ? '' : 'JPG أو PNG (أقل من 8 MB)',
              uploadIcon: !uploading ? <Upload className="size-8" /> : <Loader2 className="size-8 animate-spin" />,
            }}
          />
          {hint && (
            <p className="mt-2 text-right text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
      </div>
    </div>
  )
}
