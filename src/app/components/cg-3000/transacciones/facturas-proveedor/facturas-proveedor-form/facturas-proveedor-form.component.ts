import { Component, OnInit, ViewChild, effect, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormControl, // agregar para el control de combo auxiliares contables
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsuarioService } from 'src/app/services/usuario.service';
import { Optional, Inject } from '@angular/core';
import { MatDialogRef, MatDialog, MatDialogConfig, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { startWith, distinctUntilChanged } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { tap, shareReplay, map, catchError, finalize } from 'rxjs/operators';
import { TipoAsientoService } from 'src/app/services/tipoasiento.service';
import { TipoAsientoResponse } from 'src/app/interfaces/responses/tipo-asiento-response';
import { ZonaService } from 'src/app/services/zona.service';
import { ZonaResponse } from 'src/app/interfaces/responses/zona-response';

// LOCALES
import { LocalesService } from 'src/app/services/locales.service';
import { LocalesResponse } from 'src/app/interfaces/responses/local-response';

// ⬇️ Reutilizamos los cell editors del módulo de asientos contables
import { LocalCellEditorComponent } from '../../asientos-contables/asientos-contables-form/local-cell-editor.component';
import { PlanCuentasService, PlanCuenta } from 'src/app/services/plan-cuentas.service';
import { PlanCuentaCellEditorComponent } from '../../asientos-contables/asientos-contables-form/plan-cuenta-cell-editor.component';
import { CodigosContablesService } from 'src/app/services/codigoscontables.service';
import { CodigosContablesResponse } from 'src/app/interfaces/responses/codigos-contables-response';
import { CodContableCellEditorComponent } from '../../asientos-contables/asientos-contables-form/cod-contable-cell-editor.component';
import { MovimientoBancarioService } from 'src/app/services/movimiento-bancario.service';
import { MovimientoBancarioResponse } from 'src/app/interfaces/responses/movimiento-bancario-response';

import { MovimientoBancarioCellEditorComponent } from '../../asientos-contables/asientos-contables-form/movimiento-bancario-cell-editor.component';
// Datos tributarios
import { SustentoTributarioService } from 'src/app/services/sustento-tributario.service';
import { SustentoTributarioResponse } from 'src/app/interfaces/responses/sustento-tributario-response';

import { TipoComprobanteSriService } from 'src/app/services/tipocomprobantesri.service';
import { TipoComprobanteSriResponse } from 'src/app/interfaces/responses/tipo-comprobantesri-response';

import { AsientoTributarioDialogComponent, AsientoTributarioData } from '../../asientos-contables/datos-tributarios/asiento-tributario-dialog.component';

import { TipoRetencionService } from 'src/app/services/tiporetencion.service';
import { TipoRetencionResponse } from 'src/app/interfaces/responses/tipo-retencion-response';
import { TipoRetencionCellEditorComponent } from './tipo-retencion-cell-editor.component';

import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, switchMap } from 'rxjs/operators';
import { AsientosContablesService } from 'src/app/services/asientos-contables.service';
//para imprimir el pdf
import { generarPdfAsiento } from '../../util/asiento-pdf.util';
import { AsientoImpresion } from 'src/app/interfaces/responses/asiento-impresion.model';

// Servicio IVA
import { PorcentajeIvaCgService } from 'src/app/services/porcentaje-iva-cg.service';
import { PorcentajeIvaResponse } from 'src/app/interfaces/responses/porcentaje-iva-cg-response';
// Cell editor IVA
import { PorcentajeIvaCellEditorComponent } from './porcentaje-iva-cell-editor.component';
///
// Mensajería
import {
  CustomMessageBoxComponent,
  MessageBoxData,
} from 'src/app/util/messages/custom-message-box.component';

import { AgGridAngular } from 'ag-grid-angular';

import {
  AllCommunityModule,
  ModuleRegistry,
  ColDef,
  GridApi,
  GridReadyEvent,
  CellValueChangedEvent,
  CellClickedEvent,
  CellKeyDownEvent,
  FullWidthCellKeyDownEvent,
} from 'ag-grid-community';

import {
  AsientoContableResponse,
  DetalleAsientoResponse,
  createEmptyAsientoContableResponse,
} from 'src/app/interfaces/responses/asiento-contable-response';

import { ViewEncapsulation } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// 🔹 Servicio específico para facturas de proveedor
import {
  FacturasProveedorService,
  ApiResponse,
} from 'src/app/services/facturas-proveedor.service';

ModuleRegistry.registerModules([AllCommunityModule]);

interface TipoRetencionCombo {
  id: number;
  label: string; // ej: "001 - RENTA (10%)"
  codigo: string; // CodigoTipoRet (para filtrar por 7%)
  porcentaje: number; // Porcentaje
}

///plazo proveedor
type ProveedorItem = { id: number; label: string; razon: string; plazo: number | null };

///para eñ porcentaje iva
interface PorcentajeIvaCombo {
  id: number; // idPorIva
  label: string; // "2 - IVA 12% (12%)"
  codigoIva: number;
  porcentaje: number;
  descripcion: string;
}
///
@Component({
  selector: 'app-facturas-proveedor-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AgGridAngular,
    MatSnackBarModule,
    LocalCellEditorComponent,
    PlanCuentaCellEditorComponent,
    CodContableCellEditorComponent,
    MovimientoBancarioCellEditorComponent,
    TipoRetencionCellEditorComponent,
    MatAutocompleteModule, //para autofiltrar
    MatFormFieldModule, //para autofiltrar
    MatInputModule, //para autofiltrar
    PorcentajeIvaCellEditorComponent, // porcentaje iva
  ],
  templateUrl: './facturas-proveedor-form.component.html',
  styleUrls: ['./facturas-proveedor-form.component.css'],
  encapsulation: ViewEncapsulation.None, //  👈 clave
})
export class FacturasProveedorFormComponent implements OnInit {
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

  modo = signal<'nuevo' | 'editar'>('nuevo');
  loading = signal(false);
  saving = signal(false);

  titulo = computed(() =>
    this.modo() === 'nuevo'
      ? 'Crear(Factura Proveedor) — NUEVO'
      : 'Editar (Factura Proveedor) — EDITAR'
  );

  // USUARIO
  usuarioActual = this.usuarioService.getUsuarioActual();
  nombreusuario = this.usuarioActual?.nombre_usuario ?? '';
  numdocGenerado: string | null = null; // numero documento generado

  gridOptions = {
    rowHeight: 30,
    headerHeight: 32,
    stopEditingWhenCellsLoseFocus: true, // para que desaparesca el control al perder el foco
  };

  private syncUsuarioEmpresa(): void {
    const idUsuario = this.usuarioActual?.id_usuario ?? 0;
    const idEmpresa = this.usuarioActual?.id_empresa ?? 0;
    this.form.patchValue({ idUsuario, idEmpresa }, { emitEvent: false });
    this.form.patchValue(
      { anio: getYearFromInput(this.form.get('fechatransaccion')!.value) },
      { emitEvent: false }
    );
  }

  // PARA VALIDAR CARACTERES ESPECIALES
  private readonly allowedTextPattern = /[^0-9a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.,;-]/g;

  validarTexto(controlName: 'observacion' | 'beneficiario', event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!input) return;

    const original = input.value;
    // eliminamos todo lo que NO está en el patrón permitido
    const limpio = original.replace(this.allowedTextPattern, '');

    if (original !== limpio) {
      input.value = limpio; // actualiza el input
    }

    // actualiza el formControl sin disparar eventos extra
    this.form.get(controlName)?.setValue(limpio, { emitEvent: false });
  }

  tiposAsiento$!: Observable<TipoAsientoResponse[]>;
  private tipoAsientos: Array<{ id: number; nombre: string; tipDoc: string }> = [];
  zonas$!: Observable<ZonaResponse[]>; // zonas

  locales: { id: number; nombre: string }[] = [];
  cuentas: {
    id: number;
    label: string;
    codigo: string;
    idCodigoEspecial?: number | null;
    porcentajeRetencion?: number | null; // para calculo automatico de la retencion hr
  }[] = [];
  ///para cargar en beneficiaroio lo del combo
  ////para el grid
  auxiliaresGrid: { id: number; label: string; razon: string }[] = [];
  ///para el list en la cabecera
  auxiliarSeleccionadoCtrl = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(1),
  ]);

  //// ✅ No. comprobante (solo números) + validación duplicado por backend (en NUEVO antes de agregar línea)
  nroComprobanteCtrl = new FormControl<string>('', [
    Validators.required,
    Validators.maxLength(25),
    Validators.pattern(/^\d+$/),
  ]);

  // lista de movimientos bancarios añadir condicion
  movimientosBancarios: {
    id: number;
    movimiento: string;
    descripcion: string;
    label: string;
    condicion?: number | null; //solo aquí, no en la fila la condicion para el filtro
  }[] = [];

  cabeceraBloqueada = false;
  //sustento tributario lista que viene del servicio
  listaSustentosTrib: { id: number; label: string }[] = [];
  // Control en cabecera (igual que Auxiliar Contable)
  sustentoTribCtrl = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(1),
  ]);

  //tipo comprobante sri
  listaTiposCompSriCab: { id: number; label: string }[] = [];
  tipoCompSriCtrl = new FormControl<number | null>(0, [
    Validators.required,
    Validators.min(1),
  ]);

  ////
  autorizacionCtrl = new FormControl<string>('', [
    Validators.required,
    Validators.maxLength(49),
  ]);
  fechacaducaCtrl = new FormControl<string | null>(null, [Validators.required]);
  fechavencimientoCtrl = new FormControl<string | null>(null, [Validators.required]);
  ////tipo retencion
  tiposRetencion: TipoRetencionCombo[] = [];
  tiposRetencionAll: TipoRetencionCombo[] = [];

  // Lista de porcentajes IVA para el combo del grid
  porcentajesIva: PorcentajeIvaCombo[] = [];

  auxiliares: ProveedorItem[] = [];
  filteredAuxiliares$ = of<ProveedorItem[]>([]);
  proveedorCtrl = new FormControl<ProveedorItem | string | null>(null, []);
  plazoCtrl = new FormControl<number>({ value: 0, disabled: false });

  ///PARA CALCULO DE FFECHAS PLAZO
  private _calculandoVencimiento = false;

  
  private parseDateOnlyToLocal(dateStr: string): Date | null {
    // Espera yyyy-MM-dd (lo que entrega el input type="date")
    if (!dateStr) return null;

    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!m) return null;

    const y = Number(m[1]);
    const mo = Number(m[2]) - 1; // 0-based
    const d = Number(m[3]);

    const dt = new Date(y, mo, d, 0, 0, 0, 0); // local midnight
    return isNaN(dt.getTime()) ? null : dt;
  }

  private formatDateOnlyLocal(dt: Date): string {
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private recalcularFechaVencimiento(): void {
    if (this._calculandoVencimiento) return;

    const fCad = (this.fechacaducaCtrl.value || '').toString().trim();
    const plazoRaw = this.plazoCtrl.value;

    // Si no hay fecha caduca, limpiamos vencimiento
    if (!fCad) {
      this._calculandoVencimiento = true;
      this.fechavencimientoCtrl.setValue(null, { emitEvent: false });
      this._calculandoVencimiento = false;
      return;
    }

    const base = this.parseDateOnlyToLocal(fCad);
    if (!base) return;

    let dias = Number(plazoRaw ?? 0);
    if (isNaN(dias) || dias < 0) dias = 0;

    const venc = new Date(base);
    venc.setDate(venc.getDate() + dias);

    const vencStr = this.formatDateOnlyLocal(venc);

    this._calculandoVencimiento = true;
    this.fechavencimientoCtrl.setValue(vencStr, { emitEvent: false });
    this._calculandoVencimiento = false;
  }

  ///end cambios nuevos
  ///cambio hr
  displayProveedor = (item: ProveedorItem | string | null): string =>
    typeof item === 'string' ? item : item ? item.label : '';

  private extraerPlazoProveedor(a: any): number | null {
    // Intenta varios nombres comunes (backend suele variar)
    const candidatos = [a?.Plazo, a?.plazo];

    for (const x of candidatos) {
      if (x !== null && x !== undefined && x !== '') {
        const n = Number(x);
        if (!isNaN(n) && n >= 0) return n;
      }
    }
    return null;
  }

  ///// controles para doc relacionados (CABECERA)
  docRelacionadoCtrl = new FormControl<string>('', [Validators.maxLength(25)]);
  autorizacionRelacionadoCtrl = new FormControl<string>('', [Validators.maxLength(49)]);
  fechaCadRelacionadoCtrl = new FormControl<string | null>(null);

  //// end cambio

  form!: FormGroup;

  private gridApi!: GridApi<DetalleAsientoResponse>;
  rowData = signal<DetalleAsientoResponse[]>([]);

  private movimientosBancariosLoaded = false; ////cambio para refredcar los listas
  private refrescarColumnasDetalle(): void {
    if (!this.gridApi) return;

    this.gridApi.refreshCells({
      force: true,
      columns: [
        'idMovBancario',
        'movbancario',
        'idLocal',
        'idPlanCuentas',
        'idCodContable',
        'idTipoRetencion',
        'idPorIva', // nuevo porcentaje iva
        'porcentaje', // nuevo
        // CAMPOS RELACIONADOS
        'docurelacionado',
        'autorizacionRelacionado',
        'fechaCadRelacionado',
      ],
    });
  }
  ///////end

  // =========================
  // ✅ VALIDACIÓN DUPLICADO (NUEVO / antes de agregar línea)
  // =========================
  private validandoNoComp = false;
  private noCompKeyValidadoOk: string | null = null;

  private quitarError(ctrl: FormControl<any>, key: string): void {
    const e = { ...(ctrl.errors || {}) };
    if (e[key]) delete e[key];
    ctrl.setErrors(Object.keys(e).length ? e : null);
  }

  private setError(ctrl: FormControl<any>, key: string, value: any = true): void {
    ctrl.setErrors({ ...(ctrl.errors || {}), [key]: value });
  }

  private limpiarCacheNoComprobante(): void {
    this.noCompKeyValidadoOk = null;
    this.quitarError(this.nroComprobanteCtrl, 'duplicado');
  }

  private validarNoComprobanteAntesDeAgregarLinea$(): Observable<boolean> {
    // Solo aplica en NUEVO
    if (this.modo() !== 'nuevo') {
      this.quitarError(this.nroComprobanteCtrl, 'duplicado');
      return of(true);
    }

    const idEmpresa = Number(this.usuarioActual?.id_empresa || 0);
    const idAux = Number(this.auxiliarSeleccionadoCtrl.value || 0);
    const nro = (this.nroComprobanteCtrl.value || '').toString().trim();

    // si falta algo, no validamos online (ya lo valida la cabecera por required)
    if (idEmpresa <= 0 || idAux <= 0 || !nro) {
      this.quitarError(this.nroComprobanteCtrl, 'duplicado');
      return of(true);
    }

    const key = `${idEmpresa}|${idAux}|${nro}`;

    // Cache para no llamar repetido al backend en el mismo comprobante/proveedor
    if (this.noCompKeyValidadoOk === key) {
      this.quitarError(this.nroComprobanteCtrl, 'duplicado');
      return of(true);
    }

    if (this.validandoNoComp) return of(true);
    this.validandoNoComp = true;

    return this.facturasService.validarComprobanteDetalle(idEmpresa, idAux, nro).pipe(
      map((resp: any) => {
        const existe = !!resp?.data?.existe; // ✅ tu backend retorna { existe: true }

        if (existe) {
          this.noCompKeyValidadoOk = null;
          this.setError(this.nroComprobanteCtrl, 'duplicado', true);
          return false;
        }

        // OK
        this.quitarError(this.nroComprobanteCtrl, 'duplicado');
        this.noCompKeyValidadoOk = key;
        return true;
      }),
      catchError((err) => {
        // si falla la validación online, no bloqueamos (para no romper flujo)
        console.error('Error validarComprobanteDetalle', err);
        this.quitarError(this.nroComprobanteCtrl, 'duplicado');
        return of(true);
      }),
      finalize(() => (this.validandoNoComp = false))
    );
  }

  onCellKeyDown(
    evt:
      | CellKeyDownEvent<DetalleAsientoResponse>
      | FullWidthCellKeyDownEvent<DetalleAsientoResponse>
  ): void {
    const keyboardEvent = evt.event as KeyboardEvent;

    if (keyboardEvent.key === 'Enter') {
      keyboardEvent.preventDefault();

      // ENTER → siguiente celda (misma fila)
      if (!keyboardEvent.shiftKey) {
        this.gridApi.tabToNextCell();
      } else {
        // SHIFT + ENTER → celda anterior (opcional)
        this.gridApi.tabToPreviousCell();
      }
    }
  }

  columnDefs: ColDef<DetalleAsientoResponse>[] = [
    {
      headerName: 'Acción',
      colId: 'accion',
      width: 80,
      pinned: 'right',
      suppressHeaderMenuButton: true,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => {
        // Usamos idMovBancario para decidir si hay movimiento válido
        const idMov = Number(params.data?.idMovBancario || 0);
        const tieneMovimiento = idMov > 0;

        const disabledClass = !tieneMovimiento ? 'btn-disabled' : '';
        const disabledAttr = !tieneMovimiento ? 'data-disabled="true"' : 'data-disabled="false"';

        return `
          <div class="acciones-cell">
            <button class="btn-icon danger"
                    data-action="delete"
                    title="Eliminar línea">
              <img src="assets/icons/borrarfila.png" width="18" height="18" alt="Eliminar" />
            </button>

            <button class="btn-icon primary ${disabledClass}"
                    data-action="edit-tributario"
                    ${disabledAttr}
                    title="Datos Tributarios">
              <img src="assets/icons/eye-open.png" width="15" height="15" alt="Editar" />
            </button>
          </div>
        `;
      },
    },
    { headerName: 'No', field: 'numlinea', width: 50, editable: false },
    {
      headerName: 'Local',
      field: 'idLocal',
      width: 150,
      editable: true,
      singleClickEdit: true,
      cellEditor: LocalCellEditorComponent,
      cellEditorParams: () => ({
        locales: this.locales,
      }),
      valueFormatter: (params) => {
        const v = params.value;
        if (v === null || v === undefined || v === '' || Number(v) === 0) {
          return 'Seleccione...';
        }
        const id = Number(v);
        const local = this.locales.find((l) => l.id === id);
        return local ? `${local.id} - ${local.nombre}` : String(v);
      },
    },

    ///// TIPO MOVIMIENTO
    {
      headerName: 'Tipo Movimiento',
      field: 'idMovBancario',
      width: 220,
      editable: true,
      singleClickEdit: true,
      cellEditor: MovimientoBancarioCellEditorComponent,
      cellEditorParams: () => ({
        movimientos: this.movimientosBancarios,
      }),
      valueFormatter: (params) => {
        const v = params.value;
        if (v == null || v === '' || Number(v) === 0) {
          return 'Seleccione...';
        }
        const id = Number(v);
        const mov = this.movimientosBancarios.find((m) => m.id === id);
        return mov ? mov.label : String(v);
      },
    },

    /// campos nuevos porcentaje iva
    {
      headerName: 'Porcentaje IVA',
      field: 'idPorIva',
      width: 160,
      editable: true,
      singleClickEdit: true,
      cellEditor: PorcentajeIvaCellEditorComponent,
      cellEditorParams: () => ({
        porcentajesIva: this.porcentajesIva,
      }),
      valueFormatter: (params) => {
        const v = params.value;
        if (v == null || v === '' || Number(v) === 0) {
          return 'Seleccione...';
        }
        const id = Number(v);
        const item = this.porcentajesIva.find((p) => p.id === id);
        return item ? item.label : String(v);
      },
    },
    {
      headerName: '% IVA',
      field: 'porcentaje',
      width: 100,
      editable: false,
      hide: true,
      type: 'rightAligned',
      valueFormatter: (params) => {
        const val = Number(params.value ?? 0);

        if (val === null || val === undefined) {
          return '';
        }
        return `${val.toFixed(2)} %`;
      },
    },
    //// porcentaje iva

    {
      headerName: 'Tipo Retención',
      field: 'idTipoRetencion',
      width: 220,
      editable: true,
      singleClickEdit: true,
      cellEditor: TipoRetencionCellEditorComponent,

      cellEditorParams: (params: any) => {
        const row = params.data as DetalleAsientoResponse;
        const movCode = (row.movbancario || '').toString().trim().toUpperCase();

        let lista: TipoRetencionCombo[] = [];

        // 1) Solo IB / RIB -> retenciones cuyo CodigoTipoRet empieza con '7'
        if (movCode === 'IB' || movCode === 'RIB') {
          lista = this.tiposRetencionAll.filter((t) => t.codigo?.startsWith('7'));
        }
        // 2) Movimientos donde NO aplica retención: 0, CH, DP, NC, ND, TB
        else if (['0', 'CH', 'DP', 'NC', 'ND', 'TB'].includes(movCode)) {
          lista = []; // no mostrar opciones
        }
        // 3) Cualquier otro tipo de movimiento -> todas las retenciones
        else {
          lista = this.tiposRetencionAll;
        }

        // guardamos la lista usada en este editor (opcional)
        this.tiposRetencion = lista;

        return { tiposRetencion: lista };
      },
      valueFormatter: (params) => {
        const v = params.value;
        if (v == null || v === '' || Number(v) === 0) {
          return 'Seleccione...';
        }
        const id = Number(v);
        // buscar SIEMPRE en la lista completa
        const tipo = this.tiposRetencionAll.find((t) => t.id === id);
        return tipo ? tipo.label : String(v);
      },
    },

    {
      headerName: 'Cuenta Contable',
      field: 'idPlanCuentas',
      width: 280,
      editable: true,
      singleClickEdit: true,
      cellEditor: PlanCuentaCellEditorComponent,
      cellEditorParams: (params: any) => {
        const row = params.data as DetalleAsientoResponse;
        const idMov = Number(row.idMovBancario || 0);

        // Por defecto NO filtramos (mostramos todas las cuentas)
        let condicion: number | null = null;

        if (idMov > 0) {
          const mov = this.movimientosBancarios.find((m) => m.id === idMov);

          if (mov && mov.condicion != null && !isNaN(Number(mov.condicion)) && Number(mov.condicion) > 0) {
            condicion = Number(mov.condicion);
          }
        }

        let cuentasFiltradas = this.cuentas;

        // Si hay condición > 0, filtramos por IdCodigoEspecial
        if (condicion !== null) {
          cuentasFiltradas = this.cuentas.filter(
            (c) => c.idCodigoEspecial != null && Number(c.idCodigoEspecial) === condicion
          );
        }

        return { cuentas: cuentasFiltradas };
      },

      valueFormatter: (params) => {
        const v = params.value;
        if (v === null || v === undefined || v === '' || Number(v) === 0) {
          return 'Seleccione...';
        }
        const id = Number(v);
        const cta = this.cuentas.find((c) => c.id === id);
        return cta ? cta.label : String(v);
      },
    },

    {
      headerName: 'No.Comprobante',
      field: 'nocomprobante',
      width: 160,
      editable: true,
      hide: true,
    },
    {
      headerName: 'Cheque',
      field: 'cheque',
      width: 100,
      editable: true,
      valueParser: numberParser,
      hide: true,
    },

    {
      headerName: 'Debe',
      field: 'debe',
      width: 100,
      editable: debeEditable,
      type: 'rightAligned',
      valueSetter: valueSetterDot2,
      valueFormatter: twoDecimalsDotFormatter,
      suppressKeyboardEvent: blockComma,
      cellClassRules: {
        'ag-disabled': (p: any) => toNumber(p.data?.haber) > 0,
      },
    },
    {
      headerName: 'Haber',
      field: 'haber',
      width: 100,
      editable: haberEditable,
      type: 'rightAligned',
      valueSetter: valueSetterDot2,
      valueFormatter: twoDecimalsDotFormatter,
      suppressKeyboardEvent: blockComma,
      cellClassRules: {
        'ag-disabled': (p: any) => toNumber(p.data?.debe) > 0,
      },
    },

    {
      headerName: 'Comentario / Nota',
      field: 'comentario',
      width: 300,
      editable: true,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true,
      cellEditorParams: {
        maxLength: 150,
        rows: 4,
        cols: 40,
      },
      suppressKeyboardEvent: onlyAllowedComentarioKey,
      valueSetter: (params) => {
        const limpio = sanitizeTextoGenerico(params.newValue);
        params.data.comentario = limpio;
        return true;
      },
    },

    ///// CODIGOS CONTABLES
    {
      headerName: 'Auxiliar Contable',
      field: 'idCodContable',
      width: 260,
      editable: true,
      hide: false,
      singleClickEdit: true,
      cellEditor: CodContableCellEditorComponent,
      cellEditorParams: () => ({
        // 🔹 El editor del grid usa SIEMPRE la lista completa
        auxiliares: this.auxiliaresGrid,
      }),
      valueFormatter: (params) => {
        const v = params.value;
        if (v == null || v === '' || Number(v) === 0) {
          return 'Seleccione...';
        }
        const id = Number(v);
        const aux =
          this.auxiliaresGrid.find((a) => a.id === id) ||
          this.auxiliares.find((a) => a.id === id); // fallback por si acaso
        return aux ? aux.label : String(v);
      },
    },

    {
      headerName: 'Codigo Mov.',
      field: 'movbancario',
      width: 160,
      editable: false,
      hide: true,
    },
    {
      headerName: 'Sustento Trib.',
      field: 'idSustentoTrib',
      width: 150,
      editable: true,
      valueParser: numberParser,
      hide: true,
    },
    {
      headerName: 'Tipo Comp. SRI',
      field: 'idTipoCompSri',
      width: 170,
      editable: true,
      valueParser: numberParser,
      hide: true,
    },
    {
      headerName: 'Autorización',
      field: 'autorizacion',
      width: 160,
      editable: true,
      hide: true,
    },
    {
      headerName: 'Fecha Caduca',
      field: 'fechacaduca',
      width: 150,
      editable: true,
      valueParser: isoParser,
      hide: true,
    },

    {
      headerName: 'Centro Costos',
      field: 'idCentroCostos',
      width: 150,
      editable: true,
      valueParser: numberParser,
      hide: true,
    },
    {
      headerName: 'Proyecto',
      field: 'idProyecto',
      width: 130,
      editable: true,
      valueParser: numberParser,
      hide: true,
    },
    {
      headerName: 'Subproyecto',
      field: 'idSubproyecto',
      width: 160,
      editable: true,
      valueParser: numberParser,
      hide: true,
    },

    {
      headerName: 'Transferido',
      field: 'transferido',
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['true', 'false'] },
      valueParser: boolParser,
      hide: true,
    },
    {
      headerName: 'Fecha Transferido',
      field: 'fechatransferido',
      width: 170,
      editable: true,
      valueParser: isoParser,
      hide: true,
    },
    {
      headerName: 'Fecha Vencimiento',
      field: 'fechavencimiento',
      width: 170,
      editable: true,
      valueParser: isoParser,
      hide: true,
    },
    {
      headerName: 'Cod Conciliación',
      field: 'idConciliacion',
      width: 150,
      editable: true,
      valueParser: numberParser,
      hide: true,
    },
    {
      headerName: 'Valor en Letras',
      field: 'valorLetras',
      width: 220,
      editable: true,
      hide: true,
    },
    { headerName: 'Año', field: 'anio', width: 90, editable: true, hide: true },
    {
      headerName: 'Fecha Transacción',
      field: 'fechatransaccion',
      width: 170,
      editable: true,
      valueParser: isoParser,
      hide: true,
    },
    { headerName: 'Hora', field: 'hora', width: 100, editable: true, hide: true },
    {
      headerName: 'Zona',
      field: 'idZona',
      width: 110,
      editable: true,
      valueParser: numberParser,
      hide: true,
    },

    {
      headerName: 'Doc. Relacionado',
      field: 'docurelacionado',
      width: 160,
      editable: true,
      hide: true,
    },

    {
      headerName: 'Beneficiario',
      field: 'beneficiario',
      width: 180,
      editable: true,
      hide: true,
    },
    {
      headerName: 'Fecha Ingreso',
      field: 'fechaingreso',
      width: 160,
      editable: true,
      valueParser: isoParser,
      hide: true,
    },
    {
      headerName: 'Fecha Cierre',
      field: 'fechacierre',
      width: 160,
      editable: true,
      valueParser: isoParser,
      hide: true,
    },

    {
      headerName: 'Fecha Conciliado',
      field: 'fechaconciliado',
      width: 170,
      editable: true,
      valueParser: isoParser,
      hide: true,
    },
    { headerName: 'Cierre', field: 'cierre', width: 120, editable: true, hide: true },
    { headerName: 'CodprePc', field: 'codprePc', width: 180, editable: true, hide: true },
    {
      headerName: 'Estado Ingreso',
      field: 'estadoIngreso',
      width: 140,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['true', 'false'] },
      valueParser: boolParser,
      hide: true,
    },
    // ====== NUEVOS CAMPOS ======
    {
      headerName: 'Autorizacion Relacionado',
      field: 'autorizacionRelacionado',
      width: 200,
      editable: true,
      hide: true,
    },
    {
      headerName: 'Fecha Caduca Relacionado',
      field: 'fechaCadRelacionado',
      width: 190,
      editable: true,
      valueParser: isoParser,
      hide: true,
    },
  ];

  defaultColDef: ColDef = { resizable: true, editable: true };

  // Totales
  totDebe = computed(() => (this.rowData() ?? []).reduce((a, d) => a + (Number(d.debe) || 0), 0));
  totHaber = computed(() => (this.rowData() ?? []).reduce((a, d) => a + (Number(d.haber) || 0), 0));
  diferencia = computed(() => this.totDebe() - this.totHaber());

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private usuarioService: UsuarioService,
    @Optional() public dialogRef: MatDialogRef<FacturasProveedorFormComponent> | null,
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data: { modo?: 'nuevo' | 'editar'; id?: number } | null,
    private tipoasientoservice: TipoAsientoService,
    private facturasService: FacturasProveedorService,
    private zonaService: ZonaService,
    private localesService: LocalesService,
    private planCuentasService: PlanCuentasService,
    private codigosContablesService: CodigosContablesService,
    private movimientoBancarioService: MovimientoBancarioService,
    private sustentoTribService: SustentoTributarioService,
    private tipoCompSriService: TipoComprobanteSriService,
    private tipoRetencionService: TipoRetencionService,
    private asientosService: AsientosContablesService,
    private porcentajeIvaService: PorcentajeIvaCgService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {
    effect(() => {
      const tDebe = this.totDebe();
      const tHaber = this.totHaber();
      if (this.form) {
        this.form.patchValue({ totdebe: tDebe, tothaber: tHaber }, { emitEvent: false });
      }
    });
  }

  //// zonas
  private cargarZonasPorEmpresa(): void {
    const empresaId = this.usuarioActual?.id_empresa ?? 0;

    this.zonas$ = this.zonaService.getAll().pipe(
      map((list) => (list || []).filter((z) => z.empresaCodigo === empresaId)),
      shareReplay(1)
    );
  }
  /// end zonas

  //porcentaje iva///
  private cargarPorcentajesIva(): void {
    const empresaId = this.usuarioActual?.id_empresa ?? 0;

    this.porcentajeIvaService.getAll({ idEmpresa: empresaId }).subscribe({
      next: (list: PorcentajeIvaResponse[]) => {
        this.porcentajesIva = (list || []).map((p) => ({
          id: p.idPorIva,
          codigoIva: p.codigoIva,
          descripcion: p.descripcion,
          porcentaje: p.porcentaje,
          label: `${p.descripcion} (${p.porcentaje}%)`,
        }));

        // refrescamos la columna si ya existe gridApi
        this.gridApi?.refreshCells({
          force: true,
          columns: ['idPorIva', 'porcentaje'],
        });
      },
      error: (err) => {
        console.error('Error cargando porcentajes de IVA', err);
      },
    });
  }
  ////

  ngOnInit(): void {
    this.buildForm();
    const empresaId = this.usuarioActual?.id_empresa ?? 0;

    // Autocomplete de proveedor: buscar en backend al escribir
    this.filteredAuxiliares$ = this.proveedorCtrl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap((value) => {
        const term = typeof value === 'string' ? value : value?.label ?? '';
        const search = (term || '').trim();

        if (!search || search.length < 3) {
          this.auxiliares = [];
          return of([]);
        }

        return this.codigosContablesService.buscar(search, { idEmpresa: empresaId, maxResults: 20 }).pipe(
          map((resp) => {
            const data = (resp.data ?? []) as CodigosContablesResponse[];

            const list: ProveedorItem[] = data.map((a) => ({
              id: a.IdCodContable,
              label: `${a.Identificacionauxiliar} - ${a.Razonsocial}`,
              razon: a.Razonsocial,
              plazo: this.extraerPlazoProveedor(a),
            }));

            this.auxiliares = list;
            return list;
          }),
          catchError((err) => {
            console.error('Error buscando proveedores', err);
            this.auxiliares = [];
            return of([]);
          })
        );
      })
    );

    // Cuando cambia la selección del proveedor, sincronizar id + beneficiario
    this.proveedorCtrl.valueChanges.subscribe((value) => {
      if (typeof value === 'string') {
        const term = value.trim();

        const idActualAux = Number(this.auxiliarSeleccionadoCtrl.value || 0);
        if (term === '' && idActualAux > 0) {
          this.auxiliarSeleccionadoCtrl.setValue(0, { emitEvent: true });
          this.auxiliarSeleccionadoCtrl.markAsTouched();

          this.form.patchValue({ beneficiario: '' }, { emitEvent: false });

          // ✅ limpiar plazo
          this.plazoCtrl.setValue(0, { emitEvent: false });
          this.recalcularFechaVencimiento();

          // ✅ limpiar cache/duplicado porque cambió proveedor/selección
          this.limpiarCacheNoComprobante();

          this.snack.open('Proveedor borrado, por favor vuelva a seleccionarlo.', 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        }

        return;
      }

      const selected = value as ProveedorItem | null;
      const id = selected?.id ?? 0;

      this.auxiliarSeleccionadoCtrl.setValue(id, { emitEvent: true });

      // ✅ limpiar cache/duplicado porque cambió proveedor
      this.limpiarCacheNoComprobante();

      if (id > 0) {
        this.form.patchValue({ beneficiario: selected?.razon ?? '' }, { emitEvent: false });

        // ✅ cargar plazo visible
        const plazo = selected?.plazo ?? null;
        this.plazoCtrl.setValue(plazo != null ? Number(plazo) : 0, { emitEvent: false });
        //CAMBIO HR
        this.recalcularFechaVencimiento();
        //END HR

      } else {
        this.form.patchValue({ beneficiario: '' }, { emitEvent: false });
        this.plazoCtrl.setValue(0, { emitEvent: false });
        ///VERIFICAR HR 
        this.recalcularFechaVencimiento();
      }
    });

    //Cuando cambia el auxiliar contable, actualizar Beneficiario
    this.auxiliarSeleccionadoCtrl.valueChanges.subscribe((id) => {
      const numId = Number(id || 0);
      const aux = this.auxiliares.find((a) => a.id === numId);

      // ✅ limpiar cache/duplicado si cambia auxiliar
      this.limpiarCacheNoComprobante();

      if (aux) {
        this.form.patchValue({ beneficiario: aux.razon }, { emitEvent: false });
      } else {
        this.form.patchValue({ beneficiario: '' }, { emitEvent: false });
      }
    });

    const idDialog = this.data?.id ?? 0;
    const idRoute = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    const id = idDialog || idRoute;

    if (id > 0) {
      this.modo.set('editar');
    } else {
      this.modo.set('nuevo');
    }

    this.tiposAsiento$ = this.tipoasientoservice.ListadoAsiento().pipe(
      tap((list) => {
        this.tipoAsientos = (list ?? []).map((r: any) => ({
          id: r.IdTipoAsiento ?? r[' IdTipoAsiento'],
          nombre: (r.Descripcion ?? r.TipAsiento ?? '').toString().trim(),
          tipDoc: (r.TipAsiento ?? r.CodigoDoc ?? '').toString().trim().toUpperCase(),
        }));
        this.syncTipDocFromCurrentId();
        this.setDefaultTipoAsientoNuevo();
      }),
      shareReplay(1)
    );

    this.bindTipoAsientoToTipDoc();

    // Siempre mantener tipdoc en mayúsculas
    this.form.get('tipdoc')?.valueChanges.subscribe((v) => {
      if (typeof v === 'string') {
        const up = v.toUpperCase();
        if (v !== up) this.form.get('tipdoc')?.setValue(up, { emitEvent: false });
      }
    });

    this.cargarZonasPorEmpresa();
    this.cargarLocales();
    this.cargarPlanCuentas();
    this.cargarCodigosContables(); //se añadio para el comboo del grid
    this.cargarMovimientosBancarios();
    this.cargarSustentosTributarios();
    this.cargarTiposCompSriCabecera();
    this.cargarTiposRetencion();
    this.cargarPorcentajesIva(); //nuevo porcentaje iva

    if (id > 0) {
      this.modo.set('editar');
      this.cargarAsiento(id);
    } else {
      this.modo.set('nuevo');
      const empty = createEmptyAsientoContableResponse();
      this.syncUsuarioEmpresa();
      this.setFormFromHeader(empty);
      this.rowData.set([]);
      this.form.patchValue({ modulo: 1 }, { emitEvent: false });
      this.form.patchValue({ anio: getYearFromInput(this.form.get('fechatransaccion')!.value) }, { emitEvent: false });

      this.form
        .get('fechatransaccion')!
        .valueChanges.pipe(
          startWith(this.form.get('fechatransaccion')!.value),
          map(getYearFromInput),
          distinctUntilChanged()
        )
        .subscribe((y) => {
          this.form.patchValue({ anio: y }, { emitEvent: false });
        });

      this.syncUsuarioEmpresa();
    }
    
    ////CAMBIOS HR PARA CALCULO DEL PLAZO
    this.fechacaducaCtrl.valueChanges.subscribe(() => {
        this.recalcularFechaVencimiento();
      });

    this.plazoCtrl.valueChanges.subscribe(() => {
        this.recalcularFechaVencimiento();
      });
    ///END

  }

  private buildForm(): void {
    const ahora = new Date();
    const nowIso = formatLocalIso(new Date());
    const todayDate = formatLocalDateOnly(ahora); // solo fecha (yyyy-MM-dd)

    this.form = this.fb.group({
      IdCabMaestro: [0],
      idZona: [0, [Validators.required, Validators.min(1)]],
      idUsuario: [this.usuarioActual?.id_usuario ?? null],
      idEmpresa: [this.usuarioActual?.id_empresa ?? null],
      idTipoAsiento: [null, [Validators.required, Validators.min(1)]],
      tipdoc: ['', [Validators.required]],
      numdoc: [0],
      anio: [''],
      fechatransaccion: [todayDate, [Validators.required]],
      fechaingreso: [nowIso, [Validators.required]],
      observacion: ['', [Validators.required, Validators.maxLength(250)]],
      totdebe: [0],
      tothaber: [0],
      beneficiario: ['', [Validators.required, Validators.maxLength(150)]],
      cierre: [''],
      fechacierre: [null as string | null],
      solicitado: [''],
      depto: [''],
      autorizado: [''],
      homCodigo: [0],
      estado: [true],
      modulo: [1],
    });
  }

  // tipo asiento
  private bindTipoAsientoToTipDoc(): void {
    this.form.get('idTipoAsiento')?.valueChanges.subscribe((id: number | null) => {
      const ta = this.tipoAsientos.find((x) => x.id === Number(id));
      const tipDoc = (ta?.tipDoc ?? '').slice(0, 2);
      this.form.get('tipdoc')?.setValue(tipDoc, { emitEvent: false });
    });
  }

  private syncTipDocFromCurrentId(): void {
    const id = this.form.get('idTipoAsiento')?.value;
    const ta = this.tipoAsientos.find((x) => x.id === Number(id));
    const tipDoc = (ta?.tipDoc ?? '').slice(0, 2);
    this.form.get('tipdoc')?.setValue(tipDoc, { emitEvent: false });
  }

  /** Marca automáticamente el Tipo de Asiento por defecto al entrar (modo NUEVO) */
  private setDefaultTipoAsientoNuevo(): void {
    if (this.modo() !== 'nuevo') return;

    const ctrl = this.form.get('idTipoAsiento');
    if (!ctrl) return;

    const current = Number(ctrl.value || 0);
    if (current > 0) return;

    const DEFAULT_TIPO_ASIENTO = 'AD';

    const found = this.tipoAsientos.find((x) => (x.tipDoc || '').toUpperCase() === DEFAULT_TIPO_ASIENTO);

    if (found) {
      ctrl.patchValue(found.id, { emitEvent: true });
    }
  }

  private setFormFromHeader(h: AsientoContableResponse): void {
    const idTipoAsiento = h.idTipoAsiento && h.idTipoAsiento > 0 ? h.idTipoAsiento : null;

    this.form.reset({
      IdCabMaestro: h.IdCabMaestro,
      idZona: h.idZona,
      idUsuario: h.idUsuario,
      idEmpresa: h.idEmpresa,
      idTipoAsiento: idTipoAsiento,
      tipdoc: h.tipdoc,
      numdoc: h.numdoc,
      anio: h.anio,
      fechatransaccion: h.fechatransaccion ? normalizeToLocalDate(h.fechatransaccion) : null,
      fechaingreso: h.fechaingreso,
      observacion: h.observacion,
      totdebe: h.totdebe,
      tothaber: h.tothaber,
      beneficiario: h.beneficiario,
      cierre: h.cierre,
      fechacierre: h.fechacierre ?? null,
      solicitado: h.solicitado,
      depto: h.depto,
      autorizado: h.autorizado,
      homCodigo: h.homCodigo,
      estado: h.estado,
      modulo: h.modulo != null ? Number(h.modulo) : 1,
    });
  }

  private cargarAsiento(idCabMaestro: number): void {
    this.loading.set(true);
    this.facturasService.getById(idCabMaestro).subscribe({
      next: (resp) => {
        this.setFormFromHeader(resp);

        const detallesNorm = (resp.detalles ?? []).map((d) => this.normalizarDetalleRelacionadoDesdeBackend(d));
        this.rowData.set(detallesNorm);

        this.refrescarColumnasDetalle();

        const firstAux = resp.detalles && resp.detalles.length ? Number(resp.detalles[0].idCodContable || 0) : 0;

        if (firstAux > 0) {
          this.auxiliarSeleccionadoCtrl.setValue(firstAux, { emitEvent: false });
        }

        const bene = resp.beneficiario ?? '';
        this.proveedorCtrl.setValue(bene, { emitEvent: false });

        this.form.patchValue({ beneficiario: bene }, { emitEvent: false });

        // 🔹 Tomar el No.Comprobante de la primera línea y mostrarlo arriba
        const firstNoComp = resp.detalles && resp.detalles.length ? resp.detalles[0].nocomprobante ?? '' : '';
        this.nroComprobanteCtrl.setValue(firstNoComp, { emitEvent: false });

        ///sustento tributario
        const firstSustento = resp.detalles && resp.detalles.length ? Number(resp.detalles[0].idSustentoTrib || 0) : 0;

        if (firstSustento > 0) {
          this.sustentoTribCtrl.setValue(firstSustento, { emitEvent: false });
        }
        ///tipo comprobante
        const firstTipoComp = resp.detalles && resp.detalles.length ? Number(resp.detalles[0].idTipoCompSri || 0) : 0;
        if (firstTipoComp > 0) {
          this.tipoCompSriCtrl.setValue(firstTipoComp, { emitEvent: false });
        }

        // 🔹 Autorización / Fechas tomadas de la primera línea del detalle
        const firstAut = resp.detalles && resp.detalles.length ? resp.detalles[0].autorizacion ?? '' : '';
        this.autorizacionCtrl.setValue(firstAut, { emitEvent: false });

        const firstFechaCad = resp.detalles && resp.detalles.length ? resp.detalles[0].fechacaduca || '' : '';
        this.fechacaducaCtrl.setValue(firstFechaCad ? normalizeToLocalDate(firstFechaCad) : null, { emitEvent: false });

        const firstFechaVen = resp.detalles && resp.detalles.length ? resp.detalles[0].fechavencimiento || '' : '';
        this.fechavencimientoCtrl.setValue(firstFechaVen ? normalizeToLocalDate(firstFechaVen) : null, { emitEvent: false });

        // ====== CAMPOS RELACIONADOS (RECUPERAR EN CABECERA) ======
        const firstDocRel = resp.detalles && resp.detalles.length ? (resp.detalles[0].docurelacionado ?? '') : '';
        this.docRelacionadoCtrl.setValue(firstDocRel, { emitEvent: false });

        const firstAutRel = resp.detalles && resp.detalles.length ? (resp.detalles[0] as any).autorizacionRelacionado ?? '' : '';
        this.autorizacionRelacionadoCtrl.setValue(firstAutRel, { emitEvent: false });

        const firstFechaCadRel = resp.detalles && resp.detalles.length ? (resp.detalles[0] as any).fechaCadRelacionado ?? '' : '';
        this.fechaCadRelacionadoCtrl.setValue(firstFechaCadRel ? normalizeToLocalDate(firstFechaCadRel) : null, { emitEvent: false });

        this.refrescarColumnasDetalle();
        this.loading.set(false);
        this.bloquearCabecera();
      },
      error: (err) => {
        console.error('Error al cargar factura de proveedor', err);
        this.loading.set(false);
      },
    });
  }

  private cargarLocales(): void {
    this.localesService.getAll().subscribe({
      next: (res) => {
        const data = (res.data ?? []) as LocalesResponse[];

        this.locales = data.map((l) => ({
          id: (l as any).idLocal ?? (l as any).id ?? 0,
          nombre: (l as any).nombre,
        }));

        this.gridApi?.refreshCells({ force: true, columns: ['idLocal'] });
      },
      error: (err) => {
        console.error('Error cargando locales', err);
      },
    });
  }

  private cargarPlanCuentas(): void {
    const empresaId = this.usuarioActual?.id_empresa ?? 0;

    this.planCuentasService.getAll({ idEmpresa: empresaId, estado: 'A' }).subscribe({
      next: (list: PlanCuenta[]) => {
        const lista = list || [];
        const fuente = lista;

        this.cuentas = fuente.map((c) => {
          let porcentaje: number | null = null;

          const posibles = [(c as any).PorcentajeRetencion, (c as any).Porcentaje, (c as any).porcentaje];

          for (const p of posibles) {
            if (p !== null && p !== undefined && p !== '') {
              const n = Number(p);
              if (!isNaN(n) && n > 0) {
                porcentaje = n;
                break;
              }
            }
          }

          if (porcentaje === null) {
            const texto = `${c.CuentaPresentacion ?? ''} ${c.NombreCuenta ?? ''}`;
            const match = texto.match(/(\d+(\.\d+)?)\s*%/);
            if (match) {
              const n = parseFloat(match[1].replace(',', '.'));
              if (!isNaN(n) && n > 0) {
                porcentaje = n;
              }
            }
          }

          return {
            id: c.IdPlanCuentas,
            label: `${c.CuentaPresentacion} - ${c.NombreCuenta}`,
            codigo: c.CuentaPresentacion,
            idCodigoEspecial: c.IdCodigoEspecial != null && Number(c.IdCodigoEspecial) > 0 ? Number(c.IdCodigoEspecial) : null,
            porcentajeRetencion: porcentaje,
          };
        });

        this.gridApi?.refreshCells({ force: true, columns: ['idPlanCuentas'] });
      },
      error: (err) => {
        console.error('Error cargando plan de cuentas', err);
      },
    });
  }

  private cargarCodigosContables(): void {
    const empresaId = this.usuarioActual?.id_empresa ?? 0;

    this.codigosContablesService.getAll({ idEmpresa: empresaId }).subscribe({
      next: (res) => {
        const data = (res.data ?? []) as CodigosContablesResponse[];

        const lista = data.map((a) => ({
          id: a.IdCodContable,
          label: `${a.Identificacionauxiliar} - ${a.Razonsocial}`,
          razon: a.Razonsocial,
        }));
        this.auxiliaresGrid = lista;

        this.gridApi?.refreshCells({ force: true, columns: ['idCodContable'] });
      },
      error: (err) => {
        console.error('Error cargando códigos contables', err);
      },
    });
  }

  private cargarMovimientosBancarios(): void {
    this.movimientoBancarioService.getAll().subscribe({
      next: (res) => {
        const data = (res.data ?? []) as MovimientoBancarioResponse[];

        this.movimientosBancarios = (data || [])
          .filter((m) => m.IdMovBancario && m.IdMovBancario > 0)
          .map((m) => {
            const cond = m.Condicion != null && m.Condicion !== undefined ? Number(m.Condicion) : null;

            return {
              id: m.IdMovBancario,
              movimiento: m.Movimiento,
              descripcion: m.Descripcion,
              label: `${m.Movimiento} - ${m.Descripcion}`,
              condicion: !isNaN(cond as any) && (cond as number) > 0 ? cond : null,
            };
          });

        this.movimientosBancariosLoaded = true;
        this.refrescarColumnasDetalle();
      },
      error: (err) => {
        console.error('Error cargando movimientos bancarios', err);
      },
    });
  }

  private cargarSustentosTributarios(): void {
    this.sustentoTribService.getAll().subscribe({
      next: (resp) => {
        const data = (resp.data ?? []) as SustentoTributarioResponse[];
        this.listaSustentosTrib = data.map((s) => ({
          id: s.IdSustentoTrib,
          label: `${s.Codsustento} — ${s.Dessustento}`,
        }));
      },
      error: (err) => console.error('Error cargando Sustentos Tributarios', err),
    });
  }

  private cargarTiposCompSriCabecera(): void {
    this.tipoCompSriService.Listado().subscribe({
      next: (list) => {
        this.listaTiposCompSriCab = (list ?? []).map((t) => ({
          id: t.IdTipoCompSri,
          label: `${t.Codtipcomp} - ${t.Destipcomp}`,
        }));
      },
      error: (err) => {
        console.error('Error cargando tipos comprobante SRI (cabecera)', err);
      },
    });
  }

  private cargarTiposRetencion(): void {
    this.tipoRetencionService.getAllTipo().subscribe({
      next: (data: TipoRetencionResponse[]) => {
        this.tiposRetencionAll = data.map((t) => ({
          id: t.IdTipoRetencion,
          codigo: t.CodigoTipoRet,
          porcentaje: Number(t.Porcentaje || 0),
          label: `${t.CodigoTipoRet} - ${t.Descripcion} (${t.Porcentaje}%)`,
        }));

        this.tiposRetencion = [...this.tiposRetencionAll];

        this.gridApi?.refreshCells({
          force: true,
          columns: ['idTipoRetencion'],
        });
      },
      error: (err: any) => {
        console.error('Error cargando tipos de retención', err);
      },
    });
  }

  //// validaciones
  private validarDetalle(): boolean {
    const filas = this.rowData() ?? [];
    const errores: string[] = [];

    if (!filas.length) {
      errores.push('Debe ingresar al menos una línea en el detalle.');
    }

    filas.forEach((f, idx) => {
      const linea = idx + 1;
      const idLocal = Number(f.idLocal || 0);
      const idPlanCuentas = Number(f.idPlanCuentas || 0);
      const idAuxiliar = Number(f.idCodContable || 0);
      const idMovBancario = Number(f.idMovBancario || 0);
      const debe = Number(f.debe || 0);
      const haber = Number(f.haber || 0);
      const idSust = Number(f.idSustentoTrib || 0);
      const idTipoComp = Number(f.idTipoCompSri || 0);

      if (idLocal <= 0) errores.push(`Línea ${linea}: debe seleccionar el Local.`);
      if (idMovBancario <= 0) errores.push(`Línea ${linea}: debe seleccionar el Tipo de Movimiento (distinto de NINGUNO).`);
      if (idPlanCuentas <= 0) errores.push(`Línea ${linea}: debe seleccionar la Cuenta Contable.`);
      if (idAuxiliar <= 0) errores.push(`Línea ${linea}: debe seleccionar el Auxiliar Contable.`);
      if (debe <= 0 && haber <= 0) errores.push(`Línea ${linea}: debe ingresar un valor en Debe o en Haber.`);
      if (debe > 0 && haber > 0) errores.push(`Línea ${linea}: no puede tener valores en Debe y Haber al mismo tiempo.`);
      if (idSust <= 0) errores.push(`Línea ${linea}: debe seleccionar el Sustento Tributario.`);
      if (idTipoComp <= 0) errores.push(`Línea ${linea}: debe seleccionar el Tipo de Comprobante SRI.`);
    });

    const diff = this.totDebe() - this.totHaber();
    if (Math.round(diff * 100) / 100 !== 0) {
      errores.push('La diferencia entre Total Debe y Total Haber debe ser 0. Verifique los valores.');
    }

    if (errores.length > 0) {
      this.snack.open(errores[0], 'Cerrar', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return false;
    }

    return true;
  }

  ///guardar factura proveedor
  guardar(): void {
    if (this.saving() || this.loading()) return;

    this.numdocGenerado = null;

    this.form.markAllAsTouched();
    this.auxiliarSeleccionadoCtrl.markAsTouched();
    this.nroComprobanteCtrl.markAsTouched();
    this.sustentoTribCtrl.markAsTouched();
    this.tipoCompSriCtrl.markAsTouched();
    this.autorizacionCtrl.markAsTouched();
    this.fechacaducaCtrl.markAsTouched();
    this.fechavencimientoCtrl.markAsTouched();

    if (!this.validarCabecera() || this.form.invalid) {
      this.snack.open('Revisa los campos obligatorios', 'OK', {
        duration: 2500,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return;
    }

    if (!this.validarDetalle()) return;

    const esNuevo = this.modo() === 'nuevo';

    const ahora = new Date();
    const nowIso = formatLocalIso(ahora);

    const fechaTransControl = this.form.get('fechatransaccion')!.value;

    if (!fechaTransControl) {
      this.snack.open('Debe ingresar la Fecha de Transacción.', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return;
    }

    const fechaTransaccionSoloFecha = normalizeToLocalDate(fechaTransControl);
    const anioTransaccion = getYearFromInput(fechaTransaccionSoloFecha);

    this.form.patchValue(
      {
        anio: anioTransaccion,
        fechatransaccion: fechaTransaccionSoloFecha,
      },
      { emitEvent: false }
    );

    if (esNuevo) {
      this.form.patchValue(
        {
          fechaingreso: nowIso,
          fechacierre: null,
        },
        { emitEvent: false }
      );

      const detallesActuales = this.rowData() ?? [];

      const detallesConFecha = detallesActuales.map((d) => {
        const fechaIng = d.fechaingreso && d.fechaingreso !== '' ? normalizeToLocalIso(d.fechaingreso) : nowIso;
        const fechaTransDet = fechaTransaccionSoloFecha;

        return {
          ...d,
          anio: d.anio && d.anio !== '' ? d.anio : anioTransaccion,
          fechatransaccion: fechaTransDet,
          fechaingreso: fechaIng,
          hora: d.hora && d.hora !== '' ? d.hora : getTimeFromInput(fechaIng),
          fechacierre: d.fechacierre || '',
        } as DetalleAsientoResponse;
      });

      this.rowData.set(detallesConFecha);
    }

    const rawForm = this.form.value as AsientoContableResponse;

    // ====== APLICAR CAMPOS RELACIONADOS (CABECERA -> TODAS LAS LÍNEAS) ======
    const detallesConRelacionados = this.aplicarCamposRelacionadosCabecera(this.rowData());

    const header: AsientoContableResponse = {
      ...rawForm,
      modulo: rawForm.modulo != null && !isNaN(Number(rawForm.modulo)) ? Number(rawForm.modulo) : 1,
      fechatransaccion: fechaTransaccionSoloFecha,
      fechaingreso: esNuevo ? nowIso : normalizeToLocalIso(rawForm.fechaingreso),
      fechacierre: esNuevo ? '' : rawForm.fechacierre,
      numdoc: esNuevo ? 0 : rawForm.numdoc ?? 0,
      totdebe: this.totDebe(),
      tothaber: this.totHaber(),
      detalles: detallesConRelacionados,
    };

    const payload = this.normalizarParaBackend(header);

    this.saving.set(true);

    type SaveResponse = ApiResponse<number> | ApiResponse<boolean>;
    let save$: Observable<SaveResponse>;

    if (esNuevo) {
      save$ = this.facturasService.crear(payload) as Observable<SaveResponse>;
    } else {
      const idCab = header.IdCabMaestro || Number(this.route.snapshot.paramMap.get('id') ?? 0);
      save$ = this.facturasService.actualizar(idCab, payload) as Observable<SaveResponse>;
    }

    save$
      .pipe(
        tap((resp) => {
          if (esNuevo && typeof resp.data === 'number' && resp.data > 0) {
            this.form.patchValue({ IdCabMaestro: resp.data }, { emitEvent: false });
          }

          if ((resp as any).message) {
            const msg = (resp as any).message as string;
            const match = msg.match(/Numdoc\s*=\s*(\d+)/i);
            this.numdocGenerado = match?.[1] ?? null;
          }
        }),
        map((resp) => {
          const ok = typeof resp.data === 'number' ? resp.data > 0 : !!resp.data;
          if (!ok) throw resp;
          return true;
        }),
        catchError((err: any) => {
          let msg = 'No se ha podido registrar la factura del proveedor.';

          if (err?.status === 400) {
            msg = 'No está definido el número de control o está ocupado, verifique.';
          } else if (err?.error?.message) {
            msg = err.error.message;
          } else if (err?.message) {
            msg = err.message;
          }

          this.snack.open(msg, 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
          console.error('Error backend factura proveedor:', err);
          return of(false);
        }),
        finalize(() => this.saving.set(false))
      )
      .subscribe((ok) => {
        if (ok) {
          const msg = this.numdocGenerado ? `Guardado correctamente. AD Numdoc: ${this.numdocGenerado}` : 'Guardado correctamente';

          this.snack.open(msg, 'OK', {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });

          const dlg = this.mostrarMensaje({
            title: 'Imprimir asiento',
            message: '¿Desea imprimir el asiento?',
            type: 'info',
            confirmText: 'Sí',
            cancelText: 'No',
            showCancel: true,
          });

          dlg.afterClosed().subscribe((imprimir) => {
            if (imprimir) {
              this.imprimirAsiento();
            }

            if (this.dialogRef) {
              this.dialogRef.close(true);
            } else {
              this.resetParaNuevo();
            }
          });
        }
      });
  }

  cancelar(): void {
    if (this.dialogRef) {
      this.dialogRef.close(false);
    } else {
      this.router.navigate(['/cg-3000/inicio-cg']);
    }
  }

  onGridReady(evt: GridReadyEvent<DetalleAsientoResponse>): void {
    this.gridApi = evt.api;
    this.refrescarColumnasDetalle();
  }

  onCellValueChanged(evt: CellValueChangedEvent<DetalleAsientoResponse>): void {
    if (evt.colDef.field === 'debe' || evt.colDef.field === 'haber') {
      const filas = this.rowData() ?? [];
      const rowIndex = evt.node.rowIndex ?? 0;
      const lastIndex = filas.length - 1;

      this.rowData.set([...filas]);

      if (rowIndex < lastIndex) {
        this.recalcularHaberDesdeDebe(false);
      }
    }

    if (evt.colDef.field === 'idPlanCuentas') {
      const id = Number(evt.newValue ?? 0);
      const cta = this.cuentas.find((c) => c.id === id);

      if (cta && evt.data) {
        evt.data.idPlanCuentas = id as any;
        evt.data.codprePc = cta.codigo;

        const rowIndex = evt.node.rowIndex ?? -1;
        const movCode = (evt.data.movbancario || '').toString().trim().toUpperCase();

        if (['RFB', 'RFS'].includes(movCode)) {
          this.calcularRetencionDesdeFactura(rowIndex);
        }

        if (['RIB', 'RIS'].includes(movCode)) {
          this.calcularRetencionIvaDesdeIva(rowIndex);
        }

        this.rowData.set([...this.rowData()]);
        this.gridApi.refreshCells({
          rowNodes: [evt.node],
          columns: ['codprePc', 'debe', 'haber'],
          force: true,
        });
      }
    }

    // Tipo Movimiento → movbancario (código)
    if (evt.colDef.field === 'idMovBancario') {
      const idNuevo = Number(evt.newValue ?? 0);
      const idAnterior = Number(evt.oldValue ?? 0);

      // ✅ SOLO PARA 0 = NINGUNO
      if (idNuevo === 0) {
        if (evt.data) {
          evt.data.movbancario = '0';
        }

        this.rowData.set([...this.rowData()]);
        this.gridApi.refreshCells({
          rowNodes: [evt.node],
          columns: ['idMovBancario', 'movbancario', 'accion'],
          force: true,
        });

        this.recalcularHaberDesdeDebe(true);
        return;
      }

      if (!idNuevo || idNuevo <= 0) {
        evt.data!.idMovBancario = idAnterior;

        const oldMov = this.movimientosBancarios.find((m) => m.id === idAnterior);
        evt.data!.movbancario = oldMov ? oldMov.movimiento : '';

        this.rowData.set([...this.rowData()]);
        this.gridApi.refreshCells({
          rowNodes: [evt.node],
          columns: ['idMovBancario', 'movbancario', 'accion'],
          force: true,
        });

        this.snack.open('Debe seleccionar un Tipo de Movimiento válido (no se permite "0 - NINGUNO").', 'Cerrar', {
          duration: 3500,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });
        return;
      }

      const mov = this.movimientosBancarios.find((m) => m.id === idNuevo);

      if (mov && evt.data) {
        evt.data.movbancario = mov.movimiento;

        const movCode = mov.movimiento.toString().trim().toUpperCase();

        if (['0', 'CH', 'DP', 'NC', 'ND', 'TB'].includes(movCode)) {
          evt.data.idTipoRetencion = null as any;
        } else if (movCode === 'IB' || movCode === 'RIB') {
          if (evt.data.idTipoRetencion) {
            const tr = this.tiposRetencionAll.find((t) => t.id === Number(evt.data.idTipoRetencion));
            if (!tr || !tr.codigo?.startsWith('7')) {
              evt.data.idTipoRetencion = null as any;
            }
          }
        }

        if (idNuevo !== idAnterior) {
          evt.data.idPlanCuentas = 0 as any;
          evt.data.codprePc = '';
        }

        const rowIndex = evt.node.rowIndex ?? -1;
        if (['RFB', 'RFS'].includes(movCode) && Number(evt.data.idPlanCuentas || 0) > 0) {
          this.calcularRetencionDesdeFactura(rowIndex);
        }

        if (['RIB', 'RIS'].includes(movCode) && Number(evt.data.idPlanCuentas || 0) > 0) {
          this.calcularRetencionIvaDesdeIva(rowIndex);
        }

        if (['IB', 'IS'].includes(movCode) && Number(evt.data.porcentaje || 0) > 0) {
          this.calcularIvaDesdeFactura(rowIndex);
        }

        this.rowData.set([...this.rowData()]);
        this.gridApi.refreshCells({
          rowNodes: [evt.node],
          columns: ['idMovBancario', 'movbancario', 'accion', 'idTipoRetencion', 'idPlanCuentas', 'codprePc'],
          force: true,
        });
      }
    }

    if (evt.colDef.field === 'idPorIva') {
      const id = Number(evt.newValue ?? 0);
      const iva = this.porcentajesIva.find((p) => p.id === id);

      if (evt.data) {
        if (iva) {
          evt.data.idPorIva = id as any;
          evt.data.porcentaje = iva.porcentaje as any;
        } else {
          evt.data.idPorIva = null as any;
          evt.data.porcentaje = null as any;
        }

        const rowIndex = evt.node.rowIndex ?? -1;
        const movCode = (evt.data.movbancario || '').toString().trim().toUpperCase();

        if (['IB', 'IS'].includes(movCode)) {
          this.calcularIvaDesdeFactura(rowIndex);
        }

        this.rowData.set([...this.rowData()]);
        this.gridApi.refreshCells({
          rowNodes: [evt.node],
          columns: ['idPorIva', 'porcentaje', 'debe', 'haber'],
          force: true,
        });
      }
    }

    // Auxiliar contable -> beneficiario línea
    if (evt.colDef.field === 'idCodContable') {
      const id = Number(evt.newValue ?? 0);

      const aux = this.auxiliaresGrid.find((a) => a.id === id) || this.auxiliares.find((a) => a.id === id);

      if (evt.data) {
        evt.data.beneficiario = aux ? aux.razon : '';
      }

      this.rowData.set([...this.rowData()]);
      this.gridApi.refreshCells({
        rowNodes: [evt.node],
        columns: ['beneficiario', 'idCodContable'],
        force: true,
      });
    }
  }

  onCellClicked(evt: CellClickedEvent<DetalleAsientoResponse>): void {
    if (evt?.colDef?.colId !== 'accion') return;

    const button = (evt.event?.target as HTMLElement)?.closest('button');
    if (!button) return;

    const action = button.getAttribute('data-action');

    if (action === 'delete' && evt.node?.data) {
      this.eliminarLinea(evt.node.data);
      return;
    }

    if (action === 'edit-tributario' && evt.node?.data) {
      const idMov = Number(evt.node.data.idMovBancario || 0);
      const disabled = button.getAttribute('data-disabled') === 'true';
      const movCode = (evt.node.data.movbancario ?? '').toString().trim();

      if (disabled || idMov <= 0) {
        this.snack.open('Primero seleccione un Tipo de Movimiento válido para esta línea.', 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });
        return;
      }

      if (disabled || movCode === '0') {
        this.snack.open('No puede registrar datos tributarios cuando el tipo de movimiento es NINGUNO.', 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });
        return;
      }

      this.abrirDialogoTributario(evt.node.data, evt.node);
    }
  }

  // ✅ Aquí se valida antes de agregar línea (solo NUEVO)
  agregarLinea(): void {
    const idZonaCtrl = this.form.get('idZona');
    const idTipoAsientoCtrl = this.form.get('idTipoAsiento');
    const idZona = Number(idZonaCtrl?.value || 0);
    const idTipoAsiento = Number(idTipoAsientoCtrl?.value || 0);
    const idAuxiliar = Number(this.auxiliarSeleccionadoCtrl.value || 0);
    const nroComprobante = (this.nroComprobanteCtrl.value || '').toString().trim();
    const idSustentoCab = Number(this.sustentoTribCtrl.value || 0);
    const idTipoCompSriCab = Number(this.tipoCompSriCtrl.value || 0);
    const autorizacionCab = (this.autorizacionCtrl.value || '').toString().trim();

    const fechaCadCabForm = this.fechacaducaCtrl.value;
    const fechaVenCabForm = this.fechavencimientoCtrl.value;

    const fechaCadCab = fechaCadCabForm ? normalizeToLocalDate(fechaCadCabForm) : '';
    const fechaVenCab = fechaVenCabForm ? normalizeToLocalDate(fechaVenCabForm) : '';

    const mensajes: string[] = [];
    if (idZona <= 0) {
      mensajes.push('Debe seleccionar la Zona.');
      idZonaCtrl?.markAsTouched();
    }
    if (!idTipoAsiento || idTipoAsiento <= 0) {
      mensajes.push('Debe seleccionar el Tipo de Asiento.');
      idTipoAsientoCtrl?.markAsTouched();
    }

    if (!idAuxiliar || idAuxiliar <= 0) {
      mensajes.push('Debe seleccionar el Auxiliar Contable.');
      this.auxiliarSeleccionadoCtrl.markAsTouched();
    }
    if (!nroComprobante) {
      mensajes.push('Debe ingresar el No. Comprobante.');
      this.nroComprobanteCtrl.markAsTouched();
    }

    if (!idSustentoCab || idSustentoCab <= 0) {
      mensajes.push('Debe seleccionar el Sustento Tributario.');
      this.sustentoTribCtrl.markAsTouched();
    }

    if (!idTipoCompSriCab || idTipoCompSriCab <= 0) {
      mensajes.push('Debe seleccionar el Tipo de Comprobante SRI.');
      this.tipoCompSriCtrl.markAsTouched();
    }

    if (!autorizacionCab) {
      mensajes.push('Debe ingresar la Autorización.');
      this.autorizacionCtrl.markAsTouched();
    }

    if (!fechaCadCab) {
      mensajes.push('Debe ingresar la Fecha Caduca.');
      this.fechacaducaCtrl.markAsTouched();
    }

    if (!fechaVenCab) {
      mensajes.push('Debe ingresar la Fecha Vencimiento.');
      this.fechavencimientoCtrl.markAsTouched();
    }

    if (mensajes.length > 0) {
      this.snack.open(mensajes.join(' '), 'Cerrar', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return;
    }

    // ✅ Validar duplicado ANTES de agregar (solo en NUEVO)
    this.nroComprobanteCtrl.markAsTouched();
    this.validarNoComprobanteAntesDeAgregarLinea$().subscribe((ok) => {
      if (!ok) {
        this.snack.open('El No. Comprobante ya existe para este proveedor. Verifique y cambie el número.', 'Cerrar', {
          duration: 4500,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });
        return; // ❌ NO agrega línea
      }

      // =========================
      // ✅ (si pasa validación) continúa flujo original
      // =========================
      const ahora = new Date();
      const nowIso = formatLocalIso(ahora);

      const items = this.rowData();
      const next = (items?.length ?? 0) + 1;

      const fechaTransFormulario = this.form.value?.fechatransaccion || nowIso;
      const fechaTransaccionDetalle = normalizeToLocalDate(fechaTransFormulario);
      const anioTransaccion = this.form.value?.anio || getYearFromInput(fechaTransaccionDetalle);

      const fechaIngresoIso = nowIso;
      const horaIngreso = getTimeFromInput(fechaIngresoIso);

      // ====== CAMPOS RELACIONADOS: CABECERA -> NUEVA LÍNEA ======
      const docRelCab = (this.docRelacionadoCtrl.value || '').toString().trim();
      const autRelCab = (this.autorizacionRelacionadoCtrl.value || '').toString().trim();
      const fechaCadRelCab = this.fechaCadRelacionadoCtrl.value ? normalizeToLocalDate(this.fechaCadRelacionadoCtrl.value) : null;

      const nueva: DetalleAsientoResponse = {
        IdDetMaestro: 0,
        IdCabMaestro: Number(this.form.value?.IdCabMaestro ?? 0),
        numlinea: next,

        anio: anioTransaccion,
        fechatransaccion: fechaTransaccionDetalle,
        fechaingreso: fechaIngresoIso,
        hora: horaIngreso,
        idZona: Number(this.form.value?.idZona ?? 0),

        idCentroCostos: null as any,
        idLocal: 0,
        idPlanCuentas: 0,
        codprePc: '',
        idCodContable: idAuxiliar,
        nocomprobante: nroComprobante,
        docurelacionado: docRelCab, // ✅ COPIAR AL DETALLE
        cheque: 0,

        beneficiario: this.form.value?.beneficiario ?? '',
        debe: 0,
        haber: 0,
        comentario: this.form.value?.observacion ?? '',
        idMovBancario: 0,
        movbancario: '',

        cierre: '',
        fechacierre: null as any,
        conciliado: '',
        fechaconciliado: null as any,

        idSustentoTrib: idSustentoCab,
        idTipoCompSri: idTipoCompSriCab,
        autorizacion: autorizacionCab,
        fechacaduca: fechaCadCab,
        idTipoRetencion: null as any,
        idProyecto: null as any,
        idSubproyecto: null as any,

        transferido: false,
        fechatransferido: null as any,
        fechavencimiento: fechaVenCab,
        idConciliacion: 0,
        valorLetras: '',
        estadoIngreso: true,

        // ✅ NUEVOS CAMPOS (RELACIONADOS) COPIADOS DESDE CABECERA
        autorizacionRelacionado: autRelCab,
        fechaCadRelacionado: fechaCadRelCab as any,

        // IVA
        idPorIva: null,
        porcentaje: null,
      };

      this.rowData.set([...(items ?? []), nueva]);

      queueMicrotask(() => {
        const lastIndex = (this.rowData().length ?? 1) - 1;
        this.gridApi?.ensureIndexVisible(lastIndex);
        this.gridApi?.startEditingCell({
          rowIndex: lastIndex,
          colKey: 'codprePc',
        });
      });

      this.bloquearCabecera();
      this.recalcularHaberDesdeDebe(true);
    });
  }

  eliminarLinea(item: DetalleAsientoResponse): void {
    const filasActuales = this.rowData() ?? [];
    const removedIndex = filasActuales.indexOf(item);
    if (removedIndex === -1) return;

    const items = filasActuales.filter((x) => x !== item);

    items.forEach((d, i) => (d.numlinea = i + 1));
    this.rowData.set(items);

    const removedWasLast = removedIndex === filasActuales.length - 1;

    if (items.length >= 2 && !removedWasLast) {
      this.recalcularHaberDesdeDebe(false);
    }
  }

  isReadOnly(): boolean {
    return this.saving() || this.loading();
  }

  private mostrarMensaje(data: MessageBoxData) {
    const config: MatDialogConfig<MessageBoxData> = {
      width: '400px',
      data: {
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        ...data,
      },
    };
    return this.dialog.open<unknown, MessageBoxData, boolean>(CustomMessageBoxComponent as ComponentType<unknown>, config);
  }

  private abrirDialogoTributario(row: DetalleAsientoResponse, rowNode: any): void {
    const movLabel =
      this.movimientosBancarios.find((m) => m.id === Number(row.idMovBancario || 0))?.label || row.movbancario || '';

    const data: AsientoTributarioData & { movLabel?: string } = {
      idSustentoTrib: Number(row.idSustentoTrib || 0),
      idTipoCompSri: Number(row.idTipoCompSri || 0),
      autorizacion: row.autorizacion || '',
      fechacaduca: row.fechacaduca || null,
      idTipoRetencion: Number(row.idTipoRetencion || 0),
      idCentroCostos: Number(row.idCentroCostos || 0),
      idProyecto: Number(row.idProyecto || 0),
      idSubproyecto: Number(row.idSubproyecto || 0),
      movLabel,
    };

    const dialogRef = this.dialog.open(AsientoTributarioDialogComponent, {
      width: '820px',
      data: data as any,
    });

    dialogRef.afterClosed().subscribe((result?: AsientoTributarioData & { movLabel?: string }) => {
      if (!result) return;

      row.idSustentoTrib = result.idSustentoTrib;
      row.idTipoCompSri = result.idTipoCompSri;
      row.autorizacion = result.autorizacion;
      row.fechacaduca = (result as any).fechacaduca ?? '';
      row.idTipoRetencion = result.idTipoRetencion;
      row.idCentroCostos = result.idCentroCostos;
      row.idProyecto = result.idProyecto;
      row.idSubproyecto = result.idSubproyecto;

      this.rowData.set([...this.rowData()]);
      this.gridApi.refreshCells({
        rowNodes: [rowNode],
        force: true,
        columns: ['idSustentoTrib', 'idTipoCompSri', 'autorizacion', 'fechacaduca', 'idTipoRetencion', 'idCentroCostos', 'idProyecto', 'idSubproyecto'],
      });
    });
  }

  onNumericInput(ctrl: FormControl<any>, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;

    const original = input.value;
    const soloDigitos = original.replace(/\D/g, '');

    if (original !== soloDigitos) {
      input.value = soloDigitos;
    }

    // ✅ si cambió el nro comprobante, limpiamos cache/duplicado
    if (ctrl === this.nroComprobanteCtrl) {
      this.limpiarCacheNoComprobante();
    }

    ctrl.setValue(soloDigitos, { emitEvent: false });
  }

  private normalizarParaBackend(header: AsientoContableResponse): any {
    const h: any = { ...header };

    // CABECERA
    h.fechacierre = h.fechacierre ? normalizeToLocalDate(h.fechacierre) : null;

    // DETALLES
    h.detalles = (header.detalles ?? []).map((d) => {
      const det: any = { ...d };

      det.fechatransaccion = det.fechatransaccion ? normalizeToLocalDate(det.fechatransaccion) : null;
      det.fechacierre = det.fechacierre ? normalizeToLocalDate(det.fechacierre) : null;
      det.fechaconciliado = det.fechaconciliado ? normalizeToLocalDate(det.fechaconciliado) : null;
      det.fechatransferido = det.fechatransferido ? normalizeToLocalDate(det.fechatransferido) : null;
      det.fechaCadRelacionado = det.fechaCadRelacionado ? normalizeToLocalDate(det.fechaCadRelacionado) : null;

      det.fechacaduca = det.fechacaduca ? normalizeToLocalDate(det.fechacaduca) : det.fechacaduca;
      det.fechavencimiento = det.fechavencimiento ? normalizeToLocalDate(det.fechavencimiento) : det.fechavencimiento;

      det.idCentroCostos = det.idCentroCostos && det.idCentroCostos > 0 ? det.idCentroCostos : null;
      det.idProyecto = det.idProyecto && det.idProyecto > 0 ? det.idProyecto : null;
      det.idSubproyecto = det.idSubproyecto && det.idSubproyecto > 0 ? det.idSubproyecto : null;
      det.idConciliacion = det.idConciliacion && det.idConciliacion > 0 ? det.idConciliacion : null;

      det.idTipoRetencion = det.idTipoRetencion && det.idTipoRetencion > 0 ? det.idTipoRetencion : null;

      if (det.idPorIva === null || det.idPorIva === undefined) {
        det.idPorIva = null;
      } else {
        const n = Number(det.idPorIva);
        det.idPorIva = isNaN(n) ? null : n;
      }

      if (det.porcentaje === null || det.porcentaje === undefined) {
        det.porcentaje = null;
      } else {
        const n = Number(det.porcentaje);
        det.porcentaje = isNaN(n) ? null : n;
      }

      return det;
    });

    return h;
  }

  private normalizarDetalleRelacionadoDesdeBackend(d: any): any {
    const det: any = { ...d };

    if (det.autorizacionRelacionado == null && det.autorizacionrelacionado != null) {
      det.autorizacionRelacionado = det.autorizacionrelacionado;
    }

    if (det.fechaCadRelacionado == null && det.fecha_cad_relacionado != null) {
      det.fechaCadRelacionado = det.fecha_cad_relacionado;
    }

    if (det.fechaCadRelacionado) {
      det.fechaCadRelacionado = normalizeToLocalDate(det.fechaCadRelacionado);
    }

    return det;
  }

  private aplicarCamposRelacionadosCabecera(detalles: DetalleAsientoResponse[]): DetalleAsientoResponse[] {
    const docRel = (this.docRelacionadoCtrl.value || '').toString().trim();
    const autRel = (this.autorizacionRelacionadoCtrl.value || '').toString().trim();
    const fCadRel = this.fechaCadRelacionadoCtrl.value ? normalizeToLocalDate(this.fechaCadRelacionadoCtrl.value) : null;

    return (detalles || []).map((d: any) => ({
      ...d,
      docurelacionado: docRel || (d.docurelacionado || ''),
      autorizacionRelacionado: autRel || (d.autorizacionRelacionado || d.autorizacionrelacionado || ''),
      fechaCadRelacionado: fCadRel ?? (d.fechaCadRelacionado || d.fecha_cad_relacionado || null),
    })) as DetalleAsientoResponse[];
  }

  private bloquearCabecera(): void {
    if (this.cabeceraBloqueada) return;
    this.cabeceraBloqueada = true;
  }

  private calcularRetencionDesdeFactura(rowIndex: number): void {
    const filas = this.rowData() ?? [];
    if (rowIndex < 0 || rowIndex >= filas.length) return;

    const fila = filas[rowIndex];

    const movActual = (fila.movbancario || '').toString().trim().toUpperCase();
    if (!['RFB', 'RFS'].includes(movActual)) return;

    const idCuenta = Number(fila.idPlanCuentas || 0);
    if (!idCuenta) return;

    const cuenta = this.cuentas.find((c) => c.id === idCuenta);
    if (!cuenta) return;

    let porcentaje: number | null = cuenta.porcentajeRetencion ?? null;

    if (!porcentaje || porcentaje <= 0) {
      const texto = cuenta.label ?? '';
      const match = texto.match(/(\d+([.,]\d+)?)\s*%/);
      if (match) {
        const n = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(n) && n > 0) porcentaje = n;
      }
    }

    if (!porcentaje || porcentaje <= 0) return;

    const codigosBaseFactura = ['FCB', 'FCS', 'FSB', 'FSS'];
    const codigosIva = ['IB', 'IS'];

    let baseDebe = 0;

    for (let i = rowIndex - 1; i >= 0; i--) {
      const filaArriba = filas[i];
      const movBase = (filaArriba.movbancario || '').toString().trim().toUpperCase();
      const debe = Number(filaArriba.debe || 0);

      if (debe > 0 && codigosBaseFactura.includes(movBase)) {
        baseDebe = debe;
        break;
      }
    }

    if (baseDebe <= 0) {
      for (let i = rowIndex - 1; i >= 0; i--) {
        const filaArriba = filas[i];
        const movBase = (filaArriba.movbancario || '').toString().trim().toUpperCase();
        const debe = Number(filaArriba.debe || 0);

        if (debe > 0 && !codigosIva.includes(movBase)) {
          baseDebe = debe;
          break;
        }
      }
    }

    if (baseDebe <= 0) return;

    const valorRet = Number((baseDebe * (porcentaje / 100)).toFixed(2));

    fila.debe = 0;
    fila.haber = valorRet;

    this.rowData.set([...filas]);
    this.gridApi?.refreshCells({ force: true, columns: ['debe', 'haber'] });

    const lastIndex = filas.length - 1;
    if (rowIndex < lastIndex) {
      this.recalcularHaberDesdeDebe(false);
    }
  }

  private recalcularHaberDesdeDebe(forzar: boolean = false): void {
    const filas = this.rowData() ?? [];
    if (filas.length === 0) return;

    const MOV_SALDO = ['CH', 'DP', 'NC', 'ND', 'TB'];

    let saldoIndex = -1;

    for (let i = filas.length - 1; i >= 0; i--) {
      const mov = (filas[i].movbancario || '').toString().trim().toUpperCase();
      if (MOV_SALDO.includes(mov)) {
        saldoIndex = i;
        break;
      }
    }

    if (saldoIndex === -1) {
      const lastIndex = filas.length - 1;
      const last = filas[lastIndex];

      const movLast = (last.movbancario || '').toString().trim().toUpperCase();
      const idMovLast = Number(last.idMovBancario || 0);

      if (movLast === '0' || idMovLast === 0) {
        saldoIndex = lastIndex;
      } else {
        return;
      }
    }

    const filaSaldo = filas[saldoIndex];

    const totalDebe = filas.reduce((acc, f) => acc + (Number(f.debe) || 0), 0);

    const totalHaberSinSaldo = filas.reduce((acc, f, idx) => {
      if (idx === saldoIndex) return acc;
      return acc + (Number(f.haber) || 0);
    }, 0);

    const tieneHaber = filas.some((f, idx) => idx !== saldoIndex && Number(f.haber || 0) > 0);
    if (!tieneHaber && !forzar) return;

    let saldo = totalDebe - totalHaberSinSaldo;
    saldo = Number(saldo.toFixed(2));
    if (saldo < 0) saldo = 0;

    filaSaldo.debe = 0;
    filaSaldo.haber = saldo;

    this.rowData.set([...filas]);
    this.gridApi?.refreshCells({
      force: true,
      columns: ['debe', 'haber'],
    });
  }

  private validarCabecera(): boolean {
    const errores: string[] = [];

    const idZona = Number(this.form.get('idZona')?.value || 0);
    const idAux = Number(this.auxiliarSeleccionadoCtrl.value || 0);
    const nroComp = (this.nroComprobanteCtrl.value || '').toString().trim();
    const idSust = Number(this.sustentoTribCtrl.value || 0);
    const idTipoC = Number(this.tipoCompSriCtrl.value || 0);
    const aut = (this.autorizacionCtrl.value || '').toString().trim();
    const fCad = (this.fechacaducaCtrl.value || '').toString().trim();
    const fVen = (this.fechavencimientoCtrl.value || '').toString().trim();
    const concepto = (this.form.get('observacion')?.value || '').toString().trim();

    if (idZona <= 0) errores.push('Debe seleccionar la Zona.');
    if (idAux <= 0) errores.push('Debe seleccionar el Proveedor.');
    if (!nroComp) errores.push('Debe ingresar el No. Comprobante.');
    if (idSust <= 0) errores.push('Debe seleccionar el Sustento Tributario.');
    if (idTipoC <= 0) errores.push('Debe seleccionar el Tipo de Comprobante SRI.');
    if (!aut) errores.push('Debe ingresar la Autorización.');
    if (!fCad) errores.push('Debe ingresar la Fecha Caduca.');
    if (!fVen) errores.push('Debe ingresar la Fecha Vencimiento.');
    if (!concepto) errores.push('Debe ingresar el Concepto.');

    if (errores.length > 0) {
      this.snack.open(errores[0], 'Cerrar', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return false;
    }

    return true;
  }

  private resetParaNuevo(): void {
    this.cabeceraBloqueada = false;
    this.modo.set('nuevo');
    this.numdocGenerado = null;
    this.loading.set(false);
    this.saving.set(false);

    const nowIso = formatLocalIso(new Date());
    const anio = getYearFromInput(nowIso);

    const ahora = new Date();
    const todayDate = formatLocalDateOnly(ahora);

    this.form.reset({
      IdCabMaestro: 0,
      idZona: 0,
      idUsuario: this.usuarioActual?.id_usuario ?? null,
      idEmpresa: this.usuarioActual?.id_empresa ?? null,
      idTipoAsiento: this.form.get('idTipoAsiento')?.value ?? null,
      tipdoc: this.form.get('tipdoc')?.value ?? '',
      numdoc: 0,
      anio: anio,
      fechatransaccion: todayDate,
      fechaingreso: nowIso,
      observacion: '',
      totdebe: 0,
      tothaber: 0,
      beneficiario: '',
      cierre: '',
      fechacierre: null,
      solicitado: '',
      depto: '',
      autorizado: '',
      homCodigo: 0,
      estado: true,
      modulo: 1,
    });

    this.proveedorCtrl.reset(null);
    this.auxiliarSeleccionadoCtrl.reset(null);
    this.nroComprobanteCtrl.reset('');
    this.sustentoTribCtrl.reset(null);
    this.tipoCompSriCtrl.reset(null);
    this.autorizacionCtrl.reset('');
    this.fechacaducaCtrl.reset(null);
    this.fechavencimientoCtrl.reset(null);

    // ====== RESET CAMPOS RELACIONADOS (CABECERA) ======
    this.docRelacionadoCtrl.reset('');
    this.autorizacionRelacionadoCtrl.reset('');
    this.fechaCadRelacionadoCtrl.reset(null);

    this.plazoCtrl.setValue(0, { emitEvent: false });
   

    // ✅ reset cache/duplicado
    this.limpiarCacheNoComprobante();

    this.rowData.set([]);
    this.syncUsuarioEmpresa();
  }

  imprimirAsiento(): void {
    const id = Number(this.form.get('IdCabMaestro')?.value || this.route.snapshot.paramMap.get('id') || 0);

    if (!id || id <= 0) {
      this.snack.open('Debe guardar el asiento antes de poder imprimirlo.', 'Cerrar', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return;
    }

    this.loading.set(true);

    this.asientosService
      .getAsientoImpresion(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (asiento: AsientoImpresion) => {
          if (!asiento) {
            this.snack.open('No se encontraron datos para la impresión del asiento.', 'Cerrar', {
              duration: 4000,
              horizontalPosition: 'right',
              verticalPosition: 'top',
            });
            return;
          }
          generarPdfAsiento(asiento, this.nombreusuario);
        },
        error: (err) => {
          console.error('Error al obtener asiento para impresión:', err);
          this.snack.open('Ocurrió un error al preparar la impresión del asiento.', 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        },
      });
  }

  // ✅ CALCULA IVA (IB / IS) A PARTIR DE LA FACTURA (FCB/FCS/FSB/FSS)
  private calcularIvaDesdeFactura(rowIndex: number): void {
    const filas = this.rowData() ?? [];
    if (rowIndex < 0 || rowIndex >= filas.length) return;

    const fila = filas[rowIndex];
    const mov = (fila.movbancario || '').toString().trim().toUpperCase();

    if (!['IB', 'IS'].includes(mov)) return;

    const porcentajeIva = Number(fila.porcentaje || 0);
    if (!porcentajeIva || porcentajeIva <= 0) return;

    if (Number(fila.debe || 0) > 0) return;

    const codigosBaseFactura = ['FCB', 'FCS', 'FSB', 'FSS'];

    let base = 0;

    for (let i = rowIndex - 1; i >= 0; i--) {
      const f = filas[i];
      const movBase = (f.movbancario || '').toString().trim().toUpperCase();
      const debe = Number(f.debe || 0);

      if (debe > 0 && codigosBaseFactura.includes(movBase)) {
        base = debe;
        break;
      }
    }

    if (base <= 0) return;

    const valorIva = Number((base * (porcentajeIva / 100)).toFixed(2));

    fila.debe = valorIva;
    fila.haber = 0;

    this.rowData.set([...filas]);
    this.gridApi?.refreshCells({ force: true, columns: ['debe', 'haber'] });

    const lastIndex = filas.length - 1;
    if (rowIndex < lastIndex) {
      this.recalcularHaberDesdeDebe(false);
    }
  }

  // ✅ CALCULA RETENCIÓN DE IVA (RIB / RIS) A PARTIR DEL IVA (IB/IS)
  private calcularRetencionIvaDesdeIva(rowIndex: number): void {
    const filas = this.rowData() ?? [];
    if (rowIndex < 0 || rowIndex >= filas.length) return;

    const fila = filas[rowIndex];
    const mov = (fila.movbancario || '').toString().trim().toUpperCase();

    if (!['RIB', 'RIS'].includes(mov)) return;

    const idCuenta = Number(fila.idPlanCuentas || 0);
    if (!idCuenta) return;

    const cuenta = this.cuentas.find((c) => c.id === idCuenta);
    if (!cuenta) return;

    let porcentaje: number | null = cuenta.porcentajeRetencion ?? null;

    if (!porcentaje || porcentaje <= 0) {
      const texto = cuenta.label ?? '';
      const match = texto.match(/(\d+([.,]\d+)?)\s*%/);
      if (match) {
        const n = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(n) && n > 0) porcentaje = n;
      }
    }

    if (!porcentaje || porcentaje <= 0) return;

    let baseIva = 0;
    for (let i = rowIndex - 1; i >= 0; i--) {
      const f = filas[i];
      const movBase = (f.movbancario || '').toString().trim().toUpperCase();
      const debe = Number(f.debe || 0);

      if (debe > 0 && ['IB', 'IS'].includes(movBase)) {
        baseIva = debe;
        break;
      }
    }

    if (baseIva <= 0) return;

    const valorRet = Number((baseIva * (porcentaje / 100)).toFixed(2));

    fila.debe = 0;
    fila.haber = valorRet;

    this.rowData.set([...filas]);
    this.gridApi?.refreshCells({ force: true, columns: ['debe', 'haber'] });

    const lastIndex = filas.length - 1;
    if (rowIndex < lastIndex) {
      this.recalcularHaberDesdeDebe(false);
    }
  }
}

/** Helpers de celdas Y OTRAS FUNCIONES A UTILIZAR */
function numberParser(params: any): number {
  const v = (params.newValue ?? '').toString().replace(',', '.').trim();
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function boolParser(params: any): boolean {
  const v = (params.newValue ?? '').toString().toLowerCase().trim();
  return v === 'true' || v === '1' || v === 'sí' || v === 'si';
}

function isoParser(params: any): string {
  const v = (params.newValue ?? '').toString().trim();
  if (!v) return '';
  return normalizeToLocalIso(v);
}

function blockComma(params: any): boolean {
  return params.event?.key === ',';
}

const decimalDot2Regex = /^\d*(\.\d{0,2})?$/;

function valueSetterDot2(params: any): boolean {
  const raw = String(params.newValue ?? '').trim();
  if (raw.includes(',')) return false;
  if (!decimalDot2Regex.test(raw)) return false;
  const n = Number(raw);
  if (Number.isNaN(n)) return false;

  const field = params.colDef.field!;
  if (field === 'debe') {
    params.data.debe = n > 0 ? Number(n.toFixed(2)) : 0;
    if (params.data.debe > 0) params.data.haber = 0;
  } else if (field === 'haber') {
    params.data.haber = n > 0 ? Number(n.toFixed(2)) : 0;
    if (params.data.haber > 0) params.data.debe = 0;
  } else {
    (params.data as any)[field] = n;
  }
  return true;
}

function twoDecimalsDotFormatter(p: any): string {
  const val = Number(p.value ?? 0);
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const toNumber = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const normalized = String(v).replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
};

function debeEditable(params: any) {
  const h = toNumber(params.data?.haber);
  return h <= 0;
}

function haberEditable(params: any) {
  const d = toNumber(params.data?.debe);
  return d <= 0;
}

function getYearFromInput(v: any): string {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? '' : String(d.getFullYear());
}

function getTimeFromInput(v: any): string {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return '';

  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
}

function formatLocalIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

function normalizeToLocalIso(v: any): string {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return formatLocalIso(d);
}

function onlyAllowedComentarioKey(params: any): boolean {
  const e = params.event as KeyboardEvent;
  const key = e.key;

  if (
    key === 'Backspace' ||
    key === 'Delete' ||
    key === 'Tab' ||
    key === 'Enter' ||
    key === 'Escape' ||
    key === 'ArrowLeft' ||
    key === 'ArrowRight' ||
    key === 'ArrowUp' ||
    key === 'ArrowDown' ||
    key === 'Home' ||
    key === 'End'
  ) {
    return false;
  }

  if (e.ctrlKey || e.metaKey) return false;

  const allowedCharRegex = /^[0-9a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.,;-]$/;

  if (allowedCharRegex.test(key)) return false;

  e.preventDefault();
  return true;
}

function sanitizeTextoGenerico(value: any): string {
  const raw = (value ?? '').toString();
  return raw.replace(/[^0-9a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.,;-]/g, '');
}

function formatLocalDateOnly(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeToLocalDate(v: any): string {
  if (!v) return '';

  if (typeof v === 'string') {
    const s = v.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.substring(0, 10);
  }

  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return formatLocalDateOnly(d);
}
