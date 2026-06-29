'use client'

import { useState } from 'react'
import { Film, Loader2, X, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { UploadButton } from '@/lib/uploadthing'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Reusable video picker for the admin lesson editor. Supports both uploading a
// video file (UploadThing) and pasting a direct video URL. Stores the final URL
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

      {/* Upload button */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UploadButton
          endpoint="lessonVideo"
          onUploadBegin={() => setUploading(true)}
          onClientUploadComplete={(res) => {
            setUploading(false)
            const url = res?.[0]?.url
            if (url) {
              onChange(url)
              toast.success('تم رفع الفيديو')
            }
          }}
          onUploadError={(e) => {
            setUploading(false)
            toast.error('فشل رفع الفيديو. حاول تاني.')
            console.log('[v0] video upload error:', e.message)
          }}
          appearance={{
            button: cn(
              'h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground',
              'ut-uploading:cursor-not-allowed ut-uploading:opacity-70',
            ),
            allowedContent: 'text-xs text-muted-foreground',
          }}
          content={{
            button: uploading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" /> جاري الرفع...
              </span>
            ) : (
              'رفع فيديو'
            ),
          }}
        />
        <span className="text-xs text-muted-foreground">أو</span>
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="الصق رابط فيديو مباشر (mp4)"
            className="pr-9"
            dir="ltr"
          />
        </div>
      </div>

      {hint && (
        <p className="text-right text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
