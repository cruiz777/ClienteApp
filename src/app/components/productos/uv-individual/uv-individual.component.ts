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
import { startWith, map } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { GeneracionCodigosService, SecuenciaResponse } from 'src/app/services/generacion-codigos.service';
import { stream } from 'exceljs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Validators } from '@angular/forms';

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
  pais: string = '';
  codigoprefijos: string = '';
  secuencia: number = 1;
  mensaje: string = '';
  serieEditable: boolean = false;

  unidades: string[] = ['Unidad', 'Litro', 'Kilogramo', 'Caja', 'Pack'];
  paises: string[] = ['Ecuador', 'Colombia', 'Perú', 'Chile'];
  sectores: string[] = ['Alimentos', 'Salud', 'Higiene', 'Bebidas'];



  constructor(
    private fb: FormBuilder,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private prefijoService: PrefijoService,
    private grupoProductoService: GrupoProductoService,
    private generacionCodigosService: GeneracionCodigosService,
    private _snackBar: MatSnackBar,
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
      gtinNacionalSeleccionado: [''],
      gtinInternacionalSeleccionado: [''],
      usarSerie: [false], // <- nuevo control
    });

    this.formUL = this.fb.group({
      gtinNacionalesUL: this.fb.group({
        gtin14: [false],
        gtin13: [false],
        gtin12: [false]
      }),
      gtinInternacionalesUL: this.fb.group({
        gtin14: [false],
        gtin13: [false],
        gtin12: [false]
      }),
      serie: [''],
      tipoEmpaque: [''],
      unidad: [''],
      indicador: [''],
      factor: [''],
      gtinUl: [''],
      tipoGtin: [''],
      observacion: ['']
    });

    this.cargarCliente();
    this.cargarGrupoProductos();

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
        this.pais = '786';
        this.generacionCodigosService.obtenerSecuencia(prefijo.codpre, this.pais).subscribe({
          next: (resp: SecuenciaResponse) => {
            this.formUV.get('serie')?.setValue(resp.data);
          },
          error: (err) => {
            console.error('Error al obtener secuencia GTIN-13:', err);
          }
        });

      } else if (gtin === 'gtin12') {
        this.pais = '';
        this.generacionCodigosService.obtenerSecuencia(prefijo.codpre, this.pais).subscribe({
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



  grabarTodo() {
    const datosUV = this.formUV.value;
    const datosUL = this.formUL.value;
    console.log('Datos UV:', datosUV);
    console.log('Datos UL:', datosUL);

  }


  generar() {

    const gcpId = this.formUV.get('gcp')?.value;
    if (!gcpId) {
      this.mostrarAlerta('No se selecciono prefijo', 'Error');
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
      this.pais = '786';

      this.generacionCodigosService.obtenerSecuencia(prefijo.codpre, this.pais).subscribe({
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
      const codigoGenerado8N = this.generacionCodigosService.generarCodigo8('0817');
      console.log('🎯 GTIN generado:', codigoGenerado8N);
      this.formUV.get('gtinUv')?.setValue(codigoGenerado8N);
    }

    const numero = this.formUV.get('gtinUv');
    const gtin = this.formUV.get('gtinUv')?.value || '';
    const longitud = gtin.length;

    ///////GENERA GTIN12 UPC SIEMPRE QUE EL PREFIJO SEA NACIONAL Y TENGA BANDERA=2
    debugger
    this.bandera = 2;
    if (gtinNacionalSeleccionado === 'gtin12' && this.bandera === 2) {
      this.pais = '';
      this.generacionCodigosService.obtenerSecuencia(prefijo.codpre, this.pais).subscribe({
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


    debugger
    if (gtinInternacionalSeleccionado === 'gtin12') {
      const gnumero = (this.formUV.get('gtinUv')?.value || '').substring(0, 11);
      const codigoGenerado12I = this.generacionCodigosService.validarYGenerarCodigo12(gnumero);
      console.log('🎯 GTIN generado:', codigoGenerado12I);
      this.formUV.get('gtinUv')?.setValue(codigoGenerado12I);
    }

    ///////REGISTRO GTIN8I UPC SIEMPRE QUE EL PREFIJO SEA NACIONAL 


    debugger
    if (gtinInternacionalSeleccionado === 'gtin8') {
      const gnumero = (this.formUV.get('gtinUv')?.value || '').substring(0, 7);
      const codigoGenerado12I = this.generacionCodigosService.validarYGenerarCodigo8(gnumero);
      console.log('🎯 GTIN generado:', codigoGenerado12I);
      this.formUV.get('gtinUv')?.setValue(codigoGenerado12I);
    }


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
  }
  salir(): void {
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
    const pais = this.pais || ''; // opcional

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
    debugger;

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



}
