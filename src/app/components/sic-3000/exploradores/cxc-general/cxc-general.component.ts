import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteTrigger, MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, GetRowIdParams } from 'ag-grid-community';
import { EstadoCuentaService, ClienteConDeudaDto, ClientesConDeudaPaginadoResponse } from 'src/app/services/estado-cuenta.service';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { startOfMonth } from 'date-fns';

@Component({
  selector: 'app-explorador-cxc-general',
  standalone: true,
  templateUrl: './cxc-general.component.html',
  styleUrl: './cxc-general.component.css',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatSnackBarModule,
    MatMenuModule,
    MatButtonModule,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    AgGridModule
  ]
})
export class ExploradorCxcGeneralComponent implements OnInit {

  // ===== Estado general =====
  step = 1;
  hoy = new Date();
  isLoading = false;
  errorMessage = '';

  formFiltros!: FormGroup;

  // ===== Grid AG-Grid =====
  private gridApi!: GridApi;
  
  columnDefs: ColDef[] = [
    { 
      headerName: 'Código', 
      field: 'codigo', 
      width: 100, 
      pinned: 'left',
      type: 'rightAligned'
    },
    { 
      headerName: 'Cliente', 
      field: 'nombre', 
      minWidth: 280,
      flex: 1
    },
    {
      headerName: 'Saldo Total',
      field: 'saldo_total',
      width: 140,
      type: 'rightAligned',
      valueFormatter: p => this.usd(p.value),
      cellClass: 'fw-bold text-primary'
    },
    {
      headerName: 'Cant. Facturas',
      field: 'cantidad_facturas',
      width: 130,
      type: 'rightAligned'
    },
    {
      headerName: 'Días Promedio Venc.',
      field: 'dias_promedio_vencimiento',
      width: 160,
      type: 'rightAligned',
      cellClass: (params) => {
        const dias = params.value || 0;
        if (dias <= 0) return 'text-success';
        if (dias <= 30) return 'text-warning';
        if (dias <= 90) return 'text-danger';
        return 'text-danger fw-bold';
      }
    },
    {
      headerName: 'Factura Más Antigua',
      field: 'factura_mas_antigua',
      width: 160,
      valueFormatter: p => p.value ? this.formatFecha(p.value) : '—'
    }
  ];

  defaultColDef: ColDef = { 
    resizable: true, 
    sortable: true, 
    filter: true 
  };

  rowData: ClienteConDeudaDto[] = [];

  getRowId = (params: GetRowIdParams) => String(params.data.codigo);

  // ===== Resumen =====
  resumen = {
    total_clientes: 0,
    monto_total: 0,
    total_facturas: 0,
    promedio_deuda_por_cliente: 0
  };

  // ===== Paginación =====
  page = 1;
  pageSize = 50;
  totalItems = 0;
  totalPages = 0;

  constructor(
    private fb: FormBuilder,
    private estadoCuentaService: EstadoCuentaService,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.formFiltros = this.fb.group({
      fechaDesde: [null],
      fechaHasta: [null],
      saldoMinimo: [0.01]
    });

    // Cargar datos iniciales
    this.cargarDatos();
  }

  // ===== Cargar datos del servicio =====
  cargarDatos(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const filtros = this.formFiltros.value;
    const fechaDesde = filtros.fechaDesde 
      ? this.estadoCuentaService.formatDateForApi(filtros.fechaDesde) 
      : undefined;
    const fechaHasta = filtros.fechaHasta 
      ? this.estadoCuentaService.formatDateForApi(filtros.fechaHasta) 
      : undefined;

    this.estadoCuentaService.getClientesConDeudaPaginado({
      fechaDesde,
      fechaHasta,
      saldoMinimo: filtros.saldoMinimo || 0.01,
      page: this.page,
      pageSize: this.pageSize
    }).subscribe({
      next: (response) => {
        if (response.type === 'success' && response.data) {
          this.rowData = response.data.clientes.items;
          this.resumen = response.data.resumen;
          this.totalItems = response.data.clientes.totalItems;
          this.totalPages = response.data.clientes.totalPages;

          this.gridApi?.setGridOption('rowData', this.rowData);
          this.gridApi?.sizeColumnsToFit();

          if (this.rowData.length === 0) {
            this.mostrarAlerta('No se encontraron clientes con deuda', 'info');
          }
        } else {
          this.errorMessage = response.message || 'Error al cargar datos';
          this.mostrarAlerta(this.errorMessage, 'error');
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando CxC:', err);
        this.errorMessage = 'Error al cargar cuentas por cobrar';
        this.mostrarAlerta(this.errorMessage, 'error');
        this.isLoading = false;
      }
    });
  }

  // ===== Eventos del grid =====
  onGridReady(e: GridReadyEvent): void {
    this.gridApi = e.api;
    this.gridApi.sizeColumnsToFit();
  }

  // ===== Aplicar filtros =====
  aplicarFiltros(): void {
    this.page = 1; // Reiniciar a la primera página
    this.cargarDatos();
  }

  // ===== Limpiar filtros =====
  limpiarFiltros(): void {
    this.formFiltros.reset({
      fechaDesde: null,
      fechaHasta: null,
      saldoMinimo: 0.01
    });
    this.page = 1;
    this.cargarDatos();
  }

  // ===== Paginación =====
  irPaginaSiguiente(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.cargarDatos();
    }
  }

  irPaginaAnterior(): void {
    if (this.page > 1) {
      this.page--;
      this.cargarDatos();
    }
  }

  // ===== Cancelar / Limpiar =====
  cancelar(): void {
    this.limpiarFiltros();
    this.rowData = [];
    this.gridApi?.setGridOption('rowData', []);
  }

  // ===== Exportar a Excel =====
  async exportarExcel(): Promise<void> {
    if (!this.rowData || this.rowData.length === 0) {
      this.mostrarAlerta('No hay datos para exportar', 'info');
      return;
    }

    // Obtener datos completos (sin paginación)
    this.isLoading = true;
    const filtros = this.formFiltros.value;
    const fechaDesde = filtros.fechaDesde 
      ? this.estadoCuentaService.formatDateForApi(filtros.fechaDesde) 
      : undefined;
    const fechaHasta = filtros.fechaHasta 
      ? this.estadoCuentaService.formatDateForApi(filtros.fechaHasta) 
      : undefined;

    this.estadoCuentaService.getClientesConDeudaCompleto({
      fechaDesde,
      fechaHasta,
      saldoMinimo: filtros.saldoMinimo || 0.01
    }).subscribe({
      next: async (response) => {
        if (response.type === 'success' && response.data) {
          await this.generarExcel(response.data.clientes, response.data.resumen);
          this.mostrarAlerta('Excel generado correctamente', 'ok');
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error exportando:', err);
        this.mostrarAlerta('Error al exportar a Excel', 'error');
        this.isLoading = false;
      }
    });
  }

  private async generarExcel(clientes: ClienteConDeudaDto[], resumen: any): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('CxC General');

    ws.columns = [
      { header: 'Código', key: 'codigo', width: 12 },
      { header: 'Cliente', key: 'nombre', width: 40 },
      { header: 'Saldo Total', key: 'saldo_total', width: 16 },
      { header: 'Cant. Facturas', key: 'cantidad_facturas', width: 14 },
      { header: 'Días Prom. Venc.', key: 'dias_promedio_vencimiento', width: 16 },
      { header: 'Factura Más Antigua', key: 'factura_mas_antigua', width: 18 }
    ];

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    };

    let currentRow = 1;
    const nextRow = () => ws.getRow(currentRow++);

    // TÍTULO
    const tituloRow = nextRow();
    tituloRow.getCell(1).value = 'EXPLORADOR GENERAL - CUENTAS POR COBRAR';
    ws.mergeCells(tituloRow.number, 1, tituloRow.number, 6);
    tituloRow.height = 24;
    tituloRow.eachCell(cell => {
      cell.font = { bold: true, size: 16, color: { argb: 'FF002C6C' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    currentRow++;

    // FECHA REPORTE
    const rowFec = nextRow();
    rowFec.getCell(1).value = 'Fecha del reporte:';
    rowFec.getCell(2).value = this.hoy.toLocaleDateString('es-EC');
    ws.mergeCells(rowFec.number, 2, rowFec.number, 6);

    currentRow++;

    // CABECERA TABLA
    const headerRow = nextRow();
    headerRow.values = ['Código', 'Cliente', 'Saldo Total', 'Cant. Facturas', 'Días Prom. Venc.', 'Factura Más Antigua'];
    headerRow.height = 18;
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D789F' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });

    const firstDetailRow = headerRow.number + 1;

    // DETALLE
    clientes.forEach(c => {
      const row = nextRow();
      row.values = [
        c.codigo,
        c.nombre,
        c.saldo_total,
        c.cantidad_facturas,
        c.dias_promedio_vencimiento,
        c.factura_mas_antigua ? this.formatFecha(c.factura_mas_antigua) : '—'
      ];
    });

    const lastDetailRow = currentRow - 1;

    // FORMATO ZEBRA
    for (let i = firstDetailRow; i <= lastDetailRow; i++) {
      const row = ws.getRow(i);
      const isEven = (i - firstDetailRow) % 2 === 1;

      [1, 2, 3, 4, 5, 6].forEach(col => {
        const cell = row.getCell(col);
        cell.border = thinBorder;
        if (isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } };
        }
        if ([3, 4, 5].includes(col) && typeof cell.value === 'number') {
          cell.numFmt = col === 3 ? '#,##0.00' : '0';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });
    }

    // RESUMEN
    currentRow++;
    const totTitleRow = nextRow();
    totTitleRow.getCell(1).value = 'RESUMEN';
    ws.mergeCells(totTitleRow.number, 1, totTitleRow.number, 2);
    totTitleRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF5' } };
      cell.border = thinBorder;
    });

    const rowTotClientes = nextRow();
    rowTotClientes.getCell(1).value = 'Total Clientes:';
    rowTotClientes.getCell(2).value = resumen.total_clientes;

    const rowTotMonto = nextRow();
    rowTotMonto.getCell(1).value = 'Monto Total:';
    rowTotMonto.getCell(2).value = resumen.monto_total;
    rowTotMonto.getCell(2).numFmt = '#,##0.00';

    const rowTotFacturas = nextRow();
    rowTotFacturas.getCell(1).value = 'Total Facturas:';
    rowTotFacturas.getCell(2).value = resumen.total_facturas;

    const rowPromedio = nextRow();
    rowPromedio.getCell(1).value = 'Promedio por Cliente:';
    rowPromedio.getCell(2).value = resumen.promedio_deuda_por_cliente;
    rowPromedio.getCell(2).numFmt = '#,##0.00';

    const nombreArchivo = `explorador_cxc_general_${this.hoy.toISOString().substring(0, 10)}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, nombreArchivo);
  }

  // ===== Exportar a PDF =====
  async exportarPdf(): Promise<void> {
    if (!this.rowData || this.rowData.length === 0) {
      this.mostrarAlerta('No hay datos para exportar', 'info');
      return;
    }

    // Similar a Excel, obtener datos completos
    this.isLoading = true;
    const filtros = this.formFiltros.value;
    const fechaDesde = filtros.fechaDesde 
      ? this.estadoCuentaService.formatDateForApi(filtros.fechaDesde) 
      : undefined;
    const fechaHasta = filtros.fechaHasta 
      ? this.estadoCuentaService.formatDateForApi(filtros.fechaHasta) 
      : undefined;

    this.estadoCuentaService.getClientesConDeudaCompleto({
      fechaDesde,
      fechaHasta,
      saldoMinimo: filtros.saldoMinimo || 0.01
    }).subscribe({
      next: async (response) => {
        if (response.type === 'success' && response.data) {
          await this.generarPdf(response.data.clientes, response.data.resumen);
          this.mostrarAlerta('PDF generado correctamente', 'ok');
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error exportando:', err);
        this.mostrarAlerta('Error al exportar a PDF', 'error');
        this.isLoading = false;
      }
    });
  }

  private async generarPdf(clientes: ClienteConDeudaDto[], resumen: any): Promise<void> {
    const doc = new jsPDF('l', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 40;
    let cursorY = 40;

    // TÍTULO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 44, 108);
    doc.text('EXPLORADOR GENERAL - CUENTAS POR COBRAR', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 30;

    // FECHA
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha del reporte: ${this.hoy.toLocaleDateString('es-EC')}`, marginLeft, cursorY);
    cursorY += 24;

    // TABLA
    const body = clientes.map(c => [
      String(c.codigo),
      c.nombre,
      c.saldo_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      String(c.cantidad_facturas),
      String(c.dias_promedio_vencimiento),
      c.factura_mas_antigua ? this.formatFecha(c.factura_mas_antigua) : '—'
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [['Código', 'Cliente', 'Saldo Total', 'Cant. Facturas', 'Días Prom. Venc.', 'Factura Más Antigua']],
      body,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [29, 120, 159], textColor: [255, 255, 255], halign: 'center' },
      alternateRowStyles: { fillColor: [247, 249, 252] },
      columnStyles: {
        0: { cellWidth: 60, halign: 'right' },
        1: { cellWidth: 240 },
        2: { cellWidth: 90, halign: 'right' },
        3: { cellWidth: 80, halign: 'right' },
        4: { cellWidth: 80, halign: 'right' },
        5: { cellWidth: 100 }
      },
      margin: { left: marginLeft, right: marginLeft }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || cursorY;

    // RESUMEN
    let yTotales = finalY + 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RESUMEN', marginLeft, yTotales);
    yTotales += 16;

    doc.setFontSize(10);
    doc.text(`Total Clientes: ${resumen.total_clientes}`, marginLeft, yTotales);
    yTotales += 14;
    doc.text(`Monto Total: ${this.usd(resumen.monto_total)}`, marginLeft, yTotales);
    yTotales += 14;
    doc.text(`Total Facturas: ${resumen.total_facturas}`, marginLeft, yTotales);
    yTotales += 14;
    doc.text(`Promedio por Cliente: ${this.usd(resumen.promedio_deuda_por_cliente)}`, marginLeft, yTotales);

    const nombreArchivo = `explorador_cxc_general_${this.hoy.toISOString().substring(0, 10)}.pdf`;
    doc.save(nombreArchivo);
  }

  // ===== Utilidades =====
  usd(v: number): string {
    if (v == null) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(v);
  }

  formatFecha(isoDate: string): string {
    if (!isoDate) return '—';
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-EC');
  }

  mostrarAlerta(mensaje: string, tipo: 'info' | 'error' | 'ok'): void {
    this._snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: tipo === 'error' ? ['snack-error'] : tipo === 'ok' ? ['snack-ok'] : ['snack-info']
    });
  }
}