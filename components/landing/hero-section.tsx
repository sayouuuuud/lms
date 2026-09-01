"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AnimatedNumber } from "./animated-number";
import { cn } from "@/lib/utils";
import type { HeroContent } from "@/lib/site-content-defaults";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content-defaults";

// Floating chemistry symbols with dual-theme color coordination
const floatSymbols = [
  {
    char: "H₂O",
    top: "28%",
    left: "4%",
    size: "text-3xl sm:text-4xl",
    darkColor: "#daad4c",
    lightColor: "#daad4c",
  },
  {
    char: "C₆H₆",
    top: "12%",
    left: "45%",
    size: "text-3xl sm:text-4xl",
    darkColor: "#daad4c",
    lightColor: "#daad4c",
  },
  {
    char: "e⁻",
    bottom: "34%",
    left: "15%",
    size: "text-3xl sm:text-4xl",
    darkColor: "#daad4c",
    lightColor: "#daad4c",
  },
  {
    char: "mol",
    bottom: "15%",
    right: "8%",
    size: "text-2xl sm:text-3xl",
    darkColor: "#daad4c",
    lightColor: "#daad4c",
  },
];

export function HeroSection({
  content = DEFAULT_SITE_CONTENT.hero,
}: {
  content?: HeroContent;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-stagger", {
        opacity: 0,
        y: 28,
        duration: 0.7,
        stagger: 0.1,
      }).from(
        ".hero-photo",
        {
          opacity: 0,
          y: 40,
          scale: 0.97,
          duration: 1,
          clearProps: "transform",
        },
        "-=0.7",
      );

      gsap.utils.toArray<HTMLElement>(".float-sym").forEach((el, i) => {
        gsap.to(el, {
          y: i % 2 === 0 ? -45 : 45,
          x: i % 3 === 0 ? 30 : -30,
          rotate: i % 2 === 0 ? 25 : -25,
          duration: 3 + (i % 3),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.2,
        });
      });

      gsap.utils.toArray<HTMLElement>(".float-obj").forEach((el, i) => {
        gsap.to(el, {
          y: i % 2 === 0 ? 35 : -35,
          x: i % 2 === 0 ? -25 : 25,
          rotate: i % 2 === 0 ? 15 : -15,
          duration: 5 + i,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.35,
        });
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="hero"
      className="relative overflow-x-clip pt-28 md:pt-36"
    >


      {/* Floating chemical formulas */}
      {floatSymbols.map((s, i) => (
        <span
          key={i}
          className={`float-sym pointer-events-none absolute font-mono font-bold select-none ${s.size} opacity-40 md:opacity-75 transition-colors duration-300`}
          style={{
            top: s.top,
            bottom: s.bottom,
            left: s.left,
            right: s.right,
          }}
          aria-hidden="true"
        >
          <span
            className="dark:hidden"
            style={{
              color: s.lightColor,
              textShadow: `0 0 16px ${s.lightColor}44`,
            }}
          >
            {s.char}
          </span>
          <span
            className="hidden dark:inline"
            style={{
              color: s.darkColor,
              textShadow: `0 0 24px ${s.darkColor}aa`,
            }}
          >
            {s.char}
          </span>
        </span>
      ))}

      {/* Wireframe chemistry 3D objects */}
      <WireBenzene className="float-obj left-[44%] top-[20%] text-brand/40 dark:text-brand/60 transition-colors" />
      <WireAtom className="float-obj bottom-[18%] left-[40%] text-cyan-800/40 dark:text-[#06b6d4]/60 transition-colors" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-end gap-6 px-5 md:grid-cols-12 md:gap-8 md:px-8">
        {/* Text column */}
        <div className="order-2 pb-16 md:order-1 md:col-span-7 md:pb-24 lg:col-span-7 xl:col-span-7">
          <span className="hero-stagger inline-flex items-center gap-2 rounded-full border border-navy/15 bg-navy/5 px-4 py-1.5 text-sm font-semibold text-navy backdrop-blur dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
            <Sparkles className="size-4 text-navy dark:text-slate-200" />
            {content.badge}
          </span>

          <h1 className="hero-stagger mt-7 text-4xl font-heading font-black leading-[1.5] text-navy sm:text-5xl md:text-3xl md:leading-[1.4] lg:text-[2.6rem] lg:leading-[1.45] xl:text-[3.25rem] xl:leading-[1.5] dark:text-[#e2f8f0]">
            <span className="block">{content.titleLine1}</span>
            <span className="block">
              {content.titleLine2.split("{highlight}")[0]}
              <span className="text-brand dark:text-brand dark:[text-shadow:0_0_30px_#daad4c66]">
                {content.titleHighlight}
              </span>
              {content.titleLine2.split("{highlight}")[1]}
            </span>
          </h1>

          <p className="hero-stagger mt-6 max-w-xl text-pretty text-lg leading-relaxed text-navy/75 md:text-sm lg:text-base xl:text-lg dark:text-[#94a3b8]">
            {content.description}
          </p>

          <div className="hero-stagger mt-9 flex flex-col gap-3 sm:flex-row md:gap-2.5 lg:gap-3">
            <a
              href={content.cta1Href}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand px-8 py-4 text-base font-bold text-navy shadow-xl shadow-brand/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand md:px-5 md:py-3 md:text-sm lg:px-8 lg:py-4 lg:text-base dark:bg-brand dark:text-[#0a0f1a] dark:shadow-[0_0_30px_#daad4c55]"
            >
              {content.cta1Text}
              <ArrowLeft className="size-5 transition-transform duration-200 group-hover:-translate-x-1 md:size-4 lg:size-5" />
            </a>
            <a
              href={content.cta2Href}
              className="inline-flex items-center justify-center rounded-full border border-navy/20 bg-white/70 px-8 py-4 text-base font-bold text-navy backdrop-blur-sm transition-all hover:bg-white md:px-5 md:py-3 md:text-sm lg:px-8 lg:py-4 lg:text-base dark:border-[#daad4c55] dark:bg-[#daad4c11] dark:text-[#e2f8f0] dark:hover:bg-white/10"
            >
              {content.cta2Text}
            </a>
          </div>

          <dl className="hero-stagger mt-12 flex max-w-lg flex-wrap items-start justify-between gap-6 border-t border-navy/10 pt-8 sm:gap-8 dark:border-white/15">
            {content.miniStats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center md:items-start"
              >
                <dt className="whitespace-nowrap font-thmanyah text-3xl font-bold tracking-tight text-navy sm:text-4xl lg:text-5xl dark:text-slate-100">
                  <AnimatedNumber
                    value={s.value}
                    prefix={s.prefix}
                    suffix={s.suffix}
                    duration={2.5}
                  />
                </dt>
                <dd className="mt-2 text-base font-medium text-navy/70 sm:text-lg dark:text-[#64748b]">
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Photo column */}
        <div className="relative order-1 flex items-center justify-center self-center md:order-2 md:col-span-5 lg:col-span-5 xl:col-span-5 pt-4 md:pt-0 -mt-6 md:-mt-12">
          {/* Soft grounding glow under the figure */}
          <div
            className="pointer-events-none absolute bottom-0 left-1/2 h-24 w-[78%] -translate-x-1/2 rounded-[50%] blur-2xl bg-brand/20 dark:bg-brand/20"
            aria-hidden="true"
          />
          {/* Radial halo behind the teacher */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full dark:hidden"
            style={{
              background:
                "radial-gradient(closest-side, rgba(218, 173, 76, 0.12), transparent 70%)",
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full dark:block"
            style={{
              background:
                "radial-gradient(closest-side, #06b6d425, transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div
            className="hero-photo relative z-10 w-full max-w-[440px] md:max-w-[520px] lg:max-w-[560px] xl:max-w-[600px]"
            style={{
              maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)'
            }}
          >
            {/* Light-mode portrait */}
            <Image
              src={content.teacherImageLight || '/Aref.png'}
              alt={content.teacherImageAlt || 'الأستاذ سليمان عارف، معلم وخبير الكيمياء'}
              width={772}
              height={1024}
              priority
              className="mx-auto h-auto w-full object-contain drop-shadow-2xl dark:hidden"
            />
            {/* Dark-mode portrait */}
            <Image
              src={content.teacherImageDark || '/teacher-abdelsalam.png'}
              alt={content.teacherImageAlt || 'الأستاذ سليمان عارف، معلم وخبير الكيمياء'}
              width={772}
              height={1024}
              priority
              className="mx-auto hidden h-auto w-full object-contain drop-shadow-2xl dark:block"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function WireBenzene({ className = "" }: { className?: string }) {
  return (
    <svg
      width="92"
      height="92"
      viewBox="0 0 100 100"
      fill="none"
      className={`pointer-events-none absolute ${className}`}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1.5" opacity="0.85">
        {/* Outer Hexagon Ring */}
        <polygon points="50,12 85,32 85,68 50,88 15,68 15,32" />
        {/* Inner Delocalized Aromatic Circle */}
        <circle cx="50" cy="50" r="22" strokeDasharray="5 3" />
        {/* C-H Outer Bonds */}
        <line x1="50" y1="12" x2="50" y2="4" opacity="0.6" />
        <line x1="85" y1="32" x2="92" y2="28" opacity="0.6" />
        <line x1="85" y1="68" x2="92" y2="72" opacity="0.6" />
        <line x1="50" y1="88" x2="50" y2="96" opacity="0.6" />
        <line x1="15" y1="68" x2="8" y2="72" opacity="0.6" />
        <line x1="15" y1="32" x2="8" y2="28" opacity="0.6" />
      </g>
    </svg>
  );
}

function WireAtom({ className = "" }: { className?: string }) {
  return (
    <svg
      width="92"
      height="92"
      viewBox="0 0 100 100"
      fill="none"
      className={`pointer-events-none absolute ${className}`}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1.4" opacity="0.85">
        {/* Atomic Nucleus */}
        <circle cx="50" cy="50" r="5" fill="currentColor" opacity="0.7" />
        {/* Elliptical Electron Orbitals */}
        <ellipse
          cx="50"
          cy="50"
          rx="42"
          ry="16"
          transform="rotate(0 50 50)"
          opacity="0.7"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="42"
          ry="16"
          transform="rotate(60 50 50)"
          opacity="0.7"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="42"
          ry="16"
          transform="rotate(120 50 50)"
          opacity="0.7"
        />
        {/* Orbiting Electrons */}
        <circle cx="92" cy="50" r="2.5" fill="currentColor" />
        <circle cx="29" cy="86" r="2.5" fill="currentColor" />
        <circle cx="29" cy="14" r="2.5" fill="currentColor" />
      </g>
    </svg>
  );
}
