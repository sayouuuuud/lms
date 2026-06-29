'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { ImagePlus, X, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { uploadToStorage } from '@/lib/storage-upload'
import { cn } from '@/lib/utils'

// Reusable image picker used by the admin curriculum forms. Shows a preview of
// the current image (URL string) and uploads new files directly to Supabase
// Storage (no server callback needed, so it works in preview/sandbox).
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
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('من فضلك اختر ملف صورة')
      return
    }
    setUploading(true)
    try {
      const url = await uploadToStorage(file, 'images')
      onChange(url)
      toast.success('تم رفع الصورة')
    } catch (e) {
      toast.error(`فشل الرفع: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`)
    } finally {
      setUploading(false)
    }
  }

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
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
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
                <span className="text-sm text-muted-foreground">جاري الرفع...</span>
              </>
            ) : (
              <>
                <Upload className="size-7 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  اختر صورة لرفعها
                </span>
                <span className="text-xs text-muted-foreground">
                  JPG أو PNG أو WebP (أقل من 8 MB)
                </span>
              </>
            )}
          </button>
          {hint && (
            <p className="mt-2 text-right text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
      </div>
    </div>
  )
}
