import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface DecimoCuartoDetalle {
  posicion: number;
  local: string;
  noAfiliacion: number;
  cedula: string;
  codSectorial: string;
  nombre: string;
  numeroDias: number;
  decimoCuarto: number;
  fechaIng: string;
  fechaSal: string;
  observacion: string;
}

@Component({
  selector: 'app-decimo-cuarto',
  templateUrl: './decimo-cuarto.component.html',
  styleUrls: ['./decimo-cuarto.component.css']
})
export class DecimoCuartoComponent implements OnInit {
  form!: FormGroup;

  displayedColumns: string[] = [
    'posicion',
    'local',
    'noAfiliacion',
    'cedula',
    'codSectorial',
    'nombre',
    'numeroDias',
    'decimoCuarto',
    'fechaIng',
    'fechaSal',
    'observacion'
  ];

  dataSource: DecimoCuartoDetalle[] = [];

  empresas: string[] = ['Clínica Pasteur'];
  regiones: string[] = ['Sierra', 'Costa', 'Amazonía'];
  tiposEmpleado: string[] = ['Fijos', 'Temporales', 'Todos'];

  resumen = {
    totalDecimoCuarto: 92826.35,
    descuento: 0,
    decimoPagadoNomina: 0,
    retencionJudicial: 393.77,
    liquidoRecibir: 92432.58
  };

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarDatosMock();
  }

  inicializarFormulario(): void {
    this.form = this.fb.group({
      patronal: ['1308075', Validators.required],
      sucursal: ['1'],
      empresa: ['Clínica Pasteur', Validators.required],
      periodo: ['31/10/2025', Validators.required],
      tipoEmpleado: ['Fijos', Validators.required],
      region: ['Sierra', Validators.required],
      desde: ['01/08/2025', Validators.required],
      hasta: ['13/09/2025', Validators.required]
    });
  }

  cargarDatosMock(): void {
    this.dataSource = [
      {
        posicion: 1,
        local: 'Administrativo',
        noAfiliacion: 1,
        cedula: '1716851714',
        codSectorial: '0000000028',
        nombre: 'Ruata Salazar Edison Giovanny',
        numeroDias: 360,
        decimoCuarto: 475,
        fechaIng: '02/06/2017',
        fechaSal: '',
        observacion: ''
      },
      {
        posicion: 2,
        local: 'Administrativo',
        noAfiliacion: 1,
        cedula: '1712148985',
        codSectorial: '0000000028',
        nombre: 'Bustillos Espín Eduardo Luis',
        numeroDias: 360,
        decimoCuarto: 470,
        fechaIng: '28/06/2018',
        fechaSal: '',
        observacion: ''
      },
      {
        posicion: 3,
        local: 'Administrativo',
        noAfiliacion: 1,
        cedula: '1721679188',
        codSectorial: '820500010',
        nombre: 'Thuma Tenorio Zoila Nohemí',
        numeroDias: 360,
        decimoCuarto: 470,
        fechaIng: '01/10/2019',
        fechaSal: '',
        observacion: ''
      },
      {
        posicion: 4,
        local: 'Administrativo',
        noAfiliacion: 1,
        cedula: '0601096148',
        codSectorial: '0000000043',
        nombre: 'Cepeda Nazario Cecilia Lorena',
        numeroDias: 360,
        decimoCuarto: 470,
        fechaIng: '01/02/2020',
        fechaSal: '31/01/2020',
        observacion: ''
      },
      {
        posicion: 5,
        local: 'Administrativo',
        noAfiliacion: 1,
        cedula: '1715439797',
        codSectorial: '0000000008',
        nombre: 'Moran Poma Rocio Solange Danitza',
        numeroDias: 360,
        decimoCuarto: 470,
        fechaIng: '07/03/2022',
        fechaSal: '28/02/2022',
        observacion: ''
      },
      {
        posicion: 6,
        local: 'Administrativo',
        noAfiliacion: 1,
        cedula: '1725212547',
        codSectorial: '0000000028',
        nombre: 'Silva Toledo Ivana Alexander',
        numeroDias: 360,
        decimoCuarto: 470,
        fechaIng: '14/11/2023',
        fechaSal: '13/10/2023',
        observacion: ''
      },
      {
        posicion: 7,
        local: 'Administrativo',
        noAfiliacion: 0,
        cedula: '1103497093',
        codSectorial: '0',
        nombre: 'Santacruz Pinta Diana Fernanda',
        numeroDias: 470,
        decimoCuarto: 470,
        fechaIng: '01/07/2022',
        fechaSal: '27/06/2025',
        observacion: ''
      }
    ];
  }

  calcular(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const total = this.dataSource.reduce((acc, item) => acc + item.decimoCuarto, 0);

    this.resumen.totalDecimoCuarto = total;
    this.resumen.liquidoRecibir =
      this.resumen.totalDecimoCuarto -
      this.resumen.descuento -
      this.resumen.decimoPagadoNomina -
      this.resumen.retencionJudicial;
  }

  grabar(): void {
    console.log('Grabar información', {
      filtros: this.form.value,
      detalle: this.dataSource,
      resumen: this.resumen
    });
  }

  exportar(): void {
    console.log('Exportar reporte');
  }

  cancelar(): void {
    this.form.reset({
      patronal: '1308075',
      sucursal: '1',
      empresa: 'Clínica Pasteur',
      periodo: '31/10/2025',
      tipoEmpleado: 'Fijos',
      region: 'Sierra',
      desde: '01/08/2025',
      hasta: '13/09/2025'
    });

    this.cargarDatosMock();
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  }
}