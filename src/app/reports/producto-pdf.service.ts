// src/app/reports/producto-pdf.service.ts
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LogoService } from '../services/logo.service';
import { EmpresaService } from '../services/empresa.service';

// ================== Interfaces base ==================
export interface ProductoPDF {
  codigoInterno: string;
  codigoBarras: string;
  descripcion1: string;
  descripcionPOS?: string;
  unidadVenta: string;
  unidadVentaDescripcion?: string;
  marca?: string;
  presentacion?: string;
  unidadMedida?: string;

  precioSinIVA?: number;
  precioConIVA?: number;
  precioCompra?: number;
  utilidad?: number;
  descuento?: number;

  aplicaIVA?: boolean;
  aplicaICE?: boolean;
  porcentajeIVA?: number;
  porcentajeICE?: number;

  categoria?: string;
  subcategoria?: string;
  grupo?: string;

  controlaStock?: boolean;
  controlaLote?: boolean;
  controlaFechaVencimiento?: boolean;
  diasAlertaVencimiento?: number;

  bodegas?: BodegaPDF[];
  proveedores?: ProveedorPDF[];

  observaciones?: string;
  estado?: string;
  fechaCreacion?: string;
  ultimaModificacion?: string;
}

export interface BodegaPDF {
  nombreBodega: string;
  existencia: number;
  stockMin?: number | null;
  stockMax?: number | null;
  alertaStock?: boolean;
}

export interface ProveedorPDF {
  nombreProveedor: string;
  codigoProveedor?: string;
  precioCompra?: number;
  descuento?: number;
  plazoEntrega?: number;
  productoProveedor?: string;
}

export interface ConfiguracionPDF {
  nombreEmpresa?: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  sitioWeb?: string;

  titulo?: string;
  subtitulo?: string;
  mostrarFechaHora?: boolean;
  mostrarUsuario?: string;

  mostrarDatosGenerales?: boolean;
  mostrarPrecios?: boolean;
  mostrarBodegas?: boolean;
  mostrarProveedores?: boolean;
  mostrarObservaciones?: boolean;

  colorPrimario?: string;   // títulos, separadores
  colorSecundario?: string; // cabeceras tabla
  tipoPlantilla?: 'completa' | 'resumida' | 'etiqueta' | 'catalogo';

  textoPiePagina?: string;
  mostrarNumeroPagina?: boolean;
}

// ============= Datos extra (tabs) resumidos =============
export interface ProductoExtraTabs {
  // Datos Generales extra
  cantidad?: number;
  tipoProducto?: string;
  existenciaGlobal?: number;
  canCov?: number;
  abreviacion?: string;
  referencia?: string;
  fechaCreacion?: string;
  fechaModificacion?: string;

  pagaIva?: boolean;
  productoEnVenta?: boolean;
  cargarInventarios?: boolean;
  productoConPeso?: boolean;
  consumoInterno?: boolean;
  manejaDecimales?: boolean;
  psicotropico?: boolean;
  estupefaciente?: boolean;
  activo?: boolean;
  altoRiesgo?: boolean;

  urlFoto?: string;

  // Datos Adicionales
  color?: string;
  sabor?: string;
  fabricante?: string;
  tamanoTalla1?: string;
  medida1?: string;
  medida2?: string;
  medida3?: string;
  observacion?: string;
  registroSanitario?: string;

  // Cuentas contables
  ctaVentas?: string;
  ctaInventarios?: string;
  ctaCostos?: string;
  ctaDevolucion?: string;
  productoGasto?: boolean;
  ctaGastos?: string;

  // Ubicaciones
  ubicaciones?: Array<{
    nombreLocal: string;
    codigoArea?: string | null;
    codigoColumna?: string | null;
    codigoNivel?: string | null;
  }>;

  // Estructura
  estructura?: {
    nombre_division?: string;
    nombre_subdivision?: string;
    nombre_departamento?: string;
    nombre_seccion?: string;
    nombre_grupo?: string;
  };

  // Precios / Costos
  precios?: {
    precioOficial?: number;
    precioRedMsp?: number;
    pvpActualIva?: number;

    pvpAnteriorMasIva?: number;
    fechaAnteriorModificarPrecio?: string;

    pvpActualMasIva?: number;
    fechaModificarPrecio?: string;

    margenUtilidad?: number;

    costoSuministro?: number;
    costoProducto?: number;
    costoPromedio?: number;

    precioCompraAnterior?: number;
    fechaAnteriorModificarCompra?: string;

    precioCompraActual?: number;
    fechaModificarCompra?: string;

    recepcionPorcentaje?: number;
  };
}

// =============== pdfmake ===============
const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts;

@Injectable({ providedIn: 'root' })
export class ProductoPDFService {
  private readonly configDefault: ConfiguracionPDF = {
    nombreEmpresa: 'Mi Empresa',
    titulo: 'Ficha Técnica de Producto',
    mostrarFechaHora: true,
    mostrarDatosGenerales: true,
    mostrarPrecios: true,
    mostrarBodegas: true,
    mostrarProveedores: true,
    mostrarObservaciones: true,
    colorPrimario: '#1f2937',   // gris oscuro
    colorSecundario: '#e5e7eb', // gris claro
    tipoPlantilla: 'completa',
    mostrarNumeroPagina: true
  };

  constructor(
    private logoService: LogoService,
    private empresaService: EmpresaService
  ) {}

  async obtenerConfiguracionEmpresa(idEmpresa: number): Promise<Partial<ConfiguracionPDF>> {
    try {
      const empresa = await firstValueFrom(this.empresaService.getEmpresaById(idEmpresa));
      return {
        nombreEmpresa: empresa.empresaNombre || 'Mi Empresa',
        direccion: empresa.empresaDireccion || '',
        telefono: empresa.empresaTelefono1 || '',
        email: empresa.empresaEmail || ''
      };
    } catch {
      return {};
    }
  }

  // ===================== PÚBLICO: genera PDF como Blob =====================
  async generarPDFBlob(
    producto: ProductoPDF,
    config?: ConfiguracionPDF,
    extras?: ProductoExtraTabs
  ): Promise<Blob> {
    const cfg = { ...this.configDefault, ...config };

    // Logo desde el servicio (parametrizado)
    const logoUrl = await firstValueFrom(this.logoService.logoUrl$).catch(() => null);
    const logoDataUrl = logoUrl ? await this.toDataUrlSafe(logoUrl) : null;

    const docDefinition = this.buildDocDefinition(producto, cfg, extras || {}, logoDataUrl);

    return new Promise<Blob>((resolve, reject) => {
      try {
        pdfMake.createPdf(docDefinition).getBlob((b: Blob) => resolve(b));
      } catch (e) {
        reject(e);
      }
    });
  }

  // ===================== Helpers =====================
  private async toDataUrlSafe(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      return await new Promise<string>((ok, ko) => {
        const r = new FileReader();
        r.onload = () => ok(r.result as string);
        r.onerror = () => ko(null as unknown as string);
        r.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private hr(color?: string, margin: number[] = [0, 8, 0, 8]) {
    return {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: color ?? '#e5e7eb' }],
      margin
    };
  }

  private h2(text: string, color?: string) {
    return { text, style: 'h2', color: color ?? '#1f2937', margin: [0, 8, 0, 4] };
  }

  /** Celda apilada Label+Value (para tablas de 4 columnas) */
  private kv(label: string, value: any) {
    return {
      stack: [
        { text: label, style: 'kvLabel' },
        { text: (value ?? '-') + '', style: 'kvValue' }
      ]
    };
  }

  /** Par (label,value) en 2 columnas (para tablas de 2 columnas) */
  private kvPair(label: string, value: any) {
    return [
      { text: label, style: 'kvLabel' },
      { text: (value ?? '-') + '', style: 'kvValue' }
    ];
  }

  /** Fila de 4 celdas (cada celda = label+value apilado) */
  private kvRow(a: [string, any], b: [string, any], c: [string, any], d: [string, any]) {
    return [ this.kv(a[0], a[1]), this.kv(b[0], b[1]), this.kv(c[0], c[1]), this.kv(d[0], d[1]) ];
  }

  private money(n?: number) { return (n ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  private num(n?: number) { return (n ?? 0).toLocaleString('es-EC'); }
  private yesNo(v?: boolean) { return v ? 'Sí' : 'No'; }

  private tableLayout(headerFill?: string) {
    const fill = headerFill ?? '#e5e7eb';
    return {
      fillColor: (rowIndex: number) => (rowIndex === 0 ? fill : null),
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#e5e7eb',
      vLineColor: () => '#e5e7eb'
    };
  }

  // ===================== DocDefinition =====================
  private buildDocDefinition(
    p: ProductoPDF,
    cfg: ConfiguracionPDF,
    x: ProductoExtraTabs,
    logoDataUrl: string | null
  ): any {

    const fechaTxt = new Date().toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });

    // --- Cabecera empresa
    const header = [
      {
        columns: [
          logoDataUrl ? { image: logoDataUrl, fit: [120, 60] } : { text: '' },
          [
            { text: cfg.nombreEmpresa || 'Mi Empresa', style: 'h1', alignment: 'right', color: cfg.colorPrimario ?? '#1f2937' },
            { text: cfg.direccion || '', style: 'small', alignment: 'right' },
            { text: `${cfg.telefono || ''}${cfg.email ? ' · ' + cfg.email : ''}`, style: 'small', alignment: 'right' }
          ]
        ]
      },
      this.hr(cfg.colorPrimario, [0, 10, 0, 16]),
      { text: cfg.titulo || 'Ficha Técnica de Producto', style: 'title' },
      cfg.subtitulo ? { text: cfg.subtitulo, style: 'small', margin: [0, 0, 0, 2] } : null,
      cfg.mostrarFechaHora ? { text: fechaTxt, style: 'small', color: '#6b7280' } : null,
      this.hr()
    ].filter(Boolean);

    // --- Identificación (2 tablas / 2 columnas)
    const seccionIdent = [
      this.h2('Identificación', cfg.colorPrimario),
      {
        columns: [
          {
            width: '50%',
            table: {
              widths: ['40%', '*'],
              body: [
                this.kvPair('Código Interno', p.codigoInterno),
                this.kvPair('Código de Barras', p.codigoBarras),
                this.kvPair('Descripción', p.descripcion1),
                this.kvPair('Descripción POS', p.descripcionPOS),
                this.kvPair('Unidad de Venta', p.unidadVentaDescripcion || p.unidadVenta),
                this.kvPair('Marca', p.marca),
                this.kvPair('Presentación', p.presentacion),
                this.kvPair('Unidad Medida', p.unidadMedida)
              ]
            },
            layout: 'lightHorizontalLines'
          },
          {
            width: '50%',
            table: {
              widths: ['55%', '*'],
              body: [
                this.kvPair('Cantidad', x.cantidad),
                this.kvPair('Tipo Producto', x.tipoProducto),
                this.kvPair('Existencia Global', x.existenciaGlobal),
                this.kvPair('Cant. Conversión', x.canCov),
                this.kvPair('Abreviación', x.abreviacion),
                this.kvPair('Referencia', x.referencia),
                this.kvPair('Fecha Creación', x.fechaCreacion || p.fechaCreacion),
                this.kvPair('Últ. Modificación', x.fechaModificacion || p.ultimaModificacion)
              ]
            },
            layout: 'lightHorizontalLines'
          }
        ],
        columnGap: 12
      }
    ];

    // --- Opciones (4 columnas, celdas apiladas)
    const seccionOpc = [
      this.h2('Opciones', cfg.colorPrimario),
      {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [
            [
              this.kv('Paga IVA', this.yesNo(x.pagaIva ?? p.aplicaIVA)),
              this.kv('Producto en Venta', this.yesNo(x.productoEnVenta)),
              this.kv('Cargar a Inventarios', this.yesNo(x.cargarInventarios ?? p.controlaStock)),
              this.kv('Producto con Peso', this.yesNo(x.productoConPeso))
            ],
            [
              this.kv('Consumo Interno', this.yesNo(x.consumoInterno)),
              this.kv('Cant. con Decimales', this.yesNo(x.manejaDecimales)),
              this.kv('Psicotrópico', this.yesNo(x.psicotropico)),
              this.kv('Estupefaciente', this.yesNo(x.estupefaciente))
            ],
            [
              this.kv('Activo', this.yesNo(x.activo ?? (p.estado ? p.estado === 'Activo' : undefined))),
              this.kv('Alto Riesgo', this.yesNo(x.altoRiesgo)),
              this.kv('Controla Lote', this.yesNo(p.controlaLote)),
              this.kv('Controla Vencimiento', this.yesNo(p.controlaFechaVencimiento))
            ]
          ]
        },
        layout: 'lightHorizontalLines'
      }
    ];

    // --- Clasificación / Estructura
    const seccionClasif = [
      this.h2('Clasificación / Estructura Comercial', cfg.colorPrimario),
      {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [
            this.kvRow(['Categoría', p.categoria], ['Subcategoría', p.subcategoria], ['Grupo', p.grupo], ['Unidad Medida', p.unidadMedida]),
            this.kvRow(['División', x.estructura?.nombre_division], ['Subdivisión', x.estructura?.nombre_subdivision], ['Departamento', x.estructura?.nombre_departamento], ['Sección', x.estructura?.nombre_seccion]),
            this.kvRow(['Grupo (Estruct.)', x.estructura?.nombre_grupo], ['', ''], ['', ''], ['', ''])
          ]
        },
        layout: 'lightHorizontalLines'
      }
    ];

    // --- Precios & Impuestos + Costos
    const pr = x.precios || {};
    const seccionPrecios = [
      this.h2('Precios e Impuestos', cfg.colorPrimario),
      {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [
            this.kvRow(
              ['Precio Oficial', `$ ${this.money(pr.precioOficial)}`],
              ['Precio RED-MSP', `$ ${this.money(pr.precioRedMsp)}`],
              ['PVP Actual - IVA', `$ ${this.money(pr.pvpActualIva)}`],
              ['Margen Utilidad %', `${(pr.margenUtilidad ?? p.utilidad ?? 0)} %`]
            ),
            this.kvRow(
              ['PVP Anterior + IVA', `$ ${this.money(pr.pvpAnteriorMasIva)}`],
              ['Fecha Ant. Mod.', pr.fechaAnteriorModificarPrecio],
              ['PVP Actual + IVA', `$ ${this.money(pr.pvpActualMasIva)}`],
              ['Fecha Mod.', pr.fechaModificarPrecio]
            ),
            this.kvRow(
              ['Aplica IVA', `${this.yesNo(p.aplicaIVA)} ${p.aplicaIVA ? `(${p.porcentajeIVA ?? 15}%)` : ''}`],
              ['Aplica ICE', `${this.yesNo(p.aplicaICE)} ${p.aplicaICE ? `(${p.porcentajeICE ?? 0}%)` : ''}`],
              ['Precio Compra Actual', `$ ${this.money(pr.precioCompraActual ?? p.precioCompra)}`],
              ['Recepción %', `${pr.recepcionPorcentaje ?? 0} %`]
            )
          ]
        },
        layout: 'lightHorizontalLines'
      },
      this.h2('Costos', cfg.colorPrimario),
      {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [
            this.kvRow(
              ['Costo Suministro', `$ ${this.money(pr.costoSuministro)}`],
              ['Costo Producto', `$ ${this.money(pr.costoProducto)}`],
              ['Costo Promedio', `$ ${this.money(pr.costoPromedio)}`],
              ['', '']
            ),
            this.kvRow(
              ['Costo Compra Anterior', `$ ${this.money(pr.precioCompraAnterior)}`],
              ['Fecha Ant. Mod.', pr.fechaAnteriorModificarCompra],
              ['Costo Compra Actual', `$ ${this.money(pr.precioCompraActual)}`],
              ['Fecha Mod.', pr.fechaModificarCompra]
            )
          ]
        },
        layout: 'lightHorizontalLines'
      }
    ];

    // --- Datos Adicionales
    const seccionAdic: any[] = [
      this.h2('Datos Adicionales', cfg.colorPrimario),
      {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [
            this.kvRow(['Color', x.color], ['Sabor', x.sabor], ['Fabricante', x.fabricante], ['Tamaño / Talla', x.tamanoTalla1]),
            this.kvRow(['Espesor', x.medida1], ['Largo', x.medida2], ['Ancho', x.medida3], ['Reg. Sanitario', x.registroSanitario])
          ]
        },
        layout: 'lightHorizontalLines'
      }
    ];
    if (x.observacion || p.observaciones) {
      seccionAdic.push(
        { text: 'Observación', style: 'h2', color: cfg.colorPrimario ?? '#1f2937', margin: [0, 12, 0, 4] },
        { text: x.observacion || p.observaciones || '', style: 'paragraph' }
      );
    }

    // --- Ubicaciones
    const seccionUbic = (x.ubicaciones && x.ubicaciones.length)
      ? [
          this.h2('Ubicación en Bodega', cfg.colorPrimario),
          {
            table: {
              headerRows: 1,
              widths: ['*', '*', '*', '*'],
              body: [
                [
                  { text: 'Bodega', style: 'th' },
                  { text: 'Área', style: 'th' },
                  { text: 'Columna', style: 'th' },
                  { text: 'Nivel', style: 'th' }
                ],
                ...x.ubicaciones.map(u => [
                  u.nombreLocal || '-',
                  u.codigoArea || '-',
                  u.codigoColumna || '-',
                  u.codigoNivel || '-'
                ])
              ]
            },
            layout: this.tableLayout(cfg.colorSecundario)
          }
        ]
      : [];

    // --- Existencias por Bodega
    const seccionBodegas = (cfg.mostrarBodegas && p.bodegas?.length)
      ? [
          this.h2('Existencias por Bodega', cfg.colorPrimario),
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto'],
              body: [
                [
                  { text: 'Bodega', style: 'th' },
                  { text: 'Existencia', style: 'th', alignment: 'right' },
                  { text: 'Stock Mín', style: 'th', alignment: 'right' },
                  { text: 'Stock Máx', style: 'th', alignment: 'right' }
                ],
                ...(p.bodegas!.map(b => [
                  b.nombreBodega,
                  { text: this.num(b.existencia), alignment: 'right' },
                  { text: b.stockMin ?? '-', alignment: 'right' },
                  { text: b.stockMax ?? '-', alignment: 'right' }
                ]))
              ]
            },
            layout: this.tableLayout(cfg.colorSecundario)
          }
        ]
      : [];

    // --- Proveedores
    const seccionProv = (cfg.mostrarProveedores && p.proveedores?.length)
      ? [
          this.h2('Proveedores', cfg.colorPrimario),
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto', 'auto', '*'],
              body: [
                [
                  { text: 'Proveedor', style: 'th' },
                  { text: 'Código', style: 'th' },
                  { text: 'Precio Compra', style: 'th', alignment: 'right' },
                  { text: 'Descuento', style: 'th', alignment: 'right' },
                  { text: 'Plazo Entrega', style: 'th', alignment: 'right' },
                  { text: 'Código Proveedor', style: 'th' }
                ],
                ...(p.proveedores!.map(pr => [
                  pr.nombreProveedor,
                  pr.codigoProveedor || '-',
                  { text: pr.precioCompra != null ? `$ ${this.money(pr.precioCompra)}` : '-', alignment: 'right' },
                  { text: pr.descuento != null ? `${pr.descuento}%` : '-', alignment: 'right' },
                  { text: pr.plazoEntrega != null ? `${pr.plazoEntrega} días` : '-', alignment: 'right' },
                  pr.productoProveedor || '-'
                ]))
              ]
            },
            layout: this.tableLayout(cfg.colorSecundario)
          }
        ]
      : [];

    // --- Footer
    const footer = (currentPage: number, pageCount: number) => {
      const left = cfg.textoPiePagina || 'Documento generado automáticamente';
      const right = cfg.mostrarNumeroPagina ? `${currentPage}/${pageCount}` : '';
      return {
        columns: [
          { text: left, alignment: 'left', margin: [40, 0, 0, 0], color: '#6b7280', fontSize: 9 },
          { text: right, alignment: 'right', margin: [0, 0, 40, 0], color: '#6b7280', fontSize: 9 }
        ]
      };
    };

    // --- Doc
    return {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      footer,
      content: [
        ...header,
        ...seccionIdent,
        this.hr(),
        ...seccionOpc,
        this.hr(),
        ...seccionClasif,
        this.hr(),
        ...seccionPrecios,
        this.hr(),
        ...seccionAdic,
        ...(seccionUbic.length ? [this.hr(), ...seccionUbic] : []),
        ...(seccionBodegas.length ? [this.hr(), ...seccionBodegas] : []),
        ...(seccionProv.length ? [this.hr(), ...seccionProv] : [])
      ],
      styles: {
        h1: { fontSize: 18, bold: true },
        title: { fontSize: 16, bold: true, margin: [0, 0, 0, 2] },
        h2: { fontSize: 12, bold: true },
        small: { fontSize: 9 },
        paragraph: { fontSize: 10, lineHeight: 1.3 },

        th: { bold: true, fillColor: (cfg.colorSecundario ?? '#e5e7eb'), margin: [0, 3, 0, 3] },
        kvLabel: { color: '#6b7280', fontSize: 8, margin: [0, 0, 0, 1] },
        kvValue: { fontSize: 10 }
      },
      defaultStyle: { fontSize: 10 }
    };
  }
}
