import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';

import { ClienteService } from 'src/app/services/cliente.service';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { GlnService } from 'src/app/services/gln.service';
import { ProductoAdicionalService } from 'src/app/services/producto-adicional.service';
import { Codigos14Service } from 'src/app/services/codigos14.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { ExportService } from 'src/app/services/export.service';
import { EmpresaService } from 'src/app/services/empresa.service';
import { LogoService } from 'src/app/services/logo.service';
import { AuditoriaTransferenciaService } from 'src/app/services/auditoria-transferencia.service';
import { CuponService } from 'src/app/services/cupones.service';
import { SsccService } from 'src/app/services/sscc.service';

import { ClienteSummary } from 'src/app/interfaces/responses/cliente-summary-response';

import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { AgGridModule } from 'ag-grid-angular';

import { ColDef, GridApi, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);
import { GridOptions } from 'ag-grid-community'; 
import { MatIconModule } from '@angular/material/icon'; // si usas <mat-icon>

@Component({
  selector: 'app-traspaso-gtin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AgGridModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatMenuModule,
    MatIconModule
  ],
  templateUrl: './traspaso-gtin.component.html',
  styleUrl: './traspaso-gtin.component.css'
})
export class TraspasoGtinComponent implements OnInit {
  activeTab: string = 'Transferir';
  filtroBusqueda: string = '';
  botonActivo: string = '';
  prefijos: any[] = [];
  bandera: string = '';
  mostrarCantidad = 10;
  gridOptions: GridOptions = {};
  transferir: any[] = [];

  clienteOrigenControl = new FormControl('');
  clienteDestinoControl = new FormControl('');
  clientesOrigenFiltrados: ClienteSummary[] = [];
  clientesDestinoFiltrados: ClienteSummary[] = [];
  codcliO: number = 0;
  codcliD: number = 0;
  formUV!: FormGroup;
  cantidadFilas: number = 0;

  usuarioActual = this.usuarioService.getUsuarioActual();
  private gridApi!: GridApi;

  defaultColDef: ColDef = {
    editable: true,
    resizable: true,
    sortable: false,
    flex: 1
  };

  columnDefs: ColDef[] = [
    { headerName: '#', valueGetter: 'node.rowIndex + 1', width: 70 },
    { headerName: 'Unidad Venta', field: 'UnidadVenta' },
    { headerName: 'Descripcion', field: 'Descripcion' },
    { headerName: 'Prefijo', field: 'Prefijo' },
    { headerName: 'Gtin', field: 'Gtin' },
    { headerName: 'Marca', field: 'Marca' },
    { headerName: 'Contenido', field: 'Contenido' },
    { headerName: 'U.Medida', field: 'UMedida' },
    { headerName: 'Estado', field: 'Estado' },
    { headerName: 'Fecha Creacion', field: 'FechaCreacion' },
    { headerName: 'Presentacion', field: 'Presentacion' },
  ];

  listado = [
    {
      prefijo: '211292',
      empresaAnterior: 'Pacheco Mantilla M',
      rucAnterior: '1706814421001',
      empresaActual: 'UNICDESIGN S.A.',
      rucActual: '1792584175001',
      fecha: '15/04/2020'
    },
    {
      prefijo: '211712',
      empresaAnterior: 'Urcupac Trading S.',
      rucAnterior: '1792377471001',
      empresaActual: 'Montrade S.A.',
      rucActual: '1792596203001',
      fecha: '20/07/2019'
    },
    {
      prefijo: '211547',
      empresaAnterior: 'Alvarez Vasco Mari',
      rucAnterior: '1700044462001',
      empresaActual: 'Grijalvarez S.C.C.',
      rucActual: '1792566908001',
      fecha: '03/02/2022'
    }
  ];

  constructor(
    private clienteService: ClienteService,
    private prefijoService: PrefijoService,
    private glnService: GlnService,
    private codigos14Service: Codigos14Service,
    private productoAdicionalService: ProductoAdicionalService,
    private usuarioService: UsuarioService,
    private exportService: ExportService,
    private empresaService: EmpresaService,
    private logoService: LogoService,
    private dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.formUV = this.fb.group({
      gcp: [{ value: '', disabled: true }, Validators.required],
      mostrar: ['']
    });
  }

  ngOnInit(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();

    this.clienteOrigenControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(valor => {
          const filtro = typeof valor === 'string' ? valor.trim() : '';
          return filtro ? this.clienteService.getClientesSummary(filtro) : of({ data: [] });
        })
      )
      .subscribe(resp => this.clientesOrigenFiltrados = resp.data || []);

    this.clienteDestinoControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(valor => {
          const filtro = typeof valor === 'string' ? valor.trim() : '';
          return filtro ? this.clienteService.getClientesSummary(filtro) : of({ data: [] });
        })
      )
      .subscribe(resp => this.clientesDestinoFiltrados = resp.data || []);
  }

  cambiarTab(tab: string): void {
    this.activeTab = tab;
  }

  exportarPDF(): void {
    console.log('Exportar a PDF');
  }

  exportarExcel(): void {
    console.log('Exportar a Excel');
  }

  seleccionarBoton(nombre: string): void {
    this.botonActivo = nombre;
  }

  onBuscar(): void {
    console.log('Buscar datos con:', this.formUV.value);
  }

  onNuevaBusqueda(): void {
    this.formUV.reset();
  }

  ontransferir(): void {
    console.log('Transferencia con:', this.formUV.value);
  }

  seleccionarClienteOrigen(cliente: ClienteSummary): void {
    if (!cliente?.clientes_codigo) return;
    this.prefijoService.obtenerPorClienteCodigo(cliente.clientes_codigo)
      .subscribe(() => this.codcliO = cliente.clientes_codigo);
  }

  seleccionarClienteDestino(cliente: ClienteSummary): void {
    if (!cliente?.clientes_codigo) return;

    this.prefijoService.obtenerPorClienteCodigo(cliente.clientes_codigo)
      .subscribe(prefijos => {
        this.prefijos = prefijos;
        this.codcliD = cliente.clientes_codigo;

        const control = this.formUV.get('gcp');
        if (this.prefijos.length > 0) {
          control?.enable();
        } else {
          control?.disable();
        }
      });
  }

  mostrarNombreCliente(cliente: any): string {
    return cliente ? cliente.nomcli : '';
  }

  onPrefijoBlur(): void {
    const idSeleccionado = this.formUV.value.gcp;
    const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);
    if (objeto?.gln) {
      this.formUV.patchValue({ gln: objeto.gln });
      this.bandera = objeto.bandera;
    }
  }

generarFilas(): void {
  const cantidad = this.formUV.value.mostrar;

  if (!cantidad || cantidad <= 0) return;

  const nuevasFilas = [];
  for (let i = 0; i < cantidad; i++) {
    nuevasFilas.push({
      UnidadVenta: '',
      Descripcion: '',
      Prefijo: '',
      Gtin: '',
      Marca: '',
      Contenido: '',
      UMedida: '',
      Estado: '',
      FechaCreacion: '',
      Presentacion: ''
    });
  }

  this.transferir = nuevasFilas;
}

  onGridReady(params: any) {
    this.gridApi = params.api;



  }
    onCellValueChanged(event: any): void {
    const field = event.colDef.field;
    const newValue = event.newValue;
    if (event.colDef.field === 'activo') {
      console.log(`Checkbox cambiado en fila ${event.rowIndex}:`, event.newValue);
    }
    // Si hay error y se corrige
    if (event.data[`_error_${field}`]) {
      if (newValue !== null && newValue !== undefined && newValue.toString().trim() !== '') {
        event.data[`_error_${field}`] = false;
      }
    }

    // Actualiza visual
    this.gridApi?.refreshCells({ rowNodes: [event.node], columns: [field] });
  }
}
