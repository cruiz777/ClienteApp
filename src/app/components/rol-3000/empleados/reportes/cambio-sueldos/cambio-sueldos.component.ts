import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface Empleado {
  id: number;
  codigo: string;
  nombre: string;
  cargo: string;
  departamento: string;
  local: string;
}

interface ItemBusqueda {
  codigo: number | string;
  descripcion: string;
}

type TipoFiltro = 'local' | 'departamento' | 'cargo';
type TipoCambio = 'porcentaje' | 'valor' | 'cambio';

@Component({
  selector: 'app-cambio-sueldos',
  templateUrl: './cambio-sueldos.component.html',
  styleUrls: ['./cambio-sueldos.component.css']
})
export class CambioSueldosComponent implements OnInit {
  form!: FormGroup;

  empleados: Empleado[] = [];
  locales: ItemBusqueda[] = [];
  departamentos: ItemBusqueda[] = [];
  cargos: ItemBusqueda[] = [];

  empleadosFiltrados: Empleado[] = [];
  itemsBusquedaFiltrados: ItemBusqueda[] = [];

  mostrarModal = false;
  tituloModal = '';
  tipoBusquedaActual: TipoFiltro = 'local';
  textoBusqueda = '';

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.cargarMocks();
    this.inicializarFormulario();
    this.configurarEventos();
  }

  inicializarFormulario(): void {
    this.form = this.fb.group({
      tipoFiltro: ['local'],
      empleadoId: [null],
      empleadoTexto: [''],

      localCodigo: [''],
      localDescripcion: [''],

      departamentoCodigo: [''],
      departamentoDescripcion: [''],

      cargoCodigo: [''],
      cargoDescripcion: [''],

      tipoCambio: ['porcentaje'],
      valorCambio: ['', Validators.required]
    });
  }

  configurarEventos(): void {
    this.form.get('empleadoTexto')?.valueChanges.subscribe((valor: string) => {
      this.filtrarEmpleados(valor || '');
    });

    this.form.get('tipoFiltro')?.valueChanges.subscribe((valor: TipoFiltro) => {
      this.limpiarFiltroSeleccionado();
      this.tipoBusquedaActual = valor;
    });

    this.filtrarEmpleados('');
  }

  cargarMocks(): void {
    this.empleados = [
      {
        id: 1,
        codigo: '1321',
        nombre: 'ABENDAÑO ANILEMA BRYAN JORDAN',
        cargo: 'TECNOLOGO',
        departamento: 'RADIOLOGIA',
        local: 'CLINICO'
      },
      {
        id: 2,
        codigo: '1422',
        nombre: 'ABRIL MACIAS JOSE FRANCISCO',
        cargo: 'MEDICO EMERGENCIOLOGO',
        departamento: 'MEDICOS GENERAL',
        local: 'CLINICO'
      },
      {
        id: 3,
        codigo: '31',
        nombre: 'AYALA ARIAS JAIME EDUARDO',
        cargo: 'ADMISIONISTA',
        departamento: 'ADMISION',
        local: 'ADMINISTRATIVO'
      },
      {
        id: 4,
        codigo: '100',
        nombre: 'ACEVEDO COLLANTES BYRON RAMIRO',
        cargo: 'DIRECTORA GENERAL',
        departamento: 'DIRECCION',
        local: 'ADMINISTRATIVO'
      }
    ];

    this.locales = [
      { codigo: 1, descripcion: 'ADMINISTRATIVO' },
      { codigo: 2, descripcion: 'CLINICO' },
      { codigo: 4, descripcion: 'PASANTES O BECARIOS' },
      { codigo: 3, descripcion: 'SERVICIOS' }
    ];

    this.departamentos = [
      { codigo: 1, descripcion: 'ADMISION' },
      { codigo: 2, descripcion: 'RADIOLOGIA' },
      { codigo: 3, descripcion: 'MEDICOS GENERAL' },
      { codigo: 4, descripcion: 'DIRECCION' }
    ];

    this.cargos = [
      { codigo: 1, descripcion: 'ADMISIONISTA' },
      { codigo: 2, descripcion: 'TECNOLOGO' },
      { codigo: 3, descripcion: 'MEDICO EMERGENCIOLOGO' },
      { codigo: 4, descripcion: 'DIRECTORA GENERAL' }
    ];
  }

  filtrarEmpleados(texto: string): void {
    const filtro = texto.toLowerCase().trim();

    if (!filtro) {
      this.empleadosFiltrados = [...this.empleados];
      return;
    }

    this.empleadosFiltrados = this.empleados.filter(emp =>
      emp.nombre.toLowerCase().includes(filtro) ||
      emp.codigo.toLowerCase().includes(filtro)
    );
  }

  seleccionarEmpleado(emp: Empleado): void {
    this.form.patchValue({
      empleadoId: emp.id,
      empleadoTexto: `${emp.codigo} - ${emp.nombre}`
    });
    this.empleadosFiltrados = [];
  }

  abrirBusqueda(): void {
    const tipo = this.form.get('tipoFiltro')?.value as TipoFiltro;
    this.tipoBusquedaActual = tipo;
    this.textoBusqueda = '';
    this.mostrarModal = true;

    if (tipo === 'local') {
      this.tituloModal = 'BUSQUEDA DE LOCALES';
      this.itemsBusquedaFiltrados = [...this.locales];
    } else if (tipo === 'departamento') {
      this.tituloModal = 'BUSQUEDA DE DEPARTAMENTOS';
      this.itemsBusquedaFiltrados = [...this.departamentos];
    } else {
      this.tituloModal = 'BUSQUEDA DE CARGOS';
      this.itemsBusquedaFiltrados = [...this.cargos];
    }
  }

  filtrarItemsBusqueda(): void {
    const texto = this.textoBusqueda.toLowerCase().trim();
    const base = this.obtenerListaSegunTipo();

    if (!texto) {
      this.itemsBusquedaFiltrados = [...base];
      return;
    }

    this.itemsBusquedaFiltrados = base.filter(item =>
      item.descripcion.toLowerCase().includes(texto) ||
      String(item.codigo).toLowerCase().includes(texto)
    );
  }

  obtenerListaSegunTipo(): ItemBusqueda[] {
    switch (this.tipoBusquedaActual) {
      case 'local':
        return this.locales;
      case 'departamento':
        return this.departamentos;
      case 'cargo':
        return this.cargos;
      default:
        return [];
    }
  }

  seleccionarItemBusqueda(item: ItemBusqueda): void {
    if (this.tipoBusquedaActual === 'local') {
      this.form.patchValue({
        localCodigo: item.codigo,
        localDescripcion: item.descripcion
      });
    } else if (this.tipoBusquedaActual === 'departamento') {
      this.form.patchValue({
        departamentoCodigo: item.codigo,
        departamentoDescripcion: item.descripcion
      });
    } else {
      this.form.patchValue({
        cargoCodigo: item.codigo,
        cargoDescripcion: item.descripcion
      });
    }

    this.mostrarModal = false;
  }

  limpiarFiltroSeleccionado(): void {
    this.form.patchValue({
      localCodigo: '',
      localDescripcion: '',
      departamentoCodigo: '',
      departamentoDescripcion: '',
      cargoCodigo: '',
      cargoDescripcion: ''
    });
  }

  nuevo(): void {
    const tipoFiltroActual = this.form.get('tipoFiltro')?.value || 'local';
    const tipoCambioActual = this.form.get('tipoCambio')?.value || 'porcentaje';

    this.form.reset({
      tipoFiltro: tipoFiltroActual,
      tipoCambio: tipoCambioActual,
      empleadoId: null,
      empleadoTexto: '',
      localCodigo: '',
      localDescripcion: '',
      departamentoCodigo: '',
      departamentoDescripcion: '',
      cargoCodigo: '',
      cargoDescripcion: '',
      valorCambio: ''
    });

    this.empleadosFiltrados = [];
  }

  grabar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    console.log('Cambio de sueldo:', this.form.value);
  }

  cancelar(): void {
    this.nuevo();
  }

  salir(): void {
    console.log('Salir');
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  get tipoFiltro(): TipoFiltro {
    return this.form.get('tipoFiltro')?.value as TipoFiltro;
  }
}