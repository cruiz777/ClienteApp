import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-telefono-dialog',
  templateUrl: './telefono-dialog.component.html',
  styleUrls: ['./telefono-dialog.component.css']
})
export class TelefonoDialogComponent {
  telefonoForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TelefonoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.telefonoForm = this.fb.group({
      tipo: ['', Validators.required],
      numero: ['', [Validators.required, Validators.pattern('^[0-9]{7,10}$')]],
      esPrincipal: [false]
    });
  }

  guardar() {
    if (this.telefonoForm.valid) {
      this.dialogRef.close([...this.data, this.telefonoForm.value]);
    }
  }

  cerrar() {
    this.dialogRef.close(this.data);
  }
}
