/*
 * Animazioni d'ingresso con la Web Animations API del browser: nessuna libreria esterna.
 * Ogni animazione parte dallo stato indicato e arriva allo stato dato dal CSS; con `fill: 'backwards'`
 * non lascia stili in linea alla fine (un transform residuo creerebbe contesti di sovrapposizione).
 * Le animazioni continue (impulsi, onde) sono in CSS. Tutto si disattiva con "riduci movimento".
 */
import { useLayoutEffect, type RefObject } from 'react'

export type From = {
  opacity?: number
  x?: number
  y?: number
  scale?: number
  scaleX?: number
  scaleY?: number
  rotate?: number
  clipPath?: string
  /** transform-origin durante l'animazione */
  origin?: string
}

export type Timing = {
  /** secondi */
  duration?: number
  /** ritardo tra un elemento e il successivo, in secondi */
  stagger?: number
  /** inizio, in secondi dall'avvio */
  at?: number
  ease?: keyof typeof EASE
}

const EASE = {
  out: 'cubic-bezier(0.22, 1, 0.36, 1)',
  back: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
}

export type Motion = {
  /** Anima gli elementi di `selector` dallo stato `from` a quello del CSS. Restituisce quando finisce (s). */
  from: (selector: string, from: From, timing?: Timing) => number
}

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function transformOf(f: From): string | undefined {
  const parts: string[] = []
  if (f.x || f.y) parts.push(`translate(${f.x ?? 0}px, ${f.y ?? 0}px)`)
  if (f.scale !== undefined) parts.push(`scale(${f.scale})`)
  if (f.scaleX !== undefined) parts.push(`scaleX(${f.scaleX})`)
  if (f.scaleY !== undefined) parts.push(`scaleY(${f.scaleY})`)
  if (f.rotate) parts.push(`rotate(${f.rotate}deg)`)
  return parts.length ? parts.join(' ') : undefined
}

/** Anima un elemento (es. la lista di un menu appena aperta). */
export function animateIn(el: Element, from: From, timing: Timing = {}): Animation | undefined {
  if (prefersReducedMotion() || !el.animate) return undefined
  const [k0, k1] = keyframes(from)
  return el.animate([k0, k1], { duration: (timing.duration ?? 0.5) * 1000, delay: (timing.at ?? 0) * 1000, easing: EASE[timing.ease ?? 'out'], fill: 'backwards' })
}

function keyframes(f: From): [Keyframe, Keyframe] {
  const k0: Keyframe = {}
  const k1: Keyframe = {}
  if (f.opacity !== undefined) {
    k0.opacity = f.opacity
    k1.opacity = 1
  }
  const transform = transformOf(f)
  if (transform) {
    k0.transform = transform
    k1.transform = 'none'
  }
  if (f.clipPath) {
    k0.clipPath = f.clipPath
    k1.clipPath = 'inset(0 0 0 0)'
  }
  if (f.origin) k0.transformOrigin = k1.transformOrigin = f.origin
  return [k0, k1]
}

/** Animazioni d'ingresso nello `scope`; si rieseguono quando cambiano le `deps`. */
export function useMotion(scope: RefObject<HTMLElement | null>, animate: (m: Motion) => void, deps: unknown[] = []) {
  useLayoutEffect(() => {
    const root = scope.current
    if (!root || prefersReducedMotion() || !root.animate) return
    const running: Animation[] = []
    animate({
      from(selector, from, timing = {}) {
        const els = [...root.querySelectorAll(selector)]
        const duration = (timing.duration ?? 0.5) * 1000
        const stagger = (timing.stagger ?? 0) * 1000
        const at = (timing.at ?? 0) * 1000
        const [k0, k1] = keyframes(from)
        els.forEach((el, i) => running.push(el.animate([k0, k1], { duration, delay: at + i * stagger, easing: EASE[timing.ease ?? 'out'], fill: 'backwards' })))
        return (at + Math.max(0, els.length - 1) * stagger + duration) / 1000
      },
    })
    return () => running.forEach((a) => a.cancel())
  }, deps)
}
