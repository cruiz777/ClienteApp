import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ColDef } from 'ag-grid-community';
import { PlanificacionPagoResponse } from 'src/app/interfaces/responses/planificacion-pago-response';

export interface DetalleTransaccionData {
  numTransaccion: number;
  documentos: PlanificacionPagoResponse[];  //Recibe _items directamente
  totalTransaccion: number;
}

@Component({
  selector: 'app-detalle-transaccion-dialog',
  template: `
    <h2 mat-dialog-title>
      📋 Documentos a aprobar - Transacción #{{ data.numTransaccion }}
    </h2>
    
    <mat-dialog-content style="min-height: 400px;">
      <ag-grid-angular
        class="ag-theme-material"
        style="height: 400px;"
        [rowData]="data.documentos"
        [columnDefs]="columnDefs"
        [rowSelection]="'multiple'"
        [defaultColDef]="{ sortable: true, resizable: true }"
        (gridReady)="onGridReady($event)"
        (selectionChanged)="onSelectionChanged()">
      </ag-grid-angular>

      <div class="resumen-seleccion">  <!-- ⭐ Clase actualizada -->
        <strong>Seleccionados: {{ seleccionadosCount }} / {{ data.documentos.length }}</strong>
        <strong>Total: {{ totalSeleccionado | currency }}</strong>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button 
        class="btn-dialog btn-dialog-secondary"
        (click)="cerrar()">
        Cancelar
      </button>
      <button 
        class="btn-dialog btn-dialog-primary"
        [disabled]="seleccionadosCount === 0"
        (click)="aprobar()">
        <mat-icon>check_circle</mat-icon>
        Aprobar {{ seleccionadosCount }} Documento(s)
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 850px;
    }
    
    .resumen-seleccion {
      margin-top: 16px;
      padding: 16px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .resumen-seleccion strong:first-child {
      font-size: 14px;
      color: #002c6c;
    }
    
    .resumen-seleccion strong:last-child {
      font-size: 16px;
      color: #F27046;
      font-weight: 700;
    }
    
    /* Botones del Dialog */
    .btn-dialog {
      height: 40px;
      padding: 0 24px;
      font-size: 14px;
      font-weight: 500;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-width: 120px;
      justify-content: center;
    }
    
    .btn-dialog mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    
    .btn-dialog-secondary {
      color: #757575;
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
    }
    
    .btn-dialog-secondary:hover:not(:disabled) {
      background: #eeeeee;
      border-color: #bdbdbd;
      color: #424242;
    }
    
    .btn-dialog-primary {
      color: white;
      background: #002c6c;  /* ⭐ Color corporativo */
      border: 1px solid #002c6c;
      font-weight: 600;
    }
    
    .btn-dialog-primary mat-icon {
      color: white;
    }
    
    .btn-dialog-primary:hover:not(:disabled) {
      background: #001a42;  /* ⭐ Color corporativo dark */
      border-color: #001a42;
      box-shadow: 0 2px 8px rgba(0, 44, 108, 0.3);
    }
    
    .btn-dialog-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #bdbdbd;
      border-color: #bdbdbd;
    }
    
    .btn-dialog:active:not(:disabled) {
      transform: scale(0.98);
    }
  `]
})
export class DetalleTransaccionDialogComponent {
  private gridApi: any;
  seleccionadosCount = 0;
  totalSeleccionado = 0;

  columnDefs: ColDef[] = [
    { 
      field: 'seleccionado', 
      headerName: '', 
      checkboxSelection: true, 
      headerCheckboxSelection: true,
      width: 50 
    },
    { 
      field: 'numero_documento', 
      headerName: 'N° Doc', 
      width: 120 
    },
    { 
      field: 'tipo_comprobante', 
      headerName: 'Tipo', 
      width: 150 
    },
    { 
      field: 'valor_pago', 
      headerName: 'Monto a Pagar', 
      width: 140,
      valueFormatter: p => `$${p.value?.toFixed(2) || '0.00'}`,
      cellStyle: { fontWeight: 'bold', color: '#1976d2' }
    },
    { 
      field: 'estado_pago', 
      headerName: 'Tipo Pago', 
      width: 100,
      valueFormatter: p => p.value === 'P' ? 'Total' : 'Anticipo'
    },
    { 
      field: 'fecha', 
      headerName: 'Fecha', 
      width: 120,
      valueFormatter: p => this.formatDate(p.value)
    },
    { 
      field: 'comentario', 
      headerName: 'Observación', 
      width: 250 
    }
  ];

  constructor(
    public dialogRef: MatDialogRef<DetalleTransaccionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DetalleTransaccionData
  ) {}

  onGridReady(params: any): void {
    this.gridApi = params.api;
    // Auto-seleccionar todos
    this.gridApi.selectAll();
    this.onSelectionChanged();
  }

  onSelectionChanged(): void {
    const seleccionados = this.gridApi?.getSelectedRows() || [];
    this.seleccionadosCount = seleccionados.length;
    this.totalSeleccionado = seleccionados.reduce(
      (sum: number, doc: any) => sum + (doc.valor_pago || 0), 
      0
    );
  }

  aprobar(): void {
    const seleccionados = this.gridApi?.getSelectedRows() || [];
    const idsDocumentos = seleccionados.map((d: any) => d.id_cuenta_por_pagar);
    
    this.dialogRef.close({ 
      aprobar: true, 
      documentos: idsDocumentos 
    });
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private formatDate(value: string | null): string {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
}