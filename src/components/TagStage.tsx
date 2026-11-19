import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { TagScene, TagSceneMode } from '../three/tagScene'
import { prefersReducedMotion, revealGroups } from '../motion'
import { t } from '../i18n'

/** L'EPC dell'esempio (SGTIN-96 di un GTIN sul prefisso di GS1 Italy), lo stesso dell'infografica HeroEpc. */
const SAMPLE_HEX = '3035E8480000004000003039'
const SAMPLE_BITS = [...SAMPLE_HEX].map((h) => parseInt(h, 16).toString(2).padStart(4, '0')).join('')

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}

/**
 * Tag RAIN RFID in 3D (three.js, caricato solo qui). Se WebGL non c'è o il modulo non si carica,
 * resta l'illustrazione SVG `fallback`. L'EPC sotto il tag è testo vero, leggibile e selezionabile.
 */
export function TagStage({ mode, fallback }: { mode: TagSceneMode; fallback: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const label = useRef<HTMLElement>(null)
  const [failed, setFailed] = useState(() => typeof window !== 'undefined' && !webglAvailable())

  useEffect(() => {
    if (failed || !canvas.current) return
    let scene: TagScene | null = null
    let alive = true
    const reduced = prefersReducedMotion()
    const reveal = () => revealGroups(label.current?.querySelectorAll('.stage-hex span') ?? [])
    import('../three/tagScene')
      .then(({ createTagScene }) => {
        if (!alive || !canvas.current) return
        scene = createTagScene(canvas.current, { mode, bits: SAMPLE_BITS, reducedMotion: reduced, onArrive: reveal })
      })
      .catch((e: unknown) => {
        console.error(e)
        if (alive) setFailed(true)
      })
    const onLost = (e: Event) => {
      e.preventDefault()
      setFailed(true)
    }
    const c = canvas.current
    c.addEventListener('webglcontextlost', onLost)
    return () => {
      alive = false
      c.removeEventListener('webglcontextlost', onLost)
      scene?.dispose()
    }
  }, [mode, failed])

  if (failed) return <div className="stage-fallback">{fallback}</div>

  return (
    <figure className="stage-tag">
      <canvas ref={canvas} className="stage-canvas" aria-hidden />
      <figcaption ref={label}>
        <span className="stage-caption">{mode === 'write' ? t('I 96 bit dell’EPC scritti nel chip') : t('Il lettore legge i 96 bit dal chip')}</span>
        <span className="stage-hex mono">
          {SAMPLE_HEX.match(/.{4}/g)!.map((g, i) => (
            <span key={i}>{g}</span>
          ))}
        </span>
      </figcaption>
    </figure>
  )
}
