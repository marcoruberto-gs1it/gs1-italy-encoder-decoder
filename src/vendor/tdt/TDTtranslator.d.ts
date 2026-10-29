export type Detection = {
  scheme: string
  level: string
  optionKey: { property: string; value: string }
  supportedLevels: string[]
  detectedGCPLength: number
}

export type SchemeDefinition = Record<string, any>

export default class TDTtranslator {
  constructor(config?: { schemasUrl?: string; gcpLengthsUrl?: string | null })
  initialized: Promise<TDTtranslator>
  tdtData: { scheme: Record<string, SchemeDefinition>; table: Record<string, Record<string, Record<string, string>>> }
  autodetect(input: string): Detection[]
  translate(input: string, scheme: string, outputLevel: string, options?: Record<string, unknown>): any
  gcpLengthFor(digits: string): number
  schemes(): string[]
  bin2hex(bin: string): string
  hex2bin(hex: string): string
  static internalHostname2Binary(hostname: string): string
  static toBinaryUsingTableF(value: string, options: Record<string, unknown>): { binary: string }
}
