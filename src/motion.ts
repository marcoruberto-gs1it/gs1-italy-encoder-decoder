/*
 * Animazioni con GSAP (https://gsap.com, licenza standard "no charge"): è l'unico file che lo importa,
 * così si può sostituire senza toccare i componenti.
 * Regole: si anima ciò che cambia o che l'utente ha appena fatto; ogni animazione parte dallo stato
 * indicato e arriva a quello del CSS, senza lasciare stili in linea. Tutto si disattiva con "riduci movimento".
 */
import { useLayoutEffect, type RefObject } from 'react'
import { gsap } from 'gsap'

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
  out: 'expo.out',
  back: 'back.out(1.6)',
  inOut: 'power3.inOut',
}

export type Motion = {
  /** Anima gli elementi di `selector` dallo stato `from` a quello del CSS. Restituisce quando finisce (s). */
  from: (selector: string, from: From, timing?: Timing) => number
}

/** Solo le proprietà animate: gli stili in linea di React (colori, larghezze) restano. */
const CLEAR = 'opacity,transform,filter,clipPath,transformOrigin,height'

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function vars(f: From): gsap.TweenVars {
  const v: gsap.TweenVars = {}
  if (f.opacity !== undefined) v.opacity = f.opacity
  if (f.x) v.x = f.x
  if (f.y) v.y = f.y
  if (f.scale !== undefined) v.scale = f.scale
  if (f.scaleX !== undefined) v.scaleX = f.scaleX
  if (f.scaleY !== undefined) v.scaleY = f.scaleY
  if (f.rotate) v.rotation = f.rotate
  if (f.clipPath) v.clipPath = f.clipPath
  if (f.origin) v.transformOrigin = f.origin
  return v
}

const tween = (targets: gsap.TweenTarget, from: From, timing: Timing = {}) =>
  gsap.from(targets, {
    ...vars(from),
    duration: timing.duration ?? 0.5,
    delay: timing.at ?? 0,
    stagger: timing.stagger ?? 0,
    ease: EASE[timing.ease ?? 'out'],
    clearProps: CLEAR,
  })

/** Anima un elemento (es. la lista di un menu appena aperta). */
export function animateIn(el: Element, from: From, timing: Timing = {}) {
  if (prefersReducedMotion()) return undefined
  return tween(el, from, timing)
}

/** Animazioni d'ingresso nello `scope`; si rieseguono quando cambiano le `deps`. */
export function useMotion(scope: RefObject<Element | null>, animate: (m: Motion) => void, deps: unknown[] = []) {
  useLayoutEffect(() => {
    const root = scope.current
    if (!root || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      animate({
        from(selector, from, timing = {}) {
          const els = root.querySelectorAll(selector)
          if (!els.length) return timing.at ?? 0
          tween(els, from, timing)
          return (timing.at ?? 0) + Math.max(0, els.length - 1) * (timing.stagger ?? 0) + (timing.duration ?? 0.5)
        },
      })
    }, root)
    return () => ctx.revert()
  }, deps)
}

/** Scuote un elemento per attirare l'attenzione su un errore appena comparso. */
export function shake(el: Element | null) {
  if (!el || prefersReducedMotion()) return
  gsap.fromTo(el, { x: 0 }, { keyframes: { x: [0, -7, 6, -4, 3, 0] }, duration: 0.45, ease: 'power2.out', clearProps: 'transform' })
}

/** Fa lampeggiare il contorno di un elemento (es. il campo da compilare indicato da una segnalazione). */
export function flash(el: Element | null) {
  if (!el || prefersReducedMotion()) return
  gsap.fromTo(el, { boxShadow: '0 0 0 0 rgba(242, 99, 52, 0.55)' }, { boxShadow: '0 0 0 8px rgba(242, 99, 52, 0)', duration: 0.9, repeat: 1, ease: 'power2.out', clearProps: 'boxShadow' })
}

/** Le cifre esadecimali appena cambiate scendono in posizione, da sinistra a destra. */
export function rollIn(els: Element[]) {
  if (!els.length || prefersReducedMotion()) return
  gsap.fromTo(els, { yPercent: -70, opacity: 0, filter: 'blur(3px)' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.55, ease: 'expo.out', stagger: 0.012, clearProps: CLEAR })
}

/** I bit sotto le cifre crescono a onda, nell'ordine in cui il tag li memorizza. */
export function waveIn(els: Element[]) {
  if (!els.length || prefersReducedMotion()) return
  gsap.fromTo(els, { scaleY: 0, transformOrigin: '50% 0%' }, { scaleY: 1, duration: 0.4, ease: 'back.out(2)', stagger: { each: 0.0025 }, clearProps: 'transform' })
}

/** Entrata coordinata della pagina, una sola volta all'avvio. */
export function intro(root: Element | null) {
  if (!root || prefersReducedMotion()) return
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
  tl.from(root.querySelectorAll('.topbar > *'), { y: -12, opacity: 0, duration: 0.6, stagger: 0.06, clearProps: CLEAR })
    .from(root.querySelectorAll('.input-panel > *, .input-panel .field-group'), { x: -16, opacity: 0, duration: 0.6, stagger: 0.05, clearProps: CLEAR }, 0.1)
    .from(root.querySelectorAll('.pane-results > *'), { y: 18, opacity: 0, duration: 0.7, stagger: 0.08, clearProps: CLEAR }, 0.2)
}

/** Una segnalazione appena comparsa: scende in posizione; gli errori in più scuotono. */
export function alertIn(el: Element | null, error: boolean) {
  if (!el || prefersReducedMotion()) return
  const tl = gsap.timeline()
  tl.fromTo(el, { height: 0, opacity: 0, y: -6 }, { height: 'auto', opacity: 1, y: 0, duration: 0.45, ease: 'expo.out', clearProps: CLEAR })
  if (error) tl.add(() => shake(el), 0.3)
}

/** Una sezione che si apre: il contenuto cresce dall'altezza zero. */
export function expand(el: Element | null) {
  if (!el || prefersReducedMotion()) return
  gsap.fromTo(el, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.5, ease: 'expo.out', clearProps: CLEAR })
}

/** Una sezione che si chiude: il contenuto si richiude, poi `done` lo toglie dalla pagina. */
export function collapse(el: Element | null, done: () => void) {
  if (!el || prefersReducedMotion()) return done()
  gsap.to(el, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: done })
}
