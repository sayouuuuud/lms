'use client'

import { useState } from 'react'
import { Film, Loader2, X, Link2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { UploadDropzone } from '@/lib/uploadthing'
import { Input } from '@/components/ui/input'

// Reusable video picker for the admin lesson editor. Supports both uploading a
// video file (UploadThing via drag-drop) and pasting a direct video URL. Stores the final URL
// as a plain string via `onChange`.
export function VideoUploadField({
  value,
  onChange,
  label = 'فيديو الدرس',
  hint,
}: {
  value: string
  onChange: (url: string) => void
  label?: string
  hint?: string
}) {
  const [uploading, setUploading] = useState(false)

  return (
    <div className="space-y-2">
      <label className="block text-right text-sm font-medium text-foreground">
        {label}
      </label>

      {/* Preview */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-secondary/40">
        {value ? (
          <>
            <video
              key={value}
              src={value}
              controls
              className="aspect-video w-full bg-black"
            />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-background/90 text-muted-foreground shadow hover:text-destructive"
              aria-label="إزالة الفيديو"
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Film className="size-8" />
            <p className="text-xs">لا يوجد فيديو بعد</p>
          </div>
        )}
      </div>

      {/* Upload via drag-drop or URL */}
      <div className="space-y-2">
        {/* Drag-drop zone */}
        <UploadDropzone
          endpoint="lessonVideo"
          onUploadBegin={() => setUploading(true)}
          onClientUploadComplete={(res) => {
            setUploading(false)
            console.log('[v0] video upload response:', res)
            try {
              // UploadThing returns an array-like response or single object
              const fileData = Array.isArray(res) ? res[0] : res
              const url = fileData?.url || fileData?.serverData?.url
              if (url) {
                onChange(url)
                toast.success('تم رفع الفيديو')
              } else {
                console.error('[v0] no URL in video response:', fileData)
                toast.error('لم نتمكن من الحصول على رابط الفيديو')
              }
            } catch (err) {
              console.error('[v0] video upload complete error:', err)
              toast.error('خطأ في معالجة الرفع')
            }
          }}
          onUploadError={(e) => {
            setUploading(false)
            console.error('[v0] video upload error:', e)
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
              : 'اسحب الفيديو هنا أو انقر لتحديد ملف',
            allowedContent: uploading
              ? ''
              : 'MP4 أو MOV أو WebM (أقل من 512 MB)',
            uploadIcon: !uploading ? <Upload className="size-8" /> : <Loader2 className="size-8 animate-spin" />,
          }}
        />

        {/* Direct URL input */}
        <div className="relative">
          <Link2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="أو الصق رابط فيديو مباشر (mp4)"
            className="pr-9"
            dir="ltr"
            disabled={uploading}
          />
        </div>
      </div>

      {hint && (
        <p className="text-right text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
