import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-dialog-cliente',
  templateUrl: './dialog-cliente.component.html',
  styleUrls: ['./dialog-cliente.component.css']
})
export class DialogClienteComponent implements OnInit {
  formCliente!: FormGroup;
  selectedTab: number = 0;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.formCliente = this.fb.group({
      paso1: this.fb.group({
        codigo: [''],
        nombre: ['' ],
        ruc: [''],
        categoriaIndividual: [false],
        categoriaIndustrial: [false],
        grupo: [''],
        subgrupo: ['']
      }),
      paso2: this.fb.group({
        direccion: [''],
        p_emision: [''],
        caja: ['']
      }),
      paso3: this.fb.group({
        contactoNombre: [''],
        contactoTelefono: [''],
        contactoCorreo: ['']
      }),
      paso4: this.fb.group({
        observaciones: ['']
      })
    });
  }

  get paso1Form(): FormGroup {
    return this.formCliente.get('paso1') as FormGroup;
  }
  get paso2Form(): FormGroup {
    return this.formCliente.get('paso2') as FormGroup;
  }
  get paso3Form(): FormGroup {
    return this.formCliente.get('paso3') as FormGroup;
  }
  get paso4Form(): FormGroup {
    return this.formCliente.get('paso4') as FormGroup;
  }

  guardar(): void {
    const datos = {
      ...this.paso1Form.value,
      ...this.paso2Form.value,
      ...this.paso3Form.value,
      ...this.paso4Form.value
    };

    console.log('Datos del cliente:', datos);
    // Aquí podrías enviar a tu API o cerrar el diálogo
  }
}
