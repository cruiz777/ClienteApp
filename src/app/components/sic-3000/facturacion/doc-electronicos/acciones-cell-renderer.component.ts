// acciones-cell-renderer.component.ts
import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { DocumentoGrid } from 'src/app/services/docs-elect.service';

export interface AccionesCellParams extends ICellRendererParams {
  data: DocumentoGrid;
  onVerPDF: (claveAcceso: string) => void;
  onVerXML: (claveAcceso: string) => void;
  onReenviar: (id: number, claveAcceso: string) => void;
  onAnular: (id: number) => void;
  isAnulado?: (data: DocumentoGrid) => boolean; // 👈 AGREGAR
}

@Component({
  selector: 'app-acciones-cell-renderer',
  template: `
    <div class="acciones-container">
      <button
        class="action-btn"
        [disabled]="!puedeReimprimir || estaAnulado"
        (click)="onClickPDF()"
        title="Ver PDF"
      >
        <img src="assets/icons/icon-pdf.png" alt="PDF" />
      </button>

      <button
        class="action-btn"
        [disabled]="!puedeReimprimir || estaAnulado"
        (click)="onClickXML()"
        title="Ver XML"
      >
        <img src="assets/icons/icon-xml.png" alt="XML" />
      </button>

      <button
        class="action-btn"
        [disabled]="!puedeReimprimir || estaAnulado"
        (click)="onClickReenviar()"
        title="Reenviar correo"
      >
        <img src="assets/icons/icon-envio.png" alt="Reenviar" />
      </button>

      <button
        class="action-btn"
        [disabled]="estaAnulado"
        (click)="onClickAnular()"
        title="Anular documento"
      >
        <img src="assets/icons/icon-anulacion.png" alt="Anular" />
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

      .action-btn:hover:not(:disabled) {
        background-color: #f3f4f6;
        border-color: #9ca3af;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .action-btn:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: none;
      }

      .action-btn img {
        width: 18px;
        height: 18px;
        display: block;
        pointer-events: none;
      }

      .action-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        background-color: #f9fafb;
      }

      .action-btn:disabled:hover {
        background-color: #f9fafb;
        border-color: #d1d5db;
        transform: none;
        box-shadow: none;
      }
    `,
  ],
})
export class AccionesCellRendererComponent implements ICellRendererAngularComp {
  params!: AccionesCellParams;
  puedeReimprimir = false;
  estaAnulado = false; // 👈 AGREGAR

  agInit(params: AccionesCellParams): void {
    this.params = params;
    this.puedeReimprimir = params.data?.puedeReimprimir ?? false;
    this.estaAnulado = params.isAnulado ? params.isAnulado(params.data) : false; // 👈 AGREGAR
  }

  refresh(params: AccionesCellParams): boolean {
    this.params = params;
    this.puedeReimprimir = params.data?.puedeReimprimir ?? false;
    this.estaAnulado = params.isAnulado ? params.isAnulado(params.data) : false; // 👈 AGREGAR
    return true;
  }

  onClickPDF(): void {
    if (this.puedeReimprimir && !this.estaAnulado && this.params.onVerPDF) {
      this.params.onVerPDF(this.params.data.claveAcceso);
    }
  }

  onClickXML(): void {
    if (this.puedeReimprimir && !this.estaAnulado && this.params.onVerXML) {
      this.params.onVerXML(this.params.data.claveAcceso);
    }
  }

  onClickReenviar(): void {
    if (this.puedeReimprimir && !this.estaAnulado && this.params.onReenviar) {
      this.params.onReenviar(this.params.data.id, this.params.data.claveAcceso);
    }
  }

  onClickAnular(): void {
    if (!this.estaAnulado && this.params.onAnular) {
      this.params.onAnular(this.params.data.id);
    }
  }
}