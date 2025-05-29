import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { PerfilesRequest } from 'src/app/interfaces/requests/perfil-request';
import { PerfilesService } from 'src/app/services/perfil.service';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';

@Component({
  selector: 'app-perfiles-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './perfiles-form.component.html',
  styleUrl: './perfiles-form.component.css'
})
export class PerfilesFormComponent implements OnInit {

  nombrePerfil: string = '';
  idEmpresa: number = 1;
  idPerfil?: number;

  constructor(
    public perfilService: PerfilesService,
    public dialogRef: MatDialogRef<PerfilesFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    if (this.data?.id) {
      this.idPerfil = this.data.id;
      this.nombrePerfil = this.data.nombre || '';
    }
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  createPerfil(): void {
    if (!this.nombrePerfil.trim()) {
      alert('⚠️ El nombre del perfil es obligatorio.');
      return;
    }

    const request: PerfilesRequest = {
      nombre: this.nombrePerfil.trim(),
      descripcion: this.nombrePerfil.trim(),
      id_empresa: this.idEmpresa,
      fecha_creacion: new Date().toISOString(),
      estado: true,
    };

    if (this.idPerfil) {
      console.log('Actualizar perfil con ID:', this.idPerfil, request);
      this.perfilService.updatePerfiles(this.idPerfil, request).subscribe({
        next: () => this.dialogRef.close(true),
        error: () => alert('❌ Error al crear el perfil.')
      })
    } else {
      this.perfilService.createPerfiles(request).subscribe({
        next: () => this.dialogRef.close(true),
        error: () => alert('❌ Error al crear el perfil.')
      });
    }
  }
}
