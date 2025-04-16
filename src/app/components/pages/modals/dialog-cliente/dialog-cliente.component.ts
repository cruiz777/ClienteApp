import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { GrupoEmpresaService, GrupoEmpresa } from '../../../../services/grupo-empresa.service';
import { GrupoProductoService, GrupoProducto } from '../../../../services/grupo-producto.service';
import { RucService } from '../../../../services/ruc.service';
import { Ciudad, CiudadService } from '../../../../services/ciudad.service';
import { map, startWith } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-dialog-cliente',
  templateUrl: './dialog-cliente.component.html',
  styleUrls: ['./dialog-cliente.component.css']
})
export class DialogClienteComponent implements OnInit {
  formCliente!: FormGroup;
  selectedTab: number = 0;

  grupos: GrupoEmpresa[] = [];
  grupoCtrl = new FormControl('');
  gruposFiltrados$!: Observable<GrupoEmpresa[]>;
  grupoSeleccionado!: number;

  gruposProducto: GrupoProducto[] = [];
  grupoProductoCtrl = new FormControl('');
  gruposProductoFiltrados$!: Observable<GrupoProducto[]>;
  grupoProductoSeleccionado!: number;
  fechaIngreso: Date = new Date();
  razonSocial = '';
  nombreRepresentante = '';
  ciudad: Ciudad[] = [];
  ciudadCtrl = new FormControl('');
  ciudadFiltrados$!: Observable<Ciudad[]>;
  ciudadSeleccionado!: number;
  esPasaporte = false;
  constructor(
    private fb: FormBuilder,
    private grupoService: GrupoEmpresaService,
    private grupoProductoService: GrupoProductoService,
    private rucService: RucService,
    private ciudadService: CiudadService
  ) { }

  ngOnInit(): void {
    this.initFormulario();
    this.cargarGrupos();
    this.cargarGruposProducto();
    this.cargarCiudad();
  }

  initFormulario(): void {
    this.formCliente = this.fb.group({
      paso1: this.fb.group({
        codigo: [''],
        nombre: [''],
        ruc: [''],
        categoriaIndividual: [false],
        categoriaIndustrial: [false],
        grupo: [''],
        subgrupo: ['']
      }),
      paso2: this.fb.group({
        direccion: [''],
        p_emision: [''],
        caja: [''],
        razonSocial: ['']
      }),
      paso3: this.fb.group({
        contactoNombre: [''],
        contactoTelefono: [''],
        contactoCorreo: ['']
      }),
      paso4: this.fb.group({
        observaciones: ['']
      })
    });
  }

  get paso1Form(): FormGroup {
    return this.formCliente.get('paso1') as FormGroup;
  }

  get paso2Form(): FormGroup {
    return this.formCliente.get('paso2') as FormGroup;
  }

  get paso3Form(): FormGroup {
    return this.formCliente.get('paso3') as FormGroup;
  }

  get paso4Form(): FormGroup {
    return this.formCliente.get('paso4') as FormGroup;
  }

  guardar(): void {
    const datos = {
      ...this.paso1Form.value,
      ...this.paso2Form.value,
      ...this.paso3Form.value,
      ...this.paso4Form.value
    };
    console.log('Datos del cliente:', datos);
  }

  cargarGrupos(): void {
    this.grupoService.obtenerGrupos().subscribe(data => {
      this.grupos = data;
      this.gruposFiltrados$ = this.grupoCtrl.valueChanges.pipe(
        startWith(''),
        map(valor => this.filtrarGrupos(valor || ''))
      );
    });
  }

  filtrarGrupos(valor: string): GrupoEmpresa[] {
    const filtro = valor.toLowerCase();
    return this.grupos.filter(grupo =>
      `${grupo.codigo} - ${grupo.nombre}`.toLowerCase().includes(filtro)
    );
  }

  seleccionarGrupo(nombre: string): void {
    const grupo = this.grupos.find(g => `${g.codigo} - ${g.nombre}` === nombre);
    if (grupo) {
      this.paso1Form.get('grupo')?.setValue(grupo.id_grupo_empresa);
    }
  }

  cargarGruposProducto(): void {
    this.grupoProductoService.obtenerGrupos().subscribe(data => {
      this.gruposProducto = data;
      this.gruposProductoFiltrados$ = this.grupoProductoCtrl.valueChanges.pipe(
        startWith(''),
        map(valor => {
          console.log('Filtrando subgrupo por:', valor);
          return this.filtrarGruposProducto(valor || '');
        })
      );
    });
  }

  filtrarGruposProducto(valor: string | GrupoProducto): GrupoProducto[] {
    const filtro = typeof valor === 'string' ? valor.toLowerCase() : valor?.desBrick?.toLowerCase() || '';

    return this.gruposProducto.filter(g =>
      g.codigo.toLowerCase().includes(filtro) ||
      g.brick.toLowerCase().includes(filtro) ||
      g.desBrick.toLowerCase().includes(filtro)
    );
  }


  displayWithGrupoProducto(grupo: GrupoProducto): string {
    return grupo ? `${grupo.codigo} - ${grupo.brick} - ${grupo.desBrick}` : '';
  }

  seleccionarGrupoProducto(valor: string): void {
    const grupoProducto = this.gruposProducto.find(g => `${g.codigo} - ${g.desBrick}` === valor);
    if (grupoProducto) {
      this.paso1Form.get('subgrupo')?.setValue(grupoProducto.id_grupo_producto);
    }
  }
  limpiarGrupoProducto(): void {
    this.grupoProductoCtrl.setValue('');
    this.paso1Form.get('subgrupo')?.reset();
  }
  soloNumeros(event: KeyboardEvent) {
    const charCode = event.which ?? event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault(); // Bloquea letras o símbolos
    }
  }
  buscarRuc(ruc: string): void {
    this.rucService.obtenerDatosRuc(ruc).subscribe(data => {
      this.razonSocial = data.razonSocial;
      this.nombreRepresentante = data.nombre;
      console.log(`✅ Hola`, data, this.razonSocial);
    });
  }
  get rucControl(): FormControl {
    return this.paso1Form.get('ruc') as FormControl;
  }
  cargarCiudad(): void {
    this.ciudadService.obtenerCiudad().subscribe(data => {
      this.ciudad = data;
      this.ciudadFiltrados$ = this.ciudadCtrl.valueChanges.pipe(
        startWith(''),
        map(valor => {
          console.log('Filtrando ciudad por:', valor);
          return this.filtrarCiudad(valor || '');
        })
      );
    });
  }

  filtrarCiudad(valor: string | Ciudad): Ciudad[] {
    const filtro = typeof valor === 'string' ? valor.toLowerCase() : valor?.ciudad.toLowerCase() || '';

    return this.ciudad.filter(g =>
      g.ciudad.toLowerCase().includes(filtro)
    );

  }



  displayWithciudad(ciudad: Ciudad): string {
    return ciudad ? `${ciudad.ciudad} - ${ciudad.canton} - ${ciudad.provincia}` : '';
  }

  seleccionarCiudad(ciudad: Ciudad): void {
    this.paso2Form.get('ciudad')?.setValue(ciudad.id_ciudad);
  }
  limpiarCiudad(): void {
    this.ciudadCtrl.setValue('');
    this.paso2Form.get('ciudad')?.reset();
  }



  actualizarValidacionRuc(): void {

    if (this.esPasaporte) {
      this.rucControl.clearValidators();
    } else {
      this.rucControl.setValidators([
        control => {
          const valor = control.value;
          const valido = /^\d{10}$/.test(valor) || /^\d{13}$/.test(valor);
          return valor && valido ? null : { invalidLength: true };
        }
      ]);
    }
    this.rucControl.updateValueAndValidity();
  }

  // Evento para buscar RUC o cédula automáticamente
  onRucBlur(): void {
    const valor = this.rucControl.value;
    if (!this.esPasaporte && /^\d{13}$/.test(valor)) {
      this.buscarRuc(valor);
    } else if (!this.esPasaporte && /^\d{10}$/.test(valor)) {
      this.buscarCedula(valor);
    }
  }



  buscarCedula(cedula: string): void {
    console.log('🔎 Buscando Cédula:', cedula);
    // llamada al servicio
  }


}