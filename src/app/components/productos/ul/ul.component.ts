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
import { Router } from '@angular/router';
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
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';
import * as moment from 'moment';
@Component({
  selector: 'app-ul',
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
  templateUrl: './ul.component.html',
  styleUrl: './ul.component.css'
})
export class UlComponent implements OnInit {
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


  unidadesMedida: Umedida[] = [];
  unidadesMedidaFiltradas: Umedida[] = [];

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
  usuarioActual = this.usuarioService.getUsuarioActual();
  idProducto: number = 0;
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
    private route: ActivatedRoute
  ) { }



  ngOnInit(): void {
    const codbar = this.route.snapshot.paramMap.get('codbar');
    console.log('GTIN recibido:', codbar);
    this.formUV = this.fb.group({
      codigoCliente: [''],
      cliente: [''],
      ruc: [''],
      gcp: [{ value: null, disabled: true }],
      gln: [''],
      serie: [''],
      gtinUv: [''],
      tipoGtin: ['GTIN-13'],
      descripcion: [''],
      marca: [''],
      contenido: [''],
      unidadMedida: [{ value: null, disabled: true }],
      categoria: [{ value: null, disabled: true }],
      brick: [''],
      pais: [{ value: null, disabled: true }],
      sector: [{ value: null, disabled: true }],
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
      gtinNacionalSeleccionado: [{ value: null, disabled: true }],
      gtinInternacionalSeleccionado: [{ value: null, disabled: true }],
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
      tipoGtin: ['GTIN-14'],
      descripcionu: [''],
      usarSerie2: [false]
    });

    this.cargarCliente();
    this.cargarGrupoProductos();
    this.getSectores();
    this.cargarPais();
    this.getUnidadesMedida();
    this.cargarProducto();
    this.formUV.get('usarSerie')?.disable();
    this.formUV.get('empresas')?.disable();
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
        this.formUL.patchValue({ tipoGtin: this.obtenerNombreGTIN(valor) });

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
        this.formUL.patchValue({ tipoGtin: this.obtenerNombreGTIN(valor) });

        if (valor === 'gtin13ui' || valor === 'gtin12ui') {
          console.log('✅ Asignando indicador = 0');
          this.formUL.patchValue({ indicador: '0' });
        } else if (valor === 'gtin14ui') {
          console.log('✅ Asignando indicador = 1');
          this.formUL.patchValue({ indicador: '1' });
        }
      }
    });




    this.activarUL();
    this.limpiarUl();
  }

  activarUL(): void {
    this.formUL.enable(); // 👈 Activa todo el formUL
    this.botonNuevoDeshabilitado = false;
    this.botonGenerarULDeshabilitado = false;

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
        this.generacionCodigosService.obtenerSecuencia(prefijo.codpre, this.npais).subscribe({
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
        this.formUL.get('serie2')?.setValue('SERIE-UL-GENERICA');
      }

    } else {
      this.formUL.get('serie2')?.reset();
    }
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
    const idSeleccionado = this.formUV.getRawValue().gcp;

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
      case 'UPC': return 'GTIN-12';
      case 'GTIN-14': return 'GTIN-14';
      case 'GTIN-13I': return 'GTIN-13I';
      case 'GTIN-8I': return 'GTIN-8I';
      case 'GTIN-12I': return 'GTIN-12I';
      case 'GTIN-14I': return 'GTIN-14I';
      default: return '';
    }
  }






  limpiarUl(): void {
    // Limpiar todos los campos de UL
    this.formUL.patchValue({
      tipoGtin: 'GTIN-14',
      descripcionu: '',
      factor: '',
      tipoEmpaque: 'CAJA',
      unidad: 'UNIDADES',
      indicador: '1',
      gtinUl: '',

      gtinNacionalULSeleccionado: 'gtin14u',


    });

    // Resetear botones
    this.botonGenerarULDeshabilitado = false;
    this.botonGrabarULDeshabilitado = true;

    // Obtener GTIN del formulario UV
    const gtin = this.route.snapshot.paramMap.get('codbar');

    // Verificar si existe el GTIN antes de continuar
    if (gtin) {
      this.verificarExistenciaCodbar();
    } else {
      console.warn('⚠️ No se encontró GTIN UV al limpiar UL.');
    }
    this.campoGtinU = false;
  }


  salir(): void {
    this.router.navigate(['/menuProductos/nuevoProducto']); // Redirecciona a /pages/clientes
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
    const unidadObj = this.formUV.get('unidadMedida')?.value;
    const unidadu = unidadObj?.unidad || '';
    const tipoEmpaque = this.formUL.get('tipoEmpaque')?.value || '';
    const factor = this.formUL.get('factor')?.value || '';
    const unidad = this.formUL.get('unidad')?.value || '';


    const descripcionUL = `${descripcion} ${marca} ${contenido}  ${unidadu} ${tipoEmpaque} ${factor} ${unidad}`;
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
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    //generacion de 13 a 13 nacional
    if (gtinPrincipal == 'GTIN-13' && tipoSeleccionado === 'gtin13u') {
      this.generacioncodigos13s1();
      this.campoGtinU = true;
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-13' && tipoSeleccionado === 'gtin13ui') {
      this.calcularDigitoVerificador13Manual();
      this.campoGtinU = true;
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-13' && tipoSeleccionado === 'gtin12ui') {
      this.calcularDigitoVerificador12Manual();
      this.campoGtinU = true;
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-13' && tipoSeleccionado === 'gtin14ui') {
      this.calcularDigitoVerificador14Manual();
      this.campoGtinU = true;
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    if (gtinPrincipal == 'GTIN-8' && tipoSeleccionado === 'gtin14u') {
      this.generacionCodigo148();
      this.campoGtinU = true;
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-8' && tipoSeleccionado === 'gtin13u') {
      this.generacioncodigos13s1();
      this.campoGtinU = true;
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
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    //genero de 13i a 13 n

    if (gtinPrincipal == 'GTIN-13I' && tipoSeleccionado === 'gtin13u') {
      this.generacioncodigos13s1();
      this.campoGtinU = true;
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    if (gtinPrincipal == 'GTIN-13I' && tipoSeleccionado === 'gtin14ui') {
      this.generacion14iiver14();
      this.campoGtinU = true;
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-13I' && tipoSeleccionado === 'gtin13ui') {
      this.generacion13iiver14();
      this.campoGtinU = true;
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-13I' && tipoSeleccionado === 'gtin12ui') {
      this.generacion12iiver14();
      this.campoGtinU = true;
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    // generar g8i a g14

    if (gtinPrincipal == 'GTIN-8I' && tipoSeleccionado === 'gtin14u') {
      this.generacionCodigo148();
      this.campoGtinU = true;
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    ///gtin 8i internaciona al gtin 13 n
    if (gtinPrincipal == 'GTIN-8I' && tipoSeleccionado === 'gtin13u') {
      this.generacioncodigos13s1();
      this.campoGtinU = true;
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    //////
    if (gtinPrincipal == 'GTIN-8I' && tipoSeleccionado === 'gtin14ui') {
      this.generacion14iiver14();
      this.campoGtinU = true;
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    if (gtinPrincipal == 'GTIN-8I' && tipoSeleccionado === 'gtin13ui') {
      this.generacion13iiver14();
      this.campoGtinU = true;
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-8I' && tipoSeleccionado === 'gtin12ui') {
      this.generacion12iiver14();
      this.campoGtinU = true;
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
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-12I' && tipoSeleccionado === 'gtin13u') {
      this.generacioncodigos13s1();
      this.campoGtinU = true;
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-12I' && tipoSeleccionado === 'gtin14ui') {
      this.generacion14iiver14();
      this.campoGtinU = true;
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }

    if (gtinPrincipal == 'GTIN-12I' && tipoSeleccionado === 'gtin13ui') {
      this.generacion13iiver14();
      this.campoGtinU = true;
      this.botonGenerarULDeshabilitado = true;
      this.botonGrabarULDeshabilitado = false;
    }
    if (gtinPrincipal == 'GTIN-12I' && tipoSeleccionado === 'gtin12ui') {
      this.generacion12iiver14();
      this.campoGtinU = true;
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
          type: 'question',
          confirmText: 'Sí, confirmar',
          cancelText: 'Cancelar',
          showCancel: true
        }
      }).afterClosed().subscribe(result => {
        if (result === true) {
          accion();
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
      id_producto: this.idProducto
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








  generacioncodigos13s1(): void {
    const pais = '786';
    const idSeleccionado = this.formUV.getRawValue().gcp;

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

    for (let i = 0; i < ean.length; i++) {
      const iDigit = parseInt(ean.charAt(i), 10);
      if (isNaN(iDigit)) continue;

      const esPar = ean.length % 2 === 0;

      if ((esPar && (i + 1) % 2 === 0) || (!esPar && (i + 1) % 2 !== 0)) {
        iSum += iDigit;
      } else {
        iSum += iDigit * 3;
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

  verificarExistenciaCodbar(): void {

    const codbar = this.route.snapshot.paramMap.get('codbar');
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

    this.productoService.buscarPorCodbar(codbar).pipe(take(1)).subscribe({
      next: (producto) => {
        if (!producto) {
          console.warn('⚠️ Producto no encontrado');
          return;
        }
        console.log(producto);
        this.idProducto = producto.IdProducto;
        this.cargarTipoGtin(producto);
        this.cargarUnidadesMedida(producto);
        this.cargarSector(producto);
        this.cargarPaisDesdeProducto(producto);

        // Cargar prefijos por cliente
        const codigoCliente: number = Number(producto.clienteCodigo || producto.clienteCodigo);
        this.prefijoService.obtenerPorClienteCodigo(codigoCliente).pipe(take(1)).subscribe({
          next: (prefijos) => {
            this.prefijos = prefijos;

            const prefijoCoincidente = this.prefijos.find(p => p.codpre === producto.codpre);
            if (prefijoCoincidente) {
              this.formUV.get('gcp')?.setValue(prefijoCoincidente.id_prefijos);
              this.formUV.get('gln')?.setValue(prefijoCoincidente.gln);
              //this.onPrefijoBlur();
            } else {
              console.warn('⚠️ No se encontró prefijo coincidente con codpre:', producto.codpre);
            }

            // Cargar grupos y seleccionar el grupo correspondiente
            this.grupoProductoService.obtenerGrupos().pipe(take(1)).subscribe({
              next: (grupos) => {
                this.gruposProducto = grupos;

                const grupo = this.gruposProducto.find(g =>
                  g.id_grupo_producto === Number(producto.idgrupoproducto)
                );
                console.log(producto);
                if (grupo) {
                  this.formUV.get('categoria')?.setValue(grupo);
                  this.formUV.get('brick')?.setValue(grupo.brick);
                } else {
                  console.warn('⚠️ No se encontró grupo coincidente con idgrupoproducto:', producto.idgrupoproducto);
                }

                // Asignar los demás valores al formulario
                this.formUV.patchValue({
                  descripcion: producto.Despro || '',
                  marca: producto.marca || '',
                  contenido: producto.contenido || '',
                  unidadesMedida: producto.unidad || '',
                  //pais: producto.pais || 'EC',
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

              },
              error: (err) => {
                console.error('❌ Error al cargar grupos de producto:', err);
              }
            });
          },
          error: (err) => {
            console.error('❌ Error al cargar prefijos:', err);
          }
        });
      },
      error: (err) => {
        console.error('❌ Error al cargar producto:', err);
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



}
