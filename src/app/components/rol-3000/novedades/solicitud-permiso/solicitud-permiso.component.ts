import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, finalize, map, switchMap } from 'rxjs/operators';
import { CreatePermisoRequest, MotivoPermiso, TipoPermiso, TipoTiempo } from 'src/app/interfaces/responses/permiso.response';
import { EmpleadoBusquedaResponse, EmpleadoFichaService } from 'src/app/services/rol/empleado-ficha.service';
import { PermisoService } from 'src/app/services/rol/permisos-rol.service';
import { MessageBoxService } from 'src/app/components/utils/messages/message-box.service';


@Component({
  selector: 'app-solicitud-permiso',
  templateUrl: './solicitud-permiso.component.html',
  styleUrls: ['./solicitud-permiso.component.css']
})
export class SolicitudPermisoComponent implements OnInit {
  form!: FormGroup;

  motivos: MotivoPermiso[] = [];
  tiposPermiso: TipoPermiso[] = [];
  tiposTiempo: TipoTiempo[] = [];

  // Autocomplete de empleados, reutilizado para Empleado / Aprueba / Autoriza
  buscarEmpleadoCtrl = new FormControl('');
  buscarApruebaCtrl = new FormControl('');
  buscarAutorizaCtrl = new FormControl('');

  empleadosFiltrados: EmpleadoBusquedaResponse[] = [];
  aprobadoresFiltrados: EmpleadoBusquedaResponse[] = [];
  autorizadoresFiltrados: EmpleadoBusquedaResponse[] = [];

  cargandoCombos = false;
  enviando = false;

  constructor(
    private fb: FormBuilder,
    private permisoService: PermisoService,
    private empleadoFichaService: EmpleadoFichaService,
    private snackBar: MatSnackBar,
    private messageBox: MessageBoxService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      empleado: [null, Validators.required], // guarda idEmpleado
      motivo: [null, Validators.required],
      fechaDesde: ['', Validators.required],
      horaDesde: ['', Validators.required],
      fechaHasta: ['', Validators.required],
      horaHasta: ['', Validators.required],
      aprueba: [null], // guarda idEmpleado
      autoriza: [null], // guarda idEmpleado
      detalleGeneral: [''],

      tiempo: ['', Validators.required],
      horasDias: [null, Validators.required], // idTipoTiempo
      detalleValidacion: [''],
      tipoPermiso: [null, Validators.required] // idTipoPermiso
    });

    this.cargarCombos();
    this.configurarBusquedaEmpleados();
  }

  private cargarCombos(): void {
    this.cargandoCombos = true;

    forkJoin({
      motivos: this.permisoService.getMotivos(),
      tiposPermiso: this.permisoService.getTiposPermiso(),
      tiposTiempo: this.permisoService.getTiposTiempo()
    })
      .pipe(finalize(() => (this.cargandoCombos = false)))
      .subscribe({
        next: ({ motivos, tiposPermiso, tiposTiempo }) => {
          this.motivos = motivos;
          this.tiposPermiso = tiposPermiso;
          this.tiposTiempo = tiposTiempo;
        },
        error: () => {
          this.snackBar.open('No se pudieron cargar los combos del formulario.', 'Cerrar', {
            duration: 4000
          });
        }
      });
  }

  // Búsqueda compartida por los 3 autocompletes de empleado
  private buscarEmpleados(texto: string): Observable<EmpleadoBusquedaResponse[]> {
    if (!texto || texto.trim().length < 2) {
      return of([]);
    }

    return this.empleadoFichaService.getBusqueda(texto).pipe(
      map(res => res.data ?? []),
      catchError(() => of([]))
    );
  }

  private configurarBusquedaEmpleados(): void {
    this.buscarEmpleadoCtrl.valueChanges
      .pipe(
        filter((valor): valor is string => typeof valor === 'string'), // ignora el objeto que deja el autocomplete al seleccionar
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(texto => this.buscarEmpleados(texto))
      )
      .subscribe(res => (this.empleadosFiltrados = res));

    this.buscarApruebaCtrl.valueChanges
      .pipe(
        filter((valor): valor is string => typeof valor === 'string'),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(texto => this.buscarEmpleados(texto))
      )
      .subscribe(res => (this.aprobadoresFiltrados = res));

    this.buscarAutorizaCtrl.valueChanges
      .pipe(
        filter((valor): valor is string => typeof valor === 'string'),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(texto => this.buscarEmpleados(texto))
      )
      .subscribe(res => (this.autorizadoresFiltrados = res));
  }

  // displayWith del mat-autocomplete: qué texto queda en el input tras seleccionar
  mostrarEmpleado(item: EmpleadoBusquedaResponse | string): string {
    if (!item || typeof item === 'string') {
      return '';
    }
    return `${item.documento} - ${item.nombreCompleto}`;
  }

  onSeleccionarEmpleado(event: MatAutocompleteSelectedEvent, campo: 'empleado' | 'aprueba' | 'autoriza'): void {
    const item: EmpleadoBusquedaResponse = event.option.value;
    this.form.get(campo)?.setValue(item.idEmpleado);
  }

  // Combina fecha (yyyy-MM-dd) + hora (HH:mm) del form en un ISO string
  private combinarFechaHora(fecha: string, hora: string): string {
    return new Date(`${fecha}T${hora}:00`).toISOString();
  }

  aceptar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Completa los campos obligatorios.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.messageBox
      .confirm('¿Está seguro que desea guardar esta solicitud de permiso?', {
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
    const v = this.form.value;

    const request: CreatePermisoRequest = {
      idEmpleadoSolicita: v.empleado,
      idMotivoPermiso: v.motivo,
      idEmpleadoAprueba: v.aprueba ?? null,
      idEmpleadoAutoriza: v.autoriza ?? null,
      fechaDesde: this.combinarFechaHora(v.fechaDesde, v.horaDesde),
      fechaHasta: this.combinarFechaHora(v.fechaHasta, v.horaHasta),
      tiempo: v.tiempo,
      idTipoTiempo: v.horasDias,
      idTipoPermiso: v.tipoPermiso,
      detalle: v.detalleGeneral || null,
      observacion: v.detalleValidacion || null
    };

    this.enviando = true;

    this.permisoService
      .crearPermiso(request)
      .pipe(finalize(() => (this.enviando = false)))
      .subscribe({
        next: res => {
          this.snackBar.open(res.message || 'Solicitud creada correctamente.', 'Cerrar', {
            duration: 3000
          });
            if (res.data) {              
              this.imprimirPdf(res.data);
            }
          this.form.reset();
          this.buscarEmpleadoCtrl.reset('');
          this.buscarApruebaCtrl.reset('');
          this.buscarAutorizaCtrl.reset('');
        },
        error: err => {
          const msg = err?.error?.message || 'No se pudo crear la solicitud de permiso.';
          this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        }
      });
  }

  cancelar(): void {
    this.form.reset();
    this.buscarEmpleadoCtrl.reset('');
    this.buscarApruebaCtrl.reset('');
    this.buscarAutorizaCtrl.reset('');
  }
  private imprimirPdf(idPermiso: number): void {
  this.permisoService.imprimirPdf(idPermiso).subscribe({
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
        link.download = `Solicitud_Permiso_${idPermiso}.pdf`;
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
}