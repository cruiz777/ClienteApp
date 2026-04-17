import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface EmpresaAdaptacion {
  id: number;
  codigo: string;
  numeroPatronal: string;
  razonSocial: string;
  numeroRuc: string;
  provincia: string;
  canton: string;
  parroquia: string;
  calleNumero: string;
  telefono: string;
  cedulaRepresentanteLegal: string;
  representanteLegal: string;
  tipoSeguro: string;
  codigoRegistro: string;
}

@Component({
  selector: 'app-empresa-adaptacion',
  templateUrl: './empresa-adaptacion.component.html',
  styleUrls: ['./empresa-adaptacion.component.css']
})
export class EmpresaAdaptacionComponent implements OnInit {
  form!: FormGroup;

  displayedColumns: string[] = [
    'codigo',
    'razonSocial',
    'numeroRuc',
    'provincia',
    'canton',
    'telefono',
    'representanteLegal',
    'tipoSeguro',
    'codigoRegistro'
  ];

  empresas: EmpresaAdaptacion[] = [];
  empresaSeleccionadaId: number | null = null;

  provincias: string[] = ['Pichincha', 'Guayas', 'Azuay', 'Manabí'];
  cantones: string[] = ['Quito', 'Guayaquil', 'Cuenca', 'Manta'];
  parroquias: string[] = ['Centro', 'Norte', 'Sur', 'Rural'];
  tiposSeguro: string[] = ['General', 'Campesino', 'Voluntario', 'Privado'];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarMock();
  }

  inicializarFormulario(): void {
    this.form = this.fb.group({
      id: [0],
      codigo: ['', Validators.required],
      numeroPatronal: [''],
      razonSocial: ['', Validators.required],
      numeroRuc: [''],
      provincia: [''],
      canton: [''],
      parroquia: [''],
      calleNumero: [''],
      telefono: [''],
      cedulaRepresentanteLegal: [''],
      representanteLegal: [''],
      tipoSeguro: [''],
      codigoRegistro: ['']
    });
  }

  cargarMock(): void {
    this.empresas = [
      {
        id: 1,
        codigo: 'EMP001',
        numeroPatronal: 'PAT-1001',
        razonSocial: 'CLINICA PASTEUR S.A.',
        numeroRuc: '1790012345001',
        provincia: 'Pichincha',
        canton: 'Quito',
        parroquia: 'Centro',
        calleNumero: 'Av. Amazonas N34-451',
        telefono: '022345678',
        cedulaRepresentanteLegal: '1711111111',
        representanteLegal: 'Mario Valencia',
        tipoSeguro: 'General',
        codigoRegistro: 'REG-001'
      },
      {
        id: 2,
        codigo: 'EMP002',
        numeroPatronal: 'PAT-1002',
        razonSocial: 'HOSPITAL DEMO DEL NORTE',
        numeroRuc: '1790099999001',
        provincia: 'Guayas',
        canton: 'Guayaquil',
        parroquia: 'Norte',
        calleNumero: 'Av. Principal 123',
        telefono: '042123456',
        cedulaRepresentanteLegal: '0922222222',
        representanteLegal: 'Ana Pérez',
        tipoSeguro: 'Privado',
        codigoRegistro: 'REG-002'
      }
    ];
  }

  seleccionarEmpresa(item: EmpresaAdaptacion): void {
    this.empresaSeleccionadaId = item.id;
    this.form.patchValue(item);
  }

  nuevo(): void {
    this.empresaSeleccionadaId = null;
    this.form.reset();
    this.form.patchValue({ id: 0 });
  }

  grabar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue() as EmpresaAdaptacion;

    if (!valor.id || valor.id === 0) {
      const nuevoId =
        this.empresas.length > 0
          ? Math.max(...this.empresas.map(x => x.id)) + 1
          : 1;

      const nuevaEmpresa: EmpresaAdaptacion = {
        ...valor,
        id: nuevoId
      };

      this.empresas = [...this.empresas, nuevaEmpresa];
      this.empresaSeleccionadaId = nuevoId;
      this.form.patchValue({ id: nuevoId });
    } else {
      this.empresas = this.empresas.map(item =>
        item.id === valor.id ? { ...valor } : item
      );
      this.empresaSeleccionadaId = valor.id;
    }

    console.log('Guardado:', valor);
  }

  borrar(): void {
    const id = this.form.get('id')?.value;

    if (!id || id === 0) {
      return;
    }

    this.empresas = this.empresas.filter(item => item.id !== id);
    this.nuevo();
  }

  cancelar(): void {
    if (this.empresaSeleccionadaId) {
      const actual = this.empresas.find(x => x.id === this.empresaSeleccionadaId);
      if (actual) {
        this.form.patchValue(actual);
      }
    } else {
      this.nuevo();
    }
  }

  esCampoInvalido(nombreCampo: string): boolean {
    const control = this.form.get(nombreCampo);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}