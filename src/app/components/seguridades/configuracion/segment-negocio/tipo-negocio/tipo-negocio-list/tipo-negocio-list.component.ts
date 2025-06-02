import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TipoNegocioResponse } from 'src/app/interfaces/responses/tipo-negocio-response';
import { TipoNegocioService } from 'src/app/services/tipo-negocio.service';
import { TipoNegocioFormComponent } from '../tipo-negocio-form/tipo-negocio-form.component';

@Component({
  selector: 'app-tipo-negocio-list',
  templateUrl: './tipo-negocio-list.component.html',
  styleUrls: ['./tipo-negocio-list.component.css']
})
export class TipoNegocioListComponent implements OnInit {
  tipoNegocios: TipoNegocioResponse[] = [];
  tipoNegociosFiltrados: TipoNegocioResponse[] = [];
  searchTerm: string = '';

  constructor(
    private tipoNegocioService: TipoNegocioService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerTipoNegocios();
  }

  obtenerTipoNegocios(): void {
    this.tipoNegocioService.getAll().subscribe({
      next: (resp) => {
        this.tipoNegocios = resp.data;
        this.tipoNegociosFiltrados = resp.data;
      },
      error: (err) => {
        console.error('Error al obtener los tipos de negocio:', err);
      }
    });
  }

  buscar(): void {
    const term = this.searchTerm.toLowerCase();
    this.tipoNegociosFiltrados = this.tipoNegocios.filter(t =>
      t.descripcion?.toLowerCase().includes(term)
    );
  }

  abrirCrear(): void {
    const dialogRef = this.dialog.open(TipoNegocioFormComponent, {
      width: '600px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.obtenerTipoNegocios();
      }
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(TipoNegocioFormComponent, {
      width: '600px',
      data: { id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.obtenerTipoNegocios();
      }
    });
  }
}
