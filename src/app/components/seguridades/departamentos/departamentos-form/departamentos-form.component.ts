import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DepartamentosService } from 'src/app/services/departamentos.service';
import { DepartamentoRequest } from 'src/app/interfaces/requests/departamento-request';
import { DepartamentoResponse } from 'src/app/interfaces/responses/departamentos-response';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
import { EmpresaService } from 'src/app/services/empresa.service';
import { EmpresaResponse } from 'src/app/interfaces/responses/empresa-response';
import { CustomValidators } from 'src/app/components/utils/validators/validator.util';

@Component({
  selector: 'app-departamentos-form',
  templateUrl: './departamentos-form.component.html',
  styleUrls: ['./departamentos-form.component.css']
})
export class DepartamentosFormComponent implements OnInit {
  departamentoForm!: FormGroup;
  modoEdicion = false;
  idDepartamento!: number;
  empresas: EmpresaResponse[] = [];
  public CustomValidators = CustomValidators;

  constructor(
    private fb: FormBuilder,
    private departamentoService: DepartamentosService,
    private empresaService: EmpresaService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.departamentoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      cuenta: ['', Validators.required, CustomValidators.cuentaFormato],
      id_empresa: [null, Validators.required],
      estado: [true]
    });

    this.cargarEmpresas();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.modoEdicion = true;
      this.idDepartamento = +idParam;
      this.departamentoService.getDepartamentoById(this.idDepartamento).subscribe({
        next: (data: DepartamentoResponse) => {
          this.departamentoForm.patchValue({
            nombre: data.nombre,
            cuenta: data.cuenta,
            id_empresa: data.id_empresa,
            estado: data.estado
          });
        },
        error: () => this.mostrarMensajeError('No se pudo cargar el departamento.')
      });
    }
  }

  cargarEmpresas(): void {
    this.empresaService.getEmpresas().subscribe({
      next: (data) => (this.empresas = data),
      error: () => this.mostrarMensajeError('No se pudieron cargar las empresas.')
    });
  }

  guardar(): void {
    if (this.departamentoForm.invalid) {
      this.departamentoForm.markAllAsTouched();

      this.dialog.open(CustomMessageBoxComponent, {
        width: '400px',
        data: {
          title: 'Campos obligatorios',
          message: 'Debe completar correctamente todos los campos requeridos.',
          type: 'warning',
          confirmText: 'Entendido',
          showCancel: false
        }
      });

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
      error: () => this.mostrarMensajeError('Ocurrió un error al guardar el departamento.')
    });
  }


  cancelar(): void {
    this.departamentoForm.reset({ estado: true });
    this.router.navigate(['/seguridades/departamentos']);
  }

  private mostrarMensajeError(mensaje: string): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: 'Error',
        message: mensaje,
        type: 'error',
        confirmText: 'Cerrar',
        showCancel: false
      }
    });
  }
}
