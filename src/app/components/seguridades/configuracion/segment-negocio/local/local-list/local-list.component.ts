import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LocalesResponse } from 'src/app/interfaces/responses/local-response';
import { LocalesService } from 'src/app/services/locales.service';
import { LocalFormComponent } from '../local-form/local-form.component';

@Component({
  selector: 'app-local-list',
  templateUrl: './local-list.component.html',
  styleUrls: ['./local-list.component.css']
})
export class LocalesListComponent implements OnInit {
  locales: LocalesResponse[] = [];
  localesFiltrados: LocalesResponse[] = [];
  searchTerm: string = '';

  constructor(
    private localesService: LocalesService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerLocales();
  }

  obtenerLocales(): void {
    this.localesService.getAll().subscribe({
      next: (resp) => {
        this.locales = resp.data;
        this.localesFiltrados = resp.data;
      },
      error: (err) => {
        console.error('Error al obtener locales:', err);
      }
    });
  }

    buscar(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.localesFiltrados = this.locales.filter(item =>
      item.nombre?.toLowerCase().includes(term) ||
      item.localRuc?.toLowerCase().includes(term) ||
      item.administrador?.toLowerCase().includes(term)
    );
  }

  abrirCrear(): void {
    const dialogRef = this.dialog.open(LocalFormComponent, {
      width: '700px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerLocales();
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(LocalFormComponent, {
      width: '700px',
      data: { id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerLocales();
    });
  }
}
