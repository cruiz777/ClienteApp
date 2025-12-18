import { Component } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BalanceService, ApiResponse } from 'src/app/services/balance.service';
import { BalanceDiarioResponse } from 'src/app/interfaces/responses/balance-diario-response';

@Component({
  selector: 'app-balance',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, CurrencyPipe],
  templateUrl: './balance-comprobacion-list.component.html',
  styleUrl: './balance-comprobacion-list.component.css'
})
export class BalanceComponent {

  // ============================================================
  // INYECCIÓN DE SERVICIOS
  // ============================================================
  constructor(private balanceService: BalanceService) {}

  // ============================================================
  // ESTADO DE UI
  // ============================================================
  loading = false;
  expandedId: number | null = null;

  // ============================================================
  // CABECERA
  // ============================================================
  cabecera = {
    empresa: 'GAP SYSTEM S.A.',
    periodo: new Date().getFullYear().toString(),
    fechaCorte: new Date()
  };

  // ============================================================
  // FILTROS
  // ============================================================
  modoFiltro: 'fecha' | 'cuenta' = 'fecha';

  fechaDesde: string = this.hoyISO();
  fechaHasta: string = this.hoyISO();

  cuentaDesde: string = '';
  cuentaHasta: string = '';

  // ============================================================
  // DATASET PRINCIPAL
  // ============================================================
  balances: BalanceDiarioResponse[] = [];

  // ============================================================
  // ACCIONES
  // ============================================================
  refrescar(): void {
    this.loading = true;
    this.expandedId = null;

    if (this.modoFiltro === 'fecha') {
      const d1 = this.fechaDesde;
      const d2 = this.fechaHasta;

      if (!d1 || !d2) {
        console.warn('Fechas inválidas');
        this.loading = false;
        return;
      }

      if (d2 < d1) {
        console.warn('La Fecha Final no puede ser menor a la Fecha Inicial');
        this.loading = false;
        return;
      }

      this.cargarPorFechas(d1, d2);
      return;
    }

    if (this.modoFiltro === 'cuenta') {
      const cd = (this.cuentaDesde ?? '').trim();
      const ch = (this.cuentaHasta ?? '').trim();

      if (!cd || !ch) {
        console.warn('Debe ingresar Cuenta Inicial y Cuenta Final');
        this.loading = false;
        return;
      }

      if (ch < cd) {
        console.warn('La Cuenta Final no puede ser menor a la Cuenta Inicial');
        this.loading = false;
        return;
      }

      const d1 = this.fechaDesde;
      const d2 = this.fechaHasta;

      const svc: any = this.balanceService as any;

      const metodoBackend =
        svc.getByRangoCuentas?.bind(svc) ??
        svc.getBalanceByCuenta?.bind(svc) ??
        svc.getByCondicionBalanceCuenta?.bind(svc);

      if (metodoBackend) {
        const obs$ = metodoBackend.length >= 4
          ? metodoBackend(cd, ch, d1, d2)
          : metodoBackend(cd, ch);

        obs$.subscribe({
          next: (resp: ApiResponse<BalanceDiarioResponse[]>) => {
            const data = resp?.data ?? [];
            this.balances = data;
            this.loading = false;
          },
          error: (err: any) => {
            console.error('Error al cargar por cuentas', err);
            this.balances = [];
            this.loading = false;
          }
        });

        return;
      }

      if (!d1 || !d2) {
        console.warn('Para filtrar por Cuenta sin endpoint, ingresa también un rango de fechas válido.');
        this.loading = false;
        return;
      }

      this.cargarPorFechas(d1, d2, cd, ch);
      return;
    }

    this.loading = false;
  }

  exportar(): void {
    // TODO
  }

  salir(): void {
    window.history.back();
  }

  // ============================================================
  // EXPAND / COLLAPSE
  // ============================================================
  toggleDetalle(id?: number): void {
    if (id == null) return;
    this.expandedId = (this.expandedId === id) ? null : id;
  }

  trackByIndex = (_: number, row: BalanceDiarioResponse) => row.documento;

  // ============================================================
  // CARGAS
  // ============================================================
  private cargarPorFechas(d1: string, d2: string, cd?: string, ch?: string): void {
    this.balanceService.getByCondicionBalanceDiario(d1, d2).subscribe({
      next: (resp: ApiResponse<BalanceDiarioResponse[]>) => {

        // SIEMPRE tomar data; tu backend devuelve type="Consulta exitosa"
        const baseData = resp?.data ?? [];

        // Si estamos filtrando por cuenta sin endpoint, filtramos en frontend
        const finalData = (cd && ch)
          ? this.filtrarPorCuentaEnFrontend(baseData, cd, ch)
          : baseData;

        this.balances = finalData;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar balances', err);
        this.balances = [];
        this.loading = false;
      }
    });
  }

  private filtrarPorCuentaEnFrontend(
    data: BalanceDiarioResponse[],
    cuentaDesde: string,
    cuentaHasta: string
  ): BalanceDiarioResponse[] {
    const cd = cuentaDesde.trim();
    const ch = cuentaHasta.trim();

    return (data ?? []).filter(x => {
      const cta = ((x as any).cuenta ?? '').toString().trim();
      if (!cta) return false;
      return cta >= cd && cta <= ch;
    });
  }

  // ============================================================
  // HELPERS (FECHAS)
  // ============================================================
  private hoyISO(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private parseISODate(value: string | null): Date | null {
    if (!value) return null;
    const d = new Date(value + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }
}
