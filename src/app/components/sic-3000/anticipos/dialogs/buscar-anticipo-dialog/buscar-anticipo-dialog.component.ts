// src/app/components/anticipos/dialogs/buscar-anticipo-dialog/buscar-anticipo-dialog.component.ts
import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, distinctUntilChanged, filter, switchMap, catchError, of } from 'rxjs';
import { AnticipoResponse } from '../../../../../interfaces/responses/anticipo-response';
import { ClienteService } from '../../../../../services/cliente.service';
import { AnticipoService } from '../../../../../services/anticipo.service';

interface ClienteSummary {
  clientes_codigo: number;
  nomcli: string;
}

@Component({
  selector: 'app-buscar-anticipo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './buscar-anticipo-dialog.component.html',
  styleUrls: ['./buscar-anticipo-dialog.component.css']
})
export class BuscarAnticipoDialogComponent implements OnInit {

  // Cliente autocomplete
  clienteControl = new FormControl<string | ClienteSummary | null>(null);
  clientesFiltrados: ClienteSummary[] = [];
  clienteSeleccionado: ClienteSummary | null = null;

  // Lista de anticipos
  anticipos: AnticipoResponse[] = [];
  cargando = false;
  sinResultados = false;

  // Paginación
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  // Columnas de la tabla
  displayedColumns = ['numero_anticipo', 'fecha', 'monto', 'forma_pago', 'concepto', 'acciones'];

  constructor(
    public dialogRef: MatDialogRef<BuscarAnticipoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private anticipoService: AnticipoService,
    private clienteService: ClienteService
  ) {}

  ngOnInit(): void {
    // Stream del autocomplete CLIENTE
    this.clienteControl.valueChanges
      .pipe(
        filter((v): v is string => typeof v === 'string'),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((texto) => {
          const q = (texto || '').trim();
          if (!q) return of({ data: [] as ClienteSummary[] });
          return this.clienteService.getClientesSummary(q).pipe(
            catchError(_ => of({ data: [] as ClienteSummary[] }))
          );
        })
      )
      .subscribe(resp => {
        this.clientesFiltrados = (resp?.data ?? []) as ClienteSummary[];
      });
  }

  mostrarNombreCliente = (c: ClienteSummary | string | null): string =>
    (c && typeof c === 'object') ? (c.nomcli ?? '') : (c ?? '') as string;

  seleccionarCliente(cliente: ClienteSummary): void {
    this.clienteSeleccionado = cliente;
    this.buscarAnticipos();
  }

  buscarAnticipos(): void {
    if (!this.clienteSeleccionado) {
      return;
    }

    this.cargando = true;
    this.sinResultados = false;

    // Buscar solo anticipos NO cancelados
    this.anticipoService.getAll({
      clientesCodigo: this.clienteSeleccionado.clientes_codigo,
      cancelado: false,
      estado: true,
      page: this.currentPage,
      pageSize: this.pageSize
    }).subscribe({
      next: (response) => {
        this.cargando = false;
        if (response.type === 'success' && response.data) {
          this.anticipos = response.data.items;
          this.totalItems = response.data.totalItems;
          this.sinResultados = this.anticipos.length === 0;
        }
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error buscando anticipos:', error);
        this.sinResultados = true;
      }
    });
  }

  seleccionarAnticipo(anticipo: AnticipoResponse): void {
    // Cerrar diálogo y retornar el anticipo seleccionado
    this.dialogRef.close(anticipo);
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) return 'N/A';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-EC');
  }

  formatearMonto(monto: number | null): string {
    if (!monto) return '$0.00';
    return `$${monto.toFixed(2)}`;
  }
}
