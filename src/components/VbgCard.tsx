import { BadgeCheck, Building2, Clock, ExternalLink, Globe, Hash, Info, Landmark, Link2, Loader2, MapPin, Package, Shapes, ShieldAlert, Tag, Weight, type LucideIcon } from 'lucide-react'
import type { Verification } from '../gs1/vbg'
import { t } from '../i18n'
import { Alert, AlertTitle } from '@/components/ui/misc'
import { LottieIcon } from './LottieIcon'

/** Scheda Verified by GS1 della chiave primaria. */
export function VbgCard({ ai, state }: { ai?: string; state?: Verification | 'loading' }) {
  if (!state)
    return (
      <Alert variant="info">
        <Info />
        <AlertTitle className="font-normal">{t('Verified by GS1 è disponibile per GTIN, GLN, SSCC, GRAI, GIAI, GSRN, GDTI, GCN, CPI e ITIP.')}</AlertTitle>
      </Alert>
    )
  if (state === 'loading')
    return (
      <Alert variant="info">
        <span className="alert-icon">
          <LottieIcon name="scan" size={20} loop className="lottie-current" fallback={<Loader2 size={16} className="spin" />} />
        </span>
        <AlertTitle className="font-normal">{t('Verifica nel registro Verified by GS1…')}</AlertTitle>
      </Alert>
    )
  if (state.state === 'error' || state.state === 'invalid')
    return (
      <Alert variant={state.state === 'invalid' ? 'destructive' : 'warning'}>
        <ShieldAlert />
        <AlertTitle className="font-medium">{state.message}</AlertTitle>
      </Alert>
    )

  const l = state.licensee
  return (
    <div className="vbg">
      <div className="vbg-head">
        <BadgeCheck size={22} />
        <div>
          <strong>{state.state === 'verified' ? t('Verificato da GS1') : t('Licenza GS1 trovata')}</strong>
          <span className="muted">
            {' '}
            ·{' '}
            {state.state === 'verified'
              ? state.complete
                ? t('tutti gli attributi essenziali pubblicati')
                : t('dati del prodotto pubblicati')
              : ai === '01'
                ? t('il titolare non ha ancora pubblicato i dati del prodotto')
                : t('chiave appartenente a una licenza attiva')}
          </span>
        </div>
      </div>
      <div className="vbg-body">
        {state.image && <img className="vbg-img" src={state.image} alt="" loading="lazy" referrerPolicy="no-referrer" crossOrigin="anonymous" />}
        <dl>
          {state.name && <Row icon={ai === '414' ? MapPin : Package} k={ai === '414' ? t('Località') : t('Prodotto')} v={state.name} />}
          {state.brand && <Row icon={Tag} k={t('Marchio')} v={state.brand} />}
          {state.netContent && <Row icon={Weight} k={t('Contenuto netto')} v={state.netContent} />}
          {state.category && <Row icon={Shapes} k={t('Categoria GPC')} v={state.category} />}
          {state.countries && <Row icon={Globe} k={t('Paesi di vendita')} v={state.countries} />}
          {state.updated && <Row icon={Clock} k={t('Aggiornato')} v={state.updated} />}
        </dl>
      </div>
      {l && (
        <div className="vbg-licensee">
          <Building2 size={18} />
          <dl>
            <Row icon={Building2} k={t('Titolare')} v={l.name} />
            {l.prefix && <Row icon={Hash} k="GS1 Company Prefix" v={t('{prefix} ({n} cifre: usato per gli schemi TDS 1.x)', { prefix: l.prefix, n: l.prefix.length })} />}
            {l.mo && <Row icon={Landmark} k={t('Rilasciato da')} v={l.mo} />}
            {l.address && <Row icon={MapPin} k={t('Indirizzo')} v={l.address} />}
            {l.website && <Row icon={Link2} k={t('Sito')} v={l.website} />}
          </dl>
        </div>
      )}
      {state.links.length > 0 && (
        <div className="vbg-links">
          {state.links.map((x) => (
            <a key={x.href} href={x.href} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} /> {x.label} <span className="muted small">{x.host}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

const Row = ({ icon: Icon, k, v }: { icon: LucideIcon; k: string; v: string }) => (
  <>
    <dt className="flex items-center gap-1.5">
      <Icon size={14} className="shrink-0 opacity-70" aria-hidden />
      {k}
    </dt>
    <dd className="font-semibold text-foreground">{v}</dd>
  </>
)
