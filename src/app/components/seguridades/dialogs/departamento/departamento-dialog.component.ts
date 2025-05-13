import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DepartamentoRequest } from 'src/app/interfaces/requests/departamento-request';

@Component({
  selector: 'app-departamento-dialog',
  templateUrl: './departamento-dialog.component.html',
  styleUrls: ['./departamento-dialog.component.css']
})
export class DepartamentoDialogComponent implements OnInit {
  departamentoForm!: FormGroup;
  modoEdicion: boolean = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<DepartamentoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { departamento?: DepartamentoRequest }
  ) {}

  ngOnInit(): void {
    this.modoEdicion = !!this.data?.departamento;

    this.departamentoForm = this.fb.group({
      nombre: [this.data?.departamento?.nombre || '', [Validators.required, Validators.maxLength(100)]],
      estado: [this.data?.departamento?.estado ?? true]
    });
  }

  guardar() {
    if (this.departamentoForm.valid) {
      const result: DepartamentoRequest = this.departamentoForm.getRawValue();
      this.dialogRef.close(result);
    }
  }

  cerrar() {
    this.dialogRef.close(null);
  }
}
