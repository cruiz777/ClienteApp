export function extraerSerialDinamico(sscc: string, prefijo: string): number | null {
  if (!sscc || sscc.length !== 18 || !prefijo) return null;

  // Longitud del prefijo puede ser 5,6,7 u 8
  const prefijoLength = prefijo.length;

  // Extensión (1) + Código país (3) = 4
  const inicioSerial = 4 + prefijoLength;
  const finSerial = 17; // sin incluir el dígito verificador

  const serialStr = sscc.substring(inicioSerial, finSerial);
  return parseInt(serialStr);
}