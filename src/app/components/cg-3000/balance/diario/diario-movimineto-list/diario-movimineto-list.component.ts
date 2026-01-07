import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { BalanceService, ApiResponse } from 'src/app/services/balance.service';
import { TipoAsientoService } from 'src/app/services/tipo-asiento.service';

import { BalanceDiarioResponse } from 'src/app/interfaces/responses/balance-diario-response';
import { TipoAsientoResponse } from 'src/app/interfaces/responses/tipo-asiento-response';

@Component({
  selector: 'app-diario-movimineto-list',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    DatePipe,
    CurrencyPipe,
    MatFormFieldModule,
    MatSelectModule],
  templateUrl: './diario-movimineto-list.component.html',
  styleUrl: './diario-movimineto-list.component.css'
})
export class DiarioMoviminetoListComponent implements OnInit {

  constructor(
    private balanceService: BalanceService,
    private tipoAsientoService: TipoAsientoService
  ) { }

  // ============================================================
  // UI STATE
  // ============================================================
  loading = false;

  /** Documento expandido (tabla común) */
  expandedId: string | null = null;

  // ============================================================
  // FILTROS
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

    let cd: string | null = null;
    let ch: string | null = null;

    // Tipo de asiento (siempre opcional)
    let tipo: number | null = this.idTipoAsiento ?? null;

    if (this.modoFiltro === 'cuenta') {
      const desde = (this.cuentaDesde ?? '').trim();
      const hasta = (this.cuentaHasta ?? '').trim();

      const tieneDesde = !!desde;
      const tieneHasta = !!hasta;
      const tieneTipo = tipo != null;

      // Caso A: Solo tipo de asiento (sin cuentas) => PERMITIR
      if (!tieneDesde && !tieneHasta && tieneTipo) {
        cd = null;
        ch = null;
      }
      // Caso B: Rango completo de cuentas => VALIDAR y PERMITIR
      else if (tieneDesde && tieneHasta) {
        if (hasta < desde) {
          console.warn('La Cuenta Final no puede ser menor a la Cuenta Inicial');
          return;
        }
        cd = desde;
        ch = hasta;
      }
      // Caso C: Solo una cuenta => ERROR
      else if (tieneDesde || tieneHasta) {
        console.warn('Debe ingresar Cuenta Inicial y Cuenta Final (ambas).');
        return;
      }
      // Caso D: No hay cuentas ni tipo => ERROR
      else {
        console.warn('Debe seleccionar Tipo de Asiento o ingresar un rango de cuentas.');
        return;
      }
    }

    // 3) Llamada al backend
    this.cargarPorCondicion(d1, d2, cd, ch, tipo);
  }

  // ============================================================
  // TOGGLE MODO CUENTA
  // ============================================================
  toggleModoCuenta(): void {
    this.modoFiltro = (this.modoFiltro === 'cuenta') ? 'fecha' : 'cuenta';

    if (this.modoFiltro !== 'cuenta') {
      this.cuentaDesde = '';
      this.cuentaHasta = '';
      this.idTipoAsiento = null;
    }
  }

  // ============================================================
  // EXPAND / COLLAPSE (tabla común)
  // ============================================================
  toggleDetalle(id: any): void {
    if (id == null) return;
    const key = String(id);
    this.expandedId = (this.expandedId === key) ? null : key;
  }

  trackByIndex = (_: number, row: BalanceDiarioResponse) => row.documento;

  // ============================================================
  // EXPORT EXCEL (sin AG Grid)
  // ============================================================
  onExportExcelConDetalle(): void {
    const XLSX = require('xlsx-js-style');

    const hoy = new Date();
    const fechaStr = hoy.toISOString().slice(0, 10);

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

    // Columnas MASTER (definidas aquí, ya no desde columnDefs)
    const masterCols: Array<{
      header: string;
      field?: string;
      value?: (m: BalanceDiarioResponse) => any;
    }> = [
        { header: 'Tipo', field: 'tipo' },
        { header: 'Documento', field: 'documento' },
        { header: 'F. Transacción', value: (m) => this.formatIsoDDMMYYYY((m as any).fechaTransaccion) },
        { header: 'F. Ingreso', value: (m) => this.formatIsoDDMMYYYY((m as any).fechaIngreso) },
        { header: 'Beneficiario', field: 'beneficiario' },
        { header: 'Observación', field: 'observacion' },
        { header: 'Debe', value: (m) => Number((m as any).totdebe ?? (m as any).debe ?? 0) },
        { header: 'Haber', value: (m) => Number((m as any).tothaber ?? (m as any).haber ?? 0) },
        {
          header: 'Responsable',
          value: (m) => `${(m as any).codResponsable ?? ''} - ${(m as any).nomResponsable ?? ''}`
        }
      ];

    const masterHeader = masterCols.map(c => c.header);
    data.push(masterHeader);

    const headerRowIndex = 4;
    let rowCursor = headerRowIndex + 1;

    let totalDebe = 0;
    let totalHaber = 0;

    const rowMeta: any[] = [];

    const detailCols: { header: string; field: string }[] = [
      { header: 'Fecha', field: 'fecha' },
      { header: 'Hora', field: 'hora' },
      { header: 'Cuenta', field: 'cuenta' },
      { header: 'Detalle Cuenta', field: 'detalleCuenta' },
      { header: 'Auxiliar', field: 'nombreAuxiliar' },
      { header: 'Debe', field: 'debe' },
      { header: 'Haber', field: 'haber' },
      { header: 'Comentario', field: 'comentario' }
    ];

    (this.rowData ?? []).forEach((m: any) => {
      const masterRow = masterCols.map(c => c.value ? c.value(m) : (m as any)[c.field as string]);
      data.push(masterRow);

      const debeM = Number(m.totdebe ?? m.debe ?? 0);
      const haberM = Number(m.tothaber ?? m.haber ?? 0);
      if (!isNaN(debeM)) totalDebe += debeM;
      if (!isNaN(haberM)) totalHaber += haberM;

      const detalles = m.detalles ?? [];

      if (Array.isArray(detalles) && detalles.length > 0) {
        data.push([`Detalle de documento: ${m.documento ?? ''}`]);
        rowMeta[rowCursor] = { level: 1 };
        rowCursor++;

        data.push(detailCols.map(c => c.header));
        rowMeta[rowCursor] = { level: 1 };
        rowCursor++;

        detalles.forEach((d: any) => {
          data.push(detailCols.map(c => (d as any)[c.field]));
          rowMeta[rowCursor] = { level: 1, hidden: true };
          rowCursor++;
        });

        data.push([]);
        rowCursor++;
      }

      rowCursor++; // por el masterRow agregado
    });

    // Fila de totales
    const totalsRow = masterCols.map(col => {
      if (col.header === 'Documento') return 'TOTALES:';
      if (col.header === 'Debe') return totalDebe;
      if (col.header === 'Haber') return totalHaber;
      return '';
    });
    data.push(totalsRow);

    const ws: any = XLSX.utils.aoa_to_sheet(data);

    const totalCols = masterCols.length;
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } }
    ];

    ws['!rows'] = rowMeta;
    ws['!outline'] = { above: true };

    ws['!cols'] = masterCols.map(col => {
      let wch = 14;
      const h = (col.header || '').toLowerCase();
      if (h.includes('fecha')) wch = 16;
      if (h.includes('beneficiario')) wch = 28;
      if (h.includes('observación') || h.includes('observacion')) wch = 40;
      if (h.includes('responsable')) wch = 24;
      return { wch };
    });

    const borderStyle = {
      top: { style: 'thin', color: { rgb: 'CCCCCC' } },
      bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
      left: { style: 'thin', color: { rgb: 'CCCCCC' } },
      right: { style: 'thin', color: { rgb: 'CCCCCC' } }
    };

    const titleCell = ws[XLSX.utils.encode_cell({ r: 0, c: 0 })];
    if (titleCell) {
      titleCell.s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }

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

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asientos');
    XLSX.writeFile(wb, `Diario_movimientos_${fechaStr}.xlsx`);
  }

  // ============================================================
  // EXPORT PDF (sin AG Grid)
  // ============================================================
  exportPdfDiarioMovimientos(): void {
    const LOGO_BASE64 = '';

    const documentos: any[] = [...(this.rowData ?? [])];
    if (documentos.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const marginLeft = 10;
    const marginRight = 10;
    const topMargin = 12;
    const bottomMargin = 12;

    const FONT = 'helvetica';
    let y = topMargin;

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

    const drawFooter = () => {
      const page = doc.getNumberOfPages();
      doc.setFont(FONT, 'normal');
      doc.setFontSize(9);
      doc.text(`Página ${page}`, pageWidth - marginRight - 20, pageHeight - 6);
    };

    const drawHeaderGeneral = () => {
      doc.setFont(FONT, 'bold');
      doc.setFontSize(14);

      if (LOGO_BASE64) {
        doc.addImage(`data:image/png;base64,${LOGO_BASE64}`, 'PNG', marginLeft, 8, 22, 22);
      }

      doc.text('DIARIO DE MOVIMIENTOS', pageWidth / 2, 16, { align: 'center' });

      doc.setFont(FONT, 'normal');
      doc.setFontSize(10);

      const leftX = marginLeft;
      let yy = 26;

      doc.text('Rango de Fechas', leftX, yy);
      yy += 5;
      doc.text(`Fecha Inicio:  ${this.fechaDesde ?? ''}`, leftX, yy);
      yy += 5;
      doc.text(`Fecha Final:   ${this.fechaHasta ?? ''}`, leftX, yy);

      yy += 7;
      doc.text(`Fecha del Reporte: ${formatDateES(new Date())}`, leftX, yy);

      const rightX = pageWidth / 2 + 20;
      let yr = 26;

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

      drawLine(50);
      y = 56;
    };

    const ensureSpace = (neededMm: number) => {
      if (y + neededMm <= pageHeight - bottomMargin) return;

      doc.addPage();
      y = topMargin;
      drawHeaderGeneral();
    };

    drawHeaderGeneral();

    documentos.forEach((m: any) => {
      ensureSpace(40);

      doc.setFont(FONT, 'bold');
      doc.setFontSize(10);

      const x1 = marginLeft;
      const x2 = pageWidth / 2 + 10;

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

      const comp = m.comprobante ?? m.numComprobante ?? '';
      const cheque = m.cheque ?? 0;
      const cotizacion = m.cotizacion ?? m.cotiza ?? '';

      const yTop = y - 15;

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

      drawLine(y);
      y += 2;

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

      if (body.length === 0) body.push(['', '', '(Sin detalles)', '', '0.00', '0.00']);

      autoTable(doc, {
        startY: y,
        theme: 'grid',
        styles: { font: FONT, fontSize: 9, cellPadding: 2 },
        headStyles: {
          fillColor: [230, 230, 230],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 28 },
          2: { cellWidth: 45 },
          3: { cellWidth: 55 },
          4: { halign: 'right', cellWidth: 20 },
          5: { halign: 'right', cellWidth: 20 }
        },
        head: [['Local', 'N° Cuenta', 'Descripción', 'Comentario', 'Debe', 'Haber']],
        body,
        didDrawPage: () => {
          drawFooter();
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY ?? y;
      y = finalY + 4;

      ensureSpace(10);
      doc.setFont(FONT, 'bold');
      doc.text('Total por Comprobante', pageWidth - marginRight - 85, y);

      doc.setFont(FONT, 'bold');
      doc.text(fmtMoney(totalDebe), pageWidth - marginRight - 25, y, { align: 'right' });
      doc.text(fmtMoney(totalHaber), pageWidth - marginRight - 5, y, { align: 'right' });

      y += 6;

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(marginLeft, y, pageWidth - marginRight, y);
      doc.setLineDashPattern([], 0);

      y += 6;
    });

    drawFooter();
    doc.save(`Diario_Movimientos_${this.fechaDesde}_${this.fechaHasta}.pdf`);
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
          this.pageIndex = 0;
          this.expandedId = null;
          this.loading = false;
        },
        error: (err: any) => {
          console.error('Error al cargar balance', err);
          this.rowData = [];
          this.loading = false;
        }
      });
  }

  docKey(row: any): string {
    return String(row?.documento ?? '');
  }

  // ===========================
  // PAGINACIÓN (tabla común)
  // ===========================
  pageSizeOptions: number[] = [10, 20, 50, 100];
  pageSize = 20;
  pageIndex = 0; // 0-based

  get totalRows(): number {
    return this.filteredRowData.length;
  }

  get totalPages(): number {
    const t = this.totalRows;
    return t === 0 ? 0 : Math.ceil(t / this.pageSize);
  }

  get fromRow(): number {
    if (this.totalRows === 0) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  get toRow(): number {
    if (this.totalRows === 0) return 0;
    return Math.min((this.pageIndex + 1) * this.pageSize, this.totalRows);
  }

  get pagedRowData() {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredRowData.slice(start, end);
  }

  get canPrev(): boolean {
    return this.pageIndex > 0;
  }

  get canNext(): boolean {
    return this.totalPages > 0 && this.pageIndex < this.totalPages - 1;
  }

  onPageSizeChange(value: any): void {
    const newSize = Number(value);
    if (!newSize || newSize <= 0) return;

    this.pageSize = newSize;
    this.pageIndex = 0;
    this.expandedId = null;
  }

  firstPage(): void {
    if (!this.canPrev) return;
    this.pageIndex = 0;
    this.expandedId = null;
  }

  prevPage(): void {
    if (!this.canPrev) return;
    this.pageIndex--;
    this.expandedId = null;
  }

  nextPage(): void {
    if (!this.canNext) return;
    this.pageIndex++;
    this.expandedId = null;
  }

  lastPage(): void {
    if (!this.canNext) return;
    this.pageIndex = this.totalPages - 1;
    this.expandedId = null;
  }

  trackByDoc = (_: number, row: any) => String(row?.documento ?? '');

  // ===========================
  // FILTROS POR COLUMNA (tabla)
  // ===========================
  columnFilters = {
    tipo: '',
    documento: '',
    fechaTransaccion: null as string | null,
    fechaIngreso: null as string | null,
    beneficiario: '',
    observacion: '',
    debe: '',
    haber: '',
    responsable: ''
  };

  onFilterInput(): void {
    // Al filtrar: vuelve a la primera página y colapsa expansión
    this.pageIndex = 0;
    this.expandedId = null;
  }

  private normText(v: any): string {
    return (v ?? '').toString().trim().toLowerCase();
  }

  private normNumberText(v: any): string {
    // permite buscar aunque el número tenga comas/espacios
    return (v ?? '').toString().replace(/[\s,]/g, '').trim().toLowerCase();
  }

  private toYmd(value: any): string | null {
    if (!value) return null;

    // ISO: 2026-01-06T...
    const s = value.toString().trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

    // Date parse fallback
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    }

    return null;
  }

  get filteredRowData(): BalanceDiarioResponse[] {
    const data = this.rowData ?? [];
    const f = this.columnFilters;

    const ftipo = this.normText(f.tipo);
    const fdoc = this.normText(f.documento);
    const fben = this.normText(f.beneficiario);
    const fobs = this.normText(f.observacion);
    const fdebe = this.normNumberText(f.debe);
    const fhab = this.normNumberText(f.haber);
    const fresp = this.normText(f.responsable);

    const trxDesde = f.fechaTransaccion;
    const ingDesde = f.fechaIngreso;

    return data.filter((r: any) => {
      if (ftipo && !this.normText(r.tipo).includes(ftipo)) return false;
      if (fdoc && !this.normText(r.documento).includes(fdoc)) return false;

      if (fben && !this.normText(r.beneficiario).includes(fben)) return false;
      if (fobs && !this.normText(r.observacion).includes(fobs)) return false;

      if (fdebe && !this.normNumberText(r.debe).includes(fdebe)) return false;
      if (fhab && !this.normNumberText(r.haber).includes(fhab)) return false;

      if (fresp) {
        const respTxt = this.normText(`${r.codResponsable ?? ''} - ${r.nomResponsable ?? ''}`);
        if (!respTxt.includes(fresp)) return false;
      }

      // Rango fecha transacción
      if (ingDesde) {
        const trx = this.toYmd(r.fechaTransaccion);
        if (!trx) return false;
        if (trx !== trxDesde) return false;
      }

      // Rango fecha ingreso
      if (ingDesde) {
        const ing = this.toYmd(r.fechaIngreso);
        if (!ing) return false;
        if (ing !== ingDesde) return false;
      }

      return true;
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

  private formatIsoDDMMYYYY(iso: any): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return this.formatDateDDMMYYYY(d);
  }
}
