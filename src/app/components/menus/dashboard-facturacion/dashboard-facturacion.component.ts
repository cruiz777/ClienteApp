import { Component, OnInit } from '@angular/core';
import {
  DashboardFacturacionService,
  DashboardMensual
} from 'src/app/services/dashboard-facturacion.service';

interface DashboardMes {
  mes: string;
  individual: number;
  industrial: number;
  total: number;
}

@Component({
  selector: 'app-dashboard-facturacion',
  templateUrl: './dashboard-facturacion.component.html',
  styleUrls: ['./dashboard-facturacion.component.css']
})
export class DashboardFacturacionComponent implements OnInit {
  anio = new Date().getFullYear();
  anioSeleccionado = new Date().getFullYear();

  loadingFacturacion = false;
  loadingPagos = false;

  facturacionMensual: DashboardMes[] = [];
  pagosMensual: DashboardMes[] = [];

  constructor(
    private dashboardService: DashboardFacturacionService
  ) {}

  ngOnInit(): void {
    this.cargarDashboard();
  }

  cargarDashboard(): void {
    const anio = Number(this.anioSeleccionado);

    if (!anio || anio < 2000 || anio > 2100) {
      console.error('Año inválido');
      return;
    }

    this.anio = anio;
    this.cargarFacturacion(anio);
    this.cargarPagos(anio);
  }

  private cargarFacturacion(anio: number): void {
    this.loadingFacturacion = true;

    this.dashboardService.getDashboardFacturacion(anio).subscribe({
      next: data => {
        this.anio = data.anio;

        this.facturacionMensual = data.meses.map((item: DashboardMensual) => ({
          mes: item.mes,
          individual: Number(item.individual ?? 0),
          industrial: Number(item.industrial ?? 0),
          total: Number(item.total ?? 0)
        }));

        this.loadingFacturacion = false;
      },
      error: err => {
        console.error('Error cargando dashboard de facturación:', err);
        this.facturacionMensual = [];
        this.loadingFacturacion = false;
      }
    });
  }

  private cargarPagos(anio: number): void {
    this.loadingPagos = true;

    this.dashboardService.getDashboardPagos(anio).subscribe({
      next: data => {
        this.pagosMensual = data.meses.map((item: DashboardMensual) => ({
          mes: item.mes,
          individual: Number(item.individual ?? 0),
          industrial: Number(item.industrial ?? 0),
          total: Number(item.total ?? 0)
        }));

        this.loadingPagos = false;
      },
      error: err => {
        console.error('Error cargando dashboard de pagos:', err);
        this.pagosMensual = [];
        this.loadingPagos = false;
      }
    });
  }

  get totalFacturacion(): number {
    return this.facturacionMensual.reduce((acc, item) => acc + item.total, 0);
  }

  get totalFacturacionIndividual(): number {
    return this.facturacionMensual.reduce((acc, item) => acc + item.individual, 0);
  }

  get totalFacturacionIndustrial(): number {
    return this.facturacionMensual.reduce((acc, item) => acc + item.industrial, 0);
  }

  get totalPagos(): number {
    return this.pagosMensual.reduce((acc, item) => acc + item.total, 0);
  }

  get totalPagosIndividual(): number {
    return this.pagosMensual.reduce((acc, item) => acc + item.individual, 0);
  }

  get totalPagosIndustrial(): number {
    return this.pagosMensual.reduce((acc, item) => acc + item.industrial, 0);
  }

  getMaxValor(data: DashboardMes[]): number {
    if (!data.length) return 0;

    return Math.max(
      ...data.map(x => Math.max(x.individual, x.industrial))
    );
  }

  getBarHeight(valor: number, data: DashboardMes[]): number {
    const max = this.getMaxValor(data);

    if (max === 0) return 0;

    return (valor / max) * 100;
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor ?? 0);
  }

  formatearMoneda(valor: number): string {
    return `${this.formatearNumero(valor)} US$`;
  }
}