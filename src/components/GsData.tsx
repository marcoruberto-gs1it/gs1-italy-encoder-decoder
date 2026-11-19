/*
 * I dati GS1 in chiaro, con ogni Application Identifier nel suo colore: elenco dei dati,
 * element string e GS1 Digital Link colorati allo stesso modo, in ogni punto dell'app.
 */
import { AiChip } from '@/icons'
import { aiColor } from '../colors'
import { aiLabel } from '../gs1/aiDictionary'
import { humanValue } from '../gs1/humanValue'
import type { Ai } from '../gs1/schemes'

/** Elenco dei dati: codice dell'AI, nome e valore (con la forma leggibile per date e pesi). */
export function AiList({ ais }: { ais: Ai[] }) {
  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
      {ais.map((a) => {
        const human = humanValue(a.ai, a.value)
        return (
          <li key={a.ai} className="flex items-center gap-3 border-l-4 px-4 py-3 phone:px-3" style={{ borderLeftColor: aiColor(a.ai) }}>
            <AiChip ai={a.ai} />
            <span className="min-w-0 flex-1 text-[15px] font-semibold text-foreground">{aiLabel(a.ai) || `AI ${a.ai}`}</span>
            <span className="flex min-w-0 flex-col items-end text-right">
              {human ? (
                <>
                  <span className="text-base font-bold" style={{ color: aiColor(a.ai) }}>
                    {human}
                  </span>
                  <span className="font-mono text-[13px] text-muted-foreground">{a.value}</span>
                </>
              ) : (
                <span className="font-mono text-base font-semibold [overflow-wrap:anywhere]" style={{ color: aiColor(a.ai) }}>
                  {a.value}
                </span>
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** Element string con ogni AI e il suo valore nel colore dell'AI. */
export function ColoredEs({ ais }: { ais: Ai[] }) {
  return (
    <>
      {ais.map((a) => (
        <span key={a.ai} style={{ color: aiColor(a.ai) }}>
          <b className="font-bold">({a.ai})</b>
          {a.value.replace(/\(/g, '\\(')}
        </span>
      ))}
    </>
  )
}

type Piece = { text: string; ai?: string; code?: boolean }

/** Scompone un GS1 Digital Link in dominio, coppie /AI/valore del percorso e AI=valore della query. */
export function dlPieces(url: string): Piece[] {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return [{ text: url }]
  }
  const out: Piece[] = [{ text: `${u.protocol}//${u.host}` }]
  const segs = u.pathname.split('/').filter(Boolean)
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]
    if (/^\d{2,4}$/.test(s) && i + 1 < segs.length) {
      out.push({ text: '/' }, { text: s, ai: s, code: true }, { text: '/' }, { text: segs[i + 1], ai: s })
      i++
    } else out.push({ text: `/${s}` })
  }
  if (u.search.length > 1) {
    out.push({ text: '?' })
    u.search
      .slice(1)
      .split('&')
      .forEach((pair, i) => {
        if (i) out.push({ text: '&' })
        const [k, ...v] = pair.split('=')
        if (/^\d{2,4}$/.test(k)) out.push({ text: k, ai: k, code: true }, { text: '=' }, { text: v.join('='), ai: k })
        else out.push({ text: pair })
      })
  }
  return out
}

/** GS1 Digital Link con gli AI colorati; il resto (dominio, barre) resta neutro. */
export function ColoredDl({ url }: { url: string }) {
  return (
    <>
      {dlPieces(url).map((p, i) =>
        p.ai ? (
          <span key={i} style={{ color: aiColor(p.ai) }} className={p.code ? 'font-bold' : undefined}>
            {p.text}
          </span>
        ) : (
          <span key={i} className="text-muted-foreground">
            {p.text}
          </span>
        ),
      )}
    </>
  )
}
