import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  ValueFormatterParams,
} from 'ag-grid-community';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MomentDateAdapter } from '@angular/material-moment-adapter';
import { PurchaseReportItemResponse, PurchaseReportTotalsResponse } from 'src/app/interfaces/responses/reporte-compras-response';
import { PurchaseReportService } from 'src/app/services/reporte-compras.service';
import { AtsXmlRequest } from 'src/app/interfaces/requests/ats-xml-request';

// Formato de fecha personalizado
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-reporte-compras',
  templateUrl: './reporte-compras.component.html',
  styleUrls: ['./reporte-compras.component.css'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS],
    },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
  ],
})
export class ReporteComprasComponent implements OnInit {
  // ========== FORMULARIO Y FILTROS ==========
  filtrosForm: FormGroup;
  loading = false;
  idEmpresa = 1; // TODO: Obtener de servicio de autenticación/empresa

  // ========== DATOS DEL REPORTE ==========
  comprasData: PurchaseReportItemResponse[] = [];
  comprasTotales: PurchaseReportTotalsResponse | null = null;
  nombreEmpresa = '';
  fechaInicio = '';
  fechaFin = '';

  // ========== AG-GRID ==========
  comprasGridApi?: GridApi<PurchaseReportItemResponse>;
  comprasColumnDefs: ColDef<PurchaseReportItemResponse>[] = [];
  comprasFilaTotales: any[] = [];

  // ========== HELPER PARA TEMPLATE ==========
  Math = Math;

  // ========== CONFIG AG-GRID ==========
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };

  constructor(
    private fb: FormBuilder,
    private purchaseReportService: PurchaseReportService,
    private snackBar: MatSnackBar
  ) {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    this.filtrosForm = this.fb.group({
      fechaDesde: [primerDiaMes, Validators.required],
      fechaHasta: [hoy, Validators.required],
    });

    this.inicializarColumnas();
  }

  ngOnInit(): void {
    console.log('🚀 Componente Reporte Compras iniciado');
  }

    // ========== INICIALIZACIÓN DE COLUMNAS ==========
    private inicializarColumnas(): void {
    this.comprasColumnDefs = [
        // ========== DATOS FACTURA (9 columnas) ==========
        // RUC - cambiar de 130 a 140
        {
        headerName: 'RUC',
        field: 'ruc',
        width: 140,  // ← CAMBIAR
        pinned: 'left',
        headerClass: 'header-datos-factura',
        },

        // Proveedor - cambiar de 250 a 280
        {
        headerName: 'Proveedor',
        field: 'proveedor',
        width: 280,  // ← CAMBIAR
        pinned: 'left',
        headerClass: 'header-datos-factura',
        },

        // No. Comprobante - cambiar de 150 a 160
        {
        headerName: 'No. Comprobante',
        field: 'noComprobante',
        width: 160,  // ← CAMBIAR
        headerClass: 'header-datos-factura',
        },

        // Autorización - cambiar de 180 a 200
        {
        headerName: 'Autorización',
        field: 'autorizacion',
        width: 200,  // ← CAMBIAR
        headerClass: 'header-datos-factura',
        },
        {
        headerName: 'Fecha',
        field: 'fecha',
        width: 110,
        headerClass: 'header-datos-factura',
        },
        {
            headerName: 'Cód. Comp.',
            field: 'codigoTipoComp',
            width: 110,
            cellStyle: { textAlign: 'center' },
            headerClass: 'header-datos-factura',
        },
        {
            headerName: 'Tipo Documento',
            field: 'tipoDocumento',
            width: 160,
            headerClass: 'header-datos-factura',
        },
        {
        headerName: 'Base 0%',
        field: 'baseCero',
        width: 120,
        valueFormatter: (p: ValueFormatterParams) => this.formatoMonedaOpcional(p),
        type: 'rightAligned',
        headerClass: 'header-datos-factura',
        },
        {
        headerName: 'Base 12%',
        field: 'baseIva',
        width: 120,
        valueFormatter: (p: ValueFormatterParams) => this.formatoMonedaOpcional(p),
        type: 'rightAligned',
        headerClass: 'header-datos-factura',
        },
        {
        headerName: 'IVA',
        field: 'iva',
        width: 110,
        valueFormatter: (p: ValueFormatterParams) => this.formatoMonedaOpcional(p),
        type: 'rightAligned',
        headerClass: 'header-datos-factura',
        },
        {
        headerName: 'TOTAL',
        field: 'total',
        width: 130,
        valueFormatter: (p: ValueFormatterParams) => this.formatoMoneda(p),
        type: 'rightAligned',
        cellStyle: { fontWeight: 'bold', color: '#006600' },
        headerClass: 'header-datos-factura',
        },

        // ========== RETENCIONES DE IVA (8 columnas) ==========
        {
        headerName: 'IVA 30% Bienes',
        field: 'ivaBienes30',
        width: 130,
        valueFormatter: (p: ValueFormatterParams) => this.formatoMonedaOpcional(p),
        type: 'rightAligned',
        headerClass: 'header-retenciones-iva',
        },
        {
        headerName: 'Cód. IVA 30%',
        field: 'codIvaBienes30',
        width: 130,
        cellStyle: { textAlign: 'center' },
        headerClass: 'header-retenciones-iva',
        },
        {
        headerName: 'IVA 70% Servicios',
        field: 'ivaServ70',
        width: 150,
        valueFormatter: (p: ValueFormatterParams) => this.formatoMonedaOpcional(p),
        type: 'rightAligned',
        headerClass: 'header-retenciones-iva',
        },
        {
        headerName: 'Cód. IVA 70%',
        field: 'codIvaServ70',
        width: 130,
        cellStyle: { textAlign: 'center' },
        headerClass: 'header-retenciones-iva',
        },
        {
        headerName: 'IVA 100% Bienes',
        field: 'ivaBienes100',
        width: 130,
        valueFormatter: (p: ValueFormatterParams) => this.formatoMonedaOpcional(p),
        type: 'rightAligned',
        headerClass: 'header-retenciones-iva',
        },
        {
        headerName: 'Cód. IVA 100%',
        field: 'codIvaBienes100',
        width: 130,
        cellStyle: { textAlign: 'center' },
        headerClass: 'header-retenciones-iva',
        },
        {
        headerName: 'IVA 100% Servicios',
        field: 'ivaServ100',
        width: 150,
        valueFormatter: (p: ValueFormatterParams) => this.formatoMonedaOpcional(p),
        type: 'rightAligned',
        headerClass: 'header-retenciones-iva',
        },
        {
        headerName: 'Cód. IVA 100%',
        field: 'codIvaServ100',
        width: 130,
        cellStyle: { textAlign: 'center' },
        headerClass: 'header-retenciones-iva',
        },

        // ========== RETENCIONES FUENTE (10 columnas) ==========
        {
        headerName: 'Código Ret. Fuente',
        field: 'codRetFuente',
        width: 150,
        cellStyle: { fontWeight: 'bold', color: '#000080' },
        headerClass: 'header-retenciones-fuente',
        },
        {
        headerName: 'Base Imponible',
        field: 'baseRetencion',
        width: 130,
        valueFormatter: (p: ValueFormatterParams) => this.formatoMonedaOpcional(p),
        type: 'rightAligned',
        headerClass: 'header-retenciones-fuente',
        },
        {
        headerName: '% Retención Fuente',
        field: 'porcentajeRetFuente',
        width: 150,
        valueFormatter: (p: ValueFormatterParams) => this.formatoPorcentaje(p),
        type: 'rightAligned',
        headerClass: 'header-retenciones-fuente',
        },
        {
        headerName: 'Monto Retención',
        field: 'montoRetencion',
        width: 130,
        valueFormatter: (p: ValueFormatterParams) => this.formatoMonedaOpcional(p),
        type: 'rightAligned',
        headerClass: 'header-retenciones-fuente',
        },
        {
        headerName: 'No. Comprobante Ret.',
        field: 'numComprobante',
        width: 170,
        headerClass: 'header-retenciones-fuente',
        },
        {
        headerName: 'Autorización Retención',
        field: 'autorizacionRetencion',
        width: 180,
        headerClass: 'header-retenciones-fuente',
        },
        {
        headerName: 'Fecha Comprobante',
        field: 'fechaComprobante',
        width: 150,
        headerClass: 'header-retenciones-fuente',
        },
        {
        headerName: 'Diario',
        field: 'diario',
        width: 100,
        headerClass: 'header-retenciones-fuente',
        },
        {
        headerName: 'Tipo Diario',
        field: 'tipoDiario',
        width: 110,
        headerClass: 'header-retenciones-fuente',
        },
        {
        headerName: 'Observaciones',
        field: 'observaciones',
        width: 250,
        headerClass: 'header-retenciones-fuente',
        },
    ];
    }

  // ========== GRID READY ==========

  onComprasGridReady(event: GridReadyEvent<PurchaseReportItemResponse>): void {
    this.comprasGridApi = event.api;    
  }

  // ========== CONSULTAR DATOS ==========

  consultar(): void {
    if (this.filtrosForm.invalid) {
      this.snackBar.open('Por favor seleccione las fechas', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    const fechaDesde = this.convertirADate(this.filtrosForm.value.fechaDesde);
    const fechaHasta = this.convertirADate(this.filtrosForm.value.fechaHasta);

    if (fechaDesde > fechaHasta) {
      this.snackBar.open('La fecha inicial no puede ser mayor a la fecha final', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    this.loading = true;

    const request = {
      fechaInicio: fechaDesde,
      fechaFin: fechaHasta,
      idEmpresa: this.idEmpresa,
    };

    this.purchaseReportService.getReport(request).subscribe({
      next: (response) => {
        if (response.type === 'PURCHASE_REPORT' && response.data) {
          this.comprasData = response.data.items;
          this.comprasTotales = response.data.totales;
          this.nombreEmpresa = response.data.nombreEmpresa;
          this.fechaInicio = response.data.fechaInicio;
          this.fechaFin = response.data.fechaFin;

          this.actualizarTotales();

          this.snackBar.open(
            `Reporte generado con ${this.comprasData.length} registros`,
            'Cerrar',
            { duration: 3000 }
          );
        } else if (response.type === 'WARNING') {
          this.comprasData = [];
          this.comprasTotales = null;
          this.snackBar.open(response.message, 'Cerrar', { duration: 3000 });
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar reporte de compras:', error);
        this.comprasData = [];
        this.comprasTotales = null;
        this.snackBar.open('Error al generar reporte', 'Cerrar', {
          duration: 3000,
        });
        this.loading = false;
      },
    });
  }

  // ========== TOTALES PINNED ==========

  private actualizarTotales(): void {
    if (!this.comprasTotales) {
      this.comprasFilaTotales = [];
      return;
    }

    const filaTotales: any = {
      // DATOS FACTURA
      ruc: '',
      proveedor: 'T O T A L E S  ══════════ ▶▶',
      noComprobante: '',
      autorizacion: '',
      fecha: '',
      codigoTipoComp: '',
      tipoDocumento: '',
      baseCero: this.comprasTotales.totalBaseCero,
      baseIva: this.comprasTotales.totalBaseIva,
      iva: this.comprasTotales.totalIva,
      total: this.comprasTotales.totalGeneral,

      // RETENCIONES IVA
      ivaBienes30: this.comprasTotales.totalIvaBienes30,
      codIvaBienes30: '',
      ivaServ70: this.comprasTotales.totalIvaServ70,
      codIvaServ70: '',
      ivaBienes100: this.comprasTotales.totalIvaBienes100,
      codIvaBienes100: '',
      ivaServ100: this.comprasTotales.totalIvaServ100,
      codIvaServ100: '',

      // RETENCIONES FUENTE
      codRetFuente: '',
      baseRetencion: this.comprasTotales.totalBaseRetencion,
      porcentajeRetFuente: null,
      montoRetencion: this.comprasTotales.totalMontoRetencion,
      numComprobante: '',
      autorizacionRetencion: '',
      fechaComprobante: '',
      diario: '',
      tipoDiario: '',
      observaciones: '',
    };

    this.comprasFilaTotales = [filaTotales];
  }

  // ========== EXPORTAR A EXCEL ==========

  exportarExcel(): void {
    if (this.filtrosForm.invalid) {
      this.snackBar.open('Por favor seleccione las fechas primero', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    const fechaDesde = this.convertirADate(this.filtrosForm.value.fechaDesde);
    const fechaHasta = this.convertirADate(this.filtrosForm.value.fechaHasta);

    if (fechaDesde > fechaHasta) {
      this.snackBar.open('La fecha inicial no puede ser mayor a la fecha final', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    this.loading = true;
    this.snackBar.open('Generando Excel...', 'Cerrar', { duration: 2000 });

    const request = {
      fechaInicio: fechaDesde,
      fechaFin: fechaHasta,
      idEmpresa: this.idEmpresa,
    };

    this.purchaseReportService.downloadAndSaveExcel(request);

    // Simular delay para feedback visual
    setTimeout(() => {
      this.loading = false;
      this.snackBar.open('Excel descargado exitosamente', 'Cerrar', {
        duration: 3000,
      });
    }, 1500);
  }
  // ========== FORMATTERS ==========

  private formatoMoneda(params: ValueFormatterParams): string {
    if (params.value == null || params.value === 0) return '';
    return '$' + Number(params.value).toFixed(2);
  }

  private formatoMonedaOpcional(params: ValueFormatterParams): string {
    if (params.value == null) return '';
    return '$' + Number(params.value).toFixed(2);
  }

  private formatoPorcentaje(params: ValueFormatterParams): string {
    if (params.value == null) return '';
    return Number(params.value).toFixed(2) + '%';
  }

  // ========== HELPERS ==========

  private convertirADate(valor: any): Date {
    if (!valor) return valor;
    // Si es Moment, convertir a Date
    if (typeof valor.toDate === 'function') {
      return valor.toDate();
    }
    // Si ya es Date, devolver tal cual
    return valor;
  }
}