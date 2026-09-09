import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

export interface CargaGlobalRubrosFijosResult {
  valor: number | null;
  numCuotas: number | null;
  cuotasPagadas: number | null;
}

@Component({
  selector: 'app-dialog-carga-global-rubros-fijos',
  templateUrl: './dialog-carga-global-rubros-fijo.component.html',
  styleUrls: ['./dialog-carga-global-rubros-fijo.component.css']
})
export class DialogCargaGlobalRubrosFijosComponent {
  form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<DialogCargaGlobalRubrosFijosComponent>
  ) {
    this.form = this.fb.group({
      valor: [null],
      numCuotas: [null],
      cuotasPagadas: [null]
    });
  }

  aceptar(): void {
    const result: CargaGlobalRubrosFijosResult = {
      valor: this.convertirNumeroONull(this.form.value.valor),
      numCuotas: this.convertirNumeroONull(this.form.value.numCuotas),
      cuotasPagadas: this.convertirNumeroONull(this.form.value.cuotasPagadas)
    };

    this.dialogRef.close(result);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  salir(): void {
    this.dialogRef.close(null);
  }

  private convertirNumeroONull(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numero = Number(String(value).replace(',', '.'));

    return isNaN(numero) ? null : numero;
  }
}