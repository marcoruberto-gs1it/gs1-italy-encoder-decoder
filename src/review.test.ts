/* Regressioni trovate nella revisione del codice e nella verifica di sicurezza. */
import './test/setup-fetch'
import { beforeAll, describe, expect, it } from 'vitest'
import { analyzeDecode, analyzeEncode } from './gs1/analyze'
import { CARRIERS, loadBwip, renderCarrier } from './gs1/barcodes'
import { safeUrl } from './gs1/vbg'
import { LIMITS, parseUrlState } from './urlState'

beforeAll(() => {
  console.debug = () => {}
})
const params = { filter: 1, hostname: 'id.gs1.org', gcpLength: null }
const carrier = (id: string) => CARRIERS.find((c) => c.id === id)!

describe('analisi', () => {
  it('il GS1 Company Prefix di Verified by GS1 vale anche se la chiave non è il primo AI', async () => {
    const a = await analyzeDecode('(17)271231(01)08001234567897(21)12345', params, { prefix: '8001234', pending: false })
    expect(a.gcp).toMatchObject({ length: 7, source: 'Verified by GS1' })
    expect(a.results.find((r) => r.scheme === 'SGTIN-96')?.ok).toBe(true)
  })

  it('nel decoder filter e dominio letti dal tag sono segnalati', async () => {
    const a = await analyzeDecode('urn:epc:tag:sgtin-96:3.0614141.812345.6789', params)
    expect(a.params.filter).toBe(3)
    expect(a.fromTag).toEqual({ filter: true, hostname: false })
  })
})

describe('barcode', () => {
  it('un GTIN-8 va in EAN-8, non in EAN-13', async () => {
    const lib = await loadBwip()
    const a = await analyzeEncode([{ ai: '01', value: '00000096385074' }], params)
    expect(renderCarrier(lib, carrier('ean13'), a.gs1!)).toBeNull()
    expect(renderCarrier(lib, carrier('ean8'), a.gs1!)).toHaveProperty('svg')
  })

  it('una "(" in un valore resta un carattere, non un nuovo AI', async () => {
    const lib = await loadBwip()
    const a = await analyzeEncode([{ ai: '01', value: '08000000000019' }, { ai: '21', value: 'A(1)B' }], params)
    expect(a.error).toBeUndefined()
    expect(a.gs1!.elementString).toBe('(01)08000000000019(21)A\\(1)B')
    for (const id of ['gs1-128', 'gs1datamatrix', 'gs1qrcode']) expect(renderCarrier(lib, carrier(id), a.gs1!), id).toHaveProperty('svg')
    // L'element string copiata si rilegge con gli stessi dati.
    const back = await analyzeDecode(a.gs1!.elementString, params)
    expect(back.ais).toEqual(a.ais)
  })
})

describe('sicurezza', () => {
  it('Verified by GS1: solo link web', () => {
    expect(safeUrl('https://example.com/a')).toBe('https://example.com/a')
    expect(safeUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeUrl('data:text/html,x')).toBeUndefined()
    expect(safeUrl('//no-scheme')).toBeUndefined()
    expect(safeUrl({})).toBeUndefined()
  })

  it('stato nell’indirizzo: dimensioni limitate e dominio valido', () => {
    const empty = { keyId: 'sgtin', values: {}, extras: [] }
    const many = Array.from({ length: 100 }, (_, i) => `x${String(10 + i).padStart(2, '0')}=1`).join('&')
    const s = parseUrlState(`?q=${'A'.repeat(10_000)}&h=evil.com/%22x&s=${'S'.repeat(50)}&a21=${'9'.repeat(500)}&${many}`, empty)
    expect(s.decodeText.length).toBe(LIMITS.text)
    expect(s.params.hostname).toBeUndefined()
    expect(s.scheme).toBeNull()
    expect(s.encoder.values['21'].length).toBe(LIMITS.value)
    expect(s.encoder.extras.length).toBe(LIMITS.extras)
  })
})

describe('animazioni Lottie', () => {
  it('ogni animazione è un documento Lottie valido e quadrato', async () => {
    const { LOTTIE } = await import('./anim/lottieData')
    for (const [name, make] of Object.entries(LOTTIE)) {
      const d = make()
      expect(d.w, name).toBe(d.h)
      expect(d.op, name).toBeGreaterThan(d.ip)
      expect(d.layers.length, name).toBeGreaterThan(0)
      // Nessun valore non numerico (NaN finirebbe nel JSON come null e il player si fermerebbe).
      expect(JSON.stringify(d), name).not.toContain('null')
    }
  })
})
