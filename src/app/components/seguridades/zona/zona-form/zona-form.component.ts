import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ZonaRequest } from 'src/app/interfaces/requests/zona-request';
import { EmpresaResponse } from 'src/app/interfaces/responses/empresa-response';
import { ZonaResponse } from 'src/app/interfaces/responses/zona-response';
import { EmpresaService } from 'src/app/services/empresa.service';
import { ZonaService } from 'src/app/services/zona.service';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';

@Component({
  selector: 'app-zona-form',
  templateUrl: './zona-form.component.html',
  styleUrls: ['./zona-form.component.css']
})
export class ZonaFormComponent implements OnInit {
  zonaForm: FormGroup;
  isEditMode: boolean = false;
  idZona!: number;
  empresas: EmpresaResponse[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private zonaService: ZonaService,
    private empresaService: EmpresaService,
    private dialog: MatDialog
  ) {
    this.zonaForm = this.fb.group({
      idZona: [0],
      referencia: ['', Validators.required],
      nombre: ['', Validators.required],
      numero: ['', Validators.required],
      empresaCodigo: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.idZona = +id;
        this.zonaService.getById(this.idZona).subscribe({
          next: (zona: ZonaResponse) => {
            this.zonaForm.patchValue(zona);
          },
          error: err => console.error('Error al cargar zona:', err)
        });
      }
    });

    this.empresaService.getEmpresas().subscribe({
      next: (data) => this.empresas = data,
      error: err => console.error('Error al cargar empresas:', err)
    });
  }

  guardar(): void {
    if (this.zonaForm.invalid) return;

    const zona: ZonaRequest = this.zonaForm.value;

    const peticion = this.isEditMode
      ? this.zonaService.update(this.idZona, zona)
      : this.zonaService.create(zona);

    peticion.subscribe({
      next: () => {
        this.mostrarMensaje({
          type: 'success',
          title: this.isEditMode ? 'Zona actualizada' : 'Zona creada',
          message: `La zona ha sido ${this.isEditMode ? 'actualizada' : 'creada'} correctamente.`,
          confirmText: 'Aceptar',
          showCancel: false
        });
      },
      error: err => {
        console.error('Error al guardar zona:', err);
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al guardar',
          message: 'No se pudo completar la operación. Intente nuevamente.',
          confirmText: 'Cerrar',
          showCancel: false
        });
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/seguridades/zonas']);
  }

  mostrarMensaje(data: MessageBoxData): void {
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true && data.type === 'success') {
        this.router.navigate(['/seguridades/zonas']);
      }
    });
  }
}
