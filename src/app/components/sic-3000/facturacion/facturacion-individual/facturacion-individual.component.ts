import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ClienteContactoService } from 'src/app/services/cliente-contacto.service';
import { forkJoin, Observable, of } from 'rxjs';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, ColGroupDef, GridApi ,ValueSetterParams} from 'ag-grid-community';
import { FormaPagoService, FormaPagoResponse } from 'src/app/services/forma-pago.service';
import { MatAutocompleteSelectedEvent, MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FacturacionService } from 'src/app/services/facturacion.service';

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
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  take,
  filter,
  map,
  tap,finalize,     
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

interface LineaFactura {
  codpro: string | null;  // clave para evitar duplicados
  cantidad: number;
  detalle: string;
  pUnidad: number;
  iva: number;
  desUnit: number;
  descuento: number;
  desTotal: number;
  total: number;
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
    AgGridModule
  ]
})
export class FacturacionIndividualComponent implements OnInit {
  @ViewChild(MatAutocompleteTrigger) autoPagoTrigger!: MatAutocompleteTrigger;
  @ViewChild('pagoInputRef') pagoInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('autoProductoTrigger') autoProductoTrigger!: MatAutocompleteTrigger;
@ViewChild('productoInputRef') productoInputRef!: ElementRef<HTMLInputElement>;

  // ============= Pasos / Tabs =============
  currentStep = 1;
  onTabChange(idx: number): void { this.currentStep = (idx ?? 0) + 1; }

  // ============= Autocomplete Cliente =============
  clienteOrigenControl = new FormControl<ClienteSummary | string | null>(null);
  clientesOrigenFiltrados: ClienteSummary[] = [];
  prefijosClienteOrigen: (PrefijoClienteTResponse & { seleccionado?: boolean })[] = [];
  codcliO = 0;

  // ============= Prefijos (mat-select) =============
  prefijos: PrefijoCliente[] = [];

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
  { headerName: 'Cod.', field: 'codpro', hide: true, suppressColumnsToolPanel: true },
  {
    headerName: 'Cantidad',
    field: 'cantidad',
    editable: true,
    width: 110,
    type: 'numericColumn',
    cellEditor: 'agNumberCellEditor',
    valueSetter: (p: ValueSetterParams<any>) => {
      const v = Number(p.newValue);
      p.data.cantidad = Number.isFinite(v) ? Math.max(1, Math.trunc(v)) : 1;
      return true;
    }
  },
  { headerName: 'Detalle', field: 'detalle', editable: true, flex: 1, minWidth: 200 },
  { headerName: 'P. Unidad', field: 'pUnidad', editable: true, type: 'numericColumn', cellEditor: 'agNumberCellEditor', width: 120 },
  { headerName: 'IVA', field: 'iva', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: [0, 12, 15] }, width: 100 },
  { headerName: 'Des. Unitario', field: 'desUnit', editable: true, type: 'numericColumn', cellEditor: 'agNumberCellEditor', width: 130 },
  { headerName: 'Descuento', field: 'descuento', editable: true, type: 'numericColumn', cellEditor: 'agNumberCellEditor', width: 120 },
  { headerName: 'Des. Total', field: 'desTotal', editable: false, type: 'numericColumn', width: 120 },
  { headerName: 'Total', field: 'total', editable: false, type: 'numericColumn', width: 130, pinned: 'right' },
  {
  headerName: 'Acción',
  width: 60,
  pinned: 'right',
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

      // si ves que no actualiza a la primera, usa:
      // setTimeout(() => { this.recalcTotalesFactura(); this.ajustarPagosAlTotal(); }, 0);
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
    width: 120,
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
    valueSetter: (p: ValueSetterParams<any>) => this.pagoValorSetter(p) // 👈
  },  {
  headerName: 'Acción',
  width: 110,
  pinned: 'right',
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
  // Productos desde el backend
  productos: any[] = []; // o usa la interfaz de tu servicio: ProductoResponse[]
  filteredProductos$ = of([] as any[]); // stream para el autocomplete
// ===== propiedades de estado =====
isLoadingProductos = false;       // para spinner
productosLoaded = false;          // terminó la carga (éxito o error)
productosCount = 0;               // cuántos llegaron
productosError: string | null = null;
  constructor(
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
    private facturacionService: FacturacionService
  ) { }

  ngOnInit(): void {
    this.cargarAutorizacion();
   
    this.cargarProductos();
    // Formularios
    this.formCliente = this.fb.group({
      telefono: [''],
      identificacion: [''],
      email: ['', [Validators.email]],
      direccion: [''],
      emailOpcional: [''],
      categoria: [''],
      gcp: [''],
      prefijo: ['']
    });

    this.formFactura = this.fb.group({ producto: [''] });

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

    this.formCaja = this.fb.group({
      puntoEmision: [''],
      ordenCompra: [''],
      secuencial: [''],
      observacion: [''],
      caja: [''],
      guiaRemision: [''],
      fechaFacturacion: ['']
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
    const metodoCtrl = this.formPagos.get('metodoPago') as FormControl;

    this.filteredFormasPago$ = metodoCtrl.valueChanges.pipe(
      map((v: any) => typeof v === 'string' ? v : (v?.descripcionPago ?? v?.descripcion_pago ?? '')),
      map((v: string) => (v ?? '').trim()),
      tap(term => { this.isLoadingFormas = true; }),
      debounceTime(250),
      distinctUntilChanged(),
      filter((term: string) => term.length > 0),
      switchMap((term: string) =>
        this.formaPagoService.search(term).pipe(
          // Normaliza a camelCase para el front
          map(resp => (resp?.data ?? []).map((x: any) => ({
            idFormaPago: x.idFormaPago ?? x.id_forma_pago ?? x.id ?? 0,
            descripcionPago: x.descripcionPago ?? x.descripcion_pago ?? x.descripcion ?? ''
          }) as FormaPagoResponse)),
          catchError(err => {
            console.error('[FormasPago] error:', err);
            return of([] as FormaPagoResponse[]);
          })
        )
      ),
      tap(() => { this.isLoadingFormas = false; })
    );
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
    this.cargarPrefijos(this.codcliO);
    this.cargarClienteDetalle(this.codcliO);
  }

  onClienteInputBlur(): void {
    const valor = this.clienteOrigenControl.value;

    if (this.codcliO > 0) {
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
    this.clienteOrigenControl.setValue('', { emitEvent: false });
    this.clientesOrigenFiltrados = [];
    this.prefijos = [];
    this.codcliO = 0;
    this.formCliente.reset();
  }

  mostrarAlerta(mensaje: string, tipo: 'info' | 'error' | 'ok' | string): void {
    this._snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: tipo === 'error' ? ['snack-error'] : tipo === 'ok' ? ['snack-ok'] : ['snack-info']
    });
  }

  onGridReady(e: any) { this.gridApi = e.api; }
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
private buildPagoRow(fp: FormaPagoResponse, valorInicial: number = 0) {
  return {
    id: fp.idFormaPago,
    detalle: fp.descripcionPago ?? '',
    plazo: 0,
    tiempo: 'Días',
    valor: this.to2(valorInicial) // 👈 valor inicial = saldo pendiente
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

  
cargarAutorizacion()
{
   this.autorizacionCajaService.getAutorizacionCaja(1).subscribe({
      next: ({ data }) => {
        if (!data) return;
        this.formCaja.patchValue({
          secuencial: data.numero_factura ?? '',
          caja: data.caja ?? '',
          puntoEmision: data.num_establecimiento ?? '',
        });
      },
      error: (err) => console.error('Error cargando autorización de caja', err),
    });
}
onProductoSelected(codpro: string): void {
  const p = this.productos.find(x => (x.codpro ?? '').toString() === codpro);
  const ctrl = this.formFactura.get('producto') as FormControl;

  // Si no se encontró el producto, limpia y sale
  if (!p) {
    ctrl.setValue('', { emitEvent: false });
    this.autoProductoTrigger?.closePanel();
    this.productoInputRef?.nativeElement.blur();
    return;
  }

  // **Evitar duplicados**: busca por codpro en la grilla
  let yaExiste = false;
  if (this.gridApi) {
    this.gridApi.forEachNode(n => {
      if ((n.data?.codpro ?? '') === p.codpro) yaExiste = true;
    });
  } else {
    yaExiste = this.rowData.some(r => (r as any)?.codpro === p.codpro);
  }

  if (yaExiste) {
    this.mostrarAlerta(`El producto ${p.codpro} ya fue agregado.`, 'info');
    // **Limpiar el input y cerrar el panel**
    ctrl.setValue('', { emitEvent: false });
    setTimeout(() => {
      this.autoProductoTrigger?.closePanel();
      this.productoInputRef?.nativeElement.blur();
    }, 0);
    return;
  }

  // Calcular valores (ajusta según tu lógica real)
  const ivaPorc = 15; // o deriva de p.id_iva
  const pu = p.prevensiniva ?? 0;               // precio unitario
  const total = +(pu * (1 + ivaPorc / 100)).toFixed(2);

  const nuevaFila = {
    codpro: p.codpro,                      // 👈 clave para detectar duplicados
    cantidad: 1,
    detalle: (p.despro ?? '').toUpperCase(),
    pUnidad: pu,
    iva: ivaPorc,
    desUnit: 0,
    descuento: 0,
    desTotal: 0,
    total
  };

  if (this.gridApi) this.gridApi.applyTransaction({ add: [nuevaFila] });
  else this.rowData.push(nuevaFila);

  // **Limpiar el input y cerrar el panel** tras agregar
  ctrl.setValue('', { emitEvent: false });
  setTimeout(() => {
    this.autoProductoTrigger?.closePanel();
    this.productoInputRef?.nativeElement.blur();
  }, 0);
  this.recalcTotalesFactura(); // 👈 después de añadir la fila

}
// Calcula total de UNA línea
private recalcLinea(row: any): void {
  const qty = Math.max(1, Number(row.cantidad) || 1);
  const unit = Number(row.pUnidad) || 0;
  const ivaPct = Number(row.iva) || 0;
  const desUnit = Number(row.desUnit) || 0;     // descuento por unidad
  const descAbs = Number(row.descuento) || 0;   // descuento absoluto a nivel de línea

  // Base neta antes de IVA
  let base = qty * Math.max(0, unit - desUnit);
  // Descuento absoluto (si manejas este campo como valor $)
  base = Math.max(0, base - descAbs);

  // Descuento total mostrado (solo informativo): qty * desUnit
  row.desTotal = +((qty * desUnit)).toFixed(2);

  // IVA y total
  const ivaVal = +(base * ivaPct / 100).toFixed(2);
  row.total = +(base + ivaVal).toFixed(2);
}

// Recalcula cuando cambia una celda relevante
onCellValueChanged(e: any): void {
  const col = e?.column?.getColId?.() ?? '';
  if (!e?.data) return;

  if (['cantidad', 'pUnidad', 'iva', 'desUnit', 'descuento'].includes(col)) {
    this.recalcLinea(e.data); // mantiene coherencia de la fila
    e.api.refreshCells({ rowNodes: [e.node], columns: ['desTotal', 'total'], force: true });
    this.recalcTotalesFactura(); // 👈 ACTUALIZA TOTALES
    this.ajustarPagosAlTotal(); 
  }
}


// ---- helpers de redondeo (2 decimales)


// Recalcula totales (subtotal, descuentos, sin IVA, IVA, total, saldo)
recalcTotalesFactura(): void {
  let subTotal = 0;        // suma de cantidad * pUnidad
  let descTotal = 0;       // suma de (cantidad * desUnit) + descuento (abs)
  let baseSinIva = 0;      // subTotal - descTotal (>=0)
  let ivaValor = 0;        // suma IVA por línea
  let total = 0;           // base + IVA

  const acumular = (row: any) => {
    const qty = Math.max(1, Number(row.cantidad) || 1);
    const unit = Number(row.pUnidad) || 0;
    const ivaPct = Number(row.iva) || 0;
    const desUnit = Number(row.desUnit) || 0;      // desc por unidad
    const descAbs = Number(row.descuento) || 0;    // desc absoluto en la línea

    const lineaSub = this.to2(qty * unit);
    const lineaDesc = this.to2(qty * Math.max(0, desUnit)) + this.to2(Math.max(0, descAbs));
    const lineaBase = this.to2(Math.max(0, lineaSub - lineaDesc));
    const lineaIva = this.to2(lineaBase * (ivaPct / 100));
    const lineaTotal = this.to2(lineaBase + lineaIva);

    subTotal += lineaSub;
    descTotal += lineaDesc;
    baseSinIva += lineaBase;
    ivaValor += lineaIva;
    total += lineaTotal;
  };

  if (this.gridApi) {
    this.gridApi.forEachNode(n => acumular(n.data));
  } else {
    this.rowData.forEach(acumular);
  }

  subTotal = this.to2(subTotal);
  descTotal = this.to2(descTotal);
  baseSinIva = this.to2(baseSinIva);
  ivaValor = this.to2(ivaValor);
  total = this.to2(total);

  const pagos = this.getTotalPagos();
  const saldoPendiente = this.to2(total - pagos);

  // Actualiza form de totales
  this.formTotales.patchValue({
    subtotal: subTotal,
    descuento: descTotal,
    valorSinIva: baseSinIva,
    valorConIva: this.to2(baseSinIva + ivaValor),
    iva: ivaValor,
    total: total,
    saldoPendiente: saldoPendiente
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

}
