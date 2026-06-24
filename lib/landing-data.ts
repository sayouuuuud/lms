export type Stage = {
  id: string
  index: string
  title: string
  subtitle: string
  rows: string[]
  formula: string
  accent: 'gold' | 'emerald'
}

export const stages: Stage[] = [
  {
    id: 'sec-1',
    index: '01',
    title: 'الصف الأول الثانوي',
    subtitle: 'الأساس المتين: جبر، حساب مثلثات، وهندسة تحليلية تبني بيها باقي السنين.',
    rows: ['الجبر والمتطابقات', 'حساب المثلثات', 'الهندسة التحليلية'],
    formula: 'sin²θ + cos²θ = 1',
    accent: 'emerald',
  },
  {
    id: 'sec-2',
    index: '02',
    title: 'الصف الثاني الثانوي',
    subtitle: 'نقطة التحول: تفاضل وتكامل، ميكانيكا، وإحصاء بأسلوب يخلّيها سهلة.',
    rows: ['التفاضل والتكامل', 'الميكانيكا', 'الإحصاء والاحتمالات'],
    formula: 'd/dx [xⁿ] = n·xⁿ⁻¹',
    accent: 'gold',
  },
  {
    id: 'sec-3',
    index: '03',
    title: 'الصف الثالث الثانوي',
    subtitle: 'سنة الحسم: مراجعة شاملة واستعداد كامل لامتحان الثانوية العامة.',
    rows: ['الرياضيات البحتة', 'الرياضيات التطبيقية', 'الديناميكا'],
    formula: '∫ₐᵇ f(x) dx',
    accent: 'emerald',
  },
]

export type Feature = {
  step: string
  title: string
  description: string
  icon: string
}

export const features: Feature[] = [
  {
    step: '01',
    title: 'شرح مبسّط ومتدرّج',
    description: 'كل فكرة بتتشرح من الصفر بأسلوب سهل يوصّل المعلومة لأي طالب مهما كان مستواه.',
    icon: 'lightbulb',
  },
  {
    step: '02',
    title: 'فيديوهات عالية الجودة',
    description: 'حصص مسجّلة بجودة عالية تقدر تتفرج عليها وتعيدها في أي وقت ومن أي مكان.',
    icon: 'video',
  },
  {
    step: '03',
    title: 'بنك أسئلة وامتحانات',
    description: 'آلاف المسائل والامتحانات التفاعلية مع تصحيح فوري يثبّت المعلومة بعد كل درس.',
    icon: 'clipboard',
  },
  {
    step: '04',
    title: 'متابعة وتقارير',
    description: 'تقارير دورية للطالب وولي الأمر توضّح التقدّم ونقاط القوة والضعف أول بأول.',
    icon: 'chart',
  },
]

export type Stat = {
  value: number
  suffix: string
  label: string
}

export const stats: Stat[] = [
  { value: 25, suffix: '+', label: 'سنة خبرة في تدريس الرياضيات' },
  { value: 48000, suffix: '+', label: 'طالب وطالبة على المنصة' },
  { value: 1200, suffix: '+', label: 'فيديو ودرس تعليمي' },
  { value: 98, suffix: '%', label: 'نسبة رضا الطلاب' },
]

export type Testimonial = {
  name: string
  grade: string
  quote: string
}

export const testimonials: Testimonial[] = [
  {
    name: 'مريم أحمد',
    grade: 'الثالث الثانوي',
    quote:
      'مستر عبد السلام غيّر علاقتي بالرياضيات تمامًا، بقيت بفهم المسألة قبل ما أحلّها. جبت أعلى درجة في حياتي!',
  },
  {
    name: 'يوسف خالد',
    grade: 'الثاني الثانوي',
    quote:
      'طريقة الشرح بسيطة جدًا والامتحانات بعد كل درس بتثبّت المعلومة. التفاضل بقى أسهل حاجة عندي.',
  },
  {
    name: 'حبيبة محمود',
    grade: 'الأول الثانوي',
    quote: 'المنصة منظمة وكل المواد مرتبة، بحس إن فيه حد ماسكني خطوة بخطوة لحد الامتحان.',
  },
]

// Equations used in the background marquee + decorative layers.
export const equations: string[] = [
  'f(x) = ax² + bx + c',
  'sin²θ + cos²θ = 1',
  'd/dx [xⁿ] = n·xⁿ⁻¹',
  '∫ₐᵇ f(x) dx',
  'e^{iπ} + 1 = 0',
  'lim_{x→∞} 1/x = 0',
  'a² + b² = c²',
  'Σ_{k=1}^{n} k = n(n+1)/2',
  'Δ = b² − 4ac',
  'log_a(xy) = log_a x + log_a y',
]
