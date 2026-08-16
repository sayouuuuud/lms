'use client'

import { useRef, useState } from 'react'
import { Check, Loader2, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { uploadToR2 } from '@/lib/upload-to-r2'
import { cn } from '@/lib/utils'

/**
 * منطقة سحب/اختيار لرفع إيصال التحويل مباشرةً إلى Cloudflare R2.
 * بديل UploadDropzone من UploadThing.
 */
export function ReceiptDropzone({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (url: string) => void
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('من فضلك ارفع صورة من إيصال التحويل')
      return
    }
    setUploading(true)
    setProgress(0)
    try {
      const { url } = await uploadToR2(file, 'receipt', { onProgress: setProgress })
      onChange(url)
      toast.success('تم رفع صورة الإيصال')
    } catch (e) {
      toast.error(`فشل الرفع: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`)
    } finally {
      setUploading(false)
      setProgress(0)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={className}>
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
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void handleFile(e.dataTransfer.files?.[0])
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors',
          dragging ? 'border-primary bg-primary/10' : 'border-border bg-secondary/30 hover:bg-secondary/60',
          uploading && 'cursor-not-allowed opacity-70',
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="size-7 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              {progress > 0 ? `جاري الرفع... ${progress}%` : 'جاري الرفع...'}
            </span>
          </>
        ) : value ? (
          <>
            <Check className="size-7 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-600">تم رفع الصورة بنجاح</span>
            <span className="text-xs text-muted-foreground">اضغط لاختيار صورة أخرى</span>
          </>
        ) : (
          <>
            <UploadCloud className="size-7 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">اسحب الصورة هنا أو اضغط للاختيار</span>
            <span className="text-xs text-muted-foreground">JPG أو PNG (أقل من 8 MB)</span>
          </>
        )}
      </button>
    </div>
  )
}
