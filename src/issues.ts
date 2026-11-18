/*
 * Segnalazioni da mostrare sopra i risultati: errori (il dato non si può usare), avvisi (qualcosa manca
 * o resta fuori dal tag) e, per ciascuna, l'azione che la risolve.
 */
import type { Analysis } from './gs1/analyze'
import type { Mode } from './App'
import { kindOf } from './gs1/schemes'
import { t } from './i18n'

export type IssueAction = { label: string } & ({ focus: string } | { scheme: string })

export type Issue = {
  id: string
  level: 'error' | 'warn'
  title: string
  detail?: string
  /** Parte errata del dato, tra barre verticali (dalla Syntax Engine). */
  markup?: string
  actions: IssueAction[]
}

export type MissingField = { ai: string; label: string }

export function issuesOf(analysis: Analysis, scheme: string | null, mode: Mode, missing: MissingField[]): Issue[] {
  const out: Issue[] = []

  if (analysis.error) {
    const ai = analysis.error.match(/AI \((\d{2,4})\)/)?.[1]
    out.push({
      id: 'error',
      level: 'error',
      title: analysis.error,
      markup: analysis.errorMarkup,
      actions: [
        mode === 'decode'
          ? { label: t('Correggi il dato'), focus: 'decode-input' }
          : { label: t('Correggi il campo'), focus: ai ? `ai-${ai}` : 'ai-01' },
      ],
    })
    return out
  }

  for (const m of missing) {
    out.push({
      id: `missing-${m.ai}`,
      level: 'warn',
      title: t('Manca {field}', { field: `${m.label} (AI ${m.ai})` }),
      detail: t('È obbligatorio per questa chiave: senza, il tag RFID non si può codificare.'),
      actions: [{ label: t('Compila il campo'), focus: `ai-${m.ai}` }],
    })
  }

  if (analysis.rfidNote && !missing.length) out.push({ id: 'rfid', level: 'warn', title: analysis.rfidNote, actions: [] })

  const result = analysis.results.find((r) => r.scheme === scheme)
  const okSchemes = analysis.results.filter((r) => r.ok)
  if (result && !result.ok) {
    const needsGcp = /Company Prefix/i.test(result.error)
    const alt = okSchemes.find((r) => r.ok && !r.dropped.length) ?? okSchemes[0]
    const actions: IssueAction[] = []
    if (needsGcp) actions.push({ label: t('Scegli la lunghezza'), focus: 'gcp-length' })
    if (alt) actions.push({ label: t('Usa {scheme}', { scheme: alt.scheme }), scheme: alt.scheme })
    out.push({ id: 'scheme', level: 'warn', title: t('{scheme} non è utilizzabile con questi dati', { scheme: result.scheme }), detail: result.error, actions })
  }

  if (result?.ok && result.dropped.length) {
    const alt = okSchemes.find((r) => r.ok && !r.dropped.length && kindOf(r.scheme) !== 'legacy')
    out.push({
      id: 'dropped',
      level: 'warn',
      title:
        result.dropped.length === 1
          ? t('1 dato GS1 resta fuori dal tag {scheme}: {ais}', { scheme: result.scheme, ais: result.dropped.map((a) => `(${a.ai})`).join(' ') })
          : t('{n} dati GS1 restano fuori dal tag {scheme}: {ais}', { n: result.dropped.length, scheme: result.scheme, ais: result.dropped.map((a) => `(${a.ai})`).join(' ') }),
      detail: t('Gli schemi TDS 1.x contengono solo la chiave: lotto, scadenza e altri dati devono stare nel barcode, nella User Memory o nel sistema informativo.'),
      actions: alt ? [{ label: t('Usa {scheme}', { scheme: alt.scheme }), scheme: alt.scheme }] : [],
    })
  }
  return out
}
