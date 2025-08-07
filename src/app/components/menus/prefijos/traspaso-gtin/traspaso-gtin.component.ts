import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';

import { ClienteService } from 'src/app/services/cliente.service';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { GlnService } from 'src/app/services/gln.service';
import { ProductoAdicionalService } from 'src/app/services/producto-adicional.service';
import { Codigos14Service, ActualizarCodigo14Request } from 'src/app/services/codigos14.service';
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
import { ProductoService, Producto } from 'src/app/services/producto.service';
import { map, catchError } from 'rxjs/operators';
import { from, concat, concatMap, delay } from 'rxjs';
import { Observable } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { ViewChild } from '@angular/core';
import { ExportOptions } from 'src/app/interfaces/export-options';



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
    MatIconModule,
    MatTableModule,
    MatPaginatorModule

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
  textoPegado: string = '';
  clienteOrigenControl = new FormControl('');
  clienteDestinoControl = new FormControl('');
  clientesOrigenFiltrados: ClienteSummary[] = [];
  clientesDestinoFiltrados: ClienteSummary[] = [];
  codcliO: number = 0;
  codcliD: number = 0;
  nomcliO: string = '';
  nomcliD: string = '';
  formUV!: FormGroup;
  cantidadFilas: number = 0;
   logoUrl: string = '';
  usuarioActual = this.usuarioService.getUsuarioActual();
  private gridApi!: GridApi;

botonAsignarActivo: boolean = true;
  defaultColDef: ColDef = {
    editable: true,
    resizable: true,
    sortable: false,

  };
  columnasTabla: string[] = ['numero', 'codbar', 'despro', 'referencia'];
  dataSource = new MatTableDataSource<Producto>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  columnDefs: ColDef[] = [
    { headerName: '#', valueGetter: 'node.rowIndex + 1', width: 50, editable: false },
    { headerName: 'Unidad Venta', field: 'UnidadVenta', width: 150, editable: true },
    { headerName: 'Descripcion', field: 'Descripcion', width: 300, editable: false },
    { headerName: 'Prefijo', field: 'Prefijo', width: 100, editable: false },
    { headerName: 'Gtin', field: 'Gtin', width: 100, editable: false },
    { headerName: 'Marca', field: 'Marca', width: 150, editable: false },
    { headerName: 'Contenido', field: 'Contenido', width: 100, editable: false },
    { headerName: 'U.Medida', field: 'UMedida', width: 100, editable: false },
    { headerName: 'Estado', field: 'Estado', width: 100, editable: false },
    { headerName: 'Fecha Creacion', field: 'FechaCreacion', width: 100, editable: false },
    { headerName: 'Presentacion', field: 'Presentacion', width: 100, editable: false },
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
    private fb: FormBuilder,
    private productoService: ProductoService

  ) {
    this.formUV = this.fb.group({
      gcp: [{ value: '', disabled: true }, Validators.required],
      mostrar: [''],
      textoPegado: ['']
    });
  }

  ngOnInit(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    this.cargarProductosConAbreviaT();
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
      this.dataSource.filterPredicate = (data: Producto, filter: string) => {
  const valor = filter.trim().toLowerCase();
  return (
    data.codbar?.toString().toLowerCase().includes(valor) ||
    data.Despro?.toLowerCase().includes(valor) ||
    data.Referencia?.toLowerCase().includes(valor)
  );
};
  }

 

ngAfterViewInit(): void {
  setTimeout(() => {
    if (this.dataSource) {
      this.dataSource.paginator = this.paginator;
    }
  });
}

 cambiarTab(tab: string): void {
  this.activeTab = tab;

  // Espera un ciclo para asegurar que el DOM haya renderizado el paginator
  if (tab === 'Listado') {
    setTimeout(() => {
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
    }, 100);
  }
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
    if (!this.codcliO || !this.codcliD) {
      this.mostrarAlerta('Debe seleccionar cliente origen y destino.', 'Error');
      return;
    }

    const gtins = this.transferir
      .map(fila => (fila.UnidadVenta || '').trim())
      .filter(gtin => gtin.length > 0);

    if (gtins.length === 0) {
      this.mostrarAlerta('No hay GTINs para buscar.', 'Advertencia');
      return;
    }

    const solicitudes = gtins.map(gtin => this.buscarProductoYActualizarFila(gtin));

    forkJoin(solicitudes).subscribe(() => {
      this.transferir = [...this.transferir]; // Refrescar tabla
      this.mostrarAlerta('Consulta completada.', 'Información');
    });
  }
  private buscarProductoYActualizarFila(gtin: string): Observable<void> {
    return this.productoService.getProductosPorClienteYCodbar(this.codcliO, gtin).pipe(
      map((productos: Producto[]) => {
        const fila = this.transferir.find(f => (f.UnidadVenta || '').trim() === gtin);

        if (!fila) return;

        if (productos.length > 0) {
          const p = productos[0];
          fila.Descripcion = p.Despro;
          fila.Prefijo = p.codpre;
          fila.Gtin = p.gtin;
          fila.Marca = p.marca;
          fila.Contenido = p.contenido;
          fila.UMedida = p.unidad;
          fila.Estado = p.Activo ? 'ACTIVO' : 'INACTIVO';
          fila.FechaCreacion = this.formatearFecha(p.Feccre);
          fila.Presentacion = p.p;
        } else {
          // 🔴 Producto no encontrado
          fila.Descripcion = 'NO EXISTE';
        }
      }),
      catchError(error => {
        console.error(`Error al buscar producto con GTIN ${gtin}:`, error);
        const fila = this.transferir.find(f => (f.UnidadVenta || '').trim() === gtin);
        if (fila) fila.Descripcion = 'ERROR';
        return of(); // evitar que forkJoin se detenga
      })
    );
  }


  formatearFecha(fechaStr: string | Date): string {
    const fecha = new Date(fechaStr);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  onNuevaBusqueda(): void {
   this.formUV.reset();
  this.cantidadFilas = 0;

  this.clienteOrigenControl.reset();
  this.clienteDestinoControl.reset();
this.dataSource.data = [];

this.transferir = [];
   
    this.textoPegado = '';
    this.botonAsignarActivo = true;
  }

  ontransferir(): void {
    if (!this.codcliO || !this.codcliD) {
      this.mostrarAlerta('Debe seleccionar cliente origen y destino.', 'Error');
      return;
    }
    this.botonAsignarActivo = false;
    this.seleccionarBoton('transferir');
    const idPrefijosNuevo = this.formUV.value.gcp;
    const seleccionado = this.prefijos.find(p => p.id_prefijos === idPrefijosNuevo);

    if (!idPrefijosNuevo || !seleccionado) {
      this.mostrarAlerta('Debe seleccionar el nuevo prefijo (GCP).', 'Error');
      return;
    }

    const filas = this.transferir.filter(
      fila => fila?.UnidadVenta && fila.Descripcion !== 'NO EXISTE'
    );

    if (filas.length === 0) {
      this.mostrarAlerta('No hay datos válidos para transferir.', 'Advertencia');
      return;
    }

    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: 'Confirmar asignación',
        message: `¿Está seguro que desea transferir códigos?`,
        type: 'info',
        confirmText: 'Sí, asignar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmado => {
      if (!confirmado) return;

      let exitosos = 0;
      let fallidos = 0;

      from(filas)
        .pipe(
          concatMap((fila, index) =>
            this.codigos14Service.getPorGtin(fila.UnidadVenta).pipe(
              concatMap((registros) => {
                const codigos14 = registros?.[0];
                const clienteReal = codigos14?.clientes_codigo;
                const usuario = this.usuarioActual?.nombre_usuario; // debe estar declarado
                const fecha = this.obtenerFechaFormateada();
                const payloadProducto = {
                  codbar: fila.UnidadVenta,
                  referencia: `${this.nomcliO}-${this.nomcliD}-${fecha}-${usuario}`,
                  abrevia: 'T'
                };

                const payloadAdicional = {
                  codbar: fila.UnidadVenta,
                  clientesCodigoAnterior: this.codcliO,
                  clientesCodigoNuevo: this.codcliD,
                  idPrefijosNuevo: idPrefijosNuevo
                };

                const payloadCodigo14 = {
                  codbar: fila.UnidadVenta,
                  clientesCodigoOriginal: clienteReal ?? 0,
                  clientesCodigoNuevo: this.codcliD,
                  idPrefijosNuevo: idPrefijosNuevo
                };

                return this.productoService.actualizarReferenciaYAbrevia(payloadProducto).pipe(
                  concatMap(() =>
                    this.productoAdicionalService.actualizarCodigosClientePorFiltros(payloadAdicional).pipe(
                      concatMap(res1 => {
                        if (res1?.data === true && clienteReal) {
                          return this.codigos14Service.actualizarClientesCodigo14PorCodbar(payloadCodigo14).pipe(
                            catchError(err => {
                              console.warn(`⚠️ Codigos14 no actualizado para ${fila.UnidadVenta}`, err);
                              return of({ data: null });
                            })
                          );
                        } else {
                          if (!clienteReal) {
                            console.warn(`⚠️ Sin coincidencia en Codigos14 para ${fila.UnidadVenta}`);
                          }
                          return of({ data: true });
                        }
                      })
                    )
                  ),
                  delay(150),
                  catchError(err => {
                    console.error(`❌ Error en fila ${index}:`, err);
                    fila.Estado = 'NO TRANSFERIDO';
                    fallidos++;
                    return of(null);
                  })
                );
              })
            )
          )
        )
        .subscribe({
          next: (response) => {
            const fila = filas[exitosos + fallidos];
            if (response !== null) {
              exitosos++;
              if (fila) fila.Estado = 'TRANSFERIDO';
            } else {
              fallidos++;
              if (fila) fila.Estado = 'NO TRANSFERIDO';
            }
          },
          complete: () => {
            this.mostrarAlerta(
              `Transferencia finalizada. Éxitos: ${exitosos}, Errores: ${fallidos}.`,
              'Transferencia'
            );
            this.transferir = [...this.transferir];
            this.cargarProductosConAbreviaT();
          }
        });
    });
  }



  seleccionarClienteOrigen(cliente: ClienteSummary): void {
    if (!cliente?.clientes_codigo) return;

    this.prefijoService.obtenerPorClienteCodigo(cliente.clientes_codigo).subscribe(() => {
      this.codcliO = cliente.clientes_codigo;
      this.nomcliO = cliente.nomcli + " " + cliente.ruc;
    });
  }


  seleccionarClienteDestino(cliente: ClienteSummary): void {
    if (!cliente?.clientes_codigo) return;

    this.prefijoService.obtenerPorClienteCodigo(cliente.clientes_codigo)
      .subscribe(prefijos => {
        this.prefijos = prefijos;
        this.codcliD = cliente.clientes_codigo;
        this.nomcliD = cliente.nomcli + " " + cliente.ruc;
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
  pegarPrimeraColumna(): void {
    const texto = this.formUV.get('textoPegado')?.value;

    if (!texto?.trim()) {
      return;
    }

    const lineas = texto.trim().split('\n');
    const limite = Math.min(lineas.length, this.transferir.length);

    for (let i = 0; i < limite; i++) {
      const valor = lineas[i].trim();
      if (this.transferir[i]) {
        this.transferir[i].UnidadVenta = valor;
      }
    }

    this.transferir = [...this.transferir]; // Forzar redibujo
    this.formUV.get('textoPegado')?.setValue('');
  }
  mostrarAlerta(mensaje: string, tipo: string) {
    this._snackBar.open(mensaje, tipo, {
      horizontalPosition: "end",
      verticalPosition: "top",
      duration: 3000
    });
  }
  private obtenerFechaFormateada(): string {
    const hoy = new Date();
    const dd = String(hoy.getDate()).padStart(2, '0');
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const yyyy = hoy.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
cargarProductosConAbreviaT(): void {
  this.productoService.getProductosConAbreviaT().subscribe(productos => {
    this.dataSource = new MatTableDataSource<Producto>(productos);

    // Si ya está inicializado el paginator, lo asignas aquí
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  });
}
aplicarFiltro(): void {
  this.dataSource.filter = this.filtroBusqueda.trim().toLowerCase();
}

exportar(tipo: 'excel' | 'pdf'): void {
  const headers = [ 'UV', 'Descripción', 'Observación'];
  const columns = [ 'codbar', 'despro', 'referencia'];

  const data = this.dataSource.data.map((item: any, index: number) => ({
   
    codbar: item.codbar,
    despro: item.Despro,
    referencia: item.Referencia
  }));

  const options: ExportOptions = {
    data,
    columns,
    headers,
    filename: 'GTIN_Transferidos',
    title: 'Listado de GTIN Transferidos',
    logoUrl: this.logoUrl
  };

  if (tipo === 'excel') {
    this.exportService.exportarExcel(options);
  } else {
    this.exportService.exportarPDF(options);
  }
}



}
