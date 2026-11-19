import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Font serviti dal sito (OFL 1.1), non da Google Fonts: nessuna richiesta a terzi e una CSP più stretta.
// Montserrat come in gs1-italy-vbg-app; IBM Plex Mono per codici, bit e URI.
import '@fontsource/montserrat/latin-500.css'
import '@fontsource/montserrat/latin-600.css'
import '@fontsource/montserrat/latin-700.css'
import '@fontsource/montserrat/latin-800.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
