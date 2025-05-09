import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DepartamentosService } from 'src/app/services/departamentos.service';
import { DepartamentoRequest } from 'src/app/interfaces/requests/departamento-request';
import { DepartamentoResponse } from 'src/app/interfaces/responses/departamentos-response';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';

@Component({
  selector: 'app-departamentos-form',
  templateUrl: './departamentos-form.component.html',
  styleUrls: ['./departamentos-form.component.css']
})
export class DepartamentosFormComponent implements OnInit {
  departamentoForm!: FormGroup;
  modoEdicion = false;
  idDepartamento!: number;

  constructor(
    private fb: FormBuilder,
    private departamentoService: DepartamentosService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.departamentoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      estado: [true]
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.modoEdicion = true;
      this.idDepartamento = +idParam;
      this.departamentoService.getDepartamentoById(this.idDepartamento).subscribe({
        next: (data: DepartamentoResponse) => {
          this.departamentoForm.patchValue({
            nombre: data.nombre,
            estado: data.estado
          });
        },
        error: () => {
          this.dialog.open(CustomMessageBoxComponent, {
            width: '400px',
            data: {
              title: 'Error',
              message: 'No se pudo cargar el departamento.',
              type: 'error',
              confirmText: 'Cerrar',
              showCancel: false
            }
          });
        }
      });
    }
  }

  guardar(): void {
    if (this.departamentoForm.invalid) {
      this.departamentoForm.markAllAsTouched();
      return;
    }

    const formValue: DepartamentoRequest = this.departamentoForm.getRawValue();

    const request$ = this.modoEdicion
      ? this.departamentoService.updateDepartamento(this.idDepartamento, formValue)
      : this.departamentoService.createDepartamento(formValue);

    request$.subscribe({
      next: () => {
        const msg = this.modoEdicion ? 'actualizado' : 'creado';
        this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          data: {
            title: 'Éxito',
            message: `Departamento ${msg} correctamente.`,
            type: 'success',
            confirmText: 'Aceptar',
            showCancel: false
          }
        }).afterClosed().subscribe(() => this.router.navigate(['/seguridades/departamentos']));
      },
      error: () => {
        this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          data: {
            title: 'Error',
            message: 'Ocurrió un error al guardar el departamento.',
            type: 'error',
            confirmText: 'Cerrar',
            showCancel: false
          }
        });
      }
    });
  }

  cancelar(): void {
    this.departamentoForm.reset({ estado: true });
    this.router.navigate(['/seguridades/departamentos']);
  }
}
