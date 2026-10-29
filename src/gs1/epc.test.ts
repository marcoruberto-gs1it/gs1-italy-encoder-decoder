import '../test/setup-fetch'
import { beforeAll, describe, expect, test } from 'vitest'
import { loadTdt, type Tdt } from './engine'
import { decodeEpc, encodeScheme, schemesForFamily } from './epc'
import { KEY_TYPES, SCHEMES_BY_FAMILY } from './schemes'
import { isCheckDigitValid, computeCheckDigit } from './checkDigit'

let t: Tdt
beforeAll(async () => {
  console.debug = () => {}
  t = await loadTdt()
})

const opts = { filter: 1, gcpLength: 7, hostname: 'id.gs1it.org' }

describe('cifra di controllo', () => {
  test('GTIN di esempio', () => {
    expect(computeCheckDigit('0800123456789')).toBe(7)
    expect(isCheckDigitValid('08001234567897')).toBe(true)
  })
  test('esempi dei tipi di chiave', () => {
    for (const k of KEY_TYPES) for (const f of k.fields) {
      if (!f.checkDigitLength) continue
      const v = k.example.find((a) => a.ai === f.ai)!.value.slice(0, f.checkDigitLength)
      expect(isCheckDigitValid(v), `${k.id} ${v} → ${computeCheckDigit(v.slice(0, -1))}`).toBe(true)
    }
  })
})

describe('codifica EPC', () => {
  test('SGTIN: tutti gli schemi', () => {
    const ais = [{ ai: '01', value: '08001234567897' }, { ai: '21', value: '12345' }, { ai: '17', value: '271231' }]
    const schemes = schemesForFamily(t, 'sgtin')
    expect(schemes).toEqual(['SGTIN-96', 'SGTIN-198', 'SGTIN+', 'DSGTIN+', 'SGTIN++', 'DSGTIN++'])
    const r96 = encodeScheme(t, 'SGTIN-96', ais, opts)
    expect(r96.ok && r96.hex).toBe('3035E85B4837754000003039')
    expect(r96.ok && r96.uris.tag).toBe('urn:epc:tag:sgtin-96:1.8001234.056789.12345')
    expect(r96.ok && r96.dropped.map((a) => a.ai)).toEqual(['17'])
    for (const s of schemes) {
      const r = encodeScheme(t, s, ais, opts)
      expect(r.ok, `${s}: ${!r.ok && r.error}`).toBe(true)
      if (!r.ok) continue
      expect(r.bits.length % 16).toBe(0)
      expect(r.segments.map((x) => x.bits).join('')).toBe(r.bits)
      for (const seg of r.segments) if (seg.parts) expect(seg.parts.map((p) => p.bits).join(''), `${s} ${seg.label}`).toBe(seg.bits)
      const back = decodeEpc(t, r.hex)
      expect(back && 'ais' in back && back.ais, s).toBeTruthy()
      if (back && 'ais' in back) {
        expect(back.scheme).toBe(s)
        expect(back.filter).toBe(1)
        for (const a of ais.filter((a) => s.endsWith('+') || a.ai !== '17')) expect(back.ais).toContainEqual(a)
        if (s.endsWith('++')) expect(back.hostname).toBe('id.gs1it.org')
      }
    }
  })

  test('elenco statico degli schemi allineato agli artefatti', () => {
    for (const k of KEY_TYPES) expect(SCHEMES_BY_FAMILY[k.id], k.id).toEqual(schemesForFamily(t, k.id))
  })

  test('limiti SGTIN-96', () => {
    const r = encodeScheme(t, 'SGTIN-96', [{ ai: '01', value: '08001234567897' }, { ai: '21', value: '0123' }], opts)
    expect(r.ok).toBe(false)
    const r2 = encodeScheme(t, 'SGTIN-96', [{ ai: '01', value: '08001234567897' }, { ai: '21', value: '999999999999' }], opts)
    expect(r2.ok).toBe(false)
  })

  test('esempi di ogni tipo di chiave', () => {
    for (const k of KEY_TYPES) {
      const schemes = schemesForFamily(t, k.id)
      expect(schemes.length, k.id).toBeGreaterThan(0)
      const results = schemes.map((s) => encodeScheme(t, s, k.example, { ...opts, filter: 0 }))
      const okOnes = results.filter((r) => r.ok).map((r) => r.scheme)
      expect(okOnes.length, `${k.id}: ${results.map((r) => `${r.scheme} ${r.ok ? 'ok' : r.error}`).join(' | ')}`).toBeGreaterThanOrEqual(2)
    }
  })

  test('decodifica URN', () => {
    const d = decodeEpc(t, 'urn:epc:tag:sgtin-96:3.0614141.812345.6789')
    expect(d && 'ais' in d && d.ais).toEqual([{ ai: '01', value: '80614141123458' }, { ai: '21', value: '6789' }])
    expect(d && 'filter' in d && d.filter).toBe(3)
  })
})
