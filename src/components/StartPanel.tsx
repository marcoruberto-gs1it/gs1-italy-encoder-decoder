import { useState } from 'react'
import { Barcode, Layers, Link2, MemoryStick, Nfc, Play, type LucideIcon } from 'lucide-react'
import { Rich } from './Rich'
import { Section, Sections } from './Section'
import { Button } from '@/components/ui/button'
import { EncodeArt } from './Art'
import { HeroEpc } from './HeroEpc'
import { TagStage } from './TagStage'
import { t } from '../i18n'

type Props = { onExample: () => void }

/** Schermata iniziale dell'encoder, prima che ci siano dati: cosa si può fare e da dove partire. */
export function StartPanel({ onExample }: Props) {
  const [anatomy, setAnatomy] = useState(false)
  return (
    <section className="start">
      <div className="start-hero stage">
        <header className="start-head">
          <h1>
            {t('Codifica una chiave GS1')} <em>{t('in EPC')}</em>
          </h1>
          <p>
            <Rich text={t('Scegli la chiave e inserisci i dati a sinistra: ottieni **l’EPC per ogni schema del TDS 2.3**, la memoria del tag, i barcode e il GS1 Digital Link.')} />
          </p>
          <Chips
            items={[
              [Nfc, t('EPC RAIN RFID')],
              [MemoryStick, t('Memoria del tag')],
              [Barcode, t('Barcode e QR')],
              [Link2, 'GS1 Digital Link'],
            ]}
          />
          <Button variant="brand" size="lg" className="self-start" onClick={onExample}>
            <Play /> {t('Carica un esempio')}
          </Button>
        </header>
        <TagStage mode="write" fallback={<EncodeArt />} />
      </div>
      <Sections className="start-sections">
        <Section id="anatomy" tone="teal" icon={<Layers size={18} />} title={t('Com’è fatto un EPC')} summary={t('La stessa chiave in sei forme, dai bit nel tag al link sul web')} open={anatomy} onToggle={() => setAnatomy((a) => !a)}>
          <HeroEpc />
        </Section>
      </Sections>
    </section>
  )
}

/** Concetti dell'app sul palco blu: icona + nome, solo informativi. */
function Chips({ items }: { items: [LucideIcon, string][] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label={t('Cosa trovi')}>
      {items.map(([Icon, label]) => (
        <li key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12.5px] font-semibold text-white ring-1 ring-white/15 ring-inset">
          <Icon size={15} className="text-[#7fdcda]" aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  )
}
