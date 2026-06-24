export type Stage = {
  id: string
  title: string
  subtitle: string
  grades: string[]
  accent: 'gold' | 'emerald' | 'navy'
}

export const stages: Stage[] = [
  {
    id: 'prep',
    title: 'المرحلة الإعدادية',
    subtitle: 'تأسيس قوي في الجبر والهندسة',
    grades: ['الصف الأول', 'الصف الثاني', 'الصف الثالث'],
    accent: 'emerald',
  },
  {
    id: 'secondary-1',
    title: 'الصف الأول الثانوي',
    subtitle: 'الجبر، حساب المثلثات والهندسة التحليلية',
    grades: ['جبر', 'حساب مثلثات', 'هندسة'],
    accent: 'gold',
  },
  {
    id: 'secondary-2',
    title: 'الصف الثاني الثانوي',
    subtitle: 'التفاضل، الميكانيكا والإحصاء',
    grades: ['تفاضل وتكامل', 'ميكانيكا', 'إحصاء'],
    accent: 'navy',
  },
  {
    id: 'secondary-3',
    title: 'الصف الثالث الثانوي',
    subtitle: 'المراجعة النهائية والاستعداد للثانوية العامة',
    grades: ['بحتة', 'تطبيقية', 'ديناميكا'],
    accent: 'gold',
  },
]

export type Feature = {
  title: string
  description: string
  icon: string
}

export const features: Feature[] = [
  {
    title: 'شرح مبسّط ومتدرّج',
    description: 'كل فكرة بتتشرح من الصفر بأسلوب سهل يوصّل المعلومة لأي طالب.',
    icon: 'lightbulb',
  },
  {
    title: 'بنك أسئلة وامتحانات',
    description: 'آلاف المسائل والامتحانات التفاعلية مع تصحيح فوري ومتابعة لمستواك.',
    icon: 'clipboard',
  },
  {
    title: 'فيديوهات عالية الجودة',
    description: 'حصص مسجّلة بجودة عالية تقدر تتفرج عليها وتعيدها في أي وقت.',
    icon: 'video',
  },
  {
    title: 'متابعة وتقارير',
    description: 'تقارير دورية لولي الأمر والطالب توضّح التقدم ونقاط القوة والضعف.',
    icon: 'chart',
  },
]

export type Stat = {
  value: number
  suffix: string
  label: string
}

export const stats: Stat[] = [
  { value: 25, suffix: '+', label: 'سنة خبرة في التدريس' },
  { value: 48000, suffix: '+', label: 'طالب وطالبة' },
  { value: 1200, suffix: '+', label: 'فيديو تعليمي' },
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
      'مستر عبدالسلام غيّر علاقتي بالرياضيات تمامًا، بقيت بفهم المسألة قبل ما أحلها. جبت أعلى درجة في حياتي!',
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
    quote:
      'المنصة منظمة وكل المواد مرتبة، بحس إن فيه حد ماسكني خطوة بخطوة لحد الامتحان.',
  },
]
