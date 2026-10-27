
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { HttpErrorResponse } from '@angular/common/http';

import { Subject, of } from 'rxjs';

import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  switchMap,
  takeUntil
} from 'rxjs/operators';

import { ClienteService } from 'src/app/services/cliente.service';
import { EliminarClienteService } from 'src/app/services/eliminar-cliente.service';

import { ClienteSummary } from 'src/app/interfaces/responses/cliente-summary-response';

import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';

// ==========================================================
// RESPUESTA ELIMINACIÓN
// ==========================================================

interface EliminarClienteResultado {
  success: boolean;
  estado: string;
  message: string;
  clientesCodigo: number;
  totalProductos?: number;
  totalDatosAdicionales?: number;
  totalCodigos14?: number;
  totalPrefijos?: number;
  totalGln?: number;
}

// ==========================================================
// COMPONENTE
// ==========================================================

@Component({
  selector: 'app-eliminar-cliente',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './eliminar-cliente.component.html',
  styleUrls: ['./eliminar-cliente.component.css']
})
export class EliminarClienteComponent implements OnInit, OnDestroy {

  // ========================================================
  // CONTROL DE BÚSQUEDA
  // ========================================================

  clienteControl = new FormControl<string | ClienteSummary>('');

  clientesFiltrados: ClienteSummary[] = [];

  clienteSeleccionado: ClienteSummary | null = null;

  // ========================================================
  // ESTADOS
  // ========================================================

  buscando = false;

  eliminando = false;

  mensajeError = '';

  resultado: EliminarClienteResultado | null = null;

  private readonly destroy$ = new Subject<void>();

  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(
    private readonly clienteService: ClienteService,
    private readonly eliminarClienteService: EliminarClienteService,
    private readonly dialog: MatDialog
  ) { }

  // ========================================================
  // INICIALIZACIÓN
  // ========================================================

  ngOnInit(): void {

    this.clienteControl.valueChanges
      .pipe(

        takeUntil(this.destroy$),

        debounceTime(300),

        distinctUntilChanged(),

        switchMap(valor => {

          // Cuando se selecciona un cliente del autocomplete,
          // no ejecutar otra búsqueda ni limpiar su información.
          if (typeof valor !== 'string') {
            this.buscando = false;
            return of([] as ClienteSummary[]);
          }

          this.clienteSeleccionado = null;
          this.resultado = null;
          this.mensajeError = '';

          const texto = valor.trim();

          if (!texto) {
            this.buscando = false;
            return of([] as ClienteSummary[]);
          }

          this.buscando = true;

          return this.clienteService.getClientesSummary(texto).pipe(
            map(resp => resp.data || []),
            catchError(error => {
              console.error('Error buscando clientes:', error);

              this.mensajeError = 'No fue posible consultar los clientes.';

              return of([] as ClienteSummary[]);
            }),
            finalize(() => {
              this.buscando = false;
            })
          );
        })

      )
      .subscribe(clientes => {

        this.clientesFiltrados = clientes;

      });
  }

  // ========================================================
  // MOSTRAR NOMBRE EN AUTOCOMPLETE
  // ========================================================

  mostrarNombreCliente = (
    cliente: string | ClienteSummary | null
  ): string => {

    if (typeof cliente === 'string') {
      return cliente;
    }

    return cliente?.nomcli || '';
  };

  // ========================================================
  // SELECCIONAR CLIENTE
  // ========================================================

  seleccionarCliente(cliente: ClienteSummary): void {

    if (!cliente?.clientes_codigo) {
      return;
    }

    this.clienteSeleccionado = cliente;

    this.clientesFiltrados = [];

    this.mensajeError = '';

    this.resultado = null;
  }

  // ========================================================
  // LIMPIAR
  // ========================================================

  limpiar(): void {

    if (this.eliminando) {
      return;
    }

    this.clienteSeleccionado = null;

    this.clientesFiltrados = [];

    this.resultado = null;

    this.mensajeError = '';

    this.buscando = false;

    this.clienteControl.setValue('');
  }

  // ========================================================
  // VALIDAR SI PUEDE ELIMINAR
  // ========================================================

  get puedeEliminar(): boolean {

    return (
      !!this.clienteSeleccionado?.clientes_codigo &&
      !this.eliminando &&
      !this.buscando
    );
  }

  // ========================================================
  // ELIMINAR CLIENTE
  // ========================================================

  eliminarCliente(): void {

    if (
      !this.puedeEliminar ||
      !this.clienteSeleccionado
    ) {
      return;
    }

    const cliente = this.clienteSeleccionado;

    const id = cliente.clientes_codigo;

    // ======================================================
    // CONFIRMACIÓN
    // ======================================================

    const confirmacion = this.dialog.open(
      CustomMessageBoxComponent,
      {
        width: '460px',

        disableClose: true,

        data: {
          title: 'Confirmar eliminación',

          message:
            `¿Está seguro de eliminar al cliente ${cliente.nomcli} ` +
            `(código ${id})?\n\n` +
            'Esta acción eliminará sus GLN y prefijos únicamente ' +
            'si el cliente no tiene productos asociados.\n\n' +
            'Esta operación no se puede deshacer.',

          type: 'warning',

          confirmText: 'Sí, eliminar',

          cancelText: 'Cancelar',

          showCancel: true
        }
      }
    );

    confirmacion.afterClosed()
      .pipe(

        filter(confirmado => confirmado === true),

        takeUntil(this.destroy$)

      )
      .subscribe(() => {

        this.ejecutarEliminacion(id);

      });
  }

  // ========================================================
  // EJECUTAR ELIMINACIÓN
  // ========================================================

  private ejecutarEliminacion(id: number): void {

    this.eliminando = true;

    this.mensajeError = '';

    this.resultado = null;

    this.clienteControl.disable({
      emitEvent: false
    });

    // Utilizar EliminarClienteService
    this.eliminarClienteService
      .eliminarCliente(id)
      .pipe(

        takeUntil(this.destroy$),

        finalize(() => {

          this.eliminando = false;

          this.clienteControl.enable({
            emitEvent: false
          });

        })

      )
      .subscribe({

        // ==================================================
        // RESPUESTA CORRECTA
        // ==================================================

        next: (resp: EliminarClienteResultado) => {

          this.resultado = resp;

          if (resp.success === true) {

            this.mostrarMensaje(
              'Cliente eliminado',
              resp.message ||
              'El cliente fue eliminado correctamente.',
              'success'
            );

            this.clienteSeleccionado = null;

            this.clientesFiltrados = [];

            this.clienteControl.setValue('', {
              emitEvent: false
            });

          } else {

            this.mostrarMensaje(
              'No se puede eliminar',
              resp.message ||
              'El cliente tiene registros asociados.',
              'warning'
            );
          }
        },

        // ==================================================
        // ERRORES HTTP
        // ==================================================

        error: (error: HttpErrorResponse) => {

          console.error(
            'Error eliminando cliente:',
            error
          );

          const respuesta =
            error.error as
            Partial<EliminarClienteResultado> | null;

          // ================================================
          // 409 - CLIENTE CON PRODUCTOS
          // ================================================

          if (error.status === 409) {

            const mensaje =
              respuesta?.message ||
              'No se puede eliminar el cliente porque tiene productos asociados.';

            this.resultado = {
              success: false,
              estado: 'BLOCKED',
              message: mensaje,
              clientesCodigo: id,
              totalProductos: respuesta?.totalProductos,
              totalDatosAdicionales:
                respuesta?.totalDatosAdicionales,
              totalCodigos14: respuesta?.totalCodigos14,
              totalPrefijos: respuesta?.totalPrefijos,
              totalGln: respuesta?.totalGln
            };

            this.mostrarMensaje(
              'No se puede eliminar',
              mensaje,
              'warning'
            );

            return;
          }

          // ================================================
          // 404 - CLIENTE NO EXISTE
          // ================================================

          if (error.status === 404) {

            this.mensajeError =
              'El cliente ya no existe.';

            this.mostrarMensaje(
              'Cliente no encontrado',
              this.mensajeError,
              'warning'
            );

            return;
          }

          // ================================================
          // 400 - REQUEST INVÁLIDO
          // ================================================

          if (error.status === 400) {

            this.mensajeError =
              respuesta?.message ||
              'La solicitud de eliminación no es válida.';

            this.mostrarMensaje(
              'Solicitud inválida',
              this.mensajeError,
              'warning'
            );

            return;
          }

          // ================================================
          // OTROS ERRORES
          // ================================================

          this.mensajeError =
            'No fue posible eliminar el cliente. ' +
            'Verifique el servicio o los registros del servidor.';

          this.mostrarMensaje(
            'Error',
            this.mensajeError,
            'error'
          );
        }
      });
  }

  // ========================================================
  // MOSTRAR MENSAJE
  // ========================================================

  private mostrarMensaje(
    title: string,
    message: string,
    type: 'success' | 'warning' | 'error'
  ): void {

    this.dialog.open(
      CustomMessageBoxComponent,
      {
        width: '460px',

        data: {
          title,
          message,
          type,
          confirmText: 'Aceptar',
          showCancel: false
        }
      }
    );
  }

  // ========================================================
  // DESTRUIR COMPONENTE
  // ========================================================

  ngOnDestroy(): void {

    this.destroy$.next();

    this.destroy$.complete();
  }
}
