import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RequiredFieldsToastService } from 'src/app/components/utils/messages/required-fields-toast.service';

import { ProductoRequest, sanitizeProductoPayload } from 'src/app/interfaces/requests/producto-request';
import { CreateProductoConEstructuraRequest } from 'src/app/interfaces/requests/create-producto-estructura-request';

import { ProductoService } from 'src/app/services/productos.service';
import { PresentacionService } from 'src/app/services/presentacion.service';
import { UnidadVentaService } from 'src/app/services/unidad-venta.service';
import { UnidadVentaResponse } from 'src/app/interfaces/responses/unidad-venta-response';
import { PresentacionResponse } from '../../../interfaces/responses/presentacion-response';
import { ProductoResponse } from 'src/app/interfaces/responses/producto-response';
import { IvaService, Iva } from 'src/app/services/iva.service';
import { LocalesResponse } from 'src/app/interfaces/responses/local-response';
import { LocalesService } from 'src/app/services/locales.service';
import { StockRequest } from 'src/app/interfaces/requests/stocks-request';
interface BodegaConfig {
  idLocal: number;
  nombreLocal: string;
  seleccionado: boolean;
  existenciaInicial: number;
  stockMin: number | null;
  stockMax: number | null;
  alertaStockBajo: boolean;
}
@Component({
  selector: 'app-productos-sic',
  templateUrl: './productos-sic.component.html',
  styleUrls: ['./productos-sic.component.css']
})
export class ProductosSicComponent implements OnInit, AfterViewInit {

  selectedTab = 0;
  idEstructura!: number;

  unidadesVenta: UnidadVentaResponse[] = [];
  tiposProducto = ['Bien', 'Servicio'];
  presentaciones: PresentacionResponse[] = [];
  clasesProducto = ['A', 'B', 'C'];
  esNuevoProducto: boolean = true;
  idProductoActual: number = 0;
  iva = 0;
  ivaVigente: Iva | null = null;
  tipoEstructura: string = 'grupo';
  terminoBusqueda: string = '';
  resultadosBusqueda: ProductoResponse[] = [];
  mostrarResultados: boolean = false;
  form!: FormGroup;
  adicionalForm!: FormGroup;
  preciosForm!: FormGroup;
  locales: LocalesResponse[] = [];
  bodegasConfig: BodegaConfig[] = [];
  filtroBodega: string = '';
  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private productoService: ProductoService,
    private presentacionService: PresentacionService,
    private unidadVentaService: UnidadVentaService,
    private ivaService: IvaService,
    private route: ActivatedRoute,
    private localesService: LocalesService,
    private toastCampos: RequiredFieldsToastService
  ) { }

  ngOnInit(): void {
    this.selectedTab = 0;
    this.cargarIvaVigente();
    this.cargarPresentacion();
    this.cargarLocales(); 
    this.cargarUnidadesVenta();
        this.route.paramMap.subscribe(params => {
      this.idEstructura = Number(params.get('idEstructura')) || 0;
      this.tipoEstructura = params.get('tipo') || 'grupo'; // ✅ CAPTURAR TIPO
      
      console.log('🔍 ID Estructura:', this.idEstructura);
      console.log('🔍 Tipo Estructura:', this.tipoEstructura);
      
      const idProducto = Number(params.get('id_producto')) || 0;
      
      if (idProducto > 0) {
        this.esNuevoProducto = false;
        this.idProductoActual = idProducto;
        this.cargarProducto(idProducto);
      } else {
        this.esNuevoProducto = true;
        this.idProductoActual = 0;
        this.cargarSiguienteId();
      }
    });

    this.form = this.fb.group({
      descripcion: ['', [Validators.required, Validators.maxLength(500)]],
      codigoInterno: ['', Validators.required],
      descripcion1: ['', [Validators.required, Validators.maxLength(500)]],
      unidadVenta: [null, Validators.required],
      existenciaGlobal: ['', Validators.required],
      abreviacion: ['', Validators.required],

      pagaIva: [false],
      productoEnVenta: [false],
      cargarInventarios: [false],
      productoConPeso: [false],
      consumoInterno: [false],

      codigoBarras: ['', Validators.required],
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

    this.preciosForm = this.fb.group({
      precioOficial: [0],
      precioRedMsp: [0],
      pvpActualIva: [0, [Validators.min(0)]],
      pvpAnteriorMasIva: [0],
      fechaAnteriorModificarPrecio: [null],
      pvpActualMasIva: [0],
      fechaModificarPrecio: [null],
      margenUtilidad: [0],

      costoSuministro: [0],
      costoProducto: [0],
      costoPromedio: [0],
      precioCompraAnterior: [0],
      fechaAnteriorModificarCompra: [null],
      precioCompraActual: [0],
      fechaModificarCompra: [null],
      recepcionPorcentaje: [0]
    });

    this.preciosForm.get('pvpActualIva')!.valueChanges
      .subscribe(() => this.recalcularPvpConIva());
    this.preciosForm.get('costoProducto')!.valueChanges
      .subscribe(() => this.recalcularMargen());
    this.preciosForm.get('costoPromedio')!.valueChanges
      .subscribe(() => this.recalcularMargen());
    this.preciosForm.get('pvpActualMasIva')!.valueChanges
      .subscribe(() => this.recalcularMargen());
  }

  ngAfterViewInit(): void { this.cdr.detectChanges(); }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
  cargarIvaVigente(): void {
    this.ivaService.getVigentes().subscribe({
      next: (ivas) => {
        // Buscar el IVA principal y vigente
        this.ivaVigente = ivas.find(i => i.principal && i.esta_vigente) || ivas[0] || null;
        
        if (this.ivaVigente) {
          // Convertir porcentaje a decimal (15% → 0.15)
          this.iva = this.ivaVigente.porcentaje / 100;
          console.log('✅ IVA vigente cargado:', this.ivaVigente.porcentaje + '%', '→', this.iva);
        } else {
          console.warn('⚠️ No se encontró IVA vigente, usando 12% por defecto');
          this.iva = 0.12;
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar IVA vigente:', err);
        this.iva = 0.12; // Fallback al 12%
        alert('No se pudo cargar el IVA vigente, usando 12% por defecto');
      }
    });
  }

  cargarLocales(): void {
    this.localesService.getAll().subscribe({
      next: (resp) => {        
        this.locales = (resp.data || []).filter((l: LocalesResponse) => l.estado === true);
        
        // Inicializar configuración de bodegas
        this.bodegasConfig = this.locales.map((local: LocalesResponse) => ({
          idLocal: local.id, 
          nombreLocal: local.nombre || '', // Fallback para evitar undefined
          seleccionado: false,
          existenciaInicial: 0,
          stockMin: null,
          stockMax: null,
          alertaStockBajo: false
        }));
      },
      error: (err) => {
        console.error('Error al cargar locales:', err);
        alert('Error al cargar bodegas disponibles');
      }
    });
  }

    toggleSeleccionBodega(bodega: BodegaConfig): void {
    bodega.seleccionado = !bodega.seleccionado;
  }

  seleccionarTodasBodegas(seleccionar: boolean): void {
    this.bodegasConfig.forEach(b => b.seleccionado = seleccionar);
  }

  validarStocks(bodega: BodegaConfig): void {
    if (bodega.stockMin !== null && bodega.stockMax !== null) {
      if (bodega.stockMin > bodega.stockMax) {
        bodega.stockMin = bodega.stockMax;
      }
    }
  }

  verificarAlertasStock(): void {
    this.bodegasConfig.forEach(b => {
      if (b.seleccionado && b.stockMin !== null) {
        b.alertaStockBajo = b.existenciaInicial < b.stockMin;
      }
    });
  }

  get bodegasSeleccionadas(): BodegaConfig[] {
    return this.bodegasConfig.filter(b => b.seleccionado);
  }

  get bodegasFiltradas(): BodegaConfig[] {
    if (!this.filtroBodega.trim()) {
      return this.bodegasConfig;
    }
    
    const filtro = this.filtroBodega.toLowerCase();
    return this.bodegasConfig.filter(b => 
      b.nombreLocal.toLowerCase().includes(filtro)
    );
  }

  cargarPresentacion(): void {
    this.presentacionService.getPresentacion().subscribe({
      next: (resp) => {
        this.presentaciones = resp.data;
      },
      error: () => {
        alert('Error al cargar presentaciones');
      }
    })
  }
  cargarSiguienteId(): void {
    this.productoService.getSiguienteId().subscribe({
      next: (resp) => {
        if (resp.type === 'SUCCESS' && resp.data) { // ✅ Validar que data existe
          this.form.patchValue({
            codigoInterno: resp.data.siguienteId.toString()
          });
        }
      },
      error: (err) => {
        console.error('Error al obtener siguiente ID:', err);
        alert('No se pudo obtener el código del producto');
      }
    });
  }
  cargarUnidadesVenta(): void {
    this.unidadVentaService.getUnidadVenta().subscribe({
      next: (resp) => {
        this.unidadesVenta = resp.data;
      },
      error: () => {
        alert('Error al cargar unidades de venta')
      }
    })
  }

  get currentForm(): FormGroup | null {
    switch (this.selectedTab) {
      case 0: return this.form;
      case 1: return this.adicionalForm;
      case 2: return this.preciosForm;
      default: return null;
    }
  }
  get currentFormInvalid(): boolean { return !(this.currentForm && this.currentForm.valid); }

  private fix(n: number, d = 3): number {
    return Number((Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d));
  }

  onNumericInput(controlName: string): void {
    const ctrl = this.preciosForm.get(controlName);
    if (!ctrl) return;
    let val = (ctrl.value ?? '').toString();

    val = val.replace(',', '.').replace(/[^0-9.]/g, '');
    val = val.replace(/(\..*)\./g, '$1');

    ctrl.setValue(val, { emitEvent: false });
  }

  formatDecimal(controlName: string, dec = 3): void {
    const ctrl = this.preciosForm.get(controlName);
    if (!ctrl) return;

    const raw = (ctrl.value ?? '').toString().replace(',', '.');
    const n = parseFloat(raw);
    ctrl.setValue(this.fix(isFinite(n) ? n : 0, dec), { emitEvent: true });
  }

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

  recalcularMargen(): void {
    const pvpConIva = Number(this.preciosForm.getRawValue().pvpActualMasIva) || 0;
    const costo = Number(this.preciosForm.getRawValue().costoProducto) || 0;
    const margen = pvpConIva > 0 ? ((pvpConIva - costo) / pvpConIva) * 100 : 0;

    const ctrlMargen = this.preciosForm.get('margenUtilidad')!;
    if (!ctrlMargen.dirty) {
      ctrlMargen.setValue(this.fix(margen, 3), { emitEvent: false });
    }
  }

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

  saving = false;

  private buildCreatePERequest(): CreateProductoConEstructuraRequest {
    const f1 = this.form.getRawValue();
    const f2 = this.adicionalForm.value;
    const f3 = this.preciosForm.getRawValue();
    let clasprod = f1.claseProducto;
    if (!clasprod) {
      clasprod = f1.tipoProducto === 'Bien' ? 'B' : (f1.tipoProducto === 'Servicio' ? 'S' : 'B');
    }
    const producto = sanitizeProductoPayload({
      despro: f1.descripcion1,
      despro2: f1.descripcionPOS,
      codbar: f1.codigoBarras,
      tippro: f1.tipoProducto === 'Bien' ? 'B' : (f1.tipoProducto === 'Servicio' ? 'S' : ''),
      uniman: this.unidadesVenta.find(u => u.idUnidadVenta === f1.unidadVenta)?.descripcion || '',
      abrevia: f1.abreviacion,
      referencia: f1.referencia,
      activo: f1.activo,
      pagaiva: f1.pagaIva,
      inv: f1.cargarInventarios,
      peso: f1.productoConPeso,
      pgasto: f2?.productoGasto ?? false,
      altoriesgo: f1.altoRiesgo,
      clasprod: clasprod, 
      foto: f1.urlFoto,
      idempresa: 1,
      feccre: f1.fechaCreacion,
      fechamod: f1.fechaModificacion,
      colsab: f2.color,
      talla: f2.tamanoTalla1,
      obs: f2.observacion,
      regsanitario: f2.registroSanitario,
      codcuedeb: f2.ctaVentas,
      codcuehab: f2.ctaInventarios,
      codcuedes: f2.ctaCostos,
      codcuedev: f2.ctaDevolucion,
      ctaprodgasto: f2.ctaGastos,
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

    const estructura: any = {};
    
    switch (this.tipoEstructura) {
      case 'division':
        estructura.iddivision = this.idEstructura;
        break;
      case 'subdivision':
        estructura.idsubdivision = this.idEstructura;
        break;
      case 'departamento':
        estructura.iddepartamento = this.idEstructura;
        break;
      case 'seccion':
        estructura.idseccion = this.idEstructura;
        break;
      case 'grupo':
        estructura.idgrupo = this.idEstructura;
        break;
    }

    // ✅✅✅ AGREGAR ESTAS LÍNEAS ✅✅✅
    const stocks = this.bodegasSeleccionadas.length > 0
      ? this.bodegasSeleccionadas.map(b => ({
          idlocal: b.idLocal,
          cantidad: b.existenciaInicial || 0,
          stockmin: b.stockMin,
          stockmax: b.stockMax
        }))
      : null;

    console.log('📦 Bodegas seleccionadas:', this.bodegasSeleccionadas);
    console.log('📦 Stocks a enviar:', stocks);

    return {
      Producto: producto,
      Estructura: estructura,
      Stocks: stocks  // ✅✅✅ AGREGAR ESTA LÍNEA ✅✅✅
    };
  }
  
  private buildUpdateRequest(): any {
    const f1 = this.form.getRawValue();
    const f2 = this.adicionalForm.value;
    const f3 = this.preciosForm.getRawValue();

    return sanitizeProductoPayload({
      idproducto: this.idProductoActual, // ✅ ID del producto a actualizar
      codpro: f1.codigoInterno,
      despro: f1.descripcion1,
      despro2: f1.descripcionPOS,
      codbar: f1.codigoBarras,
      tippro: f1.tipoProducto === 'Bien' ? 'B' : (f1.tipoProducto === 'Servicio' ? 'S' : ''),
      uniman: this.unidadesVenta.find(u => u.idUnidadVenta === f1.unidadVenta)?.descripcion || '',
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
      fechamod: new Date().toISOString(), // ✅ Fecha de modificación actual

      // Tab 2: Adicionales
      colsab: f2.color,
      talla: f2.tamanoTalla1,
      obs: f2.observacion,
      regsanitario: f2.registroSanitario,
      codcuedeb: f2.ctaVentas,
      codcuehab: f2.ctaInventarios,
      codcuedes: f2.ctaCostos,
      codcuedev: f2.ctaDevolucion,
      ctaprodgasto: f2.ctaGastos,

      // Tab 3: Precios y Costos
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
  }
  onBuscarProducto(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.terminoBusqueda = input.value.trim();
    
    if (this.terminoBusqueda.length < 2) {
      this.resultadosBusqueda = [];
      this.mostrarResultados = false;
      return;
    }

    this.productoService.buscarProductosPorEstructura(
      this.terminoBusqueda, 
      this.idEstructura
    ).subscribe({
      next: (resp) => {
        if (resp.type === 'SUCCESS' && resp.data) {
          this.resultadosBusqueda = resp.data;
          this.mostrarResultados = true;
        }
      },
      error: (err) => {
        console.error('Error en búsqueda:', err);
        this.resultadosBusqueda = [];
        this.mostrarResultados = false;
      }
    });
  }
  seleccionarProducto(producto: ProductoResponse): void {
    this.mostrarResultados = false;
    const idProducto = producto.idproducto ?? producto.id_producto;
    if (idProducto) this.cargarProductoCompleto(idProducto);
  }

  cargarProductoCompleto(idProducto: number): void {
    this.productoService.getById(idProducto).subscribe({
      next: (res) => {
        if (!res?.data) return;
        const prod = res.data;

        // ✅ Tab 1: datos generales
        this.form.patchValue({
          codigoInterno: prod.codpro,
          descripcion1: prod.despro,
          descripcionPOS: prod.despro2,
          codigoBarras: prod.codbar,
          tipoProducto: prod.tippro === 'B' ? 'Bien' : (prod.tippro === 'S' ? 'Servicio' : null),
          unidadVenta: this.unidadesVenta.find(u => u.descripcion === prod.uniman)?.idUnidadVenta || null,
          abreviacion: prod.abrevia,
          referencia: prod.referencia,
          activo: prod.activo,
          pagaIva: prod.pagaiva,
          cargarInventarios: prod.inv,
          productoConPeso: prod.peso,
          altoRiesgo: prod.altoriesgo,
          claseProducto: prod.clasprod,
          urlFoto: prod.foto,
          fechaCreacion: prod.feccre ? prod.feccre.substring(0, 10) : null,
          fechaModificacion: prod.fechamod ? prod.fechamod.substring(0, 10) : null,
        });

        // ✅ Tab 2: adicionales
        this.adicionalForm.patchValue({
          color: prod.colsab,
          tamanoTalla1: prod.talla,
          observacion: prod.obs,
          registroSanitario: prod.regsanitario,
          ctaVentas: prod.codcuedeb,
          ctaInventarios: prod.codcuehab,
          ctaCostos: prod.codcuedes,
          ctaDevolucion: prod.codcuedev,
          productoGasto: prod.pgasto,
          ctaGastos: prod.ctaprodgasto,
        });

        // ✅ Tab 3: precios / costos
        this.preciosForm.patchValue({
          precioOficial: prod.preven,
          precioRedMsp: prod.preven2,
          pvpActualIva: prod.pvpsiniva,
          pvpAnteriorMasIva: prod.preanterior,
          fechaAnteriorModificarPrecio: prod.feccosact,
          fechaModificarPrecio: prod.fecpremod,
          margenUtilidad: prod.margenutilidad,
          costoSuministro: prod.costsuminis,
          costoProducto: prod.cospro,
          costoPromedio: prod.precos,
          precioCompraAnterior: prod.cosanterior,
          fechaAnteriorModificarCompra: prod.fecpreact,
          precioCompraActual: prod.preuni,
          recepcionPorcentaje: prod.porcenrecepcion
        });
      },
      error: (err) => console.error('❌ Error cargando producto', err)
    });
  }

  onGrabar(): void {
    const controles = this.form.controls;
    const camposFaltantes: string[] = [];
    
    if (!controles['descripcion1'].value?.trim()) {
      camposFaltantes.push('Descripción');
      controles['descripcion1'].markAsTouched();
    }
    if (!controles['unidadVenta'].value) {
      camposFaltantes.push('Unidad de Venta');
      controles['unidadVenta'].markAsTouched();
    }
    if (!controles['existenciaGlobal'].value) {
      camposFaltantes.push('Existencia Global');
      controles['existenciaGlobal'].markAsTouched();
    }
    if (!controles['abreviacion'].value?.trim()) {
      camposFaltantes.push('Abreviación');
      controles['abreviacion'].markAsTouched();
    }
    if (!controles['descripcionPOS'].value?.trim()) {
      camposFaltantes.push('Descripción POS');
      controles['descripcionPOS'].markAsTouched();
    }
    if (!controles['presentacion'].value) {
      camposFaltantes.push('Presentación');
      controles['presentacion'].markAsTouched();
    }
    if (!controles['codigoInterno'].value) {
      camposFaltantes.push('Código Interno');
      controles['codigoInterno'].markAsTouched();
    }
    if (!controles['codigoBarras'].value) {
      camposFaltantes.push('Código de Barras');
      controles['codigoBarras'].markAsTouched();
    }

    if (camposFaltantes.length > 0) {
      this.toastCampos.mostrar(camposFaltantes);
      return;
    }
    
    if (this.selectedTab === 0 && this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.selectedTab === 1 && this.adicionalForm.invalid) {
      this.adicionalForm.markAllAsTouched();
      return;
    }
    if (this.selectedTab === 2 && this.preciosForm.invalid) {
      this.preciosForm.markAllAsTouched();
      return;
    }
    // ✅ DEBUG
    console.log('🏪 Bodegas seleccionadas:', this.bodegasSeleccionadas);
    console.log('🏪 Total:', this.bodegasSeleccionadas.length);
    
    if (this.bodegasSeleccionadas.length === 0) {
      alert('⚠️ Debes seleccionar al menos una bodega en el Tab "Estructura y Stock"');
      this.selectedTab = 3; // Ir al tab de bodegas
      return;
    }
    this.saving = true;

    if (this.esNuevoProducto) {
      const request = this.buildCreatePERequest();
      
      // ✅ LOG PARA DEBUG
      console.log('📦 Request completo:', JSON.stringify(request, null, 2));

      this.productoService.createConEstructura(request).subscribe({
        next: (res) => {
          console.log('✅ Respuesta del servidor:', res);
          
          if (res?.type?.toUpperCase() === 'SUCCESS') {
            alert('Producto creado exitosamente');
            history.back();
          } else {
            alert('Error al crear: ' + (res?.message || 'Error desconocido'));
          }
        },
        error: (err) => {
          console.error('❌ Error HTTP:', err);
          alert('Error al crear producto: ' + (err.error?.message || err.message));
        },
        complete: () => (this.saving = false)
      });
    } else {
      // ✅ ACTUALIZAR PRODUCTO EXISTENTE
      const request = this.buildUpdateRequest();
      console.log('📦 Actualizando producto →', request);

      this.productoService.update(this.idProductoActual, request).subscribe({
        next: (res) => {
          if (res?.type?.toUpperCase() === 'SUCCESS') {
            console.log('✅ Producto actualizado correctamente');
            alert('Producto actualizado exitosamente');
            // Opcional: recargar datos
            this.cargarProducto(this.idProductoActual);
          } else {
            console.error('❌ Error:', res?.message || res);
            alert('Error al actualizar: ' + (res?.message || 'Error desconocido'));
          }
        },
        error: (err) => {
          console.error('❌ Error HTTP:', err);
          alert('Error al actualizar producto');
        },
        complete: () => (this.saving = false)
      });
    }
  }

  cargarProducto(id: number): void {
    this.productoService.getById(id).subscribe({
      next: (res) => {
        const prod = res?.data;
        if (!prod) return;

        // ✅ Tab 1: datos generales
        this.form.patchValue({
          descripcion1: prod.despro,
          descripcionPOS: prod.despro2,
          codigoBarras: prod.codbar,
          tipoProducto: prod.tippro === 'B' ? 'Bien' : (prod.tippro === 'S' ? 'Servicio' : null),
          unidadVenta: this.unidadesVenta.find(u => u.descripcion === prod.uniman)?.idUnidadVenta || null,
          abreviacion: prod.abrevia,
          referencia: prod.referencia,
          activo: prod.activo,
          pagaIva: prod.pagaiva,
          cargarInventarios: prod.inv,
          productoConPeso: prod.peso,
          altoRiesgo: prod.altoriesgo,
          claseProducto: prod.clasprod,
          urlFoto: prod.foto,
          fechaCreacion: prod.feccre ? prod.feccre.substring(0, 10) : null,
          fechaModificacion: prod.fechamod ? prod.fechamod.substring(0, 10) : null,
        });

        // ✅ Tab 2: adicionales
        this.adicionalForm.patchValue({
          color: prod.colsab,
          tamanoTalla1: prod.talla,
          observacion: prod.obs,
          registroSanitario: prod.regsanitario,
          ctaVentas: prod.codcuedeb,
          ctaInventarios: prod.codcuehab,
          ctaCostos: prod.codcuedes,
          ctaDevolucion: prod.codcuedev,
          productoGasto: prod.pgasto,
          ctaGastos: prod.ctaprodgasto,
        });

        // ✅ Tab 3: precios / costos
        this.preciosForm.patchValue({
          precioOficial: prod.preven,
          precioRedMsp: prod.preven2,
          pvpActualIva: prod.pvpsiniva,
          pvpAnteriorMasIva: prod.preanterior,
          fechaAnteriorModificarPrecio: prod.feccosact,
          fechaModificarPrecio: prod.fecpremod,
          margenUtilidad: prod.margenutilidad,
          costoSuministro: prod.costsuminis,
          costoProducto: prod.cospro,
          costoPromedio: prod.precos,
          precioCompraAnterior: prod.cosanterior,
          fechaAnteriorModificarCompra: prod.fecpreact,
          precioCompraActual: prod.preuni,
          recepcionPorcentaje: prod.porcenrecepcion
        });
      },
      error: (err) => console.error('❌ Error cargando producto', err)
    });
  }

  onImprimir(): void { window.print(); }
  onAdjuntar(): void { history.back(); }

  trackByValue = (_: number, v: string) => v;
}
