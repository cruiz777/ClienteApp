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
import { PaisService, Pais } from 'src/app/services/pais.service';

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
  paises: Pais[] = [];
  provincias: { id: number; nombre: string }[] = [];
  provinciasFiltradas: { id: number; nombre: string }[] = [];
  cantones: { id: number; nombre: string }[] = [];

  clienteActual: Cliente | null = null;

  glnsDelPrefijo: GlnResponse[] = [];   
  glnsPorPrefijo: GlnResponse[] = [];   
  glnIndex: number = 0;
  alertaGln: string | null = null;
  modoEdicion: boolean = false;
  ciudadesCargadas = false;

  constructor(
    private fb: FormBuilder,
    private prefijoService: PrefijoService,
    private tipoLocalizacionService: TipoLocalizacionService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private ciudadService: CiudadService,
    private glnService: GlnService,
    private paisService: PaisService,
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
              glnPrefijogs1: res[0].prefijosgs1,
              glnOrigenprefijo: res[0].origenPrefijo,
              idPrefijos: +res[0].id_prefijos
            });
          }
        },
        error: (err) => console.error('❌ Error al cargar prefijos', err)
      });

      let ultimoPrefijo: number | null = null;

      this.formGln.get('idPrefijos')?.valueChanges
        .pipe(distinctUntilChanged())
        .subscribe((idPrefijo: number) => {
          if (!idPrefijo || idPrefijo === ultimoPrefijo || !this.ciudadesCargadas) return;

          ultimoPrefijo = idPrefijo;
          this.alertaGln = null;
          this.cargarGlnDesdePrefijos(idPrefijo);
      });
    }

    this.ciudadService.getCiudades().subscribe({
      next: (res) => {
        this.ciudades = res.map(c => ({ ...c, id: +c.id }));
        this.ciudadesCargadas = true;

        this.paisService.obtenerPaises().subscribe({
          next: (res: Pais[]) => {
            this.paises = res;
            const ecuador = res.find(p => p.nombre.toUpperCase() === 'ECUADOR');
            if (ecuador) {
              this.formGln.patchValue({
                idPais: ecuador.idPais,
                provinciaCodigo: 'PICHINCHA',
                cantonCodigo: 'QUITO'
              });
            }

            // Ahora que ya están cargadas las ciudades y países, puedes cargar el GLN
            const idPrefijo = this.formGln.value.idPrefijos;
            if (idPrefijo) this.cargarGlnDesdePrefijos(idPrefijo);
          },
          error: (err) => console.error('❌ Error al obtener países:', err)
        });
      },
      error: (err) => console.error('❌ Error al cargar ciudades', err)
    });


    this.formGln.get('idPais')?.valueChanges.subscribe(paisSeleccionado => {
    const pais = this.paises.find(p => p.idPais === +paisSeleccionado);

      this.provinciasFiltradas = this.ciudades
        .filter(c => pais && c.pais.toUpperCase().trim() === pais.nombre.toUpperCase().trim()) // 🔥 normalizado
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
        const paisObj = this.paises.find(p => p.nombre.toUpperCase() === ciudad.pais.toUpperCase());
        this.formGln.patchValue({
          idPais: paisObj?.idPais ?? null,
          provinciaCodigo: ciudad.provincia,
          cantonCodigo: ciudad.canton
        }, { emitEvent: false });
      }
    });

  }
  cargarDatosDesdeGlnResponse(gln: GlnResponse): void {
    this.formGln.patchValue({
      idGln: gln.id_gln,
      localizacion: gln.nombreLocalizacion,
      idPais: gln.idPais,
      idCiudad: gln.idCiudad,
      glnCodigopostal: gln.glnCodigopostal,
      direccion: gln.direccion,
      glnLatitud: gln.glnLatitud?.toString() ?? '',
      glnLongitud: gln.glnLongitud?.toString() ?? '',
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

  private cargarGlnDesdePrefijos(idPrefijos: number): void {
  const prefijo = this.prefijos.find(p => p.id_prefijos === idPrefijos);

    if (!prefijo) {
      this.alertaGln = '❌ Prefijo no encontrado.';
      this.glnsPorPrefijo = [];
      return;
    }

    const glns = prefijo.glns || [];

    if (glns.length === 0) {
      this.alertaGln = '⚠️ No se encontraron GLNs para el prefijo seleccionado.';
      this.glnsPorPrefijo = [];
      return;
    }

    this.alertaGln = null;
    this.glnsPorPrefijo = glns;
    this.glnsDelPrefijo = glns;
    this.glnIndex = 0;

    this.cargarGlnActual();
    this.setCamposUbicacionHabilitados(false);
    this.setCamposGeneralesSoloLectura();
  }




private setUbicacionDesdeCiudad(ciudad: CiudadResumen): void {
  console.log('🔍 Ejecutando setUbicacionDesdeCiudad con:', ciudad);

  // Provincias filtradas
  this.provinciasFiltradas = this.ciudades
    .filter(c => c.pais === ciudad.pais)
    .map(c => c.provincia)
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((nombre, idx) => ({ id: idx + 1, nombre }));

  // Cantones filtrados
  this.cantones = this.ciudades
    .filter(c => c.provincia === ciudad.provincia)
    .map(c => c.canton)
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((nombre, idx) => ({ id: idx + 1, nombre }));

  // Ciudades filtradas
  this.ciudadesFiltradas = this.ciudades.filter(
    c => c.provincia === ciudad.provincia && c.canton === ciudad.canton
  );

  // Si la ciudad no está en ciudadesFiltradas, se agrega
  if (!this.ciudadesFiltradas.some(c => c.id === ciudad.id)) {
    this.ciudadesFiltradas.unshift(ciudad);
  }
  const paisEncontrado = this.paises.find(p => p.nombre.toUpperCase() === ciudad.pais.toUpperCase());
  this.formGln.patchValue({
    idPais: paisEncontrado?.idPais ?? null,
    provinciaCodigo: ciudad.provincia,
    cantonCodigo: ciudad.canton,
    idCiudad: ciudad.id
  }, { emitEvent: false });

  console.log('✅ Formulario actualizado con ubicación:', {
    idPais: ciudad.pais,
    provincia: ciudad.provincia,
    canton: ciudad.canton,
    ciudad: ciudad.ciudad,
    ciudadId: ciudad.id
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

  this.provinciasFiltradas = this.ciudades
    .filter(c => c.pais === ciudad.pais)
    .map(c => c.provincia)
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((nombre, idx) => ({ id: idx + 1, nombre }));

  this.cantones = this.ciudades
    .filter(c => c.provincia === ciudad.provincia)
    .map(c => c.canton)
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((nombre, idx) => ({ id: idx + 1, nombre }));

  this.ciudadesFiltradas = this.ciudades.filter(
    c => c.provincia === ciudad.provincia && c.canton === ciudad.canton
  );

  // Garantizar que la ciudad esté incluida
  if (!this.ciudadesFiltradas.some(c => c.id === ciudad.id)) {
    this.ciudadesFiltradas.unshift(ciudad);
  }
  const paisEncontrado = this.paises.find(p => p.nombre.toUpperCase() === ciudad.pais.toUpperCase());
  this.formGln.patchValue({
    idPais: paisEncontrado?.idPais ?? null,   
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
    const gln = this.glnsPorPrefijo[this.glnIndex]; // ← Cambia aquí
    if (!gln) return;

      if (this.ciudadesCargadas && gln.idCiudad) {
    const ciudad = this.ciudades.find(c => c.id === gln.idCiudad);
    if (ciudad) {
      // 🧠 Asegura que paisObj exista y sea válido
      const paisObj = this.paises.find(p => p.nombre.toUpperCase() === ciudad.pais.toUpperCase());

      // 🔄 Actualiza provinciasFiltradas
      this.provinciasFiltradas = this.ciudades
        .filter(c => c.pais === ciudad.pais)
        .map(c => c.provincia)
        .filter((v, i, a) => a.indexOf(v) === i)
        .map((nombre, idx) => ({ id: idx + 1, nombre }));

      // 🔄 Actualiza cantones
      this.cantones = this.ciudades
        .filter(c => c.provincia === ciudad.provincia)
        .map(c => c.canton)
        .filter((v, i, a) => a.indexOf(v) === i)
        .map((nombre, idx) => ({ id: idx + 1, nombre }));

      // 🔄 Actualiza ciudadesFiltradas
      this.ciudadesFiltradas = this.ciudades.filter(
        c => c.provincia === ciudad.provincia && c.canton === ciudad.canton
      );

      // ✅ Asegura que la ciudad actual esté en la lista
      if (!this.ciudadesFiltradas.some(c => c.id === ciudad.id)) {
        this.ciudadesFiltradas.unshift(ciudad);
      }

      // 🧩 Pone todos los datos de ubicación
      this.formGln.patchValue({
        idPais: paisObj?.idPais ?? null,
        provinciaCodigo: ciudad.provincia,
        cantonCodigo: ciudad.canton,
        idCiudad: ciudad.id
      }, { emitEvent: false });
    }
  }
    // Patch de campos generales desde GlnResponse
    this.formGln.patchValue({
      idGln: gln.id_gln,
      idPrefijos: gln.id_prefijos,
      clientesCodigo: gln.clientesCodigo,
      gln1: gln.gln1,
      idTipoLocalizacion: gln.idTipoLocalizacion,
      direccion: gln.direccion,
      telefono: gln.telefono,
      fax: gln.fax,
      contacto: gln.contacto,
      contactoTel: gln.contactoTel,
      email: gln.email,
      web: gln.web,
      fda: gln.fda,
      europa: gln.europa,
      glnGlobal: gln.glnGlobal,
      glnLatitud: gln.glnLatitud,
      glnLongitud: gln.glnLongitud,
      glnFecha: gln.glnFecha,
      glnCodigopostal: gln.glnCodigopostal,
      glnCelular: gln.glnCelular,
      glnContacto2: gln.glnContacto2,
      glnEmail2: gln.glnEmail2,
      glnTel2: gln.glnTel2,
      glnContacto3: gln.glnContacto3,
      glnEmail3: gln.glnEmail3,
      glnTel3: gln.glnTel3,
      glnFacturar: gln.glnFacturar,
      glnCodpro: gln.glnCodpro,
      glnNombre: gln.glnNombre,
      glnOtro1: gln.glnOtro1,
      glnOtro2: gln.glnOtro2,
      glnObs1: gln.glnObs1,
      glnObs2: gln.glnObs2,
      glnOrigenprefijo: gln.glnOrigenprefijo,
      glnPrefijogs1: gln.glnPrefijogs1,
      glnGlnp: gln.glnGlnp,
      glnGlne: gln.glnGlne,
      nombreLocalizacion: gln.nombreLocalizacion,
      observ: gln.observ,
      expprod: gln.expprod,
      gs1ec: gln.gs1ec,
      gs1latam: gln.gs1latam,
      gas1org: gln.gas1org,
      google: gln.google,
      gs1otros: gln.gs1otros,
      longG: gln.longG,
      longM: gln.longM,
      longS: gln.longS,
      longE: gln.longE,
      latiG: gln.latiG,
      latiM: gln.latiM,
      latiS: gln.latiS,
      latiE: gln.latiE,
      idUsuario: gln.idUsuario,
      localizacion: gln.nombreLocalizacion
    });
    if (this.ciudadesCargadas && gln.idCiudad) {
      this.setUbicacionDesdeCiudadId(gln.idCiudad);
    }
    this.setCamposUbicacionHabilitados(false);
  }

  guardar(): void {
    if (this.formGln.invalid) {
      this.formGln.markAllAsTouched();
      alert('❌ Por favor, completa todos los campos requeridos antes de guardar.');
      return;
    }

    const raw = this.formGln.getRawValue();
    let fechaConvertida: string | null = null;
    if (raw.glnFecha) {
      const fecha = new Date(raw.glnFecha);
      if (!isNaN(fecha.getTime())) {
        const year = fecha.getFullYear();
        const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const day = fecha.getDate().toString().padStart(2, '0');
        fechaConvertida = `${year}-${month}-${day}`; // formato yyyy-MM-dd
      }
    }
    const data: GlnRequest = {
      id_gln: raw.idGln,  // <- ¡esto sí está llegando desde el backend!
      id_prefijos: raw.idPrefijos,
      clientesCodigo: raw.clientesCodigo,
      gln1: raw.gln1,
      idTipoLocalizacion: raw.idTipoLocalizacion,
      glnLatitud: raw.glnLatitud,
      glnLongitud: raw.glnLongitud,
      idPais: raw.idPais,
      direccion: raw.direccion,
      telefono: raw.telefono,
      fax: raw.fax,
      contacto: raw.contacto,
      contactoTel: raw.contactoTel,
      email: raw.email,
      web: raw.web,
      fda: raw.fda,
      europa: raw.europa,
      glnGlobal: raw.glnGlobal,
      glnFecha: raw.fechaConvertida,
      idCiudad: raw.idCiudad,
      glnCodigopostal: raw.glnCodigopostal,
      glnCelular: raw.glnCelular,
      glnContacto2: raw.glnContacto2,
      glnEmail2: raw.glnEmail2,
      glnTel2: raw.glnTel2,
      glnContacto3: raw.glnContacto3,
      glnEmail3: raw.glnEmail3,
      glnTel3: raw.glnTel3,
      glnFacturar: raw.glnFacturar,
      glnCodpro: raw.glnCodpro,
      glnNombre: raw.glnNombre,
      glnOtro1: raw.glnOtro1,
      glnOtro2: raw.glnOtro2,
      glnObs1: raw.glnObs1,
      glnObs2: raw.glnObs2,
      glnOrigenprefijo: raw.glnOrigenprefijo,
      glnPrefijogs1: raw.glnPrefijogs1,
      glnGlnp: raw.glnGlnp,
      glnGlne: raw.glnGlne,
      nombreLocalizacion: raw.nombreLocalizacion,
      observ: raw.observ,
      expprod: raw.expprod,
      gs1ec: raw.gs1ec,
      gs1latam: raw.gs1latam,
      gas1org: raw.gas1org,
      google: raw.google,
      gs1otros: raw.gs1otros,
      longG: raw.longG,
      longM: raw.longM,
      longS: raw.longS,
      longE: raw.longE,
      latiG: raw.latiG,
      latiM: raw.latiM,
      latiS: raw.latiS,
      latiE: raw.latiE,
      idUsuario: raw.idUsuario
    };

    const callback = () => {
    const clienteCodigo = this.formGln.value.clientesCodigo;

    if (clienteCodigo) {
      this.prefijoService.obtenerPrefijosPorClienteCodigo(clienteCodigo).subscribe(res => {
        this.prefijos = res;
        const idPrefijo = this.formGln.value.idPrefijos;
        this.cargarGlnDesdePrefijos(idPrefijo);
        this.modoEdicion = false;
      });
    }

    this.pasoActual = 1;
  };

  console.log('🛰️ Payload que se va a enviar:', data);
  console.log('📌 idGln en el payload:', data.id_gln);
  // ✅ Diferenciar POST vs PUT correctamente
  if (data.id_gln && data.id_gln !== 0) {
    // PUT
    this.glnService.actualizarGln(data.id_gln, data).subscribe({
      next: () => {
        alert('✅ GLN actualizado correctamente.');
        callback();
      },
      error: (err) => {
        console.error('❌ Error al actualizar GLN', err);
        alert('❌ Error al actualizar el GLN.');
      }
    });
  } else {
    // POST
    this.glnService.insertarGln({ request: data }).subscribe({
      next: () => {
        alert('✅ GLN creado correctamente.');
        callback();
      },
      error: (err) => {
        console.error('❌ Error al crear GLN', err);
        alert('❌ Error al crear el GLN.');
      }
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
