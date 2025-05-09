import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { DepartamentosService } from 'src/app/services/departamentos.service';
import { DepartamentoRequest } from 'src/app/interfaces/requests/departamento-request';
import { DepartamentoResponse } from 'src/app/interfaces/responses/departamentos-response';
import { DepartamentoDialogComponent } from '../../dialogs/departamento/departamento-dialog.component';

@Component({
  selector: 'app-departamentos-list',
  templateUrl: './departamentos-list.component.html',
  styleUrls: ['./departamentos-list.component.css']
})
export class DepartamentosListComponent implements OnInit {
  dataSource = new MatTableDataSource<DepartamentoResponse>();
  displayedColumns: string[] = ['nombre', 'estado', 'acciones'];
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
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

  abrirDialogoNuevoDepartamento() {
    const dialogRef = this.dialog.open(DepartamentoDialogComponent, {
      width: '500px',
      data: null
    });

    dialogRef.afterClosed().subscribe((result: DepartamentoRequest | null) => {
      if (result) {
        this.departamentosService.createDepartamento(result).subscribe(() => {
          this.loadDepartamentos();
        });
      }
    });
  }

  abrirDialogoEditarDepartamento(departamento: DepartamentoResponse) {
    const dialogRef = this.dialog.open(DepartamentoDialogComponent, {
      width: '500px',
      data: { departamento }
    });

    dialogRef.afterClosed().subscribe((result: DepartamentoRequest | null) => {
      if (result) {
        this.departamentosService.updateDepartamento(departamento.id_departamento!, result).subscribe(() => {
          this.loadDepartamentos();
        });
      }
    });
  }
}
