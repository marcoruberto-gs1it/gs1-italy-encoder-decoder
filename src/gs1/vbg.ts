/*
 * Client per l'API Verified by GS1 di GS1 Italy (https://api.vbg.gs1it.org/v2), come in gs1-italy-vbg-app.
 * Il browser chiama `/api/vbg`: il proxy di Vite (o il Worker in produzione, VITE_VBG_BASE) aggiunge il token.
 */
import { k, lang, locale, t } from '../i18n'

const BASE = import.meta.env.VITE_VBG_BASE ?? '/api/vbg'

export type Licensee = { name: string; prefix?: string; mo?: string; gln?: string; website?: string; address?: string; status?: string }

export type Verification = {
  state: 'verified' | 'licensed' | 'invalid' | 'error'
  complete?: boolean
  name?: string
  brand?: string
  image?: string
  netContent?: string
  category?: string
  countries?: string
  updated?: string
  licensee?: Licensee
  links: { label: string; href: string }[]
  message?: string
}

type Lang = { language: string; value: string }
type RawLicence = {
  licenseeName: string
  licenceStatus?: string
  status?: string
  licenceKey?: string
  licenseeGLN?: string
  licensingMO?: { moName: string }
  contactPoint?: { website?: string }[]
  address?: Record<string, Lang | string | undefined>
}
type RawRecord = {
  gpcCategoryCode?: string
  brandName?: Lang[]
  productDescription?: Lang[]
  productImageUrl?: Lang[]
  netContent?: { unitCode: string; value: string }[]
  countryOfSaleCode?: { alpha2?: string; numeric: string }[]
  dateUpdated?: string
  isComplete?: boolean
  gs1Licence?: RawLicence
  linkset?: Record<string, { href: string; title: string; hreflang?: string[] }[] | string>[]
  glnRecords?: { organizationName?: Lang[] }[]
  code?: number
  validationErrors?: { errors: { errorCode: string; message: string }[] }[]
}

/** AI della chiave → endpoint dell'API. */
const ENDPOINTS: Record<string, string> = {
  '01': 'gtin',
  '414': 'gln',
  '00': 'sscc',
  '8003': 'grai',
  '8004': 'giai',
  '8017': 'gsrn',
  '8018': 'gsrn',
  '253': 'gdti',
  '255': 'gcn',
  '8010': 'cpid',
  '8006': 'itip',
}

export const canVerify = (ai: string) => Boolean(ENDPOINTS[ai])

const ERRORS: Record<string, string> = {
  E002: k('La cifra di controllo non è corretta.'),
  E030: k('Numero riservato a uso interno (circolazione ristretta).'),
  E037: k('Numero riservato ai coupon.'),
  E039: k('Il numero non risulta assegnato da GS1 a nessuna azienda.'),
}

const UNITS: Record<string, string> = { GRM: 'g', KGM: 'kg', MGM: 'mg', MLT: 'ml', CLT: 'cl', LTR: 'l', H87: 'pz', MTR: 'm', CMT: 'cm', MMT: 'mm' }

function pick(values?: Lang[]) {
  if (!values?.length) return undefined
  // Prima la lingua dell'interfaccia, poi l'altra tra italiano e inglese.
  const [first, second] = lang() === 'en' ? [/^en/i, /^it/i] : [/^it/i, /^en/i]
  return (values.find((v) => first.test(v.language)) ?? values.find((v) => second.test(v.language)) ?? values[0]).value
}

const country = (code: string) => {
  try {
    return new Intl.DisplayNames([locale()], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

const text = (v: Lang | string | undefined) => (typeof v === 'string' ? v : v?.value)

function address(a?: RawLicence['address']) {
  if (!a) return undefined
  const city = [text(a.postalCode as string), text(a.addressLocality)].filter(Boolean).join(' ')
  return [text(a.streetAddress), city, typeof a.countryCode === 'string' ? country(a.countryCode) : undefined].filter(Boolean).join(', ') || undefined
}

function licensee(l?: RawLicence): Licensee | undefined {
  if (!l) return undefined
  return {
    name: l.licenseeName,
    prefix: l.licenceKey,
    mo: l.licensingMO?.moName,
    gln: l.licenseeGLN,
    website: l.contactPoint?.find((c) => c.website)?.website,
    address: address(l.address),
    status: l.licenceStatus ?? l.status,
  }
}

function links(linkset?: RawRecord['linkset']) {
  const ctx = linkset?.[0]
  if (!ctx) return []
  const out: { label: string; href: string }[] = []
  for (const targets of Object.values(ctx)) {
    if (!Array.isArray(targets) || !targets.length) continue
    const best = targets.find((x) => x.hreflang?.some((l) => l.toLowerCase().startsWith(lang()))) ?? targets[0]
    out.push({ label: best.title, href: best.href })
  }
  return out.slice(0, 6)
}

function map(r: RawRecord): Verification {
  const issue = r.validationErrors?.[0]?.errors?.[0]
  if (r.code === 5 || issue) return { state: 'invalid', links: [], message: issue && ERRORS[issue.errorCode] ? t(ERRORS[issue.errorCode]) : (issue?.message ?? t('Il codice non è valido.')) }
  const name = pick(r.productDescription) ?? pick(r.glnRecords?.[0]?.organizationName)
  const lic = licensee(r.gs1Licence)
  if (!name || r.glnRecords) return { state: 'licensed', licensee: lic, links: links(r.linkset), name: r.glnRecords ? name : undefined }
  return {
    state: 'verified',
    complete: r.isComplete,
    name,
    brand: pick(r.brandName),
    image: pick(r.productImageUrl),
    netContent: r.netContent?.map((n) => `${Number(n.value).toLocaleString(locale())} ${UNITS[n.unitCode] ?? n.unitCode}`).join(' · '),
    category: r.gpcCategoryCode,
    countries: r.countryOfSaleCode?.map((c) => (c.alpha2 ? country(c.alpha2) : c.numeric)).join(', '),
    updated: r.dateUpdated ? new Date(r.dateUpdated).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }) : undefined,
    licensee: lic,
    links: links(r.linkset),
  }
}

const cache = new Map<string, Promise<Verification>>()

/** Interroga il registro Verified by GS1 per la chiave primaria. Le risposte restano in cache per la sessione. */
export function verifyKey(ai: string, value: string): Promise<Verification> {
  const endpoint = ENDPOINTS[ai]
  if (!endpoint) return Promise.resolve({ state: 'error', links: [], message: t('Questa chiave non si può verificare su Verified by GS1.') })
  const key = endpoint === 'gtin' ? value.padStart(14, '0') : value
  const id = `${lang()}:${endpoint}:${key}`
  const hit = cache.get(id)
  if (hit) return hit

  const request = fetch(`${BASE}/${endpoint}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify([key]),
  })
    .then(async (res): Promise<Verification> => {
      if (res.status === 401 || res.status === 403) return { state: 'error', links: [], message: t('Il servizio ha rifiutato l’accesso: controlla VBG_API_TOKEN in .env.local.') }
      if (!res.ok) return { state: 'error', links: [], message: t('Il servizio di verifica non risponde (errore {status}).', { status: res.status }) }
      const [record] = (await res.json()) as RawRecord[]
      return record ? map(record) : { state: 'error', links: [], message: t('Risposta vuota dal servizio di verifica.') }
    })
    .catch((): Verification => ({ state: 'error', links: [], message: t('Impossibile raggiungere il servizio Verified by GS1.') }))

  cache.set(id, request)
  void request.then((v) => v.state === 'error' && cache.delete(id))
  return request
}
