import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { BalanceService, ApiResponse } from 'src/app/services/balance.service';

import { BalanceComprobacionRequest } from 'src/app/interfaces/requests/balance-comprobacion-request';

import { BalanceComprobacionResponse } from 'src/app/interfaces/responses/balance-comprobacion-response';


@Component({
  selector: 'app-balance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './balance-comprobacion-list.component.html',
  styleUrl: './balance-comprobacion-list.component.css'
})

export class BalanceComprobacionComponent implements OnInit {

  // Filtros iniciales
  filtros: BalanceComprobacionRequest = {
    fechaDesde: '',
    fechaHasta: '',
    cuentaA: undefined,
    cuentaB: undefined,
    idLocal: undefined,
    idZona: undefined
  };

  modoFiltro: 'cuenta' | null = null;
  loading = false;

  resultados: BalanceComprobacionResponse[] = [];
  agrupado: any[] = [];
  pagedData: any[] = [];

  // Combos de Local y Zona
  locales: { id: number, nombre: string }[] = [];
  zonas: { id: number, nombre: string }[] = [];

  // Paginación
  pageSizeOptions = [10, 25, 50, 100];
  pageSize = 25;
  pageIndex = 0;
  totalRows = 0;
  totalPages = 0;
  fromRow = 0;
  toRow = 0;

  constructor(private balanceService: BalanceService) { }

  ngOnInit(): void {
    this.locales = [];
    this.zonas = [];
  }

  toggleModoCuenta(): void {
    this.modoFiltro = this.modoFiltro === 'cuenta' ? null : 'cuenta';
  }

  consultar(): void {
    if (!this.filtros.fechaDesde || !this.filtros.fechaHasta) {
      return; // fechas obligatorias
    }

    this.loading = true;
    this.balanceService.getByCondicionBalanceComprobacion(this.filtros).subscribe({
      next: (resp) => {
        this.resultados = resp.data;
        this.agrupado = this.agruparPorRaiz(this.resultados);
        this.totalRows = this.agrupado.length;
        this.totalPages = Math.ceil(this.totalRows / this.pageSize);
        this.pageIndex = 0;
        this.updatePagedData();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // Agrupación jerárquica: Raíz → Padre → Hijos
  agruparPorRaiz(data: BalanceComprobacionResponse[]) {
    const raizMap: any = {};

    data.forEach(item => {
      if (!raizMap[item.cuentaRaiz]) {
        raizMap[item.cuentaRaiz] = {
          cuentaRaiz: item.cuentaRaiz,
          nombreRaiz: item.nombreRaiz,
          hijos: {}
        };
      }

      if (!raizMap[item.cuentaRaiz].hijos[item.cuentaPadre]) {
        raizMap[item.cuentaRaiz].hijos[item.cuentaPadre] = {
          cuentaPadre: item.cuentaPadre,
          nombrePadre: item.nombrePadre,
          hijos: []
        };
      }

      raizMap[item.cuentaRaiz].hijos[item.cuentaPadre].hijos.push(item);
    });

    return Object.values(raizMap).map((raiz: any) => ({
      ...raiz,
      hijos: Object.values(raiz.hijos)
    }));
  }

  // Actualiza los datos de la página actual
  updatePagedData(): void {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.pagedData = this.agrupado.slice(start, end);

    this.fromRow = this.totalRows === 0 ? 0 : start + 1;
    this.toRow = Math.min(end, this.totalRows);
  }

  // Cambiar tamaño de página
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.totalPages = Math.ceil(this.totalRows / this.pageSize);
    this.pageIndex = 0;
    this.updatePagedData();
  }

  // Navegación
  get canPrev(): boolean {
    return this.pageIndex > 0;
  }

  get canNext(): boolean {
    return this.pageIndex < this.totalPages - 1;
  }

  firstPage(): void {
    if (this.canPrev) {
      this.pageIndex = 0;
      this.updatePagedData();
    }
  }

  prevPage(): void {
    if (this.canPrev) {
      this.pageIndex--;
      this.updatePagedData();
    }
  }

  nextPage(): void {
    if (this.canNext) {
      this.pageIndex++;
      this.updatePagedData();
    }
  }

  lastPage(): void {
    if (this.canNext) {
      this.pageIndex = this.totalPages - 1;
      this.updatePagedData();
    }
  }

  // Acciones de exportación (placeholders)
  exportExcel(): void {
    console.log('Exportar a Excel');
  }

  exportPdf(): void {
    console.log('Exportar a PDF');
  }
}

