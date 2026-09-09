// src/app/components/cg-3000/activo-fijo/reporte-depreciacion/reporte-depreciacion.component.ts
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { finalize, switchMap, map } from 'rxjs/operators';

import {
  ActivoFijoReportService,
  ReporteDepreciacionDto
} from 'src/app/services/activo-fijo-report.service';

import {
  AsientosContablesService,
  AsientoContableRequest,
  AsientoContableDetalleRequest,
  AsientoContableResponse
} from 'src/app/services/asientos-conta.service';

import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-community';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type MesItem = { value: number; label: string };
type AsientoInfoUI = { tipdoc: string; numdoc: string; totalDebe: number; totalHaber: number };

@Component({
  selector: 'app-reporte-depreciacion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatCardModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,

    AgGridAngular
  ],
  templateUrl: './reporte-depreciacion.component.html',
  styleUrls: ['./reporte-depreciacion.component.css']
})
export class ReporteDepreciacionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ActivoFijoReportService);
  private readonly asientosApi = inject(AsientosContablesService);
  private readonly router = inject(Router);
private readonly dialog = inject(MatDialog);
  readonly loading = signal(false);
  readonly loadingText = signal('');
  readonly rows = signal<ReporteDepreciacionDto[]>([]);
  readonly pinnedBottom = signal<ReporteDepreciacionDto[]>([]);
  readonly errorMsg = signal<string | null>(null);

  // ✅ resultado del asiento en UI
  readonly asientoInfo = signal<AsientoInfoUI | null>(null);

  private gridApi?: GridApi<ReporteDepreciacionDto>;

  // =======================
  // ✅ CUENTAS QUEMADAS (TEMP)
  // =======================
  private readonly PLAN_ID_BY_CODPRE: Record<string, number> = {
    // DEBE (Depreciación deducible)
    '510301-001': 356,
    '510301-002': 357,
    '510301-003': 358,
    '510301-004': 359,

    // HABER (Depreciación acumulada)
    '120110-002': 70,
    '120110-003': 71,
    '120110-004': 72,
    '120110-005': 73,
  };

  private readonly ID_TIPO_ASIENTO = 9;   // ✅ confirmado por ti
  private readonly TIPDOC = 'AD';
  private readonly ID_COD_CONTABLE = 18005;

  readonly meses: MesItem[] = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
  ];

  readonly form = this.fb.group({
    anio: [new Date().getFullYear(), [Validators.required, Validators.min(1900), Validators.max(2500)]],
    mes: [new Date().getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
    cuentaPrefix6: [null as string | null],
  });

  readonly totalDepMensual = computed(() =>
    this.rows().reduce((acc, r) => acc + (Number((r as any).depreMensual ?? 0) || 0), 0)
  );

  // ==========================================================
  // ✅ BLOQUEO 100% POR BD: si el SP trae asiento => ya existe
  // ==========================================================
  readonly asientoPeriodo = computed(() => {
    const r = this.rows().find(x => String((x as any).asiento ?? '').trim().length > 0);
    return (String((r as any)?.asiento ?? '').trim() || null);
  });

  readonly asientoYaGenerado = computed(() => !!this.asientoPeriodo());

  readonly puedeAsiento = computed(() =>
    this.rows().length > 0 && !this.loading() && !this.asientoYaGenerado()
  );

  // (solo para mensajes)
  private periodoKey(): string {
    const anio = Number(this.form.value.anio ?? 0) || 0;
    const mes = Number(this.form.value.mes ?? 0) || 0;
    return `${anio}-${String(mes).padStart(2, '0')}`;
  }

  // ==========================
  // AG GRID
  // ==========================
  gridOptions: GridOptions<ReporteDepreciacionDto> = {
    defaultColDef: { sortable: true, filter: true, resizable: true },
    animateRows: true,
    rowHeight: 44,
    headerHeight: 38,
    getRowStyle: (p) => (p.node.rowPinned ? { fontWeight: '700' } : undefined),
  };

  colDefs: ColDef<ReporteDepreciacionDto>[] = [
    { headerName: 'Cuenta', field: 'cuentaMy', width: 120 },
    { headerName: 'Código', field: 'codigoAf', width: 90 },
    {
      headerName: 'Fecha Compra',
      field: 'feccompra',
      width: 130,
      valueFormatter: (p) => this.formatFechaDMY(p.value),
      comparator: (a, b) => this.compareFechaISO(a, b),
      filter: 'agDateColumnFilter',
      filterParams: {
        comparator: (filterLocalDateAtMidnight: Date, cellValue: any) => {
          const d = this.parseFecha(cellValue);
          if (!d) return -1;
          const cell = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const filter = new Date(
            filterLocalDateAtMidnight.getFullYear(),
            filterLocalDateAtMidnight.getMonth(),
            filterLocalDateAtMidnight.getDate()
          );
          if (cell < filter) return -1;
          if (cell > filter) return 1;
          return 0;
        }
      }
    },
    { headerName: 'Descripción', field: 'descripcion', minWidth: 260, flex: 1 },

    // ✅ columna asiento (de BD)
    { headerName: 'Asiento', field: 'asiento' as any, width: 120 },

    {
      headerName: 'Dep. Mensual',
      field: 'depreMensual' as any,
      width: 120,
      cellClass: 'ag-right-aligned-cell',
      valueFormatter: (p) => this.formatMoney(p.value)
    },
    { headerName: 'Debe', field: 'ctaContable1', width: 140 },
    { headerName: 'Haber', field: 'ctaContable2', width: 140 },
  ];

  onGridReady(event: GridReadyEvent<ReporteDepreciacionDto>) {
    this.gridApi = event.api;
  }

  // ==========================
  // ACCIONES
  // ==========================
  generar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMsg.set(null);

    this.loadingText.set('Generando reporte...');
    this.loading.set(true);

    this.rows.set([]);
    this.pinnedBottom.set([]);

    const req = this.form.getRawValue();

    this.api.reporteDepreciacion({
      anio: req.anio!,
      mes: req.mes!,
      cuentaPrefix6: (req.cuentaPrefix6 ?? null)?.trim() || null
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          const list = data ?? [];
          this.rows.set(list);

          const totalMensual = list.reduce((acc, r) => acc + (Number((r as any).depreMensual ?? 0) || 0), 0);

          this.pinnedBottom.set([{
            expira: 0,
            cuentaMy: 'TOTAL',
            codigoAf: 0,
            descripcion: `Registros: ${list.length}`,
            depreMensual: totalMensual,
          } as any]);

          // ✅ asiento desde BD (si existe)
          const asiento = (list.find(x => String((x as any).asiento ?? '').trim()) as any)?.asiento as string | undefined;
          if (asiento && asiento.includes('-')) {
            const [tipdoc, numdoc] = asiento.split('-', 2);
            this.asientoInfo.set({
              tipdoc: tipdoc ?? '',
              numdoc: numdoc ?? '',
              totalDebe: 0,
              totalHaber: 0
            });
          } else {
            this.asientoInfo.set(null);
          }

          this.gridApi?.refreshCells({ force: true });
        },
        error: (err) => this.errorMsg.set(err?.message || 'Error consultando reporte.')
      });
  }

 generarAsiento(): void {
  // 1) Validaciones mínimas UI
  if (this.loading()) return;

  const data = this.rows();
  if (!data.length) return;

  // 2) Bloqueo REAL por BD:
  //    Si el SP ya trae "asiento" (columna), entonces ya existe asiento generado.
  const asientoExistente = (data.find(r => String((r as any).asiento ?? '').trim() !== '') as any)?.asiento;
  if (asientoExistente) {
    this.errorMsg.set(`Ya existe un asiento generado para ${this.periodoKey()}: ${asientoExistente}`);
    return;
  }

  // 3) Confirmación
  this.confirmarGenerarAsiento().subscribe((ok: boolean) => {
    if (!ok) return;
    this.generarAsientoConfirmado(); // ejecuta el proceso real
  });
}
  // ==========================
  // PDF
  // ==========================
  imprimirPdf(): void {
    const data = this.rows();
    if (!data.length) return;

    const anio = this.form.value.anio!;
    const mes = this.form.value.mes!;
    const mesNombre = this.meses.find(m => m.value === mes)?.label ?? `${mes}`;
    const fechaDep = new Date(anio, mes - 1, 1);
    const fechaImp = new Date();

    const empresa = (data[0] as any)?.empresa ?? '';
    const ruc = (data[0] as any)?.ruc ?? '';
    const direccion = (data[0] as any)?.direccion ?? '';

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const fmtMoney = (n: any) => {
      const v = Number(n ?? 0) || 0;
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    };

    const fmtDate = (iso?: string | null) => {
      if (!iso) return '';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear());
      return `${dd}/${mm}/${yy}`;
    };

    const fmtDatePlain = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear());
      return `${dd}/${mm}/${yy}`;
    };

    const TOP = 42;

    const drawHeader = (pageNumber: number) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      doc.text(empresa, 105, 12, { align: 'center' });
      if (ruc) doc.text(`RUC: ${ruc}`, 105, 17, { align: 'center' });
      if (direccion) doc.text(direccion, 105, 22, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`${mesNombre} / ${anio}`, 105, 29, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Fecha Depreciación : ${fmtDatePlain(fechaDep)}`, 14, 36);
      doc.text(`Fecha Impresión : ${fmtDatePlain(fechaImp)}`, 110, 36);
      doc.text(`Página : ${pageNumber}`, 190, 36, { align: 'right' });
    };

    const groups = new Map<string, ReporteDepreciacionDto[]>();
    for (const r of data) {
      const k = (r as any).cuentaMy ?? 'SIN_CUENTA';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(r);
    }

    let cursorY = TOP;

    for (const [cuenta, items] of groups.entries()) {
      cursorY = Math.max(cursorY, TOP);

      if (cursorY > 270) {
        doc.addPage();
        cursorY = TOP;
      }

      const nombreCuenta = String((items[0] as any)?.nombreCuenta ?? '').trim() || cuenta;
      const subDepMensual = items.reduce((acc, it) => acc + (Number((it as any).depreMensual ?? 0) || 0), 0);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(nombreCuenta.toUpperCase(), 14, cursorY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Cuenta: ${cuenta}`, 190, cursorY + 5, { align: 'right' });

      cursorY += 10;

      const bodyRows = items.map(it => ([
        (it as any).codigoAf ?? '',
        fmtDate((it as any).feccompra),
        (it as any).descripcion ?? '',
        (it as any).comprobante ?? '',
        fmtMoney((it as any).valorcompra),
        fmtMoney((it as any).valorresidual),
        String((it as any).vidautil ?? ''),
        fmtMoney((it as any).depresiacionAnual),
        fmtMoney((it as any).depreMensual),
      ]));

      autoTable(doc, {
        startY: cursorY,
        margin: { top: TOP, left: 14, right: 14 },
        head: [[
          'Código', 'Fecha Compra', 'Descripción', 'Comprobante',
          'Val. Compra', 'Val. Residual', 'Vida Util', 'Dep. Anual', 'Dep. Mensual'
        ]],
        body: bodyRows,
        foot: [[
          { content: `${cuenta}  -  ${nombreCuenta.toUpperCase()}`, colSpan: 7, styles: { halign: 'center', fontStyle: 'bold' } },
          { content: 'TOTAL:', styles: { halign: 'right', fontStyle: 'bold' } },
          { content: fmtMoney(subDepMensual), styles: { halign: 'right', fontStyle: 'bold' } },
        ]],
        showFoot: 'lastPage',
        styles: { fontSize: 8, cellPadding: 1.2 },
        headStyles: { fontSize: 8 },
        footStyles: { fontSize: 8, fontStyle: 'bold' },
        columnStyles: {
          4: { halign: 'right' },
          5: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right' },
        },
        willDrawPage: (hookData) => drawHeader(hookData.pageNumber),
      });

      // @ts-ignore
      const lastY = (doc as any).lastAutoTable?.finalY ?? cursorY;
      cursorY = Math.max(lastY + 8, TOP);
    }

    doc.save(`Depreciacion_${mesNombre}_${anio}.pdf`);
  }

  salir(): void {
    this.router.navigateByUrl('/cg-3000/activo-fijo');
  }

  // ==========================
  // Helpers
  // ==========================
  private parseFecha(value: any): Date | null {
    if (!value) return null;

    if (typeof value === 'string') {
      const s = value.trim();

      // yyyy-MM-dd
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d);
      }

      // dd/MM/yyyy (o cualquier ISO)
      const dt = new Date(s);
      return isNaN(dt.getTime()) ? null : dt;
    }

    if (value instanceof Date) return value;

    return null;
  }

  private formatFechaDMY(value: any): string {
    const d = this.parseFecha(value);
    if (!d) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private compareFechaISO(a: any, b: any): number {
    const da = this.parseFecha(a);
    const db = this.parseFecha(b);
    return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
  }

  private formatMoney(v: any): string {
    const n = Number(v ?? 0) || 0;
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
  private confirmarGenerarAsiento() {
  const anio = this.form.value.anio!;
  const mes = this.form.value.mes!;
  const mesNombre = this.meses.find(m => m.value === mes)?.label ?? `${mes}`;

  return this.dialog.open(CustomMessageBoxComponent, {
    width: '460px',
    data: {
      title: 'Confirmación',
      message:
        `¿Está seguro de generar el asiento de depreciación?\n\n` +
        `Período: ${mesNombre}/${anio}\n` +
        `Total Dep. Mensual: ${this.totalDepMensual().toFixed(2)}`,
      type: 'info',
      confirmText: 'Sí, generar',
      cancelText: 'Cancelar',
      showCancel: true
    }
  }).afterClosed();
}
private generarAsientoConfirmado(): void {
  const data = this.rows();
  if (!data.length) return;

  const anioNum = this.form.value.anio!;
  const mesNum = this.form.value.mes!;

  // ✅ usuario/empresa
  const idUsuario = Number(localStorage.getItem('id_usuario') ?? 0) || 1;
  const idEmpresa = Number(localStorage.getItem('id_empresa') ?? 1) || 1;
  const idZona = 1;

  if (idUsuario <= 0) {
    this.errorMsg.set('No puedo generar asiento: id_usuario no encontrado en sesión.');
    return;
  }

  // ==========================
  // 1) Armar mapas DEBE / HABER
  // ==========================
  type Acc = { codpre: string; idPlan: number; monto: number };

  const debeMap = new Map<string, Acc>();
  const haberMap = new Map<string, Acc>();
  const faltantes: string[] = [];

  for (const r of data) {
    const monto = Number(r.depreMensual ?? 0) || 0;
    if (monto <= 0) continue;

    const codDebe = String(r.ctaContable1 ?? '').trim();
    const codHaber = String(r.ctaContable2 ?? '').trim();

    if (!codDebe || !codHaber) {
      faltantes.push(`Fila códigoAf=${r.codigoAf} sin ctaContable1/ctaContable2`);
      continue;
    }

    const idPlanDebe = this.PLAN_ID_BY_CODPRE[codDebe];
    const idPlanHaber = this.PLAN_ID_BY_CODPRE[codHaber];

    if (!idPlanDebe) faltantes.push(`Sin mapeo DEBE para ${codDebe} (codigoAf=${r.codigoAf})`);
    if (!idPlanHaber) faltantes.push(`Sin mapeo HABER para ${codHaber} (codigoAf=${r.codigoAf})`);

    if (!idPlanDebe || !idPlanHaber) continue;

    const d = debeMap.get(codDebe);
    if (d) d.monto += monto;
    else debeMap.set(codDebe, { codpre: codDebe, idPlan: idPlanDebe, monto });

    const h = haberMap.get(codHaber);
    if (h) h.monto += monto;
    else haberMap.set(codHaber, { codpre: codHaber, idPlan: idPlanHaber, monto });
  }

  if (faltantes.length) {
    this.errorMsg.set(
      `No puedo generar asiento:\n- ${faltantes.slice(0, 10).join('\n- ')}${faltantes.length > 10 ? '\n- ...' : ''}`
    );
    return;
  }

  const totalDebe = Array.from(debeMap.values()).reduce((a, x) => a + x.monto, 0);
  const totalHaber = Array.from(haberMap.values()).reduce((a, x) => a + x.monto, 0);

  if (totalDebe <= 0 || totalHaber <= 0) {
    this.errorMsg.set('No puedo generar asiento: el total es 0.');
    return;
  }

  const diff = Math.abs(totalDebe - totalHaber);
  if (diff > 0.01) {
    this.errorMsg.set(`No puedo generar asiento: totales no cuadran. Debe=${totalDebe.toFixed(2)} Haber=${totalHaber.toFixed(2)}`);
    return;
  }

  // ==========================
  // 2) Construir payload asiento
  // ==========================
  this.errorMsg.set(null);
  this.loadingText.set('Guardando depreciación...');
  this.loading.set(true);

  // Fecha transacción = último día del mes
  const fechaTrans = new Date(anioNum, mesNum, 0);
  const isoFechaTrans = fechaTrans.toISOString();
  const isoAhora = new Date().toISOString();

  const now = new Date();
  const hora =
    `${String(now.getHours()).padStart(2, '0')}:` +
    `${String(now.getMinutes()).padStart(2, '0')}:` +
    `${String(now.getSeconds()).padStart(2, '0')}`;

  const mesLabel = this.meses.find(m => m.value === mesNum)?.label ?? `${mesNum}`;
  const observacion = `ASIENTO DEPRECIACIÓN ${mesLabel}/${anioNum}`;

  let linea = 1;
  const detalles: AsientoContableDetalleRequest[] = [];

  // DEBE
  for (const x of Array.from(debeMap.values()).sort((a, b) => a.codpre.localeCompare(b.codpre))) {
    detalles.push({
      idDetMaestro: 0,
      idCabMaestro: 0,
      numlinea: linea++,
      anio: String(anioNum),
      fechatransaccion: isoFechaTrans,
      hora,
      idZona,
      idCentroCostos: null,
      idLocal: 1,
      idPlanCuentas: x.idPlan,
      codprePc: x.codpre,
      idCodContable: this.ID_COD_CONTABLE,
      nocomprobante: null,
      docurelacionado: null,
      cheque: 0,
      beneficiario: null,
      debe: Number(x.monto.toFixed(2)),
      haber: 0,
      comentario: `DEPRECIACIÓN ${mesLabel}/${anioNum}`,
      idMovBancario: 1,
      movbancario: '0',
      fechaingreso: isoAhora
    });
  }

  // HABER
  for (const x of Array.from(haberMap.values()).sort((a, b) => a.codpre.localeCompare(b.codpre))) {
    detalles.push({
      idDetMaestro: 0,
      idCabMaestro: 0,
      numlinea: linea++,
      anio: String(anioNum),
      fechatransaccion: isoFechaTrans,
      hora,
      idZona,
      idCentroCostos: null,
      idLocal: 1,
      idPlanCuentas: x.idPlan,
      codprePc: x.codpre,
      idCodContable: this.ID_COD_CONTABLE,
      nocomprobante: null,
      docurelacionado: null,
      cheque: 0,
      beneficiario: null,
      debe: 0,
      haber: Number(x.monto.toFixed(2)),
      comentario: `DEPRECIACIÓN ACUMULADA ${mesLabel}/${anioNum}`,
      idMovBancario: 1,
      movbancario: '0',
      fechaingreso: isoAhora
    });
  }

  const asientoPayload: AsientoContableRequest = {
    idCabMaestro: 0,
    idZona,
    idUsuario,
    idEmpresa,
    idTipoAsiento: this.ID_TIPO_ASIENTO,
    tipdoc: this.TIPDOC,
    numdoc: 0,
    anio: String(anioNum),
    fechatransaccion: isoFechaTrans,
    fechaingreso: isoAhora,
    observacion,
    totdebe: Number(totalDebe.toFixed(2)),
    tothaber: Number(totalHaber.toFixed(2)),
    beneficiario: 'DEPRECIACIÓN ACTIVOS FIJOS',
    estado: true,
    modulo: 2,
    detalles
  };

  // Helper: normaliza respuesta del API de asientos
  const extraerTipdocNumdoc = (resp: any): { tipdoc: string; numdoc: string } => {
    const tipdoc = String(resp?.tipdoc ?? this.TIPDOC).trim() || this.TIPDOC;

    let numdoc = resp?.numdoc != null ? String(resp.numdoc).trim() : '';

    // Fallback: si tu API devuelve solo message tipo:
    // "Asiento creado. Cabecera Id=10313, Numdoc=26010027, detalles=8"
    if (!numdoc) {
      const msg = String(resp?.message ?? '').trim();
      const m = msg.match(/numdoc\s*=\s*(\d+)/i) || msg.match(/numdoc\s*[:]\s*(\d+)/i) || msg.match(/Numdoc\s*=\s*(\d+)/i);
      if (m?.[1]) numdoc = m[1];
    }

    if (!numdoc) {
      throw new Error('No se pudo obtener numdoc del response de crear asiento.');
    }

    return { tipdoc, numdoc };
  };

  const req = this.form.getRawValue();

  this.api.guardarDepreciacion({ anio: anioNum, mes: mesNum, rows: data })
    .pipe(
      switchMap((saveRes) => {
        this.loadingText.set(`Creando asiento... (Insertados: ${saveRes.insertados}, Duplicados: ${saveRes.duplicados})`);
        return this.asientosApi.crearAsiento(asientoPayload);
      }),

      // 1) Marcar asiento en cg.detalle_activo_fijo
      switchMap((resp: AsientoContableResponse) => {
        const { tipdoc, numdoc } = extraerTipdocNumdoc(resp as any);
        const asientoStr = `${tipdoc}-${numdoc}`;

        return this.api.marcarAsientoDepreciacion({
          anio: anioNum,
          mes: mesNum,
          tipdoc,
          numdoc,
          asiento: asientoStr
        }).pipe(
          map((markRes) => ({ resp, tipdoc, numdoc, asientoStr, markRes }))
        );
      }),

      // 2) Refrescar grid re-consultando reporte (para que venga desde BD)
      switchMap(({ resp, tipdoc, numdoc, asientoStr, markRes }) => {
        this.loadingText.set('Refrescando reporte...');
        return this.api.reporteDepreciacion({
          anio: req.anio!,
          mes: req.mes!,
          cuentaPrefix6: (req.cuentaPrefix6 ?? null)?.trim() || null
        }).pipe(
          map((list) => ({ resp, tipdoc, numdoc, asientoStr, markRes, list: list ?? [] }))
        );
      }),

      finalize(() => this.loading.set(false))
    )
    .subscribe({
      next: ({ resp, tipdoc, numdoc, asientoStr, list }) => {
        // ✅ UI asiento
        const info: AsientoInfoUI = {
          tipdoc,
          numdoc,
          totalDebe: (resp as any)?.totdebe ?? Number(totalDebe.toFixed(2)),
          totalHaber: (resp as any)?.tothaber ?? Number(totalHaber.toFixed(2))
        };
        this.asientoInfo.set(info);

        // ✅ refrescar grilla
        this.rows.set(list);

        const totalMensual = list.reduce((acc, r) => acc + (Number(r.depreMensual ?? 0) || 0), 0);
        this.pinnedBottom.set([{
          expira: 0,
          cuentaMy: 'TOTAL',
          codigoAf: 0,
          descripcion: `Registros: ${list.length}`,
          depreMensual: totalMensual,
        } as ReporteDepreciacionDto]);

        // ✅ refresco visual
        this.gridApi?.refreshCells({ force: true });

        // (opcional) por si quieres mostrarlo sin depender de asientoInfo:
        // this.errorMsg.set(`Asiento generado: ${asientoStr}`);
      },
      error: (err) => {
        this.errorMsg.set(err?.message || 'Error creando/marcando asiento.');
      }
    });
}
}