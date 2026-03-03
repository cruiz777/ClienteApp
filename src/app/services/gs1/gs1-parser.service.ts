import { Injectable } from '@angular/core';

export interface AiSpec {
  ai: string;              // '01', '17', '10', etc.
  fixedLength?: number;    // si es fijo
  variable?: boolean;      // si es variable
  name?: string;           // nombre amigable opcional
  formatter?: (raw: string) => any; // formateo opcional
}

export interface Gs1Parsed {
  raw: string;
  normalized: string;
  ais: Record<string, string>;
  fields: {
    gtin?: string;
    lote?: string;
    serie?: string;
    fechaProduccion?: string | null;
    fechaCaducidad?: string | null;
  };
}

@Injectable({ providedIn: 'root' })
export class Gs1ParserService {

  /**
   * “Base” de AIs. Esto NO está hardcodeado en la lógica, es data-driven.
   * Puedes extenderlo sin tocar el parser.
   */
  private readonly aiSpecs: AiSpec[] = [
    { ai: '00', fixedLength: 18, name: 'sscc' },
    { ai: '01', fixedLength: 14, name: 'gtin' },
    { ai: '10', variable: true,  name: 'lote' },
    { ai: '11', fixedLength: 6,  name: 'fecha_produccion', formatter: (v) => this.formatDateYYMMDD(v) },
    { ai: '17', fixedLength: 6,  name: 'fecha_caducidad',  formatter: (v) => this.formatDateYYMMDD(v) },
    { ai: '21', variable: true,  name: 'serie' },

    // Si luego necesitas 310x (peso), 37 (cantidad), 240, 241, 242, etc., solo agrega aquí.
  ];

  private readonly aiIndex = new Map<string, AiSpec>();

  constructor() {
    this.aiSpecs.forEach(s => this.aiIndex.set(s.ai, s));
  }

  /** Permite extender AIs sin tocar la clase (ej: desde un config o módulo) */
  registerAi(spec: AiSpec): void {
    this.aiIndex.set(spec.ai, spec);
  }

  parse(raw: string): Gs1Parsed {
    const normalized = this.normalize(raw);
    const ais: Record<string, string> = {};

    let i = 0;

    while (i < normalized.length) {
      const ai = this.readAi(normalized, i);
      if (!ai) break;

      const spec = this.aiIndex.get(ai);
      if (!spec) break;

      i += ai.length;

      if (spec.variable) {
        const { value, nextPos } = this.readVariableValue(normalized, i);
        ais[ai] = value;
        i = nextPos;
      } else if (spec.fixedLength) {
        const value = normalized.substring(i, i + spec.fixedLength);
        if (value.length < spec.fixedLength) break; // truncado/inválido
        ais[ai] = value;
        i += spec.fixedLength;
      } else {
        // AI definido sin longitud => no parseable
        break;
      }

      // Si hay separadores FNC1, saltarlos
      while (i < normalized.length && this.isFnc1(normalized.charAt(i))) i++;
    }

    return {
      raw,
      normalized,
      ais,
      fields: this.mapToFields(ais)
    };
  }

  // -------------------- Internals --------------------

  /** Limpia ]d2, separadores, paréntesis (01) y normaliza FNC1 */
  private normalize(raw: string): string {
    let s = (raw ?? '').trim();

    // Remover Symbology Identifier: ]d2, ]C1, etc.
    if (s.startsWith(']') && s.length >= 3) s = s.substring(3);

    // Algunos lectores entregan AIs con paréntesis: (01)...
    s = s.replace(/[()]/g, '');

    // FNC1 puede venir como ASCII 29 (GS), o como '&' por configuración de lector
    // También a veces aparece como el carácter visible ''
    s = s.replace(/&/g, '\x1D');

    // Dejar solo imprimibles + GS
    // (No eliminamos \x1D porque lo necesitamos como delimitador)
    return s;
  }

  /** Lee AI de 2 a 4 dígitos (prioriza el más largo) */
  private readAi(s: string, pos: number): string | null {
    // AI son numéricos. Probamos 4,3,2
    for (const len of [4, 3, 2]) {
      if (pos + len > s.length) continue;
      const candidate = s.substring(pos, pos + len);
      if (!/^\d+$/.test(candidate)) continue;
      if (this.aiIndex.has(candidate)) return candidate;
    }
    return null;
  }

  /** Lee valor variable hasta FNC1 o hasta que detecte un AI válido (fallback cuando no hay FNC1). */
/** Lee valor variable hasta FNC1 o hasta que detecte un AI válido (fallback cuando no hay FNC1). */
private readVariableValue(s: string, pos: number): { value: string; nextPos: number } {
  let out = '';
  let i = pos;

  while (i < s.length) {
    const ch = s.charAt(i);

    // delimitador FNC1
    if (this.isFnc1(ch)) break;

    // ✅ IMPORTANTE:
    // Solo intentamos “cortar por AI” si YA leímos algo del valor,
    // para no confundir valores que empiezan con '00', '01', '17', etc.
    if (out.length > 0) {
      const possibleAi = this.readAi(s, i);
      if (possibleAi) {
        const spec = this.aiIndex.get(possibleAi);

        // Si es de longitud fija, solo cortamos si hay suficiente data para que sea válido
        if (spec?.fixedLength) {
          if (i + possibleAi.length + spec.fixedLength <= s.length) break;
        } else {
          // variable: aceptamos el corte (best-effort)
          break;
        }
      }
    }

    out += ch;
    i++;
  }

  return { value: out, nextPos: i };
}


  private isFnc1(ch: string): boolean {
    return ch === '\x1D'; // ASCII 29 (Group Separator)
  }

  private mapToFields(ais: Record<string, string>) {
    const f11 = ais['11'] ? this.formatDateYYMMDD(ais['11']) : null;
    const f17 = ais['17'] ? this.formatDateYYMMDD(ais['17']) : null;

    return {
      gtin: ais['01'],
      lote: ais['10'],
      serie: ais['21'],
      fechaProduccion: f11,
      fechaCaducidad: f17
    };
  }

  /**
   * YYMMDD => YYYY-MM-DD
   * Nota GS1: DD puede venir '00' indicando “último día del mes”.
   */
  private formatDateYYMMDD(v: string): string | null {
    if (!/^\d{6}$/.test(v)) return null;

    const yy = Number(v.slice(0, 2));
    const mm = Number(v.slice(2, 4));
    const dd = Number(v.slice(4, 6));

    const year = 2000 + yy;

    if (mm < 1 || mm > 12) return null;

    if (dd === 0) {
      // último día del mes
      const last = new Date(year, mm, 0); // mm (1..12) => Date usa monthIndex, pero aquí mm es 1-based y day=0 => último día del mes anterior => correcto
      const m = String(mm).padStart(2, '0');
      const d = String(last.getDate()).padStart(2, '0');
      return `${year}-${m}-${d}`;
    }

    const m = String(mm).padStart(2, '0');
    const d = String(dd).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }
}
