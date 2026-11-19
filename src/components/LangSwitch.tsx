import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LANGS, setLang, useLang, type Lang } from '../i18n'

/** Scelta della lingua (IT / EN), come in gs1-italy-vbg-app: la scelta viene ricordata. */
export function LangSwitch() {
  const current = useLang()
  return (
    <ToggleGroup type="single" value={current} onValueChange={(v) => v && setLang(v as Lang)} aria-label="Lingua / Language" className="lang-switch">
      {LANGS.map((l) => (
        <ToggleGroupItem key={l.id} value={l.id} lang={l.id} aria-label={l.label} title={l.label} className="h-7 px-2.5 text-xs font-semibold">
          {l.short}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
