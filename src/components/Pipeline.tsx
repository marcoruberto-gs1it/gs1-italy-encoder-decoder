import { useRef, type ReactNode } from 'react'
import type { Analysis } from '../gs1/analyze'
import type { Verification } from '../gs1/vbg'
import { useMotion, gsap } from '../motion'
import { BarsGlyph, QrGlyph, TagGlyph } from './Illustrations'
import { epcRuns } from './ColoredBits'
import { t } from '../i18n'

type Stage = { tab: string; title: string; detail: string; art: ReactNode; off?: boolean }

type Props = { analysis: Analysis; scheme: string | null; vbg?: Verification | 'loading'; tab: string; onTab: (t: string) => void }

/** Infografica del percorso: dati GS1 → EPC → tag RFID → barcode → Verified by GS1. Ogni tappa apre la sua scheda. */
export function Pipeline({ analysis, scheme, vbg, tab, onTab }: Props) {
  const scope = useRef<HTMLDivElement>(null)
  const result = analysis.results.find((r) => r.scheme === scheme)
  const ok = result?.ok ? result : null
  const gs1 = analysis.gs1

  useMotion(
    scope,
    () => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('.pl-stage', { y: 18, opacity: 0, duration: 0.5, stagger: 0.09 })
        .from('.pl-conn-line', { scaleX: 0, transformOrigin: '0% 50%', duration: 0.35, stagger: 0.09 }, '-=0.45')
      gsap.fromTo('.pl-pulse', { left: '0%', opacity: 0 }, { left: '100%', opacity: 1, duration: 1.3, ease: 'power1.inOut', repeat: -1, stagger: 0.25, repeatDelay: 0.4 })
    },
    [gs1?.elementString, scheme],
  )

  const stages: Stage[] = [
    {
      tab: 'journey',
      title: t('Dati GS1'),
      detail: gs1?.elementString ?? '—',
      art: (
        <span className="pl-ais">
          {analysis.ais.slice(0, 4).map((a) => (
            <b key={a.ai}>({a.ai})</b>
          ))}
        </span>
      ),
    },
    {
      tab: 'journey',
      title: ok ? ok.scheme : 'EPC',
      detail: ok ? (ok.dropped.length ? `${t('Senza {ais}', { ais: ok.dropped.map((a) => `(${a.ai})`).join(' ') })} · ${ok.hex}` : ok.hex) : (analysis.rfidNote ?? (result && !result.ok ? result.error : '—')),
      off: !ok,
      art: ok ? (
        <span className="pl-bits mono">
          {epcRuns(ok).reduce<{ out: ReactNode[]; left: number }>(
            (acc, r, i) => {
              if (acc.left > 0) acc.out.push(<span key={i} style={{ color: r.color }}>{r.bits.slice(0, acc.left)}</span>)
              acc.left -= r.bits.length
              return acc
            },
            { out: [], left: 24 },
          ).out}
        </span>
      ) : (
        <span className="pl-bits mono">0101 1010</span>
      ),
    },
    {
      tab: 'rfid',
      title: 'Tag RFID',
      detail: ok ? t('{bits} bit · {words} parole nel banco EPC', { bits: ok.length, words: ok.bits.length / 16 + 2 }) : t('Nessun EPC'),
      off: !ok,
      art: (
        <svg viewBox="0 0 100 50" className="pl-art">
          <TagGlyph x={0} y={0} w={100} h={50} />
        </svg>
      ),
    },
    {
      tab: 'barcode',
      title: t('Barcode e QR'),
      detail: gs1?.dl ?? gs1?.elementString ?? '—',
      art: (
        <svg viewBox="0 0 100 44" className="pl-art">
          <BarsGlyph x={0} y={4} w={56} h={36} count={14} seed={8} />
          <QrGlyph x={64} y={4} size={36} />
        </svg>
      ),
    },
    {
      tab: 'vbg',
      title: 'Verified by GS1',
      detail: !vbg
        ? t('Non disponibile per questa chiave')
        : vbg === 'loading'
          ? t('Verifica in corso…')
          : vbg.state === 'verified'
            ? (vbg.name ?? t('Verificato'))
            : vbg.state === 'licensed'
              ? (vbg.licensee?.name ?? t('Licenza GS1 trovata'))
              : (vbg.message ?? t('Non verificato')),
      off: !vbg || (vbg !== 'loading' && (vbg.state === 'error' || vbg.state === 'invalid')),
      art: (
        <svg viewBox="0 0 40 44" className="pl-art small">
          <path d="M20 2l17 6v13c0 12-7.5 20-17 24C10.5 41 3 33 3 21V8z" fill="#002c6c" />
          <path d="M12 22l6 6 11-12" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ]

  return (
    <div className="pipeline" ref={scope}>
      {stages.map((s, i) => (
        <div className="pl-cell" key={s.title + i}>
          <button className={`pl-stage ${s.off ? 'off' : ''} ${tab === s.tab && i !== 0 ? 'current' : ''}`} onClick={() => onTab(s.tab)}>
            <span className="pl-art-box">{s.art}</span>
            <strong>{s.title}</strong>
            <small className={i < 2 ? 'mono' : ''}>{s.detail}</small>
          </button>
          {i < stages.length - 1 && (
            <span className="pl-conn" aria-hidden>
              <span className="pl-conn-line" />
              <span className="pl-pulse" />
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
