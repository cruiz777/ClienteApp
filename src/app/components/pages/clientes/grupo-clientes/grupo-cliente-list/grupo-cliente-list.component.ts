import { Component, OnInit, ViewChild } from '@angular/core';
import { GrupoClienteService } from 'src/app/services/grupo-cliente.service';
import { Router } from '@angular/router';
import { GrupoCliente } from 'src/app/interfaces/responses/grupo-cliente-response';
import { MatPaginator } from '@angular/material/paginator';
import { LogoService } from 'src/app/services/logo.service';
import { EmpresaService } from 'src/app/services/empresa.service';
import { ExportService } from 'src/app/services/export.service';
import { ExportOptions } from 'src/app/interfaces/export-options';
import * as moment from 'moment';
import { PermissionsService } from 'src/app/services/permission.service';

@Component({
  selector: 'app-grupo-cliente-list',
  templateUrl: './grupo-cliente-list.component.html',
  styleUrls: ['./grupo-cliente-list.component.css']
})
export class GrupoClienteListComponent implements OnInit {
  grupos: GrupoCliente[] = [];
  gruposFiltrados: GrupoCliente[] = [];
  filtro: string = '';
  logoUrl: string = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private grupoClienteService: GrupoClienteService,
    private router: Router,
    private logoService: LogoService,
    private empresaService: EmpresaService,
    private exportService: ExportService,
    public permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.cargarGrupos();

    // Obtener logo dinámicamente
    this.empresaService.getEmpresas().subscribe({
      next: (empresas) => {
        if (empresas.length > 0 && empresas[0].empresaLogo) {
          this.logoUrl = this.logoService.getLogoUrl(empresas[0].empresaLogo);
          console.log('Logo cargado desde empresa:', this.logoUrl);
        } else {
          console.warn('No se encontró empresa o logo.');
        }
      },
      error: (err) => {
        console.error('Error al cargar empresa para obtener logo:', err);
      }
    });
  }

  cargarGrupos(): void {
    this.grupoClienteService.getAll().subscribe({
      next: (res) => {
        this.grupos = res.data;
        this.aplicarFiltro();
      },
      error: () => {
        console.error('Error al cargar grupos de cliente.');
      }
    });
  }

  aplicarFiltro(): void {
    const value = this.filtro.toLowerCase();
    this.gruposFiltrados = this.grupos.filter(g =>
      g.nombre.toLowerCase().includes(value) ||
      g.codigo.toLowerCase().includes(value)
    );
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  get paginatedData(): GrupoCliente[] {
    if (!this.paginator) return this.gruposFiltrados;

    const start = this.paginator.pageIndex * this.paginator.pageSize;
    return this.gruposFiltrados.slice(start, start + this.paginator.pageSize);
  }

  nuevo(): void {
    this.router.navigate(['/codbar/ficha-de-cliente/grupo-cliente/crear']);
  }

  editar(id: number): void {
    this.router.navigate(['/codbar/ficha-de-cliente/grupo-cliente/editar', id]);
  }

  // Método para exportar los datos filtrados en formato Excel o PDF
  exportar(tipo: 'excel' | 'pdf'): void {
    // Encabezados que se mostrarán en el archivo exportado
    // Estos son los títulos visibles en el Excel/PDF
    const headers = [
      'Código', 'Grupo', 'Inscripción', 'Asignación',
      'Mantenimiento', 'Valor Anual', 'Estado', 'Fecha'
    ];

    // Claves del objeto que corresponden a cada columna
    // Sirve para mapear los valores reales que se exportarán por campo
    const columns = [
      'codigo', 'nombre', 'inscripcion', 'asignacion',
      'mantenimiento', 'valorAnual', 'estadoTexto', 'fechaTexto'
    ];

    // Transformamos los datos filtrados (gruposFiltrados) para exportar
    // Se genera un nuevo arreglo con los datos listos para impresión
    const data = this.gruposFiltrados.map((g) => ({
      codigo: g.codigo,
      nombre: g.nombre,
      inscripcion: g.inscripcion,
      asignacion: g.asignacion,
      mantenimiento: g.mantenimiento,
      valorAnual: g.valorAnual,
      // Campo transformado: 'ACTIVO' o 'INACTIVO'
      estadoTexto: g.estado ? 'ACTIVO' : 'INACTIVO',
      // Fecha formateada a 'DD/MM/YYYY'
      fechaTexto: moment(g.fecha).format('DD/MM/YYYY')
    }));

    // Objeto de opciones que se enviará al servicio ExportService
    // Contiene: datos, columnas, headers, título, nombre del archivo y logo
    const options: ExportOptions = {
      data,
      columns,
      headers,
      filename: 'GruposCliente',
      title: 'Mantenimiento Grupo Cliente',
      logoUrl: this.logoUrl
    };

    // Dependiendo del tipo de exportación (Excel o PDF),
    // se llama al método correspondiente del servicio
    if (tipo === 'excel') {
      this.exportService.exportarExcel(options); // Exportar a Excel
    } else {
      this.exportService.exportarPDF(options); // Exportar a PDF
    }
  }

}
