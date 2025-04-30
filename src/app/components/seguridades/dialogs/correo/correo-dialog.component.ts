import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-correo-dialog',
  templateUrl: './correo-dialog.component.html',
  styleUrls: ['./correo-dialog.component.css']
})
export class CorreoDialogComponent {
  correoForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CorreoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any  // Aquí recibes lista actual
  ) {
    this.correoForm = this.fb.group({
      tipo: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      esPrincipal: [false]
    });
  }

  guardar() {
    if (this.correoForm.valid) {
      this.dialogRef.close([...this.data, this.correoForm.value]);
    }
  }

  cerrar() {
    this.dialogRef.close(this.data);
  }
}
