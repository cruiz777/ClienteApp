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

import { finalize, switchMap } from 'rxjs/operators';

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


  private readonly ID_TIPO_ASIENTO = 9; // ✅ confirmado por ti
  private readonly TIPDOC = 'AD';
  private readonly ID_COD_CONTABLE = 18005; // según tu ejemplo

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
    this.rows().reduce((acc, r) => acc + (Number(r.depreMensual ?? 0) || 0), 0)
  );

  // ✅ Ahora considera también el bloqueo por asiento ya generado
  readonly puedeAsiento = computed(() =>
    this.rows().length > 0 && !this.loading() && !this.asientoYaGenerado()
  );

  // ==========================
  // PERSISTENCIA BLOQUEO ASIENTO (localStorage)
  // ==========================
  private periodoKey(): string {
    const anio = Number(this.form.value.anio ?? 0) || 0;
    const mes = Number(this.form.value.mes ?? 0) || 0;
    return `${anio}-${String(mes).padStart(2, '0')}`;
  }

  private asientoStorageKey(): string {
    return `af_depreciacion_asiento_${this.periodoKey()}`;
  }

  /** ✅ True si ya existe asiento (en memoria o persistido) para ese período */
  asientoYaGenerado(): boolean {
    if (this.asientoInfo() != null) return true;
    const raw = localStorage.getItem(this.asientoStorageKey());
    return !!raw;
  }

  /** ✅ Carga de storage -> asientoInfo (para mantener bloqueo tras refrescar o regenerar) */
  private hidratarAsientoSiExiste(): void {
    const raw = localStorage.getItem(this.asientoStorageKey());
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as AsientoInfoUI;
      if (parsed?.tipdoc && parsed?.numdoc) {
        this.asientoInfo.set(parsed);
      }
    } catch {
      // si está corrupto, lo limpio
      localStorage.removeItem(this.asientoStorageKey());
    }
  }

  /** ✅ Guardar asiento generado en storage */
  private persistirAsiento(info: AsientoInfoUI): void {
    localStorage.setItem(this.asientoStorageKey(), JSON.stringify(info));
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
    { headerName: 'Comprobante', field: 'comprobante', width: 120 },
    {
      headerName: 'Dep. Mensual',
      field: 'depreMensual',
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

    // 👇 OJO: NO pierdas el bloqueo si ya existe en localStorage
    this.asientoInfo.set(null);

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

          const totalMensual = list.reduce((acc, r) => acc + (Number(r.depreMensual ?? 0) || 0), 0);

          this.pinnedBottom.set([{
            expira: 0,
            cuentaMy: 'TOTAL',
            codigoAf: 0,
            descripcion: `Registros: ${list.length}`,
            depreMensual: totalMensual,
          } as ReporteDepreciacionDto]);

          // ✅ rehidrata asiento si ya existía para este período
          this.hidratarAsientoSiExiste();
        },
        error: (err) => this.errorMsg.set(err?.message || 'Error consultando reporte.')
      });
  }

  generarAsiento(): void {
    // ✅ BLOQUEO local (solo esta máquina)
    this.hidratarAsientoSiExiste();
    if (this.asientoYaGenerado()) {
      const a = this.asientoInfo();
      this.errorMsg.set(
        a
          ? `Ya existe un asiento generado para ${this.periodoKey()}: ${a.tipdoc}-${a.numdoc}.`
          : `Ya existe un asiento generado para ${this.periodoKey()}.`
      );
      return;
    }

    const data = this.rows();
    if (!data.length) return;

    const anioNum = this.form.value.anio!;
    const mesNum = this.form.value.mes!;

    // ✅ usuario/empresa
    const idUsuario = Number(localStorage.getItem('id_usuario') ?? 0) || 1;
    const idEmpresa = Number(localStorage.getItem('id_empresa') ?? 1) || 1;
    const idZona = 1;

    if (idUsuario <= 0) {
      this.errorMsg.set('No puedo generar asiento: id_usuario no encontrado en sesión (localStorage).');
      return;
    }

    // ✅ Sumatorias por cuenta
    type Acc = { codpre: string; idPlan: number; monto: number };

    const debeMap = new Map<string, Acc>();   // key = codpreDebe
    const haberMap = new Map<string, Acc>();  // key = codpreHaber

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
      this.errorMsg.set(`No puedo generar asiento:\n- ${faltantes.slice(0, 10).join('\n- ')}${faltantes.length > 10 ? '\n- ...' : ''}`);
      return;
    }

    const totalDebe = Array.from(debeMap.values()).reduce((a, x) => a + x.monto, 0);
    const totalHaber = Array.from(haberMap.values()).reduce((a, x) => a + x.monto, 0);

    if (totalDebe <= 0 || totalHaber <= 0) {
      this.errorMsg.set('No puedo generar asiento: el total es 0.');
      return;
    }

    // (opcional) tolerancia por decimales
    const diff = Math.abs(totalDebe - totalHaber);
    if (diff > 0.01) {
      this.errorMsg.set(`No puedo generar asiento: totales no cuadran. Debe=${totalDebe.toFixed(2)} Haber=${totalHaber.toFixed(2)}`);
      return;
    }

    this.errorMsg.set(null);
    this.loadingText.set('Guardando depreciación...');
    this.loading.set(true);

    // Fecha transacción = último día del mes
    const fechaTrans = new Date(anioNum, mesNum, 0);
    const isoFechaTrans = fechaTrans.toISOString();
    const isoAhora = new Date().toISOString();

    const now = new Date();
    const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const mesLabel = this.meses.find(m => m.value === mesNum)?.label ?? `${mesNum}`;
    const observacion = `ASIENTO DEPRECIACIÓN ${mesLabel}/${anioNum}`;

    // ✅ Construir detalles dinámicos
    let linea = 1;
    const detalles: AsientoContableDetalleRequest[] = [];

    // DEBE (Depreciación deducible)
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

    // HABER (Depreciación acumulada)
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

    this.api.guardarDepreciacion({ anio: anioNum, mes: mesNum, rows: data })
      .pipe(
        switchMap((saveRes) => {
          this.loadingText.set(`Creando asiento... (Insertados: ${saveRes.insertados}, Duplicados: ${saveRes.duplicados})`);
          return this.asientosApi.crearAsiento(asientoPayload);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (resp: AsientoContableResponse) => {
          const info: AsientoInfoUI = {
            tipdoc: resp.tipdoc,
            numdoc: String(resp.numdoc),
            totalDebe: resp.totdebe,
            totalHaber: resp.tothaber
          };
          this.asientoInfo.set(info);
          this.persistirAsiento(info);
        },
        error: (err) => this.errorMsg.set(err?.message || 'Error creando asiento.')
      });
  }


  // ==========================
  // PDF (sin cambios)
  // ==========================
imprimirPdf(): void {
  const data = this.rows();
  if (!data.length) return;

  const anio = this.form.value.anio!;
  const mes = this.form.value.mes!;
  const mesNombre = this.meses.find(m => m.value === mes)?.label ?? `${mes}`;
  const fechaDep = new Date(anio, mes - 1, 1);
  const fechaImp = new Date();

  const empresa = data[0]?.empresa ?? '';
  const ruc = data[0]?.ruc ?? '';
  const direccion = data[0]?.direccion ?? '';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ✅ punto decimal en PDF
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

  // ✅ Altura reservada para encabezado
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

  // ✅ Agrupar por cuentaMy
  const groups = new Map<string, ReporteDepreciacionDto[]>();
  for (const r of data) {
    const k = r.cuentaMy ?? 'SIN_CUENTA';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  let cursorY = TOP;

  for (const [cuenta, items] of groups.entries()) {
    cursorY = Math.max(cursorY, TOP);

    // salto manual si ya no cabe el título
    if (cursorY > 270) {
      doc.addPage();
      cursorY = TOP;
    }

    // ✅ nombre de cuenta (si no viene, cae al número)
    const nombreCuenta = String(items[0]?.nombreCuenta ?? '').trim() || cuenta;

    // ✅ subtotal por cuenta (Dep. Mensual)
    const subDepMensual = items.reduce((acc, it) => acc + (Number(it.depreMensual ?? 0) || 0), 0);

    // ✅ TÍTULO: Nombre izquierda
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(nombreCuenta.toUpperCase(), 14, cursorY);

    // ✅ NÚMERO DE CUENTA movido (derecha, debajo del título)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Cuenta: ${cuenta}`, 190, cursorY + 5, { align: 'right' });

    // baja cursor para que la tabla no se pegue
    cursorY += 10;

    const bodyRows = items.map(it => ([
      it.codigoAf ?? '',
      fmtDate(it.feccompra),
      it.descripcion ?? '',
      it.comprobante ?? '',
      fmtMoney(it.valorcompra),
      fmtMoney(it.valorresidual),
      String(it.vidautil ?? ''),
      fmtMoney(it.depresiacionAnual),
      fmtMoney(it.depreMensual),
    ]));

    autoTable(doc, {
      startY: cursorY,
      margin: { top: TOP, left: 14, right: 14 },

      head: [[
        'Código', 'Fecha Compra', 'Descripción', 'Comprobante',
        'Val. Compra', 'Val. Residual', 'Vida Util', 'Dep. Anual', 'Dep. Mensual'
      ]],

      body: bodyRows,

      // ✅ FOOTER: nombre centrado + total a la derecha
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

      // ✅ header antes de dibujar tabla en cada página
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
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d);
      }
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
    // en-US => decimal con punto
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }

}
