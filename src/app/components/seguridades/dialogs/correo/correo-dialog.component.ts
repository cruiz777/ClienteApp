import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CorreoRequest } from 'src/app/interfaces/requests/persona-request';

interface CorreoDialogData {
  correos: CorreoRequest[];
  modoEdicion: boolean; // true si la persona ya existe en BD
  personaId?: number;   // ID de la persona (solo en modo edición)
}

@Component({
  selector: 'app-correo-dialog',
  templateUrl: './correo-dialog.component.html',
  styleUrls: ['./correo-dialog.component.css']
})
export class CorreoDialogComponent implements OnInit {
  correoForm: FormGroup;
  correos: CorreoRequest[] = [];
  modoEdicion = false;
  editandoIndex: number | null = null;
  
  tiposCorreo = ['Personal', 'Trabajo', 'Otro'];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CorreoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CorreoDialogData
  ) {
    this.correoForm = this.fb.group({
      tipo: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit() {
    // Cargar correos existentes
    this.correos = [...(this.data.correos || [])];
    this.modoEdicion = this.data.modoEdicion || false;
  }

  /**
   * Agregar o actualizar correo en la lista
   */
  guardarCorreo() {
    if (this.correoForm.invalid) {
      this.correoForm.markAllAsTouched();
      return;
    }

    const nuevoCorreo: CorreoRequest = {
      idCorreo: 0, // 0 indica que es nuevo
      idPersona: this.data.personaId || 0,
      tipo: this.correoForm.value.tipo,
      email: this.correoForm.value.email,
      status: true
    };

    if (this.editandoIndex !== null) {
      // EDITAR correo existente
      this.correos[this.editandoIndex] = {
        ...this.correos[this.editandoIndex],
        tipo: nuevoCorreo.tipo,
        email: nuevoCorreo.email
      };
      this.editandoIndex = null;
    } else {
      // AGREGAR nuevo correo
      this.correos.push(nuevoCorreo);
    }

    // Resetear formulario
    this.correoForm.reset();
  }

  /**
   * Cargar correo en el formulario para editar
   */
  editarCorreo(index: number) {
    const correo = this.correos[index];
    this.correoForm.patchValue({
      tipo: correo.tipo,
      email: correo.email
    });
    this.editandoIndex = index;
  }

  /**
   * Eliminar correo de la lista
   */
  eliminarCorreo(index: number) {
    this.correos.splice(index, 1);
    
    // Si estaba editando este correo, cancelar la edición
    if (this.editandoIndex === index) {
      this.cancelarEdicion();
    }
  }

  /**
   * Cancelar edición
   */
  cancelarEdicion() {
    this.correoForm.reset();
    this.editandoIndex = null;
  }

  /**
   * Cerrar diálogo y devolver lista actualizada
   */
  cerrar() {
    this.dialogRef.close(this.correos);
  }

  /**
   * Cerrar sin guardar cambios
   */
  cancelar() {
    this.dialogRef.close(null);
  }

  /**
   * Verificar si hay errores en el formulario
   */
  mostrarError(campo: string): boolean {
    const control = this.correoForm.get(campo);
    return !!(control?.invalid && control?.touched);
  }

  /**
   * Obtener mensaje de error
   */
  obtenerMensajeError(campo: string): string {
    const control = this.correoForm.get(campo);
    
    if (control?.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    
    if (control?.hasError('email')) {
      return 'Email inválido';
    }
    
    return '';
  }
}