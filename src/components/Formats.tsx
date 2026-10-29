import { ScanLine } from 'lucide-react'
import type { Analysis } from '../gs1/analyze'
import { KIND_INFO } from '../gs1/schemes'
import { CopyButton, CopyText } from './ui'
import { ColoredBits, epcRuns } from './ColoredBits'
import { CoverageMatrix } from './Coverage'
import { t } from '../i18n'

/** Tutte le rappresentazioni degli stessi dati, una sotto l'altra. */
export function Formats({ analysis, onDecode }: { analysis: Analysis; onDecode: (text: string) => void }) {
  const gs1 = analysis.gs1!
  const first = analysis.results.find((r) => r.ok && r.kind === 'legacy')
  const json = `{${analysis.ais.map((a) => `"${a.ai}":${JSON.stringify(a.value)}`).join(',')}}`
  return (
    <div className="formats">
      <h3>{t('Dati GS1')}</h3>
      <div className="result-grid">
        <CopyText label={t('Element string (con parentesi, per le persone)')} value={gs1.elementString} />
        <CopyText label={t('Dati con FNC1 (^ = FNC1 / separatore GS)')} value={gs1.scanData} />
        {gs1.dl && <CopyText label="GS1 Digital Link URI" value={gs1.dl} />}
        <CopyText label="GS1 AI JSON (TDT)" value={json} />
        {first?.ok && first.uris.pure && <CopyText label="EPC Pure Identity URI" value={first.uris.pure} />}
        {first?.ok && first.uris.bare && <CopyText label={t('Identificatore TDT')} value={first.uris.bare} />}
      </div>

      {analysis.results.length > 0 && (
        <>
          <h3>{t('Che cosa entra nel tag, schema per schema')}</h3>
          <p className="lead">{t('Gli schemi TDS 1.x contengono solo la chiave: lotto, scadenza e gli altri dati aggiuntivi restano fuori. Il dominio del GS1 Digital Link lo portano solo gli schemi ++.')}</p>
          <CoverageMatrix analysis={analysis} />

          <h3 className="spaced">{t('Codifiche EPC per il tag RFID')}</h3>
          <div className="table-wrap">
            <table className="epc-table">
              <thead>
                <tr>
                  <th>{t('Schema')}</th>
                  <th>{t('Tipo')}</th>
                  <th>Bit</th>
                  <th>{t('EPC esadecimale e binario / motivo')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {analysis.results.map((r) => (
                  <tr key={r.scheme} className={r.ok ? '' : 'off'}>
                    <td>
                      <strong>{r.scheme}</strong>
                    </td>
                    <td>
                      <span className={`kind kind-${r.kind}`}>{KIND_INFO[r.kind].label}</span>
                    </td>
                    <td className="mono">{r.ok ? r.length : '—'}</td>
                    <td className={r.ok ? 'mono hex' : 'reason'}>
                      {r.ok ? r.hex : r.error}
                      {r.ok && (
                        <div className="bin-line">
                          <ColoredBits runs={epcRuns(r)} compact />
                        </div>
                      )}
                      {r.ok && r.uris.tag && <div className="muted mono small">{r.uris.tag}</div>}
                    </td>
                    <td className="actions">
                      {r.ok && (
                        <>
                          <CopyButton value={r.hex} />
                          <CopyButton value={r.bits} label={t('Copia in binario')} icon="bin" />
                          <button className="icon-btn" title={t('Decodifica questo EPC')} aria-label={t('Decodifica questo EPC')} onClick={() => onDecode(r.hex)}>
                            <ScanLine size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
