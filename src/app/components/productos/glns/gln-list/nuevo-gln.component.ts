// GLNComponent unificado con navegación, paso a paso y GLNs por prefijo
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { TipoLocalizacionService } from 'src/app/services/tipo-localizacion.service';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { CiudadService } from 'src/app/services/ciudad.service';
import { TipoLocalizacionResponse } from 'src/app/interfaces/responses/tipo-localizacion-response';
import { PrefijoClienteResponse } from 'src/app/interfaces/responses/PrefijoClienteResponse';
import { Cliente } from 'src/app/interfaces/cliente';
import { CiudadResumen } from 'src/app/interfaces/responses/ciudad-response';
import { combineLatest, distinctUntilChanged, startWith } from 'rxjs';
import { GlnRequest, GlnResponse, GlnService } from 'src/app/services/gln.service';

@Component({
  selector: 'app-nuevo-gln',
  templateUrl: './nuevo-gln.component.html',
  styleUrls: ['./nuevo-gln.component.css']
})
export class GlnComponent implements OnInit {
  formGln!: FormGroup;
  pasoActual: number = 1;

  tiposLocalizacion: TipoLocalizacionResponse[] = [];
  prefijos: PrefijoClienteResponse[] = [];
  ciudades: CiudadResumen[] = [];
  ciudadesFiltradas: CiudadResumen[] = [];
  paises: { id: number; nombre: string }[] = [];
  provincias: { id: number; nombre: string }[] = [];
  provinciasFiltradas: { id: number; nombre: string }[] = [];
  cantones: { id: number; nombre: string }[] = [];

  clienteActual: Cliente | null = null;

  glnsDelPrefijo: PrefijoClienteResponse[] = [];
  glnIndex: number = 0;
  alertaGln: string | null = null;
  modoEdicion: boolean = false;

  constructor(
    private fb: FormBuilder,
    private prefijoService: PrefijoService,
    private tipoLocalizacionService: TipoLocalizacionService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private ciudadService: CiudadService,
    private glnService: GlnService
  ) {}

  compareCiudad(a: any, b: any): boolean {
    return a != null && b != null && +a === +b;
  }

  ngOnInit(): void {
    this.inicializarFormulario();
    this.clienteActual = this.clienteSeleccionadoService.obtenerClienteActual();

    if (this.clienteActual) {
      const clienteCodigo = this.clienteActual.clientes_codigo;

      this.formGln.patchValue({
        clientesCodigo: clienteCodigo,
        documentoIdentidad: this.clienteActual.ruc,
        nomCli: this.clienteActual.nomcli
      });

      this.tipoLocalizacionService.getAll().subscribe({
        next: (res) => this.tiposLocalizacion = res.data,
        error: (err) => console.error('❌ Error al cargar tipos de localización', err)
      });

      this.prefijoService.obtenerPrefijosPorClienteCodigo(clienteCodigo).subscribe({
        next: (res) => {
          this.prefijos = res;
          if (res.length > 0) {
            this.formGln.patchValue({
              glnPrefijogs1: res[0].codpre,
              glnOrigenprefijo: res[0].origenPrefijo,
              idPrefijos: res[0].id_prefijos
            });
          }
        },
        error: (err) => console.error('❌ Error al cargar prefijos', err)
      });

      this.formGln.get('idPrefijos')?.valueChanges.subscribe((idPrefijo: number) => {
        if (!idPrefijo) return;

        this.alertaGln = null;
        this.cargarGlnDesdeBackendPorPrefijo(idPrefijo);
      });

    }

    this.ciudadService.getCiudades().subscribe({
      next: (res) => {
        this.ciudades = res.map(c => ({ ...c, id: +c.id }));
        this.paises = Array.from(new Map(this.ciudades.map(c => [c.pais, { id: c.id, nombre: c.pais }])).values());
        this.provincias = Array.from(new Map(this.ciudades.map(c => [c.provincia, { id: c.id, nombre: c.provincia }])).values());

        this.formGln.patchValue({ idPais: 'ECUADOR', provinciaCodigo: 'PICHINCHA', cantonCodigo: 'QUITO' });
        this.procesarFiltrosIniciales();
      },
      error: (err) => console.error('❌ Error al cargar ciudades', err)
    });

    this.formGln.get('idPais')?.valueChanges.subscribe(paisSeleccionado => {
      this.provinciasFiltradas = this.ciudades
        .filter(c => c.pais === paisSeleccionado)
        .map(c => c.provincia)
        .filter((v, i, a) => a.indexOf(v) === i)
        .map((nombre, idx) => ({ id: idx + 1, nombre }));

      this.formGln.patchValue({ provinciaCodigo: '', cantonCodigo: '', idCiudad: null });
      this.cantones = [];
      this.ciudadesFiltradas = [];
    });

    this.formGln.get('provinciaCodigo')?.valueChanges.subscribe(provinciaSeleccionada => {
      this.cantones = this.ciudades
        .filter(c => c.provincia === provinciaSeleccionada)
        .map(c => c.canton)
        .filter((v, i, a) => a.indexOf(v) === i)
        .map((nombre, idx) => ({ id: idx + 1, nombre }));

      this.formGln.patchValue({ cantonCodigo: '', idCiudad: null });
      this.ciudadesFiltradas = [];
    });

    combineLatest([
      this.formGln.get('provinciaCodigo')!.valueChanges.pipe(startWith(this.formGln.get('provinciaCodigo')!.value), distinctUntilChanged()),
      this.formGln.get('cantonCodigo')!.valueChanges.pipe(startWith(this.formGln.get('cantonCodigo')!.value), distinctUntilChanged())
    ]).subscribe(([provincia, canton]) => {
      this.ciudadesFiltradas = this.ciudades.filter(c => c.provincia === provincia && c.canton === canton);
      const ciudadActual = this.formGln.get('idCiudad')?.value;
      const ciudadValida = this.ciudadesFiltradas.some(c => c.id === +ciudadActual);
      if (!ciudadValida && this.ciudadesFiltradas.length > 0) {
        this.formGln.patchValue({ idCiudad: this.ciudadesFiltradas[0].id });
      }
    });

    this.formGln.get('idCiudad')?.valueChanges.subscribe(ciudadId => {
      const ciudad = this.ciudades.find(c => c.id === +ciudadId);
      if (ciudad) {
        this.formGln.patchValue({
          idPais: ciudad.pais,
          provinciaCodigo: ciudad.provincia,
          cantonCodigo: ciudad.canton
        }, { emitEvent: false });
      }
    });

  }
  cargarDatosDesdeGlnResponse(gln: GlnResponse): void {
    this.formGln.patchValue({
      localizacion: gln.nombreLocalizacion,
      idPais: gln.idPais,
      idCiudad: gln.idCiudad,
      glnCodigopostal: gln.glnCodigopostal,
      direccion: gln.direccion,
      glnLatitud: gln.glnLatitud,
      glnLongitud: gln.glnLongitud,
      telefono: gln.telefono,
      fax: gln.fax,
      email: gln.email,
      web: gln.web,
      contacto: gln.contacto,
      contactoTel: gln.contactoTel,
      glnCelular: gln.glnCelular,
      glnContacto2: gln.glnContacto2,
      glnEmail2: gln.glnEmail2,
      glnTel2: gln.glnTel2,
      glnContacto3: gln.glnContacto3,
      glnEmail3: gln.glnEmail3,
      glnTel3: gln.glnTel3,
      fda: gln.fda,
      europa: gln.europa,
      glnGlobal: gln.glnGlobal,
      glnOtro1: gln.glnOtro1,
      glnOtro2: gln.glnOtro2,
      glnGlnp: gln.glnGlnp,
      glnGlne: gln.glnGlne,
      glnObs1: gln.glnObs1,
      glnObs2: gln.glnObs2,
      observ: gln.observ,
    });
    if (gln.idCiudad) {
      this.setUbicacionDesdeCiudadId(gln.idCiudad);
    }

    this.setCamposUbicacionHabilitados(false);
    this.setCamposGeneralesSoloLectura();
  }

  cargarGlnDesdeBackendPorPrefijo(idPrefijos: number): void {
  this.glnService.obtenerGlnPorIdPrefijo(idPrefijos).subscribe({
    next: (gln: GlnResponse) => {
      this.formGln.patchValue({
        ...gln,
        provinciaCodigo: this.obtenerProvinciaPorCiudad(gln.idCiudad),
        cantonCodigo: this.obtenerCantonPorCiudad(gln.idCiudad),
        localizacion: gln.nombreLocalizacion,
      });
      this.setCamposUbicacionHabilitados(true); // Solo ubicación editable
      this.setCamposGeneralesSoloLectura();     // Datos Generales bloqueados
    },
    error: () => {
      this.alertaGln = '⚠️ No se pudo obtener el GLN del prefijo seleccionado.';
    }
  });
}
  obtenerProvinciaPorCiudad(idCiudad: number | null): string {
  const ciudad = this.ciudades.find(c => c.id === idCiudad);
  return ciudad?.provincia ?? '';
}

obtenerCantonPorCiudad(idCiudad: number | null): string {
  const ciudad = this.ciudades.find(c => c.id === idCiudad);
  return ciudad?.canton ?? '';
}

setUbicacionDesdeCiudadId(idCiudad: number): void {
  const ciudad = this.ciudades.find(c => c.id === +idCiudad);
  if (!ciudad) return;

  // Llenar provincias filtradas
  this.provinciasFiltradas = this.ciudades
    .filter(c => c.pais === ciudad.pais)
    .map(c => c.provincia)
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((nombre, idx) => ({ id: idx + 1, nombre }));

  // Llenar cantones filtrados
  this.cantones = this.ciudades
    .filter(c => c.provincia === ciudad.provincia)
    .map(c => c.canton)
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((nombre, idx) => ({ id: idx + 1, nombre }));

  // Llenar ciudades filtradas
  this.ciudadesFiltradas = this.ciudades.filter(c => c.provincia === ciudad.provincia && c.canton === ciudad.canton);

  // Setear valores en cascada
  this.formGln.patchValue({
    idPais: ciudad.pais,
    provinciaCodigo: ciudad.provincia,
    cantonCodigo: ciudad.canton,
    idCiudad: ciudad.id
  }, { emitEvent: false });
}

  setCamposGeneralesSoloLectura(): void {
    const campos = [
      'clientesCodigo', 'documentoIdentidad', 'glnNombre', 'nomCli',
      'gln1', 'glnOrigenprefijo', 'glnPrefijogs1'
    ];
    campos.forEach(c => this.formGln.get(c)?.disable());
  }
  inicializarFormulario(): void {
    this.formGln = this.fb.group({
      idGln: [0],
      idPrefijos: [null],
      clientesCodigo: [null],
      gln1: [''],
      documentoIdentidad: [''],
      nomCli: [''],
      idTipoLocalizacion: [null],
      glnLatitud: [''],
      glnLongitud: [''],
      idPais: [''],
      direccion: [''],
      telefono: [''],
      fax: [''],
      contacto: [''],
      contactoTel: [''],
      email: [''],
      web: [''],
      fda: [''],
      europa: [''],
      glnGlobal: [''],
      glnFecha: [null],
      idCiudad: [null],
      glnCodigopostal: [''],
      glnCelular: [''],
      glnContacto2: [''],
      glnEmail2: [''],
      glnTel2: [''],
      glnContacto3: [''],
      glnEmail3: [''],
      glnTel3: [''],
      glnFacturar: [''],
      glnCodpro: [''],
      glnNombre: [''],
      glnOtro1: [''],
      glnOtro2: [''],
      glnObs1: [''],
      glnObs2: [''],
      glnOrigenprefijo: [''],
      glnPrefijogs1: [''],
      glnGlnp: [''],
      glnGlne: [''],
      nombreLocalizacion: [''],
      observ: [''],
      expprod: [0],
      gs1ec: [0],
      gs1latam: [0],
      gas1org: [0],
      google: [0],
      gs1otros: [''],
      longG: [''],
      longM: [''],
      longS: [''],
      longE: [''],
      latiG: [''],
      latiM: [''],
      latiS: [''],
      latiE: [''],
      idUsuario: [null],
      provinciaCodigo: [''],
      cantonCodigo: [''],
      localizacion: ['']
    });
  }

  siguientePaso(): void {
    if (this.pasoActual < 3) this.pasoActual++;
  }

  pasoAnterior(): void {
    if (this.pasoActual > 1) this.pasoActual--;
  }

  cambiarPaso(paso: number): void { this.pasoActual = paso; }
  esPasoActual(paso: number): boolean { return this.pasoActual === paso; }
  pasoCompletado(paso: number): boolean { return this.pasoActual > paso; }
  pasoPendiente(paso: number): boolean { return this.pasoActual < paso; }

  siguienteGln(): void {
    if (this.glnIndex < this.glnsDelPrefijo.length - 1) {
      this.glnIndex++;
      this.cargarGlnActual();
    }
  }

  anteriorGln(): void {
    if (this.glnIndex > 0) {
      this.glnIndex--;
      this.cargarGlnActual();
    }
  }

  cargarGlnActual(): void {
    const gln = this.glnsDelPrefijo[this.glnIndex];
    if (!gln) return;
    this.formGln.patchValue({
      gln1: gln.gln,
      glnPrefijogs1: gln.codpre,
      glnOrigenprefijo: gln.origenPrefijo,
      direccion: gln.direccion,
      telefono: gln.telefono,
      provinciaCodigo: gln.provincia,
      cantonCodigo: gln.canton,
      nomCli: gln.nomcli,
      documentoIdentidad: gln.ruccli
    });
    this.setCamposUbicacionHabilitados(false);
  }

  guardar(): void {
  if (this.formGln.invalid) {
    // Marca todos los campos como tocados para mostrar errores
    this.formGln.markAllAsTouched();
    alert('❌ Por favor, completa todos los campos requeridos antes de guardar.');
    return;
  }

  const data: GlnRequest = {
    idGln: this.formGln.value.idGln,
    idPrefijos: this.formGln.value.idPrefijos,
    clientesCodigo: this.formGln.value.clientesCodigo,
    gln1: this.formGln.value.gln1,
    idTipoLocalizacion: this.formGln.value.idTipoLocalizacion,
    idPais: this.formGln.value.idPais,
    idCiudad: this.formGln.value.idCiudad,
    direccion: this.formGln.value.direccion,
    glnCodigopostal: this.formGln.value.glnCodigopostal,
    glnLatitud: this.formGln.value.glnLatitud,
    glnLongitud: this.formGln.value.glnLongitud,
    contacto: this.formGln.value.contacto,
    contactoTel: this.formGln.value.contactoTel,
    email: this.formGln.value.email,
    web: this.formGln.value.web,
    fax: this.formGln.value.fax,
    telefono: this.formGln.value.telefono, 
    glnObs1: this.formGln.value.glnObs1,           
    glnObs2: this.formGln.value.glnObs2,      
    glnCelular: this.formGln.value.glnCelular,
    glnContacto2: this.formGln.value.glnContacto2,
    glnEmail2: this.formGln.value.glnEmail2,
    glnTel2: this.formGln.value.glnTel2,
    glnContacto3: this.formGln.value.glnContacto3,
    glnEmail3: this.formGln.value.glnEmail3,
    glnTel3: this.formGln.value.glnTel3,
    fda: this.formGln.value.fda,
    europa: this.formGln.value.europa,
    glnGlobal: this.formGln.value.glnGlobal,
    glnOtro1: this.formGln.value.glnOtro1,
    glnOtro2: this.formGln.value.glnOtro2,
    glnGlnp: this.formGln.value.glnGlnp,
    glnGlne: this.formGln.value.glnGlne,
    observ: this.formGln.value.observ,
    nombreLocalizacion: this.formGln.value.nombreLocalizacion,
    glnOrigenprefijo: this.formGln.value.glnOrigenprefijo,
    glnPrefijogs1: this.formGln.value.glnPrefijogs1,
    glnFacturar: this.formGln.value.glnFacturar,
    glnCodpro: this.formGln.value.glnCodpro,
    glnNombre: this.formGln.value.glnNombre,
    glnFecha: this.formGln.value.glnFecha,
    expprod: this.formGln.value.expprod,
    gs1ec: this.formGln.value.gs1ec,
    gs1latam: this.formGln.value.gs1latam,
    gas1org: this.formGln.value.gas1org,
    google: this.formGln.value.google,
    gs1otros: this.formGln.value.gs1otros,
    longG: this.formGln.value.longG,
    longM: this.formGln.value.longM,
    longS: this.formGln.value.longS,
    longE: this.formGln.value.longE,
    latiG: this.formGln.value.latiG,
    latiM: this.formGln.value.latiM,
    latiS: this.formGln.value.latiS,
    latiE: this.formGln.value.latiE,
    idUsuario: this.formGln.value.idUsuario
  };

  const callback = () => {
    const clienteCodigo = this.formGln.value.clientesCodigo;
    const idPrefijo = this.formGln.value.idPrefijos;

    if (clienteCodigo) {
      this.prefijoService.obtenerPrefijosPorClienteCodigo(clienteCodigo).subscribe(res => {
        this.prefijos = res;
        this.glnsDelPrefijo = res.filter(p => p.id_prefijos === +idPrefijo);
        this.glnIndex = this.glnsDelPrefijo.length - 1;
        this.cargarGlnActual();
        this.setCamposUbicacionHabilitados(false);
        this.modoEdicion = false;
      });
    }

    this.pasoActual = 1;
  };

  if (data.idGln && data.idGln !== 0) {
    // Actualizar
    this.glnService.actualizarGln(data.idGln, data).subscribe({
      next: () => {
        alert('✅ GLN actualizado correctamente.');
        callback();
      },
      error: () => alert('❌ Error al actualizar el GLN.')
    });
  } else {
    // Insertar
    this.glnService.insertarGln({ request: data }).subscribe({
      next: () => {
        alert('✅ GLN creado correctamente.');
        callback();
      },
      error: () => alert('❌ Error al crear el GLN.')
    });
  }
}


  modificar(): void {
    this.modoEdicion = true;
    this.setCamposUbicacionHabilitados(true);
  }

  cancelar(): void {
    this.formGln.reset();
    this.pasoActual = 1;
    this.setCamposUbicacionHabilitados(false);
  }

  nuevo(): void {
    this.formGln.reset();
    this.pasoActual = 1;
    this.setCamposUbicacionHabilitados(true);
    this.modoEdicion = true;
  }

  setCamposUbicacionHabilitados(habilitado: boolean): void {
    const campos = [
      'localizacion', 'idPais', 'provinciaCodigo', 'cantonCodigo', 'idCiudad',
      'direccion', 'glnCodigopostal', 'glnLatitud', 'glnLongitud'
    ];

    campos.forEach(campo => {
      const control = this.formGln.get(campo);
      if (control) {
        habilitado ? control.enable() : control.disable();
      }
    });
  }

  procesarFiltrosIniciales(): void {
    const provincia = this.formGln.get('provinciaCodigo')?.value;
    const canton = this.formGln.get('cantonCodigo')?.value;
    this.cantones = this.ciudades
      .filter(c => c.provincia === provincia)
      .map(c => c.canton)
      .filter((v, i, a) => a.indexOf(v) === i)
      .map((nombre, idx) => ({ id: idx + 1, nombre }));
    this.ciudadesFiltradas = this.ciudades.filter(c => c.provincia === provincia && c.canton === canton);
    if (this.ciudadesFiltradas.length > 0) {
      this.formGln.patchValue({ idCiudad: this.ciudadesFiltradas[0].id });
    }
  }
}
