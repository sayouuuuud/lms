// ─────────────────────────────────────────────────────────────────────────────
// CLIENT-SAFE module: types + defaults + deepMerge only.
// NO server imports here (no supabase, no next/headers) — client components
// import DEFAULT_SITE_CONTENT and types from this file.
// The server-only getSiteContent() lives in lib/site-content.ts.
// ─────────────────────────────────────────────────────────────────────────────

export type HeroContent = {
  badge: string
  titleLine1: string
  titleLine2: string
  titleHighlight: string
  description: string
  cta1Text: string
  cta1Href: string
  cta2Text: string
  cta2Href: string
  trustPoints: string[]
  teacherImageLight: string
  teacherImageDark: string
  teacherImageAlt: string
  pillLabels: string[]
  miniStats: { value: number; prefix: string; suffix: string; label: string }[]
}

export type FeatureItem = {
  step: string
  title: string
  description: string
  icon: string
}

export type FeaturesContent = {
  badge: string
  title: string
  description: string
  items: FeatureItem[]
}

export type StatItem = {
  value: number
  suffix: string
  label: string
}

export type StatsContent = {
  badge: string
  title: string
  description: string
  items: StatItem[]
}

export type JourneyPoint = {
  month: string
  score: number
}

export type TestimonialItem = {
  name: string
  grade: string
  subject: string
  quote: string
  before: number
  after: number
  journey: JourneyPoint[]
}

export type TestimonialsContent = {
  badge: string
  title: string
  description: string
  items: TestimonialItem[]
}

export type CtaContent = {
  badge: string
  title: string
  description: string
  cta1Text: string
  cta1Href: string
  cta2Text: string
  cta2Href: string
  perks: string[]
}

export type FooterLink = { label: string; href: string }

export type SocialPlatform = 'website' | 'telegram' | 'whatsapp' | 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'twitter'

export type SocialLink = {
  platform: SocialPlatform
  href: string
  enabled: boolean
}

export type FooterContent = {
  siteName: string
  siteTagline: string
  description: string
  phone: string
  address: string
  quickLinks: FooterLink[]
  copyright: string // supports {year} token
  socialLinks: SocialLink[]
}

export type NavbarContent = {
  siteName: string
  logoUrl: string
  links: FooterLink[]
  ctaLoginText: string
  ctaRegisterText: string
  ctaAccountText: string
}

export type SeoContent = {
  title: string
  description: string
  loaderText: string
  loaderEquation: string
  /** كلمات مفتاحية مفصولة بفاصلة — تُستخدم في وصف الصفحات */
  keywords: string
  /** كود التحقق من Google Search Console */
  googleVerification: string
}

export type LoginPanelStat = {
  value: string
  label: string
}

export type LoginPanelContent = {
  badge: string
  headline: string
  perks: string[]
  stats: LoginPanelStat[]
  brandName: string   // displayed name in the auth panel header
  logoUrl: string     // optional uploaded logo image URL
}

export type StageOfferContent = {
  badgeText: string
  headingTemplate: string   // {stageName} will be replaced at runtime
  description: string
  featureItems: string[]    // 4 bullet points
  priceLabel: string
  buttonText: string
  guaranteeText: string
}

export type PaymentAccountItem = {
  /** لازم يطابق اسم وسيلة الدفع في نموذج الدفع (مثال: فودافون كاش) */
  method: string
  /** رقم المحفظة أو عنوان إنستاباي أو رقم الآيبان */
  account: string
  /** اسم صاحب الحساب (اختياري) */
  holder: string
  /** ملاحظة إضافية تظهر للطالب (اختياري) */
  note?: string
}

export type PaymentAccountsContent = {
  items: PaymentAccountItem[]
}

export type SiteContent = {
  hero: HeroContent
  features: FeaturesContent
  stats: StatsContent
  testimonials: TestimonialsContent
  cta: CtaContent
  footer: FooterContent
  navbar: NavbarContent
  seo: SeoContent
  login_panel: LoginPanelContent
  stage_offer: StageOfferContent
  payment_accounts: PaymentAccountsContent
}

// ─────────────────────────────────────────────────────────────────────────────
// Defaults — exact copies of every hardcoded value in the components right now.
// DB empty = site looks identical to before.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SITE_CONTENT: SiteContent = {
  hero: {
    badge: 'مستر سليمان عارف ــــ أستاذ الكيمياء والعلوم المتكاملة ',
    titleLine1: 'الكيمــــياء مش حفظ معـــادلات،',
    titleLine2: 'الكيمياء {highlight} وتجربة',
    titleHighlight: 'فهــــم',
    description:
      'مع الأستاذ سليمان عارف هتفهم كل تفاعل من أساسه الذري، وتشوف التجارب وتتدرّب لحد ما تقفّل الكيمياء وتضمن درجتك النهائية. اختار مرحلتك وابدأ رحلتك الآن.',
    cta1Text: 'اختار مرحلتك الدراسية',
    cta1Href: '#stages',
    cta2Text: 'اعرف أكتر عن المنصة',
    cta2Href: '#features',
    trustPoints: ['أول حصة مجانًا', 'تجارب معملية تفاعلية', 'متابعة مع ولي الأمر'],
    teacherImageLight: '/Aref.png',
    teacherImageDark: '/teacher-abdelsalam.png',
    teacherImageAlt: 'الأستاذ سليمان عارف، معلم وخبير الكيمياء',
    pillLabels: ['كيمياء عضوية', 'كيمياء كهربية', 'اتزان كيميائي', 'تحليل كيميائي'],
    miniStats: [
      { value: 25, prefix: '+', suffix: '', label: 'سنة خبرة' },
      { value: 48, prefix: '+', suffix: ' ألف', label: 'طالب' },
      { value: 98, prefix: '٪', suffix: '', label: 'نسبة تفوق' },
    ],
  },

  features: {
    badge: 'إزاي بنذاكر كيمياء مع بعض',
    title: 'نظام معملي وتعليمي متكامل، مبني على الفهم والتطبيق.',
    description:
      'مش مجرد حفظ معادلات؛ ده مسار تفاعلي وتجارب بصرية تأخذك من الذرة لقمة التميز في الثانوية العامة.',
    items: [
      {
        step: '٠١',
        title: 'شرح تفاعلي للتجارب المعملية',
        description:
          'توضيح مسارات التفاعل وآلياته بنماذج مجسمة ثلاثية الأبعاد تحول المعادلات المجردة لفهم بصري عميق.',
        icon: 'lightbulb',
      },
      {
        step: '٠٢',
        title: 'ربط المفاهيم من الذرة للمركب',
        description:
          'تأسيس شامل في التوزيع الإلكتروني وأعداد التأكسد والروابط لتسهيل استيعاب الكيمياء الكهربية والعضوية.',
        icon: 'video',
      },
      {
        step: '٠٣',
        title: 'بنك أسئلة الكيمياء الشامل',
        description:
          'آلاف الأسئلة المفسرة ونماذج امتحانات مطابقة لأحدث مواصفات الثانوية العامة ونظام نواتج التعلم.',
        icon: 'clipboard',
      },
      {
        step: '٠٤',
        title: 'متابعة دورية وتقارير مستمرة',
        description:
          'تحليل تفصيلي لمستواك ونقاط القوة والضعف في كل باب ومتابعة مستمرة مع ولي الأمر أول بأول.',
        icon: 'chart',
      },
    ],
  },

  stats: {
    badge: 'أرقامنا',
    title: 'نتائج بتتكلم عن نفسها',
    description:
      'سنين من الخبرة وآلاف الطلاب اللي قفّلوا الكيمياء ووصلوا لكليات القمة مع مستر سليمان عارف.',
    items: [
      { value: 25, suffix: '+', label: 'سنة خبرة في تدريس الكيمياء' },
      { value: 48000, suffix: '+', label: 'طالب وطالبة على المنصة' },
      { value: 1200, suffix: '+', label: 'فيديو شرح وتجارب معملية' },
      { value: 98, suffix: '%', label: 'نسبة تفوق ورضا الطلاب' },
    ],
  },

  testimonials: {
    badge: 'قصص تفوق حقيقية',
    title: 'كل طالب رحلة... وكل رحلة منحنى صاعد نحو القمة',
    description:
      'مش مجرد درجات؛ دي قصص نجاح لطلاب حوّلوا الكيمياء من أصعب مادة لأعلى درجة في الثانوية العامة.',
    items: [
      {
        name: 'مريم أحمد',
        grade: 'الصف الثالث الثانوي',
        subject: 'الكيمياء العضوية والكهربية',
        quote:
          'كنت بتعقد من ميكانيزمات العضوية ومعادلات تفاعلات الحديد، مع مستر سليمان عارف بقيت بشوف التفاعل متخيل كل خطوة. قفلت الكيمياء 60/60 وجبت طب بشري!',
        before: 42,
        after: 98,
        journey: [
          { month: 'سبتمبر', score: 42 },
          { month: 'أكتوبر', score: 51 },
          { month: 'نوفمبر', score: 60 },
          { month: 'ديسمبر', score: 68 },
          { month: 'يناير', score: 79 },
          { month: 'فبراير', score: 88 },
          { month: 'مارس', score: 93 },
          { month: 'الامتحان', score: 98 },
        ],
      },
      {
        name: 'يوسف خالد',
        grade: 'الصف الثالث الثانوي',
        subject: 'الاتزان والتحليل الكيميائي',
        quote:
          'مسائل المعايرة والتطاير وثابت الاتزان وقاعدة لوشاتيليه بقت أسهل جزء في الامتحان بفضل طريقة الربط والشرح المنظم وحل أفكار المستويات العليا.',
        before: 55,
        after: 96,
        journey: [
          { month: 'سبتمبر', score: 55 },
          { month: 'أكتوبر', score: 58 },
          { month: 'نوفمبر', score: 66 },
          { month: 'ديسمبر', score: 72 },
          { month: 'يناير', score: 81 },
          { month: 'فبراير', score: 87 },
          { month: 'مارس', score: 91 },
          { month: 'الامتحان', score: 96 },
        ],
      },
      {
        name: 'حبيبة محمود',
        grade: 'الصف الثاني الثانوي',
        subject: 'بنية الذرة والجدول الدوري',
        quote:
          'أول مرة أحس إن الكيمياء ممتعة ومش حفظ، فهم أعداد الكم والروابط والتدرج خلاني أطلع الأولى على المدرسة.',
        before: 48,
        after: 97,
        journey: [
          { month: 'سبتمبر', score: 48 },
          { month: 'أكتوبر', score: 54 },
          { month: 'نوفمبر', score: 63 },
          { month: 'ديسمبر', score: 71 },
          { month: 'يناير', score: 80 },
          { month: 'فبراير', score: 86 },
          { month: 'مارس', score: 92 },
          { month: 'الامتحان', score: 97 },
        ],
      },
    ],
  },

  cta: {
    badge: 'ابدأ النهاردة',
    title: 'جاهز تبدأ رحلة التفوق والدرجة النهائية في الكيمياء؟',
    description:
      'انضم لآلاف الطلاب اللي حقّقوا الدرجة النهائية في الكيمياء مع مستر سليمان عارف. سجّل دلوقتي وابدأ أول حصة مجانًا.',
    cta1Text: 'سجّل الآن مجانًا',
    cta1Href: '/student',
    cta2Text: 'تصفّح المراحل',
    cta2Href: '#stages',
    perks: ['أول حصة مجانًا', 'تجارب معملية تفاعلية', 'متابعة مع ولي الأمر'],
  },

  footer: {
    siteName: 'سليمان عارف',
    siteTagline: 'معلم وخبير الكيمياء للثانوية العامة',
    description:
      'منصة تعليمية متخصصة في مادة الكيمياء للمرحلة الثانوية، تجمع بين الشرح المعملي المبسط وحل أفكار المستويات العليا لضمان الدرجة النهائية.',
    phone: '+20 100 000 0000',
    address: 'القاهرة، جمهورية مصر العربية',
    quickLinks: [
      { label: 'الرئيسية', href: '#hero' },
      { label: 'مميزاتنا', href: '#features' },
      { label: 'المراحل الدراسية', href: '#stages' },
      { label: 'تسجيل الدخول', href: '/student' },
    ],
    copyright: '© {year} منصة الأستاذ سليمان عارف للكيمياء — جميع الحقوق محفوظة.',
    socialLinks: [
      { platform: 'website' as SocialPlatform, href: '#', enabled: true },
      { platform: 'telegram' as SocialPlatform, href: '#', enabled: true },
      { platform: 'whatsapp' as SocialPlatform, href: '#', enabled: true },
      { platform: 'youtube' as SocialPlatform, href: '#', enabled: false },
      { platform: 'facebook' as SocialPlatform, href: '#', enabled: false },
      { platform: 'instagram' as SocialPlatform, href: '#', enabled: false },
      { platform: 'tiktok' as SocialPlatform, href: '#', enabled: false },
      { platform: 'twitter' as SocialPlatform, href: '#', enabled: false },
    ],
  },

  navbar: {
    siteName: 'سليمان عارف',
    logoUrl: '',
    links: [
      { label: 'المنهج', href: '#features' },
      { label: 'المراحل', href: '#stages' },
      { label: 'أرقامنا', href: '#stats' },
      { label: 'آراء الطلاب', href: '#testimonials' },
    ],
    ctaLoginText: 'تسجيل الدخول',
    ctaRegisterText: 'ابدأ الآن',
    ctaAccountText: 'حسابي',
  },

  seo: {
    title: 'الأستاذ سليمان عارف | معلم وخبير الكيمياء للثانوية العامة',
    description:
      'المنصة التعليمية الأولى لشرح مادة الكيمياء للثانوية العامة بأسلوب معملي تفاعلي وبنك أسئلة شامل. ابدأ الآن واضمن الدرجة النهائية.',
    loaderText: 'جاري تحضير المعمل والمنصة...',
    loaderEquation: '2H₂ + O₂ ⟶ 2H₂O  (ΔH = -286 kJ/mol)',
    keywords: 'كيمياء الثانوية العامة, كيمياء أولى ثانوي, كيمياء ثانية ثانوي, كيمياء ثالثة ثانوي, كيمياء عضوية, كيمياء كهربية, تجارب كيميائية, الأستاذ سليمان عارف',
    googleVerification: '',
  },

  stage_offer: {
    badgeText: 'العرض الأوفر',
    headingTemplate: 'اشترك في {stageName} كاملة',
    description:
      'أبواب وكورسات المنهج كاملة بكل المحاضرات والتجارب وبنك الأسئلة والمتابعة — في باقة واحدة بسعر أوفر بكثير.',
    featureItems: [
      'محاضرات وتجارب فيديو بجودة عالية',
      'وصول مدى الترم بدون حدود',
      'امتحانات وبنك أسئلة بعد كل محاضرة',
      'متابعة وتقارير مستمرة لمستواك',
    ],
    priceLabel: 'سعر الترم كامل',
    buttonText: 'اشترك في المرحلة كاملة',
    guaranteeText: 'ضمان استرجاع خلال 7 أيام',
  },

  login_panel: {
    badge: 'مستر سليمان عارف ــــ أستاذ الكيمياء والعلوم المتكاملة ',
    headline: 'الكيمياء مش حفظ معادلات.. الكيمياء فهم وتجربة معملية.',
    perks: [
      'شرح معملي مبسط وتجارب تفاعلية',
      'بنك أسئلة وأفكار مستويات عليا بعد كل درس',
      'متابعة مستمرة لمستواك وتقارير دورية',
    ],
    stats: [
      { value: '+48k', label: 'طالب وطالبة' },
      { value: '98%', label: 'نسبة تفوق' },
      { value: '+25', label: 'سنة خبرة' },
    ],
    brandName: 'سليمان عارف',
    logoUrl: '',
  },

  payment_accounts: {
    items: [
      { method: 'فودافون كاش', account: '', holder: '' },
      { method: 'اتصالات كاش', account: '', holder: '' },
      { method: 'أورنج كاش', account: '', holder: '' },
      { method: 'إنستا باي', account: '', holder: '' },
      { method: 'تحويل بنكي', account: '', holder: '' },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Deep merge — source overrides target at every key.
// Arrays replace entirely (not concat). Missing keys fall back to default.
// ─────────────────────────────────────────────────────────────────────────────

export function deepMerge<T>(target: T, source: Partial<T>): T {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return (source ?? target) as T
  }
  const result = { ...target } as Record<string, unknown>
  for (const key of Object.keys(source)) {
    const srcVal = (source as Record<string, unknown>)[key]
    const tgtVal = (target as Record<string, unknown>)[key]
    if (
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal) &&
      tgtVal !== null
    ) {
      result[key] = deepMerge(tgtVal, srcVal as Partial<typeof tgtVal>)
    } else if (srcVal !== undefined) {
      result[key] = srcVal
    }
  }
  return result as T
}
