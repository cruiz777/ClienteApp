// src/app/components/sic-3000/facturacion/facturacion-global/facturacion-global.component.ts
import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AgGridAngular } from 'ag-grid-angular';
import { MatIconModule } from '@angular/material/icon';
import * as JSZip from 'jszip';
import * as ExcelJS from 'exceljs';
import { AsientoVentaService } from 'src/app/services/asiento-venta.service';

import { saveAs } from 'file-saver';
import {
  FacturaGlobalService,
  ClienteCodpreGrupoResponse,
  FacturaCrearRequest
} from 'src/app/services/factura-global.service';

import { AutorizacionCajaService } from 'src/app/services/autorizacion-caja.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { ClienteService } from 'src/app/services/cliente.service';
import { ClienteContactoService } from 'src/app/services/cliente-contacto.service';
import { ZonaService, Zona } from 'src/app/services/zona.service';
import { FacturacionWorkflowService, WorkflowResult } from 'src/app/services/facturacion-workflow.service';

import { AsientoVentaRequest } from 'src/app/services/asiento-venta.service';

import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { NotasObsService, NotaObs } from 'src/app/services/nota.service';
import { FacturacionService } from 'src/app/services/facturacion.service';

import { of, forkJoin, from, timer } from 'rxjs';
import {
  take, map, switchMap, catchError, finalize,
  retryWhen, delayWhen, scan, tap, concatMap
} from 'rxjs/operators';

import {
  ColDef, GridApi, GridReadyEvent, ModuleRegistry, IRowNode, AllCommunityModule, ValueFormatterParams
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

type ZipProgress = { percent: number; currentFile?: string | null };

@Component({
  selector: 'app-facturacion-global',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, AgGridAngular,
    MatIconModule,
    MatSelectModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './facturacion-global.component.html',
  styleUrls: ['./facturacion-global.component.css']
})
export class FacturacionGlobalComponent implements OnInit {
  @ViewChild('qfInput') qfInput!: ElementRef<HTMLInputElement>;

  hasQf = false;
  activeTab: 'Factura' | 'Listado' = 'Factura';
  formFactura!: FormGroup;
  formCaja!: FormGroup;
  usuarioActual = this.usuarioService.getUsuarioActual();

  // Botones/estados
  deshabilitarBuscar = false;
  habilitarFacturar = false;
  facturando = false;
  zipping = false;
  private gridApi!: GridApi;
  private pendingQuickFilter = '';
  cargando = false;

  totalSeleccionado = 0;
  selectedCount = 0;
  showSoloSeleccionados = false;
  private listadoGridApi!: GridApi;
  listadoSelectedCount = 0;
  imprimiendo = false;

  zonas: Zona[] = [];
  trackByZonaId = (_: number, z: Zona) => z.id;
  cargandoZonas = false;

  // ===== NUEVO: barra alfabética A-Z =====
  alphabet: string[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  selectedLetters = new Set<string>();

  // Configuración de procesamiento
  private readonly CONCURRENCY = 1;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_BASE_MS = 800;
  private readonly PAUSA_MS = 200;

  // ID del producto de mantenimiento
  private readonly PRODUCTO_MANTENIMIENTO_ID = 2878981;

  get anioCtrl() { return this.formFactura.get('anio')!; }
  get zonaCtrl() { return this.formFactura.get('zona')!; }

  gridOptions: any = {
    rowSelection: 'multiple',
    rowMultiSelectWithClick: true,
    suppressRowDeselection: true,
    suppressRowClickSelection: true,
    getRowId: (p: any) => String(p.data?.codCliente ?? ''),
  };

  @HostListener('window:resize')
  onResize() { this.gridApi?.sizeColumnsToFit(); }

  columnDefs: ColDef[] = [
    { headerName: '', checkboxSelection: true, headerCheckboxSelection: true, width: 48, pinned: 'left' },
    { headerName: '#', valueGetter: 'node.rowIndex + 1', width: 60, pinned: 'left' },
    { headerName: 'Cod.Cliente', field: 'codCliente', minWidth: 90 },
    { headerName: 'RUC', field: 'ruc', minWidth: 145 },
    {
      headerName: 'Cliente',
      field: 'cliente',
      minWidth: 250,
      headerTooltip: 'Nombre del cliente',
      tooltipValueGetter: p => {
        const d = p.data ?? {};
        return `${p.value}
RUC: ${d.ruc ?? ''}
Ciudad: ${d.ciudad ?? ''}
Prefijo: ${d.prefijo ?? ''}`;
      }
    },
    { headerName: 'Grupo', field: 'grupo', width: 100 },
    { headerName: 'Zona', field: 'zona', minWidth: 100 },
    { headerName: 'Prefijo', field: 'prefijo', minWidth: 90, cellClass: 'ag-right-aligned-cell', headerClass: 'ag-right-aligned-header' },
    {
      headerName: 'Valor',
      field: 'valor',
      minWidth: 120,
      valueFormatter: p => this.money(Number(p.value)),
      cellClass: 'ag-right-aligned-cell', headerClass: 'ag-right-aligned-header'
    },
    {
      headerName: 'Subtotal',
      field: 'subtotal',
      minWidth: 135,
      valueFormatter: p => this.money(Number(p.value)),
      cellClass: 'ag-right-aligned-cell', headerClass: 'ag-right-aligned-header'
    },
    {
      headerName: 'IVA',
      field: 'iva',
      minWidth: 120,
      valueFormatter: p => this.money(Number(p.value)),
      cellClass: 'ag-right-aligned-cell', headerClass: 'ag-right-aligned-header'
    },
    {
      headerName: 'Total',
      field: 'total',
      minWidth: 135,
      valueFormatter: p => this.money(Number(p.value)),
      cellClass: 'ag-right-aligned-cell', headerClass: 'ag-right-aligned-header'
    },
    { headerName: 'Ciudad', field: 'ciudad', minWidth: 110 },
    { headerName: 'Email', field: 'email', hide: true },
    { headerName: 'Piva', field: 'piva', hide: true },
    { headerName: 'idCodContable', field: 'idcodcontable', hide: false }
  ];

  defaultColDef: ColDef = { sortable: true, filter: true, resizable: true };
  rowData: any[] = [];

  // === Listado (Facturas Generadas) ===
  listadoData: NotaObs[] = [];

  columnDefsListado: ColDef<NotaObs>[] = [
    {
      headerName: '',
      colId: 'sel',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 48,
      pinned: 'left'
    },
    {
      headerName: '',
      colId: 'print',
      width: 70,
      pinned: 'left',
      suppressHeaderMenuButton: true,
      sortable: false,
      filter: false,
      cellRenderer: () => `<button class="btn-icon" title="Imprimir">🖨️</button>`,
      onCellClicked: (e) => {
        if (e?.data) this.imprimirNota(e.data as NotaObs);
      }
    },
    { headerName: '#', valueGetter: 'node.rowIndex + 1', width: 70, pinned: 'left' },
    { headerName: 'Id Nota', field: 'idNota', width: 120 },
    { headerName: 'N° Factura', field: 'numnota', minWidth: 160, pinned: 'left' },
    {
      headerName: 'Fecha',
      field: 'fecha',
      width: 140,
      valueFormatter: (p: ValueFormatterParams<NotaObs, any>) =>
        p.value ? new Date(p.value as any).toLocaleDateString('es-EC') : ''
    },
    { headerName: 'Cliente', field: 'nomcli', minWidth: 240, flex: 1 },
    { headerName: 'RUC', field: 'ruc', minWidth: 160 },
    {
      headerName: 'Total',
      field: 'total',
      width: 140,
      valueFormatter: p => this.money(Number(p.value))
    },
    { headerName: 'Observación Detalle', field: 'obsDetalle', minWidth: 260, flex: 1 }
  ];

  defaultColDefListado: ColDef<NotaObs> = { sortable: true, filter: true, resizable: true };

  constructor(
    private fb: FormBuilder,
    private facturaGlobalService: FacturaGlobalService,
    private autorizacionCajaService: AutorizacionCajaService,
    private usuarioService: UsuarioService,
    private clienteService: ClienteService,
    private clienteContactoService: ClienteContactoService,
    private zonaService: ZonaService,
    private dialog: MatDialog,
    private notasObsService: NotasObsService,
    private facturaService: FacturacionService,
    private asientoVentaService: AsientoVentaService,
    private workflow: FacturacionWorkflowService
  ) { }

  ngOnInit(): void {
    this.cargarAutorizacion();
    this.cargarZonas();
    this.usuarioActual = this.usuarioService.getUsuarioActual();

    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    const fechaFormateada = `${dia}/${mes}/${anio}`;

    this.formFactura = this.fb.group({
      anio: [String(new Date().getFullYear()), [Validators.required, Validators.pattern(/^\d{4}$/)]],
      termino: [''],
      prefijo: [''],
      zona: [''],
    });

    this.formCaja = this.fb.group({
      puntoEmision: [''],
      secuencial: [''],
      caja: [''],
      fechaFacturacion: [fechaFormateada]
    });
  }

  onGridReady(e: GridReadyEvent) {
    this.gridApi = e.api;

    this.gridApi.setGridOption('isExternalFilterPresent', this.isExternalFilterPresent);
    this.gridApi.setGridOption('doesExternalFilterPass', this.doesExternalFilterPass);

    if (this.pendingQuickFilter) {
      this.gridApi.setGridOption('quickFilterText', this.pendingQuickFilter);
    }

    // importante para restaurar selección luego de filtros/sort
    this.gridApi.addEventListener('modelUpdated', () => {
      this.restoreSelection();
    });

    this.gridApi.sizeColumnsToFit();
  }

  cambiarTab(tab: 'Factura' | 'Listado') {
    this.activeTab = tab;
    if (tab === 'Factura' && this.gridApi) {
      setTimeout(() => this.gridApi.sizeColumnsToFit());
    }
    if (tab === 'Listado') {
      this.cargarListado();
    }
  }

  cargarListado() {
    const anio = Number(this.formFactura?.get('anio')?.value ?? new Date().getFullYear());

    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: {
        title: 'Cargando Facturas…',
        message: 'Por favor espere mientras se cargan los datos.',
        type: 'info',
        isLoading: true,
        loadingText: 'Cargando información…',
        showCancel: false
      }
    });

    this.cargando = true;

    this.notasObsService.getNotasObsPorAnio(anio, true)
      .pipe(
        finalize(() => {
          this.cargando = false;
          loadingDialog.close();
        })
      )
      .subscribe({
        next: rows => {
          this.listadoData = rows ?? [];
        },
        error: err => {
          console.error('[Listado] error:', err);
          this.listadoData = [];
          this.dialog.open(CustomMessageBoxComponent, {
            data: {
              title: 'Error al cargar',
              message: 'No se pudieron obtener las facturas. Intente nuevamente.',
              isLoading: false,
              showCancel: false
            }
          });
        }
      });
  }

  money(v: number) {
    const n = Number(v ?? 0);
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  onQuickFilter(e: Event) {
    const value = (e.target as HTMLInputElement).value || '';
    this.hasQf = !!value.trim();
    if (this.gridApi) this.gridApi.setGridOption('quickFilterText', value);
    else this.pendingQuickFilter = value;
  }

  clearBusqueda() {
    this.pendingQuickFilter = '';
    this.hasQf = false;
    if (this.qfInput) this.qfInput.nativeElement.value = '';
    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', '');
      this.gridApi.onFilterChanged();
    }
  }

  private parseNumber(v: any): number {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/,/g, '').trim();
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  }

  onSelectionChanged() {
    if (!this.gridApi) return;

    this.saveSelection();

    const rows = this.gridApi.getSelectedRows();
    this.selectedCount = rows.length;
    this.totalSeleccionado = rows.reduce((sum, r) => sum + this.parseNumber(r.total), 0);

    if (this.showSoloSeleccionados) {
      this.gridApi.onFilterChanged();
    }
  }

  // ===== FILTRO EXTERNO: seleccionados + letras A-Z =====
  isExternalFilterPresent = (): boolean => {
    return this.showSoloSeleccionados || this.selectedLetters.size > 0;
  };

  doesExternalFilterPass = (node: IRowNode): boolean => {
    const data = node.data ?? {};

    // filtro por seleccionados
    if (this.showSoloSeleccionados && !node.isSelected()) {
      return false;
    }

    // filtro alfabético A-Z
    if (this.selectedLetters.size > 0) {
      const cliente = String(data.cliente ?? '').trim().toUpperCase();

      if (!cliente) return false;

      // obtiene la primera letra alfabética real
      const match = cliente.match(/[A-ZÁÉÍÓÚÑ]/i);
      const primeraLetra = match ? match[0].toUpperCase() : '';

      if (!primeraLetra || !this.selectedLetters.has(primeraLetra.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
        return false;
      }
    }

    return true;
  };

  toggleSoloSeleccionados() {
    this.showSoloSeleccionados = !this.showSoloSeleccionados;
    this.gridApi?.onFilterChanged();
  }

  limpiarSeleccion() {
    this.gridApi?.deselectAll();
    this.onSelectionChanged();
  }

  // ===== NUEVO: Métodos filtro alfabético =====
toggleLetter(letter: string): void {
  const l = (letter || '').toUpperCase();
  if (!l || !this.gridApi) return;

  const wasActive = this.selectedLetters.has(l);

  if (wasActive) {
    this.selectedLetters.delete(l);
  } else {
    this.selectedLetters.add(l);
  }

  this.gridApi.forEachNode((node) => {
    const cliente = String(node.data?.cliente ?? '').trim().toUpperCase();
    if (!cliente) return;

    // toma la primera letra alfabética real
    const match = cliente.match(/[A-ZÁÉÍÓÚÑ]/i);
    const primeraLetraRaw = match ? match[0].toUpperCase() : '';
    const primeraLetra = primeraLetraRaw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (primeraLetra === l) {
      if (wasActive) {
        // si la letra estaba activa y ahora se quitó, deselecciona
        node.setSelected(false);
      } else {
        // si la letra no estaba activa y ahora se activó, selecciona
        node.setSelected(true);
      }
    }
  });

  this.saveSelection();
  this.onSelectionChanged();
  this.gridApi.onFilterChanged();
}
  isLetterActive(letter: string): boolean {
    return this.selectedLetters.has((letter || '').toUpperCase());
  }

  clearLetters(): void {
  if (!this.gridApi) {
    this.selectedLetters.clear();
    return;
  }

  if (this.selectedLetters.size > 0) {
    this.gridApi.forEachNode((node) => {
      const cliente = String(node.data?.cliente ?? '').trim().toUpperCase();
      if (!cliente) return;

      const match = cliente.match(/[A-ZÁÉÍÓÚÑ]/i);
      const primeraLetraRaw = match ? match[0].toUpperCase() : '';
      const primeraLetra = primeraLetraRaw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      if (this.selectedLetters.has(primeraLetra)) {
        node.setSelected(false);
      }
    });
  }

  this.selectedLetters.clear();
  this.saveSelection();
  this.onSelectionChanged();
  this.gridApi.onFilterChanged();
}

  buscar() {
    if (this.formFactura.invalid) return;

    const termino = (this.formFactura.get('termino')?.value ?? '').trim();
    const prefijo = (this.formFactura.get('prefijo')?.value ?? '').trim();
    const idZona = this.formFactura.get('zona')?.value || null;

    this.deshabilitarBuscar = true;
    this.habilitarFacturar = false;
    this.cargando = true;

    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: {
        title: 'Cargando Clientes...',
        message: 'Por favor espere mientras se cargan los datos del cliente.',
        isLoading: true,
        showCancel: false
      }
    });

    const anioFactura = Number(this.formFactura.get('anio')?.value ?? new Date().getFullYear());

    this.facturaGlobalService
      .getClientesCodpreGrupo({ busquedaGeneral: termino, prefijoBusqueda: prefijo, idZona, anioFactura })
      .pipe(
        map((rows: ClienteCodpreGrupoResponse[] = []) =>
          rows.map(r => ({
            codCliente: r.codcli,
            ruc: r.ruccli,
            cliente: r.nomcli,
            grupo: r.codigo_Grupo,
            prefijo: r.codpre,
            valor: r.mantenimiento ?? 0,
            subtotal: r.subtotal ?? 0,
            iva: r.iva ?? 0,
            total: r.total ?? 0,
            ciudad: r.ciudad ?? '',
            zona: r.referencia ?? '',
            piva: r.pIva ?? 15,
            idcodcontable: (r as any).idCodContable ?? (r as any).idcodcontable ?? null
          }))
        ),
        switchMap(baseRows => {
          const ids: number[] = Array.from(
            new Set(baseRows.map(r => Number(r.codCliente)).filter(Number.isFinite))
          );
          if (!ids.length) return of({ baseRows, emailMap: {} as Record<number, string> });

          const peticiones = ids.map(id =>
            this.clienteContactoService.getFacturacionByClienteCodigo(id).pipe(
              take(1),
              map((contactos: any[]) => [id, this.buildEmailFromContactos(contactos)] as [number, string]),
              catchError(() => of<[number, string]>([id, '']))
            )
          );

          return forkJoin(peticiones).pipe(
            map(pares => {
              const emailMap: Record<number, string> = {};
              for (const [k, v] of pares) emailMap[k] = v;
              return { baseRows, emailMap };
            })
          );
        }),
        finalize(() => {
          this.cargando = false;
          loadingDialog.close();
        })
      )
      .subscribe({
        next: ({ baseRows, emailMap }) => {
          this.rowData = baseRows.map(r => ({ ...r, email: emailMap[Number(r.codCliente)] ?? '' }));

          // reset de selección al cargar nueva consulta
          this.selectedIds.clear();
          this.totalSeleccionado = 0;
          this.selectedCount = 0;

          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.rowData);
            this.gridApi.sizeColumnsToFit();
            this.gridApi.onFilterChanged(); // reaplica filtro externo A-Z si existiera
          }

          this.habilitarFacturar = true;
          this.deshabilitarBuscar = false;
        },
        error: (err) => {
          console.error('[FacturaGlobal] error al buscar:', err);
          this.deshabilitarBuscar = false;
          this.habilitarFacturar = false;
        }
      });
  }

  facturar() {
    if (!this.cajaAsignada) {
      this.dialog.open(CustomMessageBoxComponent, {
        data: {
          title: 'Caja no asignada',
          message: 'Usuario no tiene asignado Caja. No podrás generar facturas hasta asignarla.',
          isLoading: false,
          showCancel: false
        }
      });
      return;
    }

    if (!this.gridApi) return;

    const seleccionadas: any[] = this.gridApi.getSelectedRows() ?? [];
    if (!seleccionadas.length) {
      console.warn('[Facturar] No hay filas seleccionadas.');
      return;
    }

    const confirmRef = this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: {
        title: 'Confirmar facturación',
        isLoading: false,
        showCancel: true,
        cancelText: 'No, cancelar',
        okText: 'Sí, facturar',
        message: `Este proceso es IRREVERSIBLE y generará documentos oficiales para ${seleccionadas.length} cliente(s).\n\n¿Desea continuar?`
      }
    });

    confirmRef.afterClosed().pipe(take(1)).subscribe((acepta: boolean) => {
      if (!acepta) return;

      const getErrMsg = (err: any): string => {
        const e = err?.error ?? err;
        if (typeof e === 'string') return e;
        if (e?.message) return e.message;
        if (e?.title) return e.title;
        if (Array.isArray(e?.errors)) return e.errors.join('; ');
        if (e?.detail) return e.detail;
        if (err?.statusText) return `${err.statusText}${err?.status ? ` [${err.status}]` : ''}`;
        return 'Error desconocido al guardar (SaveChanges).';
      };

      const exportCSV = (rows: any[]) => {
        if (!rows?.length) return;
        const head = ['#', 'CodCliente', 'Cliente', 'Prefijo', 'Total', 'Status', 'Mensaje'];
        const body = rows.map((e, i) => [
          i + 1,
          e.codCliente ?? '',
          `"${String(e.cliente ?? '').replace(/"/g, '""')}"`,
          e.prefijo ?? '',
          e.total ?? '',
          e.status ?? '',
          `"${String(e.mensaje ?? '').replace(/"/g, '""')}"`
        ].join(','));
        const csv = [head.join(','), ...body].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `facturacion_errores_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      };

      this.facturando = true;
      this.habilitarFacturar = false;
      this.deshabilitarBuscar = true;

      const total = seleccionadas.length;
      let procesadas = 0;
      let exitosas = 0;
      let fallidas = 0;

      const erroresBatch: Array<{
        codCliente: any;
        cliente: string;
        prefijo: string;
        total: number;
        mensaje: string;
        status?: number;
      }> = [];

      const dlg = this.dialog.open(CustomMessageBoxComponent, {
        disableClose: true,
        data: {
          title: 'Facturando…',
          message: `Procesadas 0 / ${total} · OK: 0 · Error: 0`,
          isLoading: true,
          showCancel: false
        }
      });

      from(seleccionadas.map((row, idx) => ({ row, idx }))).pipe(
        concatMap(({ row, idx }) =>
          timer(idx === 0 ? 0 : this.PAUSA_MS).pipe(
            switchMap(() => {
              const payload = this.buildFacturaFromRow(row);

              const inval = !payload.caja || !payload.idUsuarioCajero ||
                !payload.prefijo || payload.totalCalculado <= 0 ||
                payload.detalles.length === 0;

              if (inval) {
                throw { status: 400, error: { message: 'Datos incompletos para la factura.' } };
              }

              return this.workflow.procesarFacturaConAsientoObligatorio(
                payload,
                (idNota: number, numeroFactura?: string) =>
                  this.buildAsientoVentaRequestGlobal(idNota, numeroFactura ?? '', row, payload)
              ).pipe(
                retryWhen(err$ =>
                  err$.pipe(
                    scan((acc: number, _err) => {
                      const attempt = acc + 1;
                      if (attempt > this.MAX_RETRIES) throw _err;
                      return attempt;
                    }, 0),
                    delayWhen((attempt: number) =>
                      timer(this.RETRY_BASE_MS * Math.pow(2, Math.max(0, attempt - 1)))
                    )
                  )
                ),

                tap((res: WorkflowResult) => {
                  exitosas++;
                  procesadas++;

                  row.idNotaGenerada = res.idNota;
                  row.asiento = res.numdocVT;
                  row.xml = res.xmlFileName ?? '';

                  if (dlg.componentInstance) {
                    dlg.componentInstance.data = {
                      ...dlg.componentInstance.data,
                      message: `Procesadas ${procesadas} / ${total} · OK: ${exitosas} · Error: ${fallidas}`
                    };
                  }
                }),

                catchError(err => {
                  fallidas++;
                  procesadas++;

                  erroresBatch.push({
                    codCliente: row.codCliente,
                    cliente: row.cliente,
                    prefijo: row.prefijo,
                    total: row.total,
                    mensaje: getErrMsg(err),
                    status: err?.status
                  });

                  if (dlg.componentInstance) {
                    dlg.componentInstance.data = {
                      ...dlg.componentInstance.data,
                      message: `Procesadas ${procesadas} / ${total} · OK: ${exitosas} · Error: ${fallidas}`
                    };
                  }

                  return of(null);
                })
              );
            })
          )
        ),
        finalize(() => {
          this.facturando = false;
          dlg?.close();

          const resumenRef = this.dialog.open(CustomMessageBoxComponent, {
            disableClose: false,
            data: {
              title: fallidas > 0 ? 'Facturación terminada con errores' : 'Facturación terminada',
              message: `OK: ${exitosas} • Error: ${fallidas} de ${total}`,
              isLoading: false,
              showCancel: false,
              okText: fallidas > 0 ? 'Ver detalle' : 'Aceptar'
            }
          });

          resumenRef.afterClosed().pipe(take(1)).subscribe(() => {
            if (erroresBatch.length) {
              const detalleHtml = erroresBatch.map((e, i) =>
                `#${i + 1} • <b>${e.cliente}</b> (${e.codCliente}) [${e.prefijo}] — ${e.mensaje}${e.status ? ` <i>[${e.status}]</i>` : ''}`
              ).join('<br/>');

              const detRef = this.dialog.open(CustomMessageBoxComponent, {
                data: {
                  title: 'Detalle de errores',
                  message: detalleHtml,
                  isLoading: false,
                  showCancel: true,
                  cancelText: 'Cerrar',
                  okText: 'Exportar CSV'
                }
              });

              detRef.afterClosed().pipe(take(1)).subscribe((quiereCsv: boolean) => {
                if (quiereCsv) exportCSV(erroresBatch);
                this.cancelar();
              });
            } else {
              this.cancelar();
            }
          });
        })
      ).subscribe();
    });
  }

  cancelar() {
    const anioPorDefecto = new Date().getFullYear().toString();
    this.formFactura.reset({
      anio: anioPorDefecto,
      termino: '',
      prefijo: '',
      zona: ''
    });
    this.formFactura.markAsPristine();
    this.formFactura.markAsUntouched();

    this.hasQf = false;
    this.pendingQuickFilter = '';
    this.selectedLetters.clear();
    this.selectedIds.clear();

    if (this.qfInput) this.qfInput.nativeElement.value = '';

    this.rowData = [];
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', []);
      this.gridApi.deselectAll();
      this.gridApi.setFilterModel(null);
      this.gridApi.setGridOption('quickFilterText', '');
      this.gridApi.onFilterChanged();
      if (this.showSoloSeleccionados) {
        this.showSoloSeleccionados = false;
        this.gridApi.onFilterChanged();
      }
    }

    this.totalSeleccionado = 0;
    this.selectedCount = 0;
    this.cargando = false;
    this.deshabilitarBuscar = false;
    this.habilitarFacturar = false;
    this.facturando = false;
    this.cargarAutorizacion();
  }

  cajaAsignada = false;

  cargarAutorizacion(): void {
    const id =
      this.usuarioActual?.cajas?.find(c => c.id_tipo_documento === 1)?.id_autorizacion_caja
      ?? null;

    this.cajaAsignada = false;

    if (id == null) {
      this.formCaja.patchValue({ secuencial: '', caja: '', puntoEmision: '' });
      return;
    }

    const idNum = Number(id);

    this.autorizacionCajaService.getAutorizacionCaja(idNum).subscribe({
      next: ({ data }) => {
        if (!data) {
          this.cajaAsignada = false;
          this.formCaja.patchValue({ secuencial: '', caja: '', puntoEmision: '' });
          return;
        }

        this.formCaja.patchValue({
          secuencial: this.padLeft(data.numero, 9),
          caja: data.caja ?? '',
          puntoEmision: data.num_establecimiento ?? '',
        });

        this.cajaAsignada = !!(data.caja && data.numero != null);
      },
      error: (err) => {
        console.error('Error cargando autorización de caja', err);
        this.cajaAsignada = false;
        this.formCaja.patchValue({ secuencial: '', caja: '', puntoEmision: '' });
      },
    });
  }

  private padLeft(value: any, size: number): string {
    const s = (value ?? '').toString().replace(/\D/g, '');
    return s ? s.padStart(size, '0') : '';
  }

  private buildEmail(cli: any): string {
    const e1 = (cli?.email ?? cli?.correo ?? '').toString().trim();
    const e2 = (cli?.emailOpcional ?? cli?.email_opcional ?? '').toString().trim();
    return [e1, e2].filter(Boolean).join(';');
  }

  private cargarEmails(codigos: number[]) {
    const unique = Array.from(new Set(codigos)).filter(n => Number.isFinite(n));
    if (!unique.length) return of({} as Record<number, string>);

    const reqs = unique.map((id) =>
      this.clienteService.getClienteById(id).pipe(
        take(1),
        map(cli => [id, this.buildEmail(cli)] as [number, string]),
        catchError(() => of<[number, string]>([id, '']))
      )
    );

    return forkJoin(reqs).pipe(
      map(entries => {
        const dict: Record<number, string> = {};
        for (const [k, v] of entries) dict[k] = v;
        return dict;
      })
    );
  }

  private buildEmailFromContactos(contactos: any[]): string {
    const getProp = (o: any, ...keys: string[]) =>
      keys.map(k => o?.[k]).find(v => v !== undefined);

    const findEmailLinea = (lista: any[], n: number): string => {
      const c = lista.find(x => (getProp(x, 'linea', 'Linea') ?? 0) === n);
      const email = getProp(c ?? {}, 'email', 'Email');
      return (email ?? '').toString().trim();
    };

    const emailLinea2 = findEmailLinea(contactos, 2);
    const emailLinea3 = findEmailLinea(contactos, 3);
    return [emailLinea2, emailLinea3].filter(Boolean).join(';');
  }

  private cargarZonas(): void {
    this.cargandoZonas = true;
    this.zonaService.obtenerZona()
      .pipe(
        take(1),
        catchError(() => of([] as Zona[]))
      )
      .subscribe(zs => {
        this.zonas = (zs || []).sort((a, b) =>
          (a.referencia || '').localeCompare(b.referencia || '')
        );
        this.cargandoZonas = false;
      });
  }

  limitAnio(e: Event) {
    const el = e.target as HTMLInputElement;
    const onlyDigits = (el.value || '').replace(/\D/g, '').slice(0, 4);
    if (onlyDigits !== el.value) {
      this.anioCtrl.setValue(onlyDigits);
    }
  }

  onKeyDownForm(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') {
      e.preventDefault();
      this.buscar();
    }
  }

  restoreAnio(): void {
    this.anioCtrl.setValue(String(new Date().getFullYear()));
  }

  private buildFacturaFromRow(row: any): FacturaCrearRequest {
    const anio = Number(this.formFactura.get('anio')?.value ?? new Date().getFullYear());
    const periodoDesde = `${anio}-01-01`;
    const periodoHasta = `${anio}-12-31`;

    const caja = String(this.formCaja.get('caja')?.value ?? '').trim();
    const idUsuarioCajero: number = Number(this.usuarioActual?.id_usuario ?? 0) || 0;

    const prefijo = String(row.prefijo ?? '').trim();
    const correo = String(row.email ?? '').trim();
    const GrupoCliente = String(row.grupo ?? '').trim();
    const facBloque = 1;

    const valor = Number(row.valor ?? 0);
    const subtotal = Number(row.subtotal ?? (valor * 12));
    const iva = Number(row.iva ?? 0);
    const total = Number(row.total ?? (subtotal + iva));

    const pref = String(row.prefijo ?? '').trim().toUpperCase();
    const nombreMant = `MANTENIMIENTO ANUAL PREFIJO: ${pref} ENERO ${anio} -- HASTA DICIEMBRE ${anio}`;

    return {
      idCliente: Number(row.codCliente ?? 0),
      caja,
      idUsuarioCajero,
      idDescuentoGlobal: null,
      porcentajeDescuentoGlobal: null,
      observaciones: `Grupo: ${GrupoCliente}`,
      anioFactura: anio,
      numeroOrdenCompra: '.',
      numeroGuiaRemision: '.',
      prefijo,
      correo,
      facBloque,
      GrupoCliente,
      subtotalSIva: 0,
      subtotalCalculado: subtotal,
      descuentoTotalCalculado: 0,
      ivaTotalCalculado: iva,
      totalCalculado: total,
      detalles: [{
        idProducto: this.PRODUCTO_MANTENIMIENTO_ID,
        cantidad: 12,
        precio: valor,
        idDescuentoPredeterminado: null,
        porcentajeDescuentoManual: null,
        nombreProductoPersonalizado: nombreMant,
        ivaCalculado: iva,
        subtotalCalculado: subtotal,
        descuentoCalculado: 0,
        totalCalculado: total,
        codigoPrefijo: prefijo,
        periodoDesde,
        periodoHasta
      }],
      formasPago: [{
        idFormaPago: 4,
        valor: total,
        referencia: '',
        observaciones: '',
        codPlazo: '0',
        banco: '',
        numeroTarjeta: '',
        chequeCaduca: '',
        duenio: '',
        autoriza: ''
      }]
    };
  }

  onAnioInput(evt: Event) {
    const val = (evt.target as HTMLInputElement).value ?? '';
    const onlyDigits = val.replace(/\D/g, '').slice(0, 4);
    this.formFactura.get('anio')?.setValue(onlyDigits);
    this.cargarListado();
  }

  imprimirNota(row: NotaObs) {
    if (!row?.idNota) { return; }
    const nombre = `factura-${row.numnota ?? row.idNota}.pdf`;
    this.facturaService.descargarPdfFactura(Number(row.idNota), nombre)
      .pipe(take(1))
      .subscribe({
        next: () => { },
        error: (err) => console.error('[Imprimir] error:', err)
      });
  }

  onListadoGridReady(e: GridReadyEvent) {
    this.listadoGridApi = e.api;
    this.listadoGridApi.sizeColumnsToFit();
  }

  onListadoSelectionChanged() {
    if (!this.listadoGridApi) return;
    this.listadoSelectedCount = this.listadoGridApi.getSelectedRows().length;
  }

  imprimirSeleccionadas() {
    if (!this.listadoGridApi) return;

    const seleccionadas: NotaObs[] = this.listadoGridApi.getSelectedRows() ?? [];
    if (!seleccionadas.length) return;

    const dlg = this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: {
        title: 'Imprimiendo…',
        message: `Procesadas 0 / ${seleccionadas.length}`,
        isLoading: true,
        showCancel: false
      }
    });

    this.imprimiendo = true;
    let procesadas = 0;

    from(seleccionadas).pipe(
      concatMap((row, i) =>
        timer(i === 0 ? 0 : 200).pipe(
          switchMap(() => {
            const id = Number(row.idNota);
            const nombre = `factura-${row.numnota ?? id}.pdf`;
            return this.facturaService.descargarPdfFactura(id, nombre).pipe(take(1));
          }),
          tap(() => {
            procesadas++;
            if (dlg?.componentInstance) {
              dlg.componentInstance.data = {
                ...dlg.componentInstance.data,
                message: `Procesadas ${procesadas} / ${seleccionadas.length}`
              };
            }
          }),
          catchError(err => {
            console.error('[Imprimir seleccionadas] error:', err);
            procesadas++;
            if (dlg?.componentInstance) {
              dlg.componentInstance.data = {
                ...dlg.componentInstance.data,
                message: `Procesadas ${procesadas} / ${seleccionadas.length} (con errores)`
              };
            }
            return of(void 0);
          })
        )
      ),
      finalize(() => {
        this.imprimiendo = false;
        dlg?.close();
      })
    ).subscribe();
  }

  zipSeleccionadas() {
    if (!this.listadoGridApi) return;

    const filas: NotaObs[] = this.listadoGridApi.getSelectedRows() ?? [];
    if (!filas.length) return;

    const dlg = this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: {
        title: 'Preparando ZIP…',
        message: `Descargando 0 / ${filas.length}`,
        isLoading: true,
        showCancel: false
      }
    });

    this.zipping = true;

    const zip = new JSZip();
    let descargadas = 0;

    from(filas).pipe(
      concatMap((row, i) =>
        timer(i === 0 ? 0 : 150).pipe(
          switchMap(() => this.facturaService.getPdfFacturaBlob(Number(row.idNota))),
          tap((blob: Blob) => {
            const nombre = `factura-${row.numnota ?? row.idNota}.pdf`;
            zip.file(nombre, blob);
            descargadas++;
            if (dlg?.componentInstance) {
              dlg.componentInstance.data = {
                ...dlg.componentInstance.data,
                message: `Descargando ${descargadas} / ${filas.length}`
              };
            }
          }),
          catchError(err => {
            console.error('[ZIP] fallo al obtener PDF', row, err);
            descargadas++;
            return of(null);
          })
        )
      ),
      switchMap(() =>
        zip.generateAsync(
          {
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
          },
          (meta: ZipProgress) => {
            if (dlg?.componentInstance) {
              dlg.componentInstance.data = {
                ...dlg.componentInstance.data,
                message: `Comprimiendo… ${Math.round(meta.percent)}%`
              };
            }
          }
        )
      ),
      finalize(() => {
        this.zipping = false;
        dlg?.close();
      })
    ).subscribe({
      next: (zipBlob: Blob) => {
        const nombreZip = `facturas_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.zip`;
        saveAs(zipBlob, nombreZip);
      },
      error: (err) => {
        console.error('[ZIP] error general:', err);
        this.dialog.open(CustomMessageBoxComponent, {
          data: { title: 'Error', message: 'No se pudo generar el ZIP.', isLoading: false }
        });
      }
    });
  }

  exportarExcelConsulta(): void {
    if (!this.gridApi) return;

    const selected = this.gridApi.getSelectedRows() ?? [];
    const rows: any[] = selected.length ? selected : [];

    if (!selected.length) {
      this.gridApi.forEachNodeAfterFilterAndSort(n => {
        if (n?.data) rows.push(n.data);
      });
    }

    if (!rows.length) {
      this.dialog.open(CustomMessageBoxComponent, {
        data: {
          title: 'Sin datos',
          message: 'No hay registros para exportar (verifique filtros).',
          isLoading: false,
          showCancel: false
        }
      });
      return;
    }

    const anio = (this.formFactura.get('anio')?.value ?? '').toString().trim() || 'anio';
    const zona = (this.formFactura.get('zona')?.value ?? '').toString().trim() || 'todas';

    const fileName = `consulta_factura_global_${anio}_zona_${zona}_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, '-')}.xlsx`;

    const cols: Array<{ header: string; key: string }> = [
      { header: 'Cod.Cliente', key: 'codCliente' },
      { header: 'RUC', key: 'ruc' },
      { header: 'Cliente', key: 'cliente' },
      { header: 'Grupo', key: 'grupo' },
      { header: 'Zona', key: 'zona' },
      { header: 'Prefijo', key: 'prefijo' },
      { header: 'Valor', key: 'valor' },
      { header: 'Subtotal', key: 'subtotal' },
      { header: 'IVA', key: 'iva' },
      { header: 'Total', key: 'total' },
      { header: 'Ciudad', key: 'ciudad' }
    ];

    const dlg = this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: {
        title: 'Exportando Excel…',
        message: selected.length
          ? `Exportando ${rows.length} registro(s) seleccionados…`
          : `Exportando ${rows.length} registro(s)…`,
        isLoading: true,
        showCancel: false
      }
    });

    try {
      const wb = new (ExcelJS as any).Workbook();
      wb.creator = 'SIC3000';
      wb.created = new Date();

      const ws = wb.addWorksheet(`Consulta ${anio}`, {
        views: [{ state: 'frozen', ySplit: 2 }]
      });

      ws.mergeCells(1, 1, 1, cols.length);
      const titleCell = ws.getCell(1, 1);
      titleCell.value = `Factura Global - Consulta ${anio} (Zona: ${zona})`;
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      ws.addRow(cols.map(c => c.header));
      const headerRow = ws.getRow(2);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 18;

      headerRow.eachCell((cell: any) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      for (const r of rows) {
        const rowValues = cols.map(c => {
          const v = r?.[c.key];
          if (['valor', 'subtotal', 'iva', 'total'].includes(c.key)) return Number(v ?? 0);
          return v ?? '';
        });

        const excelRow = ws.addRow(rowValues);
        excelRow.alignment = { vertical: 'middle', horizontal: 'left' };

        excelRow.eachCell((cell: any) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }

      const headerIndex: Record<string, number> = {};
      cols.forEach((c, i) => (headerIndex[c.header] = i + 1));

      for (const h of ['Valor', 'Subtotal', 'IVA', 'Total']) {
        const idx = headerIndex[h];
        if (!idx) continue;
        const col = ws.getColumn(idx);
        col.numFmt = '#,##0.00';
        col.alignment = { vertical: 'middle', horizontal: 'right' };
      }

      if (headerIndex['Prefijo']) {
        ws.getColumn(headerIndex['Prefijo']).alignment = { vertical: 'middle', horizontal: 'right' };
      }

      for (let c = 1; c <= cols.length; c++) {
        let max = 10;
        for (let r = 1; r <= ws.rowCount; r++) {
          const v = ws.getRow(r).getCell(c).value;
          const len = v == null ? 0 : String(v).length;
          if (len > max) max = len;
        }
        ws.getColumn(c).width = Math.min(Math.max(max + 2, 10), 45);
      }

      wb.xlsx.writeBuffer()
        .then((buffer: ArrayBuffer) => {
          const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });
          saveAs(blob, fileName);
          dlg.close();
        })
        .catch((err: any) => {
          console.error('[Excel] writeBuffer error:', err);
          dlg.close();
          this.dialog.open(CustomMessageBoxComponent, {
            data: { title: 'Error', message: 'No se pudo generar el Excel.', isLoading: false }
          });
        });

    } catch (err) {
      console.error('[Excel] error:', err);
      dlg.close();
      this.dialog.open(CustomMessageBoxComponent, {
        data: { title: 'Error', message: 'No se pudo exportar a Excel.', isLoading: false }
      });
    }
  }

  get canExportExcelConsulta(): boolean {
    return !!this.gridApi && (this.rowData?.length ?? 0) > 0 && !this.cargando && !this.facturando;
  }

  private toIsoFromDdMmYyyy(fecha: string): string {
    const s = (fecha ?? '').trim();
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return new Date().toISOString();
    const dd = m[1], mm = m[2], yyyy = m[3];
    return `${yyyy}-${mm}-${dd}T00:00:00`;
  }

  private buildAsientoVentaRequestGlobal(
    idNota: number,
    numnota: string,
    row: any,
    payload: FacturaCrearRequest
  ): AsientoVentaRequest {

    const ID_TIPO_ASIENTO_VT = 3;
    const MODULO_VENTAS = 2;

    const ID_LOCAL = 1;
    const ID_COD_CONTABLE = Number(row?.idcodcontable ?? 0) || 0;

    if (!ID_COD_CONTABLE) {
      throw { status: 400, error: { message: `Cliente ${row?.codCliente}: no tiene idCodContable asignado.` } };
    }

    const CTA_CXC = { idPlan: 19, cod: '110205-001' };
    const CTA_ING = { idPlan: 235, cod: '410101-003' };
    const CTA_IVA = { idPlan: 131, cod: '210602-001' };

    const fechaUI = String(this.formCaja.get('fechaFacturacion')?.value ?? '').trim();
    const fechaIso = this.toIsoFromDdMmYyyy(fechaUI);

    const nowTime = new Date().toTimeString().slice(0, 8);
    const fechaIsoConHora = fechaIso.replace('T00:00:00', `T${nowTime}`);

    const anio = String(this.formFactura.get('anio')?.value ?? new Date().getFullYear()).trim();

    const z = this.formFactura.get('zona')?.value;
    const idZona = (z === '' || z == null) ? 1 : Number(z);

    const idEmpresa = Number((this.usuarioActual as any)?.id_empresa ?? 1) || 1;
    const idUsuario = Number(this.usuarioActual?.id_usuario ?? 0) || 0;

    const beneficiario = String(row?.cliente ?? '').trim();

    const subtotal = Number(payload.subtotalCalculado ?? payload.subtotalSIva ?? 0);
    const iva = Number(payload.ivaTotalCalculado ?? 0);
    const total = Number(payload.totalCalculado ?? 0);

    const cab: any = {
      IdCabMaestro: 0,
      idZona: 1,
      idUsuario,
      idEmpresa,
      idTipoAsiento: ID_TIPO_ASIENTO_VT,
      tipdoc: 'VT',
      numdoc: 0,
      anio,
      fechatransaccion: fechaIsoConHora,
      fechaingreso: fechaIsoConHora,
      observacion: `ASIENTO POR VENTA FACTURA ${numnota}`,
      totdebe: total,
      tothaber: total,
      beneficiario,
      cierre: '',
      fechacierre: null,
      solicitado: '',
      depto: '',
      autorizado: '',
      homCodigo: 0,
      estado: true,
      modulo: MODULO_VENTAS,
      detalles: []
    };

    const detBase = (numlinea: number) => ({
      IdDetMaestro: 0,
      IdCabMaestro: 0,
      numlinea,
      anio,
      fechatransaccion: fechaIsoConHora,
      fechaingreso: fechaIsoConHora,
      hora: nowTime,
      idZona,
      idCentroCostos: null,
      idLocal: ID_LOCAL,
      idPlanCuentas: 0,
      codprePc: '',
      idCodContable: ID_COD_CONTABLE,
      nocomprobante: numnota,
      docurelacionado: '',
      cheque: 0,
      beneficiario: '',
      debe: 0,
      haber: 0,
      comentario: '',
      idMovBancario: 1,
      movbancario: '0',
      cierre: '',
      fechacierre: null,
      conciliado: '',
      fechaconciliado: null,
      idSustentoTrib: null,
      idTipoCompSri: null,
      autorizacion: '',
      fechacaduca: null,
      idTipoRetencion: null,
      idProyecto: null,
      idSubproyecto: null,
      transferido: false,
      fechatransferido: null,
      fechavencimiento: null,
      idConciliacion: 0,
      valorLetras: '',
      estadoIngreso: true,
      autorizacionRelacionado: '',
      fechaCadRelacionado: null
    });

    const d1 = detBase(1);
    d1.idPlanCuentas = CTA_CXC.idPlan;
    d1.codprePc = CTA_CXC.cod;
    d1.debe = total;
    d1.comentario = `COBRO FACTURA ${numnota} - CREDITO`;

    const d2 = detBase(2);
    d2.idPlanCuentas = CTA_ING.idPlan;
    d2.codprePc = CTA_ING.cod;
    d2.haber = subtotal;
    d2.comentario = `INGRESO POR VENTA FACTURA ${numnota} - ${String(payload.detalles?.[0]?.nombreProductoPersonalizado ?? '').trim()}`;

    const d3 = detBase(3);
    d3.idPlanCuentas = CTA_IVA.idPlan;
    d3.codprePc = CTA_IVA.cod;
    d3.haber = iva;
    d3.comentario = `IVA RECAUDADO FACTURA ${numnota}`;

    cab.detalles = [d1, d2, d3];
    return cab as AsientoVentaRequest;
  }

  private actualizarNotaConAsiento(idNota: number, numdoc: string | null) {
    if (!numdoc) return of(false);

    const numeroAsientoConPrefijo = `VT-${numdoc}`;

    return this.facturaService.actualizarAsientoContable(idNota, numeroAsientoConPrefijo).pipe(
      tap((resp: any) => {
        const tipo = (resp?.type || '').toString().toLowerCase();
        if (tipo === 'success' || tipo === 'warning') {
          console.log(`[nota] Asiento actualizado en nota ${idNota}: ${numeroAsientoConPrefijo}`);
        } else {
          console.warn('[nota] No actualizó asiento:', resp);
        }
      }),
      map((resp: any) => {
        const tipo = (resp?.type || '').toString().toLowerCase();
        return (tipo === 'success' || tipo === 'warning');
      }),
      catchError((err: any) => {
        console.error('[nota] Error actualizando asiento en nota:', err);
        return of(false);
      })
    );
  }

  private selectedIds = new Set<string>();

  private saveSelection(): void {
    if (!this.gridApi) return;
    this.selectedIds.clear();
    for (const r of (this.gridApi.getSelectedRows() ?? [])) {
      const id = String(r?.codCliente ?? '');
      if (id) this.selectedIds.add(id);
    }
  }

  private restoreSelection(): void {
    if (!this.gridApi) return;

    this.gridApi.forEachNode((node) => {
      const id = String(node.data?.codCliente ?? '');
      const shouldSelect = this.selectedIds.has(id);
      if (node.isSelected() !== shouldSelect) {
        node.setSelected(shouldSelect);
      }
    });

    const rows = this.gridApi.getSelectedRows();
    this.selectedCount = rows.length;
    this.totalSeleccionado = rows.reduce((sum, r) => sum + this.parseNumber(r.total), 0);
  }
}