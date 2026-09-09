// producto-response.ts
export interface ProductoResponse {
  // IDs (alias para compatibilidad)
  idproducto?: number;
  id_producto?: number;

  codpro?: string;
  despro?: string;
  tippro?: string;

  codgru?: number | null;
  codsec?: number | null;
  coddep?: number | null;
  codsub?: number | null;
  coddiv?: number | null;
  codmar?: number | null;

  despro2?: string | null;
  uniman?: string | null;
  feccre?: string | null; // Date ISO string
  colsab?: string | null;
  talla?: string | null;

  preven?: number | null;
  preven2?: number | null;
  precos?: number | null;
  cospro?: number | null;

  exiqty?: number | null;
  exipdc?: number | null;
  exipdv?: number | null;
  exisic?: number | null;
  fecsic?: string | null; // Date ISO string

  // cuentas/contables (si las usas)
  codcuedeb?: string | null;
  codcuehab?: string | null;
  codcuedes?: string | null;
  codcuedev?: string | null;

  iva?: string | null;
  tipo?: string | null;
  preuni?: string | null;
  regalia?: string | null;

  inv?: boolean | null;
  prevensiniva?: number | null;
  pagaiva?: boolean | null;
  pagaregalia?: boolean | null;

  desind?: string | null;
  codorigen?: string | null;
  codcol?: number | null;

  stockmax?: number | null;
  stockmin?: number | null;

  espesor?: number | null;
  largo?: number | null;
  ancho?: number | null;

  fechacad?: string | null; // puede venir como string
  fechacad1?: number | null;

  fabricante?: number | null;
  obs?: string | null;
  peso?: boolean | null;

  fecing?: string | null; // Date ISO string
  valorunidad?: number | null;
  codsab?: string | null;

  fechamod?: string | null; // Date ISO string
  tamanio?: string | null;
  modelo?: string | null;
  numserie?: string | null;
  coleccion?: string | null;
  temporada?: string | null;

  prepormayor?: number | null;
  preanterior?: number | null;
  cosanterior?: number | null;

  desccosto1?: number | null;
  desccosto2?: number | null;
  desccosto3?: number | null;
  desccosto4?: number | null;

  descuento?: number | null;
  prerebaja?: number | null;
  prerebajaantes?: number | null;

  fecinipro?: string | null;
  fecfinpro?: string | null;
  fecinipro1?: string | null;
  fecfinpro1?: string | null;

  codubi?: string | null;

  fecpreact?: string | null;
  fecpremod?: string | null;
  feccosact?: string | null;
  feccosmod?: string | null;

  codniv?: string | null;
  codcolubi?: string | null;

  margenutilidad?: number | null;
  pvpsiniva?: number | null;
  porcenrecepcion?: number | null;

  stocks?: boolean | null;
  abrevia?: string | null;
  referencia?: string | null;

  margenantes?: number | null;
  fecmarantes?: string | null; // Date ISO string

  cantdecimal?: boolean | null;
  costsuminis?: number | null;
  cantconv?: number | null;
  costhelado?: number | null;

  receta?: boolean | null;
  activo?: boolean | null;

  clasprod?: string | null;
  foto?: string | null;
  altoriesgo?: boolean | null;
  pgasto?: boolean | null;
  ctaprodgasto?: string | null;

  regsanitario?: string | null;

  // Empresa (alias para compatibilidad)
  idempresa?: number | null;
  id_empresa?: number | null;
  // Nuevas FK a catálogos
  idcolor?: number | null;
  idsabor?: number | null;
  idfabricante?: number | null;
  idpresentacion?: number | null;

  // Nuevos campos del TAB 1
  cantidad?: number | null;
  productoventa?: boolean | null;
  consumointerno?: boolean | null;
  psicotropico?: boolean | null;
  estupefaciente?: boolean | null;
  codbar?: string | null;

  // Si tu API también devuelve idIva, puedes incluirlo:
  idiva?: number | null;
}
