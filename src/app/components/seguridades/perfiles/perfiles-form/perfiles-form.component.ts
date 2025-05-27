import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { PerfilesRequest } from 'src/app/interfaces/requests/perfil-request'
import { PerfilesService } from 'src/app/services/perfil.service';
import { ApiResponse } from '../../../../interfaces/responses/api-response';


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
export class PerfilesFormComponent {

  nombrePerfil: string = '';
  idEmpresa: number = 1;

  constructor(
    public perfilService :PerfilesService,
    public dialogRef: MatDialogRef<PerfilesFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  cerrar(): void {
    this.dialogRef.close();
  }

  createPerfil():void{
    if (!this.nombrePerfil.trim()) {
      alert('⚠️ El nombre del perfil es obligatorio.');
      return;
    }

    const request: PerfilesRequest = {
      nombre: this.nombrePerfil.trim(),
      descripcion: '',
      id_empresa: this.idEmpresa,
      fecha_creacion: new Date().toISOString()
    };


  }

}


