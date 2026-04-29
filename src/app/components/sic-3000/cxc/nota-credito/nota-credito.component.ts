import { Component, OnInit } from '@angular/core';
import { NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ParametrosSicService, ParametrosSic } from 'src/app/services/parametros-sic.service';
import { PlanCueService, PlanCuenta } from 'src/app/services/plan-cue.service';
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
import {
  AsientoVentaService,
  AsientoVentaRequest,
  DetalleAsientoVentaRequest
} from 'src/app/services/asiento-venta.service';
type Detalle = {
  codigo?: string;
  idcuenta?: number;
  cuenta?: string;
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
  idPlanCuentas?: number;
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
  idPersona: number = 0;
  idCodContableCliente: number = 0;
  esFacturaDeSaldo = false;
  ivaPctSaldo: number = 15; // IVA por defecto para facturas de saldo
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
  parametros: ParametrosSic | null = null;
  planCuenta: PlanCuenta | null = null;
  parametros1: ParametrosSic | null = null;
  planCuenta1: PlanCuenta | null = null;
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
    private asientoVentaService: AsientoVentaService,
    private parametrosSicService: ParametrosSicService,
    private planCueService: PlanCueService,
    private parametrosSicService1: ParametrosSicService,
    private planCueService1: PlanCueService

  ) { }

  ngOnInit(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    this.parametrosSicService
      .getByEmpresa(this.usuarioActual?.id_empresa ?? 0) // devuelve ParametrosSic
      .pipe(
        switchMap(parametros => {
          // aquí 'parametros' YA es el data
          this.parametros = parametros;
          console.log('Parámetros SIC:', this.parametros);

          const idEmpresa = this.usuarioActual?.id_empresa ?? 0;
          const cuenta = parametros.codcueretiva;   // usamos el parámetro local, NO this.parametros

          return this.planCueService.getByCuentaPresentacion(idEmpresa, cuenta); // devuelve PlanCuenta
        })
      )
      .subscribe({
        next: planCuenta => {
          // aquí 'planCuenta' YA es el data
          this.planCuenta = planCuenta;
          console.log('Plan de Cuenta:', this.planCuenta);
        },
        error: err => {
          console.error('Error en la cadena parámetros + plan', err);
        }
      });

    this.parametrosSicService1
      .getByEmpresa(this.usuarioActual?.id_empresa ?? 0)
      .pipe(
        switchMap(parametros => {
          this.parametros1 = parametros;
          console.log('Parámetros SIC:', this.parametros);

          const idEmpresa = this.usuarioActual?.id_empresa ?? 0;
          const cuenta = parametros.codcuedesc;
          return this.planCueService1.getByCuentaPresentacion(idEmpresa, cuenta);
        })
      )
      .subscribe({
        next: planCuenta => {
          this.planCuenta1 = planCuenta;
          console.log('Plan de Cuenta:', this.planCuenta);
        },
        error: err => {
          console.error('Error en la cadena parámetros + plan', err);
        }
      });




    this.cargarAutorizacion();
    this.cargarProductosParaNC();
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
  codCon: number = 0;
  // 👉 NUEVAS PROPIEDADES

  //idCodigoContable = 0;


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
    { headerName: 'Idcuenta', field: 'idcuenta', hide: true, width: 120 },
    { headerName: 'Cuenta', field: 'cuenta', hide: true, width: 120 },
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
      editable: true,
      width: 110,
      type: 'rightAligned',
      valueParser: this.numberParser,
      valueFormatter: this.currencyUSD,
      valueSetter: (p) => {
        const row = p.data as Detalle;
        let nuevoPvp = this.asNumber(p.newValue);

        if (nuevoPvp < 0) nuevoPvp = 0;

        const cantidad = this.asNumber(row.cantidad) || 1;
        const ivaPct = this.asNumber(row.ivaPct) || (this.esFacturaDeSaldo ? this.ivaPctSaldo : 15);

        // El PVP es la BASE (sin IVA)
        // Calcular el total CON IVA
        const nuevoTotal = nuevoPvp * cantidad;
        const nuevoIva = +(nuevoTotal * (ivaPct / 100)).toFixed(2);
        const nuevoTotalConIva = nuevoTotal + nuevoIva;

        // VALIDAR: el total CON IVA no puede superar el total de la factura
        const totalFactura = this.totales.totalFacturaConIva || 0;
        if (nuevoTotalConIva > totalFactura) {
          // Recalcular el PVP máximo permitido
          const maxBase = totalFactura / (1 + (ivaPct / 100));
          nuevoPvp = +(maxBase / cantidad).toFixed(6);
          this.mostrarAlerta(
            `El P.V.P. ajustado para no superar el total de la factura ($${totalFactura.toFixed(2)})`,
            'info'
          );
        }

        // Asignar el nuevo PVP (BASE sin IVA)
        row.pvp = +nuevoPvp.toFixed(6);

        // Calcular IVA sobre la BASE
        const baseTotal = row.pvp * cantidad;
        row.iva = +(baseTotal * (ivaPct / 100)).toFixed(2);

        // Refrescar celdas afectadas
        if (p.api) {
          if (p.node) {
            p.api.refreshCells({
              rowNodes: [p.node],
              columns: ['pvp', 'total', 'iva', 'ivaDev']
            });
          } else {
            p.api.refreshCells({
              force: true,
              columns: ['pvp', 'total', 'iva', 'ivaDev']
            });
          }
        }

        this.recalcular();
        return true;
      }
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
      field: 'ivaPct',
      width: 100,
      type: 'rightAligned',
      editable: (p) => this.esFacturaDeSaldo, // SOLO para facturas de saldo (no dañas las normales)
      valueParser: this.numberParser,
      valueFormatter: (p: any) => this.numberDot2d(p),
      valueSetter: (p) => {
        const row = p.data as Detalle;

        // 1) Tomar el nuevo % (ej 12, 15)
        let pct = this.asNumber(p.newValue);
        if (pct < 0) pct = 0;
        if (pct > 100) pct = 100;

        row.ivaPct = +pct.toFixed(2);

        // 2) Recalcular IVA $ de la línea ORIGINAL (según cantidad y pvp)
        const totalLinea = this.asNumber(row.cantidad) * this.asNumber(row.pvp);
        row.iva = +((totalLinea * row.ivaPct) / 100).toFixed(2);

        // 3) Si está en modo porMonto (devolución por valor), recalcular ivaDev
        if (row.porMonto) {
          const baseDev = this.asNumber(row.valorDev);
          row.ivaDev = +((baseDev * row.ivaPct) / 100).toFixed(2);
        } else {
          // Si es por cantidad, también podemos ajustar ivaDev proporcionalmente
          const cantDev = this.asNumber(row.cantidadd);
          const cantidad = Math.max(1, this.asNumber(row.cantidad));
          const ivaUnit = this.asNumber(row.iva) / cantidad;
          row.ivaDev = +(cantDev * ivaUnit).toFixed(2);
        }

        // refrescar celdas afectadas
        if (p.api) {
          if (p.node) {
            p.api.refreshCells({
              rowNodes: [p.node],
              columns: ['iva', 'ivaPct', 'ivaDev']
            });
          } else {
            p.api.refreshCells({ force: true, columns: ['iva', 'ivaPct', 'ivaDev'] });
          }
        }

        this.recalcular();
        return true;
      }
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
    this.fcMetodoPago.setValue('', { emitEvent: true });
    this.cargarForma();
    this.cdr.detectChanges();
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

    if (!this.idCodContableCliente) {
      this.mostrarAlerta('No Existe Código contable', 'info');
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

    console.log('%c[NC] ===== PAYLOAD CREAR NOTA CRÉDITO =====', 'color:#1976d2; font-weight:bold;');
    console.log('[NC] payload OBJ →', payload);
    console.log('[NC] payload JSON →', JSON.stringify(payload, null, 2));

    this.svc.crearNotaCredito(payload).pipe(
      switchMap(resp => {
        console.log('%c[NC] ===== RESPUESTA crearNotaCredito =====', 'color:#388e3c; font-weight:bold;');
        console.log('[NC] resp OBJ →', resp);
        console.log('[NC] resp JSON →', JSON.stringify(resp, null, 2));

        const tipo = (resp?.type || '').toLowerCase();
        const dataNc: any = resp?.data || {};
        const idNc = Number(dataNc.idNotaCredito ?? dataNc.idnota ?? 0);

        if (tipo !== 'success' || !Number.isFinite(idNc) || idNc <= 0) {
          this.mostrarAlerta(resp?.message || 'No se pudo crear la nota de crédito.', 'error');
          return of(null);
        }

        this.mostrarAlerta(resp?.message || 'Nota de crédito creada correctamente.', 'ok');

        const numeroNotaCredito: string =
          dataNc.numeroNotaCredito ??
          dataNc.numeroNota ??
          this.encabezado.numero ??
          '';

        const numeroFactura: string =
          dataNc.numeroFactura ??
          this.encabezado.factura ??
          '';

        this.idNota = idNc;
        this.guardado = true;
        this.encabezado.numero = numeroNotaCredito;

        const totalBaseDevCalc = +(this.totales.totalDev || 0).toFixed(2);
        const totalIvaDevCalc = +(this.totales.totalIvaDev || 0).toFixed(2);
        const totalNc = +(totalBaseDevCalc + totalIvaDevCalc).toFixed(2);

        if (totalNc <= 0) {
          this.mostrarAlerta(
            'Nota de crédito creada, pero el total es 0. No se generó asiento contable.',
            'info'
          );
          return of(idNc);
        }

        const hoy = new Date();
        const fechaIso = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
          .toISOString()
          .substring(0, 19);

        const hora = fechaIso.substring(11);
        const anioStr = hoy.getFullYear().toString();

        const idZona = 1;
        const idUsuario = this.usuarioActual?.id_usuario ?? 1;
        const idEmpresa = this.usuarioActual?.id_empresa ?? 1;
        const idTipoAsiento = 3;
        const tipdoc = 'VT';
        const numdoc = 0;

        const beneficiario =
          (this.encabezado.cliente || '').toString().trim().toUpperCase() ||
          `CLIENTE ID: ${this.encabezado.idCliente || this.clientesCodigo}`;

        const CTA_CLIENTES = 110101;
        const CTA_VENTAS = 410101;
        const CTA_IVA = 210602;

        const idCodContableLinea = Number(this.idCodContableCliente || 0);

        console.log('[NC] idCodContable que se usará en asiento NC:', idCodContableLinea);

        const detalles: any[] = [];
        let numlinea = 1;

        let totalBaseDev = 0;
        let totalIvaDev = 0;

        // 1) DEBE → producto devuelto
        for (const row of this.detalleRows) {
          const baseDev = this.asNumber(row.valorDev);
          if (baseDev <= 0) continue;

          const formaPagoSeleccionada = this.pagoRows.find(p => this.asNumber(p.pago) > 0);

          const idPlan = this.asNumber(formaPagoSeleccionada?.idPlanCuentas) || this.planCuenta1?.id_plan || CTA_VENTAS;
          const codprePc = (formaPagoSeleccionada?.cuenta ?? '').toString().trim() || this.parametros1?.codcuedesc || '410101-014';

          totalBaseDev += baseDev;

          let ivaDevLinea = 0;

          if (row.porMonto) {
            ivaDevLinea = this.asNumber(row.ivaDev);
          } else {
            const cantDev = this.asNumber(row.cantidadd);
            const cantidad = this.asNumber(row.cantidad);
            const ivaLinea = this.asNumber(row.iva);

            if (cantidad > 0) {
              ivaDevLinea = cantDev * (ivaLinea / cantidad);
            }
          }

          totalIvaDev += ivaDevLinea;

          detalles.push({
            IdDetMaestro: 0,
            IdCabMaestro: 0,
            numlinea: numlinea++,
            anio: anioStr,
            fechatransaccion: fechaIso,
            fechaingreso: fechaIso,
            hora,
            idZona,
            idCentroCostos: null,
            idLocal: 1,
            idPlanCuentas: idPlan,
            codprePc,
            idCodContable: idCodContableLinea,
            nocomprobante: numeroNotaCredito,
            docurelacionado: numeroFactura,
            cheque: 0,
            beneficiario,
            debe: +baseDev.toFixed(2),
            haber: 0,
            comentario: `REVERSO VENTA FACTURA ${numeroFactura} / NC ${numeroNotaCredito} - ${(row.descripcion || '').toString().toUpperCase()}`,
            idMovBancario: 1,
            movbancario: '0',
            cierre: '',
            fechacierre: null,
            conciliado: '',
            fechaconciliado: null,
            idSustentoTrib: null,
            idTipoCompSri: null,
            autorizacion: '',
            fechacaduca: null,
            idTipoRetencion: null,
            idProyecto: null,
            idSubproyecto: null,
            transferido: false,
            fechatransferido: null,
            fechavencimiento: null,
            idConciliacion: 0,
            valorLetras: '',
            estadoIngreso: true,
            autorizacionRelacionado: '',
            fechaCadRelacionado: null
          });
        }

        totalBaseDev = +totalBaseDev.toFixed(2);
        totalIvaDev = +totalIvaDev.toFixed(2);

        // 2) DEBE → IVA devuelto
        if (totalIvaDev > 0) {
          detalles.push({
            IdDetMaestro: 0,
            IdCabMaestro: 0,
            numlinea: numlinea++,
            anio: anioStr,
            fechatransaccion: fechaIso,
            fechaingreso: fechaIso,
            hora,
            idZona,
            idCentroCostos: null,
            idLocal: 1,
            idPlanCuentas: this.planCuenta?.id_plan ?? CTA_IVA,
            codprePc: this.parametros?.codcueretiva ?? `${CTA_IVA}-001`,
            idCodContable: idCodContableLinea,
            nocomprobante: numeroNotaCredito,
            docurelacionado: numeroFactura,
            cheque: 0,
            beneficiario,
            debe: totalIvaDev,
            haber: 0,
            comentario: `REVERSO IVA FACTURA ${numeroFactura} / NC ${numeroNotaCredito}`,
            idMovBancario: 1,
            movbancario: '0',
            cierre: '',
            fechacierre: null,
            conciliado: '',
            fechaconciliado: null,
            idSustentoTrib: null,
            idTipoCompSri: null,
            autorizacion: '',
            fechacaduca: null,
            idTipoRetencion: null,
            idProyecto: null,
            idSubproyecto: null,
            transferido: false,
            fechatransferido: null,
            fechavencimiento: null,
            idConciliacion: 0,
            valorLetras: '',
            estadoIngreso: true,
            autorizacionRelacionado: '',
            fechaCadRelacionado: null
          });
        }

        // 3) HABER → forma de pago / cliente
        const pagosConValor = (this.pagoRows || []).filter(p => this.asNumber(p.pago) > 0);
        let totalHaber = 0;

        if (pagosConValor.length > 0) {
          for (const pRow of pagosConValor) {
            const valorPago = +this.asNumber(pRow.pago).toFixed(2);
            if (valorPago <= 0) continue;

            const cuentaTxt = (pRow.cuenta ?? '').toString().trim();

            const idPlan =
              this.asNumber(pRow.idPlanCuentas) ||
              this.planCuenta1?.id_plan ||
              CTA_CLIENTES;

            const codprePc =
              cuentaTxt ||
              this.parametros1?.codcuedesc ||
              `${CTA_CLIENTES}-001`;

            totalHaber += valorPago;

            detalles.push({
              IdDetMaestro: 0,
              IdCabMaestro: 0,
              numlinea: numlinea++,
              anio: anioStr,
              fechatransaccion: fechaIso,
              fechaingreso: fechaIso,
              hora,
              idZona,
              idCentroCostos: null,
              idLocal: 1,
              idPlanCuentas: idPlan,
              codprePc,
              idCodContable: idCodContableLinea,
              nocomprobante: numeroNotaCredito,
              docurelacionado: numeroFactura,
              cheque: 0,
              beneficiario,
              debe: 0,
              haber: valorPago,
              comentario: `REVERSO COBRO FACTURA ${numeroFactura} / NC ${numeroNotaCredito}`,
              idMovBancario: 1,
              movbancario: '0',
              cierre: '',
              fechacierre: null,
              conciliado: '',
              fechaconciliado: null,
              idSustentoTrib: null,
              idTipoCompSri: null,
              autorizacion: '',
              fechacaduca: null,
              idTipoRetencion: null,
              idProyecto: null,
              idSubproyecto: null,
              transferido: false,
              fechatransferido: null,
              fechavencimiento: null,
              idConciliacion: 0,
              valorLetras: '',
              estadoIngreso: true,
              autorizacionRelacionado: '',
              fechaCadRelacionado: null
            });
          }
        } else {
          totalHaber = +(totalBaseDev + totalIvaDev).toFixed(2);

          detalles.push({
            IdDetMaestro: 0,
            IdCabMaestro: 0,
            numlinea: numlinea++,
            anio: anioStr,
            fechatransaccion: fechaIso,
            fechaingreso: fechaIso,
            hora,
            idZona,
            idCentroCostos: null,
            idLocal: 1,
            idPlanCuentas: CTA_CLIENTES,
            codprePc: `${CTA_CLIENTES}-001`,
            idCodContable: idCodContableLinea,
            nocomprobante: numeroNotaCredito,
            docurelacionado: numeroFactura,
            cheque: 0,
            beneficiario,
            debe: 0,
            haber: totalHaber,
            comentario: `REVERSO FACTURA ${numeroFactura} / NC ${numeroNotaCredito}`,
            idMovBancario: 1,
            movbancario: '0',
            cierre: '',
            fechacierre: null,
            conciliado: '',
            fechaconciliado: null,
            idSustentoTrib: null,
            idTipoCompSri: null,
            autorizacion: '',
            fechacaduca: null,
            idTipoRetencion: null,
            idProyecto: null,
            idSubproyecto: null,
            transferido: false,
            fechatransferido: null,
            fechavencimiento: null,
            idConciliacion: 0,
            valorLetras: '',
            estadoIngreso: true,
            autorizacionRelacionado: '',
            fechaCadRelacionado: null
          });
        }

        totalHaber = +totalHaber.toFixed(2);
        const totalDebe = +(detalles.reduce((s, d) => s + (Number(d.debe) || 0), 0)).toFixed(2);

        const asientoNc: any = {
          IdCabMaestro: 0,
          idZona,
          idUsuario,
          idEmpresa,
          idTipoAsiento,
          tipdoc,
          numdoc,
          anio: anioStr,
          fechatransaccion: fechaIso,
          fechaingreso: fechaIso,
          observacion: `ASIENTO NOTA DE CRÉDITO ${numeroNotaCredito} (reverso factura ${numeroFactura})`,
          totdebe: totalDebe,
          tothaber: totalHaber,
          beneficiario,
          cierre: '',
          fechacierre: null,
          solicitado: '',
          depto: '',
          autorizado: '',
          homCodigo: 0,
          estado: true,
          modulo: 2,
          detalles
        };

        console.log('%c[NC] ===== ASIENTO NC A ENVIAR =====', 'color:#ff9800; font-weight:bold;');
        console.log('[NC] Asiento NC OBJ →', asientoNc);
        console.log('[NC] Asiento NC JSON →', JSON.stringify(asientoNc, null, 2));

        return this.asientoVentaService.crearAsientoVenta(asientoNc).pipe(
          tap(respAsiento => {
            console.log('%c[NC] ===== RESPUESTA API CREAR ASIENTO NC =====', 'color:#d32f2f; font-weight:bold;');
            console.log('[NC] Resp Asiento OBJ →', respAsiento);
            console.log('[NC] Resp Asiento JSON →', JSON.stringify(respAsiento, null, 2));

            const tipoResp = (respAsiento?.type || '').toString().toUpperCase();

            if (tipoResp !== 'SUCCESS' && tipoResp !== 'CREATED') {
              const msgSrv = respAsiento?.message || 'Error al crear el asiento contable.';
              console.error('[NC] Error crear asiento:', msgSrv);
              this.mostrarAlerta(msgSrv, 'error');
              throw new Error(msgSrv);
            }

            const msgAsiento: string = respAsiento?.message ?? '';

            this.mostrarAlerta(
              msgAsiento || 'Asiento contable de la nota de crédito generado.',
              'ok'
            );

            this.asientoVentaInfo = respAsiento?.data ?? null;
          }),
          catchError(err => {
            console.error('[NC] Error creando asiento de nota de crédito (catchError):', err);
            this.mostrarAlerta(
              'Nota de crédito creada, pero ocurrió un error al generar el asiento contable.',
              'error'
            );
            return of(null);
          }),
          map(() => idNc)
        );
      }),

      switchMap((idNc: number | null) => {
        if (!idNc || idNc <= 0) return of(void 0);

        return this.svc.generarXmlNotaCredito(idNc).pipe(
          switchMap((r: any) => {
            console.log('%c[NC] ===== RESPUESTA generarXmlNotaCredito =====', 'color:#6a1b9a; font-weight:bold;');
            console.log('[NC] resp XML OBJ →', r);
            console.log('[NC] resp XML JSON →', JSON.stringify(r, null, 2));

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
          catchError(err => {
            console.error('[NC] Error generando XML/PDF:', err);
            this.mostrarAlerta('Error generando el XML/PDF de la Nota de Crédito.', 'error');
            return of(void 0);
          })
        );
      }),

      catchError(err => {
        console.error('[crearNotaCredito] error general:', err);
        this.mostrarAlerta('Error al crear la nota de crédito.', 'error');
        return of(void 0);
      }),

      finalize(() => {
        this.guardando = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.mostrarAlerta('PDF de la Nota de Crédito descargado.', 'ok');
      }
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

    const msgNoEncontrada = 'Factura no encontrada';

    // 1) Validar con el nuevo endpoint
    this.svc.validarFacturaParaNC(entrada).subscribe({
      next: (validacion) => {
        if (!validacion.success || !validacion.data) {
          // Si el backend no manda mensaje, forzamos el estándar
          this.errorFactura = (validacion?.message?.trim() ? validacion.message : msgNoEncontrada);
          this.buscandoFactura = false;

          // opcional: alerta visual además del error en pantalla
          this.mostrarAlerta(this.errorFactura, 'warning');
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

            // Aquí es donde típicamente “no encuentra”
            if (resp.type !== 'Success' || !resp.data?.items?.length) {
              this.errorFactura = msgNoEncontrada;
              this.mostrarAlerta(this.errorFactura, 'warning');
              return;
            }

            const sufijo = this.extraerSufijo(entrada);
            const candidatos = resp.data.items.filter(i => i.numeroFactura?.endsWith(sufijo));
            const lista = (candidatos.length ? candidatos : resp.data.items)
              .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

            const best = lista[0];

            // Seguridad adicional: si por alguna razón no hay best
            if (!best) {
              this.errorFactura = msgNoEncontrada;
              this.mostrarAlerta(this.errorFactura, 'warning');
              return;
            }

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
                error: (e) => console.warn('Error consultando saldo de factura:', e?.message || e)
              });
            }

            if (this.idNota && this.idNota > 0) this.cargarFacturaPorId(this.idNota);
            else {
              this.errorFactura = msgNoEncontrada;
              this.mostrarAlerta(this.errorFactura, 'warning');
            }
          },
          error: (e) => {
            this.buscandoFactura = false;
            this.errorFactura = msgNoEncontrada;
            this.mostrarAlerta(this.errorFactura, 'warning');
          }
        });
      },
      error: (e) => {
        this.buscandoFactura = false;
        this.errorFactura = msgNoEncontrada;
        this.mostrarAlerta(this.errorFactura, 'warning');
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
          console.log('[NC] Cliente completo:', cliente);

          this.encabezado.ruc = cliente.ruc || '';
          this.encabezado.direccion = cliente.dircli || '';

          // 🔹 Aquí pedimos el id_cod_contable
          this.cargarIdCodContablePorCliente(cliente);
        }
      },
      error: (e) => {
        console.warn('No se pudieron cargar datos del cliente:', e);
        this.encabezado.ruc = '';
        this.encabezado.direccion = '';
        this.idCodContableCliente = 0;
      }
    });
  }


  private cargarFacturaPorId(idNota: number): void {
    this.svc.getFacturaPorIdNota(idNota).subscribe({
      next: (resp) => {
        if (resp.type === 'Success' && resp.data) {
          const { factura, detalles } = resp.data;

          console.log('[NC] Factura desde backend:', factura);
          console.log('[NC] Detalles factura desde backend:', detalles);

          // === Encabezado ===
          this.encabezado.cliente = factura.cliente?.nombre ?? this.encabezado.cliente;
          this.encabezado.ruc = factura.cliente?.ruc ?? this.encabezado.ruc;
          this.encabezado.direccion = factura.cliente?.direccion ?? this.encabezado.direccion;
          this.encabezado.fecha = this.toISO(new Date(factura.fecha));

          // === Cargar idPersona / id_cod_contable del cliente ===
          this.cargarIdCodContablePorCliente(factura.cliente);

          // === Detalle (productos) ===
          this.detalleRows = (detalles || []).map((d: any) => {
            const baseOrig = (d.cantidad ?? 0) * (d.precio ?? 0);
            const ivaVal = d.iva ?? 0;
            const ivaPct = baseOrig > 0 ? +((ivaVal / baseOrig) * 100).toFixed(2) : 0;

            // 1) intentar tomar cuenta directamente del detalle
            const idCuentaDetalle = Number(
              d.idcuenta ??
              d.idCuenta ??
              d.id_cuenta ??
              d.cueCodigo ??
              d.cue_codigo ??
              0
            );

            const cuentaDetalle = String(
              d.cuenta ??
              d.cuentaContable ??
              d.cuentacontable ??
              d.codigoCuenta ??
              d.codigo_cuenta ??
              ''
            );

            // 2) intentar complementar desde la lista de productos
            const desdeProducto = this.getCuentaPorProducto(d.codigoProducto);
            const idCuentaProd = desdeProducto.idcuenta ?? 0;
            const cuentaProd = desdeProducto.cuenta ?? '';

            const idcuentaFinal =
              idCuentaDetalle && idCuentaDetalle > 0
                ? idCuentaDetalle
                : (idCuentaProd > 0 ? idCuentaProd : undefined);

            const cuentaFinal =
              cuentaDetalle && cuentaDetalle.trim() !== ''
                ? cuentaDetalle
                : (cuentaProd && cuentaProd.trim() !== '' ? cuentaProd : undefined);

            const row: Detalle = {
              codigo: d.codigoProducto,
              idcuenta: idcuentaFinal,
              cuenta: cuentaFinal,
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
            };

            return row;
          });

          // Por si los productos se cargan después, rellena cuentas faltantes
          this.rellenarCuentasEnDetalleDesdeProductos();

          // Recalcular totales con el detalle ya cargado
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

  private upsertPago(codigo: string, descripcion: string, cuenta: string, idPlanCuentas?: number) {
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
        i === idx ? { ...r, descripcion, cuenta, idPlanCuentas, debe: debeVisual, haber: haberBack, saldo: saldoBack, pago: nuevoPago }
          : r
      );
    } else {
      this.pagoRows = [
        ...this.pagoRows,
        { codigo: codigoStr, descripcion, cuenta, idPlanCuentas, debe: debeVisual, haber: haberBack, saldo: saldoBack, pago: pagoSugerido }
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
      const idEmpresa = this.usuarioActual?.id_empresa ?? 1;

      this.planCueService.getByCuentaPresentacion(idEmpresa, cuenta).subscribe({
        next: plan => {
          this.upsertPago(idStr, desc, cuenta, plan?.id_plan);
          this.fcMetodoPago.setValue('', { emitEvent: false });
          this.recalcular();
        },
        error: () => {
          this.mostrarAlerta(`No se encontró la cuenta contable ${cuenta}.`, 'error');
        }
      });

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
  // ======= Payload =======
  private buildPayload(): NotaCreditoCrearReq {
    // 🔹 Detalle de la Nota de Crédito
    const detalles = this.detalleRows
      // Solo líneas con devolución (por cantidad o por monto)
      .filter(d => {
        const cantDev = this.asNumber(d.cantidadd);
        const valorDev = this.asNumber(d.valorDev);
        //return cantDev > 0 || (d.porMonto && valorDev > 0);
        return cantDev > 0 || valorDev > 0;
      })
      .map(d => {
        const qtyOrig = this.asNumber(d.cantidad);
        const pvp = this.asNumber(d.pvp);
        const baseOrig = qtyOrig * pvp;
        const ivaLinea = this.asNumber(d.iva);

        // % IVA de la línea original
        const ivaPct = d.ivaPct ?? (
          baseOrig > 0
            ? +((ivaLinea / baseOrig) * 100).toFixed(2)
            : 0
        );

        // 🔹 Cuenta contable desde el producto; si no hay, default 110201
        const cueCodigo = this.asNumber(d.idcuenta) || 110201;

        // ===== Caso 1: por monto (usuario edita Valor Dev.) =====
        if (d.porMonto) {
          const montoBase = Math.max(0, this.asNumber(d.valorDev)); // base sin IVA
          let qtyDev = this.asNumber(d.cantidadd);
          if (!(qtyDev > 0)) {
            // si no pusieron cantidad, asumimos 1 y prorrateamos
            qtyDev = 1;
          }

          const precioUnit = qtyDev > 0
            ? +(montoBase / qtyDev).toFixed(6)
            : 0;

          return {
            codpro: String(d.codigo ?? ''),
            cantidad: +qtyDev.toFixed(6),   // cantidad devuelta
            precio: precioUnit,            // base unitaria
            costo: precioUnit,
            iva: ivaPct,                   // porcentaje
            descuento: 0,
            tipoIva: ivaPct > 0 ? '1' : '0',
            cueCodigo,                     // 🔹 cuenta contable del producto
            descripcion: String(d.descripcion ?? '')
          };
        }

        // ===== Caso 2: devolución por cantidad =====
        const qtyDev = +this.asNumber(d.cantidadd).toFixed(6);

        return {
          codpro: String(d.codigo ?? ''),
          cantidad: qtyDev,               // cantidad devuelta
          precio: pvp,                    // mismo precio de la factura
          costo: pvp,
          iva: ivaPct,                    // porcentaje
          descuento: 0,
          tipoIva: ivaPct > 0 ? '1' : '0',
          cueCodigo,                      // 🔹 cuenta contable del producto
          descripcion: String(d.descripcion ?? '')
        };
      });

    // 🔹 Formas de pago (cómo se devuelve el dinero)
    const formasPago = this.pagoRows.map((p, i) => ({
      id: String(p.codigo ?? ''),
      clientesCodigo: this.clientesCodigo,
      numnota: null,
      numdoc: (this.encabezado.factura ?? '').replace(/\D/g, ''), // solo dígitos
      forpag: String(p.codigo ?? ''),
      valor: Number(p.pago ?? 0),
      cuentaContable: String(p.cuenta ?? ''), // cuenta de la forma de pago
      estado: 'A',
      fila: i + 1,
      fecha: new Date().toISOString(),
      idNotaCredito: 0
    }));

    // 🔹 Payload completo que espera el backend
    return {
      clienteCodigo: this.clientesCodigo,
      caja: this.encabezado.caja || '001',
      idAutorizacionCaja: this.idAutorizacionCajaNc ?? 0,
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
  idAutorizacionCajaNc: number | null = null;
  cargarAutorizacion(): void {

    const id =
      this.usuarioActual?.cajas?.find(c => c.id_tipo_documento === 2)?.id_autorizacion_caja
      ?? null;
    console.log('usuarioActual.cajas:', this.usuarioActual?.cajas);
    this.idAutorizacionCajaNc = (id != null ? Number(id) : null);
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



  onProductoSelectedNC(codpro: string): void {
    const p = this.productos.find(x => (x.codpro ?? '').toString() === codpro);
    if (!p) return;

    const yaExiste = this.detalleRows.some(r => r.codigo === p.codpro);
    if (yaExiste) {
      this.mostrarAlerta(`El producto ${p.codpro} ya fue agregado.`, 'info');
      return;
    }

    const ivaPorc = this.esFacturaDeSaldo ? this.ivaPctSaldo : 15;
    const precio = Number(p.prevensiniva || p.pvp || 0);

    // 🔹 obtener cuenta desde la lista de productos
    const { idcuenta, cuenta } = this.getCuentaPorProducto(p.codpro);

    const nuevaFila: Detalle = {
      codigo: p.codpro,
      idcuenta,
      cuenta,
      descripcion: (p.despro ?? '').toUpperCase(),
      cantidad: 1,
      pvp: precio,
      iva: +((precio * ivaPorc) / 100).toFixed(2),
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
  private cargarProductosParaNC(): void {
    // Quita cualquier return prematuro por ahora para depurar
    // if (this.productosLoaded) return;

    console.log('[NC] cargarProductosParaNC() – iniciando llamada a getProductosCodproFijos');

    this.isLoadingProductos = true;

    this.facturacionService.getProductosCodproFijos().pipe(
      finalize(() => {
        this.isLoadingProductos = false;
      })
    ).subscribe({
      next: data => {
        console.log('[NC] getProductosCodproFijos – data cruda:', data);

        this.productos = data ?? [];
        this.rellenarCuentasEnDetalleDesdeProductos();
        this.productosLoaded = true;

        console.log('[NC] productos cargados:', this.productos.length);

        // Una vez cargados los productos, intento rellenar cuentas en el detalle
        this.rellenarCuentasEnDetalleDesdeProductos();
      },
      error: (err) => {
        console.error('[NC] Error al cargar productos para NC:', err);
        this.mostrarAlerta('Error al cargar productos', 'error');
        this.productos = [];
        this.productosLoaded = false;
      }
    });
  }



  private getCuentaPorProducto(
    codpro: string | number | null | undefined
  ): { idcuenta?: number; cuenta?: string } {

    if (!codpro) {
      console.log('[NC] getCuentaPorProducto – codpro vacío:', codpro);
      return {};
    }

    if (!this.productos || this.productos.length === 0) {
      console.log('[NC] getCuentaPorProducto – productos aún no cargados. codpro=', codpro);
      return {};
    }

    const codStr = String(codpro);
    console.log('[NC] getCuentaPorProducto – buscando producto para codpro:', codStr);

    // 1) Buscar producto por código
    let producto = this.productos.find(x =>
      String((x as any).codpro ?? (x as any).CODPRO ?? '') === codStr
    );

    if (!producto) {
      console.log('[NC] Producto NO encontrado para codpro:', codStr);
      return {};
    }

    console.log('[NC] Producto encontrado para', codStr, producto);

    // ============================================
    // 2) OBTENER idcuenta EQUIVALENTE
    //    En tu screenshot viene como id_plan
    // ============================================
    let idcuenta = Number(
      (producto as any).id_plan ??            // ← principal
      (producto as any).idPlan ??            // variantes posibles
      (producto as any).idcuenta ??
      (producto as any).idCuenta ??
      (producto as any).id_cuenta ??
      (producto as any).cueCodigo ??
      (producto as any).cue_codigo ??
      0
    );

    // ============================================
    // 3) OBTENER código de cuenta
    //    En tu screenshot viene como codcuedeb
    // ============================================
    let cuenta = String(
      (producto as any).codcueDeb ??         // camelCase posible
      (producto as any).codcuedeb ??        // minúsculas (como en la imagen)
      (producto as any).cod_cue_deb ??      // otras variantes típicas
      (producto as any).cuenta ??
      (producto as any).cuentaContable ??
      (producto as any).codigoCuenta ??
      (producto as any).codigo_cuenta ??
      ''
    );

    // 4) Logs para verificar
    console.log('[NC] idcuenta resuelta:', idcuenta, ' cuenta resuelta:', cuenta);

    if (!idcuenta || idcuenta <= 0) {
      console.log('[NC] No se encontró idcuenta válido para codpro', codStr);
      return {};
    }

    // Si cuenta viene vacío, al menos devolvemos el id en texto
    if (!cuenta || cuenta.trim() === '') {
      cuenta = String(idcuenta);
    }

    return {
      idcuenta,
      cuenta
    };
  }



  private rellenarCuentasEnDetalleDesdeProductos(): void {
    if (!this.productos || this.productos.length === 0) {
      console.log('[NC] rellenarCuentas... – sin productos aún, no hago nada');
      return;
    }

    console.log('[NC] rellenarCuentas... – detalleRows:', this.detalleRows.length);

    this.detalleRows = (this.detalleRows || []).map(r => {
      if (!r.codigo) return r;

      const { idcuenta, cuenta } = this.getCuentaPorProducto(r.codigo);

      return {
        ...r,
        idcuenta: idcuenta && idcuenta > 0 ? idcuenta : r.idcuenta,
        cuenta: cuenta && cuenta.trim() !== '' ? cuenta : r.cuenta
      };
    });

    this.cdr.detectChanges();
  }
  /** Crea el asiento contable de la Nota de Crédito,
   *  invirtiendo la lógica de la factura:
   *  - DEBE: devolución de ingresos (cuentas de venta) + IVA devuelto
   *  - HABER: formas de pago (banco/caja/clientes) por el valor devuelto
   */
  private buildAsientoNotaCreditoRequest(idNotaCredito: number): AsientoVentaRequest {
    const hoy = new Date();

    const fechaIso = hoy.toISOString().substring(0, 19); // "YYYY-MM-DDTHH:mm:ss"
    const hora = hoy.toTimeString().substring(0, 8);     // "HH:mm:ss"
    const anioStr = hoy.getFullYear().toString();

    const idZona = 1; // ajusta si manejas zonas
    const idUsuario = Number(this.usuarioActual?.id_usuario ?? 1);
    const idEmpresa = Number(this.usuarioActual?.id_empresa ?? 1);

    // Puedes usar el mismo tipo de asiento que la venta o uno propio para NC.
    const idTipoAsiento = 3; // por ejemplo: 4 = Nota de Crédito (ajusta según tu catálogo)
    const tipdoc = 'VT';     // tipo de documento del asiento

    // 0 para que el backend genere el numdoc definitivo
    const numdoc = 0;

    const beneficiario =
      (this.encabezado.cliente || '').toString().trim()
      || `CLIENTE ID: ${this.encabezado.idCliente || this.clientesCodigo}`;

    // Cuentas por defecto (ajusta si tienes parámetros en BD)
    const CTA_CLIENTES = 110101;
    const CTA_VENTAS_DEFAULT = 410101;
    const CTA_IVA = 210602;

    // Si no quieres complicarte con idCodContable, usa 1 como en la factura
    const idCodContableLinea =
      this.idCodContableCliente && this.idCodContableCliente > 0
        ? this.idCodContableCliente
        : 1; // fallback



    // Número de comprobante de la NC: sucursal + caja + número
    const suc = (this.encabezado.sucursal || '').toString().padStart(3, '0');
    const caj = (this.encabezado.caja || '').toString().padStart(3, '0');
    const sec = (this.encabezado.numero || '').toString().padStart(9, '0');
    const nocomprobante = (suc + caj + sec) || idNotaCredito.toString();

    const detalles: DetalleAsientoVentaRequest[] = [];
    let numlinea = 1;

    // =========================
    // 1) DEBE → Reverso de ingresos (ventas) y IVA
    // =========================

    let totalBaseDev = 0;
    let totalIvaDev = 0;

    for (const row of this.detalleRows) {
      const baseDev = this.asNumber(row.valorDev);   // base devuelta (sin IVA)
      if (baseDev <= 0) continue;

      const cuentaTexto = (row.cuenta || '').toString().trim();
      const [ctaStr] = cuentaTexto.split('-');
      const idPlan = Number(ctaStr) || CTA_VENTAS_DEFAULT;
      const codprePc = cuentaTexto || `${idPlan}-001`;

      totalBaseDev += baseDev;

      // Línea DEBE a la cuenta de ingresos (reverso de la venta)
      detalles.push({
        IdDetMaestro: 0,
        IdCabMaestro: 0,
        numlinea: numlinea++,
        anio: anioStr,
        fechatransaccion: fechaIso,
        fechaingreso: fechaIso,
        hora,
        idZona,
        idCentroCostos: null,
        idLocal: 1,
        idPlanCuentas: idPlan,
        codprePc,
        idCodContable: idCodContableLinea,
        nocomprobante,
        docurelacionado: '',
        cheque: 0,
        beneficiario: '',
        debe: +baseDev.toFixed(2),   // 👉 antes estaba en HABER en la factura
        haber: 0,
        comentario: `REVERSO VENTA NC ${nocomprobante} - ${(row.descripcion || '').toString().toUpperCase()}`,
        idMovBancario: 1,
        movbancario: '0',
        cierre: '',
        fechacierre: null,
        conciliado: '',
        fechaconciliado: null,
        idSustentoTrib: null,
        idTipoCompSri: null,
        autorizacion: '',
        fechacaduca: null,
        idTipoRetencion: null,
        idProyecto: null,
        idSubproyecto: null,
        transferido: false,
        fechatransferido: null,
        fechavencimiento: null,
        idConciliacion: 0,
        valorLetras: '',
        estadoIngreso: true,
        autorizacionRelacionado: '',
        fechaCadRelacionado: null
      });

      // IVA devuelto por esta línea
      let ivaDev = 0;

      if (row.porMonto) {
        // modo "por monto" → usas ivaDev que ya calculaste en la grilla
        ivaDev = this.asNumber(row.ivaDev);
      } else {
        // modo "por cantidad" → proporcional
        const cantDev = this.asNumber(row.cantidadd);
        const cantidad = this.asNumber(row.cantidad);
        const ivaLinea = this.asNumber(row.iva);
        if (cantidad > 0) {
          const ivaUnit = ivaLinea / cantidad;
          ivaDev = cantDev * ivaUnit;
        }
      }

      if (ivaDev > 0) {
        totalIvaDev += ivaDev;
      }
    }

    totalBaseDev = +totalBaseDev.toFixed(2);
    totalIvaDev = +totalIvaDev.toFixed(2);

    // Línea DEBE para el IVA devuelto
    if (totalIvaDev > 0) {
      detalles.push({
        IdDetMaestro: 0,
        IdCabMaestro: 0,
        numlinea: numlinea++,
        anio: anioStr,
        fechatransaccion: fechaIso,
        fechaingreso: fechaIso,
        hora,
        idZona,
        idCentroCostos: null,
        idLocal: 1,
        idPlanCuentas: CTA_IVA,
        codprePc: `${CTA_IVA}-001`,
        idCodContable: idCodContableLinea,
        nocomprobante,
        docurelacionado: '',
        cheque: 0,
        beneficiario: '',
        debe: totalIvaDev,   // 👉 antes estaba en HABER en la factura
        haber: 0,
        comentario: `REVERSO IVA VENTA NC ${nocomprobante}`,
        idMovBancario: 1,
        movbancario: '0',
        cierre: '',
        fechacierre: null,
        conciliado: '',
        fechaconciliado: null,
        idSustentoTrib: null,
        idTipoCompSri: null,
        autorizacion: '',
        fechacaduca: null,
        idTipoRetencion: null,
        idProyecto: null,
        idSubproyecto: null,
        transferido: false,
        fechatransferido: null,
        fechavencimiento: null,
        idConciliacion: 0,
        valorLetras: '',
        estadoIngreso: true,
        autorizacionRelacionado: '',
        fechaCadRelacionado: null
      });
    }

    // =========================
    // 2) HABER → Reverso de cobros / formas de pago
    // =========================

    let totalHaber = 0;

    for (const pag of this.pagoRows) {
      const pagoVal = this.asNumber(pag.pago);
      if (pagoVal <= 0) continue;

      const cuentaTexto = (pag.cuenta || '').toString().trim();
      const [ctaStr] = cuentaTexto.split('-');
      const idPlan = Number(ctaStr) || CTA_CLIENTES;
      const codprePc = cuentaTexto || `${idPlan}-001`;

      totalHaber += pagoVal;

      detalles.push({
        IdDetMaestro: 0,
        IdCabMaestro: 0,
        numlinea: numlinea++,
        anio: anioStr,
        fechatransaccion: fechaIso,
        fechaingreso: fechaIso,
        hora,
        idZona,
        idCentroCostos: null,
        idLocal: 1,
        idPlanCuentas: idPlan,
        codprePc,
        idCodContable: idCodContableLinea,
        nocomprobante,
        docurelacionado: '',
        cheque: 0,
        beneficiario: '',
        debe: 0,
        haber: +pagoVal.toFixed(2),  // 👉 antes estaba en DEBE en la factura
        comentario: `REVERSO PAGO NC ${nocomprobante} - ${(pag.descripcion || '').toString().toUpperCase()}`,
        idMovBancario: 1,
        movbancario: '0',
        cierre: '',
        fechacierre: null,
        conciliado: '',
        fechaconciliado: null,
        idSustentoTrib: null,
        idTipoCompSri: null,
        autorizacion: '',
        fechacaduca: null,
        idTipoRetencion: null,
        idProyecto: null,
        idSubproyecto: null,
        transferido: false,
        fechatransferido: null,
        fechavencimiento: null,
        idConciliacion: 0,
        valorLetras: '',
        estadoIngreso: true,
        autorizacionRelacionado: '',
        fechaCadRelacionado: null
      });
    }

    totalHaber = +totalHaber.toFixed(2);

    // Totales del asiento (DEBE/HABER deben cuadrar)
    const totalDebe = +(detalles.reduce((s, d) => s + (Number(d.debe) || 0), 0)).toFixed(2);

    const asiento: AsientoVentaRequest = {
      IdCabMaestro: 0,
      idZona,
      idUsuario,
      idEmpresa,
      idTipoAsiento,
      tipdoc,
      numdoc,
      anio: anioStr,
      fechatransaccion: fechaIso,
      fechaingreso: fechaIso,
      observacion: `ASIENTO POR NOTA DE CRÉDITO ${nocomprobante} - FACTURA ${this.encabezado.factura}`,
      totdebe: totalDebe,
      tothaber: totalHaber,
      beneficiario,
      cierre: '',
      fechacierre: null,
      solicitado: '',
      depto: '',
      autorizado: '',
      homCodigo: 0,
      estado: true,
      modulo: 2,   // igual que en la factura
      detalles
    };

    console.log('ASIENTO NC OBJ →', asiento);
    console.log('ASIENTO NC JSON →', JSON.stringify(asiento, null, 2));

    return asiento;
  }
  private crearAsientoNotaCredito(idNotaCredito: number): Observable<string | null> {
    const asientoReq = this.buildAsientoNotaCreditoRequest(idNotaCredito);

    return this.asientoVentaService.crearAsientoVenta(asientoReq).pipe(
      map((resp: any) => {
        console.log('[crearAsientoNotaCredito] resp:', resp);

        if (!resp) {
          throw new Error('Respuesta vacía al crear asiento contable de la Nota de Crédito.');
        }

        const msg: string = resp.message ?? '';

        // Ejemplo mensaje: "Asiento creado. Cabecera Id=7, Numdoc=25120005, detalles=3"
        const match = msg.match(/Numdoc\s*=\s*(\d+)/i);
        const numeroAsiento = match ? match[1] : null;

        if (!numeroAsiento) {
          console.warn('[crearAsientoNotaCredito] No se encontró "Numdoc=" en el mensaje:', msg);
        } else {
          console.log('[crearAsientoNotaCredito] Número de asiento NC:', numeroAsiento);
        }

        return numeroAsiento; // string | null
      }),
      catchError(err => {
        console.error('[crearAsientoNotaCredito] error:', err);
        this.mostrarAlerta('Error al crear el asiento contable de la Nota de Crédito.', 'error');
        return of(null);
      })
    );
  }
  private cargarIdCodContablePorCliente(clienteMin: any): void {
    console.log('[NC] Cliente desde factura:', clienteMin);

    // 1) Sacar idCliente desde el objeto mínimo de la factura
    const idCliente = Number(
      clienteMin?.id ??
      clienteMin?.clientesCodigo ??
      clienteMin?.clientes_codigo ??
      0
    );

    if (!idCliente) {
      console.warn('[NC] Cliente sin idCliente válido, no se puede buscar id_cod_contable:', clienteMin);
      this.idCodContableCliente = 0;
      return;
    }

    // 2) Traer cliente completo para obtener idPersona
    this.clienteService.getClienteById(idCliente).pipe(
      switchMap((cli: any) => {
        console.log('[NC] Cliente completo desde getClienteById:', cli);

        const idPersona = cli?.idPersona ?? cli?.id_persona ?? 0;

        if (!idPersona) {
          console.warn('[NC] Cliente sin idPersona válido, no se puede buscar id_cod_contable:', cli);
          this.idCodContableCliente = 0;
          return of(null);
        }

        // 3) Usar tu método que ya funciona en factura
        return this.clienteService.getIdCodContableByPersona(idPersona).pipe(
          tap(idCod => {
            this.idCodContableCliente = idCod ?? 0;
            console.log('[NC] idCodContableCliente obtenido =', this.idCodContableCliente);
            debugger
          }),
          catchError(err => {
            console.error('[NC] Error obteniendo idCodContable por persona:', err);
            this.idCodContableCliente = 0;
            return of(null);
          })
        );
      }),
      catchError(err => {
        console.error('[NC] Error cargando cliente completo para idCodContable:', err);
        this.idCodContableCliente = 0;
        return of(null);
      })
    ).subscribe();
  }
  private cargarClienteDesdeNotaCredito(clienteMin: any): void {
    const idCliente = Number(clienteMin.id ?? 0);
    if (!idCliente) {
      this.idCodContableCliente = 0;
      return;
    }

    this.clienteService.getClienteById(idCliente).pipe(
      switchMap((cli: any) => {
        // 1) Obtener idPersona del cliente completo
        const idPersona = cli?.idPersona ?? cli?.id_persona ?? 0;

        if (!idPersona) {
          this.idCodContableCliente = 0;
          return of(null);
        }

        // 2) Obtener IdCodContable usando el método que ya funciona
        return this.clienteService.getIdCodContableByPersona(idPersona).pipe(
          tap(idCod => {
            this.idCodContableCliente = idCod ?? 0;
            console.log('[NC] idCodContableCliente desde cargarClienteDesdeNotaCredito =', this.idCodContableCliente);
          }),
          catchError(err => {
            console.error('Error obteniendo IdCodContable:', err);
            this.idCodContableCliente = 0;
            return of(null);     // para que NO reviente la suscripción ni el grid
          })
        );
      })
    ).subscribe();
  }


}
