import { useState } from 'react'
import { ClipboardPaste, Layers, Play } from 'lucide-react'
import { Section } from './Section'
import { DecodeArt, DigitalLinkIcon, EncodeArt, KeyDataIcon, RfidTagIcon } from './Art'
import type { Mode } from '../App'
import { HeroEpc } from './HeroEpc'
import { TagStage } from './TagStage'
import { t } from '../i18n'

/** Formati che il decoder riconosce, con un esempio reale per ciascuno. */
export const DECODE_SAMPLES: { label: string; detail: string; text: string; kind: 'rfid' | 'web' | 'gs1' }[] = [
  { label: 'SGTIN-96', get detail() { return t('EPC in esadecimale, come lo mostra il lettore') }, text: '3035E8480000004000003039', kind: 'rfid' },
  { label: 'SGTIN-96', get detail() { return t('EPC in binario, anche a gruppi') }, text: '0011 0000 0011 0101 1110 1000 0100 1000 0000 0000 0000 0000 0000 0000 0100 0000 0000 0000 0000 0000 0011 0000 0011 1001', kind: 'rfid' },
  { label: 'SGTIN+', get detail() { return t('Schema TDS 2.x con lotto e scadenza (+AIDC)') }, text: 'F790800000000001905181C883296727C6C2E6F3E000', kind: 'rfid' },
  { label: 'SGTIN++', get detail() { return t('Schema TDS 2.x con il dominio del GS1 Digital Link') }, text: 'FD90800000000001905181CC6CFCD8E9E9704194B393E3617379F000', kind: 'rfid' },
  { label: 'EPC Tag URI', get detail() { return t('Un SSCC con filter value e partizione') }, text: 'urn:epc:tag:sscc-96:0.8000000.3000000001', kind: 'rfid' },
  { label: 'GS1 Digital Link', get detail() { return t('URI web, anche con dati nella query') }, text: 'https://id.gs1.org/01/08000000000019/10/LOT42/21/ABC123?17=271231', kind: 'web' },
  { label: 'Element string', get detail() { return t('Dati GS1 con gli AI tra parentesi') }, text: '(01)08000000000019(17)271231(10)LOT42(21)12345', kind: 'gs1' },
]

const KIND_TONE = { rfid: 'teal', web: 'forest', gs1: 'blue' } as const

type Props = { mode: Mode; onSample: (text: string) => void; onExample: () => void }

/** Schermata iniziale, prima che ci siano dati: cosa si può fare e da dove partire. */
export function StartPanel({ mode, onSample, onExample }: Props) {
  const [anatomy, setAnatomy] = useState(false)
  if (mode === 'decode') {
    return (
      <section className="start">
        <div className="start-hero stage">
          <header className="start-head">
            <h1>{t('Decodifica un EPC o un dato GS1')}</h1>
            <p>
              {t('Incolla il dato nel campo a sinistra, oppure premi Ctrl+V in qualsiasi punto della pagina: il formato viene riconosciuto da solo.')}
            </p>
          </header>
          <TagStage mode="read" fallback={<DecodeArt />} />
        </div>
        <table className="formats-table">
          <caption>{t('Formati riconosciuti')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('Formato')}</th>
              <th scope="col">{t('Esempio')}</th>
              <th scope="col">
                <span className="visually-hidden">{t('Azioni')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {DECODE_SAMPLES.map((s) => (
              <tr key={s.text}>
                <th scope="row">
                  <span className="row-head">
                    <span className={`tile tile-sm tile-${KIND_TONE[s.kind]}`} aria-hidden>
                      {s.kind === 'rfid' ? <RfidTagIcon size={16} /> : s.kind === 'web' ? <DigitalLinkIcon size={16} /> : <KeyDataIcon size={16} />}
                    </span>
                    <span className="row-text">
                      <strong>{s.label}</strong>
                      <span>{s.detail}</span>
                    </span>
                  </span>
                </th>
                <td className="mono">{s.text}</td>
                <td>
                  <button type="button" className="btn btn-quiet" onClick={() => onSample(s.text)}>
                    <Play size={13} /> {t('Prova')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="start-tip">
          <ClipboardPaste size={16} />
          {t('Accetta anche i dati trasmessi da un lettore di barcode, con FNC1 e separatori GS, e un GTIN da solo.')}
        </p>
      </section>
    )
  }
  return (
    <section className="start">
      <div className="start-hero stage">
        <header className="start-head">
          <h1>{t('Codifica una chiave GS1 in EPC')}</h1>
          <p>
            {t('Scegli la chiave e inserisci i dati a sinistra: ottieni l’EPC per ogni schema del TDS 2.3, la memoria del tag, i barcode e il GS1 Digital Link.')}
          </p>
          <button type="button" className="btn btn-accent" onClick={onExample}>
            <Play size={14} /> {t('Carica un esempio')}
          </button>
        </header>
        <TagStage mode="write" fallback={<EncodeArt />} />
      </div>
      <div className="sections start-sections">
        <Section id="anatomy" tone="teal" icon={<Layers size={18} />} title={t('Com’è fatto un EPC')} summary={t('La stessa chiave in sei forme, dai bit nel tag al link sul web')} open={anatomy} onToggle={() => setAnatomy((a) => !a)}>
          <HeroEpc />
        </Section>
      </div>
    </section>
  )
}
