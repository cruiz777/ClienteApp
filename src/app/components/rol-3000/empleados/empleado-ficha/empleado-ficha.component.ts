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
import { RpRegimenService } from 'src/app/services/rol/regimen.service';
import { RpTipoSangreService } from 'src/app/services/rol/tipo-sangre.service';
import { RpRegimenResponse } from 'src/app/interfaces/responses/regimen-response';
import { RpTipoSangreResponse } from 'src/app/interfaces/responses/tipo-sangre-response';
import { RpNivelInstruccionResponse } from 'src/app/interfaces/responses/nivel-instruccion.response';
import { RpNivelInstruccionService } from 'src/app/services/nivel-instruccion.service';
import { ColDef } from 'ag-grid-community';
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
import { RpGrupoOcupacionalService, RpGrupoOcupacional } from 'src/app/services/rol/rp-grupo-ocupacional.service.service';

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
  gruposOcupacionales: RpGrupoOcupacional[] = [];
  regimenes: RpRegimenResponse[] = [];
  tiposSangre: RpTipoSangreResponse[] = [];

  nivelesInstruccion: RpNivelInstruccionResponse[] = [];

cronologiaRowData = [
  {
    fechaIngreso: '',
    fechaSalida: '',
    terminacionContrato: '',
    tipoContrato: '',
    numeroHoras: null
  },
  {
    fechaIngreso: '',
    fechaSalida: '',
    terminacionContrato: '',
    tipoContrato: '',
    numeroHoras: null
  },
  {
    fechaIngreso: '',
    fechaSalida: '',
    terminacionContrato: '',
    tipoContrato: '',
    numeroHoras: null
  }
];

cronologiaColumnDefs: ColDef[] = [
  {
    headerName: 'Fecha Ingreso',
    field: 'fechaIngreso',
    editable: true,
    cellEditor: 'agDateStringCellEditor'
  },
  {
    headerName: 'Fecha Salida',
    field: 'fechaSalida',
    editable: true,
    cellEditor: 'agDateStringCellEditor'
  },
  {
    headerName: 'Terminación Contrato',
    field: 'terminacionContrato',
    editable: true
  },
  {
    headerName: 'Tipo de Contrato',
    field: 'tipoContrato',
    editable: true
  },
  {
    headerName: 'N° Horas',
    field: 'numeroHoras',
    editable: true,
    type: 'numericColumn'
  }
];

cronologiaDefaultColDef: ColDef = {
  flex: 1,
  minWidth: 120,
  resizable: true,
  sortable: false,
  filter: false
};

referenciaRowData = [
  {
    contactoReferencia: '',
    telefonoReferencia: ''
  }
];

referenciaColumnDefs: ColDef[] = [
  {
    headerName: 'Contacto de Referencia',
    field: 'contactoReferencia',
    editable: true,
    flex: 1
  },
  {
    headerName: 'Teléfono de Referencia',
    field: 'telefonoReferencia',
    editable: true,
    flex: 1
  }
];

referenciaDefaultColDef: ColDef = {
  resizable: true,
  sortable: false,
  filter: false
};

bancoRowData = [
  {
    codigoBanco: '',
    ctaContableEmpleado: '',
    formaPago: '',
    tipoCuenta: '',
    numeroCuenta: '',
    codigoBancoEmpleado: ''
  }
];

bancoColumnDefs: ColDef[] = [
  {
    headerName: 'Código Banco',
    field: 'codigoBanco',
    editable: true
  },
  {
    headerName: 'Cta Contable Empleado',
    field: 'ctaContableEmpleado',
    editable: true
  },
  {
    headerName: 'Forma de Pago',
    field: 'formaPago',
    editable: true
  },
  {
    headerName: 'Tipo de Cuenta',
    field: 'tipoCuenta',
    editable: true
  },
  {
    headerName: 'N° Cuenta',
    field: 'numeroCuenta',
    editable: true
  },
  {
    headerName: 'Código Banco Empleado',
    field: 'codigoBancoEmpleado',
    editable: true
  }
];

bancoDefaultColDef: ColDef = {
  flex: 1,
  minWidth: 150,
  resizable: true,
  sortable: false,
  filter: false
};
cargasRowData: any[] = [];

cargasColumnDefs: ColDef[] = [
  { headerName: 'Código', field: 'codigo', width: 100 },
  { headerName: 'Nombres', field: 'nombres', minWidth: 160 },
  { headerName: 'Apellidos', field: 'apellidos', minWidth: 160 },
  { headerName: 'Cédula', field: 'cedula', width: 130 },
  { headerName: 'Dirección', field: 'direccion', minWidth: 220 },
  { headerName: 'Teléfono', field: 'telefono', width: 130 },
  { headerName: 'Fecha Nacim.', field: 'fechaNacimiento', width: 140 },
  { headerName: 'Sexo', field: 'sexo', width: 100 },
  { headerName: 'Parentesco', field: 'parentesco', width: 130 },
  { headerName: 'Discapacidad', field: 'discapacidad', width: 140 },
  { headerName: 'Utilidad', field: 'utilidad', width: 110 },
  { headerName: 'Imp. Rent.', field: 'impRenta', width: 120 }
];

cargasDefaultColDef: ColDef = {
  resizable: true,
  sortable: true,
  filter: true,
  floatingFilter: false
};
  
gastosRowData: any[] = [];

gastosColumnDefs: ColDef[] = [
  {
    headerName: 'Código',
    field: 'codigo',
    width: 120
  },
  {
    headerName: 'Tipo de Gasto',
    field: 'tipoGasto',
    minWidth: 220,
    flex: 1
  },
  {
    headerName: 'Monto Máximo',
    field: 'montoMaximo',
    width: 160,
    type: 'numericColumn'
  },
  {
    headerName: 'Valor Proyectado',
    field: 'valorProyectado',
    width: 170,
    type: 'numericColumn',
    editable: true
  },
  {
    headerName: 'Valor Real',
    field: 'valorReal',
    width: 160,
    type: 'numericColumn',
    editable: true
  }
];

gastosDefaultColDef: ColDef = {
  resizable: true,
  sortable: true,
  filter: true,
  floatingFilter: false
};
observacionRowData: any[] = [];

observacionColumnDefs: ColDef[] = [
  {
    headerName: 'Fecha',
    field: 'fecha',
    width: 160
  },
  {
    headerName: 'Usuario',
    field: 'usuario',
    width: 180
  },
  {
    headerName: 'Tipo',
    field: 'tipo',
    width: 160
  },
  {
    headerName: 'Observación',
    field: 'observacion',
    flex: 1,
    minWidth: 300,
    editable: true,
    wrapText: true,
    autoHeight: true
  }
];

observacionDefaultColDef: ColDef = {
  resizable: true,
  sortable: true,
  filter: true,
  floatingFilter: false
};
academicosRowData = [
  {
    nivel: 'Educación Primaria',
    detalle: ''
  },
  {
    nivel: 'Educación Secundaria',
    detalle: ''
  },
  {
    nivel: 'Educación Superior',
    detalle: ''
  },
  {
    nivel: 'Cursos, Maestrías y Posgrados',
    detalle: ''
  }
];

academicosColumnDefs: ColDef[] = [
  {
    headerName: 'Nivel Académico',
    field: 'nivel',
    width: 260,
    editable: false
  },
  {
    headerName: 'Detalle',
    field: 'detalle',
    flex: 1,
    editable: true,
    wrapText: true,
    autoHeight: true,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorPopup: true,
    cellEditorParams: {
      maxLength: 1000,
      rows: 6,
      cols: 50
    }
  }
];

academicosDefaultColDef: ColDef = {
  resizable: true,
  sortable: false,
  filter: false
};
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
    private nacionalidadService: NacionalidadService,
    private grupoOcupacionalService: RpGrupoOcupacionalService,
    private nivelInstruccionService: RpNivelInstruccionService,
    private regimenService: RpRegimenService,
    private tipoSangreService: RpTipoSangreService
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
        linkFoto: [null],

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

        grupoOcupacion: [null]
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
        salario: [null],
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
    const salarioCtrl = this.form.get('datosSalariales.salario');

    salarioCtrl?.valueChanges.subscribe(valor => {
      this.aplicarReglaSueldoManual(valor);
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
      nacionalidades: this.nacionalidadService.getAll(),
      gruposOcupacionales: this.grupoOcupacionalService.getAll(),
      regimenes: this.regimenService.getAll(),
      tiposSangre: this.tipoSangreService.getAll(),

    }).subscribe({
      next: ({ departamentos, cargos, tiposEmpleado, tiposDocumento, estadosCivil, generos, locales, zonas, ciudades, ciudadesTrabajo, nacionalidades, gruposOcupacionales, regimenes, tiposSangre }) => {
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
        this.gruposOcupacionales = gruposOcupacionales.data.map(g => ({
          ...g,
          id_grupo_ocupacional: Number(g.id_grupo_ocupacional)
        }));
        this.regimenes = (regimenes.data ?? []).map(r => ({
          ...r,
          id_regimen: Number(r.id_regimen)
        }));

        this.tiposSangre = (tiposSangre.data ?? []).map(t => ({
          ...t,
          id_tipo_sangre: Number(t.idTipoSangre)
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
        const sueldoEmpleado =
          emp.sueldo ??
          (emp as any).Sueldo ??
          (emp as any).salario ??
          (emp as any).Salario ??
          null;
        const tieneSueldo = emp.sueldo !== null && emp.sueldo !== undefined && Number(emp.sueldo) !== 0;
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
            direccion: emp.direccion ?? '',
            telefono: emp.telefono ?? '',
            email: emp.mail ?? '',
            nacionalidad: Number(emp.id_nacionalidad),
            empresaAportacion: emp.empresa ?? '',
            grupoOcupacion: Number(emp.id_grupo_ocupacional),
            linkFoto: emp.foto ?? null,



          },

          datosAdicionales: {
            empleado: nombreCompleto,
            ctaContableEmpleado: emp.ctaCble ?? '',
            noRecibeProvisiones: emp.proviciones === true,
            pagoDecimoCuarto: emp.decimos === true,
            pagoDecimoTercero: emp.decimo3ro === true,
            pagoFondosReserva: emp.freserva === true,
            terceraEdad: emp.teredad === true,
            noPagaImpuestoRenta: emp.imp_renta === true,
            cargaConyugeUtilidades: emp.carcony === true,
            cargaHijosUtilidades: emp.carhijos ?? 0,
            gerenteRepLegal: emp.rep_legal === true,
            fechaPagoDecimoInicio: emp.feinivac ?? '',
            fechaPagoDecimoFin: emp.fefinvac ?? '',
            regimen: emp.id_regimen ?? '',
            grupoSanguineo: emp.id_tipo_sangre ?? '',
            establecimiento: emp.establecimiento ?? '',
            libretaMilitar: emp.lmilitar ?? ''
          },

          datosSalariales: {
            empleado: nombreCompleto,
            fechaSalario: emp.fecha_sueldo ?? '',
            salario: tieneSueldo ? sueldoEmpleado : '',
            incluyeAportacion: false,
            retencionJudicial: emp.ret_judicial === true,
            anticipoQuincenal1: emp.quincena ?? 0,
            anticipoQuincenal2: emp.quincenaIi ?? 0,
            valoresRetencion: emp.valor_retencion_j ?? 0,
            valorHoraNormal: emp.valor_hora ?? 0,
            valorHoraEspecial: emp.valor_hora_espe ?? 0,

          },

          datosAcademicos: {
            empleado: nombreCompleto
          },

          datosEspeciales: {
            empleado: nombreCompleto,
            identificacion: emp.documento ?? '',
            discapacitado: emp.discap === true
          }
        });
        this.aplicarReglaSueldo(sueldoEmpleado);
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
  limpiarFoto(): void {
    this.form.get('datosGenerales.linkFoto')?.setValue('');
  }
  aplicarReglaSueldo(sueldo: any): void {

    const salarioCtrl = this.form.get('datosSalariales.salario');
    const incluyeCtrl = this.form.get('datosSalariales.incluyeAportacion');

    const tieneSueldo =
      sueldo !== null &&
      sueldo !== undefined &&
      Number(sueldo) !== 0;

    if (tieneSueldo) {

      salarioCtrl?.setValue(sueldo);

      incluyeCtrl?.setValue(false);

      incluyeCtrl?.disable();

    } else {

      salarioCtrl?.setValue('');

      incluyeCtrl?.enable();
    }
  }
  aplicarReglaSueldoManual(valor: any): void {
    const incluyeCtrl = this.form.get('datosSalariales.incluyeAportacion');

    const tieneSueldo =
      valor !== null &&
      valor !== undefined &&
      valor !== '' &&
      Number(valor) !== 0;

    if (tieneSueldo) {
      incluyeCtrl?.setValue(false, { emitEvent: false });
      incluyeCtrl?.disable({ emitEvent: false });
    } else {
      incluyeCtrl?.enable({ emitEvent: false });
    }
  }
}