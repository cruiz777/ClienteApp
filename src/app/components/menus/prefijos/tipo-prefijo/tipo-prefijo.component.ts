import { Component, OnInit } from '@angular/core';
import { NcontrolService, NumeroControlResumenDto } from 'src/app/services/ncontrol.service';

@Component({
  selector: 'app-tipo-prefijo',
  templateUrl: './tipo-prefijo.component.html',
  styleUrls: ['./tipo-prefijo.component.css']
})
export class TipoPrefijoComponent implements OnInit {
  public listaPrefijos: NumeroControlResumenDto[] = [];

  constructor(private ncontrolService: NcontrolService) {}

  ngOnInit(): void {
    this.ncontrolService.obtenerPrefijosYGtin().subscribe(response => {
      this.listaPrefijos = Array.isArray(response.data) ? response.data : [];
      console.log('Datos cargados:', this.listaPrefijos);
    });
  }
  actualizarPrefijo(prefijo: NumeroControlResumenDto): void {
  console.log('Actualizar:', prefijo);
  // Aquí puedes abrir un diálogo, navegar a una ruta o emitir un evento
}
public prefijoSeleccionado: NumeroControlResumenDto | null = null;
public nuevoNumcon: string = '';

abrirModalEditar(prefijo: NumeroControlResumenDto): void {
  this.prefijoSeleccionado = { ...prefijo }; // copia para no editar directo
  this.nuevoNumcon = prefijo.numcon;
  const dialog = document.getElementById('modal-edicion') as HTMLDialogElement;
  dialog.showModal();
}

cerrarModal(): void {
  const dialog = document.getElementById('modal-edicion') as HTMLDialogElement;
  dialog.close();
}

guardarCambios(): void {
  if (this.prefijoSeleccionado) {
    const id = this.prefijoSeleccionado.id;
    const payload = {
      numcon: this.nuevoNumcon,
      ocupado: this.prefijoSeleccionado.ocupado // o true/false según lógica
    };

    this.ncontrolService.actualizarNumeroControl(id, payload).subscribe({
      next: () => {
        // Actualiza localmente en la tabla
        const index = this.listaPrefijos.findIndex(p => p.id === id);
        if (index !== -1) {
          this.listaPrefijos[index].numcon = this.nuevoNumcon;
        }

        this.cerrarModal();
        console.log('✅ Prefijo actualizado con éxito.');
      },
      error: (err) => {
        console.error('❌ Error al actualizar el prefijo:', err);
        alert('Ocurrió un error al guardar los cambios.');
      }
    });
  }
}

trackById(index: number, item: NumeroControlResumenDto): number {
  return item.id;
}

}
