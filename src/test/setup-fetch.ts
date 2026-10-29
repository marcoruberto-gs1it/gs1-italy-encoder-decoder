/* Nei test la fetch degli artefatti TDT legge i file da public/. */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const publicDir = fileURLToPath(new URL('../../public/', import.meta.url))

globalThis.fetch = (async (input: string | URL | Request) => {
  const path = String(input).replace(/^\/+/, '')
  try {
    const body = await readFile(publicDir + path, 'utf8')
    return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch {
    return new Response('not found', { status: 404 })
  }
}) as typeof fetch
