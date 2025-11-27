import { Component, OnInit } from '@angular/core';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { finalize } from 'rxjs/operators';
import { ClienteService, ClienteIndividual } from 'src/app/services/cliente.service';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { Cliente } from 'src/app/interfaces/cliente';
import * as XLSX from 'xlsx-js-style';
import { LogoService } from 'src/app/services/logo.service';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { UsuarioService } from 'src/app/services/usuario.service';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';



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
  templateUrl: './estadocuentacliente.component.html',
  styleUrls: ['./estadocuentacliente.component.css']
})
export class EstadocuentaclienteComponent implements OnInit {

  hoy: Date = new Date();
  clienteE!: ClienteIndividual;
  clienteSeleccionado: Cliente | null = null;
  // filtros de fecha (solo visuales por ahora)
  fechaDesde: string = '';
  fechaHasta: string = '';
  usuarioActual = this.usuarioService.getUsuarioActual();
  // cliente a consultar (por ahora fijo; luego puedes poner un input/autocomplete)
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

  // formateador de moneda para AG Grid (punto decimal)
  monedaFormatter = (params: any) => {
    if (params.value == null || params.value === '') {
      return '';
    }
    const valor = Number(params.value);

    // en-US → separador decimal = punto, miles = coma
    return valor.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // ORDEN DE COLUMNAS:
  // factura, documento, fecha, tipo documento, debe, haber, saldo factura, saldo, observacion.
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
      minWidth: 220, tooltipField: 'observacion'
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    cellClass: 'celda-centro'
  };

  constructor(private estadoCuentaService: EstadoCuentaService,
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

    this.estadoCuentaService
      .getSaldoFacturasPorCliente(this.clienteSeleccionado?.clientes_codigo ?? 0, true, 1, 50)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: resp => {
          if (resp.type !== 'success' || !resp.data) {
            this.errorMessage = resp.message || 'Error al consultar el estado de cuenta.';
            return;
          }

          const data: SaldoFacturaDetalladoResponse = resp.data;

          // Tomamos el primer cliente (el API viene paginado pero por cliente)
          const cli = data.resumenPorCliente.items[0];

          if (!cli) {
            this.errorMessage = 'No se encontraron datos para el cliente.';
            this.rowData = [];
            return;
          }

          // llenar datos del cliente (dirección/teléfono no vienen en este API)
          // this.clientes = [
          //   {
          //     id: Number(cli.clienteCodigo),
          //     nombre: cli.cliente,
          //     direccion: '',
          //     telefono: '',
          //     prefijo: cli.clienteCodigo
          //   }
          // ];

          // mapear detalle -> filas del grid
          const rows: EstadoCuentaRow[] = cli.detalle.map((item: SaldoFacturaItemResponse) => ({
            factura: item.numeroFactura,
            documento: item.numeroDocumento,
            fecha: item.fecha,
            tipoDocumento: item.tipDoc,
            valor: 0, // no viene del API
            pago: 0,  // no viene del API
            debe: item.debe ?? 0,
            haber: item.haber ?? 0,
            saldo: item.saldoLinea,
            observacion: item.observacion || '',
            saldoFactura: null
          }));

          // calcular SALDO FACTURA (valor de la factura solo en la F)
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
      const valorFactura = resumen.debe;   // monto facturado

      // buscar la fila F de esa factura
      let indexFactura = rows.findIndex(
        r => r.factura === factura && r.tipoDocumento === 'F'
      );

      // si no hay F, usar alguna fila de esa factura (por seguridad)
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

    // 4) 🔴 Aquí forzamos que TODAS las demás filas tengan 0
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

  // ⬅️ Cambiamos a 'l' (landscape)
  const doc = new jsPDF('l', 'pt', 'a4');   // l = landscape
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 40;
  let cursorY = 40;

  // ========= LOGO =========
  const logoDataUrl = await this.cargarLogoBase64();
  const logoHeight = 50;
  const logoWidth  = 120;

  if (logoDataUrl) {
    // esquina superior izquierda
    doc.addImage(logoDataUrl, 'PNG', marginLeft, cursorY, logoWidth, logoHeight);
  }

  // ========= TÍTULO =========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 44, 108); // azul oscuro
  doc.text('ESTADO DE CUENTA', pageWidth / 2, cursorY + 30, { align: 'center' });

  cursorY += logoHeight + 25; // debajo del logo

  // ========= DATOS DEL CLIENTE =========
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  if (cli) {
    doc.text(`Cliente: ${cli.nomcli}`,     marginLeft, cursorY);
    cursorY += 16;
    doc.text(`Dirección: ${cli.dircli}`,   marginLeft, cursorY);
    cursorY += 16;
    doc.text(`Teléfono: ${cli.telefono}`,  marginLeft, cursorY);
    cursorY += 16;
  }

  doc.text(`Fecha del reporte: ${this.hoy.toLocaleDateString('es-EC')}`, marginLeft, cursorY);
  cursorY += 24;

  // Línea separadora
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, cursorY, pageWidth - marginLeft, cursorY);
  cursorY += 10;

  // ========= TABLA PRINCIPAL =========
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
      fillColor: [29, 120, 159], // azul cabecera
      textColor: [255, 255, 255],
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [247, 249, 252] // gris muy claro
    },
    columnStyles: {
      0: { cellWidth: 80 },   // Factura
      1: { cellWidth: 80 },   // Documento
      2: { cellWidth: 55 },   // Fecha
      3: { cellWidth: 40, halign: 'center' },
      4: { cellWidth: 60, halign: 'right' }, // Debe
      5: { cellWidth: 60, halign: 'right' }, // Haber
      6: { cellWidth: 70, halign: 'right' }, // Saldo Factura
      7: { cellWidth: 60, halign: 'right' }, // Saldo
      8: { cellWidth: 150 }                  // Observación
    },
    margin: { left: marginLeft, right: marginLeft },
    didDrawPage: (data: any) => {
      // Número de página en el pie
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

  // ========= TOTALES =========
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

  doc.text('Debe:',  labelX, yTotales);
  doc.text(formatNum(this.totalDebe),  valueX, yTotales, { align: 'right' });

  yTotales += 14;
  doc.text('Haber:', labelX, yTotales);
  doc.text(formatNum(this.totalHaber), valueX, yTotales, { align: 'right' });

  yTotales += 14;
  doc.text('Saldo:', labelX, yTotales);
  doc.text(formatNum(this.totalSaldo), valueX, yTotales, { align: 'right' });

  // ========= GUARDAR =========
  const nombreArchivo =
    `estado_cuenta_${cli?.clientes_codigo ?? ''}_${this.hoy.toISOString().substring(0, 10)}.pdf`;
  doc.save(nombreArchivo);

  this.opcionesImpresionVisibles = false;
}



  cancelar(): void {
    console.log('Cancelar');
    // cerrar dialog, navegar atrás, etc.
  }

  // (opcional) formateador si quisieras usarlo en el template
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

    // === Definir columnas (ancho) ===
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

    // ====== TÍTULO ======
    const tituloRow = nextRow();
    tituloRow.getCell(1).value = 'ESTADO DE CUENTA';
    ws.mergeCells(tituloRow.number, 1, tituloRow.number, 9);
    tituloRow.height = 22;
    tituloRow.eachCell(cell => {
      cell.font = { bold: true, size: 16, color: { argb: 'FF002C6C' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Fila en blanco
    currentRow++;

    // ====== DATOS DEL CLIENTE ======
    if (cli) {
      const rowCli = nextRow();
      rowCli.getCell(1).value = 'Cliente:';
      rowCli.getCell(2).value = cli.nomcli;
      ws.mergeCells(rowCli.number, 2, rowCli.number, 9);

      const rowDir = nextRow();
      rowDir.getCell(1).value = 'Dirección:';
      rowDir.getCell(2).value = cli.dircli;
      ws.mergeCells(rowDir.number, 2, rowDir.number, 9);

      const rowTel = nextRow();
      rowTel.getCell(1).value = 'Teléfono:';
      rowTel.getCell(2).value = cli.telefono;
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
      // aun así ponemos fecha
      const rowFec = nextRow();
      rowFec.getCell(1).value = 'Fecha del reporte:';
      rowFec.getCell(2).value = this.hoy.toLocaleDateString('es-EC');
      ws.mergeCells(rowFec.number, 2, rowFec.number, 9);
    }

    // Fila en blanco
    currentRow++;

    // ====== CABECERA TABLA ======
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

    // ====== DETALLE ======
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

    // ====== ZEBRA ROWS, BORDES y FORMATOS ======
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
            fgColor: { argb: 'FFF7F9FC' } // gris muy claro
          };
        }

        // numérico para Debe/Haber/SaldoFact/Saldo
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

    // ====== TOTALES ======
    currentRow++; // fila en blanco
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

    // ====== LOGO (dinámico desde LogoService) ======
    // ====== LOGO (dinámico desde LogoService) ======
    // ====== LOGO (dinámico desde LogoService) ======
    try {
      const logoUrl = await firstValueFrom(this.logoService.logoUrl$.pipe(take(1)));

      if (logoUrl) {
        const resp = await fetch(logoUrl);
        const buffer = await resp.arrayBuffer();

        const imageId = workbook.addImage({
          buffer,
          extension: 'png' // o 'jpeg', según lo que retorne tu API
        });

        // Posicionamos el logo arriba a la derecha, con tamaño fijo
        ws.addImage(imageId, {
          tl: { col: 8, row: 2 },              // cerca de la columna H
          ext: { width: 180, height: 60 }      // tamaño en píxeles
        } as any); // cast para evitar problemas de tipos con Anchor
      }
    } catch (e) {
      console.warn('No se pudo cargar el logo para el Excel:', e);
    }



    // ====== GUARDAR ARCHIVO ======
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
  private async obtenerLogoDataUrl(): Promise<string | null> {
    try {
      const logoUrl = await firstValueFrom(this.logoService.logoUrl$.pipe(take(1)));
      if (!logoUrl) {
        return null;
      }

      const resp = await fetch(logoUrl);
      const blob = await resp.blob();

      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
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


}
