/* Cifra di controllo GS1 (modulo 10, pesi 3 e 1 a partire da destra), con i passaggi per mostrarla. */

export type CheckDigitSteps = {
  digits: { digit: number; weight: number; product: number }[]
  sum: number
  checkDigit: number
}

/** Calcola la cifra di controllo per le cifre date (senza la cifra di controllo). */
export function checkDigitSteps(body: string): CheckDigitSteps {
  const digits = [...body].map((c, i) => {
    const digit = Number(c)
    const weight = (body.length - i) % 2 === 1 ? 3 : 1
    return { digit, weight, product: digit * weight }
  })
  const sum = digits.reduce((s, d) => s + d.product, 0)
  return { digits, sum, checkDigit: (10 - (sum % 10)) % 10 }
}

export const computeCheckDigit = (body: string) => checkDigitSteps(body).checkDigit

/** true se l'ultima cifra di `value` è la cifra di controllo corretta. */
export function isCheckDigitValid(value: string): boolean {
  if (!/^\d{2,}$/.test(value)) return false
  return computeCheckDigit(value.slice(0, -1)) === Number(value.at(-1))
}
