import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DATE_FORMATS, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-usuarios-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
  ],
  templateUrl: './usuarios-form.component.html',
  styleUrls: ['./usuarios-form.component.css'],
  providers: [{ provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }]
})
export class UsuariosFormComponent implements OnInit {
  usuarioForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<UsuariosFormComponent>
  ) {}

  ngOnInit(): void {
    this.usuarioForm = this.fb.group({
      usuario: ['', [Validators.required, Validators.email]],
      clave: ['', Validators.required],
      correo: [''],
      perfil: ['', Validators.required],
      fechaCaducidad: ['', Validators.required],
      estado: ['', Validators.required],
      departamento: ['', Validators.required],
    });
  }

  grabar(): void {
    if (this.usuarioForm.invalid) {
      alert('Por favor complete todos los campos obligatorios.');
      return;
    }

    const formData = this.usuarioForm.value;
    console.log('Formulario válido, datos:', formData);
    // Aquí iría tu lógica de grabado real
  }

    cerrar(): void {
    this.dialogRef.close();
  }
}
