import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CentroCostosService } from 'src/app/services/centro-costos.service';
import { CentroCostosResponse } from 'src/app/interfaces/responses/centro-costos-response';
import { CentroCostosFormComponent } from '../centro-costos-form/centro-costos-form.component';


@Component({
  selector: 'app-centro-costos-list',
  templateUrl: './centro-costos-list.component.html',
  styleUrls: ['./centro-costos-list.component.css']
})
export class CentroCostosListComponent implements OnInit {
  centroCostos: CentroCostosResponse[] = [];
  centroCostosFiltrados: CentroCostosResponse[] = [];
  searchTerm: string = '';

  constructor(
    private centroCostosService: CentroCostosService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerCentroCostos();
  }

  obtenerCentroCostos(): void {
    this.centroCostosService.getAll().subscribe({
      next: (resp) => {
        this.centroCostos = resp.data;
        this.centroCostosFiltrados = resp.data;
      },
      error: (err) => {
        console.error('Error al obtener centros de costos:', err);
      }
    });
  }

  buscar(): void {
    const term = this.searchTerm.toLowerCase();
    this.centroCostosFiltrados = this.centroCostos.filter(c =>
      c.descripcion?.toLowerCase().includes(term)
    );
  }

  abrirCrear(): void {
    console.log('✅ abrirCrear ejecutado');
    const dialogRef = this.dialog.open(CentroCostosFormComponent, {
        width: '600px',
        data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
        if (result) this.obtenerCentroCostos();
    });
  }


  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(CentroCostosFormComponent, {
      width: '600px',
      data: { id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerCentroCostos();
    });
  }
}
