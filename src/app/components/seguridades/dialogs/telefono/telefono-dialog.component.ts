import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TelefonoRequest } from 'src/app/interfaces/requests/persona-request';

interface TelefonoDialogData {
  telefonos: TelefonoRequest[];
  modoEdicion: boolean;
  personaId?: number;
}

@Component({
  selector: 'app-telefono-dialog',
  templateUrl: './telefono-dialog.component.html',
  styleUrls: ['./telefono-dialog.component.css']
})
export class TelefonoDialogComponent implements OnInit {
  telefonoForm: FormGroup;
  telefonos: TelefonoRequest[] = [];
  modoEdicion = false;
  editandoIndex: number | null = null;
  
  tiposTelefono = ['Móvil', 'Casa', 'Trabajo', 'Fax', 'Otro'];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TelefonoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TelefonoDialogData
  ) {
    this.telefonoForm = this.fb.group({
      tipo: ['', Validators.required],
      numero: ['', [Validators.required, Validators.pattern(/^[0-9]{7,15}$/)]]
    });
  }

  ngOnInit() {
    this.telefonos = [...(this.data.telefonos || [])];
    this.modoEdicion = this.data.modoEdicion || false;
  }

  guardarTelefono() {
    if (this.telefonoForm.invalid) {
      this.telefonoForm.markAllAsTouched();
      return;
    }

    const nuevoTelefono: TelefonoRequest = {
      idTelefono: 0,
      idPersona: this.data.personaId || 0,
      tipo: this.telefonoForm.value.tipo,
      numero: this.telefonoForm.value.numero,
      status: true
    };

    if (this.editandoIndex !== null) {
      this.telefonos[this.editandoIndex] = {
        ...this.telefonos[this.editandoIndex],
        tipo: nuevoTelefono.tipo,
        numero: nuevoTelefono.numero
      };
      this.editandoIndex = null;
    } else {
      this.telefonos.push(nuevoTelefono);
    }

    this.telefonoForm.reset();
  }

  editarTelefono(index: number) {
    const telefono = this.telefonos[index];
    this.telefonoForm.patchValue({
      tipo: telefono.tipo,
      numero: telefono.numero
    });
    this.editandoIndex = index;
  }

  eliminarTelefono(index: number) {
    this.telefonos.splice(index, 1);
    
    if (this.editandoIndex === index) {
      this.cancelarEdicion();
    }
  }

  cancelarEdicion() {
    this.telefonoForm.reset();
    this.editandoIndex = null;
  }

  cerrar() {
    this.dialogRef.close(this.telefonos);
  }

  cancelar() {
    this.dialogRef.close(null);
  }

  mostrarError(campo: string): boolean {
    const control = this.telefonoForm.get(campo);
    return !!(control?.invalid && control?.touched);
  }

  obtenerMensajeError(campo: string): string {
    const control = this.telefonoForm.get(campo);
    
    if (control?.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    
    if (control?.hasError('pattern')) {
      return 'Número de teléfono inválido (7-15 dígitos)';
    }
    
    return '';
  }
}