import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';


@Component({
  selector: 'app-nuevo-sscc',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatOptionModule,
    RouterModule
  ],
  templateUrl: './nuevo-sscc.component.html',
  styleUrl: './nuevo-sscc.component.css'
})
export class NuevoSsccComponent implements OnInit {
  activeTab: string = 'Listado';
  currentDateTime: string = '';
  isHandset: boolean = false;
  isExpanded: boolean = true;

  columnas: string[] = ['indice', 'empresa', 'prefijo', 'identificadorEmpaque', 'sscc', 'fecha', 'estado', 'usuario', 'opcion', 'seleccionar'];

  registros: any[] = [
    { empresa: 'Empresa A', prefijo: '12345', identificadorEmpaque: 'EMPK001', sscc: 'SSCC001', fecha: new Date(), estado: 'Activo', usuario: 'admin', seleccionado: false },
    { empresa: 'Empresa B', prefijo: '67890', identificadorEmpaque: 'EMPK002', sscc: 'SSCC002', fecha: new Date(), estado: 'Inactivo', usuario: 'usuario1', seleccionado: false }
  ];

  prefijosDisponibles = ['12345', '67890'];
  filtroTexto = '';
  filtroPrefijo = '';
  filtroBusqueda = '';

  dataFiltrada = new MatTableDataSource(this.registros);

  constructor(
    private router: Router,
    private breakpointObserver: BreakpointObserver
  ) {
    this.breakpointObserver.observe([Breakpoints.Handset])
      .subscribe(result => {
        this.isHandset = result.matches;
        this.isExpanded = !this.isHandset;
      });
  }
  ngOnInit(): void {
    this.filtrar();
  }

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
  capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
    updateDateTime(): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    const formattedDate = now.toLocaleDateString('es-EC', options);
    const formattedTime = now.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    this.currentDateTime = `${this.capitalizeFirstLetter(formattedDate)}, ${formattedTime}`;
  }

}
