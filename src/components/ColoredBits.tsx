import { useState } from 'react'
import type { SchemeResult } from '../gs1/epc'
import type { EpcBank } from '../gs1/rfid'
import { segmentColors, CRC_COLOR, PC_COLOR } from '../colors'
import { CopyButton } from './ui'
import { t } from '../i18n'

/** Un blocco di bit consecutivi con lo stesso significato. */
export type BitRun = { label: string; color: string; bits: string }

type Ok = Extract<SchemeResult, { ok: true }>

/** I campi dell'EPC come blocchi colorati (stessi colori della barra e delle schede dei campi). */
export function epcRuns(result: Ok): BitRun[] {
  const colors = segmentColors(result.segments)
  return result.segments.map((s, i) => ({ label: s.label, color: colors[i], bits: s.bits }))
}

/** Banco EPC completo: StoredCRC, campi della PC word, poi i campi dell'EPC. */
export function bankRuns(bank: EpcBank, result: Ok): BitRun[] {
  return [{ label: 'StoredCRC', color: CRC_COLOR, bits: bank.crc }, ...bank.pc.fields.map((f) => ({ label: `PC · ${f.label}`, color: PC_COLOR, bits: f.bits })), ...epcRuns(result)]
}

type Piece = { run: number; bits: string }

/** Divide i blocchi in parole da 16 bit, come sono memorizzati nel tag. */
function words(runs: BitRun[]): Piece[][] {
  const out: Piece[][] = []
  let word: Piece[] = []
  let used = 0
  runs.forEach((r, run) => {
    let rest = r.bits
    while (rest.length) {
      const take = rest.slice(0, 16 - used)
      word.push({ run, bits: take })
      rest = rest.slice(take.length)
      used += take.length
      if (used === 16) {
        out.push(word)
        word = []
        used = 0
      }
    }
  })
  if (word.length) out.push(word)
  return out
}

/** Bit colorati per significato, raggruppati in parole da 16, con legenda interattiva. */
export function ColoredBits({ runs, legend = true, compact = false }: { runs: BitRun[]; legend?: boolean; compact?: boolean }) {
  const [hover, setHover] = useState<number | null>(null)
  return (
    <div className={`cbits ${compact ? 'compact' : ''}`} onMouseLeave={() => setHover(null)}>
      <div className="cbits-words mono">
        {words(runs).map((w, i) => (
          <span key={i} className="cbits-word">
            {w.map((p, k) => (
              <span
                key={k}
                className={`cbits-run ${hover !== null && hover !== p.run ? 'dim' : ''}`}
                style={{ ['--c' as string]: runs[p.run].color }}
                title={`${runs[p.run].label} · ${runs[p.run].bits.length} bit`}
                onMouseEnter={() => setHover(p.run)}
              >
                {p.bits}
              </span>
            ))}
          </span>
        ))}
      </div>
      {legend && (
        <div className="cbits-legend">
          {runs.map((r, i) => (
            <span key={i} className={`cbits-key ${hover === i ? 'hl' : ''}`} style={{ ['--c' as string]: r.color }} onMouseEnter={() => setHover(i)}>
              <span className="cbits-dot" />
              {r.label}
              <span className="muted">{r.bits.length}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** Riquadro con etichetta, bit colorati e pulsante per copiarli in binario. */
export function BitsPanel({ label, runs }: { label: string; runs: BitRun[] }) {
  const value = runs.map((r) => r.bits).join('')
  return (
    <div className="copy-text">
      <span className="copy-label">{label}</span>
      <div className="bits-panel">
        <ColoredBits runs={runs} />
        <CopyButton value={value} label={t('Copia in binario')} icon="bin" />
      </div>
    </div>
  )
}
