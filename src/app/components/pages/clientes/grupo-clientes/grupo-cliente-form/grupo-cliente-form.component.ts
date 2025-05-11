import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { GrupoClienteService } from 'src/app/services/grupo-cliente.service';
import { GrupoCliente } from 'src/app/interfaces/responses/grupo-cliente-response';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';

@Component({
  selector: 'app-grupo-cliente-form',
  templateUrl: './grupo-cliente-form.component.html',
  styleUrls: ['./grupo-cliente-form.component.css']
})
export class GrupoClienteFormComponent implements OnInit {
  formulario!: FormGroup;
  modoEdicion = false;
  idGrupo!: number;

  constructor(
    private fb: FormBuilder,
    private grupoClienteService: GrupoClienteService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initForm();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modoEdicion = true;
      this.idGrupo = +id;
      this.cargarDatos(this.idGrupo);
    }
  }

  initForm(): void {
    this.formulario = this.fb.group({
      codigo: ['', Validators.required],
      nombre: ['', Validators.required],
      inscripcion: [0, Validators.required],
      asignacion: [0, Validators.required],
      mantenimiento: [0, Validators.required],
      valorAnual: [0, Validators.required],
      estado: [true, Validators.required],
      fecha: [new Date().toISOString().substring(0, 10), Validators.required],
      productoInscripcion: [''],
      productoMantenimiento: [''],
      productoAsignacion: [''],
      asignacionDolar: [0],
      mantenimientoDolar: [0],
      inscripcionDolar: [0]
    });
  }

  cargarDatos(id: number): void {
    this.grupoClienteService.getById(id).subscribe({
      next: (res) => {
        const data: GrupoCliente = res.data;
        this.formulario.patchValue({
          ...data,
          fecha: new Date(data.fecha).toISOString().substring(0, 10),
          estado: data.estado ?? true
        });
      },
      error: () => {
        this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          data: {
            title: 'Error',
            message: 'No se pudo cargar el grupo de cliente.',
            type: 'error',
            confirmText: 'Cerrar',
            showCancel: false
          }
        });
      }
    });
  }

  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const grupoData = this.formulario.getRawValue();

    const request$ = this.modoEdicion
      ? this.grupoClienteService.update(this.idGrupo, grupoData)
      : this.grupoClienteService.create(grupoData);

    request$.subscribe({
      next: () => {
        const mensaje = this.modoEdicion
          ? 'Grupo de cliente actualizado correctamente.'
          : 'Grupo de cliente creado exitosamente.';

        this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          data: {
            title: 'Éxito',
            message: mensaje,
            type: 'success',
            confirmText: 'Aceptar',
            showCancel: false
          }
        }).afterClosed().subscribe(() => {
          this.router.navigate(['/menus/grupocliente']);
        });
      },
      error: () => {
        this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          data: {
            title: 'Error',
            message: 'Ocurrió un error al guardar el grupo de cliente.',
            type: 'error',
            confirmText: 'Cerrar',
            showCancel: false
          }
        });
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/menus/grupocliente']);
  }
}
