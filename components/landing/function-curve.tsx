'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

type FunctionCurveProps = {
  /** SVG path data for the curve (optional if using default reaction curve) */
  d?: string
  className?: string
  /** optional custom stroke override */
  stroke?: string
  strokeWidth?: number
  /** delay before the draw animation starts */
  delay?: number
  viewBox?: string
  showLabels?: boolean
}

/**
 * Reaction Coordinate & Activation Energy Diagram (مسار التفاعل وطاقة التنشيط).
 * Illustrates reactants, activation barrier (Ea), transition state (‡),
 * catalyzed pathway (العامل الحفاز), products, and reaction enthalpy (ΔH).
 * Dual-theme compliant: Emerald/Gold in Light Mode & Glowing Neon in Dark Mode.
 */
export function FunctionCurve({
  d,
  className = '',
  stroke,
  strokeWidth = 2.5,
  delay = 0.2,
  viewBox = '0 0 600 320',
  showLabels = true,
}: FunctionCurveProps) {
  const uncatalyzedPathRef = useRef<SVGPathElement>(null)
  const catalyzedPathRef = useRef<SVGPathElement>(null)
  const labelsRef = useRef<SVGGElement>(null)

  // Uncatalyzed reaction coordinate: Reactants (flat 0-120) -> Barrier Peak (120-300) -> Products (300-580)
  const defaultUncatPath =
    d ||
    'M 20 220 L 120 220 C 180 220, 230 40, 300 40 C 370 40, 420 270, 480 270 L 580 270'

  // Catalyzed reaction coordinate: Lower activation energy peak at y=110
  const defaultCatPath =
    'M 120 220 C 180 220, 230 110, 300 110 C 370 110, 420 270, 480 270'

  useEffect(() => {
    const uncatPath = uncatalyzedPathRef.current
    const catPath = catalyzedPathRef.current
    const labels = labelsRef.current
    if (!uncatPath) return

    const uncatLen = uncatPath.getTotalLength()
    gsap.set(uncatPath, { strokeDasharray: uncatLen, strokeDashoffset: uncatLen })

    if (catPath) {
      const catLen = catPath.getTotalLength()
      gsap.set(catPath, { strokeDasharray: catLen, strokeDashoffset: catLen })
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(uncatPath, { strokeDashoffset: 0 })
      if (catPath) gsap.set(catPath, { strokeDashoffset: 0 })
      if (labels) gsap.set(labels, { opacity: 1 })
      return
    }

    const tl = gsap.timeline({ delay })
    tl.to(uncatPath, {
      strokeDashoffset: 0,
      duration: 1.8,
      ease: 'power2.inOut',
    })

    if (catPath) {
      tl.to(
        catPath,
        {
          strokeDashoffset: 0,
          duration: 1.4,
          ease: 'power2.inOut',
        },
        '-=1.0',
      )
    }

    if (labels) {
      tl.fromTo(
        labels,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
        '-=0.4',
      )
    }

    return () => {
      tl.kill()
    }
  }, [delay, d])

  return (
    <svg
      className={className}
      viewBox={viewBox}
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Neon Glow filter */}
        <filter id="neonGlowCurve" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid and reference baselines */}
      <g className="text-brand/25 dark:text-brand/30" stroke="currentColor" strokeDasharray="3 3">
        {/* Reactants energy level reference line */}
        <line x1="20" y1="220" x2="580" y2="220" strokeWidth="1" />
        {/* Products energy level reference line */}
        <line x1="20" y1="270" x2="580" y2="270" strokeWidth="1" />
        {/* Activation energy delta line */}
        <line x1="300" y1="40" x2="300" y2="220" strokeWidth="1.5" />
      </g>

      {/* Catalyzed reaction pathway (with catalyst - العامل الحفاز) */}
      <path
        ref={catalyzedPathRef}
        d={defaultCatPath}
        className="text-indigo-600 dark:text-brand"
        stroke="currentColor"
        strokeWidth={2}
        strokeDasharray="6 4"
        strokeLinecap="round"
      />

      {/* Main uncatalyzed reaction coordinate curve */}
      <path
        ref={uncatalyzedPathRef}
        d={defaultUncatPath}
        className="text-brand dark:text-brand"
        stroke={stroke || 'currentColor'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        filter="url(#neonGlowCurve)"
      />

      {showLabels && (
        <g ref={labelsRef} className="text-xs font-mono font-bold select-none">
          {/* Transition state marker (الحالة الانتقالية) */}
          <circle cx="300" cy="40" r="5" className="fill-brand dark:fill-brand" />
          <text x="300" y="22" textAnchor="middle" className="fill-brand text-[11px] font-mono font-bold dark:fill-brand">
            الحالة الانتقالية [‡]
          </text>

          {/* Catalyzed peak marker */}
          <circle cx="300" cy="110" r="4" className="fill-indigo-600 dark:fill-brand" />
          <text x="300" y="132" textAnchor="middle" className="fill-indigo-700 text-[10px] font-mono font-bold dark:fill-brand">
            مع العامل الحفاز (Ea_cat)
          </text>

          {/* Reactants (المتفاعلات) */}
          <circle cx="70" cy="220" r="4" className="fill-cyan-700 dark:fill-[#06b6d4]" />
          <text x="70" y="207" textAnchor="middle" className="fill-cyan-800 text-[11px] font-mono font-bold dark:fill-[#06b6d4]">
            المتفاعلات
          </text>

          {/* Products (النواتج) */}
          <circle cx="530" cy="270" r="4" className="fill-brand dark:fill-brand" />
          <text x="530" y="296" textAnchor="middle" className="fill-brand text-[11px] font-mono font-bold dark:fill-brand">
            النواتج (Products)
          </text>

          {/* Energy Enthalpy ΔH < 0 */}
          <text x="520" y="248" textAnchor="middle" className="fill-rose-600 text-[10px] font-mono font-bold dark:fill-[#f43f5e]">
            ΔH &lt; 0 (طارد للحرارة)
          </text>
        </g>
      )}
    </svg>
  )
}

export const ReactionEnergyCurve = FunctionCurve

