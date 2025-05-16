import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PrefijoService, PrefijoClienteResponse,ActualizarPrefijoPayload} from 'src/app/services/prefijo.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ViewEncapsulation } from '@angular/core';
import { Renderer2 } from '@angular/core';
import { compileDeferResolverFunction } from '@angular/compiler';
import { formatDate } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';

@Component({
  selector: 'app-dialog-prefijo',
  templateUrl: './dialog-prefijo.component.html',
  styleUrl: './dialog-prefijo.component.css',
  encapsulation: ViewEncapsulation.None
})
export class DialogPrefijoComponent implements OnInit{

  idCliente: number;
  dataSourcePrefijo = new MatTableDataSource<PrefijoClienteResponse>();
  prefijoSeleccionado: PrefijoClienteResponse | null = null;

  displayedPrefijoColumns: string[] = [
    'id_prefijos',
    'clientesCodigo',
    'nomcli',
    'codpre',
    'gln',
    'fecha',
    'estado',
    'act',
    'fechaCierre'
  ];
  selectedTabIndex: number = 0;
    modificarSecuencia = false;
      campoGlnVerde = false;
      longitudPrefijo = 6; // Se puede cambiar dinámicamente si quieres
  longitudPrefijoMin = 0;
  longitudPrefijoMax = 0;
  formPrefijo!: FormGroup;

  @ViewChild('paginatorPrefijo', { static: false }) paginatorPrefijo!: MatPaginator;
  @ViewChild(MatSort) sortPrefijo!: MatSort;

  constructor(
    public dialogRef: MatDialogRef<DialogPrefijoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private prefijoService: PrefijoService,
    private renderer: Renderer2,
    private fb: FormBuilder 
  ) {
    this.idCliente = data.idCliente;
  }

  ngOnInit(): void {
    
    this.cargarPrefijoCliente(this.idCliente);
    this.formPrefijo = this.fb.group({
    codpre: [''],
    prefijosgs1: [''],
    origenPrefijo: [''],
    gln: [''],
    fecha: [''],
    fechaCierre: [''],
    observacion: ['']});
  }

  confirmar(): void {
    this.dialogRef.close(this.prefijoSeleccionado);
  }

  cargarPrefijoCliente(codigoCliente: number): void {
    this.prefijoService.obtenerPorClienteCodigo(codigoCliente).subscribe({
      next: (data) => {
        console.log('📦 Datos del cliente con prefijo:', data);
        const datos = Array.isArray(data) ? data : [];
        this.dataSourcePrefijo = new MatTableDataSource(datos);
        this.actualizarFormularioPrefijo();
        this.dataSourcePrefijo.filterPredicate = (item: PrefijoClienteResponse, filter: string) => {
          const dataStr = `${item.nomcli} ${item.ruccli} ${item.gln} ${item.codpre}`.toLowerCase();
          return dataStr.includes(filter.trim().toLowerCase());
        };

        setTimeout(() => {
          if (this.paginatorPrefijo && this.sortPrefijo) {
            this.dataSourcePrefijo.paginator = this.paginatorPrefijo;
            this.dataSourcePrefijo.sort = this.sortPrefijo;
          }
        }, 0);
      },
      error: (err) => {
        console.error('❌ Error al obtener prefijo del cliente:', err);
      }
    });
  }
seleccionarFila(prefijo: PrefijoClienteResponse, checked: boolean): void {
  this.prefijoSeleccionado = checked ? prefijo : null;
}

alternarEstadoSeleccionado(): void {
  if (!this.prefijoSeleccionado || !this.prefijoSeleccionado.id_prefijos) return;

  // Cambiar estado local
  this.prefijoSeleccionado.estado = !this.prefijoSeleccionado.estado;

  // Asignar fecha de cierre para visualización
  this.prefijoSeleccionado.fechaCierre = this.prefijoSeleccionado.estado
    ? new Date().toISOString().split('T')[0]  // Si está inactivo → fecha actual
    : '';                                     // Si está activo → dejar en blanco visualmente

  // Refrescar la tabla para reflejar el cambio
  this.dataSourcePrefijo._updateChangeSubscription();

  // Construir el payload exacto requerido por el backend
  const payload = {
    fechaCierre: this.prefijoSeleccionado.estado
      ? new Date().toISOString().split('T')[0] // string en formato YYYY-MM-DD
      : null,                                  // null si se activa
    observacion: 'Actualizado desde UI',
    estado: this.prefijoSeleccionado.estado
  };


  // Enviar al backend usando el servicio
  this.prefijoService.actualizarPrefijo(this.prefijoSeleccionado.id_prefijos, payload)
    .subscribe({
      next: () => {
        console.log('✅ Actualización exitosa');
      },
      error: err => {
        console.error('❌ Error al actualizar', err);
      }
    });
}

indiceSeleccionado = 0;

actualizarFormularioPrefijo(): void {
  const item = this.dataSourcePrefijo.data[this.indiceSeleccionado];

  if (item) {
    this.formPrefijo.patchValue({
      codpre: item.codpre || '',
      prefijosgs1: item.prefijosgs1 || '',
      origenPrefijo: item.origenPrefijo || '',
      gln: item.gln || '',
      fecha: item.fecha ? formatDate(item.fecha, 'dd/MM/yyyy', 'en-US') : '',
      fechaCierre: item.fechaCierre ? formatDate(item.fechaCierre, 'dd/MM/yyyy', 'en-US') : '',
      observacion: item.observacion || ''
    });
  }
}




nuevo(){
  this.indiceSeleccionado = 0;
}
modificar(){
  this.indiceSeleccionado = 0;
}
salir()
{
  this.indiceSeleccionado = 0;
}
imprimir()
{
  this.indiceSeleccionado = 0;
}
cancelar()
{
  this.indiceSeleccionado = 0;
}
primero() {
  this.indiceSeleccionado = 0;
  this.actualizarFormularioPrefijo();
}

anterior() {
  if (this.indiceSeleccionado > 0) {
    this.indiceSeleccionado--;
    this.actualizarFormularioPrefijo();
  }
}

siguiente() {
  if (this.indiceSeleccionado < this.dataSourcePrefijo.data.length - 1) {
    this.indiceSeleccionado++;
    this.actualizarFormularioPrefijo();
  }
}

ultimo() {
  this.indiceSeleccionado = this.dataSourcePrefijo.data.length - 1;
  this.actualizarFormularioPrefijo();
}



}
