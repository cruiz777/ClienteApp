import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { PerfilesRequest } from 'src/app/interfaces/requests/perfil-request';
import { OpcionesRequest } from 'src/app/interfaces/requests/opcion-request'
import { MenusRequest } from 'src/app/interfaces/requests/menu-request'
import { ModulosRequest } from 'src/app/interfaces/requests/modulo-request'
import { SistemasRequest } from 'src/app/interfaces/requests/sistema-request'

import { PerfilesService } from 'src/app/services/perfil.service';
import { ModuloService } from 'src/app/services/modulo.service';
import { MenuService } from 'src/app/services/menu.service';
import { OpcionService } from 'src/app/services/opcion.service';
import { SistemaService } from 'src/app/services/sistema.service';

@Component({
  selector: 'app-perfiles-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './perfiles-form.component.html',
  styleUrls: ['./perfiles-form.component.css']
})
export class PerfilesFormComponent implements OnInit {

  form!: FormGroup;
  idEmpresa: number = 1;
  idPerfil?: number;
  tipo!: 'sistema' | 'modulo' | 'menu' | 'opcion' | 'perfil';
  idRelacionado!: number;
  cargando = false;

  constructor(
    private fb: FormBuilder,
    public perfilService: PerfilesService,
    private moduloService: ModuloService,
    private menuService: MenuService,
    private opcionService: OpcionService,
    private sistemaService: SistemaService,
    public dialogRef: MatDialogRef<PerfilesFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.tipo = data?.tipo || 'perfil';
    this.idRelacionado = data?.idRelacionado ?? 0;

  }


  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: ['', Validators.required]
    });

    if (this.data?.id) {
      this.idPerfil = this.data.id;
      this.form.patchValue({ nombre: this.data.nombre || '' });
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  grabar(): void {
    if (this.form.invalid) return;
    this.cargando = true;

    const nombre = this.form.value.nombre.trim();

    switch (this.tipo) {
      case 'perfil':
        const perfilRequest: PerfilesRequest = {
          nombre,
          descripcion: nombre,
          id_empresa: this.idEmpresa,
          fecha_creacion: new Date().toISOString(),
          estado: true,
        };
        if (this.idPerfil) {
          this.perfilService.updatePerfiles(this.idPerfil, perfilRequest).subscribe({
            next: () => this.dialogRef.close(true),
            error: () => alert('❌ Error al actualizar el perfil.')
          });
        } else {
          this.perfilService.createPerfiles(perfilRequest).subscribe({
            next: () => this.dialogRef.close(true),
            error: () => alert('❌ Error al crear el perfil.')
          });
        }
        break;

      case 'modulo':
        const moduloRequest: ModulosRequest = {
          id_sistema: this.idRelacionado,
          nombre,
          descripcion: nombre,
          status: true
        };
        this.moduloService.createModulo(moduloRequest).subscribe({
          next: () => { this.cargando = false; this.dialogRef.close(true); },
          error: () => { this.cargando = false; alert('❌ Error al crear el módulo.'); }
        });
        break;

      case 'menu':
        const menuRequest: MenusRequest = {
          id_modulo: this.idRelacionado,
          nombre,
          descripcion: nombre,
          status: true
        };
        this.menuService.createMenu(menuRequest).subscribe({
          next: () => { this.cargando = false; this.dialogRef.close(true); },
          error: () => { this.cargando = false; alert('❌ Error al crear el menú.'); }
        });
        break;

      case 'opcion':
        const opcionRequest: OpcionesRequest = {
          id_menu: this.idRelacionado,
          nombre,
          descripcion: nombre,
          status: true
        };
        this.opcionService.createOpcion(opcionRequest).subscribe({
          next: () => { this.cargando = false; this.dialogRef.close(true); },
          error: () => { this.cargando = false; alert('❌ Error al crear el opción.'); }
        });
        break;

      case 'sistema':
        const sistemaRequest: SistemasRequest = {
          id_empresa: this.idRelacionado,
          nombre,
          descripcion: nombre,
          status: true
        };
        this.sistemaService.createSistema(sistemaRequest).subscribe({
          next: () => { this.cargando = false; this.dialogRef.close(true); },
          error: () => { this.cargando = false; alert('❌ Error al crear el sistema.'); }
        });
        break;
    }
  }


}
