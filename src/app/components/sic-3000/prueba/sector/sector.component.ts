import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SectoresService, Sector } from 'src/app/services/sectores.service';

@Component({
  selector: 'app-sector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sector.component.html',
  styleUrls: ['./sector.component.css']
})
export class SectorComponent implements OnInit {
    constructor(private svc:SectoresService
  ) {}

  sectores: Sector[] = [];
  filtro = '';
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = null;
    this.svc.getAll().subscribe({
      next: (list) => {
        this.sectores = list ?? [];
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.message ?? 'Error cargando sectores';
        this.loading = false;
      }
    });
  }

  get sectoresFiltrados(): Sector[] {
    const f = this.filtro.trim().toLowerCase();
    if (!f) return this.sectores;
    return this.sectores.filter(s =>
      s.descripcion?.toLowerCase().includes(f) || String(s.id).includes(f)
    );
  }

  trackById = (_: number, it: Sector) => it.id;
}
