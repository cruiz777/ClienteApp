import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  ValueFormatterParams,
} from 'ag-grid-community';
import { FacturacionService } from 'src/app/services/facturacion.service';
import { NotaCreditoService } from 'src/app/services/nota-credito.service';

import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { FacturaReporteResponse } from 'src/app/interfaces/responses/factura-reporte-response';
import { ReporteFacturasResponse, ReporteNotasCreditoResponse, TotalesReporteVentas } from 'src/app/interfaces/responses/totales-ventas-response';
import { NotaCreditoReporteResponse } from 'src/app/interfaces/responses/nota-credito-reporte-response';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MomentDateAdapter } from '@angular/material-moment-adapter';

type TipoTab = 'Facturas' | 'NotasCredito' | 'NotasDebito' | 'Retenciones';
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
  selector: 'app-reporte-ventas',
  templateUrl: './reporte-ventas.component.html',
  styleUrls: ['./reporte-ventas.component.css'],
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
export class ReporteVentasComponent implements OnInit {
  // ========== FORMULARIO Y FILTROS ==========
  filtrosForm: FormGroup;
  loading = false;

  // ========== TABS ==========
  tabActivo: TipoTab = 'Facturas';

  // ========== DATOS DE FACTURAS ==========
  facturasData: FacturaReporteResponse[] = [];
  facturaTotales: TotalesReporteVentas | null = null;
  facturasGridApi?: GridApi<FacturaReporteResponse>;
  facturasColumnDefs: ColDef<FacturaReporteResponse>[] = [];
  facturasFilaTotales: any[] = [];

  // ========== DATOS DE NOTAS DE CRÉDITO ==========
  notasCreditoData: NotaCreditoReporteResponse[] = [];
  notaCreditoTotales: TotalesReporteVentas | null = null;
  notasCreditoGridApi?: GridApi<NotaCreditoReporteResponse>;
  notasCreditoColumnDefs: ColDef<NotaCreditoReporteResponse>[] = [];
  notasCreditoFilaTotales: any[] = [];

  // ========== PAGINACIÓN ==========
  currentPageFacturas = 1;
  currentPageNotasCredito = 1;
  pageSize = 20;
  totalItemsFacturas = 0;
  totalItemsNotasCredito = 0;
  totalPagesFacturas = 0;
  totalPagesNotasCredito = 0;

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
    private facturacionService: FacturacionService,
    private notaCreditoService: NotaCreditoService,
    private snackBar: MatSnackBar
  ) {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    this.filtrosForm = this.fb.group({
      fechaDesde: [primerDiaMes, Validators.required],
      fechaHasta: [hoy, Validators.required],
    });

    this.inicializarColumnasFacturas();
    this.inicializarColumnasNotasCredito();
  }

  ngOnInit(): void {
    console.log('🚀 Componente Reporte Ventas iniciado');
  }

  // ========== INICIALIZACIÓN DE COLUMNAS ==========

  private inicializarColumnasFacturas(): void {
    this.facturasColumnDefs = [
      {
        headerName: '#',
        width: 60,
        cellRenderer: (params: any) => {
          if (params.node.rowPinned) return ''; // Sin número en fila de totales
          return (this.currentPageFacturas - 1) * this.pageSize + params.node.rowIndex + 1;
        },
        sortable: false,
        filter: false,
      },
      {
        headerName: 'Fecha',
        field: 'fecha',
        width: 120,
        valueFormatter: (p) => this.formatearFecha(p.value),
      },
      {
        headerName: 'Cliente',
        field: 'cliente',
        minWidth: 200,
        flex: 1,
      },
      {
        headerName: 'No. Factura',
        field: 'numeroFactura',
        width: 150,
      },
      {
        headerName: 'Subtotal',
        field: 'subtotal',
        width: 110,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      {
        headerName: 'Descuento',
        field: 'descuento',
        width: 110,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      {
        headerName: 'Base 0',
        field: 'base0',
        width: 110,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      {
        headerName: 'Base Iva',
        field: 'baseIva',
        width: 110,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      {
        headerName: 'Iva',
        field: 'iva',
        width: 110,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      {
        headerName: 'Total',
        field: 'total',
        width: 110,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      {
        headerName: 'Asiento Contable',
        field: 'asientoContable',
        width: 150,
      },
    ];
  }

  private inicializarColumnasNotasCredito(): void {
    this.notasCreditoColumnDefs = [
      {
        headerName: '#',
        width: 60,
        cellRenderer: (params: any) => {
          if (params.node.rowPinned) return ''; // Sin número en fila de totales
          return (this.currentPageNotasCredito - 1) * this.pageSize + params.node.rowIndex + 1;
        },
        sortable: false,
        filter: false,
      },
      {
        headerName: 'Fecha',
        field: 'fecha',
        width: 120,
        valueFormatter: (p) => this.formatearFecha(p.value),
      },
      {
        headerName: 'Cliente',
        field: 'cliente',
        minWidth: 200,
        flex: 1,
      },
      {
        headerName: 'No. Factura',
        field: 'numeroFactura',
        width: 150,
      },
      {
        headerName: 'No. N Crédito',
        field: 'numeroNotaCredito',
        width: 150,
      },
      {
        headerName: 'Subtotal',
        field: 'subtotal',
        width: 110,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      {
        headerName: 'Base 0',
        field: 'base0',
        width: 110,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      {
        headerName: 'Base Iva',
        field: 'baseIva',
        width: 110,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      {
        headerName: 'Iva',
        field: 'iva',
        width: 110,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      {
        headerName: 'Total',
        field: 'total',
        width: 110,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      {
        headerName: 'Asiento Contable',
        field: 'asientoContable',
        width: 150,
      },
    ];
  }

  // ========== GRID READY ==========

  onFacturasGridReady(event: GridReadyEvent<FacturaReporteResponse>): void {
    this.facturasGridApi = event.api;
  }

  onNotasCreditoGridReady(event: GridReadyEvent<NotaCreditoReporteResponse>): void {
    this.notasCreditoGridApi = event.api;
  }

  // ========== CAMBIO DE TAB ==========

  cambiarTab(tab: TipoTab): void {
    this.tabActivo = tab;
  }

  // ========== CONSULTAR DATOS ==========

    consultar(): void {
    if (this.filtrosForm.invalid) {
      this.snackBar.open('Por favor seleccione las fechas', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    this.currentPageFacturas = 1;
    this.currentPageNotasCredito = 1;

    const fechaDesde = this.convertirADate(this.filtrosForm.value.fechaDesde);
    const fechaHasta = this.convertirADate(this.filtrosForm.value.fechaHasta);

    this.loading = true;

    Promise.all([
      this.cargarFacturas(fechaDesde, fechaHasta),
      this.cargarNotasCredito(fechaDesde, fechaHasta),
    ])
      .then(() => {
        this.snackBar.open('Reporte generado exitosamente', 'Cerrar', {
          duration: 3000,
        });
      })
      .catch((error) => {
        console.error('Error al cargar reporte:', error);
        this.snackBar.open('Error al generar reporte', 'Cerrar', {
          duration: 3000,
        });
      })
      .finally(() => {
        this.loading = false;
      });
  }

  private cargarFacturas(fechaDesde: Date, fechaHasta: Date): Promise<void> {
    return new Promise((resolve, reject) => {
      this.facturacionService
        .getReporteFacturas(fechaDesde, fechaHasta, this.currentPageFacturas, this.pageSize)
        .subscribe({
          next: (response) => {
            if (response.data) {
              this.facturasData = response.data.paginacion.items;
              this.facturaTotales = response.data.totales;
              this.totalItemsFacturas = response.data.paginacion.totalItems;
              this.totalPagesFacturas = response.data.paginacion.totalPages;
              this.actualizarTotalesFacturas();
            }
            resolve();
          },
          error: (error) => {
            console.error('Error al cargar facturas:', error);
            this.facturasData = [];
            this.facturaTotales = null;
            reject(error);
          },
        });
    });
  }

  private cargarNotasCredito(fechaDesde: Date, fechaHasta: Date): Promise<void> {
    return new Promise((resolve, reject) => {
      this.notaCreditoService
        .getReporteNotasCredito(fechaDesde, fechaHasta, this.currentPageNotasCredito, this.pageSize)
        .subscribe({
          next: (response) => {
            if (response.data) {
              this.notasCreditoData = response.data.paginacion.items;
              this.notaCreditoTotales = response.data.totales;
              this.totalItemsNotasCredito = response.data.paginacion.totalItems;
              this.totalPagesNotasCredito = response.data.paginacion.totalPages;
              this.actualizarTotalesNotasCredito();
            }
            resolve();
          },
          error: (error) => {
            console.error('Error al cargar notas de crédito:', error);
            this.notasCreditoData = [];
            this.notaCreditoTotales = null;
            reject(error);
          },
        });
    });
  }

  // ========== RECARGAR DATOS (USADO POR PAGINADOR) ==========


  private recargarFacturas(): void {
    const fechaDesde = this.convertirADate(this.filtrosForm.value.fechaDesde);
    const fechaHasta = this.convertirADate(this.filtrosForm.value.fechaHasta);

    if (fechaDesde && fechaHasta) {
      this.loading = true;
      this.cargarFacturas(fechaDesde, fechaHasta).finally(() => {
        this.loading = false;
        if (this.facturasGridApi) {
          this.facturasGridApi.refreshCells({ force: true });
        }
      });
    }
  }

  private recargarNotasCredito(): void {
    const fechaDesde = this.convertirADate(this.filtrosForm.value.fechaDesde);
    const fechaHasta = this.convertirADate(this.filtrosForm.value.fechaHasta);

    if (fechaDesde && fechaHasta) {
      this.loading = true;
      this.cargarNotasCredito(fechaDesde, fechaHasta).finally(() => {
        this.loading = false;
        if (this.notasCreditoGridApi) {
          this.notasCreditoGridApi.refreshCells({ force: true });
        }
      });
    }
  }

  // ========== TOTALES PINNED ==========

  private actualizarTotalesFacturas(): void {
    if (!this.facturaTotales) {
      this.facturasFilaTotales = [];
      return;
    }

    const filaTotales: any = {
      fecha: '',
      cliente: 'TOTALES',
      numeroFactura: '',
      subtotal: this.facturaTotales.subtotal,
      descuento: this.facturaTotales.descuento,
      base0: this.facturaTotales.base0,
      baseIva: this.facturaTotales.baseIva,
      iva: this.facturaTotales.iva,
      total: this.facturaTotales.total,
      asientoContable: '',
    };

    this.facturasFilaTotales = [filaTotales];
  }

  private actualizarTotalesNotasCredito(): void {
    if (!this.notaCreditoTotales) {
      this.notasCreditoFilaTotales = [];
      return;
    }

    const filaTotales: any = {
      fecha: '',
      cliente: 'TOTALES',
      numeroFactura: '',
      numeroNotaCredito: '',
      subtotal: this.notaCreditoTotales.subtotal,
      base0: this.notaCreditoTotales.base0,
      baseIva: this.notaCreditoTotales.baseIva,
      iva: this.notaCreditoTotales.iva,
      total: this.notaCreditoTotales.total,
      asientoContable: '',
    };

    this.notasCreditoFilaTotales = [filaTotales];
  }

  // ========== NAVEGACIÓN DE PÁGINAS ==========

  irPaginaFacturas(page: number): void {
    this.currentPageFacturas = page;
    this.recargarFacturas();
  }

  irPaginaNotasCredito(page: number): void {
    this.currentPageNotasCredito = page;
    this.recargarNotasCredito();
  }

  cambiarTamanoPaginaFacturas(): void {
    this.currentPageFacturas = 1;
    this.recargarFacturas();
  }

  cambiarTamanoPaginaNotasCredito(): void {
    this.currentPageNotasCredito = 1;
    this.recargarNotasCredito();
  }

  // ========== EXPORTAR A EXCEL ==========

  async exportarExcel(): Promise<void> {
    const { fechaDesde, fechaHasta } = this.filtrosForm.value;

    if (!fechaDesde || !fechaHasta) {
      this.snackBar.open('Seleccione las fechas primero', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    this.loading = true;
    this.snackBar.open('Generando Excel...', 'Cerrar', { duration: 2000 });

    try {
      const [facturasResponse, notasCreditoResponse] = await Promise.all([
        this.facturacionService.getReporteFacturasCompleto(fechaDesde, fechaHasta).toPromise(),
        this.notaCreditoService.getReporteNotasCreditoCompleto(fechaDesde, fechaHasta).toPromise(),
      ]);

      const workbook = new Workbook();

      if (facturasResponse?.data) {
        this.crearHojaFacturas(workbook, facturasResponse.data);
      }

      if (notasCreditoResponse?.data) {
        this.crearHojaNotasCredito(workbook, notasCreditoResponse.data);
      }

      const wsDebito = workbook.addWorksheet('Notas de Débito');
      wsDebito.addRow(['En desarrollo']);

      const wsRetenciones = workbook.addWorksheet('Retenciones');
      wsRetenciones.addRow(['En desarrollo']);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const fecha = new Date().toISOString().split('T')[0];
      saveAs(blob, `Reporte_Ventas_${fecha}.xlsx`);

      this.snackBar.open('Excel generado exitosamente', 'Cerrar', {
        duration: 3000,
      });
    } catch (error) {
      console.error('Error al generar Excel:', error);
      this.snackBar.open('Error al generar Excel', 'Cerrar', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  private crearHojaFacturas(workbook: Workbook, data: ReporteFacturasResponse): void {
    const ws = workbook.addWorksheet('Facturas');

    const headers = [
      'Fecha',
      'Cliente',
      'No. Factura',
      'Subtotal',
      'Descuento',
      'Base 0',
      'Base Iva',
      'Iva',
      'Total',
      'Asiento Contable',
    ];
    ws.addRow(headers);

    data.paginacion.items.forEach((item) => {
      ws.addRow([
        this.formatearFecha(item.fecha),
        item.cliente,
        item.numeroFactura,
        item.subtotal,
        item.descuento,
        item.base0,
        item.baseIva,
        item.iva,
        item.total,
        item.asientoContable || '',
      ]);
    });

    ws.addRow([
      '',
      '',
      'TOTALES',
      data.totales.subtotal,
      data.totales.descuento,
      data.totales.base0,
      data.totales.baseIva,
      data.totales.iva,
      data.totales.total,
      '',
    ]);

    this.aplicarEstilosExcel(ws);
  }

  private crearHojaNotasCredito(workbook: Workbook, data: ReporteNotasCreditoResponse): void {
    const ws = workbook.addWorksheet('Notas de Crédito');

    const headers = [
      'Fecha',
      'Cliente',
      'No. Factura',
      'No. N Crédito',
      'Subtotal',
      'Base 0',
      'Base Iva',
      'Iva',
      'Total',
      'Asiento Contable',
    ];
    ws.addRow(headers);

    data.paginacion.items.forEach((item) => {
      ws.addRow([
        this.formatearFecha(item.fecha),
        item.cliente,
        item.numeroFactura,
        item.numeroNotaCredito,
        item.subtotal,
        item.base0,
        item.baseIva,
        item.iva,
        item.total,
        item.asientoContable || '',
      ]);
    });

    ws.addRow([
      '',
      '',
      '',
      'TOTALES',
      data.totales.subtotal,
      data.totales.base0,
      data.totales.baseIva,
      data.totales.iva,
      data.totales.total,
      '',
    ]);

    this.aplicarEstilosExcel(ws);
  }

  private aplicarEstilosExcel(ws: any): void {
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF002C6C' },
    };

    ws.columns.forEach((column: any) => {
      column.width = 18;
    });

    const lastRow = ws.lastRow;
    if (lastRow) {
      lastRow.font = { bold: true };
      lastRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E7EF' },
      };
    }
  }

  // ========== FORMATTERS ==========

  private formatoMoneda(params: ValueFormatterParams): string {
    if (params.value == null) return '';
    return '$' + Number(params.value).toFixed(2);
  }

  private formatearFecha(fecha: string | Date): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  //======= HELPERS =============///
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
