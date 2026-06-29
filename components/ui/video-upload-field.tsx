'use client'

import { useRef, useState } from 'react'
import { Film, Loader2, X, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { uploadToStorage } from '@/lib/storage-upload'
import { cn } from '@/lib/utils'

// Reusable video picker for the admin lesson editor. Uploads a video file
// directly to Supabase Storage and stores the resulting URL via `onChange`.
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
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('video/')) {
      toast.error('من فضلك اختر ملف فيديو')
      return
    }
    setUploading(true)
    try {
      const url = await uploadToStorage(file, 'videos')
      onChange(url)
      toast.success('تم رفع الفيديو')
    } catch (e) {
      toast.error(`فشل الرفع: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`)
    } finally {
      setUploading(false)
    }
  }

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

      {/* Upload via file picker or URL */}
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-6 text-center transition-colors hover:bg-secondary/60',
            uploading && 'cursor-not-allowed opacity-70',
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-7 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                جاري رفع الفيديو... قد يستغرق دقيقة
              </span>
            </>
          ) : (
            <>
              <Upload className="size-7 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                اختر فيديو لرفعه
              </span>
              <span className="text-xs text-muted-foreground">
                MP4 أو MOV أو WebM (أقل من 500 MB)
              </span>
            </>
          )}
        </button>
      </div>

      {hint && (
        <p className="text-right text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
