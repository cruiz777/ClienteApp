import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef, GridApi, GridReadyEvent, CellClickedEvent,
  GridOptions, ModuleRegistry, AllCommunityModule
} from 'ag-grid-community';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { BalanceService, ApiResponse } from 'src/app/services/balance.service';
import { TipoAsientoService } from 'src/app/services/tipo-asiento.service';

import { BalanceDiarioResponse } from 'src/app/interfaces/responses/balance-diario-response';
import { TipoAsientoResponse } from 'src/app/interfaces/responses/tipo-asiento-response';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-balance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    CurrencyPipe,
    AgGridAngular,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './balance-comprobacion-list.component.html',
  styleUrl: './balance-comprobacion-list.component.css'
})
export class BalanceComponent implements OnInit {

  // ============================================================
  // CONSTRUCTOR / SERVICES
  // ============================================================
  constructor(
    private balanceService: BalanceService,
    private tipoAsientoService: TipoAsientoService
  ) { }

  // ============================================================
  // UI STATE
  // ============================================================
  loading = false;

  /** Documento expandido (master/detail) */
  expandedId: number | string | null = null;

  // ============================================================
  // FILTROS (tu UI)
  // ============================================================
  modoFiltro: 'fecha' | 'cuenta' = 'fecha';

  fechaDesde: string = this.hoyISO();
  fechaHasta: string = this.hoyISO();

  cuentaDesde: string = '';
  cuentaHasta: string = '';

  /** Tipo de asiento (solo cuando modo cuenta) */
  idTipoAsiento: number | null = null;


  // ============================================================
  // DATA
  // ============================================================
  rowData: BalanceDiarioResponse[] = [];
  tipoAsiento: TipoAsientoResponse[] = [];

  // ============================================================
  // AG GRID
  // ============================================================
  private gridApi?: GridApi;

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: true
  };

  /** Identificador único por fila (debe ser único) */
  getRowId = (params: any) => params.data?.documento;

  columnDefs: ColDef[] = [
    {
      headerName: '',
      field: 'documento',
      width: 60,
      pinned: 'left',
      filter: false,
      sortable: false,
      cellRenderer: 'agGroupCellRenderer',
      cellRendererParams: { suppressCount: true }
    },
    { headerName: 'Tipo', field: 'tipo', width: 110 },
    { headerName: 'Documento', field: 'documento', width: 150 },
    {
      headerName: 'F. Transacción',
      field: 'fechaTransaccion',
      width: 150,
      filter: 'agDateColumnFilter',
      valueGetter: p => p.data?.fechaTransaccion ? new Date(p.data.fechaTransaccion as any) : null,
      valueFormatter: p => p.value ? this.formatDateDDMMYYYY(p.value as Date) : ''
    },
    {
      headerName: 'F. Ingreso',
      field: 'fechaIngreso',
      width: 150,
      filter: 'agDateColumnFilter',
      valueGetter: p => p.data?.fechaIngreso ? new Date(p.data.fechaIngreso as any) : null,
      valueFormatter: p => p.value ? this.formatDateDDMMYYYY(p.value as Date) : ''
    },
    { headerName: 'Beneficiario', field: 'beneficiario', flex: 1, minWidth: 200 },
    { headerName: 'Observación', field: 'observacion', flex: 1, minWidth: 240 },
    { headerName: 'Debe', field: 'debe', width: 140, filter: 'agNumberColumnFilter' },
    { headerName: 'Haber', field: 'haber', width: 140, filter: 'agNumberColumnFilter' },
    {
      headerName: 'Responsable',
      field: 'codResponsable',
      width: 200,
      valueGetter: p => `${p.data?.codResponsable ?? ''} - ${p.data?.nomResponsable ?? ''}`
    }
  ];

  gridOptions: GridOptions = {
    masterDetail: true,
    animateRows: true,
    suppressRowClickSelection: true
  };

  detailCellRendererParams = {
    detailGridOptions: <GridOptions>{
      defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true,
        floatingFilter: true
      },
      columnDefs: <ColDef[]>[
        { headerName: 'Año', field: 'anio', width: 90 },
        {
          headerName: 'Fecha',
          field: 'fecha',
          width: 130,
          filter: 'agDateColumnFilter',
          valueGetter: p => p.data?.fecha ? new Date(p.data.fecha as any) : null,
          valueFormatter: p => p.value ? this.formatDateDDMMYYYY(p.value as Date) : ''
        },
        { headerName: 'Hora', field: 'hora', width: 100 },
        { headerName: 'Comprobante', field: 'comprobante', width: 140 },
        { headerName: 'Relacionado', field: 'relacionado', width: 140 },
        { headerName: 'Cuenta', field: 'cuenta', width: 160 },
        { headerName: 'Detalle Cuenta', field: 'detalleCuenta', flex: 1, minWidth: 220 },
        {
          headerName: 'Auxiliar',
          field: 'codigoAuxiliar',
          width: 220,
          valueGetter: p => `${p.data?.codigoAuxiliar ?? ''} - ${p.data?.nombreAuxiliar ?? ''}`
        },
        { headerName: 'Debe', field: 'debe', width: 130, filter: 'agNumberColumnFilter' },
        { headerName: 'Haber', field: 'haber', width: 130, filter: 'agNumberColumnFilter' },
        { headerName: 'Beneficiario', field: 'beneficiario', width: 200 },
        { headerName: 'Cheque', field: 'cheque', width: 140 },
        { headerName: 'Comentario', field: 'comentario', width: 220 },
        { headerName: 'Sustento Tributario', field: 'sustento', width: 200 },
        { headerName: 'Tipo comprobante SRI', field: 'sri', width: 200 },
        { headerName: 'Tipo Retención', field: 'retencion', width: 160 }
      ]
    },

    getDetailRowData: (params: any) => {
      params.successCallback(params.data?.detalles ?? []);
    }
  };

  onGridReady(e: GridReadyEvent): void {
    this.gridApi = e.api;
  }

  /**
   * Click en fila:
   * - Mantiene tu control expandedId
   * - Expande/colapsa el master/detail del AG Grid
   */
  onCellClicked(e: CellClickedEvent): void {
    const doc = e.data?.documento;
    if (!doc || !this.gridApi) return;

    this.toggleDetalle(doc);

    const node = this.gridApi.getRowNode(doc);
    if (node) node.setExpanded(this.expandedId === doc);
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================
  ngOnInit(): void {
    this.cargarTipoAsiento();
  }

  // ============================================================
  // ACCIONES UI
  // ============================================================
  refrescar(): void {
    if (this.loading) return;

    // Limpia expansión cuando se ejecuta una nueva búsqueda
    this.expandedId = null;

    // 1) Validar rango fechas (siempre aplica)
    const d1 = (this.fechaDesde ?? '').trim();
    const d2 = (this.fechaHasta ?? '').trim();

    if (!d1 || !d2) {
      console.warn('Debe ingresar Fecha Inicio y Fecha Final');
      return;
    }
    if (d2 < d1) {
      console.warn('La Fecha Final no puede ser menor a la Fecha Inicial');
      return;
    }

    // 2) Si modo cuenta, validar cuentas y armar parámetros
    let cd: string | null = null;
    let ch: string | null = null;
    let tipo: number | null = null;

    if (this.modoFiltro === 'cuenta') {
      cd = (this.cuentaDesde ?? '').trim();
      ch = (this.cuentaHasta ?? '').trim();

      if (!cd || !ch) {
        console.warn('Debe ingresar Cuenta Inicial y Cuenta Final');
        return;
      }
      if (ch < cd) {
        console.warn('La Cuenta Final no puede ser menor a la Cuenta Inicial');
        return;
      }

      // tipo asiento solo aplica en modo cuenta (según tu UI)
      tipo = this.idTipoAsiento ?? null;
      // Si tu backend requiere 0 en vez de null:
      // tipo = this.idTipoAsiento ?? 0;
    }

    // 3) Llamada al backend (sin valores quemados)
    this.cargarPorCondicion(d1, d2, cd, ch, tipo);
  }

  onExportExcelConDetalle(): void {
    if (!this.gridApi) return;

    // Si ya importas XLSX arriba, elimina este require y usa tu import.
    const XLSX = require('xlsx-js-style');

    const hoy = new Date();
    const fechaStr = hoy.toISOString().slice(0, 10);

    // ============================================================
    // CABECERA (título + filtros aplicados)
    // ============================================================
    const titulo = 'BALANCE / LISTADO DE ASIENTOS';
    const linea1 = `Rango: ${this.fechaDesde ?? ''}  a  ${this.fechaHasta ?? ''}`;
    const linea2 =
      (this.modoFiltro === 'cuenta')
        ? `Cuentas: ${this.cuentaDesde ?? ''}  a  ${this.cuentaHasta ?? ''} | Tipo Asiento: ${this.idTipoAsiento ?? 'Todos'}`
        : `Modo: Por fechas`;

    const data: any[][] = [];
    data.push([titulo]);
    data.push([linea1]);
    data.push([linea2]);
    data.push([]);

    // ============================================================
    // COLUMNAS MASTER (desde tu columnDefs)
    // ============================================================
    const masterCols = (this.columnDefs ?? []).filter((c: any) => !c.hide && c.colId !== 'acciones' && c.field);
    const masterHeader = masterCols.map((c: any) => c.headerName || c.field);
    data.push(masterHeader);

    const headerRowIndex = 4; // 0=titulo,1=linea1,2=linea2,3=blank,4=header
    let rowCursor = headerRowIndex + 1;

    // Totales
    let totalDebe = 0;
    let totalHaber = 0;

    // Meta para outline (agrupación en Excel)
    const rowMeta: any[] = [];

    // ============================================================
    // DEFINIR COLUMNAS DETALLE (ajusta fields si cambian)
    // ============================================================
    const detailCols: { header: string; field: string; width?: number }[] = [
      { header: 'Fecha', field: 'fecha' },
      { header: 'Hora', field: 'hora' },
      { header: 'Cuenta', field: 'cuenta' },
      { header: 'Detalle Cuenta', field: 'detalleCuenta' },
      { header: 'Auxiliar', field: 'nombreAuxiliar' },
      { header: 'Debe', field: 'debe' },
      { header: 'Haber', field: 'haber' },
      { header: 'Comentario', field: 'comentario' }
    ];

    // ============================================================
    // RECORRER FILAS MASTER (respetando filtros y orden)
    // ============================================================
    this.gridApi.forEachNodeAfterFilterAndSort((node: any) => {
      if (!node?.data) return;

      // ----- MASTER ROW
      const masterRow = masterCols.map((c: any) => (node.data as any)[c.field as string]);
      data.push(masterRow);

      const debeM = Number((node.data as any).totdebe ?? (node.data as any).debe ?? 0);
      const haberM = Number((node.data as any).tothaber ?? (node.data as any).haber ?? 0);
      if (!isNaN(debeM)) totalDebe += debeM;
      if (!isNaN(haberM)) totalHaber += haberM;

      // ----- DETAILS
      const detalles = (node.data as any).detalles ?? []; // Ajusta si tu propiedad se llama distinto

      if (Array.isArray(detalles) && detalles.length > 0) {
        // Línea “Detalle…”
        data.push([`Detalle de documento: ${(node.data as any).documento ?? ''}`]);
        rowMeta[rowCursor] = { level: 1 }; // nivel detalle
        rowCursor++;

        // Header detalle
        data.push(detailCols.map(c => c.header));
        rowMeta[rowCursor] = { level: 1 };
        rowCursor++;

        // Filas detalle (colapsables en Excel)
        detalles.forEach((d: any) => {
          data.push(detailCols.map(c => (d as any)[c.field]));
          rowMeta[rowCursor] = { level: 1, hidden: true }; // oculto inicialmente
          rowCursor++;
        });

        // Separador
        data.push([]);
        rowCursor++;
      }

      rowCursor++; // por el masterRow agregado
    });

    const saldo = totalDebe - totalHaber;

    // ============================================================
    // FILA DE TOTALES MASTER
    // ============================================================
    const totalsRow = masterCols.map((col: any) => {
      switch (col.field) {
        case 'documento':
        case 'numdoc':
          return 'TOTALES:';
        case 'totdebe':
        case 'debe':
          return totalDebe;
        case 'tothaber':
        case 'haber':
          return totalHaber;
        default:
          return '';
      }
    });
    data.push(totalsRow);

    // ============================================================
    // SHEET + MERGES + OUTLINE
    // ============================================================
    const ws: any = XLSX.utils.aoa_to_sheet(data);

    const totalCols = masterCols.length;
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }, // título
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } }, // línea 1
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } }  // línea 2
    ];

    ws['!rows'] = rowMeta;
    ws['!outline'] = { above: true };

    // Anchos master (básicos)
    ws['!cols'] = masterCols.map((col: any) => {
      let wch = 14;
      if (String(col.field).toLowerCase().includes('fecha')) wch = 16;
      if (col.field === 'beneficiario') wch = 28;
      if (col.field === 'observacion') wch = 40;
      return { wch };
    });

    // ============================================================
    // ESTILOS (si ya usas xlsx-js-style)
    // ============================================================
    const borderStyle = {
      top: { style: 'thin', color: { rgb: 'CCCCCC' } },
      bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
      left: { style: 'thin', color: { rgb: 'CCCCCC' } },
      right: { style: 'thin', color: { rgb: 'CCCCCC' } }
    };

    // Título
    const titleCell = ws[XLSX.utils.encode_cell({ r: 0, c: 0 })];
    if (titleCell) {
      titleCell.s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }

    // Header master (fila headerRowIndex)
    for (let C = 0; C < totalCols; C++) {
      const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c: C });
      const cell = ws[addr];
      if (!cell) continue;
      cell.s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { patternType: 'solid', fgColor: { rgb: '1D789F' } },
        border: borderStyle
      };
    }

    // Bordes + zebra (solo filas master)
    const ref = ws['!ref'] as string;
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      const stripe1 = 'FFFFFF';
      const stripe2 = 'F5F5F5';

      for (let R = headerRowIndex + 1; R <= range.e.r; R++) {
        const isDetail = ws['!rows']?.[R]?.level === 1;

        for (let C = 0; C < totalCols; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[addr];
          if (!cell) continue;

          cell.s = cell.s || {};
          cell.s.border = borderStyle;

          // zebra solo en master
          if (!isDetail) {
            const isEven = (R - (headerRowIndex + 1)) % 2 === 0;
            cell.s.fill = {
              patternType: 'solid',
              fgColor: { rgb: isEven ? stripe1 : stripe2 }
            };
          }
        }
      }
    }

    // ============================================================
    // GUARDAR
    // ============================================================
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asientos');
    XLSX.writeFile(wb, `Diario_movimientos_${fechaStr}.xlsx`);
  }

  exportPdfDiarioMovimientos(): void {
    const LOGO_BASE64 = '';

    if (!this.gridApi) return;

    // ============================================================
    // 1) Preparar dataset (MASTER + DETAIL) desde el grid (respeta filtros/orden)
    // ============================================================
    const documentos: any[] = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node: any) => {
      if (node?.data) documentos.push(node.data);
    });

    if (documentos.length === 0) return;

    // ============================================================
    // 2) Configuración general del PDF
    // ============================================================
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const marginLeft = 10;
    const marginRight = 10;
    const topMargin = 12;
    const bottomMargin = 12;

    // Tipografías
    const FONT = 'helvetica';

    // Control Y
    let y = topMargin;

    // ============================================================
    // 3) Helpers
    // ============================================================
    const formatDateES = (iso: any): string => {
      if (!iso) return '';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };

    const fmtMoney = (v: any): string => {
      const n = Number(v ?? 0);
      if (isNaN(n)) return '0.00';
      return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const drawLine = (yy: number) => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.line(marginLeft, yy, pageWidth - marginRight, yy);
    };

    const ensureSpace = (neededMm: number) => {
      if (y + neededMm <= pageHeight - bottomMargin) return;

      doc.addPage();
      y = topMargin;
      drawHeaderGeneral(); // repetir encabezado general en cada página
    };

    const drawFooter = () => {
      const page = doc.getNumberOfPages();
      doc.setFont(FONT, 'normal');
      doc.setFontSize(9);
      doc.text(`Página ${page}`, pageWidth - marginRight - 20, pageHeight - 6);
    };

    // ============================================================
    // 4) Encabezado general (repetible)
    // ============================================================
    const drawHeaderGeneral = () => {
      doc.setFont(FONT, 'bold');
      doc.setFontSize(14);

      // Logo
      if (LOGO_BASE64) {
        // Ajusta tamaño según tu imagen
        doc.addImage(`data:image/png;base64,${LOGO_BASE64}`, 'PNG', marginLeft, 8, 22, 22);
      }

      // Título centrado
      doc.text('DIARIO DE MOVIMIENTOS', pageWidth / 2, 16, { align: 'center' });

      doc.setFont(FONT, 'normal');
      doc.setFontSize(10);

      // Bloque izquierda (Rango fechas / filtros)
      const leftX = marginLeft;
      let yy = 26;

      doc.text('Rango de Fechas', leftX, yy);
      yy += 5;
      doc.text(`Fecha Inicio:  ${this.fechaDesde ?? ''}`, leftX, yy);
      yy += 5;
      doc.text(`Fecha Final:   ${this.fechaHasta ?? ''}`, leftX, yy);

      yy += 7;
      doc.text(`Fecha del Reporte: ${formatDateES(new Date())}`, leftX, yy);

      // Bloque derecha (otros filtros)
      const rightX = pageWidth / 2 + 20;
      let yr = 26;

      // Si estás en modo cuenta, muestra rango cuentas; caso contrario “TODOS”
      const rangoCuenta = (this.modoFiltro === 'cuenta')
        ? `${this.cuentaDesde ?? ''} - ${this.cuentaHasta ?? ''}`
        : 'TODOS';

      const tipoAsientoTxt = (this.modoFiltro === 'cuenta')
        ? (this.idTipoAsiento ?? 'TODOS')
        : 'TODOS';

      doc.text('Rango de Cuenta', rightX, yr);
      yr += 5;
      doc.text(`Cuenta: ${rangoCuenta}`, rightX, yr);
      yr += 5;
      doc.text(`Tipo Asiento: ${tipoAsientoTxt}`, rightX, yr);

      // Línea separadora
      drawLine(50);
      y = 56; // contenido arranca debajo del header
    };

    // Encabezado 1era página
    drawHeaderGeneral();

    // ============================================================
    // 5) Render por cada asiento (encabezado + tabla detalle + total)
    // ============================================================
    documentos.forEach((m: any, idx: number) => {
      // Alto aproximado del header del asiento
      ensureSpace(40);

      // Encabezado por asiento (como tu imagen)
      doc.setFont(FONT, 'bold');
      doc.setFontSize(10);

      const x1 = marginLeft;
      const x2 = pageWidth / 2 + 10;

      // Izquierda
      doc.text('N° Documento', x1, y);
      doc.setFont(FONT, 'normal');
      doc.text(String(m.documento ?? ''), x1 + 35, y);

      y += 5;
      doc.setFont(FONT, 'bold');
      doc.text('Tipo Documento', x1, y);
      doc.setFont(FONT, 'normal');
      doc.text(String(m.tipo ?? ''), x1 + 35, y);

      y += 5;
      doc.setFont(FONT, 'bold');
      doc.text('Fecha del Comprobante', x1, y);
      doc.setFont(FONT, 'normal');
      doc.text(formatDateES(m.fechaTransaccion ?? m.fechaIngreso), x1 + 35, y);

      y += 5;
      doc.setFont(FONT, 'bold');
      doc.text('Beneficiario', x1, y);
      doc.setFont(FONT, 'normal');
      doc.text(String(m.beneficiario ?? ''), x1 + 35, y);

      // Derecha
      const comp = m.comprobante ?? m.numComprobante ?? '';
      const cheque = m.cheque ?? 0;
      const cotizacion = m.cotizacion ?? m.cotiza ?? '';

      const yTop = y - 15; // alinear con bloque izquierdo

      doc.setFont(FONT, 'bold');
      doc.text('N° Comprobante', x2, yTop);
      doc.setFont(FONT, 'normal');
      doc.text(String(comp), x2 + 35, yTop);

      doc.setFont(FONT, 'bold');
      doc.text('N° Cheque', x2, yTop + 5);
      doc.setFont(FONT, 'normal');
      doc.text(String(cheque), x2 + 35, yTop + 5);

      doc.setFont(FONT, 'bold');
      doc.text('Cotización', x2, yTop + 10);
      doc.setFont(FONT, 'normal');
      doc.text(cotizacion ? fmtMoney(cotizacion) : '', x2 + 35, yTop + 10);

      y += 6;

      // Línea antes de tabla
      drawLine(y);
      y += 2;

      // Detalle: tabla
      const detalles = Array.isArray(m.detalles) ? m.detalles : [];

      let totalDebe = 0;
      let totalHaber = 0;

      const body = detalles.map((d: any) => {
        const debe = Number(d.debe ?? 0) || 0;
        const haber = Number(d.haber ?? 0) || 0;
        totalDebe += debe;
        totalHaber += haber;

        return [
          String(d.local ?? ''),
          String(d.cuenta ?? ''),
          String(d.detalleCuenta ?? d.descripcion ?? ''),
          String(d.comentario ?? d.observacion ?? ''),
          fmtMoney(debe),
          fmtMoney(haber)
        ];
      });

      // Si no hay detalles, igual dibuja tabla vacía (opcional)
      if (body.length === 0) {
        body.push(['', '', '(Sin detalles)', '', '0.00', '0.00']);
      }

      autoTable(doc, {
        startY: y,
        theme: 'grid',
        styles: {
          font: FONT,
          fontSize: 9,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [230, 230, 230],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 12 },  // Local
          1: { cellWidth: 28 },  // Cuenta
          2: { cellWidth: 45 },  // Descripción
          3: { cellWidth: 55 },  // Comentario
          4: { halign: 'right', cellWidth: 20 }, // Debe
          5: { halign: 'right', cellWidth: 20 }  // Haber
        },
        head: [['Local', 'N° Cuenta', 'Descripción', 'Comentario', 'Debe', 'Haber']],
        body,
        didDrawPage: () => {
          // Encabezado y pie en cada página que autoTable genere
          drawFooter();
        }
      });

      // Luego de la tabla
      const finalY = (doc as any).lastAutoTable.finalY ?? y;
      y = finalY + 4;

      // Total por comprobante
      ensureSpace(10);
      doc.setFont(FONT, 'bold');
      doc.text('Total por Comprobante', pageWidth - marginRight - 85, y);

      doc.setFont(FONT, 'bold');
      doc.text(fmtMoney(totalDebe), pageWidth - marginRight - 25, y, { align: 'right' });

      doc.text(fmtMoney(totalHaber), pageWidth - marginRight - 5, y, { align: 'right' });

      y += 6;

      // Línea separadora entre asientos
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(marginLeft, y, pageWidth - marginRight, y);
      doc.setLineDashPattern([], 0);

      y += 6;
    });

    // Pie final (por si la última página no fue tocada por autoTable)
    drawFooter();

    // ============================================================
    // 6) Guardar
    // ============================================================
    doc.save(`Diario_Movimientos_${this.fechaDesde}_${this.fechaHasta}.pdf`);
  }


  // ============================================================
  // TOGGLE MODO CUENTA (tu UI)
  // ============================================================
  toggleModoCuenta(): void {
    this.modoFiltro = (this.modoFiltro === 'cuenta') ? 'fecha' : 'cuenta';

    // Al cerrar modo cuenta, limpia filtros secundarios
    if (this.modoFiltro !== 'cuenta') {
      this.cuentaDesde = '';
      this.cuentaHasta = '';
      this.idTipoAsiento = null;
    }
  }

  // ============================================================
  // EXPAND / COLLAPSE
  // ============================================================
  toggleDetalle(id: any): void {
    if (id == null) return;
    this.expandedId = (this.expandedId === id) ? null : id;
  }

  // ============================================================
  // DATA LOADERS
  // ============================================================
  private cargarTipoAsiento(): void {
    this.tipoAsientoService.getAllTipoAsiento().subscribe({
      next: (resp: any) => {
        this.tipoAsiento = resp?.data ?? [];
      },
      error: (err: any) => {
        console.error('Error cargando tipos de asiento', err);
        this.tipoAsiento = [];
      }
    });
  }

  /**
   * Carga principal:
   * - Si cd/ch vienen vacíos => el backend filtra solo por fechas
   * - Si cd/ch vienen con valores => backend filtra por fechas + rango de cuentas + tipo (si aplica)
   */
  private cargarPorCondicion(
    fechaDesde: string,
    fechaHasta: string,
    cuentaDesde?: string | null,
    cuentaHasta?: string | null,
    idTipoAsiento?: number | null
  ): void {
    this.loading = true;

    this.balanceService
      .getByCondicionBalanceDiario(fechaDesde, fechaHasta, cuentaDesde, cuentaHasta, idTipoAsiento)
      .subscribe({
        next: (resp: ApiResponse<BalanceDiarioResponse[]>) => {
          this.rowData = resp?.data ?? [];
          this.loading = false;
        },
        error: (err: any) => {
          console.error('Error al cargar balance', err);
          this.rowData = [];
          this.loading = false;
        }
      });
  }

  // ============================================================
  // HELPERS
  // ============================================================
  private hoyISO(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private formatDateDDMMYYYY(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
}
