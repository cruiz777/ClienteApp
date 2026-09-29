import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { debounceTime, distinctUntilChanged, filter, switchMap, catchError, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

import { EmpleadoBusquedaResponse, EmpleadoFichaService } from 'src/app/services/rol/empleado-ficha.service';
import { VacacionesService } from 'src/app/services/rol/vacaciones-rol.service';
import { CreateSolicitudVacacionesRequest } from 'src/app/interfaces/responses/vacaciones.response';
import { MessageBoxService } from 'src/app/components/utils/messages/message-box.service';
import { PeriodosVacacionesDialogComponent, PeriodosVacacionesDialogData } from '../dialogs/registro-vacaciones-dialog';
import { ImprimirVacacionesDialogComponent, ImprimirVacacionesDialogData } from '../dialogs/imprimir-vacaciones-dialog.component';

@Component({
  selector: 'app-registro-vacaciones',
  templateUrl: './registro-vacaciones.component.html',
  styleUrls: ['./registro-vacaciones.component.css']
})
export class RegistroVacacionesComponent implements OnInit {
  form!: FormGroup;

  // Autocomplete de empleado (solicitante)
  buscarEmpleadoCtrl = new FormControl('');
  empleadosFiltrados: EmpleadoBusquedaResponse[] = [];

  // Autocomplete de autoriza / aprueba (reutiliza la misma búsqueda de empleados)
  buscarAutorizaCtrl = new FormControl('');
  buscarApruebaCtrl = new FormControl('');
  autorizadoresFiltrados: EmpleadoBusquedaResponse[] = [];
  aprobadoresFiltrados: EmpleadoBusquedaResponse[] = [];

  cargandoSaldo = false;
  enviando = false;
  nombreEmpleadoSolicitante = '';

  // Se llena apenas se guarda una solicitud; habilita el botón Imprimir.
  // Se limpia solo con Cancelar, no automáticamente al guardar.
  idVacacionCreada: number | null = null;

  constructor(
    private fb: FormBuilder,
    private empleadoFichaService: EmpleadoFichaService,
    private vacacionesService: VacacionesService,
    private messageBox: MessageBoxService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      documentoNo: [''],
      fecha: [this.hoyIso()],
      empleado: [null, Validators.required], // guarda idEmpleado
      fechaIngreso: [''],
      codigoTrabajador: [''],
      departamento: [''],
      cedula: [''],
      cargoEmpleado: [''],

      diasAcumulados: [''],
      diasTomando: [''],
      saldoDias: [''],

      diasSolicitados: [null, [Validators.required, Validators.min(0.01)]],
      fechaDesde: ['', Validators.required],
      fechaHasta: [''],
      fechaRetorno: [''],

      reemplazo: [''],

      usuarioAutoriza: [''],
      cargoAutoriza: [''],

      usuarioAprueba: [''],
      cargoAprueba: [''],

      observacion: ['']
    });

    this.configurarBusquedaEmpleado();
    this.configurarCalculoFechas();
  }

  // ===== Cálculo automático de fechaHasta / fechaRetorno =====
  // fechaHasta = fechaDesde + (diasSolicitados - 1)
  // fechaRetorno = fechaDesde + diasSolicitados  (un día después de fechaHasta)

  private configurarCalculoFechas(): void {
    this.form.get('fechaDesde')?.valueChanges.subscribe(() => this.calcularFechas());
    this.form.get('diasSolicitados')?.valueChanges.subscribe(() => this.calcularFechas());
  }

  private calcularFechas(): void {
    const fechaDesdeStr: string = this.form.get('fechaDesde')?.value;
    const dias = Number(this.form.get('diasSolicitados')?.value);

    if (!fechaDesdeStr || !dias || dias <= 0) {
      this.form.patchValue({ fechaHasta: '', fechaRetorno: '' }, { emitEvent: false });
      return;
    }

    // Nota: para días con fracción (ej. 2.5) se trunca a día completo para efecto de fechas,
    // igual que hacía el sistema anterior con DateAdd.
    const diasEnteros = Math.trunc(dias);

    const desde = new Date(`${fechaDesdeStr}T00:00:00`);

    const hasta = new Date(desde);
    hasta.setDate(hasta.getDate() + diasEnteros - 1);

    const retorno = new Date(desde);
    retorno.setDate(retorno.getDate() + diasEnteros);

    this.form.patchValue(
      {
        fechaHasta: this.formatearFechaInput(hasta),
        fechaRetorno: this.formatearFechaInput(retorno)
      },
      { emitEvent: false }
    );
  }

  private formatearFechaInput(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private hoyIso(): string {
    return new Date().toISOString().substring(0, 10);
  }

  // ===== Autocomplete de empleado =====

  private buscarEmpleados(texto: string): Observable<EmpleadoBusquedaResponse[]> {
    if (!texto || texto.trim().length < 2) {
      return of([]);
    }
    return this.empleadoFichaService.getBusqueda(texto).pipe(
      map(res => res.data ?? []),
      catchError(() => of([]))
    );
  }

  private configurarBusquedaEmpleado(): void {
    this.buscarEmpleadoCtrl.valueChanges
      .pipe(
        filter((valor): valor is string => typeof valor === 'string'),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(texto => this.buscarEmpleados(texto))
      )
      .subscribe(res => (this.empleadosFiltrados = res));

    this.buscarAutorizaCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(texto => this.buscarEmpleados(typeof texto === 'string' ? texto : ''))
      )
      .subscribe(res => (this.autorizadoresFiltrados = res));

    // Escribir libremente también actualiza el texto que se manda al back (fallback si no elige de la lista)
    this.buscarAutorizaCtrl.valueChanges
      .pipe(filter((valor): valor is string => typeof valor === 'string'))
      .subscribe(texto => this.form.get('usuarioAutoriza')?.setValue(texto, { emitEvent: false }));

    this.buscarApruebaCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(texto => this.buscarEmpleados(typeof texto === 'string' ? texto : ''))
      )
      .subscribe(res => (this.aprobadoresFiltrados = res));

    this.buscarApruebaCtrl.valueChanges
      .pipe(filter((valor): valor is string => typeof valor === 'string'))
      .subscribe(texto => this.form.get('usuarioAprueba')?.setValue(texto, { emitEvent: false }));
  }

  mostrarEmpleado(item: EmpleadoBusquedaResponse | string): string {
    if (!item || typeof item === 'string') {
      return '';
    }
    return `${item.documento} - ${item.nombreCompleto}`;
  }

  onSeleccionarEmpleado(event: MatAutocompleteSelectedEvent): void {
    const item: EmpleadoBusquedaResponse = event.option.value;
    this.form.get('empleado')?.setValue(item.idEmpleado);
    this.nombreEmpleadoSolicitante = this.nombreLimpio(item);
    this.cargarFichaYSaldo(item.idEmpleado);
  }

  onSeleccionarAutoriza(event: MatAutocompleteSelectedEvent): void {
    const item: EmpleadoBusquedaResponse = event.option.value;
    this.form.get('usuarioAutoriza')?.setValue(this.nombreLimpio(item));

    this.empleadoFichaService.getFicha(item.idEmpleado).subscribe({
      next: res => {
        const cargo = res.data?.[0]?.cargo;
        if (cargo) {
          this.form.get('cargoAutoriza')?.setValue(cargo);
        }
      }
    });
  }

  onSeleccionarAprueba(event: MatAutocompleteSelectedEvent): void {
    const item: EmpleadoBusquedaResponse = event.option.value;
    this.form.get('usuarioAprueba')?.setValue(this.nombreLimpio(item));

    this.empleadoFichaService.getFicha(item.idEmpleado).subscribe({
      next: res => {
        const cargo = res.data?.[0]?.cargo;
        if (cargo) {
          this.form.get('cargoAprueba')?.setValue(cargo);
        }
      }
    });
  }

  // ===== Datos del empleado + saldo =====

  private nombreLimpio(item: EmpleadoBusquedaResponse): string {
    return `${item.nombres} ${item.apellidos}`.trim();
  }

  private cargarFichaYSaldo(idEmpleado: number): void {
    this.cargandoSaldo = true;

    this.empleadoFichaService.getFicha(idEmpleado).subscribe({
      next: res => {
        const ficha = res.data?.[0];
        if (ficha) {
          this.form.patchValue({
            documentoNo: ficha.documento ?? '',
            codigoTrabajador: ficha.idEmpleado,
            departamento: ficha.departamento ?? '',
            cedula: ficha.documento ?? '',
            cargoEmpleado: ficha.cargo ?? '',
            fechaIngreso: ficha.fecIngreso ? ficha.fecIngreso.substring(0, 10) : ''
          });
        }
      },
      error: () => {
        this.snackBar.open('No se pudo cargar la ficha del empleado.', 'Cerrar', { duration: 4000 });
      }
    });

    this.vacacionesService
      .getSaldo(idEmpleado)
      .pipe(finalize(() => (this.cargandoSaldo = false)))
      .subscribe({
        next: saldo => {
          this.form.patchValue({
            diasAcumulados: saldo.diasNormalesAcumulados + saldo.diasAdicionalesAcumulados,
            diasTomando: saldo.diasNormalesTomados + saldo.diasAdicionalesTomados,
            saldoDias: saldo.diasDisponibles
          });
        },
        error: () => {
          this.snackBar.open('No se pudo cargar el saldo de vacaciones.', 'Cerrar', { duration: 4000 });
        }
      });
  }

  // ===== Modal de períodos =====

  verPeriodos(): void {
    const idEmpleado = this.form.get('empleado')?.value;
    if (!idEmpleado) {
      return;
    }

    this.dialog.open(PeriodosVacacionesDialogComponent, {
      width: '700px',
      data: {
        idEmpleado,
        nombreEmpleado: this.buscarEmpleadoCtrl.value
          ? this.mostrarEmpleado(this.buscarEmpleadoCtrl.value as any)
          : ''
      } as PeriodosVacacionesDialogData
    });
  }

  // ===== Guardar =====

  aceptar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Completa los campos obligatorios.', 'Cerrar', { duration: 3000 });
      return;
    }

    const diasSolicitados = Number(this.form.get('diasSolicitados')?.value ?? 0);
    const saldoDisponible = Number(this.form.get('saldoDias')?.value ?? 0);

    // Chequeo en vivo, el back valida esto mismo pero así evitamos el viaje si ya sabemos que va a fallar
    if (diasSolicitados > saldoDisponible) {
      this.snackBar.open(
        `Saldo insuficiente. Disponible: ${saldoDisponible} día(s), solicitado: ${diasSolicitados} día(s).`,
        'Cerrar',
        { duration: 5000 }
      );
      return;
    }

    this.messageBox
      .confirm('¿Está seguro que desea guardar esta solicitud de vacaciones?', {
        title: 'Confirmar solicitud',
        confirmText: 'Sí, guardar',
        cancelText: 'Revisar'
      })
      .subscribe(confirmado => {
        if (confirmado) {
          this.guardarSolicitud();
        }
      });
  }

  private guardarSolicitud(): void {
    const v = this.form.getRawValue();

    // RpVacacionesTomadas no tiene columnas separadas para el cargo de quien autoriza/aprueba,
    // así que lo concatenamos en el mismo texto libre.
    const usuarioAutoriza = [v.usuarioAutoriza, v.cargoAutoriza].filter(Boolean).join(' - ') || null;
    const usuarioAprueba = [v.usuarioAprueba, v.cargoAprueba].filter(Boolean).join(' - ') || null;

    const request: CreateSolicitudVacacionesRequest = {
      idEmpleado: v.empleado,
      fechaDesde: new Date(`${v.fechaDesde}T00:00:00`).toISOString(),
      fechaHasta: new Date(`${v.fechaHasta}T00:00:00`).toISOString(),
      fechaRetorno: new Date(`${v.fechaRetorno}T00:00:00`).toISOString(),
      diasSolicitados: Number(v.diasSolicitados),
      observacion: v.observacion || null,
      personaReemplazo: v.reemplazo || null,
      usuarioAutoriza,
      usuarioAprueba
    };

    this.enviando = true;

    this.vacacionesService
      .crearSolicitud(request)
      .pipe(finalize(() => (this.enviando = false)))
      .subscribe({
        next: res => {
          this.messageBox.success(res.message || 'Solicitud de vacaciones creada correctamente.');
          // No se resetea el form: se queda como está para poder imprimir justo después.
          this.idVacacionCreada = res.data;

          // El saldo mostrado en pantalla quedaba desactualizado tras guardar — se vuelve a pedir.
          this.refrescarSaldo();
        },
        error: err => {
          const msg = err?.error?.message || 'No se pudo crear la solicitud de vacaciones.';
          this.messageBox.error(msg);
        }
      });
  }

  private refrescarSaldo(): void {
    const idEmpleado = this.form.get('empleado')?.value;
    if (!idEmpleado) {
      return;
    }

    this.vacacionesService.getSaldo(idEmpleado).subscribe({
      next: saldo => {
        this.form.patchValue({
          diasAcumulados: saldo.diasNormalesAcumulados + saldo.diasAdicionalesAcumulados,
          diasTomando: saldo.diasNormalesTomados + saldo.diasAdicionalesTomados,
          saldoDias: saldo.diasDisponibles
        });
      }
    });
  }

  // ===== Imprimir =====

  imprimir(): void {
    if (!this.idVacacionCreada) {
      return;
    }

    this.vacacionesService.getPreview(this.idVacacionCreada).subscribe({
      next: preview => {
        const textoPreview = `${preview.textoSolicitud}\n\n${preview.textoAutorizacion}`;

        this.dialog
          .open(ImprimirVacacionesDialogComponent, {
            width: '650px',
            data: { textoPreview } as ImprimirVacacionesDialogData
          })
          .afterClosed()
          .subscribe(continuar => {
            if (continuar) {
              this.imprimirPdf(this.idVacacionCreada!);
            }
          });
      },
      error: () => {
        this.snackBar.open('No se pudo generar la vista previa.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  private imprimirPdf(idVacacionTomada: number): void {
    this.vacacionesService.imprimirPdf(idVacacionTomada).subscribe({
      next: blob => {
        if (!blob || blob.size === 0) {
          this.snackBar.open('El PDF se generó vacío.', 'Cerrar', { duration: 3000 });
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const ventana = window.open(url, '_blank');

        if (!ventana) {
          const link = document.createElement('a');
          link.href = url;
          link.download = `Solicitud_Vacaciones_${idVacacionTomada}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        setTimeout(() => window.URL.revokeObjectURL(url), 30000);
      },
      error: () => {
        this.snackBar.open('No se pudo generar el PDF de la solicitud.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  cancelar(): void {
    this.form.reset();
    this.buscarEmpleadoCtrl.reset('');
    this.buscarAutorizaCtrl.reset('');
    this.buscarApruebaCtrl.reset('');
    this.idVacacionCreada = null;
    this.nombreEmpleadoSolicitante = '';
  }
}