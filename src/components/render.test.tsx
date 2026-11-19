import '../test/setup-fetch'
import { beforeAll, expect, test } from 'vitest'
import { renderToString } from 'react-dom/server'
import { analyzeDecode, analyzeEncode } from '../gs1/analyze'
import { Journey } from './Journey'
import { TagMemory } from './TagMemory'
import { Formats } from './Formats'
import { Readout } from './Readout'
import { StartPanel } from './StartPanel'
import { issuesOf } from '../issues'
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
  for (const r of a.results) {
    const issues = issuesOf(a, r.scheme, 'encode', [])
    const html = renderToString(<Readout analysis={a} scheme={r.scheme} busy={false} onTab={noop} onAction={noop} issues={issues} vbg="loading" />)
    if (r.ok) expect(html).toContain(r.uris.tag ?? a.gs1!.elementString)
    else expect(html).toContain('non è utilizzabile')
  }
  for (const mode of ['encode', 'decode'] as const) renderToString(<StartPanel mode={mode} onSample={noop} onExample={noop} />)
  renderToString(<VbgCard ai="01" state={{ state: 'verified', name: 'Prodotto', links: [], licensee: { name: 'Azienda', prefix: '8001234' } }} />)
  const d = await analyzeDecode('nonsense!', params)
  expect(renderToString(<Readout analysis={d} scheme={null} busy={false} onTab={noop} onAction={noop} issues={issuesOf(d, null, 'decode', [])} />)).toContain('Formato non riconosciuto')
  for (const mode of ['encode', 'decode'] as const)
    renderToString(<InputPanel mode={mode} encoder={{ keyId: 'sgtin', values: { '01': '0800123456789', '21': '1' }, extras: [{ ai: '17', value: '' }] }} setEncoder={noop} decodeText="" setDecodeText={noop} params={{ ...params }} setParams={noop} analysis={a} scheme="SGTIN+" setScheme={noop} onOpenInEncoder={noop} onReset={noop} canReset />)
  expect(renderToString(<App />)).toContain('Encoder')
})

test('segnalazioni: campo mancante, prefisso aziendale, dati fuori dal tag', async () => {
  const one = await analyzeEncode([{ ai: '01', value: '08000000000019' }], params)
  const miss = issuesOf(one, null, 'encode', [{ ai: '21', label: 'Numero di serie' }])
  expect(miss.map((i) => i.id)).toEqual(['missing-21'])
  expect(miss[0].actions[0]).toEqual({ label: 'Compila il campo', focus: 'ai-21' })
  const a = await analyzeEncode([{ ai: '01', value: '08000000000019' }, { ai: '21', value: '1' }, { ai: '10', value: 'L1' }], params)
  const gcp = issuesOf(a, 'SGTIN-96', 'encode', [])
  expect(gcp[0].level).toBe('warn')
  expect(gcp[0].actions.map((x) => ('focus' in x ? x.focus : x.scheme))).toEqual(['gcp-length', 'SGTIN+'])
  const b = await analyzeEncode([{ ai: '01', value: '08000000000019' }, { ai: '21', value: '1' }, { ai: '10', value: 'L1' }], { ...params, gcpLength: 7 })
  const dropped = issuesOf(b, 'SGTIN-96', 'encode', [])
  expect(dropped[0].id).toBe('dropped')
  expect(dropped[0].title).toContain('(10)')
  const bad = await analyzeEncode([{ ai: '01', value: '08000000000018' }, { ai: '21', value: '1' }], params)
  const err = issuesOf(bad, null, 'encode', [])
  expect(err[0]).toMatchObject({ level: 'error', actions: [{ focus: 'ai-01' }] })
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
  const a = await analyzeEncode([{ ai: '01', value: '08000000000019' }, { ai: '21', value: '12345' }], { ...params, filter: 1, gcpLength: 7 })
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
    expect(renderToString(<App />)).toContain('Encode a GS1 key')
  } finally {
    _setLangForTest('it')
  }
})
