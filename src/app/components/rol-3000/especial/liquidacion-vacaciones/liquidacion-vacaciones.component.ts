import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { EmpleadoBusquedaResponse, EmpleadoFichaService } from 'src/app/services/rol/empleado-ficha.service';
import { CalcularVacacionesRequest, LiquidacionVacaciones, LiquidacionVacacionesService, ProvisionVacaciones, SolicitudVacacionesPendiente } from 'src/app/services/rol/liquidacion-vacaciones.service';

interface Columna { campo: keyof ProvisionVacaciones; titulo: string; grupo?: string; dinero?: boolean; }

@Component({
  selector: 'app-liquidacion-vacaciones',
  templateUrl: './liquidacion-vacaciones.component.html',
  styleUrls: ['./liquidacion-vacaciones.component.css']
})
export class LiquidacionVacacionesComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly cancel$ = new Subject<void>();
  private operacionId = '';
  buscarEmpleado = new FormControl<string | EmpleadoBusquedaResponse>('');
  empleados: EmpleadoBusquedaResponse[] = [];
  datos: LiquidacionVacaciones | null = null;
  seleccionadas = new Set<number>();
  tipo = 'NOMINA';
  noValidarSolicitud = false;
  numeroLiquidacion = '';
  dias: number | null = null;
  fechaInicio = this.hoy();
  fechaLiquidacion = this.hoy();
  periodoDesde = '';
  periodoHasta = '';
  cargando = false;
  guardando = false;
  buscando = false;
  error = '';
  mensaje = '';
  calculado = false;
  readonly columnas: Columna[] = [
    { campo: 'periodo', titulo: 'Período' }, { campo: 'fecha', titulo: 'Fecha' },
    { campo: 'diasTrabajados', titulo: 'D. trabajados' }, { campo: 'ingresos', titulo: 'T. ingresos', dinero: true },
    { campo: 'diasNormales', titulo: 'D. normales', grupo: 'normales' }, { campo: 'valorNormal', titulo: 'Valor normal', grupo: 'normales', dinero: true },
    { campo: 'diasNormalesTomar', titulo: 'D. a tomar', grupo: 'normales' }, { campo: 'valorNormalTomar', titulo: 'Valor a tomar', grupo: 'normales', dinero: true },
    { campo: 'diasAdicionales', titulo: 'D. adicionales', grupo: 'adicionales' }, { campo: 'valorAdicional', titulo: 'Valor adicional', grupo: 'adicionales', dinero: true },
    { campo: 'diasAdicionalesTomar', titulo: 'D. a tomar', grupo: 'adicionales' }, { campo: 'valorAdicionalTomar', titulo: 'Valor a tomar', grupo: 'adicionales', dinero: true }
  ];

  constructor(private fichas: EmpleadoFichaService, private api: LiquidacionVacacionesService, private router: Router) {}

  ngOnInit(): void {
    this.buscarEmpleado.valueChanges.pipe(
      switchMap(value => {
        if (typeof value !== 'string') return of(null);
        this.limpiar();
        return of(value);
      }), debounceTime(300), distinctUntilChanged(),
      switchMap(texto => {
        this.buscando = !!texto && texto.trim().length >= 2;
        return this.buscando ? this.fichas.getBusqueda((texto as string).trim()).pipe(
          catchError(() => { this.error = 'No se pudo buscar empleados.'; return of(null); })
        ) : of(null);
      }), takeUntil(this.destroy$)
    ).subscribe(res => { this.empleados = res?.data ?? []; this.buscando = false; });
  }

  mostrarEmpleado = (value: EmpleadoBusquedaResponse | string | null): string =>
    typeof value === 'string' ? value : value ? `${value.idEmpleado} — ${value.nombreCompleto}` : '';

  seleccionar(item: EmpleadoBusquedaResponse): void {
    this.limpiar(); this.cargando = true;
    this.api.consultar(item.idEmpleado, this.fechaLiquidacion).pipe(takeUntil(this.cancel$), takeUntil(this.destroy$), finalize(() => this.cargando = false)).subscribe({
      next: datos => { this.datos = datos; this.empleados = []; }, error: e => this.mostrarError(e)
    });
  }

  get empleado() { return this.datos?.empleado ?? null; }
  get guardado(): boolean { return !!this.datos?.idLiquidacion; }
  get solicitudes() { return this.datos?.solicitudesPendientes ?? []; }
  get provisiones() { return this.datos?.provisiones ?? []; }
  get normales(): number { return this.datos?.diasNormales ?? 0; }
  get adicionales(): number { return this.datos?.diasAdicionales ?? 0; }
  get disponibles(): number { return this.datos?.diasDisponibles ?? 0; }
  get saldoDias(): number { return this.calculado ? this.datos?.saldoDias ?? 0 : this.disponibles; }
  get validarSolicitud(): boolean { return this.tipo === 'NOMINA' && !this.noValidarSolicitud; }
  get diasSeleccionados(): number { return Math.round(this.solicitudes.filter(s => this.seleccionadas.has(s.idSolicitud)).reduce((sum, s) => sum + s.dias, 0) * 10000) / 10000; }
  valor(p: ProvisionVacaciones, c: Columna): string {
    if (c.campo === 'fecha') return p.fecha.slice(0, 7).split('-').reverse().join('/');
    const valor = p[c.campo];
    return typeof valor === 'number' ? valor.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: c.dinero ? 2 : 4 }) : valor;
  }
  total(c: Columna): string {
    if (c.campo === 'periodo') return 'TOTALES';
    if (c.campo === 'fecha') return '';
    return this.provisiones.reduce((sum, p) => sum + Number(p[c.campo] || 0), 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: c.dinero ? 2 : 4 });
  }

  invalidar(): void {
    this.calculado = false; this.operacionId = ''; this.error = ''; this.mensaje = '';
    this.provisiones.forEach(p => { p.diasNormalesTomar = p.diasAdicionalesTomar = p.valorNormalTomar = p.valorAdicionalTomar = 0; });
  }
  cambiarTipo(): void { this.invalidar(); this.seleccionadas.clear(); this.dias = this.tipo === 'ADICIONALES' ? this.adicionales : null; }
  cambiarValidacion(): void { this.invalidar(); this.seleccionadas.clear(); this.dias = null; }
  seleccionarSolicitud(s: SolicitudVacacionesPendiente, checked: boolean): void {
    this.invalidar();
    if (checked) this.seleccionadas.add(s.idSolicitud); else this.seleccionadas.delete(s.idSolicitud);
    this.dias = this.diasSeleccionados;
    const fechas = this.solicitudes.filter(s => this.seleccionadas.has(s.idSolicitud)).map(s => s.fechaDesde).sort();
    if (fechas.length) this.fechaInicio = fechas[0];
  }

  private request(): CalcularVacacionesRequest {
    return { idEmpleado: this.empleado!.idEmpleado, tipo: this.tipo, dias: Number(this.dias), fechaLiquidacion: this.fechaLiquidacion,
      fechaInicio: this.tipo === 'NOMINA' ? this.fechaInicio || null : null,
      periodoDesde: this.periodoDesde || null, periodoHasta: this.periodoHasta || null,
      noValidarSolicitud: this.noValidarSolicitud, solicitudes: this.validarSolicitud ? [...this.seleccionadas] : [] };
  }

  calcular(): void {
    if (!this.empleado || this.cargando || this.guardado) return;
    this.invalidar(); this.cargando = true;
    this.api.calcular(this.request()).pipe(takeUntil(this.cancel$), takeUntil(this.destroy$), finalize(() => this.cargando = false)).subscribe({
      next: datos => { this.datos = datos; this.calculado = true; this.operacionId = crypto.randomUUID(); this.mensaje = 'Cálculo realizado. Revise los días y valores antes de guardar.'; },
      error: e => this.mostrarError(e)
    });
  }

  guardar(): void {
    if (!this.calculado || !this.datos || this.guardado || this.cargando) return;
    this.cargando = this.guardando = true; this.error = ''; this.mensaje = '';
    // Conservar el mismo identificador si falla la red: el servidor responde sin duplicar.
    this.api.guardar(this.datos.solicitud, this.datos.revision, this.operacionId).pipe(takeUntil(this.destroy$), finalize(() => { this.cargando = this.guardando = false; })).subscribe({
      next: datos => { this.datos = datos; this.numeroLiquidacion = String(datos.idLiquidacion); this.mensaje = `Liquidación ${datos.idLiquidacion} guardada correctamente.`; },
      error: e => this.mostrarError(e)
    });
  }

  buscarLiquidacion(): void {
    const id = Number(this.numeroLiquidacion);
    if (!Number.isSafeInteger(id) || id <= 0) { this.error = 'Ingrese un número de liquidación válido.'; return; }
    this.cancel$.next(); this.cargando = true; this.error = ''; this.mensaje = '';
    this.api.obtener(id).pipe(takeUntil(this.cancel$), takeUntil(this.destroy$), finalize(() => this.cargando = false)).subscribe({
      next: datos => {
        this.datos = datos; const s = datos.solicitud;
        this.tipo = s.tipo; this.dias = s.dias; this.fechaInicio = s.fechaInicio ?? ''; this.fechaLiquidacion = s.fechaLiquidacion;
        this.periodoDesde = s.periodoDesde ?? ''; this.periodoHasta = s.periodoHasta ?? ''; this.noValidarSolicitud = s.noValidarSolicitud;
        this.seleccionadas = new Set(s.solicitudes); this.calculado = true; this.operacionId = ''; this.empleados = [];
        this.buscarEmpleado.setValue(`${datos.empleado.idEmpleado} — ${datos.empleado.nombreCompleto}`, { emitEvent: false });
        this.mensaje = `Liquidación ${datos.idLiquidacion} consultada.`;
      }, error: e => this.mostrarError(e)
    });
  }

  imprimir(): void {
    if (!this.datos?.idLiquidacion || this.cargando) return;
    const id = this.datos.idLiquidacion; this.cargando = true;
    this.api.pdf(id).pipe(takeUntil(this.destroy$), finalize(() => this.cargando = false)).subscribe({
      next: blob => { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `Liquidacion_vacaciones_${id}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); },
      error: () => this.error = 'No se pudo descargar el comprobante.'
    });
  }

  cancelar(): void { if (this.guardando) return; this.buscarEmpleado.setValue('', { emitEvent: false }); this.limpiar(); this.tipo = 'NOMINA'; this.noValidarSolicitud = false; this.fechaInicio = this.hoy(); this.fechaLiquidacion = this.hoy(); this.numeroLiquidacion = ''; }
  salir(): void { if (!this.guardando) void this.router.navigate(['/rol-3000/inicio-rol']); }
  private limpiar(): void { this.cancel$.next(); this.datos = null; this.empleados = []; this.seleccionadas.clear(); this.dias = null; this.periodoDesde = ''; this.periodoHasta = ''; this.numeroLiquidacion = ''; this.invalidar(); }
  private mostrarError(e: HttpErrorResponse): void { this.error = e.error?.message ?? 'No se pudo completar la operación. Revise la conexión y que el script SQL esté instalado.'; }
  private hoy(): string { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  ngOnDestroy(): void { this.cancel$.next(); this.cancel$.complete(); this.destroy$.next(); this.destroy$.complete(); }
}
