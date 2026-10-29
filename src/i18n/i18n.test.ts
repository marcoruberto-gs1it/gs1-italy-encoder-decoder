import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import EN from './en.json'
import { _setLangForTest, t } from './index'

const SRC = join(__dirname, '..')

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) return p.includes('vendor') ? [] : sources(p)
    return /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f) && !p.includes(join('src', 'i18n')) ? [p] : []
  })
}

/** Primo argomento letterale di ogni chiamata t('…') o k('…') nel codice. */
export function i18nKeys() {
  const found = new Map<string, string>()
  for (const file of sources(SRC)) {
    const code = readFileSync(file, 'utf8')
    for (const m of code.matchAll(/(?<![\w.])[tk]\(\s*(['"])((?:\\.|(?!\1).)*)\1/g)) found.set(m[2].replace(/\\(.)/g, '$1'), file)
    if (/(?<![\w.])t\(\s*`/.test(code)) throw new Error(`${file}: t() con template literal; usa '…{nome}…' e le variabili`)
  }
  return found
}

describe('traduzioni', () => {
  it('ogni testo dell’interfaccia ha la traduzione inglese', () => {
    const missing = [...i18nKeys()].filter(([k]) => !(k in EN)).map(([k, f]) => `${f.replace(SRC, 'src')}: ${k}`)
    expect(missing).toEqual([])
  })
  it('nessuna traduzione inutilizzata', () => {
    const keys = i18nKeys()
    expect(Object.keys(EN).filter((k) => !keys.has(k))).toEqual([])
  })
  it('le traduzioni mantengono le stesse variabili', () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
    const wrong = Object.entries(EN as Record<string, string>).filter(([it, en]) => vars(it) !== vars(en)).map(([it]) => it)
    expect(wrong).toEqual([])
  })
  it('in inglese i testi cambiano, con le variabili', () => {
    _setLangForTest('en')
    expect(t('{n} cifre', { n: 7 })).toBe('7 digits')
    _setLangForTest('it')
    expect(t('{n} cifre', { n: 7 })).toBe('7 cifre')
  })
})
