import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TipoDocumentoService } from 'src/app/services/tipo-documento.service';
import { TipoDocumento } from 'src/app/interfaces/catalogs/tipo-documento.interface';
import { EstadoCivilService } from 'src/app/services/estado-civil.service';
import { EstadoCivil } from 'src/app/interfaces/catalogs/estado-civil.interface';
import { GeneroService } from 'src/app/services/genero.service';
import { Genero } from 'src/app/interfaces/catalogs/genero.interface';
import { LocalesResponse } from 'src/app/interfaces/responses/local-response';
import { LocalesService } from 'src/app/services/locales.service';
import { ZonaService, Zona } from 'src/app/services/zona.service';
import { CiudadService, Ciudad } from 'src/app/services/ciudad.service';
import { NacionalidadService, NacionalidadResponse } from 'src/app/services/rol/nacionalidad.service.service';
import {
  EmpleadoFichaService,
  EmpleadoFichaResponse
} from 'src/app/services/rol/empleado-ficha.service';

import {
  RpCargoResponse,
  RpCargosService
} from 'src/app/services/rol/rp-cargos.service.service';

import {
  RpTipEmpResponse,
  RpTipEmpService
} from 'src/app/services/rol/rp-tip-emp.service';

import { DepartamentoResponse } from 'src/app/interfaces/responses/departamentos-response';
import { DepartamentosService } from 'src/app/services/departamentos.service';

@Component({
  selector: 'app-empleado-ficha',
  templateUrl: './empleado-ficha.component.html',
  styleUrls: ['./empleado-ficha.component.css']
})
export class EmpleadoFichaComponent implements OnInit {

  form!: FormGroup;

  cargos: RpCargoResponse[] = [];
  departamentos: DepartamentoResponse[] = [];
  tiposEmpleado: RpTipEmpResponse[] = [];
  tiposDocumento: TipoDocumento[] = [];
  estadosCivil: EstadoCivil[] = [];
  generos: Genero[] = [];
  locales: LocalesResponse[] = [];
  zonas: Zona[] = [];
  ciudades: Ciudad[] = [];
  ciudadesTrabajo: Ciudad[] = [];
  nacionalidades: NacionalidadResponse[] = [];
  cargasColumns: string[] = [
    'codigo',
    'nombres',
    'apellidos',
    'cedula',
    'direccion',
    'telefono',
    'fechaNacimiento',
    'sexo',
    'parentesco',
    'discapacidad',
    'utilidad',
    'impRenta'
  ];

  gastosColumns: string[] = [
    'codigo',
    'tipoGasto',
    'montoMaximo',
    'valorProyectado',
    'valorReal'
  ];

  observacionColumns: string[] = [
    'fecha',
    'usuario',
    'tipo',
    'observacion'
  ];

  cargasData: any[] = [];
  gastosData: any[] = [];
  observacionData: any[] = [];


  constructor(
    private fb: FormBuilder,
    private empleadoFichaService: EmpleadoFichaService,
    private rpCargosService: RpCargosService,
    private rpTipoEmpleadoService: RpTipEmpService,
    private rpDepartamentosService: DepartamentosService,
    private tipoDocumentoService: TipoDocumentoService,
    private estadoCivilService: EstadoCivilService,
    private generoService: GeneroService,
    private localesService: LocalesService,
    private zonaService: ZonaService,
    private ciudadService: CiudadService,
    private nacionalidadService: NacionalidadService
  ) { }

  ngOnInit(): void {
    this.crearFormulario();
    this.cargarCatalogos();
  }

  crearFormulario(): void {
    this.form = this.fb.group({
      datosGenerales: this.fb.group({
        codigoEmpleado: [''],
        tipoDocumento: [null],
        identificacion: [''],
        sexo: [null],

        nombres: [''],
        apellidos: [''],
        estadoCivil: [null],
        fechaNacimiento: [''],
        linkFoto: [''],

        pais: [''],
        ciudad: [null],
        direccion: [null],
        telefono: [null],
        celular: [null],
        nacionalidad: [null],
        email: [null],
        contactoReferencia: [''],
        telefonoReferencia: [''],

        empresaAportacion: [''],
        zona: [null],
        ciudadTrabajo: [null],
        local: [null],

        departamento: [null],
        cargo: [null],
        tipoEmpleado: [null],

        grupoOcupacion: ['']
      }),

      datosAdicionales: this.fb.group({
        empleado: [''],

        noRecibeProvisiones: [false],
        pagoDecimoCuarto: [false],
        pagoDecimoTercero: [false],
        pagoFondosReserva: [false],
        terceraEdad: [false],

        nivelInstruccion: [''],
        fechaPagoDecimoInicio: [''],
        fechaPagoDecimoFin: [''],
        regimen: [''],

        gerenteRepLegal: [false],
        noPagaImpuestoRenta: [false],

        cargaConyugeUtilidades: [false],
        cargaHijosUtilidades: [''],

        codigoBanco: [''],
        ctaContableEmpleado: [''],
        formaPago: [''],
        tipoCuenta: [''],
        numeroCuenta: [''],
        codigoBancoEmpleado: [''],

        establecimiento: [''],
        codigoSectorialIess: [''],
        grupoSanguineo: [''],
        rucEmpresaComplementaria: [''],
        libretaMilitar: ['']
      }),

      datosSalariales: this.fb.group({
        empleado: [''],
        fechaSalario: [''],
        salario: [''],
        valorHoraNormal: [''],
        valorHoraEspecial: [''],
        incluyeAportacion: [false],
        anticipoQuincenal1: [''],
        anticipoQuincenal2: [''],
        retencionJudicial: [false],
        valoresRetencion: ['']
      }),

      datosAcademicos: this.fb.group({
        empleado: [''],
        educacionPrimaria: [''],
        educacionSuperior: [''],
        educacionSecundaria: [''],
        cursosMaestriasPosgrados: ['']
      }),

      datosEspeciales: this.fb.group({
        empleado: [''],
        residenciaTrabajador: [''],
        aplicaConvenio: [''],
        sistemaSalarioNeto: [''],
        paisResidencia: [''],
        beneficioGalapagos: [false],

        ingresosAgraviados: [''],
        aportePersonalIess: [''],
        valorImpuestoRetenido: [''],
        compensacionEconomicaDigna: [''],

        discapacitado: [false],
        carnetConadis: [''],
        condicionTrabajador: [''],
        tipoDiscapacidad: [''],
        porcentajeDiscapacidad: [''],
        discapacitadoSustituto: [false],
        descripcionDiscapacidad: [''],
        tipoIdentidad: [''],
        identificacion: [''],
        nombreDiscapacidad: ['']
      })
    });
  }

  cargarCatalogos(): void {
    forkJoin({
      departamentos: this.rpDepartamentosService.getDepartamentos(),
      cargos: this.rpCargosService.getAll(),
      tiposEmpleado: this.rpTipoEmpleadoService.getAll(),
      tiposDocumento: this.tipoDocumentoService.getTiposDocumento(),
      estadosCivil: this.estadoCivilService.getEstadoCivil(),
      generos: this.generoService.getGeneros(),
      locales: this.localesService.getAll(),
      zonas: this.zonaService.obtenerZona(),
      ciudades: this.ciudadService.obtenerCiudad(),
      ciudadesTrabajo: this.ciudadService.obtenerCiudad(),
      nacionalidades: this.nacionalidadService.getAll()

    }).subscribe({
      next: ({ departamentos, cargos, tiposEmpleado, tiposDocumento, estadosCivil, generos, locales, zonas, ciudades, ciudadesTrabajo, nacionalidades }) => {
        this.departamentos = departamentos.map(dep => ({
          ...dep,
          id_departamento: Number(dep.id_departamento)
        }));

        this.cargos = cargos.map(cargo => ({
          ...cargo,
          idCargo: Number(cargo.idCargo)
        }));

        this.tiposEmpleado = tiposEmpleado.map(tipo => ({
          ...tipo,
          idTipemp: Number(tipo.idTipemp)
        }));

        this.tiposDocumento = tiposDocumento.map(tipo => ({
          ...tipo,
          idTipoDocumento: Number(tipo.idTipoDocumento)
        }));

        this.estadosCivil = estadosCivil.map(ec => ({
          ...ec,
          estadoCivilCodigo: Number(ec.estadoCivilCodigo)
        }));
        this.generos = generos.map(g => ({
          ...g,
          generoCodigo: Number(g.generoCodigo)
        }));
        this.locales = (locales.data ?? []).map(l => ({
          ...l,
          id: Number(l.id)
        }));
        this.zonas = zonas.map(z => ({
          ...z,
          id: Number(z.id)
        }));
        this.ciudades = ciudades.map(c => ({
          ...c,
          id_ciudad: Number(c.id_ciudad)
        }));
        this.ciudadesTrabajo = ciudadesTrabajo.map(c => ({
          ...c,
          id_ciudad: Number(c.id_ciudad)
        }));
        this.nacionalidades = nacionalidades.map(n => ({
          ...n,
          id_nacionalidad: Number(n.id_nacionalidad)
        }));
        this.cargarFichaEmpleado();
      },
      error: (err: any) => {
        console.error('Error al cargar catálogos:', err);
      }
    });
  }

  cargarFichaEmpleado(idEmpleado?: number): void {
    this.empleadoFichaService.getFicha(idEmpleado).subscribe({
      next: (resp) => {
        if (resp.type !== 'LIST' || !resp.data || resp.data.length === 0) {
          console.warn(resp.message || 'No se encontró empleado');
          return;
        }

        const emp: EmpleadoFichaResponse = resp.data[0];

        const nombreCompleto =
          emp.nombre ||
          `${emp.apellidos ?? ''} ${emp.nombres ?? ''}`.trim();

        this.form.patchValue({
          datosGenerales: {
            codigoEmpleado: emp.idEmpleado,
            identificacion: emp.documento ?? '',
            nombres: emp.nombres ?? '',
            apellidos: emp.apellidos ?? '',
            fechaNacimiento: emp.fecNac ?? '',
            zona: Number(emp.idZona),

            departamento: Number(emp.id_departamento),
            cargo: Number(emp.idCargo),
            tipoEmpleado: Number(emp.idTipemp),
            tipoDocumento: Number(emp.idTipoDocumento),
            estadoCivil: Number(emp.estadoCivilCodigo),
            sexo: Number(emp.generoCodigo),
            local: Number(emp.id),
            ciudad: Number(emp.idCiudad),
            ciudadTrabajo: Number(emp.idCiudadTrabajo),
            direccion:emp.direccion ?? '',
            telefono: emp.telefono ?? '',
            email: emp.mail ?? '',
            nacionalidad: Number(emp.id_nacionalidad),
            empresaAportacion: emp.empresa ?? ''
            
          },

          datosAdicionales: {
            empleado: nombreCompleto,
            ctaContableEmpleado: emp.ctaCble ?? ''
          },

          datosSalariales: {
            empleado: nombreCompleto
          },

          datosAcademicos: {
            empleado: nombreCompleto
          },

          datosEspeciales: {
            empleado: nombreCompleto,
            identificacion: emp.documento ?? ''
          }
        });

        console.log(
          'Departamento seleccionado:',
          this.form.get('datosGenerales.departamento')?.value
        );

        console.log('Departamentos catálogo:', this.departamentos);
      },
      error: (err: any) => {
        console.error('Error al cargar ficha de empleado:', err);
      }
    });
  }

  nuevo(): void {
    this.form.reset({
      datosGenerales: {
        tipoDocumento: null,
        sexo: null,
        departamento: null,
        cargo: null,
        tipoEmpleado: null
      }
    });
  }

  grabar(): void {
    console.log('Formulario:', this.form.value);
  }

  borrar(): void {
    console.log('Borrar');
  }

  cancelar(): void {
    console.log('Cancelar');
  }

  agregarNomina(): void {
    console.log('Agregar Nómina');
  }

  imprimir(): void {
    console.log('Imprimir');
  }

  actualizarCargas(): void {
    console.log('Actualizar Cargas');
  }

  actualizarObservacion(): void {
    console.log('Actualizar Observación');
  }

  reporte(): void {
    console.log('Reporte');
  }
}