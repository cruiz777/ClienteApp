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
import { GeneracionCodigosService } from 'src/app/services/generacion-codigos.service';

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
      gtinInternacionalSeleccionado: ['']
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
  habilitarSerie(event: any): void {
    this.serieEditable = event.target.checked;
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


    console.log('✅ Entrando a generar()');

    const gcpId = this.formUV.get('gcp')?.value;
    if (!gcpId) {
      console.warn('⚠️ Prefijo (gcp) no seleccionado');
      return;
    }

    const prefijo = this.prefijos.find(p => p.id_prefijos === gcpId);
    if (!prefijo) {
      console.error('❌ Prefijo no encontrado en la lista');
      return;
    }
    const secuencia = 1; // valor simulado
    const gtinNacionalSeleccionado = this.formUV.get('gtinNacionalSeleccionado')?.value;
    const gtinInternacionalSeleccionado = this.formUV.get('gtinInternacionalSeleccionado')?.value;
    debugger
    ///////GENERA GTIN13 NACIONAL SIEMPRE QUE EL PREFIJO SEA NACIONAL Y TENGA BANDERA=0
    if (gtinNacionalSeleccionado === 'gtin13' && this.bandera === 0) {
      const codigoGenerado13N = this.generacionCodigosService.generarCodigo13(prefijo.codpre, secuencia);
      console.log('🎯 GTIN generado:', codigoGenerado13N);
      this.formUV.get('gtinUv')?.setValue(codigoGenerado13N);
    }
     ///////GENERA GTIN8 NACIONAL SIEMPRE QUE EL PREFIJO SEA NACIONAL Y TENGA BANDERA=0
    if (gtinNacionalSeleccionado === 'gtin8' && this.bandera === 0) {
      const codigoGenerado8N = this.generacionCodigosService.generarCodigo8('0817');
      console.log('🎯 GTIN generado:', codigoGenerado8N);
      this.formUV.get('gtinUv')?.setValue(codigoGenerado8N);
    }
     ///////GENERA GTIN12 UPC SIEMPRE QUE EL PREFIJO SEA NACIONAL Y TENGA BANDERA=2

    
    if (gtinNacionalSeleccionado === 'gtin12' && this.bandera === 2) {
      const codigoGenerado12N = this.generacionCodigosService.generarCodigo12N('055817',secuencia,6);
      console.log('🎯 GTIN generado:', codigoGenerado12N);
      this.formUV.get('gtinUv')?.setValue(codigoGenerado12N);
    }

     ///////REGISTRO GTIN13I UPC SIEMPRE QUE EL PREFIJO SEA NACIONAL 

   const numero=this.formUV.get('gtinUv');
   const gtin = this.formUV.get('gtinUv')?.value || '';
   const longitud = gtin.length;
    if (gtinInternacionalSeleccionado === 'gtin13') {

      const codigoGenerado13I = this.generacionCodigosService.generarCodigo12N('055817',secuencia,6);
      console.log('🎯 GTIN generado:', codigoGenerado13I);
      this.formUV.get('gtinUv')?.setValue(codigoGenerado13I);
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

}
