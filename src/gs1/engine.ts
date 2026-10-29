/*
 * Caricamento dei due motori ufficiali GS1 (Apache 2.0):
 * - GS1 TDT 2.3 (gs1/TDT): traduzione EPC ↔ binario ↔ URN ↔ GS1 Digital Link, artefatti in public/tdt;
 * - GS1 Barcode Syntax Engine (gs1/gs1-syntax-engine): validazione degli AI, HRI, Digital Link, dati FNC1.
 */
import TDTtranslator from '../vendor/tdt/TDTtranslator.js'

export type Tdt = TDTtranslator
type Encoder = InstanceType<typeof import('../vendor/gs1/syntax-engine/gs1encoder.mjs').GS1encoder>

let tdtPromise: Promise<Tdt> | null = null
let syntaxPromise: Promise<Encoder> | null = null

const base = () => (typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/')

export function loadTdt(): Promise<Tdt> {
  tdtPromise ??= (async () => {
    // Il motore scrive molti messaggi di debug: nel browser restano nascosti al livello "Verbose".
    const t = new TDTtranslator({ schemasUrl: `${base()}tdt/schemas/` })
    await t.initialized
    return t
  })()
  return tdtPromise
}

export function loadSyntaxEngine(): Promise<Encoder> {
  syntaxPromise ??= import('../vendor/gs1/syntax-engine/gs1encoder.mjs').then(async ({ GS1encoder }) => {
    const engine = new GS1encoder()
    await engine.init()
    return engine
  })
  return syntaxPromise
}
