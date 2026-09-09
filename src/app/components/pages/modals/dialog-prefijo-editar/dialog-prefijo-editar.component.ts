import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PrefijoService, PrefijoClienteResponse, ActualizarPrefijoPayload } from 'src/app/services/prefijo.service';
import { MatDialogRef } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';

@Component({
  selector: 'app-dialog-prefijo-editar',
  templateUrl: './dialog-prefijo-editar.component.html',
  styleUrls: ['./dialog-prefijo-editar.component.css']
})
export class DialogPrefijoEditarComponent implements OnInit {
  formPrefijo!: FormGroup;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { codpre: string },
    private fb: FormBuilder,
    private prefijoService: PrefijoService,
      private dialog: MatDialog,
    private dialogRef: MatDialogRef<DialogPrefijoEditarComponent> 
  ) {
    console.log('🔍 codpre recibido en el modal:', data.codpre);
  }

  ngOnInit(): void {
    this.cargarPrefijo(this.data.codpre);

    this.formPrefijo = this.fb.group({
      id_prefijos:[''],
      clientesCodigo: [''],
      nomcli: [''],
      ruccli:[''],
      codpre: [''],
      prefijosgs1: [''],
      origenPrefijo: [''],
      gln: [''],
      fecha: [''],
      fechaCierre: [''],
      observacion: [''],
      estado:['']
    });
  }

  cargarPrefijo(codpre: string): void {
 this.prefijoService.obtenerDetallePrefijo(codpre).subscribe({
  next: (datos: PrefijoClienteResponse[]) => {
    const item = datos[0];
    this.formPrefijo.patchValue({
      codpre: item.codpre || '',
      prefijosgs1: item.prefijosgs1 || '',
      origenPrefijo: item.origenPrefijo || '',
      gln: item.gln || '',
      fecha: item.fecha || '',
      fechaCierre: item.fechaCierre || '',
      observacion: item.observacion || '',
      clientesCodigo:item.clientesCodigo,
      ruccli:item.ruccli,
      nomcli:item.nomcli,
      estado:item.estado,
      id_prefijos:item.id_prefijos
    });
  },
  error: (err) => {
    console.error('❌ Error al cargar prefijo:', err);
  }
});


  }


onToggleDesactivar(event: Event): void {
  const checked = (event.target as HTMLInputElement).checked;

  if (checked) {
    const hoy = new Date();
    this.formPrefijo.get('fechaCierre')?.setValue(hoy);
  } else {
    this.formPrefijo.get('fechaCierre')?.setValue(null);
    this.formPrefijo.get('observacion')?.setValue(''); // solo se limpia aquí
  }
}


guardar(): void {
  const form = this.formPrefijo;

  const payload: ActualizarPrefijoPayload = {
    fechaCierre: form.get('estado')?.value
      ? new Date().toISOString().split('T')[0]
      : null,
    observacion: form.get('observacion')?.value || '',
    estado: form.get('estado')?.value
  };

  const idPrefijo = form.get('id_prefijos')?.value;

  if (!idPrefijo) {
    console.warn('⚠️ ID del prefijo no definido');
    return;
  }

  this.prefijoService.actualizarPrefijo(idPrefijo, payload).subscribe({
    next: () => {
      console.log('✅ Actualización exitosa');

      // ✅ Mostrar mensaje de éxito
      this.dialog.open(CustomMessageBoxComponent, {
        width: '400px',
        data: {
          title: 'Éxito',
          message: `El Prefijo fue actualizado correctamente.`,
          type: 'success',
          confirmText: '',
          showCancel: false
        }
      });

      // ❌ Solo cerrar si quieres
      // this.dialogRef.close('actualizado');
    },
    error: err => {
      console.error('❌ Error al actualizar', err);
    }
  });
}


esFechaValida(fecha: string | null): boolean {
  return !!fecha && fecha !== '0001-01-01T00:00:00';
}

onObservacionInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  this.formPrefijo.get('observacion')?.setValue(value);
}

cerrar(): void {
  this.dialogRef.close('actualizado'); // o cualquier otro valor que quieras retornar
}

}
