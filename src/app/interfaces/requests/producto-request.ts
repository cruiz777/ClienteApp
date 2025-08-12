
export type SN = 'S' | 'N'; // utilitario para campos de 1 carácter (sí/no)

export interface ProductoRequest {
  idproducto?: number;
  codpro?: string;
  despro?: string;
  tippro?: string;
  codgru?: number;
  codsec?: number;
  coddep?: number;
  codsub?: number;
  coddiv?: number;
  codmar?: number;
  despro2?: string;
  uniman?: string;
  feccre?: string;
  colsab?: string;
  talla?: string;
  preven?: number;
  preven2?: number;
  precos?: number;
  cospro?: number;
  exiqty?: number;
  exipdc?: number;
  exipdv?: number;
  exisic?: number;
  fecsic?: string;
  refer?: string | null;     // Base64 o null
  codcuedeb?: string;
  codcuehab?: string;
  codcuedes?: string;
  codcuedev?: string;
  iva?: SN | string;         // usualmente 'S' | 'N'
  tipo?: string;             // en BD es 1 char
  preuni?: string;
  regalia?: SN | string;     // usualmente 'S' | 'N'
  inv?: boolean;
  prevensiniva?: number;
  pagaiva?: boolean;
  pagaregalia?: boolean;
  desind?: string;
  codorigen?: string;
  codcol?: number;
  stockmax?: number;
  stockmin?: number;
  espesor?: number;
  largo?: number;
  ancho?: number;
  fechacad?: string;
  fechacad1?: number;
  fabricante?: number;
  obs?: string;
  peso?: boolean;
  fecing?: string;
  valorunidad?: number;
  codsab?: string;
  fechamod?: string;
  tamanio?: string;
  modelo?: string;
  numserie?: string;
  coleccion?: string;
  temporada?: string;
  prepormayor?: number;
  preanterior?: number;
  cosanterior?: number;
  desccosto1?: number;
  desccosto2?: number;
  desccosto3?: number;
  desccosto4?: number;
  descuento?: number;
  prerebaja?: number;
  prerebajaantes?: number;
  fecinipro?: string;
  fecfinpro?: string;
  fecinipro1?: string;
  codubi?: string;
  fecfinpro1?: string;
  fecpreact?: string;
  fecpremod?: string;
  feccosact?: string;
  feccosmod?: string;
  codniv?: string;
  codcolubi?: string;
  margenutilidad?: number;
  pvpsiniva?: number;
  porcenrecepcion?: number;
  stocks?: boolean;
  abrevia?: string;
  referencia?: string;
  margenantes?: number;
  fecmarantes?: string;
  cantdecimal?: boolean;
  costsuminis?: number;
  cantconv?: number;
  costhelado?: number;
  receta?: boolean;
  activo?: boolean;
  clasprod?: string;
  foto?: string;
  altoriesgo?: boolean;
  pgasto?: boolean;
  ctaprodgasto?: string;
  regsanitario?: string;
  idempresa?: number;
  codbar?: string;
}

/** Sanitizador simple para evitar truncamientos de 1 carácter y normalizar `refer`. */
export function sanitizeProductoPayload(p: ProductoRequest): ProductoRequest {
  const cpy: ProductoRequest = { ...p };
  if (typeof cpy.tipo === 'string') cpy.tipo = cpy.tipo.trim().slice(0, 1);
  if (typeof cpy.iva === 'string') cpy.iva = cpy.iva.trim().slice(0, 1);
  if (typeof cpy.regalia === 'string') cpy.regalia = cpy.regalia.trim().slice(0, 1);
  if ((cpy as any).refer === '') cpy.refer = null;
  return cpy;
}
