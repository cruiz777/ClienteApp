import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { Cliente } from 'src/app/interfaces/cliente';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { GrupoProductoService, GrupoProducto } from 'src/app/services/grupo-producto.service';
import { Observable, of } from 'rxjs';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { startWith, map } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { Router, ActivatedRoute } from '@angular/router';
import { GeneracionCodigosService, SecuenciaResponse } from 'src/app/services/generacion-codigos.service';
import { stream } from 'exceljs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Validators } from '@angular/forms';
import { NcontrolService, NumeroControlMinDto } from 'src/app/services/ncontrol.service';
import { SectorService, Sector } from 'src/app/services/sector.service';
import { PaisService, Pais } from 'src/app/services/pais.service';
import { UmedidaService, Umedida } from 'src/app/services/umedida.service';
import { ProductoService, ProductoRequest } from 'src/app/services/producto.service';
import { ProductoAdicionalService, ProductoDatosAdicionalesRequest } from 'src/app/services/producto-adicional.service';
import { Codigos14Service, Codigos14Request } from 'src/app/services/codigos14.service';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { GenerarPresentacionesService } from 'src/app/services/generar-presentaciones.service';
import { switchMap } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';
import { ClienteService, ClienteIndividual } from 'src/app/services/cliente.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { take } from 'rxjs/operators';
import { catchError } from 'rxjs/operators';
import { AgGridModule } from 'ag-grid-angular';
import { MatDatepickerModule } from '@angular/material/datepicker';
import * as moment from 'moment';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { LOCALE_ID } from '@angular/core';
registerLocaleData(localeEs);

import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { JsonProductoService } from 'src/app/services/json-producto.service';
import { ParametrosFacturaService, ParametrosFactura } from 'src/app/services/parametros-factura.service';
import { finalize } from 'rxjs/operators';
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY'
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY'
  }
};



@Component({
  selector: 'app-uv-individual-edit',
  standalone: true,
  templateUrl: './uv-individual-edit.component.html',
  styleUrls: ['./uv-individual-edit.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatTableModule,
    MatSelectModule,
    MatIconModule,
    AgGridModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'es' },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ]
})

export class UvIndividualEditComponent implements OnInit {
  formUV!: FormGroup;
  formUL!: FormGroup;

  clienteSeleccionado: Cliente | null = null;
  prefijos: any[] = [];
  gtinNacionalActivo = false;
  gtinInternacionalActivo = false;
  gruposProducto: GrupoProducto[] = [];
  grupoProductoCtrl = new FormControl('');
  categoriasFiltradas: GrupoProducto[] = [];
  grupoProductoSeleccionado!: number;
  registrosGtin14: any[] = [];
  bandera: number = 0;
  npais: string = ''
  codigoprefijos: string = '';
  prefijo8: string = '';
  secuencia: number = 1;
  mensaje: string = '';
  serieEditable: boolean = false;
  campoGtin = false;
  campoGtinU = false;
  numeroControl?: NumeroControlMinDto;
  modoEdicion = false;
  botonGenerarDeshabilitado = false;
  botonGrabarDeshabilitado = true;
  botonIngresarULDeshabilitado = true;
  botonNuevoDeshabilitado = true;
  botonGenerarULDeshabilitado = true;
  botonGrabarULDeshabilitado = true;
  registroSeleccionado: any = null;
  imagenNoDisponible: boolean = false;
  unidadesMedida: Umedida[] = [];
  unidadesMedidaFiltradas: Umedida[] = [];
  abrevia: string = '';
  pais: Pais[] = [];
  paisCtrl = new FormControl('');
  paisFiltrados$!: Observable<Pais[]>;
  paisSeleccionado!: number;
  paisFiltrados: Pais[] = [];
  sectores: Sector[] = [];
  sectoresFiltrados: Sector[] = [];
  idProductoNuevo: number = 0;
  gtin14UEnable = false;
  gtin13UEnable = false;
  gtin12UEnable = false;
  gtin14UIEnable = false;
  gtin13UIEnable = false;
  gtin12UIEnable = false;
  longitudMaxima = 0;
  id_grupo_producto: number = 0;
  idProducto: number = 0;
  idProductoDatosAdicionles: number = 0;
  usuarioActual = this.usuarioService.getUsuarioActual();
  numeroPrefijo: string = '';
  api: string = '';
  claveApi: string = '';
  columnDefsGtin14 = [
    {
      headerName: '#',
      valueGetter: 'node.rowIndex + 1',
      width: 60,
      sortable: false,
      filter: false
    },
    { field: 'g14', headerName: 'Unidad Logística' },
    { field: 'codbar', headerName: 'Código' },
    { field: 'prefijo', headerName: 'Prefijo' },
    { field: 'factor', headerName: 'Factor' },
    { field: 'presentacion', headerName: 'Presentación' },
    { field: 'descripcion', headerName: 'Descripción' },
    { field: 'fecha', headerName: 'Fecha' },
    { field: 'estado', headerName: 'Estado' }
  ];

  defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };
  constructor(
    private fb: FormBuilder,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private prefijoService: PrefijoService,
    private grupoProductoService: GrupoProductoService,
    private generacionCodigosService: GeneracionCodigosService,
    private router: Router,
    private _snackBar: MatSnackBar,
    private ncontrolService: NcontrolService,
    private sectorService: SectorService,
    private paisService: PaisService,
    private umedidaService: UmedidaService,
    private productoService: ProductoService,
    private productoAdicionalService: ProductoAdicionalService,
    private codigos14Service: Codigos14Service,
    private dialog: MatDialog,
    private generarPresentacionesService: GenerarPresentacionesService,
    private cd: ChangeDetectorRef,
    private clienteService: ClienteService,
    private usuarioService: UsuarioService,
    private route: ActivatedRoute,
    private jsonProductoService: JsonProductoService,
    private parametrosFacturaService: ParametrosFacturaService

  ) { }



  ngOnInit(): void {
    this.formUV = this.fb.group({
      codigoCliente: [''],
      cliente: [''],
      ruc: [''],
      gcp: [{ value: null, disabled: true }],
      gln: [''],
      activo: [false],
      gtinUv: [''],
      tipoGtin: ['GTIN-13'],
      descripcion: [''],
      marca: [''],
      contenido: [''],
      unidadMedida: [''],
      categoria: [''],
      brick: [''],
      pais: [''],
      sector: [''],
      urlFoto: [''],
      observacion: [''],
      feccre: [moment()],

      empresas: this.fb.group({
        favorita: [false],
        mega: [false],
        amazon: [false],
        rosario: [false],
        tia: [false],
        google: [false],
        otrosSolicitantes: ['']
      }),
      gtinNacionalSeleccionado: [{ value: null, disabled: true }],
      gtinInternacionalSeleccionado: [{ value: null, disabled: true }],
      usarSerie: [false]
    });



    this.cargarCliente();
    this.cargarGrupoProductos();
    this.getSectores();
    this.cargarPais();
    this.getUnidadesMedida();
    this.cargarProducto();
    this.cargarParametroFacturaPorId(98);
    // Nacional
    this.formUV.get('gtinNacionalSeleccionado')?.valueChanges.subscribe(valor => {
      this.gtinInternacionalActivo = !!valor;
      if (valor) {
        this.formUV.get('gtinInternacionalSeleccionado')?.reset();
        this.formUV.patchValue({ tipoGtin: this.obtenerNombreGTIN(valor) });
      }
    });

    // Internacional + validación dinámica
    this.formUV.get('gtinInternacionalSeleccionado')?.valueChanges.subscribe(valor => {
      this.gtinNacionalActivo = !!valor;
      if (valor) {
        this.formUV.get('gtinNacionalSeleccionado')?.reset();
        this.formUV.patchValue({ tipoGtin: this.obtenerNombreGTIN(valor) });
      }

      const gtinUvControl = this.formUV.get('gtinUv');

      if (valor === 'GTIN-13I') {
        this.longitudMaxima = 12;
        gtinUvControl?.enable();
        gtinUvControl?.setValidators([Validators.required, Validators.maxLength(12)]);
      } else if (valor === 'GTIN-12I') {
        this.longitudMaxima = 11;
        gtinUvControl?.enable();
        gtinUvControl?.setValidators([Validators.required, Validators.maxLength(11)]);
      } else if (valor === 'GTIN-8I') {
        this.longitudMaxima = 7;
        gtinUvControl?.enable();
        gtinUvControl?.setValidators([Validators.required, Validators.maxLength(7)]);
      } else {
        this.longitudMaxima = 0;
        gtinUvControl?.reset();
        gtinUvControl?.disable();
        gtinUvControl?.clearValidators();
      }

      gtinUvControl?.updateValueAndValidity();
    });

    // Nacional - UL

    this.formUV.get('urlFoto')?.valueChanges.subscribe(() => {
      this.imagenNoDisponible = false; // Reinicia el error si cambia la URL
    });

  }






  cargarCliente(): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    if (cliente) {
      this.clienteSeleccionado = cliente;
      this.formUV.patchValue({
        codigoCliente: cliente.clientes_codigo || '',
        cliente: cliente.nomcli || '',
        ruc: cliente.ruc || '',
      });
      this.cargarClientePorId(cliente.clientes_codigo);
      this.cargarPrefijos(cliente.clientes_codigo);
    }
  }

  cargarPrefijos(codigoCliente: number): void {
    this.prefijoService.obtenerPorClienteCodigo(codigoCliente).subscribe({
      next: (data) => {
        this.prefijos = data;
      },
      error: (err) => {
        console.error('Error al cargar prefijos:', err);
      }
    });
  }

  mostrarCodigoPrefijo(): string {
    const id = this.formUV.get('gcp')?.value;
    const p = this.prefijos.find(p => p.id_prefijos === id);
    return p?.codpre || '';
  }

  onPrefijoBlur(): void {

    const idSeleccionado = this.formUV.value.gcp;
    const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);

    if (objeto?.gln) {
      this.formUV.patchValue({ gln: objeto.gln });

      const codpre = objeto.codpre || objeto.Codpre;

      if (!codpre) {
        console.warn('⚠️ codpre no disponible en el objeto');
        return;
      }

      this.prefijoService.buscarPorCodpre(codpre).subscribe({
        next: (respuesta) => {
          const bandera = respuesta[0]?.bandera ?? 0;
          this.bandera = bandera;
          console.log('✅ Bandera actualizada:', this.bandera);
        },
        error: (err) => {
          console.error('❌ Error al buscar bandera por codpre:', err);
        }
      });
    }
  }


  cargarGrupoProductos(): void {

    this.grupoProductoService.obtenerGrupos().subscribe(data => {
      this.gruposProducto = data;
      this.formUV.get('categoria')?.valueChanges
        .pipe(startWith(''))
        .subscribe(valor => {
          const filtro = typeof valor === 'string' ? valor.toLowerCase() : '';
          this.categoriasFiltradas = this.gruposProducto.filter(g =>
            g.codigo.toLowerCase().includes(filtro) ||
            g.brick.toLowerCase().includes(filtro) ||
            g.desBrick.toLowerCase().includes(filtro)
          );
        });
    });
    this.formUV.get('categoria')?.valueChanges.subscribe(valor => {
      if (valor && typeof valor === 'object') {
        this.formUV.get('brick')?.setValue(valor.brick);
      }
    });

  }

  displayWithCategoria(categoria: GrupoProducto): string {
    return categoria?.desBrick || '';
  }


  limpiarCategoria(): void {
    this.formUV.get('categoria')?.reset();
  }

  seleccionarCategoria(grupo: GrupoProducto): void {
    this.formUV.get('categoria')?.setValue(grupo);
    this.formUV.get('brick')?.setValue(grupo.brick); // Aquí se llena el campo brick
  }


  obtenerNombreGTIN(valor: string): string {

    switch (valor) {
      case 'GTIN-13': return 'GTIN-13';
      case 'GTIN-8': return 'GTIN-8';
      case 'UPC': return 'UPC';
      case 'GTIN-14': return 'GTIN-14';
      case 'GTIN-13I': return 'GTIN-13I';
      case 'GTIN-8I': return 'GTIN-8I';
      case 'GTIN-12I': return 'GTIN-12I';
      case 'GTIN-14I': return 'GTIN-14I';
      default: return '';
    }
  }


  grabarTodo(): void {
    const codbar = this.formUV.get('gtinUv')?.value;

    if (!codbar) {
      this.mostrarAlerta('⚠️ No ingresó Unidad de Venta', 'Error');

      return;
    }
    if (!this.formUV.get('descripcion')?.value) {
      this.mostrarAlerta('⚠️ No ingresó Descripcion', 'Error');

      return;
    }
    if (!this.formUV.get('marca')?.value) {
      this.mostrarAlerta('⚠️ No ingresó Marca', 'Error');

      return;
    }
    if (!this.formUV.get('contenido')?.value) {
      this.mostrarAlerta('⚠️ No ingresó Contenido', 'Error');

      return;
    }
    if (!this.formUV.get('gcp')?.value) {
      this.mostrarAlerta('⚠️ No seleccionó Prefijo', 'Error');

      return;
    }
    if (!this.formUV.get('categoria')?.value) {
      this.mostrarAlerta('⚠️ No seleccionó Categoría', 'Error');
      return;
    }

    this.productoService.verificarCodbar(codbar).pipe(
      switchMap((res) => {
        if (res.data) {
          this.mensaje = `⚠️ El código de barras ${codbar} ya está registrado.`;
          this.formUV.get('gtinUv')?.setErrors({ codbarExistente: true });
          this.cd.detectChanges(); // 👈 fuerza que el mensaje se vea en pantalla
          return of(null); // ✅ Retorna Observable nulo y detiene el flujo
          // ⛔ Detener el flujo (no continúa al dialog)
        }

        this.formUV.get('gtinUv')?.setErrors(null);
        this.mensaje = ''; // limpio mensaje

        const msg = this.modoEdicion ? 'actualizado' : 'creado';

        return this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          data: {
            title: '¿Desea confirmar?',
            message: `El código será ${msg}. ¿Está seguro?`,
            type: 'info',
            confirmText: 'Sí, confirmar',
            cancelText: 'Cancelar',
            showCancel: true
          }
        }).afterClosed();
      })
    ).subscribe((result) => {
      if (result === true) {
        this.botonGenerarDeshabilitado = true;
        this.botonGrabarDeshabilitado = true;
        this.botonIngresarULDeshabilitado = false;

        const gtinNacionalSeleccionado = this.formUV.get('gtinNacionalSeleccionado')?.value;

        if (gtinNacionalSeleccionado === 'gtin8' && this.bandera === 0) {
          if (!this.prefijo8 || isNaN(parseInt(this.prefijo8, 10))) {
            console.error('⚠️ prefijo8 inválido:', this.prefijo8);
            return;
          }

          const siguiente = (parseInt(this.prefijo8, 10) + 1).toString().padStart(this.prefijo8.length, '0');
          this.ncontrolService.actualizarNumeroControl(74, {
            numcon: siguiente,
            ocupado: false
          }).subscribe({
            next: () => this.continuarGrabado(),
            error: (err) => console.error('❌ Error al actualizar número de control:', err)
          });
        } else {
          this.continuarGrabado();
        }
      } else {
        console.log('❌ Usuario canceló');
      }
    });
  }



  continuarGrabado() {


    const datosUV = this.formUV.value;
    const datosUL = this.formUL.value;
    console.log('Datos UV:', datosUV);
    console.log('Datos UL:', datosUL);
  }




  limpiarCampos(): void {
    this.botonGenerarDeshabilitado = false;
    this.botonGrabarDeshabilitado = true;
    this.botonIngresarULDeshabilitado = true;
    this.formUV.reset();
    this.getSectores();
    this.cargarPais();
    this.getUnidadesMedida();

    if (this.clienteSeleccionado) {
      this.formUV.patchValue({
        codigoCliente: this.clienteSeleccionado.clientes_codigo || '',
        cliente: this.clienteSeleccionado.nomcli || '',
        ruc: this.clienteSeleccionado.ruc || ''
      });
      this.cargarPrefijos(this.clienteSeleccionado.clientes_codigo);
    }

    this.serieEditable = false;
    this.campoGtin = false;
    this.cargarCliente();
    this.cargarGrupoProductos();
    this.getSectores();
    this.cargarPais();
    this.getUnidadesMedida();
    this.formUV.get('tipoGtin')?.setValue(['GTIN-13']);
    this.formUV.get('gtinNacionalSeleccionado')?.setValue(['gtin13']);

    this.formUV.get('gtinNacionalSeleccionado')?.valueChanges.subscribe(valor => {
      this.gtinInternacionalActivo = !!valor;
      if (valor) {
        this.formUV.get('gtinInternacionalSeleccionado')?.reset();
        this.formUV.patchValue({ tipoGtin: this.obtenerNombreGTIN(valor) });
      }
    });

    this.formUV.get('gtinInternacionalSeleccionado')?.valueChanges.subscribe(valor => {
      this.gtinNacionalActivo = !!valor;
      if (valor) {
        this.formUV.get('gtinNacionalSeleccionado')?.reset();
        this.formUV.patchValue({ tipoGtin: this.obtenerNombreGTIN(valor) });
      }
    });
  }




  salir(): void {
    this.router.navigate(['/productos/nuevo-producto']); // Redirecciona a /pages/clientes
    // Navegación si aplica
  }



  mostrarAlerta(mensaje: string, tipo: string) {
    this._snackBar.open(mensaje, tipo, {
      horizontalPosition: "end",
      verticalPosition: "top",
      duration: 3000
    });
  }
  setGtinUvValidators(tipo: string): void {
    let longitud = 12;

    if (tipo === 'UPC') {
      longitud = 11;
    } else if (tipo === 'GTIN-8') {
      longitud = 7;
    }

    const soloNumerosExactos = [
      Validators.required,
      Validators.pattern(/^\d+$/),          // Solo números
      Validators.maxLength(longitud),
      Validators.minLength(longitud)        // Ambos iguales para longitud exacta
    ];

    const control = this.formUV.get('gtinUv');
    control?.setValidators(soloNumerosExactos);
    control?.updateValueAndValidity();
  }


  permitirSoloNumeros(event: KeyboardEvent): void {
    const charCode = event.key;

    if (!/^[0-9]$/.test(charCode)) {
      event.preventDefault(); // bloquea la tecla
    }
  }



  filtrarSectores(): void {
    this.formUV.get('sector')?.valueChanges
      .pipe(startWith(''))
      .subscribe(valor => {
        const texto = typeof valor === 'string' ? valor.toLowerCase() : valor?.descripcion?.toLowerCase() || '';
        this.sectoresFiltrados = this.sectores.filter(s => s.descripcion.toLowerCase().includes(texto));
      });
  }
  displayWithSector(sector: Sector): string {
    return sector?.descripcion || '';
  }

  seleccionarSector(sector: Sector): void {
    this.formUV.get('sector')?.setValue(sector);
  }

  limpiarSector(): void {
    this.formUV.get('sector')?.reset();
  }

  getSectores() {
    this.sectorService.obtenerSectores().subscribe((data) => {
      this.sectores = data;
      this.filtrarSectores();

      // ✅ Seleccionar "Retail" si existe
      const retail = this.sectores.find(s =>
        s.descripcion.toLowerCase() === 'retail'
      );

      if (retail) {
        this.formUV.get('sector')?.setValue(retail);
      }
    });
  }



  cargarPais(): void {

    this.paisService.obtenerPaises().subscribe(data => {
      this.pais = data;

      // ✅ Autocompletar Ecuador al inicio si está disponible
      const ecuador = this.pais.find(p => p.nombre.toLowerCase() === 'ecuador');
      if (ecuador) {
        this.formUV.get('pais')?.setValue(ecuador);

      }

      // 🔍 Reacciona a cambios en el campo país
      this.formUV.get('pais')?.valueChanges
        .pipe(startWith(''))
        .subscribe(valor => {
          const texto = typeof valor === 'string' ? valor.toLowerCase() : '';
          this.paisFiltrados = this.pais.filter(p =>
            p.nombre.toLowerCase().includes(texto)
          );

          // 🎯 Asignar código de área si se seleccionó un país válido

        });
    });
  }
  displayWithPais(pais: Pais): string {
    return pais?.nombre || '';
  }

  getUnidadesMedida() {
    this.umedidaService.obtenerUnidades().subscribe({
      next: (data) => {
        console.log('✅ Datos recibidos:', data);
        this.unidadesMedida = data;
        this.filtrarUnidadesMedida();

        // ✅ Autocompletar "gramos" si existe
        const gramos = this.unidadesMedida.find(u =>
          u.descripcion.toLowerCase() === 'gramos'
        );

        if (gramos) {
          this.formUV.get('unidadMedida')?.setValue(gramos);
        }
      },
      error: (err) => {
        console.error('❌ Error al obtener unidades de medida:', err);
      }
    });
  }


  filtrarUnidadesMedida(): void {
    this.formUV.get('unidadMedida')?.valueChanges
      .pipe(startWith(''))
      .subscribe(valor => {
        const texto = typeof valor === 'string' ? valor.toLowerCase() : valor?.descripcion?.toLowerCase() || '';
        this.unidadesMedidaFiltradas = this.unidadesMedida.filter(u =>
          u.descripcion.toLowerCase().includes(texto) || u.unidad.toLowerCase().includes(texto)
        );
      });
  }

  displayWithUnidadMedida(unidad: Umedida): string {
    return unidad ? `${unidad.unidad}` : '';
  }

  seleccionarUnidadMedida(unidad: Umedida): void {
    this.formUV.get('unidadMedida')?.setValue(unidad);
  }

  limpiarUnidadMedida(): void {
    this.formUV.get('unidadMedida')?.reset();
  }

  modificarProducto(): void {
    const msg = this.formUV.get('gtinUv')?.value || 'sin GTIN';

    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: '¿Desea guardar los cambios?',
        message: `Se guardarán los cambios para el código ${msg}. ¿Está seguro?`,
        type: 'info',
        confirmText: 'Sí, guardar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) {
        console.log('❌ Modificación cancelada por el usuario');
        return;
      }

      const datos = this.formUV.getRawValue();
      const cliente = this.clienteSeleccionado;
      const categoriaId = datos.categoria?.id_grupo_producto || 0;
      const sectorId = datos.sector?.id_sector || 0;

      const productoActualizado: ProductoRequest = {
        IdProducto: this.idProducto,
        Codpro: datos.gtinUv || '',
        Despro: datos.descripcion || '',
        Tippro: 'S',
        Codgru: categoriaId,
        Codsec: 0,
        Coddep: 0,
        Codsub: 0,
        Coddiv: 0,
        Codmar: 0,
        Despro2: '',
        Uniman: datos.unidadMedida?.unidad || '',
        Feccre: datos.feccre,
        Colsab: '',
        Talla: '',
        Preven: 0,
        Preven2: 0,
        Precos: 0,
        Cospro: 0,
        Exiqty: 0,
        Exipdc: 0,
        Exipdv: 0,
        Exisic: 0,
        Fecsic: new Date().toISOString(),
        Refer: '',
        Codcuedeb: '',
        Codcuehab: '',
        Codcuedes: '',
        Codcuedev: '',
        Iva: '',
        Tipo: '',
        Preuni: '',
        Regalia: '',
        Inv: true,
        PrevenSinIva: 0,
        PagaIva: true,
        PagaRegalia: true,
        Desind: '',
        Codorigen: '',
        Codcol: 0,
        StockMax: 0,
        StockMin: 0,
        Espesor: 0,
        Largo: 0,
        Ancho: 0,
        Fechacad: '',
        Fechacad1: 0,
        Fabricante: 0,
        Obs: datos.observacion || '',
        Peso: false,
        Fecing: new Date().toISOString(),
        ValorUnidad: 0,
        Codsab: '',
        Fechamod: new Date().toISOString(),
        Tamanio: '',
        Modelo: '',
        Numserie: datos.serie || '',
        Coleccion: '',
        Temporada: '',
        Prepormayor: 0,
        PreAnterior: 0,
        CosAnterior: 0,
        DescCosto1: 0,
        DescCosto2: 0,
        DescCosto3: 0,
        DescCosto4: 0,
        Descuento: 0,
        PreRebaja: 0,
        PreRebajaAntes: 0,
        FecIniPro: new Date().toISOString(),
        FecFinPro: new Date().toISOString(),
        FecIniPro1: new Date().toISOString(),
        Codubi: '',
        FecFinPro1: new Date().toISOString(),
        FecPreAct: new Date().toISOString(),
        FecPreMod: new Date().toISOString(),
        FecCosAct: new Date().toISOString(),
        FecCosMod: new Date().toISOString(),
        CodNiv: '',
        CodColUbi: '',
        MargenUtilidad: 0,
        PvpSinIva: 0,
        PorcenRecepcion: 0,
        Stocks: true,
        Abrevia: '',
        Referencia: '',
        MargenAntes: 0,
        FecMarAntes: new Date().toISOString(),
        CantDecimal: true,
        CostSuminis: 0,
        CantConv: 0,
        CostHelado: 0,
        Receta: false,
        Activo: datos.activo,
        ClasProd: '',
        Foto: datos.urlFoto || '',
        AltoRiesgo: false,
        PGasto: false,
        CtaProdGasto: '',
        RegSanitario: '',
        IdEmpresa: this.usuarioActual?.id_empresa ?? 1,
        Codbar: datos.gtinUv || ''
      };

      const adicionalesActualizados: ProductoDatosAdicionalesRequest = {
        IdProductoDatosAdicionales: this.idProductoDatosAdicionles,
        ClientesCodigo: cliente?.clientes_codigo || 0,
        IdPrefijos: datos.gcp,
        IdTipoCodigoGs1: 1,
        IdGrupoProducto: categoriaId,
        Peso1: datos.Peso,
        IdUsuario: this.usuarioActual?.id_usuario ?? 1,
        Facturar: '',
        Nombre: '',
        Gtin: datos.tipoGtin || '',
        Target: '',
        Marca: datos.marca || '',
        Autfuncion: '',
        Registros: '',
        Obsc: datos.observacion || '',
        IdSector: sectorId,
        Contenido: (datos.contenido ?? '').toString(),
        Um: datos.unidadMedida?.unidad || '',
        Brick: datos.brick?.brick || '',
        Pais: datos.pais?.nombre || '',
        Url: datos.urlFoto || '',
        Pum: '',
        Lum: '',
        Aum: '',
        Url2: '',
        Pais2: '',
        Pais3: '',
        Codint: '',
        Secto2: '',
        Sector3: '',
        SolFavorita: datos.empresas?.favorita ? 1 : 0,
        SolRosado: datos.empresas?.rosario ? 1 : 0,
        SolSantamaria: datos.empresas?.mega ? 1 : 0,
        SolTia: datos.empresas?.tia ? 1 : 0,
        SolAmazon: datos.empresas?.amazon ? 1 : 0,
        SolGoogle: datos.empresas?.google ? 1 : 0,
        SolEbay: 0,
        SolOtros: datos.empresas.otrosSolicitantes || '',
        id_producto: this.idProducto
      };

      this.productoService.actualizarProducto({
        idProducto: this.idProducto,
        request: productoActualizado
      }).subscribe({
        next: () => {
          console.log('✅ Producto base actualizado');

          this.productoAdicionalService.actualizarProductoDatosAdicionales({
            idProducto: this.idProducto,
            request: adicionalesActualizados
          }).subscribe({
            next: () => {
              console.log('✅ Producto adicional actualizado');
              this.mostrarAlerta('Producto modificado correctamente', '✔');

              const tipoGtin =
                this.formUV.getRawValue().gtinNacionalSeleccionado ||
                this.formUV.getRawValue().gtinInternacionalSeleccionado || '';

              const gtinUv = this.formUV.get('gtinUv')?.value || '';

              if ((tipoGtin === 'GTIN-13' || tipoGtin === 'UPC') && this.abrevia !== 'T') {
                this.dialog.open(CustomMessageBoxComponent, {
                  width: '400px',
                  data: {
                    title: '¿Enviar a Verified?',
                    message: '¿Desea generar el JSON para este producto?',
                    type: 'info',
                    confirmText: 'Sí, generar',
                    cancelText: 'No',
                    showCancel: true
                  }
                }).afterClosed().subscribe(confirmado => {
                  if (confirmado && !gtinUv.includes('7861000')) {
                    this.enviarAJsonVerified();
                  }
                });
              } else {
                console.log('✅ No aplica envío a Verified');
              }

              this.botonGenerarDeshabilitado = false;
              this.botonGrabarDeshabilitado = true;
            },
            error: (err) => {
              console.error('❌ Error al actualizar datos adicionales:', err);
              this.mostrarAlerta('Error al actualizar datos adicionales', 'Error');
            }
          });
        },
        error: (err) => {
          console.error('❌ Error al actualizar producto:', err);
          this.mostrarAlerta('Error al actualizar producto', 'Error');
        }
      });
    });
  }





  verificar() {
    const codbar = this.formUV.get('gtinUv')?.value;

    if (!codbar) {
      this.mensaje = '⚠️ Por favor ingresa un código de barras.';
      return;
    }

    this.productoService.verificarCodbar(codbar).subscribe({
      next: (res) => {
        if (res.data) {
          this.mensaje = `⚠️ El código de barras ${codbar} ya está registrado.`;
          // Aquí puedes deshabilitar el botón de guardar o mostrar alerta
          this.formUV.get('gtinUv')?.setErrors({ codbarExistente: true });
          return;
        }


      },
      error: () => {
        this.mensaje = '❌ Error al verificar el código de barras.';
        this.formUV.get('gtinUv')?.setErrors({ errorVerificacion: true });
      }
    });
  }

  validarNumeroDecimal(event: KeyboardEvent): void {
    const inputChar = event.key;
    const input = (event.target as HTMLInputElement).value;

    const esNumero = /^[0-9]$/.test(inputChar);
    const esPunto = inputChar === '.';

    // Permitir números
    if (esNumero) return;

    // Permitir solo un punto
    if (esPunto && !input.includes('.')) return;

    // Bloquear cualquier otro carácter o segundo punto
    event.preventDefault();
  }

  convertirAMayusculas(controlName: string): void {
    const control = this.formUV.get(controlName);
    if (control) {
      const valor = control.value || '';
      control.setValue(valor.toUpperCase());
    }
  }


  cargarClientePorId(id: number): void {

    console.log('🔍 ID recibido en cargarClientePorId:', id); // 👈 AÑADE ESTO

    this.clienteService.getClienteById(id).subscribe({
      next: (cliente) => {
        this.id_grupo_producto = cliente.idGrupoProducto;

        this.grupoProductoService.obtenerGrupoPorId(this.id_grupo_producto).subscribe(grupo => {
          if (!this.gruposProducto || this.gruposProducto.length === 0) {
            this.grupoProductoService.obtenerGrupos().subscribe(data => {
              this.gruposProducto = data;
              this.seleccionarCategoria(grupo);
            });
          } else {
            this.seleccionarCategoria(grupo);
          }

          console.log('✅ Grupo producto obtenido:', grupo);
        });
      },
      error: (err) => {
        console.error('❌ Error al obtener cliente:', err);
      }
    });
  }

  cargarProducto(): void {
    const codbar = this.route.snapshot.paramMap.get('codbar');
    if (!codbar) return;

    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: {
        title: 'Cargando Producto ...',
        message: 'Por favor espere mientras se cargan los datos del cliente.',
        type: 'info',
        isLoading: true,
        loadingText: 'Cargando información...',
        showCancel: false
      }
    });

    this.productoService.buscarPorCodbar(codbar).pipe(take(1)).subscribe({
      next: (producto) => {
        if (!producto) {
          console.warn('⚠️ Producto no encontrado');
          loadingDialog.close();
          return;
        }

        this.idProducto = producto.IdProducto;
        this.cargarTipoGtin(producto);
        this.cargarUnidadesMedida(producto);
        this.cargarSector(producto);
        this.cargarPaisDesdeProducto(producto);
        this.cargarCodigos14PorGtin(codbar);
        this.abrevia = (producto.Abrevia ?? '');

        const codigoCliente: number = Number(producto.clienteCodigo || producto.clienteCodigo);

        this.prefijoService.obtenerPorClienteCodigo(codigoCliente).pipe(take(1)).subscribe({
          next: (prefijos) => {
            this.prefijos = prefijos;

            const prefijoCoincidente = this.prefijos.find(p => p.codpre === producto.codpre);
            if (prefijoCoincidente) {
              this.formUV.get('gcp')?.setValue(prefijoCoincidente.id_prefijos);
              this.formUV.get('gln')?.setValue(prefijoCoincidente.gln);
            } else {
              console.warn('⚠️ No se encontró prefijo coincidente con codpre:', producto.codpre);
            }

            this.grupoProductoService.obtenerGrupos().pipe(take(1)).subscribe({
              next: (grupos) => {
                this.gruposProducto = grupos;

                const grupo = this.gruposProducto.find(g =>
                  g.id_grupo_producto === Number(producto.idgrupoproducto)
                );

                if (grupo) {
                  this.formUV.get('categoria')?.setValue(grupo);
                  this.formUV.get('brick')?.setValue(grupo.brick);
                } else {
                  console.warn('⚠️ No se encontró grupo coincidente con idgrupoproducto:', producto.idgrupoproducto);
                }

                this.formUV.patchValue({
                  descripcion: producto.Despro || '',
                  marca: producto.marca || '',
                  contenido: producto.contenido || '',
                  unidadesMedida: producto.unidad || '',
                  grupo: Number(producto.idgrupoproducto) || 0,
                  idProducto: producto.IdProducto || null,
                  gtinUv: producto.codbar || '',
                  observacion: producto.Obs || '',
                  urlFoto: producto.url || '',
                  activo: producto.Activo,
                  feccre: moment(producto.Feccre, 'YYYY-MM-DD'),
                  empresas: {
                    otrosSolicitantes: producto.po || '',
                    favorita: producto.p1 === 1,
                    mega: producto.p2 === 1,
                    amazon: producto.p3 === 1,
                    rosario: producto.p4 === 1,
                    tia: producto.p5 === 1,
                    google: producto.p6 === 1,
                  }
                });

                this.botonGrabarDeshabilitado = true;
                loadingDialog.close(); // ✅ cierre en éxito final
              },
              error: (err) => {
                console.error('❌ Error al cargar grupos de producto:', err);
                loadingDialog.close(); // ✅ cierre en error
              }
            });
          },
          error: (err) => {
            console.error('❌ Error al cargar prefijos:', err);
            loadingDialog.close(); // ✅ cierre en error
          }
        });
      },
      error: (err) => {
        console.error('❌ Error al cargar producto:', err);
        loadingDialog.close(); // ✅ cierre en error
      }
    });
  }


  cargarTipoGtin(producto: any): void {

    const gtin = (producto.gtin || '').toUpperCase();

    // Restablecer ambos selectores por defecto
    this.formUV.get('gtinNacionalSeleccionado')?.reset();
    this.formUV.get('gtinInternacionalSeleccionado')?.reset();

    switch (gtin) {
      case 'GTIN-13':
        this.formUV.get('gtinNacionalSeleccionado')?.setValue(gtin);
        break;
      case 'GTIN-8':
        this.formUV.get('gtinNacionalSeleccionado')?.setValue(gtin);
        break;
      case 'UPC':
        this.formUV.get('gtinNacionalSeleccionado')?.setValue(gtin);
        break;

      case 'GTIN-13I':
        this.formUV.get('gtinInternacionalSeleccionado')?.setValue(gtin);
        break;
      case 'GTIN-8I':
        this.formUV.get('gtinInternacionalSeleccionado')?.setValue(gtin);
        break;
      case 'GTIN-12I':
        this.formUV.get('gtinInternacionalSeleccionado')?.setValue(gtin);
        break;

      default:
        console.warn('⚠️ Tipo GTIN no reconocido:', gtin);
        break;
    }
  }
  cargarUnidadesMedida(producto: any): void {
    this.umedidaService.obtenerUnidades().subscribe({
      next: (data) => {
        this.unidadesMedida = data;
        this.filtrarUnidadesMedida();

        // Buscar por código recibido (por ejemplo: "g", "kg", etc.)
        const unidadSeleccionada = this.unidadesMedida.find(u =>
          u.unidad === (producto.unidad || '').toLowerCase()
        );

        if (unidadSeleccionada) {
          this.formUV.get('unidadMedida')?.setValue(unidadSeleccionada);
        } else {
          console.warn('⚠️ Unidad no encontrada para:', producto.unidad);
        }
      },
      error: (err) => {
        console.error('❌ Error al obtener unidades de medida:', err);
      }
    });
  }

  cargarSector(producto: any): void {
    this.sectorService.obtenerSectores().subscribe({
      next: (sectores) => {
        this.sectores = sectores;

        // Convertir producto.sector a número explícitamente
        const idSector = Number(producto.sector);

        const sectorSeleccionado = this.sectores.find(s =>
          s.id_sector === idSector
        );

        if (sectorSeleccionado) {
          this.formUV.get('sector')?.setValue(sectorSeleccionado);
        } else {
          console.warn('⚠️ Sector no encontrado para ID:', idSector);
        }
      },
      error: (err) => {
        console.error('❌ Error al obtener sectores:', err);
      }
    });
  }

  cargarPaisDesdeProducto(producto: any): void {

    this.paisService.obtenerPaises().subscribe(data => {
      this.pais = data;

      // ✅ Buscar el país por nombre (ej. "ECUADOR")
      const paisProducto = this.pais.find(p =>
        p.nombre.toLowerCase() === (producto.pais || '').toLowerCase()
      );

      if (paisProducto) {
        this.formUV.get('pais')?.setValue(paisProducto);
      } else {
        console.log('⚠️ País no encontrado:', producto.pais);
      }

      // 🔍 Filtro dinámico al escribir en el autocompletado
      this.formUV.get('pais')?.valueChanges
        .pipe(startWith(''))
        .subscribe(valor => {
          const texto = typeof valor === 'string' ? valor.toLowerCase() : '';
          this.paisFiltrados = this.pais.filter(p =>
            p.nombre.toLowerCase().includes(texto)
          );
        });
    });
  }


  cargarCodigos14PorGtin(gtin: string): void {
    console.log('📦 Ejecutando cargarCodigos14PorGtin con GTIN:', gtin);
    this.codigos14Service.getPorGtin(gtin).subscribe({
      next: codigos => {
        console.log('✅ Códigos recibidos:', codigos);
        this.registrosGtin14 = codigos.map(c => ({
          id: c.id_codigos14,
          g14: c.g14 || '',
          codbar: c.codbar || '',
          prefijo: c.codpre || '',
          factor: c.unidad || '',
          presentacion: c.presentacion || 0,
          descripcion: c.descripcion || '',
          fecha: this.formatearFecha(c.fecha),
          estado: c.activo ? 'ACTIVO' : 'INACTIVO'
        }));
      },
      error: err => console.error('Error al cargar códigos14:', err)
    });
  }

  formatearFecha(fechaStr: string | Date): string {
    if (typeof fechaStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
      const [anio, mes, dia] = fechaStr.split('-');
      return `${dia}/${mes}/${anio}`;
    }

    const fecha = new Date(fechaStr);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }



  habilitarModificar() {
    this.botonGrabarDeshabilitado = false;
  }

  parseFechaLatina(fechaStr: string): Date {
    const [dd, mm, yyyy] = fechaStr.split('/');
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }
  formatearFechaGuardado(fecha: Date): string {
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }
  convertirAFecha(fechaStr: string): Date | null {
    if (!fechaStr) return null;

    const partes = fechaStr.includes('/') ? fechaStr.split('/') : fechaStr.split('-');

    if (partes.length === 3) {
      const [d, m, y] = partes.map(Number);
      return new Date(y, m - 1, d); // dd/mm/yyyy
    }

    return null;
  }

  seleccionarRegistroU(registro: any): void {
    console.log('➡️ Doble clic sobre:', registro);

    if (registro?.g14) {
      this.router.navigate(['/productos/ul-edit/', registro.g14]);
    } else {
      console.warn('⚠️ g14 no disponible en el registro:', registro);
    }
  }


  enviarAJsonVerified(): void {
    debugger
    const uv = this.formUV.getRawValue(); // ✅ trae todo, incluso campos deshabilitados
    const idSeleccionado = uv.gcp; // 👈 accede directamente al campo "gcp"
    const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);
    this.numeroPrefijo = objeto?.codpre;
    console.log('📋 Formulario JSON:', JSON.stringify(uv, null, 2));

    const data = {
      gtin: uv.gtinUv,
      brick: uv.brick,
      prefijo: this.numeroPrefijo,
      marca: uv.marca,
      descripcion: uv.descripcion,
      url: uv.urlFoto,
      unidad: uv.unidadMedida.net_content_uom,
      contenido: uv.contenido,
      dapiP: this.api,
      capiP: this.claveApi
    };

    this.jsonProductoService.generarJson(data);
  }

  cargarParametroFacturaPorId(id: number): void {
    this.parametrosFacturaService.getById(id).subscribe({
      next: (parametro) => {
        // Aquí asignas el resultado a una variable del componente
        this.api = parametro.texto ?? '';
        this.claveApi = parametro.obs ?? ''; // si `valor` puede ser undefined

        console.log('✅ Parámetro cargado:', parametro);
      },
      error: (error) => {
        console.error('❌ Error al obtener el parámetro:', error);
        // Puedes mostrar un mensaje de error si deseas
      }
    });
  }




}
