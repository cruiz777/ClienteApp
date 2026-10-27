import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import {
  debounceTime,
  distinctUntilChanged,
  finalize
} from 'rxjs/operators';

import { MatSnackBar } from '@angular/material/snack-bar';

import {
  EmpleadoBusquedaResponse,
  EmpleadoFichaService
} from 'src/app/services/rol/empleado-ficha.service';

import {
  ReporteGastosPersonalesRequest,
  ReportesEmpleadosService
} from 'src/app/services/rol/reportes-empleados.service';

@Component({
  selector: 'app-gastos-personales',
  templateUrl: './gastos-personales.component.html',
  styleUrls: ['./gastos-personales.component.css']
})
export class GastosPersonalesComponent implements OnInit {

  form!: FormGroup;

  empleadosBusqueda: EmpleadoBusquedaResponse[] = [];
  empleadosFiltrados: EmpleadoBusquedaResponse[] = [];

  cargandoEmpleados = false;
  generando = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly empleadoFichaService: EmpleadoFichaService,
    private readonly reportesService: ReportesEmpleadosService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.crearFormulario();
    this.configurarBusquedaEmpleado();

    /*
     * Cargamos inicialmente algunos empleados
     * para que al abrir el autocomplete
     * ya existan opciones.
     */
    this.cargarEmpleadosBusqueda('');
  }

  private crearFormulario(): void {
    this.form = this.fb.group({
      idEmpleado: [null],
      empleadoBusqueda: ['']
    });
  }

  /* ============================================================
     BUSQUEDA EMPLEADO
  ============================================================ */

  private configurarBusquedaEmpleado(): void {

    this.form
      .get('empleadoBusqueda')
      ?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(valor => {

        /*
         * Si el valor es un objeto seleccionado
         * no volvemos a consultar.
         */
        if (
          typeof valor === 'object' &&
          valor !== null
        ) {
          return;
        }

        const texto =
          (valor ?? '')
            .toString()
            .trim();

        /*
         * Si el usuario modifica manualmente
         * el texto después de haber seleccionado
         * un empleado, limpiamos el ID.
         */
        this.form
          .get('idEmpleado')
          ?.setValue(
            null,
            {
              emitEvent: false
            }
          );

        this.cargarEmpleadosBusqueda(
          texto
        );
      });
  }

  cargarEmpleadosBusqueda(
    texto: string = ''
  ): void {

    this.cargandoEmpleados = true;

    this.empleadoFichaService
      .getBusqueda(texto)
      .pipe(
        finalize(() => {
          this.cargandoEmpleados = false;
        })
      )
      .subscribe({
        next: resp => {

          this.empleadosBusqueda =
            resp.data ?? [];

          this.empleadosFiltrados =
            this.empleadosBusqueda;
        },

        error: err => {

          console.error(
            'Error cargando empleados:',
            err
          );

          this.empleadosBusqueda = [];
          this.empleadosFiltrados = [];
        }
      });
  }

  seleccionarEmpleadoBusqueda(
    emp: EmpleadoBusquedaResponse
  ): void {

    if (!emp) {
      return;
    }

    this.form.patchValue(
      {
        idEmpleado:
          Number(
            emp.idEmpleado
          ),

        empleadoBusqueda:
          emp.nombreCompleto
      },
      {
        emitEvent: false
      }
    );
  }

  displayEmpleado(
    empleado:
      EmpleadoBusquedaResponse |
      string |
      null
  ): string {

    if (!empleado) {
      return '';
    }

    if (
      typeof empleado === 'string'
    ) {
      return empleado;
    }

    return empleado.nombreCompleto ?? '';
  }

  limpiarBusquedaEmpleado(
    event?: MouseEvent
  ): void {

    if (event) {
      event.stopPropagation();
    }

    this.form.patchValue(
      {
        idEmpleado: null,
        empleadoBusqueda: ''
      },
      {
        emitEvent: false
      }
    );

    this.empleadosBusqueda = [];
    this.empleadosFiltrados = [];

    this.cargarEmpleadosBusqueda('');
  }

  /* ============================================================
     GENERAR REPORTE
  ============================================================ */

  aceptar(): void {

    if (this.generando) {
      return;
    }

    const idEmpleado =
      this.form
        .get('idEmpleado')
        ?.value;

    /*
     * idEmpleado null significa TODOS.
     */
    const request:
      ReporteGastosPersonalesRequest = {

      idEmpleado:
        idEmpleado !== null &&
        idEmpleado !== undefined &&
        idEmpleado !== ''
          ? Number(idEmpleado)
          : null,

      idEmpresa:
        null
    };

    console.log(
      'REQUEST GASTOS PERSONALES:',
      request
    );

    this.generando = true;

    this.reportesService
      .generarGastosPersonalesPdf(
        request
      )
      .pipe(
        finalize(() => {
          this.generando = false;
        })
      )
      .subscribe({
        next: blob => {

          if (
            !blob ||
            blob.size === 0
          ) {
            this.mostrarAdvertencia(
              'El reporte generado está vacío.'
            );

            return;
          }

          const nombreArchivo =
            request.idEmpleado
              ? `REPORTE_GASTOS_PERSONALES_EMPLEADO_${request.idEmpleado}.pdf`
              : 'REPORTE_GASTOS_PERSONALES.pdf';

          this.descargarPdf(
            blob,
            nombreArchivo
          );

          this.mostrarExito(
            'Reporte generado correctamente.'
          );
        },

        error: error => {

          console.error(
            'Error generando reporte:',
            error
          );

          this.mostrarError(
            error?.error?.message ??
            'No se pudo generar el reporte de gastos personales.'
          );
        }
      });
  }

  cancelar(): void {

    if (this.generando) {
      return;
    }

    this.limpiarBusquedaEmpleado();
  }

  /* ============================================================
     DESCARGA PDF
  ============================================================ */

  private descargarPdf(
    blob: Blob,
    nombreArchivo: string
  ): void {

    const archivo =
      new Blob(
        [blob],
        {
          type:
            'application/pdf'
        }
      );

    const url =
      window.URL
        .createObjectURL(
          archivo
        );

    const link =
      document
        .createElement(
          'a'
        );

    link.href =
      url;

    link.download =
      nombreArchivo;

    document.body
      .appendChild(
        link
      );

    link.click();

    document.body
      .removeChild(
        link
      );

    setTimeout(() => {
      window.URL
        .revokeObjectURL(
          url
        );
    }, 1000);
  }

  /* ============================================================
     MENSAJES
  ============================================================ */

  private mostrarExito(
    mensaje: string
  ): void {

    this.snackBar.open(
      mensaje,
      'Cerrar',
      {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: [
          'snackbar-success'
        ]
      }
    );
  }

  private mostrarAdvertencia(
    mensaje: string
  ): void {

    this.snackBar.open(
      mensaje,
      'Cerrar',
      {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: [
          'snackbar-warning'
        ]
      }
    );
  }

  private mostrarError(
    mensaje: string
  ): void {

    this.snackBar.open(
      mensaje,
      'Cerrar',
      {
        duration: 7000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: [
          'snackbar-error'
        ]
      }
    );
  }
}