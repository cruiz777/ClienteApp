import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';

interface CargaFamiliar {
  codigo: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  direccion: string;
  telefono: string;
  fechaNacimiento: string;
  sexo: string;
  parentesco: string;
  discapacidad: string;
  utilidad: string;
  impRenta: string;
}

interface GastoPersonal {
  codigo: string;
  tipoGasto: string;
  montoMaximo: number;
  valorProyectado: number;
  valorReal: number;
}

interface ObservacionItem {
  fecha: string;
  usuario: string;
  tipo: string;
  observacion: string;
}

@Component({
  selector: 'app-empleado-ficha',
  templateUrl: './empleado-ficha.component.html',
  styleUrls: ['./empleado-ficha.component.css']
})
export class EmpleadoFichaComponent implements OnInit {
  form!: FormGroup;

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

  cargasData: CargaFamiliar[] = [
    {
      codigo: 1,
      nombres: 'María',
      apellidos: 'Pérez',
      cedula: '1712345678',
      direccion: 'Quito Norte',
      telefono: '0999999999',
      fechaNacimiento: '2015-04-10',
      sexo: 'F',
      parentesco: 'Hija',
      discapacidad: 'No',
      utilidad: 'Sí',
      impRenta: 'No'
    },
    {
      codigo: 2,
      nombres: 'Carlos',
      apellidos: 'Pérez',
      cedula: '1700000001',
      direccion: 'Quito Norte',
      telefono: '0988888888',
      fechaNacimiento: '2012-08-20',
      sexo: 'M',
      parentesco: 'Hijo',
      discapacidad: 'No',
      utilidad: 'Sí',
      impRenta: 'No'
    }
  ];

  gastosData: GastoPersonal[] = [
    {
      codigo: 'GP001',
      tipoGasto: 'Vivienda',
      montoMaximo: 3500,
      valorProyectado: 2500,
      valorReal: 2100
    },
    {
      codigo: 'GP002',
      tipoGasto: 'Educación',
      montoMaximo: 3200,
      valorProyectado: 2800,
      valorReal: 2600
    }
  ];

  observacionData: ObservacionItem[] = [
    {
      fecha: '2026-04-15',
      usuario: 'admin',
      tipo: 'General',
      observacion: 'Empleado creado con datos iniciales de prueba.'
    },
    {
      fecha: '2026-04-16',
      usuario: 'rrhh',
      tipo: 'Actualización',
      observacion: 'Se actualizó información salarial.'
    }
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      datosGenerales: this.fb.group({
        codigoEmpleado: [''],
        tipoDocumento: ['cedula'],
        identificacion: [''],
        sexo: ['M'],
        nombres: [''],
        apellidos: [''],
        estadoCivil: [''],
        fechaNacimiento: [''],
        linkFoto: [''],
        pais: [''],
        ciudad: [''],
        direccion: [''],
        telefono: [''],
        celular: [''],
        nacionalidad: [''],
        email: [''],
        contactoReferencia: [''],
        telefonoReferencia: [''],
        empresaAportacion: [''],
        zona: [''],
        ciudadTrabajo: [''],
        local: [''],
        departamento: [''],
        cargo: [''],
        tipoEmpleado: [''],
        grupoOcupacion: ['']
      }),

      datosAdicionales: this.fb.group({
        empleado: [''],
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
        libretaMilitar: [''],
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
        cargaHijosUtilidades: ['']
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
        educacionSecundaria: [''],
        educacionSuperior: [''],
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

    this.cargarDatosPrueba();
  }

  cargarDatosPrueba(): void {
    this.form.patchValue({
      datosGenerales: {
        codigoEmpleado: 'EMP-001',
        tipoDocumento: 'cedula',
        identificacion: '1712345678',
        sexo: 'M',
        nombres: 'Mario',
        apellidos: 'Valencia',
        estadoCivil: 'Soltero',
        fechaNacimiento: '1990-03-15',
        linkFoto: '',
        pais: 'Ecuador',
        ciudad: 'Quito',
        direccion: 'Av. Amazonas y Colón',
        telefono: '022345678',
        celular: '0991234567',
        nacionalidad: 'Ecuatoriana',
        email: 'mario@email.com',
        contactoReferencia: 'Ana Pérez',
        telefonoReferencia: '0987654321',
        empresaAportacion: 'Clínica Pasteur',
        zona: 'Quito',
        ciudadTrabajo: 'Quito',
        local: 'Matriz',
        departamento: 'Sistemas',
        cargo: 'Analista',
        tipoEmpleado: 'Fijo',
        grupoOcupacion: 'Administrativo'
      },
      datosAdicionales: {
        empleado: 'Mario Valencia',
        codigoBanco: 'PICHINCHA',
        formaPago: 'Transferencia',
        tipoCuenta: 'Ahorros',
        numeroCuenta: '2200112233',
        grupoSanguineo: 'O+',
        nivelInstruccion: 'Superior',
        regimen: 'General'
      },
      datosSalariales: {
        empleado: 'Mario Valencia',
        fechaSalario: '2026-04-01',
        salario: '1200',
        valorHoraNormal: '5',
        valorHoraEspecial: '7',
        anticipoQuincenal1: '20',
        anticipoQuincenal2: '20'
      },
      datosAcademicos: {
        empleado: 'Mario Valencia',
        educacionPrimaria: 'Escuela ABC',
        educacionSecundaria: 'Colegio XYZ',
        educacionSuperior: 'Ingeniería en Sistemas',
        cursosMaestriasPosgrados: 'Diplomado en Desarrollo de Software'
      },
      datosEspeciales: {
        empleado: 'Mario Valencia',
        residenciaTrabajador: 'Ecuador',
        aplicaConvenio: 'No',
        sistemaSalarioNeto: 'No',
        paisResidencia: 'Ecuador',
        tipoIdentidad: 'Cédula',
        identificacion: '1712345678'
      }
    });
  }

  nuevo(): void {
    this.form.reset();
  }

  grabar(): void {
    console.log('Formulario completo:', this.form.value);
  }

  borrar(): void {
    console.log('Borrar registro');
  }

  cancelar(): void {
    console.log('Cancelar');
  }

  agregarNomina(): void {
    console.log('Agregar nómina');
  }

  imprimir(): void {
    console.log('Imprimir');
  }

  actualizarCargas(): void {
    console.log('Actualizar cargas');
  }

  actualizarObservacion(): void {
    console.log('Actualizar observación');
  }

  reporte(): void {
    console.log('Reporte');
  }
}