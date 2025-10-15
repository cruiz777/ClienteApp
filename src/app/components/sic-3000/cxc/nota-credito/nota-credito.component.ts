import { Component, OnInit } from '@angular/core';
import { NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { NotaCreditoService, ApiResponse, PaginationResponse, FacturaListResponse ,NotaCreditoCrearReq } from 'src/app/services/nota-credito.service';
import { FormaPagoService, FormaPagoResponse, ApiResponse as ApiResponseFP } from 'src/app/services/forma-pago.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { combineLatest, Observable, of } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UsuarioService } from 'src/app/services/usuario.service';
import {
  shareReplay
} from 'rxjs/operators';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';

import {
  startWith,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map,
  tap,
  finalize,
} from 'rxjs/operators'; // ⬅️ agrega esto


import {
  ColDef,
  ValueParserParams,
  ValueFormatterParams,
  ICellRendererParams,
} from 'ag-grid-community';

type Detalle = {
  codigo?: string;
  descripcion?: string;
  cantidad?: number;
  pvp?: number;
  total?: number;     // calculado (cantidad * pvp)
  iva?: number;       // valor de IVA por línea
  piva?: number;       // valor de IVA por línea
  cantidadd?: number;
  valorDev?: number;  // valor devuelto.
  ivaDev?: number;
};

type Pago = {
  codigo?: string;
  descripcion?: string;
  debe?: number;
  haber?: number;
  saldo?: number;     // calculado
  pago?: number;
  cuenta?: string;
};
type Totales = {
  subtotal: number;
  base0: number;
  baseIva: number;
  iva: number;

  totalFactura: number;
  totalFacturaConIva: number;

  // DEV – NUEVOS
  subtotalDev: number;   // = baseDev0 + baseDevIva
  baseDev0: number;      // suma de valorDev con IVA 0
  baseDevIva: number;    // suma de valorDev con IVA > 0
  totalDev: number;      // ya lo tienes (suma valorDev)
  totalIvaDev: number;
  totalDevConIva: number;

  totalPago: number;
};


@Component({
  selector: 'app-nota-credito',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular,
    ReactiveFormsModule,        // ⬅️ necesario
    MatFormFieldModule,         // ⬅️ necesario
    MatInputModule,             // ⬅️ necesario
    MatAutocompleteModule,      // ⬅️ necesario
    MatOptionModule,
    MatSnackBarModule
  ],
  templateUrl: './nota-credito.component.html',
  styleUrls: ['./nota-credito.component.css'],
})
export class NotaCreditoComponent implements OnInit {
  ngOnInit(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    this.formasActivas$ = this.formaPagoService.getPagedLite(1, 10).pipe(
      map(resp => resp?.type === 'Success' ? (resp.data?.items ?? []) : []),
      catchError(() => of([] as FormaPagoResponse[])),
      // cachea el último resultado para evitar más llamadas
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.cargarForma();
    Promise.resolve().then(() => {
      this.fcMetodoPago.setValue(this.fcMetodoPago.value ?? '');
    });
  }
  constructor(private svc: NotaCreditoService,
    private formaPagoService: FormaPagoService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private _snackBar: MatSnackBar,
    private usuarioService:UsuarioService
  ) { }
  totales: Totales = {
    subtotal: 0, base0: 0, baseIva: 0, iva: 0,
    totalFactura: 0, totalFacturaConIva: 0,
    subtotalDev: 0, baseDev0: 0, baseDevIva: 0,
    totalDev: 0, totalIvaDev: 0, totalDevConIva: 0,
    totalPago: 0,
  };
  usuarioActual = this.usuarioService.getUsuarioActual();
  // ======= ENCABEZADO =======
  private toISO = (d: Date): string =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);

  idNota: number = 0;
  fcMetodoPago = new FormControl<string | FormaPagoResponse>(''); // ⬅️ el control


  filteredFormasPago$: Observable<FormaPagoResponse[]> = of([]);
  formasActivas$!: Observable<FormaPagoResponse[]>;
  isLoadingFormas = false;
  clientesCodigo:number=0;
  encabezado = {
    sucursal: '331',
    caja: '010',
    numero: '',
    fecha: this.toISO(new Date()),
    cliente: '',
    idCliente:0,
    sucursal2: '',
    caja2: '',
    factura: '',
    direccion: '',
    ruc: '',
    fechaActual: this.toISO(new Date()),
    observacion: '',
  };

  buscandoFactura = false;
  errorFactura: string | null = null;

  // ======= HELPERS =======
  private asNumber = (v: any): number => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  // Parser que acepta coma o punto
  numberParser = (params: ValueParserParams): number => {
    const raw = (params.newValue ?? '')
      .toString()
      .trim()
      .replace(',', '.')
      .replace(/[^0-9.\-]/g, '');
    const n = Number(raw);
    return isNaN(n) ? 0 : n;
  };

  // Formateo con punto decimal y símbolo $
  currencyUSD = (p: ValueFormatterParams): string => {
    const n = this.asNumber(p.value);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  };

  // Formateo con punto decimal (sin $)
  numberDot2d = (p: ValueFormatterParams): string => {
    const n = this.asNumber(p.value);
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };

  // ======= COLUMNAS DETALLE =======
  detalleCols: ColDef<Detalle>[] = [
    { headerName: 'Código', field: 'codigo', editable: true, width: 120 },
    { headerName: 'Descripción', field: 'descripcion', editable: true, flex: 1, minWidth: 220 },
    {
      headerName: 'Cantidad',
      field: 'cantidad',
      editable: false,
      width: 110,
      type: 'rightAligned',
      valueParser: this.numberParser,
      valueFormatter: this.numberDot2d,
    },
    {
      headerName: 'P.V.P.',
      field: 'pvp',
      editable: false,
      width: 110,
      type: 'rightAligned',
      valueParser: this.numberParser,
      valueFormatter: this.currencyUSD,
    },
    {
      headerName: 'Total',
      field: 'total',
      width: 120,
      type: 'rightAligned',
      valueGetter: (p) => this.asNumber(p.data?.cantidad) * this.asNumber(p.data?.pvp),
      valueFormatter: this.currencyUSD,
    },
    {
      headerName: 'IVA Valor',
      field: 'iva',
      editable: false,
      width: 120,
      type: 'rightAligned',
      valueParser: this.numberParser,

    },
    {
      headerName: 'IVA %',
      field: 'piva',
      width: 100,
      type: 'rightAligned',
      // no necesitas field; es calculado
      valueGetter: (p) => {
        const total = this.asNumber(p.data?.cantidad) * this.asNumber(p.data?.pvp);
        const iva = this.asNumber(p.data?.iva);
        return total > 0 ? (iva / total) * 100 : 0;
      },

    },

    {
      headerName: 'Cant.Dev.',
      field: 'cantidadd',
      editable: true,
      width: 110,
      type: 'rightAligned',
      valueParser: this.numberParser,
      valueFormatter: this.numberDot2d,

      valueSetter: (p) => {
        const max = this.asNumber(p.data?.cantidad);
        let val = this.asNumber(p.newValue);
        if (val < 0) val = 0;
        if (val > max) val = max;

        p.data.cantidadd = val;

        const pvp = this.asNumber(p.data?.pvp);
        p.data.valorDev = val * pvp;

        if (p.api) {
          if (p.node) {
            p.api.refreshCells({ rowNodes: [p.node], columns: ['cantidadd', 'valorDev', 'ivaDev'] });
          } else {
            p.api.refreshCells({ force: true, columns: ['cantidadd', 'valorDev', 'ivaDev'] });
          }
        }
        this.recalcular();
        return true;
      },


      cellClassRules: {
        'text-red-600 font-semibold': (p) => this.asNumber(p.value) > this.asNumber(p.data?.cantidad),
      },
    },


    {
      headerName: 'Valor Dev.',
      field: 'valorDev',
      editable: true,
      width: 130,
      type: 'rightAligned',
      valueParser: this.numberParser,
      valueFormatter: this.currencyUSD, // o this.numberDot2d
    },
    {
      headerName: 'Iva Dev.',
      field: 'ivaDev',
      editable: false,
      width: 130,
      type: 'rightAligned',
      valueGetter: (p) => {
        const cantDev = this.asNumber(p.data?.cantidadd);
        const cantidad = this.asNumber(p.data?.cantidad);
        const ivaLinea = this.asNumber(p.data?.iva);
        if (cantidad <= 0) return 0;
        const ivaUnit = ivaLinea / cantidad;
        return cantDev * ivaUnit;
      },
      valueFormatter: this.currencyUSD,
    }


  ];

  // ======= COLUMNAS PAGOS =======
  pagoCols: ColDef<Pago>[] = [
    {
    colId: 'acciones',
    headerName: '',
    pinned: 'left',
    width: 56,
    minWidth: 56,
    maxWidth: 56,
    suppressSizeToFit: true,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
    cellRenderer: (params: any) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ag-btn-icon ag-btn-delete';
      btn.title = 'Eliminar';
      btn.setAttribute('aria-label', 'Eliminar forma de pago');
      // usa icono material si lo tienes cargado; si no, un "×"
      btn.innerHTML = '<span class="material-icons">delete</span>';

      btn.addEventListener('click', () => {
        const row = params.node?.data as Pago;
        if (!row) return;

        // Ejecuta la lógica dentro del NgZone para refrescar bindings
        this.zone.run(() => this.removePago(row, params.api));
      });

      return btn;
    },
  },
    { headerName: 'Código', field: 'codigo', editable: false, width: 120 },
    { headerName: 'Descripción', field: 'descripcion', editable: false, flex: 1, minWidth: 180 },

    {
      headerName: 'Debe',
      field: 'debe',
      editable: false,
      width: 110,
      type: 'rightAligned',
      valueGetter: () => this.getTopePago(),
      valueFormatter: this.currencyUSD,
    },
    {
      headerName: 'Haber',
      field: 'haber',
      editable: false,
      width: 110,
      type: 'rightAligned',
      valueParser: this.numberParser,
      valueFormatter: this.currencyUSD,
    },
    {
      headerName: 'Saldo',
      field: 'saldo',
      editable: false,
      width: 110,
      type: 'rightAligned',
      valueGetter: (p) => this.getTopePago() - this.asNumber(p.data?.pago),
      valueFormatter: this.currencyUSD,
    },
    {
      headerName: 'Pago',
      field: 'pago',
      width: 110,
      editable: true,
      type: 'rightAligned',
      valueParser: this.numberParser,
      valueFormatter: this.numberDot2d,
      valueSetter: (p) => {
        let val = this.asNumber(p.newValue);

        const tope = this.getTopePago();
        const sumaOtros = this.pagoRows
          .filter(r => r !== p.data)
          .reduce((acc, r) => acc + this.asNumber(r.pago), 0);
        const disponible = Math.max(0, tope - sumaOtros);

        if (val < 0) val = 0;
        if (val > disponible) val = disponible;

        p.data.pago = +val.toFixed(2);

        if (p.api) {
          if (p.node) p.api.refreshCells({ rowNodes: [p.node], columns: ['pago', 'saldo'] });
          else p.api.refreshCells({ force: true, columns: ['pago', 'saldo'] });
        }

        // 👇 fuerza a volver a la zona de Angular para que se reevalúe puedeGrabar
        this.zone.run(() => this.recalcular());
        return true;
      },
    }
    ,


    { headerName: 'Cuenta Cont.', field: 'cuenta', editable: false, width: 140 },
  ];


  // ======= CONFIG COMÚN =======
  defaultColDef: ColDef = {
    sortable: false,
    resizable: true,
    suppressHeaderMenuButton: true,
  };

  // ======= DATOS =======
  detalleRows: Detalle[] = [
    { codigo: '', descripcion: '', cantidad: 0, pvp: 0, iva: 0, valorDev: 0 },
  ];

  pagoRows: Pago[] = [];

  // ======= TOTALES =======



  // ======= EVENTOS GRID =======
  onDetalleCellChanged() {
    this.recalcular();
  }

  onPagoCellChanged() {
    this.recalcular();
  }

  // ======= ACCIONES =======
  puedeGrabarBtn = false;
  recalcular(): void {
    let base0 = 0, baseIva = 0, iva = 0, subtotal = 0;
    let totalDev = 0, totalIvaDev = 0;

    let baseDev0 = 0, baseDevIva = 0;

    for (const r of this.detalleRows) {
      const cantidad = this.asNumber(r.cantidad);
      const pvp = this.asNumber(r.pvp);
      const totalLinea = cantidad * pvp;

      subtotal += totalLinea;
      const ivaLinea = this.asNumber(r.iva);
      iva += ivaLinea;
      if (ivaLinea > 0) baseIva += totalLinea; else base0 += totalLinea;

      const valorDev = this.asNumber(r.valorDev);
      totalDev += valorDev;
      if (ivaLinea > 0) baseDevIva += valorDev; else baseDev0 += valorDev;

      const cantDev = this.asNumber(r.cantidadd);
      if (cantidad > 0) totalIvaDev += cantDev * (ivaLinea / cantidad);
    }

    // Pagos (redondeado a 2 decimales)
    let totalPago = 0;
    for (const r of this.pagoRows) totalPago += this.asNumber(r.pago);
    totalPago = +totalPago.toFixed(2);

    const totalDevConIva = +(totalDev + totalIvaDev).toFixed(2);
    const totalFacturaConIva = +(subtotal + iva).toFixed(2);

    this.totales = {
      subtotal, base0, baseIva, iva,
      totalFactura: subtotal,
      totalFacturaConIva,
      subtotalDev: baseDev0 + baseDevIva,
      baseDev0, baseDevIva,
      totalDev, totalIvaDev, totalDevConIva,
      totalPago,
    };

    // === validación para el botón ===
    const tope = this.getTopePago();
    const diferencia = +(tope - totalPago).toFixed(2);
    this.puedeGrabarBtn = Math.abs(diferencia) < 0.01 && this.pagoRows.length > 0;

    this.cdr.detectChanges();
  }



  agregarPago(): void {
    this.pagoRows = [
      ...this.pagoRows,
      { codigo: '', descripcion: '', debe: 0, haber: 0, pago: 0, cuenta: '' },
    ];
  }

  nuevo(): void {
    // Mantener sucursal/caja (izquierda) y limpiar el resto
    const suc = this.encabezado.sucursal;
    const caj = this.encabezado.caja;

    this.encabezado = {
      ...this.encabezado,
      sucursal: suc,
      caja: caj,
      numero: '',
      fecha: this.toISO(new Date()),
      cliente: '',
      idCliente:0,
      sucursal2: '',
      caja2: '',
      factura: '',
      direccion: '',
      ruc: '',
      fechaActual: this.toISO(new Date()),
      observacion: '',
    };

    this.detalleRows = [{ codigo: '', descripcion: '', cantidad: 0, pvp: 0, iva: 0, valorDev: 0 }];
    this.pagoRows = [{ codigo: '', descripcion: '', debe: 0, haber: 0, pago: 0, cuenta: '' }];


    this.facturaFijada = false;
    this.errorFactura = null;
    this.buscandoFactura = false;
    this.idNota = 0;
    this.resetTotales()
    this.pagoRows = [];
  }

  // Diferencia contra el tope permitido (TOTAL DEV si > 0, si no Total Factura c/IVA)
  get diferenciaPago(): number {
    const tope = this.getTopePago();
    const pagado = this.totales.totalPago || 0;
    return +(tope - pagado).toFixed(2);
  }

 get puedeGrabar(): boolean {
  const tope = this.getTopePago();
  const pagado = this.totales.totalPago || 0;
  return tope > 0 && Math.abs(tope - pagado) < 0.01;  // tolerancia 1 centavo
}



// Agrega esta propiedad en la clase (arriba):
guardando = false;

// Reemplaza tu método por este:
grabar(): void {
  // Validaciones previas
  if (!(this.getTopePago() > 0)) {
    this.mostrarAlerta('No hay devolución calculada. Verifica el detalle.', 'info');
    return;
  }
  if (!this.puedeGrabar) {
    const tope = this.getTopePago();
    this.mostrarAlerta(
      `No puedes grabar. Total Pago: ${this.totales.totalPago.toFixed(2)} debe ser igual a ${tope.toFixed(2)}.`,
      'error'
    );
    return;
  }
  if (!this.encabezado?.factura) {
    this.mostrarAlerta('Debes seleccionar/fijar una factura antes de grabar.', 'error');
    return;
  }
  if (!this.pagoRows?.length) {
    this.mostrarAlerta('Agrega al menos una forma de pago.', 'error');
    return;
  }

  // Construir payload
  const payload = this.buildPayload();
  // (opcional) log para debugging:
  // console.log('NC payload =>', payload);

  this.guardando = true;
  this.svc.crearNotaCredito(payload)
    .pipe(finalize(() => this.guardando = false))
    .subscribe({
      next: (resp) => {
        if (resp?.type === 'Success' && resp.data?.idNotaCredito) {
          this.idNota = resp.data.idNotaCredito;
          this.mostrarAlerta(
            `Nota de crédito creada #${resp.data.idNotaCredito}${resp.data.numeroNota ? ' (' + resp.data.numeroNota + ')' : ''}.`,
            'ok'
          );
          // opcional: limpiar formulario
          // this.nuevo();
        } else {
          this.mostrarAlerta(resp?.message || 'No se pudo crear la nota de crédito.', 'error');
        }
      },
      error: (e) => {
        const msg = e?.error?.message || e?.message || 'Error al crear la nota de crédito.';
        this.mostrarAlerta(msg, 'error');
      }
    });
}


  exportar(): void {
    alert('Exportar (CSV/PDF) – implementar según tu necesidad.');
  }

  facturaFijada = false;  // cuando sea true, no se edita ni se reescribe el campo

  private fijarFactura(numCompleto: string) {
    this.encabezado.factura = numCompleto; // mantener tal cual (con ceros a la izquierda)
    this.facturaFijada = true;
    this.setCamposDesdeFacturaSoloSecundarios(this.encabezado.factura); // solo sucursal2/caja2
  }

  editarFactura() {
    this.facturaFijada = false;
  }

  // ======= ENTER en Factura: buscar por LIKE, fijar número y CARGAR POR idNota =======
  onEnterFactura(): void {
    const entrada = (this.encabezado.factura ?? '').trim();
    if (!entrada) return;

    this.errorFactura = null;
    this.buscandoFactura = true;

    this.svc.buscarPorNumeroLike(entrada, true, 1, 20).subscribe({
      next: (resp: ApiResponse<PaginationResponse<FacturaListResponse>>) => {
        this.buscandoFactura = false;
        if (resp.type !== 'Success' || !resp.data?.items?.length) {
          this.errorFactura = resp.message || 'No se encontraron facturas.';
          return;
        }

        // Elegir mejor coincidencia por sufijo y más reciente
        const sufijo = this.extraerSufijo(entrada);
        const candidatos = resp.data.items.filter(i => i.numeroFactura?.endsWith(sufijo));
        const lista = (candidatos.length ? candidatos : resp.data.items)
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        const best = lista[0];

        this.idNota = best.idNota;
        debugger
        this.clientesCodigo=best.idCliente;

        // Fijar número exacto
        if (best.numeroFactura) {
          this.fijarFactura(best.numeroFactura);
        } else {
          this.facturaFijada = true;
        }

        // Datos del encabezado desde la lista (si vienen)
        this.encabezado.cliente = (best as any).cliente ?? this.encabezado.cliente;
        this.encabezado.ruc = (best as any).rucCliente ?? this.encabezado.ruc;
        this.encabezado.direccion = (best as any).dirCliente ?? this.encabezado.direccion;
        
        // 👉 Consultar factura completa por idNota
        if (this.idNota && this.idNota > 0) {
          this.cargarFacturaPorId(this.idNota);
        } else {
          this.errorFactura = 'No se pudo determinar el ID de la factura.';
        }
      },
      error: (e) => {
        this.buscandoFactura = false;
        this.errorFactura = e?.message ?? 'Error consultando la factura.';
      }
    });
  }

  // ======= Cargar factura completa por idNota =======
  private cargarFacturaPorId(idNota: number): void {
    this.svc.getFacturaPorIdNota(idNota).subscribe({
      next: (resp) => {
        if (resp.type === 'Success' && resp.data) {
          const { factura, detalles, pagos } = resp.data;

          // Encabezado (sin tocar sucursal/caja principales)
          this.encabezado.cliente = factura.cliente?.nombre ?? this.encabezado.cliente;
          this.encabezado.ruc = factura.cliente?.ruc ?? this.encabezado.ruc;
          this.encabezado.direccion = factura.cliente?.direccion ?? this.encabezado.direccion;
          this.encabezado.fecha = this.toISO(new Date(factura.fecha));

          // Grilla de detalles (sin conIva; usamos iva de backend)
          this.detalleRows = detalles.map(d => ({
            codigo: d.codigoProducto,
            descripcion: d.obs2 || d.nombreProducto,
            cantidad: d.cantidad,
            pvp: d.precio,
            iva: d.iva ?? 0,
            valorDev: 0,
            total: d.cantidad * d.precio
          }));

          // Grilla de pagos (si quieres mostrarlos)


          this.recalcular();
        } else {
          this.errorFactura = resp.message || 'No se pudo obtener el detalle.';
        }
      },
      error: (e) => {
        this.errorFactura = e?.message ?? 'Error consultando el detalle de la factura.';
      }
    });
  }

  // Deriva sucursal/caja de la factura, pero NO reescribe 'encabezado.factura'
  private parseFacturaParts(num: string) {
    const digits = (num ?? '').replace(/\D/g, '');
    const sucursal = digits.slice(0, 3) || '';
    const caja = digits.slice(3, 6) || '';
    const secuencia = digits.slice(6) || '';
    return { sucursal, caja, secuencia };
  }

  // extrae sufijo para hacer match por número
  private extraerSufijo(valor: string): string {
    const soloDigitos = valor.replace(/\D/g, '');
    const len = Math.min(9, soloDigitos.length);
    return soloDigitos.slice(-len);
  }

  // ahora: SOLO secundarios
  private setCamposDesdeFacturaSoloSecundarios(num: string) {
    const digits = (num ?? '').replace(/\D/g, '');
    const sucursal = digits.slice(0, 3) || '';
    const caja = digits.slice(3, 6) || '';

    if (sucursal) this.encabezado.sucursal2 = sucursal;
    if (caja) this.encabezado.caja2 = caja;
  }
  numberDot3d = (p: ValueFormatterParams): string => {
    const n = this.asNumber(p.value);
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(n);
  };
  private resetTotales() {
    this.totales = {
      subtotal: 0, base0: 0, baseIva: 0, iva: 0,
      totalFactura: 0, totalFacturaConIva: 0,
      subtotalDev: 0, baseDev0: 0, baseDevIva: 0,
      totalDev: 0, totalIvaDev: 0, totalDevConIva: 0,
      totalPago: 0,
    };

  }
  cargarForma() {
    this.filteredFormasPago$ = this.fcMetodoPago.valueChanges.pipe(
      startWith(''),
      debounceTime(200),
      map(v => (typeof v === 'string' ? v : (v?.descripcionPago ?? '')).trim()),
      distinctUntilChanged(),
      tap(() => this.isLoadingFormas = true),
      switchMap(term => term.length >= 1
        // buscar por término
        ? this.formaPagoService.search(term).pipe(
          map((r: ApiResponseFP<FormaPagoResponse[]>) => r.data ?? [])
        )
        // primer load (sin término) ⇒ top N del lite
        : this.formaPagoService.getPagedLite(1, 50).pipe(
          map(r => r?.type === 'Success' ? (r.data?.items ?? []) : [])
        )
      ),
      catchError(() => of([] as FormaPagoResponse[])),
      finalize(() => this.isLoadingFormas = false)
    );
  }


  displayFormaPago = (v: string | FormaPagoResponse | null) =>
    typeof v === 'string' ? v : v?.descripcionPago ?? '';



  private upsertPago(codigo: string, descripcion: string, cuenta: string) {
    const codigoStr = String(codigo ?? '');
    const idx = this.pagoRows.findIndex(r => String(r.codigo ?? '') === codigoStr);
    if (idx >= 0) {
      this.pagoRows = this.pagoRows.map((r, i) =>
        i === idx ? { ...r, descripcion, cuenta } : r
      );
    } else {
      const tope = this.getTopePago();
      this.pagoRows = [
        ...this.pagoRows,
        { codigo: codigoStr, descripcion, debe: tope, haber: 0, saldo: tope, pago: 0, cuenta }
      ];
    }
  }


  onFormaPagoSelected(e: MatAutocompleteSelectedEvent) {
    const fp = e.option.value as FormaPagoResponse;

    const rawId = (fp as any).idFormaPago ?? (fp as any).id_forma_pago;
    const idStr = String(rawId ?? '');
    const desc = fp.descripcionPago ?? (fp as any).descripcion_pago ?? '';
    let cuenta = (fp as any).codigoCuenta ?? (fp as any).codigo_cuenta ?? '';

    // Si ya vino la cuenta, insertar/actualizar y salir
    if (cuenta) {
      this.upsertPago(idStr, desc, cuenta);
      this.fcMetodoPago.setValue('', { emitEvent: false });
      this.recalcular();
      return;
    }

    // Hidratar por search() filtrando por id normalizado
    // Hidratar por search() usando la DESCRIPCIÓN (no el id) y filtrando por id
    this.isLoadingFormas = true;
    const term = (desc || '').trim();
    const q = term.length >= 2 ? term.slice(0, 2) : term.slice(0, 1); // backend suele requerir ≥1–2 chars

    this.formaPagoService.search(q).pipe(
      map((r: ApiResponseFP<FormaPagoResponse[]>) => r?.data ?? []),
      // Busca por id normalizado dentro de los resultados
      map(list => list.find(x => {
        const xid = String((x as any).idFormaPago ?? (x as any).id_forma_pago ?? '');
        return xid === idStr;
      }) ?? null),
      catchError(() => of(null)),
      finalize(() => this.isLoadingFormas = false)
    ).subscribe((fpFull) => {
      const cuentaFull = (fpFull as any)?.codigoCuenta ?? (fpFull as any)?.codigo_cuenta ?? '';
      this.upsertPago(idStr, desc, cuentaFull);
      this.fcMetodoPago.setValue('', { emitEvent: false });
      this.recalcular();
    });

  }

  private getTopePago(): number {
    const dev = this.totales.totalDevConIva || 0;
    return dev > 0 ? dev : (this.totales.totalFacturaConIva || 0);
  }


  mostrarAlerta(mensaje: string, tipo: 'info' | 'error' | 'ok' | string): void {
    this._snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: tipo === 'error' ? ['snack-error'] : tipo === 'ok' ? ['snack-ok'] : ['snack-info']
    });
  }
  onClickGrabar(): void {
  const tope = this.getTopePago();
  const pagado = this.totales.totalPago || 0;
  const dif = +(tope - pagado).toFixed(2);

  if (!(tope > 0)) {
    this.mostrarAlerta('No hay devolución calculada. Verifica el detalle.', 'info');
    return;
  }

  if (Math.abs(dif) >= 0.01) {
    if (dif > 0) {
      this.mostrarAlerta(`El valor del pago es menor a la devolución. Faltan ${dif.toFixed(2)}.`, 'error');
    } else {
      this.mostrarAlerta(`El valor del pago excede la devolución en ${Math.abs(dif).toFixed(2)}.`, 'error');
    }
    return;
  }

  // OK, cuadra ⇒ ahora sí grabar
  this.grabar();
}
private removePago(row: Pago, api: any): void {
  // 1) quita de la grilla (rápido)
  api.applyTransaction({ remove: [row] });

  // 2) sincroniza tu fuente de datos (pagoRows) y dispara cambio de referencia
  const codigo = String(row?.codigo ?? '');
  this.pagoRows = (this.pagoRows ?? []).filter(r =>
    r !== row && String(r.codigo ?? '') !== codigo
  );

  // 3) recalcula totales y disponibilidad del botón de grabar
  this.recalcular();

  // 4) (opcional) aviso
  // this.mostrarAlerta('Forma de pago eliminada.', 'info');
}
private buildPayload(): NotaCreditoCrearReq {
  // 1) DETALLES: mapea desde this.detalleRows
  const detalles = this.detalleRows.map(d => ({
    codpro: String(d.codigo ?? ''),
    cantidad: Number(d.cantidad ?? 0),
    precio: Number(d.pvp ?? 0),
    costo:  Number(d.pvp ?? 0),           // ajusta si tienes el costo real
    iva:    Number(d.iva ?? 0),
    descuento: 0,                         // ajusta si manejas descuentos
    tipoIva: (this.asNumber(d.iva) > 0 ? '1' : '0'), // ej.: "1" con IVA, "0" sin IVA
    cueCodigo: 110201                     // ajusta si viene por línea
  }));

  // 2) FORMAS DE PAGO: mapea desde this.pagoRows (usa la factura fijada para numdoc)
  const formasPago = this.pagoRows.map((p, i) => ({
    id: String(p.codigo ?? ''),           // ej.: "NC"
    clientesCodigo: this.clientesCodigo,  // seteado cuando cargas factura
    numnota: null,
    numdoc: (this.encabezado.factura ?? '').replace(/\D/g, ''), // "001001000000004"
    forpag: String(p.codigo ?? ''),       // si tu backend espera mismo código de forma pago
    valor: Number(p.pago ?? 0),
    cuentaContable: String(p.cuenta ?? ''),
    estado: 'A',
    fila: i + 1,
    fecha: new Date().toISOString(),
    idNotaCredito: 0
  }));

  return {
    clienteCodigo: this.clientesCodigo,     // o el que tengas en encabezado
    caja: this.encabezado.caja2 || this.encabezado.caja || '001',
    observaciones: this.encabezado.observacion || '',
    idUsuarioResponsable: this.usuarioActual?.id_usuario?? 1,
    ateCodigo: 0,
    historiaClinica: '',
    detalles,
    formasPago
  };
}
}
