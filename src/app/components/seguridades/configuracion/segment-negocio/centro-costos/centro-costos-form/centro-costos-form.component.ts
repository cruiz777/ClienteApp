import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { EmpresaService } from 'src/app/services/empresa.service';
import { CentroCostosService } from 'src/app/services/centro-costos.service';

import { EmpresaResponse } from 'src/app/interfaces/responses/empresa-response';
import { CentroCostosRequest } from 'src/app/interfaces/requests/centro-costos-request';

import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';

@Component({
  selector: 'app-centro-costos-form',
  templateUrl: './centro-costos-form.component.html',
  styleUrls: ['./centro-costos-form.component.css']
})
export class CentroCostosFormComponent implements OnInit {
  form: FormGroup;
  isEditMode: boolean = false;
  empresas: EmpresaResponse[] = [];

  constructor(
    private fb: FormBuilder,
    private centroCostosService: CentroCostosService,
    private empresaService: EmpresaService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<CentroCostosFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {
    this.form = this.fb.group({
      id: [0],
      descripcion: ['', Validators.required],
      cuenta: ['', Validators.required],
      estado: [true],
      idEmpresa: [null, Validators.required]
    });

    this.isEditMode = !!data?.id;
  }

  ngOnInit(): void {
    this.cargarEmpresas();

    if (this.isEditMode && this.data.id) {
      this.centroCostosService.getById(this.data.id).subscribe({
        next: (res) => {
          this.form.patchValue(res.data);
        },
        error: () => {
          this.mostrarMensaje({
            type: 'error',
            title: 'Error',
            message: 'No se pudo cargar el centro de costos.',
            showCancel: false
          });
        }
      });
    }
  }

  private cargarEmpresas(): void {
    this.empresaService.getEmpresas().subscribe({
      next: (data) => {
        this.empresas = data;
      },
      error: () => {
        this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar la lista de empresas.',
          showCancel: false
        });
      }
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.mostrarMensaje({
        type: 'warning',
        title: 'Formulario inválido',
        message: 'Completa todos los campos obligatorios.',
        showCancel: false
      });
      return;
    }

    const rawData = this.form.value;
    rawData.estado = rawData.estado === true || rawData.estado === 'true';

    const data: CentroCostosRequest = rawData;

    const request$ = this.isEditMode
      ? this.centroCostosService.update(data.id!, data)
      : this.centroCostosService.create(data);

    request$.subscribe({
      next: () => {
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Centro de costos ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false
        }).afterClosed().subscribe(() => this.dialogRef.close(true));
      },
      error: () => {
        this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el centro de costos.`,
          showCancel: false
        });
      }
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        ...data
      }
    });
  }
}
