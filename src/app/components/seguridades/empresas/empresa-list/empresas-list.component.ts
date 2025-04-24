import { Component, OnInit, ViewChild } from '@angular/core';
import { EmpresaService } from 'src/app/services/empresa.service';
import { EmpresaResponse } from 'src/app/interfaces/responses/empresa-response';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';

@Component({
  selector: 'app-empresa-list',
  templateUrl: './empresas-list.component.html',
  styleUrls: ['./empresas-list.component.css']
})
export class EmpresasListComponent implements OnInit {
  dataSource = new MatTableDataSource<EmpresaResponse>([]);
  displayedColumns: string[] = ['empresaRuc', 'empresaNombre', 'empresaDireccion', 'telefonos', 'empresaEmail', 'gerentes', 'contadores', 'status', 'acciones'];
  isLoading = false;
  errorMessage = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private empresaService: EmpresaService, private router: Router, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadEmpresas();
  }

  loadEmpresas() {
    this.isLoading = true;
    this.empresaService.getEmpresas().subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.dataSource.paginator = this.paginator;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Error al cargar las empresas.';
        this.isLoading = false;
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  editarEmpresa(id: number) {
    this.router.navigate(['/seguridades/empresas/editar', id]);
  }

  eliminarEmpresa(id: number) {
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: '¿Está seguro?',
        message: 'Esta acción eliminará la empresa seleccionada.',
        type: 'warning',
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.empresaService.softDeleteEmpresa(id).subscribe(() => this.loadEmpresas());
      }
    });
  }
}
