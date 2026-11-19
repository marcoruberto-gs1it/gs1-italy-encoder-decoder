import { useEffect, useRef, type ReactNode } from 'react'
import type { AnimationItem } from 'lottie-web'
import { LOTTIE, type LottieName } from '../anim/lottieData'
import { prefersReducedMotion } from '../motion'

/** lottie-web "light" (solo SVG, senza espressioni né eval): si carica alla prima icona animata. */
let player: Promise<typeof import('lottie-web/build/player/lottie_light').default> | null = null
const loadPlayer = () =>
  (player ??= import('lottie-web/build/player/lottie_light').then((m) => m.default).catch((e: unknown) => {
    player = null
    throw e
  }))

type Props = {
  name: LottieName
  size?: number
  /** In ciclo finché resta montata (es. una lettura in corso); altrimenti una volta sola. */
  loop?: boolean
  /** Cambiando valore l'animazione riparte (es. a ogni nuovo esito). */
  replay?: unknown
  /** Mostrata finché il player non è pronto o se non si carica. */
  fallback?: ReactNode
  className?: string
}

/** Icona animata Lottie, decorativa: il significato resta nel testo accanto. Con "riduci movimento" è ferma all'ultimo fotogramma. */
export function LottieIcon({ name, size = 20, loop = false, replay, fallback, className }: Props) {
  const box = useRef<HTMLSpanElement>(null)
  const anim = useRef<AnimationItem | null>(null)

  useEffect(() => {
    let alive = true
    const el = box.current
    if (!el) return
    loadPlayer()
      .then((lottie) => {
        if (!alive) return
        const reduced = prefersReducedMotion()
        anim.current = lottie.loadAnimation({ container: el, renderer: 'svg', loop: loop && !reduced, autoplay: !reduced, animationData: LOTTIE[name](), rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: false } })
        el.dataset.ready = 'true'
        if (reduced) anim.current.goToAndStop(loop ? 0 : anim.current.totalFrames - 1, true)
      })
      .catch(() => undefined)
    return () => {
      alive = false
      anim.current?.destroy()
      anim.current = null
      delete el.dataset.ready
    }
  }, [name, loop])

  useEffect(() => {
    if (replay === undefined || !anim.current || prefersReducedMotion()) return
    anim.current.goToAndPlay(0, true)
  }, [replay])

  return (
    <span className={`lottie ${className ?? ''}`} style={{ width: size, height: size }} aria-hidden>
      <span className="lottie-fallback">{fallback}</span>
      <span className="lottie-player" ref={box} />
    </span>
  )
}
