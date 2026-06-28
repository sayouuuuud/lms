'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { UploadButton } from '@/lib/uploadthing'
import { cn } from '@/lib/utils'

// Reusable image picker used by the admin curriculum forms. Shows a preview of
// the current image (URL string) and an UploadThing button to replace it.
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
    <div className="space-y-1.5">
      <label className="block text-right text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="flex items-center gap-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary/60">
          {value ? (
            <>
              <Image
                src={value}
                alt="معاينة"
                fill
                sizes="80px"
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
              <ImagePlus className="size-6" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <UploadButton
            endpoint="curriculumImage"
            onUploadBegin={() => setUploading(true)}
            onClientUploadComplete={(res) => {
              setUploading(false)
              const url = res?.[0]?.url
              if (url) {
                onChange(url)
                toast.success('تم رفع الصورة')
              }
            }}
            onUploadError={(e) => {
              setUploading(false)
              toast.error('فشل رفع الصورة. حاول تاني.')
              console.log('[v0] image upload error:', e.message)
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
                'رفع صورة'
              ),
            }}
          />
          {hint && (
            <p className="mt-1.5 text-right text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
      </div>
    </div>
  )
}
