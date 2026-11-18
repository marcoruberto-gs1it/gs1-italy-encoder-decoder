import { describe, expect, it } from 'vitest'
import { buildUrlState, parseUrlState } from './urlState'

const empty = { keyId: 'sgtin', values: {}, extras: [] }
const params = { filter: 1, hostname: 'id.gs1.org', gcpLength: null }

describe('stato nell’indirizzo', () => {
  it('decoder: andata e ritorno, gli altri parametri restano', () => {
    const q = buildUrlState({ mode: 'decode', encoder: empty, decodeText: ' 3035E8480000004000003039 ', params, scheme: 'SGTIN-96', open: ['rfid', 'barcode'] }, '?lang=en')
    expect(q).toContain('lang=en')
    const back = parseUrlState(q, empty)
    expect(back.mode).toBe('decode')
    expect(back.decodeText).toBe('3035E8480000004000003039')
    expect(back.scheme).toBe('SGTIN-96')
    expect(back.open).toEqual(['rfid', 'barcode'])
  })
  it('encoder: chiave, dati aggiuntivi e parametri del tag', () => {
    const encoder = { keyId: 'sgtin', values: { '01': '08000000000019', '21': 'A/B:1' }, extras: [{ ai: '17', value: '271231' }] }
    const q = buildUrlState({ mode: 'encode', encoder, decodeText: '', params: { filter: 3, hostname: 'id.gs1it.org', gcpLength: 7 }, scheme: 'SGTIN-96', open: [] }, '')
    const back = parseUrlState(q, empty)
    expect(back.mode).toBe('encode')
    expect(back.encoder).toEqual(encoder)
    expect(back.params).toEqual({ filter: 3, hostname: 'id.gs1it.org', gcpLength: 7 })
    expect(q).not.toContain('t=')
  })
  it('senza dati l’indirizzo resta pulito', () => {
    expect(buildUrlState({ mode: 'encode', encoder: empty, decodeText: '', params, scheme: 'SGTIN+', open: [] }, '')).toBe('')
  })
  it('valori non validi vengono ignorati', () => {
    const back = parseUrlState('?k=nope&f=9&g=40&t=boh', empty)
    expect(back.encoder.keyId).toBe('sgtin')
    expect(back.open).toEqual([])
    expect(back.params).toEqual({})
  })
})
