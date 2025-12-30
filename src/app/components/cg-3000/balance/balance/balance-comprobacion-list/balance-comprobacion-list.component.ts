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

/* ==========================================================
 * Tipos auxiliares (para reporte jerárquico y totales)
 * ========================================================== */
type RowTipo = 'raiz' | 'padre' | 'hijo' | 'subtotal';

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
      minWidth: 420,
      flex: 1,
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

        const codigo = r.cuentaCodigo || '';
        const nombre = r.cuentaNombre || '';
        return `${indent}<span class="mono">${codigo}</span> ${nombre}`;
      },
    },

    { headerName: 'Saldo Anterior', field: 'saldoAnterior', type: 'numericColumn', valueFormatter: (p) => this.fmtNumber(p) },
    { headerName: 'Debe', field: 'debe', type: 'numericColumn', valueFormatter: (p) => this.fmtNumber(p) },
    { headerName: 'Haber', field: 'haber', type: 'numericColumn', valueFormatter: (p) => this.fmtNumber(p) },
    { headerName: 'Neto', field: 'neto', type: 'numericColumn', valueFormatter: (p) => this.fmtNumber(p) },
    { headerName: 'Total', field: 'total', type: 'numericColumn', valueFormatter: (p) => this.fmtNumber(p) },
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
    },

    suppressRowTransform: true,
  };

  /* ==========================================================
   * 3) Inyección de servicios + variables internas
   * ========================================================== */
  constructor(
    private balanceService: BalanceService,
    private localService: LocalesService,
    private zonaService: ZonaService
  ) { }

  // API de AG Grid (para operaciones: getFilterModel, forEachNodeAfterFilterAndSort, pinned rows, etc.)
  private gridApi: any;

  // Flag interno: evita loops cuando reaplicas el filtro de forma programática
  private _reaplicandoFiltro = false;

  // trackBy (mejora performance en combos)
  trackById = (_: number, item: any) => item.id;
  trackByIdZona = (_: number, item: any) => item.idZona;

  /* ==========================================================
   * 4) Lifecycle
   * ========================================================== */
  ngOnInit(): void {
    // Precarga combos
    this.cargarLocales();
    this.cargarZona();
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
      console.warn('Debe ingresar Fecha Inicio y Fecha Final');
      return;
    }

    // 2) Validar orden de fechas (seguro si es YYYY-MM-DD)
    // Si tu input es <input type="date">, normalmente ya te da YYYY-MM-DD.
    const dateDesde = new Date(d1);
    const dateHasta = new Date(d2);

    if (isNaN(dateDesde.getTime()) || isNaN(dateHasta.getTime())) {
      console.warn('Formato de fecha inválido');
      return;
    }

    if (dateDesde > dateHasta) {
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
        console.warn('Para filtrar por cuenta debe ingresar CUENTA A y CUENTA B');
        return;
      }

      // (Opcional recomendado) Validar orden de cuentas si ambas vienen
      if (tieneDesde && tieneHasta) {
        // Comparación simple (si tus cuentas son códigos comparables alfabéticamente)
        if (hasta.localeCompare(desde) < 0) {
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
        setTimeout(() => this.actualizarTotalesPinned(), 0);
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

        rows.push(subtotalRow);
      }
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
    return new Intl.NumberFormat('es-EC', {
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
  exportExcel(): void {
    console.log('Exportar a Excel');
  }

  exportPdf(): void {
    console.log('Exportar a PDF');
  }

  /* ==========================================================
   * 11) Eventos AG Grid
   * ========================================================== */

  onGridReady(e: any) {
    // Guardamos api para poder operar sobre el grid
    this.gridApi = e.api;

    // Totales iniciales al cargar
    this.actualizarTotalesPinned();
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
    this.gridApi.setPinnedBottomRowData([
      this.makePinnedRow('TOTAL FILTRADO', totalFiltrado),
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

}
