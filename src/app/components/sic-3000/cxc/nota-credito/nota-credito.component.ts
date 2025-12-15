import { Component, OnInit } from '@angular/core';
import { NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  NotaCreditoService,
  ApiResponse,
  PaginationResponse,
  FacturaListResponse,
  NotaCreditoCrearReq
} from 'src/app/services/nota-credito.service';
import {
  FormaPagoService,
  FormaPagoResponse,
  ApiResponse as ApiResponseFP
} from 'src/app/services/forma-pago.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UsuarioService } from 'src/app/services/usuario.service';
import { AutorizacionCajaService } from 'src/app/services/autorizacion-caja.service';
import { shareReplay } from 'rxjs/operators';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';

import {
  startWith,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map,
  tap,
  finalize,
} from 'rxjs/operators';

import {
  ColDef,
  ValueParserParams,
  ValueFormatterParams,
} from 'ag-grid-community';
import { MatDialog } from '@angular/material/dialog';
import { FacturacionService } from 'src/app/services/facturacion.service';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
import { ClienteService } from 'src/app/services/cliente.service';
import { ReversarAsientoService } from 'src/app/services/reversar-asiento.service';

type Detalle = {
  codigo?: string;
  descripcion?: string;
  cantidad?: number;   // cantidad original
  pvp?: number;        // precio original
  total?: number;      // cantidad * pvp
  iva?: number;        // IVA $ de la línea original
  piva?: number;       // visible (% calculado)
  ivaPct?: number;     // % IVA de la línea original
  cantidadd?: number;  // cantidad devuelta
  valorDev?: number;   // base devuelta (sin IVA)
  ivaDev?: number;     // IVA devuelto (solo usado en porMonto)
  porMonto?: boolean;  // si true, usamos valorDev y cantidad variable
};

type Pago = {
  codigo?: string;
  descripcion?: string;
  debe?: number;
  haber?: number;
  saldo?: number;
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

  subtotalDev: number;
  baseDev0: number;
  baseDevIva: number;
  totalDev: number;
  totalIvaDev: number;
  totalDevConIva: number;

  totalPago: number;
};

@Component({
  selector: 'app-nota-credito',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AgGridAngular,
    ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatAutocompleteModule, MatOptionModule, MatSnackBarModule
  ],
  templateUrl: './nota-credito.component.html',
  styleUrls: ['./nota-credito.component.css'],
})
export class NotaCreditoComponent implements OnInit {
  esFacturaDeSaldo = false;
  datosFacturaValidada: any = null;
  productos: any[] = []; // Array de productos cargados
  productosLoaded = false;
  isLoadingProductos = false;
  filteredProductosNC$: Observable<any[]> = of([]);
  buscarProductoTexto = '';
  productosFiltrados: any[] = [];
  productoSeleccionado = '';

  // Para visualizar el resultado del asiento VT
  asientoVentaInfo: any | null = null;

  constructor(
    private svc: NotaCreditoService,
    private formaPagoService: FormaPagoService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private _snackBar: MatSnackBar,
    private usuarioService: UsuarioService,
    private autorizacionCajaService: AutorizacionCajaService,
    private dialog: MatDialog,
    private facturacionService: FacturacionService,
    private clienteService: ClienteService,
    private reversarAsientoService: ReversarAsientoService
  ) { }

  ngOnInit(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    this.cargarAutorizacion();
    this.formasActivas$ = this.formaPagoService.getPagedLite(1, 10).pipe(
      map(resp => resp?.type === 'Success' ? (resp.data?.items ?? []) : []),
      catchError(() => of([] as FormaPagoResponse[])),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.cargarForma();
    Promise.resolve().then(() => {
      this.fcMetodoPago.setValue(this.fcMetodoPago.value ?? '');
    });
  }

  // ======= Estado =======
  totales: Totales = {
    subtotal: 0, base0: 0, baseIva: 0, iva: 0,
    totalFactura: 0, totalFacturaConIva: 0,
    subtotalDev: 0, baseDev0: 0, baseDevIva: 0,
    totalDev: 0, totalIvaDev: 0, totalDevConIva: 0,
    totalPago: 0,
  };

  usuarioActual = this.usuarioService.getUsuarioActual();

  private toISO = (d: Date): string =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);

  idNota: number = 0;
  fcMetodoPago = new FormControl<string | FormaPagoResponse>('');
  filteredFormasPago$: Observable<FormaPagoResponse[]> = of([]);
  formasActivas$!: Observable<FormaPagoResponse[]>;
  isLoadingFormas = false;
  clientesCodigo: number = 0;
  totalHaberFactura: number = 0;
  saldoFacturaPendiente: number = 0;
  totalFacturaOriginalSaldo: number = 0;

  encabezado = {
    sucursal: '',   // sucursal/caja de la NC
    caja: '',
    numero: '',
    fecha: this.toISO(new Date()),
    cliente: '',
    idCliente: 0,
    sucursal2: '',  // sucursal/caja de la factura
    caja2: '',
    factura: '',
    direccion: '',
    ruc: '',
    fechaActual: this.toISO(new Date()),
    observacion: '',
  };

  buscandoFactura = false;
  errorFactura: string | null = null;

  // ======= Helpers =======
  private asNumber = (v: any): number => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  numberParser = (params: ValueParserParams): number => {
    const raw = (params.newValue ?? '')
      .toString()
      .trim()
      .replace(',', '.')
      .replace(/[^0-9.\-]/g, '');
    const n = Number(raw);
    return isNaN(n) ? 0 : n;
  };

  currencyUSD = (p: ValueFormatterParams): string => {
    const n = this.asNumber(p.value);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  };

  numberDot2d = (p: ValueFormatterParams): string => {
    const n = this.asNumber(p.value);
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };

  // ======= Columnas Detalle =======
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
      hide: true,
      valueGetter: (p) => {
        const total = this.asNumber(p.data?.cantidad) * this.asNumber(p.data?.pvp);
        const iva = this.asNumber(p.data?.iva);
        return total > 0 ? (iva / total) * 100 : 0;
      },
    },

    // Cant.Dev. (si editas aquí, sales del modo porMonto)
    {
      headerName: 'Cant.Dev.',
      field: 'cantidadd',
      editable: (params) => !this.esFacturaDeSaldo,
      width: 110,
      type: 'rightAligned',
      valueParser: this.numberParser,
      valueFormatter: this.numberDot2d,
      valueSetter: (p) => {
        const row = p.data as Detalle;
        if (this.esFacturaDeSaldo) {
          row.cantidadd = 1; // Si la factura es de saldo siempre será cantidad 1
          return true;
        }
        const max = this.asNumber(row.cantidad);
        let val = this.asNumber(p.newValue);
        if (val < 0) val = 0;
        if (val > max) val = max;

        row.cantidadd = +val.toFixed(6);

        // salir del modo monto -> recalcular base/iva por prorrateo
        row.porMonto = false;
        const pvp = this.asNumber(row.pvp);
        const ivaLinea = this.asNumber(row.iva);
        const qtyOrig = Math.max(1, this.asNumber(row.cantidad));
        const ivaUnit = ivaLinea / qtyOrig;

        row.valorDev = +(row.cantidadd * pvp).toFixed(2);
        row.ivaDev = +(row.cantidadd * ivaUnit).toFixed(2);

        // No exceder el saldo disponible
        if (this.esFacturaDeSaldo && this.saldoFacturaPendiente > 0) {
          const totalConIva = row.valorDev + row.ivaDev;

          if (totalConIva > this.saldoFacturaPendiente) {
            const precioConIva = pvp + ivaUnit;
            const maxCantidad = this.saldoFacturaPendiente / precioConIva;
            row.cantidadd = +maxCantidad.toFixed(6);
            row.valorDev = +(row.cantidadd * pvp).toFixed(2);
            row.ivaDev = +(row.cantidadd * ivaUnit).toFixed(2);

            this.mostrarAlerta(
              `Cantidad máxima permitida: ${row.cantidadd.toFixed(2)} (saldo: $${this.saldoFacturaPendiente.toFixed(2)})`,
              'info'
            );
          }
        }
        if (p.api) {
          if (p.node) p.api.refreshCells({ rowNodes: [p.node], columns: ['cantidadd', 'valorDev', 'ivaDev'] });
          else p.api.refreshCells({ force: true, columns: ['cantidadd', 'valorDev', 'ivaDev'] });
        }
        this.recalcular();
        return true;
      },
      cellClassRules: {
        'text-red-600 font-semibold': (p) => this.asNumber(p.value) > this.asNumber(p.data?.cantidad),
      },
    },

    // Valor Dev. (modo porMonto: cantidad variable + IVA por %)
    {
      headerName: 'Valor Dev.',
      field: 'valorDev',
      editable: true,
      width: 130,
      type: 'rightAligned',
      valueParser: this.numberParser,
      valueFormatter: this.currencyUSD,
      valueSetter: (p) => {
        const row = p.data as Detalle;
        const pvp = this.asNumber(row.pvp);
        const qtyOrig = this.asNumber(row.cantidad);
        const ivaPct = this.asNumber(row.ivaPct);

        let val = this.asNumber(p.newValue);
        if (val < 0) val = 0;

        // no permitas devolver más que la base original de la línea
        const maxValor = qtyOrig * pvp;
        if (val > maxValor) val = maxValor;

        // No exceder el saldo disponible
        if (this.esFacturaDeSaldo && this.saldoFacturaPendiente > 0) {
          const ivaDev = (val * (ivaPct / 100));
          const totalConIva = val + ivaDev;

          if (totalConIva > this.saldoFacturaPendiente) {
            const maxBase = this.saldoFacturaPendiente / (1 + (ivaPct / 100));
            val = +maxBase.toFixed(2);

            this.mostrarAlerta(
              `El valor máximo a devolver es $${val.toFixed(2)} (saldo: $${this.saldoFacturaPendiente.toFixed(2)})`,
              'info'
            );
          }
        }
        row.porMonto = true;

        // Si es factura de saldo, siempre cantidad = 1
        if (this.esFacturaDeSaldo) {
          row.cantidadd = 1;
        } else {
          if (!(this.asNumber(row.cantidadd) > 0)) row.cantidadd = 1;
        }
        row.valorDev = +val.toFixed(2);                            // base
        row.ivaDev = +((row.valorDev) * (ivaPct / 100)).toFixed(2);

        if (p.api) {
          if (p.node) p.api.refreshCells({ rowNodes: [p.node], columns: ['cantidadd', 'valorDev', 'ivaDev'] });
          else p.api.refreshCells({ force: true, columns: ['cantidadd', 'valorDev', 'ivaDev'] });
        }
        this.recalcular();
        return true;
      }
    },

    // IVA Dev. (si porMonto -> usa row.ivaDev; si no, proporcional)
    {
      headerName: 'Iva Dev.',
      field: 'ivaDev',
      editable: false,
      width: 130,
      type: 'rightAligned',
      valueGetter: (p) => {
        const row = p.data as Detalle;
        if (row.porMonto) {
          return this.asNumber(row.ivaDev);
        }
        const cantDev = this.asNumber(row.cantidadd);
        const cantidad = this.asNumber(row.cantidad);
        const ivaLinea = this.asNumber(row.iva);
        if (cantidad <= 0) return 0;
        const ivaUnit = ivaLinea / cantidad;
        return cantDev * ivaUnit;
      },
      valueFormatter: this.currencyUSD,
    }
  ];

  // ======= Columnas Pago =======
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
        btn.innerHTML = '<span class="material-icons">delete</span>';
        btn.addEventListener('click', () => {
          const row = params.node?.data as Pago;
          if (!row) return;
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
      valueGetter: () => this.getDebeVisual(),
      valueFormatter: this.currencyUSD,
    },
    {
      headerName: 'Haber',
      field: 'haber',
      editable: false,
      width: 110,
      type: 'rightAligned',
      valueFormatter: this.currencyUSD,
    },
    {
      headerName: 'Saldo',
      field: 'saldo',
      editable: false,
      width: 110,
      type: 'rightAligned',
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

        const maxFila = this.getMaxPermitidoPago(p.data); // ← basado en saldo del back
        if (val < 0) val = 0;
        if (val > maxFila) {
          val = maxFila;
          this.mostrarAlerta('El pago no puede superar el saldo pendiente.', 'info');
        }

        p.data.pago = +val.toFixed(2);

        if (p.api) {
          if (p.node) p.api.refreshCells({ rowNodes: [p.node], columns: ['pago', 'saldo'] });
          else p.api.refreshCells({ force: true, columns: ['pago', 'saldo'] });
        }
        this.zone.run(() => this.recalcular());
        return true;
      },

    },
    { headerName: 'Cuenta Cont.', field: 'cuenta', editable: false, width: 140 },
  ];

  // ======= Config común =======
  defaultColDef: ColDef = {
    sortable: false,
    resizable: true,
    suppressHeaderMenuButton: true,
  };

  // ======= Datos =======
  detalleRows: Detalle[] = [
    { codigo: '', descripcion: '', cantidad: 0, pvp: 0, iva: 0, valorDev: 0, porMonto: false },
  ];
  pagoRows: Pago[] = [];

  // ======= Eventos grid =======
  onDetalleCellChanged() { this.recalcular(); }
  onPagoCellChanged() { this.recalcular(); }

  // ======= Totales =======
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

      const ivaPct = (r.ivaPct ?? (totalLinea > 0 ? (ivaLinea / totalLinea) * 100 : 0));
      if (ivaPct > 0) baseIva += totalLinea; else base0 += totalLinea;

      // Devoluciones
      const valorDev = this.asNumber(r.valorDev);
      if (valorDev > 0) {
        totalDev += valorDev;
        if (ivaPct > 0) baseDevIva += valorDev; else baseDev0 += valorDev;
      }

      if (r.porMonto) {
        totalIvaDev += this.asNumber(r.ivaDev);
      } else {
        const cantDev = this.asNumber(r.cantidadd);
        if (cantidad > 0) totalIvaDev += cantDev * (ivaLinea / cantidad);
      }
    }

    let totalPago = 0;
    for (const r of this.pagoRows) totalPago += this.asNumber(r.pago);
    totalPago = +totalPago.toFixed(2);

    const totalDevConIva = +(totalDev + totalIvaDev).toFixed(2);

    // NUEVA LÓGICA: Si es factura de saldo, usar el saldo como tope
    let totalFacturaConIva: number;
    let subtotalFactura: number;
    let ivaFactura: number;
    let base0Factura: number;
    let baseIvaFactura: number;

    if (this.esFacturaDeSaldo && this.saldoFacturaPendiente > 0) {
      // Calcular el DEBE original: Saldo + Haber
      const debeOriginal = this.saldoFacturaPendiente + (this.totalHaberFactura || 0);

      // El Total Factura es el DEBE original
      totalFacturaConIva = debeOriginal;
      subtotalFactura = debeOriginal;
      ivaFactura = 0;
      base0Factura = 0;
      baseIvaFactura = 0;

      // Guardar para mostrarlo en "Debe" del grid
      this.totalFacturaOriginalSaldo = debeOriginal;
    } else {
      // Lógica normal para facturas con detalle
      totalFacturaConIva = +(subtotal + iva).toFixed(2);
      subtotalFactura = subtotal;
      ivaFactura = iva;
      base0Factura = base0;
      baseIvaFactura = baseIva;
    }

    this.totales = {
      subtotal: subtotalFactura,
      base0: base0Factura,
      baseIva: baseIvaFactura,
      iva: ivaFactura,
      totalFactura: subtotalFactura,
      totalFacturaConIva,
      subtotalDev: baseDev0 + baseDevIva,
      baseDev0,
      baseDevIva,
      totalDev,
      totalIvaDev,
      totalDevConIva,
      totalPago,
    };

    // Validar que la devolución no exceda el saldo disponible
    if (this.esFacturaDeSaldo && totalDevConIva > this.saldoFacturaPendiente) {
      this.mostrarAlerta(
        `La devolución ($${totalDevConIva.toFixed(2)}) no puede exceder el saldo disponible ($${this.saldoFacturaPendiente.toFixed(2)})`,
        'info'
      );
    }

    const tope = this.getTopePago();
    const diferencia = +(tope - totalPago).toFixed(2);
    this.puedeGrabarBtn = Math.abs(diferencia) < 0.01 && this.pagoRows.length > 0;

    // Auto-ajustar el pago si hay formas de pago y hay devolución
    if (this.pagoRows.length > 0 && totalDevConIva > 0) {
      this.ajustarPagoAutomatico(totalDevConIva);
    }
    this.cdr.detectChanges();
  }

  private ajustarPagoAutomatico(totalDev: number): void {
    if (this.pagoRows.length === 0) return;

    // Distribuir el total en las formas de pago existentes
    const totalActual = this.pagoRows.reduce((sum, r) => sum + this.asNumber(r.pago), 0);

    // Solo ajustar si hay diferencia significativa
    if (Math.abs(totalActual - totalDev) < 0.01) return;

    // Si hay una sola forma de pago, asignarle todo
    if (this.pagoRows.length === 1) {
      this.pagoRows[0].pago = +totalDev.toFixed(2);
    } else {
      // Si hay múltiples, poner todo en la primera y cero en las demás
      this.pagoRows[0].pago = +totalDev.toFixed(2);
      for (let i = 1; i < this.pagoRows.length; i++) {
        this.pagoRows[i].pago = 0;
      }
    }
  }

  agregarPago(): void {
    this.pagoRows = [
      ...this.pagoRows,
      { codigo: '', descripcion: '', debe: 0, haber: 0, pago: 0, cuenta: '' },
    ];
  }

  nuevo(): void {
    const suc = this.encabezado.sucursal;
    const caj = this.encabezado.caja;

    this.encabezado = {
      ...this.encabezado,
      sucursal: suc,
      caja: caj,
      numero: '',
      fecha: this.toISO(new Date()),
      cliente: '',
      idCliente: 0,
      sucursal2: '',
      caja2: '',
      factura: '',
      direccion: '',
      ruc: '',
      fechaActual: this.toISO(new Date()),
      observacion: '',
    };

    this.detalleRows = [{ codigo: '', descripcion: '', cantidad: 0, pvp: 0, iva: 0, valorDev: 0, porMonto: false }];
    this.pagoRows = [];
    this.facturaFijada = false;
    this.errorFactura = null;
    this.buscandoFactura = false;
    this.idNota = 0;
    this.resetTotales();
    this.guardado = false;
    this.encabezado.numero = '';
    this.esFacturaDeSaldo = false;
    this.totalFacturaOriginalSaldo = 0;
    this.asientoVentaInfo = null;
  }

  get diferenciaPago(): number {
    const tope = this.getTopePago();
    const pagado = this.totales.totalPago || 0;
    return +(tope - pagado).toFixed(2);
  }

  get puedeGrabar(): boolean {
    const tope = this.getTopePago();
    const pagado = this.totales.totalPago || 0;
    return tope > 0 && Math.abs(tope - pagado) < 0.01;
  }

  guardando = false;
  guardado = false;

  grabar(): void {
    if (this.guardando || this.guardado) return;

    const tope = this.getTopePago();
    if (!(tope > 0)) {
      this.mostrarAlerta('No hay devolución calculada. Verifica el detalle.', 'info');
      return;
    }

    if (!this.puedeGrabar) {
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

    const payload = this.buildPayload();

    this.guardando = true;
    console.log('payload (json):\n', JSON.stringify(payload, null, 2));

    this.svc.crearNotaCredito(payload).pipe(
      switchMap(resp => {
        const tipo = (resp?.type || '').toLowerCase();
        const dataNc: any = resp?.data || {};
        const idNc = Number(dataNc.idNotaCredito ?? dataNc.idnota ?? 0);

        if (tipo === 'success' && Number.isFinite(idNc) && idNc > 0) {
          this.mostrarAlerta(resp?.message || 'Nota de crédito creada correctamente.', 'ok');

          // =============================
          // 1) DISPARAR GENERACIÓN ASIENTO VT
          // =============================
          const numeroNotaCredito =
            dataNc.numeroNotaCredito ??
            dataNc.numeroNota ??
            this.encabezado.numero ??
            '';

          const numeroFactura =
            dataNc.numeroFactura ??
            this.encabezado.factura ??
            '';

          const idUsuario = this.usuarioActual?.id_usuario ?? 1;

          this.reversarAsientoService
            .generarReversoDesdeNotaCredito(this.idNota, idUsuario, numeroNotaCredito, numeroFactura)
            .pipe(
              catchError(err => {
                console.error('[NC] Error generando asiento VT:', err);
                this.mostrarAlerta('Nota creada, pero no se pudo generar el asiento de ventas (VT).', 'error');
                return of(null);
              })
            )
            .subscribe(revResp => {
              if (!revResp) return;
              const tipoRev = (revResp.type || '').toLowerCase();
              if (tipoRev === 'success' && revResp.data) {
                this.asientoVentaInfo = revResp.data;
                this.mostrarAlerta(
                  `Asiento VT generado. Origen: ${revResp.data.numdocOriginal}, Reverso: ${revResp.data.numdocReverso}`,
                  'ok'
                );
                console.log('[NC] Asiento VT generado:', revResp.data);
              } else {
                this.mostrarAlerta(
                  revResp.message || 'No se pudo generar el asiento de ventas (VT).',
                  'error'
                );
              }
            });

          // =============================
          // 2) XML + PDF DE LA NOTA DE CRÉDITO
          // =============================
          return this.svc.generarXmlNotaCredito(idNc).pipe(
            switchMap((r: any) => {
              const ok = (r?.success ?? r?.data?.success) === true;
              const fileName = r?.fileName ?? r?.data?.fileName ?? '';
              const msg = r?.message ?? r?.data?.message ?? '';

              if (!ok) {
                this.mostrarAlerta(msg || 'No se generó el XML de la Nota de Crédito.', 'error');
                return of(void 0);
              }

              this.mostrarAlerta(`XML generado en el servidor: ${fileName || 'OK'}`, 'ok');
              return this.svc.descargarPdfNotaCredito(idNc);
            }),
            catchError(() => {
              this.mostrarAlerta('Error generando el XML en el servidor.', 'error');
              return of(void 0);
            })
          );
        }

        this.mostrarAlerta(resp?.message || 'No se pudo crear la nota de crédito.', 'error');
        return of(void 0);
      }),
      catchError(err => {
        console.error('[crearNotaCredito] error:', err);
        this.mostrarAlerta('Error al crear la nota de crédito.', 'error');
        return of(void 0);
      }),
      finalize(() => {
        this.guardando = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => this.mostrarAlerta('PDF de la Nota de Crédito descargado.', 'ok')
    });
  }

  exportar(): void {
    alert('Exportar (CSV/PDF) – implementar según tu necesidad.');
  }

  facturaFijada = false;

  private fijarFactura(numCompleto: string) {
    this.encabezado.factura = numCompleto;
    this.facturaFijada = true;
    this.setCamposDesdeFacturaSoloSecundarios(this.encabezado.factura);
  }

  editarFactura() { this.facturaFijada = false; }

  onEnterFactura(): void {
    const entrada = (this.encabezado.factura ?? '').trim();
    if (!this.cajaAsignada) {
      this.mostrarAlerta('Usuario no tiene asignado Caja. No podrás generar notas de crédito hasta asignarla.', 'info');
      return;
    }
    if (!entrada) return;

    this.errorFactura = null;
    this.buscandoFactura = true;

    // 1) Validar con el nuevo endpoint
    this.svc.validarFacturaParaNC(entrada).subscribe({
      next: (validacion) => {
        if (!validacion.success || !validacion.data) {
          this.errorFactura = validacion.message;
          this.buscandoFactura = false;
          return;
        }

        // 2) Detectar si es factura de saldo
        this.esFacturaDeSaldo = !validacion.data.existeEnNota;
        this.datosFacturaValidada = validacion.data;

        // 3) Si es factura de saldo, cargar manualmente
        if (this.esFacturaDeSaldo) {
          this.mostrarMensajeFacturaSaldo(validacion.data);
          this.cargarFacturaSaldo(validacion.data);
          return; // NO continuar con la búsqueda normal
        }

        // 4) Si NO es factura de saldo, usar la lógica original
        this.svc.buscarPorNumeroLike(entrada, true, 1, 20).subscribe({
          next: (resp: ApiResponse<PaginationResponse<FacturaListResponse>>) => {
            this.buscandoFactura = false;
            if (resp.type !== 'Success' || !resp.data?.items?.length) {
              this.errorFactura = resp.message || 'No se encontraron facturas.';
              return;
            }

            const sufijo = this.extraerSufijo(entrada);
            const candidatos = resp.data.items.filter(i => i.numeroFactura?.endsWith(sufijo));
            const lista = (candidatos.length ? candidatos : resp.data.items)
              .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

            const best = lista[0];

            this.idNota = best.idNota;
            this.clientesCodigo = best.idCliente;

            if (best.numeroFactura) this.fijarFactura(best.numeroFactura);
            else this.facturaFijada = true;

            this.encabezado.cliente = (best as any).cliente ?? this.encabezado.cliente;
            this.encabezado.ruc = (best as any).rucCliente ?? this.encabezado.ruc;
            this.encabezado.direccion = (best as any).dirCliente ?? this.encabezado.direccion;

            if (best.numeroFactura) {
              this.svc.getSaldoFactura(best.numeroFactura, {
                excluirPagosAnulados: true,
                excluirMovimientosAnulados: true,
              }).subscribe({
                next: (r) => {
                  if ((r?.type ?? '').toString().toLowerCase() === 'success' && r.data) {
                    this.totalHaberFactura = Number(r.data.totalHaber ?? 0);
                    this.saldoFacturaPendiente = Number(r.data.saldo ?? 0);
                    this.syncPagoRowsConSaldo();
                  } else {
                    console.warn('No se pudo obtener el saldo de la factura:', r?.message);
                  }
                },
                error: (e) => {
                  console.warn('Error consultando saldo de factura:', e?.message || e);
                }
              });
            }

            if (this.idNota && this.idNota > 0) this.cargarFacturaPorId(this.idNota);
            else this.errorFactura = 'No se pudo determinar el ID de la factura.';
          },
          error: (e) => {
            this.buscandoFactura = false;
            this.errorFactura = e?.message ?? 'Error consultando la factura.';
          }
        });
      },
      error: (e) => {
        this.buscandoFactura = false;
        this.errorFactura = e?.message ?? 'Error validando factura';
      }
    });
  }

  private mostrarMensajeFacturaSaldo(datos: any): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '500px',
      data: {
        title: '⚠️ Factura de Saldo Detectada',
        message: `
          Esta factura no existe en el sistema de facturas,<br>
          pero tiene saldo pendiente en Estado de Cuenta.<br><br>
          
          <strong>Número:</strong> ${datos.numeroFactura}<br>
          <strong>Cliente:</strong> ${datos.nombreCliente}<br>
          <strong>Saldo pendiente:</strong> $${datos.saldoPendiente.toFixed(2)}<br>
          <strong>Origen:</strong> ${datos.origenDatos}<br><br>
          
          <em>Podrás agregar productos manualmente para la devolución.</em>
        `,
        type: 'warning',
        confirmText: 'Continuar',
        showCancel: false
      }
    });
  }

  private cargarFacturaSaldo(datos: any): void {
    this.clientesCodigo = datos.clienteCodigo;
    this.encabezado.cliente = datos.nombreCliente;
    this.encabezado.factura = datos.numeroFactura;
    this.facturaFijada = true;

    this.totalHaberFactura = datos.totalPagado;
    this.saldoFacturaPendiente = datos.saldoPendiente;

    // sucursal2 y caja2 de la factura
    const digits = (datos.numeroFactura ?? '').replace(/\D/g, '');
    if (digits.length >= 6) {
      this.encabezado.sucursal2 = digits.slice(0, 3);
      this.encabezado.caja2 = digits.slice(3, 6);
    }

    // Cargar datos completos del cliente (RUC y Dirección)
    this.cargarDatosClienteCompleto(datos.clienteCodigo);

    this.detalleRows = [
      {
        codigo: '',
        descripcion: '',
        cantidad: 0,
        pvp: 0,
        iva: 0,
        ivaPct: 0,
        valorDev: 0,
        cantidadd: 0,
        ivaDev: 0,
        porMonto: false
      }
    ];

    this.cargarProductosParaNC();
    this.buscandoFactura = false;
    this.recalcular();
  }

  private cargarDatosClienteCompleto(clienteCodigo: number): void {
    this.clienteService.getClienteById(clienteCodigo).subscribe({
      next: (cliente: any) => {
        if (cliente) {
          this.encabezado.ruc = cliente.ruc || '';
          this.encabezado.direccion = cliente.dircli || '';
        }
      },
      error: (e) => {
        console.warn('No se pudieron cargar datos del cliente:', e);
        this.encabezado.ruc = '';
        this.encabezado.direccion = '';
      }
    });
  }

  private cargarFacturaPorId(idNota: number): void {
    this.svc.getFacturaPorIdNota(idNota).subscribe({
      next: (resp) => {
        if (resp.type === 'Success' && resp.data) {
          const { factura, detalles } = resp.data;

          this.encabezado.cliente = factura.cliente?.nombre ?? this.encabezado.cliente;
          this.encabezado.ruc = factura.cliente?.ruc ?? this.encabezado.ruc;
          this.encabezado.direccion = factura.cliente?.direccion ?? this.encabezado.direccion;
          this.encabezado.fecha = this.toISO(new Date(factura.fecha));

          this.detalleRows = detalles.map(d => {
            const baseOrig = (d.cantidad ?? 0) * (d.precio ?? 0);
            const ivaVal = d.iva ?? 0;
            const ivaPct = baseOrig > 0 ? +((ivaVal / baseOrig) * 100).toFixed(2) : 0;

            return {
              codigo: d.codigoProducto,
              descripcion: d.obs2 || d.nombreProducto,
              cantidad: d.cantidad,
              pvp: d.precio,
              iva: ivaVal,
              ivaPct,
              valorDev: 0,
              cantidadd: 0,
              ivaDev: 0,
              total: (d.cantidad ?? 0) * (d.precio ?? 0),
              porMonto: false
            } as Detalle;
          });

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

  private parseFacturaParts(num: string) {
    const digits = (num ?? '').replace(/\D/g, '');
    const sucursal = digits.slice(0, 3) || '';
    const caja = digits.slice(3, 6) || '';
    const secuencia = digits.slice(6) || '';
    return { sucursal, caja, secuencia };
  }

  private extraerSufijo(valor: string): string {
    const soloDigitos = valor.replace(/\D/g, '');
    const len = Math.min(9, soloDigitos.length);
    return soloDigitos.slice(-len);
  }

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
        ? this.formaPagoService.search(term).pipe(map((r: ApiResponseFP<FormaPagoResponse[]>) => r.data ?? []))
        : this.formaPagoService.getPagedLite(1, 50).pipe(map(r => r?.type === 'Success' ? (r.data?.items ?? []) : []))
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

    const debeVisual = this.getDebeVisual();
    const haberBack = this.totalHaberFactura;
    const saldoBack = this.saldoFacturaPendiente;

    const pagoSugerido = this.getMaxPermitidoPago(); // respeta saldo

    if (idx >= 0) {
      const actual = this.pagoRows[idx];
      const nuevoPago = Math.min(this.asNumber(actual.pago), this.getMaxPermitidoPago(actual));
      this.pagoRows = this.pagoRows.map((r, i) =>
        i === idx ? { ...r, descripcion, cuenta, debe: debeVisual, haber: haberBack, saldo: saldoBack, pago: nuevoPago }
          : r
      );
    } else {
      this.pagoRows = [
        ...this.pagoRows,
        { codigo: codigoStr, descripcion, cuenta, debe: debeVisual, haber: haberBack, saldo: saldoBack, pago: pagoSugerido }
      ];
    }
    this.recalcular();
  }

  onFormaPagoSelected(e: MatAutocompleteSelectedEvent) {
    const fp = e.option.value as FormaPagoResponse;

    const rawId = (fp as any).idFormaPago ?? (fp as any).id_forma_pago;
    const idStr = String(rawId ?? '');
    const desc = fp.descripcionPago ?? (fp as any).descripcion_pago ?? '';
    let cuenta = (fp as any).codigoCuenta ?? (fp as any).codigo_cuenta ?? '';

    if (cuenta) {
      this.upsertPago(idStr, desc, cuenta);
      this.fcMetodoPago.setValue('', { emitEvent: false });
      this.recalcular();
      return;
    }

    this.isLoadingFormas = true;
    const term = (desc || '').trim();
    const q = term.length >= 2 ? term.slice(0, 2) : term.slice(0, 1);

    this.formaPagoService.search(q).pipe(
      map((r: ApiResponseFP<FormaPagoResponse[]>) => r?.data ?? []),
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

  private getDebeVisual(): number {
    // SOLO si es factura de saldo, usar el total original guardado
    if (this.esFacturaDeSaldo && this.totalFacturaOriginalSaldo > 0) {
      return this.totalFacturaOriginalSaldo;
    }

    // Lógica normal
    return this.totales.totalFacturaConIva || 0;
  }

  private getDisponible(except?: Pago): number {
    const tope = this.getTopePago();
    const sumaOtros = (this.pagoRows || [])
      .filter(r => r !== except)
      .reduce((acc, r) => acc + this.asNumber(r.pago), 0);

    return Math.max(0, +(tope - sumaOtros).toFixed(2));
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
    if (!this.cajaAsignada) {
      this.mostrarAlerta('Usuario no tiene asignado Caja. No podrás generar notas de crédito hasta asignarla.', 'info');
      return;
    }
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

    this.grabar();
  }

  private removePago(row: Pago, api: any): void {
    api.applyTransaction({ remove: [row] });
    const codigo = String(row?.codigo ?? '');
    this.pagoRows = (this.pagoRows ?? []).filter(r => r !== row && String(r.codigo ?? '') !== codigo);
    this.recalcular();
  }

  // ======= Payload =======
  private buildPayload(): NotaCreditoCrearReq {
    const detalles = this.detalleRows
      .filter(d => (this.asNumber(d.cantidadd) > 0) || (d.porMonto && this.asNumber(d.valorDev) > 0))
      .map(d => {
        const qtyOrig = this.asNumber(d.cantidad);
        const pvp = this.asNumber(d.pvp);
        const baseOrig = qtyOrig * pvp;
        const ivaVal = this.asNumber(d.iva);
        const ivaPct = d.ivaPct ?? (baseOrig > 0 ? +((ivaVal / baseOrig) * 100).toFixed(2) : 0);

        if (d.porMonto) {
          const monto = Math.max(0, this.asNumber(d.valorDev));
          let qtyDev = this.asNumber(d.cantidadd);
          if (!(qtyDev > 0)) qtyDev = 1;
          const precioUnit = +(monto / qtyDev).toFixed(6);

          return {
            codpro: String(d.codigo ?? ''),
            cantidad: +qtyDev.toFixed(6),
            precio: precioUnit,
            costo: precioUnit,
            iva: ivaPct,
            descuento: 0,
            tipoIva: ivaPct > 0 ? '1' : '0',
            cueCodigo: 110201,
            descripcion: String(d.descripcion ?? '')
          };
        }

        const qtyDev = +this.asNumber(d.cantidadd).toFixed(6);
        return {
          codpro: String(d.codigo ?? ''),
          cantidad: qtyDev,
          precio: pvp,
          costo: pvp,
          iva: ivaPct,
          descuento: 0,
          tipoIva: ivaPct > 0 ? '1' : '0',
          cueCodigo: 110201,
          descripcion: String(d.descripcion ?? '')
        };
      });

    const formasPago = this.pagoRows.map((p, i) => ({
      id: String(p.codigo ?? ''),
      clientesCodigo: this.clientesCodigo,
      numnota: null,
      numdoc: (this.encabezado.factura ?? '').replace(/\D/g, ''),
      forpag: String(p.codigo ?? ''),
      valor: Number(p.pago ?? 0),
      cuentaContable: String(p.cuenta ?? ''),
      estado: 'A',
      fila: i + 1,
      fecha: new Date().toISOString(),
      idNotaCredito: 0
    }));

    return {
      clienteCodigo: this.clientesCodigo,
      caja: this.encabezado.caja || '001',
      observaciones: this.encabezado.observacion || '',
      idUsuarioResponsable: this.usuarioActual?.id_usuario ?? 1,
      idEmpresa: this.usuarioActual?.id_empresa ?? 1,
      ateCodigo: 0,
      historiaClinica: '',
      detalles,
      formasPago
    };
  }

  private syncPagoRowsConSaldo(): void {
    if (!Array.isArray(this.pagoRows)) return;

    // 1) actualizar valores que vienen del back
    this.pagoRows = this.pagoRows.map(r => ({
      ...r,
      haber: this.totalHaberFactura,
      saldo: this.saldoFacturaPendiente
    }));

    // 2) reajustar pagos para que no superen el saldo disponible
    this.pagoRows = this.pagoRows.map(r => {
      const maxFila = this.getMaxPermitidoPago(r);
      const pago = Math.min(this.asNumber(r.pago), maxFila);
      return { ...r, pago };
    });

    this.recalcular();
    this.cdr.detectChanges();
  }

  private getMaxPermitidoPago(except?: Pago): number {
    // si el back te dio saldo, úsalo; si no, usa el tope actual (devolución o total factura)
    const topeBase = (this.saldoFacturaPendiente > 0)
      ? this.saldoFacturaPendiente
      : this.getTopePago();

    const sumaOtros = (this.pagoRows || [])
      .filter(r => r !== except)
      .reduce((acc, r) => acc + this.asNumber(r.pago), 0);

    return Math.max(0, +(topeBase - sumaOtros).toFixed(2));
  }

  cajaAsignada = false;
  cargarAutorizacion(): void {
    const id = this.usuarioActual?.id_autorizacion_caja;
    this.cajaAsignada = false;

    if (id == null) {
      this.encabezado = {
        ...this.encabezado,
        sucursal: '',
        caja: ''
      };
      return;
    }

    this.autorizacionCajaService.getAutorizacionCaja(Number(id)).subscribe({
      next: ({ data }) => {
        if (!data) {
          this.cajaAsignada = false;
          this.encabezado = { ...this.encabezado, sucursal: '', caja: '' };
          return;
        }

        const suc = String(data.num_establecimiento ?? '').padStart(3, '0');
        const caj = String(data.caja ?? '').padStart(3, '0');

        this.encabezado = {
          ...this.encabezado,
          sucursal: suc,
          caja: caj,
        };

        this.cajaAsignada = !!(suc && caj);
      },
      error: (err) => {
        console.error('Error cargando autorización de caja', err);
        this.cajaAsignada = false;
        this.encabezado = { ...this.encabezado, sucursal: '', caja: '' };
      },
    });
  }

  private cargarProductosParaNC(): void {
    this.isLoadingProductos = true;

    this.facturacionService.getProductosCodproFijos().pipe(
      finalize(() => {
        this.isLoadingProductos = false;
        this.productosLoaded = true;
      })
    ).subscribe({
      next: data => {
        this.productos = data ?? [];
      },
      error: () => {
        this.mostrarAlerta('Error al cargar productos', 'error');
      }
    });
  }

  onProductoSelectedNC(codpro: string): void {
    const p = this.productos.find(x => (x.codpro ?? '').toString() === codpro);
    if (!p) return;

    const yaExiste = this.detalleRows.some(r => r.codigo === p.codpro);
    if (yaExiste) {
      this.mostrarAlerta(`El producto ${p.codpro} ya fue agregado.`, 'info');
      return;
    }

    const ivaPorc = 15;
    const precio = Number(p.prevensiniva || p.pvp || 0);

    const nuevaFila: Detalle = {
      codigo: p.codpro,
      descripcion: (p.despro ?? '').toUpperCase(),
      cantidad: 1,
      pvp: precio,
      iva: (precio * ivaPorc) / 100,
      ivaPct: ivaPorc,
      cantidadd: 0,
      valorDev: 0,
      ivaDev: 0,
      porMonto: false
    };

    if (this.detalleRows.length === 1 &&
      !this.detalleRows[0].codigo &&
      !this.detalleRows[0].descripcion) {
      this.detalleRows = [nuevaFila];
    } else {
      this.detalleRows = [...this.detalleRows, nuevaFila];
    }

    this.recalcular();
  }

  filtrarProductos(event: any): void {
    const texto = (event.target.value || '').toLowerCase();
    this.productosFiltrados = this.productos.filter(p =>
      (p.codpro ?? '').toLowerCase().includes(texto) ||
      (p.despro ?? '').toLowerCase().includes(texto)
    );
  }
}
