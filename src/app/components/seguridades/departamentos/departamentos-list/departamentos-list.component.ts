import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { DepartamentosService } from 'src/app/services/departamentos.service';
import { DepartamentoResponse } from 'src/app/interfaces/responses/departamentos-response';

@Component({
  selector: 'app-departamentos-list',
  templateUrl: './departamentos-list.component.html',
  styleUrls: ['./departamentos-list.component.css']
})
export class DepartamentosListComponent implements OnInit {
  dataSource = new MatTableDataSource<DepartamentoResponse>();
  displayedColumns: string[] = ['nombre', 'cuenta', 'estado', 'acciones'];
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private router: Router,
    private departamentosService: DepartamentosService
  ) {}

  ngOnInit(): void {
    this.loadDepartamentos();
  }

  loadDepartamentos() {
    this.isLoading = true;
    this.departamentosService.getDepartamentos().subscribe({
      next: (data) => {
        this.dataSource = new MatTableDataSource(data);
        this.dataSource.paginator = this.paginator;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  abrirNuevoDepartamento(): void {
    this.router.navigate(['/seguridades/departamentos/crear']);
  }

  editarDepartamento(departamento: DepartamentoResponse): void {
    this.router.navigate(['/seguridades/departamentos/editar', departamento.id_departamento]);
  }
}
