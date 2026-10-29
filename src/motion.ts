import type { RefObject } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)
// A fine animazione si tolgono transform e opacità in linea: un transform residuo crea un contesto di
// sovrapposizione che fa finire le sezioni successive sopra i menu e i tooltip.
gsap.defaults({ clearProps: 'transform,opacity' })

/**
 * Animazioni GSAP nello `scope`, solo se il sistema non chiede di ridurre il movimento
 * (come in gs1-italy-vbg-app). Si rieseguono quando cambiano le `deps`.
 */
export function useMotion(scope: RefObject<HTMLElement | null>, animate: () => void, deps: unknown[] = []) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', animate)
      return () => mm.revert()
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  )
}

export { gsap }
