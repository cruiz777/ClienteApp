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
import { 
  EstadoCuentaService, 
  ClienteEstadoCuentaDto, 
  EstadoCuentaGeneralPaginadoResponse,
  ResumenEstadoCuentaResponse
} from 'src/app/services/estado-cuenta.service';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Router } from '@angular/router';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';


@Component({
  selector: 'app-estado-cuenta-general',
  standalone: true,
  templateUrl: './estado-cuenta-general.component.html',
  styleUrl: './estado-cuenta-general.component.css',
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
export class EstadoCuentaGeneralComponent implements OnInit {

  // ===== Estado general =====
  step = 1;
  hoy = new Date();
  isLoading = false;
  errorMessage = '';

  formFiltros!: FormGroup;
  logoUrl = 'assets/logo/GS1-logo.png';
  
  // ===== Grid AG-Grid =====
  private gridApi!: GridApi;
  
  columnDefs: ColDef[] = [
    { 
      headerName: 'Código', 
      field: 'codigo', 
      width: 110, 
      pinned: 'left',
      type: 'rightAligned'
    },
    { 
      headerName: 'Cliente', 
      field: 'nombre', 
      minWidth: 300,
      flex: 1
    },
    {
      headerName: 'Total Debe',
      field: 'total_debe',
      width: 140, 
      type: 'centerAligned',
      valueFormatter: p => this.usd(p.value),
      cellClass: 'text-success'
    },
    {
      headerName: 'Total Haber',
      field: 'total_haber',
      width: 140, 
      type: 'centerAligned',
      valueFormatter: p => this.usd(p.value),
      cellClass: 'text-info'
    },
    {
      headerName: 'Saldo Total',
      field: 'saldo_total',
      width: 140, 
      type: 'centerAligned',
      valueFormatter: p => this.usd(p.value),
      cellClass: (params) => {
        const saldo = params.value;
        if (saldo > 0) return 'fw-bold text-danger'; // Rojo = debe dinero
        if (saldo < 0) return 'fw-bold text-success'; // Verde = a favor
        return 'fw-bold text-muted'; // Gris = saldo 0
      }
    },
    {
      headerName: 'Cant. Movimientos',
      field: 'cantidad_movimientos',
      width: 130,
      type: 'centerAligned'
    },
    {
      colId: 'acciones',
      headerName: '',
      width: 60,
      minWidth: 60,
      maxWidth: 60,
      suppressSizeToFit: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: any) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ag-btn-icon ag-btn-view';
        btn.title = 'Ver detalle del cliente';
        btn.innerHTML = '<span class="material-icons">visibility</span>';
        btn.addEventListener('click', () => {
          this.irAEstadoCuentaCliente(params.data);
        });
        return btn;
      }
    }
  ];

  defaultColDef: ColDef = { 
    resizable: true, 
    sortable: true, 
    filter: true 
  };

  rowData: ClienteEstadoCuentaDto[] = [];

  getRowId = (params: GetRowIdParams) => String(params.data.codigo);

  // ===== Resumen =====
  resumen: ResumenEstadoCuentaResponse = {
    total_clientes: 0,
    total_debe: 0,
    total_haber: 0,
    saldo_total: 0,
    total_movimientos: 0,
    promedio_saldo_por_cliente: 0
  };

  // ===== Paginación =====
  page = 1;
  pageSize = 50;
  totalItems = 0;
  totalPages = 0;

  constructor(
    private fb: FormBuilder,
    private estadoCuentaService: EstadoCuentaService,
    private _snackBar: MatSnackBar,
    private router: Router, 
    private clienteSeleccionadoService: ClienteSeleccionadoService 
  ) {}

  ngOnInit(): void {
    this.formFiltros = this.fb.group({
      fechaDesde: [null],
      fechaHasta: [null],
      saldoMinimo: [null], // null = TODOS los clientes
      busqueda: [null] 
    });

    // Cargar datos iniciales
    this.cargarDatos();
  }

  private parseBusqueda(): { ruc?: string; nombre?: string } {
    const valor = (this.formFiltros.value.busqueda || '').trim();
    if (!valor) return {};

    // Si es solo números, es RUC/cédula
    if (/^\d+$/.test(valor)) {
      return { ruc: valor };
    }

    // Si no, es nombre
    return { nombre: valor };
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

    // Donde ya tienes la llamada al servicio, reemplazar por:
    const busqueda = this.parseBusqueda();

    this.estadoCuentaService.getEstadoCuentaGeneralPaginado({
      fechaDesde,
      fechaHasta,
      saldoMinimo: filtros.saldoMinimo,
      ruc: busqueda.ruc,
      nombre: busqueda.nombre,
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
            this.mostrarAlerta('No se encontraron clientes con movimientos', 'info');
          }
        } else {
          this.errorMessage = response.message || 'Error al cargar datos';
          this.mostrarAlerta(this.errorMessage, 'error');
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando Estado de Cuenta General:', err);
        this.errorMessage = 'Error al cargar estado de cuenta general';
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
      saldoMinimo: null,
      busqueda: null
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

    const busqueda = this.parseBusqueda();

    this.estadoCuentaService.getEstadoCuentaGeneralCompleto({
      fechaDesde,
      fechaHasta,
      saldoMinimo: filtros.saldoMinimo,
      ruc: busqueda.ruc,
      nombre: busqueda.nombre,
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

  private async generarExcel(
    clientes: ClienteEstadoCuentaDto[], 
    resumen: ResumenEstadoCuentaResponse
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Estado Cuenta General');

    ws.columns = [
      { header: 'Código', key: 'codigo', width: 12 },
      { header: 'Cliente', key: 'nombre', width: 40 },
      { header: 'Total Debe', key: 'total_debe', width: 16 },
      { header: 'Total Haber', key: 'total_haber', width: 16 },
      { header: 'Saldo Total', key: 'saldo_total', width: 16 },
      { header: 'Cant. Movimientos', key: 'cantidad_movimientos', width: 16 }
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
    tituloRow.getCell(1).value = 'EXPLORADOR GENERAL - ESTADO DE CUENTA';
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
    headerRow.values = [
      'Código', 
      'Cliente', 
      'Total Debe', 
      'Total Haber', 
      'Saldo Total', 
      'Cant. Movimientos'
    ];
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
        c.total_debe,
        c.total_haber,
        c.saldo_total,
        c.cantidad_movimientos
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
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
        
        if (col === 6 && typeof cell.value === 'number') {
          cell.numFmt = '0';
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

    const rowTotDebe = nextRow();
    rowTotDebe.getCell(1).value = 'Total Debe:';
    rowTotDebe.getCell(2).value = resumen.total_debe;
    rowTotDebe.getCell(2).numFmt = '#,##0.00';

    const rowTotHaber = nextRow();
    rowTotHaber.getCell(1).value = 'Total Haber:';
    rowTotHaber.getCell(2).value = resumen.total_haber;
    rowTotHaber.getCell(2).numFmt = '#,##0.00';

    const rowSaldoTotal = nextRow();
    rowSaldoTotal.getCell(1).value = 'Saldo Total:';
    rowSaldoTotal.getCell(2).value = resumen.saldo_total;
    rowSaldoTotal.getCell(2).numFmt = '#,##0.00';

    const rowTotMovimientos = nextRow();
    rowTotMovimientos.getCell(1).value = 'Total Movimientos:';
    rowTotMovimientos.getCell(2).value = resumen.total_movimientos;

    const rowPromedio = nextRow();
    rowPromedio.getCell(1).value = 'Promedio Saldo por Cliente:';
    rowPromedio.getCell(2).value = resumen.promedio_saldo_por_cliente;
    rowPromedio.getCell(2).numFmt = '#,##0.00';

    const nombreArchivo = `estado_cuenta_general_${this.hoy.toISOString().substring(0, 10)}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, nombreArchivo);
  }

  // ===== Exportar a PDF =====
  async exportarPdf(): Promise<void> {
    if (!this.rowData || this.rowData.length === 0) {
      this.mostrarAlerta('No hay datos para exportar', 'info');
      return;
    }

    // Obtener datos completos
    this.isLoading = true;
    const filtros = this.formFiltros.value;
    const fechaDesde = filtros.fechaDesde 
      ? this.estadoCuentaService.formatDateForApi(filtros.fechaDesde) 
      : undefined;
    const fechaHasta = filtros.fechaHasta 
      ? this.estadoCuentaService.formatDateForApi(filtros.fechaHasta) 
      : undefined;

    const busqueda = this.parseBusqueda();

    this.estadoCuentaService.getEstadoCuentaGeneralCompleto({
      fechaDesde,
      fechaHasta,
      saldoMinimo: filtros.saldoMinimo,
      ruc: busqueda.ruc,
      nombre: busqueda.nombre,
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

  private async cargarLogoBase64(url: string): Promise<string | null> {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = err => reject(err);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private async generarPdf(
    clientes: ClienteEstadoCuentaDto[], 
    resumen: ResumenEstadoCuentaResponse
  ): Promise<void> {
    const doc = new jsPDF('l', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 40;
    let cursorY = 40;

    // Logo
    try {
      const logoDataUrl = await this.cargarLogoBase64(this.logoUrl);
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', marginLeft, cursorY, 80, 40);
      }
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e);
    }

    cursorY += 50;

    // TÍTULO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 44, 108);
    doc.text('EXPLORADOR GENERAL - ESTADO DE CUENTA', pageWidth / 2, cursorY, { align: 'center' });
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
      c.total_debe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      c.total_haber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      c.saldo_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      String(c.cantidad_movimientos)
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [[
        'Código', 
        'Cliente', 
        'Total Debe', 
        'Total Haber', 
        'Saldo Total', 
        'Cant. Movimientos'
      ]],
      body,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [29, 120, 159], textColor: [255, 255, 255], halign: 'center' },
      alternateRowStyles: { fillColor: [247, 249, 252] },
      columnStyles: {
        0: { cellWidth: 60, halign: 'right' },
        1: { cellWidth: 260 },
        2: { cellWidth: 90, halign: 'right' },
        3: { cellWidth: 90, halign: 'right' },
        4: { cellWidth: 90, halign: 'right' },
        5: { cellWidth: 80, halign: 'right' }
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
    doc.text(`Total Debe: ${this.usd(resumen.total_debe)}`, marginLeft, yTotales);
    yTotales += 14;
    doc.text(`Total Haber: ${this.usd(resumen.total_haber)}`, marginLeft, yTotales);
    yTotales += 14;
    doc.text(`Saldo Total: ${this.usd(resumen.saldo_total)}`, marginLeft, yTotales);
    yTotales += 14;
    doc.text(`Total Movimientos: ${resumen.total_movimientos}`, marginLeft, yTotales);
    yTotales += 14;
    doc.text(`Promedio Saldo por Cliente: ${this.usd(resumen.promedio_saldo_por_cliente)}`, marginLeft, yTotales);

    const nombreArchivo = `estado_cuenta_general_${this.hoy.toISOString().substring(0, 10)}.pdf`;
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

  // ===== Navegación al detalle del cliente =====
  irAEstadoCuentaCliente(cliente: ClienteEstadoCuentaDto): void {
    // Convertir a formato Cliente compatible
    const clienteParaEnviar = {
      clientes_codigo: cliente.codigo,
      nomcli: cliente.nombre,
    };
    
    this.clienteSeleccionadoService.seleccionar(clienteParaEnviar as any);
    this.router.navigate(['/sic-3000/exp-estadocuenta']);
  }
}