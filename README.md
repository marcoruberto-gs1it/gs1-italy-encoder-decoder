# Encoder · Decoder GS1 · GS1 Italy

Web app per codificare e decodificare le chiavi GS1 in tutte le loro rappresentazioni, mostrando ogni passaggio:

- **Dati GS1**: element string, dati con FNC1, GS1 Digital Link URI, GS1 AI JSON, validati con il GS1 Barcode Syntax Dictionary.
- **EPC RFID** secondo il **GS1 EPC Tag Data Standard 2.3**: schemi TDS 1.x (SGTIN-96, SGTIN-198, SSCC-96, …), schemi **+** (SGTIN+, DSGTIN+, SSCC+, …, con dati aggiuntivi +AIDC come lotto e scadenza) e schemi **++** (con il dominio del GS1 Digital Link compresso nel tag).
- **Struttura del tag**: barra dei bit, scheda per ogni campo (header, filter, partizione, AI, indicatori di codifica e lunghezza, hostname, completamento) e mappa della memoria EPC con StoredCRC e Protocol Control.
- **Data carrier**: EAN-13, GS1-128, GS1 DataBar Expanded, GS1 DataMatrix, GS1 QR Code e QR/DataMatrix con GS1 Digital Link, con identificatore di simbologia e dati trasmessi.
- **Verified by GS1**: prodotto e titolare della licenza; il GS1 Company Prefix della licenza dà la partizione degli schemi TDS 1.x; se Verified by GS1 non lo fornisce, la lunghezza la sceglie l'utente.

Chiavi supportate nell'encoder: GTIN + seriale, SSCC, GLN + estensione, GRAI, GIAI, GSRN, GSRNP, GDTI, GCN, CPI + seriale, ITIP + seriale. Il decoder accetta EPC esadecimale o binario, EPC Tag/Pure Identity URI, GS1 Digital Link (anche compresso), element string, dati del lettore con FNC1 e GTIN.

## Avvio

```sh
npm install
cp .env.example .env.local   # e inserisci VBG_API_TOKEN (lo stesso di gs1-italy-vbg-app)
npm run dev
npm test
```

Il token Verified by GS1 resta lato server: il browser chiama `/api/vbg` e il proxy di Vite aggiunge l'header `Authorization`. In produzione imposta `VITE_VBG_BASE` sull'URL di un backend che faccia lo stesso (per esempio il Worker di gs1-italy-vbg-app, che va abilitato per l'origine della nuova app nel CORS).

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

Ogni codifica viene riletta con lo stesso motore: se lo schema non restituisce esattamente i dati di partenza (per esempio un seriale con zeri iniziali in SGTIN-96) lo schema è segnalato come non utilizzabile, con il motivo.

### Correzione al motore TDT

Nella versione pubblicata di `TDTtranslator.js`, decodificando un EPC `++` i dati +AIDC che seguono l'hostname venivano scartati. La copia in `src/vendor/tdt` li decodifica come negli schemi `+`; il test `src/gs1/epc.test.ts` verifica l'andata e ritorno di SGTIN++ e DSGTIN++ con lotto e scadenza.

## Esempi

Gli esempi usano codici di GS1 Italy: il GLN di GS1 Italy (8000000000002) e chiavi costruite sul suo GS1 Company Prefix 8000000, registrato su Verified by GS1 (es. GTIN 08000000000019).

## Licenze

Tutte le librerie, i motori GS1 e i font usati sono open source: nessuna licenza commerciale o proprietaria.

| Componente | Licenza |
| --- | --- |
| GS1 TDT 2.3 (motore e artefatti) | Apache 2.0 (`src/vendor/tdt/LICENSE`, `DISCLAIMER.md`) |
| GS1 Barcode Syntax Engine | Apache 2.0 (`src/vendor/gs1/syntax-engine/LICENSE`) |
| React, React DOM | MIT |
| bwip-js (simboli) | MIT |
| lucide-react (icone) | ISC |
| Montserrat, Spline Sans Mono (Google Fonts) | SIL Open Font License |
| Strumenti di sviluppo (Vite, Vitest, TypeScript, …) | MIT, Apache 2.0, ISC, MPL 2.0, BSD |

Le animazioni usano la Web Animations API del browser e CSS, senza librerie. Il logo GS1 Italy è un marchio di GS1 Italy e non è coperto dalla licenza del codice.
