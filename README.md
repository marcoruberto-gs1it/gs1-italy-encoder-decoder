# Encoder · Decoder GS1 · GS1 Italy

**App online:** https://marcoruberto-gs1it.github.io/gs1-italy-encoder-decoder/

Web app per codificare e decodificare le chiavi GS1 in tutte le loro rappresentazioni, mostrando ogni passaggio:

- **Dati GS1**: element string, dati con FNC1, GS1 Digital Link URI, GS1 AI JSON, validati con il GS1 Barcode Syntax Dictionary.
- **EPC RFID** secondo il **GS1 EPC Tag Data Standard 2.3**: schemi TDS 1.x (SGTIN-96, SGTIN-198, SSCC-96, …), schemi **+** (SGTIN+, DSGTIN+, SSCC+, …, con dati aggiuntivi +AIDC come lotto e scadenza) e schemi **++** (con il dominio del GS1 Digital Link compresso nel tag).
- **Struttura del tag**: barra dei bit, scheda per ogni campo (header, filter, partizione, AI, indicatori di codifica e lunghezza, hostname, completamento) e mappa della memoria EPC con StoredCRC e Protocol Control.
- **Data carrier**: EAN-13, EAN-8, GS1-128, GS1 DataBar Expanded, GS1 DataMatrix, GS1 QR Code e QR/DataMatrix con GS1 Digital Link, con identificatore di simbologia e dati trasmessi.
- **Verified by GS1**: prodotto e titolare della licenza; il GS1 Company Prefix della licenza dà la partizione degli schemi TDS 1.x; se Verified by GS1 non lo fornisce, la lunghezza la sceglie l'utente.

Chiavi supportate nell'encoder: GTIN + seriale, SSCC, GLN + estensione, GRAI, GIAI, GSRN, GSRNP, GDTI, GCN, CPI + seriale, ITIP + seriale. Il decoder accetta EPC esadecimale o binario, EPC Tag/Pure Identity URI, GS1 Digital Link (anche compresso), element string, dati del lettore con FNC1 e GTIN.

## Avvio

```sh
npm install
cp .env.example .env.local   # e inserisci VBG_API_TOKEN (lo stesso di gs1-italy-vbg-app)
npm run dev
npm test
```

Il token Verified by GS1 resta lato server: il browser chiama `/api/vbg` e il proxy di Vite aggiunge l'header `Authorization`. Su GitHub Pages (workflow `.github/workflows/pages.yml`, a ogni push su `main`) `VITE_VBG_BASE` punta al Worker Cloudflare di gs1-italy-vbg-app, che custodisce il token e accetta le chiamate da `marcoruberto-gs1it.github.io`.

## Come funziona

| File | Ruolo |
| --- | --- |
| `src/vendor/tdt/TDTtranslator.js` | Motore ufficiale **GS1 TDT 2.3** ([gs1/TDT](https://github.com/gs1/TDT)), con le modifiche elencate in testa al file |
| `public/tdt/schemas/` | Artefatti TDT 2.3 (definizioni degli schemi e tabelle A, B, E, F, K) |
| `src/vendor/gs1/syntax-engine/` | **GS1 Barcode Syntax Engine** 1.4.1 (WebAssembly) |
| `src/gs1/epc.ts` | Codifica in ogni schema, verifica di andata e ritorno, scomposizione dei bit in campi |
| `src/gs1/syntax.ts` | Lettura e validazione dei dati GS1, HRI, Digital Link |
| `src/gs1/analyze.ts` | Dall'input a tutte le rappresentazioni; lunghezza del GCP (dalla licenza su Verified by GS1; se manca, dal tag letto o scelta dall'utente) |
| `src/gs1/rfid.ts` | PC word e CRC-16 del banco EPC (ISO/IEC 18000-63) |
| `src/gs1/barcodes.ts` | Simboli con bwip-js (caricato solo nella scheda Barcode) |
| `src/gs1/vbg.ts` | Client Verified by GS1 (da gs1-italy-vbg-app) |
| `src/issues.ts` | Segnalazioni (errori, dati mancanti, dati fuori dal tag) con l'azione che risolve ciascuna |
| `src/urlState.ts` | Stato nell'indirizzo della pagina, per condividere una codifica o una decodifica con un link |
| `src/motion.ts` | Animazioni con GSAP: è l'unico file che lo importa (anche la timeline della scena 3D passa da qui) |
| `src/three/tagScene.ts` | Tag RAIN RFID in 3D della schermata iniziale (three.js), caricato solo lì; se WebGL manca resta l'illustrazione SVG |
| `src/anim/lottieData.ts`, `src/components/LottieIcon.tsx` | Icone animate Lottie (esito, errore, copia, lettura in corso), generate nel codice con i colori GS1; player `lottie_light`, senza `eval` |
| `src/components/ui/` | Componenti [shadcn/ui](https://ui.shadcn.com) (Radix UI, cmdk) sul tema GS1 Italy: pulsanti, campi, menu con ricerca, controlli a segmenti, badge, card, tabelle, avvisi, tooltip |
| `src/index.css`, `src/legacy.css` | Tailwind CSS 4 con i token del tema (prefisso `--ui-`); `legacy.css` (impaginazione e infografiche) sta in un layer sotto le utility, così le classi dei componenti prevalgono sempre |

Ogni codifica viene riletta con lo stesso motore: se lo schema non restituisce esattamente i dati di partenza (per esempio un seriale con zeri iniziali in SGTIN-96) lo schema è segnalato come non utilizzabile, con il motivo.

### Correzione al motore TDT

Nella versione pubblicata di `TDTtranslator.js`, decodificando un EPC `++` i dati +AIDC che seguono l'hostname venivano scartati. La copia in `src/vendor/tdt` li decodifica come negli schemi `+`; il test `src/gs1/epc.test.ts` verifica l'andata e ritorno di SGTIN++ e DSGTIN++ con lotto e scadenza.

## Sicurezza

- **Content-Security-Policy** nella pagina pubblicata (plugin in `vite.config.ts`): script e stili solo dal sito, nessun `unsafe-inline` né `eval` (`wasm-unsafe-eval` solo per la Syntax Engine), connessioni solo verso il Worker di Verified by GS1. Font e librerie sono serviti dal sito: nessuna richiesta a terzi all'apertura. Per restare dentro la CSP i menu usano Popover non modali (il blocco dello scorrimento di Radix inietterebbe un `<style>`) e non si usano librerie che creano stili a runtime.
- **Verified by GS1**: il token resta lato server. Il proxy di sviluppo inoltra solo `POST` agli endpoint usati dall'app e rifiuta le richieste da altri siti; il Worker di produzione deve applicare le stesse regole (endpoint, `Origin`, limiti di frequenza). I link e le immagini della risposta, scelti dal titolare della licenza, sono accettati solo se `https:`/`http:` e ogni link mostra il dominio di destinazione.
- **Link condivisi**: i parametri dell'indirizzo hanno limiti di lunghezza e numero; il dominio del Digital Link accetta solo caratteri da hostname.
- **CI**: GitHub Actions fissate allo SHA del commit, permessi minimi per job (il build non può pubblicare), `npm audit` prima del build, Dependabot settimanale.

## Esempi

Gli esempi usano codici di GS1 Italy: il GLN di GS1 Italy (8000000000002) e chiavi costruite sul suo GS1 Company Prefix 8000000, registrato su Verified by GS1 (es. GTIN 08000000000019).

## Licenze

I motori GS1, i font e le librerie sono open source, tranne GSAP: è gratuito anche per uso commerciale, ma con la licenza standard di GSAP, non con una licenza open source. Lo usa solo `src/motion.ts`, così si può sostituire senza toccare il resto.

| Componente | Licenza |
| --- | --- |
| GS1 TDT 2.3 (motore e artefatti) | Apache 2.0 (`src/vendor/tdt/LICENSE`, `DISCLAIMER.md`) |
| GS1 Barcode Syntax Engine | Apache 2.0 (`src/vendor/gs1/syntax-engine/LICENSE`) |
| React, React DOM | MIT |
| bwip-js (simboli) | MIT |
| three.js (tag 3D) | MIT |
| lottie-web (icone animate) | MIT |
| lucide-react (icone) | ISC |
| shadcn/ui (componenti copiati in `src/components/ui`), Radix UI, cmdk, Tailwind CSS, tailwind-merge, clsx, tw-animate-css | MIT |
| class-variance-authority | Apache 2.0 |
| GSAP (animazioni) | [Licenza standard GSAP](https://gsap.com/standard-license), gratuita |
| IBM Plex Sans e IBM Plex Mono (font, serviti dal sito con Fontsource) | SIL Open Font License 1.1 |
| Strumenti di sviluppo (Vite, Vitest, TypeScript, …) | MIT, Apache 2.0, ISC, MPL 2.0, BSD |

Le animazioni usano GSAP (in `src/motion.ts`) e CSS. Il logo GS1 Italy è un marchio di GS1 Italy e non è coperto dalla licenza del codice.
