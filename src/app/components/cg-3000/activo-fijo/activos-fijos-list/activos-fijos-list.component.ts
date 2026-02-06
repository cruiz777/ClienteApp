import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { FormsModule } from '@angular/forms';

// Angular Material (si tu HTML usa mat-form-field, matInput, botones, iconos)
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// AG Grid Community
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions } from 'ag-grid-community';

// ✅ Servicio y DTO reales (según tu archivo actuales-fijos.service.ts)
import {
  ActivoFijoApiService,
  ActivoFijoDto
} from 'src/app/services/activos-fijos.service';

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

    AgGridAngular
  ],
  templateUrl: './activos-fijos-list.component.html',
  styleUrls: ['./activos-fijos-list.component.css']
})
export class ActivosFijosListComponent implements OnInit {
  // filtros
  q = '';

  // data
  rowData: ActivoFijoDto[] = [];

  // total (si tu HTML muestra total() con signal, cámbialo; aquí lo dejo simple)
  total = 0;

  // columnas AG Grid
  colDefs: ColDef<ActivoFijoDto>[] = [
    { headerName: 'Código', field: 'CodigoAf', width: 120 },
    { headerName: 'Descripción', field: 'Descripcion', flex: 1, minWidth: 240 },
    { headerName: 'Marca', field: 'Marca', width: 160 },
    { headerName: 'Estado', field: 'IdMarca', width: 120 },
    { headerName: 'Custodio', field: 'Custodio', width: 200 },
    { headerName: 'Ubicación', field: 'Ubicacion', width: 160 }
  ];

  gridOptions: GridOptions<ActivoFijoDto> = {
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true
    },
    rowSelection: 'single',
    animateRows: true,
    onRowDoubleClicked: (ev) => {
      const id = ev.data?.CodigoAf;
      if (id != null) this.editar(Number(id));
    }
  };

  constructor(
    private api: ActivoFijoApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    // ✅ si tienes endpoint paged aún no implementado, usa getAll()
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

    // Filtrado client-side (porque tu getAll trae todo)
    // Si implementas backend /paged, aquí reemplazas por api.getPaged(...)
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
      error: (err: unknown) => {
        console.error('Error buscando activos fijos', err);
      }
    });
  }

  nuevo(): void {
    // ✅ ajusta según tu routing real
    // Si tu ruta es dentro de cg-3000: /cg-3000/activo-fijo/nuevo
    // entonces cambia la línea
    this.router.navigate(['/cg-3000/activo-fijo/nuevo']);
  }

  editar(id: number): void {
    this.router.navigate(['/cg-3000/activo-fijo/editar', id]);
  }
}
