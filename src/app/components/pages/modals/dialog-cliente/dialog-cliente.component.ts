import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { Cliente } from '../../../../interfaces/cliente';

@Component({
  selector: 'app-dialog-cliente',
  templateUrl: './dialog-cliente.component.html',
  styleUrls: ['./dialog-cliente.component.css']
})
export class DialogClienteComponent implements OnInit {
  formCliente: FormGroup;
  accion: string = "Agregar";
  accionBoton: string = "Guardar";

  constructor(
    private dialogoReferencia: MatDialogRef<DialogClienteComponent>,
    @Inject(MAT_DIALOG_DATA) public clienteEditar: Cliente,
    private fb: FormBuilder,
    private _snackBar: MatSnackBar
  ) {
    this.formCliente = this.fb.group({
      nombre: ['', Validators.required],
    });

    // Si estamos editando un cliente, cambiamos la acción y el botón
    if (this.clienteEditar) {
      this.accion = "Editar";
      this.accionBoton = "Actualizar";
    }
  }

  ngOnInit(): void {
    // Si estamos editando, cargamos los valores del cliente
    
  }

 

  mostrarAlerta(mensaje: string, tipo: string): void {
    this._snackBar.open(mensaje, tipo, {
      horizontalPosition: "end",
      verticalPosition: "top",
      duration: 3000,
    });
  }
}
