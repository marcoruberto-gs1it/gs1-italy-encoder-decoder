import { expect, test } from 'vitest'
import { describeAis, parseGs1 } from './syntax'

test('element string → DL e HRI', async () => {
  const r = await parseGs1('(01)08001234567897(17)271231(10)LOT7(21)12345')
  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect(r.data.ais.map((a) => a.ai)).toEqual(['01', '17', '10', '21'])
  expect(r.data.dl).toBe('https://id.gs1.org/01/08001234567897/10/LOT7/21/12345?17=271231')
  expect(r.data.scanData).toBe('^01080012345678971727123110LOT7^2112345')
})

test('Digital Link e GTIN', async () => {
  const r = await parseGs1('https://id.gs1.org/01/08001234567897/21/ABC')
  expect(r.ok && r.data.elementString).toBe('(01)08001234567897(21)ABC')
  const g = await parseGs1('8001234567897')
  expect(g.ok && g.data.ais).toEqual([{ ai: '01', value: '08001234567897' }])
})

test('errore di cifra di controllo', async () => {
  const r = await describeAis([{ ai: '01', value: '08001234567896' }])
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.error).toMatch(/cifra di controllo/)
})
