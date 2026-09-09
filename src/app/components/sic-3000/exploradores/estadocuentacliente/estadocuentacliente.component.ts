import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  ColDef,
  GridApi,
  GridOptions,
  GridReadyEvent
} from 'ag-grid-community';

import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { AgGridAngular } from 'ag-grid-angular';

import { of, firstValueFrom } from 'rxjs';
import {
  startWith,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map,
  catchError,
  finalize,
  take
} from 'rxjs/operators';

import { ClienteService, ClienteIndividual } from 'src/app/services/cliente.service';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { LogoService } from 'src/app/services/logo.service';

import { Cliente } from 'src/app/interfaces/cliente';
import { ClienteSummary } from 'src/app/interfaces/responses/cliente-summary-response';

import {
  EstadoCuentaService,
  SaldoFacturaDetalladoResponse,
  SaldoFacturaItemResponse,
} from 'src/app/services/estado-cuenta.service';

import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EstadoCuentaRow {
  factura: string;
  documento: string;
  fecha: string;
  tipoDocumento: string;   // F, P, A, NC (o lo que venga)
  valor: number;
  pago: number;
  debe: number;
  haber: number;
  saldo: number;
  observacion: string;
  saldoFactura?: number | null; // valor de la factura (solo en la fila F)
}

@Component({
  selector: 'app-estadocuentacliente',
  standalone: true,
  templateUrl: './estadocuentacliente.component.html',
  styleUrls: ['./estadocuentacliente.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatInputModule,
    MatOptionModule,
    MatMenuModule,
    MatButtonModule,
    AgGridAngular
  ]
})
export class EstadocuentaclienteComponent implements OnInit,OnDestroy {

  hoy: Date = new Date();
  clienteE!: ClienteIndividual;
  clienteSeleccionado: Cliente | null = null;

  // Autocomplete
  clienteOrigenControl = new FormControl<ClienteSummary | string | null>(null, Validators.required);
  clientesOrigenFiltrados: ClienteSummary[] = [];
  mostrarNombreCliente = (cliente: ClienteSummary | string | null): string =>
    cliente && typeof cliente === 'object'
      ? (cliente.nomcli ?? '')
      : (cliente ?? '') as string;

  // filtros de fecha (solo visuales por ahora)
  fechaDesde: string = '';
  fechaHasta: string = '';
  usuarioActual = this.usuarioService.getUsuarioActual();

  // cliente a consultar
  clienteCodigo: number | null = null;

  // AG Grid API
  private gridApi!: GridApi;

  // se llenará con los datos que vengan del servicio
  clientes: Cliente[] = [];

  // opciones de impresión
  opcionesImpresionVisibles = false;

  // flags
  loading = false;
  errorMessage = '';

  // datos del grid
  rowData: EstadoCuentaRow[] = [];

  // código de cliente seleccionado desde el autocomplete
  codcliO = 0;

  // ✅ GridOptions (IMPORTANTE: úselo en el HTML con [gridOptions]="gridOptions")
  gridOptions: GridOptions = {
    getRowId: (p) => this.buildRowKey(p.data as EstadoCuentaRow)
  };

  // formateador de moneda para AG Grid
  monedaFormatter = (params: any) => {
    if (params.value == null || params.value === '') return '';
    const valor = Number(params.value);
    return valor.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // columnas AG-Grid
  columnDefs: ColDef[] = [
    { headerName: 'Factura', field: 'factura', width: 200 },
    { headerName: 'Documento', field: 'documento', width: 200 },
    { headerName: 'Fecha', field: 'fecha', width: 110 },
    { headerName: 'Tipo Doc', field: 'tipoDocumento', width: 100 },
    { headerName: 'Debe', field: 'debe', type: 'numericColumn', valueFormatter: this.monedaFormatter, width: 110 },
    { headerName: 'Haber', field: 'haber', type: 'numericColumn', valueFormatter: this.monedaFormatter, width: 110 },
    { headerName: 'Saldo Factura', field: 'saldoFactura', type: 'numericColumn', valueFormatter: this.monedaFormatter, width: 130 },
    { headerName: 'Saldo', field: 'saldo', type: 'numericColumn', valueFormatter: this.monedaFormatter, width: 110 },
    {
      headerName: 'Observación',
      field: 'observacion',
      flex: 1,
      minWidth: 220,
      tooltipField: 'observacion'
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    cellClass: 'celda-centro'
  };

  constructor(
    private estadoCuentaService: EstadoCuentaService,
    private clienteService: ClienteService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private logoService: LogoService,
    private usuarioService: UsuarioService
  ) { }

  ngOnInit(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    this.logoService.loadLogoFromEmpresa(this.usuarioActual?.id_empresa ?? 1);

    // 🔎 Autocomplete de clientes
    this.clienteOrigenControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        const termino = typeof value === 'string' ? value : value?.nomcli ?? '';
        if (!termino || termino.length < 3) return of<ClienteSummary[]>([]);

        return this.clienteService.getClientesSummary(termino).pipe(
          map(resp => resp.data ?? []),
          catchError(() => of<ClienteSummary[]>([]))
        );
      })
    ).subscribe(clientes => {
      this.clientesOrigenFiltrados = clientes;
    });
    // *** CARGAR CLIENTE QUE VENGA DE OTRA PANTALLA ***
    this.cargarClienteInv();
  }
  // ===== Limpiar cliente al destruir componente =====
  ngOnDestroy(): void {
    // Limpiar el cliente seleccionado al salir del explorador general
    this.clienteSeleccionadoService.limpiar();
  }

  cargarClienteInv(): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    console.log('[ClienteSeleccionadoService] actual →', cliente);

    if (cliente) {
      this.clienteSeleccionado = cliente;
      this.applyClienteSeleccion(cliente);
      
      // *** LIMPIAR INMEDIATAMENTE DESPUÉS DE USARLO ***
      // Esto evita que se vuelva a cargar si se refresca la pagina o se vuelve a entrar
      this.clienteSeleccionadoService.limpiar();
    }
  }
  private applyClienteSeleccion(c: any): void {
  const codigo = this.getCodigoCliente(c);
  const nombre = this.getNombreCliente(c);
  if (!codigo) return;

  this.codcliO = codigo;
  this.clienteSeleccionado = c;

  // Actualizar el autocomplete con el nombre del cliente
  this.clienteOrigenControl.setValue(nombre || c, { emitEvent: false });

  // Cargar el estado de cuenta del cliente
  this.estadoCuentaService
    .getSaldoFacturasPorCliente(codigo, true, 1, 50)
    .pipe(finalize(() => (this.loading = false)))
    .subscribe({
      next: resp => {
        if (resp.type !== 'success' || !resp.data) {
          this.errorMessage = resp.message || 'Error al consultar el estado de cuenta.';
          this.rowData = [];
          return;
        }

        const data: SaldoFacturaDetalladoResponse = resp.data;
        const cli = data.resumenPorCliente.items?.[0];

        if (!cli) {
          this.errorMessage = 'No se encontraron datos para el cliente.';
          this.rowData = [];
          this.mostrarAlerta('El cliente no tiene movimientos en el estado de cuenta', 'info');
          return;
        }

        // Mapeo + normalización (tipo doc)
        const rowsRaw: EstadoCuentaRow[] = (cli.detalle ?? []).map((item: SaldoFacturaItemResponse) => ({
          factura: item.numeroFactura ?? '',
          documento: item.numeroDocumento ?? '',
          fecha: item.fecha ?? '',
          tipoDocumento: this.normalizarTipoDoc(item),
          valor: 0,
          pago: 0,
          debe: item.debe ?? 0,
          haber: item.haber ?? 0,
          saldo: item.saldoLinea ?? 0,
          observacion: (item.observacion ?? '').trim(),
          saldoFactura: null
        }));

        // Deduplicación robusta
        const rowsSinDuplicados = this.dedupeRows(rowsRaw);

        // saldoFactura por factura
        this.rowData = this.calcularSaldoPorFactura(rowsSinDuplicados);

        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', this.rowData);
        }

        if (this.rowData.length === 0) {
          this.mostrarAlerta('El cliente no tiene movimientos en el estado de cuenta', 'info');
        }
      },
      error: err => {
        console.error(err);
        this.errorMessage = 'No tiene información';
        this.rowData = [];
        this.mostrarAlerta('Error al cargar el estado de cuenta del cliente', 'error');
      }
    });
}

private getCodigoCliente(c: any): number {
  return Number(
    c?.clientes_codigo ??
    c?.cliente_codigo ??
    c?.codigoCliente ??
    c?.id ??
    0
  );
}

private getNombreCliente(c: any): string {
  return String(
    c?.nomcli ??
    c?.nombre ??
    c?.cliente ??
    c?.razon_social ??
    ''
  ).trim();
}
  get clienteActual(): Cliente | null {
    return this.clientes.length > 0 ? this.clientes[0] : null;
  }

  get totalDebe(): number {
    return this.rowData.reduce((acc, r) => acc + (r.debe || 0), 0);
  }

  get totalHaber(): number {
    return this.rowData.reduce((acc, r) => acc + (r.haber || 0), 0);
  }

  get totalSaldo(): number {
    return this.totalDebe - this.totalHaber;
  }
  
  mostrarAlerta(mensaje: string, tipo: 'info' | 'error' | 'ok'): void {
    // Puede ser un snackbar, toast, alert, etc.
    console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
  }

  /** ✅ Llamada al API */
  private cargarEstadoCuenta(): void {
    if (this.loading) return;
    this.loading = true;
    this.errorMessage = '';

    const codigoCliente =
      this.clienteSeleccionado?.clientes_codigo
      ?? this.codcliO
      ?? 0;

    this.estadoCuentaService
      .getSaldoFacturasPorCliente(codigoCliente, true, 1, 50)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: resp => {
          if (resp.type !== 'success' || !resp.data) {
            this.errorMessage = resp.message || 'Error al consultar el estado de cuenta.';
            this.rowData = [];
            return;
          }

          const data: SaldoFacturaDetalladoResponse = resp.data;
          const cli = data.resumenPorCliente.items?.[0];

          if (!cli) {
            this.errorMessage = 'No se encontraron datos para el cliente.';
            this.rowData = [];
            return;
          }

          // 1) Mapeo + normalización (tipo doc)
          const rowsRaw: EstadoCuentaRow[] = (cli.detalle ?? []).map((item: SaldoFacturaItemResponse) => ({
            factura: item.numeroFactura ?? '',
            documento: item.numeroDocumento ?? '',
            fecha: item.fecha ?? '',
            tipoDocumento: this.normalizarTipoDoc(item),
            valor: 0,
            pago: 0,
            debe: item.debe ?? 0,
            haber: item.haber ?? 0,
            saldo: item.saldoLinea ?? 0,
            observacion: (item.observacion ?? '').trim(),
            saldoFactura: null
          }));

          // 2) ✅ Deduplicación robusta (evita “dobles” por fecha con hora/zona)
          const rowsSinDuplicados = this.dedupeRows(rowsRaw);

          // 3) saldoFactura por factura
          this.rowData = this.calcularSaldoPorFactura(rowsSinDuplicados);

          if (this.gridApi) {
  this.gridApi.setGridOption('rowData', this.rowData);
}
        },
        error: err => {
          console.error(err);
          this.errorMessage = 'No tiene información';
          this.rowData = [];
        }
      });
  }

  /** API: "FACTURA"/"PAGO" => 'F'/'P'  | fallback: tipDoc */
  private normalizarTipoDoc(item: SaldoFacturaItemResponse): string {
    const tipoApi = String((item as any).tipoDocumento ?? '').toUpperCase().trim();
    if (tipoApi.startsWith('FAC')) return 'F';
    if (tipoApi.startsWith('PAG')) return 'P';

    const tipDoc = String((item as any).tipDoc ?? '').toUpperCase().trim();
    return tipDoc;
  }

  // ========= DEDUPE ROBUSTO =========

  /** Para dedupe y rowId: fecha solo YYYY-MM-DD (aunque venga con hora / ISO) */
  private fechaKey(fecha: string): string {
    if (!fecha) return '';

    // ISO típico: 2026-01-07T00:00:00...
    if (fecha.length >= 10 && fecha[4] === '-' && fecha[7] === '-') {
      return fecha.slice(0, 10);
    }

    // dd/MM/yyyy
    const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(fecha);
    if (m) {
      const dd = m[1], mm = m[2], yyyy = m[3];
      return `${yyyy}-${mm}-${dd}`;
    }

    // último recurso
    return String(fecha).trim();
  }

  private n2(v: any): string {
    const num = Number(v ?? 0);
    // redondeo a 2 decimales para evitar 173.6 vs 173.6000000003
    return (Math.round(num * 100) / 100).toFixed(2);
  }

private buildRowKey(r: EstadoCuentaRow): string {
  // ✅ OJO: NO incluimos saldo (porque puede variar y causa "duplicados visuales")
  return [
    r.factura ?? '',
    r.documento ?? '',
    this.fechaKey(r.fecha ?? ''),
    (r.tipoDocumento ?? '').toUpperCase().trim(),
    this.n2(r.debe),
    this.n2(r.haber),
    (r.observacion ?? '').trim()
  ].join('|');
}

private pickBestDuplicate(a: EstadoCuentaRow, b: EstadoCuentaRow): EstadoCuentaRow {
  // ✅ Preferir el registro cuyo saldo esté más cerca de 0 (ej. 0 mejor que -173.60)
  const absA = Math.abs(Number(a.saldo ?? 0));
  const absB = Math.abs(Number(b.saldo ?? 0));

  if (absA !== absB) return absA < absB ? a : b;

  // Si empatan, preferir el que tenga fecha "más limpia" o el último (b)
  return b;
}

private dedupeRows(rows: EstadoCuentaRow[]): EstadoCuentaRow[] {
  const map = new Map<string, EstadoCuentaRow>();
  const order: string[] = [];

  for (const r of (rows ?? [])) {
    const key = this.buildRowKey(r);

    if (!map.has(key)) {
      map.set(key, r);
      order.push(key);
      continue;
    }

    const current = map.get(key)!;
    map.set(key, this.pickBestDuplicate(current, r));
  }

  // Mantener el orden original
  return order.map(k => map.get(k)!);
}


  // ========= SALDO FACTURA =========

  private calcularSaldoPorFactura(rows: EstadoCuentaRow[]): EstadoCuentaRow[] {
    const mapFacturas = new Map<string, { debe: number; haber: number }>();

    for (const row of rows) {
      if (!mapFacturas.has(row.factura)) {
        mapFacturas.set(row.factura, { debe: 0, haber: 0 });
      }
      const acum = mapFacturas.get(row.factura)!;
      acum.debe += row.debe || 0;
      acum.haber += row.haber || 0;
    }

    rows.forEach(r => (r.saldoFactura = null));

    for (const factura of Array.from(mapFacturas.keys())) {
      const resumen = mapFacturas.get(factura)!;
      const valorFactura = resumen.debe;

      let indexFactura = rows.findIndex(
        r => r.factura === factura && r.tipoDocumento === 'F'
      );

      if (indexFactura === -1) {
        const indicesFactura = rows
          .map((r, index) => ({ r, index }))
          .filter(x => x.r.factura === factura)
          .map(x => x.index);

        if (indicesFactura.length > 0) indexFactura = indicesFactura[0];
      }

      if (indexFactura !== -1) {
        rows[indexFactura].saldoFactura = valorFactura;
      }
    }

    rows.forEach(r => {
      if (r.saldoFactura == null) r.saldoFactura = 0;
    });

    return rows;
  }

  // ========= GRID =========

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  nuevaConsulta(): void {
    this.cargarClienteInv();
    this.cargarEstadoCuenta();
  }

  toggleOpcionesImpresion(): void {
    this.opcionesImpresionVisibles = !this.opcionesImpresionVisibles;
  }

  cancelar(): void {
    this.rowData = [];
    if (this.gridApi) {
      this.gridApi.deselectAll();
      this.gridApi.refreshCells({ force: true });
    }

    this.clienteSeleccionado = null;
    this.codcliO = 0;
    this.clientesOrigenFiltrados = [];

    this.clienteOrigenControl.reset(null);
    this.clienteOrigenControl.markAsPristine();
    this.clienteOrigenControl.markAsUntouched();

    this.errorMessage = '';
    this.opcionesImpresionVisibles = false;  
    this.clienteSeleccionadoService.limpiar();
  }

  formatNumero(value: number): string {
    if (value == null) return '';
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  seleccionarClienteOrigen(cliente: ClienteSummary): void {
    if (!cliente?.clientes_codigo) return;

    this.codcliO = cliente.clientes_codigo;

    this.clienteSeleccionado = {
      clientes_codigo: cliente.clientes_codigo,
      nomcli: cliente.nomcli,
      ruc: cliente.ruc
    } as any;

    this.clienteOrigenControl.setValue(cliente);
    this.cargarEstadoCuenta();
  }

  // ========= PDF / EXCEL (SIN CAMBIOS FUNCIONALES) =========

  async exportarPdf(): Promise<void> {
    if (!this.rowData || this.rowData.length === 0) {
      alert('No hay información para exportar.');
      return;
    }

    const cli = this.clienteSeleccionado;

    const doc = new jsPDF('l', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 40;
    let cursorY = 40;

    const logoDataUrl = await this.cargarLogoBase64();
    const logoHeight = 50;
    const logoWidth = 120;

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', marginLeft, cursorY, logoWidth, logoHeight);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 44, 108);
    doc.text('ESTADO DE CUENTA', pageWidth / 2, cursorY + 30, { align: 'center' });

    cursorY += logoHeight + 25;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    if (cli) {
      doc.text(`Cliente: ${cli.nomcli}`, marginLeft, cursorY);
      cursorY += 16;
      doc.text(`Ruc: ${cli.ruc ?? ''}`, marginLeft, cursorY);
      cursorY += 16;
    }

    doc.text(`Fecha del reporte: ${this.hoy.toLocaleDateString('es-EC')}`, marginLeft, cursorY);
    cursorY += 24;

    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, cursorY, pageWidth - marginLeft, cursorY);
    cursorY += 10;

    const body = this.rowData.map(r => ([
      r.factura,
      r.documento,
      r.fecha,
      r.tipoDocumento,
      r.debe != null ? r.debe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
      r.haber != null ? r.haber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
      r.saldoFactura != null ? r.saldoFactura.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
      r.saldo != null ? r.saldo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
      r.observacion || ''
    ]));

    autoTable(doc, {
      startY: cursorY,
      head: [[
        'Factura', 'Documento', 'Fecha', 'Tipo Doc', 'Debe', 'Haber', 'Saldo Factura', 'Saldo', 'Observación'
      ]],
      body,
      styles: { fontSize: 8, cellPadding: 3, halign: 'left' },
      headStyles: { fillColor: [29, 120, 159], textColor: [255, 255, 255], halign: 'center' },
      alternateRowStyles: { fillColor: [247, 249, 252] },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 80 },
        2: { cellWidth: 55 },
        3: { cellWidth: 40, halign: 'center' },
        4: { cellWidth: 60, halign: 'right' },
        5: { cellWidth: 60, halign: 'right' },
        6: { cellWidth: 70, halign: 'right' },
        7: { cellWidth: 60, halign: 'right' },
        8: { cellWidth: 150 }
      },
      margin: { left: marginLeft, right: marginLeft },
      didDrawPage: () => {
        const str = `Página ${doc.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(str, pageWidth - marginLeft, pageHeight - 10, { align: 'right' });
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || cursorY;

    let yTotales = finalY + 20;
    if (yTotales + 60 > pageHeight) {
      doc.addPage('l');
      yTotales = 60;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL GENERAL', marginLeft, yTotales);
    yTotales += 12;

    const labelX = pageWidth - 160;
    const valueX = pageWidth - marginLeft;
    const formatNum = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    doc.setFontSize(10);

    doc.text('Debe:', labelX, yTotales);
    doc.text(formatNum(this.totalDebe), valueX, yTotales, { align: 'right' });

    yTotales += 14;
    doc.text('Haber:', labelX, yTotales);
    doc.text(formatNum(this.totalHaber), valueX, yTotales, { align: 'right' });

    yTotales += 14;
    doc.text('Saldo:', labelX, yTotales);
    doc.text(formatNum(this.totalSaldo), valueX, yTotales, { align: 'right' });

    const nombreArchivo = `estado_cuenta_${cli?.clientes_codigo ?? ''}_${this.hoy.toISOString().substring(0, 10)}.pdf`;
    doc.save(nombreArchivo);

    this.opcionesImpresionVisibles = false;
  }

  async exportarExcel(): Promise<void> {
    if (!this.rowData || this.rowData.length === 0) {
      alert('No hay información para exportar.');
      return;
    }

    const cli = this.clienteSeleccionado;
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('EstadoCuenta');

    ws.columns = [
      { header: 'Factura', key: 'factura', width: 18 },
      { header: 'Documento', key: 'documento', width: 14 },
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Tipo Doc', key: 'tipoDoc', width: 10 },
      { header: 'Debe', key: 'debe', width: 12 },
      { header: 'Haber', key: 'haber', width: 12 },
      { header: 'Saldo Factura', key: 'saldoFactura', width: 14 },
      { header: 'Saldo', key: 'saldo', width: 12 },
      { header: 'Observación', key: 'observacion', width: 60 },
    ];

    const allCols = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };

    let currentRow = 1;
    const nextRow = () => ws.getRow(currentRow++);

    const tituloRow = nextRow();
    tituloRow.getCell(1).value = 'ESTADO DE CUENTA';
    ws.mergeCells(tituloRow.number, 1, tituloRow.number, 9);
    tituloRow.height = 22;
    tituloRow.eachCell(cell => {
      cell.font = { bold: true, size: 16, color: { argb: 'FF002C6C' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    currentRow++;

    if (cli) {
      const rowCli = nextRow();
      rowCli.getCell(1).value = 'Cliente:';
      rowCli.getCell(2).value = cli.nomcli;
      ws.mergeCells(rowCli.number, 2, rowCli.number, 9);

      const rowTel = nextRow();
      rowTel.getCell(1).value = 'Ruc:';
      rowTel.getCell(2).value = cli.ruc ?? '';
      ws.mergeCells(rowTel.number, 2, rowTel.number, 9);

      const rowFec = nextRow();
      rowFec.getCell(1).value = 'Fecha del reporte:';
      rowFec.getCell(2).value = this.hoy.toLocaleDateString('es-EC');
      ws.mergeCells(rowFec.number, 2, rowFec.number, 9);

      [rowCli, rowTel, rowFec].forEach(r => {
        r.eachCell((cell, col) => {
          if (col === 1) cell.font = { bold: true, size: 11, color: { argb: 'FF002C6C' } };
          else cell.font = { size: 11 };
        });
      });
    } else {
      const rowFec = nextRow();
      rowFec.getCell(1).value = 'Fecha del reporte:';
      rowFec.getCell(2).value = this.hoy.toLocaleDateString('es-EC');
      ws.mergeCells(rowFec.number, 2, rowFec.number, 9);
    }

    currentRow++;

    const headerRow = nextRow();
    const headerIdx = headerRow.number;
    headerRow.values = [
      'Factura', 'Documento', 'Fecha', 'Tipo Doc', 'Debe', 'Haber', 'Saldo Factura', 'Saldo', 'Observación'
    ];

    headerRow.height = 18;
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D789F' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });

    const firstDetailRow = headerIdx + 1;

    this.rowData.forEach(r => {
      const row = nextRow();
      row.values = [
        r.factura,
        r.documento,
        r.fecha,
        r.tipoDocumento,
        r.debe,
        r.haber,
        r.saldoFactura,
        r.saldo,
        r.observacion
      ];
    });

    const lastDetailRow = currentRow - 1;

    for (let i = firstDetailRow; i <= lastDetailRow; i++) {
      const row = ws.getRow(i);
      const isEven = (i - firstDetailRow) % 2 === 1;

      allCols.forEach(col => {
        const cell = row.getCell(col);
        cell.border = thinBorder;

        if (isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } };
        }

        if ([5, 6, 7, 8].includes(col) && typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }

        if (col === 9) {
          cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        }
      });
    }

    currentRow++;
    const totTitleRow = nextRow();
    const totTitleIdx = totTitleRow.number;
    totTitleRow.getCell(1).value = 'TOTAL GENERAL';
    ws.mergeCells(totTitleIdx, 1, totTitleIdx, 3);
    totTitleRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF5' } };
      cell.border = thinBorder;
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    });

    const rowTotDebe = nextRow();
    rowTotDebe.getCell(1).value = 'Debe:';
    rowTotDebe.getCell(2).value = this.totalDebe;

    const rowTotHaber = nextRow();
    rowTotHaber.getCell(1).value = 'Haber:';
    rowTotHaber.getCell(2).value = this.totalHaber;

    const rowTotSaldo = nextRow();
    rowTotSaldo.getCell(1).value = 'Saldo:';
    rowTotSaldo.getCell(2).value = this.totalSaldo;

    [rowTotDebe, rowTotHaber, rowTotSaldo].forEach(r => {
      r.getCell(1).font = { bold: true };
      r.getCell(2).font = { bold: true };
      r.getCell(1).border = thinBorder;
      r.getCell(2).border = thinBorder;
      r.getCell(2).numFmt = '#,##0.00';
      r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
      r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
    });

    try {
      const logoUrl = await firstValueFrom(this.logoService.logoUrl$.pipe(take(1)));
      if (logoUrl) {
        const resp = await fetch(logoUrl);
        const buffer = await resp.arrayBuffer();

        const imageId = workbook.addImage({ buffer, extension: 'png' });
        ws.addImage(imageId, {
          tl: { col: 8, row: 2 },
          ext: { width: 180, height: 60 }
        } as any);
      }
    } catch (e) {
      console.warn('No se pudo cargar el logo para el Excel:', e);
    }

    const nombreArchivo = `estado_cuenta_${cli?.clientes_codigo ?? ''}_${this.hoy.toISOString().substring(0, 10)}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, nombreArchivo);

    this.opcionesImpresionVisibles = false;
  }

  private async cargarLogoBase64(): Promise<string | null> {
    try {
      const logoUrl = await firstValueFrom(this.logoService.logoUrl$.pipe(take(1)));
      if (!logoUrl) return null;

      const resp = await fetch(logoUrl);
      const blob = await resp.blob();

      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = err => reject(err);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('No se pudo cargar el logo para el PDF:', e);
      return null;
    }
  }
}
