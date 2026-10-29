/* Infografiche in SVG con la palette GS1 (glifi ripresi da gs1-italy-vbg-app).
   Le classi `ga-*` sono i bersagli delle animazioni GSAP. */

const NAVY = '#002c6c'

function barPattern(count: number, seed = 7) {
  const out: number[] = []
  let s = seed
  for (let i = 0; i < count; i++) {
    s = (s * 9301 + 49297) % 233280
    out.push(1 + Math.floor((s / 233280) * 3))
  }
  return out
}

export function BarsGlyph({ x, y, w, h, color = NAVY, count = 14, seed }: { x: number; y: number; w: number; h: number; color?: string; count?: number; seed?: number }) {
  const widths = barPattern(count, seed)
  const total = widths.reduce((a, b) => a + b * 2, 0)
  const unit = w / total
  const starts = widths.map((_, i) => x + widths.slice(0, i).reduce((a, b) => a + b * 2, 0) * unit)
  return (
    <g fill={color}>
      {widths.map((bw, i) => (
        <rect key={i} x={starts[i]} y={y} width={bw * unit} height={h} />
      ))}
    </g>
  )
}

export function Modules({ x, y, size, cells, color = NAVY, seed = 3 }: { x: number; y: number; size: number; cells: number; color?: string; seed?: number }) {
  const unit = size / cells
  const rects = []
  let s = seed
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      s = (s * 9301 + 49297) % 233280
      const finder = c === 0 || r === cells - 1
      const timing = (r === 0 && c % 2 === 0) || (c === cells - 1 && r % 2 === 1)
      if (finder || timing || s / 233280 > 0.55) rects.push(<rect key={`${r}-${c}`} x={x + c * unit} y={y + r * unit} width={unit} height={unit} />)
    }
  }
  return <g fill={color}>{rects}</g>
}

export function QrGlyph({ x, y, size, color = NAVY }: { x: number; y: number; size: number; color?: string }) {
  const u = size / 7
  const eye = (ex: number, ey: number) => (
    <g key={`${ex}-${ey}`}>
      <rect x={ex} y={ey} width={u * 3} height={u * 3} rx={u * 0.6} fill="none" stroke={color} strokeWidth={u * 0.8} />
      <rect x={ex + u} y={ey + u} width={u} height={u} fill={color} />
    </g>
  )
  return (
    <g>
      {eye(x, y)}
      {eye(x + u * 4, y)}
      {eye(x, y + u * 4)}
      <g fill={color}>
        <rect x={x + u * 4} y={y + u * 4} width={u} height={u} />
        <rect x={x + u * 6} y={y + u * 4} width={u} height={u} />
        <rect x={x + u * 5} y={y + u * 5} width={u} height={u} />
        <rect x={x + u * 4} y={y + u * 6} width={u} height={u} />
        <rect x={x + u * 6} y={y + u * 6} width={u} height={u} />
      </g>
    </g>
  )
}

/** Tag UHF stilizzato: antenna a dipolo e chip. */
export function TagGlyph({ x, y, w, h, color = '#b8862f' }: { x: number; y: number; w: number; h: number; color?: string }) {
  const sx = w / 100
  const sy = h / 50
  const P = (px: number, py: number) => `${x + px * sx} ${y + py * sy}`
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h * 0.18} fill="#fff" />
      <path
        d={`M${P(6, 25)} L${P(14, 25)} L${P(14, 10)} L${P(26, 10)} L${P(26, 40)} L${P(38, 40)} L${P(38, 10)} L${P(46, 10)} L${P(46, 25)} M${P(54, 25)} L${P(54, 10)} L${P(62, 10)} L${P(62, 40)} L${P(74, 40)} L${P(74, 10)} L${P(86, 10)} L${P(86, 25)} L${P(94, 25)}`}
        fill="none"
        stroke={color}
        strokeWidth={Math.max(1.4, h * 0.07)}
        strokeLinejoin="round"
      />
      <rect x={x + 45 * sx} y={y + 19 * sy} width={10 * sx} height={12 * sy} rx={1.5} fill={NAVY} />
    </g>
  )
}
