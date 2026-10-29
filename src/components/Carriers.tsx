import { useEffect, useMemo, useRef, useState } from 'react'
import { useMotion, gsap } from '../motion'
import { Download } from 'lucide-react'
import { CARRIERS, loadBwip, renderCarrier } from '../gs1/barcodes'
import type { Gs1Data } from '../gs1/syntax'
import { CopyText } from './ui'
import { t } from '../i18n'

const GS = '<GS>'

function download(name: string, svg: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `${name}.svg` })
  a.click()
  URL.revokeObjectURL(url)
}

/** I dati GS1 sui diversi data carrier, con cosa trasmette il lettore per ciascuno. */
export function Carriers({ data }: { data: Gs1Data }) {
  const [lib, setLib] = useState<Awaited<ReturnType<typeof loadBwip>> | null>(null)
  useEffect(() => {
    void loadBwip().then(setLib)
  }, [])
  const rendered = useMemo(() => (lib ? CARRIERS.map((c) => ({ c, r: renderCarrier(lib, c, data) })) : []), [lib, data])
  // I dati trasmessi: identificatore di simbologia + dati con FNC1 iniziale implicito e GS come separatore.
  const transmitted = data.scanData.replace(/^\^/, '').replaceAll('^', GS)
  const scope = useRef<HTMLDivElement>(null)
  useMotion(
    scope,
    () => {
      gsap.from('.carrier', { y: 24, opacity: 0, scale: 0.96, duration: 0.5, stagger: 0.07, ease: 'power3.out' })
      gsap.from('.svg-wrap svg', { clipPath: 'inset(0 100% 0 0)', duration: 0.7, stagger: 0.07, ease: 'power2.inOut', delay: 0.15 })
    },
    [lib, data.elementString],
  )

  return (
    <div className="carriers" ref={scope}>
      <div className="carrier-intro">
        <CopyText label={t('Testo leggibile (HRI) sotto il simbolo')} value={data.hri.join('  ')} />
        <CopyText label={t('Dati trasmessi dal lettore (dopo l’identificatore di simbologia)')} value={transmitted} />
        <p className="muted small">
          {t('Nei simboli GS1 il carattere FNC1 iniziale dice che i dati seguono la sintassi degli AI; tra un AI a lunghezza variabile e il successivo il lettore trasmette il separatore {gs} (ASCII 29). Nei simboli con GS1 Digital Link il contenuto è invece l’URI web.', { gs: GS })}
        </p>
      </div>
      <div className="carrier-grid">
        {rendered.map(({ c, r }) => (
          <article key={c.id} className={`carrier ${!r || 'error' in r ? 'off' : ''}`}>
            <header>
              <strong>{c.name}</strong>
              <span className="mono sym-id" title={t('Identificatore di simbologia trasmesso dal lettore')}>
                {c.symbologyId}
              </span>
            </header>
            <div className="carrier-img">
              {r && 'svg' in r ? <div className="svg-wrap" dangerouslySetInnerHTML={{ __html: r.svg }} /> : <p className="muted small">{r ? t('Non generabile: {error}', { error: r.error }) : c.id === 'ean13' ? t('Solo per un GTIN-13 senza altri dati.') : t('Serve una chiave primaria per il Digital Link.')}</p>}
            </div>
            <p className="carrier-when">{c.when}</p>
            {r && 'svg' in r && (
              <footer>
                <code className="mono small">{c.text(data)}</code>
                <button className="ghost small" onClick={() => download(`${c.id}`, r.svg)}>
                  <Download size={14} /> SVG
                </button>
              </footer>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
