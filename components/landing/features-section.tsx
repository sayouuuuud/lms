'use client'

import { Sparkles, ArrowLeft } from 'lucide-react'
import { useReveal } from '@/lib/use-reveal'
import type { FeaturesContent } from '@/lib/site-content-defaults'
import { DEFAULT_SITE_CONTENT } from '@/lib/site-content-defaults'

export function FeaturesSection({ content = DEFAULT_SITE_CONTENT.features }: { content?: FeaturesContent }) {
  const headRef = useReveal<HTMLDivElement>(undefined, { y: 30 })
  const gridRef = useReveal<HTMLDivElement>('.feature-card', { y: 35, duration: 0.65, stagger: 0.12 })

  return (
        <section id="features" className="relative overflow-hidden bg-navy py-20 md:py-28 dark:bg-[#070d1a] dark:border-y dark:border-white/5">

      {/* Chemistry lab glow overlays — purple for dark mode, purple tint for light */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 90% 20%, oklch(0.66 0.2 292 / 0.18) 0%, transparent 55%), radial-gradient(ellipse 40% 35% at 0% 80%, oklch(0.84 0.13 184 / 0.12) 0%, transparent 50%)',
        }}
      />

      {/* Floating molecular formula decorations */}
      <span className="pointer-events-none absolute right-6 top-12 font-mono text-2xl font-bold text-white/8 dark:text-teal-glow/15 select-none" aria-hidden="true">H₂SO₄</span>
      <span className="pointer-events-none absolute left-4 bottom-16 font-mono text-3xl font-bold text-white/8 dark:text-purple-glow/15 select-none" aria-hidden="true">CH₃COOH</span>
      <span className="pointer-events-none absolute right-16 bottom-8 font-mono text-xl font-bold text-white/6 dark:text-teal-glow/10 select-none" aria-hidden="true">Fe₂O₃</span>

      {/* Benzene ring wireframe decoration (top-left) */}
      <svg className="pointer-events-none absolute left-2 top-8 text-white/8 dark:text-purple-glow/20" width="80" height="80" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <polygon points="50,12 85,32 85,68 50,88 15,68 15,32" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1.2" strokeDasharray="5 3" />
        <line x1="50" y1="12" x2="50" y2="4" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <line x1="85" y1="32" x2="92" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <line x1="85" y1="68" x2="92" y2="72" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <line x1="50" y1="88" x2="50" y2="96" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <line x1="15" y1="68" x2="8" y2="72" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <line x1="15" y1="32" x2="8" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      </svg>

      {/* Bohr Atom decoration (bottom-right) */}
      <svg className="pointer-events-none absolute right-4 bottom-4 text-white/8 dark:text-teal-glow/20" width="100" height="100" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <circle cx="50" cy="50" r="5" fill="currentColor" opacity="0.6" />
        <ellipse cx="50" cy="50" rx="40" ry="15" stroke="currentColor" strokeWidth="1.2" transform="rotate(0 50 50)" opacity="0.7" />
        <ellipse cx="50" cy="50" rx="40" ry="15" stroke="currentColor" strokeWidth="1.2" transform="rotate(60 50 50)" opacity="0.7" />
        <ellipse cx="50" cy="50" rx="40" ry="15" stroke="currentColor" strokeWidth="1.2" transform="rotate(120 50 50)" opacity="0.7" />
        <circle cx="90" cy="50" r="2.5" fill="currentColor" />
        <circle cx="30" cy="85" r="2.5" fill="currentColor" />
        <circle cx="30" cy="15" r="2.5" fill="currentColor" />
      </svg>

      <div className="mx-auto max-w-7xl px-5 md:px-8">
        {/* Section Header */}
        <div ref={headRef} className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold dark:border-teal-deep/40 dark:bg-teal-glow/10 dark:text-teal-glow">
            <Sparkles className="size-4 text-gold dark:text-brand" />
            {content.badge}
          </span>
          <h2 className="font-thmanyah font-bold mt-4 text-balance text-3xl leading-tight text-cream sm:text-4xl lg:text-5xl">
            {content.title}
          </h2>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-cream/70">
            {content.description}
          </p>
        </div>

        {/* 4-Card Creative Interactive Grid with Custom Thematic Visual Backgrounds */}
        <div
          ref={gridRef}
          className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:gap-8"
        >
          {content.items.map((item, idx) => {
            return (
              <div
                key={item.step}
                className="feature-card group relative min-h-[300px] overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-7 shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl md:p-9 dark:border-white/10 dark:bg-[#0f172a]/75 dark:shadow-black/40"
              >
                {/* Visual Thematic Backgrounds tailored to each card */}
                {idx === 0 && <LabReactionBackground />}
                {idx === 1 && <AtomicBondBackground />}
                {idx === 2 && <ExamFormulaBackground />}
                {idx === 3 && <AnalyticsGrowthBackground />}

                {/* Card Top: Phase Tag + Step Number */}
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-bold tracking-wide text-cream backdrop-blur-md transition-colors duration-200 ">
                    <span className="size-2 rounded-full animate-pulse bg-gold dark:bg-brand" />
                    {idx === 0 && 'المرحلة الأولى • الفهم البصري'}
                    {idx === 1 && 'المرحلة الثانية • الربط والتأسيس'}
                    {idx === 2 && 'المرحلة الثالثة • التطبيق والامتحانات'}
                    {idx === 3 && 'المرحلة الرابعة • المتابعة والتقييم'}
                  </span>

                  <span className="font-thmanyah text-3xl font-black text-white/20 transition-colors duration-300 group-hover:text-gold dark:group-hover:text-brand">
                    {item.step}
                  </span>
                </div>

                {/* Card Body */}
                <div className="relative z-10 mt-8">
                  <h3 className="text-xl font-bold leading-snug text-cream">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-pretty text-base leading-relaxed text-cream/70 transition-colors duration-200 dark:text-ink-dim">
                    {item.description}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="relative z-10 mt-8 flex items-center justify-between border-t border-white/10 pt-4 transition-colors duration-300">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-semibold text-cream backdrop-blur dark:bg-white/5 dark:text-slate-200">
                    {idx === 0 && 'محاكاة معملية 3D'}
                    {idx === 1 && 'من الذرة للمركب'}
                    {idx === 2 && '+3000 سؤال مفسر'}
                    {idx === 3 && 'تقارير أداء دورية'}
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cream/60 transition-all duration-300 group-hover:translate-x-[-5px] group-hover:text-gold dark:group-hover:text-brand">
                    <span>استكشف المسار</span>
                    <ArrowLeft className="size-3.5" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/** Card 1 Background: Animated Laboratory Flasks, Rising Reaction Bubbles & Molecular Nodes */
function LabReactionBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes bubbleRise1 {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          40% { opacity: 0.85; }
          100% { transform: translateY(-75px) scale(1.15); opacity: 0; }
        }
        @keyframes bubbleRise2 {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          50% { opacity: 0.75; }
          100% { transform: translateY(-90px) scale(1.25); opacity: 0; }
        }
        @keyframes liquidWave {
          0%, 100% { d: path("M58 150 Q100 138 142 150"); }
          50% { d: path("M58 148 Q100 144 142 148"); }
        }
        @keyframes moleculePulse {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(8deg) scale(1.05); }
        }
      `}</style>

      {/* Ambient Gradient */}
      <div className="absolute -left-16 -top-16 size-60 rounded-full bg-gold/15 blur-3xl transition-opacity duration-500 group-hover:bg-gold/25 dark:bg-brand/15 dark:group-hover:bg-brand/30" />

      {/* Laboratory Flask & Rising Reaction Bubbles Wireframe */}
      <svg
        className="absolute -bottom-6 -left-6 h-56 w-56 text-white/15 transition-transform duration-500 group-hover:scale-105 group-hover:text-white/25 dark:text-brand/15 dark:group-hover:text-brand/30"
        viewBox="0 0 200 200"
        fill="none"
      >
        {/* Conical Flask Outline */}
        <path
          d="M85 20 L115 20 M100 20 L100 70 L160 170 C168 182 158 190 145 190 L55 190 C42 190 32 182 40 170 L100 70"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Animated Liquid Level Wave */}
        <path
          d="M58 150 Q100 138 142 150"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="4 3"
          style={{ animation: 'liquidWave 4s ease-in-out infinite' }}
        />
        {/* Test Tube Stand */}
        <line x1="75" y1="170" x2="125" y2="170" stroke="currentColor" strokeWidth="1.5" />

        {/* Animated Rising Chemical Bubbles */}
        <g>
          <circle cx="95" cy="155" r="4" fill="currentColor" style={{ animation: 'bubbleRise1 3.2s ease-in infinite' }} />
          <circle cx="115" cy="160" r="3" fill="currentColor" style={{ animation: 'bubbleRise2 2.7s ease-in 0.8s infinite' }} />
          <circle cx="85" cy="150" r="4.5" fill="currentColor" style={{ animation: 'bubbleRise1 3.5s ease-in 1.4s infinite' }} />
          <circle cx="105" cy="158" r="3.5" fill="currentColor" style={{ animation: 'bubbleRise2 3.8s ease-in 0.3s infinite' }} />
          <circle cx="100" cy="145" r="2.5" fill="currentColor" style={{ animation: 'bubbleRise1 2.9s ease-in 2.1s infinite' }} />
        </g>
      </svg>

      {/* Animated Chemical Molecular Nodes in Corner */}
      <svg
        className="absolute right-3 top-3 h-32 w-32 text-white/10 transition-opacity duration-300 group-hover:text-white/20 dark:text-brand/10 dark:group-hover:text-brand/20"
        style={{ animation: 'moleculePulse 8s ease-in-out infinite', transformOrigin: 'center' }}
        viewBox="0 0 100 100"
        fill="none"
      >
        <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="20" cy="30" r="6" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="80" cy="30" r="6" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="50" cy="85" r="6" stroke="currentColor" strokeWidth="1.5" />
        <line x1="43" y1="43" x2="25" y2="34" stroke="currentColor" strokeWidth="1.2" />
        <line x1="57" y1="43" x2="75" y2="34" stroke="currentColor" strokeWidth="1.2" />
        <line x1="50" y1="60" x2="50" y2="79" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    </div>
  )
}

/** Card 2 Background: Spinning Bohr Atomic Orbitals, Orbiting Electrons & Benzene */
function AtomicBondBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes orbitalSpin1 {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes orbitalSpin2 {
          0% { transform: rotate(60deg); }
          100% { transform: rotate(420deg); }
        }
        @keyframes orbitalSpin3 {
          0% { transform: rotate(120deg); }
          100% { transform: rotate(480deg); }
        }
        @keyframes nucleusGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.25); opacity: 1; }
        }
        @keyframes benzeneBreathe {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.08) rotate(4deg); }
        }
      `}</style>

      {/* Ambient Gradient */}
      <div className="absolute -left-16 -top-16 size-60 rounded-full bg-cyan-500/15 blur-3xl transition-opacity duration-500 group-hover:bg-cyan-500/25 dark:bg-[#06b6d4]/15 dark:group-hover:bg-[#06b6d4]/30" />

      {/* Atomic Bohr Model & Electron Orbitals Wireframe */}
      <svg
        className="absolute -bottom-10 -left-10 h-64 w-64 text-white/15 transition-transform duration-500 group-hover:scale-105 group-hover:text-white/25 dark:text-[#06b6d4]/15 dark:group-hover:text-[#06b6d4]/30"
        viewBox="0 0 200 200"
        fill="none"
      >
        {/* Animated Pulsing Nucleus */}
        <circle cx="100" cy="100" r="14" fill="currentColor" opacity="0.3" style={{ animation: 'nucleusGlow 3s ease-in-out infinite', transformOrigin: '100px 100px' }} />
        <circle cx="100" cy="100" r="7" fill="currentColor" opacity="0.9" />

        {/* 3 Spinning Elliptical Orbitals */}
        <g style={{ animation: 'orbitalSpin1 16s linear infinite', transformOrigin: '100px 100px' }}>
          <ellipse cx="100" cy="100" rx="85" ry="32" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="185" cy="100" r="5" fill="currentColor" />
        </g>

        <g style={{ animation: 'orbitalSpin2 22s linear infinite', transformOrigin: '100px 100px' }}>
          <ellipse cx="100" cy="100" rx="85" ry="32" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="185" cy="100" r="5" fill="currentColor" />
        </g>

        <g style={{ animation: 'orbitalSpin3 28s linear infinite', transformOrigin: '100px 100px' }}>
          <ellipse cx="100" cy="100" rx="85" ry="32" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="185" cy="100" r="5" fill="currentColor" />
        </g>
      </svg>

      {/* Animated Hexagonal Benzene Ring in Top Corner */}
      <svg
        className="absolute right-4 top-4 h-32 w-32 text-white/10 transition-opacity duration-300 group-hover:text-white/20 dark:text-[#06b6d4]/10 dark:group-hover:text-[#06b6d4]/20"
        style={{ animation: 'benzeneBreathe 6s ease-in-out infinite', transformOrigin: 'center' }}
        viewBox="0 0 100 100"
        fill="none"
      >
        <polygon points="50,15 80,32 80,68 50,85 20,68 20,32" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 3" />
      </svg>
    </div>
  )
}

/** Card 3 Background: Animated Chemical Formula Matrix, Scan Beam & Exam Checkmark */
function ExamFormulaBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes floatFormula1 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes floatFormula2 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
        @keyframes drawCheck {
          0% { stroke-dashoffset: 60; }
          40%, 80% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -60; }
        }
        @keyframes scanBeam {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 0.5; }
          100% { transform: translateY(200%); opacity: 0; }
        }
      `}</style>

      {/* Ambient Gradient */}
      <div className="absolute -left-16 -top-16 size-60 rounded-full bg-brand/15 blur-3xl transition-opacity duration-500 group-hover:bg-brand/25 dark:bg-brand/15 dark:group-hover:bg-brand/30" />

      {/* Chemical Equations & Formula Matrix with Floating Motion */}
      <div className="absolute -bottom-4 -left-4 font-mono text-xs font-bold leading-loose text-white/15 transition-opacity duration-300 group-hover:text-white/30 dark:text-brand/15 dark:group-hover:text-brand/30 select-none">
        <div style={{ animation: 'floatFormula1 4.5s ease-in-out infinite' }} className="text-base tracking-widest opacity-90">
          pH = -log[H⁺]
        </div>
        <div style={{ animation: 'floatFormula2 5s ease-in-out infinite' }}>
          ΔH = H_products - H_reactants
        </div>
        <div style={{ animation: 'floatFormula1 6s ease-in-out infinite' }} className="text-sm font-black">
          E°cell = E°cathode - E°anode
        </div>
        <div style={{ animation: 'floatFormula2 4s ease-in-out infinite' }}>
          Kc = [C]^c [D]^d / [A]^a [B]^b
        </div>
        <div style={{ animation: 'floatFormula1 5.5s ease-in-out infinite' }} className="text-base">
          n = m / M (mol)
        </div>
      </div>

      {/* Animated Exam Grid with Self-Drawing Checkmark */}
      <svg
        className="absolute right-4 top-4 h-36 w-36 text-white/10 transition-transform duration-500 group-hover:scale-105 group-hover:text-white/20 dark:text-brand/10 dark:group-hover:text-brand/20"
        viewBox="0 0 100 100"
        fill="none"
      >
        <rect x="15" y="15" width="70" height="70" rx="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
        <path
          d="M30 35 L42 47 L70 23"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="60"
          style={{ animation: 'drawCheck 4s ease-in-out infinite' }}
        />
        <line x1="30" y1="60" x2="70" y2="60" stroke="currentColor" strokeWidth="1.5" />
        <line x1="30" y1="72" x2="55" y2="72" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

/** Card 4 Background: Dynamic Animated Growth Path, Radar Pings & Progress Tracker */
function AnalyticsGrowthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes dashMove {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -80; }
        }
        @keyframes radarPing {
          0% { r: 6; opacity: 0.9; stroke-width: 2; }
          100% { r: 28; opacity: 0; stroke-width: 0.5; }
        }
        @keyframes targetSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Ambient Gradient */}
      <div className="absolute -left-16 -top-16 size-60 rounded-full bg-amber-500/15 blur-3xl transition-opacity duration-500 group-hover:bg-amber-500/25 dark:bg-[#f59e0b]/15 dark:group-hover:bg-[#f59e0b]/30" />

      {/* Ascending Analytics Performance Curve with Live Animated Dashes */}
      <svg
        className="absolute -bottom-4 -left-4 h-56 w-64 text-white/15 transition-transform duration-500 group-hover:scale-105 group-hover:text-white/25 dark:text-[#f59e0b]/15 dark:group-hover:text-[#f59e0b]/30"
        viewBox="0 0 200 160"
        fill="none"
      >
        {/* Baseline & Grid */}
        <line x1="20" y1="140" x2="180" y2="140" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="20" y1="20" x2="20" y2="140" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Dynamic Growth Path with Running Energy Dash Animation */}
        <path
          d="M20 125 C50 120, 70 85, 100 80 C130 75, 150 35, 180 25"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="8 6"
          style={{ animation: 'dashMove 4s linear infinite' }}
        />
        {/* Shaded Area under Curve */}
        <path
          d="M20 125 C50 120, 70 85, 100 80 C130 75, 150 35, 180 25 L180 140 L20 140 Z"
          fill="currentColor"
          opacity="0.15"
        />

        {/* Milestone Nodes */}
        <circle cx="20" cy="125" r="4" fill="currentColor" />
        <circle cx="100" cy="80" r="5" fill="currentColor" />
        
        {/* Top Milestone with Animated Radar Ping */}
        <circle cx="180" cy="25" r="6" fill="currentColor" />
        <circle
          cx="180"
          cy="25"
          r="6"
          stroke="currentColor"
          fill="none"
          style={{ animation: 'radarPing 2.5s ease-out infinite' }}
        />
      </svg>

      {/* Target & 100% Score Milestone in Top Corner with Slow Spin */}
      <svg
        className="absolute right-4 top-4 h-28 w-28 text-white/10 transition-opacity duration-300 group-hover:text-white/20 dark:text-[#f59e0b]/10 dark:group-hover:text-[#f59e0b]/20"
        style={{ animation: 'targetSpin 25s linear infinite', transformOrigin: 'center' }}
        viewBox="0 0 100 100"
        fill="none"
      >
        <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <circle cx="50" cy="50" r="22" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="8" fill="currentColor" opacity="0.6" />
      </svg>
    </div>
  )
}

