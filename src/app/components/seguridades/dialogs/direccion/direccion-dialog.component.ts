import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-direccion-dialog',
  templateUrl: './direccion-dialog.component.html',
  styleUrls: ['./direccion-dialog.component.css']
})
export class DireccionDialogComponent {
  direccionForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<DireccionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.direccionForm = this.fb.group({
      tipo: ['Casa', Validators.required],
      calle: ['', Validators.required],
      codigoPostal: ['']
    });
  }

  guardar() {
    if (this.direccionForm.valid) {
      this.dialogRef.close([...this.data, this.direccionForm.value]);
    }
  }

  cerrar() {
    this.dialogRef.close(this.data);
  }
}
