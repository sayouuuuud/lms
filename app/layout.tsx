import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cairo, Geist_Mono, Aref_Ruqaa } from 'next/font/google'
import localFont from 'next/font/local'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { MathLoader } from '@/components/landing/math-loader'
import './globals.css'

const cairo = Cairo({
  variable: '--font-cairo',
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
})
const arefRuqaa = Aref_Ruqaa({
  variable: '--font-aref-ruqaa',
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
})
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})
const lemonBrush = localFont({
  src: '../public/fonts/lemon-brush-arabic.otf',
  variable: '--font-hero',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'منصة الأستاذ عبد السلام | تعلّم الرياضيات بسهولة',
  description:
    'منصة الأستاذ عبد السلام التعليمية للرياضيات لجميع المراحل الدراسية — شرح مبسّط، بنك أسئلة، وامتحانات تفاعلية. اختر مرحلتك وابدأ رحلة التفوق.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1f33' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${arefRuqaa.variable} ${lemonBrush.variable} ${geistMono.variable} bg-background`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${cairo.className} font-sans antialiased`}>
        <ThemeProvider>
          <MathLoader />
          {children}
        </ThemeProvider>
        <Toaster position="top-center" richColors dir="rtl" theme="system" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
