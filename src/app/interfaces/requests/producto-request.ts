
export type SN = 'S' | 'N';

export interface ProductoRequest {
  idproducto?: number;

  // Identificación / descripciones
  codpro?: string;
  despro?: string;
  despro2?: string;
  codbar?: string;
  uniman?: string;
  abrevia?: string;
  referencia?: string;
  clasprod?: string;
  foto?: string;

  // Clasificaciones (opcional)
  tippro?: string;     // 1 char en BD
  codgru?: number;
  codsec?: number;
  coddep?: number;
  codsub?: number;
  coddiv?: number;
  codmar?: number;

  // Fechas
  feccre?: string;     // ISO
  fechamod?: string;   // ISO

  // Atributos adicionales
  colsab?: string;
  talla?: string;
  obs?: string;
  regsanitario?: string;

  // Cuentas contables
  codcuedeb?: string;
  codcuehab?: string;
  codcuedes?: string;
  codcuedev?: string;
  ctaprodgasto?: string;

  // Precios / costos
  preven?: number;
  preven2?: number;
  precos?: number;
  cospro?: number;
  pvpsiniva?: number;
  preanterior?: number;
  cosanterior?: number;
  preuni?: string;     // precio compra actual (string en back)
  margenutilidad?: number;
  porcenrecepcion?: number;
  feccosact?: string;  // ISO (fecha anterior modificar precio)
  fecpreact?: string;  // ISO (fecha anterior modificar compra)
  fecpremod?: string;  // ISO (fecha mod PVP)

  // Existencias / ubicación (si los usaras)
  exiqty?: number;
  exipdc?: number;
  exipdv?: number;
  exisic?: number;
  fecsic?: string;     // ISO
  stockmax?: number;
  stockmin?: number;
  espesor?: number;
  largo?: number;
  ancho?: number;
  codubi?: string;
  codniv?: string;
  codcolubi?: string;

  // Flags
  inv?: boolean;
  pagaiva?: boolean;
  pagaregalia?: boolean;
  peso?: boolean;
  receta?: boolean;
  activo?: boolean;
  altoriesgo?: boolean;
  stocks?: boolean;
  cantdecimal?: boolean;
  pgasto?: boolean;

  // Otros (menores)
  iva?: SN | string;
  tipo?: string;       // 1 char
  regalia?: SN | string;
  valorunidad?: number;
  codsab?: string;
  tamanio?: string;
  modelo?: string;
  numserie?: string;
  coleccion?: string;
  temporada?: string;
  prepormayor?: number;
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
  fecfinpro1?: string;
  fechacad?: string;
  fechacad1?: number;
  fabricante?: number;
  fecing?: string;
  margenantes?: number;
  fecmarantes?: string;
  costsuminis?: number;
  cantconv?: number;
  costhelado?: number;
  prevensiniva?: number; 
  // Empresa
  idempresa?: number;

  idcolor?: number | null;
  idsabor?: number | null;
  idfabricante?: number | null;
  idpresentacion?: number | null;
  cantidad?: number | null;
  productoventa?: boolean;
  consumointerno?: boolean;
  psicotropico?: boolean;
  estupefaciente?: boolean;
  // Referencia binaria (si la usas como base64, déjala string/null)
  refer?: string | null;
}

/** Sanitizador simple (corta campos de 1 char y normaliza refer). */
export function sanitizeProductoPayload(p: ProductoRequest): ProductoRequest {
  const c = { ...p };
  if (typeof c.tipo === 'string') c.tipo = c.tipo.trim().slice(0, 1);
  if (typeof c.iva === 'string')  c.iva  = c.iva.trim().slice(0, 1);
  if (typeof c.regalia === 'string') c.regalia = c.regalia.trim().slice(0, 1);
  if ((c as any).refer === '') c.refer = null;
  return c;
}
