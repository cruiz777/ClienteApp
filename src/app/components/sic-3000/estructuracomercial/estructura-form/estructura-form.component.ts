import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { EstructuraComercialService } from 'src/app/services/estructura-comercial.service'
import { DivisionService } from 'src/app/services/division.service'
import { SubdivisionService } from 'src/app/services/subdivision.service'
import { DepartamentoService } from 'src/app/services/departamento.service'
import { SeccionService } from 'src/app/services/seccion.service'
import { GrupoService } from 'src/app/services/grupo.service'

import { EstructuraComercialRequest } from '../../../../interfaces/requests/estructura-comercial-request'
import { DivisionRequest } from '../../../../interfaces/requests/division-request'
import { SubDivisionRequest } from '../../../../interfaces/requests/subdivision-request'
import { DepartamentoRequest } from '../../../../interfaces/requests/departamento-request'
import { SeccionRequest } from '../../../../interfaces/requests/seccion-request'
import { GrupoRequest } from '../../../../interfaces/requests/grupo-request'

@Component({
  selector: 'app-estructura-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './estructura-form.component.html',
  styleUrl: './estructura-form.component.css'
})
export class EstructuraFormComponent {

  form!: FormGroup;
  idGeneral?: number;
  tipo!: 'estructuraComercial' | 'division' | 'subDivision' | 'departamento' | 'seccion' | 'grupo';

  constructor(
    private fb: FormBuilder,
    private estructuraService: EstructuraComercialService,
    private divisionService: DivisionService,
    private subdivisionService: SubdivisionService,
    private departamentoService: DepartamentoService,
    private seccionService: SeccionService,
    private grupoService: GrupoService,
    public dialogRef: MatDialogRef<EstructuraFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.tipo = data?.tipo || 'estructuraComercial';
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: ['', Validators.required]
    });

    if (this.data?.id) {
      this.idGeneral = this.data.id;
      this.form.patchValue({ nombre: this.data.nombre || '' });
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  grabar(): void {
    if (this.form.invalid) return;

    const nombre = this.form.value.nombre.trim();
    if (!nombre) return;

    const request = { descripcion: nombre }; // todos los request comparten esta propiedad

    let accion$: any;

    switch (this.tipo) {
      case 'estructuraComercial':
        const estructuraData: EstructuraComercialRequest = {
          id_estructura_comercial: this.idGeneral || 0,
          id_empresa: this.data?.idPadre || 1, // asumiendo empresaId = 1
          descri: nombre
        };
        accion$ = this.idGeneral
          ? this.estructuraService.update(estructuraData)
          : this.estructuraService.create(estructuraData);
        break;

      case 'division':
        const divisionData: DivisionRequest = {
          id_division: this.idGeneral || 0,
          id_estructura_comercial: this.data?.idPadre,
          descripcion: nombre
        };
        accion$ = this.idGeneral
          ? this.divisionService.update(divisionData)
          : this.divisionService.create(divisionData);
        break;

      case 'subDivision':
        const subData: SubDivisionRequest = {
          id_subdivision: this.idGeneral || 0,
          id_division: this.data?.idPadre,
          descripcion: nombre
        };
        accion$ = this.idGeneral
          ? this.subdivisionService.update(subData)
          : this.subdivisionService.create(subData);
        break;

      case 'departamento':
        const deptoData: DepartamentoRequest = {
          id_departamento: this.idGeneral || 0,
          id_sub_division: this.data?.idPadre,
          descripcion: nombre
        };
        accion$ = this.idGeneral
          ? this.departamentoService.update(deptoData)
          : this.departamentoService.create(deptoData);
        break;

      case 'seccion':
        const seccionData: SeccionRequest = {
          id_seccion: this.idGeneral || 0,
          id_departamento: this.data?.idPadre,
          descripcion: nombre
        };
        accion$ = this.idGeneral
          ? this.seccionService.update(seccionData)
          : this.seccionService.create(seccionData);
        break;

      case 'grupo':
        const grupoData: GrupoRequest = {
          id_grupo: this.idGeneral || 0,
          id_seccion: this.data?.idPadre,
          descripcion: nombre
        };
        accion$ = this.idGeneral
          ? this.grupoService.update(grupoData)
          : this.grupoService.create(grupoData);
        break;
    }

    // if (accion$) {
    //   accion$.subscribe(res => {
    //     if (res.success) {
    //       this.dialogRef.close(true); // cerrar y notificar éxito
    //     }
    //   });
    // }
  }


}
