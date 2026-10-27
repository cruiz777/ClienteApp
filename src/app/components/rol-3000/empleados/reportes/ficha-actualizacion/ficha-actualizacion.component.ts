import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule
} from '@angular/forms';

import {
  debounceTime,
  distinctUntilChanged,
  finalize
} from 'rxjs/operators';

import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';

import {
  MatFormFieldModule
} from '@angular/material/form-field';

import {
  MatInputModule
} from '@angular/material/input';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';

import {
  EmpleadoBusquedaResponse,
  EmpleadoFichaService
} from 'src/app/services/rol/empleado-ficha.service';

import {
  ReportesEmpleadosService
} from 'src/app/services/rol/reportes-empleados.service';


@Component({
  selector: 'app-ficha-actualizacion',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],

  templateUrl:
    './ficha-actualizacion.component.html',

  styleUrl:
    './ficha-actualizacion.component.css'
})
export class FichaActualizacionComponent
  implements OnInit {

  form!: FormGroup;

  empleadosBusqueda:
    EmpleadoBusquedaResponse[] = [];

  empleadosFiltrados:
    EmpleadoBusquedaResponse[] = [];

  cargandoEmpleados = false;

  generando = false;


  constructor(

    private readonly fb:
      FormBuilder,

    private readonly empleadoFichaService:
      EmpleadoFichaService,

    private readonly reportesService:
      ReportesEmpleadosService,

    private readonly snackBar:
      MatSnackBar

  ) {}


  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {

    this.crearFormulario();

    this.configurarBusquedaEmpleado();

    /*
     * Cargamos inicialmente empleados
     * para que al abrir el autocomplete
     * aparezcan opciones.
     */
    this.cargarEmpleadosBusqueda('');

  }


  // ============================================================
  // FORMULARIO
  // ============================================================

  private crearFormulario(): void {

    this.form =
      this.fb.group({

        idEmpleado: [
          null
        ],

        empleadoBusqueda: [
          ''
        ]

      });

  }


  // ============================================================
  // CONFIGURAR BUSCADOR
  // ============================================================

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
         * Si en algún momento el autocomplete
         * asigna el objeto completo, no volvemos
         * a buscar.
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
         * el texto después de seleccionar
         * un empleado, quitamos el ID.
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


  // ============================================================
  // CARGAR EMPLEADOS
  // ============================================================

  cargarEmpleadosBusqueda(
    texto: string = ''
  ): void {

    this.cargandoEmpleados = true;


    this.empleadoFichaService
      .getBusqueda(
        texto
      )
      .pipe(

        finalize(() => {

          this.cargandoEmpleados =
            false;

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


          this.empleadosBusqueda =
            [];

          this.empleadosFiltrados =
            [];

        }

      });

  }


  // ============================================================
  // SELECCIONAR EMPLEADO
  // ============================================================

  seleccionarEmpleadoBusqueda(
    event: MatAutocompleteSelectedEvent
  ): void {

    const empleado =
      event.option.value as
        EmpleadoBusquedaResponse;


    if (!empleado) {

      return;

    }


    this.form.patchValue(
      {

        idEmpleado:
          Number(
            empleado.idEmpleado
          ),

        empleadoBusqueda:
          empleado.nombreCompleto

      },
      {
        emitEvent: false
      }
    );

  }


  // ============================================================
  // DISPLAY AUTOCOMPLETE
  // ============================================================

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


    return (
      empleado.nombreCompleto
      ?? ''
    );

  }


  // ============================================================
  // LIMPIAR BUSCADOR
  // ============================================================

  limpiarBusquedaEmpleado(
    event?: MouseEvent
  ): void {

    if (event) {

      event.stopPropagation();

    }


    this.form.patchValue(
      {

        idEmpleado:
          null,

        empleadoBusqueda:
          ''

      },
      {
        emitEvent: false
      }
    );


    this.empleadosBusqueda =
      [];

    this.empleadosFiltrados =
      [];


    this.cargarEmpleadosBusqueda('');

  }


  // ============================================================
  // GENERAR REPORTE
  //
  // VACÍO:
  // general = true
  //
  // EMPLEADO SELECCIONADO:
  // general = false
  // ============================================================

  generar(): void {

    if (
      this.generando
    ) {

      return;

    }


    const idEmpleadoValor =
      this.form
        .get('idEmpleado')
        ?.value;


    const textoBusqueda =
      (
        this.form
          .get('empleadoBusqueda')
          ?.value
        ?? ''
      )
        .toString()
        .trim();


    const tieneEmpleado =
      idEmpleadoValor !== null &&
      idEmpleadoValor !== undefined &&
      idEmpleadoValor !== '' &&
      Number(idEmpleadoValor) > 0;


    // ==========================================================
    // IMPORTANTE
    //
    // Si escribió algo pero NO seleccionó un empleado,
    // no generamos TODOS accidentalmente.
    // ==========================================================

    if (
      textoBusqueda !== '' &&
      !tieneEmpleado
    ) {

      this.mostrarAdvertencia(
        'Debe seleccionar un empleado de la lista o dejar el campo vacío para generar todos.'
      );

      return;

    }


    const idEmpleado =
      tieneEmpleado
        ? Number(idEmpleadoValor)
        : null;


    /*
     * Si no existe empleado seleccionado:
     *
     * general = true
     *
     * Si existe:
     *
     * general = false
     */
    const general =
      idEmpleado === null;


    console.log(
      'FICHA ACTUALIZACION:',
      {
        general,
        idEmpleado
      }
    );


    this.generando =
      true;


    this.reportesService
      .generarFichaActualizacionEmpleadoPdf(
        general,
        idEmpleado
      )
      .pipe(

        finalize(() => {

          this.generando =
            false;

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
            idEmpleado !== null

              ? `FICHA_ACTUALIZACION_EMPLEADO_${idEmpleado}.pdf`

              : 'FICHA_ACTUALIZACION_EMPLEADOS.pdf';


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
            'Error generando ficha:',
            error
          );


          if (
            error.status === 404
          ) {

            this.mostrarAdvertencia(
              'No existen empleados para generar el reporte.'
            );

            return;

          }


          this.mostrarError(
            error?.error?.message ??
            'No se pudo generar la ficha del empleado.'
          );

        }

      });

  }


  // ============================================================
  // CANCELAR
  // ============================================================

  cancelar(): void {

    if (
      this.generando
    ) {

      return;

    }


    this.limpiarBusquedaEmpleado();

  }


  // ============================================================
  // SALIR
  // ============================================================

  salir(): void {

    if (
      this.generando
    ) {

      return;

    }


    window.history.back();

  }


  // ============================================================
  // DESCARGAR PDF
  // ============================================================

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


  // ============================================================
  // MENSAJES
  // ============================================================

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