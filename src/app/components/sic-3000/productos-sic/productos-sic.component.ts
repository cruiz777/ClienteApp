import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { ProductoRequest, sanitizeProductoPayload } from 'src/app/interfaces/requests/producto-request';
import { CreateProductoConEstructuraRequest } from 'src/app/interfaces/requests/create-producto-estructura-request';

import { ProductoService } from 'src/app/services/productos.service';
import { PresentacionService } from 'src/app/services/presentacion.service';
import { UniddaVentaService } from 'src/app/services/unidad-venta.service';
import { UnidadVentaResponse } from 'src/app/interfaces/responses/unidad-venta-response';
import { PresentacionResponse } from '../../../interfaces/responses/presentacion-response';

@Component({
  selector: 'app-productos-sic',
  templateUrl: './productos-sic.component.html',
  styleUrls: ['./productos-sic.component.css']
})
export class ProductosSicComponent implements OnInit, AfterViewInit {

  selectedTab = 0;
  idEstructura!: number;

  // Catálogos (Tab 1)
  unidadesVenta: UnidadVentaResponse[] = [];
  tiposProducto = ['Bien', 'Servicio'];
  presentaciones: PresentacionResponse[] = [];
  clasesProducto = ['A', 'B', 'C'];

  // IVA para Tab 3
  iva = 0.12;

  // Formularios
  form!: FormGroup;          // Tab 1
  adicionalForm!: FormGroup; // Tab 2
  preciosForm!: FormGroup;   // Tab 3

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private productoService: ProductoService,
    private presentacionService: PresentacionService,
    private unidadVentaService: UniddaVentaService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.selectedTab = 0;
    this.cargarPresentacion();
    this.cargarUnidadesVenta();
    this.route.paramMap.subscribe(params => {
      this.idEstructura = Number(params.get('idEstructura')) || 0;
      console.log('ID de estructura recibido:', this.idEstructura);
    });

    // ===== Tab 1
    this.form = this.fb.group({
      descripcion: ['', [Validators.required, Validators.maxLength(500)]],
      codigoInterno: [''],
      descripcion1: ['', [Validators.required, Validators.maxLength(500)]],
      unidadVenta: [null, Validators.required],
      existenciaGlobal: ['', Validators.required],
      abreviacion: ['', Validators.required],

      pagaIva: [false],
      productoEnVenta: [false],
      cargarInventarios: [false],
      productoConPeso: [false],
      consumoInterno: [false],

      codigoBarras: [''],
      generarCodigo: [false],
      descripcionPOS: ['', Validators.required],
      cantidad: [null],
      canCov: [''],
      referencia: [''],
      manejaDecimales: [false],
      psicotropico: [false],
      estupefaciente: [false],
      activo: [true],
      altoRiesgo: [false],

      tipoProducto: [null],
      presentacion: [null, Validators.required],
      claseProducto: [null],
      urlFoto: [''],

      fechaCreacion: [null],
      fechaModificacion: [null],
    });

    // ===== Tab 2
    this.adicionalForm = this.fb.group({
      color: [''],
      sabor: [''],
      tamanoTalla1: [''],
      medida1: [''],
      medida2: [''],
      medida3: [''],
      pasillo: [''],
      columna: [''],
      nivel: [''],
      tamanoTalla2: [''],
      observacion: [''],
      registroSanitario: [''],
      ctaVentas: [''],
      ctaInventarios: [''],
      ctaCostos: [''],
      ctaDevolucion: [''],
      productoGasto: [false],
      ctaGastos: [''],
    });

    // ===== Tab 3
    this.preciosForm = this.fb.group({
      // Precios (editables)
      precioOficial: [0],
      precioRedMsp: [0],
      pvpActualIva: [0, [Validators.min(0)]],     // base SIN IVA
      pvpAnteriorMasIva: [0],                     // se autollenará si está en 0
      fechaAnteriorModificarPrecio: [null],
      pvpActualMasIva: [0],                       // calculado si el usuario no lo edita
      fechaModificarPrecio: [null],
      margenUtilidad: [0],                        // calculado si el usuario no lo edita

      // Costos (editables)
      costoSuministro: [0],
      costoProducto: [0],
      costoPromedio: [0],
      precioCompraAnterior: [0],
      fechaAnteriorModificarCompra: [null],
      precioCompraActual: [0],
      fechaModificarCompra: [null],
      recepcionPorcentaje: [0]
    });

    // Cálculos automáticos (se recalculan cuando haya cambios reales)
    this.preciosForm.get('pvpActualIva')!.valueChanges
      .subscribe(() => this.recalcularPvpConIva());
    this.preciosForm.get('costoProducto')!.valueChanges
      .subscribe(() => this.recalcularMargen());
    this.preciosForm.get('costoPromedio')!.valueChanges
      .subscribe(() => this.recalcularMargen());
    this.preciosForm.get('pvpActualMasIva')!.valueChanges
      .subscribe(() => this.recalcularMargen());
  }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  cargarPresentacion(): void {
    this.presentacionService.getPresentacion().subscribe({
      next: (resp) => {
        this.presentaciones = resp.data;
        console.log(this.presentaciones)
      },
      error: () => {
        alert('Error al cargar presentaciones');
      }
    })
  }

  cargarUnidadesVenta(): void {
    this.unidadVentaService.getUnidadVenta().subscribe({
      next: (resp) => {
        this.unidadesVenta = resp.data;
        console.log(this.unidadesVenta)
      },
      error: () => {
        alert('Error al cargar unidades de venta')
      }
    })
  }

  ngAfterViewInit(): void { this.cdr.detectChanges(); }

  // ===== Getters para botonera genérica =====
  get currentForm(): FormGroup | null {
    switch (this.selectedTab) {
      case 0: return this.form;
      case 1: return this.adicionalForm;
      case 2: return this.preciosForm;
      default: return null;
    }
  }
  get currentFormInvalid(): boolean { return !(this.currentForm && this.currentForm.valid); }

  // ===== Utilidades Tab 3 =====
  /** Redondea a 'd' decimales (por defecto 3) */
  private fix(n: number, d = 3): number {
    return Number((Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d));
  }

  /**
   * Limpia lo que el usuario escribe en tiempo real:
   * - Acepta solo 0-9 y un único separador decimal.
   * - Convierte coma a punto.
   * - NO emite eventos para no disparar cálculos mientras escribe.
   */
  onNumericInput(controlName: string): void {
    const ctrl = this.preciosForm.get(controlName);
    if (!ctrl) return;
    let val = (ctrl.value ?? '').toString();

    // Reemplazar coma por punto y filtrar caracteres no válidos
    val = val.replace(',', '.').replace(/[^0-9.]/g, '');
    // Dejar solo un punto decimal
    val = val.replace(/(\..*)\./g, '$1');

    ctrl.setValue(val, { emitEvent: false });
  }

  /** Normaliza en blur: convierte a número y redondea; emite evento para recalcular */
  formatDecimal(controlName: string, dec = 3): void {
    const ctrl = this.preciosForm.get(controlName);
    if (!ctrl) return;

    const raw = (ctrl.value ?? '').toString().replace(',', '.');
    const n = parseFloat(raw);
    ctrl.setValue(this.fix(isFinite(n) ? n : 0, dec), { emitEvent: true });
  }

  /** Calcula PVP con IVA (si el usuario no lo editó) y prepara PVP anterior si está en 0 */
  recalcularPvpConIva(): void {
    const base = Number(this.preciosForm.getRawValue().pvpActualIva) || 0;
    const conIva = this.fix(base * (1 + this.iva), 3);

    const ctrlPvpConIva = this.preciosForm.get('pvpActualMasIva')!;
    const ctrlPvpAntIva = this.preciosForm.get('pvpAnteriorMasIva')!;

    if (!ctrlPvpConIva.dirty) {
      ctrlPvpConIva.setValue(conIva, { emitEvent: false });
    }
    if (!ctrlPvpAntIva.dirty) {
      const anterior = Number(ctrlPvpAntIva.value) || 0;
      if (anterior <= 0) {
        ctrlPvpAntIva.setValue(conIva, { emitEvent: false });
      }
    }
    this.recalcularMargen();
  }

  /** Calcula el margen si el usuario no lo editó manualmente */
  recalcularMargen(): void {
    const pvpConIva = Number(this.preciosForm.getRawValue().pvpActualMasIva) || 0;
    const costo = Number(this.preciosForm.getRawValue().costoProducto) || 0;
    const margen = pvpConIva > 0 ? ((pvpConIva - costo) / pvpConIva) * 100 : 0;

    const ctrlMargen = this.preciosForm.get('margenUtilidad')!;
    if (!ctrlMargen.dirty) {
      ctrlMargen.setValue(this.fix(margen, 3), { emitEvent: false });
    }
  }

  // ===== Botones genéricos =====
  onNuevo(): void {
    switch (this.selectedTab) {
      case 0:
        this.form.reset({ activo: true });
        break;
      case 1:
        this.adicionalForm.reset({ productoGasto: false });
        break;
      case 2:
        const hoy = null;
        this.preciosForm.reset({
          precioOficial: 0,
          precioRedMsp: 0,
          pvpActualIva: 0,
          pvpAnteriorMasIva: 0,
          fechaAnteriorModificarPrecio: hoy,
          pvpActualMasIva: 0,
          fechaModificarPrecio: hoy,
          margenUtilidad: 0,
          costoSuministro: 0,
          costoProducto: 0,
          costoPromedio: 0,
          precioCompraAnterior: 0,
          fechaAnteriorModificarCompra: hoy,
          precioCompraActual: 0,
          fechaModificarCompra: hoy,
          recepcionPorcentaje: 0
        });
        break;
    }
  }

  // 1) Campo de estado
  saving = false;

  // 2) Helper para armar el request (sanitiza Producto)
  private buildCreatePERequest(): CreateProductoConEstructuraRequest {
    const f1 = this.form.value;
    const f2 = this.adicionalForm.value;
    const f3 = this.preciosForm.getRawValue();

    const producto = sanitizeProductoPayload({
      // === TAB 1
      despro: f1.descripcion1,
      despro2: f1.descripcionPOS,
      codbar: f1.codigoBarras,
      tippro: f1.tipoProducto,
      uniman: f1.unidadVenta,
      abrevia: f1.abreviacion,
      referencia: f1.referencia,
      activo: f1.activo,
      pagaiva: f1.pagaIva,
      inv: f1.cargarInventarios,
      peso: f1.productoConPeso,
      pgasto: f2?.productoGasto ?? false,
      altoriesgo: f1.altoRiesgo,
      clasprod: f1.claseProducto,
      foto: f1.urlFoto,
      idempresa: 1,
      feccre: f1.fechaCreacion,
      fechamod: f1.fechaModificacion,

      // === TAB 2
      colsab: f2.color,
      talla: f2.tamanoTalla1,
      obs: f2.observacion,
      regsanitario: f2.registroSanitario,
      codcuedeb: f2.ctaVentas,
      codcuehab: f2.ctaInventarios,
      codcuedes: f2.ctaCostos,
      codcuedev: f2.ctaDevolucion,
      ctaprodgasto: f2.ctaGastos,

      // === TAB 3
      preven: f3.precioOficial,
      preven2: f3.precioRedMsp,
      pvpsiniva: f3.pvpActualIva,
      preanterior: f3.pvpAnteriorMasIva,
      feccosact: f3.fechaAnteriorModificarPrecio,
      fecpremod: f3.fechaModificarPrecio,
      margenutilidad: f3.margenUtilidad,
      costsuminis: f3.costoSuministro,
      cospro: f3.costoProducto,
      precos: f3.costoPromedio,
      cosanterior: f3.precioCompraAnterior,
      fecpreact: f3.fechaAnteriorModificarCompra,
      preuni: f3.precioCompraActual?.toString(),
      porcenrecepcion: f3.recepcionPorcentaje
    });

    return {
      Producto: producto,
      Estructura: { idgrupo: this.idEstructura || null }
    };
  }

  // 3) Usa el helper en onGrabar()
  onGrabar(): void {
    if (this.selectedTab === 0 && this.form.invalid) {
      this.form.markAllAsTouched();
      this.selectedTab = 0;
      return;
    }
    if (this.selectedTab === 1 && this.adicionalForm.invalid) {
      this.adicionalForm.markAllAsTouched();
      this.selectedTab = 1;
      return;
    }
    if (this.selectedTab === 2 && this.preciosForm.invalid) {
      this.preciosForm.markAllAsTouched();
      this.selectedTab = 2;
      return;
    }

    this.saving = true;
    const request = this.buildCreatePERequest();

    this.productoService.createConEstructura(request).subscribe({
      next: (res) => {
        if (res?.type?.toUpperCase() === 'SUCCESS') {
          console.log('✅ Creado correctamente', res.data);
          // TODO: limpiar forms o navegar si quieres
        } else {
          console.error('❌ Error lógica:', res?.message || res);
        }
      },
      error: (err) => console.error('❌ Error HTTP:', err),
      complete: () => (this.saving = false)
    });
  }


  onImprimir(): void { window.print(); }
  onAdjuntar(): void { history.back(); }

  // TrackBy para *ngFor
  trackByValue = (_: number, v: string) => v;
}
