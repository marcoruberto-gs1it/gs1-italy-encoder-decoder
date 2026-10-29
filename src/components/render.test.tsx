import '../test/setup-fetch'
import { beforeAll, expect, test } from 'vitest'
import { renderToString } from 'react-dom/server'
import { analyzeDecode, analyzeEncode } from '../gs1/analyze'
import { Journey } from './Journey'
import { TagMemory } from './TagMemory'
import { Formats } from './Formats'
import { Summary } from './Summary'
import { InputPanel } from './InputPanel'
import { VbgCard } from './VbgCard'
import App from '../App'

beforeAll(() => {
  console.debug = () => {}
})
const params = { filter: 1, hostname: 'id.gs1it.org', gcpLength: null }
const noop = () => {}

test('i componenti si disegnano per ogni schema', async () => {
  const a = await analyzeEncode([{ ai: '01', value: '08001234567897' }, { ai: '21', value: '12345' }, { ai: '17', value: '271231' }, { ai: '10', value: 'LOT42' }], params)
  for (const r of a.results) {
    const j = renderToString(<Journey analysis={a} scheme={r.scheme} onScheme={noop} />)
    expect(j).toContain('I dati GS1')
    if (r.ok) expect(j).toContain(r.hex)
    renderToString(<TagMemory analysis={a} scheme={r.scheme} onScheme={noop} />)
  }
  renderToString(<Formats analysis={a} onDecode={noop} />)
  renderToString(<Summary analysis={a} busy={false} onTab={noop} vbg="loading" />)
  renderToString(<VbgCard ai="01" state={{ state: 'verified', name: 'Prodotto', links: [], licensee: { name: 'Azienda', prefix: '8001234' } }} />)
  const d = await analyzeDecode('nonsense!', params)
  expect(renderToString(<Summary analysis={d} busy={false} onTab={noop} />)).toContain('Formato non riconosciuto')
  for (const mode of ['encode', 'decode'] as const)
    renderToString(<InputPanel mode={mode} setMode={noop} encoder={{ keyId: 'sgtin', values: { '01': '0800123456789', '21': '1' }, extras: [{ ai: '17', value: '' }] }} setEncoder={noop} decodeText="" setDecodeText={noop} params={{ ...params }} setParams={noop} analysis={a} scheme="SGTIN+" setScheme={noop} onOpenInEncoder={noop} />)
  expect(renderToString(<App />)).toContain('Encoder')
})

test('cosa entra nel tag: TDS 1.x senza +AIDC e dominio, ++ con tutto', async () => {
  const { coverageOf } = await import('./Coverage')
  const a = await analyzeEncode([{ ai: '01', value: '08001234567897' }, { ai: '21', value: '12345' }, { ai: '17', value: '271231' }, { ai: '10', value: 'LOT42' }], { ...params, gcpLength: 7 })
  const state = (scheme: string) => {
    const r = a.results.find((x) => x.scheme === scheme)
    if (!r?.ok) throw new Error(scheme)
    return Object.fromEntries(coverageOf(a, r).map((i) => [i.id, i.state]))
  }
  expect(state('SGTIN-96')).toEqual({ '01': 'in', '21': 'in', '17': 'out', '10': 'out', cd: 'derived', host: 'out' })
  expect(state('SGTIN+')).toEqual({ '01': 'in', '21': 'in', '17': 'in', '10': 'in', cd: 'in', host: 'out' })
  expect(state('SGTIN++')).toEqual({ '01': 'in', '21': 'in', '17': 'in', '10': 'in', cd: 'in', host: 'in' })
  expect(renderToString(<Journey analysis={a} scheme="SGTIN-96" onScheme={noop} />)).toContain('restano fuori dal tag')
})

test('l’infografica EPC mostra i valori reali di SGTIN-96', async () => {
  const { HeroEpc } = await import('./HeroEpc')
  const text = renderToString(<HeroEpc />).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')
  const a = await analyzeEncode([{ ai: '01', value: '08001234567897' }, { ai: '21', value: '12345' }], { ...params, filter: 1, gcpLength: 7 })
  const r = a.results.find((x) => x.scheme === 'SGTIN-96')
  if (!r?.ok) throw new Error('SGTIN-96')
  for (const v of [r.uris.pure!, r.uris.tag!, r.hex, r.bits, r.uris.dl!, a.gs1!.elementString]) expect(text, v).toContain(v)
})

test('in inglese l’interfaccia e i campi del tag sono tradotti', async () => {
  const { _setLangForTest } = await import('../i18n')
  _setLangForTest('en')
  try {
    const a = await analyzeEncode([{ ai: '01', value: '08001234567897' }, { ai: '21', value: '12345' }, { ai: '17', value: '271231' }], { ...params, gcpLength: 7 })
    const html = renderToString(<Journey analysis={a} scheme="SGTIN-96" onScheme={noop} />)
    expect(html).toContain('Bit by bit')
    expect(html).toContain('Partition')
    expect(html).toContain('Expiration date')
    expect(html).not.toContain('Partizione')
    expect(renderToString(<App />)).toContain('One EPC')
  } finally {
    _setLangForTest('it')
  }
})
