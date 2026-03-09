/*******************************************************
 * BalanceComprobacionComponent
 * -----------------------------------------------------
 * Responsabilidad principal:
 * - Consultar el Balance de Comprobación según filtros.
 * - Transformar la data plana a un “reporte” jerárquico:
 *     RAÍZ -> PADRE -> HIJO -> SUBTOTAL
 * - Mostrarlo en AG Grid con:
 *     - Filtro por “Cuenta” (startsWith por defecto)
 *     - Recalcular subtotales al filtrar (solo con hijos visibles)
 *     - Mantener jerarquía visible (raíz/padre/subtotal) si hay hijos visibles
 *     - Totales “TOTAL FILTRADO” y “TOTAL GENERAL” como pinned bottom rows
 *******************************************************/

/* ==========================
 * Angular core + módulos base
 * ========================== */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/* ==========================
 * Angular Material (UI)
 * ========================== */
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

/* ==========================
 * AG Grid
 * ========================== */
import { AgGridModule } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  ValueFormatterParams,
} from 'ag-grid-community';

/* ==========================
 * PDF (stubs por ahora)
 * ========================== */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';


/* ==========================
 * Services
 * ========================== */
import { BalanceService } from 'src/app/services/balance.service';
import { LocalesService } from 'src/app/services/locales.service';
import { ZonaService } from 'src/app/services/zona.service';

/* ==========================
 * Interfaces / DTOs
 * ========================== */
import { BalanceComprobacionRequest } from 'src/app/interfaces/requests/balance-comprobacion-request';

import { BalanceComprobacionResponse } from 'src/app/interfaces/responses/balance-comprobacion-response';
import { LocalesResponse } from 'src/app/interfaces/responses/local-response'
import { ZonaResponse } from 'src/app/interfaces/responses/zona-response'

/* ==========================
 * Messages
 * ========================== */
import { RequiredFieldsToastService } from 'src/app/components/utils/messages/required-fields-toast.service';
import { PlanCuentasService } from 'src/app/services/plan-cuentas.service';
import { PlanCuentasSearchResponse } from 'src/app/interfaces/responses/plan-cuentas-search.response';
import { debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { UsuarioService } from 'src/app/services/usuario.service';

/* ==========================================================
 * Tipos auxiliares (para reporte jerárquico y totales)
 * ========================================================== */
type RowTipo = 'raiz' | 'padre' | 'hijo' | 'subtotal' | 'totalraiz';

type PinnedTipo = 'TOTAL_GENERAL' | 'TOTAL_FILTRADO';

type BalanceRow = BalanceComprobacionResponse & {
  __pinnedTipo?: PinnedTipo;
};

/**
 * Estructura final que se pinta en la grilla (reporte impreso).
 * Incluye:
 * - Identificadores (rowId, rowTipo, nivel)
 * - Campos de impresión (cuentaCodigo, cuentaNombre)
 * - Montos
 * - Campos internos para el recalculo de subtotales al filtrar
 */
interface BalanceReporteRow {
  rowId: string;
  rowTipo: RowTipo;
  nivel: number;              // 0=raiz, 1=padre, 2=hijo, 1=subtotal (misma sangría del padre)
  cuentaCodigo: string;       // lo que se imprime como "cuenta"
  cuentaNombre: string;       // lo que se imprime como "nombre"
  saldoAnterior: number | null;
  debe: number | null;
  haber: number | null;
  neto: number | null;
  total: number | null;

  // opcional: referencias originales
  cuentaRaiz?: string;
  cuentaPadre?: string;
  cuentaHijo?: string;

  // ==========================
  // Interno (para totales al filtrar)
  // ==========================
  __keyPadre?: string;          // `${cuentaRaiz}|${cuentaPadre}`
  __forceVisible?: boolean;     // permite mantener jerarquía / subtotales visibles al filtrar "Cuenta"

  // Valores originales (para restaurar cuando se quita el filtro)
  __origSaldoAnterior?: number | null;
  __origDebe?: number | null;
  __origHaber?: number | null;
  __origNeto?: number | null;
  __origTotal?: number | null;
}

@Component({
  selector: 'app-balance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    AgGridModule,
  ],
  templateUrl: './balance-comprobacion-list.component.html',
  styleUrls: ['./balance-comprobacion-list.component.css'],
})
export class BalanceComprobacionComponent implements OnInit {

  /* ==========================================================
   * 1) Estado / Filtros / Flags UI
   * ========================================================== */

  // Filtros iniciales (lo que se envía al backend)
  filtros: BalanceComprobacionRequest = {
    fechaDesde: '',
    fechaHasta: '',
    cuentaA: undefined,
    cuentaB: undefined,
    idLocal: undefined,
    idZona: undefined,
  };

  get idEmpresa(): number {
    return this.usuarioService.getEmpresaId() ?? 1;
  }
  // Modos UI (activan/ocultan secciones en el HTML mediante *ngIf)
  modoFiltro1: 'cuenta' | null = null;
  modoFiltro2: 'local' | null = null;
  modoFiltro3: 'zona' | null = null;

  // Flag para loading/spinner
  loading = false;

  // Respuesta “cruda” (si necesitas el dataset original)
  resultados: BalanceComprobacionResponse[] = [];

  // Combos (locales y zonas)
  localesResponse: LocalesResponse[] = [];
  zonaResponse: ZonaResponse[] = [];

  /* ==========================================================
   * 2) AG Grid: Data del reporte + Definición de columnas
   * ========================================================== */

  // Data final que consume la grilla (reporte jerárquico)
  rowData: BalanceReporteRow[] = [];

  /**
   * Columnas:
   * - “Cuenta” con renderer que aplica sangría por nivel y maneja subtotales.
   * - Columnas numéricas con formateo a 2 decimales
   */
  columnDefs: ColDef[] = [
    {
      headerName: 'Cuenta',
      field: 'cuentaCodigo',
      minWidth: 480,
      flex: 2,
      sortable: false,

      // Filtro de texto con “startsWith” por defecto
      filter: 'agTextColumnFilter',
      filterParams: {
        defaultOption: 'startsWith',

        // Matcher personalizado: permite “forzar” visibles las filas raíz/padre/subtotal
        // cuando exista al menos un hijo visible tras el filtro.
        textMatcher: (m: any) => this.textMatcherCuenta(m),
      },

      /**
       * Renderer:
       * - Si es pinned row (totales) imprime el label en negrita.
       * - Para el “reporte impreso” aplica sangría según nivel.
       * - Para subtotal imprime la palabra “TOTAL” con sangría de padre.
       */
      cellRenderer: (params: any) => {
        const r: BalanceReporteRow | undefined = params.data;
        if (!r) return '';

        // Si es pinned bottom row
        if (params.node?.rowPinned) {
          return `<span class="mono"><b>${r.cuentaCodigo}</b></span>`;
        }

        // sangría tipo reporte impreso
        const indent = '&nbsp;'.repeat((r.nivel ?? 0) * 6);

        // Para subtotal, mostramos "TOTAL" alineado al nivel del padre
        if (r.rowTipo === 'subtotal') {
          const label = 'TOTAL';
          const nombre = r.cuentaNombre || '';
          return `${indent}<span class="mono">${label}</span> ${nombre}`;
        }
        if (r.rowTipo === 'totalraiz') {
          return `<b>TOTAL ${(r.cuentaNombre || '').toUpperCase()}</b>`;
        }
        const codigo = r.cuentaCodigo || '';
        const nombre = r.cuentaNombre || '';
        return `${indent}<span class="mono">${codigo}</span> ${nombre}`;
      },
    },

    {
      headerName: 'Saldo Anterior',
      field: 'saldoAnterior',
      type: 'numericColumn',
      valueFormatter: (p) => this.fmtNumber(p),

      // NUEVO (para que el header se envuelva y suba de alto)
      wrapHeaderText: true,
      autoHeaderHeight: true,
    },
    { headerName: 'Debe', field: 'debe', type: 'numericColumn', minWidth: 80, flex: 1, valueFormatter: (p) => this.fmtNumber(p) },
    { headerName: 'Haber', field: 'haber', type: 'numericColumn', minWidth: 80, flex: 1, valueFormatter: (p) => this.fmtNumber(p) },
    { headerName: 'Neto', field: 'neto', type: 'numericColumn', minWidth: 80, flex: 1, valueFormatter: (p) => this.fmtNumber(p) },
    { headerName: 'Total', field: 'total', type: 'numericColumn', minWidth: 80, flex: 1, valueFormatter: (p) => this.fmtNumber(p) },
  ];

  /**
   * Grid options:
   * - getRowId: importante para updates/transacciones
   * - rowClassRules: estilos por tipo (raíz, padre, hijo, subtotal)
   * - defaultColDef: resizable + filtro por defecto startsWith
   */
  gridOptions: GridOptions = {
    animateRows: true,

    // Identificador estable por fila (mejora updates cuando recalculas subtotales)
    getRowId: (params) => params.data?.rowId,

    defaultColDef: {
      resizable: true,
      sortable: false,
      filter: true,
      filterParams: {
        defaultOption: 'startsWith'
      }
    },

    // Clases CSS por tipo de fila (para diseño visual)
    rowClassRules: {
      'row-raiz': (p) => p.data?.rowTipo === 'raiz',
      'row-padre': (p) => p.data?.rowTipo === 'padre' || p.data?.rowTipo === 'subtotal',
      'row-hijo': (p) => p.data?.rowTipo === 'hijo',
      'row-subtotal': (p) => p.data?.rowTipo === 'subtotal',
      'row-totalraiz': (p) => p.data?.rowTipo === 'totalraiz'
    },

    suppressRowTransform: true,
  };

  /* ==========================================================
   * 3) Inyección de servicios + variables internas
   * ========================================================== */
  constructor(
    private balanceService: BalanceService,
    private localService: LocalesService,
    private zonaService: ZonaService,
    private message: RequiredFieldsToastService,
    private planCuentasService: PlanCuentasService,
    private usuarioService: UsuarioService
  ) { }

  // API de AG Grid (para operaciones: getFilterModel, forEachNodeAfterFilterAndSort, pinned rows, etc.)
  private gridApi: any;

  // Flag interno: evita loops cuando reaplicas el filtro de forma programática
  private _reaplicandoFiltro = false;

    // Buscador cuenta A
  sugerenciasA: PlanCuentasSearchResponse[] = [];
  mostrarDropA = false;
  private searchA$ = new Subject<string>();

  // Buscador cuenta B
  sugerenciasB: PlanCuentasSearchResponse[] = [];
  mostrarDropB = false;
  private searchB$ = new Subject<string>();
  // trackBy (mejora performance en combos)
  trackById = (_: number, item: any) => item.id;
  trackByIdZona = (_: number, item: any) => item.idZona;

  /* ==========================================================
   * 4) Lifecycle
   * ========================================================== */
  ngOnInit(): void {
    // Precarga combos
    this.setRangoMesActual(); 
    this.cargarLocales();
    this.cargarZona();
      // ← AGREGAR: subscripciones para búsqueda con debounce
    this.searchA$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(texto => texto.length >= 2
        ? this.planCuentasService.buscarPorNombre(texto, this.idEmpresa)
        : of([]))
    ).subscribe(res => {
      this.sugerenciasA = res;
      this.mostrarDropA = res.length > 0;
    });

    this.searchB$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(texto => texto.length >= 2
        ? this.planCuentasService.buscarPorNombre(texto, this.idEmpresa)
        : of([]))
    ).subscribe(res => {
      this.sugerenciasB = res;
      this.mostrarDropB = res.length > 0;
    });
  }

  /* ==========================================================
   * 5) UI toggles (mostrar/ocultar filtros en HTML)
   * ========================================================== */

  toggleModoCuenta(): void {
    this.modoFiltro1 = this.modoFiltro1 === 'cuenta' ? null : 'cuenta';
    this.filtros.cuentaA = undefined;
    this.filtros.cuentaB = undefined;
  }

  toggleModoLocal(): void {
    /**
     * Nota:
     * - Aquí se alterna el modo “local”
     * - Y se manipula modoFiltro3 (zona) según tu lógica actual
     * - Además, resetea valores para que el select quede en "Seleccione"
     */
    this.modoFiltro2 = this.modoFiltro2 === 'local' ? null : 'local';
    this.modoFiltro3 = this.modoFiltro3 === 'zona' ? null : 'zona';
    this.filtros.idLocal = null;
    this.filtros.idZona = null;
    this.filtros.idZona = null;
  }

  /* ==========================================================
   * 6) Acción principal: Consultar (backend -> build reporte -> grid)
   * ========================================================== */

  consultar(): void {

    // 1) Validar fechas (obligatorias)
    const d1 = (this.filtros.fechaDesde ?? '').trim();
    const d2 = (this.filtros.fechaHasta ?? '').trim();

    if (!d1 || !d2) {
      this.message.mostrar(['Fecha Inicio', 'Fecha Final']);
      console.warn('Debe ingresar Fecha Inicio y Fecha Final');
      return;
    }

    // 2) Validar orden de fechas (seguro si es YYYY-MM-DD)
    // Si tu input es <input type="date">, normalmente ya te da YYYY-MM-DD.
    const dateDesde = new Date(d1);
    const dateHasta = new Date(d2);

    if (isNaN(dateDesde.getTime()) || isNaN(dateHasta.getTime())) {
      this.message.error('Formato de fecha inválido. Use YYYY-MM-DD.');
      console.warn('Formato de fecha inválido');
      return;
    }

    if (dateDesde > dateHasta) {
      this.message.error('La Fecha Inicial no puede ser mayor a la Fecha Final');
      console.warn('La Fecha Inicial no puede ser mayor a la Fecha Final');
      return;
    }

    // 3) Validar cuentas SOLO si el modo "cuenta" está activo
    if (this.modoFiltro1 === 'cuenta') {
      const desde = (this.filtros.cuentaA ?? '').trim();
      const hasta = (this.filtros.cuentaB ?? '').trim();

      const tieneDesde = !!desde;
      const tieneHasta = !!hasta;

      // Regla: si llena una, debe llenar la otra
      if (tieneDesde !== tieneHasta) {
        this.message.mostrar(['Cuenta Inicio', 'Cuenta Final']);
        console.warn('Para filtrar por cuenta debe ingresar CUENTA A y CUENTA B');
        return;
      }

      // (Opcional recomendado) Validar orden de cuentas si ambas vienen
      if (tieneDesde && tieneHasta) {
        // Comparación simple (si tus cuentas son códigos comparables alfabéticamente)
        if (hasta.localeCompare(desde) < 0) {
          this.message.error('Cuenta inicio no puede ser mayor que Cuenta final');
          console.warn('CUENTA B no puede ser menor que CUENTA A');
          return;
        }
      }
    }

    // ===== aquí sigue tu lógica actual, sin tocar =====
    this.loading = true;

    this.balanceService.getByCondicionBalanceComprobacion(this.filtros).subscribe({
      next: (resp) => {
        const data = resp?.data ?? [];
        this.resultados = data;
        this.rowData = this.buildReporteRows(data);

        setTimeout(() => {
          this.actualizarTotalesPinned();
          this.gridApi?.sizeColumnsToFit();   // ajuste tras pintar filas
        }, 0);

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  /* ==========================================================
   * 7) Construcción “reporte impreso” (RAÍZ -> PADRE -> HIJO -> SUBTOTAL)
   * ========================================================== */
  private buildReporteRows(data: BalanceComprobacionResponse[]): BalanceReporteRow[] {
    // Agrupar: raiz -> padre -> hijos
    const raizMap = new Map<
      string,
      {
        nombreRaiz: string;
        padres: Map<
          string,
          { nombrePadre: string; hijos: BalanceComprobacionResponse[] }
        >;
      }
    >();

    // 1) Construcción del árbol (maps)
    for (const it of data) {
      const raizKey = it.cuentaRaiz ?? '';
      const padreKey = it.cuentaPadre ?? '';

      if (!raizMap.has(raizKey)) {
        raizMap.set(raizKey, { nombreRaiz: it.nombreRaiz ?? raizKey, padres: new Map() });
      }
      const raizNode = raizMap.get(raizKey)!;

      if (!raizNode.padres.has(padreKey)) {
        raizNode.padres.set(padreKey, { nombrePadre: it.nombrePadre ?? padreKey, hijos: [] });
      }
      raizNode.padres.get(padreKey)!.hijos.push(it);
    }

    // 2) Orden sugerido: por códigos (mantener orden contable)
    const raizKeys = Array.from(raizMap.keys()).sort();
    const rows: BalanceReporteRow[] = [];

    for (const raizKey of raizKeys) {
      const raizNode = raizMap.get(raizKey)!;

      // Fila RAÍZ (sin montos)
      rows.push(this.makeRow({
        rowTipo: 'raiz',
        nivel: 0,
        cuentaCodigo: raizKey,
        cuentaNombre: raizNode.nombreRaiz,
        saldoAnterior: null,
        debe: null,
        haber: null,
        neto: null,
        total: null,
        cuentaRaiz: raizKey,
      }));

      const padreKeys = Array.from(raizNode.padres.keys()).sort();
      
      let rSaldo = 0, rDebe = 0, rHaber = 0, rNeto = 0;
      
      for (const padreKey of padreKeys) {
        const padreNode = raizNode.padres.get(padreKey)!;

        // Fila PADRE (sin montos)
        rows.push(this.makeRow({
          rowTipo: 'padre',
          nivel: 1,
          cuentaCodigo: padreKey,
          cuentaNombre: padreNode.nombrePadre,
          saldoAnterior: null,
          debe: null,
          haber: null,
          neto: null,
          total: null,
          cuentaRaiz: raizKey,
          cuentaPadre: padreKey,
          __keyPadre: `${raizKey}|${padreKey}`,
        }));

        // Orden hijos por código (cuentaHijo/cuenta)
        const hijos = [...padreNode.hijos].sort((a, b) =>
          String(a.cuentaHijo ?? a.cuenta).localeCompare(String(b.cuentaHijo ?? b.cuenta))
        );

        // Acumuladores para SUBTOTAL
        let sSaldo = 0;
        let sDebe = 0;
        let sHaber = 0;
        let sNeto = 0;

        // Fila HIJO (con montos)
        for (const h of hijos) {
          const saldoAnterior = this.n(h.saldoAnterior);
          const debe = this.n(h.debe);
          const haber = this.n(h.haber);
          const neto = this.n(h.neto);

          sSaldo += saldoAnterior;
          sDebe += debe;
          sHaber += haber;
          sNeto += neto;

          rows.push(this.makeRow({
            rowTipo: 'hijo',
            nivel: 2,
            cuentaCodigo: h.cuentaHijo ?? h.cuenta,
            cuentaNombre: h.nombreHijo ?? '',
            saldoAnterior,
            debe,
            haber,
            neto,
            total: saldoAnterior + neto,
            cuentaRaiz: h.cuentaRaiz,
            cuentaPadre: h.cuentaPadre,
            cuentaHijo: h.cuentaHijo,
            __keyPadre: `${h.cuentaRaiz ?? ''}|${h.cuentaPadre ?? ''}`,
          }));
        }

        // Fila SUBTOTAL (nivel=1 para que coincida con PADRE)
        const subtotalRow = this.makeRow({
          rowTipo: 'subtotal',
          nivel: 1,
          cuentaCodigo: '', // el renderer imprime “TOTAL”
          cuentaNombre: '', // si deseas, puedes setear el nombre del grupo aquí
          saldoAnterior: this.round2(sSaldo),
          debe: this.round2(sDebe),
          haber: this.round2(sHaber),
          neto: this.round2(sNeto),
          total: this.round2(sSaldo + sNeto),
          cuentaRaiz: raizKey,
          cuentaPadre: padreKey,
          __keyPadre: `${raizKey}|${padreKey}`,
        });

        // Guardar valores originales para restaurar si se quita el filtro
        subtotalRow.__origSaldoAnterior = subtotalRow.saldoAnterior;
        subtotalRow.__origDebe = subtotalRow.debe;
        subtotalRow.__origHaber = subtotalRow.haber;
        subtotalRow.__origNeto = subtotalRow.neto;
        subtotalRow.__origTotal = subtotalRow.total;        
        rSaldo += sSaldo;
        rDebe += sDebe;
        rHaber += sHaber;
        rNeto += sNeto;
        rows.push(subtotalRow);
      }
      // Fila TOTAL RAÍZ
      rows.push(this.makeRow({
        rowTipo: 'totalraiz',
        nivel: 0,
        cuentaCodigo: '',
        cuentaNombre: raizNode.nombreRaiz,
        saldoAnterior: this.round2(rSaldo),
        debe: this.round2(rDebe),
        haber: this.round2(rHaber),
        neto: this.round2(rNeto),
        total: this.round2(rSaldo + rNeto),
        cuentaRaiz: raizKey,
        __keyPadre: raizKey,
      }));
    }

    return rows;
  }

  /**
   * Genera un rowId único para AG Grid.
   * (Incluye random para evitar colisiones en caso de códigos repetidos)
   */
  private makeRow(x: Omit<BalanceReporteRow, 'rowId'>): BalanceReporteRow {
    const rowId = `${x.rowTipo}|${x.cuentaRaiz ?? ''}|${x.cuentaPadre ?? ''}|${x.cuentaCodigo ?? ''}|${Math.random().toString(16).slice(2)}`;
    return { rowId, ...x };
  }

  /* ==========================================================
   * 8) Utilitarios de formato / números
   * ========================================================== */

  // Formatea a 2 decimales para columnas numéricas
 private fmtNumber(p: ValueFormatterParams): string {
  const v = p.value as number | null | undefined;
  if (v === null || v === undefined) return '';
  if (!Number.isFinite(v)) return '';

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}


  // Convierte a número seguro (si no es número, devuelve 0)
  private n(v: any): number {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }

  // Redondeo a 2 decimales (para consistencia de totales)
  private round2(v: number): number {
    return Math.round(v * 100) / 100;
  }

  /* ==========================================================
   * 9) Carga de combos (Locales / Zonas)
   * ========================================================== */

  private cargarLocales(): void {
    this.localService.getAll().subscribe({
      next: (resp: any) => {
        // Asume wrapper { data: [...] }
        this.localesResponse = resp?.data ?? [];
      },
      error: (err: any) => {
        console.error('Error cargando locales', err);
        this.localesResponse = [];
      }
    })
  }

  private cargarZona(): void {
    this.zonaService.getAll().subscribe({
      next: (resp: any) => {
        /**
         * Normalización de respuesta:
         * - A veces el backend puede devolver:
         *    a) array directo: [...]
         *    b) wrapper: { data: [...] }
         *    c) wrapper alterno: { datos: [...] }
         */
        // console.log('ZONAS resp completo =>', resp); // me ayuda a saber si me llego data

        const data = Array.isArray(resp) ? resp : (resp?.data ?? resp?.datos ?? []);
        this.zonaResponse = Array.isArray(data) ? data : [];

        // console.log('ZONAS count =>', this.zonaResponse.length);
        // console.log('ZONAS first keys =>', this.zonaResponse[0] ? Object.keys(this.zonaResponse[0]) : 'sin data');
      },
      error: (err: any) => {
        console.error('Error cargando zonas', err);
        this.zonaResponse = [];
      }
    });
  }

  /* ==========================================================
   * 10) Exportaciones (stubs / placeholders)
   * ========================================================== */

  // Acciones de exportación (placeholders)
  async exportExcel(): Promise<void> {
    try {
      // 1) Validaciones mínimas (igual que PDF)
      const d1 = (this.filtros.fechaDesde ?? '').trim();
      const d2 = (this.filtros.fechaHasta ?? '').trim();

      if (!d1 || !d2) {
        console.warn('Debe ingresar Fecha Inicio y Fecha Final');
        return;
      }
      if (d2 < d1) {
        console.warn('La Fecha Final no puede ser menor a la Fecha Inicial');
        return;
      }

      // 2) Labels (igual que PDF)
      const cuentaIni = (this.filtros.cuentaA ?? '').trim() || 'TODOS';
      const cuentaFin = (this.filtros.cuentaB ?? '').trim() || 'TODOS';

      const localLabel =
        this.filtros.idLocal
          ? (this.localesResponse.find(x => x.id === this.filtros.idLocal)?.nombre ?? 'TODOS')
          : 'TODOS';

      const zonaLabel =
        this.filtros.idZona
          ? (this.zonaResponse.find(z => z.idZona === this.filtros.idZona)?.nombre ?? 'TODOS')
          : 'TODOS';

      const usuario = (this as any).usuarioActual ?? 'ADMINISTRADOR';

      const fechaImpresion = this.formatDateEC(new Date());
      const desde = this.formatDateECFromIso(d1);
      const hasta = this.formatDateECFromIso(d2);

      // 3) Workbook / Worksheet
      const wb = new ExcelJS.Workbook();
      wb.creator = 'ECOP';
      wb.created = new Date();

      const ws = wb.addWorksheet('Balance', {
        pageSetup: {
          paperSize: 9, // A4
          orientation: 'portrait',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }
        },
        properties: { defaultRowHeight: 15 }
      });

      // 4) Column widths (equivalente a tu PDF columnStyles)
      ws.columns = [
        { key: 'cuenta', width: 48 },  // equivalente a cellWidth 75 (aprox)
        { key: 'saldo', width: 16 },
        { key: 'debe', width: 16 },
        { key: 'haber', width: 16 },
        { key: 'neto', width: 14 },
        { key: 'total', width: 14 },
      ];

      // 5) Logo (si existe)
      const LOGO_URL = 'assets/logo/GS1-logo.png'; // mismo que PDF
      try {
        const logo = await this.getBase64ImageFromUrl(LOGO_URL);
        const imgId = wb.addImage({
          base64: logo.dataUrl,
          extension: logo.format === 'PNG' ? 'png' : 'jpeg',
        });

        // Ubicación aproximada al PDF: arriba-izquierda
        ws.addImage(imgId, {
          tl: { col: 0, row: 0 },   // A1
          ext: { width: 110, height: 60 }
        });
      } catch {
        // sin logo no bloquea
      }

      // 6) Encabezado (layout equivalente al PDF)
      // Fila 1: Título (merge A1:F1)
      ws.mergeCells('A1:F1');
      const titleCell = ws.getCell('A1');
      titleCell.value = 'BALANCE DE COMPROBACION';
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 22;

      // Bloque info (izquierda)
      ws.getCell('A3').value = 'Cuenta Inicial:';
      ws.getCell('B3').value = cuentaIni;
      ws.mergeCells('B3:C3');

      ws.getCell('A4').value = 'Cuenta Final:';
      ws.getCell('B4').value = cuentaFin;
      ws.mergeCells('B4:C4');

      ws.getCell('A5').value = 'Desde:';
      ws.getCell('B5').value = desde;
      ws.mergeCells('B5:C5');

      ws.getCell('A6').value = 'Hasta:';
      ws.getCell('B6').value = hasta;
      ws.mergeCells('B6:C6');

      ws.getCell('A7').value = 'Usuario:';
      ws.getCell('B7').value = usuario;
      ws.mergeCells('B7:C7');

      ws.getCell('A8').value = 'Fec. Impresion:';
      ws.getCell('B8').value = fechaImpresion;
      ws.mergeCells('B8:C8');

      // Bloque derecha (Local/Zona)
      ws.getCell('E4').value = 'Local:';
      ws.getCell('F4').value = localLabel;

      ws.getCell('E5').value = 'Zona:';
      ws.getCell('F5').value = zonaLabel;

      // Estilo de labels del header
      const headerLabelCells = ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'E4', 'E5'];
      for (const addr of headerLabelCells) {
        ws.getCell(addr).font = { bold: true, size: 10 };
      }
      const headerValueCells = ['B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'F4', 'F5'];
      for (const addr of headerValueCells) {
        ws.getCell(addr).font = { size: 10 };
      }

      // Línea separadora (similar a doc.line(...) del PDF)
      // La hacemos con borde inferior en la fila 9
      ws.getRow(9).height = 6;
      for (let c = 1; c <= 6; c++) {
        ws.getCell(9, c).border = { bottom: { style: 'thin' } };
      }

      // 7) Header de tabla
      const tableHeaderRowIdx = 10;
      const hdr = ws.getRow(tableHeaderRowIdx);
      hdr.values = ['Cuenta', 'Saldo Anterior', 'Debe', 'Haber', 'Neto', 'Total'];
      hdr.font = { bold: true, size: 10 };
      hdr.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      hdr.height = 24;

      // Alineación: Cuenta left, números right
      ws.getCell(tableHeaderRowIdx, 1).alignment = { horizontal: 'left', vertical: 'middle' };
      for (let c = 2; c <= 6; c++) {
        ws.getCell(tableHeaderRowIdx, c).alignment = { horizontal: 'right', vertical: 'middle' };
      }
      // Borde inferior del header
      for (let c = 1; c <= 6; c++) {
        ws.getCell(tableHeaderRowIdx, c).border = { bottom: { style: 'thin' } };
      }

      // Freeze panes para mantener header visible
      ws.views = [{ state: 'frozen', ySplit: tableHeaderRowIdx }];

      // 8) Data rows (replica la lógica del PDF)
      const compose = (codigo: string, nombre: string) => {
        const c = (codigo ?? '').trim();
        const n = (nombre ?? '').trim();
        if (!n) return c;
        if (!c) return n;
        if (c.toUpperCase().includes(n.toUpperCase())) return c;
        return `${c} ${n}`;
      };

      let rowIdx = tableHeaderRowIdx + 1;

      for (const r of (this.rowData || [])) {
        const nivel = (r.nivel ?? 0);
        const isRaiz = r.rowTipo === 'raiz';
        const isPadre = r.rowTipo === 'padre';
        const isSubtotal = r.rowTipo === 'subtotal';

        let cuentaTxt = '';
        if (isSubtotal) {
          const extra = (r.cuentaNombre ?? '').trim();
          cuentaTxt = (`TOTAL ${extra}`).trim();
        } else {
          cuentaTxt = compose(r.cuentaCodigo, r.cuentaNombre).trim();
        }

        const excelRow = ws.getRow(rowIdx);

        // Cuenta (con indent real)
        const c1 = excelRow.getCell(1);
        c1.value = cuentaTxt;
        c1.alignment = { horizontal: 'left', vertical: 'middle', indent: Math.min(15, nivel * 2) };

        // Montos: en raiz/padre van en blanco (igual que PDF)
        if (isRaiz || isPadre) {
          for (let c = 2; c <= 6; c++) excelRow.getCell(c).value = null;
        } else {
          excelRow.getCell(2).value = r.saldoAnterior ?? null;
          excelRow.getCell(3).value = r.debe ?? null;
          excelRow.getCell(4).value = r.haber ?? null;
          excelRow.getCell(5).value = r.neto ?? null;
          excelRow.getCell(6).value = r.total ?? null;
        }

        // Formato numérico y alineación derecha
        for (let c = 2; c <= 6; c++) {
          const cell = excelRow.getCell(c);
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }

        // Estilos por tipo
        if (isRaiz) {
          excelRow.font = { bold: true, size: 11 };
        } else if (isPadre || isSubtotal) {
          excelRow.font = { bold: true, size: 10 };
        } else {
          excelRow.font = { size: 10 };
        }

        rowIdx++;
      }

      // 9) Totales (igual que tu pinned: filtrado + general)
      const totalGeneral = this.calcularTotalesDesdeArray((this.rowData || []).filter(r => r.rowTipo === 'hijo'));
      const totalFiltrado = this.gridApi ? this.calcularTotalesDesdeGridVisible() : totalGeneral;

      const addTotalRow = (label: string, t: any) => {
        const rr = ws.getRow(rowIdx++);
        rr.getCell(1).value = label;
        rr.getCell(1).font = { bold: true, size: 10 };
        rr.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

        rr.getCell(2).value = t.saldoAnterior;
        rr.getCell(3).value = t.debe;
        rr.getCell(4).value = t.haber;
        rr.getCell(5).value = t.neto;
        rr.getCell(6).value = t.total;

        for (let c = 2; c <= 6; c++) {
          rr.getCell(c).numFmt = '#,##0.00';
          rr.getCell(c).alignment = { horizontal: 'right', vertical: 'middle' };
          rr.getCell(c).font = { bold: true, size: 10 };
        }

        // línea superior para separar de la tabla
        for (let c = 1; c <= 6; c++) {
          rr.getCell(c).border = { top: { style: 'thin' } };
        }
      };

      // deja una fila en blanco antes de totales
      rowIdx++;
      // addTotalRow('TOTAL FILTRADO', totalFiltrado);
      addTotalRow('TOTAL GENERAL', totalGeneral);

      // 10) Descargar
      const fileName = `Balance_Comprobacion_${desde.split('/').join('-')}_${hasta.split('/').join('-')}.xlsx`;
      const buffer = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        fileName
      );

    } catch (e) {
      this.message.error('No se pudo exportando Excel.');
      console.error('Error exportando Excel', e);
    }
  }


  // ==========================================================
  // PDF EXPORT (Balance de Comprobación)
  // ==========================================================

  async exportPdf(): Promise<void> {
    try {
      // 1) Validaciones mínimas
      const d1 = (this.filtros.fechaDesde ?? '').trim();
      const d2 = (this.filtros.fechaHasta ?? '').trim();

      if (!d1 || !d2) {
        console.warn('Debe ingresar Fecha Inicio y Fecha Final');
        return;
      }
      if (d2 < d1) {
        console.warn('La Fecha Final no puede ser menor a la Fecha Inicial');
        return;
      }

      // 2) Constantes de layout
      const HEADER_H = 52;       // <-- antes te faltaba declarar esto
      const MARGIN_X = 10;
      const MARGIN_B = 12;

      // 3) Documento
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const totalPagesExp = '{total_pages_count_string}';

      // 4) Datos encabezado
      const cuentaIni = (this.filtros.cuentaA ?? '').trim() || 'TODOS';
      const cuentaFin = (this.filtros.cuentaB ?? '').trim() || 'TODOS';

      const localLabel =
        this.filtros.idLocal
          ? (this.localesResponse.find(x => x.id === this.filtros.idLocal)?.nombre ?? 'TODOS')
          : 'TODOS';

      const zonaLabel =
        this.filtros.idZona
          ? (this.zonaResponse.find(z => z.idZona === this.filtros.idZona)?.nombre ?? 'TODOS')
          : 'TODOS';

      // Ajusta según tu autenticación real
      const usuario = (this as any).usuarioActual ?? 'ADMINISTRADOR';

      const fechaImpresion = this.formatDateEC(new Date());
      const desde = this.formatDateECFromIso(d1);
      const hasta = this.formatDateECFromIso(d2);

      // 5) Logo (robusto)
      const LOGO_URL = 'assets/logo/GS1-logo.png'; // ajusta a tu ruta real
      let logo: { dataUrl: string; format: 'PNG' | 'JPEG' } | null = null;

      try {
        logo = await this.getBase64ImageFromUrl(LOGO_URL);
      } catch {
        logo = null; // sin logo, igual exporta
      }

      // 6) Body tabla (con __rowTipo para estilos)
      const body = this.buildPdfBodyFromReporte(this.rowData);

      // 7) Tabla (IMPORTANTE: margin.top para TODAS las páginas)
      autoTable(doc, {
        theme: 'plain',
        head: [['Cuenta', 'Saldo\nAnterior', 'Debe', 'Haber', 'Neto', 'Total']],
        body,

        // margen superior reservado para header en todas las páginas
        margin: { top: HEADER_H, left: MARGIN_X, right: MARGIN_X, bottom: MARGIN_B },
        startY: HEADER_H,

        styles: {
          fontSize: 8,
          cellPadding: 1.2,
          lineWidth: 0,
          textColor: 20,
        },
        headStyles: {
          fontStyle: 'bold',
          fontSize: 9,
          textColor: 0,
          halign: 'right',      // ✅ igual que los números
          valign: 'middle',
          cellPadding: 1.2      // ✅ mismo padding que styles
        },
        columnStyles: {
          0: { cellWidth: 75, halign: 'left' },
          1: { cellWidth: 25, halign: 'right' },
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 20, halign: 'right' },
          5: { cellWidth: 20, halign: 'right' },
        },

        didParseCell: (data) => {
          // Encabezado
          if (data.section === 'head') {
            if (data.column.index === 0) data.cell.styles.halign = 'left';
            else data.cell.styles.halign = 'right';
            return;
          }
          const raw: any = data.row.raw;
          if (!raw || data.section !== 'body') return;

          // estilos por tipo en columna "Cuenta"
          if (data.column.index === 0) {
            if (raw.__rowTipo === 'raiz') {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 9;
            }
            if (raw.__rowTipo === 'padre' || raw.__rowTipo === 'subtotal') {
              data.cell.styles.fontStyle = 'bold';
            }
          }

          // raiz/padre no muestran montos
          if ((raw.__rowTipo === 'raiz' || raw.__rowTipo === 'padre') && data.column.index > 0) {
            data.cell.text = [''];
          }
        },

        didDrawPage: () => {
          // 1) Header (limpia + dibuja)
          this.drawPdfHeader(
            doc,
            pageWidth,
            HEADER_H,
            logo,
            {
              cuentaIni,
              cuentaFin,
              desde,
              hasta,
              usuario,
              fechaImpresion,
              localLabel,
              zonaLabel
            }
          );

          // 2) Page X of Y
          const pageNumber = doc.getNumberOfPages();
          const pageStr = `Page ${pageNumber} of ${totalPagesExp}`;
          doc.setFontSize(8);
          doc.text(pageStr, pageWidth - MARGIN_X, 48, { align: 'right' });

          // 3) Línea separadora bajo header
          doc.setDrawColor(0);
          doc.setLineWidth(0.2);
          doc.line(MARGIN_X, 50, pageWidth - MARGIN_X, 50);
        }
      });

      // Total páginas
      if ((doc as any).putTotalPages) {
        (doc as any).putTotalPages(totalPagesExp);
      }

      // 8) Guardar (sin replaceAll)
      const fileName = `Balance_Comprobacion_${desde.split('/').join('-')}_${hasta.split('/').join('-')}.pdf`;
      doc.save(fileName);

    } catch (e) {
      this.message.error('No se pudo exportando PDF.');
      console.error('Error exportando PDF', e);
    }
  }

  // ==========================
  // HELPERS PDF
  // ==========================
  private drawPdfHeader(
    doc: jsPDF,
    pageWidth: number,
    headerH: number,
    logo: { dataUrl: string; format: 'PNG' | 'JPEG' } | null,
    info: {
      cuentaIni: string;
      cuentaFin: string;
      desde: string;
      hasta: string;
      usuario: string;
      fechaImpresion: string;
      localLabel: string;
      zonaLabel: string;
    }
  ): void {
    // Limpia el área del header (evita “montajes” visuales)
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, headerH, 'F');

    // Logo
    if (logo?.dataUrl) {
      try {
        doc.addImage(logo.dataUrl, logo.format, 10, 6, 22, 16);
      } catch {
        // si falla, no bloquea la exportación
      }
    }

    // Título
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BALANCE DE COMPROBACION', pageWidth / 2, 12, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // Bloque izquierdo
    const xL = 60;
    let y = 20;
    doc.text(`Cuenta Inicial:`, xL, y); doc.text(info.cuentaIni, xL + 28, y);
    y += 5;
    doc.text(`Cuenta Final:`, xL, y); doc.text(info.cuentaFin, xL + 28, y);
    y += 8;
    doc.text(`Desde:`, xL, y); doc.text(info.desde, xL + 28, y);
    y += 5;
    doc.text(`Hasta:`, xL, y); doc.text(info.hasta, xL + 28, y);
    y += 5;
    doc.text(`Usuario:`, xL, y); doc.text(info.usuario, xL + 28, y);
    y += 5;
    doc.text(`Fec. Impresion:`, xL, y); doc.text(info.fechaImpresion, xL + 28, y);

    // Bloque derecho
    const xR = pageWidth - 70;
    let yR = 28;
    doc.text(`Local:`, xR, yR); doc.text(info.localLabel, xR + 20, yR);
    yR += 5;
    doc.text(`Zona:`, xR, yR); doc.text(info.zonaLabel, xR + 20, yR);
  }

  private buildPdfBodyFromReporte(rows: BalanceReporteRow[]): any[] {
    const fmt = (v: any) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return '';
      // Formato como el reporte (miles con coma y decimales con punto)
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    };

    const compose = (codigo: string, nombre: string) => {
      const c = (codigo ?? '').trim();
      const n = (nombre ?? '').trim();
      if (!n) return c;
      if (!c) return n;
      // Evita duplicar cuando el código ya contiene el nombre (ej: "110101.CAJA" + "CAJA")
      if (c.toUpperCase().includes(n.toUpperCase())) return c;
      return `${c} ${n}`;
    };

    return (rows || []).map(r => {
      const indent = ' '.repeat((r.nivel ?? 0) * 2);

      let cuentaTxt = '';
      if (r.rowTipo === 'totalraiz') {
        return `<span class="mono"><b>TOTAL ${r.cuentaNombre}</b></span>`;
      }

      if (r.rowTipo === 'subtotal') {
        cuentaTxt = `${indent}TOTAL ${((r.cuentaNombre ?? '').trim())}`.trim();
      } else if (r.rowTipo === 'hijo') {
        cuentaTxt = `${indent}${compose(r.cuentaCodigo, r.cuentaNombre)}`.trim();
      } else {
        // raiz / padre: normalmente se imprime solo el “código” (como en tu imagen)
        cuentaTxt = `${indent}${compose(r.cuentaCodigo, r.cuentaNombre).trim()}`.trim();
      }

      const row: any[] = [
        cuentaTxt,
        fmt(r.saldoAnterior),
        fmt(r.debe),
        fmt(r.haber),
        fmt(r.neto),
        fmt(r.total),
      ];

      // Para didParseCell (tu código usa raw.__rowTipo)
      (row as any).__rowTipo = r.rowTipo;

      return row;
    });
  }

  private formatDateEC(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private formatDateECFromIso(value: string): string {
    const v = (value ?? '').trim();
    if (!v) return '';
    // si ya viene dd/MM/yyyy, lo retorno
    if (v.includes('/')) return v;

    // espera YYYY-MM-DD
    const parts = v.split('-');
    if (parts.length < 3) return v;

    const yyyy = parts[0];
    const mm = parts[1];
    const dd = parts[2].substring(0, 2);
    return `${dd}/${mm}/${yyyy}`;
  }

  private async getBase64ImageFromUrl(url: string): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' }> {
    const res = await fetch(url, { cache: 'no-cache' });

    // Si la ruta está mal o devuelve HTML (404), aquí revienta y evitas el “wrong PNG signature”
    if (!res.ok) {
      throw new Error(`No se pudo cargar imagen: ${url} (${res.status})`);
    }

    const blob = await res.blob();

    // Si no es imagen, no intentes addImage()
    if (!blob.type.startsWith('image/')) {
      throw new Error(`El recurso no es imagen. Content-Type=${blob.type}`);
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const isPng = blob.type.includes('png');
    const format: 'PNG' | 'JPEG' = isPng ? 'PNG' : 'JPEG';

    // Validación mínima del dataURL
    if (!dataUrl.startsWith('data:image/')) {
      throw new Error('DataURL inválido para imagen');
    }

    return { dataUrl, format };
  }

  /* ==========================================================
   * 11) Eventos AG Grid
   * ========================================================== */

  onGridReady(e: any) {
    this.gridApi = e.api;
    this.actualizarTotalesPinned();

    // Ajusta columnas al ancho visible
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 0);
  }

  onFilterChanged() {
    // Evitar recursión si este método fue disparado por onFilterChanged programático
    if (this._reaplicandoFiltro) return;

    // Recalcula subtotales (por padre) basado en hijos visibles
    this.recalcularSubtotalesFiltrados();

    // Actualiza pinned totals (filtrado/general)
    this.actualizarTotalesPinned();
  }

  onSortChanged() {
    // Si cambian ordenamientos, actualiza totales (especialmente el filtrado visible)
    this.actualizarTotalesPinned();
  }

  /* ==========================================================
   * 12) Lógica especial: filtro por “Cuenta” + subtotales recalculados
   * ==========================================================
   * Objetivo:
   * - Si el usuario filtra en “Cuenta”, AG Grid oculta filas.
   * - Tú quieres:
   *    1) Mantener visibles RAÍZ/PADRE/SUBTOTAL si hay HIJOS visibles.
   *    2) Recalcular el subtotal del PADRE usando solo los HIJOS visibles.
   */

  private textMatcherCuenta(m: any): boolean {
    const filterText = (m?.filterText ?? '').toString().trim();
    if (!filterText) return true;

    const data = m?.data as BalanceReporteRow | undefined;

    // Mantener jerarquía / totales visibles cuando exista al menos un hijo visible
    if (data && (data.rowTipo === 'raiz' || data.rowTipo === 'padre' || data.rowTipo === 'subtotal')) {
      return !!data.__forceVisible;
    }

    const value = (m?.value ?? '').toString();
    const v = value.toLowerCase();
    const f = filterText.toLowerCase();
    const opt = (m?.filterOption ?? 'contains').toString();

    // Aplica operadores típicos del filtro de texto
    switch (opt) {
      case 'equals': return v === f;
      case 'notEqual': return v !== f;
      case 'notContains': return !v.includes(f);
      case 'startsWith': return v.startsWith(f);
      case 'endsWith': return v.endsWith(f);
      case 'contains':
      default: return v.includes(f);
    }
  }

  private recalcularSubtotalesFiltrados(): void {
    if (!this.gridApi) return;

    // Texto actual del filtro en columna cuentaCodigo
    const filtroCuenta = this.getFiltroCuentaTexto();
    const hayFiltroCuenta = !!filtroCuenta;

    // Acumuladores por PADRE solo con HIJOS visibles tras filtro
    const totalesPorPadre = new Map<string, { saldoAnterior: number; debe: number; haber: number; neto: number; }>();
    const padresConHijos = new Set<string>();
    const raicesConHijos = new Set<string>();

    // Recorre nodos visibles después de filter + sort
    this.gridApi.forEachNodeAfterFilterAndSort((node: any) => {
      const d = node?.data as BalanceReporteRow | undefined;
      if (!d || d.rowTipo !== 'hijo') return;

      const keyPadre = d.__keyPadre ?? `${d.cuentaRaiz ?? ''}|${d.cuentaPadre ?? ''}`;
      padresConHijos.add(keyPadre);
      raicesConHijos.add(d.cuentaRaiz ?? '');

      // Suma por padre
      const acc = totalesPorPadre.get(keyPadre) ?? { saldoAnterior: 0, debe: 0, haber: 0, neto: 0 };
      acc.saldoAnterior += this.n(d.saldoAnterior);
      acc.debe += this.n(d.debe);
      acc.haber += this.n(d.haber);
      acc.neto += this.n(d.neto);
      totalesPorPadre.set(keyPadre, acc);
    });

    // Actualizar filas SUBTOTAL + visibilidad de RAÍZ / PADRE / SUBTOTAL
    const updates: BalanceReporteRow[] = [];

    for (const r of (this.rowData || [])) {
      if (r.rowTipo === 'raiz') {
        // Visible si no hay filtro o si esa raíz tiene hijos visibles
        r.__forceVisible = !hayFiltroCuenta || raicesConHijos.has(r.cuentaRaiz ?? '');
        updates.push(r);
        continue;
      }

      if (r.rowTipo === 'padre') {
        const keyPadre = r.__keyPadre ?? `${r.cuentaRaiz ?? ''}|${r.cuentaPadre ?? ''}`;
        // Visible si no hay filtro o si ese padre tiene hijos visibles
        r.__forceVisible = !hayFiltroCuenta || padresConHijos.has(keyPadre);
        updates.push(r);
        continue;
      }

      if (r.rowTipo === 'subtotal') {
        const keyPadre = r.__keyPadre ?? `${r.cuentaRaiz ?? ''}|${r.cuentaPadre ?? ''}`;
        const tieneHijos = padresConHijos.has(keyPadre);

        // Visible si no hay filtro o si ese padre mantiene hijos visibles
        r.__forceVisible = !hayFiltroCuenta || tieneHijos;

        if (!hayFiltroCuenta) {
          // Restaurar originales (al quitar filtro)
          r.saldoAnterior = r.__origSaldoAnterior ?? r.saldoAnterior;
          r.debe = r.__origDebe ?? r.debe;
          r.haber = r.__origHaber ?? r.haber;
          r.neto = r.__origNeto ?? r.neto;
          r.total = r.__origTotal ?? r.total;
        } else if (tieneHijos) {
          // Recalcular subtotal solo con hijos visibles
          const t = totalesPorPadre.get(keyPadre)!;
          const sSaldo = this.round2(t.saldoAnterior);
          const sDebe = this.round2(t.debe);
          const sHaber = this.round2(t.haber);
          const sNeto = this.round2(t.neto);

          r.saldoAnterior = sSaldo;
          r.debe = sDebe;
          r.haber = sHaber;
          r.neto = sNeto;
          r.total = this.round2(sSaldo + sNeto);
        }

        updates.push(r);
      }
    }

    // Aplicar updates al grid (transacción o refresh)
    if (updates.length) {
      this.gridApi.applyTransaction({ update: updates });
    } else {
      this.gridApi.refreshCells({ force: true });
    }

    /**
     * Reaplicar filtro:
     * - Necesario para que el textMatcher re-evalúe usando __forceVisible
     * - Protegido con _reaplicandoFiltro para no entrar en loop
     */
    if (hayFiltroCuenta) {
      this._reaplicandoFiltro = true;
      this.gridApi.onFilterChanged();
      this._reaplicandoFiltro = false;
    }
  }

  /**
   * Obtiene el texto actual aplicado al filtro de la columna “cuentaCodigo”.
   * AG Grid guarda el model como: { cuentaCodigo: { filter: '...', type: 'startsWith', ... } }
   */
  private getFiltroCuentaTexto(): string {
    if (!this.gridApi?.getFilterModel) return '';
    const model = this.gridApi.getFilterModel() || {};
    const m = (model['cuentaCodigo'] ?? null) as any;

    const txt = (m?.filter ?? '').toString().trim();
    return txt;
  }

  /* ==========================================================
   * 13) Totales Pinned: TOTAL FILTRADO / TOTAL GENERAL
   * ========================================================== */

  private actualizarTotalesPinned(): void {
    if (!this.gridApi) return;

    // TOTAL GENERAL: suma de TODOS los hijos (dataset completo)
    const totalGeneral = this.calcularTotalesDesdeArray(
      (this.rowData || []).filter(r => r.rowTipo === 'hijo')
    );

    // TOTAL FILTRADO: suma de los hijos actualmente visibles tras filtros
    const totalFiltrado = this.calcularTotalesDesdeGridVisible();

    // Pinned rows (2 filas) en el fondo de la grilla
    (this.gridApi as any).setGridOption('pinnedBottomRowData', [
      this.makePinnedRow('TOTAL GENERAL', totalGeneral),
    ]);
  }

  /**
   * Totales a partir de un arreglo (ej: todos los hijos del dataset).
   */
  private calcularTotalesDesdeArray(rows: any[]): any {
    let saldoAnterior = 0;
    let debe = 0;
    let haber = 0;
    let neto = 0;

    for (const r of rows) {
      saldoAnterior += this.n(r.saldoAnterior);
      debe += this.n(r.debe);
      haber += this.n(r.haber);
      neto += this.n(r.neto);
    }

    // Total = saldoAnterior + neto (como el reporte)
    return {
      saldoAnterior: this.round2(saldoAnterior),
      debe: this.round2(debe),
      haber: this.round2(haber),
      neto: this.round2(neto),
      total: this.round2(saldoAnterior + neto),
    };
  }

  /**
   * Totales solo de filas visibles en el grid (considera filtros).
   * Importante: suma solo “hijo” para evitar doble conteo con subtotales.
   */
  private calcularTotalesDesdeGridVisible(): any {
    let saldoAnterior = 0;
    let debe = 0;
    let haber = 0;
    let neto = 0;

    const count = this.gridApi.getDisplayedRowCount();

    for (let i = 0; i < count; i++) {
      const rowNode = this.gridApi.getDisplayedRowAtIndex(i);
      const d = rowNode?.data;

      // sumar solo detalles para evitar doble conteo
      if (!d || d.rowTipo !== 'hijo') continue;

      saldoAnterior += this.n(d.saldoAnterior);
      debe += this.n(d.debe);
      haber += this.n(d.haber);
      neto += this.n(d.neto);
    }

    return {
      saldoAnterior: this.round2(saldoAnterior),
      debe: this.round2(debe),
      haber: this.round2(haber),
      neto: this.round2(neto),
      total: this.round2(saldoAnterior + neto),
    };
  }

  /**
   * Construye objeto “pinned row” que se muestra en la grilla como resumen.
   * Nota: aquí rowTipo = 'total' (aunque RowTipo no lo incluye).
   * Está así en tu código y se conserva tal cual.
   */
  private makePinnedRow(label: string, t: any) {
    return {
      rowId: `pinned|${label}`,
      rowTipo: 'total',      // nuevo tipo para identificar
      nivel: 0,
      cuentaCodigo: label,   // se mostrará en la primera columna
      cuentaNombre: '',
      saldoAnterior: t.saldoAnterior,
      debe: t.debe,
      haber: t.haber,
      neto: t.neto,
      total: t.total,
    };
  }

  /* ==========================================================
   * 14) Se parece NgxMask: CUENTA A / CUENTA B
   * ========================================================== */

  private readonly CUENTA_REGEX = /^\d{6}-\d{3}$/;

  // Se llama en (input)
  onCuentaInput(tipo: 'A' | 'B', ev: Event): void {
    const input = ev.target as HTMLInputElement;
    let v = (input.value ?? '').replace(/\D/g, ''); // solo dígitos

    // max 9 dígitos (6 + 3)
    if (v.length > 9) v = v.slice(0, 9);

    // inserta guion después de 6 dígitos
    if (v.length > 6) v = `${v.slice(0, 6)}-${v.slice(6)}`;

    input.value = v; // actualiza el input visible

    if (tipo === 'A') this.filtros.cuentaA = v;
    else this.filtros.cuentaB = v;
  }

  // Se llama en (blur): valida formato completo
  onCuentaBlur(tipo: 'A' | 'B'): void {
    const v = (tipo === 'A' ? this.filtros.cuentaA : this.filtros.cuentaB) ?? '';
    const t = v.trim();

    // si está vacío, no molestar (la regla de “ambas cuentas” ya la validas en consultar())
    if (!t) return;

    if (!this.CUENTA_REGEX.test(t)) {
      console.warn('Formato de cuenta inválido. Use: 110101-001');
      // opcional: limpiar campo para obligar corrección
      // if (tipo === 'A') this.filtros.cuentaA = '';
      // else this.filtros.cuentaB = '';
    }
  }
  private setRangoMesActual(): void {
  const hoy = new Date();
  this.setRangoMes(hoy);
}

private setRangoMes(fechaBase: Date): void {
  const y = fechaBase.getFullYear();
  const m = fechaBase.getMonth(); // 0-11

  const inicio = new Date(y, m, 1);      // 1er día del mes
  const fin = new Date(y, m + 1, 0);     // último día del mes (28/29/30/31)

  // ✅ Guardar en formato ISO para backend y validaciones
  this.filtros.fechaDesde = this.toISODate(inicio); // "YYYY-MM-DD"
  this.filtros.fechaHasta = this.toISODate(fin);    // "YYYY-MM-DD"
}

private toISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

  // Cuando el usuario escribe en el input de Cuenta A/B
  onBuscarCuenta(tipo: 'A' | 'B', ev: Event): void {
    const texto = (ev.target as HTMLInputElement).value ?? '';
    // Si parece código numérico, usa tu lógica actual; si es texto, busca por nombre
    if (/^\d/.test(texto)) {
      this.onCuentaInput(tipo, ev); // lógica existente
    } else {
      if (tipo === 'A') this.searchA$.next(texto);
      else this.searchB$.next(texto);
    }
  }

  // Cuando selecciona una sugerencia
  seleccionarCuenta(tipo: 'A' | 'B', cuenta: PlanCuentasSearchResponse): void {
    const codigo = cuenta.codigoPresentacion ?? '';
    if (tipo === 'A') {
      this.filtros.cuentaA = codigo;
      this.mostrarDropA = false;
      this.sugerenciasA = [];
    } else {
      this.filtros.cuentaB = codigo;
      this.mostrarDropB = false;
      this.sugerenciasB = [];
    }
  }

  cerrarDropdowns(): void {
    setTimeout(() => {
      this.mostrarDropA = false;
      this.mostrarDropB = false;
    }, 200);
  }

}
