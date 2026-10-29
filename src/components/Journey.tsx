import type { ReactNode } from 'react'
import { ArrowDown, Info } from 'lucide-react'
import type { Analysis } from '../gs1/analyze'
import type { SchemeResult } from '../gs1/epc'
import type { Ai } from '../gs1/schemes'
import { t } from '../i18n'
import { aiLabel } from '../gs1/aiDictionary'
import { checkDigitSteps } from '../gs1/checkDigit'
import { BitMap, SchemeSelect } from './EpcParts'
import { useRef } from 'react'
import { useMotion } from '../motion'
import { SCHEMES_BY_FAMILY } from '../gs1/schemes'
import { CopyText } from './ui'
import { BitsPanel, epcRuns } from './ColoredBits'
import { CoverageMatrix, TagContents } from './Coverage'

type Props = { analysis: Analysis; scheme: string | null; onScheme: (s: string) => void }

type Part = { label: string; digits: string; tone: string }

/** Scomposizione della chiave nelle sue parti (indicatore, GS1 Company Prefix, riferimento, cifra di controllo…). */
export function keyAnatomy(key: Ai, gcpLength: number | null): Part[] | null {
  const parts = anatomyWith(key, gcpLength ?? 0)
  if (!parts || gcpLength) return parts
  // Senza la lunghezza del GS1 Company Prefix non si sa dove finisce: prefisso e riferimento restano uniti.
  return parts.flatMap((p) => (p.tone === 'gcp' ? [] : p.tone === 'ref' ? [{ ...p, label: t('GS1 Company Prefix + riferimento'), tone: 'gcp' }] : [p]))
}

function anatomyWith(key: Ai, gcp: number): Part[] | null {
  const v = key.value
  const p = (label: string, digits: string, tone: string): Part => ({ label, digits, tone })
  switch (key.ai) {
    case '01':
      return [p(t('Indicatore'), v[0], 'ind'), p('GS1 Company Prefix', v.slice(1, 1 + gcp), 'gcp'), p('Item Reference', v.slice(1 + gcp, 13), 'ref'), p(t('Cifra di controllo'), v[13], 'cd')]
    case '00':
      return [p(t('Estensione'), v[0], 'ind'), p('GS1 Company Prefix', v.slice(1, 1 + gcp), 'gcp'), p(t('Riferimento seriale'), v.slice(1 + gcp, 17), 'ref'), p(t('Cifra di controllo'), v[17], 'cd')]
    case '8006':
      return [p(t('Indicatore'), v[0], 'ind'), p('GS1 Company Prefix', v.slice(1, 1 + gcp), 'gcp'), p('Item Reference', v.slice(1 + gcp, 13), 'ref'), p(t('Cifra di controllo'), v[13], 'cd'), p(t('Pezzo'), v.slice(14, 16), 'ser'), p(t('Totale'), v.slice(16, 18), 'ser')]
    case '8003':
      return [p(t('Zero fisso'), v[0], 'ind'), p('GS1 Company Prefix', v.slice(1, 1 + gcp), 'gcp'), p(t('Tipo di bene'), v.slice(1 + gcp, 13), 'ref'), p(t('Cifra di controllo'), v[13], 'cd'), ...(v.length > 14 ? [p(t('Seriale'), v.slice(14), 'ser')] : [])]
    case '414':
    case '253':
    case '255':
      return [p('GS1 Company Prefix', v.slice(0, gcp), 'gcp'), p(t('Riferimento'), v.slice(gcp, 12), 'ref'), p(t('Cifra di controllo'), v[12], 'cd'), ...(v.length > 13 ? [p(t('Seriale'), v.slice(13), 'ser')] : [])]
    case '8017':
    case '8018':
      return [p('GS1 Company Prefix', v.slice(0, gcp), 'gcp'), p(t('Riferimento del servizio'), v.slice(gcp, 17), 'ref'), p(t('Cifra di controllo'), v[17], 'cd')]
    case '8004':
    case '8010':
      return [p('GS1 Company Prefix', v.slice(0, gcp), 'gcp'), p(t('Riferimento'), v.slice(gcp), 'ref')]
    default:
      return null
  }
}

function Step({ n, title, children, aside }: { n: number; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="step">
      <div className="step-num">{n}</div>
      <div className="step-body">
        <h3>{title}</h3>
        {children}
      </div>
      {aside && <aside className="step-aside">{aside}</aside>}
    </section>
  )
}

const Down = () => (
  <div className="step-arrow" aria-hidden>
    <ArrowDown size={18} />
  </div>
)

export function Journey({ analysis, scheme, onScheme }: Props) {
  const gs1 = analysis.gs1!
  const key = analysis.ais[0]
  const anatomy = analysis.key && key ? keyAnatomy(key, analysis.gcp.length) : null
  const cdPart = anatomy?.find((p) => p.tone === 'cd')
  const cdBody = anatomy ? anatomy.slice(0, anatomy.findIndex((p) => p.tone === 'cd')).map((p) => p.digits).join('') : ''
  const steps = cdPart ? checkDigitSteps(cdBody) : null
  const result = analysis.results.find((r) => r.scheme === scheme)
  const scope = useRef<HTMLDivElement>(null)

  useMotion(
    scope,
    (m) => {
      m.from('.step', { y: 22, opacity: 0 }, { duration: 0.5, stagger: 0.08 })
      m.from('.step-num', { scale: 0 }, { duration: 0.4, stagger: 0.08, at: 0.1, ease: 'back' })
      m.from('.es-ai', { y: 8, opacity: 0 }, { duration: 0.3, stagger: 0.05, at: 0.2 })
      m.from('.anat', { y: 10, scale: 0.9, opacity: 0 }, { duration: 0.35, stagger: 0.07, at: 0.25, ease: 'back' })
    },
    [gs1.elementString],
  )

  return (
    <div className="journey" ref={scope}>
      <Step n={1} title={t('I dati GS1')}>
        <p className="lead">{t('Ogni dato è preceduto dal suo Application Identifier (AI), che ne dice il significato e il formato.')}</p>
        <div className="es-line mono">
          {analysis.ais.map((a) => (
            <span key={a.ai} className="es-ai" title={aiLabel(a.ai)}>
              <b>({a.ai})</b>
              {a.value}
            </span>
          ))}
        </div>
        <div className="ai-legend">
          {analysis.ais.map((a) => (
            <span key={a.ai}>
              <b>({a.ai})</b> {aiLabel(a.ai)}
            </span>
          ))}
        </div>
      </Step>

      {anatomy && (
        <>
          <Down />
          <Step
            n={2}
            title={t('Com’è fatta la chiave {key}', { key: analysis.key!.short === 'SGTIN' ? 'GTIN' : analysis.key!.short })}
            aside={
              <p>
                <Info size={14} />{' '}
                {analysis.gcp.length ? (
                  <>
                    {analysis.gcp.source === 'Verified by GS1'
                      ? t('GS1 Company Prefix di {n} cifre, dalla licenza registrata su Verified by GS1.', { n: analysis.gcp.length })
                      : analysis.gcp.source === 'tag'
                        ? t('GS1 Company Prefix di {n} cifre, letto dalla partizione del tag.', { n: analysis.gcp.length })
                        : t('GS1 Company Prefix di {n} cifre, scelto da te nei parametri del tag.', { n: analysis.gcp.length })}
                  </>
                ) : analysis.gcp.pending ? (
                  t('Verifica su Verified by GS1 in corso per ricavare il GS1 Company Prefix…')
                ) : (
                  t('Verified by GS1 non fornisce il GS1 Company Prefix di questo codice: scegli la sua lunghezza nei parametri del tag.')
                )}
              </p>
            }
          >
            <div className="anatomy">
              {anatomy
                .filter((p) => p.digits)
                .map((p, i) => (
                  <div key={i} className={`anat anat-${p.tone}`}>
                    <span className="mono anat-digits">{p.digits}</span>
                    <span className="anat-label">{p.label}</span>
                  </div>
                ))}
            </div>
            {steps && cdPart && (
              <details className="cd-calc">
                <summary>
                  {t('Come si calcola la cifra di controllo')} <b className="mono">{steps.checkDigit}</b>
                </summary>
                <div className="cd-grid mono">
                  {steps.digits.map((d, i) => (
                    <div key={i}>
                      <span>{d.digit}</span>
                      <span className="muted">×{d.weight}</span>
                      <span>{d.product}</span>
                    </div>
                  ))}
                </div>
                <p>
                  {t('Somma = {sum}; la cifra di controllo è quanto manca per arrivare alla decina superiore: {cd}', { sum: steps.sum, cd: steps.checkDigit })}
                  {String(steps.checkDigit) === cdPart.digits ? ' ✓' : ` ${t('(nel dato c’è {d})', { d: cdPart.digits })}`}
                </p>
              </details>
            )}
          </Step>
        </>
      )}

      {analysis.rfidNote ? (
        <>
          <Down />
          <div className="note warn">{analysis.rfidNote}</div>
        </>
      ) : (
        analysis.results.length > 0 && (
          <>
            <Down />
            <Step n={3} title={t('Scegli lo schema EPC per il tag RFID')}>
              <SchemeSelect schemes={SCHEMES_BY_FAMILY[analysis.key!.id]} results={analysis.results} scheme={scheme} onScheme={onScheme} />
              <TagContents analysis={analysis} result={result} />
              <details className="compare">
                <summary>{t('Confronta che cosa entra nel tag con ogni schema')}</summary>
                <CoverageMatrix analysis={analysis} scheme={scheme} onScheme={onScheme} />
              </details>
            </Step>
            {result?.ok && (
              <>
                <Down />
                <Step n={4} title={t('Dai dati GS1 a {scheme}', { scheme: result.scheme })}>
                  <Transform analysis={analysis} result={result} />
                </Step>
                <Down />
                <Step n={5} title={t('Bit per bit')}>
                  <p className="lead">{t('Passa sopra un campo per evidenziarlo. Il tag memorizza questi bit nel banco EPC, a parole da 16 bit.')}</p>
                  <BitMap result={result} />
                </Step>
                <Down />
                <Step n={6} title={t('Il risultato')}>
                  <div className="result-grid">
                    <CopyText label={t('EPC in esadecimale (da scrivere nel tag)')} value={result.hex} big />
                    <BitsPanel label={t('EPC in binario · {bits} bit in {words} parole da 16, colorati per campo', { bits: result.bits.length, words: result.bits.length / 16 })} runs={epcRuns(result)} />
                    {result.uris.tag && <CopyText label="EPC Tag URI" value={result.uris.tag} />}
                    {result.uris.pure && <CopyText label="EPC Pure Identity URI" value={result.uris.pure} />}
                    {result.uris.dl && <CopyText label={t('GS1 Digital Link ricostruito dal tag')} value={result.uris.dl} />}
                    <CopyText label="Element string" value={gs1.elementString} />
                  </div>
                </Step>
              </>
            )}
          </>
        )
      )}
    </div>
  )
}

/** Passaggio intermedio: per gli schemi TDS 1.x la chiave diventa un URN, per + e ++ gli AI vanno direttamente in binario. */
function Transform({ analysis, result }: { analysis: Analysis; result: Extract<SchemeResult, { ok: true }> }) {
  const key = analysis.ais[0]
  if (result.kind === 'legacy') {
    const gcp = analysis.gcp.length ?? 0
    return (
      <div className="transform">
        {key.ai === '01' && (
          <div className="tf-row">
            <div className="tf-box mono">
              <span className="anat-ind">{key.value[0]}</span>
              <span className="anat-gcp">{key.value.slice(1, 1 + gcp)}</span>
              <span className="anat-ref">{key.value.slice(1 + gcp, 13)}</span>
              <span className="anat-cd strike">{key.value[13]}</span>
            </div>
            <span className="tf-arrow">→</span>
            <div className="tf-box mono">
              <span className="anat-gcp">{key.value.slice(1, 1 + gcp)}</span>
              <span className="dot">.</span>
              <span className="anat-ind">{key.value[0]}</span>
              <span className="anat-ref">{key.value.slice(1 + gcp, 13)}</span>
            </div>
            <p className="tf-note">{t('La cifra di controllo si toglie (il lettore la ricalcola) e l’indicatore si sposta davanti all’Item Reference.')}</p>
          </div>
        )}
        {result.uris.pure && (
          <div className="tf-row">
            <CopyText label={t('EPC Pure Identity URI: l’identità, senza dettagli del tag')} value={result.uris.pure} />
          </div>
        )}
        {result.uris.tag && (
          <div className="tf-row">
            <CopyText label={t('EPC Tag URI: aggiunge schema ({scheme}) e filter value ({filter})', { scheme: result.scheme.toLowerCase(), filter: analysis.params.filter })} value={result.uris.tag} />
          </div>
        )}
        <p className="tf-note">
          {t('La partizione indica quante cifre ha il GS1 Company Prefix ({n}): così il lettore sa dove separarlo dal riferimento. Ogni campo è poi scritto in binario a lunghezza fissa.', { n: gcp })}
        </p>
      </div>
    )
  }
  return (
    <div className="transform">
      <div className="tf-ais">
        {analysis.ais.map((a) => {
          const inKey = analysis.key?.fields.some((f) => f.ai === a.ai)
          return (
            <div key={a.ai} className={`tf-ai ${inKey ? '' : 'plus'}`}>
              <span className="ai-tag">({a.ai})</span> {aiLabel(a.ai)}
              <span className="mono">{a.value}</span>
              <span className="kind kind-plus">{inKey ? t('chiave') : '+AIDC'}</span>
            </div>
          )
        })}
      </div>
      <p className="tf-note">
        {t('Niente partizione e niente URN: ogni AI viene scritto con il metodo previsto dalla tabella F del TDT (cifre a 4 bit, date compatte, testo con il metodo più corto). Per i dati aggiuntivi si scrive anche il codice dell’AI.')}
        {result.kind === 'plusplus' && ` ${t('Subito dopo la chiave si scrive il dominio {host}, così il tag ricostruisce il GS1 Digital Link del brand.', { host: analysis.params.hostname })}`}
      </p>
    </div>
  )
}
