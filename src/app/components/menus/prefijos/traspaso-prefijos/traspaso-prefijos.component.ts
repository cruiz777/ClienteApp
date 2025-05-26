import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { ClienteService } from 'src/app/services/cliente.service';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { ClienteSummary } from 'src/app/interfaces/responses/cliente-summary-response';
import { PrefijoClienteResponse } from 'src/app/interfaces/responses/PrefijoClienteResponse';
import { FormControl } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';


@Component({
  selector: 'app-traspaso-prefijos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule,
    MatAutocompleteModule

  ],
  templateUrl: './traspaso-prefijos.component.html',
  styleUrls: ['./traspaso-prefijos.component.css']
})
export class TraspasoPrefijosComponent {

  activeTab: string = 'Transferir';
  filtroBusqueda: string = '';
  filtroCliente: string = '';
  botonActivo: string = '';

  clientesFiltrados: ClienteSummary[] = [];
  clienteOrigenControl = new FormControl('');
  clienteDestinoControl = new FormControl('');
  prefijosClienteOrigen: PrefijoClienteResponse[] = [];
  prefijosClienteDestino: PrefijoClienteResponse[] = [];

  constructor(
    private clienteService: ClienteService,
    private prefijoService: PrefijoService
  ) { }

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

  asignaciones = [
    { prefijo: '12062', fecha: '22/05/2017', estado: 'Activo', seleccionar: 'Activo' },
    { prefijo: '12212', fecha: '14/10/2022', estado: 'Activo', seleccionar: 'Activo' },
    { prefijo: '212441', fecha: '10/05/2017', estado: 'Activo', seleccionar: 'Activo' }
  ];

  ngOnInit(): void {
    // --BUSQUEDA ORIGEN
    this.clienteOrigenControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(valor => {
          const filtro = (valor || '').trim();
          if (!filtro) return of({ data: [] });
          return this.clienteService.getClientesSummary(filtro);
        })
      )
      .subscribe(resp => {
        this.clientesFiltrados = resp.data || [];
      });

    // --BUSQUEDA DESTINO
    this.clienteDestinoControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(valor => {
          const filtro = (valor || '').trim();
          if (!filtro) return of({ data: [] });
          return this.clienteService.getClientesSummary(filtro);
        })
      )
      .subscribe(resp => {
        this.clientesFiltrados = resp.data || [];
      });
  }


  cambiarTab(tab: string) {
    this.activeTab = tab;
  }

  exportarPDF() {
    console.log('Exportar a PDF');
    // lógica de exportación con jsPDF
  }

  exportarExcel() {
    console.log('Exportar a Excel');
    // lógica de exportación con XLSX
  }
  seleccionarBoton(nombre: string): void {
    this.botonActivo = nombre;
  }

  onBuscar(nomcli: string): void {
    //this.clienteService.getClientesSummary(nomcli).subscribe(resp => { this.clientesFiltrados = resp.data; });
  }

  seleccionarCliente(nombre: string): void {
    console.log('Cliente seleccionado:', nombre);

    const clienteSeleccionado = this.clientesFiltrados.find(c => c.nomcli === nombre);
  }

  seleccionarClienteOrigen(cliente: ClienteSummary): void {
    if (!cliente || !cliente.clientes_codigo) return;

    this.prefijoService.obtenerPorClienteCodigo(cliente.clientes_codigo)
      .subscribe(prefijos => {
        this.prefijosClienteOrigen = prefijos;
        console.log('Prefijos de cliente origen:', this.prefijosClienteOrigen);
      });
  }
  seleccionarClienteDestino(cliente: ClienteSummary): void {
    if (!cliente || !cliente.clientes_codigo) return;

    this.prefijoService.obtenerPorClienteCodigo(cliente.clientes_codigo)
      .subscribe(prefijos => {
        this.prefijosClienteDestino = prefijos;
        console.log('Prefijos de cliente destino:', prefijos);
      });
  }
  mostrarNombreCliente(cliente: any): string {
    return cliente ? cliente.nomcli : '';
  }
  onNuevaBusqueda(): void {
    // Limpiar campos de entrada
  this.clienteOrigenControl.setValue('');
  this.clienteDestinoControl.setValue('');

  // Limpiar resultados y prefijos
  this.clientesFiltrados = [];
  this.prefijosClienteOrigen = [];
  this.prefijosClienteDestino = [];

  console.log('Campos limpiados y tablas vacías');
  }

  onAsignar(): void {
    // lógica para asignar
  }

}


