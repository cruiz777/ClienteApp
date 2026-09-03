import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from 'ag-grid-community';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { VacacionesService } from 'src/app/services/rol/vacaciones-rol.service';
import { VacacionTomadaGridResponse } from 'src/app/interfaces/responses/vacaciones.response';
import { AccionesVacacionesCellParams, AccionesVacacionesCellRendererComponent } from '../rederer/vacaciones-cell-renderer.component';
import { MessageBoxService } from 'src/app/components/utils/messages/message-box.service';
import { EditarVacacionDialogComponent, EditarVacacionDialogData } from '../editar/editar-vacacion-dialog.component';


@Component({
  selector: 'app-vacaciones-explorador',
  templateUrl: './vacaciones-explorador.component.html',
  styleUrls: ['./vacaciones-explorador.component.css']
})
export class VacacionesExploradorComponent implements OnInit {
  filtrosForm: FormGroup;

  rowData: VacacionTomadaGridResponse[] = [];
  loading = false;

  private gridApi?: GridApi<VacacionTomadaGridResponse>;

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };

  columnDefs: ColDef<VacacionTomadaGridResponse>[] = [
    {
      headerName: '#',
      width: 60,
      valueGetter: params => (params.node?.rowIndex ?? 0) + 1,
      sortable: false,
      filter: false
    },
    { headerName: 'ID', field: 'idVacacionTomada', width: 90 },
    { headerName: 'Empleado', field: 'nombreEmpleado', minWidth: 220, flex: 1 },
    {
      headerName: 'Fecha Desde',
      field: 'fechaDesde',
      width: 130,
      valueFormatter: p => this.formatoFecha(p)
    },
    {
      headerName: 'Fecha Hasta',
      field: 'fechaHasta',
      width: 130,
      valueFormatter: p => this.formatoFecha(p)
    },
    {
      headerName: 'Retorno',
      field: 'fechaRetorno',
      width: 130,
      valueFormatter: p => this.formatoFecha(p)
    },
    {
      headerName: 'Días',
      field: 'diasTomados',
      width: 90,
      type: 'numericColumn'
    },
    { headerName: 'Período', field: 'periodoDesde', width: 120 },
    { headerName: 'Reemplazo', field: 'personaReemplazo', minWidth: 160 },
    { headerName: 'Autoriza', field: 'usuarioAutoriza', minWidth: 180 },
    { headerName: 'Aprueba', field: 'usuarioAprueba', minWidth: 180 },
    { headerName: 'Observación', field: 'observacion', minWidth: 200 },
    {
      headerName: 'Solicitado',
      field: 'fechaSolicitud',
      width: 130,
      valueFormatter: p => this.formatoFecha(p)
    },
    {
      headerName: 'Acciones',
      colId: 'acciones',
      width: 140,
      pinned: 'right',
      sortable: false,
      filter: false,
      cellRenderer: AccionesVacacionesCellRendererComponent,
      cellRendererParams: {
        onEditar: (row: VacacionTomadaGridResponse) => this.editar(row),
        onEliminar: (row: VacacionTomadaGridResponse) => this.eliminar(row),
        onImprimir: (row: VacacionTomadaGridResponse) => this.imprimir(row)
      } as Partial<AccionesVacacionesCellParams>
    }
  ];

  constructor(
    private fb: FormBuilder,
    private vacacionesService: VacacionesService,
    private dialog: MatDialog,
    private messageBox: MessageBoxService,
    private snackBar: MatSnackBar
  ) {
    this.filtrosForm = this.fb.group({
      fechaDesde: [''],
      fechaHasta: ['']
    });
  }

  ngOnInit(): void {}

  onGridReady(event: GridReadyEvent<VacacionTomadaGridResponse>): void {
    this.gridApi = event.api;
    this.cargar();
  }

  cargar(): void {
    const { fechaDesde, fechaHasta } = this.filtrosForm.value;

    this.loading = true;

    this.vacacionesService
      .getAll({
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined
      })
      .subscribe({
        next: data => {
          this.rowData = data ?? [];
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('No se pudieron cargar las solicitudes de vacaciones.', 'Cerrar', {
            duration: 4000
          });
        }
      });
  }

  buscar(): void {
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset();
    this.cargar();
  }

  private editar(row: VacacionTomadaGridResponse): void {
    this.dialog
      .open(EditarVacacionDialogComponent, {
        width: '550px',
        data: { row } as EditarVacacionDialogData
      })
      .afterClosed()
      .subscribe(actualizado => {
        if (actualizado) {
          this.cargar();
        }
      });
  }

  private eliminar(row: VacacionTomadaGridResponse): void {
    this.messageBox
      .confirm(
        `¿Eliminar la solicitud de ${row.nombreEmpleado} (${row.diasTomados} día(s))? ` +
          'El saldo consumido se va a restituir automáticamente. Esta acción no se puede deshacer.',
        {
          title: 'Eliminar solicitud',
          confirmText: 'Sí, eliminar',
          type: 'error'
        }
      )
      .subscribe(confirmado => {
        if (!confirmado) {
          return;
        }

        this.vacacionesService.eliminarSolicitud(row.idVacacionTomada).subscribe({
          next: res => {
            this.messageBox.success(res.message || 'Solicitud eliminada correctamente.');
            this.cargar();
          },
          error: err => {
            const msg = err?.error?.message || 'No se pudo eliminar la solicitud.';
            this.messageBox.error(msg);
          }
        });
      });
  }

  private imprimir(row: VacacionTomadaGridResponse): void {
    this.vacacionesService.imprimirPdf(row.idVacacionTomada).subscribe({
      next: blob => {
        if (!blob || blob.size === 0) {
          this.snackBar.open('El PDF se generó vacío.', 'Cerrar', { duration: 3000 });
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const ventana = window.open(url, '_blank');

        if (!ventana) {
          const link = document.createElement('a');
          link.href = url;
          link.download = `Solicitud_Vacaciones_${row.idVacacionTomada}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        setTimeout(() => window.URL.revokeObjectURL(url), 30000);
      },
      error: () => {
        this.snackBar.open('No se pudo generar el PDF de la solicitud.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  private formatoFecha(params: ValueFormatterParams): string {
    if (!params.value) {
      return '';
    }
    const partes = String(params.value).substring(0, 10).split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : String(params.value);
  }
}
