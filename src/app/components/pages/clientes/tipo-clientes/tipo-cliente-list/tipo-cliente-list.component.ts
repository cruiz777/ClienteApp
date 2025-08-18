import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TipoClienteResponse } from 'src/app/interfaces/responses/tipo-cliente-response';
import { TipoClienteService } from 'src/app/services/tipo-cliente.service';
import { MatPaginator, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-tipo-cliente',
  templateUrl: './tipo-cliente-list.component.html',
  styleUrls: ['./tipo-cliente-list.component.css']
})
export class TipoClienteListComponent implements OnInit {
  tipoClientes: TipoClienteResponse[] = [];
  filteredTipoClientes: TipoClienteResponse[] = [];
  paginatedTipoClientes: TipoClienteResponse[] = [];

  searchText: string = '';
  pageSize: number = 5;
  currentPage: number = 1;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private tipoClienteService: TipoClienteService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarTipoClientes();
  }

  cargarTipoClientes(): void {
    this.tipoClienteService.getResume().subscribe({
      next: (res) => {
        if (res.data && Array.isArray(res.data)) {
          this.tipoClientes = res.data;
          this.filteredTipoClientes = [...this.tipoClientes];
          this.setPaginatedData();
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar los tipos de cliente:', err);
      }
    });
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.filteredTipoClientes = this.tipoClientes.filter(tc =>
      tc.descripcion.toLowerCase().includes(value) ||
      tc.cuenta.toLowerCase().includes(value)
    );
    this.currentPage = 1;
    this.setPaginatedData();
  }

  handlePageEvent(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
    this.setPaginatedData();
  }

  setPaginatedData(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedTipoClientes = this.filteredTipoClientes.slice(startIndex, endIndex);
  }

  crearTipoCliente(): void {
    this.router.navigate(['/codbar/ficha-de-cliente/tipo-cliente/crear']);
  }

  editarTipoCliente(id: number): void {
    this.router.navigate(['/codbar/ficha-de-cliente/tipo-cliente/editar', id]);
  }
}
