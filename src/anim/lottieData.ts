/*
 * Animazioni Lottie dell'interfaccia, generate qui invece che scaricate: sono piccole, hanno i colori
 * GS1 e non dipendono da file di terzi (licenze, CSP). Formato Lottie/Bodymovin 5.7, solo forme vettoriali.
 *   check  esito valido: il cerchio si disegna, poi il segno di spunta
 *   cross  errore: il cerchio, poi la croce
 *   scan   lettura in corso: onde radio che partono da un punto, in ciclo (RAIN RFID, Verified by GS1)
 *   tick   conferma breve (es. copiato): solo il segno di spunta
 */

type Rgb = [number, number, number]
const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]

export const LOTTIE_COLORS = { forest: '#007a35', bad: '#c8102e', teal: '#0b7471', orange: '#f26334', blue: '#002c6c' } as const
export type LottieColor = keyof typeof LOTTIE_COLORS

const FR = 60
const SIZE = 48
const EASE_OUT = { o: { x: [0.25], y: [0] }, i: { x: [0.15], y: [1] } }

const still = (k: unknown) => ({ a: 0, k })
/** Valore animato tra fotogrammi: [fotogramma, valore][] */
const keys = (frames: [number, number | number[]][]) => ({
  a: 1,
  k: frames.map(([t, v], i) => ({ t, s: Array.isArray(v) ? v : [v], ...(i < frames.length - 1 ? EASE_OUT : {}) })),
})

const transform = (extra: Record<string, unknown> = {}) => ({ ty: 'tr', p: still([0, 0]), a: still([0, 0]), s: still([100, 100]), r: still(0), o: still(100), ...extra })
const stroke = (c: Rgb, w: number) => ({ ty: 'st', c: still([...c, 1]), o: still(100), w: still(w), lc: 2, lj: 2 })
const trim = (end: ReturnType<typeof keys>) => ({ ty: 'tm', s: still(0), e: end, o: still(0), m: 1 })
const path = (v: number[][]) => ({ ty: 'sh', ks: still({ i: v.map(() => [0, 0]), o: v.map(() => [0, 0]), v, c: false }) })
const ellipse = (d: number) => ({ ty: 'el', p: still([0, 0]), s: still([d, d]), d: 1 })

function layer(ind: number, name: string, items: unknown[], op: number, ks: Record<string, unknown> = {}) {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: name,
    sr: 1,
    ks: { o: still(100), r: still(0), p: still([SIZE / 2, SIZE / 2, 0]), a: still([0, 0, 0]), s: still([100, 100, 100]), ...ks },
    ao: 0,
    shapes: [{ ty: 'gr', nm: name, it: [...items, transform()] }],
    ip: 0,
    op,
    st: 0,
    bm: 0,
  }
}

const doc = (name: string, op: number, layers: unknown[]) => ({ v: '5.7.4', fr: FR, ip: 0, op, w: SIZE, h: SIZE, nm: name, ddd: 0, assets: [], layers })

/** Cerchio che si disegna dall'alto in senso orario. */
const ring = (c: Rgb, op: number) => layer(2, 'ring', [ellipse(40), stroke(c, 3), trim(keys([[0, 0], [22, 100]])), transform({ r: still(-90) })], op)

export function lottieCheck(color: LottieColor = 'forest', withRing = true) {
  const c = hex(LOTTIE_COLORS[color])
  const op = 48
  const start = withRing ? 14 : 0
  const mark = layer(1, 'mark', [path([[-9, 1], [-3, 7], [10, -7]]), stroke(c, withRing ? 3.5 : 4.5), trim(keys([[start, 0], [start + 18, 100]]))], op, {
    s: keys([[start + 14, [100, 100, 100]], [start + 22, [112, 112, 100]], [start + 32, [100, 100, 100]]]),
  })
  return doc('check', op, withRing ? [mark, ring(c, op)] : [mark])
}

export function lottieCross(color: LottieColor = 'bad') {
  const c = hex(LOTTIE_COLORS[color])
  const op = 48
  const a = layer(1, 'a', [path([[-7, -7], [7, 7]]), stroke(c, 3.5), trim(keys([[14, 0], [26, 100]]))], op)
  const b = layer(3, 'b', [path([[7, -7], [-7, 7]]), stroke(c, 3.5), trim(keys([[20, 0], [32, 100]]))], op)
  return doc('cross', op, [a, b, ring(c, op)])
}

/** Onde radio: tre archi che si allargano e svaniscono, sfasati, attorno a un punto fisso. */
export function lottieScan(color: LottieColor = 'teal') {
  const c = hex(LOTTIE_COLORS[color])
  const op = 90
  const dot = layer(1, 'dot', [ellipse(7), { ty: 'fl', c: still([...c, 1]), o: still(100), r: 1 }], op)
  // Ogni onda percorre la sua fase p da 0 a 1 (scala 30→100%, opacità 100→0) in un ciclo, sfasata di un terzo.
  const waves = [0, 1 / 3, 2 / 3].map((phase, i) => {
    const wrap = Math.round((1 - phase) * op) // fotogramma in cui l'onda ricomincia da p = 0
    const at = (p: number) => ({ scale: 30 + 70 * p, opacity: 100 * (1 - p) })
    const frames = phase === 0 ? [[0, 0], [op, 1]] : [[0, phase], [wrap, 1], [wrap + 0.01, 0], [op, phase]]
    return layer(i + 2, `wave-${i}`, [ellipse(42), stroke(c, 2.5)], op, {
      s: linear(frames.map(([f, p]) => [f, [at(p).scale, at(p).scale, 100]])),
      o: linear(frames.map(([f, p]) => [f, at(p).opacity])),
    })
  })
  return doc('scan', op, [dot, ...waves])
}

/** Fotogrammi chiave con interpolazione lineare (per i cicli continui). */
function linear(frames: [number, number | number[]][]) {
  const lin = { o: { x: [0], y: [0] }, i: { x: [1], y: [1] } }
  return { a: 1, k: frames.map(([t, v], i) => ({ t, s: Array.isArray(v) ? v : [v], ...(i < frames.length - 1 ? lin : {}) })) }
}

export const LOTTIE = {
  check: () => lottieCheck('forest'),
  cross: () => lottieCross('bad'),
  scan: () => lottieScan('teal'),
  tick: () => lottieCheck('forest', false),
} as const
export type LottieName = keyof typeof LOTTIE
