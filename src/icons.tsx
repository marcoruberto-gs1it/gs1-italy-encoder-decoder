/*
 * Iconografia dei concetti GS1, la stessa in tutta l'app (menu, etichette dei campi, riepiloghi).
 * Colori di categoria come in legacy.css: blu identità e dati GS1, teal RFID, forest web e barcode,
 * arancione date e scadenze.
 */
import type { ReactNode } from 'react'
import {
  Ban,
  Barcode,
  Binary,
  Boxes,
  CalendarCheck,
  CalendarClock,
  CalendarX2,
  Clock,
  Cog,
  Component,
  Container,
  Database,
  Ellipsis,
  Factory,
  FileText,
  Fingerprint,
  Forklift,
  Globe,
  Grid3x3,
  Hash,
  Lock,
  MapPin,
  MapPinPlus,
  Package,
  PackageCheck,
  PackageOpen,
  Puzzle,
  QrCode,
  Recycle,
  Shapes,
  ShoppingCart,
  Snowflake,
  Stethoscope,
  Tag,
  Ticket,
  UserRound,
  Weight,
  Wheat,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type Tone = 'blue' | 'teal' | 'forest' | 'orange' | 'gray' | 'red'

/** Riquadro colorato con l'icona di un concetto. */
export function ConceptIcon({ icon: Icon, tone = 'blue', size = 'sm', className }: { icon: LucideIcon; tone?: Tone; size?: 'xs' | 'sm' | 'md'; className?: string }) {
  return (
    <span className={cn('tile', `tile-${tone}`, size === 'xs' ? 'tile-xs' : size === 'sm' ? 'tile-sm' : '', className)} aria-hidden>
      <Icon size={size === 'xs' ? 14 : size === 'sm' ? 16 : 18} />
    </span>
  )
}

/** Chiavi GS1 dell'encoder (id di KEY_TYPES). */
export const KEY_ICONS: Record<string, LucideIcon> = {
  sgtin: Package,
  sscc: Container,
  sgln: MapPin,
  grai: Recycle,
  giai: Wrench,
  gsrn: UserRound,
  gsrnp: Stethoscope,
  gdti: FileText,
  sgcn: Ticket,
  cpi: Cog,
  itip: Puzzle,
}
export const keyIcon = (id?: string | null) => (id && KEY_ICONS[id]) || Package

/** Application Identifier: icona e categoria di colore. */
const AI_ICONS: Record<string, [LucideIcon, Tone]> = {
  '00': [Container, 'blue'],
  '01': [Barcode, 'blue'],
  '21': [Fingerprint, 'blue'],
  '10': [Tag, 'blue'],
  '11': [Factory, 'orange'],
  '13': [PackageCheck, 'orange'],
  '15': [CalendarClock, 'orange'],
  '16': [CalendarCheck, 'orange'],
  '17': [CalendarX2, 'orange'],
  '7003': [Clock, 'orange'],
  '7006': [Snowflake, 'orange'],
  '7007': [Wheat, 'orange'],
  '3103': [Weight, 'teal'],
  '422': [Globe, 'teal'],
  '414': [MapPin, 'blue'],
  '254': [MapPinPlus, 'blue'],
  '253': [FileText, 'blue'],
  '255': [Ticket, 'blue'],
  '8003': [Recycle, 'blue'],
  '8004': [Wrench, 'blue'],
  '8006': [Puzzle, 'blue'],
  '8010': [Cog, 'blue'],
  '8011': [Hash, 'blue'],
  '8017': [UserRound, 'blue'],
  '8018': [UserRound, 'blue'],
}
export const aiIcon = (ai: string): [LucideIcon, Tone] => AI_ICONS[ai] ?? [/^3\d{3}$/.test(ai) ? Weight : Tag, 'gray']
export function AiIcon({ ai, size = 'sm' }: { ai: string; size?: 'xs' | 'sm' | 'md' }) {
  const [icon, tone] = aiIcon(ai)
  return <ConceptIcon icon={icon} tone={tone} size={size} />
}
export const OtherIcon = Ellipsis

/** Filter value degli SGTIN (TDS): cosa rappresenta il tag. */
const SGTIN_FILTER_ICONS: LucideIcon[] = [Shapes, ShoppingCart, Package, Lock, PackageOpen, Lock, Forklift, Component]
export const filterIcon = (family: string, value: number): LucideIcon => (family === 'sgtin' ? (SGTIN_FILTER_ICONS[value] ?? Shapes) : value === 0 ? Shapes : Boxes)

/** Tipi di schema EPC: TDS 1.x (solo binario), + (con dati aggiuntivi), ++ (con il dominio del Digital Link). */
export const KIND_ICONS: Record<'legacy' | 'plus' | 'plusplus', [LucideIcon, Tone]> = {
  legacy: [Binary, 'gray'],
  plus: [Database, 'teal'],
  plusplus: [Globe, 'forest'],
}
export const NotApplicable = Ban

/** Simbologie dei data carrier (id di CARRIERS). */
export const CARRIER_ICONS: Record<string, [LucideIcon, Tone]> = {
  ean13: [Barcode, 'blue'],
  ean8: [Barcode, 'blue'],
  'gs1-128': [Barcode, 'blue'],
  databar: [Barcode, 'blue'],
  gs1datamatrix: [Grid3x3, 'blue'],
  gs1qrcode: [QrCode, 'blue'],
  dlqr: [QrCode, 'forest'],
  dldm: [Grid3x3, 'forest'],
}

/** Numero in un riquadro (lunghezze, cifre). */
export function NumberIcon({ n, tone = 'blue' }: { n: number | string; tone?: Tone }): ReactNode {
  return (
    <span className={`tile tile-sm tile-${tone} font-mono text-[12px] font-semibold`} aria-hidden>
      {n}
    </span>
  )
}
