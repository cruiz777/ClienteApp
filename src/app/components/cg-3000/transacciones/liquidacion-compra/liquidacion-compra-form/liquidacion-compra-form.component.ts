
import { Component, OnInit, ViewChild, effect, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl, // agregar para el control de combo auxiliares contables
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsuarioService } from 'src/app/services/usuario.service';
import { Optional, Inject } from '@angular/core';
import { MatDialogRef, MatDialog, MatDialogConfig, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { startWith, distinctUntilChanged,filter } from 'rxjs/operators';
import { Observable, of ,combineLatest } from 'rxjs';
import { tap, shareReplay, map, catchError, finalize } from 'rxjs/operators';
import { TipoAsientoService } from 'src/app/services/tipoasiento.service';
import { TipoAsientoResponse } from 'src/app/interfaces/responses/tipo-asiento-response';
import { ZonaService } from 'src/app/services/zona.service';
import { ZonaResponse } from 'src/app/interfaces/responses/zona-response';

//PARA NUMERO COMPROBANTE CAMBIO 01012026
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
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
//import { TipoRetencionCellEditorComponent } from './tipo-retencion-cell-editor.component'; esto si creas localmente
import { TipoRetencionCellEditorComponent } from '../../facturas-proveedor/facturas-proveedor-form/tipo-retencion-cell-editor.component';

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

import { FormapagoSriCellEditorComponent } from './formapago-sri-cell-editor.component';
// Cell editor IVA
//import { PorcentajeIvaCellEditorComponent } from './porcentaje-iva-cell-editor.component'; esto si creas localmente en la carpeta pero no es logico
import { PorcentajeIvaCellEditorComponent } from '../../facturas-proveedor/facturas-proveedor-form/porcentaje-iva-cell-editor.component';
// autorizacion caja 19012026
import { AutorizacionCajaService, AutorizacionCaja } from 'src/app/services/autorizacion-caja.service';
import { firstValueFrom,merge,from,EMPTY  } from 'rxjs';

// Mensajería
import {
  CustomMessageBoxComponent, MessageBoxData,
} from 'src/app/util/messages/custom-message-box.component';

import { AgGridAngular } from 'ag-grid-angular';

import {
  AllCommunityModule,  ModuleRegistry,  ColDef,  GridApi,  GridReadyEvent,  CellValueChangedEvent,
  CellClickedEvent,  CellKeyDownEvent,  FullWidthCellKeyDownEvent,} from 'ag-grid-community';

/* cambio hr 15012026
import {
  AsientoContableResponse,
  DetalleAsientoResponse,
  createEmptyAsientoContableResponse,
} from 'src/app/interfaces/responses/asiento-contable-response';
*/
import { FormaPagoSriService } from 'src/app/services/forma-pago-sri.service';

import {
  LiquidacionCompraResponse,
  LiquidacionCompraDetalleAsientoResponse,
  LiquidacionCompraCabeceraResponse,
  LiquidacionCompraDetalleResponse,
  LiquidacionCompraFormaPagoResponse,
  createEmptyLiquidacionCompraResponse,
} from 'src/app/interfaces/responses/liquidacion-compra-response';

import {
  LiquidacionCompraService,
} from 'src/app/services/liquidacion-compra.service';

//import { ApiResponse } from 'src/app/interfaces/requests/liquidacion-compra-request';
import { ViewEncapsulation } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// 🔹 Servicio específico para facturas de proveedor
import {
  FacturasProveedorService, 
  ApiResponse,
} from 'src/app/services/facturas-proveedor.service';

//cambio hr 15012026
type AsientoContableResponse = LiquidacionCompraResponse;
type DetalleAsientoResponse = LiquidacionCompraDetalleAsientoResponse;
const createEmptyAsientoContableResponse = createEmptyLiquidacionCompraResponse;

///
ModuleRegistry.registerModules([AllCommunityModule]);

interface TipoRetencionCombo {
  id: number;
  label: string; // ej: "001 - RENTA (10%)"
  codigo: string; // CodigoTipoRet (para filtrar por 7%)
  porcentaje: number; // Porcentaje
}


///numero de control
type SriSerieRangoCfg = {
  minEstab?: number; // default 1
  maxEstab?: number; // default 99  (si quieres 999, cámbialo)
  minPto?: number;   // default 1
  maxPto?: number;   // default 99
};

///plazo proveedor
type ProveedorItem = { id: number; label: string; razon: string; plazo: number | null };
//formapagosri
///para eñ porcentaje iva
interface PorcentajeIvaCombo {
  id: number; // idPorIva
  label: string; // "2 - IVA 12% (12%)"
  codigoIva: number;
  porcentaje: number;
  descripcion: string;
  estado?: boolean; // ✅ agregar  revisar 01012026
}
///
@Component({
  selector: 'app-liquidacion-compra-form',
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
  templateUrl: './liquidacion-compra-form.component.html',
  styleUrls: ['./liquidacion-compra-form.component.css'],
  encapsulation: ViewEncapsulation.None, //  👈 clave
})
export class LiquidacionCompraFormComponent implements OnInit {
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

  modo = signal<'nuevo' | 'editar' | 'plantilla'>('nuevo');
  loading = signal(false);
  saving = signal(false);

  titulo = computed(() => {
    const m = this.modo();
    if (m === 'editar') {
      return 'Editar Liquidación Compra) — EDITAR'; //'Editar (Factura Proveedor) — EDITAR'
    }
    if (m === 'plantilla') {
      return 'Duplicación de Factura — NUEVO';
    }
    return 'Crear(Liquidación Compra) — NUEVO'; //'Crear(Factura Proveedor) — NUEVO'
  });
  //autorizacion
  public sriGenerando = false;
  //paneles -12012026
  // Panel activo: 1=Detalle, 2=Forma Pago, 3=Asiento Contable
  activeStep: 1 | 2 | 3 = 1;
  setStep(step: 1 | 2 | 3): void {
    this.activeStep = step;
    // Importante: si el ag-grid está en el panel 3, cuando se muestre
    // puede necesitar un resize para ajustar columnas.
    // Lo implementaremos luego cuando hagamos la lógica real.
    queueMicrotask(() => {
      // evita saltos por focus/scroll al cambiar panel
      this.gridApiLiqDet?.stopEditing();
      this.gridApiPago?.stopEditing();
      this.gridApi?.stopEditing();

       if (step === 3) {
          this.generarAsientoAutomaticoDesdeLiquidacion();
       }

    });

  }
  ///caja
  private cajaActualSri: string | null = null;
  public getCajaActualSri(): string {
    return (this.cajaActualSri ?? '').trim();
  }

  //end paneles
  //no. comprobante 01012026
  private noCompKeySnackDuplicado: string | null = null;
  //cuenta banco  01012026
  private readonly CODIGO_ESPECIAL_BANCOS = 4;
  //end 
  // caabio her formas pago sri
  formasPagoSriCombo: { id: number; label: string; codigoSri: string; descripcion: string }[] = [];
  //CAMBIO HR 15012026
  private to01(v: any): 0 | 1 {
    if (v === true) return 1;
    if (v === false) return 0;
    if (v === 1 || v === '1') return 1;
    if (v === 0 || v === '0') return 0;
    const s = String(v ?? '').trim().toLowerCase();
    if (s === 'true' || s === 't' || s === 'yes' || s === 'si' || s === 'sí') return 1;
    if (s === 'false' || s === 'f' || s === 'no') return 0;
    const n = Number(v);
    if (!Number.isNaN(n)) return n === 1 ? 1 : 0;
    return 0;
  }

  private from01(v: any): boolean {
    return this.to01(v) === 1;
  }
  ///END

  // USUARIO
  usuarioActual = this.usuarioService.getUsuarioActual();
  nombreusuario = this.usuarioActual?.nombre_usuario ?? '';
  numdocGenerado: string | null = null; // numero documento generado

  ///validar hr para solo lectura en caso de editar
  soloLectura = signal(false);
  motivoSoloLectura = signal<string>('');
  isViewOnly = computed(() => this.soloLectura() === true);
  ////end
  //RECUPERA USUARIO DEL ASIENTO:
  usuarioAsientoNombre = signal<string>('');
  private usuarioAsientoIdCargado: number | null = null;
  //END

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
      { anio: getYearFromDateOnly(this.form.get('fechatransaccion')!.value) },//anio: getYearFromInput(this.form.get('fechatransaccion')!.value) },
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
    Validators.minLength(15),
    Validators.maxLength(15),
    Validators.pattern(/^\d{15}$/),
    //sriNoComprobanteValidator(), // 👈 custom
    sriNoComprobanteValidator({ maxEstab: 99, maxPto: 999 }), // ✅ aquí defines el rango d 999 999

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

  //tipo comprobante sri cambio hr 31122025 para guardar codigo
  //listaTiposCompSriCab: { id: number; label: string }[] = [];
  listaTiposCompSriCab: { id: number; cod: string; desc: string; label: string }[] = [];

  tipoCompSriCtrl = new FormControl<number | null>(0, [
    Validators.required,
    Validators.min(1),
  ]);

  ////
  autorizacionCtrl = new FormControl<string>('', [
    Validators.required,
    Validators.minLength(10),
    Validators.maxLength(49),
    Validators.pattern(/^\d+$/),
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

  ///cambio hr 15012026
    // ============================
  // PANEL 1: DETALLE LIQUIDACIÓN
  // ============================
  private gridApiLiqDet!: GridApi<LiquidacionCompraDetalleResponse>;
  liqDetRowData = signal<LiquidacionCompraDetalleResponse[]>([]);

  // Cabecera liquidación (totales y campos cabecera)
  liqCab = signal<LiquidacionCompraCabeceraResponse>({
    numliquida: null,
    caja: null,
    idCodContable: null,
    ruc: null,
    fecha: null,
    fechaing: null,
    observacion: null,
    subtotal: 0,
    coniva: 0,
    siniva: 0,
    iva: 0,
    total: 0,
    autorizacion: null,
    fechacad: null,
    idTipoCompSri: null,
    tipdoc: null,
    numdoc: null,
  });

  liqDetColumnDefs: ColDef<LiquidacionCompraDetalleResponse>[] = [
    {
      headerName: 'Acción',
      colId: 'accionLiqDet',
      width: 90,
      pinned: 'right',
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellRenderer: () => `
        <div class="acciones-cell">
          <button class="btn-icon danger" data-action="delete-liqdet" title="Eliminar">
            <img src="assets/icons/borrarfila.png" width="18" height="18" alt="Eliminar" />
          </button>
        </div>
      `,
    },
    { headerName: 'Linea', field: 'linea', width: 60, editable: false },
    { headerName: 'CodPro', field: 'codpro', width: 120, editable: true, hide: true, },
    { headerName: 'Descripción', field: 'descripcion', width: 260, editable: true, hide: true, },
    
    {
      headerName: 'Cuenta',
      field: 'idPlanCuentas',
      width: 200,
      editable: true,
      singleClickEdit: true,
      cellEditor: PlanCuentaCellEditorComponent,
      cellEditorParams: () => ({ cuentas: this.cuentas }),

      // Muestra "codigo - nombre" al usuario
      valueFormatter: (params) => {
        const v = params.value;
        if (v == null || v === '' || Number(v) === 0) return 'Seleccione...';
        const id = Number(v);
        const cta = this.cuentas.find((c) => c.id === id);
        return cta ? cta.label : String(v);
      },

      // ✅ CLAVE: cuando cambie idPlanCuentas, setea descripcion y ctaContable
      valueSetter: (params) => {
        const newId = Number(params.newValue ?? 0);
        params.data.idPlanCuentas = newId > 0 ? newId : null;

        const cta = this.cuentas.find((c) => Number(c.id) === newId);

        if (cta) {
          // cta.codigo = "110101-001"
          // cta.label  = "110101-001 - CAJA CHICA UIO"

          // ✅ ctaContable = código
          (params.data as any).ctaContable = cta.codigo ?? null;

          // ✅ descripcion = SOLO el nombre (después del guion)
          const nombre = this.extraerNombreCuenta(cta.label);
          (params.data as any).descripcion = nombre || (params.data as any).descripcion || null;

          // (OPCIONAL) si quieres que descripción sea "110101-001 - CAJA CHICA UIO"
          // (params.data as any).descripcion = cta.label;
        } else {
          // si no encuentra la cuenta, limpia
          (params.data as any).ctaContable = null;
          // no borro descripcion para no perder lo que el usuario escribió
        }
        // refrescar esas celdas en la misma fila
       const node = params.node;
        if (node) {
          params.api.refreshCells({
            rowNodes: [node],
            columns: ['descripcion', 'ctaContable', 'idPlanCuentas'],
            force: true,
          });
        } else {
          // fallback: si no hay node por tipado/ejecución, refresca columnas global
          params.api.refreshCells({
            columns: ['descripcion', 'ctaContable', 'idPlanCuentas'],
            force: true,
          });
        }
        return true;
      },
    },
    {
      headerName: 'Cantidad',
      field: 'cantidad',
      width: 100,
      editable: true,
      //valueParser: numberParser,
      valueSetter: this.valueSetterLiqDetCalc('cantidad'),
      type: 'rightAligned',
      hide: true,
    },
    {
      headerName: 'PVP Unit',
      field: 'pvpunit',
      width: 100,
      editable: true,
      //valueSetter: valueSetterDot2,
      valueSetter: this.valueSetterLiqDetCalc('pvpunit'),
      valueFormatter: twoDecimalsDotFormatter,
      suppressKeyboardEvent: blockComma,
      type: 'rightAligned',
    },

    {
      headerName: 'Porcentaje IVA',
      field: 'idPorIva',
      width: 100,
      editable: true,
      singleClickEdit: true,
      cellEditor: PorcentajeIvaCellEditorComponent,
      cellEditorParams: () => ({
        porcentajesIva: this.porcentajesIva, // catálogo ya cargado en tu componente
      }),
      valueFormatter: (params) => {
        const v = params.value;
        if (v == null || v === '' || Number(v) === 0) return 'Seleccione...';
        const id = Number(v);
        const item = this.porcentajesIva.find((p) => p.id === id);
        return item ? item.label : String(v);
      },

      // ✅ CLAVE: cuando cambia idPorIva, setea también "porcentaje" automáticamente
      valueSetter: (params) => {
        const id = Number(params.newValue ?? 0);
        const item = this.porcentajesIva.find((p) => p.id === id);

        if (item) {
          (params.data as any).idPorIva = item.id;
          (params.data as any).porcentaje = Number(item.porcentaje ?? 0);

          // ✅ al seleccionar %IVA, el IVA deja de ser manual y se recalcula
          //this.markIvaManual(params.data, false);
          this.recalcularIvaYTotalDesdePorcentaje(params.data);
        } else {
          (params.data as any).idPorIva = null;
          (params.data as any).porcentaje = null;

          // sin % => no forzamos IVA, solo recalculamos total con el IVA actual
          this.recalcularTotalConIvaActual(params.data);
        }
        this.refreshRowLiqDet(params.api, params.node, ['idPorIva', 'porcentaje', 'iva', 'total']);
        // ✅ recalcular totales cabecera
        this.recalcularCabeceraLiquidacion();
        return true;
      },

    },
    
    {
      headerName: 'IVA',
      field: 'iva',
      width: 80,
      editable: (p) => {
        const porc = Number(p.data?.porcentaje ?? 0);
        // Si hay porcentaje, no se edita IVA (se calcula)
        return !(porc > 0);
      },
      valueSetter: this.valueSetterLiqDetCalc('iva'),
      valueFormatter: twoDecimalsDotFormatter,
      suppressKeyboardEvent: blockComma,
      type: 'rightAligned',
    },
    
    {
      headerName: 'Total',
      field: 'total',
      width: 120,
      //editable: true,
      editable: false, // ✅ Calculado automáticamente
      //valueSetter: valueSetterDot2,
      valueFormatter: twoDecimalsDotFormatter,
      //suppressKeyboardEvent: blockComma,
      type: 'rightAligned',
    },

    {
      headerName: 'Bien',
      colId: 'bien',
      field: 'bien',
      width: 50,
      editable: false, // lo manejamos por click
      suppressHeaderMenuButton: true,
      cellClass: 'chk-cell',
      cellRenderer: (p: any) => {
        const on = this.to01(p.data?.bien) === 1;
        return `<span class="big-chk ${on ? 'on' : ''}" data-field="bien" aria-label="Bien" role="checkbox" aria-checked="${on}"></span>`;
      },
    },
    {
      headerName: 'Servicio',
      colId: 'servicio',
      field: 'servicio',
      width: 50,
      editable: false,
      suppressHeaderMenuButton: true,
      cellClass: 'chk-cell',
      cellRenderer: (p: any) => {
        const on = this.to01(p.data?.servicio) === 1;
        return `<span class="big-chk ${on ? 'on' : ''}" data-field="servicio" aria-label="Servicio" role="checkbox" aria-checked="${on}"></span>`;
      },
    },
    { headerName: 'Cta Contable', field: 'ctaContable', width: 160, editable: true,hide: true, },
    { headerName: 'Caja', field: 'caja', width: 120, editable: true },
    {
      headerName: '% IVA',
      field: 'porcentaje',
      width: 120,
      editable: false, // ✅ se llena desde idPorIva
      type: 'rightAligned',
      valueFormatter: (params) => {
        const val = params.value;
        if (val == null || val === '') return '';
        const n = Number(val);
        return Number.isNaN(n) ? '' : `${n.toFixed(2)} %`;
      },
      hide: true,
    },

  ];

  onGridReadyLiqDet(e: GridReadyEvent<LiquidacionCompraDetalleResponse>): void {
    this.gridApiLiqDet = e.api;
    //añadir codigo
    // Fuerza render con lo que ya exista en el signal
    queueMicrotask(() => {
      this.gridApiLiqDet?.sizeColumnsToFit();
    });

  }

  agregarLineaLiqDet(): void {
    // ✅ bloquear por solo lectura / procesos
    if (this.isViewOnly()) {
      const msg = this.motivoSoloLectura().trim() || 'Este asiento está en modo solo lectura.';
      this.snack.open(msg, 'Cerrar', { duration: 3500, horizontalPosition: 'right', verticalPosition: 'top' });
      return;
    }
    if (this.isReadOnly()) return;

    // ✅ detener edición antes de validar/agregar
    this.gridApiLiqDet?.stopEditing();
    // ==========================
    // ✅ Validación mínima cabecera (Panel 1)
    //    (ajústala si quieres menos/más campos)
    // ==========================
    const idZona = Number(this.form.get('idZona')?.value || 0);
    const idAux = Number(this.auxiliarSeleccionadoCtrl.value || 0);
    const nroComp = (this.nroComprobanteCtrl.value || '').toString().trim();
    const idSust = Number(this.sustentoTribCtrl.value || 0);
    const idTipoComp = Number(this.tipoCompSriCtrl.value || 0);
    const aut = (this.autorizacionCtrl.value || '').toString().trim();
    const fCad = (this.fechacaducaCtrl.value || '').toString().trim();
    const fVen = (this.fechavencimientoCtrl.value || '').toString().trim();

    const errores: string[] = [];

    // ✅ Misma validación (sin TipoAsiento; puedes incluirConcepto si quieres exigirlo)
    if (!this.validarCabeceraParaAgregarLinea({ incluirTipoAsiento: false, incluirConcepto: false })) return;
      if (!this.validarDetalleLiqDetAntesDeAgregarLinea()) return;

      // ✅ (Opcional) Validación duplicado antes de agregar (solo NUEVO)
      // Si NO quieres esto en panel 1, elimina este bloque y el subscribe.
      this.validarNoComprobanteAntesDeAgregarLinea$().subscribe((ok) => {
        if (!ok) {
          this.snack.open(
            'El No. Comprobante ya existe para este proveedor. Verifique y cambie el número.',
            'Cerrar',
            { duration: 4500, horizontalPosition: 'right', verticalPosition: 'top' }
          );
          return;
        }

      // ==========================
      // ✅ Agregar fila al grid Panel 1
      // ==========================
      const items = this.liqDetRowData() ?? [];
      const nextLinea = items.length ? Math.max(...items.map(x => Number(x.linea || 0))) + 1 : 1;

      const nueva: LiquidacionCompraDetalleResponse = {
        linea: nextLinea,
        codpro: String(nextLinea),
        descripcion: null,
        cantidad: 1,
        pvpunit: 0,
        iva: 0,
        total: 0,
        bien: 0,
        servicio: 0,
        idPlanCuentas: null,
        ctaContable: null,
        caja: this.getCajaActualSri(),//'001', /// es hasta realizar el control de cajas usuario 15012026 igual en cabecera esta quemado
        idPorIva:null,
        porcentaje:null,
      };

      // 1) update signal (estado)
      this.liqDetRowData.set([...items, nueva]);

      // 2) update ag-grid por transacción (render inmediato, 100% confiable)
      if (this.gridApiLiqDet) {
        this.gridApiLiqDet.applyTransaction({ add: [nueva] });

        queueMicrotask(() => {
          const lastIndex = (this.liqDetRowData().length ?? 1) - 1;
          this.gridApiLiqDet.ensureIndexVisible(lastIndex);

          // Empieza editando en CodPro (o cambia a la col que prefieras)
          this.gridApiLiqDet.startEditingCell({
            rowIndex: lastIndex,
            colKey: 'codpro',
          });
        });
      }
      // ✅ recalcular totales cabecera
      this.recalcularCabeceraLiquidacion();
    });
  }

  eliminarLineaLiqDet(row: LiquidacionCompraDetalleResponse): void {
    const items = this.liqDetRowData() ?? [];
    const idx = items.indexOf(row);
    if (idx < 0) return;

    const nuevo = items.filter((x) => x !== row);
    nuevo.forEach((d, i) => (d.linea = i + 1));
    this.liqDetRowData.set(nuevo);
    this.recalcularCabeceraLiquidacion();
  }

  /*
  onCellClickedLiqDet(evt: CellClickedEvent<LiquidacionCompraDetalleResponse>): void {
    
     // ✅ Toggle grande Bien/Servicio (click en la celda o en el cuadrito)
      if (evt.colDef?.colId === 'bien' || evt.colDef?.colId === 'servicio') {
        const data = evt.node?.data;
        if (!data) return;

        const field = evt.colDef.colId as 'bien' | 'servicio';
        const other = field === 'bien' ? 'servicio' : 'bien';

        // Toggle 0/1
        const newVal: 0 | 1 = this.to01(data[field]) === 1 ? 0 : 1;
        data[field] = newVal;

        // ✅ Exclusión mutua
        if (newVal === 1) data[other] = 0;

        // Refrescar solo esas 2 celdas de la fila
        this.gridApiLiqDet?.refreshCells({
          rowNodes: [evt.node],
          columns: ['bien', 'servicio'],
          force: true,
        });

        return; // importante: no seguir con lógica de delete
      }
    
    if (evt?.colDef?.colId !== 'accionLiqDet') return;
    const button = (evt.event?.target as HTMLElement)?.closest('button');
    if (!button) return;

    const action = button.getAttribute('data-action');
    if (action === 'delete-liqdet' && evt.node?.data) {
      this.eliminarLineaLiqDet(evt.node.data);
    }
  }

  */

  ///////valida 0 y 1 al grabar bien o servicio
  onCellClickedLiqDet(evt: CellClickedEvent<LiquidacionCompraDetalleResponse>): void {
    // ✅ Toggle Bien/Servicio
    if (evt.colDef?.colId === 'bien' || evt.colDef?.colId === 'servicio') {
      const node = evt.node;
      const data = node?.data;
      if (!data) return;

      const field = evt.colDef.colId as 'bien' | 'servicio';
      const other: 'bien' | 'servicio' = field === 'bien' ? 'servicio' : 'bien';

      // Toggle (0/1) usando tu helper
      const newVal: 0 | 1 = this.to01((data as any)[field]) === 1 ? 0 : 1;

      // 1) Actualiza el objeto del grid
      (data as any)[field] = newVal;
      if (newVal === 1) (data as any)[other] = 0; // exclusión mutua

      // 2) ✅ MUY IMPORTANTE: sincroniza el signal INMUTABLEMENTE
      this.syncLiqDetRowDataFromNode(data);

      // 3) Refresca las celdas visibles
      this.gridApiLiqDet?.refreshCells({
        rowNodes: [node],
        columns: ['bien', 'servicio'],
        force: true,
      });

      return;
    }

    // ✅ delete
    if (evt?.colDef?.colId !== 'accionLiqDet') return;
    const button = (evt.event?.target as HTMLElement)?.closest('button');
    if (!button) return;

    const action = button.getAttribute('data-action');
    if (action === 'delete-liqdet' && evt.node?.data) {
      this.eliminarLineaLiqDet(evt.node.data);
    }
  }

  /** Sincroniza el signal liqDetRowData (inmutable) tomando la fila modificada */
  private syncLiqDetRowDataFromNode(row: LiquidacionCompraDetalleResponse): void {
    const items = this.liqDetRowData() ?? [];
    const linea = Number((row as any).linea ?? 0);

    const idx = items.findIndex(x => Number((x as any).linea ?? 0) === linea);
    if (idx < 0) return;

    const bien = this.to01((row as any).bien);
    const servicio = this.to01((row as any).servicio);

    const nuevo = items.map((x, i) =>
      i === idx
        ? ({ ...x, bien, servicio } as any)
        : x
    );

    this.liqDetRowData.set(nuevo);
  }
  ////////////////////////

  onCellValueChangedLiqDet(): void {
    this.recalcularCabeceraLiquidacion();
  }

  // ============================
  // PANEL 2: FORMAS DE PAGO
  // ============================
  private gridApiPago!: GridApi<LiquidacionCompraFormaPagoResponse>;
  formasPagoRowData = signal<LiquidacionCompraFormaPagoResponse[]>([]);
  // ✅ TOTAL FORMAS DE PAGO
  // PANEL 2: FORMAS DE PAGO
  totalFormasPago = computed(() => {
    const items = this.formasPagoRowData() ?? [];
    const total = items.reduce((acc, x) => acc + (Number(x.valor) || 0), 0);
    return Number(total.toFixed(2));
  });

  /*
  totalFormasPago = signal<number>(0);
    
  private recalcularTotalFormasPago(): void {
    const items = this.formasPagoRowData() ?? [];
    const total = items.reduce((acc, x) => acc + (Number(x.valor) || 0), 0);
    this.totalFormasPago.set(Number(total.toFixed(2)));
  }
  */
  //formas pago

  formaPagoColumnDefs: ColDef<LiquidacionCompraFormaPagoResponse>[] = [
    {
      headerName: 'Acción',
      colId: 'accionPago',
      width: 90,
      pinned: 'right',
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellRenderer: () => `
        <div class="acciones-cell">
          <button class="btn-icon danger" data-action="delete-pago" title="Eliminar">
            <img src="assets/icons/borrarfila.png" width="18" height="18" alt="Eliminar" />
          </button>
        </div>
      `,
    },
    //{ headerName: 'Id Forma Pago SRI', field: 'idFormaPagoSri', width: 160, editable: true, valueParser: numberParser },    
    {
      headerName: 'Forma Pago SRI',
      field: 'idFormaPagoSri',
      width: 350,
      editable: true,
      singleClickEdit: true,
      cellEditor: FormapagoSriCellEditorComponent,
      cellEditorPopup: true,
      cellEditorParams: () => ({ formasPagoSri: this.formasPagoSriCombo }),

      valueFormatter: (params: any) => {
        const d = params.data as any;

        const id = Number(d?.idFormaPagoSri ?? 0);
        if (id > 0) {
          const fp = this.formasPagoSriCombo.find(x => Number(x.id) === id);
          if (fp) return fp.label;

          // fallback si el combo aún no cargó:
          const cod = String(d?.codigofpago ?? '').trim();
          return cod ? cod : String(id);
        }

        const cod = String(d?.codigofpago ?? '').trim();
        if (cod) {
          const fp2 = this.formasPagoSriCombo.find(x => String(x.codigoSri).trim() === cod);
          return fp2 ? fp2.label : cod;
        }
        return 'Seleccione...';
      },

      valueSetter: (params: any) => {
        const d = params.data as any;

        const id = Number(params.newValue ?? 0);
        const fp = id > 0 ? this.formasPagoSriCombo.find(x => Number(x.id) === id) : null;

        if (fp) {
          d.idFormaPagoSri = Number(fp.id);
          d.codigofpago = String(fp.codigoSri).trim() || null;
        } else {
          d.idFormaPagoSri = null;
          d.codigofpago = null;
        }

        params.api.refreshCells({
          rowNodes: [params.node],
          columns: ['idFormaPagoSri', 'codigofpago'],
          force: true,
        });

        return true;
      },
    },
    {
      headerName: 'Código',
      field: 'codigofpago',
      width: 150,
      editable: false,
    },
    {
      headerName: 'Valor',
      field: 'valor',
      width: 140,
      editable: true,
      valueSetter: valueSetterDot2,
      valueFormatter: twoDecimalsDotFormatter,
      suppressKeyboardEvent: blockComma,
      type: 'rightAligned',
    },
    { headerName: 'Plazo', field: 'plazo', width: 160, editable: true, valueParser: numberParser },

  ];

  onGridReadyPago(e: GridReadyEvent<LiquidacionCompraFormaPagoResponse>): void {
    this.gridApiPago = e.api;
    this.cargarFormasPagoSri(); // asegura repintado si el grid se creó antes
    //this.recalcularTotalFormasPago(); // ✅ recalculo del formas pago
     queueMicrotask(() => {
        this.gridApiPago?.sizeColumnsToFit();
      });
  }

  agregarPago(): void {

    if (this.isReadOnly()) return;

      const totalRows = this.gridApiPago
      ? this.gridApiPago.getDisplayedRowCount()
      : (this.formasPagoRowData() ?? []).length;

      if (totalRows >= 1) {
        // ✅ NO abrir editor, NO enfocar
        this.dialog.open(CustomMessageBoxComponent, {
          width: '420px',
          data: {
            title: 'Forma de pago',
            message: 'Solo se permite registrar una forma de pago. Modifique la línea existente.',
            type: 'info', ///'warning',
            showCancel: false,     // ✅ solo Aceptar
            okText: 'Aceptar',     // opcional
          },
        });
        return;
      }

    const plazoNum = Number(this.plazoCtrl.value ?? 0);  
    const nuevo: LiquidacionCompraFormaPagoResponse = {
      idFormaPagoSri: null,
      codigofpago: null,
      valor: Number(this.liqCab()?.total ?? 0),//this.liqCab().total,/// agrega el valor del total,
      plazo: Number.isFinite(plazoNum) ? plazoNum : 0, // 0,
    };

    //this.formasPagoRowData.set([...(this.formasPagoRowData() ?? []), nuevo]);
    this.formasPagoRowData.set([nuevo]);
    if (this.gridApiPago) {
      this.gridApiPago.applyTransaction({ add: [nuevo] });

      queueMicrotask(() => {
        //const lastIndex = (this.formasPagoRowData().length ?? 1) - 1;
        //this.gridApiPago.ensureIndexVisible(lastIndex);
        //this.gridApiPago.startEditingCell({ rowIndex: lastIndex, colKey: 'idFormaPagoSri' });
        this.gridApiPago.ensureIndexVisible(0);
        this.gridApiPago.startEditingCell({ rowIndex: 0, colKey: 'idFormaPagoSri' });

      });
    }


  }

  eliminarPago(row: LiquidacionCompraFormaPagoResponse): void {
    const items = this.formasPagoRowData() ?? [];
    const idx = items.indexOf(row);
    if (idx < 0) return;

    this.formasPagoRowData.set(items.filter((x) => x !== row));
    //  recalcular
    //this.recalcularTotalFormasPago();
    this.gridApiPago?.applyTransaction({ remove: [row] });

  }

  onCellClickedPago(evt: CellClickedEvent<LiquidacionCompraFormaPagoResponse>): void {
    if (evt?.colDef?.colId !== 'accionPago') return;
    const button = (evt.event?.target as HTMLElement)?.closest('button');
    if (!button) return;

    const action = button.getAttribute('data-action');
    if (action === 'delete-pago' && evt.node?.data) {
      this.eliminarPago(evt.node.data);
    }
  }

  // ============================
  // RECÁLCULO CABECERA LIQUIDACIÓN
  // ============================
  private recalcularCabeceraLiquidacion(): void {
    const det = this.liqDetRowData() ?? [];

    const sumIva = det.reduce((a, x) => a + (Number(x.iva) || 0), 0);
    const sumTotal = det.reduce((a, x) => a + (Number(x.total) || 0), 0);
    const subtotal = Number((sumTotal - sumIva).toFixed(2));

    // Heurística simple: conIVA = suma de (total - iva) donde iva>0, sinIVA donde iva==0
    const coniva = Number(
      det.reduce((a, x) => a + ((Number(x.iva) || 0) > 0 ? (Number(x.total) || 0) - (Number(x.iva) || 0) : 0), 0).toFixed(2)
    );
    const siniva = Number(
      det.reduce((a, x) => a + ((Number(x.iva) || 0) <= 0 ? (Number(x.total) || 0) : 0), 0).toFixed(2)
    );

    const cab = this.liqCab();

    this.liqCab.set({
      ...cab,
      subtotal,
      coniva,
      siniva,
      iva: Number(sumIva.toFixed(2)),
      total: Number(sumTotal.toFixed(2)),
    });
  }

  //end cambio

  ///

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
    this.noCompKeySnackDuplicado = null; // no. comprobante 01012026
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
      
      //cambio hr 01012026 cuenta bancos 0-NINGUNO
      /*
      cellEditorParams: (params: any) => {
        const row = params.data as DetalleAsientoResponse;
        const idMov = Number(row.idMovBancario || 0);

        // Por defecto NO filtramos (mostramos todas las cuentas)
        let condicion: number | null = null;

        if (idMov > 0) {
          const mov = this.movimientosBancarios.find((m) => m.id === idMov);
          if (mov && mov.condicion != null && Number(mov.condicion) > 0) {
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
      */
      cellEditorParams: (params: any) => {
        const row = params.data as DetalleAsientoResponse;
        return {
          // ✅ aquí entra la regla: si es '0' excluye bancos; si no, aplica condicion
          cuentas: this.obtenerCuentasFiltradasPorMovimiento(row),
        };
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
    @Optional() public dialogRef: MatDialogRef<LiquidacionCompraFormComponent> | null,
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data: {
      modo?: 'nuevo' | 'editar' | 'plantilla';     //Se agrega plantilla
      id?: number;
      facturaPlantilla?: AsientoContableResponse;
      soloLectura?: boolean; //cambio hr solo de lectura
      motivoSoloLectura?: string; /// cambio hr solo de lectura
    } | null,
    private tipoasientoservice: TipoAsientoService,
    private facturasService: FacturasProveedorService,
    private liquidacionCompraService: LiquidacionCompraService,
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
    private destroyRef: DestroyRef,  // numerocomprobante 01012026
    private formaPagoSriService:FormaPagoSriService,
    private autorizacionCajaService:AutorizacionCajaService,
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
        const activos = (list ?? []).filter(p => this.isIvaActivo((p as any).estado));

        this.porcentajesIva = activos.map((p) => ({
          id: Number(p.idPorIva),
          codigoIva: Number(p.codigoIva),
          descripcion: (p.descripcion ?? '').toString().trim(),
          porcentaje: Number(p.porcentaje ?? 0),
          estado: true,
          label: `${(p.descripcion ?? '').toString().trim()} (${Number(p.porcentaje ?? 0)}%)`,
        }));

        // refrescamos la columna si ya existe gridApi
        this.gridApi?.refreshCells({
          force: true,
          columns: ['idPorIva', 'porcentaje'],
        });

        //para refrescar detalleliquidacion iva 15012026
        // ✅ refrescar panel 1 (detalle liquidación)
        this.gridApiLiqDet?.refreshCells({
            force: true,
            columns: ['idPorIva', 'porcentaje'],
        });
        /// end 
      },
      error: (err) => {
        console.error('Error cargando porcentajes de IVA', err);
        this.porcentajesIva = [];
        this.gridApi?.refreshCells({ force: true, columns: ['idPorIva', 'porcentaje'] });
        //cambio hr 15012026 iva detalleliquidcion
        this.gridApiLiqDet?.refreshCells({ force: true, columns: ['idPorIva', 'porcentaje'] });
      },
    });
  }

  private cargarFormasPagoSri(): void {
  this.formaPagoSriService.getAll().subscribe({
    next: (resp: any) => {
      const data = Array.isArray(resp) ? resp : (resp?.data ?? []);

      this.formasPagoSriCombo = (data ?? []).map((x: any) => {
        const codigo = String(x.codigoSri ?? '').trim();
        const desc = String(x.descripcion ?? '').trim();

        return {
          id: Number(x.idFormaPagoSri ?? x.id ?? 0),
          codigoSri: codigo,
          descripcion: desc,
          label: codigo ? `${codigo} - ${desc}` : desc,
        };
      });

      // Refrescar SOLO lo necesario (formatter + la columna código)
      this.gridApiPago?.refreshCells({
        force: true,
        columns: ['idFormaPagoSri', 'codigofpago'],
      });
    },
    error: (err) => {
      console.error('Error cargando FormasPago SRI', err);
      this.formasPagoSriCombo = [];
      this.gridApiPago?.refreshCells({
        force: true,
        columns: ['idFormaPagoSri', 'codigofpago'],
      });
    },
  });
}

  ////

  ngOnInit(): void {
    this.buildForm();

    //cambio hr 31122025
    this.syncFechaTransaccionConIngreso();
    // Regla NC: por defecto bloqueado hasta que sea 04 - Nota de crédito
    this.docRelacionadoCtrl.disable({ emitEvent: false });
    this.autorizacionRelacionadoCtrl.disable({ emitEvent: false });
    this.fechaCadRelacionadoCtrl.disable({ emitEvent: false });

    // Al cambiar Tipo Comprobante, habilitar/bloquear campos NC
    this.tipoCompSriCtrl.valueChanges.subscribe(() => {
      this.aplicarReglaCamposNC();
    });
    //end cambio

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

    //No. Comprobante 01012026
    this.initAutoValidacionNoComprobante();
    ////

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
    this.cargarFormasPagoSri(); //cargar formas pago sri

    //autorizacion sri
    this.initAutoFillNoComprobanteYClave();

    const modoData = this.data?.modo;
    const plantilla = this.data?.facturaPlantilla;

    if (modoData === 'plantilla' && plantilla) {
      //MODO PLANTILLA: Cargar factura pre-configurada
      this.modo.set('plantilla');
      this.cargarPlantilla(plantilla);
      ///ID USUARIO RECUPERADO
      this.usuarioAsientoNombre.set('');
      this.usuarioAsientoIdCargado = null;
      ////

    } else {
      //  Si NO es plantilla, verificar id para editar/nuevo
      const idDialog = this.data?.id ?? 0;
      const idRoute = Number(this.route.snapshot.paramMap.get('id') ?? 0);
      const id = idDialog || idRoute;

      if (id > 0) {
        // MODO EDITAR
        this.modo.set('editar');
        this.cargarAsiento(id);
        //modo edicion hr cambio solo de lectura
        if (this.data?.soloLectura) {
          this.soloLectura.set(true);
          this.motivoSoloLectura.set(this.data?.motivoSoloLectura ?? '');
        }
        //

      } else {
        // MODO NUEVO
        this.modo.set('nuevo');
        //const empty = createEmptyAsientoContableResponse();
        //this.syncUsuarioEmpresa();
        //this.setFormFromHeader(empty);
        this.rowData.set([]);
        this.form.patchValue({ modulo: 6 }, { emitEvent: false }); ///modulo es 6
        this.form.patchValue(
          { anio: getYearFromInput(this.form.get('fechatransaccion')!.value) },
          { emitEvent: false }
        );

        this.setFechasNowLocal();
        this.syncUsuarioEmpresa();

        this.form
          .get('fechatransaccion')!
          .valueChanges.pipe(
            startWith(this.form.get('fechatransaccion')!.value),
            //map(getYearFromInput), estaba anterior hr
            map(getYearFromDateOnly),
            distinctUntilChanged()
          )
          .subscribe((y) => {
            this.form.patchValue({ anio: y }, { emitEvent: false });
          });

        this.syncUsuarioEmpresa();
      }
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

  private setFechasNowLocal(): void {
    const now = new Date();
    const nowIso = formatLocalIso(now);     // yyyy-MM-ddTHH:mm:ss (LOCAL)
    const today = dateOnlySafe(nowIso);     // yyyy-MM-dd

    this.form.patchValue(
      {
        fechaingreso: nowIso,
        fechatransaccion: today,
        anio: today.substring(0, 4),
      },
      { emitEvent: false }
    );
  }

  private buildForm(): void {
    //const ahora = new Date();
    //const nowIso = formatLocalIso(new Date());
    //const todayDate = formatLocalDateOnly(ahora); // solo fecha (yyyy-MM-dd)

    const ahora = new Date();
    const nowIso = formatLocalIso(ahora);        // yyyy-MM-ddTHH:mm:ss (LOCAL)
    const todayDate = dateOnlySafe(nowIso);      // yyyy-MM-dd (SOLO FECHA, SIN DatePipe)

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
      modulo: [6], ///modulo es 6
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
      //fechatransaccion: h.fechatransaccion ? normalizeToLocalDate(h.fechatransaccion) : null, estaba anterior
      fechatransaccion: h.fechatransaccion ? dateOnlySafe(h.fechatransaccion) : null,
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
      modulo: h.modulo != null ? Number(h.modulo) : 6, ///modulo es 6
    });
  }

  private cargarAsiento(idCabMaestro: number): void {
    this.loading.set(true);
    //this.facturasService.getById(idCabMaestro).subscribe({
    this.liquidacionCompraService.getById(idCabMaestro).subscribe({
      next: (resp) => {
        this.setFormFromHeader(resp);

        ///USUARIO RECUPERADO
        //SOLO EDITAR: recuperar nombre del usuario del asiento (transacción)
        const idUserAsiento =
        Number((resp as any)?.idUsuario ?? (resp as any)?.IdUsuario ?? this.form.get('idUsuario')?.value ?? 0);
        this.cargarUsuarioAsientoNombre(idUserAsiento);
        /// END

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
          this.aplicarReglaCamposNC({ forzar: true }); ///cambio hr 31122025 añadir
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
  /**
 * Bloquea: Zona, Proveedor, Tipo Comprobante SRI, Sustento Tributario
 * Permite editar: No.Comprobante, Autorización, Fechas, Observación, Debe/Haber
 */
  private cargarPlantilla(plantilla: AsientoContableResponse): void {
    // Setear la cabecera (con campos limpios ya viene en plantilla)
    this.setFormFromHeader(plantilla);

    // Cargar las líneas del detalle (ya vienen con debe/haber en 0)
    this.rowData.set(plantilla.detalles ?? []);

    // Sincronizar usuario y empresa
    this.syncUsuarioEmpresa();

    // Extraer valores de la primera línea para mostrar en cabecera
    const primeraLinea = plantilla.detalles && plantilla.detalles.length ? plantilla.detalles[0] : null;

    if (primeraLinea) {
      // ===== PROVEEDOR (MEJORADO) =====
      const idAux = Number(primeraLinea.idCodContable || 0);

      if (idAux > 0) {
        // 🔹 Setear el ID del auxiliar
        this.auxiliarSeleccionadoCtrl.setValue(idAux, { emitEvent: false });

        // 🔹 Crear objeto temporal para el autocomplete usando datos de la plantilla
        const razonSocial = plantilla.beneficiario || primeraLinea.beneficiario || '';

        // Primero intentar buscar en auxiliaresGrid (si ya se cargó)
        let proveedorObj: ProveedorItem | undefined = this.auxiliaresGrid.find(a => a.id === idAux) as any;

        // Si no está en el grid, crear objeto temporal con los datos que tenemos
        if (!proveedorObj && razonSocial) {
          proveedorObj = {
            id: idAux,
            label: `${idAux} - ${razonSocial}`,
            razon: razonSocial,
            plazo: null,
          } as ProveedorItem;
        }

        // Setear en el autocomplete
        if (proveedorObj) {
          this.proveedorCtrl.setValue(proveedorObj, { emitEvent: false });

          // Asegurar que el beneficiario esté en el form
          this.form.patchValue({ beneficiario: razonSocial }, { emitEvent: false });
        }
      }

      // ===== SUSTENTO TRIBUTARIO =====
      const idSust = Number(primeraLinea.idSustentoTrib || 0);
      if (idSust > 0) {
        this.sustentoTribCtrl.setValue(idSust, { emitEvent: false });
      }

      // ===== TIPO COMPROBANTE SRI =====
      const idTipoComp = Number(primeraLinea.idTipoCompSri || 0);
      if (idTipoComp > 0) {
        this.tipoCompSriCtrl.setValue(idTipoComp, { emitEvent: false });
        this.aplicarReglaCamposNC({ forzar: true });//cambio hr 31122025 ñadir
      }
    }

    // BLOQUEAR SOLO LOS 4 CAMPOS ESPECÍFICOS
    this.form.get('idZona')?.disable();              //  Zona bloqueada
    this.auxiliarSeleccionadoCtrl.disable();         //  Proveedor (ID) bloqueado
    this.proveedorCtrl.disable();                    //  Proveedor (autocomplete) bloqueado
    this.tipoCompSriCtrl.disable();                  //  Tipo Comprobante bloqueado
    this.sustentoTribCtrl.disable();                 //  Sustento Trib. bloqueado

    //Forzar refresco del grid
    this.refrescarColumnasDetalle();

    console.log('Plantilla cargada - Proveedor:', this.proveedorCtrl.value);
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

  ///plan de cuentas solo esrmovimiento=1
  private cargarPlanCuentas(): void {
    const empresaId = this.usuarioActual?.id_empresa ?? 0;

    this.planCuentasService.getAll({ idEmpresa: empresaId, estado: 'A' }).subscribe({
      next: (list: PlanCuenta[]) => {
        const fuente = list || [];

        // ✅ Filtrar SOLO cuentas de movimiento
        const soloMovimiento = fuente.filter((c: any) => {
          const v =
            c?.EsMovimiento ??
            c?.esMovimiento ??
            c?.es_movimiento ??
            c?.Movimiento ??
            c?.movimiento;

          return Number(v) === 1;
        });

        this.cuentas = soloMovimiento.map((c: any) => {
          let porcentaje: number | null = null;

          // porcentaje retención (si viene en backend)
          const posibles = [c?.PorcentajeRetencion, c?.Porcentaje, c?.porcentaje];
          for (const p of posibles) {
            if (p !== null && p !== undefined && p !== '') {
              const n = Number(p);
              if (!isNaN(n) && n > 0) {
                porcentaje = n;
                break;
              }
            }
          }

          // fallback: leer % del texto
          if (porcentaje === null) {
            const texto = `${c?.CuentaPresentacion ?? ''} ${c?.NombreCuenta ?? ''}`;
            const match = texto.match(/(\d+([.,]\d+)?)\s*%/);
            if (match) {
              const n = parseFloat(match[1].replace(',', '.'));
              if (!isNaN(n) && n > 0) porcentaje = n;
            }
          }

          return {
            id: Number(c?.IdPlanCuentas ?? 0),
            label: `${(c?.CuentaPresentacion ?? '').toString().trim()} - ${(c?.NombreCuenta ?? '').toString().trim()}`,
            codigo: (c?.CuentaPresentacion ?? '').toString().trim(),
            idCodigoEspecial:
              c?.IdCodigoEspecial != null && Number(c.IdCodigoEspecial) > 0 ? Number(c.IdCodigoEspecial) : null,
            porcentajeRetencion: porcentaje,
          };
        });

        this.gridApi?.refreshCells({ force: true, columns: ['idPlanCuentas'] });
      },
      error: (err) => console.error('Error cargando plan de cuentas', err),
    });
  }

  /////

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
              movimiento: (m.Movimiento ?? '').toString().trim(),
              descripcion: (m.Descripcion ?? '').toString().trim(),
              label: `${(m.Movimiento ?? '').toString().trim()} - ${(m.Descripcion ?? '').toString().trim()}`,
              condicion: !isNaN(cond as any) && (cond as number) > 0 ? cond : null,
            };
          })
          // ORDENAR SOLO POR DESCRIPCION
          .sort((a, b) =>
            (a.descripcion || '').localeCompare((b.descripcion || ''), 'es', { sensitivity: 'base' })
          );

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
        const mapped = (list ?? []).map((t: any) => {
        const cod = (t.Codtipcomp ?? '').toString().trim();
        const desc = (t.Destipcomp ?? '').toString().trim();
        return {
          id: Number(t.IdTipoCompSri),
          cod,
          desc,
          label: `${cod} - ${desc}`,
        };
      });
        /*
        this.listaTiposCompSriCab = (list ?? []).map((t: any) => {
          const cod = (t.Codtipcomp ?? '').toString().trim();   // "04"
          const desc = (t.Destipcomp ?? '').toString().trim();  // "Nota de crédito"
          return {
            id: Number(t.IdTipoCompSri),
            cod,
            desc,
            label: `${cod} - ${desc}`,
          };
        });
        */

        this.listaTiposCompSriCab = mapped.filter(x => x.cod === '03');
        const item03 = this.listaTiposCompSriCab[0];
        const ctrl = this.form?.get('tipoComprobante'); // ajusta el nombre real

        if (item03 && ctrl) {
          ctrl.setValue(item03.cod, { emitEvent: false });
          ctrl.disable({ emitEvent: false }); // ✅ bloquear
        }
        // Reaplicar regla una vez que ya existe el catálogo
        this.aplicarReglaCamposNC({ forzar: true });
      },
      error: (err) => console.error('Error cargando tipos comprobante SRI (cabecera)', err),
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
     
      ///validacion retenciones 31122025
      const movCode = this.getMovCode(f);
      const permiteCeroCero = ['RFB', 'RFS'].includes(movCode);
      ///
      if (idLocal <= 0) errores.push(`Línea ${linea}: debe seleccionar el Local.`);
      if (idMovBancario <= 0) errores.push(`Línea ${linea}: debe seleccionar el Tipo de Movimiento (distinto de NINGUNO).`);
      if (idPlanCuentas <= 0) errores.push(`Línea ${linea}: debe seleccionar la Cuenta Contable.`);
      if (idAuxiliar <= 0) errores.push(`Línea ${linea}: debe seleccionar el Auxiliar Contable.`);
      //validacion retenciones 31122025
      if (!permiteCeroCero && debe <= 0 && haber <= 0) {
        errores.push(`Línea ${linea}: debe ingresar un valor en Debe o en Haber.`);
      }
      if (debe > 0 && haber > 0) {
        errores.push(`Línea ${linea}: no puede tener valores en Debe y Haber al mismo tiempo.`);
      }
      //if (debe <= 0 && haber <= 0) errores.push(`Línea ${linea}: debe ingresar un valor en Debe o en Haber.`);
      //if (debe > 0 && haber > 0) errores.push(`Línea ${linea}: no puede tener valores en Debe y Haber al mismo tiempo.`);
      
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

     ///validacion hr solo de lectura
    if (this.isViewOnly()) {
       const msg = this.motivoSoloLectura().trim() || 'Este asiento está en modo solo lectura.';
        this.snack.open(msg, 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
      });
      return;
    }

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

    //valida los 3 paneles
    if (!this.validarTotalesLiquidacionAntesDeGuardar()) return;
    

    const esNuevo = this.modo() === 'nuevo' || this.modo() === 'plantilla';

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

    //const fechaTransaccionSoloFecha = normalizeToLocalDate(fechaTransControl); estaba anterior
    const fechaTransaccionSoloFecha = dateOnlySafe(fechaTransControl);
    //const anioTransaccion = getYearFromInput(fechaTransaccionSoloFecha); estaba anterior
    const anioTransaccion = getYearFromDateOnly(fechaTransaccionSoloFecha); // ✅

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

    const rawForm = this.form.getRawValue() as AsientoContableResponse;

    // ====== APLICAR CAMPOS RELACIONADOS (CABECERA -> TODAS LAS LÍNEAS) ======
    let detallesConRelacionados = this.aplicarCamposRelacionadosCabecera(this.rowData());
    if (this.modo() === 'plantilla') {
      const nroComp = (this.nroComprobanteCtrl.value || '').toString().trim();
      const autCab = (this.autorizacionCtrl.value || '').toString().trim();
      const fCadCab = this.fechacaducaCtrl.value ? normalizeToLocalDate(this.fechacaducaCtrl.value) : null;
      const fVenCab = this.fechavencimientoCtrl.value ? normalizeToLocalDate(this.fechavencimientoCtrl.value) : null;

      detallesConRelacionados = detallesConRelacionados.map(d => ({
        ...d,
        nocomprobante: nroComp || d.nocomprobante || '',
        autorizacion: autCab || d.autorizacion || '',
        fechacaduca: fCadCab ?? d.fechacaduca ?? null,
        fechavencimiento: fVenCab ?? d.fechavencimiento ?? null,
      }));
    }
      
    //cambio hr 15012026
    //const rawForm = this.form.getRawValue() as AsientoContableResponse;
    // panel 3 (asiento contable): ya lo tienes en this.rowData()
    const detallesAsiento = this.aplicarCamposRelacionadosCabecera(this.rowData());

    // panel 1 y 2:
    const liqCab = this.liqCab();
    const liqDet = this.liqDetRowData() ?? [];
    const liqFP  = this.formasPagoRowData() ?? [];
    ///para la cabeceraliquidacion
    const idProveedor = Number(this.auxiliarSeleccionadoCtrl.value || 0);
    const nroComp = (this.nroComprobanteCtrl.value || '').toString().trim();
    

    // completa fechas mínimas cabecera liquidación (si quieres)
    //const nowIso = formatLocalIso(new Date());

    const liquidacionCabecera: LiquidacionCompraCabeceraResponse = {
      ...liqCab,
      // puedes ligar campos del header general si aplica:
      //cambio hr cabecera liquidacion
      idCodContable: idProveedor > 0 ? idProveedor : null,
      numliquida: nroComp || null,

      tipdoc: rawForm.tipdoc ?? liqCab.tipdoc ?? null,
      //numdoc: String(this.nroComprobanteCtrl.value || '') || liqCab.numdoc || null,
      //hasta definir el numero de control 15012026
      caja:this.getCajaActualSri(),//'001', ///temporal caja 001
      numdoc: null,
      idTipoCompSri: Number(this.tipoCompSriCtrl.value || 0) || liqCab.idTipoCompSri || null,
      autorizacion: (this.autorizacionCtrl.value || '').toString().trim() || liqCab.autorizacion || null,
      fechacad: this.fechacaducaCtrl.value ? normalizeToLocalDate(this.fechacaducaCtrl.value) : (liqCab.fechacad ?? null),
      fecha: rawForm.fechatransaccion || liqCab.fecha || nowIso, // dateOnlySafe(rawForm.fechatransaccion) || liqCab.fecha || null, //fechaTransaccionSoloFecha
      fechaing: rawForm.fechaingreso || liqCab.fechaing || nowIso,
      observacion: rawForm.observacion ?? liqCab.observacion ?? null,
    };

    // Asegura lineas 1..n
    const liquidacionDetalles: LiquidacionCompraDetalleResponse[] = liqDet.map((x, i) => ({
      ...x,
      linea: Number(x.linea ?? (i + 1)),
      cantidad: Number(x.cantidad ?? 0),
      pvpunit: Number(x.pvpunit ?? 0),
      iva: Number(x.iva ?? 0),
      total: Number(x.total ?? 0),
      bien: Number(x.bien ?? 0),
      servicio: Number(x.servicio ?? 0),
      // ✅ aquí (si el usuario lo borra o viene null, igual se envía "001")
      caja: (x.caja ?? '').toString().trim() || this.getCajaActualSri(),///'001', ///TEMPORAL 15012026

    }));

    const formasPago: LiquidacionCompraFormaPagoResponse[] = liqFP.map(fp => ({
      idFormaPagoSri: fp.idFormaPagoSri != null ? Number(fp.idFormaPagoSri) : null,
      codigofpago: (fp.codigofpago ?? null),
      valor: Number(fp.valor ?? 0),
      plazo: Number(fp.plazo),
    }));
    ////


    const header: AsientoContableResponse = {
      ...rawForm,
      modulo: rawForm.modulo != null && !isNaN(Number(rawForm.modulo)) ? Number(rawForm.modulo) : 6, ///modulo es 6
      fechatransaccion: fechaTransaccionSoloFecha,
      fechaingreso: esNuevo ? nowIso : normalizeToLocalIso(rawForm.fechaingreso),
      fechacierre: esNuevo ? '' : rawForm.fechacierre,
      numdoc: esNuevo ? 0 : rawForm.numdoc ?? 0,
      totdebe: this.totDebe(),
      tothaber: this.totHaber(),
      detalles: detallesConRelacionados,

      liquidacion: {
      cabecera: liquidacionCabecera,
      detalles: liquidacionDetalles,
      formasPago: formasPago,
      },
      
    };


    const payload = this.normalizarParaBackend(header);

    this.saving.set(true);

    type SaveResponse = ApiResponse<number> | ApiResponse<boolean>;
    let save$: Observable<SaveResponse>;

    if (esNuevo) {
      //save$ = this.facturasService.crear(payload) as Observable<SaveResponse>;
      save$ = this.liquidacionCompraService.crear(payload) as Observable<SaveResponse>;
    } else {
      const idCab = header.IdCabMaestro || Number(this.route.snapshot.paramMap.get('id') ?? 0);
      //save$ = this.facturasService.actualizar(idCab, payload) as Observable<SaveResponse>;
      save$ = this.liquidacionCompraService.actualizar(idCab, payload) as Observable<SaveResponse>;
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
  /**
 * Recalcula automáticamente IVA, Retenciones de Renta y Retenciones de IVA
 * cuando cambia el valor de una factura base (FCB/FCS/FSB/FSS)
 */
  private recalcularLineasDependientes(rowIndexFactura: number): void {
    const filas = this.rowData() ?? [];

    for (let i = rowIndexFactura + 1; i < filas.length; i++) {
      const fila = filas[i];
      const mov = (fila.movbancario || '').toString().trim().toUpperCase();

      // ✅ Recalcular IVA (IB/IS)
      if (['IB', 'IS'].includes(mov)) {
        this.calcularIvaDesdeFactura(i);
      }

      // ✅ Recalcular Retención de Renta (RFB/RFS)
      if (['RFB', 'RFS'].includes(mov)) {
        this.calcularRetencionDesdeFactura(i);
      }

      // ✅ Recalcular Retención de IVA (RIB/RIS)
      if (['RIB', 'RIS'].includes(mov)) {
        this.calcularRetencionIvaDesdeIva(i);
      }
    }

    // ✅ Actualizar grid
    this.rowData.set([...filas]);
    this.gridApi?.refreshCells({ force: true, columns: ['debe', 'haber'] });
  }
  onCellValueChanged(evt: CellValueChangedEvent<DetalleAsientoResponse>): void {
    if (evt.colDef.field === 'debe' || evt.colDef.field === 'haber') {
      const filas = this.rowData() ?? [];
      const rowIndex = evt.node.rowIndex ?? 0;
      const lastIndex = filas.length - 1;

      this.rowData.set([...filas]);

      // ✅ NUEVO: Recalcular líneas dependientes automáticamente
      const movActual = (evt.data?.movbancario || '').toString().trim().toUpperCase();

      // Si cambió el debe de una FACTURA (FCB/FCS/FSB/FSS), recalcular IVA y retenciones posteriores
      if (['FCB', 'FCS', 'FSB', 'FSS'].includes(movActual) && evt.colDef.field === 'debe') {
        this.recalcularLineasDependientes(rowIndex);
      }

      // Recalcular saldo final (última línea)
      if (rowIndex < lastIndex) {
        this.recalcularHaberDesdeDebe(false);
      }
    }

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

        //CAMBIO 01012026
        if (movCode === '0') {
            const idCuentaActual = Number(evt.data.idPlanCuentas || 0);
            if (idCuentaActual > 0) {
              const cuentaActual = this.cuentas.find((c) => Number(c.id) === idCuentaActual);
              if (cuentaActual && this.esCuentaBanco(cuentaActual)) {
                evt.data.idPlanCuentas = 0 as any;
                evt.data.codprePc = '';
              }
            }
        }
        ///END
        
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

  //Aquí se valida antes de agregar línea (solo NUEVO)
  agregarLinea(): void {

     ///cambio hr validacion solo de lectura
    if (this.isViewOnly()) {
      const msg = this.motivoSoloLectura().trim() || 'Este asiento está en modo solo lectura.';
      this.snack.open(msg, 'Cerrar', { duration: 3500, horizontalPosition: 'right', verticalPosition: 'top' });
      return;
    }



    ////cambio hr 16012026
    
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

    // ✅ Misma validación (incluye TipoAsiento; Concepto no necesariamente aquí)
    if (!this.validarCabeceraParaAgregarLinea({ incluirTipoAsiento: true })) return;

    // ✅ Validar duplicado ANTES de agregar (solo en NUEVO)
    this.nroComprobanteCtrl.markAsTouched();
    this.validarNoComprobanteAntesDeAgregarLinea$().subscribe((ok) => {
      if (!ok) {
        this.snack.open('El No. Comprobante ya existe para este proveedor. Verifique y cambie el número.', 'Cerrar', {
          duration: 4500,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });
        return; // NO agrega línea
      }
      ////valida lineas del detalle
      if (this.tieneAlMenosUnaLineaEnDetalle()) {
          if (!this.validarDetalleAntesDeAgregarLinea()) return;
      }
      // =========================
      // ✅ (si pasa validación) continúa flujo original
      // =========================
      const ahora = new Date();
      const nowIso = formatLocalIso(ahora);

      const items = this.rowData();
      const next = (items?.length ?? 0) + 1;

      //const fechaTransFormulario = this.form.value?.fechatransaccion || nowIso;
      //const fechaTransaccionDetalle = normalizeToLocalDate(fechaTransFormulario);
      //const anioTransaccion = this.form.value?.anio || getYearFromInput(fechaTransaccionDetalle);

      const fechaTransFormulario = this.form.get('fechatransaccion')?.value;
      const fechaTransaccionDetalle = dateOnlySafe(fechaTransFormulario) || dateOnlySafe(nowIso);
      const anioTransaccion = fechaTransaccionDetalle ? fechaTransaccionDetalle.substring(0, 4) : '';

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

  onNumericInput(ctrl: FormControl<any>, event: Event, maxLen?: number): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;

    const original = input.value ?? '';
    let soloDigitos = original.replace(/\D/g, '');

    const limite = maxLen ?? (ctrl === this.nroComprobanteCtrl ? 15 : undefined);
    if (limite != null) soloDigitos = soloDigitos.slice(0, limite);

    if (original !== soloDigitos) input.value = soloDigitos;

    // ✅ si cambió el nro comprobante, limpiamos cache/duplicado
    if (ctrl === this.nroComprobanteCtrl) {
      this.limpiarCacheNoComprobante();
    }

    // ✅ IMPORTANTE:
    // - Para nroComprobanteCtrl: emitEvent = true (para disparar valueChanges y validar al llegar a 15)
    // - Para el resto: emitEvent = false (como lo tenías)
    const emit = ctrl === this.nroComprobanteCtrl;

    ctrl.setValue(soloDigitos, { emitEvent: emit });
    ctrl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
  }

  ///end

  private normalizarParaBackend(header: AsientoContableResponse): any {
    const h: any = { ...header };

    // CABECERA
    h.fechacierre = h.fechacierre ? normalizeToLocalDate(h.fechacierre) : null;
    h.fechatransaccion = h.fechatransaccion ? dateOnlySafe(h.fechatransaccion) : null;

    // DETALLES
    h.detalles = (header.detalles ?? []).map((d) => {
      const det: any = { ...d };

      //det.fechatransaccion = det.fechatransaccion ? normalizeToLocalDate(det.fechatransaccion) : null;
      det.fechatransaccion = det.fechatransaccion ? dateOnlySafe(det.fechatransaccion) : null;
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
        //det.porcentaje = isNaN(n) ? null : n;
        det.porcentaje = Number.isFinite(n) ? n : null; // ✅ aquí 0 se queda 0
      }

      return det;
    });

    //cambio hr 15012026
    // ✅ LIQUIDACIÓN
    if (h.liquidacion) {
      // cabecera
      if (h.liquidacion.cabecera) {
        h.liquidacion.cabecera.fecha = h.liquidacion.cabecera.fecha ? dateOnlySafe(h.liquidacion.cabecera.fecha) : null;
        h.liquidacion.cabecera.fechaing = h.liquidacion.cabecera.fechaing ? normalizeToLocalIso(h.liquidacion.cabecera.fechaing) : null;
        h.liquidacion.cabecera.fechacad = h.liquidacion.cabecera.fechacad ? dateOnlySafe(h.liquidacion.cabecera.fechacad) : null;

        // números
        h.liquidacion.cabecera.subtotal = Number(h.liquidacion.cabecera.subtotal ?? 0);
        h.liquidacion.cabecera.coniva = Number(h.liquidacion.cabecera.coniva ?? 0);
        h.liquidacion.cabecera.siniva = Number(h.liquidacion.cabecera.siniva ?? 0);
        h.liquidacion.cabecera.iva = Number(h.liquidacion.cabecera.iva ?? 0);
        h.liquidacion.cabecera.total = Number(h.liquidacion.cabecera.total ?? 0);

        //hr liquidacion cabecera
        h.liquidacion.cabecera.idCodContable = this.toNull(h.liquidacion.cabecera.idCodContable);
        h.liquidacion.cabecera.numliquida = this.toNull(h.liquidacion.cabecera.numliquida, true); // keepString=true

      }

      // detalles
      h.liquidacion.detalles = (h.liquidacion.detalles ?? []).map((x: any, i: number) => ({
        ...x,
        linea: Number(x.linea ?? (i + 1)),
        cantidad: Number(x.cantidad ?? 0),
        pvpunit: Number(x.pvpunit ?? 0),
        iva: Number(x.iva ?? 0),
        total: Number(x.total ?? 0),
        bien: Number(x.bien ?? 0),
        servicio: Number(x.servicio ?? 0),
        idPlanCuentas: this.toNull(x.idPlanCuentas),
      }));

      // formas pago
      h.liquidacion.formasPago = (h.liquidacion.formasPago ?? []).map((fp: any) => ({
        ...fp,
        idFormaPagoSri: this.toNull(fp.idFormaPagoSri),
        valor: Number(fp.valor ?? 0),
        codigofpago: this.toNull(fp.codigofpago, true),
      }));
    }
    //
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
    this.aplicarReglaCamposNC({ forzar: true }); //cambio hr 31122025 añadir
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
   // if (!aut) errores.push('Debe ingresar la Autorización.');
   if (!aut) {
      errores.push('Debe ingresar la Autorización.');
    } else if (this.autorizacionCtrl.invalid) {
      errores.push('La Autorización debe tener entre 10 y 49 dígitos (solo números).');
    }
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

  //cambio hr 15012026
  private validarCabeceraParaAgregarLinea(opts?: { incluirTipoAsiento?: boolean; incluirConcepto?: boolean }): boolean {
    const incluirTipoAsiento = opts?.incluirTipoAsiento ?? false;
    const incluirConcepto = opts?.incluirConcepto ?? false;

    const idZonaCtrl = this.form.get('idZona');
    const idTipoAsientoCtrl = this.form.get('idTipoAsiento');

    const idZona = Number(idZonaCtrl?.value || 0);
    const idTipoAsiento = Number(idTipoAsientoCtrl?.value || 0);

    const idAux = Number(this.auxiliarSeleccionadoCtrl.value || 0);
    const nroComp = (this.nroComprobanteCtrl.value || '').toString().trim();
    const idSust = Number(this.sustentoTribCtrl.value || 0);
    const idTipoComp = Number(this.tipoCompSriCtrl.value || 0);

    const aut = (this.autorizacionCtrl.value || '').toString().trim();
    const fCad = (this.fechacaducaCtrl.value || '').toString().trim();
    const fVen = (this.fechavencimientoCtrl.value || '').toString().trim();

    const concepto = (this.form.get('observacion')?.value || '').toString().trim();

    const errores: string[] = [];

    if (idZona <= 0) { errores.push('Debe seleccionar la Zona.'); idZonaCtrl?.markAsTouched(); }

    if (incluirTipoAsiento && (!idTipoAsiento || idTipoAsiento <= 0)) {
      errores.push('Debe seleccionar el Tipo de Asiento.');
      idTipoAsientoCtrl?.markAsTouched();
    }

    if (idAux <= 0) { errores.push('Debe seleccionar el Proveedor.'); this.auxiliarSeleccionadoCtrl.markAsTouched(); }
    if (!nroComp) { errores.push('Debe ingresar el No. Comprobante.'); this.nroComprobanteCtrl.markAsTouched(); }

    if (idSust <= 0) { errores.push('Debe seleccionar el Sustento Tributario.'); this.sustentoTribCtrl.markAsTouched(); }
    if (idTipoComp <= 0) { errores.push('Debe seleccionar el Tipo de Comprobante SRI.'); this.tipoCompSriCtrl.markAsTouched(); }

    if (!aut) {
      errores.push('Debe ingresar la Autorización.');
      this.autorizacionCtrl.markAsTouched();
    } else if (this.autorizacionCtrl.invalid) {
      errores.push('La Autorización debe tener entre 10 y 49 dígitos (solo números).');
      this.autorizacionCtrl.markAsTouched();
    }

    if (!fCad) { errores.push('Debe ingresar la Fecha Caduca.'); this.fechacaducaCtrl.markAsTouched(); }
    if (!fVen) { errores.push('Debe ingresar la Fecha Vencimiento.'); this.fechavencimientoCtrl.markAsTouched(); }

    if (incluirConcepto && !concepto) {
      errores.push('Debe ingresar el Concepto.');
      this.form.get('observacion')?.markAsTouched();
    }

    if (errores.length) {
      this.snack.open(errores[0], 'Cerrar', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return false;
    }

    return true;
  }

  ///

  private resetParaNuevo(): void {
    this.cabeceraBloqueada = false;
    this.modo.set('nuevo');
    this.numdocGenerado = null;
    this.loading.set(false);
    this.saving.set(false);
    const nowIso = formatLocalIso(new Date());
    const anio = getYearFromInput(nowIso);
    //ID DE USUARIO RECUPERADO
    this.usuarioAsientoNombre.set('');
    this.usuarioAsientoIdCargado = null;
    ///////

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
      modulo: 6, ///modulo es 6
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

onNroComprobanteBlur(): void {
  const ctrl = this.nroComprobanteCtrl;
  ctrl.markAsTouched();
  ctrl.updateValueAndValidity({ onlySelf: true });

  if (ctrl.invalid && (ctrl.value ?? '').trim().length > 0) {
    let msg = 'Formato incorrecto. Debe ser 15 dígitos (SRI 3-3-9). Ej: 001001000000456.';

    const e = ctrl.errors || {};
    if (e['sriSerieRango']) {
      const info = e['sriSerieRango'];
      msg = `Serie inválida: ${info.parte === 'estab' ? 'Establecimiento' : 'Punto de emisión'} = ${info.valor}. Rango permitido: ${String(info.min).padStart(3,'0')}–${String(info.max).padStart(3,'0')}.`;
    } else if (e['sriSecuencialInvalido']) {
      msg = 'Secuencial inválido. No puede ser 000000000.';
    }

    this.snack.open(msg, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}

//verificar si hay lineas
private tieneAlMenosUnaLineaEnDetalle(): boolean {
  this.gridApi?.stopEditing();
  return (this.rowData()?.length ?? 0) > 0;
}

private validarDetalleAntesDeAgregarLinea(): boolean {
  const filas = this.rowData() ?? [];
  const errores: string[] = [];

  // Si no hay filas, no validamos (se permite agregar la primera)
  if (!filas.length) return true;

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

    ///retenciones
    const movCode = this.getMovCode(f);
    const permiteCeroCero = ['RFB', 'RFS'].includes(movCode);

    if (idLocal <= 0) errores.push(`Línea ${linea}: debe seleccionar el Local.`);
    if (idMovBancario <= 0) errores.push(`Línea ${linea}: debe seleccionar el Tipo de Movimiento.`);
    if (idPlanCuentas <= 0) errores.push(`Línea ${linea}: debe seleccionar la Cuenta Contable.`);
    if (idAuxiliar <= 0) errores.push(`Línea ${linea}: debe seleccionar el Auxiliar Contable.`);
    
    ///retenciones
    if (!permiteCeroCero && debe <= 0 && haber <= 0) {
      errores.push(`Línea ${linea}: debe ingresar un valor en Debe o en Haber.`);
    }
    if (debe > 0 && haber > 0) {
      errores.push(`Línea ${linea}: no puede tener Debe y Haber al mismo tiempo.`);
    }
    //if (debe <= 0 && haber <= 0) errores.push(`Línea ${linea}: debe ingresar un valor en Debe o en Haber.`);
    //if (debe > 0 && haber > 0) errores.push(`Línea ${linea}: no puede tener Debe y Haber al mismo tiempo.`);
    
    if (idSust <= 0) errores.push(`Línea ${linea}: debe seleccionar el Sustento Tributario.`);
    if (idTipoComp <= 0) errores.push(`Línea ${linea}: debe seleccionar el Tipo de Comprobante SRI.`);
  });

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

private cargarUsuarioAsientoNombre(idUsuario: number): void {
  const id = Number(idUsuario || 0);

    // Solo en editar
    if (this.modo() !== 'editar') {
      this.usuarioAsientoNombre.set('');
      this.usuarioAsientoIdCargado = null;
      return;
    }

    if (id <= 0) {
      this.usuarioAsientoNombre.set('');
      this.usuarioAsientoIdCargado = null;
      return;
    }

    // Evita llamar varias veces por el mismo usuario
    if (this.usuarioAsientoIdCargado === id && this.usuarioAsientoNombre().trim()) return;

    this.usuarioAsientoIdCargado = id;

    this.usuarioService.getUsuarioById(id).pipe(
      map((r: any) => r?.data),
      catchError((err) => {
        console.error('Error getUsuarioById (usuario asiento):', err);
        return of(null);
      })
    ).subscribe((u: any) => {
      // Ajusta estos campos según tu UsuariosResponse real:
      const nombre =
        (u?.nombre_usuario ?? u?.nombreUsuario ?? u?.username ?? u?.usuario ?? '').toString().trim();

      this.usuarioAsientoNombre.set(nombre || '');
    });
  }

  //porcentaje iva
  private isIvaActivo(estado: unknown): boolean {
    // true/false
    if (estado === true) return true;
    if (estado === false || estado == null) return false;

    // 1/0 o "1"/"0"
    const n = Number(estado);
    if (!Number.isNaN(n)) return n === 1;

    // "true"/"false" u otros textos
    const s = String(estado).trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'activo' || s === 'a';
  }

  ///cambio hr 31122025 
  ///** Devuelve true si el Tipo Comprobante SRI seleccionado es 04 - Nota de crédito */
  esNotaCreditoSeleccionada(): boolean {
    const id = Number(this.tipoCompSriCtrl.value || 0);
    if (!id) return false;

    const item = this.listaTiposCompSriCab.find((x) => Number(x.id) === id);
    if (item?.cod) return item.cod.trim() === '04';

    // Fallback si por alguna razón no está cargada la lista aún:
    // intenta parsear desde el label "04 - Nota de crédito"
    const label = (item?.label ?? '').toString().trim();
    const m = /^(\d{2})\s*[-–—]/.exec(label);
    return (m?.[1] ?? '') === '04';
  }

  /** Habilita/deshabilita los 3 campos relacionados a NC según el tipo comprobante */
  private aplicarReglaCamposNC(opts?: { forzar?: boolean }): void {
    const esNC = this.esNotaCreditoSeleccionada();

    // Si está en readOnly general o cabecera bloqueada, NO habilites aunque sea NC
    const puedeEditar = !this.isReadOnly() && !this.cabeceraBloqueada;

    const debeHabilitar = esNC && puedeEditar;

    if (debeHabilitar) {
      this.docRelacionadoCtrl.enable({ emitEvent: false });
      this.autorizacionRelacionadoCtrl.enable({ emitEvent: false });
      this.fechaCadRelacionadoCtrl.enable({ emitEvent: false });
      return;
    }

    // Si NO es NC, se bloquea siempre
    this.docRelacionadoCtrl.disable({ emitEvent: false });
    this.autorizacionRelacionadoCtrl.disable({ emitEvent: false });
    this.fechaCadRelacionadoCtrl.disable({ emitEvent: false });

    // En NUEVO/PLANTILLA, además limpia (para que no se envíen valores indebidamente)
    if (this.modo() === 'nuevo' || this.modo() === 'plantilla') {
      //this.syncFechaTransaccionConIngreso(); no debe resetear la fecha debe respetar lo que esta ahi en el control
      //cambio hr 19012026
      this.docRelacionadoCtrl.setValue('', { emitEvent: false });
      this.autorizacionRelacionadoCtrl.setValue('', { emitEvent: false });
      this.fechaCadRelacionadoCtrl.setValue(null, { emitEvent: false });
 
    }
  }

  ////
  private getMovCode(row: DetalleAsientoResponse): string {
    const code = (row.movbancario ?? '').toString().trim().toUpperCase();
    if (code) return code;

    const id = Number(row.idMovBancario || 0);
    if (id > 0) {
      const mov = this.movimientosBancarios.find(m => Number(m.id) === id);
      return (mov?.movimiento ?? '').toString().trim().toUpperCase();
    }

    return '';
  }

  ///fechas
  private syncFechaTransaccionConIngreso(): void {
    const ing = this.form.get('fechaingreso');
    const trans = this.form.get('fechatransaccion');
    const anio = this.form.get('anio');

    if (!ing || !trans) return;

    ing.valueChanges
      .pipe(startWith(ing.value), distinctUntilChanged())
      .subscribe((v) => {
        const d = dateOnlySafe(v); // yyyy-MM-dd
        if (!d) return;

        if (trans.value !== d) trans.setValue(d, { emitEvent: false });
        if (anio && anio.value !== d.substring(0, 4)) anio.setValue(d.substring(0, 4), { emitEvent: false });
      });
  }

  toDatetimeLocal(v: any): string {
    if (!v) return '';
    if (typeof v === 'string') {
      const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/.exec(v.trim());
      if (m) return m[1]; // yyyy-MM-ddTHH:mm
      const d = new Date(v);
      if (!isNaN(d.getTime())) return formatLocalIso(d).substring(0,16);
      return '';
    }
    if (v instanceof Date && !isNaN(v.getTime())) return formatLocalIso(v).substring(0,16);
    return '';
  }

  // No. comprobante 01012026
  private initAutoValidacionNoComprobante(): void {
    const nro$: Observable<string> = this.nroComprobanteCtrl.valueChanges.pipe(
      startWith(this.nroComprobanteCtrl.value ?? ''),
      map((v: string | null) => (v ?? '').toString().trim()),
      distinctUntilChanged()
    );

    const aux$: Observable<number> = this.auxiliarSeleccionadoCtrl.valueChanges.pipe(
      startWith(this.auxiliarSeleccionadoCtrl.value ?? 0),
      map((v: number | null) => Number(v ?? 0)),
      distinctUntilChanged()
    );

    combineLatest([nro$, aux$])
      .pipe(
        debounceTime(250),

        // Solo aplica en NUEVO
        filter((): boolean => this.modo() === 'nuevo'),

        // Si borra o aún no llega a 15: limpiar duplicado y no validar online
        tap(([nro]: [string, number]) => {
          if (nro.length !== 15) {
            this.noCompKeyValidadoOk = null;
            this.noCompKeySnackDuplicado = null;
            this.quitarError(this.nroComprobanteCtrl, 'duplicado');
          }
        }),

        // Condiciones mínimas para validar online
        filter(([nro, idAux]: [string, number]) => idAux > 0 && nro.length === 15),

        // Debe pasar validadores sync
        filter((): boolean => this.nroComprobanteCtrl.valid),

        // Llama validación online (tu método ya usa caché)
        switchMap((): Observable<boolean> => this.validarNoComprobanteAntesDeAgregarLinea$()),

        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((ok: boolean) => {
        if (!ok) {
          this.nroComprobanteCtrl.markAsTouched();

          // Evitar spam snack por la misma llave
          const idEmpresa = Number(this.usuarioActual?.id_empresa || 0);
          const idAux = Number(this.auxiliarSeleccionadoCtrl.value || 0);
          const nro = (this.nroComprobanteCtrl.value || '').toString().trim();
          const key = `${idEmpresa}|${idAux}|${nro}`;

          if (this.noCompKeySnackDuplicado !== key) {
            this.noCompKeySnackDuplicado = key;

            this.snack.open(
              'El No. Comprobante ya existe para este proveedor. Verifique y cambie el número.',
              'Cerrar',
              { duration: 4500, horizontalPosition: 'right', verticalPosition: 'top' }
            );
          }
        } else {
          this.noCompKeySnackDuplicado = null;
        }
      });
  }

  //cuenta banco 01012026

  private esCuentaBanco(c: { idCodigoEspecial?: number | null }): boolean {
    return Number(c?.idCodigoEspecial ?? 0) === this.CODIGO_ESPECIAL_BANCOS;
  }

  private obtenerCuentasFiltradasPorMovimiento(row: DetalleAsientoResponse): typeof this.cuentas {
    const movCode = this.getMovCode(row); // usa tu helper existente

    // ✅ REGLA: NINGUNO => excluir bancos
    if (movCode === '0') {
      return (this.cuentas ?? []).filter((c) => !this.esCuentaBanco(c));
    }

    // ===== tu lógica actual por "condicion" =====
    const idMov = Number(row?.idMovBancario ?? 0);
    let condicion: number | null = null;

    if (idMov > 0) {
      const mov = this.movimientosBancarios.find((m) => Number(m.id) === idMov);
      if (mov && mov.condicion != null && Number(mov.condicion) > 0) {
        condicion = Number(mov.condicion);
      }
    }

    if (condicion !== null) {
      return (this.cuentas ?? []).filter(
        (c) => c.idCodigoEspecial != null && Number(c.idCodigoEspecial) === condicion
      );
    }

    // sin condición: todas
    return this.cuentas ?? [];
  }
 
  //cambio hr 15012025
  private toNull(value: any, keepString: boolean = false): any {
    if (value === undefined || value === null) return null;

    // strings
    if (typeof value === 'string') {
      const s = value.trim();
      if (s === '') return null;

      // Si debemos mantener string (códigos), no convertir
      if (keepString) return s;

      // Si no, intentamos convertir a number (IDs que vienen como string)
      const n = Number(s);
      if (!Number.isNaN(n)) return n > 0 ? n : null;

      // Si no es numérico, lo devolvemos como string (caso raro)
      return s;
    }

    // numbers
    if (typeof value === 'number') {
      if (Number.isNaN(value)) return null;
      return value > 0 ? value : null;
    }

    // booleans u otros
    return value;
  }
  //

  private extraerNombreCuenta(label: string): string {
    const s = (label ?? '').toString().trim();
    if (!s) return '';

    // separa por " - " una sola vez
    const idx = s.indexOf(' - ');
    if (idx >= 0) return s.substring(idx + 3).trim();

    // fallback: si viene con guion distinto
    const parts = s.split('-').map(x => x.trim()).filter(Boolean);
    if (parts.length >= 2) return parts.slice(1).join(' - ');

    return s;
  }
  // AÑADIR AQUI

  private round2(n: number): number {
    return Number((Number(n) || 0).toFixed(2));
  }

  private num2(v: any): number {
    if (v === null || v === undefined || v === '') return 0;
    const s = String(v).trim();
    const n = Number(s);
    return Number.isNaN(n) ? 0 : n;
  }

  /** Recalcula total de una línea */
  private recalcularTotalLiqDetRow(row: LiquidacionCompraDetalleResponse): void {
    const cant = this.num2((row as any).cantidad);
    const pvp  = this.num2((row as any).pvpunit);
    const iva  = this.num2((row as any).iva);

    // ✅ OPCIÓN RECOMENDADA (incluye cantidad):
    const totalCalc = (pvp + iva) * (cant || 0);

    // ✅ SI LO QUIERES EXACTO COMO DIJISTE (sin cantidad), usa esto:
    // const totalCalc = (pvp + iva);

    (row as any).total = this.round2(totalCalc);
  }

  /** ValueSetter genérico para Cantidad/PVP/IVA que además recalcula TOTAL */
  /*
  private valueSetterLiqDetCalc(field: 'cantidad' | 'pvpunit' | 'iva') {
    return (params: any): boolean => {
      const raw = String(params.newValue ?? '').trim();

      if (raw.includes(',')) return false;

      const normalized = raw === '' ? '0' : raw;

      const dot2Regex = /^\d*(\.\d{0,2})?$/;
      if ((field === 'pvpunit' || field === 'iva') && !dot2Regex.test(normalized)) return false;

      const n = Number(normalized);
      if (Number.isNaN(n)) return false;

      (params.data as any)[field] = field === 'cantidad' ? n : this.round2(n);

      this.recalcularTotalLiqDetRow(params.data);

      const node = params.node;
      if (node) {
        params.api.refreshCells({
          rowNodes: [node],
          columns: [field, 'total'],
          force: true,
        });
      } else {
        params.api.refreshCells({ columns: [field, 'total'], force: true });
      }

      this.recalcularCabeceraLiquidacion();
      return true;
    };
  }
  */

  private valueSetterLiqDetCalc(field: 'cantidad' | 'pvpunit' | 'iva') {
    return (params: any): boolean => {
      const raw = String(params.newValue ?? '').trim();

      // No permitir coma
      if (raw.includes(',')) return false;

      const normalized = raw === '' ? '0' : raw;

      // Validación 2 decimales para pvpunit / iva
      const dot2Regex = /^\d*(\.\d{0,2})?$/;
      if ((field === 'pvpunit' || field === 'iva') && !dot2Regex.test(normalized)) return false;

      const n = Number(normalized);
      if (Number.isNaN(n)) return false;

      // set value
      if (field === 'cantidad') {
        (params.data as any)[field] = n;
      } else {
        (params.data as any)[field] = this.round2(n);
      }
      // ==========================
      // ✅ REGLA DE RECÁLCULO
      // - Si edita IVA: lo marcamos manual y recalculamos total con ese IVA.
      // - Si edita Cantidad/PVP:
      //    - si hay porcentaje y NO es manual => recalcular iva+total desde porcentaje
      //    - caso contrario => recalcular total con el iva actual
      // ==========================
      if (field === 'iva') {
        //this.markIvaManual(params.data, true);
        this.recalcularTotalConIvaActual(params.data);
      } else {
        const porc = Number((params.data as any).porcentaje ?? 0);

        if (porc > 0 && !this.isIvaManual(params.data)) {
          this.recalcularIvaYTotalDesdePorcentaje(params.data);
        } else {
          this.recalcularTotalConIvaActual(params.data);
        }
      }

      // refrescar fila
      this.refreshRowLiqDet(params.api, params.node, [field, 'iva', 'total']);

      // ✅ recalcular cabecera
      this.recalcularCabeceraLiquidacion();

      return true;
    };
  }

  /** ✅ Valida que una fila tenga los 4 campos mínimos del Panel 1 (según gráfico) */
  private validarFilaLiqDetMinimos(row: LiquidacionCompraDetalleResponse): { ok: boolean; colKey?: string; msg?: string } {
    const idCuenta = Number(row.idPlanCuentas ?? 0);
    const pvp = Number(row.pvpunit ?? 0);

    const bien = this.to01((row as any).bien);
    const servicio = this.to01((row as any).servicio);

    if (idCuenta <= 0) {
      return { ok: false, colKey: 'idPlanCuentas', msg: 'Debe seleccionar la Cuenta antes de agregar otra línea.' };
    }

    // Si quieres permitir 0, cambia a: (pvp < 0)
    if (!(pvp > 0)) {
      return { ok: false, colKey: 'pvpunit', msg: 'Debe ingresar el PVP Unit (mayor a 0) antes de agregar otra línea.' };
    }

    const idIva = Number(row.idPorIva ?? 0);
      if (!idIva || idIva <= 0) {
      return {
        ok: false,
        msg: 'Debe seleccionar el IVA antes de agregar otra línea.',
        colKey: 'idPorIva', // ✅ debe coincidir con field/colId de tu columna
      };
    }

    // Debe marcar uno (Bien o Servicio)
    if (bien !== 1 && servicio !== 1) {
      return { ok: false, colKey: 'bien', msg: 'Debe seleccionar Bien o Servicio antes de agregar otra línea.' };
    }

    // Si por alguna razón quedaran ambos 1 (debería evitarse por tu toggle), lo bloqueamos igual
    if (bien === 1 && servicio === 1) {
      return { ok: false, colKey: 'bien', msg: 'Solo puede seleccionar Bien o Servicio (no ambos).' };
    }

    return { ok: true };
  }

  /** ✅ Valida todas las líneas existentes antes de permitir agregar una nueva */
  private validarDetalleLiqDetAntesDeAgregarLinea(): boolean {
    const rows = this.liqDetRowData() ?? [];

    // Si no hay filas, se permite agregar la primera
    if (!rows.length) return true;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const v = this.validarFilaLiqDetMinimos(r);

      if (!v.ok) {
        this.snack.open(v.msg || 'Complete los datos obligatorios.', 'Cerrar', {
          duration: 4500,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });

        // Enfocar la celda faltante
        if (v.colKey) this.focusLiqDetCell(i, v.colKey);
        return false;
      }
    }

    return true;
  }

  /** ✅ Enfoca (y si aplica, edita) una celda del grid Panel 1 */
  private focusLiqDetCell(rowIndex: number, colKey: string): void {
    if (!this.gridApiLiqDet) return;

    this.gridApiLiqDet.ensureIndexVisible(rowIndex, 'middle');
    this.gridApiLiqDet.setFocusedCell(rowIndex, colKey);

    // Para columnas editables (Cuenta/PVP), abre edición
    this.gridApiLiqDet.startEditingCell({ rowIndex, colKey });
  }

  private markIvaManual(row: LiquidacionCompraDetalleResponse, manual: boolean): void {
    (row as any).__ivaManual = manual ? true : false;
  }

  private isIvaManual(row: LiquidacionCompraDetalleResponse): boolean {
    return !!(row as any).__ivaManual;
  }

  private recalcularIvaYTotalDesdePorcentaje(row: LiquidacionCompraDetalleResponse): void {
    const cant = this.num2((row as any).cantidad);
    const pvp  = this.num2((row as any).pvpunit);
    const porc = this.num2((row as any).porcentaje);

    const base = this.round2(cant * pvp);
    const iva  = this.round2(base * (porc / 100));
    const total = this.round2(base + iva);

    (row as any).iva = iva;
    (row as any).total = total;
  }
  private recalcularTotalConIvaActual(row: LiquidacionCompraDetalleResponse): void {
    const cant = this.num2((row as any).cantidad);
    const pvp  = this.num2((row as any).pvpunit);
    const iva  = this.num2((row as any).iva);

    const base = this.round2(cant * pvp);
    (row as any).total = this.round2(base + iva);
  }

  private refreshRowLiqDet(api: any, node: any, cols: string[]): void {
    if (node) {
      api.refreshCells({ rowNodes: [node], columns: cols, force: true });
    } else {
      api.refreshCells({ columns: cols, force: true });
    }
  }

  onCellValueChangedPago(evt: CellValueChangedEvent<LiquidacionCompraFormaPagoResponse>): void {
    // ✅ forzar actualización del signal (AG Grid muta el objeto, pero el signal no se entera)
    this.formasPagoRowData.set([...(this.formasPagoRowData() ?? [])]);

    // ✅ recalcular total
    //this.recalcularTotalFormasPago();
    this.syncPagosDesdeGrid();
  }

  private syncPagosDesdeGrid(): void {
    if (!this.gridApiPago) return;

    const rows: LiquidacionCompraFormaPagoResponse[] = [];
    this.gridApiPago.forEachNode((n) => {
      if (n.data) rows.push({ ...n.data }); // clon para inmutabilidad
    });

    this.formasPagoRowData.set(rows);
  }

  //ASIENTO AUTOMATICO
/** ===============================
 *  GENERAR ASIENTO AUTOMÁTICO (Panel 3)
 *  desde Panel 1 (liqDet) + Panel 2 (formasPago)
 *  =============================== */

  generarAsientoAutomaticoDesdeLiquidacion(): void {
    // 1) detener ediciones para tomar valores reales
    this.gridApiLiqDet?.stopEditing();
    this.gridApiPago?.stopEditing();
    this.gridApi?.stopEditing();

    // 2) Validaciones mínimas (cabecera + panel1 + panel2)
    if (!this.validarCabeceraParaAgregarLinea({ incluirTipoAsiento: true, incluirConcepto: true })) return;
    if (!this.validarDetalleLiqDetAntesDeAgregarLinea()) return;

    const liqDet = this.liqDetRowData() ?? [];
    if (!liqDet.length) {
      this.snack.open('Debe ingresar al menos una línea en el Detalle de Liquidación.', 'Cerrar', {
        duration: 4000, horizontalPosition: 'right', verticalPosition: 'top',
      });
      return;
    }

    // Formas de pago: pueden venir vacías (crédito a proveedor)
    const pagos = this.formasPagoRowData() ?? [];

    // 3) Preparar datos base de cabecera
    const now = new Date();
    const nowIso = formatLocalIso(now);

    const fechaTransFormulario = this.form.get('fechatransaccion')?.value;
    const fechaTrans = dateOnlySafe(fechaTransFormulario) || dateOnlySafe(nowIso);
    const anio = fechaTrans ? fechaTrans.substring(0, 4) : '';

    const idZona = Number(this.form.get('idZona')?.value || 0);
    const idAuxiliar = Number(this.auxiliarSeleccionadoCtrl.value || 0);

    const nroComprobante = (this.nroComprobanteCtrl.value || '').toString().trim();
    const idSustentoCab = Number(this.sustentoTribCtrl.value || 0);
    const idTipoCompSriCab = Number(this.tipoCompSriCtrl.value || 0);

    const autorizacionCab = (this.autorizacionCtrl.value || '').toString().trim();

    const fechaCadCab = this.fechacaducaCtrl.value ? normalizeToLocalDate(this.fechacaducaCtrl.value) : '';
    const fechaVenCab = this.fechavencimientoCtrl.value ? normalizeToLocalDate(this.fechavencimientoCtrl.value) : '';

    const beneficiario = (this.form.get('beneficiario')?.value || '').toString().trim();
    const concepto = (this.form.get('observacion')?.value || '').toString().trim();

    // Campos relacionados (NC)
    const docRelCab = (this.docRelacionadoCtrl.value || '').toString().trim();
    const autRelCab = (this.autorizacionRelacionadoCtrl.value || '').toString().trim();
    const fechaCadRelCab = this.fechaCadRelacionadoCtrl.value
      ? normalizeToLocalDate(this.fechaCadRelacionadoCtrl.value)
      : null;

    // 4) Construcción de líneas del asiento
    const nuevasLineas: DetalleAsientoResponse[] = [];

    let totalBase = 0;
    let totalIva = 0;

    // IVA agrupado por (IB/IS) y por idPorIva
    type IvaAggKey = string;
    const ivaAgg = new Map<IvaAggKey, { movCode: 'IB' | 'IS'; idPorIva: number; porcentaje: number; valor: number }>();

    const buildLinea = (over: Partial<DetalleAsientoResponse>): DetalleAsientoResponse => ({
      IdDetMaestro: 0,
      IdCabMaestro: Number(this.form.value?.IdCabMaestro ?? 0),
      numlinea: 0,

      anio,
      fechatransaccion: fechaTrans,
      fechaingreso: nowIso,
      hora: getTimeFromInput(nowIso),
      idZona,

      idCentroCostos: null as any,
      idLocal: 0,
      idPlanCuentas: 0,
      codprePc: '',
      idCodContable: idAuxiliar,
      nocomprobante: nroComprobante,
      docurelacionado: docRelCab,
      cheque: 0,

      beneficiario,
      debe: 0,
      haber: 0,
      comentario: concepto,
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

      autorizacionRelacionado: autRelCab,
      fechaCadRelacionado: fechaCadRelCab as any,

      idPorIva: null,
      porcentaje: null,

      ...over,
    });

    // 4.1) Líneas BASE (Panel 1)
    for (const r of liqDet) {
      const idCuenta = Number((r as any).idPlanCuentas ?? 0);
      const cant = this.num2((r as any).cantidad);
      const pvp = this.num2((r as any).pvpunit);

      const base = this.round2(cant * pvp);

      //const ivaVal = this.round2(this.num2((r as any).iva)); antes
      //const bien = this.to01((r as any).bien);  //antes
      const bien01 = this.to01((r as any).bien);
      const servicio01 = (r as any).servicio != null ? this.to01((r as any).servicio) : (bien01 === 1 ? 0 : 1); //nuevo
      const idPorIva = Number((r as any).idPorIva ?? 0);
      const ivaVal = this.round2(this.num2((r as any).iva)); //nuevo
      const porc = this.round2(this.num2((r as any).porcentaje));
      const esGravado = idPorIva > 0 && porc > 0;

      totalBase = this.round2(totalBase + base);
      totalIva = this.round2(totalIva + ivaVal);

      //const movBase: string = bien === 1 ? 'FCB' : 'FCS'; //antes
      const movBase = this.getMovBaseLiquidacion(bien01 === 1, servicio01 === 1, esGravado); //nuevo

      const lineaBase = buildLinea({
        idPlanCuentas: idCuenta > 0 ? (idCuenta as any) : 0 as any,
        codprePc: this.cuentas.find(c => Number(c.id) === idCuenta)?.codigo ?? '',
        movbancario: movBase,
        idMovBancario: this.getMovIdByCode(movBase),
        debe: base,
        haber: 0,
        idCodContable: idAuxiliar,
        beneficiario,
        idPorIva: idPorIva > 0 ? (idPorIva as any) : null,
        porcentaje: idPorIva > 0 ? (porc as any) : null, // ✅ guarda 0 si aplica
      });

      nuevasLineas.push(lineaBase);

      // Acumular IVA (solo si hay IVA > 0)
      if (ivaVal > 0 && idPorIva > 0 && porc > 0) {
        //const movIva: 'IB' | 'IS' = bien === 1 ? 'IB' : 'IS'; antes
        const movIva: 'IB' | 'IS' = (bien01 === 1 ? 'IB' : 'IS');
        const key: IvaAggKey = `${movIva}|${idPorIva}`;

        const prev = ivaAgg.get(key);
        if (!prev) {
          ivaAgg.set(key, { movCode: movIva, idPorIva, porcentaje: porc, valor: ivaVal });
        } else {
          prev.valor = this.round2(prev.valor + ivaVal);
        }
      }
    }

    
    // 4.2) Líneas IVA (agrupadas)
    for (const agg of ivaAgg.values()) {
      
      /*
      const cuentaIva = this.getCuentaSugeridaPorMovimiento(agg.movCode);

      const lineaIva = buildLinea({
        movbancario: agg.movCode,
        idMovBancario: this.getMovIdByCode(agg.movCode),
        idPlanCuentas: cuentaIva?.id ? (Number(cuentaIva.id) as any) : 0 as any,
        codprePc: cuentaIva?.codigo ?? '',
        debe: this.round2(agg.valor),
        haber: 0,
        idPorIva: agg.idPorIva as any,
        porcentaje: agg.porcentaje as any,
      });
      */
      const sinCuenta = this.debeIrSinCuenta(agg.movCode);
      const cuentaIva = sinCuenta ? null : this.getCuentaSugeridaPorMovimiento(agg.movCode);

      const lineaIva = buildLinea({
        movbancario: agg.movCode,
        idMovBancario: this.getMovIdByCode(agg.movCode),
        // ✅ IB/IS deben quedar sin cuenta para que seleccionen
        idPlanCuentas: sinCuenta ? (0 as any) : (cuentaIva?.id ? (Number(cuentaIva.id) as any) : (0 as any)),
        codprePc: sinCuenta ? '' : (cuentaIva?.codigo ?? ''),
        debe: this.round2(agg.valor),
        haber: 0,
        idPorIva: agg.idPorIva as any,
        porcentaje: agg.porcentaje as any,
      });
      nuevasLineas.push(lineaIva);
    }
    

    // 4.3) Créditos por Formas de Pago (Panel 2)
    let totalPagos = 0;

    for (const fp of pagos) {
      const valor = this.round2(Number(fp?.valor ?? 0));
      if (valor <= 0) continue;

      totalPagos = this.round2(totalPagos + valor);
      // ✅ Mantengo tu criterio: no-01 => '0' (0-NINGUNO) para que cierre el asiento como en tu gráfico
      const movPago = this.getMovPagoPorFormaPago(fp);
      // NOTA: aquí tú decides si quieres sugerir cuenta o dejarla en 0
      // Yo dejo tu comportamiento actual (sugiere cuenta si hay, si no, banco).
      
      /*
      const cuentaPago = this.getCuentaSugeridaPorMovimiento(movPago) ?? this.getPrimeraCuentaBanco();
      const lineaPago = buildLinea({
        movbancario: movPago,
        idMovBancario: this.getMovIdByCode(movPago),
        idPlanCuentas: cuentaPago?.id ? (Number(cuentaPago.id) as any) : 0 as any,
        codprePc: cuentaPago?.codigo ?? '',
        debe: 0,
        haber: valor,
        comentario: `PAGO ${fp?.codigofpago ?? ''}`.trim(),
      });
      */
      const sinCuentaPago = this.debeIrSinCuenta(movPago);
      // ✅ Si es 0-NINGUNO => NO sugieras banco, debe ir sin cuenta
      const cuentaPago = sinCuentaPago ? null : (this.getCuentaSugeridaPorMovimiento(movPago) ?? this.getPrimeraCuentaBanco());

      const lineaPago = buildLinea({
        movbancario: movPago,
        idMovBancario: this.getMovIdByCode(movPago),

        idPlanCuentas: sinCuentaPago ? (0 as any) : (cuentaPago?.id ? (Number(cuentaPago.id) as any) : (0 as any)),
        codprePc: sinCuentaPago ? '' : (cuentaPago?.codigo ?? ''),

        debe: 0,
        haber: valor,
        comentario: `PAGO ${fp?.codigofpago ?? ''}`.trim(),
      });

      nuevasLineas.push(lineaPago);
    }

    // 4.4) Saldo a proveedor (SOLO si realmente queda saldo)
    // ✅ CLAVE: tolerancia para evitar crear la línea extra (tu fila 8)
    const totalDocumento = this.round2(this.round2(totalBase) + this.round2(totalIva));
    let saldoProveedor = this.round2(totalDocumento - totalPagos);

    const TOL = 0.01; // centavos
    if (Math.abs(saldoProveedor) <= TOL) saldoProveedor = 0; // ✅ corte a cero

    if (saldoProveedor > 0) {
      const movSaldo = '0'; // si tienes un código real CxP, ponlo aquí

      const cuentaCxp = this.getCuentaCxpSugerida();
      const lineaSaldo = buildLinea({
        movbancario: movSaldo,
        idMovBancario: this.getMovIdByCode(movSaldo), // ✅ no hardcode 0
        idPlanCuentas: cuentaCxp?.id ? (Number(cuentaCxp.id) as any) : 0 as any,
        codprePc: cuentaCxp?.codigo ?? '',
        debe: 0,
        haber: saldoProveedor,
        comentario: 'SALDO A PROVEEDOR',
      });

      nuevasLineas.push(lineaSaldo);
    }

    // 5) Numerar líneas
    nuevasLineas.forEach((l, i) => (l.numlinea = i + 1));

    // 6) Cargar en el grid de Asiento (Panel 3)
    this.rowData.set(nuevasLineas);
    this.gridApi?.refreshCells({ force: true });

    // 7) Recalcular totales y cuadrar (por seguridad)
    this.recalcularHaberDesdeDebe(true);

    // 8) Aviso si quedaron cuentas en 0
    const faltanCuentas = nuevasLineas.some(l => Number(l.idPlanCuentas || 0) <= 0);
    if (faltanCuentas) {
      this.snack.open(
        'Asiento generado. Atención: hay líneas sin Cuenta Contable (idPlanCuentas=0). Seleccione la cuenta antes de guardar.',
        'Cerrar',
        { duration: 5500, horizontalPosition: 'right', verticalPosition: 'top' }
      );
    } else {
      this.snack.open('Asiento generado automáticamente.', 'OK', {
        duration: 3000, horizontalPosition: 'right', verticalPosition: 'top'
      });
    }
  }

/** Devuelve idMovBancario según código (movimientosBancarios.movimiento) */
private getMovIdByCode(code: string): number {
  const c = (code ?? '').toString().trim().toUpperCase();
  if (!c) return 0;
  const mov = this.movimientosBancarios.find(m => (m.movimiento ?? '').toString().trim().toUpperCase() === c);
  return Number(mov?.id ?? 0);
}

/** Sugiere una cuenta basándose en la "condición" del movimiento (igual tu filtro) */
private getCuentaSugeridaPorMovimiento(movCode: string): { id: number; codigo: string } | null {
  const code = (movCode ?? '').toString().trim().toUpperCase();
  if (!code) return null;

  const mov = this.movimientosBancarios.find(m => (m.movimiento ?? '').toString().trim().toUpperCase() === code);
  const condicion = mov?.condicion != null ? Number(mov.condicion) : null;

  if (condicion != null && !Number.isNaN(condicion) && condicion > 0) {
    const cta = (this.cuentas ?? []).find(c => Number(c.idCodigoEspecial ?? 0) === condicion);
    if (cta) return { id: Number(cta.id), codigo: (cta.codigo ?? '').toString().trim() };
  }

  return null;
}

/** Primera cuenta de banco (según tu CODIGO_ESPECIAL_BANCOS) */
private getPrimeraCuentaBanco(): { id: number; codigo: string } | null {
  const cta = (this.cuentas ?? []).find(c => this.esCuentaBanco(c));
  return cta ? { id: Number(cta.id), codigo: (cta.codigo ?? '').toString().trim() } : null;
}

/** Intento sugerir CxP: busca por texto típico; si no existe, retorna null */
private getCuentaCxpSugerida(): { id: number; codigo: string } | null {
  const lista = this.cuentas ?? [];
  const cta =
    lista.find(c => (c.label ?? '').toUpperCase().includes('CUENTAS POR PAGAR')) ||
    lista.find(c => (c.label ?? '').toUpperCase().includes('PROVEEDOR')) ||
    lista.find(c => (c.codigo ?? '').toString().startsWith('21')); // heurística común
  return cta ? { id: Number(cta.id), codigo: (cta.codigo ?? '').toString().trim() } : null;
}

private getMovPagoPorFormaPago(fp: LiquidacionCompraFormaPagoResponse): string {
  const cod = (fp?.codigofpago ?? '').toString().trim();
  if (cod === '01') return 'CH';
  return '0'; // ✅ mantiene 0-NINGUNO como tu gráfico (línea de cierre)
}

private debeIrSinCuenta(movCode: string): boolean {
  const c = (movCode ?? '').toString().trim().toUpperCase();
  return c === 'IB' || c === 'IS' || c === '0';
}

//proceso para obtener numero automatico de liquidaciones y 
///////////PROCESO DE AUTORIZACION////////////////
//1  
private getProveedorDesdeControl(): { ruc: string; id?: number } {
  const v: any = this.proveedorCtrl?.value;
  // 1) Si NO hay valor
  if (v == null) return { ruc: '' };

  // 2) Si viene como OBJETO (caso normal en tu autocomplete)
  if (typeof v === 'object') {
    const label = (v.label ?? '').toString().trim();
    const id = v.id != null ? Number(v.id) : undefined;

    // Extrae RUC del label "0102033164001 - RAZON..."
    const ruc = this.extraerRucDeLabelProveedor(label);
    return { ruc, id };
  }
  // 3) Si viene como STRING (caso cuando el usuario está escribiendo)
  const raw = (v ?? '').toString().trim();
  const ruc = this.extraerRucDeLabelProveedor(raw);
   return { ruc };
}

private extraerRucDeLabelProveedor(label: string): string {
  const s = (label ?? '').toString().trim();
  if (!s) return '';
  // Caso típico: empieza con RUC
  // "0102033164001 - ..."
  const m = /^\s*(\d{13})\b/.exec(s);
  if (m?.[1]) return m[1];
  // Fallback: buscar cualquier bloque de 13 dígitos dentro del string
  const m2 = /\b(\d{13})\b/.exec(s);
  return m2?.[1] ?? '';
}
//2
  /*  para pruebas y verificacion de la clave de acceso ok el proceso
  private buildVariablesSri(): {
    ambiente: string;
    establecimiento: string;
    caja: string;
    numeroLiquidacion: string; // 9
    ultimos8: string;          // 8
    tipoEmision: string;       // 1
  } {
    const ambiente = '2';
    const establecimiento = '001';
    const caja = '002';
    // Por ahora variables fijas (luego lo conectas a tu secuencial real)
    const numeroLiquidacion = '000000026';           // 9
    const ultimos8 = numeroLiquidacion.slice(-8);    // "00000001"
    const tipoEmision = '1';

    return { ambiente, establecimiento, caja, numeroLiquidacion, ultimos8, tipoEmision };
  }
  */
 
/////nuevo metod
private async buildVariablesSri(): Promise<{
      ambiente: string;
      establecimiento: string;
      caja: string;
      numeroLiquidacion: string; // 9
      ultimos8: string;          // 8
      tipoEmision: string;       // 1
    } | null> {

      // 1) Buscar si el usuario tiene caja/autorización para tipo doc 4 liquidacion de compra
      const idAut =
        this.usuarioActual?.cajas?.find(c => Number(c.id_tipo_documento) === 4)?.id_autorizacion_caja
        ?? null;

      if (!idAut) {
        this.snack.open(
          'El usuario no tiene creada una caja/autorización para este tipo de documento (Tipo 1).',
          'Cerrar',
          { duration: 5000, horizontalPosition: 'right', verticalPosition: 'top' }
        );
        return null;
      }

      // 2) Consultar backend
      let resp: any;
      try {
        resp = await firstValueFrom(this.autorizacionCajaService.getAutorizacionCaja(Number(idAut)));
      } catch (e) {
        this.snack.open(
          'No se pudo obtener la autorización de caja desde el servidor.',
          'Cerrar',
          { duration: 5000, horizontalPosition: 'right', verticalPosition: 'top' }
        );
        return null;
      }

      if (!resp || String(resp.type || '').toLowerCase() !== 'success' || !resp.data) {
        this.snack.open(
          resp?.message || 'No existe autorización de caja válida para este usuario.',
          'Cerrar',
          { duration: 5000, horizontalPosition: 'right', verticalPosition: 'top' }
        );
        return null;
      }

      const a = resp.data as AutorizacionCaja;

      // 3) Reemplazar valores manuales por los del servicio
      const ambiente = Number(a.produccion) === 1 ? '1' : '2'; //  pruebas=1 , prod=2,
      const establecimiento = (a.num_establecimiento ?? '').toString().trim(); // ej. "001"
      const caja = (a.caja ?? '').toString().trim(); // ej. "002"

      ///pra otros procesos
      this.cajaActualSri = caja;

      // ✅ secuencial real desde "numero"
      const numeroLiquidacion = this.pad9(a.numero);

      if (!establecimiento || !caja || !numeroLiquidacion) {
        this.snack.open(
          'Autorización de caja incompleta: falta establecimiento, caja o número (secuencial).',
          'Cerrar',
          { duration: 6000, horizontalPosition: 'right', verticalPosition: 'top' }
        );
        return null;
      }

    const ultimos8 = numeroLiquidacion.slice(-8);
    const tipoEmision = '1';
    return { ambiente, establecimiento, caja, numeroLiquidacion, ultimos8, tipoEmision };
  }
  ///fin metodo
  private pad9(value: string | number | null | undefined): string {
    const s = String(value ?? '').trim().replace(/\D/g, '');
    if (!s) return '';
    return s.slice(-9).padStart(9, '0');
  }
  //3

  private buildNoComprobanteSri(args: {
    establecimiento: string;
    caja: string;
    numeroLiquidacion: string;
  }): string {
    const estab = (args.establecimiento ?? '').replace(/\D/g, '').padStart(3, '0').slice(-3);
    const caja  = (args.caja ?? '').replace(/\D/g, '').padStart(3, '0').slice(-3);
    const sec   = (args.numeroLiquidacion ?? '').replace(/\D/g, '').padStart(9, '0').slice(-9);
    return `${estab}${caja}${sec}`; // 15
  }
  //4
  private mod11Sri(numero: string): number {
    const s = (numero ?? '').toString().replace(/\D/g, '');
    if (!s) return 0;
    let suma = 0;
    let factor = 2;
    for (let i = s.length - 1; i >= 0; i--) {
      suma += Number(s.charAt(i)) * factor;
      factor++;
      if (factor > 7) factor = 2;
    }

    const mod = suma % 11;
    const dv = 11 - mod;
    if (dv === 11) return 0;
    if (dv === 10) return 1;
    return dv;
  }
  //5
  private toDdMmYyyy(v: any): string {
    if (!v) return '';
    if (typeof v === 'string') {
      const s = v.trim();
      const mIso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
      if (mIso) return `${mIso[3]}${mIso[2]}${mIso[1]}`;
      const mLat = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
      if (mLat) return `${mLat[1]}${mLat[2]}${mLat[3]}`;
    }
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}${mm}${yyyy}`;
  }
  //6
  private generarClaveAccesoSri(args: {
    fechaEmision: any;         // Date o string
    tipoComprobante: string;   // 2 dígitos: "03"
    ruc: string;               // 13 dígitos (estricto)
    ambiente: string;          // "1" o "2"
    establecimiento: string;   // 3
    puntoEmision: string;      // 3 (caja)
    secuencial: string;        // 9
    codigoNumerico: string;    // 8
    tipoEmision: string;       // "1"
  }): string {
    const fecha = this.toDdMmYyyy(args.fechaEmision);
    if (fecha.length !== 8) return '';

    const tipoComp = (args.tipoComprobante ?? '').replace(/\D/g, '').padStart(2, '0').slice(-2);

    const ruc = (args.ruc ?? '').replace(/\D/g, '');
    if (ruc.length !== 13) return ''; // ✅ ESTRICTO
    const ambiente = (args.ambiente ?? '').replace(/\D/g, '').padStart(1, '0').slice(-1);
    const estab = (args.establecimiento ?? '').replace(/\D/g, '').padStart(3, '0').slice(-3);
    const pto = (args.puntoEmision ?? '').replace(/\D/g, '').padStart(3, '0').slice(-3);
    const serie = `${estab}${pto}`;
    const sec = (args.secuencial ?? '').replace(/\D/g, '').padStart(9, '0').slice(-9);
    const codNum = (args.codigoNumerico ?? '').replace(/\D/g, '').padStart(8, '0').slice(-8);
    const tipoEmi = (args.tipoEmision ?? '').replace(/\D/g, '').padStart(1, '0').slice(-1);

    const base48 = `${fecha}${tipoComp}${ruc}${ambiente}${serie}${sec}${codNum}${tipoEmi}`;
    const dv = this.mod11Sri(base48);

    return `${base48}${dv}`;
  }
  ///7
  /*
  private initAutoFillNoComprobanteYClave(): void {
    this.tipoCompSriCtrl.valueChanges
      .pipe(
        startWith(this.tipoCompSriCtrl.value ?? null),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.autoFillNoComprobanteYClave());
  }
  */
  private initAutoFillNoComprobanteYClave(): void {
    merge(
      this.tipoCompSriCtrl.valueChanges,
      this.proveedorCtrl.valueChanges
    )
      .pipe(
        startWith(null),
        debounceTime(50),
        filter(() => Number(this.tipoCompSriCtrl.value || 0) > 0),
        switchMap(() => {
          this.sriGenerando = true;
          return from(this.autoFillNoComprobanteYClave()).pipe(
            catchError((err) => {
              // Error inesperado (throw)
              this.resetSriProceso({
                resetTipoComp: true,
                mostrarSnack: 'Ocurrió un error al generar la autorización. Vuelva a seleccionar el tipo de comprobante.',
              });
              return EMPTY;
            }),
            finalize(() => (this.sriGenerando = false))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  //8
  private async autoFillNoComprobanteYClave(): Promise<void>  {
    const idTipoComp = Number(this.tipoCompSriCtrl.value || 0);
    if (!idTipoComp) return;
    // 1) RUC + razón social desde proveedorCtrl
    const prov = this.getProveedorDesdeControl();
    const ruc = (prov.ruc ?? '').replace(/\D/g, '').trim();

    if (ruc.length !== 13) {
      
      //this.snack.open(`RUC inválidoooooooooo: "${ruc}" (len=${ruc.length})`, 'Cerrar', {
      //  duration: 3000, horizontalPosition: 'right', verticalPosition: 'top',
      this.resetSriProceso({
      resetTipoComp: true, // <-- CLAVE para que pueda escoger otra vez (incluso el mismo)
      mostrarSnack: `RUC inválido: "${ruc}" (len=${ruc.length}). Seleccione nuevamente el tipo de comprobante.`,

      });
      return;
    }

    // 2) Variables (por ahora fijas)
    //const vars = this.buildVariablesSri();
    const vars = await this.buildVariablesSri();
    if (!vars) return; // ✅ no hace nada

    // 3) No. comprobante (15)
    const nro = this.buildNoComprobanteSri({
      establecimiento: vars.establecimiento,
      caja: vars.caja,
      numeroLiquidacion: vars.numeroLiquidacion,
    });

    // 4) Código tipo comprobante (ej: "03") desde tu lista
    const item = this.listaTiposCompSriCab.find(x => Number(x.id) === idTipoComp);
    const tipoCod = (item?.cod ?? '').toString().replace(/\D/g, '').padStart(2, '0').slice(-2);

    // 5) Fecha emisión (usa fecha transacción)
    const fechaEmision = this.form.get('fechatransaccion')?.value;

    // 6) Clave acceso (49)
    const clave = this.generarClaveAccesoSri({
      fechaEmision,
      tipoComprobante: tipoCod,
      ruc,
      ambiente: vars.ambiente,
      establecimiento: vars.establecimiento,
      puntoEmision: vars.caja,
      secuencial: vars.numeroLiquidacion,
      codigoNumerico: vars.ultimos8,
      tipoEmision: vars.tipoEmision,
    });

    if (!clave || clave.length !== 49) {
        //this.snack.open('No se pudo generar la clave de acceso. Revise fecha/tipo comprobante/variables.', 'Cerrar', {
        //duration: 3500, horizontalPosition: 'right', verticalPosition: 'top',
        this.resetSriProceso({
        resetTipoComp: true,
        mostrarSnack: 'No se pudo generar la clave de acceso. Vuelva a seleccionar el tipo de comprobante.',

      });
      return;
    }
    // 7) Setear en controles
    this.nroComprobanteCtrl.setValue(nro, { emitEvent: true });      // dispara tu validación a 15
    this.autorizacionCtrl.setValue(clave, { emitEvent: false });    // 49
  }

  private resetSriProceso(opts?: { resetTipoComp?: boolean; mostrarSnack?: string }) {
    // Limpia campos generados
    this.nroComprobanteCtrl.reset('', { emitEvent: false });
    this.autorizacionCtrl.reset('', { emitEvent: false });

    // Opcional: fuerza que el usuario pueda re-seleccionar el mismo tipo
    if (opts?.resetTipoComp) {
      this.tipoCompSriCtrl.setValue(null, { emitEvent: false });
      this.tipoCompSriCtrl.markAsUntouched();
      this.tipoCompSriCtrl.markAsPristine();
    }

    if (opts?.mostrarSnack) {
      this.snack.open(opts.mostrarSnack, 'Cerrar', {
        duration: 3500,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
    }
  }
  ////end clave de acceso 
  /////totales para grabar
  private getTotalFormasPago(): number {
    const pagos = this.formasPagoRowData() ?? [];
    const sum = pagos.reduce((acc, fp) => acc + this.num2((fp as any)?.valor), 0);
    return this.round2(sum);
  }

  private getTotalDetalleLiquidacionCab(): number {
    const cab = this.liqCab();
    return this.round2(this.num2((cab as any)?.total));
  }

  private validarTotalesLiquidacionAntesDeGuardar(): boolean {
    // 1) detener edición para capturar valores reales
    this.gridApiLiqDet?.stopEditing();
    this.gridApiPago?.stopEditing();
    this.gridApi?.stopEditing();

    const totalDet = this.getTotalDetalleLiquidacionCab(); // liqCab.total
    const totalFp  = this.getTotalFormasPago();            // sum formas pago
    const totalHab = this.round2(this.num2(this.totHaber())); // haber asiento

    const TOL = 0.01;

    const detVsFp  = Math.abs(this.round2(totalDet - totalFp));
    const detVsHab = Math.abs(this.round2(totalDet - totalHab));
    const fpVsHab  = Math.abs(this.round2(totalFp - totalHab));

    const ok = detVsFp <= TOL && detVsHab <= TOL && fpVsHab <= TOL;

    if (!ok) {
      // Mensaje exacto que pediste
      this.snack.open(
        'Verificar valores detalleliquidacion, formapago y asientocontable',
        'Cerrar',
        { duration: 5000, horizontalPosition: 'right', verticalPosition: 'top' }
      );

      // Opcional (recomendado): log para depuración
      console.warn('[VALIDACIÓN TOTALES]', {
        totalDetalleLiquidacion: totalDet,
        totalFormasPago: totalFp,
        totalHaberAsiento: totalHab,
        dif_det_fp: detVsFp,
        dif_det_haber: detVsHab,
        dif_fp_haber: fpVsHab,
      });

      return false;
    }

    return true;
  }
  ///end totales

  ////para el asiento contable
  private getMovBaseLiquidacion(esBien: boolean, esServicio: boolean, esGravado: boolean): string {
    // si vienen mal marcados (ambos o ninguno), priorizo Bien por seguridad
    const tipo: 'B' | 'S' = esBien && !esServicio ? 'B'
                      : esServicio && !esBien ? 'S'
                      : esBien ? 'B'
                      : 'S';

    if (tipo === 'B') return esGravado ? 'FCB' : 'FSB';
    return esGravado ? 'FCS' : 'FSS';
  }
  ///OTRAS FUNCIONES

  ///nuevas funciones
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

///validador para el numero de comprobante


function sriNoComprobanteValidator(cfg: SriSerieRangoCfg = {}) {
  const minEstab = cfg.minEstab ?? 1;
  const maxEstab = cfg.maxEstab ?? 99;
  const minPto   = cfg.minPto   ?? 1;
  const maxPto   = cfg.maxPto   ?? 999;

  return (control: FormControl<string>): { [key: string]: any } | null => {
    const valueRaw = (control.value ?? '').trim();
    if (!valueRaw) return null;

    const value = valueRaw.replace(/\D/g, ''); // por seguridad, solo dígitos

    // 15 dígitos exactos
    if (!/^\d{15}$/.test(value)) return { sriFormato: true };

    const estabStr = value.substring(0, 3);  // 001
    const ptoStr   = value.substring(3, 6);  // 001
    const secStr   = value.substring(6, 15); // 000000001

    const estab = Number(estabStr);
    const pto   = Number(ptoStr);

    // "000" no permitido y además dentro de rango
    if (estabStr === '000' || ptoStr === '000') return { sriFormato: true };

    // ✅ rango permitido: 001–099 (o lo que configures)
    if (isNaN(estab) || estab < minEstab || estab > maxEstab) {
      return { sriSerieRango: { parte: 'estab', valor: estabStr, min: minEstab, max: maxEstab } };
    }
    if (isNaN(pto) || pto < minPto || pto > maxPto) {
      return { sriSerieRango: { parte: 'pto', valor: ptoStr, min: minPto, max: maxPto } };
    }

    // Secuencial no debe ser todo ceros
    if (/^0{9}$/.test(secStr)) return { sriSecuencialInvalido: true };

    return null;
  };
}

//fechas
function toDateOnlyString(v: any): string {
  if (!v) return '';

  // string: "yyyy-MM-dd" o "yyyy-MM-ddTHH:mm:ss..."
  if (typeof v === 'string') {
    const s = v.trim();
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
    return m ? m[1] : '';
  }

  // Date object
  if (v instanceof Date && !isNaN(v.getTime())) {
    const yyyy = v.getFullYear();
    const mm = String(v.getMonth() + 1).padStart(2, '0');
    const dd = String(v.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return '';
}

function getYearFromDateOnly(v: any): string {
  const s = toDateOnlyString(v);
  return s ? s.substring(0, 4) : '';
}

function dateOnlySafe(v: any): string {
  if (!v) return '';

  // Si ya viene como string ISO/date-only, cortar sin convertir a Date
  if (typeof v === 'string') {
    const s = v.trim();

    // yyyy-MM-dd o yyyy-MM-ddTHH:mm:ss...
    const mIso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (mIso) return `${mIso[1]}-${mIso[2]}-${mIso[3]}`;

    // dd/MM/yyyy (por si en algún lado te llega así)
    const mLat = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    if (mLat) return `${mLat[3]}-${mLat[2]}-${mLat[1]}`;

    return '';
  }
  // Si viene Date, formatear en local SIN convertir a UTC
  if (v instanceof Date && !isNaN(v.getTime())) {
    const yyyy = v.getFullYear();
    const mm = String(v.getMonth() + 1).padStart(2, '0');
    const dd = String(v.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
}


