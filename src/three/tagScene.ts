/*
 * Scena 3D della schermata iniziale: un inlay RAIN RFID (substrato, antenna a dipolo con meandri e
 * anello di adattamento, chip) e i 96 bit dell'EPC d'esempio che lo percorrono.
 *   write (encoder): i bit corrono lungo i due bracci dell'antenna fino al chip, che si accende;
 *   read  (decoder): il chip si accende e i bit escono lungo i bracci verso il lettore.
 * La sequenza è una timeline GSAP che si esegue una volta; poi il tag resta sospeso e segue il puntatore.
 * Si disegna solo quando è visibile; con "riduci movimento" è un unico fotogramma fermo.
 * Questo modulo si carica solo nella schermata iniziale (import dinamico): three.js non pesa sul resto.
 */
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { sceneTimeline } from '../motion'

export type TagSceneMode = 'write' | 'read'
export type TagScene = { dispose: () => void }
type Options = { mode: TagSceneMode; bits: string; reducedMotion: boolean; onArrive?: () => void }

const COLOR = { teal: 0x22bcb9, orange: 0xf26334, white: 0xffffff, bit0: 0x8fb3e8, alu: 0xa9b6c6, chip: 0x1d2633 }

type P = [number, number]

/** Braccio sinistro dell'antenna, dal chip verso l'esterno: tratto dritto, meandri, piastra terminale. */
function armPath(): P[] {
  const pts: P[] = [
    [-0.42, 0],
    [-0.7, 0],
  ]
  let x = -0.7
  for (let i = 0; i < 5; i++) {
    const up = i % 2 === 0
    pts.push([x, up ? 0.5 : -0.5])
    x -= 0.2
    pts.push([x, up ? 0.5 : -0.5])
    pts.push([x, 0])
  }
  pts.push([-2.05, 0])
  return pts
}

/** Lunghezze cumulate di una spezzata, per trovare il punto a una frazione u del percorso. */
function walker(pts: P[]) {
  const acc = [0]
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const total = acc[acc.length - 1]
  return (u: number): P => {
    const d = Math.min(Math.max(u, 0), 1) * total
    let i = 1
    while (i < acc.length - 1 && acc[i] < d) i++
    const f = (d - acc[i - 1]) / (acc[i] - acc[i - 1] || 1)
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]
  }
}

/** Strisce piatte di alluminio lungo i segmenti di una spezzata (una sola InstancedMesh). */
function traces(paths: P[][], width: number, material: THREE.Material) {
  const segs = paths.flatMap((p) => p.slice(1).map((b, i) => [p[i], b] as const))
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, segs.length)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  segs.forEach(([a, b], i) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(b[1] - a[1], b[0] - a[0]))
    m.compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.012), q, new THREE.Vector3(len + width, width, 0.018))
    mesh.setMatrixAt(i, m)
  })
  return mesh
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2 + r, -h / 2)
  s.lineTo(w / 2 - r, -h / 2)
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
  s.lineTo(w / 2, h / 2 - r)
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  s.lineTo(-w / 2 + r, h / 2)
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
  s.lineTo(-w / 2, -h / 2 + r)
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
  return s
}

/** Bagliore radiale arancione (da trasparente al centro pieno) per il chip che si accende. */
function glowTexture() {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255, 150, 100, 1)')
  grad.addColorStop(0.25, 'rgba(242, 99, 52, 0.55)')
  grad.addColorStop(1, 'rgba(242, 99, 52, 0)')
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function createTagScene(canvas: HTMLCanvasElement, { mode, bits, reducedMotion, onArrive }: Options): TagScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = env
  scene.environmentIntensity = 0.55

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
  camera.position.set(0, 0, 6)

  const tag = new THREE.Group()
  scene.add(tag)

  // Substrato PET trasparente con il bordo in teal.
  const shape = roundedRect(4.7, 1.55, 0.14)
  const substrate = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: COLOR.white, transparent: true, opacity: 0.1, roughness: 0.35, side: THREE.DoubleSide, depthWrite: false }))
  const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(shape.getPoints(12)), new THREE.LineBasicMaterial({ color: COLOR.teal, transparent: true, opacity: 0.55 }))
  tag.add(substrate, edge)

  // Antenna: due bracci speculari, anello di adattamento attorno al chip, piastre terminali.
  const left = armPath()
  const right = left.map(([x, y]) => [-x, y] as P)
  const loop: P[] = [[-0.42, 0.3], [0.42, 0.3], [0.42, -0.3], [-0.42, -0.3], [-0.42, 0.3]]
  const alu = new THREE.MeshStandardMaterial({ color: COLOR.alu, metalness: 0.95, roughness: 0.42 })
  tag.add(traces([left, right, loop], 0.05, alu))
  for (const sx of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.018), alu)
    plate.position.set(sx * 2.12, 0, 0.012)
    tag.add(plate)
  }

  // Chip sul lato basso dell'anello: si accende quando arrivano (o partono) i bit.
  const chipMat = new THREE.MeshStandardMaterial({ color: COLOR.chip, roughness: 0.45, metalness: 0.2, emissive: new THREE.Color(COLOR.orange), emissiveIntensity: 0 })
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.08), chipMat)
  chip.position.set(0, -0.3, 0.05)
  tag.add(chip)
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }))
  halo.position.set(0, -0.3, 0.03)
  tag.add(halo)

  // I bit dell'EPC: metà per braccio, nell'ordine in cui il tag li memorizza; gli 1 in teal.
  const half = Math.ceil(bits.length / 2)
  const dots = new THREE.InstancedMesh(new THREE.BoxGeometry(0.075, 0.075, 0.075), new THREE.MeshBasicMaterial({ toneMapped: false }), bits.length)
  const c1 = new THREE.Color(COLOR.teal).multiplyScalar(1.6)
  const c0 = new THREE.Color(COLOR.bit0)
  for (let i = 0; i < bits.length; i++) dots.setColorAt(i, bits[i] === '1' ? c1 : c0)
  tag.add(dots)
  const arms = [walker([...left].reverse()), walker([...right].reverse())] // dall'esterno verso il chip

  const state = { flow: reducedMotion ? 0.55 : 0, glow: reducedMotion ? 0.6 : 0, tiltX: 0, tiltY: 0 }
  const m = new THREE.Matrix4()
  const v = new THREE.Vector3()
  const one = new THREE.Vector3(1, 1, 1)
  const zero = new THREE.Vector3(0, 0, 0)
  const q = new THREE.Quaternion()
  const spacing = 0.9 / half

  function placeBits(time: number) {
    for (let i = 0; i < bits.length; i++) {
      const arm = i < half ? 0 : 1
      const k = i % half
      // write: il primo bit arriva per primo al chip; read: il primo bit esce per primo dal chip.
      const front = state.flow * 1.9 - k * spacing
      let u = mode === 'write' ? front : 1 - front
      const visible = u > 0 && u < 1
      u = Math.min(Math.max(u, 0), 1)
      const [x, y] = arms[arm](u)
      v.set(x, y, 0.1 + Math.sin(time * 3 + i) * 0.015)
      m.compose(v, q, visible ? one : zero)
      dots.setMatrixAt(i, m)
    }
    dots.instanceMatrix.needsUpdate = true
  }

  // Sequenza d'ingresso con GSAP: il tag ruota in posizione, i bit corrono, il chip si accende.
  tag.rotation.set(reducedMotion ? -0.32 : -1.25, reducedMotion ? 0.18 : 0.7, reducedMotion ? -0.04 : -0.25)
  const tl = sceneTimeline()
  if (reducedMotion) tl.pause()
  if (!reducedMotion) {
    tl.to(tag.rotation, { x: -0.32, y: 0.18, z: -0.04, duration: 1.6 })
    if (mode === 'write') {
      tl.to(state, { flow: 1, duration: 2.4, ease: 'power1.inOut' }, 0.5)
      tl.to(state, { glow: 1, duration: 0.35, ease: 'power2.out', onStart: () => onArrive?.() }, 2.55)
      tl.to(state, { glow: 0.25, duration: 1.4, ease: 'power2.inOut' })
    } else {
      tl.to(state, { glow: 1, duration: 0.4, ease: 'power2.out' }, 0.6)
      tl.to(state, { flow: 1, duration: 2.4, ease: 'power1.inOut' }, 0.8)
      tl.to(state, { glow: 0.25, duration: 1.2, ease: 'power2.inOut', onStart: () => onArrive?.() }, 2.6)
    }
  } else onArrive?.()

  // Il tag segue il puntatore (azione dell'utente): pochi gradi, con smorzamento.
  const onPointer = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    state.tiltY = ((e.clientX - r.left) / r.width - 0.5) * 0.5
    state.tiltX = ((e.clientY - r.top) / r.height - 0.5) * 0.35
  }
  const onLeave = () => {
    state.tiltX = 0
    state.tiltY = 0
  }
  canvas.addEventListener('pointermove', onPointer)
  canvas.addEventListener('pointerleave', onLeave)

  function resize() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // La camera si allontana sugli schermi stretti perché il tag (largo 4,7, ruotato) resti intero con un margine.
    camera.position.z = Math.max(5.8, 9.6 / camera.aspect)
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(() => {
    resize()
    if (reducedMotion) frame(0)
  })
  ro.observe(canvas)
  resize()

  const clock = new THREE.Clock()
  let rx = 0
  let ry = 0
  function frame(time: number) {
    if (!reducedMotion) {
      rx += (state.tiltX - rx) * 0.06
      ry += (state.tiltY - ry) * 0.06
      tag.position.y = Math.sin(time * 0.9) * 0.05
    }
    scene.rotation.set(rx, ry, 0)
    chipMat.emissiveIntensity = state.glow * 2.2
    ;(halo.material as THREE.MeshBasicMaterial).opacity = state.glow * 0.9
    halo.scale.setScalar(0.7 + state.glow * 0.5)
    placeBits(time)
    renderer.render(scene, camera)
  }

  // Si disegna solo se il canvas è visibile e la scheda è in primo piano.
  let running = false
  const start = () => {
    if (running || reducedMotion) return
    running = true
    renderer.setAnimationLoop(() => frame(clock.getElapsedTime()))
  }
  const stop = () => {
    running = false
    renderer.setAnimationLoop(null)
  }
  let inView = true
  const io = new IntersectionObserver(([e]) => {
    inView = e.isIntersecting
    if (inView && !document.hidden) start()
    else stop()
  })
  io.observe(canvas)
  const onVisibility = () => (document.hidden || !inView ? stop() : start())
  document.addEventListener('visibilitychange', onVisibility)

  if (reducedMotion) frame(0)
  else start()

  return {
    dispose() {
      stop()
      tl.kill()
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('pointermove', onPointer)
      canvas.removeEventListener('pointerleave', onLeave)
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        mesh.geometry?.dispose()
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
        for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) {
          ;(x as THREE.MeshBasicMaterial).map?.dispose()
          x.dispose()
        }
      })
      env.dispose()
      pmrem.dispose()
      renderer.dispose()
    },
  }
}
