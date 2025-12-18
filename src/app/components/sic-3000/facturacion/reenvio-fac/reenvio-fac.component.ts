// reenvio-fac.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  ValueFormatterParams
} from 'ag-grid-community';
import { firstValueFrom } from 'rxjs';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
import { DocumentoElectronicoListResponse } from 'src/app/interfaces/responses/reenvio-docs-electronicos-response';
import { FacturacionService } from 'src/app/services/facturacion.service';
import { NotaCreditoService } from 'src/app/services/nota-credito.service';
import { ReenvioDocsService } from 'src/app/services/reenvio-docs.service';
import { MessageBoxData } from 'src/app/util/messages/custom-message-box.component';


type TipoDocumento = 'FACTURA' | 'NC' | 'ND' | 'RETENCION';

@Component({
  selector: 'app-reenvio-fac',
  templateUrl: './reenvio-fac.component.html',
  styleUrls: ['./reenvio-fac.component.css']
})
export class ReenvioFacComponent implements OnInit {
  filtrosForm!: FormGroup;
  loading = false;
  private gridApi?: GridApi<DocumentoElectronicoListResponse>;

  rowData: DocumentoElectronicoListResponse[] = [];

  overlayLoadingTemplate = `
    <span style="padding: 8px 12px; border: 1px solid #d3dde8; background: #ffffff; border-radius: 6px;">
      Cargando...
    </span>
  `;
  overlayNoRowsTemplate = `
    <span style="padding: 8px 12px; border: 1px solid #d3dde8; background: #ffffff; border-radius: 6px;">
      No hay registros para mostrar.
    </span>
  `;

  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
    minWidth: 90,
  };

  columnDefs: ColDef<DocumentoElectronicoListResponse>[] = [
    {
      headerName: '',
      width: 46,
      pinned: 'left',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true,
      filter: false,
      sortable: false,
      resizable: false,
    },
    {
      headerName: 'No. Documento',
      field: 'numeroDocumento',
      minWidth: 160
    },
    {
      headerName: 'Fecha',
      field: 'fecha',
      minWidth: 120,
      valueFormatter: (p) => this.formatearFecha(p.value)
    },
    {
      headerName: 'RUC',
      field: 'rucCliente',
      minWidth: 150
    },
    {
      headerName: 'Cliente',
      field: 'cliente',
      minWidth: 320,
      flex: 1
    },
    {
      headerName: 'SUBTOT S/IVA',
      field: 'totalSinIva',
      minWidth: 140,
      type: 'rightAligned',
      valueFormatter: (p) => this.moneyFormatter(p),
    },
    {
      headerName: 'SUBTOT C/IVA',
      field: 'totalConIva',
      minWidth: 140,
      type: 'rightAligned',
      valueFormatter: (p) => this.moneyFormatter(p),
    },
    {
      headerName: 'IVA',
      field: 'iva',
      minWidth: 110,
      type: 'rightAligned',
      valueFormatter: (p) => this.moneyFormatter(p),
    },
    {
      headerName: 'TOTAL',
      field: 'total',
      minWidth: 120,
      type: 'rightAligned',
      valueFormatter: (p) => this.moneyFormatter(p),
    },
    {
      headerName: 'Caja',
      field: 'caja',
      minWidth: 80,
    },
    {
      headerName: 'XML',
      field: 'xmlGenerado',
      minWidth: 80,
      cellRenderer: (params: any) => {
        return params.value
          ? '<span style="color: #10b981;">✓ Sí</span>'
          : '<span style="color: #ef4444;">✗ No</span>';
      }
    }
  ];

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private reenvioDocsService: ReenvioDocsService,
    private facturacionService: FacturacionService,
    private notaCreditoService: NotaCreditoService
  ) {}

  ngOnInit(): void {
    const hoy = this.toISODate(new Date());

    this.filtrosForm = this.fb.group({
      desde: [hoy, Validators.required],
      hasta: [hoy, Validators.required],
      tipo: ['FACTURA' as TipoDocumento, Validators.required],
      numeroCaja: [''],
    });
  }

  onGridReady(e: GridReadyEvent<DocumentoElectronicoListResponse>) {
    this.gridApi = e.api;
    this.gridApi.setGridOption('rowData', this.rowData);
    this.gridApi.sizeColumnsToFit();

    if (!this.rowData.length) {
      this.gridApi.showNoRowsOverlay();
    }
  }

  async buscar() {
    if (this.filtrosForm.invalid) {
      this.filtrosForm.markAllAsTouched();
      return;
    }

    const { desde, hasta, tipo, numeroCaja } = this.filtrosForm.value;

    try {
      this.loading = true;
      this.gridApi?.showLoadingOverlay();

      const resp = await firstValueFrom(
        this.reenvioDocsService.getDocumentosElectronicos(
          tipo,
          desde,
          hasta,
          numeroCaja || null,
          1,
          1000
        )
      );

      const data = resp.data?.items || [];
      this.setRowDataInGrid(data);

      if (!data.length) {
        this.gridApi?.showNoRowsOverlay();
      } else {
        this.gridApi?.hideOverlay();
      }

      this.gridApi?.deselectAll();
      setTimeout(() => this.gridApi?.sizeColumnsToFit(), 0);

    } catch (error: any) {
      console.error('Error al buscar documentos:', error);
      this.setRowDataInGrid([]);
      this.gridApi?.showNoRowsOverlay();

      this.mostrarMensaje({
        title: 'Error',
        message: error?.message || 'No se pudieron cargar los documentos',
        type: 'error'
      });
    } finally {
      this.loading = false;
    }
  }

  nuevo() {
    const hoy = this.toISODate(new Date());

    this.filtrosForm.reset({
      desde: hoy,
      hasta: hoy,
      tipo: 'FACTURA',
      numeroCaja: '',
    });

    this.setRowDataInGrid([]);
    this.gridApi?.deselectAll();
    this.gridApi?.showNoRowsOverlay();
  }

  async generarXml() {
    const selected = this.gridApi?.getSelectedRows() ?? [];

    if (!selected.length) {
      this.mostrarMensaje({
        title: 'Atención',
        message: 'Debe seleccionar al menos un documento',
        type: 'warning'
      });
      return;
    }

    // CONFIRMACIÓN ANTES DE PROCEDER
    const confirmDialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '450px',
      data: {
        title: 'Confirmar Generación de XML',
        message: `
          ¿Está seguro de generar/reenviar los archivos XML para los <strong>${selected.length}</strong> documento(s) seleccionado(s)?
          <br><br>
          <small>Este proceso generará los archivos electrónicos para el SRI.</small>
        `,
        type: 'info',
        confirmText: 'Sí, Generar',
        cancelText: 'Cancelar',
        showCancel: true
      } as MessageBoxData
    });

    const confirmed = await firstValueFrom(confirmDialogRef.afterClosed());

    // Si el usuario cancela, salir
    if (!confirmed) {
      return;
    }

    // PROCEDER CON LA GENERACIÓN
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '450px',
      disableClose: true,
      data: {
        title: 'Generando XML',
        message: 'Procesando documentos seleccionados...',
        type: 'info',
        isLoading: true,
        showProgress: true,
        currentProgress: 0,
        totalProgress: selected.length,
        loadingText: 'Iniciando...'
      } as MessageBoxData
    });

    const messageBoxComponent = dialogRef.componentInstance;
    let exitosos = 0;
    let fallidos = 0;
    const errores: string[] = [];

    for (let i = 0; i < selected.length; i++) {
      const doc = selected[i];

      // Actualizar progreso
      messageBoxComponent.updateProgress(
        i + 1,
        selected.length,
        this.calcularTiempoEstimado(i, selected.length)
      );

      try {
        await this.generarXmlPorTipo(doc.tipoDocumento as TipoDocumento, doc.id);
        exitosos++;
      } catch (error: any) {
        console.error(`Error al generar XML para ${doc.numeroDocumento}:`, error);
        fallidos++;
      }
    }

    // Cerrar loading
    dialogRef.close();

    // Mostrar resultado final
    let mensajeFinal = `
      <strong>Proceso completado</strong><br><br>
      ✅ Exitosos: ${exitosos}<br>
    `;

    if (fallidos > 0) {
      mensajeFinal += `❌ Fallidos: ${fallidos}<br>`;
      if (errores.length > 0 && errores.length <= 5) {
        mensajeFinal += `<br><small><strong>Errores:</strong><br>${errores.join('<br>')}</small>`;
      }
    }

    mensajeFinal += `<br>Total: ${selected.length}`;

    this.mostrarMensaje({
      title: exitosos === selected.length ? 'Éxito' : 'Proceso Finalizado',
      message: mensajeFinal,
      type: exitosos === selected.length ? 'success' : 'warning',
      confirmText: 'Cerrar'
    });

    // Recargar grid
    this.buscar();
  }

  private async generarXmlPorTipo(tipoDocumento: TipoDocumento, idDocumento: number): Promise<void> {
    switch (tipoDocumento) {
      case 'FACTURA':
        await firstValueFrom(this.facturacionService.generarXmlEnServidor(idDocumento));
        break;

      case 'NC':
        await firstValueFrom(this.notaCreditoService.generarXmlNotaCredito(idDocumento));
        break;

      case 'ND':
        throw new Error('Generación XML para ND no implementada');

      case 'RETENCION':
        throw new Error('Generación XML para Retenciones no implementada');

      default:
        throw new Error(`Tipo de documento '${tipoDocumento}' no válido`);
    }
  }

  private calcularTiempoEstimado(actual: number, total: number): string {
    if (actual === 0) return 'Calculando...';

    const promedioPorDoc = 2; // segundos aproximados por documento
    const restantes = total - actual;
    const segundosRestantes = restantes * promedioPorDoc;

    if (segundosRestantes < 60) {
      return `${segundosRestantes} seg`;
    } else {
      const minutos = Math.floor(segundosRestantes / 60);
      const segundos = segundosRestantes % 60;
      return `${minutos} min ${segundos} seg`;
    }
  }

  private mostrarMensaje(data: Partial<MessageBoxData>) {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        confirmText: 'Aceptar',
        showCancel: false,
        ...data
      } as MessageBoxData
    });
  }

  private setRowDataInGrid(data: DocumentoElectronicoListResponse[]) {
    this.rowData = data ?? [];
    this.gridApi?.setGridOption('rowData', this.rowData);
  }

  private moneyFormatter(p: ValueFormatterParams) {
    const v = Number(p.value ?? 0);
    return v.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  private formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  private toISODate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
