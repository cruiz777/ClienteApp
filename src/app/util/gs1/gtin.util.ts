export type GtinType = 'GTIN-8' | 'GTIN-12' | 'GTIN-13' | 'GTIN-14';

export function normalizeGtin(input: string): { gtin: string; type: GtinType } | null {
  const digits = (input ?? '').replace(/\D/g, '');
  if (![8, 12, 13, 14].includes(digits.length)) return null;

  // Para normalizar internamente, puedes manejar GTIN-14 (padding),
  // pero en GS1 AI (01) ya llega como 14 dígitos.
  const type: GtinType =
    digits.length === 8 ? 'GTIN-8' :
    digits.length === 12 ? 'GTIN-12' :
    digits.length === 13 ? 'GTIN-13' : 'GTIN-14';

  return { gtin: digits, type };
}

export function isValidGtin(input: string): boolean {
  const norm = normalizeGtin(input);
  if (!norm) return false;

  const gtin = norm.gtin;
  const body = gtin.slice(0, -1);
  const check = Number(gtin.slice(-1));

  // Algoritmo GS1 (módulo 10): pesos alternos 3/1 desde la derecha (sin check digit)
  let sum = 0;
  let weight = 3;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * weight;
    weight = (weight === 3) ? 1 : 3;
  }

  const calc = (10 - (sum % 10)) % 10;
  return calc === check;
}
