import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { CiudadService } from 'src/app/services/ciudad.service';
import { EmpresaService } from 'src/app/services/empresa.service';
import { CentroCostosService } from 'src/app/services/centro-costos.service';
import { TipoNegocioService } from 'src/app/services/tipo-negocio.service';
import { LocalesService } from 'src/app/services/locales.service';

import { CiudadResumen } from 'src/app/interfaces/responses/ciudad-response';
import { EmpresaResponse } from 'src/app/interfaces/responses/empresa-response';
import { CentroCostosResponse } from 'src/app/interfaces/responses/centro-costos-response';
import { TipoNegocioResponse } from 'src/app/interfaces/responses/tipo-negocio-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { LocalesRequest } from 'src/app/interfaces/requests/local-request';

@Component({
  selector: 'app-local-form',
  templateUrl: './local-form.component.html',
  styleUrls: ['./local-form.component.css']
})
export class LocalFormComponent implements OnInit {
  form: FormGroup;
  isEditMode: boolean = false;
  ciudades: CiudadResumen[] = [];
  empresas: EmpresaResponse[] = [];
  centrosCostos: CentroCostosResponse[] = [];
  tiposNegocio: TipoNegocioResponse[] = [];

  constructor(
    private fb: FormBuilder,
    private ciudadService: CiudadService,
    private empresaService: EmpresaService,
    private centroCostosService: CentroCostosService,
    private tipoNegocioService: TipoNegocioService,
    private localesService: LocalesService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<LocalFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {
    this.form = this.fb.group({
      id: [0],
      nombre: ['', [Validators.required]],
      direccion: ['', [Validators.required]],
      telefono1: [''],
      telefono2: [''],
      telefono3: [''],
      area: [null],
      localRuc: ['', [Validators.required]],
      administrador: [''],
      fax: [''],
      numeroEmpleados: [null],
      localBodega: [false],
      principal: [false],
      priopridad: [false],
      procentejeDis: [null],
      localHis: [false],
      idZona: [0, [Validators.required]],
      idTipoNegocio: [null, [Validators.required]],
      idCiudad: [null],
      idCentroCostos: [null, [Validators.required]],
      idEmpresa: [null, [Validators.required]],
      estado: [true]
    });

    this.isEditMode = !!data?.id;
  }

  ngOnInit(): void {
    this.cargarReferenciales();

    if (this.isEditMode && this.data.id) {
      this.localesService.getById(this.data.id).subscribe({
        next: (res) => {
          this.form.patchValue(res.data);
        },
        error: () => {
          this.mostrarMensaje({
            type: 'error',
            title: 'Error',
            message: 'No se pudo cargar el local.',
            showCancel: false
          });
        }
      });
    }
  }

  private cargarReferenciales(): void {
    this.empresaService.getEmpresas().subscribe({
      next: (res) => this.empresas = res,
      error: () => this.errorMsg('la lista de empresas')
    });

    this.ciudadService.getCiudades().subscribe({
      next: (res) => this.ciudades = res,
      error: () => this.errorMsg('la lista de ciudades')
    });

    this.centroCostosService.getAll().subscribe({
      next: (res) => this.centrosCostos = res.data,
      error: () => this.errorMsg('la lista de centros de costos')
    });

    this.tipoNegocioService.getAll().subscribe({
      next: (res) => this.tiposNegocio = res.data,
      error: () => this.errorMsg('la lista de tipos de negocio')
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
    const data: LocalesRequest = rawData;

    const request$ = this.isEditMode
      ? this.localesService.update(data.id!, data)
      : this.localesService.create(data);

    request$.subscribe({
      next: () => {
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Local ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false
        }).afterClosed().subscribe(() => this.dialogRef.close(true));
      },
      error: () => {
        this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el local.`,
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

  private errorMsg(element: string) {
    this.mostrarMensaje({
      type: 'error',
      title: 'Error',
      message: `No se pudo cargar ${element}.`,
      showCancel: false
    });
  }
 
}
