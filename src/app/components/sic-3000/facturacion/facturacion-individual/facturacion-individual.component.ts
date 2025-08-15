import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { map } from 'rxjs';
import { ClienteContactoService } from 'src/app/services/cliente-contacto.service';
import { forkJoin } from 'rxjs';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, ColGroupDef, GridApi } from 'ag-grid-community';
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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule, MatSelectChange } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GrupoEmpresaService } from 'src/app/services/grupo-empresa.service';
import { AutorizacionCajaService } from 'src/app/services/autorizacion-caja.service';
import { of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  take,
  filter
} from 'rxjs/operators';

import { ClienteSummary } from 'src/app/interfaces/responses/cliente-summary-response';
import { PrefijoClienteTResponse } from 'src/app/interfaces/responses/PrefijoClienteResponse';

import { ClienteService } from 'src/app/services/cliente.service';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { LogoService } from 'src/app/services/logo.service';
import { ExportService } from 'src/app/services/export.service';
import { EmpresaService } from 'src/app/services/empresa.service';

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

  // ============= Pasos / Tabs =============
  currentStep = 1;
  onTabChange(idx: number): void {
    this.currentStep = (idx ?? 0) + 1;
  }

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

  ///grid producto
  gridApi!: GridApi;

  columnDefs: ColDef[] = [
    {
      headerName: 'Cantidad', field: 'cantidad', editable: true, type: 'numericColumn',
      cellEditor: 'agNumberCellEditor', width: 110, minWidth: 100
    },

    { headerName: 'Detalle', field: 'detalle', editable: true, flex: 1, minWidth: 200 },

    {
      headerName: 'P. Unidad', field: 'pUnidad', editable: true, type: 'numericColumn',
      cellEditor: 'agNumberCellEditor', width: 120
    },

    {
      headerName: 'IVA', field: 'iva', editable: true,
      cellEditor: 'agSelectCellEditor', cellEditorParams: { values: [0, 12, 15] }, width: 100
    },

    {
      headerName: 'Des. Unitario', field: 'desUnit', editable: true, type: 'numericColumn',
      cellEditor: 'agNumberCellEditor', width: 130
    },

    {
      headerName: 'Descuento', field: 'descuento', editable: true, type: 'numericColumn',
      cellEditor: 'agNumberCellEditor', width: 120
    },

    {
      headerName: 'Des. Total', field: 'desTotal', editable: true, type: 'numericColumn',
      cellEditor: 'agNumberCellEditor', width: 120
    },

    {
      headerName: 'Total', field: 'total', editable: true, type: 'numericColumn',
      cellEditor: 'agNumberCellEditor', width: 130, pinned: 'right'
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: false,
    filter: false
  };

  rowData = [
    { cantidad: 1, detalle: 'CODIGO INDIVIDUAL', pUnidad: 100, iva: 15, desUnit: 0, descuento: 0, desTotal: 0, total: 115 }
  ];
  ///

  pagosApi!: GridApi;

columnDefsPagos: ColDef[] = [
  { headerName: 'Detalle', field: 'detalle', editable: true, flex: 1, minWidth: 180 },
  { headerName: 'Plazo', field: 'plazo', editable: true, width: 120 },
  { headerName: 'Tiempo', field: 'tiempo', editable: true, width: 120 },
  { headerName: 'Valor', field: 'valor', editable: true, type: 'numericColumn',
    cellEditor: 'agNumberCellEditor', width: 120 },
  {
    headerName: 'Acción',
    width: 110,
    pinned: 'right',
    cellRenderer: (params: any) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Eliminar';
      btn.className = 'ag-btn-delete';
      btn.addEventListener('click', () => params.api.applyTransaction({ remove: [params.node.data] }));
      return btn;
    }
  }
];

  defaultColDefPagos: ColDef = {
    resizable: true,
    sortable: false,
    filter: false
  };

  rowDataPagos = [
    { detalle: '', plazo: '', tiempo: '', valor: 0}
  ];

  // ============= Otros campos demo =============

  private seqId = 0;

  invoiceDate = new Date().toLocaleDateString('es-EC');

  values = { subtotal: 0, discount: 0, valueWithoutIva: 0, valueWithIva: 0, ivaValue: 0, total: 0 };
  pendingBalance = 0;

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
    private autorizacionCajaService: AutorizacionCajaService
  ) { }

  ngOnInit(): void {
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

    // Formularios
    this.formCliente = this.fb.group({
      telefono: [''],
      identificacion: [''],
      email: ['', [Validators.email]],
      direccion: [''],
      emailOpcional: [''],
      categoria: [''],
      gcp: [''],     // id del prefijo (mat-select)
      prefijo: ['']  // codpre (texto), si lo necesitas también
    });

    this.formFactura = this.fb.group({
      producto: ['']
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
    // En tu componente
    // constructor(private fb: FormBuilder) { }

    this.formCaja = this.fb.group({
      puntoEmision: [''],
      ordenCompra: [''],
      secuencial: [''],
      observacion: [''],
      caja: [''],
      guiaRemision: [''],
      fechaFacturacion: ['']  // yyyy-MM-dd (input type="date")
    });


    // Autocomplete clientes
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

   //aqui se pone la funcion para recaulcular tener pendiente
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
    this.formCliente.patchValue({
      gcp: idSeleccionado ?? '',
      prefijo: encontrado?.codpre ?? ''
    });
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
              map((ge: { codigo: string; nombre: string }) => `${ge.codigo}   ${ge.nombre}`.trim()),
              catchError(() => of(cli?.categoria ?? ''))
            )
            : of(cli?.categoria ?? '');

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
              const emailLinea4 = findEmailLinea(4);

              const emailOpcionalConcat = [emailLinea3, emailLinea4].filter(Boolean).join(';');

              return {
                ...valoresBase,
                categoria,
                // 👇 usar corchetes por el index signature
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
  onPagosGridReady(e: any){ this.pagosApi = e.api; }
}
