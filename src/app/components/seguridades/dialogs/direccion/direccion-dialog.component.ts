import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DireccionRequest } from 'src/app/interfaces/requests/persona-request';

interface DireccionDialogData {
  direcciones: DireccionRequest[];
  modoEdicion: boolean;
  personaId?: number;
}

@Component({
  selector: 'app-direccion-dialog',
  templateUrl: './direccion-dialog.component.html',
  styleUrls: ['./direccion-dialog.component.css']
})
export class DireccionDialogComponent implements OnInit {
  direccionForm: FormGroup;
  direcciones: DireccionRequest[] = [];
  modoEdicion = false;
  editandoIndex: number | null = null;
  
  tiposDireccion = ['Casa', 'Trabajo', 'Otro'];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<DireccionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DireccionDialogData
  ) {
    this.direccionForm = this.fb.group({
      tipo: ['', Validators.required],
      calle: ['', [Validators.required, Validators.maxLength(200)]],
      codigoPostal: ['', Validators.maxLength(10)]
    });
  }

  ngOnInit() {
    this.direcciones = [...(this.data.direcciones || [])];
    this.modoEdicion = this.data.modoEdicion || false;
  }

  guardarDireccion() {
    if (this.direccionForm.invalid) {
      this.direccionForm.markAllAsTouched();
      return;
    }

    const nuevaDireccion: DireccionRequest = {
      idDireccion: 0,
      idPersona: this.data.personaId || 0,
      tipo: this.direccionForm.value.tipo,
      calle: this.direccionForm.value.calle,
      codigoPostal: this.direccionForm.value.codigoPostal || null,
      status: true
    };

    if (this.editandoIndex !== null) {
      this.direcciones[this.editandoIndex] = {
        ...this.direcciones[this.editandoIndex],
        tipo: nuevaDireccion.tipo,
        calle: nuevaDireccion.calle,
        codigoPostal: nuevaDireccion.codigoPostal
      };
      this.editandoIndex = null;
    } else {
      this.direcciones.push(nuevaDireccion);
    }

    this.direccionForm.reset();
  }

  editarDireccion(index: number) {
    const direccion = this.direcciones[index];
    this.direccionForm.patchValue({
      tipo: direccion.tipo,
      calle: direccion.calle,
      codigoPostal: direccion.codigoPostal
    });
    this.editandoIndex = index;
  }

  eliminarDireccion(index: number) {
    this.direcciones.splice(index, 1);
    
    if (this.editandoIndex === index) {
      this.cancelarEdicion();
    }
  }

  cancelarEdicion() {
    this.direccionForm.reset();
    this.editandoIndex = null;
  }

  cerrar() {
    this.dialogRef.close(this.direcciones);
  }

  cancelar() {
    this.dialogRef.close(null);
  }

  mostrarError(campo: string): boolean {
    const control = this.direccionForm.get(campo);
    return !!(control?.invalid && control?.touched);
  }

  obtenerMensajeError(campo: string): string {
    const control = this.direccionForm.get(campo);
    
    if (control?.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    
    if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Máximo ${maxLength} caracteres`;
    }
    
    return '';
  }
}