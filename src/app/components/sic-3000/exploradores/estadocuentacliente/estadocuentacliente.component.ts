import { Component, OnInit } from '@angular/core';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { finalize } from 'rxjs/operators';
import { ClienteService, ClienteIndividual } from 'src/app/services/cliente.service';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { Cliente } from 'src/app/interfaces/cliente';
import { LogoService } from 'src/app/services/logo.service';
import { firstValueFrom, of } from 'rxjs';
import { take } from 'rxjs/operators';
import { UsuarioService } from 'src/app/services/usuario.service';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClienteSummary } from 'src/app/interfaces/responses/cliente-summary-response';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  startWith,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map,
  catchError
} from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { AgGridAngular } from 'ag-grid-angular';   // 👈 IMPORTANTE

import {
  EstadoCuentaService,
  SaldoFacturaDetalladoResponse,
  SaldoFacturaItemResponse,
} from 'src/app/services/estado-cuenta.service';

interface EstadoCuentaRow {
  factura: string;
  documento: string;
  fecha: string;
  tipoDocumento: string;   // F, P, A, NC
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
    AgGridAngular            // 👈 REGISTRAR AQUÍ EL COMPONENTE DE AG GRID
  ]
})
export class EstadocuentaclienteComponent implements OnInit {

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

  // AG Grid API para exportar / paginar
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

  // formateador de moneda para AG Grid (punto decimal)
  monedaFormatter = (params: any) => {
    if (params.value == null || params.value === '') {
      return '';
    }
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
    {
      headerName: 'Tipo Doc',
      field: 'tipoDocumento',
      width: 100
    },
    {
      headerName: 'Debe',
      field: 'debe',
      type: 'numericColumn',
      valueFormatter: this.monedaFormatter,
      width: 110
    },
    {
      headerName: 'Haber',
      field: 'haber',
      type: 'numericColumn',
      valueFormatter: this.monedaFormatter,
      width: 110
    },
    {
      headerName: 'Saldo Factura',
      field: 'saldoFactura',
      type: 'numericColumn',
      valueFormatter: this.monedaFormatter,
      width: 130
    },
    {
      headerName: 'Saldo',
      field: 'saldo',
      type: 'numericColumn',
      valueFormatter: this.monedaFormatter,
      width: 110
    },
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
    this.cargarClienteInv();
    this.cargarEstadoCuenta();
    this.logoService.loadLogoFromEmpresa(this.usuarioActual?.id_empresa ?? 1);

    // 🔎 Autocomplete de clientes usando ClienteService.getClientesSummary
    this.clienteOrigenControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        const termino =
          typeof value === 'string'
            ? value
            : value?.nomcli ?? '';

        if (!termino || termino.length < 3) {
          return of<ClienteSummary[]>([]);
        }

        return this.clienteService.getClientesSummary(termino).pipe(
          map(resp => resp.data ?? []),
          catchError(() => of<ClienteSummary[]>([]))
        );
      })
    ).subscribe(clientes => {
      this.clientesOrigenFiltrados = clientes;
    });
  }

  cargarClienteInv(): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    console.log('[ClienteSeleccionadoService] actual →', cliente);

    if (cliente) {
      this.clienteSeleccionado = cliente;
    }
  }

  /** Cliente actual (primer item del arreglo) */
  get clienteActual(): Cliente | null {
    return this.clientes.length > 0 ? this.clientes[0] : null;
  }

  // Totales generales
  get totalDebe(): number {
    return this.rowData.reduce((acc, r) => acc + (r.debe || 0), 0);
  }

  get totalHaber(): number {
    return this.rowData.reduce((acc, r) => acc + (r.haber || 0), 0);
  }

  // Saldo general = Debe - Haber
  get totalSaldo(): number {
    return this.totalDebe - this.totalHaber;
  }

  /** Llamada al API /EstadoCuenta/saldo-facturas/cliente/{clienteCodigo} */
  private cargarEstadoCuenta(): void {
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
            return;
          }

          const data: SaldoFacturaDetalladoResponse = resp.data;
          const cli = data.resumenPorCliente.items[0];

          if (!cli) {
            this.errorMessage = 'No se encontraron datos para el cliente.';
            this.rowData = [];
            return;
          }

          const rows: EstadoCuentaRow[] = cli.detalle.map((item: SaldoFacturaItemResponse) => ({
            factura: item.numeroFactura,
            documento: item.numeroDocumento,
            fecha: item.fecha,
            tipoDocumento: item.tipDoc,
            valor: 0,
            pago: 0,
            debe: item.debe ?? 0,
            haber: item.haber ?? 0,
            saldo: item.saldoLinea,
            observacion: item.observacion || '',
            saldoFactura: null
          }));

          this.rowData = this.calcularSaldoPorFactura(rows);
        },
        error: err => {
          console.error(err);
          this.errorMessage = 'No tiene información';
          this.rowData = [];
        }
      });
  }

  /**
   * Muestra en la columna "Saldo Factura" el VALOR DE LA FACTURA
   * (suma de Debe por factura) SOLO en la fila cuyo tipoDocumento = 'F'.
   * En el resto de filas pone 0.
   */
  private calcularSaldoPorFactura(rows: EstadoCuentaRow[]): EstadoCuentaRow[] {
    const mapFacturas = new Map<string, { debe: number; haber: number }>();

    // 1) Acumular por factura
    for (const row of rows) {
      if (!mapFacturas.has(row.factura)) {
        mapFacturas.set(row.factura, { debe: 0, haber: 0 });
      }
      const acum = mapFacturas.get(row.factura)!;
      acum.debe += row.debe || 0;
      acum.haber += row.haber || 0;
    }

    // 2) Inicialmente, limpiar saldoFactura
    rows.forEach(r => (r.saldoFactura = null));

    // 3) Para cada factura, poner el VALOR (total Debe) en la fila F
    const facturas = Array.from(mapFacturas.keys());

    facturas.forEach(factura => {
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

        if (indicesFactura.length > 0) {
          indexFactura = indicesFactura[0];
        }
      }

      if (indexFactura !== -1) {
        rows[indexFactura].saldoFactura = valorFactura;
      }
    });

    // 4) Las demás filas a 0
    rows.forEach(r => {
      if (r.saldoFactura == null) {
        r.saldoFactura = 0;
      }
    });

    return rows;
  }

  // AG Grid listo
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

    // LOGO
    const logoDataUrl = await this.cargarLogoBase64();
    const logoHeight = 50;
    const logoWidth = 120;

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', marginLeft, cursorY, logoWidth, logoHeight);
    }

    // TÍTULO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 44, 108);
    doc.text('ESTADO DE CUENTA', pageWidth / 2, cursorY + 30, { align: 'center' });

    cursorY += logoHeight + 25;

    // DATOS CLIENTE
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    if (cli) {
      doc.text(`Cliente: ${cli.nomcli}`, marginLeft, cursorY);
      cursorY += 16;
      doc.text(`Dirección: ${cli.dircli ?? ''}`, marginLeft, cursorY);
      cursorY += 16;
      doc.text(`Teléfono: ${cli.telefono ?? ''}`, marginLeft, cursorY);
      cursorY += 16;
    }

    doc.text(`Fecha del reporte: ${this.hoy.toLocaleDateString('es-EC')}`, marginLeft, cursorY);
    cursorY += 24;

    // Línea separadora
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, cursorY, pageWidth - marginLeft, cursorY);
    cursorY += 10;

    // TABLA
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
        'Factura',
        'Documento',
        'Fecha',
        'Tipo Doc',
        'Debe',
        'Haber',
        'Saldo Factura',
        'Saldo',
        'Observación'
      ]],
      body,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        halign: 'left'
      },
      headStyles: {
        fillColor: [29, 120, 159],
        textColor: [255, 255, 255],
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [247, 249, 252]
      },
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
      didDrawPage: (_data: any) => {
        const str = `Página ${doc.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(
          str,
          pageWidth - marginLeft,
          pageHeight - 10,
          { align: 'right' }
        );
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || cursorY;

    // TOTALES
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

    const formatNum = (v: number) =>
      v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    doc.setFontSize(10);

    doc.text('Debe:', labelX, yTotales);
    doc.text(formatNum(this.totalDebe), valueX, yTotales, { align: 'right' });

    yTotales += 14;
    doc.text('Haber:', labelX, yTotales);
    doc.text(formatNum(this.totalHaber), valueX, yTotales, { align: 'right' });

    yTotales += 14;
    doc.text('Saldo:', labelX, yTotales);
    doc.text(formatNum(this.totalSaldo), valueX, yTotales, { align: 'right' });

    const nombreArchivo =
      `estado_cuenta_${cli?.clientes_codigo ?? ''}_${this.hoy.toISOString().substring(0, 10)}.pdf`;
    doc.save(nombreArchivo);

    this.opcionesImpresionVisibles = false;
  }

  cancelar(): void {
    console.log('Cancelar');
  }

  formatNumero(value: number): string {
    if (value == null) {
      return '';
    }
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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

    // TÍTULO
    const tituloRow = nextRow();
    tituloRow.getCell(1).value = 'ESTADO DE CUENTA';
    ws.mergeCells(tituloRow.number, 1, tituloRow.number, 9);
    tituloRow.height = 22;
    tituloRow.eachCell(cell => {
      cell.font = { bold: true, size: 16, color: { argb: 'FF002C6C' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    currentRow++;

    // DATOS CLIENTE
    if (cli) {
      const rowCli = nextRow();
      rowCli.getCell(1).value = 'Cliente:';
      rowCli.getCell(2).value = cli.nomcli;
      ws.mergeCells(rowCli.number, 2, rowCli.number, 9);

      const rowDir = nextRow();
      rowDir.getCell(1).value = 'Dirección:';
      rowDir.getCell(2).value = cli.dircli ?? '';
      ws.mergeCells(rowDir.number, 2, rowDir.number, 9);

      const rowTel = nextRow();
      rowTel.getCell(1).value = 'Teléfono:';
      rowTel.getCell(2).value = cli.telefono ?? '';
      ws.mergeCells(rowTel.number, 2, rowTel.number, 9);

      const rowFec = nextRow();
      rowFec.getCell(1).value = 'Fecha del reporte:';
      rowFec.getCell(2).value = this.hoy.toLocaleDateString('es-EC');
      ws.mergeCells(rowFec.number, 2, rowFec.number, 9);

      [rowCli, rowDir, rowTel, rowFec].forEach(r => {
        r.eachCell((cell, col) => {
          if (col === 1) {
            cell.font = { bold: true, size: 11, color: { argb: 'FF002C6C' } };
          } else {
            cell.font = { size: 11 };
          }
        });
      });
    } else {
      const rowFec = nextRow();
      rowFec.getCell(1).value = 'Fecha del reporte:';
      rowFec.getCell(2).value = this.hoy.toLocaleDateString('es-EC');
      ws.mergeCells(rowFec.number, 2, rowFec.number, 9);
    }

    currentRow++;

    // CABECERA TABLA
    const headerRow = nextRow();
    const headerIdx = headerRow.number;
    headerRow.values = [
      'Factura',
      'Documento',
      'Fecha',
      'Tipo Doc',
      'Debe',
      'Haber',
      'Saldo Factura',
      'Saldo',
      'Observación'
    ];

    headerRow.height = 18;
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1D789F' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });

    const firstDetailRow = headerIdx + 1;

    // DETALLE
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

    // ZEBRA, BORDES, FORMATOS
    for (let i = firstDetailRow; i <= lastDetailRow; i++) {
      const row = ws.getRow(i);
      const isEven = (i - firstDetailRow) % 2 === 1;

      allCols.forEach(col => {
        const cell = row.getCell(col);
        cell.border = thinBorder;

        if (isEven) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF7F9FC' }
          };
        }

        if ([5, 6, 7, 8].includes(col) && typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }

        if (col === 9) {
          cell.alignment = {
            horizontal: 'left',
            vertical: 'top',
            wrapText: true
          };
        }
      });
    }

    // TOTALES
    currentRow++;
    const totTitleRow = nextRow();
    const totTitleIdx = totTitleRow.number;
    totTitleRow.getCell(1).value = 'TOTAL GENERAL';
    ws.mergeCells(totTitleIdx, 1, totTitleIdx, 3);
    totTitleRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8EDF5' }
      };
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

    // LOGO en Excel
    try {
      const logoUrl = await firstValueFrom(this.logoService.logoUrl$.pipe(take(1)));

      if (logoUrl) {
        const resp = await fetch(logoUrl);
        const buffer = await resp.arrayBuffer();

        const imageId = workbook.addImage({
          buffer,
          extension: 'png'
        });

        ws.addImage(imageId, {
          tl: { col: 8, row: 2 },
          ext: { width: 180, height: 60 }
        } as any);
      }
    } catch (e) {
      console.warn('No se pudo cargar el logo para el Excel:', e);
    }

    const nombreArchivo =
      `estado_cuenta_${cli?.clientes_codigo ?? ''}_${this.hoy
        .toISOString()
        .substring(0, 10)}.xlsx`;

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
      if (!logoUrl) { return null; }

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

  seleccionarClienteOrigen(cliente: ClienteSummary): void {
    if (!cliente?.clientes_codigo) return;

    // Guardamos el código para la consulta
    this.codcliO = cliente.clientes_codigo;

    // Actualizamos el cliente seleccionado (cabecera)
    this.clienteSeleccionado = {
      clientes_codigo: cliente.clientes_codigo,
      nomcli: cliente.nomcli,
      // si tu ClienteSummary tiene estos campos, puedes añadirlos:
      // dircli: cliente.dircli,
      // telefono: cliente.telefono
    } as any;

    // Mostramos el nombre en el input
    this.clienteOrigenControl.setValue(cliente);

    // Recargamos el estado de cuenta para este cliente
    this.cargarEstadoCuenta();
  }
}
