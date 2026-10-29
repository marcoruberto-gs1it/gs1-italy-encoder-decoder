import { useMemo, useRef, useState } from 'react'
import type { Analysis } from '../gs1/analyze'
import { epcBank, hexWord } from '../gs1/rfid'
import { segmentColors, CRC_COLOR, PC_COLOR } from '../colors'
import { SchemeSelect } from './EpcParts'
import { SCHEMES_BY_FAMILY } from '../gs1/schemes'
import { useMotion } from '../motion'
import { CopyText } from './ui'
import { BitsPanel, bankRuns } from './ColoredBits'
import { TagContents } from './Coverage'
import { t } from '../i18n'

type Props = { analysis: Analysis; scheme: string | null; onScheme: (s: string) => void }

type Owner = { label: string; color: string; group: string }

export function TagMemory({ analysis, scheme, onScheme }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  const result = analysis.results.find((r) => r.scheme === scheme)
  const ok = result?.ok ? result : null

  const model = useMemo(() => {
    if (!ok) return null
    const bank = epcBank(ok.bits)
    const colors = segmentColors(ok.segments)
    const owners: Owner[] = []
    for (let i = 0; i < 16; i++) owners.push({ label: 'StoredCRC', color: CRC_COLOR, group: 'crc' })
    for (const f of bank.pc.fields) for (let i = 0; i < f.bits.length; i++) owners.push({ label: `PC · ${f.label}`, color: PC_COLOR, group: `pc-${f.label}` })
    ok.segments.forEach((s, k) => {
      for (let i = 0; i < s.bits.length; i++) owners.push({ label: s.label, color: colors[k], group: `seg-${k}` })
    })
    return { bank, colors, owners }
  }, [ok])

  const scope = useRef<HTMLDivElement>(null)
  useMotion(
    scope,
    (m) => {
      // Il chip scrive la memoria: le parole compaiono riga per riga (le onde radio sono in CSS).
      const tag = m.from('.tag-svg', { y: 20, rotate: -3, opacity: 0 }, { duration: 0.6 })
      m.from('.wg-row:not(.wg-head)', { x: -14, opacity: 0 }, { duration: 0.3, stagger: 0.06, at: tag - 0.3 })
      const bits = m.from('.wg-row:not(.wg-head) .wg-bit', { scale: 0.3, opacity: 0 }, { duration: 0.18, stagger: 0.004, at: tag - 0.3 })
      m.from('.legend', { y: 6, opacity: 0 }, { duration: 0.25, stagger: 0.025, at: bits - 0.3 })
    },
    [ok?.hex],
  )

  if (analysis.rfidNote) return <div className="note warn">{analysis.rfidNote}</div>
  if (!analysis.results.length) return null

  return (
    <div className="tagmem" ref={scope}>
      <SchemeSelect schemes={SCHEMES_BY_FAMILY[analysis.key!.id]} results={analysis.results} scheme={scheme} onScheme={onScheme} />
      <TagContents analysis={analysis} result={result} />
      {ok && model && (
        <>
          <div className="tag-hero">
            <TagIllustration hex={ok.hex} scheme={ok.scheme} />
            <div className="tag-facts">
              <CopyText label={t('Banco EPC completo (CRC + PC + EPC) in esadecimale')} value={model.bank.words.map(hexWord).join(' ')} />
              <BitsPanel label={t('Banco EPC completo in binario')} runs={bankRuns(model.bank, ok)} />
              <div className="facts">
                <div>
                  <span className="muted">StoredCRC</span>
                  <b className="mono">{hexWord(model.bank.crc)}h</b>
                </div>
                <div>
                  <span className="muted">PC word</span>
                  <b className="mono">{hexWord(model.bank.pc.bits)}h</b>
                </div>
                <div>
                  <span className="muted">EPC</span>
                  <b>
                    {t('{bits} bit → {words} parole', { bits: ok.length, words: model.bank.pc.lengthWords })}
                  </b>
                </div>
              </div>
              <p className="muted small">
                {t('Il CRC lo calcola il chip all’accensione (CRC-16 di ISO/IEC 18000-63 su PC + EPC); il lettore lo usa per controllare la trasmissione. Il tag deve avere almeno {bits} bit di memoria EPC.', { bits: model.bank.words.length * 16 })}
              </p>
            </div>
          </div>

          <div className="banks">
            <Bank id="00" name="Reserved" text={t('Kill password (32 bit) e access password (32 bit). Non fa parte dei dati GS1.')} />
            <div className="bank open">
              <div className="bank-head">
                <span className="bank-id mono">MB 01</span>
                <strong>EPC</strong>
                <span className="muted">{t('CRC, Protocol Control e l’EPC codificato secondo il TDS')}</span>
              </div>
              <div className="word-grid" onMouseLeave={() => setHover(null)}>
                <div className="wg-row wg-head mono">
                  <span>{t('indirizzo')}</span>
                  <div className="wg-bits">
                    {Array.from({ length: 16 }, (_, i) => (
                      <span key={i}>{i.toString(16).toUpperCase()}</span>
                    ))}
                  </div>
                  <span>hex</span>
                </div>
                {model.bank.words.map((w, row) => (
                  <div key={row} className="wg-row">
                    <span className="mono wg-addr">{(row * 16).toString(16).toUpperCase().padStart(2, '0')}h</span>
                    <div className="wg-bits">
                      {[...w].map((b, i) => {
                        const o = model.owners[row * 16 + i]
                        return (
                          <span
                            key={i}
                            className={`wg-bit ${hover && hover !== o.group ? 'dim' : ''}`}
                            style={{ background: o.color }}
                            title={`${o.label} · bit ${(row * 16 + i).toString(16).toUpperCase()}h`}
                            onMouseEnter={() => setHover(o.group)}
                          >
                            {b}
                          </span>
                        )
                      })}
                    </div>
                    <span className="mono wg-hex">{hexWord(w)}</span>
                  </div>
                ))}
              </div>
              <div className="wg-legend">
                <Legend color={CRC_COLOR} label="StoredCRC" detail={`${hexWord(model.bank.crc)}h`} group="crc" hover={hover} setHover={setHover} />
                {model.bank.pc.fields.map((f) => (
                  <Legend key={f.label} color={PC_COLOR} label={`PC · ${f.label}`} detail={`${f.bits} — ${f.note}`} group={`pc-${f.label}`} hover={hover} setHover={setHover} />
                ))}
                {ok.segments.map((s, k) => (
                  <Legend key={k} color={model.colors[k]} label={s.label} detail={s.value ? String(s.value) : `${s.bits.length} bit`} group={`seg-${k}`} hover={hover} setHover={setHover} />
                ))}
              </div>
            </div>
            <Bank id="10" name="TID" text={t('Identificativo del chip, scritto dal produttore e di sola lettura: modello del chip e spesso un numero di serie univoco.')} />
            <Bank id="11" name="User" text={t('Memoria facoltativa per dati aggiuntivi (nel TDS, formato Packed Objects). Con gli schemi + e ++ lotto e scadenza stanno già nel banco EPC.')} />
          </div>
        </>
      )}
    </div>
  )
}

function Bank({ id, name, text }: { id: string; name: string; text: string }) {
  return (
    <div className="bank">
      <div className="bank-head">
        <span className="bank-id mono">MB {id}</span>
        <strong>{name}</strong>
        <span className="muted">{text}</span>
      </div>
    </div>
  )
}

function Legend({ color, label, detail, group, hover, setHover }: { color: string; label: string; detail: string; group: string; hover: string | null; setHover: (g: string | null) => void }) {
  return (
    <div className={`legend ${hover === group ? 'hl' : ''}`} onMouseEnter={() => setHover(group)} onMouseLeave={() => setHover(null)}>
      <span className="legend-dot" style={{ background: color }} />
      <span className="legend-label">{label}</span>
      <span className="legend-detail mono">{detail}</span>
    </div>
  )
}

/** Un inlay UHF stilizzato: antenna a dipolo, chip e l'EPC. */
function TagIllustration({ hex, scheme }: { hex: string; scheme: string }) {
  const lines = hex.match(/.{1,16}/g) ?? []
  const h = Math.max(200, 132 + 18 + lines.length * 14 + 20)
  return (
    <svg className="tag-svg" viewBox={`0 0 360 ${h}`} role="img" aria-label={`Tag RFID con EPC ${hex}`}>
      <rect x="4" y="4" width="352" height={h - 8} rx="18" fill="#fff" stroke="#c9d3e3" />
      <path
        d="M30 100 h30 v-55 h40 v110 h40 v-110 h30 v55 M190 100 v-55 h30 v110 h40 v-110 h40 v55 h30"
        fill="none"
        stroke="#b8862f"
        strokeWidth="7"
        strokeLinejoin="round"
        opacity="0.85"
      />
      {[0, 1, 2].map((i) => (
        <circle key={i} className="ga-wave" cx="180" cy="100" r="18" fill="none" stroke="#1d4f9a" strokeOpacity="0.45" strokeWidth="1.5" />
      ))}
      <rect x="166" y="86" width="28" height="28" rx="4" fill="#002c6c" />
      <text x="180" y="104" textAnchor="middle" fontSize="9" fill="#fff" fontFamily="var(--font-mono)">
        IC
      </text>
      <rect x="64" y="132" width="232" height={18 + lines.length * 14} rx="8" fill="rgba(255,255,255,0.92)" stroke="#dce3ee" />
      <text x="180" y="146" textAnchor="middle" fontSize="10" fill="#f26334" fontWeight="700" fontFamily="var(--font-ui)">
        {scheme}
      </text>
      {lines.map((l, i) => (
        <text key={i} x="180" y={160 + i * 14} textAnchor="middle" fontSize="11" fill="#0f2147" fontFamily="var(--font-mono)">
          {l}
        </text>
      ))}
    </svg>
  )
}
