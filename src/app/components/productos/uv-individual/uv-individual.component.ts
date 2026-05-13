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
import { startWith, map, distinctUntilChanged, catchError } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { GeneracionCodigosService, SecuenciaResponse } from 'src/app/services/generacion-codigos.service';
import { stream } from 'exceljs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Validators } from '@angular/forms';
import { NcontrolService, NumeroControlMinDto } from 'src/app/services/ncontrol.service';
import { SectorService, Sector } from 'src/app/services/sector.service';
import { PaisService, Pais } from 'src/app/services/pais.service';
import { UmedidaService, Umedida } from 'src/app/services/umedida.service';
import { ProductoService, ProductoRequest } from 'src/app/services/producto.service';
import { ProductoAdicionalService } from 'src/app/services/producto-adicional.service';
import { Codigos14Service, Codigos14Request } from 'src/app/services/codigos14.service';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { GenerarPresentacionesService } from 'src/app/services/generar-presentaciones.service';
import { switchMap } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';
import { ClienteService, ClienteIndividual } from 'src/app/services/cliente.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { ViewChild, ElementRef } from '@angular/core';
import { JsonProductoService } from 'src/app/services/json-producto.service';
import { ParametrosFacturaService, ParametrosFactura } from 'src/app/services/parametros-factura.service';
import { debounceTime } from 'rxjs/operators';
@Component({
  selector: 'app-uv-individual',
  standalone: true,
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
    MatIconModule
  ],
  templateUrl: './uv-individual.component.html',
  styleUrl: './uv-individual.component.css'
})
export class UvIndividualComponent implements OnInit {
  formUV!: FormGroup;
  formUL!: FormGroup;

  clienteSeleccionado: Cliente | null = null;
  prefijos: any[] = [];
  gtinNacionalActivo = false;
  gtinInternacionalActivo = false;
  gruposProducto: GrupoProducto[] = [];
  grupoProductoCtrl = new FormControl('');
  categoriasFiltradas: GrupoProducto[] = [];
  buscandoGrupoProducto = false;
  grupoProductoSeleccionado!: number;

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
  numeroPrefijo: string = '';

  unidadesMedida: Umedida[] = [];
  unidadesMedidaFiltradas: Umedida[] = [];
  api: string = '';
  claveApi: string = '';

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
  @ViewChild('gtinInput') gtinInput!: ElementRef;
  usuarioActual = this.usuarioService.getUsuarioActual();
  imagenNoDisponible: boolean = false;
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
    private jsonProductoService: JsonProductoService,
    private parametrosFacturaService: ParametrosFacturaService,
    private route: ActivatedRoute
  ) { }



  ngOnInit(): void {
    this.formUV = this.fb.group({
      codigoCliente: [''],
      cliente: [''],
      ruc: [''],
      gcp: [''],
      gln: [''],
      serie: [''],
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

      empresas: this.fb.group({
        favorita: [false],
        mega: [false],
        amazon: [false],
        rosario: [false],
        tia: [false],
        google: [false],
        otrosSolicitantes: [''],
      }),
      gtinNacionalSeleccionado: ['GTIN-13'],
      gtinInternacionalSeleccionado: [''],
      usarSerie: [false]
    });

    this.formUL = this.fb.group({
      gtinInternacionalULSeleccionado: [''],
      gtinNacionalULSeleccionado: ['gtin14u'],
      serie2: [''],
      tipoEmpaque: ['CAJA'],
      unidad: ['UNIDADES'],
      indicador: ['1'],
      factor: [''],
      gtinUl: [''],
      tipoGtinl: ['GTIN-14'],
      descripcionu: [''],
      usarSerie2: [false]
    });

    this.cargarCliente();
    this.cargarGrupoProductos();
    this.getSectores();
    this.cargarPais();
    this.getUnidadesMedida();

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
    this.formUL.get('gtinNacionalULSeleccionado')?.valueChanges.subscribe(valor => {
      console.log('🟦 Cambio en gtinNacionalULSeleccionado:', valor);

      if (valor) {
        this.formUL.get('gtinInternacionalULSeleccionado')?.reset();
        this.formUL.patchValue({ tipoGtinl: this.obtenerNombreGTIN(valor) });

        if (valor === 'gtin13u' || valor === 'gtin12u') {
          console.log('✅ Asignando indicador = 0');
          this.formUL.patchValue({ indicador: '0' });
        } else if (valor === 'gtin14u') {
          console.log('🔄 Verificando existencia para GTIN-14U...');
          this.verificarExistenciaCodbar();
        }
      }
    });

    this.formUL.get('gtinInternacionalULSeleccionado')?.valueChanges.subscribe(valor => {
      console.log('🟥 Cambio en gtinInternacionalULSeleccionado:', valor);

      if (valor) {
        this.formUL.get('gtinNacionalULSeleccionado')?.reset();
        this.formUL.patchValue({ tipoGtinl: this.obtenerNombreGTIN(valor) });

        if (valor === 'gtin13ui' || valor === 'gtin12ui') {
          console.log('✅ Asignando indicador = 0');
          this.formUL.patchValue({ indicador: '0' });
        } else if (valor === 'gtin14ui') {
          console.log('✅ Asignando indicador = 1');
          this.formUL.patchValue({ indicador: '1' });
        }
      }
    });
    this.formUL.disable();
    this.cargarParametroFacturaPorId(98);
    this.formUV.get('urlFoto')?.valueChanges.subscribe(() => {
      this.imagenNoDisponible = false; // Reinicia el error si cambia la URL
    });
    this.formUL.get('indicador')?.valueChanges
        .pipe(debounceTime(300))
        .subscribe(() => this.onIndicadorBlur());
  }

  activarUL(): void {
    this.formUL.enable(); // 👈 Activa todo el formUL
    this.botonIngresarULDeshabilitado = true;
    this.botonNuevoDeshabilitado = false;
    this.botonGenerarULDeshabilitado = false;
    this.mostrarAlerta('Ingrese Unidad Logística', '✔');

  }



  habilitarSerie(): void {
    const usarSerie = this.formUV.get('usarSerie')?.value;
    const gtin = this.formUV.get('gtinNacionalSeleccionado')?.value;

    if (usarSerie) {
      const gcpId = this.formUV.get('gcp')?.value;
      const prefijo = this.prefijos.find(p => p.id_prefijos === gcpId);

      if (!prefijo) {
        console.error('❌ Prefijo no encontrado');
        return;
      }

      if (gtin === 'GTIN-13') {
        this.npais = '786';
        this.generacionCodigosService.obtenerSecuencia(prefijo.codpre, this.npais).subscribe({
          next: (resp: SecuenciaResponse) => {
            this.formUV.get('serie')?.setValue(resp.data);
          },
          error: (err) => {
            console.error('Error al obtener secuencia GTIN-13:', err);
          }
        });

      } else if (gtin === 'UPC') {
        this.npais = '';
        debugger
        this.generacionCodigosService.obtenerSecuenciaUpc(prefijo.codpre, this.npais).subscribe({
        next: (resp: SecuenciaResponse) => {
            this.formUV.get('serie')?.setValue(resp.data);
          },
          error: (err) => {
            console.error('Error al obtener secuencia GTIN-12:', err);
          }
        });

      } else {
        this.formUV.get('serie')?.setValue('SERIE-GENERICA');
      }

    } else {
      this.formUV.get('serie')?.reset();
    }
    this.formUV.get('gtinInternacionalSeleccionado')?.valueChanges.subscribe(valor => {
      this.gtinNacionalActivo = !!valor;
      if (valor) {
        this.formUV.get('gtinNacionalSeleccionado')?.reset();
        this.formUV.patchValue({ tipoGtin: this.obtenerNombreGTIN(valor) });

        // Activar campo y aplicar validador personalizado
        this.setGtinUvValidators(valor);
      }
    });

  }


  habilitarSerie2(): void {

    const usarSerie2 = this.formUL.get('usarSerie2')?.value;
    const gtin = this.formUL.get('gtinNacionalULSeleccionado')?.value;

    if (usarSerie2) {
      const gcpId = this.formUV.get('gcp')?.value;
      const prefijo = this.prefijos.find(p => p.id_prefijos === gcpId);

      if (!prefijo) {
        console.error('? Prefijo no encontrado');
        return;
      }

      if (gtin === 'gtin13u') {
        this.npais = '786';
        this.generacionCodigosService.obtenerSecuencia(prefijo.codpre, this.npais).subscribe({
          next: (resp: SecuenciaResponse) => {
            this.formUL.get('serie2')?.setValue(resp.data);
          },
          error: (err) => {
            console.error('? Error al obtener secuencia GTIN-13U:', err);
          }
        });

      } else if (gtin === 'gtin12u') {
        this.npais = '';
        this.generacionCodigosService.obtenerSecuencia(prefijo.codpre, this.npais).subscribe({
          next: (resp: SecuenciaResponse) => {
            this.formUL.get('serie2')?.setValue(resp.data);
          },
          error: (err) => {
            console.error('? Error al obtener secuencia GTIN-12U:', err);
          }
        });

      } else {
        this.mostrarAlerta('⚠️ No se puede modificar Serie', 'Error');
      }

    } else {
      this.formUL.get('serie2')?.reset();
    }
  }



 cargarCliente(): void {
  const cliente = this.clienteSeleccionadoService.obtenerClienteActual();

  if (!cliente) return;

  // ✅ Validar DESAFILIADA
  const estado = (cliente.estadoNombre ?? '').toString().trim().toUpperCase();
  if (estado === 'DESAFILIADA') {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '450px',
      data: {
        title: 'Cliente DESAFILIADO',
        message: '❌ No puede codificar productos porque el cliente está DESAFILIADO.',
        type: 'error',
        confirmText: 'Aceptar'
      }
    }).afterClosed().subscribe(() => {
      this.dialog.closeAll();
      this.router.navigate(['/productos/nuevo-producto']);
    });

    return; // ⛔ detener aquí
  }

  // ✅ Flujo normal
  this.clienteSeleccionado = cliente;

  this.formUV.patchValue({
    codigoCliente: cliente.clientes_codigo || '',
    cliente: cliente.nomcli || '',
    ruc: cliente.ruc || ''
  });

  this.cargarClientePorId(cliente.clientes_codigo);
  this.cargarPrefijos(cliente.clientes_codigo);
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
      this.numeroPrefijo = codpre;
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


  //

  cargarGrupoProductos(): void {
    // ✅ Configurar búsqueda dinámica con debounce
    this.formUV.get('categoria')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(valor => {
          // Si es objeto seleccionado, no buscar
          if (typeof valor === 'object' && valor !== null) {
            this.buscandoGrupoProducto = false;
            // ✅ Mantener la lógica de brick
            if (valor.brick) {
              this.formUV.get('brick')?.setValue(valor.brick);
            }
            return of([]);
          }

          const searchTerm = typeof valor === 'string' ? valor.trim() : '';
          this.buscandoGrupoProducto = true;

          return this.grupoProductoService.buscarGrupoProducto(searchTerm, 100).pipe(
            catchError(err => {
              console.error('❌ Error:', err);
              return of([]);
            })
          );
        })
      )
      .subscribe(resultados => {
        if (resultados.length > 0 || typeof this.formUV.get('categoria')?.value === 'string') {
          this.categoriasFiltradas = resultados;
        }
        this.buscandoGrupoProducto = false;
      });
  }
  cargarGruposProductoInicial(): void {
    if (this.categoriasFiltradas.length === 0) {
      this.buscandoGrupoProducto = true;

      this.grupoProductoService.buscarGrupoProducto('', 100).subscribe({
        next: (resultados) => {
          this.categoriasFiltradas = resultados;
          this.buscandoGrupoProducto = false;
        },
        error: () => {
          this.buscandoGrupoProducto = false;
        }
      });
    }
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
    switch (valor?.toUpperCase()) {
      case 'GTIN-13': return 'GTIN-13';
      case 'GTIN-8': return 'GTIN-8';
      case 'UPC': return 'UPC';
      case 'GTIN-14': return 'GTIN-14';
      case 'GTIN-13I': return 'GTIN-13I';
      case 'GTIN-8I': return 'GTIN-8I';
      case 'GTIN-12I': return 'GTIN-12I';
      case 'GTIN-14I': return 'GTIN-14I';
      case 'GTIN13U': return 'GTIN-13';
      case 'GTIN12U': return 'UPC';
      case 'GTIN14U': return 'GTIN-14';
      case 'GTIN13UI': return 'GTIN-13I';
      case 'GTIN12UI': return 'GTIN-12I';
      case 'GTIN14UI': return 'GTIN-14I';
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

        if (gtinNacionalSeleccionado === 'GTIN-8' && this.bandera === 0) {
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
    this.guardarProducto();

    const datosUV = this.formUV.value;
    const datosUL = this.formUL.value;

    console.log('Datos UV:', datosUV);
    console.log('Datos UL:', datosUL);

    // Obtener tipo GTIN (incluso si está deshabilitado)
    const tipoGtin =
      this.formUV.getRawValue().gtinNacionalSeleccionado ||
      this.formUV.getRawValue().gtinInternacionalSeleccionado || '';

    const gtinUv = this.formUV.get('gtinUv')?.value || '';

    // Solo si es GTIN-13 o UPC se pregunta si desea enviar a Verified
    if (tipoGtin === 'GTIN-13' || tipoGtin === 'UPC') {
      this.dialog.open(CustomMessageBoxComponent, {
        width: '400px',
        data: {
          title: '¿Enviar a Verified?',
          message: '¿Desea generar el JSON y enviarlo a Verified?',
          type: 'info',
          confirmText: 'Sí, enviar',
          cancelText: 'No',
          showCancel: true
        }
      }).afterClosed().subscribe((confirmado) => {
        if (confirmado) {
          if (!gtinUv.includes('7861000')) {
            this.enviarAJsonVerified();
          }
        } else {
          console.log('⛔ El usuario decidió no enviar a Verified');
        }
      });
    } else {
      // No aplica envío a Verified, solo se graba
      console.log('✅ Producto grabado sin necesidad de enviar a Verified');
    }
  }


  enviarAJsonVerified(): void {
    const uv = this.formUV.value;

    const data = {
      gtin: uv.gtinUv,
      brick: uv.categoria,
      prefijo: this.numeroPrefijo,
      marca: uv.marca,
      descripcion: uv.descripcion,
      url: uv.urlFoto,
      unidad: uv.unidadMedida,
      contenido: uv.contenido,
      dapiP: this.api,
      capiP: this.claveApi
    };

    this.jsonProductoService.generarJson(data);
  }


  generar() {
    const gcpId = this.formUV.get('gcp')?.value;
    if (!gcpId) {
      this.mostrarAlerta('No se seleccionó Prefijo', 'Error');
      return;
    }
    debugger
    const categoriaId = this.formUV.get('categoria')?.value;
    if (!categoriaId) {
      this.mostrarAlerta('No se seleccionó Categoría', 'Error');
      return;
    }

    const gtinNacionalSeleccionado = this.formUV.get('gtinNacionalSeleccionado')?.value;
    const gtinInternacionalSeleccionado = this.formUV.get('gtinInternacionalSeleccionado')?.value;

    if (!gtinNacionalSeleccionado && !gtinInternacionalSeleccionado) {
      this.mostrarAlerta('Debe seleccionar Tipo GTIN Nacional o Internacional', 'Error');
      return;
    }

    const prefijo = this.prefijos.find(p => p.id_prefijos === gcpId);
    if (!prefijo) {
      console.error('❌ Prefijo no encontrado en la lista');
      return;
    }
    debugger
    // 🚫 No permitir GTIN-13 con bandera 2
    if (gtinNacionalSeleccionado === 'GTIN-13' && this.bandera === 2) {
      this.mostrarAlerta('No se puede generar este tipo de código', 'Error');
      return;
    }

    // ✅ GTIN-13 Nacional (bandera 0)
    if (gtinNacionalSeleccionado === 'GTIN-13' && this.bandera === 0) {
      this.npais = '786';
      this.generacionCodigosService.obtenerSecuencia(prefijo.codpre, this.npais).subscribe({
        next: (resp) => {
          const serie = this.formUV.get('serie')?.value || '';
          this.secuencia = serie !== '' ? parseInt(serie, 10) : resp.data;

          const continuar = this.validarAfiliacion(this.secuencia);
          if (!continuar) return;

          this.mensaje = resp.message;
          const codigoGenerado13N = this.generacionCodigosService.generarCodigo13(prefijo.codpre, this.secuencia);
          this.formUV.get('gtinUv')?.setValue(codigoGenerado13N);

          this.validarYHabilitarGTIN();
        },
        error: (err) => {
          console.error('Error al obtener secuencia', err);
          this.mensaje = 'Error al generar la secuencia';
        }
      });
    }

    // ✅ GTIN-8 Nacional
    if (gtinNacionalSeleccionado === 'GTIN-8') {
      this.ncontrolService.obtenerNumeroControlMinPorId(74).subscribe({
        next: (data) => {
          this.prefijo8 = data.numcon;
          const codigoGenerado8N = this.generacionCodigosService.generarCodigo8(this.prefijo8);
          this.formUV.get('gtinUv')?.setValue(codigoGenerado8N);
          this.validarYHabilitarGTIN();
        },
        error: (err) => {
          console.error('❌ Error al obtener el número de control:', err);
        }
      });
    }

    // ✅ UPC Nacional (GTIN-12)
    // ✅ UPC Nacional (GTIN-12)  (bandera 2)
if (gtinNacionalSeleccionado === 'UPC' && this.bandera === 2) {
  this.npais = '';

  const usarSerie = this.formUV.get('usarSerie')?.value === true;
  const serieStr = (this.formUV.get('serie')?.value ?? '').toString().trim();
  const serieNum = Number(serieStr);

  // Si el usuario activó "Serie" y hay un valor válido, úsalo directo
  if (usarSerie && serieStr !== '' && !Number.isNaN(serieNum)) {
    this.secuencia = serieNum;
    this.mensaje = 'Usando serie ingresada';

    const codigoGenerado12N = this.generacionCodigosService.generarCodigo12N(
      prefijo.codpre,
      this.secuencia,
      12
    );

    this.formUV.get('gtinUv')?.setValue(codigoGenerado12N);
    this.validarYHabilitarGTIN();
  } else {
    // Caso normal: pedir secuencia al backend
    this.generacionCodigosService.obtenerSecuenciaUpc(prefijo.codpre, this.npais).subscribe({
      next: (resp) => {
        this.secuencia = resp.data;
        this.mensaje = resp.message;

        // (Opcional) Si usarSerie está activo, también rellena el control serie con la secuencia obtenida
        if (usarSerie) {
          this.formUV.get('serie')?.setValue(resp.data);
        }

        const codigoGenerado12N = this.generacionCodigosService.generarCodigo12N(
          prefijo.codpre,
          this.secuencia,
          12
        );

        this.formUV.get('gtinUv')?.setValue(codigoGenerado12N);
        this.validarYHabilitarGTIN();
      },
      error: (err) => {
        console.error('Error al obtener secuencia', err);
        this.mensaje = 'Error al generar la secuencia';
      }
    });
  }
}


    // ✅ GTIN-13 Internacional
    if (gtinInternacionalSeleccionado === 'GTIN-13I') {
      const gnumero = (this.formUV.get('gtinUv')?.value || '').substring(0, 12);
      const codigoGenerado13I = this.generacionCodigosService.validarYGenerarCodigo13i(gnumero);
      this.formUV.get('gtinUv')?.setValue(codigoGenerado13I);
      this.validarYHabilitarGTIN();
    }

    // ✅ GTIN-12 Internacional
    if (gtinInternacionalSeleccionado === 'GTIN-12I') {
      const gnumero = (this.formUV.get('gtinUv')?.value || '').substring(0, 11);
      const codigoGenerado12I = this.generacionCodigosService.validarYGenerarCodigo12(gnumero);
      this.formUV.get('gtinUv')?.setValue(codigoGenerado12I);
      this.validarYHabilitarGTIN();
    }

    // ✅ GTIN-8 Internacional
    if (gtinInternacionalSeleccionado === 'GTIN-8I') {
      const gnumero = (this.formUV.get('gtinUv')?.value || '').substring(0, 7);
      const codigoGenerado8I = this.generacionCodigosService.validarYGenerarCodigo8(gnumero);
      this.formUV.get('gtinUv')?.setValue(codigoGenerado8I);
      this.validarYHabilitarGTIN();
    }
  }
  private validarYHabilitarGTIN(): void {
    const gtinG = this.formUV.get('gtinUv')?.value?.toString().trim();
    if (!gtinG) {
      this.mostrarAlerta('No se ingresó el GTIN', 'Error');
      this.gtinInput.nativeElement.focus();
      return;
    }

    this.campoGtin = true;
    this.mostrarAlerta('Código Generado Correctamente', '✔');
    this.botonGenerarDeshabilitado = true;
    this.botonGrabarDeshabilitado = false;
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
        ruc: this.clienteSeleccionado.ruc || '',
        gtinNacionalSeleccionado: 'GTIN-13',
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
    this.formUV.get('gtinNacionalSeleccionado')?.setValue('GTIN-13');

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


  limpiarUl(): void {
    // Limpiar todos los campos de UL
    this.formUL.patchValue({
      tipoGtinl: 'GTIN-14',
      descripcionu: '',
      factor: '',
      tipoEmpaque: 'CAJA',
      unidad: 'UNIDADES',
      indicador: '1',
      gtinUl: '',
      gtinNacionalULSeleccionado: 'gtin14u',
         usarSerie2: false,
      serie2: '',

    });

    // Resetear botones
    this.botonGenerarULDeshabilitado = false;
    this.botonGrabarULDeshabilitado = true;
    this.campoGtinU = false;
    // Obtener GTIN del formulario UV
    const gtin = this.formUV.get('gtinUv')?.value;

    // Verificar si existe el GTIN antes de continuar
    if (gtin) {
      this.verificarExistenciaCodbar();
    } else {
      console.warn('⚠️ No se encontró GTIN UV al limpiar UL.');
    }
  }


  salir(): void {
    this.router.navigate(['/productos/nuevo-producto']); // Redirecciona a /pages/clientes
    // Navegación si aplica
  }

  generarSecuencia(): void {
    const gcpId = this.formUV.get('gcp')?.value;
    if (!gcpId) {
      this.mensaje = 'El prefijo es obligatorio';
      return;
    }

    const prefijo = this.prefijos.find(p => p.id_prefijos === gcpId);
    if (!prefijo) {
      this.mensaje = 'Prefijo no encontrado';
      return;
    }

    const codpre = prefijo.codpre;
    const pais = this.npais || ''; // opcional

    this.generacionCodigosService.obtenerSecuencia(codpre, pais).subscribe({
      next: (resp: SecuenciaResponse) => {
        this.secuencia = resp.data;
        this.mensaje = resp.message;
        console.log('✅ Secuencia generada:', this.secuencia);
      },
      error: (err) => {
        console.error('Error al obtener secuencia', err);
        this.mensaje = 'Error al generar la secuencia';
      }
    });
  }

  validarAfiliacion(nserie: number): boolean {


    const gcpId = this.formUV.get('gcp')?.value;
    if (!gcpId) {
      this.mensaje = 'El prefijo es obligatorio';
      return false;
    }

    const prefijo = this.prefijos.find(p => p.id_prefijos === gcpId);
    if (!prefijo) {
      this.mensaje = 'Prefijo no encontrado';
      return false;
    }

    const codpre = prefijo.codpre;

    // Caso especial si empieza con 8000
    if (codpre.length === 8 && codpre.startsWith('8000')) {
      if (nserie >= 10) {
        this.mostrarAlerta('¡Ya no puede generar más códigos, necesita afiliarse!', 'Error');

        return false;
      }
    }

    // Límite según longitud
    if (
      (codpre.length === 5 && nserie === 10000) ||
      (codpre.length === 6 && nserie === 1000) ||
      (codpre.length === 7 && nserie === 100) ||
      (codpre.length === 8 && nserie === 10)
    ) {
      alert('¡Su cupo de generación de códigos fue ocupado en su totalidad! Necesita afiliarse.');
      return false;
    }

    return true; // válido, puede continuar
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

  obtenerNumeroControl(id: number): void {
    this.ncontrolService.obtenerNumeroControlMinPorId(id).subscribe({
      next: (data) => {
        this.numeroControl = data;

        // Primero actualizas prefijo y prefijogs1
        this.formUV.patchValue({
          serie: data.numcon,

        });

        // Luego generas el GLN usando el nuevo prefijo


      },
      error: (err) => {
        console.error('Error al consultar el número de control:', err);
        alert('Error al obtener el número de control');
      }
    });
  }

  actualizarNumeroControl(id: number, numcon: string, ocupado: boolean): void {
    this.ncontrolService.actualizarNumeroControl(id, {
      numcon,
      ocupado
    }).subscribe({
      next: res => {
        console.log('✅ Número actualizado:', res);
      },
      error: err => {
        console.error('❌ Error actualizando número de control:', err);
      }
    });
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

  guardarProducto() {
    const datos = this.formUV.getRawValue();
    const cliente = this.clienteSeleccionado;
    const categoria = datos.categoria;
    const categoriaId = typeof categoria === 'object' && categoria !== null ? categoria.id_grupo_producto : 0;
    const secto = datos.sector;
    const sectorR = typeof secto === 'object' && secto !== null ? secto.id_sector : 0;


    console.log(secto);

    const now = new Date();
    const nuevoProducto: ProductoRequest = {
      IdProducto: 0,
      Codpro: datos.gtinUv || '',
      Despro: datos.descripcion || '',
      Tippro: 'S',
      Codgru: datos.categoria?.id || 0,
      Codsec: 0,
      Coddep: 0,
      Codsub: 0,
      Coddiv: 0,
      Codmar: 0,
      Despro2: '',
      Uniman: datos.unidadMedida?.unidad || '',
      Feccre: this.isoLocal(now),
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
      Activo: true,
      ClasProd: '',
      Foto: datos.urlFoto || '',
      AltoRiesgo: false,
      PGasto: false,
      CtaProdGasto: '',
      RegSanitario: '',
      IdEmpresa: this.usuarioActual?.id_empresa ?? 1,
      Codbar: datos.gtinUv || ''
    };

    this.productoService.crearProducto(nuevoProducto).subscribe({
      next: (resp) => {
        const nuevoId = resp.data;
        console.log('✅ Producto creado con ID:', nuevoId);
        this.idProductoNuevo = nuevoId;
        // Construimos ProductoDatosAdicionales
        const adicionales = {
          IdProductoDatosAdicionales: 0,
          ClientesCodigo: cliente?.clientes_codigo || 0,
          IdPrefijos: datos.gcp,
          IdTipoCodigoGs1: 1 || 0,
          IdGrupoProducto: categoriaId,
          Peso1: datos.Peso,
          IdUsuario: this.usuarioActual?.id_usuario ?? 1,
          Facturar: '',
          Nombre: 'CODIGO:',
          Gtin: datos.tipoGtin,
          Target: '',
          Marca: datos.marca || '',
          Autfuncion: '',
          Registros: '',
          Obsc: datos.observacion || '',
          IdSector: sectorR,
          Contenido: (datos.contenido ?? '').toString(),
          Um: datos.unidadMedida?.unidad || '',
          Brick: datos.brick || '',
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
          SolFavorita: datos.empresas.favorita ? 1 : 0,
          SolRosado: datos.empresas.rosario ? 1 : 0,
          SolSantamaria: 0,
          SolTia: datos.empresas.tia ? 1 : 0,
          SolAmazon: datos.empresas.amazon ? 1 : 0,
          SolGoogle: datos.empresas.google ? 1 : 0,
          SolEbay: 0,
          SolOtros: datos.otrosSolicitantes || '',
          id_producto: nuevoId
        };

        this.productoAdicionalService.crearProductoDatosAdicionales(adicionales).subscribe({
          next: () => {
            console.log(adicionales);
            console.log('✅ Datos adicionales guardados');
            this.mostrarAlerta('Producto + datos adicionales guardados', '✔');
          },
          error: (err) => {
            console.error('❌ Error al guardar datos adicionales:', err);
            this.mostrarAlerta('Error al guardar datos adicionales', 'Error');
          }
        });
      },
      error: (err) => {
        console.error('❌ Error al crear el producto:', err);
        this.mostrarAlerta('Error al guardar producto', 'Error');
      }
    });
  }


  ejecutarAccionGTIN13U(): void {
    console.log('🔵 Seleccionado GTIN-13 UL Nacional');
    // tu lógica aquí
  }

  ejecutarAccionGTIN12U(): void {
    console.log('🟢 Seleccionado GTIN-12 UL Nacional');
    // tu lógica aquí
  }

  ejecutarAccionGTIN14U(): void {
    console.log('🟣 Seleccionado GTIN-14 UL Nacional');
    // tu lógica aquí
  }

  ejecutarAccionGTIN13UI(): void {
    console.log('🔴 Seleccionado GTIN-13 UL Internacional');
    // tu lógica aquí
  }

  ejecutarAccionGTIN12UI(): void {
    console.log('🟠 Seleccionado GTIN-12 UL Internacional');
    // tu lógica aquí
  }

  ejecutarAccionGTIN14UI(): void {
    console.log('⚫ Seleccionado GTIN-14 UL Internacional');
    // tu lógica aquí
  }
  actualizarDescripcionUL(): void {
    const descripcion = this.formUV.get('descripcion')?.value || '';
    const marca = this.formUV.get('marca')?.value || '';
    const contenido = this.formUV.get('contenido')?.value || '';
    const unidadObj = this.formUV.getRawValue().unidadMedida?.unidad || '';
    const unidadu = unidadObj?.unidad || '';
    const tipoEmpaque = this.formUL.get('tipoEmpaque')?.value || '';
    const factor = this.formUL.get('factor')?.value || '';
    const unidad = this.formUL.get('unidad')?.value || '';

 const descripcionUL = `${descripcion} ${marca} ${contenido} ${unidadObj} ${tipoEmpaque} ${factor} ${unidad}`
    .toUpperCase();
    this.formUL.get('descripcionu')?.setValue(descripcionUL);
  }
  generarUL(): void {
    debugger
    const gtinPrincipal =
      this.formUV.get('gtinNacionalSeleccionado')?.value ||
      this.formUV.get('gtinInternacionalSeleccionado')?.value;



    const tipoSeleccionado = this.formUL.get('gtinNacionalULSeleccionado')?.value ||
      this.formUL.get('gtinInternacionalULSeleccionado')?.value;

    if (gtinPrincipal == 'GTIN-13' && tipoSeleccionado === 'gtin14u') {
      console.log('✔️ GTIN-14U seleccionado');

      const indicador = this.formUL.get('indicador')?.value || '1';
      const gtinUv = this.formUV.get('gtinUv')?.value || '';

      const codigoGenerado = this.generacionCodigosService.generarCodigo14(indicador, gtinUv);
      this.formUL.get('gtinUl')?.setValue(codigoGenerado);
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    //generacion de 13 a 13 nacional
    if (gtinPrincipal == 'GTIN-13' && tipoSeleccionado === 'gtin13u') {
      this.generacioncodigos13s1();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    if (gtinPrincipal == 'GTIN-8' && tipoSeleccionado === 'gtin14u') {
      this.generacionCodigo148();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-8' && tipoSeleccionado === 'gtin13u') {
      this.generacioncodigos13s1();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-8' && tipoSeleccionado === 'gtin13ui') {
      this.calcularDigitoVerificador13Manual();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-8' && tipoSeleccionado === 'gtin12ui') {
      this.calcularDigitoVerificador12Manual();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-8' && tipoSeleccionado === 'gtin14ui') {
      this.calcularDigitoVerificador14Manual();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-13' && tipoSeleccionado === 'gtin13ui') {
      this.calcularDigitoVerificador13Manual();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-13' && tipoSeleccionado === 'gtin12ui') {
      this.calcularDigitoVerificador12Manual();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-13' && tipoSeleccionado === 'gtin14ui') {
      this.calcularDigitoVerificador14Manual();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    //generar g13i a gtin 14 n

    if (gtinPrincipal == 'GTIN-13I' && tipoSeleccionado === 'gtin14u') {
      console.log('✔️ GTIN-14U seleccionado');

      const indicador = this.formUL.get('indicador')?.value || '1';
      const gtinUv = this.formUV.get('gtinUv')?.value || '';

      const codigoGenerado = this.generacionCodigosService.generarCodigo14(indicador, gtinUv);
      this.formUL.get('gtinUl')?.setValue(codigoGenerado);
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    //genero de 13i a 13 n

    if (gtinPrincipal == 'GTIN-13I' && tipoSeleccionado === 'gtin13u') {
      this.generacioncodigos13s1();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    if (gtinPrincipal == 'GTIN-13I' && tipoSeleccionado === 'gtin14ui') {
      this.generacion14iiver14();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-13I' && tipoSeleccionado === 'gtin13ui') {
      this.generacion13iiver14();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-13I' && tipoSeleccionado === 'gtin12ui') {
      this.generacion12iiver14();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    // generar g8i a g14

    if (gtinPrincipal == 'GTIN-8I' && tipoSeleccionado === 'gtin14u') {
      this.generacionCodigo148();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    ///gtin 8i internaciona al gtin 13 n
    if (gtinPrincipal == 'GTIN-8I' && tipoSeleccionado === 'gtin13u') {
      this.generacioncodigos13s1();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    //////
    if (gtinPrincipal == 'GTIN-8I' && tipoSeleccionado === 'gtin14ui') {
      this.generacion14iiver14();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    if (gtinPrincipal == 'GTIN-8I' && tipoSeleccionado === 'gtin13ui') {
      this.generacion13iiver14();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-8I' && tipoSeleccionado === 'gtin12ui') {
      this.generacion12iiver14();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-12I' && tipoSeleccionado === 'gtin14u') {
      console.log('✔️ GTIN-14U seleccionado');

      const indicador = this.formUL.get('indicador')?.value || '1';
      const gtinUv = this.formUV.get('gtinUv')?.value || '';

      const codigoGenerado = this.generacionCodigosService.generarCodigo14(indicador, gtinUv);
      this.formUL.get('gtinUl')?.setValue(codigoGenerado);
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-12I' && tipoSeleccionado === 'gtin13u') {
      this.generacioncodigos13s1();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-12I' && tipoSeleccionado === 'gtin14ui') {
      this.generacion14iiver14();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    if (gtinPrincipal == 'GTIN-12I' && tipoSeleccionado === 'gtin13ui') {
      this.generacion13iiver14();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-12I' && tipoSeleccionado === 'gtin12ui') {
      this.generacion12iiver14();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'UPC' && tipoSeleccionado === 'gtin14u') {
      this.generarGtin14DesdeUpc12();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'UPC' && tipoSeleccionado === 'gtin14ui') {
      this.generacion14iiver14();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    if (gtinPrincipal == 'UPC' && tipoSeleccionado === 'gtin13ui') {
      this.generacion13iiver14();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'UPC' && tipoSeleccionado === 'gtin12ui') {
      this.generacion12iiver14();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'UPC' && tipoSeleccionado === 'gtin12u') {
      this.generacioncodigos12n();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-8' && tipoSeleccionado === 'gtin12u' && this.bandera === 2) {
      this.generacioncodigos12n();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

  }

  grabarTodoUL(): void {
    const codbarUL = this.formUL.get('gtinUl')?.value;

    if (!codbarUL) {
      this.mostrarAlerta('⚠️ No ingresó Unidad Logística', 'Error');

      return;
    }

    // Validar si el código ya existe antes de continuar
    this.productoService.verificarCodbar(codbarUL).subscribe({
      next: (res) => {
        if (res.data) {
          this.mensaje = `⚠️ El código de barras ${codbarUL} ya está registrado.`;
          this.formUL.get('gtinUl')?.setErrors({ codbarExistente: true });
          return; // ⛔ Detener aquí si ya existe
        }

        this.formUL.get('gtinUl')?.setErrors(null);
        this.mensaje = ''; // limpiar mensaje si todo bien

        // Aquí llamas al flujo original
        this.procesarConfirmacionesUL(); // 👈 Nueva función con toda la lógica de diálogos
      },
      error: () => {
        this.mensaje = '❌ Error al verificar el código.';
        this.formUL.get('gtinUl')?.setErrors({ errorVerificacion: true });
      }
    });
  }
  procesarConfirmacionesUL(): void {
    const msg = this.modoEdicion ? 'actualizado' : 'creado';
    const gtinPrincipal = this.formUV.get('gtinNacionalSeleccionado')?.value || this.formUV.get('gtinInternacionalSeleccionado')?.value;
    const tipoSeleccionado = this.formUL.get('gtinNacionalULSeleccionado')?.value || this.formUL.get('gtinInternacionalULSeleccionado')?.value;

    const confirmarYGuardar = (accion: () => void) => {
      this.dialog.open(CustomMessageBoxComponent, {
        width: '400px',
        data: {
          title: '¿Desea confirmar?',
          message: `El código será ${msg}. ¿Está seguro?`,
          type: 'info',
          confirmText: 'Sí, confirmar',
          cancelText: 'Cancelar',
          showCancel: true
        }
      }).afterClosed().subscribe(result => {
        if (result === true) {
          accion();
          this.mostrarDialogoOtraPresentacion();
        } else {
          console.log('❌ Usuario canceló');
        }
      });
    };

    // Mismos casos de antes, ahora limpios
    if (gtinPrincipal === 'GTIN-13' && tipoSeleccionado === 'gtin13u') {
      confirmarYGuardar(() => {
        this.guardarProductoPresentacion();
        this.crearGtin14(msg);
      });
    }

    if (gtinPrincipal === 'GTIN-13' && tipoSeleccionado === 'gtin14u') {
      confirmarYGuardar(() => this.crearGtin14(msg));
    }

    if (gtinPrincipal === 'GTIN-8' && tipoSeleccionado === 'gtin14u') {
      confirmarYGuardar(() => this.crearGtin14(msg));
    }

    if (gtinPrincipal === 'GTIN-8' && tipoSeleccionado === 'gtin13u') {
      confirmarYGuardar(() => {
        this.guardarProductoPresentacion();
        this.crearGtin14(msg);
      });
    }

    if (gtinPrincipal === 'GTIN-13I' && tipoSeleccionado === 'gtin14u') {
      confirmarYGuardar(() => this.crearGtin14(msg));
    }

    if (gtinPrincipal === 'GTIN-13I' && tipoSeleccionado === 'gtin13u') {
      confirmarYGuardar(() => {
        this.guardarProductoPresentacion();
        this.crearGtin14(msg);
      });
    }

    if (gtinPrincipal === 'GTIN-13I' && tipoSeleccionado === 'gtin14ui') {
      confirmarYGuardar(() => this.crearGtin14(msg));
    }

    if (gtinPrincipal === 'GTIN-13I' && tipoSeleccionado === 'gtin13ui') {
      confirmarYGuardar(() => {
        this.guardarProductoPresentacion();
        this.crearGtin14(msg);
      });
    }

    if (gtinPrincipal === 'GTIN-13I' && tipoSeleccionado === 'gtin12ui') {
      confirmarYGuardar(() => {
        this.guardarProductoPresentacion();
        this.crearGtin14(msg);
      });
    }
    if (gtinPrincipal === 'gtin8I' && tipoSeleccionado === 'gtin14u') {
      confirmarYGuardar(() => this.crearGtin14(msg));
    }
    if (gtinPrincipal === 'GTIN-8I' && tipoSeleccionado === 'gtin13u') {
      confirmarYGuardar(() => {
        this.guardarProductoPresentacion();
        this.crearGtin14(msg);
      });
    }
    if (gtinPrincipal === 'GTIN-8I' && tipoSeleccionado === 'gtin14ui') {
      confirmarYGuardar(() => this.crearGtin14(msg));
    }
    if (gtinPrincipal === 'GTIN-8I' && tipoSeleccionado === 'gtin13ui') {
      confirmarYGuardar(() => {
        this.guardarProductoPresentacion();
        this.crearGtin14(msg);
      });
    }
    if (gtinPrincipal === 'GTIN-8I' && tipoSeleccionado === 'gtin12ui') {
      confirmarYGuardar(() => {
        this.guardarProductoPresentacion();
        this.crearGtin14(msg);
      });
    }
    if (gtinPrincipal === 'GTIN-12I' && tipoSeleccionado === 'gtin14u') {
      confirmarYGuardar(() => this.crearGtin14(msg));
    }
    if (gtinPrincipal === 'GTIN-12I' && tipoSeleccionado === 'gtin13u') {
      confirmarYGuardar(() => {
        this.guardarProductoPresentacion();
        this.crearGtin14(msg);
      });
    }
    if (gtinPrincipal === 'GTIN-12I' && tipoSeleccionado === 'gtin14ui') {
      confirmarYGuardar(() => this.crearGtin14(msg));
    }
    if (gtinPrincipal === 'GTIN-12I' && tipoSeleccionado === 'gtin13ui') {
      confirmarYGuardar(() => {
        this.guardarProductoPresentacion();
        this.crearGtin14(msg);
      });
    }
    if (gtinPrincipal === 'GTIN-12I' && tipoSeleccionado === 'gtin12ui') {
      confirmarYGuardar(() => {
        this.guardarProductoPresentacion();
        this.crearGtin14(msg);
      });
    }

    if (gtinPrincipal === 'UPC' && tipoSeleccionado === 'gtin14u') {
      confirmarYGuardar(() => {
        this.guardarProductoPresentacion();
        this.crearGtin14(msg);
      });
    }
    if (gtinPrincipal === 'UPC' && tipoSeleccionado === 'gtin12ui') {
      confirmarYGuardar(() => {
        this.guardarProductoPresentacion();
        this.crearGtin14(msg);
      });
    }
    if (gtinPrincipal === 'UPC' && tipoSeleccionado === 'gtin13ui') {
      confirmarYGuardar(() => {
        this.guardarProductoPresentacion();
        this.crearGtin14(msg);
      });
    }
    if (gtinPrincipal === 'UPC' && tipoSeleccionado === 'gtin14ui') {
      confirmarYGuardar(() => this.crearGtin14(msg));
    }
    if (gtinPrincipal == 'UPC' && tipoSeleccionado === 'gtin12u') {
      this.generacioncodigos12n();
      this.campoGtinU = true;
      this.mostrarAlerta('Código Generado Correctamente', '✔');
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal === 'UPC' && tipoSeleccionado === 'gtin12u') {
      confirmarYGuardar(() => {
        this.guardarProductoPresentacion();
        this.crearGtin14(msg);
      });
    }
    if (gtinPrincipal === 'GTIN-8' && tipoSeleccionado === 'gtin12u' && this.bandera === 2) {
      confirmarYGuardar(() => {
        this.guardarProductoPresentacion();
        this.crearGtin14(msg);
      });
    }

    this.botonGrabarULDeshabilitado = true;
    this.botonGenerarULDeshabilitado = false;
  }


  private crearGtin14(msg: string): void {
    const datosUV = this.formUV.getRawValue(); // incluye campos deshabilitados
    const datosUL = this.formUL.getRawValue();
    const indicador = this.formUL.get('indicador')?.value || '0';

    const nuevoCodigo14: Codigos14Request = {
      id_codigos14: 0,
      codbar: datosUV.gtinUv ?? '',
      id_prefijos: datosUV.gcp ?? 0,
      clientes_codigo: this.clienteSeleccionado?.clientes_codigo ?? 0,
      presentacion: indicador,
      unidad: datosUL.factor ?? '',
      descripcion: datosUL.descripcionu.toUpperCase() ?? '',
      g14: datosUL.gtinUl ?? '',
      largo: 0,
      ancho: 0,
      profundidad: 0,
      peso: 0,
      fecha: new Date().toISOString().slice(0, 10),
      foto: datosUV.urlFoto ?? '',
      activo: true,
      id_usuario: 2,
      codpro: datosUV.gtinUv ?? '',
      facturar: '',
      nombre: 'PRESENTACION:',
      gtin: 'GTIN14',
      target: '',
      marca: datosUV.marca ?? '',
      sector: datosUV.sector?.descripcion ?? '',
      referencia: '',
      abrevia: '',
      id_producto: this.idProductoNuevo
    };

    this.codigos14Service.createCodigo14(nuevoCodigo14).subscribe({
      next: () => {
        this.mostrarAlerta('Código GTIN-14 guardado correctamente', '✔');
      },
      error: (err) => {
        console.error('❌ Error al guardar GTIN-14:', err);
        this.mostrarAlerta('Error al guardar GTIN-14', 'Error');
      }
    });
  }



  // gestionarActivacionOpcionesUL(valor: string, esNacional: boolean): void {
  //   const gpc = this.formUV.get('gpc')?.value || '';
  //   const l7 = gpc.length;
  //   const bandera = this.bandera;

  //   // Resetear todos
  //   this.gtin14UEnable = false;
  //   this.gtin13UEnable = false;
  //   this.gtin12UEnable = false;
  //   this.gtin14UIEnable = false;
  //   this.gtin13UIEnable = false;
  //   this.gtin12UIEnable = false;

  //   // --- Nacionales
  //   if (esNacional) {
  //     if (bandera === 0 && l7 !== 8) {
  //       if (valor === 'gtin13') {
  //         this.gtin13UEnable = true;
  //         this.gtin14UEnable = true;
  //       }
  //       if (valor === 'gtin8') {
  //         this.gtin14UEnable = true;
  //       }
  //       if (valor === 'gtin12') {
  //         this.gtin12UEnable = true;
  //         this.gtin14UEnable = true;
  //       }
  //     } else if (bandera === 2) {
  //       if (valor === 'gtin13') {
  //         this.gtin13UEnable = true;
  //         this.gtin14UEnable = true;
  //       }
  //       if (valor === 'gtin8') {
  //         this.gtin14UEnable = true;
  //       }
  //       if (valor === 'gtin12') {
  //         this.gtin12UEnable = true;
  //         this.gtin14UEnable = true;
  //       }
  //     } else if (l7 === 8 && gpc.startsWith('8900')) {
  //       this.gtin14UEnable = true;
  //       this.gtin13UEnable = true;
  //     } else if (l7 === 8 && gpc.startsWith('8000')) {
  //       this.gtin14UEnable = true;
  //       this.gtin12UEnable = true;
  //     }
  //   }

  //   // --- Internacionales
  //   if (!esNacional) {
  //     if (bandera === 0 && l7 !== 8) {
  //       if (valor === 'gtin13i') {
  //         this.gtin13UIEnable = true;
  //         this.gtin14UIEnable = true;
  //       }
  //       if (valor === 'gtin8i') {
  //         this.gtin14UIEnable = true;
  //       }
  //       if (valor === 'gtin12i') {
  //         this.gtin12UIEnable = true;
  //         this.gtin14UIEnable = true;
  //       }
  //     } else if (bandera === 2) {
  //       if (valor === 'gtin13i') {
  //         this.gtin13UIEnable = true;
  //         this.gtin14UIEnable = true;
  //       }
  //       if (valor === 'gtin8i') {
  //         this.gtin14UIEnable = true;
  //       }
  //       if (valor === 'gtin12i') {
  //         this.gtin12UIEnable = true;
  //         this.gtin14UIEnable = true;
  //       }
  //     } else if (l7 === 8 && gpc.startsWith('8900')) {
  //       this.gtin14UIEnable = true;
  //       this.gtin13UIEnable = true;
  //     } else if (l7 === 8 && gpc.startsWith('8000')) {
  //       this.gtin14UIEnable = true;
  //       this.gtin12UIEnable = true;
  //     }
  //   }
  // }




  generacioncodigos13s1(): void {
    const pais = '786';
    const idSeleccionado = this.formUV.value.gcp;
    const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);

    const codpre = objeto?.codpre;
    if (!codpre) {
      console.error('Prefijo no encontrado para el ID:', idSeleccionado);
      return;
    }

    const largoPrefijo = codpre.length;
    let inicio: number;
    let largo: number;

    // Determinar inicio y largo según la longitud del prefijo
    switch (largoPrefijo) {
      case 5: inicio = 9; largo = 4; break;
      case 6: inicio = 10; largo = 3; break;
      case 7: inicio = 11; largo = 2; break;
      case 8: inicio = 12; largo = 1; break;
      default:
        console.error('Longitud del prefijo inválida');
        return;
    }

    const codbarPrefix = pais + codpre;

    this.generacionCodigosService
      .getUltimoRestoPresentacion(codpre, codbarPrefix, inicio, largo, 13)
      .subscribe({
        next: (response) => {
          const serie2 = this.formUL.get('serie2')?.value || ''; // Obtener la serie actual desde el form
          this.secuencia = serie2 !== '' ? parseInt(serie2, 10) : response.data;
          const secuencia: number = response.data;
          console.log('Secuencia obtenida:', secuencia);

          const codigoGenerado = this.generarPresentacionesService.generarCodigoEAN13Completo(
            largoPrefijo,
            pais,
            codpre,
            secuencia
          );

          console.log('Código generado:', codigoGenerado);

          // Asignar al formulario UL
          this.campoGtinU = true;
          this.formUL.get('gtinUl')?.setValue(codigoGenerado);
        },
        error: (err) => {
          console.error('Error al obtener la secuencia:', err);
        }
      });
  }

  generacioncodigos12n(): void {
    const idSeleccionado = this.formUV.value.gcp;
    const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);

    const codpre = objeto?.codpre;
    if (!codpre) {
      console.error('⚠️ Prefijo no encontrado para el ID:', idSeleccionado);
      return;
    }

    this.npais = ''; // UPC nacional no lleva código país
    const largoPrefijo = codpre.length;

    let inicio: number;
    let largo: number;

    switch (largoPrefijo) {
      case 5: inicio = 7; largo = 5; break;
      case 6: inicio = 8; largo = 4; break;
      case 7: inicio = 9; largo = 3; break;
      default:
        console.error('⚠️ Longitud del prefijo inválida para GTIN-12');
        return;
    }

    const codbarPrefix = codpre;

    this.generacionCodigosService.getUltimoRestoPresentacion(
      codpre,
      codbarPrefix,
      inicio,
      largo,
      12 // longitud del GTIN final
    ).subscribe({
      next: (response) => {
        const serie2 = this.formUL.get('serie2')?.value || '';
        this.secuencia = serie2 !== '' ? parseInt(serie2, 10) : response.data;

        const codigoGenerado12 = this.generacionCodigosService.generarCodigo12N(
          codpre,
          this.secuencia,
          12
        );

        console.log('GTIN-12 generado:', codigoGenerado12);

        this.campoGtinU = true;
        this.formUL.get('gtinUl')?.setValue(codigoGenerado12);
      },
      error: (err) => {
        console.error('❌ Error al obtener secuencia para GTIN-12:', err);
      }
    });
  }



  guardarProductoPresentacion() {

    const datos = this.formUV.getRawValue();
    const datos1 = this.formUL.value;
    const cliente = this.clienteSeleccionado;
    const categoria = datos.categoria;
    const categoriaId = typeof categoria === 'object' && categoria !== null ? categoria.id_grupo_producto : 0;
    const secto = datos.sector;
    const sectorR = typeof secto === 'object' && secto !== null ? secto.id_sector : 0;
    const gtinForzado = this.formUL.get('gtinUl')?.value ?? '';
    console.log('📦 GTIN UL utilizado para codbar:', gtinForzado);

    console.log(secto);


    const nuevoProducto: ProductoRequest = {
      IdProducto: 0,
      Codpro: gtinForzado || '',
      Despro: datos1.descripcionu.toUpperCase() || '',
      Tippro: 'S',
      Codgru: datos.categoria?.id || 0,
      Codsec: 0,
      Coddep: 0,
      Codsub: 0,
      Coddiv: 0,
      Codmar: 0,
      Despro2: '',
      Uniman: datos.unidadMedida?.unidad || '',
      Feccre: new Date().toISOString(),
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
      Activo: true,
      ClasProd: '',
      Foto: datos.urlFoto || '',
      AltoRiesgo: false,
      PGasto: false,
      CtaProdGasto: '',
      RegSanitario: '',
      IdEmpresa: this.usuarioActual?.id_empresa ?? 1,
      Codbar: gtinForzado || ''
    };

    this.productoService.crearProducto(nuevoProducto).subscribe({
      next: (resp) => {
        const nuevoId = resp.data;
        console.log('✅ Producto creado con ID:', nuevoId);
        this.idProductoNuevo = nuevoId;
        // Construimos ProductoDatosAdicionales
        const adicionales = {
          IdProductoDatosAdicionales: 0,
          ClientesCodigo: cliente?.clientes_codigo || 0,
          IdPrefijos: datos.gcp,
          IdTipoCodigoGs1: 1 || 0,
          IdGrupoProducto: categoriaId,
          Peso1: datos.Peso,
          IdUsuario: this.usuarioActual?.id_usuario ?? 1,
          Facturar: '',
          Nombre: 'CODIGO:',
          Gtin: datos1.tipoGtinl,
          Target: '',
          Marca: datos.marca || '',
          Autfuncion: '',
          Registros: '',
          Obsc: datos.observacion || '',
          IdSector: sectorR,
          Contenido: (datos.contenido ?? '').toString(),
          Um: datos.unidadMedida?.unidad || '',
          Brick: datos.brick || '',
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
          SolFavorita: datos.empresas.favorita ? 1 : 0,
          SolRosado: datos.empresas.rosario ? 1 : 0,
          SolSantamaria: 0,
          SolTia: datos.empresas.tia ? 1 : 0,
          SolAmazon: datos.empresas.amazon ? 1 : 0,
          SolGoogle: datos.empresas.google ? 1 : 0,
          SolEbay: 0,
          SolOtros: datos.otrosSolicitantes || '',
          id_producto: nuevoId
        };

        this.productoAdicionalService.crearProductoDatosAdicionales(adicionales).subscribe({
          next: () => {
            console.log(adicionales);
            console.log('✅ Datos adicionales guardados');
            this.mostrarAlerta('Producto + datos adicionales guardados', '✔');
          },
          error: (err) => {
            console.error('❌ Error al guardar datos adicionales:', err);
            this.mostrarAlerta('Error al guardar datos adicionales', 'Error');
          }
        });
      },
      error: (err) => {
        console.error('❌ Error al crear el producto:', err);
        this.mostrarAlerta('Error al guardar producto', 'Error');
      }
    });
  }

  generacionCodigo148(): void {
    // Obtener el valor del indicador (equivalente a Text20.text)

    const indicador = this.formUL.get('indicador')?.value || '';
    const uv = this.formUV.get('gtinUv')?.value || '';
    const prefi = uv.substring(0, 7);
    if (indicador.length === 0 || prefi.length < 7) {
      console.error('Indicador o prefijo inválido');
      return;
    }

    const ean = indicador + '00000' + prefi;
    let iSum = 0;

    for (let i = 0; i < ean.length; i++) {
      const iDigit = parseInt(ean.charAt(i), 10);
      if (isNaN(iDigit)) continue;

      // Cálculo según posición par/impar basado en longitud del EAN
      if ((ean.length % 2 === 0 && (i + 1) % 2 !== 0) || (ean.length % 2 !== 0 && (i + 1) % 2 === 0)) {
        iSum += iDigit;
      } else {
        iSum += iDigit * 3;
      }
    }

    const iCheckSum = (10 - (iSum % 10)) % 10;
    const codigoFinal = ean + iCheckSum.toString();

    // Asignar resultado al campo gtinUl
    this.formUL.get('gtinUl')?.setValue(codigoFinal);
    console.log('GTIN-14 generado:', codigoFinal);
    this.campoGtinU = true;
  }
generacion14iiver14(): void {
  const gtinControl = this.formUL.get('gtinUl'); // Text21.text
  const valor = (gtinControl?.value || '').toString().trim();

  if (valor.length !== 13 || !/^\d+$/.test(valor)) {
    alert('Ingrese solo 13 Números!!!');
    gtinControl?.setValue('');
    gtinControl?.markAsTouched();
    gtinControl?.markAsDirty();
    return;
  }

  const ean = valor;
  let iSum = 0;

  const esPar = ean.length % 2 === 0; // aquí será false (13)

  for (let i = 0; i < ean.length; i++) {
    const iDigit = parseInt(ean.charAt(i), 10);
    if (isNaN(iDigit)) continue;

    // ✅ Para GTIN/EAN, el patrón depende de la paridad:
    // - Longitud impar (13): posiciones impares (1,3,5...) *3
    // - Longitud par  (12): posiciones impares (1,3,5...) *1, pares *3 (según se mida desde la izquierda)
    // Con tu forma de recorrer, esto queda así:
    const pos = i + 1;

    if (!esPar) {
      // 13 dígitos: impares *3, pares *1
      iSum += (pos % 2 !== 0) ? (iDigit * 3) : iDigit;
    } else {
      // 12/14/etc (si algún día lo usas): impares *1, pares *3
      iSum += (pos % 2 !== 0) ? iDigit : (iDigit * 3);
    }
  }

  const iCheckSum = (10 - (iSum % 10)) % 10;
  const codigoFinal = ean + iCheckSum.toString();

  this.formUL.patchValue({ gtinUl: codigoFinal });
  console.log('Código GTIN-14 generado:', codigoFinal);
}


  generacion12iiver14(): void {
    const input = this.formUL.get('gtinUl')?.value;

    if (!input || input.length !== 11) {
      this.formUL.get('gtinUl')?.setValue('');
      alert('Ingrese solo 11 Números!!!');
      return;
    }

    const ean = input.substring(0, 11);
    let iSum = 0;

    for (let i = 0; i < ean.length; i++) {
      const iDigit = parseInt(ean.charAt(i), 10);
      if (isNaN(iDigit)) continue;

      if ((i + 1) % 2 === 0) {
        iSum += iDigit;
      } else {
        iSum += iDigit * 3;
      }
    }

    const iCheckSum = (10 - (iSum % 10)) % 10;
    const codigoFinal = ean + iCheckSum.toString();

    this.formUL.get('gtinUl')?.setValue(codigoFinal);
    console.log('✅ Código GTIN-12 generado con dígito verificador:', codigoFinal);
  }

  generacion13iiver14(): void {
    const input = this.formUL.get('gtinUl')?.value;

    if (!input || input.length !== 12) {
      alert('Ingrese solo 12 Números!!!');
      this.formUL.get('gtinUl')?.setValue('');
      this.formUL.get('gtinUl')?.enable();
      return;
    }

    const ean = input.substring(0, 12);
    let iSum = 0;

    for (let i = 0; i < ean.length; i++) {
      const iDigit = parseInt(ean.charAt(i), 10);
      if (isNaN(iDigit)) continue;

      if ((i + 1) % 2 !== 0) {
        iSum += iDigit;
      } else {
        iSum += iDigit * 3;
      }
    }

    const iCheckSum = (10 - (iSum % 10)) % 10;
    const codigoFinal = ean + iCheckSum.toString();

    this.formUL.get('gtinUl')?.setValue(codigoFinal);
    console.log('✅ Código GTIN-13 generado:', codigoFinal);
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
    convertirAMayusculasUl(controlName: string): void {
    const control = this.formUL.get(controlName);
    if (control) {
      const valor = control.value || '';
      control.setValue(valor.toUpperCase());
    }
  }

  verificarExistenciaCodbar(): void {
    const codbar = this.formUV.get('gtinUv')?.value;

    if (!codbar) {
      console.warn('⚠️ No hay código de barras en el formulario.');
      return;
    }

    this.codigos14Service.contarPorCodbar(codbar).subscribe({
      next: (conteo) => {
        if (conteo > 0) {
          const total = conteo + 1;
          if (total >= 9) {
            alert(`❌ Solo puede existir hasta 8 presentaciones del producto.`);
            return;
          } else {
            // Suponiendo que tienes un campo llamado "indicador" en el form
            this.formUL.get('indicador')?.setValue(total);
          }
        } else {
          console.log(`✅ Código de barras ${codbar} no existe, puedes continuar.`);
        }
      },
      error: (err) => {
        console.error('❌ Error al verificar el código de barras:', err);
      }
    });
  }

  cargarClientePorId(id: number): void {
    console.log('🔍 ID recibido en cargarClientePorId:', id);

    this.clienteService.getClienteById(id).subscribe({
      next: (cliente) => {
        this.id_grupo_producto = cliente.idGrupoProducto;

        // Cargar solo el grupo específico del cliente
        this.grupoProductoService.obtenerGrupoPorId(this.id_grupo_producto).subscribe({
          next: (grupo) => {
            this.seleccionarCategoria(grupo);
            console.log('✅ Grupo producto obtenido:', grupo);
          },
          error: (err) => {
            console.error('❌ Error al obtener grupo producto:', err);
          }
        });
      },
      error: (err) => {
        console.error('❌ Error al obtener cliente:', err);
      }
    });
  }
  // cargarClientePorId(id: number): void {

  //   console.log('🔍 ID recibido en cargarClientePorId:', id); // 👈 AÑADE ESTO

  //   this.clienteService.getClienteById(id).subscribe({
  //     next: (cliente) => {
  //       this.id_grupo_producto = cliente.idGrupoProducto;

  //       this.grupoProductoService.obtenerGrupoPorId(this.id_grupo_producto).subscribe(grupo => {
  //         if (!this.gruposProducto || this.gruposProducto.length === 0) {
  //           this.grupoProductoService.obtenerGrupos().subscribe(data => {
  //             this.gruposProducto = data;
  //             this.seleccionarCategoria(grupo);
  //           });
  //         } else {
  //           this.seleccionarCategoria(grupo);
  //         }

  //         console.log('✅ Grupo producto obtenido:', grupo);
  //       });
  //     },
  //     error: (err) => {
  //       console.error('❌ Error al obtener cliente:', err);
  //     }
  //   });
  // }

  calcularDigitoVerificador12Manual(): void {
    const input = this.formUL.get('gtinUl')?.value;

    if (!input || input.length !== 11 || !/^\d+$/.test(input)) {
      this.mostrarAlerta('⚠️ Ingrese exactamente 11 dígitos numéricos', 'Error');

      return;
    }

    const ean = input;
    let suma = 0;

    for (let i = 0; i < ean.length; i++) {
      const digito = parseInt(ean.charAt(i), 10);

      // En GTIN-12: impares (pos 1,3,5,...) * 3, pares * 1
      if ((i + 1) % 2 === 1) {
        suma += digito * 3;
      } else {
        suma += digito;
      }
    }

    const dv = (10 - (suma % 10)) % 10;
    const codigoFinal = ean + dv.toString();

    console.log('✅ Código GTIN-12 con DV calculado:', codigoFinal);
    this.formUL.get('gtinUl')?.setValue(codigoFinal);
  }

  calcularDigitoVerificador14Manual(): void {
    const input = this.formUL.get('gtinUl')?.value;

    if (!input || input.length !== 13 || !/^\d+$/.test(input)) {
      this.mostrarAlerta('⚠️ Ingrese exactamente 13 dígitos numéricos para GTIN-14', 'Error');

      return;
    }

    let suma = 0;

    // Desde la derecha hacia la izquierda
    for (let i = 0; i < 13; i++) {
      const idx = 12 - i; // posición de derecha a izquierda
      const digito = parseInt(input.charAt(idx), 10);
      const peso = (i % 2 === 0) ? 3 : 1;
      suma += digito * peso;
    }

    const dv = (10 - (suma % 10)) % 10;
    const codigoFinal = input + dv.toString();

    console.log(`✅ GTIN-14 completo generado: ${codigoFinal} (DV = ${dv})`);
    this.formUL.get('gtinUl')?.setValue(codigoFinal);
  }
  calcularDigitoVerificador13Manual(): void {
    const input = this.formUL.get('gtinUl')?.value;

    if (!input || input.length !== 12 || !/^\d+$/.test(input)) {
      this.mostrarAlerta('⚠️ Ingrese exactamente 12 dígitos numéricos', 'Error');

      return;
    }

    const ean = input;
    let suma = 0;

    for (let i = 0; i < ean.length; i++) {
      const digito = parseInt(ean.charAt(i), 10);
      // Los dígitos en posiciones impares se multiplican por 1, en pares por 3
      suma += (i % 2 === 0) ? digito : digito * 3;
    }

    const dv = (10 - (suma % 10)) % 10;
    const codigoFinal = ean + dv.toString();

    console.log('✅ Código con DV calculado:', codigoFinal);
    this.formUL.get('gtinUl')?.setValue(codigoFinal);
  }

  generarGtin14DesdeUpc12(): void {
    const indicador = this.formUL.get('indicador')?.value || '';
    const upc12 = this.formUV.get('gtinUv')?.value || ''; // debe tener 12 dígitos

    if (this.bandera!== 2 || upc12.length !== 12 || !/^\d+$/.test(upc12)) {
      console.error('⚠️ Indicador o UPC inválido');
      return;
    }

    const base = indicador +"0"+ upc12.substring(0, 11); // 1 + 11 = 12 dígitos base

    let suma = 0;
    for (let i = 0; i < base.length; i++) {
      const dig = parseInt(base.charAt(i), 10);
      suma += (i % 2 === 0) ? dig * 3 : dig; // posición par/impar (0-based)
    }

    const dv = (10 - (suma % 10)) % 10;
    const gtin14 = base + dv;

    this.formUL.get('gtinUl')?.setValue(gtin14);
    console.log('✅ GTIN-14 generado desde UPC:', gtin14);
    this.campoGtinU = true;
  }

cargarParametroFacturaPorId(id: number): void {
  this.parametrosFacturaService.getByIdN(id).subscribe({
    next: (parametro) => {
      this.api = parametro?.texto ?? '';
      this.claveApi = parametro?.obs ?? '';

      console.log('? Parámetro cargado:', parametro);
    },
    error: (error) => {
      console.error('? Error al obtener el parámetro:', error);
    }
  });
}
  mostrarDialogoOtraPresentacion(): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: '',
        message: '¿Desea generar otra presentación?',
        type: 'info',
        confirmText: 'Sí',
        cancelText: 'No',
        showCancel: true
      }
    }).afterClosed().subscribe(result => {
      if (result === true) {
        this.limpiarUl();// 👈 función que puedes definir para preparar nuevo ingreso
      } else {
        this.salir();
        console.log('✅ Usuario finalizó sin nueva presentación');
      }
    });
  }
  onIndicadorBlur(): void {

  const { indicador } = this.formUL.getRawValue();
  const { gtinUv, codigoCliente } = this.formUV.getRawValue();

  const presentacion = parseInt(indicador, 10);

  if (!gtinUv || !codigoCliente || isNaN(presentacion)) {
    return; // no hacer nada si falta un dato
  }

  this.codigos14Service
  .filtrarCodigos14(codigoCliente, presentacion, gtinUv.trim())
  .subscribe(result => {
    console.log('Resultado del filtro:', result);
    console.log('Cantidad:', result.length); // 👈 aquí debería ser ≥ 1
    if (result.length > 0) {
      this.mostrarAlerta('⚠️ Factor ya existe!!!', 'Advertencia');
    }
  });
}

onFactorBlur(): void {
  // lo que ya hacías
  this.actualizarDescripcionUL();

  // nuevo: validar si ya existe
  this.verificarFactorExistente();
}
generarULBloqueado = false;
private verificarFactorExistente(): void {
  const factorStr = (this.formUL.get('factor')?.value ?? '').toString().trim();
  const factorNum = Number(factorStr);

  const unidadTexto = (this.formUL.get('tipoEmpaque')?.value ?? '')
    .toString()
    .trim()
    .toUpperCase();

  if (!factorStr || Number.isNaN(factorNum) || !unidadTexto) {
    return;
  }

  const codbarUv =
    (this.formUV.getRawValue().gtinUv ??
      this.route.snapshot.paramMap.get('codbar') ??
      '')
      .toString()
      .trim();

  if (!codbarUv) {
    return;
  }

  const factorCtrl = this.formUL.get('factor');

  this.codigos14Service
    .existePorCodbarFactorYUnidadTexto(codbarUv, factorNum, unidadTexto)
    .subscribe({
      next: (existe) => {
        if (existe) {
          factorCtrl?.setErrors({
            ...(factorCtrl.errors ?? {}),
            factorExistente: true
          });

          factorCtrl?.markAsTouched();
          factorCtrl?.updateValueAndValidity({ emitEvent: false });

          this.generarULBloqueado = true;

          this.mostrarAlerta(
            '⚠️ Ya existe una presentación con este Factor y Unidad para este producto.',
            'Advertencia'
          );

          return;
        }

        if (factorCtrl?.errors?.['factorExistente']) {
          const { factorExistente, ...rest } = factorCtrl.errors;

          factorCtrl.setErrors(
            Object.keys(rest).length ? rest : null
          );

          factorCtrl.updateValueAndValidity({ emitEvent: false });
        }

        this.generarULBloqueado = false;
      },
      error: (err) => {
        console.error('❌ Error verificando factor + unidad:', err);

        this.generarULBloqueado = true;

        this.mostrarAlerta(
          '❌ Error al verificar si ya existe el Factor con esa Unidad.',
          'Error'
        );
      }
    });
}

// ✅ ISO local: "YYYY-MM-DDTHH:mm:ss"  (sin Z, sin UTC)
private isoLocal(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ✅ SOLO fecha local: "YYYY-MM-DD"
private fechaLocal(d: Date = new Date()): string {
  return this.isoLocal(d).slice(0, 10);
}

}
