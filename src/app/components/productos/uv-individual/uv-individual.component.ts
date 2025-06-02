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
import { Codigos14Service,Codigos14Request } from 'src/app/services/codigos14.service';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
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

  unidadesMedida: Umedida[] = [];
  unidadesMedidaFiltradas: Umedida[] = [];

  pais: Pais[] = [];
  paisCtrl = new FormControl('');
  paisFiltrados$!: Observable<Pais[]>;
  paisSeleccionado!: number;
  paisFiltrados: Pais[] = [];
  sectores: Sector[] = [];
  sectoresFiltrados: Sector[] = [];
  idProductoNuevo:number=0;
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
    private codigos14Service:Codigos14Service,
    private dialog: MatDialog,
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
      tipoGtin: [''],
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
      otrosSolicitantes: [''],
      empresas: this.fb.group({
        favorita: [false],
        mega: [false],
        amazon: [false],
        rosario: [false],
        tia: [false],
        google: [false]
      }),
      gtinNacionalSeleccionado: ['gtin13'],
      gtinInternacionalSeleccionado: [''],
      usarSerie: [false], // <- nuevo control
    });

    this.formUL = this.fb.group({

      gtinInternacionalULSeleccionado: [''],
      gtinNacionalULSeleccionado: ['gtin14u'],
      serie: [''],
      tipoEmpaque: ['CAJA'],
      unidad: ['UNIDAD'],
      indicador: ['1'],
      factor: [''],
      gtinUl: [''],
      tipoGtin: ['GTIN14'],
      descripcionu: ['']
    });

    this.cargarCliente();
    this.cargarGrupoProductos();
    this.getSectores();
    this.cargarPais();
    this.getUnidadesMedida();
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
    // Nacional - UL
this.formUL.get('gtinNacionalULSeleccionado')?.valueChanges.subscribe(valor => {
  if (valor) {
    this.formUL.get('gtinInternacionalULSeleccionado')?.reset();
    this.formUL.patchValue({ tipoGtinUl: this.obtenerNombreGTIN(valor) });
  }
});

// Internacional - UL
this.formUL.get('gtinInternacionalULSeleccionado')?.valueChanges.subscribe(valor => {
  if (valor) {
    this.formUL.get('gtinNacionalULSeleccionado')?.reset();
    this.formUL.patchValue({ tipoGtinUl: this.obtenerNombreGTIN(valor) });
  }
});
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

      if (gtin === 'gtin13') {
        this.npais = '786';
        this.generacionCodigosService.obtenerSecuencia(prefijo.codpre, this.npais).subscribe({
          next: (resp: SecuenciaResponse) => {
            this.formUV.get('serie')?.setValue(resp.data);
          },
          error: (err) => {
            console.error('Error al obtener secuencia GTIN-13:', err);
          }
        });

      } else if (gtin === 'gtin12') {
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





  cargarCliente(): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    if (cliente) {
      this.clienteSeleccionado = cliente;
      this.formUV.patchValue({
        codigoCliente: cliente.clientes_codigo || '',
        cliente: cliente.nomcli || '',
        ruc: cliente.ruc || '',
      });
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
      this.bandera = objeto.bandera;
    }
  }

  cargarGrupoProductos(): void {
    debugger
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
  }

  displayWithCategoria(categoria: GrupoProducto): string {
    return categoria ? ` ${categoria.desBrick}` : '';
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
      case 'gtin13': return 'GTIN-13';
      case 'gtin8': return 'GTIN-8';
      case 'gtin12': return 'GTIN-12';
      case 'gtin14': return 'GTIN-14';
      default: return '';
    }
  }



  grabarTodo(): void {
  const msg = this.modoEdicion ? 'actualizado' : 'creado';

  this.dialog.open(CustomMessageBoxComponent, {
    width: '400px',
    data: {
      title: '¿Desea confirmar?',
      message: `El código sera ${msg}. ¿Está seguro?`,
      type: 'question',
      confirmText: 'Sí, confirmar',
      cancelText: 'Cancelar',
      showCancel: true
    }
  }).afterClosed().subscribe(result => {
    if (result === true) {
      console.log('✅ Usuario confirmó');
      console.log('⏳ Iniciando grabarTodo...');

      const gtinNacionalSeleccionado = this.formUV.get('gtinNacionalSeleccionado')?.value;

      if (gtinNacionalSeleccionado === 'gtin8' && this.bandera === 0) {
        if (!this.prefijo8 || isNaN(parseInt(this.prefijo8))) {
          console.error('⚠️ prefijo8 inválido:', this.prefijo8);
          return;
        }

        const siguiente = (parseInt(this.prefijo8, 10) + 1).toString().padStart(this.prefijo8.length, '0');
        console.log('➡️ Siguiente prefijo:', siguiente);

        this.ncontrolService.actualizarNumeroControl(74, {
          numcon: siguiente,
          ocupado: false
        }).subscribe({
          next: (res) => {
            console.log('✅ Número de control actualizado correctamente:', res);
            this.continuarGrabado();
          },
          error: (err) => {
            console.error('❌ Error al actualizar número de control:', err);
          }
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
  }


  generar() {

    const gcpId = this.formUV.get('gcp')?.value;
    if (!gcpId) {
      this.mostrarAlerta('No se selecciono Prefijo', 'Error');
      return;
    }
    const categoriaId = this.formUV.get('categoria')?.value;
    if (!categoriaId) {
      this.mostrarAlerta('No se selecciono Categoria', 'Error');
      return;
    }
    const gtinNacional = this.formUV.get('gtinNacionalSeleccionado')?.value;
    const gtinInternacional = this.formUV.get('gtinInternacionalSeleccionado')?.value;

    if (!gtinNacional && !gtinInternacional) {
      this.mostrarAlerta('Debe seleccionar Tipo GTIN Nacional o Internacional', 'Error');
      return;
    }
    const prefijo = this.prefijos.find(p => p.id_prefijos === gcpId);
    if (!prefijo) {
      console.error('❌ Prefijo no encontrado en la lista');
      return;
    }
    const gtinNacionalSeleccionado = this.formUV.get('gtinNacionalSeleccionado')?.value;
    const gtinInternacionalSeleccionado = this.formUV.get('gtinInternacionalSeleccionado')?.value;

    ///////GENERA GTIN13 NACIONAL SIEMPRE QUE EL PREFIJO SEA NACIONAL Y TENGA BANDERA=0
    if (gtinNacionalSeleccionado === 'gtin13' && this.bandera === 0) {
      this.npais = '786';

      this.generacionCodigosService.obtenerSecuencia(prefijo.codpre, this.npais).subscribe({
        next: (resp: SecuenciaResponse) => {
          const serie = this.formUV.get('serie')?.value || ''; // Obtener la serie actual desde el form
          this.secuencia = serie !== '' ? parseInt(serie, 10) : resp.data; // Usar la serie si fue escrita manualmente
          const continuar = this.validarAfiliacion(this.secuencia); // validar límite

          if (!continuar) return;
          this.mensaje = resp.message;

          const codigoGenerado13N = this.generacionCodigosService.generarCodigo13(prefijo.codpre, this.secuencia);
          console.log('🎯 GTIN generado:', codigoGenerado13N);

          this.formUV.get('gtinUv')?.setValue(codigoGenerado13N);
        },
        error: (err) => {
          console.error('Error al obtener secuencia', err);
          this.mensaje = 'Error al generar la secuencia';
        }
      });
    }


    ///////GENERA GTIN8 NACIONAL SIEMPRE QUE EL PREFIJO SEA NACIONAL Y TENGA BANDERA=0
    if (gtinNacionalSeleccionado === 'gtin8' && this.bandera === 0) {
      this.ncontrolService.obtenerNumeroControlMinPorId(74).subscribe({
        next: (data) => {
          console.log('📦 Datos recibidos del servicio:', data);
          this.prefijo8 = data.numcon;

          const codigoGenerado8N = this.generacionCodigosService.generarCodigo8(this.prefijo8);
          console.log('🎯 GTIN generado:', codigoGenerado8N);
          this.formUV.get('gtinUv')?.setValue(codigoGenerado8N);

          // Si necesitas validar longitud o hacer algo más con el campo:
          const gtin = this.formUV.get('gtinUv')?.value || '';
          const longitud = gtin.length;
          console.log('📏 Longitud:', longitud);
        },
        error: (err) => {
          console.error('❌ Error al obtener el número de control:', err);
        }
      });
    }


    ///////GENERA GTIN12 UPC SIEMPRE QUE EL PREFIJO SEA NACIONAL Y TENGA BANDERA=2

    if (gtinNacionalSeleccionado === 'gtin12' && this.bandera === 2) {
      this.npais = '';
      this.generacionCodigosService.obtenerSecuencia(prefijo.codpre, this.npais).subscribe({
        next: (resp: SecuenciaResponse) => {
          this.secuencia = resp.data;
          this.mensaje = resp.message;

          const longitud = this.formUV.get('gtinUv')?.value?.length || 0;
          console.log(longitud);
          console.log(prefijo.codpre);
          console.log(this.secuencia);
          const codigoGenerado12N = this.generacionCodigosService.generarCodigo12N(prefijo.codpre, this.secuencia, longitud);

          console.log('🎯 GTIN generado:', codigoGenerado12N);
          this.formUV.get('gtinUv')?.setValue(codigoGenerado12N);
        },
        error: (err) => {
          console.error('Error al obtener secuencia', err);
          this.mensaje = 'Error al generar la secuencia';
        }
      });


    }




    ///////REGISTRO GTIN13I UPC SIEMPRE QUE EL  



    if (gtinInternacionalSeleccionado === 'gtin13') {
      const gnumero = (this.formUV.get('gtinUv')?.value || '').substring(0, 12);
      const codigoGenerado13I = this.generacionCodigosService.validarYGenerarCodigo13i(gnumero);
      console.log('🎯 GTIN generado:', codigoGenerado13I);
      this.formUV.get('gtinUv')?.setValue(codigoGenerado13I);
    }


    ///////REGISTRO GTIN8I UPC SIEMPRE QUE EL PREFIJO SEA NACIONAL 

    if (gtinInternacionalSeleccionado === 'gtin12') {
      const gnumero = (this.formUV.get('gtinUv')?.value || '').substring(0, 11);
      const codigoGenerado12I = this.generacionCodigosService.validarYGenerarCodigo12(gnumero);
      console.log('🎯 GTIN generado:', codigoGenerado12I);
      this.formUV.get('gtinUv')?.setValue(codigoGenerado12I);
    }

    ///////REGISTRO GTIN8I UPC SIEMPRE QUE EL PREFIJO SEA NACIONAL 

    if (gtinInternacionalSeleccionado === 'gtin8') {
      const gnumero = (this.formUV.get('gtinUv')?.value || '').substring(0, 7);
      const codigoGenerado12I = this.generacionCodigosService.validarYGenerarCodigo8(gnumero);
      console.log('🎯 GTIN generado:', codigoGenerado12I);
      this.formUV.get('gtinUv')?.setValue(codigoGenerado12I);
    }


    this.campoGtin = true;
  }


  limpiarCampos(): void {

    this.formUV.reset();
    this.formUL.reset();

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
        alert('¡Ya no puede generar más códigos, necesita afiliarse!');
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

    if (tipo === 'gtin12') {
      longitud = 11;
    } else if (tipo === 'gtin8') {
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
    return unidad ? `${unidad.descripcion}` : '';
  }

  seleccionarUnidadMedida(unidad: Umedida): void {
    this.formUV.get('unidadMedida')?.setValue(unidad);
  }

  limpiarUnidadMedida(): void {
    this.formUV.get('unidadMedida')?.reset();
  }

  guardarProducto() {

    const datos = this.formUV.value;
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
      IdEmpresa: 1,
      Codbar: datos.gtinUv || ''
    };

    this.productoService.crearProducto(nuevoProducto).subscribe({
      next: (resp) => {
        const nuevoId = resp.data;
        console.log('✅ Producto creado con ID:', nuevoId);
        this.idProductoNuevo=nuevoId;
        // Construimos ProductoDatosAdicionales
        const adicionales = {
          IdProductoDatosAdicionales: 0,
          ClientesCodigo: cliente?.clientes_codigo || 0,
          IdPrefijos: datos.gcp,
          IdTipoCodigoGs1: 1 || 0,
          IdGrupoProducto: categoriaId,
          Peso1: datos.Peso,
          IdUsuario: 2, // o el id de usuario actual
          Facturar: '',
          Nombre: datos.descripcion || '',
          Gtin: 'GTIN13',
          Target: '',
          Marca: datos.marca || '',
          Autfuncion: '',
          Registros: '',
          Obsc: datos.observacion || '',
          IdSector: sectorR,
          Contenido: datos.contenido || '',
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
  const tipoEmpaque = this.formUL.get('tipoEmpaque')?.value || '';
  const factor = this.formUL.get('factor')?.value || '';
  const unidad = this.formUL.get('unidad')?.value || '';

  const descripcionUL = `${descripcion} ${tipoEmpaque} ${factor} ${unidad}`;
  this.formUL.get('descripcionu')?.setValue(descripcionUL);
}
generarUL(): void {
  const tipoSeleccionado = this.formUL.get('gtinNacionalULSeleccionado')?.value;

  if (tipoSeleccionado === 'gtin14u') {
    console.log('✔️ GTIN-14U seleccionado');

    const indicador = this.formUL.get('indicador')?.value || '1';
    const gtinUv = this.formUV.get('gtinUv')?.value || '';

    const codigoGenerado = this.generacionCodigosService.generarCodigo14(indicador, gtinUv);
    this.formUL.get('gtinUl')?.setValue(codigoGenerado);
    this.campoGtinU = true;
  }
}

grabarTodoUL(): void {
  const msg = this.modoEdicion ? 'actualizado' : 'creado';

  this.dialog.open(CustomMessageBoxComponent, {
    width: '400px',
    data: {
      title: '¿Desea confirmar?',
      message: `El código sera ${msg}. ¿Está seguro?`,
      type: 'question',
      confirmText: 'Sí, confirmar',
      cancelText: 'Cancelar',
      showCancel: true
    }
  }).afterClosed().subscribe(result => {
    if (result === true) {
      console.log('✅ Usuario confirmó');

      const datosUV = this.formUV.value;
      const datosUL = this.formUL.value;

      const nuevoCodigo14: Codigos14Request = {
        id_codigos14: 0,
        codbar: datosUV.gtinUv || '',
        id_prefijos: datosUV.gcp || 0,
        clientes_codigo: this.clienteSeleccionado?.clientes_codigo || 0,
        presentacion: 0,
        unidad: datosUL.factor || '',
        descripcion: datosUL.descripcionu || '',
        g14: datosUL.gtinUl || '',
        largo: 0,
        ancho: 0,
        profundidad: 0,
        peso: 0,
        fecha: new Date().toISOString().slice(0, 10),
        foto: datosUV.urlFoto || '',
        activo: true,
        id_usuario: 2,
        codpro: datosUV.gtinUv || '',
        facturar: '',
        nombre: datosUV.descripcion || '',
        gtin: 'GTIN14',
        target: '',
        marca: datosUV.marca || '',
        sector: datosUV.sector?.descripcion || '',
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

    } else {
      console.log('❌ Usuario canceló');
    }
  });
}



}
