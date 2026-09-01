"use client";

import React from "react";
import { Sparkles, Star, Quote } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Marquee } from "@/components/ui/3d-testimonails";
import type { TestimonialsContent } from "@/lib/site-content-defaults";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content-defaults";
import { useReveal } from "@/lib/use-reveal";
import { cn } from "@/lib/utils";

// Comprehensive real Chemistry student testimonials with student success metrics
const defaultStudentTestimonials = [
  {
    name: "مريم أحمد",
    username: "دفعة 2024",
    badge: "طب بشري القاهرة • 60/60",
    body: "كنت بتعقد من ميكانيزمات العضوية وتفاعلات الحديد، مع مستر سليمان عارف بقيت بتخيل كل خطوة. قفلت الكيمياء والحمد لله دخلت طب بشري!",
    avatarColor:
      "bg-brand dark:bg-brand text-navy dark:text-[#0a0f1a]",
    score: "60/60",
    tag: "كيمياء عضوية",
  },
  {
    name: "يوسف خالد",
    username: "دفعة 2024",
    badge: "هندسة عين شمس • 59/60",
    body: "مسائل المعايرة والتطاير وقاعدة لوشاتيليه بقت أسهل جزء في الامتحان بفضل طريقة الربط والشرح المنظم وحل أفكار المستويات العليا.",
    avatarColor: "bg-cyan-600 dark:bg-[#06b6d4] text-navy dark:text-[#0a0f1a]",
    score: "59/60",
    tag: "الاتزان والتحليل",
  },
  {
    name: "سلمى محمود",
    username: "دفعة 2025",
    badge: "المركز الأول إدارة • 100٪",
    body: "المنصة وتجارب الـ 3D خلتني أفهم الروابط والتهجين والتوزيع الإلكتروني من الصفر. الامتحانات الأسبوعية فرقت جداً في سرعتي ودقتي.",
    avatarColor: "bg-brand dark:bg-brand text-navy",
    score: "100٪",
    tag: "بنية الذرة",
  },
  {
    name: "عمر الشناوي",
    username: "دفعة 2024",
    badge: "صيدلة الإسكندرية • 59.5/60",
    body: "الكيمياء الكهربية وخلايا جلفاني وقوانين فاراداي كانت أزمتي، الشرح العملي والمتابعة خلوني أحل أي مسألة وأنا مغمض.",
    avatarColor:
      "bg-amber-600 dark:bg-[#f59e0b] text-navy dark:text-[#0a0f1a]",
    score: "59.5",
    tag: "كيمياء كهربية",
  },
  {
    name: "حبيبة طارق",
    username: "دفعة 2025",
    badge: "الصف الأول الثانوي • امتياز",
    body: "أول مرة أحس إن الكيمياء ممتعة ومش مجرد حفظ وتسميع معادلات. بنك الأسئلة المفسر والمتابعة مع مستر سليمان عارف خلوني أضمن الدرجة.",
    avatarColor:
      "bg-brand dark:bg-brand text-navy dark:text-[#0a0f1a]",
    score: "درجة نهائية",
    tag: "المول والحساب",
  },
  {
    name: "عبد الرحمن سعيد",
    username: "دفعة 2024",
    badge: "طب أسنان المنصورة • 59/60",
    body: "المراجعات النهائية وكبسولات ليلة الامتحان فرقت معايا جداً، مفيش سؤال في امتحان آخر السنة إلا وكان مشروح بالتفصيل في المنصة.",
    avatarColor: "bg-cyan-600 dark:bg-[#06b6d4] text-navy dark:text-[#0a0f1a]",
    score: "59/60",
    tag: "مراجعة نهائية",
  },
  {
    name: "نوران حسام",
    username: "دفعة 2024",
    badge: "علاج طبيعي القاهرة • 58.5/60",
    body: "طريقة مستر محمد في تبسيط أطياف الانبعاث والجدول الدوري وتدرج الخواص عبقرية، بنصح أي طالب ثانوية عامة يشترك في المنصة بدون تردد.",
    avatarColor: "bg-brand dark:bg-brand text-navy",
    score: "58.5",
    tag: "الجدول الدوري",
  },
  {
    name: "كريم عادل",
    username: "دفعة 2024",
    badge: "هندسة بترول وتعدين • 60/60",
    body: "منصة متكاملة من فيديوهات الشرح وحل الكتب الخارجية لبنك الأسئلة والتصحيح الفوري، مستر سليمان عارف أفضل مدرس كيمياء بلا منازع.",
    avatarColor:
      "bg-amber-600 dark:bg-[#f59e0b] text-white dark:text-[#0a0f1a]",
    score: "60/60",
    tag: "عناصر انتقالية",
  },
];

function ChemistryReviewCard({
  name,
  username,
  badge,
  body,
  avatarColor,
  tag,
}: (typeof defaultStudentTestimonials)[number]) {
  return (
    <div className="w-72 sm:w-80 select-none rounded-2xl border border-navy/10 bg-white/85 p-5 shadow-lg shadow-navy/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl dark:border-white/10 dark:bg-[#0f172a]/85 dark:shadow-black/50 dark:hover:border-brand/40 dark:hover:shadow-[0_10px_25px_rgba(218, 173, 76,0.12)]">
      {/* Top row: Avatar + Name + Subject Tag */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-10 place-items-center rounded-full font-bold text-sm shadow-sm",
              avatarColor,
            )}
          >
            {name.charAt(0)}
          </span>
          <div className="flex flex-col">
            <figcaption className="text-sm font-bold text-navy dark:text-ink-fg">
              {name}
            </figcaption>
            <p className="text-xs font-semibold text-brand dark:text-brand">
              {badge}
            </p>
          </div>
        </div>
      </div>

      {/* Stars row */}
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex gap-0.5 text-amber-400">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <span className="rounded-full border border-navy/10 bg-navy/5 px-2 py-0.5 text-[10px] font-bold text-navy/70 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          {tag}
        </span>
      </div>

      {/* Quote Body */}
      <blockquote className="mt-3 text-xs sm:text-sm leading-relaxed text-navy/80 dark:text-ink-dim">
        "{body}"
      </blockquote>
    </div>
  );
}

export function TestimonialsSection({
  content = DEFAULT_SITE_CONTENT.testimonials,
}: {
  content?: TestimonialsContent;
}) {
  const root = useReveal<HTMLElement>(".reveal-item");

  // Split testimonials for dynamic staggered columns
  const col1 = defaultStudentTestimonials.slice(0, 4);
  const col2 = defaultStudentTestimonials.slice(4, 8);
  const col3 = [
    defaultStudentTestimonials[2],
    defaultStudentTestimonials[0],
    defaultStudentTestimonials[6],
    defaultStudentTestimonials[4],
  ];
  const col4 = [
    defaultStudentTestimonials[1],
    defaultStudentTestimonials[7],
    defaultStudentTestimonials[3],
    defaultStudentTestimonials[5],
  ];

  return (
    <section
      ref={root}
      id="testimonials"
      className="relative overflow-hidden py-24 md:py-32"
    >
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[500px] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl dark:opacity-20"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(218, 173, 76, 0.12), rgba(6, 182, 212, 0.08), transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Section Header */}
      <div className="mx-auto mb-12 max-w-4xl px-5 text-center md:mb-16 md:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-4 py-1.5 text-sm font-semibold text-brand backdrop-blur dark:border-brand/30 dark:bg-brand/10 dark:text-brand">
          <Sparkles className="size-4 text-brand dark:text-brand" />
          {content.badge || "قصص تفوق حقيقية"}
        </span>
        <h2 className="font-thmanyah font-bold mt-4 text-balance text-3xl leading-tight text-navy sm:text-4xl lg:text-5xl dark:text-ink-fg">
          {content.title || "كل طالب رحلة... وكل رحلة قصة تميز في الكيمياء"}
        </h2>
        <p className="mt-4 text-pretty text-lg leading-relaxed text-navy/70 dark:text-ink-dim">
          {content.description ||
            "مش مجرد درجات؛ دي آراء وتجارب طلابنا في الثانوية العامة مع الأستاذ سليمان عارف."}
        </p>
      </div>

      {/* 3D Perspective Marquee Container */}
      <div
        className="relative mx-auto flex h-[600px] sm:h-[700px] w-full max-w-[100vw] flex-row items-center justify-center overflow-hidden [perspective:1200px]"
        style={{
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 50%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 50%, transparent 100%)'
        }}
      >
        {/* Tilted 3D Stage */}
        <div
          className="flex h-[150%] w-[120%] flex-row justify-center gap-4 sm:gap-6"
          style={{
            transform:
              "rotateX(20deg) rotateY(-10deg) rotateZ(5deg) scale(1.1)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Column 1: Vertical Marquee (downwards) */}
          <Marquee
            vertical
            pauseOnHover
            repeat={4}
            className="h-full [--duration:35s]"
          >
            {col1.map((review, i) => (
              <ChemistryReviewCard key={`c1-${i}-${review.name}`} {...review} />
            ))}
          </Marquee>

          {/* Column 2: Vertical Marquee (upwards - reverse) */}
          <Marquee
            vertical
            pauseOnHover
            reverse
            repeat={4}
            className="h-full [--duration:38s]"
          >
            {col2.map((review, i) => (
              <ChemistryReviewCard key={`c2-${i}-${review.name}`} {...review} />
            ))}
          </Marquee>

          {/* Column 3: Vertical Marquee (downwards) */}
          <Marquee
            vertical
            pauseOnHover
            repeat={4}
            className="hidden h-full sm:flex [--duration:32s]"
          >
            {col3.map((review, i) => (
              <ChemistryReviewCard key={`c3-${i}-${review.name}`} {...review} />
            ))}
          </Marquee>

          {/* Column 4: Vertical Marquee (upwards - reverse) */}
          <Marquee
            vertical
            pauseOnHover
            reverse
            repeat={4}
            className="hidden h-full lg:flex [--duration:42s]"
          >
            {col4.map((review, i) => (
              <ChemistryReviewCard key={`c4-${i}-${review.name}`} {...review} />
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
