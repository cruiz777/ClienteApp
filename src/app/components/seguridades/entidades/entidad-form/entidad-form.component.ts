import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { ReplaySubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Servicios
import { CiudadService } from 'src/app/services/ciudad.service';
import { PersonasService } from 'src/app/services/personas.service';
import { TipoDocumentoService } from 'src/app/services/tipo-documento.service';
import { EstadoCivilService } from 'src/app/services/estado-civil.service';
import { GeneroService } from 'src/app/services/genero.service';

// Diálogos
import { CorreoDialogComponent } from '../../dialogs/correo/correo-dialog.component';
import { TelefonoDialogComponent } from '../../dialogs/telefono/telefono-dialog.component';
import { DireccionDialogComponent } from '../../dialogs/direccion/direccion-dialog.component';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';

// Interfaces
import { CorreoRequest, DireccionRequest, PersonaRequest, TelefonoRequest } from 'src/app/interfaces/requests/persona-request';
import { CiudadResumen } from 'src/app/interfaces/responses/ciudad-response';
import { EstadoCivil } from 'src/app/interfaces/catalogs/estado-civil.interface';
import { Genero } from 'src/app/interfaces/catalogs/genero.interface';
import { TipoDocumento } from 'src/app/interfaces/catalogs/tipo-documento.interface';
import { CustomValidators } from 'src/app/components/utils/validators/validator.util';
import { RegistroCivilService } from 'src/app/services/registro-civil.service';

@Component({
  selector: 'app-entidad-form',
  templateUrl: './entidad-form.component.html',
  styleUrls: ['./entidad-form.component.css']
})
export class EntidadFormComponent implements OnInit, OnDestroy {
  personaForm!: FormGroup;

  ciudades: CiudadResumen[] = [];
  filteredCiudades$: ReplaySubject<CiudadResumen[]> = new ReplaySubject<CiudadResumen[]>(1);
  ciudadFiltroCtrl: FormControl = new FormControl();

  tiposDocumento: TipoDocumento[] = [];
  estadosCiviles: EstadoCivil[] = [];
  generos: Genero[] = [];

  correos: CorreoRequest[] = [];
  telefonos: TelefonoRequest[] = [];
  direcciones: DireccionRequest[] = [];

  today: Date = new Date();
  modoEdicion = false;
  personaId!: number;

  private _onDestroy = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private ciudadService: CiudadService,
    private personaService: PersonasService,
    private tipoDocumentoService: TipoDocumentoService,
    private estadoCivilService: EstadoCivilService,
    private generoService: GeneroService,
    private registroCivilService: RegistroCivilService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.cargarCatalogos();

    const id = this.route.snapshot.paramMap.get('id');
    console.log('ID recibido en ruta:', id);
    if (id) {
      this.modoEdicion = true;
      this.personaId = +id;
      this.cargarDatosPersona(this.personaId);
    }

    this.ciudadFiltroCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => this.filtrarCiudades());
  }

  private initForm() {
    this.personaForm = this.fb.group({
      primerNombre: ['', [Validators.required, CustomValidators.onlyLetters, CustomValidators.onlyLettersKeyPress]],
      segundoNombre: ['', [CustomValidators.onlyLetters]],
      primerApellido: ['', [Validators.required, CustomValidators.onlyLetters]],
      segundoApellido: ['', [CustomValidators.onlyLetters]],
      numeroDocumento: [
        { value: '', disabled: false },
        [Validators.required, Validators.minLength(10), CustomValidators.onlyNumbers]
      ],
      idTipoDocumento: [{ value: null, disabled: false }, [Validators.required]],
      idEstadoCivil: [null, [Validators.required]],
      idGenero: [null, [Validators.required]],
      idCiudad: [null, [Validators.required]],
      fechaNacimiento: ['', [Validators.required]],
      tipoPersona: ['Natural', [Validators.required]],
      status: [true]
    });

  }
  onKeyPressLetters = CustomValidators.onlyLettersKeyPress;
  onKeyPressNumbers = CustomValidators.onlyNumbersKeyPress;
  private cargarCatalogos() {
    this.ciudadService.getCiudades().subscribe({
      next: (data) => {
        this.ciudades = data;
        this.filteredCiudades$.next(this.ciudades);
      },
      error: () => console.error('❌ Error al cargar ciudades')
    });

    this.tipoDocumentoService.getTiposDocumento().subscribe({
      next: (data) => this.tiposDocumento = data,
      error: () => console.error('❌ Error al cargar tipos de documento')
    });

    this.estadoCivilService.getEstadoCivil().subscribe({
      next: (data) => this.estadosCiviles = data,
      error: () => console.error('❌ Error al cargar estados civiles')
    });

    this.generoService.getGeneros().subscribe({
      next: (data) => this.generos = data,
      error: () => console.error('❌ Error al cargar géneros')
    });
  }

  private cargarDatosPersona(id: number) {
    this.personaService.getPersonaById(id).subscribe({
      next: (data) => {
        console.log('✅ Datos recibidos desde API:', data);
        this.personaForm.patchValue({
          primerNombre: data.primerNombre || '',
          segundoNombre: data.segundoNombre || '',
          primerApellido: data.primerApellido || '',
          segundoApellido: data.segundoApellido || '',
          numeroDocumento: data.identificacion || '',
          idTipoDocumento: data.idTipoDocumento || null,
          idEstadoCivil: data.idEstadoCivil || null,
          idGenero: data.idGenero || null,
          idCiudad: data.idCiudad || null,
          fechaNacimiento: data.fechaNacimiento || '',
          tipoPersona: data.tipoPersona || 'Natural',
          status: data.status
        });

        // Desactivar campos no editables
        this.personaForm.get('numeroDocumento')?.disable();
        this.personaForm.get('idTipoDocumento')?.disable();

        // Asignar directamente objetos completos
        this.correos = data.correos || [];
        this.telefonos = data.telefonos || [];
        this.direcciones = data.direcciones || [];
      },
      error: () => console.error('❌ Error al cargar datos de la persona')
    });
  }


  private filtrarCiudades() {
    const searchValue = this.ciudadFiltroCtrl.value?.toLowerCase() || '';
    if (!searchValue) {
      this.filteredCiudades$.next(this.ciudades);
      return;
    }

    const resultado = this.ciudades.filter(c =>
      `${c.ciudad} ${c.canton} ${c.provincia}`.toLowerCase().includes(searchValue)
    );

    this.filteredCiudades$.next(resultado);
  }

  openCorreoDialog() {
    this.openDialog(CorreoDialogComponent, this.correos, (result) => this.correos = result);
  }

  eliminarCorreo(index: number) {
    this.correos.splice(index, 1);
  }

  openTelefonoDialog() {
    this.openDialog(TelefonoDialogComponent, this.telefonos, (result) => this.telefonos = result);
  }

  eliminarTelefono(index: number) {
    this.telefonos.splice(index, 1);
  }

  openDireccionDialog() {
    this.openDialog(DireccionDialogComponent, this.direcciones, (result) => this.direcciones = result);
  }

  eliminarDireccion(index: number) {
    this.direcciones.splice(index, 1);
  }

  private openDialog(component: any, dataList: any[], callback: (result: any[]) => void) {
    const dialogRef = this.dialog.open(component, {
      width: '500px',
      data: [...dataList]
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) callback(result);
    });
  }
  //Metodo para validar cédula en el registro civil
  onBlurDocumento() {
    const cedula = this.personaForm.get('numeroDocumento')?.value;
  
    if (!cedula || cedula.length < 10) return;
  
    this.registroCivilService.consultarCedula(cedula).subscribe({
      next: (data) => {
        const partes = data.nombre?.trim().split(' ') ?? [];
  
        this.personaForm.patchValue({
          primerApellido: partes[0] || '',
          segundoApellido: partes[1] || '',
          primerNombre: partes[2] || '',
          segundoNombre: partes[3] || '',
          fechaNacimiento: this.convertirFecha(data.fechaNacimiento),
          tipoPersona: 'Natural',
          idGenero: this.mapGenero(data.genero),
          idEstadoCivil: this.mapEstadoCivil(data.estadoCivil)
        });
      },
      error: () => {
        console.error('❌ Error al consultar cédula');
      }
    });
  }
  
  // Convierte "dd/MM/yyyy" → "yyyy-MM-dd"
  private convertirFecha(fecha: string): string {
    const [dia, mes, anio] = fecha.split('/');
    return `${anio}-${mes}-${dia}`;
  }
  
  // Mapear string a id de catálogo (esto es un ejemplo; reemplaza con tu lógica real)
  private mapGenero(valor: string): number | null {
    const genero = this.generos.find(g => g.generoDescripcion.toLowerCase() === valor.toLowerCase());
    return genero?.generoCodigo ?? null;
  }
  
  private mapEstadoCivil(valor: string): number | null {
    const estado = this.estadosCiviles.find(e => e.estadoCivilNombre.toLowerCase() === valor.toLowerCase());
    return estado?.estadoCivilCodigo ?? null;
  }
  
  guardar() {
    if (this.personaForm.valid) {
      // Habilitar temporalmente campos deshabilitados para obtener sus valores
      this.personaForm.get('numeroDocumento')?.enable();
      this.personaForm.get('idTipoDocumento')?.enable();

      const formValues = this.personaForm.getRawValue();

      // Restaurar deshabilitación si es modo edición
      if (this.modoEdicion) {
        this.personaForm.get('numeroDocumento')?.disable();
        this.personaForm.get('idTipoDocumento')?.disable();
      }

      const payload: PersonaRequest = {
        primerNombre: formValues.primerNombre,
        segundoNombre: formValues.segundoNombre,
        primerApellido: formValues.primerApellido,
        segundoApellido: formValues.segundoApellido,
        numeroDocumento: formValues.numeroDocumento,
        idTipoDocumento: formValues.idTipoDocumento,
        idEstadoCivil: formValues.idEstadoCivil,
        idGenero: formValues.idGenero,
        idCiudad: formValues.idCiudad,
        fechaNacimiento: formValues.fechaNacimiento,
        tipoPersona: formValues.tipoPersona,
        status: formValues.status,
        correos: this.correos,
        telefonos: this.telefonos,
        direcciones: this.direcciones
      };

      const save$ = this.modoEdicion
        ? this.personaService.updatePersona(this.personaId, payload)
        : this.personaService.createPersona(payload);

      save$.subscribe({
        next: () => {
          const msg = this.modoEdicion ? 'actualizada' : 'creada';
          this.dialog.open(CustomMessageBoxComponent, {
            width: '400px',
            data: {
              title: 'Éxito',
              message: `La entidad fue ${msg} correctamente.`,
              type: 'success',
              confirmText: 'Ir a la lista',
              showCancel: false
            }
          }).afterClosed().subscribe(() => {
            this.router.navigate(['/seguridades/entidades']);
          });
        },
        error: (err) => {
          console.error('❌ Error al guardar entidad', err);
          this.dialog.open(CustomMessageBoxComponent, {
            width: '400px',
            data: {
              title: 'Error',
              message: 'Ocurrió un error al guardar la entidad.',
              type: 'error',
              confirmText: 'Cerrar',
              showCancel: false
            }
          });
        }
      });
    } else {
      this.personaForm.markAllAsTouched();
    }
  }



  cancelar() {
    this.personaForm.reset({ tipoPersona: 'Natural', status: true });
    this.correos = [];
    this.telefonos = [];
    this.direcciones = [];
    this.router.navigate(['/seguridades/entidades']);
  }

  ngOnDestroy() {
    this._onDestroy.next();
    this._onDestroy.complete();
  }
}
