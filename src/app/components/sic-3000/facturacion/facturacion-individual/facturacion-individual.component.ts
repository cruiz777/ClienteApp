import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ClienteContactoService } from 'src/app/services/cliente-contacto.service';
import { forkJoin, Observable, of } from 'rxjs';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, ColGroupDef, GridApi, ValueSetterParams } from 'ag-grid-community';
import { FormaPagoService, FormaPagoResponse } from 'src/app/services/forma-pago.service';
import { MatAutocompleteSelectedEvent, MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FacturacionService } from 'src/app/services/facturacion.service';
import { IvaService, Iva } from 'src/app/services/iva.service';
import { FacturaCrearRequest, FacturaDetalleRequest, FacturaFormaPagoRequest } from 'src/app/services/facturacion.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { multipleEmailsValidator } from 'src/app/util/validators';
import {
  FacturacionMesesResult
} from 'src/app/components/sic-3000/facturacion/facturacion-meses-modal/facturacion-meses-modal.component';
import { CellDoubleClickedEvent } from 'ag-grid-community';
import { DetalleDescripcionModalComponent } from '../detalle-descripcion-modal/detalle-descripcion-modal.component';
import { HttpClient } from '@angular/common/http';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule, MatSelectChange } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GrupoEmpresaService } from 'src/app/services/grupo-empresa.service';
import { AutorizacionCajaService } from 'src/app/services/autorizacion-caja.service';
import { DescuentoService, Descuento, DescuentoApi } from 'src/app/services/descuento.service';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FacturacionMesesModalComponent } from '../facturacion-meses-modal/facturacion-meses-modal.component';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  take,
  filter,
  map,
  tap, finalize,
  startWith
} from 'rxjs/operators';

import { ClienteSummary } from 'src/app/interfaces/responses/cliente-summary-response';
import { PrefijoClienteTResponse } from 'src/app/interfaces/responses/PrefijoClienteResponse';

import { ClienteService } from 'src/app/services/cliente.service';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { LogoService } from 'src/app/services/logo.service';
import { ExportService } from 'src/app/services/export.service';
import { EmpresaService } from 'src/app/services/empresa.service';
import { HttpClientModule } from '@angular/common/http';
import { defineLocale } from 'moment';

interface LineaFactura {
  codpro: string | null;
  cantidad: number;
  detalle: string;
  pUnidad: number;
  iva: number;
  desUnit: number;     // $ descuento unitario
  descuento: number;   // $ descuento absoluto adicional (opcional)
  desTotal: number;    // $ descuento total (cantidad * desUnit)
  total: number;
  descPct?: number;    // 👈 % de descuento (0..100)
  base?: number;   // base imponible de la línea (ya con descuento, SIN IVA)
  ivaVal?: number; // valor de IVA de la línea
  periodo?: string;
}


// Tipos locales
interface PrefijoCliente {
  id_prefijos: number;
  codpre: string;
}
interface PaymentDetail {
  id: number;
  method: string;
  term: string;
  timeUnit: string;
  value: number;
}

@Component({
  selector: 'app-facturacion-individual',
  standalone: true,
  templateUrl: './facturacion-individual.component.html',
  styleUrls: ['./facturacion-individual.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,          // ✅ necesario para servicios HTTP en standalone
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatSelectModule,
    MatButtonModule,
    MatMenuModule,
    MatTableModule,
    MatPaginatorModule,
    MatSnackBarModule,
    AgGridModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule
  ]
})
export class FacturacionIndividualComponent implements OnInit {
  @ViewChild(MatAutocompleteTrigger) autoPagoTrigger!: MatAutocompleteTrigger;
  @ViewChild('pagoInputRef') pagoInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('autoProductoTrigger') autoProductoTrigger!: MatAutocompleteTrigger;
  @ViewChild('productoInputRef') productoInputRef!: ElementRef<HTMLInputElement>;
  // ---- ViewChild para cerrar el panel y limpiar input
  @ViewChild('autoDescuentoTrigger') autoDescuentoTrigger!: MatAutocompleteTrigger;
  @ViewChild('descuentoInputRef') descuentoInputRef!: ElementRef<HTMLInputElement>;

  // ============= Pasos / Tabs =============
  currentStep = 1;
  nombreCliente = '';
  onTabChange(idx: number): void {
    // idx: 0=Cliente, 1=Factura, 2=Pagos
    if (idx === 1 && !this.puedeIrPaso2) {
      this._snackBar.open('Completa los datos del cliente para continuar.', 'Cerrar', { duration: 2500 });
      // volver visualmente a la pestaña 1
      setTimeout(() => this.currentStep = 1);
      return;
    }
    this.currentStep = (idx ?? 0) + 1;
  }


  // ============= Autocomplete Cliente =============
  clienteOrigenControl = new FormControl<string | any | null>(null, Validators.required);
  clientesOrigenFiltrados: ClienteSummary[] = [];
  prefijosClienteOrigen: (PrefijoClienteTResponse & { seleccionado?: boolean })[] = [];
  codcliO = 0;
  usuarioActual = this.usuarioService.getUsuarioActual();
  baseTarifa0 = 0;      // p.ej. 50.00
  baseGravada = 0;      // p.ej. 185.00
  generando = false;

  // ============= Prefijos (mat-select) =============
  prefijos: PrefijoCliente[] = [];
  descuentos: Descuento[] = [];
  filteredDescuentos$: Observable<Descuento[]> = of([]);
  descuentoSeleccionado: Descuento | null = null;

  ivaOptions: number[] = [0, 12, 15];   // fallback inicial hasta que cargue del backend
  ivasCatalogo: Iva[] = [];
  // ============= Formularios por pestaña =============
  formCliente!: FormGroup;
  formFactura!: FormGroup;
  formPagos!: FormGroup;
  formTotales!: FormGroup;
  formCaja!: FormGroup;

  isLoadingDetalle = false;

  /// grid producto
  gridApi!: GridApi;
  columnDefs: ColDef<any, any>[] = [
    {
      headerName: 'Cantidad',
      field: 'cantidad',
      editable: true,
      width: 90,
      type: 'numericColumn',
      cellEditor: 'agNumberCellEditor',
      valueSetter: (p: ValueSetterParams<any>) => {
        const v = Number(p.newValue);
        p.data.cantidad = Number.isFinite(v) ? Math.max(1, Math.trunc(v)) : 1;
        return true;
      }
    },
    { headerName: 'Cod.', field: 'codpro', width: 60, suppressColumnsToolPanel: true },
    { headerName: 'Periodo', field: 'periodo', hide: true, editable: false, flex: 1, minWidth: 200, tooltipField: 'periodo' },
    { headerName: 'Detalle', field: 'detalle', editable: false, flex: 1, minWidth: 200, tooltipField: 'detalle' },
    {
      headerName: 'P. Unidad',
      field: 'pUnidad',
      editable: true,
      type: 'numericColumn',
      cellEditor: 'agNumberCellEditor',
      width: 95,
      // redondea a 3 decimales al guardar en la data
      valueSetter: (p: ValueSetterParams<any>) => {
        const v = Number(p.newValue);
        p.data.pUnidad = this.toN(Number.isFinite(v) ? v : 0, 3);
        return true;
      },
      // muestra siempre con 3 decimales
      valueFormatter: (p: any) => this.fmtN(p.value, 3),
    },
    {
      headerName: 'IVA',
      field: 'iva',
      editable: false,
      width: 65,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: () => ({ values: this.ivaOptions }),
      valueFormatter: p => (p.value != null ? `${p.value}%` : ''),
      valueSetter: p => {
        const v = Number(p.newValue);
        if (!Number.isFinite(v) || !this.ivaOptions.includes(v)) return false;
        p.data.iva = v; return true;
      }
    }

    ,
    {
      headerName: 'Des. Unitario',
      field: 'desUnit',
      type: 'numericColumn',
      cellEditor: 'agNumberCellEditor',
      width: 115,

      // 👇 Solo editable si NO hay descuento general
      editable: () => !this.tieneDescuentoGlobal(),

      // Mensaje al pasar el mouse si está bloqueado
      tooltipValueGetter: () =>
        this.tieneDescuentoGlobal()
          ? 'Ya hay un descuento general. Limpie el combo para editar por fila.'
          : null,

      // Estilo visual cuando está bloqueado (grisecito)
      cellClassRules: {
        'ag-cell-disabled': () => this.tieneDescuentoGlobal(),
      },

      valueSetter: (p) => {
        const v = Number(p.newValue);
        p.data.desUnit = this.toN(Number.isFinite(v) ? v : 0, 3);
        const unit = Number(p.data.pUnidad) || 0;
        p.data.descPct = unit > 0 ? this.toN((p.data.desUnit / unit) * 100, 2) : 0;
        return true;
      },
      valueFormatter: (p) => this.fmtN(p.value, 3),
    },

    {
      headerName: 'Descuento',
      field: 'descPct',
      type: 'numericColumn',
      cellEditor: 'agNumberCellEditor',
      width: 115,

      // 👇 Solo editable si NO hay descuento general
      editable: () => !this.tieneDescuentoGlobal(),

      tooltipValueGetter: () =>
        this.tieneDescuentoGlobal()
          ? 'Ya hay un descuento general. Limpie el combo para editar por fila.'
          : null,

      cellClassRules: { 'ag-cell-disabled': () => this.tieneDescuentoGlobal() },

      valueSetter: (p) => {
        let v = Number(p.newValue);
        if (!Number.isFinite(v)) v = 0;
        v = Math.max(0, Math.min(100, Math.round(v * 100) / 100));
        p.data.descPct = v;
        const unit = Number(p.data.pUnidad) || 0;
        p.data.desUnit = this.toN(unit * (v / 100), 3);
        this.recalcLinea(p.data);
        return true;
      },
      valueFormatter: (p) => `${this.fmtN(p.value, 2)} %`,
    }
    ,

    {
      headerName: 'Des. Total', field: 'desTotal', editable: false, type: 'numericColumn', width: 120,
      valueFormatter: (p) => this.fmtN(p.value, 2)
    },
    {
      headerName: 'Total', field: 'total', editable: false, type: 'numericColumn', width: 90, pinned: 'right',
      valueFormatter: (p) => this.fmtN(p.value, 2)
    },
    {
      headerName: '',
      width: 65,
      pinned: 'left',
      cellRenderer: (params: any) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ag-btn-icon ag-btn-delete';
        btn.title = 'Eliminar';
        btn.setAttribute('aria-label', 'Eliminar forma de Producto');
        btn.innerHTML = '<span class="material-icons">delete</span>';

        // 👇 aquí
        btn.addEventListener('click', () => {
          params.api.applyTransaction({ remove: [params.node.data] });

          // Recalcular totales y ajustar pagos al nuevo total
          // (usa arrow function para mantener el this del componente)
          this.recalcTotalesFactura();
          this.ajustarPagosAlTotal();
          this.actualizarPuedeAbrirMeses();
          // si ves que no actualiza a la primera, usa:
          // setTimeout(() => { this.recalcTotalesFactura(); this.ajustarPagosAlTotal(); }, 0);
        });

        return btn;
      }
    },
    {
      headerName: '',
      width: 70,
      pinned: 'left',
      suppressColumnsToolPanel: true,
      cellRenderer: (params: any) => {
        // solo mostrar para el producto 1176
        if ((params.data?.codpro ?? '').toString() !== this.COD_MANT_MENSUAL) {
          const span = document.createElement('span');
          return span; // vacío para otros productos
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ag-btn-icon ag-btn-meses';
        btn.title = 'Seleccionar meses para esta fila';
        btn.setAttribute('aria-label', 'Seleccionar meses');
        btn.innerHTML = '<span class="material-icons">open_in_new</span>';

        btn.addEventListener('click', () => {
          this.abrirDialogoMesesFila(params);        // 👈 nuevo método (abajo)
        });

        return btn;
      }
    }


  ];


  defaultColDef: ColDef = { resizable: true, sortable: false, filter: false };
  rowData: LineaFactura[] = [
  ];

  /// grid pagos
  pagosApi!: GridApi;
  columnDefsPagos: ColDef[] = [
    { headerName: 'Id', field: 'id', editable: false, flex: 1, minWidth: 180, hide: true, suppressColumnsToolPanel: true },
    { headerName: 'Detalle', field: 'detalle', editable: false, flex: 1, minWidth: 180 },
    { headerName: 'Plazo', field: 'plazo', editable: true, width: 120 },
    {
      headerName: 'Tiempo',
      field: 'tiempo',
      editable: true,
      width: 90,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['Días', 'Meses'] }
    },

    {
      headerName: 'Valor',
      field: 'valor',
      editable: true,
      type: 'numericColumn',
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: { min: 0, step: 0.01 },
      width: 120,
      valueSetter: (p: ValueSetterParams<any>) => this.pagoValorSetter(p), // 👈
      valueFormatter: (p) => this.fmtN(p.value, 2)
    },
    { headerName: 'Banco', field: 'banco', editable: true, flex: 1, minWidth: 180 },
    { headerName: 'NTarjeta', field: 'ntarjeta', editable: true, flex: 1, minWidth: 180 },
    { headerName: 'Cheque', field: 'cheque', editable: true, flex: 1, minWidth: 180 },
    { headerName: 'Dueño', field: 'dueno', editable: true, flex: 1, minWidth: 180 },
    { headerName: 'Autorización', field: 'autorizacion', editable: true, flex: 1, minWidth: 180 },
    {
      headerName: '',
      width: 66,
      pinned: 'left',
      cellRenderer: (params: any) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ag-btn-icon ag-btn-delete';
        btn.title = 'Eliminar';
        btn.setAttribute('aria-label', 'Eliminar forma de pago');
        btn.innerHTML = '<span class="material-icons">delete</span>';

        btn.addEventListener('click', () => {
          params.api.applyTransaction({ remove: [params.node.data] });

          // ⇩ Recalcula el saldo (total factura - suma pagos)
          setTimeout(() => this.onPagosRowsChanged(), 0);
          // o: requestAnimationFrame(() => this.onPagosRowsChanged());
        });

        return btn;
      }
    }

  ];
  rowDataPagos: any[] = [];
  defaultColDefPagos: ColDef = { resizable: true, sortable: false, filter: false };

  private readonly COD_MANT_MENSUAL = '1176';

  // Estado para habilitar el botón
  puedeAbrirMeses = false;
  // ============= Otros =============
  private seqId = 0;
  invoiceDate = new Date().toLocaleDateString('es-EC');
  values = { subtotal: 0, discount: 0, valueWithoutIva: 0, valueWithIva: 0, ivaValue: 0, total: 0 };
  pendingBalance = 0;

  // Autocomplete formas de pago
  filteredFormasPago$: Observable<FormaPagoResponse[]> = of([]);
  isLoadingFormas = false;
  vInscripcion: number = 0;
  vAsignacion: number = 0;
  vMantenimiento: number = 0
  grupoCli:string='';
  // Productos desde el backend
  productos: any[] = []; // o usa la interfaz de tu servicio: ProductoResponse[]
  filteredProductos$ = of([] as any[]); // stream para el autocomplete
  // ===== propiedades de estado =====
  isLoadingProductos = false;       // para spinner
  productosLoaded = false;          // terminó la carga (éxito o error)
  productosCount = 0;               // cuántos llegaron
  productosError: string | null = null;
  constructor(
      private http: HttpClient,
    private clienteService: ClienteService,
    private prefijoService: PrefijoService,
    private usuarioService: UsuarioService,
    private exportService: ExportService,
    private empresaService: EmpresaService,
    private logoService: LogoService,
    private _snackBar: MatSnackBar,
    private fb: FormBuilder,
    private grupoEmpresaService: GrupoEmpresaService,
    private clienteContactoService: ClienteContactoService,
    private autorizacionCajaService: AutorizacionCajaService,
    private formaPagoService: FormaPagoService,
    private cdRef: ChangeDetectorRef,
    private facturacionService: FacturacionService,
    private descuentoService: DescuentoService,
    private ivaService: IvaService,
    private dialog: MatDialog,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    this.cargarIvasVigentes();
    this.cargarAutorizacion();

    this.cargarProductos();
    // Formularios
    this.formCliente = this.fb.group({
      clienteCodigo: [0, [Validators.required, Validators.min(1)]],

      telefono: ['', [
        Validators.required,
        (ctrl: AbstractControl) => {
          const valor = (ctrl.value || '').toString();
          const digitos = valor.replace(/\D/g, '').length;
          return digitos >= 9 ? null : { telefonoInvalido: true };
        }
      ]],
      identificacion: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      direccion: ['', [Validators.required]],
      emailOpcional: ['', [multipleEmailsValidator({ max: 5, separators: /[;,]+/ })]],
      categoria: ['', [Validators.required]],
      gcp: ['', [Validators.required]],      // prefijo (select)
      prefijo: ['']

    });

    this.formFactura = this.fb.group({
      producto: [''],
      descuento: [''],
      anio: [new Date().getFullYear()]
    });

    this.formPagos = this.fb.group({
      metodoPago: [''],
      plazo: [''],
      tiempo: [''],
      valor: ['']
    });

    this.formTotales = this.fb.group({
      subtotal: [{ value: 0, disabled: true }],
      descuento: [{ value: 0, disabled: true }],
      valorSinIva: [{ value: 0, disabled: true }],
      valorConIva: [{ value: 0, disabled: true }],
      iva: [{ value: 0, disabled: true }],
      total: [{ value: 0, disabled: true }],
      saldoPendiente: [{ value: 0, disabled: true }]
    });
    const hoy = new Date();

    // Formatea con dos dígitos (día/mes/año)
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0'); // enero = 0
    const anio = hoy.getFullYear();

    const fechaFormateada = `${dia}/${mes}/${anio}`; // → "01/09/2025"
    this.formCaja = this.fb.group({
      puntoEmision: [''],
      ordenCompra: [''],
      secuencial: [''],
      observacion: [''],
      caja: [''],
      guiaRemision: [''],
      fechaFacturacion: [fechaFormateada]
    });

    // ==== Autocomplete clientes ====
    this.clienteOrigenControl.valueChanges
      .pipe(
        filter((valor): valor is string => typeof valor === 'string'),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(valor => {
          const filtro = valor.trim();
          return filtro
            ? this.clienteService.getClientesSummary(filtro).pipe(
              catchError(_ => {
                this.mostrarAlerta('Error buscando clientes', 'error');
                return of({ data: [] as ClienteSummary[] });
              })
            )
            : of({ data: [] as ClienteSummary[] });
        })
      )
      .subscribe(resp => this.clientesOrigenFiltrados = resp.data || []);

    // ==== Autocomplete formas de pago ====
    // --- arriba del bloque, dentro de ngOnInit (o como propiedad de la clase) ---
    const metodoCtrl = this.formPagos.get('metodoPago') as FormControl;

    // cachea la lista de activas una sola vez
    const formasActivas$ = this.formaPagoService.getActivas().pipe(
      map(resp => (resp?.data ?? []).map((x: any) => ({
        idFormaPago: x.idFormaPago ?? x.id_forma_pago ?? x.id ?? 0,
        descripcionPago: x.descripcionPago ?? x.descripcion_pago ?? x.descripcion ?? ''
      }) as FormaPagoResponse)),
      shareReplay(1)
    );

    // stream filtrado para el autocomplete (filtra localmente)
    this.filteredFormasPago$ = combineLatest([
      metodoCtrl.valueChanges.pipe(
        startWith(''),
        debounceTime(250),
        distinctUntilChanged(),
        map((v: any) =>
          (typeof v === 'string' ? v : (v?.descripcionPago ?? v?.descripcion_pago ?? '')).trim().toLowerCase()
        ),
        tap(() => this.isLoadingFormas = true)
      ),
      formasActivas$
    ]).pipe(
      map(([term, lista]) =>
        !term ? lista : lista.filter(fp => (fp.descripcionPago ?? '').toLowerCase().includes(term))
      ),
      finalize(() => this.isLoadingFormas = false),
      catchError(err => {
        console.error('[FormasPago] error:', err);
        this.isLoadingFormas = false;
        return of([] as FormaPagoResponse[]);
      })
    );

    this.cargarDescuentos();
    this.configurarFiltroDescuentos();
  }

  // ============= Prefijos =============
  cargarPrefijos(codigoCliente: number): void {
    this.prefijoService.obtenerPorClienteCodigo(codigoCliente).subscribe({
      next: (data: PrefijoCliente[]) => {
        this.prefijos = data ?? [];
        if (this.prefijos.length === 1) {
          const unico = this.prefijos[0];
          this.formCliente.patchValue({ gcp: unico.id_prefijos, prefijo: unico.codpre }, { emitEvent: false });
        } else {
          this.formCliente.patchValue({ gcp: '', prefijo: '' }, { emitEvent: false });
        }
      },
      error: (err) => {
        console.error('Error al cargar prefijos:', err);
        this.prefijos = [];
        this.formCliente.patchValue({ gcp: '', prefijo: '' }, { emitEvent: false });
      }
    });
  }

  onPrefijoChange(event: MatSelectChange): void {
    const idSeleccionado = event.value as number;
    const encontrado = this.prefijos.find(p => p.id_prefijos === idSeleccionado) || null;
    this.formCliente.patchValue({ gcp: idSeleccionado ?? '', prefijo: encontrado?.codpre ?? '' });
  }
  trackByPrefijoId = (_: number, p: PrefijoCliente) => p.id_prefijos;

  // ============= Autocomplete Cliente =============
  mostrarNombreCliente = (cliente: ClienteSummary | string | null): string =>
    (cliente && typeof cliente === 'object') ? (cliente.nomcli ?? '') : (cliente ?? '') as string;

  seleccionarClienteOrigen(cliente: ClienteSummary): void {
    if (!cliente?.clientes_codigo) return;
    this.codcliO = cliente.clientes_codigo;
    this.formCliente.patchValue({ clienteCodigo: this.codcliO });
    this.cargarPrefijos(this.codcliO);
    this.cargarClienteDetalle(this.codcliO);
    this.nombreCliente = cliente.nomcli;
  }

  onClienteInputBlur(): void {
    const valor = this.clienteOrigenControl.value;

    if (this.codcliO > 0) {
      this.formCliente.patchValue({ clienteCodigo: this.codcliO });
      this.cargarClienteDetalle(this.codcliO);
      return;
    }

    if (typeof valor === 'string' && valor.trim().length > 0) {
      const exact = this.clientesOrigenFiltrados.find(c =>
        (c.nomcli ?? '').toLowerCase().trim() === valor.toLowerCase().trim()
      );
      if (exact?.clientes_codigo) {
        this.codcliO = exact.clientes_codigo;
        this.clienteOrigenControl.setValue(exact, { emitEvent: false });
        this.cargarPrefijos(this.codcliO);
        this.cargarClienteDetalle(this.codcliO);
        return;
      }

      this.clienteService.getClientesSummary(valor.trim())
        .pipe(take(1))
        .subscribe(resp => {
          const lista = resp?.data ?? [];
          if (lista.length === 1 && lista[0].clientes_codigo) {
            this.codcliO = lista[0].clientes_codigo;
            this.clienteOrigenControl.setValue(lista[0], { emitEvent: false });
            this.cargarPrefijos(this.codcliO);
            this.cargarClienteDetalle(this.codcliO);
          }
        }, _ => this.mostrarAlerta('Error buscando cliente', 'error'));
    } else {
      this.mostrarAlerta('No seleccionó cliente', 'info');
      this.prefijos = [];
      this.codcliO = 0;
      this.formCliente.reset();
    }
  }

  private cargarClienteDetalle(id: number): void {
    this.isLoadingDetalle = true;

    this.clienteService.getClienteById(id)
      .pipe(
        take(1),
        switchMap((cli: any) => {
          const valoresBase: { [key: string]: any } = {
            identificacion: cli?.ruc ?? cli?.cedula ?? '',
            direccion: cli?.dircli ?? cli?.direccion ?? '',
            telefono: cli?.telefono ?? cli?.telcli ?? '',
            email: cli?.email ?? cli?.correo ?? '',
            emailOpcional: cli?.emailOpcional ?? ''
          };

          const idGrupo = cli?.idGrupoEmpresa ?? cli?.id_grupo_empresa;
          const clientesCodigo = cli?.clientesCodigo ?? cli?.clientes_codigo ?? id;

          const categoria$ = idGrupo
            ? this.grupoEmpresaService.obtenerGrupoBasicoPorId(idGrupo).pipe(
              tap((ge: any) => {
                this.vInscripcion = ge?.inscripcion ?? 0;
                this.vAsignacion = ge?.asignacion ?? 0;
                this.vMantenimiento = ge?.mantenimiento ?? 0;
                this.grupoCli=ge?.codigo;
                //alert(this.vMantenimiento);
              }),
              map((ge: any) => `${ge.codigo}   ${ge.nombre}`.trim()),
              catchError(() => {
                this.vInscripcion = this.vAsignacion = this.vMantenimiento = 0;
                return of(cli?.categoria ?? '');
              })
            )
            : (this.vInscripcion = this.vAsignacion = this.vMantenimiento = 0, of(cli?.categoria ?? ''));


          const contactos$ = this.clienteContactoService.getFacturacionByClienteCodigo(clientesCodigo).pipe(
            catchError(() => of([]))
          );

          return forkJoin({ categoria: categoria$, contactos: contactos$ }).pipe(
            map(({ categoria, contactos }) => {
              const getProp = (o: any, ...keys: string[]) =>
                keys.map(k => o?.[k]).find(v => v !== undefined);

              const findEmailLinea = (n: number): string => {
                const c = (contactos as any[]).find(x => (getProp(x, 'linea', 'Linea') ?? 0) === n);
                const email = getProp(c ?? {}, 'email', 'Email');
                return (email ?? '').toString().trim();
              };

              const emailLinea2 = findEmailLinea(2);
              const emailLinea3 = findEmailLinea(3);

              const emailOpcionalConcat = [emailLinea3].filter(Boolean).join(';');

              return {
                ...valoresBase,
                categoria,
                email: emailLinea2 || (valoresBase['email'] as string),
                emailOpcional: emailOpcionalConcat || (valoresBase['emailOpcional'] as string)
              } as { [key: string]: any };
            })
          );
        })
      )
      .subscribe({
        next: (valoresPatch: { [key: string]: any }) => {
          this.isLoadingDetalle = false;
          this.formCliente.patchValue(valoresPatch);
        },
        error: _ => {
          this.isLoadingDetalle = false;
          this.mostrarAlerta('No se pudo cargar el detalle del cliente', 'error');
        }
      });
  }

  // ============= Varios =============
  onProductSelect(): void { }
  onDateChange(): void { }
  onPaymentMethodChange(): void { }
  onGenerateInvoice(): void { }
  limpiarCliente(): void {
    // ---- Cliente
    this.clienteOrigenControl.setValue('', { emitEvent: false });
    this.clientesOrigenFiltrados = [];
    this.prefijos = [];
    this.codcliO = 0;
    this.formCliente.reset();
    this.baseGravada = 0;
    this.nombreCliente = '';
    this.grupoCli='';
    // ---- Descuento / Factura (autocompletes)
    this.formFactura.patchValue({ producto: '', descuento: '' }, { emitEvent: false });
    this.descuentoSeleccionado = null;

    // Cerrar paneles y quitar foco (si estuvieran abiertos)
    this.autoProductoTrigger?.closePanel();
    this.autoDescuentoTrigger?.closePanel();
    this.productoInputRef?.nativeElement.blur();
    this.descuentoInputRef?.nativeElement.blur();

    // ---- Grid de productos: limpiar filas
    if (this.gridApi) {
      const rows: any[] = [];
      this.gridApi.forEachNode(n => rows.push(n.data));
      if (rows.length) this.gridApi.applyTransaction({ remove: rows });
    } else {
      this.rowData = [];
    }

    // ---- Grid de pagos: limpiar filas y formulario
    if (this.pagosApi) {
      const rows: any[] = [];
      this.pagosApi.forEachNode(n => rows.push(n.data));
      if (rows.length) this.pagosApi.applyTransaction({ remove: rows });
    } else {
      this.rowDataPagos = [];
    }
    this.formPagos.reset({ metodoPago: '', plazo: '', tiempo: '', valor: '' });
    this.autoPagoTrigger?.closePanel();
    this.pagoInputRef?.nativeElement.blur();

    // ---- Variables de precios especiales (por si venían del grupo)
    this.vInscripcion = 0;
    this.vAsignacion = 0;
    this.vMantenimiento = 0;

    // ---- Totales
    this.formTotales.patchValue({
      subtotal: 0,
      descuento: 0,
      valorSinIva: 0,
      valorConIva: 0,
      iva: 0,
      total: 0,
      saldoPendiente: 0
    }, { emitEvent: false });

    // Garantiza refresco visual
    this.cdRef?.markForCheck();
    this.actualizarPuedeAbrirMeses();
  }

  mostrarAlerta(mensaje: string, tipo: 'info' | 'error' | 'ok' | string): void {
    this._snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'right',   // 👈 fuerza derecha
      verticalPosition: 'top',       // 👈 arriba
      panelClass: tipo === 'error' ? ['snack-error']
        : tipo === 'ok' ? ['snack-ok']
          : ['snack-info']
    });
  }


  onGridReady(e: any) { this.gridApi = e.api; this.actualizarPuedeAbrirMeses(); }
  onPagosGridReady(e: any) { this.pagosApi = e.api; }

  // ==== Autocomplete helpers ====
  displayFormaPago = (fp: FormaPagoResponse | string | null): string =>
    (typeof fp === 'string') ? fp : (fp?.descripcionPago ?? '');

  onFormaPagoSelected(event: MatAutocompleteSelectedEvent): void {
    const item = event.option.value as FormaPagoResponse;
    const metodoCtrl = this.formPagos.get('metodoPago') as FormControl;

    // evitar duplicados
    let yaExiste = false;
    if (this.pagosApi) {
      this.pagosApi.forEachNode(n => { if (n.data?.id === item.idFormaPago) yaExiste = true; });
    } else {
      yaExiste = this.rowDataPagos.some(r => r.id === item.idFormaPago);
    }
    if (!yaExiste) {
      const valorInicial = this.getSaldoPendienteCalc(); // 👈 saldo pendiente actual
      const nueva = this.buildPagoRow(item, valorInicial); // 👈 pásalo
      if (this.pagosApi) this.pagosApi.applyTransaction({ add: [nueva] });
      else this.rowDataPagos.push(nueva);

      // Recalcular saldo
      this.onPagosRowsChanged();
    }

    setTimeout(() => {
      metodoCtrl.setValue('', { emitEvent: false });
      this.autoPagoTrigger?.closePanel();
      this.pagoInputRef?.nativeElement.blur();
    }, 0);
  }


  // helper dentro de la clase (arriba o debajo de los métodos)
  // 👉 agrega esto en tu componente
  private readonly AUTORIZACION_DEFAULT =
    'OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO';

  // ...y modifica buildPagoRow:
  private buildPagoRow(fp: FormaPagoResponse, valorInicial: number = 0) {
    return {
      id: fp.idFormaPago,
      detalle: fp.descripcionPago ?? '',
      plazo: 0,
      tiempo: 'Días',
      valor: this.to2(valorInicial),
      // 👇 aquí el valor por defecto
      autorizacion: this.AUTORIZACION_DEFAULT,
      // (opcional) inicializa otros campos vacíos
      banco: '',
      ntarjeta: '',
      cheque: '',
      dueno: ''
    };
  }





  cargarProductos(): void {
    this.isLoadingProductos = true;
    this.productosLoaded = false;
    this.productosError = null;

    this.facturacionService.getProductosCodproFijos().pipe(
      take(1),
      tap(data => this.productosCount = data?.length ?? 0),
      finalize(() => {
        this.isLoadingProductos = false;
        this.productosLoaded = true;
      })
    ).subscribe({
      next: data => {
        this.productos = data ?? [];

        // Configurar filtro del autocomplete
        const ctrl = this.formFactura.get('producto') as FormControl;
        this.filteredProductos$ = ctrl.valueChanges.pipe(
          startWith(''), // <-- para que muestre algo al inicio si quieres
          map(v => (typeof v === 'string' ? v : (v ?? '')).toString().trim().toLowerCase()),
          map(term => {
            if (!term) return this.productos;
            return this.productos.filter(p =>
              (p.codpro ?? '').toLowerCase().includes(term) ||
              (p.despro ?? '').toLowerCase().includes(term)
            );
          })
        );

        // feedback opcional
        if (this.productosCount === 0) {
          this.mostrarAlerta('No se encontraron productos', 'info');
        } else {
          // this.mostrarAlerta(`Productos cargados: ${this.productosCount}`, 'ok');
        }
      },
      error: err => {
        this.productosError = err?.message ?? 'Error al cargar productos';
        this.filteredProductos$ = of([]);
        this.mostrarAlerta(this.productosError ?? 'Error al cargar productos', 'error');

      }
    });
  }


  cargarAutorizacion() {
  const id = this.usuarioActual?.id_autorizacion_usuario;

  // si no hay autorización activa, no llames al backend
  if (id == null) {
    // opcional: limpia el form o muestra aviso
    this.formCaja.patchValue({ secuencial: '', caja: '', puntoEmision: '' });
    // this.snackBar.open('El usuario no tiene autorización de caja activa', 'Cerrar', {duration: 2500});
    return;
  }

  // si el id podría venir como string, fuerza número:
  const idNum = Number(id);

  this.autorizacionCajaService.getAutorizacionCaja(idNum).subscribe({
    next: ({ data }) => {
      if (!data) return;
      this.formCaja.patchValue({
        secuencial: this.padLeft(data.numero_factura, 9),
        caja: data.caja ?? '',
        puntoEmision: data.num_establecimiento ?? '',
      });
    },
    error: (err) => console.error('Error cargando autorización de caja', err),
  });
}

  // En tu componente
  private padLeft(value: any, size: number): string {
    const s = (value ?? '').toString().replace(/\D/g, ''); // solo dígitos
    return s ? s.padStart(size, '0') : '';
  }

  // --- reemplaza tu onProductoSelected por esta versión ---
  onProductoSelected(codpro: string): void {
    const p = this.productos.find(x => (x.codpro ?? '').toString() === codpro);
    const ctrl = this.formFactura.get('producto') as FormControl;

    if (!p) {
      ctrl.setValue('', { emitEvent: false });
      this.autoProductoTrigger?.closePanel();
      this.productoInputRef?.nativeElement.blur();
      return;
    }

    // ✅ permitir repetidos solo para 1176
    const esMantenimiento = (p.codpro ?? '').toString() === this.COD_MANT_MENSUAL;
    let yaExiste = false;

    if (!esMantenimiento) {
      if (this.gridApi) {
        this.gridApi.forEachNode(n => { if ((n.data?.codpro ?? '') === p.codpro) yaExiste = true; });
      } else {
        yaExiste = this.rowData.some(r => (r as any)?.codpro === p.codpro);
      }
    }

    if (yaExiste) {
      this.mostrarAlerta(`El producto ${p.codpro} ya fue agregado.`, 'info');
      ctrl.setValue('', { emitEvent: false });
      setTimeout(() => { this.autoProductoTrigger?.closePanel(); this.productoInputRef?.nativeElement.blur(); }, 0);
      return;
    }

    // ---- precio: si es 1174 usar vAsignacion, caso contrario el del producto ----
    const ivaPorc = this.getIvaPrincipal() ?? (this.ivaOptions.at(-1) ?? 0);

    const pu = this.getPrecioEspecial(p.codpro) ?? this.to2(Number(p.prevensiniva || 0));
    const detalle = (p.codpro?.toString() === '1174')
      ? 'INSCRIPCION PREFIJO'
      : (p.despro ?? '').toUpperCase();

    const nuevaFila: LineaFactura = {
      codpro: p.codpro, cantidad: 1, detalle, pUnidad: pu, iva: ivaPorc,
      descPct: this.descuentoSeleccionado ? this.toN(this.descuentoSeleccionado.valor, 2) : 0,
      desUnit: 0, descuento: 0, desTotal: 0, total: 0,
      periodo: '' // 👈

    };
    this.recalcLinea(nuevaFila);

    if (this.gridApi) this.gridApi.applyTransaction({ add: [nuevaFila] });
    else this.rowData.push(nuevaFila);

    ctrl.setValue('', { emitEvent: false });
    setTimeout(() => {
      this.autoProductoTrigger?.closePanel();
      this.productoInputRef?.nativeElement.blur();
    }, 0);

    this.recalcTotalesFactura();
    this.ajustarPagosAlTotal();
    this.actualizarPuedeAbrirMeses();
  }


  // Calcula total de UNA línea
  private recalcLinea(row: any): void {
    const qty = Math.max(1, Number(row.cantidad) || 1);
    const unit = Number(row.pUnidad) || 0;
    const ivaPct = Number(row.iva) || 0;
    const pct = Math.max(0, Math.min(100, Number(row.descPct) || 0));

    // mantener coherencia desUnit <-> %
    row.desUnit = this.toN(unit * (pct / 100), 3);

    const desUnit = Number(row.desUnit) || 0;
    const descAbs = Number(row.descuento) || 0;

    // ✅ base imponible (ya con descuento)
    let base = qty * Math.max(0, unit - desUnit);
    base = Math.max(0, base - descAbs);
    row.base = this.to2(base);

    // ✅ IVA y total
    const ivaVal = this.to2(row.base * (ivaPct / 100));
    row.ivaVal = ivaVal;
    row.desTotal = this.to2(qty * desUnit);
    row.total = this.to2(row.base + ivaVal);
  }


  // Recalcula cuando cambia una celda relevante
  onCellValueChanged(e: any): void {
    const col = e?.column?.getColId?.() ?? '';
    if (!e?.data) return;

    if (['cantidad', 'pUnidad', 'iva', 'desUnit', 'descuento', 'descPct'].includes(col)) {
      // si cambió pUnidad, ya sincronizamos desUnit en el valueSetter
      // si cambió desUnit, ya sincronizamos descPct en el valueSetter
      this.recalcLinea(e.data);
      e.api.refreshCells({ rowNodes: [e.node], columns: ['desTotal', 'total', 'desUnit', 'descPct'], force: true });
      this.recalcTotalesFactura();
      this.ajustarPagosAlTotal();
    }
  }



  // ---- helpers de redondeo (2 decimales)


  // Recalcula totales (subtotal, descuentos, sin IVA, IVA, total, saldo)
  recalcTotalesFactura(): void {
    let subTotal = 0, descTotal = 0, ivaValor = 0, total = 0;
    let base0 = 0;      // base al 0%
    let baseConIva = 0; // base gravada (>0%)

    const acumular = (row: any) => {
      if (!Number.isFinite(row.base) || !Number.isFinite(row.ivaVal)) this.recalcLinea(row);
      const qty = Math.max(1, Number(row.cantidad) || 1);
      const unit = Number(row.pUnidad) || 0;
      const ivaPct = Number(row.iva) || 0;
      const desUnit = Number(row.desUnit) || 0;
      const descAbs = Number(row.descuento) || 0;

      const lineaSub = this.to2(qty * unit);                               // bruto
      const lineaDesc = this.to2(qty * Math.max(0, desUnit)) + this.to2(Math.max(0, descAbs));

      subTotal += lineaSub;
      descTotal += lineaDesc;
      ivaValor += Number(row.ivaVal) || 0;
      total += Number(row.total) || 0;

      if (ivaPct === 0) base0 += Number(row.base) || 0;
      else baseConIva += Number(row.base) || 0;
    };

    if (this.gridApi) this.gridApi.forEachNode(n => acumular(n.data));
    else this.rowData.forEach(acumular);

    subTotal = this.to2(subTotal);      // bruto (por si lo quieres mostrar en otro lado)
    ivaValor = this.to2(ivaValor);
    total = this.to2(total);

    // bases netas (después de descuento)
    this.baseTarifa0 = this.to2(base0);
    this.baseGravada = this.to2(baseConIva);

    // 👇 Subtotal NETO que quieres ver como 108.00
    const subTotalNeto = this.to2(this.baseTarifa0 + this.baseGravada);

    const pagos = this.getTotalPagos();
    const saldoPendiente = this.to2(total - pagos);

    this.formTotales.patchValue({
      subtotal: subTotalNeto,          // <-- ahora muestra 108.00
      descuento: this.to2(descTotal),
      valorSinIva: this.baseTarifa0,   // base 0%
      valorConIva: this.baseGravada,   // base gravada
      iva: ivaValor,
      total,
      saldoPendiente
    }, { emitEvent: false });
  }


  onPagosCellValueChanged(_: any): void {
    // Solo recalcula saldo (total ya lo tienes en formTotales)
    const total = Number(this.formTotales.get('total')?.value) || 0;
    const pagos = this.getTotalPagos();
    const saldo = this.to2(total - pagos);
    this.formTotales.patchValue({ saldoPendiente: saldo }, { emitEvent: false });
  }
  private to2(n: number): number {
    return Math.round((n ?? 0) * 100) / 100;
  }

  private getTotalFactura(): number {
    return Number(this.formTotales.get('total')?.value) || 0;
  }

  private getTotalPagos(): number {
    let total = 0;
    if (this.pagosApi) {
      this.pagosApi.forEachNode(n => total += Number(n.data?.valor) || 0);
    } else {
      total = this.rowDataPagos.reduce((acc, r) => acc + (Number(r?.valor) || 0), 0);
    }
    return this.to2(total);
  }

  private getSaldoPendienteCalc(): number {
    return this.to2(this.getTotalFactura() - this.getTotalPagos());
  }

  private sumPagosExcept(node: any | null): number {
    let sum = 0;
    if (this.pagosApi) {
      this.pagosApi.forEachNode(n => {
        if (!node || n.id !== node.id) sum += Number(n.data?.valor) || 0;
      });
    } else {
      sum = this.rowDataPagos.reduce((acc, r) => acc + (Number(r?.valor) || 0), 0);
    }
    return this.to2(sum);
  }
  pagoValorSetter(p: ValueSetterParams<any>): boolean {
    // Suma de pagos EXCEPTO la fila que se edita
    const otros = this.sumPagosExcept(p.node);
    const totalFactura = this.getTotalFactura();
    const max = this.to2(Math.max(0, totalFactura - otros));

    let v = Number(p.newValue);
    if (!Number.isFinite(v) || v < 0) v = 0;
    if (v > max) v = max; // 👈 no permitir superar el saldo restante

    p.data.valor = this.to2(v);

    // actualiza saldo pendiente
    setTimeout(() => this.onPagosRowsChanged());
    return true;
  }


  onPagosRowsChanged(): void {
    const total = this.getTotalFactura();
    const pagos = this.getTotalPagos();
    const saldo = this.to2(total - pagos);
    this.formTotales.patchValue({ saldoPendiente: saldo }, { emitEvent: false });
  }
  private ajustarPagosAlTotal(): void {
    const total = this.getTotalFactura();
    let pagos = this.getTotalPagos();

    // Si no hay sobrepago, sólo actualiza saldo y sal
    if (pagos <= total) {
      this.formTotales.patchValue({ saldoPendiente: this.to2(total - pagos) }, { emitEvent: false });
      return;
    }

    // Hay sobrepago -> reducir valores empezando por la última fila
    if (this.pagosApi) {
      const nodes: any[] = [];
      this.pagosApi.forEachNode(n => nodes.push(n));

      if (nodes.length === 1) {
        // caso típico: un solo método de pago => iguala al nuevo total
        nodes[0].data.valor = this.to2(total);
        this.pagosApi.refreshCells({ rowNodes: [nodes[0]], columns: ['valor'], force: true });
      } else {
        let exceso = this.to2(pagos - total);
        for (let i = nodes.length - 1; i >= 0 && exceso > 0; i--) {
          const n = nodes[i];
          const v = Number(n.data.valor) || 0;
          const reduce = Math.min(v, exceso);
          n.data.valor = this.to2(v - reduce);
          exceso = this.to2(exceso - reduce);
        }
        this.pagosApi.refreshCells({ force: true });
      }
    } else {
      // sin API (estado local)
      if (this.rowDataPagos.length === 1) {
        this.rowDataPagos[0].valor = this.to2(total);
      } else {
        let exceso = this.to2(pagos - total);
        for (let i = this.rowDataPagos.length - 1; i >= 0 && exceso > 0; i--) {
          const r = this.rowDataPagos[i];
          const v = Number(r.valor) || 0;
          const reduce = Math.min(v, exceso);
          r.valor = this.to2(v - reduce);
          exceso = this.to2(exceso - reduce);
        }
      }
    }

    // Actualiza saldo pendiente después del ajuste
    pagos = this.getTotalPagos();
    this.formTotales.patchValue({ saldoPendiente: this.to2(total - pagos) }, { emitEvent: false });
  }

  // --- helper: precio especial por código ---
  private getPrecioEspecial(codpro: string): number | null {
    const code = (codpro ?? '').toString();

    if (code === '1175') return this.to2(Number(this.vInscripcion || 0)); // AFILIACION
    if (code === '1174') return this.to2(Number(this.vAsignacion || 0)); // ASIGNACION
    if (code === '1176') return this.toN(Number(this.vMantenimiento || 0), this.PU_DEC); // MANTENIMIENTO


    // Si luego quieres otros:
    // if (code === '1173') return this.to2(Number(this.vInscripcion || 0)); // INSCRIPCIÓN
    // if (code === '1175') return this.to2(Number(this.vMantenimiento || 0)); // MANTENIMIENTO

    return null; // sin precio especial -> usa el del producto
  }
  // --- helpers de redondeo y formato ---
  private readonly PU_DEC = 3;

  private toN(n: number, d: number): number {
    const m = Math.pow(10, d);
    return Math.round((n ?? 0) * m) / m;
  }
  private fmtN(value: any, d: number): string {
    const v = Number(value);
    return Number.isFinite(v) ? v.toFixed(d) : (0).toFixed(d);
  }
  // ===== Descuentos =====
  private cargarDescuentos(): void {
    debugger
    this.descuentoService.getAll().pipe(take(1)).subscribe({
      next: (list) => {
        this.descuentos = list ?? [];
        // valor por defecto: SIN DESCUENTO si existe
        const sin = this.descuentos.find(x => (x.valor ?? 0) === 0);
        if (sin) {
          this.formFactura.patchValue({ descuento: sin }, { emitEvent: false });
          this.descuentoSeleccionado = sin;
        }
      },
      error: _ => this.mostrarAlerta('No se pudieron cargar descuentos', 'error')
    });
  }

  private configurarFiltroDescuentos(): void {
    const ctrl = this.formFactura.get('descuento') as FormControl;
    this.filteredDescuentos$ = ctrl.valueChanges.pipe(
      startWith(''),
      map(v => typeof v === 'string' ? v : (v?.descripcion ?? '')),
      map(txt => (txt || '').toLowerCase().trim()),
      map(term => {
        if (!term) return this.descuentos;
        return this.descuentos.filter(d =>
          (d.descripcion || '').toLowerCase().includes(term) ||
          String(d.valor ?? '').includes(term) ||
          String(d.idDescuento ?? '').includes(term)
        );
      })
    );
  }

  // Muestra en el input
  displayDescuento = (d: Descuento | null): string =>
    d ? `${d.descripcion} (${d.valorFormateado ?? (d.valor ?? 0) + '%'})` : '';

  // Al seleccionar (aplica % global sobre cada línea)
  onDescuentoSelected(item: Descuento): void {
    this.descuentoSeleccionado = item ?? null;
    const pct = Number(item?.valor ?? 0);
    this.aplicarDescuentoGlobalPorcentaje(pct);

    // 👇 refresca editable/estilos de las columnas de descuento
    this.gridApi?.refreshCells({ force: true, columns: ['desUnit', 'descPct'] });

    setTimeout(() => {
      this.autoDescuentoTrigger?.closePanel();
      this.descuentoInputRef?.nativeElement.blur();
    }, 0);
  }

  clearDescuento(): void {
    this.formFactura.patchValue({ descuento: '' }, { emitEvent: false });
    this.descuentoSeleccionado = null;

    // esto pone descPct=0 y desUnit=0 en TODAS las filas y recalcula
    this.aplicarDescuentoGlobalPorcentaje(0);

    this.gridApi?.refreshCells({ force: true, columns: ['desUnit', 'descPct', 'desTotal', 'total'] });
    this.recalcTotalesFactura();
    this.ajustarPagosAlTotal();

    setTimeout(() => {
      this.descuentoInputRef?.nativeElement.focus();
      this.autoDescuentoTrigger?.openPanel();
    }, 0);
  }



  // Aplica descuento % a CADA línea como "descuento" absoluto (antes de IVA)
  private aplicarDescuentoGlobalPorcentaje(pct: number): void {
    const aplicar = (row: any) => {
      row.descPct = this.toN(Math.max(0, Math.min(100, pct)), 2);
      row.descuento = 0; // opcional: limpiar descuento $ adicional
      this.recalcLinea(row);
    };
    if (this.gridApi) {
      const nodes: any[] = []; this.gridApi.forEachNode(n => nodes.push(n));
      nodes.forEach(n => aplicar(n.data));
      this.gridApi.refreshCells({ force: true });
    } else {
      this.rowData.forEach(aplicar);
    }
    this.recalcTotalesFactura();
    this.ajustarPagosAlTotal();
  }




  private cargarIvasVigentes(): void {
    this.ivaService.getVigentes().subscribe({
      next: (items) => {
        this.ivasCatalogo = items;
        this.ivaOptions = items.map(i => i.porcentaje).sort((a, b) => a - b);
        this.gridApi?.refreshCells({ force: true, columns: ['iva'] });
      },
      error: _ => this.mostrarAlerta('No se pudieron cargar los IVAs', 'error')
    });
  }

  private getIvaPrincipal(): number | null {
    const p = this.ivasCatalogo.find(x => x.principal);
    return p ? p.porcentaje : null;
  }

  // Bloquea cualquier tecla que no sea 0–9
  soloNumeros(e: KeyboardEvent) {
    const k = e.key;
    if (!/^\d$/.test(k)) e.preventDefault(); // bloquea . , e + -
  }

  // Permite pegar solo dígitos y recorta a 4
  soloPegadoNumerico(e: ClipboardEvent) {
    e.preventDefault();
    const texto = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 4);
    const ctrl = this.formFactura.get('anio');
    ctrl?.setValue(texto);
  }

  private buildFacturaPayload(): FacturaCrearRequest {
    // --- IDs y datos base ---
    const idCliente = Number(this.codcliO || 0);                                    // elegido en el autocomplete
    const caja = (this.formCaja.get('caja')?.value ?? '').toString().trim();        // viene de cargarAutorizacion()
    const idUsuarioCajero = this.usuarioActual!.id_usuario;         // ajusta si usas otro origen
    const idDescuentoGlobal = null; // de tu selección global
    const porcentajeDescuentoGlobal = null;
    const observaciones = (this.formCaja.get('observacion')?.value ?? '').toString();
    const anioFactura = this.formFactura.get('anio')?.value ?? 0;
    const numeroOrdenCompra = this.formCaja.get('ordenCompra')?.value ?? '';
    const numeroGuiaRemision = this.formCaja.get('guiaRemision')?.value ?? '';
    const idPrefijo = this.formCliente.get('gcp')?.value;   // número (id_prefijos)
    const prefijoObj = this.prefijos.find(p => p.id_prefijos === idPrefijo);
    const prefijo = prefijoObj?.codpre ?? '';
    const correo = this.getEmailsConcat();
    const facBloque=0;
    const GrupoCliente=this.grupoCli;
    const totales = this.formTotales.getRawValue();
    const subtotalSIva = Number(this.baseTarifa0 ?? 0);
    const subtotalCalculado = Number(this.baseGravada ?? 0);
    const descuentoTotalCalculado = Number(totales.descuento ?? 0);
    const ivaTotalCalculado = Number(totales.iva ?? 0);
    const totalCalculado = Number(totales.total ?? 0);
    // --- Detalles (desde grid de productos) ---
    const filasProd: any[] = [];
    if (this.gridApi) this.gridApi.forEachNode(n => filasProd.push(n.data));
    else filasProd.push(...this.rowData);

    const detalles: FacturaDetalleRequest[] = filasProd.map((r) => {
      const cod = (r.codpro ?? '').toString();
      const prod = this.productos.find(p => (p.codpro ?? '').toString() === cod);
      const idProducto = Number(prod?.id_producto ?? 0);
      let codigoPrefijo: string | null = null;
      let periodoDesde: string | null = null;
      let periodoHasta: string | null = null;
      if (r.periodo && r.periodo.trim() !== '') {
        const partes = r.periodo.split('|').map((x: string) => x.trim());
        codigoPrefijo = partes[0] || null;
        periodoDesde = this.formatearFecha(partes[1] || null);
        periodoHasta = this.formatearFecha(partes[2] || null);
      }

      return {
        idProducto,
        cantidad: Number(r.cantidad ?? 0),
        precio: Number(r.pUnidad ?? 0),
        idDescuentoPredeterminado: null,
        porcentajeDescuentoManual: null,
        nombreProductoPersonalizado: r.detalle,


        // Si tu API espera porcentaje:
        ivaCalculado: Number(r.iva ?? 0),

        // 👇 usa la base real y el IVA en dinero
        subtotalCalculado: Number(r.base ?? 0),
        descuentoCalculado: Number(r.desTotal ?? 0),
        totalCalculado: Number(r.total ?? 0),
        codigoPrefijo,
        periodoDesde,
        periodoHasta,
      } as FacturaDetalleRequest;
    }).filter(d => d.idProducto > 0 && d.cantidad > 0);

    // --- Formas de pago (desde grid pagos) ---
    const filasPago: any[] = [];
    if (this.pagosApi) this.pagosApi.forEachNode(n => filasPago.push(n.data));
    else filasPago.push(...this.rowDataPagos);
    const tasa = (this.getIvaPrincipal() ?? 0) / 100;
    const formasPago: FacturaFormaPagoRequest[] = filasPago.map((r) => ({
      idFormaPago: Number(r.id ?? 0),
      valor: this.to2(Number(r.valor ?? 0)),
      referencia: '',                       // completa si manejas referencia
      observaciones: '',
      codPlazo: (r.plazo ?? '').toString(), // si tu API espera código, ajusta aquí
      banco: (r.banco ?? '').toString(),
      numeroTarjeta: (r.ntarjeta ?? '').toString(),
      chequeCaduca: (r.cheque ?? '').toString(),
      duenio: (r.dueno ?? '').toString(),
      autoriza: (r.autorizacion ?? '').toString(),
    }));

    return {
      idCliente,
      caja,
      idUsuarioCajero,
      idDescuentoGlobal,
      porcentajeDescuentoGlobal,
      observaciones,
      anioFactura,
      numeroOrdenCompra,
      numeroGuiaRemision,
      prefijo,
      correo,
      facBloque,
      GrupoCliente,
      subtotalSIva,
      subtotalCalculado,
      descuentoTotalCalculado,
      ivaTotalCalculado,
      totalCalculado,
      detalles,
      formasPago
    };
  }

  // ===== Llama al servicio y maneja la respuesta / errores =====


  crearFactura(): void {
    // Validaciones mínimas y no repetidas
    if (this.getPagosCount() === 0) {
      this.mostrarAlerta('Agrega al menos una forma de pago.', 'info');
      return;
    }
    if (Math.abs(this.saldoPendiente) >= 0.005) {
      this.mostrarAlerta('El saldo pendiente debe ser 0.00 para generar la factura.', 'info');
      return;
    }

    const payload = this.buildFacturaPayload();

    if (!payload.idCliente) { this.mostrarAlerta('Seleccione un cliente.', 'info'); return; }
    if (!payload.caja) { this.mostrarAlerta('No hay caja asignada.', 'info'); return; }
    if (!payload.detalles?.length) { this.mostrarAlerta('Agrega al menos un producto a la factura.', 'info'); return; }

    // (Opcional) logs de depuración
    console.log('PAYLOAD →', payload);
    console.table(payload.detalles);
    console.table(payload.formasPago);
    console.log(JSON.stringify(payload, null, 2));

    this.facturacionService.crear(payload).pipe(
      switchMap(resp => {
        const tipo = (resp?.type || '').toLowerCase();

        if (tipo === 'success' || tipo === 'warning') {
          this.mostrarAlerta(resp?.message || 'Factura creada correctamente.', 'ok');

          const idNota = Number(resp?.data?.idNota);
          if (Number.isFinite(idNota)) {
            // 1) Genera el XML en el servidor
            return this.facturacionService.generarXmlEnServidor(idNota).pipe(
              tap(r => {
                if (r?.success) {
                  this.mostrarAlerta(`XML generado en el servidor: ${r.fileName}`, 'ok');

                  // 2) Abrir/descargar el PDF inmediatamente (nueva línea)
                  this.descargarPdf(idNota); //Aplica la peticion al interceptor
                } else {
                  this.mostrarAlerta(r?.message || 'No se generó el XML.', 'error');
                }
              }),
              catchError(_ => {
                this.mostrarAlerta('Error generando el XML en el servidor.', 'error');
                return of(null);
              })
            );
          } else {
            this.mostrarAlerta('No se recibió idNota válido en la respuesta.', 'error');
            return of(null);
          }
        } else {
          this.mostrarAlerta(resp?.message || 'No se pudo crear la factura.', 'error');
          return of(null);
        }
      }),
      catchError(err => {
        console.error('[crearFactura] error:', err);
        this.mostrarAlerta('Error al crear la factura.', 'error');
        return of(void 0);
      }),
      finalize(() => {
        // ✅ liberar el botón siempre (éxito o error)
        this.generando = false;
        this.cdRef.detectChanges();
      })
    ).subscribe({
      next: () => {
        // ✅ limpiar y regresar a la pestaña 1
        this.limpiarCliente();
        this.cargarAutorizacion();
        this.currentStep = 1;
        this.cdRef.detectChanges();
      }
    });
  }

  private descargarPdf(idNota: number): void {
    const pdfUrl = `${environment.invoices_sic}/Facturacion/${idNota}/pdf`;
    
    this.http.get(pdfUrl, { 
      responseType: 'blob',
      observe: 'response' 
    }).subscribe({
      next: (response) => {
        // Crear blob URL y descargar
        const blob = response.body!;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura-${idNota}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error descargando PDF:', err);
        this.mostrarAlerta('Error al descargar el PDF', 'error');
      }
    });
  }
  autoGrow(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }



  private hasProductoEnGrid(cod: string): boolean {
    let found = false;
    if (this.gridApi) {
      this.gridApi.forEachNode(n => {
        if ((n.data?.codpro ?? '').toString() === cod) found = true;
      });
    } else {
      found = this.rowData.some(r => ((r as any)?.codpro ?? '').toString() === cod);
    }
    return found;
  }

  // Recalcula la habilitación del botón
  private actualizarPuedeAbrirMeses(): void {
    this.puedeAbrirMeses = this.hasProductoEnGrid(this.COD_MANT_MENSUAL);
  }
  onCellDoubleClicked(e: CellDoubleClickedEvent<any>): void {
    // Solo aplicamos a la columna "detalle"
    if (!e?.colDef || e.colDef.field !== 'detalle') return;

    const ref = this.dialog.open(DetalleDescripcionModalComponent, {
      width: '640px',
      data: {
        titulo: 'Editar detalle',
        descripcion: e.value ?? '',
        maxLen: 500
      }
    });

    ref.afterClosed().subscribe((nuevo?: string) => {
      if (typeof nuevo !== 'string') return;                 // cancelado
      const val = (nuevo ?? '').trim();
      if (val === (e.value ?? '').toString().trim()) return; // sin cambios
      e.node.setDataValue('detalle', val);
      e.api.refreshCells({ rowNodes: [e.node], columns: ['detalle'], force: true });
    });
  }

  get puedeIrPaso2(): boolean {
    // Debe haber cliente elegido (codcliO) y prefijo seleccionado (gcp)
    return this.codcliO > 0 && !!this.formCliente.get('gcp')?.value
      && this.formCliente.valid;
  }

  get puedeIrPaso3(): boolean {
    return this.getCantidadLineas() > 0; // al menos un producto en el grid
  }

  private getCantidadLineas(): number {
    if (this.gridApi) {
      let n = 0; this.gridApi.forEachNode(() => n++);
      return n;
    }
    return this.rowData.length;
  }

  irPaso2(): void {
    // fuerza validación y pinta errores
    this.formCliente.updateValueAndValidity({ onlySelf: false, emitEvent: true });
    this.formCliente.markAllAsTouched();
    this.cdRef.detectChanges();

    if (!this.puedeIrPaso2) {
      this.mostrarAlerta('Completa los datos del cliente para continuar.', 'info');
      return;
    }
    this.currentStep = 2;
  }

  onSelectedIndexChange(idx: number): void {
    if (idx === 1) {
      this.formCliente.updateValueAndValidity({ onlySelf: false, emitEvent: true });
      this.formCliente.markAllAsTouched();
      this.cdRef.detectChanges();
      if (!this.puedeIrPaso2) {
        this.mostrarAlerta('Completa los datos del cliente para continuar.', 'info');
        this.currentStep = 1;
        return;
      }
    }
    if (idx === 2 && !this.puedeIrPaso3) {
      this.mostrarAlerta('Agrega productos antes de continuar.', 'info');
      this.currentStep = 2; return;
    }
    this.currentStep = idx + 1;
  }


  // helper opcional
  private scrollToFirstError() {
    setTimeout(() => {
      const el = document.querySelector('.ng-invalid[formcontrolname]') as HTMLElement;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }




  irPaso3(): void {
    if (this.puedeIrPaso3) {
      this.currentStep = 3;
    } else {
      this.mostrarAlerta('Agrega al menos un producto a la factura.', 'info');
    }
  }


  // Guardia adicional (por si algún caso intenta cambiar con teclado)

  // ¿Cuántas filas de pagos hay?


  // Getter que controla el disabled del botón

  // ---- helpers pagos / saldo ----
  private getPagosCount(): number {
    let n = 0;
    if (this.pagosApi) this.pagosApi.forEachNode(() => n++);
    else n = this.rowDataPagos.length;
    return n;
  }

  get saldoPendiente(): number {
    return Number(this.formTotales.get('saldoPendiente')?.value) || 0;
  }

  // Botón “Generar Factura”
  get puedeGenerar(): boolean {
    return this.getPagosCount() > 0 && this.saldoPendiente === 0;
  }

  get motivoNoGenera(): string {
    if (this.getPagosCount() === 0) return 'Agrega al menos una forma de pago';
    if (this.saldoPendiente !== 0) return 'El saldo pendiente debe ser 0.00';
    return '';
  }

  // --- controla el click del botón ---


onGenerarClick(): void {
  if (this.generando) return;

  // 👉 bloqueo explícito por mantenimiento sin periodo/prefijo
  const vm = this.validaMantenimiento();
  if (!vm.ok) {
    this.mostrarAlerta(vm.msg || 'Complete los datos del mantenimiento.', 'info');
    return;
  }

  if (!this.puedeGenerarFactura) {
    this.mostrarAlerta(this.motivoBloqueoFactura(), 'info');
    return;
  }

  this.generando = true;
  this.crearFactura();
}


  // --- usa SOLO estos dos getters ---
  get puedeGenerarFactura(): boolean {
    const total = this.getTotalFactura();
    const pagos = this.getTotalPagos();
    const saldo = this.to2(total - pagos);
    const sinSaldo = Math.abs(saldo) < 0.005;
    const tienePagos = this.getPagosCount() > 0;
    const vm = this.validaMantenimiento();
    return this.puedeIrPaso2 && this.puedeIrPaso3 && total > 0 && tienePagos && sinSaldo;
  }

  motivoBloqueoFactura(): string {
    if (!this.puedeIrPaso2) return 'Completa los datos del cliente';
    if (!this.puedeIrPaso3) return 'Agrega productos a la factura';
    const total = this.getTotalFactura();
    if (total <= 0) return 'El total debe ser mayor a 0';
    if (this.getPagosCount() === 0) return 'Agrega al menos una forma de pago';
    const saldo = this.to2(total - this.getTotalPagos());
    if (Math.abs(saldo) >= 0.005) return `El saldo pendiente debe ser $0.00 (actual: $${saldo.toFixed(2)})`;
    const vm = this.validaMantenimiento();
    if (!vm.ok) return vm.msg || 'Complete los datos del mantenimiento.';
    return '';
  }

  private abrirDialogoMesesFila(params: { data: LineaFactura; node: any; api: GridApi }) {
    // Solo válido para 1176
    if (!params?.data || (params.data.codpro ?? '').toString() !== this.COD_MANT_MENSUAL) return;

    // Año sugerido (usa el del form si existe)
    const anioActual = Number(this.formFactura.get('anio')?.value) || new Date().getFullYear();

    // Prefijo actualmente seleccionado (si lo hay en el form)
    const idPrefijoActual = this.formCliente.get('gcp')?.value ?? null;
    const codpreActual = this.prefijos.find(p => p.id_prefijos === idPrefijoActual)?.codpre ?? null;

    const ref = this.dialog.open(FacturacionMesesModalComponent, {
      width: '1000px',       // antes tenías 700px
      maxWidth: '99vw',
      disableClose: true,
      data: {
        // 👉 pasamos lista y selección actual para que el modal muestre y permita elegir
        anioActual,
        prefijos: this.prefijos,          // [{ id_prefijos, codpre }, ...]
        idPrefijo: null,       // seleccionado actual (opcional)
        codpre: null,             // seleccionado actual (opcional)

        onAceptar: (res: FacturacionMesesResult & { idPrefijo: number; codpre: string }) => {
          // 1) Refleja la selección en el form del padre (útil para otras validaciones)
          this.formCliente.patchValue({ gcp: res.idPrefijo, prefijo: res.codpre }, { emitEvent: false });

          // 2) Si cambió el año, sincroniza
          this.formFactura.get('anio')?.setValue(res.anio);

          // 3) Aplica SOLO a esta fila
          const row = params.data;
          row.cantidad = res.numeroMeses;

          // Detalle (con prefijo y periodo legible)
          const prefijoTxt = res.codpre || `ID ${res.idPrefijo}`;
          const marca = `PREFIJO: ${prefijoTxt} ${res.periodo}`;
          const baseDetalle = (row.detalle ?? '').replace(/\s+PREFIJO:.*$/, '').trim();
          row.detalle = `${baseDetalle} ${marca}`.trim();

          // ✅ Periodo que irá al grid: "prefijo | desde | hasta"
          row.periodo = `${res.codpre} | ${res.fechaUltimaPago} | ${res.fechaHastaPaga}`;

          // Recalcular importes de la fila
          this.recalcLinea(row);

          // Refrescar SOLO columnas afectadas
          params.api.refreshCells({
            rowNodes: [params.node],
            columns: ['cantidad', 'detalle', 'periodo', 'desTotal', 'total'],
            force: true
          });

          // Recalcular totales/pagos
          this.recalcTotalesFactura();
          this.ajustarPagosAlTotal();
        }
      }
    });

    ref.afterClosed().subscribe(() => {
      // opcional: hook al cerrar
    });
  }

  getEmailsConcat(): string {
    const parts = [
      (this.formCliente.get('email')?.value || '').trim(),
      (this.formCliente.get('emailOpcional')?.value || '').trim()
    ].filter(Boolean);
    return parts.join(';');
  }
  formatearFecha(fecha: string | null): string | null {
    if (!fecha) return null;

    // Detecta formato dd/MM/yyyy
    const partes = fecha.split('/');
    if (partes.length === 3) {
      const [dd, mm, yyyy] = partes;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }

    // Si ya viene en yyyy-MM-dd lo devuelve igual
    return fecha;
  }
  // Efecto ripple simple
  ripple(evt: MouseEvent) {
    const btn = evt.currentTarget as HTMLElement;
    const r = document.createElement('span');
    r.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.width = r.style.height = size + 'px';
    r.style.left = `${evt.clientX - rect.left - size / 2}px`;
    r.style.top = `${evt.clientY - rect.top - size / 2}px`;
    btn.appendChild(r);
    setTimeout(() => r.remove(), 600);
  }
  // % del descuento general (combo)
  private getDescuentoGlobalPct(): number {
    return Number(this.descuentoSeleccionado?.valor ?? 0);
  }
  private tieneDescuentoGlobal(): boolean {
    return this.getDescuentoGlobalPct() > 0;
  }
  onCellEditingStarted = (e: any) => {
    if ((e.colDef.field === 'descPct' || e.colDef.field === 'desUnit') && this.tieneDescuentoGlobal()) {
      this.mostrarAlerta(`Ya tiene un descuento general. Limpie el combo para editar por fila.`, 'info');
      e.api.stopEditing(true);
    }
  };

  private esColDesc(e: any): boolean {
    const f = e?.colDef?.field;
    return f === 'descPct' || f === 'desUnit';
  }

  onCellClicked(e: any): void {
    if (this.esColDesc(e) && this.tieneDescuentoGlobal()) {
      this.mostrarAlerta('Ya tiene un descuento general. Limpie el combo para editar por fila.', 'info'); // 👈 usa helper
    }
  }

  onCellKeyDown(e: any): void {
    const key = e.event?.key?.toLowerCase?.();
    const intentoEditar = key === 'enter' || key === 'f2';
    if (intentoEditar && this.esColDesc(e) && this.tieneDescuentoGlobal()) {
      this.mostrarAlerta('Ya tiene un descuento general. Limpie el combo para editar por fila.', 'info'); // 👈 usa helper
      e.api.stopEditing(true);
    }
  }
  onCancelarClick(evt?: Event): void {
    evt?.preventDefault();

    // 1) Limpia todo (formularios, grids, descuentos, totales, etc.)
    this.limpiarCliente();

    // 2) Vuelve a la primera pestaña
    this.currentStep = 1;

    // 3) Cierra cualquier panel de autocomplete que haya quedado abierto
    this.autoProductoTrigger?.closePanel();
    this.autoDescuentoTrigger?.closePanel();
    this.autoPagoTrigger?.closePanel();

    // 4) Refresca vista (por si algo queda “pegado”)
    this.cdRef.detectChanges();

    // (opcional) feedback
    this.mostrarAlerta('Se limpió el formulario ', 'info');
  }
  onEmailOpcionalInput(ev: Event): void {
    const el = ev.target as HTMLInputElement;
    const normalizado = (el.value || '')
      .replace(/,+/g, ';')   // comas -> ;
      .replace(/\s+/g, '');  // sin espacios

    // Actualiza el control (dispara validadores)
    this.formCliente.get('emailOpcional')?.setValue(normalizado, { emitEvent: true });
  }

  /** Valida que las filas de mantenimiento (1176) tengan prefijo y periodo. */
  private validaMantenimiento(): { ok: boolean; msg?: string } {
    const filas: any[] = [];
    if (this.gridApi) this.gridApi.forEachNode(n => filas.push(n.data));
    else filas.push(...this.rowData);

    for (const f of filas) {
      if ((f?.codpro ?? '').toString() === this.COD_MANT_MENSUAL) {
        const det = (f?.detalle ?? '').toString().trim().toUpperCase();
        const periodo = (f?.periodo ?? '').toString().trim();

        // Reglas: debe tener periodo y en el detalle debe aparecer "PREFIJO:"
        const tienePeriodo = periodo.length > 0;
        const tienePrefijoEnDetalle = /PREFIJO\s*:/.test(det);

        if (!tienePeriodo || !tienePrefijoEnDetalle || det === 'MANTENIMIENTO ANUAL') {
          return {
            ok: false,
            msg:
              'Para el producto de mantenimiento (1176) debe seleccionar PREFIJO y PERÍODO ' +
              '(use el botón con el ícono ➜ “Seleccionar meses”).'
          };
        }
      }
    }
    return { ok: true };
  }

}
