import { LANGS, setLang, useLang } from '../i18n'

/** Scelta della lingua (IT / EN), come in gs1-italy-vbg-app: la scelta viene ricordata. */
export function LangSwitch() {
  const current = useLang()
  return (
    <div className="lang-switch" role="radiogroup" aria-label="Lingua / Language">
      {LANGS.map((l) => (
        <button key={l.id} type="button" role="radio" lang={l.id} aria-checked={current === l.id} aria-label={l.label} title={l.label} className={current === l.id ? 'is-active' : ''} onClick={() => setLang(l.id)}>
          {l.short}
        </button>
      ))}
    </div>
  )
}
