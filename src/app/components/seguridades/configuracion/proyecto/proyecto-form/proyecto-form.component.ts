import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProyectoService } from 'src/app/services/proyecto.service';
import { EmpresaService } from 'src/app/services/empresa.service';
import { EmpresaResponse } from 'src/app/interfaces/responses/empresa-response';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';

@Component({
  selector: 'app-proyecto-form',
  templateUrl: './proyecto-form.component.html',
  styleUrls: ['./proyecto-form.component.css']
})
export class ProyectoFormComponent implements OnInit {
  form!: FormGroup;
  esEdicion = false;
  idProyecto: number | null = null;
  empresas: EmpresaResponse[] = [];

  constructor(
    private fb: FormBuilder,
    private proyectoService: ProyectoService,
    private empresaService: EmpresaService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      descripcion: ['', [Validators.required, Validators.maxLength(100)]],
      estado: [true, Validators.required],
      empresaCodigo: [null, Validators.required]
    });

    this.cargarEmpresas();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.esEdicion = true;
        this.idProyecto = +id;
        this.cargarProyecto(this.idProyecto);
      }
    });
  }

  cargarEmpresas(): void {
    this.empresaService.getEmpresas().subscribe({
      next: (data) => this.empresas = data,
      error: (err) => console.error('Error al cargar empresas:', err)
    });
  }

  cargarProyecto(id: number): void {
    this.proyectoService.getById(id).subscribe({
      next: (resp) => {
        const proyecto = resp.data;
        this.form.patchValue({
          descripcion: proyecto.descripcion,
          estado: proyecto.estado,
          empresaCodigo: proyecto.idEmpresa
        });
      },
      error: (err) => console.error('Error al cargar proyecto:', err)
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const data = {
      ...this.form.value,
      idEmpresa: this.form.value.empresaCodigo
    };

    const request$ = this.esEdicion && this.idProyecto
      ? this.proyectoService.update(this.idProyecto, data)
      : this.proyectoService.create(data);

    request$.subscribe({
      next: () => {
        this.dialog.open(CustomMessageBoxComponent, {
          data: {
            type: 'success',
            title: 'Éxito',
            message: `Proyecto ${this.esEdicion ? 'actualizado' : 'creado'} correctamente.`,
            confirmText: 'Aceptar',
            showCancel: false
          }
        }).afterClosed().subscribe(() => {
          this.router.navigate(['/seguridades/proyectos']);
        });
      },
      error: (err) => {
        console.error('Error al guardar proyecto:', err);
        this.dialog.open(CustomMessageBoxComponent, {
          data: {
            type: 'error',
            title: 'Error',
            message: 'Ocurrió un error al guardar el proyecto.',
            confirmText: 'Aceptar',
            showCancel: false
          }
        });
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/seguridades/proyectos']);
  }
}
