import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ColDef, GridReadyEvent, ValueFormatterParams, CellValueChangedEvent } from 'ag-grid-community';
import {
  ApiResponse,
  RolIndividualResponse,
  RolIndividualRubroResponse,
  RolNominaService,
   GuardarRolIndividualRequest,

} from 'src/app/services/rol/rol-nomina.service';

@Component({
  selector: 'app-rol-individual-dialog',
  templateUrl: './rol-individual-dialog.component.html',
  styleUrls: ['./rol-individual-dialog.component.css']
})
export class RolIndividualDialogComponent implements OnInit {
  cargando = false;

  dataRol: RolIndividualResponse | null = null;

  ingresos: RolIndividualRubroResponse[] = [];
  egresos: RolIndividualRubroResponse[] = [];

  totalIngresos = 0;
  totalEgresos = 0;
  liquidoRecibir = 0;
  guardando = false;
  hayCambios = false;
  columnDefs: ColDef<RolIndividualRubroResponse>[] = [
    {
      field: 'descripcion',
      headerName: 'Rubro',
      flex: 1,
      minWidth: 220,
      editable: false
    },
    {
      field: 'cantidad',
      headerName: 'Cant/%',
      width: 100,
      editable: true,
      type: 'numericColumn',
      valueParser: params => this.toNumber(params.newValue),
      valueFormatter: params => this.formatearNumero(params.value),
      cellClass: params => {
        const row = params.data as RolIndividualRubroResponse;
        return row?.esHoraExtra ? 'celda-editable-hora' : '';
      }
    },
    {
      field: 'valor',
      headerName: 'Valor',
      width: 120,
      editable: params => {
        const row = params.data as RolIndividualRubroResponse;

        /*
         * En horas extras el valor NO debe editarse manualmente.
         * Se calcula desde cantidad * valorHoraBase * factor.
         */
        if (row?.esHoraExtra) {
          return false;
        }

        return true;
      },
      type: 'numericColumn',
      valueParser: params => this.toNumber(params.newValue),
      valueFormatter: params => this.formatearDecimal(params.value),
      cellClass: params => {
        const row = params.data as RolIndividualRubroResponse;
        return row?.esHoraExtra ? 'celda-calculada' : '';
      }
    }
  ];
  defaultColDef: ColDef = {
    sortable: false,
    filter: false,
    resizable: true
  };

  constructor(
    private rolNominaService: RolNominaService,
    private dialogRef: MatDialogRef<RolIndividualDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      idEmpleado: number;
      fechaPeriodo: string;
    }
  ) { }

  ngOnInit(): void {
    this.cargarRolIndividual();
  }

  cargarRolIndividual(): void {
    this.cargando = true;

    this.rolNominaService
      .getRolIndividual(this.data.idEmpleado, this.data.fechaPeriodo)
      .subscribe({
        next: (resp: ApiResponse<RolIndividualResponse>) => {
          this.cargando = false;

          if (resp.type !== 'Success') {
            alert(resp.message);
            return;
          }

          this.dataRol = resp.data;

          this.ingresos = [...(resp.data.ingresos ?? [])];
          this.egresos = [...(resp.data.egresos ?? [])];

          console.log('ROL INDIVIDUAL:', this.dataRol);
          console.log('INGRESOS:', this.ingresos);
          console.log('EGRESOS:', this.egresos);

          this.recalcularTotales();
        },
        error: (err: unknown) => {
          this.cargando = false;
          console.error(err);
          alert('Error al cargar el rol individual.');
        }
      });
  }


  onGridReady(params: GridReadyEvent): void {
    params.api.sizeColumnsToFit();
  }

  recalcularTotales(): void {
    this.totalIngresos = this.ingresos.reduce(
      (acc, item) => acc + this.toNumber(item.valor),
      0
    );

    this.totalEgresos = this.egresos.reduce(
      (acc, item) => acc + this.toNumber(item.valor),
      0
    );

    this.liquidoRecibir = this.totalIngresos - this.totalEgresos;
  }

  
  cerrar(): void {
    this.dialogRef.close();
  }

  get fechaPeriodoTexto(): string {
    return this.formatearFechaDateOnly(this.dataRol?.fechaPeriodo);
  }

  get fechaIngresoTexto(): string {
    return this.formatearFechaDateOnly(this.dataRol?.fechaIngreso);
  }

  get fechaSalidaTexto(): string {
    return this.formatearFechaDateOnly(this.dataRol?.fechaSalida);
  }

  private toNumber(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const n = Number(value);
    return isNaN(n) ? 0 : n;
  }

  private formatearNumero(valor: any): string {
    const n = this.toNumber(valor);
    return n === 0 ? '' : n.toString();
  }

  private formatearDecimal(valor: any): string {
    const n = this.toNumber(valor);
    return n === 0 ? '' : n.toFixed(2);
  }

  private formatearFecha(valor: string): string {
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return valor;

    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();

    return `${dia}/${mes}/${anio}`;
  }
  onCellValueChanged(event: CellValueChangedEvent<RolIndividualRubroResponse>): void {
    const row = event.data;

    if (!row) {
      return;
    }

    row.cantidad = this.toNumber(row.cantidad);
    row.valor = this.toNumber(row.valor);

    /*
     * Códigos controlados por backend:
     * 07 = Recargo nocturno
     * 08 = Horas extras 25%
     * 09 = Horas extras 50%
     * 10 = Horas extras 100%
     */
    if (row.esHoraExtra) {
      row.valor = this.calcularValorHoraExtra(row);
    }

    this.ingresos = [...this.ingresos];
    this.egresos = [...this.egresos];

    this.recalcularTotales();
      this.hayCambios = true;
  }
  private calcularValorHoraExtra(row: RolIndividualRubroResponse): number {
    const valorHoraBase = this.toNumber(this.dataRol?.valorHoraBase);
    const cantidad = this.toNumber(row.cantidad);
    const factor = this.toNumber(row.factorHoraExtra);

    if (valorHoraBase <= 0 || cantidad <= 0 || factor <= 0) {
      return 0;
    }

    return this.redondear(valorHoraBase * cantidad * factor);
  }

  private redondear(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

  private formatearFechaDateOnly(fecha: string | null | undefined): string {
    if (!fecha) {
      return 'N/D';
    }

    /*
     * El backend DateOnly normalmente llega como:
     * 2026-01-31
     * No se debe usar new Date('2026-01-31')
     * porque resta un día por zona horaria.
     */
    const soloFecha = fecha.substring(0, 10);
    const partes = soloFecha.split('-');

    if (partes.length !== 3) {
      return fecha;
    }

    const anio = partes[0];
    const mes = partes[1];
    const dia = partes[2];

    return `${dia}/${mes}/${anio}`;
  }
  calcular(): void {
  this.ingresos.forEach(row => {
    row.cantidad = this.toNumber(row.cantidad);
    row.valor = this.toNumber(row.valor);

    if (row.esHoraExtra) {
      row.valor = this.calcularValorHoraExtra(row);
    }
  });

  this.egresos.forEach(row => {
    row.cantidad = this.toNumber(row.cantidad);
    row.valor = this.toNumber(row.valor);
  });

  this.ingresos = [...this.ingresos];
  this.egresos = [...this.egresos];

  this.recalcularTotales();
}

grabar(cerrarDespues: boolean = false): void {
  if (!this.dataRol) {
    alert('No existe información del rol individual.');
    return;
  }

  this.calcular();

  const payload: GuardarRolIndividualRequest = {
    idEmpleado: this.dataRol.idEmpleado,
    fechaPeriodo: this.dataRol.fechaPeriodo,
    idUsuario: 1, // cámbialo por el usuario real cuando ya lo tengas
    rubros: [
      ...this.ingresos,
      ...this.egresos
    ].map(x => ({
      idRolNomina: x.idRolNomina,
      idIngDesc: x.idIngDesc,
      tipoPago: x.tipoPago,
      codigo: x.codigo,
      descripcion: x.descripcion,
      cantidad: this.toNumber(x.cantidad),
      valor: this.toNumber(x.valor),
      esHoraExtra: x.esHoraExtra,
      factorHoraExtra: this.toNumber(x.factorHoraExtra)
    }))
  };

  this.guardando = true;

  this.rolNominaService.guardarRolIndividual(payload)
    .subscribe({
      next: resp => {
        this.guardando = false;

        if (resp.type !== 'Success') {
          alert(resp.message);
          return;
        }

        this.hayCambios = false;
        alert(resp.message);

        if (cerrarDespues) {
          this.dialogRef.close(true);
          return;
        }

        this.cargarRolIndividual();
      },
      error: err => {
        this.guardando = false;
        console.error(err);
        alert('Error al guardar el rol individual.');
      }
    });
}

salir(): void {
  if (!this.hayCambios) {
    this.dialogRef.close(false);
    return;
  }

  const guardarAntes = confirm(
    'Existen cambios pendientes. ¿Desea guardar antes de salir?'
  );

  if (guardarAntes) {
    this.grabar(true);
    return;
  }

  this.dialogRef.close(false);
}
}