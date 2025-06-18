import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatOptionModule } from '@angular/material/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';

import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Component({
  selector: 'app-nuevo-sscc',
  standalone: true,
  templateUrl: './nuevo-sscc.component.html',
  styleUrls: ['./nuevo-sscc.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatOptionModule,
    MatDatepickerModule
  ]
})
export class NuevoSsccComponent implements OnInit {
  activeTab: string = 'Listado';
  isHandset: boolean = false;
  isExpanded: boolean = true;
  currentDateTime: string = '';

  // LISTADO
  columnas: string[] = ['indice', 'empresa', 'prefijo', 'identificadorEmpaque', 'sscc', 'fecha', 'estado', 'usuario', 'opcion', 'seleccionar'];
  registros = [
    { empresa: 'Empresa A', prefijo: '12345', identificadorEmpaque: 'EMPK001', sscc: 'SSCC001', fecha: new Date(), estado: 'Activo', usuario: 'admin', seleccionado: false },
    { empresa: 'Empresa B', prefijo: '67890', identificadorEmpaque: 'EMPK002', sscc: 'SSCC002', fecha: new Date(), estado: 'Inactivo', usuario: 'usuario1', seleccionado: false }
  ];
  dataFiltrada = new MatTableDataSource(this.registros);
  prefijosDisponibles = ['12345', '67890'];
  filtroTexto = '';
  filtroPrefijo = '';
  filtroBusqueda = '';

  // GENERAR
  formSSCC: FormGroup;
  columnasGeneradas: string[] = ['ia', 'sscc'];
  empaques = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  dataGenerada = new MatTableDataSource<any>([]);

  // REPORTES
  formReporte: FormGroup;
  estados = ['Activo', 'Inactivo'];
  operadores = [
    { simbolo: '=', control: 'opIgual' },
    { simbolo: '=<', control: 'opMenorIgual' },
    { simbolo: '>', control: 'opMayor' },
    { simbolo: 'Entre', control: 'opEntre' }
  ];

  constructor(
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private fb: FormBuilder
  ) {
    // FORM GENERAR
    this.formSSCC = this.fb.group({
      codigoCliente: [''],
      cliente: [''],
      ruc: [''],
      prefijo: [''],
      producto: [''],
      empaque: [''],
      serie: [false],
      inicio: [''],
      fin: [''],
      codigosGenerados: ['']
    });

    // FORM REPORTES
    this.formReporte = this.fb.group({
      prefijo: [''],
      estado: [''],
      fecha: [''],
      desde: [''],
      hasta: [''],
      opIgual: [false],
      opMenorIgual: [false],
      opMayor: [false],
      opEntre: [false]
    });

    // RESPONSIVE
    this.breakpointObserver.observe([Breakpoints.Handset])
      .subscribe(result => {
        this.isHandset = result.matches;
        this.isExpanded = !this.isHandset;
      });
  }

  ngOnInit(): void {
    this.filtrar();
  }

  // ========== LISTADO ==========
  filtrar(): void {
    this.dataFiltrada.data = this.registros.filter(r => {
      const coincideTexto = this.filtroTexto ? JSON.stringify(r).toLowerCase().includes(this.filtroTexto.toLowerCase()) : true;
      const coincidePrefijo = this.filtroPrefijo ? r.prefijo === this.filtroPrefijo : true;
      const coincideBusqueda = this.filtroBusqueda ? JSON.stringify(r).toLowerCase().includes(this.filtroBusqueda.toLowerCase()) : true;
      return coincideTexto && coincidePrefijo && coincideBusqueda;
    });
  }

  verDetalle(row: any): void {
    alert(`Mostrando detalle para: ${row.empresa}`);
  }

  eliminarSeleccionados(): void {
    this.registros = this.registros.filter(r => !r.seleccionado);
    this.filtrar();
  }

  cambiarTab(tab: string): void {
    this.activeTab = tab;
  }

  salir(): void {
    this.router.navigate(['/pages/clientes']);
  }

  // ========== GENERAR ==========
  nuevo(): void {
    this.formSSCC.reset();
    this.dataGenerada.data = [];
  }

  generar(): void {
    const inicio = parseInt(this.formSSCC.get('inicio')?.value || '1', 10);
    const fin = parseInt(this.formSSCC.get('fin')?.value || '2', 10);
    const lista = [];

    for (let i = inicio; i <= fin; i++) {
      lista.push({ ia: i, sscc: `SSCC${i.toString().padStart(5, '0')}` });
    }

    this.dataGenerada.data = lista;
    this.formSSCC.patchValue({ codigosGenerados: lista.length });
  }

  grabar(): void {
    console.log('Guardando...', this.formSSCC.value, this.dataGenerada.data);
  }

  // ========== REPORTES ==========
  exportar(): void {
    const filtros = this.formReporte.value;
    console.log('📤 Exportando con filtros:', filtros);
    // Aquí se integraría exportación a Excel/PDF o consulta a backend.
  }

  // ========== UTILIDADES ==========
  capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  updateDateTime(): void {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    this.currentDateTime = `${this.capitalizeFirstLetter(formattedDate)}, ${formattedTime}`;
  }
}
