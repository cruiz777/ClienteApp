import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { GlnService } from 'src/app/services/gln.service';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { TipoLocalizacionService } from 'src/app/services/tipo-localizacion.service';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { CiudadService } from 'src/app/services/ciudad.service';
import { TipoLocalizacionResponse } from 'src/app/interfaces/responses/tipo-localizacion-response';
import { PrefijoClienteResponse } from 'src/app/interfaces/responses/PrefijoClienteResponse';
import { Cliente } from 'src/app/interfaces/cliente';
import { CiudadResumen } from 'src/app/interfaces/responses/ciudad-response';
import { combineLatest, distinctUntilChanged, startWith } from 'rxjs';

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

  constructor(
    private fb: FormBuilder,
    private glnService: GlnService,
    private prefijoService: PrefijoService,
    private tipoLocalizacionService: TipoLocalizacionService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private ciudadService: CiudadService
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.clienteActual = this.clienteSeleccionadoService.obtenerClienteActual();

    if (this.clienteActual) {
      const clienteCodigo = this.clienteActual.clientes_codigo;

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
              glnOrigenprefijo: res[0].origenPrefijo
            });
          }
        },
        error: (err) => console.error('❌ Error al cargar prefijos', err)
      });

      this.glnService.obtenerGlnPorClienteCodigo(clienteCodigo).subscribe({
        next: (res) => {
          if (res.length > 0) {
            this.formGln.patchValue({
              gln1: res[0].gln1,
              nombreLocalizacion: res[0].nombreLocalizacion
            });
          }
        },
        error: (err) => console.error('❌ Error al cargar GLN existente', err)
      });
    }

    this.ciudadService.getCiudades().subscribe({
      next: (res) => {
        this.ciudades = res;

        this.paises = Array.from(
          new Map(res.map(c => [c.pais, { id: c.id, nombre: c.pais }])).values()
        );

        this.provincias = Array.from(
          new Map(res.map(c => [c.provincia, { id: c.id, nombre: c.provincia }])).values()
        );
      },
      error: (err) => console.error('❌ Error al cargar ciudades', err)
    });

    // 🔁 Filtro provincias por país
    this.formGln.get('idPais')?.valueChanges.subscribe(paisSeleccionado => {
      this.provinciasFiltradas = this.ciudades
        .filter(c => c.pais === paisSeleccionado)
        .map(c => c.provincia)
        .filter((v, i, a) => a.indexOf(v) === i)
        .map((nombre, idx) => ({ id: idx + 1, nombre }));

      // Reset cascada
      this.formGln.patchValue({
        provinciaCodigo: '',
        cantonCodigo: '',
        idCiudad: null
      });
      this.cantones = [];
      this.ciudadesFiltradas = [];
    });

    // 🔁 Filtro cantones por provincia
    this.formGln.get('provinciaCodigo')?.valueChanges.subscribe(provinciaSeleccionada => {
      this.cantones = this.ciudades
        .filter(c => c.provincia === provinciaSeleccionada)
        .map(c => c.canton)
        .filter((v, i, a) => a.indexOf(v) === i)
        .map((nombre, idx) => ({ id: idx + 1, nombre }));

      this.formGln.patchValue({
        cantonCodigo: '',
        idCiudad: null
      });

      this.ciudadesFiltradas = [];
    });

    // 🔁 Filtro ciudades por provincia + cantón
    combineLatest([
  this.formGln.get('provinciaCodigo')!.valueChanges.pipe(startWith(this.formGln.get('provinciaCodigo')!.value), distinctUntilChanged()),
  this.formGln.get('cantonCodigo')!.valueChanges.pipe(startWith(this.formGln.get('cantonCodigo')!.value), distinctUntilChanged())
  ]).subscribe(([provincia, canton]) => {
    this.ciudadesFiltradas = this.ciudades.filter(
      c => c.provincia === provincia && c.canton === canton
    );

    const ciudadActual = this.formGln.get('idCiudad')?.value;
    const ciudadValida = this.ciudadesFiltradas.some(c => c.id === ciudadActual);

    if (!ciudadValida) {
      this.formGln.patchValue({ idCiudad: null });
    }
  });

    // 🔁 Actualiza país/provincia/cantón desde ciudad seleccionada
    this.formGln.get('idCiudad')?.valueChanges.subscribe(ciudadId => {
      const ciudad = this.ciudades.find(c => c.id === ciudadId);
      if (ciudad) {
        this.formGln.patchValue({
          idPais: ciudad.pais,
          provinciaCodigo: ciudad.provincia,
          cantonCodigo: ciudad.canton
        });
      }
    });
  }

  inicializarFormulario(): void {
    this.formGln = this.fb.group({
      idGln: [0],
      idPrefijos: [null],
      clientesCodigo: [null],
      gln1: [''],
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

  cambiarPaso(paso: number): void {
    this.pasoActual = paso;
  }

  esPasoActual(paso: number): boolean {
    return this.pasoActual === paso;
  }

  pasoCompletado(paso: number): boolean {
    return this.pasoActual > paso;
  }

  pasoPendiente(paso: number): boolean {
    return this.pasoActual < paso;
  }

  siguientePaso(): void {
    if (this.pasoActual < 3) this.pasoActual++;
  }

  pasoAnterior(): void {
    if (this.pasoActual > 1) this.pasoActual--;
  }

  guardar(): void {
    const glnData = this.formGln.value;
    this.glnService.insertarGln({ request: glnData }).subscribe({
      next: () => alert('✅ GLN guardado exitosamente.'),
      error: err => console.error('❌ Error al guardar GLN', err)
    });
  }

  modificar(): void {
    const glnData = this.formGln.value;
    this.glnService.actualizarGln(glnData.idGln, glnData).subscribe({
      next: () => alert('✅ GLN actualizado exitosamente.'),
      error: err => console.error('❌ Error al actualizar GLN', err)
    });
  }
  
  cancelar(): void {
    this.formGln.reset();
    this.pasoActual = 1;
  }

  nuevo(): void {
    this.formGln.reset();
    this.pasoActual = 1;
  }
}
