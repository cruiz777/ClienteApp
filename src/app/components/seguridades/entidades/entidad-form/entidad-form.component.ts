import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, ReplaySubject, Subject } from 'rxjs';
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
import { ConsultaRucService } from 'src/app/services/rucapi.service';
import { RucApiResponse, RucConsulta } from 'src/app/interfaces/responses/RucResponse';
import { DateUtils } from 'src/app/shared/utils/date-utils';
import { PersonaResponse } from 'src/app/interfaces/responses/persona-response';

@Component({
  selector: 'app-entidad-form',
  templateUrl: './entidad-form.component.html',
  styleUrls: ['./entidad-form.component.css']
})
export class EntidadFormComponent implements OnInit, OnDestroy {
  personaForm!: FormGroup;
  
  //Validacion de control para mejor UX
  private documentoYaValidado = false; 
  private ultimoDocumentoValidado = ''; 
  validandoDocumento = false; 
  private documentoOriginal = ''; 

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

  tituloFormulario = 'Creación de Entidades';
  mostrarGenero = true;
  mostrarEstadoCivil = true; 
  labelNombre = 'Primer Nombre';
  labelApellido = 'Primer Apellido';
  labelFecha = 'Fecha de Nacimiento';


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
    private consultaRucService: ConsultaRucService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    this.initForm();
    this.filteredCiudades$.next([]);

    // Suscripción para filtrar ciudades
    this.ciudadFiltroCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        if (this.ciudades?.length) {
          this.filtrarCiudades();
        }
      });

    // 1. Cargar catálogos antes de hacer cualquier lógica dependiente
    await this.cargarCatalogos();

    // 2. Obtener query param opcional para tipoIdentificacion
    const tipoIdentificacion = this.route.snapshot.queryParamMap.get('tipoIdentificacion');
    if (tipoIdentificacion) {
      const tipoEncontrado = this.tiposDocumento.find(t => t.descripcion === tipoIdentificacion);
      if (tipoEncontrado) {
        this.personaForm.get('idTipoDocumento')?.setValue(tipoEncontrado.idTipoDocumento);
        this.personaForm.get('tipoDocumentoDescripcion')?.setValue(tipoEncontrado.descripcion);
        this.personaForm.get('idTipoDocumento')?.disable();
        this.setLongitudValidator(tipoIdentificacion);
        this.actualizarFormularioPorTipo(tipoIdentificacion);
      }
    }

    // 3. Escuchar cambios dinámicos del tipo de documento
    this.personaForm.get('idTipoDocumento')?.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(id => {
        const tipo = this.tiposDocumento.find(t => t.idTipoDocumento === id);
        if (tipo) {
          this.personaForm.get('tipoDocumentoDescripcion')?.setValue(tipo.descripcion);
          this.setLongitudValidator(tipo.descripcion);
          this.filtrarEstadosCiviles();
        }
      });

    // 4. Si es edición, cargar los datos una vez estén disponibles los catálogos
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modoEdicion = true;
      this.personaId = +id;
      await this.cargarDatosPersona(this.personaId);
    }
    // Valida si se sale del documento o no
    this.personaForm.get('numeroDocumento')?.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(valor => {
        // Si el usuario modifica el documento después de validarlo, resetear el estado
        if (this.documentoYaValidado && valor !== this.ultimoDocumentoValidado) {
          this.documentoYaValidado = false;
          this.ultimoDocumentoValidado = '';
        }

        // Validación automática al completar los dígitos
        this.validarDocumentoAutomaticamente(valor);
      });
  }

  private validarDocumentoAutomaticamente(documento: string) {
    if (!documento) return;

    const tipo = this.personaForm.get('tipoDocumentoDescripcion')?.value;
    let longitudEsperada = 0;

    // Determinar longitud esperada según el tipo
    if (tipo === 'CÉDULA') longitudEsperada = 10;
    else if (tipo === 'RUC') longitudEsperada = 13;
    else if (tipo === 'PASAPORTE') longitudEsperada = 20;
    else return; // Si no hay tipo seleccionado, no validar

    // Solo validar si:
    // 1. El documento tiene la longitud correcta
    // 2. No se ha validado antes O es un documento diferente
    // 3. No está en proceso de validación
    if (
      documento.length === longitudEsperada &&
      !this.documentoYaValidado &&
      !this.validandoDocumento
    ) {
      console.log('✅ Documento completo, validando automáticamente...');
      this.ejecutarValidacionDocumento(documento, tipo);
    }
  }

  private actualizarFormularioPorTipo(tipo: string) {
    const prefijo = this.modoEdicion ? 'Edición' : 'Creación';
    switch (tipo) {
      case 'RUC':
        this.tituloFormulario = `${prefijo} de Empresa`;
        this.labelNombre = 'Razón Social';
        this.labelApellido = 'Nombre Comercial';
        this.mostrarGenero = false;
        this.mostrarEstadoCivil = false;
        this.personaForm.get('idGenero')?.setValue(this.generos.find(g => g.generoDescripcion.toLowerCase() === 'otros')?.generoCodigo || null);
        this.labelFecha = 'Fecha de Inicio de Actividades';

        // Establece tipoPersona como JURÍDICA automáticamente
        this.personaForm.get('tipoPersona')?.setValue('JURÍDICA');
        this.personaForm.get('tipoPersona')?.disable();
        this.estadosCiviles = this.estadosCiviles.filter(
          e => e.estadoCivilNombre.toUpperCase() === 'NO APLICA'
        );
        break;
      case 'CÉDULA':
        this.tituloFormulario = `${prefijo} de Entidades`;
        this.labelNombre = 'Primer Nombre';
        this.labelApellido = 'Primer Apellido';
        this.mostrarGenero = true;
        this.mostrarEstadoCivil = true;
        break;
      case 'PASAPORTE':
        this.tituloFormulario = `${prefijo} de Entidades (Pasaporte)`;
        this.labelNombre = 'Primer Nombre / Razón Social';
        this.labelApellido = 'Primer Apellido / Nombre Comercial';
        this.labelFecha = 'Fecha de Nacimiento';
        this.mostrarGenero = true;
        this.mostrarEstadoCivil = true;
        break;
      default:
        this.tituloFormulario = `${prefijo} de Entidades`;
        this.mostrarGenero = true;
        this.mostrarEstadoCivil = true;
    }
  }
  private setLongitudValidator(tipo: string) {
    let length = 20;
    if (tipo === 'CÉDULA') length = 10;
    else if (tipo === 'RUC') length = 13;

    const control = this.personaForm.get('numeroDocumento');
    control?.setValidators([
      Validators.required,
      Validators.minLength(length),
      Validators.maxLength(length),
      CustomValidators.onlyNumbers
    ]);
    control?.updateValueAndValidity();
  }
  get maxLengthDocumento(): number {
    const tipo = this.personaForm.get('idTipoDocumento')?.value;
    if (tipo === 'CÉDULA') return 10;
    if (tipo === 'RUC') return 13;
    return 20;
  }

  onKeyDownDocumento(event: KeyboardEvent) {
    const tipo = this.personaForm.get('tipoDocumentoDescripcion')?.value;
    let max = 20;
    if (tipo === 'CÉDULA') max = 10;
    else if (tipo === 'RUC') max = 13;
    CustomValidators.limitInputLength(event, max);
  }

  private initForm() {
    this.personaForm = this.fb.group({
      primerNombre: ['', [Validators.required, CustomValidators.onlyLetters, CustomValidators.onlyLettersKeyPress,  Validators.maxLength(100)]],
      segundoNombre: ['', [CustomValidators.onlyLetters,  Validators.maxLength(100)]],
      primerApellido: ['', [Validators.required, CustomValidators.onlyLetters, Validators.maxLength(100)]],
      segundoApellido: ['', [CustomValidators.onlyLetters,  Validators.maxLength(100)]],
      numeroDocumento: [
        { value: '', disabled: false },
        [Validators.required, Validators.minLength(10), CustomValidators.onlyNumbers,  CustomValidators.exactLengthByTipoDocumento('idTipoDocumento')]
      ],
      idTipoDocumento: [{ value: null, disabled: false }, [Validators.required]],
      tipoDocumentoDescripcion: [''],
      idEstadoCivil: [null, [Validators.required]],
      idGenero: [null, [Validators.required]],
      idCiudad: [null, [Validators.required]],
      fechaNacimiento: ['', [Validators.required]],
      tipoPersona: ['NATURAL', [Validators.required]],
      status: [true]
    });

  }
  onKeyPressLetters = CustomValidators.onlyLettersKeyPress;
  onKeyPressNumbers = CustomValidators.onlyNumbersKeyPress;
  private allEstadosCiviles: EstadoCivil[] = []; // guarda todos

  private async cargarCatalogos(): Promise<void> {
    let pendientes = 4;

    return new Promise<void>((resolve) => {
      const check = () => {
        pendientes--;
        if (pendientes === 0) resolve();
      };

      this.ciudadService.getCiudades().subscribe({
        next: (data) => {
          this.ciudades = data;
          this.filteredCiudades$.next(data);
          check();
        },
        error: () => {
          console.error('❌ Error al cargar ciudades');
          check();
        }
      });

      this.tipoDocumentoService.getTiposDocumento().subscribe({
        next: (data) => {
          this.tiposDocumento = data;

          const tipoIdentificacion = this.route.snapshot.queryParamMap.get('tipoIdentificacion');
          if (tipoIdentificacion) {
            const tipoEncontrado = this.tiposDocumento.find(t => t.descripcion === tipoIdentificacion);
            if (tipoEncontrado) {
              this.personaForm.get('idTipoDocumento')?.setValue(tipoEncontrado.idTipoDocumento);
              this.personaForm.get('idTipoDocumento')?.disable();
              this.setLongitudValidator(tipoIdentificacion);
              this.actualizarFormularioPorTipo(tipoIdentificacion);
            }
          }

          check();
        },
        error: () => {
          console.error('❌ Error al cargar tipos de documento');
          check();
        }
      });

      this.estadoCivilService.getEstadoCivil().subscribe({
        next: (data) => {
          this.allEstadosCiviles = data;
          this.filtrarEstadosCiviles();
          check();
        },
        error: () => {
          console.error('❌ Error al cargar estados civiles');
          check();
        }
      });

      this.generoService.getGeneros().subscribe({
        next: (data) => {
          this.generos = data;
          check();
        },
        error: () => {
          console.error('❌ Error al cargar géneros');
          check();
        }
      });
    });
  }



  private filtrarEstadosCiviles() {
    const tipo = this.personaForm.get('idTipoDocumento')?.value;
    const nombre = this.tiposDocumento.find(t => t.idTipoDocumento === tipo)?.descripcion;

    if (nombre === 'RUC') {
      // RUC: Solo "NO APLICA"
      this.estadosCiviles = this.allEstadosCiviles.filter(e =>
        e.estadoCivilNombre.toUpperCase() === 'NO APLICA'
      );

      const selected = this.personaForm.get('idEstadoCivil')?.value;
      const existe = this.estadosCiviles.some(e => e.estadoCivilCodigo === selected);
      if (!existe) {
        this.personaForm.get('idEstadoCivil')?.setValue(this.estadosCiviles[0]?.estadoCivilCodigo || null);
      }

    } else if (nombre === 'PASAPORTE') {
      // PASAPORTE: TODOS los estados civiles (incluyendo NO APLICA)
      this.estadosCiviles = [...this.allEstadosCiviles];
      
      const selected = this.personaForm.get('idEstadoCivil')?.value;
      const existe = this.estadosCiviles.some(e => e.estadoCivilCodigo === selected);
      if (!existe) {
        this.personaForm.get('idEstadoCivil')?.setValue(null);
      }

    } else {
      // CÉDULA y otros: Todos menos "NO APLICA"
      this.estadosCiviles = this.allEstadosCiviles.filter(e =>
        e.estadoCivilNombre.toUpperCase() !== 'NO APLICA'
      );

      const selected = this.personaForm.get('idEstadoCivil')?.value;
      const existe = this.estadosCiviles.some(e => e.estadoCivilCodigo === selected);
      if (!existe) {
        this.personaForm.get('idEstadoCivil')?.setValue(null);
      }
    }
  }

  private cargarDatosPersona(id: number) {
    this.personaService.getPersonaById(id).subscribe({
      next: (data) => {
        console.log('✅ Datos recibidos desde API:', data);

        // 👇 GUARDAR DOCUMENTO ORIGINAL
        this.documentoOriginal = data.identificacion || '';

        const descripcion = this.tiposDocumento.find(
          t => t.idTipoDocumento === data.idTipoDocumento
        )?.descripcion;

        if (descripcion) {
          this.setLongitudValidator(descripcion);
          this.actualizarFormularioPorTipo(descripcion);
          this.personaForm.get('tipoDocumentoDescripcion')?.setValue(descripcion);
          this.filtrarEstadosCiviles();
        }

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

        this.personaForm.get('numeroDocumento')?.disable();
        this.personaForm.get('idTipoDocumento')?.disable();

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
    const dialogRef = this.dialog.open(CorreoDialogComponent, {
      width: '600px',
      data: {
        correos: [...this.correos],
        modoEdicion: this.modoEdicion,
        personaId: this.personaId || 0
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result !== null) {
        this.correos = result;
      }
    });
  }

  openTelefonoDialog() {
    const dialogRef = this.dialog.open(TelefonoDialogComponent, {
      width: '600px',
      data: {
        telefonos: [...this.telefonos],
        modoEdicion: this.modoEdicion,
        personaId: this.personaId || 0
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result !== null) {
        this.telefonos = result;
      }
    });
  }

  openDireccionDialog() {
    const dialogRef = this.dialog.open(DireccionDialogComponent, {
      width: '600px',
      data: {
        direcciones: [...this.direcciones],
        modoEdicion: this.modoEdicion,
        personaId: this.personaId || 0
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result !== null) {
        this.direcciones = result;
      }
    });
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
  // onBlurDocumento() {
  //   const numero = this.personaForm.get('numeroDocumento')?.value;
  //   const tipo = this.personaForm.get('tipoDocumentoDescripcion')?.value;

  //   if (!numero || numero.length < 10) return;

  //   // 🔍 PASO 1: Verificar si ya existe en la base de datos
  //   this.personaService.buscarPersonaPorDocumento(numero).subscribe({
  //     next: (personas) => {
  //       if (personas && personas.length > 0) {
  //         // ✅ PERSONA ENCONTRADA EN BD
  //         const persona = personas[0];
          
  //         this.dialog.open(CustomMessageBoxComponent, {
  //           width: '450px',
  //           data: {
  //             title: 'Documento encontrado',
  //             message: `Ya existe una persona registrada con el documento ${numero}. ¿Desea cargar sus datos en el formulario?`,
  //             type: 'info',
  //             confirmText: 'Sí, cargar datos',
  //             cancelText: 'No, continuar',
  //             showCancel: true
  //           }
  //         }).afterClosed().subscribe(result => {
  //           if (result) {
  //             // Usuario aceptó cargar los datos existentes
  //             this.cargarDatosPersonaExistente(persona);
  //           }
  //         });
  //       } else {
  //         // ❌ NO EXISTE EN BD: Consultar APIs externas
  //         this.consultarAPIsExternas(numero, tipo);
  //       }
  //     },
  //     error: (err) => {
  //       console.error('Error al buscar en BD:', err);
  //       // Si falla la búsqueda en BD, continuar con APIs externas
  //       this.consultarAPIsExternas(numero, tipo);
  //     }
  //   });
  // }
  onBlurDocumento() {
    const numero = this.personaForm.get('numeroDocumento')?.value;
    const tipo = this.personaForm.get('tipoDocumentoDescripcion')?.value;

    // Si ya se validó este documento, no hacer nada
    if (this.documentoYaValidado && numero === this.ultimoDocumentoValidado) {
      return;
    }

    if (!numero || numero.length < 10) return;

    // Ejecutar validación
    this.ejecutarValidacionDocumento(numero, tipo);
  }

  private ejecutarValidacionDocumento(numero: string, tipo: string) {
    // Validar longitud según tipo
    if (tipo === 'CÉDULA' && numero.length !== 10) return;
    if (tipo === 'RUC' && numero.length !== 13) return;
    if (tipo === 'PASAPORTE' && numero.length < 10) return;

    // 👇 NUEVO: Si estamos en modo edición y es el documento original, no validar
    if (this.modoEdicion && numero === this.documentoOriginal) {
      console.log('⏭️ Saltando validación: es el documento original en modo edición');
      return;
    }

    // Marcar como validando
    this.validandoDocumento = true;

    // 🔍 PASO 1: Verificar si ya existe en la base de datos
    this.personaService.buscarPersonaPorDocumento(numero).subscribe({
      next: (personas) => {
        this.validandoDocumento = false;

        if (personas && personas.length > 0) {
          // ✅ PERSONA ENCONTRADA EN BD
          const persona = personas[0];
          
          // 👇 NUEVO: Si estamos editando la misma persona, no mostrar diálogo
          if (this.modoEdicion && persona.personaCodigo === this.personaId) {
            console.log('⏭️ Saltando diálogo: es la misma persona que estamos editando');
            return;
          }
          
          // Marcar como validado
          this.documentoYaValidado = true;
          this.ultimoDocumentoValidado = numero;

          this.dialog.open(CustomMessageBoxComponent, {
            width: '450px',
            data: {
              title: 'Documento encontrado',
              message: `Ya existe una persona registrada con el documento ${numero}. ¿Desea cargar sus datos en el formulario?`,
              type: 'info',
              confirmText: 'Sí, cargar datos',
              cancelText: 'No, continuar',
              showCancel: true
            }
          }).afterClosed().subscribe(result => {
            if (result) {
              this.cargarDatosPersonaExistente(persona);
            }
          });
        } else {
          // ❌ NO EXISTE EN BD: Consultar APIs externas
          this.consultarAPIsExternas(numero, tipo);
        }
      },
      error: (err) => {
        this.validandoDocumento = false;
        console.error('Error al buscar en BD:', err);
        this.consultarAPIsExternas(numero, tipo);
      }
    });
  }
    
  private consultarAPIsExternas(numero: string, tipo: string) {
    // ============================================
    // CONSULTA RUC
    // ============================================
    if (tipo === 'RUC' && numero.length === 13 && /^\d+$/.test(numero)) {
      this.consultaRucService.consultarRuc(numero).subscribe({
        next: (data: RucConsulta) => {
          // Marcar como validado
          this.documentoYaValidado = true;
          this.ultimoDocumentoValidado = numero;

          this.personaForm.patchValue({
            primerNombre: data.razonSocial || '',
            fechaNacimiento: DateUtils.normalizeDateString(
              data.informacionFechasContribuyente?.fechaInicioActividades ?? '1980-01-01'
            ),
            tipoPersona: 'JURÍDICA',
            idEstadoCivil: 5
          });

          this.dialog.open(CustomMessageBoxComponent, {
            width: '400px',
            data: {
              title: 'RUC encontrado',
              message: `Datos obtenidos correctamente para el RUC ${numero}.`,
              type: 'success',
              confirmText: 'Aceptar',
              showCancel: false
            }
          });
        },
        error: () => {
          this.dialog.open(CustomMessageBoxComponent, {
            width: '400px',
            data: {
              title: 'RUC no encontrado',
              message: `No se encontraron datos para el RUC ${numero} en el servicio externo.`,
              type: 'error',
              confirmText: 'Cerrar',
              showCancel: false
            }
          });
        }
      });
    }

    // ============================================
    // CONSULTA CÉDULA
    // ============================================
    if (tipo === 'CÉDULA') {
      this.registroCivilService.consultarCedula(numero).subscribe({
        next: (data) => {
          // Marcar como validado
          this.documentoYaValidado = true;
          this.ultimoDocumentoValidado = numero;

          const partes = data.nombre?.trim().split(' ') ?? [];
          const idGenero = this.mapGenero(data.genero);
          const idEstadoCivil = this.mapEstadoCivil(data.estadoCivil);

          this.personaForm.patchValue({
            primerApellido: partes[0] || '',
            segundoApellido: partes[1] || '',
            primerNombre: partes[2] || '',
            segundoNombre: partes[3] || '',
            fechaNacimiento: this.convertirFecha(data.fechaNacimiento),
            tipoPersona: 'NATURAL'
          });

          if (idGenero !== null) {
            this.personaForm.get('idGenero')?.setValue(idGenero);
          }

          if (idEstadoCivil !== null) {
            this.personaForm.get('idEstadoCivil')?.setValue(idEstadoCivil);
          }

          this.dialog.open(CustomMessageBoxComponent, {
            width: '400px',
            data: {
              title: 'Cédula encontrada',
              message: `Datos obtenidos correctamente para la cédula ${numero}.`,
              type: 'success',
              confirmText: 'Aceptar',
              showCancel: false
            }
          });
        },
        error: () => {
          this.dialog.open(CustomMessageBoxComponent, {
            width: '400px',
            data: {
              title: 'Cédula no encontrada',
              message: `No se encontraron datos para la cédula ${numero} en el Registro Civil.`,
              type: 'error',
              confirmText: 'Cerrar',
              showCancel: false
            }
          });
        }
      });
    }
  }
  private cargarDatosPersonaExistente(persona: PersonaResponse) {
    console.log('📥 Cargando datos de persona existente:', persona);

    // Obtener la descripción del tipo de documento
    const descripcion = this.tiposDocumento.find(
      t => t.idTipoDocumento === persona.idTipoDocumento
    )?.descripcion;

    if (descripcion) {
      this.setLongitudValidator(descripcion);
      this.actualizarFormularioPorTipo(descripcion);
      this.personaForm.get('tipoDocumentoDescripcion')?.setValue(descripcion);
      this.filtrarEstadosCiviles();
    }

    // Cargar todos los datos en el formulario
    this.personaForm.patchValue({
      primerNombre: persona.primerNombre || '',
      segundoNombre: persona.segundoNombre || '',
      primerApellido: persona.primerApellido || '',
      segundoApellido: persona.segundoApellido || '',
      numeroDocumento: persona.identificacion || '',
      idTipoDocumento: persona.idTipoDocumento || null,
      idEstadoCivil: persona.idEstadoCivil || null,
      idGenero: persona.idGenero || null,
      idCiudad: persona.idCiudad || null,
      fechaNacimiento: persona.fechaNacimiento || '',
      tipoPersona: persona.tipoPersona || 'NATURAL',
      status: persona.status
    });

    // Deshabilitar campos clave
    this.personaForm.get('numeroDocumento')?.disable();
    this.personaForm.get('idTipoDocumento')?.disable();

    // Cargar datos relacionados
    this.correos = persona.correos || [];
    this.telefonos = persona.telefonos || [];
    this.direcciones = persona.direcciones || [];

    // Mostrar mensaje de éxito
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: 'Datos cargados',
        message: `Se han cargado los datos de: ${persona.primerNombre} ${persona.primerApellido}`,
        type: 'success',
        confirmText: 'Aceptar',
        showCancel: false
      }
    });
  }
  private mostrarMensajeRequerido(campos: string[]) {
    const listaCampos = campos.join(', ').replace(/, ([^,]*)$/, ' y $1'); // "a, b y c"
    const mensaje = `Debe agregar al menos un/a ${listaCampos} antes de guardar.`;

    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: 'Campos requeridos',
        message: mensaje,
        type: 'warning',
        confirmText: 'Aceptar',
        showCancel: false
      }
    });
  }



  private extraerFechaISO(fecha: string | null | undefined): string {
    if (!fecha) return '1980-01-01';
    return fecha.split(' ')[0]; // '2017-04-07'
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
    console.log('✅ MÉTODO GUARDAR EJECUTADO');

    if (!this.mostrarGenero) {
      const generoOtros = this.generos.find(g => g.generoDescripcion.toLowerCase() === 'otros');
      this.personaForm.get('idGenero')?.setValue(generoOtros?.generoCodigo ?? null);
    }
     // Validaciones adicionales antes de continuar
     const camposFaltantes: string[] = [];

     if (this.correos.length === 0) camposFaltantes.push('correo electrónico');
     if (this.telefonos.length === 0) camposFaltantes.push('número de teléfono');
     if (this.direcciones.length === 0) camposFaltantes.push('dirección');

     if (camposFaltantes.length > 0) {
       this.mostrarMensajeRequerido(camposFaltantes);
       return;
     }

    // Mostrar todos los valores del formulario y errores antes de validar
    console.log('📋 Valores del formulario:', this.personaForm.getRawValue());
    console.log('❗ Formulario inválido:', this.personaForm.invalid);
    console.log('🛑 Errores del formulario:', this.obtenerErroresFormulario());

    if (this.personaForm.valid) {
      console.log('🧪 Formulario válido: TRUE');

      // Habilitar campos para obtener su valor
      this.personaForm.get('numeroDocumento')?.enable();
      this.personaForm.get('idTipoDocumento')?.enable();

      const formValues = this.personaForm.getRawValue();

      // Restaurar estado si es edición
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
      console.log('📤 ID de Estado Civil enviado:', formValues.idEstadoCivil);

      console.log('📤 Payload a enviar:', payload);

      const save$ = this.modoEdicion
        ? this.personaService.updatePersona(this.personaId, payload)
        : this.personaService.createPersona(payload);

      save$.subscribe({
        next: (data) => {
          console.log('✅ Respuesta del backend:', data);
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
          console.error('❌ Error al guardar entidad:', err);
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
      console.warn('⚠️ El formulario no es válido, no se enviará');
    }
  }
  private obtenerErroresFormulario(): any {
    const errores: any = {};
    Object.keys(this.personaForm.controls).forEach(key => {
      const control = this.personaForm.get(key);
      if (control && control.invalid) {
        errores[key] = control.errors;
      }
    });
    return errores;
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
