import { BadgeCheck, Building2, ExternalLink, Loader2, ShieldAlert } from 'lucide-react'
import type { Verification } from '../gs1/vbg'
import { t } from '../i18n'

/** Scheda Verified by GS1 della chiave primaria. */
export function VbgCard({ ai, state }: { ai?: string; state?: Verification | 'loading' }) {
  if (!state) return <div className="note">{t('Verified by GS1 è disponibile per GTIN, GLN, SSCC, GRAI, GIAI, GSRN, GDTI, GCN, CPI e ITIP.')}</div>
  if (state === 'loading')
    return (
      <div className="note">
        <Loader2 size={16} className="spin" /> {t('Verifica nel registro Verified by GS1…')}
      </div>
    )
  if (state.state === 'error' || state.state === 'invalid')
    return (
      <div className={`note ${state.state === 'invalid' ? 'bad' : 'warn'}`}>
        <ShieldAlert size={16} /> {state.message}
      </div>
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
        {state.image && <img className="vbg-img" src={state.image} alt="" loading="lazy" />}
        <dl>
          {state.name && <Row k={ai === '414' ? t('Località') : t('Prodotto')} v={state.name} />}
          {state.brand && <Row k={t('Marchio')} v={state.brand} />}
          {state.netContent && <Row k={t('Contenuto netto')} v={state.netContent} />}
          {state.category && <Row k={t('Categoria GPC')} v={state.category} />}
          {state.countries && <Row k={t('Paesi di vendita')} v={state.countries} />}
          {state.updated && <Row k={t('Aggiornato')} v={state.updated} />}
        </dl>
      </div>
      {l && (
        <div className="vbg-licensee">
          <Building2 size={18} />
          <dl>
            <Row k={t('Titolare')} v={l.name} />
            {l.prefix && <Row k="GS1 Company Prefix" v={t('{prefix} ({n} cifre: usato per gli schemi TDS 1.x)', { prefix: l.prefix, n: l.prefix.length })} />}
            {l.mo && <Row k={t('Rilasciato da')} v={l.mo} />}
            {l.address && <Row k={t('Indirizzo')} v={l.address} />}
            {l.website && <Row k={t('Sito')} v={l.website} />}
          </dl>
        </div>
      )}
      {state.links.length > 0 && (
        <div className="vbg-links">
          {state.links.map((x) => (
            <a key={x.href} href={x.href} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> {x.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <>
    <dt>{k}</dt>
    <dd>{v}</dd>
  </>
)
