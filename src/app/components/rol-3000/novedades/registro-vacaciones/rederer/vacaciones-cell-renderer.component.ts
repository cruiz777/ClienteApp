import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { VacacionTomadaGridResponse } from 'src/app/interfaces/responses/vacaciones.response';

export interface AccionesVacacionesCellParams extends ICellRendererParams {
  data: VacacionTomadaGridResponse;
  onEditar: (row: VacacionTomadaGridResponse) => void;
  onEliminar: (row: VacacionTomadaGridResponse) => void;
  onImprimir: (row: VacacionTomadaGridResponse) => void;
}

@Component({
  selector: 'app-acciones-vacaciones-cell-renderer',
  template: `
    <div class="acciones-container">
      <button class="action-btn" (click)="onClickEditar()" title="Editar">
        <img src="assets/icons/icon-modificar.png" alt="Editar" />
      </button>

      <button class="action-btn" (click)="onClickEliminar()" title="Eliminar">
        <img src="assets/icons/icon-basurero.png" alt="Eliminar" />
      </button>

      <button class="action-btn" (click)="onClickImprimir()" title="Reimprimir">
        <img src="assets/icons/icon-imprimir.png" alt="Imprimir" />
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      .acciones-container {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        height: 100%;
        padding: 4px;
      }

      .action-btn {
        background: #ffffff;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        cursor: pointer;
        padding: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 28px;
        transition: all 0.2s;
      }

      .action-btn:hover {
        background-color: #f3f4f6;
        border-color: #9ca3af;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .action-btn:active {
        transform: translateY(0);
        box-shadow: none;
      }

      .action-btn img {
        width: 18px;
        height: 18px;
        display: block;
        pointer-events: none;
      }
    `
  ]
})
export class AccionesVacacionesCellRendererComponent implements ICellRendererAngularComp {
  params!: AccionesVacacionesCellParams;

  agInit(params: AccionesVacacionesCellParams): void {
    this.params = params;
  }

  refresh(params: AccionesVacacionesCellParams): boolean {
    this.params = params;
    return true;
  }

  onClickEditar(): void {
    this.params.onEditar?.(this.params.data);
  }

  onClickEliminar(): void {
    this.params.onEliminar?.(this.params.data);
  }

  onClickImprimir(): void {
    this.params.onImprimir?.(this.params.data);
  }
}