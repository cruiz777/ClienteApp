import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AgGridAngular } from 'ag-grid-angular';
import { MatIconModule } from '@angular/material/icon';
import { FacturaGlobalService, ClienteCodpreGrupoResponse } from 'src/app/services/factura-global.service';
import { AutorizacionCajaService } from 'src/app/services/autorizacion-caja.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { ClienteService } from 'src/app/services/cliente.service';
import { of, forkJoin } from 'rxjs';
import { take, map, switchMap, catchError } from 'rxjs/operators';
import { ClienteContactoService } from 'src/app/services/cliente-contacto.service';
import { ZonaService, Zona } from '../../../../services/zona.service';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  ColDef, GridApi, GridReadyEvent, ModuleRegistry, IRowNode, AllCommunityModule
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-facturacion-global',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, AgGridAngular,
    MatIconModule,
    MatSelectModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatTooltipModule 
  ],
  templateUrl: './facturacion-global.component.html',
  styleUrls: ['./facturacion-global.component.css']
})
export class FacturacionGlobalComponent implements OnInit {
  @ViewChild('qfInput') qfInput!: ElementRef<HTMLInputElement>;
  hasQf = false; // muestra/oculta el botón "X"
  activeTab: 'Factura' | 'Listado' = 'Factura';
  formFactura!: FormGroup;
  formCaja!: FormGroup;
  usuarioActual = this.usuarioService.getUsuarioActual();

  private gridApi!: GridApi;
  private pendingQuickFilter = '';
  cargando = false;

  totalSeleccionado = 0;
  selectedCount = 0;
  showSoloSeleccionados = false;
  zonas: Zona[] = [];
  trackByZonaId = (_: number, z: Zona) => z.id;
  cargandoZonas = false;

  // getters cómodos
  get anioCtrl() { return this.formFactura.get('anio')!; }
  get zonaCtrl() { return this.formFactura.get('zona')!; }

  // Limita a 4 dígitos y quita caracteres no numéricos


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
      valueFormatter: p => this.money(Number(p.value)), // MONTO
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
    { headerName: 'Email', field: 'email',hide:true },
  ];

  defaultColDef: ColDef = { sortable: true, filter: true, resizable: true };

  rowData: any[] = [];

  constructor(
    private fb: FormBuilder,
    private facturaGlobalService: FacturaGlobalService,
    private autorizacionCajaService: AutorizacionCajaService,
    private usuarioService: UsuarioService,
    private clienteService: ClienteService,
    private clienteContactoService: ClienteContactoService,
    private zonaService: ZonaService
  ) { }

  ngOnInit(): void {
    this.cargarAutorizacion();
    this.cargarZonas();
    const hoy = new Date();
    // Formatea con dos dígitos (día/mes/año)
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0'); // enero = 0
    const anio = hoy.getFullYear();

    const fechaFormateada = `${dia}/${mes}/${anio}`;
    this.formFactura = this.fb.group({
      anio: [new Date().getFullYear().toString(), [Validators.required, Validators.pattern(/^\d{4}$/)]],
      // término rápido opcional para el endpoint:
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

    // Filtro externo: solo seleccionados
    this.gridApi.setGridOption('isExternalFilterPresent', this.isExternalFilterPresent);
    this.gridApi.setGridOption('doesExternalFilterPass', this.doesExternalFilterPass);

    if (this.pendingQuickFilter) this.gridApi.setGridOption('quickFilterText', this.pendingQuickFilter);
    this.gridApi.sizeColumnsToFit();
  }

  cambiarTab(tab: 'Factura' | 'Listado') {
    this.activeTab = tab;
    if (tab === 'Factura' && this.gridApi) setTimeout(() => this.gridApi.sizeColumnsToFit());
  }

  money(v: number) {
    const n = Number(v ?? 0);
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  onQuickFilter(e: Event) {
    const value = (e.target as HTMLInputElement).value || '';
    this.hasQf = !!value.trim();                    // <— MUESTRA/OCULTA EL ÍCONO
    if (this.gridApi) this.gridApi.setGridOption('quickFilterText', value);
    else this.pendingQuickFilter = value;
  }

  clearBusqueda() {
    this.pendingQuickFilter = '';
    this.hasQf = false;                             // <— APAGA EL ÍCONO
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
    const rows = this.gridApi.getSelectedRows();
    this.selectedCount = rows.length;
    this.totalSeleccionado = rows.reduce((sum, r) => sum + this.parseNumber(r.total), 0);
    if (this.showSoloSeleccionados) this.gridApi.onFilterChanged();
  }

  // Filtro externo (solo seleccionados)
  isExternalFilterPresent = (): boolean => this.showSoloSeleccionados;
  doesExternalFilterPass = (node: IRowNode): boolean => !!node.isSelected();
  toggleSoloSeleccionados() { this.showSoloSeleccionados = !this.showSoloSeleccionados; this.gridApi?.onFilterChanged(); }
  limpiarSeleccion() { this.gridApi?.deselectAll(); this.onSelectionChanged(); }


  buscar() {
    if (this.formFactura.invalid) return;

    const termino = (this.formFactura.get('termino')?.value ?? '').trim();
    const prefijo = (this.formFactura.get('prefijo')?.value ?? '').trim();
    const idZona = this.formFactura.get('zona')?.value || null;
    this.cargando = true;

    this.facturaGlobalService
      .getClientesCodpreGrupo({
        busquedaGeneral: termino,
        prefijoBusqueda: prefijo, idZona
      })
      .pipe(
        // 1) Mapeo base (sin email aún)
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
            zona: r.referencia ?? ''
          }))
        ),

        // 2) Con esos rows, traer contactos por cliente y construir el email
        switchMap(baseRows => {
          // ids únicos y numéricos
          const ids: number[] = Array.from(
            new Set(
              baseRows
                .map(r => Number(r.codCliente))
                .filter(n => Number.isFinite(n))
            )
          );

          if (!ids.length) {
            return of({ baseRows, emailMap: {} as Record<number, string> });
          }

          // Para cada id, pedimos contactos y armamos el email combinado
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
        })
      )
      .subscribe({
        next: ({ baseRows, emailMap }) => {
          // 3) Mezclar email en cada fila
          this.rowData = baseRows.map(r => ({
            ...r,
            email: emailMap[Number(r.codCliente)] ?? ''
          }));

          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.rowData);
            this.gridApi.sizeColumnsToFit();
            this.gridApi.deselectAll();
          }

          this.totalSeleccionado = 0;
          this.selectedCount = 0;
        },
        error: (err) => {
          console.error('[FacturaGlobal] error al buscar:', err);
          this.cargando = false;
        },
        complete: () => (this.cargando = false)
      });
  }

  cancelar() {
    // 1) Formulario: restablecer a valores por defecto
    const anioPorDefecto = new Date().getFullYear().toString();
    this.formFactura.reset({
      anio: anioPorDefecto,
      termino: '',
      prefijo: ''
    });
    this.formFactura.markAsPristine();
    this.formFactura.markAsUntouched();

    // 2) Quick filter del grid: limpiar input y estado
    this.hasQf = false;
    this.pendingQuickFilter = '';
    if (this.qfInput) this.qfInput.nativeElement.value = '';

    // 3) Grid: limpiar datos, filtros y selección
    this.rowData = [];
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', []);   // borra filas
      this.gridApi.deselectAll();                  // sin selección
      this.gridApi.setFilterModel(null);           // filtros de columnas
      this.gridApi.setGridOption('quickFilterText', ''); // quick filter
      this.gridApi.onFilterChanged();
      // si usas filtro externo "solo seleccionados", lo apagamos
      if (this.showSoloSeleccionados) {
        this.showSoloSeleccionados = false;
        this.gridApi.onFilterChanged();
      }
    }

    // 4) Totales y estado varios
    this.totalSeleccionado = 0;
    this.selectedCount = 0;
    this.cargando = false;
  }
  cargarAutorizacion() {
    this.autorizacionCajaService.getAutorizacionCaja(1).subscribe({
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
  private padLeft(value: any, size: number): string {
    const s = (value ?? '').toString().replace(/\D/g, ''); // solo dígitos
    return s ? s.padStart(size, '0') : '';
  }
  // Une email y emailOpcional (con distintos nombres posibles)
  // Une email + emailOpcional (o 'correo' + 'email_opcional')
  private buildEmail(cli: any): string {
    const e1 = (cli?.email ?? cli?.correo ?? '').toString().trim();
    const e2 = (cli?.emailOpcional ?? cli?.email_opcional ?? '').toString().trim();
    return [e1, e2].filter(Boolean).join(';');
  }

  // Pide correos por id numérico
  private cargarEmails(codigos: number[]) {
    const unique = Array.from(new Set(codigos)).filter(n => Number.isFinite(n));
    if (!unique.length) return of({} as Record<number, string>);

    const reqs = unique.map((id) =>
      this.clienteService.getClienteById(id).pipe(   // <-- id es number
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

    const emailLinea2 = findEmailLinea(contactos, 2); // principal
    const emailLinea3 = findEmailLinea(contactos, 3); // opcional
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
        // Orden opcional por referencia
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

  // (opcional) atajo de teclado: Ctrl/Cmd+Enter para buscar
  onKeyDownForm(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') {
      e.preventDefault();
      this.buscar();
    }
  }
   restoreAnio(): void {
    this.anioCtrl.setValue(String(new Date().getFullYear()));
  }
}
