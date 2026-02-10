import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions } from 'ag-grid-community';

import { ActivoFijoApiService, ActivoFijoDto } from 'src/app/services/activos-fijos.service';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';

@Component({
  selector: 'app-activos-fijos-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,

    AgGridAngular
  ],
  templateUrl: './activos-fijos-list.component.html',
  styleUrls: ['./activos-fijos-list.component.css']
})
export class ActivosFijosListComponent implements OnInit {
  q = '';
  rowData: ActivoFijoDto[] = [];
  total = 0;

  // ✅ columnas con acciones
  colDefs: ColDef<ActivoFijoDto>[] = [
    { headerName: 'Código', field: 'CodigoAf', width: 110 },
    { headerName: 'Descripción', field: 'Descripcion', width: 380 },
    { headerName: 'Marca', field: 'Marca', width: 150 },
    { headerName: 'Estado', field: 'IdMarca', width: 110 },
    { headerName: 'Custodio', field: 'Custodio', width: 180 },
    { headerName: 'Ubicación', field: 'Ubicacion',flex:1, width: 140 },

    // ✅ Editar (icono)
    {
      headerName: '',
      width: 70,
      pinned: 'right',
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: any) => {
        const btn = document.createElement('button');
        btn.className = 'afl-icon-btn edit';
        btn.type = 'button';
        btn.title = 'Editar';
        btn.innerHTML = `<span class="material-icons">edit</span>`;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = params.data?.CodigoAf;
          if (id != null) this.editar(Number(id));
        });
        return btn;
      }
    },

    // ✅ Eliminar (icono)
    {
      headerName: '',
      width: 70,
      pinned: 'right',
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: any) => {
        const btn = document.createElement('button');
        btn.className = 'afl-icon-btn delete';
        btn.type = 'button';
        btn.title = 'Eliminar';
        btn.innerHTML = `<span class="material-icons">delete</span>`;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = params.data?.CodigoAf;
          if (id != null) this.confirmarEliminar(Number(id));
        });
        return btn;
      }
    }
  ];

  // ✅ quitado el doble click
  gridOptions: GridOptions<ActivoFijoDto> = {
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true
    },
    rowSelection: 'single',
    animateRows: true,
    rowHeight: 44,

  // (opcional) mejora el header
  headerHeight: 38
  };

  constructor(
    private api: ActivoFijoApiService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.api.getAll().subscribe({
      next: (r: ActivoFijoDto[]) => {
        this.rowData = r ?? [];
        this.total = this.rowData.length;
      },
      error: (err: unknown) => {
        console.error('Error cargando activos fijos', err);
        this.rowData = [];
        this.total = 0;
      }
    });
  }

  buscar(): void {
    const q = (this.q ?? '').trim().toLowerCase();
    if (!q) {
      this.cargar();
      return;
    }

    this.api.getAll().subscribe({
      next: (r: ActivoFijoDto[]) => {
        const all = r ?? [];
        this.rowData = all.filter(x =>
          String(x.CodigoAf ?? '').toLowerCase().includes(q) ||
          String(x.Codigobarra ?? '').toLowerCase().includes(q) ||
          String(x.Descripcion ?? '').toLowerCase().includes(q) ||
          String(x.Custodio ?? '').toLowerCase().includes(q) ||
          String(x.Ubicacion ?? '').toLowerCase().includes(q)
        );
        this.total = this.rowData.length;
      },
      error: (err: unknown) => console.error('Error buscando activos fijos', err)
    });
  }

  nuevo(): void {
    this.router.navigate(['/cg-3000/activo-fijo/nuevo']);
  }

  editar(id: number): void {
    this.router.navigate(['/cg-3000/activo-fijo/editar', id]);
  }

  private confirmarEliminar(id: number): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '420px',
      data: {
        title: 'Confirmación',
        message: `¿Está seguro de eliminar el activo fijo #${id}?`,
        type: 'warning',
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    }).afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.eliminar(id);
    });
  }

  private eliminar(id: number): void {
    // ✅ ajusta si tu método se llama distinto:
    // this.api.delete(id) / this.api.remove(id) / this.api.eliminar(id)
    this.api.delete(id).subscribe({
      next: () => this.cargar(),
      error: (err: any) => console.error('Error eliminando activo fijo', err)
    });
  }
}
