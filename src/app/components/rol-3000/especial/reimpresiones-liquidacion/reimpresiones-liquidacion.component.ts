import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { PDFDocument } from 'pdf-lib';
import { DocumentosLiquidacionService, FilaReimpresion } from 'src/app/services/rol/documentos-liquidacion.service';
import { EmpleadoBusquedaResponse, EmpleadoFichaService } from 'src/app/services/rol/empleado-ficha.service';

@Component({ selector: 'app-reimpresiones-liquidacion', templateUrl: './reimpresiones-liquidacion.component.html', styleUrls: ['./reimpresiones-liquidacion.component.css'] })
export class ReimpresionesLiquidacionComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly consulta$ = new Subject<void>();
  vacaciones = false;
  empleado = new FormControl<string | EmpleadoBusquedaResponse>('');
  empleados: EmpleadoBusquedaResponse[] = [];
  idEmpleado: number | undefined;
  desde = ''; hasta = ''; pagina = 1; tamano = 25; total = 0;
  registros: FilaReimpresion[] = [];
  seleccionadas = new Set<number>();
  cargando = false; imprimiendo = false; error = '';
  get titulo(): string { return this.vacaciones ? 'Reimpresión de vacaciones' : 'Reimpresión de liquidaciones'; }
  get paginas(): number { return Math.max(1, Math.ceil(this.total / this.tamano)); }
  constructor(private api: DocumentosLiquidacionService, private fichas: EmpleadoFichaService, private route: ActivatedRoute, private router: Router) {}
  ngOnInit(): void {
    this.empleado.valueChanges.pipe(debounceTime(300), switchMap(v => {
      if (typeof v !== 'string') return of(null);
      this.idEmpleado = undefined; this.invalidar();
      return v.trim().length >= 2 ? this.fichas.getBusqueda(v.trim()).pipe(catchError(() => { this.error = 'No se pudo buscar empleados.'; return of(null); })) : of(null);
    }), takeUntil(this.destroy$)).subscribe(r => this.empleados = r?.data ?? []);
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe(data => { this.vacaciones = data['vacaciones'] === true; this.cancelar(); });
  }
  mostrarEmpleado = (e: EmpleadoBusquedaResponse | string | null): string => typeof e === 'string' ? e : e ? `${e.idEmpleado} — ${e.nombreCompleto}` : '';
  seleccionarEmpleado(e: EmpleadoBusquedaResponse): void { this.idEmpleado = e.idEmpleado; this.consultar(); }
  invalidar(): void { this.consulta$.next(); this.registros = []; this.total = 0; this.seleccionadas.clear(); }
  consultar(pagina = 1): void {
    this.invalidar(); this.error = '';
    if (this.desde && this.hasta && this.desde > this.hasta) { this.error = 'La fecha desde no puede ser posterior a hasta.'; return; }
    if (typeof this.empleado.value === 'string' && this.empleado.value.trim() && !this.idEmpleado) { this.error = 'Seleccione un empleado de la lista o vacíe el filtro para consultar todos.'; return; }
    this.pagina = pagina; this.cargando = true;
    this.api.listar(this.vacaciones, { idEmpleado: this.idEmpleado, desde: this.desde, hasta: this.hasta, pagina, tamano: this.tamano }).pipe(takeUntil(this.consulta$), takeUntil(this.destroy$), finalize(() => this.cargando = false)).subscribe({
      next: r => { this.registros = r.registros; this.total = r.total; },
      error: e => this.error = e.error?.message ?? 'No se pudieron consultar las liquidaciones.'
    });
  }
  seleccionar(id: number, checked: boolean): void { if (checked) this.seleccionadas.add(id); else this.seleccionadas.delete(id); }
  seleccionarTodas(checked: boolean): void { this.seleccionadas = new Set(checked ? this.registros.map(r => r.id) : []); }
  imprimir(ids = [...this.seleccionadas]): void {
    if (!ids.length || this.imprimiendo) return;
    this.imprimiendo = true; this.error = '';
    forkJoin(ids.map(id => this.api.pdf(this.vacaciones, id))).pipe(takeUntil(this.destroy$)).subscribe({
      next: blobs => { void this.descargar(blobs).catch(() => this.error = 'No se pudo preparar el PDF.').finally(() => this.imprimiendo = false); },
      error: () => { this.imprimiendo = false; this.error = 'No se pudieron obtener los comprobantes seleccionados. Vuelva a intentarlo.'; }
    });
  }
  private async descargar(blobs: Blob[]): Promise<void> {
    const combinado = await PDFDocument.create();
    for (const blob of blobs) { const pdf = await PDFDocument.load(await blob.arrayBuffer()); for (const page of await combinado.copyPages(pdf, pdf.getPageIndices())) combinado.addPage(page); }
    const bytes = await combinado.save(); const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
    const enlace = document.createElement('a'); enlace.href = url; enlace.download = `Reimpresion_${this.vacaciones ? 'vacaciones' : 'liquidaciones'}.pdf`; enlace.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  cancelar(): void { this.empleado.setValue('', { emitEvent: false }); this.empleados = []; this.idEmpleado = undefined; this.desde = ''; this.hasta = ''; this.pagina = 1; this.error = ''; this.consultar(); }
  salir(): void { void this.router.navigate(['/rol-3000/inicio-rol']); }
  ngOnDestroy(): void { this.consulta$.next(); this.consulta$.complete(); this.destroy$.next(); this.destroy$.complete(); }
}
