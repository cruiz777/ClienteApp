import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-dialog-cliente',
  templateUrl: './dialog-cliente.component.html',
  styleUrls: ['./dialog-cliente.component.css']
})
export class DialogClienteComponent implements OnInit {
  formCliente!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.formCliente = this.fb.group({
      paso1: this.fb.group({
        codigo: ['', Validators.required],
        nombre: ['', Validators.required],
        ruc: [''],
        categoriaIndividual: [false],
        categoriaIndustrial: [false],
        grupo: [''],
        subgrupo: ['']
      }),
      paso2: this.fb.group({
        email: ['', [Validators.email]],
        direccion: [''],
        p_emision: [''],
        caja: ['']
      }),
      paso3: this.fb.group({
        contactoNombre: ['', Validators.required],
        contactoTelefono: [''],
        contactoCorreo: ['', [Validators.email]]
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
}