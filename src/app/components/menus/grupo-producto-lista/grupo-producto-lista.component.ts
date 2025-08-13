import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource } from '@angular/material/table';
import { GrupoProductoNService, GrupoProductoRequest } from 'src/app/services/grupo-producto-n.service';
import { DialogGrupoProductoNComponent } from '../dialog-grupo-producto-n/dialog-grupo-producto-n.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ExportService } from 'src/app/services/export.service';
import { ExportOptions } from 'src/app/interfaces/export-options';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
@Component({
  selector: 'app-grupo-producto-lista',
  standalone: true,
  templateUrl: './grupo-producto-lista.component.html',
  styleUrl: './grupo-producto-lista.component.css',
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    DialogGrupoProductoNComponent,
    MatMenuModule
  ]
})
export class GrupoProductoListaComponent implements OnInit {
  displayedColumns: string[] = ['index', 'codigo', 'brick', 'descripcion', 'estado', 'opcion','borrar'];
  dataSource = new MatTableDataSource<GrupoProductoRequest>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
    logoUrl: string = '';
  constructor(
    private grupoProductoService: GrupoProductoNService,
    private dialog: MatDialog,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
    private _snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.grupoProductoService.getAll().subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.dataSource.paginator = this.paginator;
      },
      error: (err) => {
        console.error('❌ Error al cargar grupo productos:', err);
      }
    });
  }

  aplicarFiltro(event: Event): void {
    const filtro = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filtro.trim().toLowerCase();
  }

  nuevo(): void {
    const dialogRef = this.dialog.open(DialogGrupoProductoNComponent, {
      width: '900px',
      data: null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.cargarDatos();
    });
  }

  editar(item: GrupoProductoRequest): void {
    const dialogRef = this.dialog.open(DialogGrupoProductoNComponent, {
      width: '900px',
      data: item // 👉 Se pasa el objeto a editar
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.cargarDatos();
    });
  }
  irPrimeraPagina(): void {
  this.paginator.firstPage();
}

irUltimaPagina(): void {
  const totalPages = Math.ceil(this.dataSource.data.length / this.paginator.pageSize);
  this.paginator.pageIndex = totalPages - 1;
  this.paginator._changePageSize(this.paginator.pageSize); // Forzar recarga
}

esUltimaPagina(): boolean {
  return this.paginator
    ? this.paginator.pageIndex >= Math.ceil(this.dataSource.data.length / this.paginator.pageSize) - 1
    : true;
}
exportar(tipo: 'excel' | 'pdf'): void {
    const headers = ['Código', 'Brick', 'Descripción', 'Estado'];
    const columns = ['codigo', 'brick', 'descripcion', 'estado'];

    const data = this.dataSource.filteredData.map(item => ({
      codigo: item.codigo,
      brick: item.brick,
      descripcion: item.descripcion,
      estado: item.estado ? 'ACTIVO' : 'INACTIVO'
    }));

    const options: ExportOptions = {
      data,
      columns,
      headers,
      filename: 'ListadoGrupoProducto',
      title: 'Listado de Grupo de Productos',
      logoUrl: this.logoUrl
    };

    if (tipo === 'excel') {
      this.exportService.exportarExcel(options);
    } else {
      this.exportService.exportarPDF(options);
    }
  }
borrar(item: GrupoProductoRequest): void {
  if (!item.id_grupo_producto || item.id_grupo_producto === 0) {
    this.snackBar.open('ID inválido para eliminación', 'Cerrar', { duration: 3000 });
    return;
  }

  const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
    width: '400px',
    data: {
      title: '¿Desea confirmar?',
      message: `¿Está seguro que desea eliminar el grupo "${item.descripcion}"?`,
      type: 'info',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      showCancel: true
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result === true) {
      this.grupoProductoService.delete(item.id_grupo_producto).subscribe({
        next: (res) => {
          if (res.data === true || res.type === 'OK') {
            this.mostrarAlerta('Grupo eliminado correctamente', 'Información');
            this.cargarDatos();
          } else {
            this.mostrarAlerta('⚠️ No se pudo eliminar', 'Advertencia');
          }
        },
        error: (err) => {
          this.snackBar.open('Error al eliminar el grupo', 'Cerrar', { duration: 4000 });
          console.error(err);
        }
      });
    }
  });
}


 mostrarAlerta(mensaje: string, tipo: string) {
    this._snackBar.open(mensaje, tipo, {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3000
    });
  }


}



