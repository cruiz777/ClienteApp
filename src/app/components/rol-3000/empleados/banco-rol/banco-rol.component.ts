import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface Banco {
  id: number;
  codigo: string;
  cuentaCorriente: string;
  cuentaContable: string;
  nombreBanco: string;
}

@Component({
  selector: 'app-banco-rol',
  templateUrl: './banco-rol.component.html',
  styleUrls: ['./banco-rol.component.css']
})
export class BancoRolComponent implements OnInit {
  form!: FormGroup;

  displayedColumns: string[] = [
    'codigo',
    'cuentaCorriente',
    'cuentaContable',
    'nombreBanco'
  ];

  bancos: Banco[] = [];
  bancoSeleccionadoId: number | null = null;

  nombresBanco: string[] = [
    'Banco Pichincha',
    'Banco Guayaquil',
    'Produbanco',
    'Banco del Pacífico',
    'Cooperativa JEP'
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarMock();
  }

  inicializarFormulario(): void {
    this.form = this.fb.group({
      id: [0],
      codigo: ['', Validators.required],
      cuentaCorriente: [''],
      cuentaContable: [''],
      nombreBanco: ['', Validators.required]
    });
  }

  cargarMock(): void {
    this.bancos = [
      {
        id: 1,
        codigo: 'BAN001',
        cuentaCorriente: '2100012458',
        cuentaContable: '1.01.01.001',
        nombreBanco: 'Banco Pichincha'
      },
      {
        id: 2,
        codigo: 'BAN002',
        cuentaCorriente: '9988776655',
        cuentaContable: '1.01.01.002',
        nombreBanco: 'Banco Guayaquil'
      },
      {
        id: 3,
        codigo: 'BAN003',
        cuentaCorriente: '4455667788',
        cuentaContable: '1.01.01.003',
        nombreBanco: 'Produbanco'
      }
    ];
  }

  seleccionarBanco(item: Banco): void {
    this.bancoSeleccionadoId = item.id;
    this.form.patchValue(item);
  }

  nuevo(): void {
    this.bancoSeleccionadoId = null;
    this.form.reset();
    this.form.patchValue({ id: 0 });
  }

  grabar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue() as Banco;

    if (!valor.id || valor.id === 0) {
      const nuevoId =
        this.bancos.length > 0
          ? Math.max(...this.bancos.map(x => x.id)) + 1
          : 1;

      const nuevoBanco: Banco = {
        ...valor,
        id: nuevoId
      };

      this.bancos = [...this.bancos, nuevoBanco];
      this.bancoSeleccionadoId = nuevoId;
      this.form.patchValue({ id: nuevoId });
    } else {
      this.bancos = this.bancos.map(item =>
        item.id === valor.id ? { ...valor } : item
      );
      this.bancoSeleccionadoId = valor.id;
    }

    console.log('Banco guardado:', valor);
  }

  borrar(): void {
    const id = this.form.get('id')?.value;

    if (!id || id === 0) {
      return;
    }

    this.bancos = this.bancos.filter(item => item.id !== id);
    this.nuevo();
  }

  cancelar(): void {
    if (this.bancoSeleccionadoId) {
      const actual = this.bancos.find(x => x.id === this.bancoSeleccionadoId);
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