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
  debounceTime,
  distinctUntilChanged,
  finalize
} from 'rxjs/operators';

import {
  UsuarioService
} from 'src/app/services/usuario.service';

import {
  EmpleadoBusquedaResponse,
  EmpleadoFichaService
} from 'src/app/services/rol/empleado-ficha.service';

import {
  CalcularJubilacionPatronalRequest,
  JubilacionPatronalResponse,
  JubilacionPatronalService
} from 'src/app/services/rol/jubilacion-patronal.service';


@Component({
  selector: 'app-jubilacion-patronal',
  templateUrl: './jubilacion-patronal.component.html',
  styleUrls: ['./jubilacion-patronal.component.css']
})
export class JubilacionPatronalComponent
  implements OnInit {

  // ==========================================================
  // USUARIO
  // ==========================================================

  usuarioActual =
    this.usuarioService
      .getUsuarioActual();


  // ==========================================================
  // FORMULARIO
  // ==========================================================

  form!: FormGroup;


  // ==========================================================
  // ESTADOS
  // ==========================================================

  cargando = false;

  cargandoEmpleados = false;

  mostrarReporte = false;


  // ==========================================================
  // EMPLEADOS
  // ==========================================================

  empleadosBusqueda:
    EmpleadoBusquedaResponse[] = [];

  empleadosFiltrados:
    EmpleadoBusquedaResponse[] = [];


  // ==========================================================
  // RESULTADO
  // ==========================================================

  resultado:
    JubilacionPatronalResponse |
    null = null;


  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor(
    private readonly fb:
      FormBuilder,

    private readonly jubilacionPatronalService:
      JubilacionPatronalService,

    private readonly usuarioService:
      UsuarioService,

    private readonly empleadoFichaService:
      EmpleadoFichaService
  ) {}


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit():
    void {

    this.crearFormulario();

    this.configurarBusquedaEmpleado();

    this.cargarEmpleadosBusqueda('');
  }


  // ==========================================================
  // FORMULARIO
  // ==========================================================

  private crearFormulario():
    void {

    this.form =
      this.fb.group({

        idEmpresa: [
          this.usuarioActual?.id_empresa
          ??
          1,
          [
            Validators.required,
            Validators.min(1)
          ]
        ],

        idEmpleado: [
          null,
          Validators.required
        ],

        empleadoBusqueda: [
          ''
        ],

        fechaCalculo: [
          this.obtenerFechaActual(),
          Validators.required
        ],

        tipoSalida: [
          'RENUNCIA',
          Validators.required
        ]
      });
  }


  // ==========================================================
  // BÚSQUEDA EMPLEADO
  // ==========================================================

  private configurarBusquedaEmpleado():
    void {

    this.form
      .get('empleadoBusqueda')
      ?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(
        valor => {

          if (
            typeof valor === 'object'
            &&
            valor !== null
          ) {
            return;
          }


          const texto =
            (
              valor
              ??
              ''
            )
              .toString()
              .trim();


          this.form
            .get('idEmpleado')
            ?.setValue(
              null,
              {
                emitEvent: false
              }
            );


          this.resultado = null;


          this.cargarEmpleadosBusqueda(
            texto
          );
        }
      );
  }


  // ==========================================================
  // CARGAR EMPLEADOS
  // ==========================================================

  cargarEmpleadosBusqueda(
    texto: string = ''
  ): void {

    this.cargandoEmpleados = true;


    this.empleadoFichaService
      .getBusqueda(texto)
      .pipe(
        finalize(
          () => {
            this.cargandoEmpleados = false;
          }
        )
      )
      .subscribe({

        next:
          resp => {

            this.empleadosBusqueda =
              resp.data
              ??
              [];

            this.empleadosFiltrados =
              this.empleadosBusqueda;
          },


        error:
          error => {

            console.error(
              'Error cargando empleados:',
              error
            );

            this.empleadosBusqueda = [];

            this.empleadosFiltrados = [];

            alert(
              'No fue posible cargar los empleados.'
            );
          }

      });
  }


  // ==========================================================
  // SELECCIONAR EMPLEADO
  // ==========================================================

  seleccionarEmpleadoBusqueda(
    emp: EmpleadoBusquedaResponse
  ): void {

    if (!emp) {
      return;
    }


    const idEmpleado =
      Number(
        emp.idEmpleado
      );


    if (
      !Number.isFinite(idEmpleado)
      ||
      idEmpleado <= 0
    ) {

      alert(
        'El empleado seleccionado no tiene un código válido.'
      );

      return;
    }


    this.form.patchValue(
      {
        idEmpleado:
          idEmpleado,

        empleadoBusqueda:
          emp.nombreCompleto
          ??
          ''
      },
      {
        emitEvent:
          false
      }
    );


    this.resultado = null;
  }


  // ==========================================================
  // DISPLAY
  // ==========================================================

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
      typeof empleado ===
      'string'
    ) {
      return empleado;
    }


    return empleado.nombreCompleto
      ??
      '';
  }


  // ==========================================================
  // LIMPIAR EMPLEADO
  // ==========================================================

  limpiarBusquedaEmpleado(
    event?: MouseEvent
  ): void {

    if (event) {
      event.preventDefault();
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
        emitEvent:
          false
      }
    );


    this.resultado = null;

    this.empleadosBusqueda = [];

    this.empleadosFiltrados = [];


    this.cargarEmpleadosBusqueda('');
  }


  // ==========================================================
  // CALCULAR
  // ==========================================================

  calcular():
    void {

    if (
      this.cargando
    ) {
      return;
    }


    if (
      this.form.invalid
    ) {

      this.form
        .markAllAsTouched();


      if (
        !this.form
          .get('idEmpleado')
          ?.value
      ) {

        alert(
          'Debe seleccionar un empleado.'
        );

        return;
      }


      alert(
        'Complete los campos obligatorios.'
      );

      return;
    }


    const value =
      this.form
        .getRawValue();


    const idEmpresa =
      Number(
        value.idEmpresa
      );


    const idEmpleado =
      Number(
        value.idEmpleado
      );


    if (
      !Number.isFinite(idEmpresa)
      ||
      idEmpresa <= 0
    ) {

      alert(
        'No se pudo determinar la empresa.'
      );

      return;
    }


    if (
      !Number.isFinite(idEmpleado)
      ||
      idEmpleado <= 0
    ) {

      alert(
        'Debe seleccionar un empleado.'
      );

      return;
    }


    const request:
      CalcularJubilacionPatronalRequest = {

        idEmpresa:
          idEmpresa,

        idEmpleado:
          idEmpleado,

        fechaCalculo:
          value.fechaCalculo,

        tipoSalida:
          value.tipoSalida
      };


    this.cargando = true;

    this.resultado = null;


    this.jubilacionPatronalService
      .calcular(request)
      .pipe(
        finalize(
          () => {
            this.cargando = false;
          }
        )
      )
      .subscribe({

        next:
          response => {

            if (!response) {

              alert(
                'El backend no devolvió información.'
              );

              return;
            }


            this.resultado =
              response;
          },


        error:
          error => {

            console.error(
              'Error Jubilación Patronal:',
              error
            );


            this.resultado = null;


            let mensaje =
              'Error al calcular Jubilación Patronal.';


            if (
              error?.error?.message
            ) {

              mensaje =
                error.error.message;
            }
            else if (
              error?.error?.title
            ) {

              mensaje =
                error.error.title;
            }
            else if (
              error?.message
            ) {

              mensaje =
                error.message;
            }


            alert(
              mensaje
            );
          }

      });
  }


  // ==========================================================
  // VER REPORTE
  // ==========================================================

  verReporte():
    void {

    if (
      !this.resultado
    ) {

      alert(
        'Primero debe calcular la Jubilación Patronal.'
      );

      return;
    }


    this.mostrarReporte = true;
  }


  // ==========================================================
  // CERRAR REPORTE
  // ==========================================================

  cerrarReporte():
    void {

    this.mostrarReporte = false;
  }


  // ==========================================================
  // LIMPIAR
  // ==========================================================

  limpiar():
    void {

    this.form.patchValue(
      {

        idEmpresa:
          this.usuarioActual?.id_empresa
          ??
          1,

        idEmpleado:
          null,

        empleadoBusqueda:
          '',

        fechaCalculo:
          this.obtenerFechaActual(),

        tipoSalida:
          'RENUNCIA'
      },
      {
        emitEvent:
          false
      }
    );


    this.resultado = null;

    this.mostrarReporte = false;

    this.empleadosBusqueda = [];

    this.empleadosFiltrados = [];


    this.cargarEmpleadosBusqueda('');
  }


  // ==========================================================
  // TIEMPO SERVICIO
  // ==========================================================

  get tiempoServicio():
    string {

    if (!this.resultado) {
      return '';
    }


    return (
      `${this.resultado.aniosServicio} año(s), ` +
      `${this.resultado.mesesServicio} mes(es), ` +
      `${this.resultado.diasServicio} día(s)`
    );
  }


  // ==========================================================
  // FORMATEAR NÚMERO
  // ==========================================================

  formatearNumero(
    value: any
  ): string {

    const numero =
      Number(
        value
        ??
        0
      );


    if (
      !Number.isFinite(numero)
    ) {
      return '0.00';
    }


    return numero
      .toLocaleString(
        'en-US',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      );
  }


  // ==========================================================
  // FECHA
  // ==========================================================

  formatearFecha(
    value:
      string |
      null |
      undefined
  ): string {

    if (!value) {
      return '-';
    }


    const partes =
      value
        .substring(0, 10)
        .split('-');


    if (
      partes.length !== 3
    ) {
      return value;
    }


    return (
      `${partes[2]}/` +
      `${partes[1]}/` +
      `${partes[0]}`
    );
  }


  // ==========================================================
  // FECHA ACTUAL
  // ==========================================================

  private obtenerFechaActual():
    string {

    const hoy =
      new Date();


    const year =
      hoy.getFullYear();


    const month =
      String(
        hoy.getMonth() + 1
      )
        .padStart(
          2,
          '0'
        );


    const day =
      String(
        hoy.getDate()
      )
        .padStart(
          2,
          '0'
        );


    return (
      `${year}-${month}-${day}`
    );
  }
}