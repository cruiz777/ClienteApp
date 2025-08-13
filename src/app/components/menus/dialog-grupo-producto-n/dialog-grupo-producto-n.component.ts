import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GrupoProductoNService, GrupoProductoRequest } from 'src/app/services/grupo-producto-n.service';

@Component({
  selector: 'app-dialog-grupo-producto-n',
  standalone: true,
  templateUrl: './dialog-grupo-producto-n.component.html',
  styleUrls: ['./dialog-grupo-producto-n.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule
  ]
})
export class DialogGrupoProductoNComponent implements OnInit {
  form!: FormGroup;
  modo: 'nuevo' | 'editar' = 'nuevo';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DialogGrupoProductoNComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GrupoProductoRequest | null,
    private service: GrupoProductoNService,
    
  ) {}

 ngOnInit(): void {
  this.form = this.fb.group({
    id_grupo_producto: [0],
    codigo: ['', Validators.required],
    descripcion: ['', Validators.required],
    segmento: [''],
    desSegmento: [''],
    familia: [''],
    desFamilia: [''],
    clase: [''],
    desClase: [''],
    brick: [''],
    desBrick: [''],
    desSegmentoing: [''],
    desFamiliaing: [''],
    desClaseing: [''],
    desBricking: [''],
    brickIncludes: [''],
    brickExcludes: [''],
    estado: [true]
  });

  if (this.data) {
    this.modo = 'editar';
    this.form.patchValue(this.data);
  }
}


guardar(): void {
  const payload: GrupoProductoRequest = this.form.value;
 
  console.log('🧾 Payload a enviar:', payload);

  if (this.modo === 'editar') {
    this.service.update(payload.id_grupo_producto, payload).subscribe({
      next: (resp) => {
        console.log('✅ Actualizado correctamente', resp);
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('❌ Error al actualizar', err);
      }
    });
  } else {
    this.service.create(payload).subscribe({
      next: (resp) => {
        console.log('✅ Creado correctamente', resp);
        console.log('📦 Enviando a API', { request: payload });

        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('❌ Error al crear', err);
      }
    });
  }
}





  cancelar(): void {
    this.dialogRef.close(false);
  }
  
}
