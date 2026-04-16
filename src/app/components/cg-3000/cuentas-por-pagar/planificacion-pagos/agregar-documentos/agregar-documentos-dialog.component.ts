// agregar-documentos-dialog.component.ts
import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { Observable, debounceTime, distinctUntilChanged, switchMap, of, map } from 'rxjs';

import { PlanificacionPagoService } from 'src/app/services/planificacion-pago.service';
import { PagoProveedorService } from 'src/app/services/pago-proveedor.service';
import { DocumentoPendienteResponse } from 'src/app/interfaces/responses/planificacion-pago-response';
import { CodigoContableSummaryResponse } from 'src/app/interfaces/responses/pago-proveedor-response';
import { DocumentoPendienteRequest } from 'src/app/interfaces/requests/planificacion-pago-response';

export interface AgregarDocumentosDialogData {
  idEmpresa: number;
  idUsuario: number;
  documentosActuales: number[]; // IDs de documentos que YA están en el grid
}

@Component({
  selector: 'app-agregar-documentos-dialog',
  templateUrl: './agregar-documentos-dialog.component.html',
  styleUrls: ['./agregar-documentos-dialog.component.scss']
})
export class AgregarDocumentosDialogComponent implements OnInit {
  @ViewChild('gridDisponibles') gridDisponibles!: AgGridAngular;

  filtrosForm!: FormGroup;
  
  // Autocomplete proveedor
  proveedorCtrl = this.fb.control('');
  proveedoresFiltrados$!: Observable<CodigoContableSummaryResponse[]>;
  proveedorSeleccionado: CodigoContableSummaryResponse | null = null;

  // Grid
  documentosDisponibles: DocumentoPendienteResponse[] = [];
  documentosSeleccionados: DocumentoPendienteResponse[] = [];
  private gridApi!: GridApi;
  cargando = false;

  // Totales
  totalSeleccionados = 0;
  totalSaldoSeleccionado = 0;

  // Columnas COMPLETAS
  columnDefs: ColDef[] = [
    {
      headerName: '',
      width: 50,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true
    },
    {
      field: 'nombre_proveedor',
      headerName: 'Proveedor',
      width: 250,
      pinned: 'left'
    },
    {
      field: 'numero_comprobante',
      headerName: 'No. Comprobante',
      width: 150,
      pinned: 'left'
    },
    {
      field: 'fecha_transaccion',
      headerName: 'Fec. Transacción',
      width: 130,
      valueFormatter: params => this.formatDate(params.value)
    },
    {
      field: 'fecha_vencimiento',
      headerName: 'Fec. Vencimiento',
      width: 130,
      valueFormatter: params => this.formatDate(params.value),
      cellStyle: params => {
        if (params.data?.esta_vencido) {
          return { backgroundColor: '#ffebee', color: '#c62828' };
        }
        return null;
      }
    },
    {
      field: 'total_documento',
      headerName: 'Total Documento',
      width: 140,
      type: 'rightAligned',
      valueFormatter: params => this.formatCurrency(params.value)
    },
    {
      field: 'debe',
      headerName: 'Debe',
      width: 120,
      type: 'rightAligned',
      valueFormatter: params => {
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      }
    },
    {
      field: 'haber',
      headerName: 'Haber',
      width: 120,
      type: 'rightAligned',
      valueFormatter: params => {
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      }
    },
    {
        field: 'saldo',
        headerName: 'Saldo',
        width: 140,
        type: 'rightAligned',
        valueFormatter: params => this.formatCurrency(params.value),
        cellStyle: (params: any) => {
            const saldo = params.value || 0;
            if (saldo > 0) {
            // ANTICIPO
            return { 
                backgroundColor: '#c8e6c9',
                color: '#2e7d32',
                fontWeight: 'bold' 
            };
            }
            // DEUDA - Retornar objeto completo o null
            return { 
            fontWeight: 'bold', 
            color: '#d32f2f',
            backgroundColor: 'transparent'  // ⭐ Agregar esta propiedad
            };
        }
    },
    {
      field: 'retencion_fuente',
      headerName: 'Ret. Fuente',
      width: 120,
      type: 'rightAligned',
      valueFormatter: params => {
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      }
    },
    {
      field: 'retencion_iva',
      headerName: 'Ret. IVA',
      width: 120,
      type: 'rightAligned',
      valueFormatter: params => {
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      }
    }
  ];

defaultColDef: ColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  flex: 1,
  minWidth: 110
};

  gridOptions = {
    suppressRowClickSelection: true,
    onSelectionChanged: () => {
      this.calcularTotalesSeleccionados();
    }
  };

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AgregarDocumentosDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AgregarDocumentosDialogData,
    private planificacionService: PlanificacionPagoService,
    private pagoProveedorService: PagoProveedorService
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.initAutocompleteProveedor();
  }

  private initForms(): void {
    this.filtrosForm = this.fb.group({
      proveedor: [''],
      fechaVencimientoHasta: ['', Validators.required]
    });
  }

  private initAutocompleteProveedor(): void {
    this.proveedoresFiltrados$ = this.proveedorCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        if (typeof value === 'string' && value.length >= 2) {
          return this.pagoProveedorService.searchProveedores(this.data.idEmpresa, value);
        }
        return of({ type: 'SUCCESS', data: { items: [] }, message: '', id: '' });
      }),
      map(response => response.type === 'SUCCESS' && response.data ? response.data.items : [])
    );
  }

  onProveedorSeleccionado(event: MatAutocompleteSelectedEvent): void {
    this.proveedorSeleccionado = event.option.value;
  }

  displayProveedor(proveedor: CodigoContableSummaryResponse | null): string {
    if (!proveedor) return '';
    return `${proveedor.identificacion} - ${proveedor.nombre}`;
  }

  // Buscar documentos disponibles
buscarDocumentos(): void {
    if (!this.proveedorSeleccionado?.idCodContable) {
        return;
    }

    this.cargando = true;

    const request: DocumentoPendienteRequest = {
        id_empresa: this.data.idEmpresa,
        id_proveedor: this.proveedorSeleccionado.idCodContable
    };

    this.planificacionService.getDocumentosPendientes(request).subscribe({
        next: (response) => {
        if (response.type === 'LIST' && response.data) {
            this.documentosDisponibles = response.data.filter(doc =>
            !this.data.documentosActuales.includes(doc.id_cuenta_por_pagar)
            );

            this.gridApi?.setGridOption('rowData', this.documentosDisponibles);

            setTimeout(() => {
            this.gridApi?.sizeColumnsToFit();
            this.gridApi?.refreshHeader();
            this.gridApi?.redrawRows();
            }, 50);
        } else {
            this.documentosDisponibles = [];
            this.gridApi?.setGridOption('rowData', []);
        }

        this.cargando = false;
        },
        error: () => {
        this.cargando = false;
        this.documentosDisponibles = [];
        this.gridApi?.setGridOption('rowData', []);
        }
    });
}


  // Grid ready
    onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    setTimeout(() => {
        this.gridApi.sizeColumnsToFit();
        this.gridApi.refreshHeader();
        this.gridApi.redrawRows();
    }, 150);
    }

  // Calcular totales de seleccionados
  private calcularTotalesSeleccionados(): void {
    const seleccionados = this.gridApi.getSelectedRows();
    
    this.totalSeleccionados = seleccionados.length;
    this.totalSaldoSeleccionado = seleccionados.reduce((sum, doc) => {
      return sum + Math.abs(doc.saldo || 0);
    }, 0);
  }

  // Agregar seleccionados
  agregarSeleccionados(): void {
    this.documentosSeleccionados = this.gridApi.getSelectedRows();
    
    if (this.documentosSeleccionados.length === 0) {
      return;
    }

    // ⭐ CERRAR Y RETORNAR documentos seleccionados
    this.dialogRef.close({
      agregar: true,
      documentos: this.documentosSeleccionados
    });
  }

  // Cancelar
  cancelar(): void {
    this.dialogRef.close({
      agregar: false,
      documentos: []
    });
  }

  // Limpiar selección
  limpiarSeleccion(): void {
    this.gridApi?.deselectAll();
  }

  // Formateo
  private formatDate(value: string | null | undefined): string {
    if (!value) return '';
    const dateOnly = value.split('T')[0];
    const [year, month, day] = dateOnly.split('-');
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  private formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '$0.00';
    return `$${value.toFixed(2)}`;
  }
}