import {
  Component,
  OnInit
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
  finalize
} from 'rxjs/operators';

import {
  MatSnackBar
} from '@angular/material/snack-bar';

import {
  EmpresaAdaptacionService
} from 'src/app/services/rol/empresa-adaptacion.service';

import {
  RpEmpresaComplementariaResponse
} from 'src/app/interfaces/responses/empresa-complementaria-response';

import {
  CreateRpEmpresaComplementariaRequest
} from 'src/app/interfaces/requests/empresa-complementaria.request';

import {
  ApiResponse
} from 'src/app/interfaces/responses/api-response';


@Component({
  selector: 'app-empresa-adaptacion',

  templateUrl:
    './empresa-adaptacion.component.html',

  styleUrls: [
    './empresa-adaptacion.component.css'
  ]
})
export class EmpresaAdaptacionComponent
  implements OnInit {

  form!: FormGroup;


  // ============================================================
  // ESTADOS
  // ============================================================

  cargando = false;

  guardando = false;

  eliminando = false;


  // ============================================================
  // DATOS
  // ============================================================

  empresas:
    RpEmpresaComplementariaResponse[] = [];


  empresaSeleccionadaId:
    number | null = null;


  // ============================================================
  // COLUMNAS
  // ============================================================

  displayedColumns:
    string[] = [

      'idEmpresaComplementaria',

      'empresa',

      'ruc',

      'estado',

      'acciones'

    ];


  constructor(

    private readonly fb:
      FormBuilder,

    private readonly empresaService:
      EmpresaAdaptacionService,

    private readonly snackBar:
      MatSnackBar

  ) {}


  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {

    this.crearFormulario();

    this.cargarEmpresas();

  }


  // ============================================================
  // FORMULARIO
  // ============================================================

  private crearFormulario(): void {

    this.form =
      this.fb.group({

        idEmpresaComplementaria: [
          0
        ],


        empresa: [
          '',
          [
            Validators.required
          ]
        ],


        ruc: [
          '',
          [
            Validators.required,
            Validators.maxLength(13)
          ]
        ],


        estado: [
          true
        ]

      });

  }


  // ============================================================
  // CARGAR EMPRESAS
  // ============================================================

  cargarEmpresas(): void {

    this.cargando =
      true;


    this.empresaService
      .getAll()
      .pipe(

        finalize(() => {

          this.cargando =
            false;

        })

      )
      .subscribe({

        next: (
          response:
            ApiResponse<
              RpEmpresaComplementariaResponse[]
            >
        ) => {

          this.empresas =
            response.data
            ?? [];

        },


        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error cargando empresas:',
            error
          );


          this.empresas =
            [];


          this.mostrarError(
            this.obtenerMensajeError(
              error,
              'No se pudieron cargar las empresas complementarias.'
            )
          );

        }

      });

  }


  // ============================================================
  // NUEVO
  // ============================================================

  nuevo(): void {

    this.empresaSeleccionadaId =
      null;


    this.form.reset({

      idEmpresaComplementaria:
        0,

      empresa:
        '',

      ruc:
        '',

      estado:
        true

    });


    this.form
      .markAsPristine();


    this.form
      .markAsUntouched();

  }


  // ============================================================
  // SELECCIONAR EMPRESA
  // ============================================================

  seleccionarEmpresa(
    item:
      RpEmpresaComplementariaResponse
  ): void {

    this.empresaSeleccionadaId =
      Number(
        item.idEmpresaComplementaria
      );


    this.form.patchValue({

      idEmpresaComplementaria:
        item.idEmpresaComplementaria,

      empresa:
        item.empresa ?? '',

      ruc:
        item.ruc ?? '',

      estado:
        item.estado === true

    });

  }


  // ============================================================
  // EDITAR
  // ============================================================

  editar(
    item:
      RpEmpresaComplementariaResponse,
    event?:
      MouseEvent
  ): void {

    if (
      event
    ) {

      event.stopPropagation();

    }


    this.seleccionarEmpresa(
      item
    );

  }


  // ============================================================
  // GRABAR
  // ============================================================

  grabar(): void {

    if (
      this.guardando
    ) {

      return;

    }


    if (
      this.form.invalid
    ) {

      this.form
        .markAllAsTouched();


      this.mostrarAdvertencia(
        'Complete correctamente los campos obligatorios.'
      );


      return;

    }


    // ==========================================================
    // DATOS
    // ==========================================================

    const id =
      Number(
        this.form
          .get('idEmpresaComplementaria')
          ?.value
        ?? 0
      );


    const empresa =
      (
        this.form
          .get('empresa')
          ?.value
        ?? ''
      )
        .toString()
        .trim();


    const ruc =
      (
        this.form
          .get('ruc')
          ?.value
        ?? ''
      )
        .toString()
        .trim();


    const estado =
      this.form
        .get('estado')
        ?.value === true;


    // ==========================================================
    // VALIDACIONES
    // ==========================================================

    if (
      empresa === ''
    ) {

      this.mostrarAdvertencia(
        'Ingrese el nombre de la empresa.'
      );


      return;

    }


    if (
      ruc === ''
    ) {

      this.mostrarAdvertencia(
        'Ingrese el RUC.'
      );


      return;

    }


    if (
      ruc.length !== 13
    ) {

      this.mostrarAdvertencia(
        'El RUC debe contener 13 dígitos.'
      );


      return;

    }


    // ==========================================================
    // PAYLOAD
    // ==========================================================

    const payload:
      CreateRpEmpresaComplementariaRequest = {

      empresa:
        empresa,

      ruc:
        ruc,

      estado:
        estado

    };


    // ==========================================================
    // CREAR / ACTUALIZAR
    // ==========================================================

    if (
      id <= 0
    ) {

      this.crearEmpresa(
        payload
      );

    }
    else {

      this.actualizarEmpresa(
        id,
        payload
      );

    }

  }


  // ============================================================
  // CREAR
  // ============================================================

  private crearEmpresa(
    payload:
      CreateRpEmpresaComplementariaRequest
  ): void {

    this.guardando =
      true;


    this.empresaService
      .create(
        payload
      )
      .pipe(

        finalize(() => {

          this.guardando =
            false;

        })

      )
      .subscribe({

        next: (
          response:
            ApiResponse<
              RpEmpresaComplementariaResponse
            >
        ) => {

          console.log(
            'Empresa creada:',
            response
          );


          this.mostrarExito(
            response.message
            ??
            'Empresa complementaria creada correctamente.'
          );


          this.nuevo();

          this.cargarEmpresas();

        },


        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error creando empresa:',
            error
          );


          this.mostrarError(
            this.obtenerMensajeError(
              error,
              'No se pudo crear la empresa complementaria.'
            )
          );

        }

      });

  }


  // ============================================================
  // ACTUALIZAR
  // ============================================================

  private actualizarEmpresa(
    id:
      number,
    payload:
      CreateRpEmpresaComplementariaRequest
  ): void {

    this.guardando =
      true;


    this.empresaService
      .update(
        id,
        payload
      )
      .pipe(

        finalize(() => {

          this.guardando =
            false;

        })

      )
      .subscribe({

        next: (
          response:
            ApiResponse<
              RpEmpresaComplementariaResponse
            >
        ) => {

          console.log(
            'Empresa actualizada:',
            response
          );


          this.mostrarExito(
            response.message
            ??
            'Empresa complementaria actualizada correctamente.'
          );


          this.nuevo();

          this.cargarEmpresas();

        },


        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error actualizando empresa:',
            error
          );


          this.mostrarError(
            this.obtenerMensajeError(
              error,
              'No se pudo actualizar la empresa complementaria.'
            )
          );

        }

      });

  }


  // ============================================================
  // BORRAR
  // ============================================================

  borrar(
    item?:
      RpEmpresaComplementariaResponse,
    event?:
      MouseEvent
  ): void {

    if (
      event
    ) {

      event.stopPropagation();

    }


    if (
      this.eliminando
    ) {

      return;

    }


    const id =
      item

        ? Number(
            item.idEmpresaComplementaria
          )

        : Number(
            this.form
              .get('idEmpresaComplementaria')
              ?.value
            ?? 0
          );


    if (
      id <= 0
    ) {

      this.mostrarAdvertencia(
        'Seleccione una empresa para eliminar.'
      );


      return;

    }


    const nombre =
      (
        item?.empresa
        ??
        this.form
          .get('empresa')
          ?.value
        ??
        ''
      )
        .toString()
        .trim();


    const confirmar =
      window.confirm(
        `¿Desea eliminar la empresa "${nombre}"?`
      );


    if (
      !confirmar
    ) {

      return;

    }


    this.eliminando =
      true;


    this.empresaService
      .delete(
        id
      )
      .pipe(

        finalize(() => {

          this.eliminando =
            false;

        })

      )
      .subscribe({

        next: (
          response:
            ApiResponse<boolean>
        ) => {

          console.log(
            'Empresa eliminada:',
            response
          );


          this.mostrarExito(
            response.message
            ??
            'Empresa complementaria eliminada correctamente.'
          );


          this.nuevo();

          this.cargarEmpresas();

        },


        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error eliminando empresa:',
            error
          );


          this.mostrarError(
            this.obtenerMensajeError(
              error,
              'No se pudo eliminar la empresa complementaria.'
            )
          );

        }

      });

  }


  // ============================================================
  // CANCELAR
  // ============================================================

  cancelar(): void {

    if (
      this.empresaSeleccionadaId !== null
    ) {

      const empresa =
        this.empresas
          .find(
            x =>
              Number(
                x.idEmpresaComplementaria
              )
              ===
              Number(
                this.empresaSeleccionadaId
              )
          );


      if (
        empresa
      ) {

        this.seleccionarEmpresa(
          empresa
        );


        return;

      }

    }


    this.nuevo();

  }


  // ============================================================
  // VALIDACIÓN CAMPO
  // ============================================================

  esCampoInvalido(
    nombreCampo:
      string
  ): boolean {

    const control =
      this.form
        .get(
          nombreCampo
        );


    return !!control
      &&
      control.invalid
      &&
      (
        control.dirty
        ||
        control.touched
      );

  }


  // ============================================================
  // ERROR API
  // ============================================================

  private obtenerMensajeError(
    error:
      HttpErrorResponse,
    mensajeDefault:
      string
  ): string {

    if (
      typeof error.error === 'string'
      &&
      error.error.trim() !== ''
    ) {

      return error.error;

    }


    if (
      error.error
      &&
      typeof error.error === 'object'
    ) {

      if (
        error.error.mensaje
      ) {

        return error.error.mensaje;

      }


      if (
        error.error.message
      ) {

        return error.error.message;

      }

    }


    return mensajeDefault;

  }


  // ============================================================
  // MENSAJES
  // ============================================================

  private mostrarExito(
    mensaje:
      string
  ): void {

    this.snackBar.open(
      mensaje,
      'Cerrar',
      {
        duration:
          4000,

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
    mensaje:
      string
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
    mensaje:
      string
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