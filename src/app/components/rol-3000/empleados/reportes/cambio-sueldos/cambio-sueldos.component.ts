import {
  Component,
  OnInit,
  TemplateRef,
  ViewChild
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  forkJoin
} from 'rxjs';

import {
  finalize
} from 'rxjs/operators';

import {
  MatSnackBar
} from '@angular/material/snack-bar';

import {
  MatDialog
} from '@angular/material/dialog';

import {
  LocalesService
} from 'src/app/services/locales.service';

import {
  DepartamentosService
} from 'src/app/services/departamentos.service';

import {
  RpCargosService
} from 'src/app/services/rol/rp-cargos.service.service';

import {
  CambioSueldosService,
  CambioSueldosRequest,
  CambioSueldosResponse
} from 'src/app/services/rol/cambio-sueldos.service';


/* ============================================================
   CATÁLOGO COMÚN
============================================================ */

interface CatalogoCambioSueldo {

  id: number;

  descripcion: string;

}


@Component({

  selector: 'app-cambio-sueldos',

  templateUrl:
    './cambio-sueldos.component.html',

  styleUrls: [
    './cambio-sueldos.component.css'
  ]

})
export class CambioSueldosComponent
  implements OnInit {

  @ViewChild('confirmacionDialog')
  confirmacionDialog!: TemplateRef<unknown>;


  form!: FormGroup;


  // ============================================================
  // ESTADOS
  // ============================================================

  cargandoCatalogos = false;

  procesando = false;


  // ============================================================
  // DATOS CONFIRMACIÓN
  // ============================================================

  mensajeOperacion = '';

  criterioConfirmacion = '';


  // ============================================================
  // CATÁLOGOS
  // ============================================================

  locales:
    CatalogoCambioSueldo[] = [];

  departamentos:
    CatalogoCambioSueldo[] = [];

  cargos:
    CatalogoCambioSueldo[] = [];


  // ============================================================
  // LISTA SEGÚN FILTRO
  // ============================================================

  opcionesFiltro:
    CatalogoCambioSueldo[] = [];


  constructor(

    private readonly fb:
      FormBuilder,

    private readonly localesService:
      LocalesService,

    private readonly departamentosService:
      DepartamentosService,

    private readonly cargosService:
      RpCargosService,

    private readonly cambioSueldosService:
      CambioSueldosService,

    private readonly snackBar:
      MatSnackBar,

    private readonly dialog:
      MatDialog

  ) {}


  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {

    this.crearFormulario();

    this.configurarEventos();

    this.cargarCatalogos();

  }


  // ============================================================
  // FORMULARIO
  // ============================================================

  private crearFormulario(): void {

    this.form =
      this.fb.group({

        /*
         * 1 = Local
         * 2 = Departamento
         * 3 = Cargo
         */
        tipoFiltro: [
          1,
          Validators.required
        ],


        idFiltro: [
          null,
          Validators.required
        ],


        /*
         * 1 = Por porcentaje
         * 2 = Por valor
         * 3 = Cambio directo
         */
        tipoActualizacion: [
          1,
          Validators.required
        ],


        valor: [
          null,
          Validators.required
        ]

      });

  }


  // ============================================================
  // EVENTOS
  // ============================================================

  private configurarEventos(): void {

    this.form
      .get('tipoFiltro')
      ?.valueChanges
      .subscribe(
        valor => {

          this.cambiarTipoFiltro(
            Number(valor)
          );

        }
      );

  }


  // ============================================================
  // CARGAR CATÁLOGOS
  // ============================================================

  private cargarCatalogos(): void {

    this.cargandoCatalogos =
      true;


    forkJoin({

      locales:
        this.localesService
          .getAll(),

      departamentos:
        this.departamentosService
          .getDepartamentos(),

      cargos:
        this.cargosService
          .getAll()

    })
      .pipe(

        finalize(() => {

          this.cargandoCatalogos =
            false;

        })

      )
      .subscribe({

        next: ({
          locales,
          departamentos,
          cargos
        }) => {

          // ===================================================
          // LOCALES
          // ===================================================

          const localesData:
            any[] =
            (locales as any)?.data
            ?? [];


          this.locales =
            localesData

              .filter(
                x =>
                  x.estado !== false
              )

              .map(
                x => ({

                  id:
                    Number(
                      x.id
                      ??
                      x.idLocal
                      ??
                      x.id_local
                    ),

                  descripcion:
                    (
                      x.nombre
                      ?? ''
                    )
                    .toString()
                    .trim()

                })
              )

              .filter(
                x =>
                  x.id > 0
              )

              .sort(
                (
                  a,
                  b
                ) =>
                  a.descripcion
                    .localeCompare(
                      b.descripcion
                    )
              );


          // ===================================================
          // DEPARTAMENTOS
          // ===================================================

          const departamentosData:
            any[] =
            departamentos
            ?? [];


          this.departamentos =
            departamentosData

              .filter(
                x =>
                  x.estado !== false
              )

              .map(
                x => ({

                  id:
                    Number(
                      x.id_departamento
                      ??
                      x.idDepartamento
                      ??
                      x.id
                    ),

                  descripcion:
                    (
                      x.nombre
                      ?? ''
                    )
                    .toString()
                    .trim()

                })
              )

              .filter(
                x =>
                  x.id > 0
              )

              .sort(
                (
                  a,
                  b
                ) =>
                  a.descripcion
                    .localeCompare(
                      b.descripcion
                    )
              );


          // ===================================================
          // CARGOS
          // ===================================================

          const cargosData:
            any[] =
            cargos
            ?? [];


          this.cargos =
            cargosData

              .filter(
                x =>
                  x.estado !== false
              )

              .map(
                x => ({

                  id:
                    Number(
                      x.idCargo
                      ??
                      x.id_cargo
                      ??
                      x.id
                    ),

                  descripcion:
                    (
                      x.descargo
                      ??
                      x.descripcion
                      ??
                      ''
                    )
                    .toString()
                    .trim()

                })
              )

              .filter(
                x =>
                  x.id > 0
              )

              .sort(
                (
                  a,
                  b
                ) =>
                  a.descripcion
                    .localeCompare(
                      b.descripcion
                    )
              );


          // ===================================================
          // INICIAL = LOCAL
          // ===================================================

          this.cambiarTipoFiltro(
            1
          );

        },


        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error cargando catálogos:',
            error
          );


          this.locales = [];

          this.departamentos = [];

          this.cargos = [];

          this.opcionesFiltro = [];


          this.mostrarError(
            'No se pudieron cargar locales, departamentos o cargos.'
          );

        }

      });

  }


  // ============================================================
  // CAMBIAR TIPO FILTRO
  // ============================================================

  cambiarTipoFiltro(
    tipoFiltro: number
  ): void {

    this.form
      .get('idFiltro')
      ?.setValue(
        null,
        {
          emitEvent: false
        }
      );


    switch (
      tipoFiltro
    ) {

      case 1:

        this.opcionesFiltro =
          [
            ...this.locales
          ];

        break;


      case 2:

        this.opcionesFiltro =
          [
            ...this.departamentos
          ];

        break;


      case 3:

        this.opcionesFiltro =
          [
            ...this.cargos
          ];

        break;


      default:

        this.opcionesFiltro =
          [];

        break;

    }

  }


  // ============================================================
  // TÍTULO FILTRO
  // ============================================================

  get tituloFiltro(): string {

    const tipo =
      Number(
        this.form
          ?.get('tipoFiltro')
          ?.value
      );


    switch (
      tipo
    ) {

      case 1:
        return 'Local';

      case 2:
        return 'Departamento';

      case 3:
        return 'Cargo';

      default:
        return 'Criterio';

    }

  }


  // ============================================================
  // TÍTULO VALOR
  // ============================================================

  get tituloValor(): string {

    const tipo =
      Number(
        this.form
          ?.get('tipoActualizacion')
          ?.value
      );


    switch (
      tipo
    ) {

      case 1:
        return 'Porcentaje';

      case 2:
        return 'Valor';

      case 3:
        return 'Nuevo sueldo';

      default:
        return 'Valor';

    }

  }


  // ============================================================
  // SUFIJO
  // ============================================================

  get sufijoValor(): string {

    const tipo =
      Number(
        this.form
          ?.get('tipoActualizacion')
          ?.value
      );


    return tipo === 1
      ? '%'
      : '$';

  }


  // ============================================================
  // PROCESAR
  // ============================================================

  procesar(): void {

    if (
      this.procesando
    ) {

      return;

    }


    // ==========================================================
    // VALIDAR FORMULARIO
    // ==========================================================

    if (
      this.form.invalid
    ) {

      this.form
        .markAllAsTouched();


      this.mostrarAdvertencia(
        'Debe completar todos los campos.'
      );


      return;

    }


    // ==========================================================
    // VALORES
    // ==========================================================

    const tipoFiltro =
      Number(
        this.form
          .get('tipoFiltro')
          ?.value
      );


    const idFiltro =
      Number(
        this.form
          .get('idFiltro')
          ?.value
      );


    const tipoActualizacion =
      Number(
        this.form
          .get('tipoActualizacion')
          ?.value
      );


    const valor =
      Number(
        this.form
          .get('valor')
          ?.value
      );


    // ==========================================================
    // VALIDACIONES
    // ==========================================================

    if (
      !idFiltro ||
      idFiltro <= 0
    ) {

      this.mostrarAdvertencia(
        `Debe seleccionar un ${this.tituloFiltro.toLowerCase()}.`
      );


      return;

    }


    if (
      Number.isNaN(
        valor
      )
    ) {

      this.mostrarAdvertencia(
        'El valor ingresado no es válido.'
      );


      return;

    }


    if (
      tipoActualizacion === 3 &&
      valor < 0
    ) {

      this.mostrarAdvertencia(
        'El nuevo sueldo no puede ser negativo.'
      );


      return;

    }


    // ==========================================================
    // DESCRIPCIÓN DEL CRITERIO
    // ==========================================================

    const opcionSeleccionada =
      this.opcionesFiltro
        .find(
          x =>
            Number(x.id) ===
            idFiltro
        );


    const descripcion =
      opcionSeleccionada
        ?.descripcion
      ?? idFiltro.toString();


    // ==========================================================
    // DESCRIPCIÓN OPERACIÓN
    // ==========================================================

    let operacion =
      '';


    switch (
      tipoActualizacion
    ) {

      case 1:

        if (
          valor >= 0
        ) {

          operacion =
            `Aumentar los sueldos en ${valor}%`;

        }
        else {

          operacion =
            `Disminuir los sueldos en ${Math.abs(valor)}%`;

        }

        break;


      case 2:

        if (
          valor >= 0
        ) {

          operacion =
            `Aumentar $${valor.toFixed(2)} a los sueldos`;

        }
        else {

          operacion =
            `Disminuir $${Math.abs(valor).toFixed(2)} de los sueldos`;

        }

        break;


      case 3:

        operacion =
          `Establecer el sueldo en $${valor.toFixed(2)}`;

        break;

    }


    // ==========================================================
    // PREPARAR DIÁLOGO
    // ==========================================================

    this.mensajeOperacion =
      operacion;


    this.criterioConfirmacion =
      `${this.tituloFiltro}: ${descripcion}`;


    // ==========================================================
    // ABRIR CONFIRMACIÓN
    // ==========================================================

    const dialogRef =
      this.dialog.open(
        this.confirmacionDialog,
        {
          width:
            '500px',

          maxWidth:
            '95vw',

          disableClose:
            true,

          autoFocus:
            false,

          panelClass:
            'cambio-sueldo-dialog'
        }
      );


    dialogRef
      .afterClosed()
      .subscribe(
        (
          confirmar:
            boolean | undefined
        ) => {

          if (
            confirmar !== true
          ) {

            return;

          }


          this.ejecutarCambioSueldos(
            tipoFiltro,
            idFiltro,
            tipoActualizacion,
            valor
          );

        }
      );

  }


  // ============================================================
  // EJECUTAR CAMBIO
  // ============================================================

  private ejecutarCambioSueldos(
    tipoFiltro: number,
    idFiltro: number,
    tipoActualizacion: number,
    valor: number
  ): void {

    const request:
      CambioSueldosRequest = {

      tipoFiltro:
        tipoFiltro,

      idFiltro:
        idFiltro,

      tipoActualizacion:
        tipoActualizacion,

      valor:
        valor

    };


    console.log(
      'REQUEST CAMBIO SUELDOS:',
      request
    );


    this.procesando =
      true;


    this.cambioSueldosService
      .procesar(
        request
      )
      .pipe(

        finalize(() => {

          this.procesando =
            false;

        })

      )
      .subscribe({

        next: (
          response:
            CambioSueldosResponse
        ) => {

          this.mostrarExito(
            response.mensaje
            ??
            `${response.empleadosActualizados} empleado(s) actualizados correctamente.`
          );


          this.limpiar();

        },


        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error cambiando sueldos:',
            error
          );


          if (
            error.status === 404
          ) {

            this.mostrarAdvertencia(
              (error.error as any)
                ?.mensaje
              ??
              'No existen empleados para el criterio seleccionado.'
            );


            return;

          }


          this.mostrarError(
            (error.error as any)
              ?.mensaje
            ??
            (error.error as any)
              ?.message
            ??
            'No se pudo realizar el cambio de sueldos.'
          );

        }

      });

  }


  // ============================================================
  // LIMPIAR
  // ============================================================

  limpiar(): void {

    this.form
      .reset({

        tipoFiltro:
          1,

        idFiltro:
          null,

        tipoActualizacion:
          1,

        valor:
          null

      });


    this.mensajeOperacion =
      '';

    this.criterioConfirmacion =
      '';


    this.cambiarTipoFiltro(
      1
    );

  }


  // ============================================================
  // SALIR
  // ============================================================

  salir(): void {

    if (
      this.procesando
    ) {

      return;

    }


    window.history.back();

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
        duration:
          5000,

        horizontalPosition:
          'end',

        verticalPosition:
          'top',

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
        duration:
          5000,

        horizontalPosition:
          'end',

        verticalPosition:
          'top',

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
        duration:
          7000,

        horizontalPosition:
          'end',

        verticalPosition:
          'top',

        panelClass: [
          'snackbar-error'
        ]
      }
    );

  }

}