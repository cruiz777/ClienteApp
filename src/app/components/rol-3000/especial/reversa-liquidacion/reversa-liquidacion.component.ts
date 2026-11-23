import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { ReversaLiquidacionService, FilaReversaLiquidacion } from 'src/app/services/rol/reversa-liquidacion.service';
import { MessageBoxService } from 'src/app/components/utils/messages/message-box.service';

@Component({ selector: 'app-reversa-liquidacion', templateUrl: './reversa-liquidacion.component.html', styleUrls: ['./reversa-liquidacion.component.css'] })
export class ReversaLiquidacionComponent implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly cancelarConsulta$ = new Subject<void>();
  private operacionId = '';
  desde = this.hoy(); hasta = this.hoy();
  registros: FilaReversaLiquidacion[] = [];
  seleccionada: FilaReversaLiquidacion | null = null;
  pagina = 1; tamano = 25; total = 0;
  motivo = ''; error = ''; mensaje = '';
  consultando = false; confirmando = false; reversando = false;
  get ocupado(): boolean { return this.consultando || this.confirmando || this.reversando; }
  get paginas(): number { return Math.max(1, Math.ceil(this.total / this.tamano)); }
  constructor(private api: ReversaLiquidacionService, private mensajes: MessageBoxService, private router: Router) {}

  cambiarFechas(): void { this.cancelarConsulta$.next(); this.registros = []; this.total = 0; this.seleccionada = null; this.operacionId = ''; this.error = ''; this.mensaje = ''; }
  consultar(pagina = 1, conservarMensaje = false): void {
    if (this.reversando || this.confirmando) return;
    this.cambiarFechasSinMensaje(); this.error = ''; if (!conservarMensaje) this.mensaje = '';
    if (!this.desde || !this.hasta || this.desde > this.hasta) { this.error = 'Ingrese las fechas inicial y final; la fecha final debe ser mayor o igual a la inicial.'; return; }
    this.pagina = pagina; this.consultando = true;
    this.api.listar(this.desde, this.hasta, pagina, this.tamano).pipe(takeUntil(this.cancelarConsulta$), takeUntil(this.destroy$), finalize(() => this.consultando = false)).subscribe({
      next: r => { this.registros = r.registros; this.total = r.total; },
      error: e => this.error = e.error?.message ?? 'No se pudieron consultar las liquidaciones.'
    });
  }
  seleccionar(fila: FilaReversaLiquidacion): void { if (this.ocupado) return; this.seleccionada = fila; this.operacionId = ''; this.error = ''; }
  grabar(): void {
    if (this.ocupado) return;
    const fila = this.seleccionada;
    if (!fila) { this.error = 'Seleccione una liquidación a la vez.'; return; }
    if (!this.motivo.trim() || this.motivo.trim().length > 500) { this.error = 'Ingrese el motivo de la reversa, hasta 500 caracteres.'; return; }
    this.confirmando = true;
    this.mensajes.confirm(`¿Reversar la liquidación N.º ${fila.numero} de ${fila.nombreCompleto}? Se restaurarán las provisiones vinculadas y la fecha de salida. El documento quedará anulado en el historial.`, { title: 'Reversa de liquidación', confirmText: 'Sí, reversar', cancelText: 'Cancelar' })
      .pipe(takeUntil(this.destroy$)).subscribe(confirmado => {
        this.confirmando = false;
        if (!confirmado) return;
        this.operacionId ||= crypto.randomUUID(); this.reversando = true; this.error = '';
        this.api.reversar(fila, this.motivo.trim(), this.operacionId).pipe(takeUntil(this.destroy$), finalize(() => this.reversando = false)).subscribe({
          next: r => {
            this.reversando = false;
            this.mensaje = `Liquidación ${r.numeroLiquidacion} reversada. ${r.provisionesRestauradas} provisiones restauradas. El documento permanece anulado en Reimpresión Liquidación.`;
            this.motivo = ''; this.consultar(1, true);
          }, error: e => this.error = e.error?.message ?? 'No se completó la reversa. Puede volver a intentarlo sin duplicar la operación.'
        });
      });
  }
  cancelar(): void { if (this.reversando || this.confirmando) return; this.desde = this.hoy(); this.hasta = this.hoy(); this.pagina = 1; this.motivo = ''; this.cambiarFechas(); }
  salir(): void { if (!this.reversando && !this.confirmando) void this.router.navigate(['/rol-3000/inicio-rol']); }
  private cambiarFechasSinMensaje(): void { this.cancelarConsulta$.next(); this.registros = []; this.total = 0; this.seleccionada = null; this.operacionId = ''; }
  private hoy(): string { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  ngOnDestroy(): void { this.cancelarConsulta$.next(); this.cancelarConsulta$.complete(); this.destroy$.next(); this.destroy$.complete(); }
}
