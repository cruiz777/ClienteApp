import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PrefijoService, PrefijoClienteResponse,ActualizarPrefijoPayload} from 'src/app/services/prefijo.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ViewEncapsulation } from '@angular/core';
import { Renderer2 } from '@angular/core';
import { compileDeferResolverFunction } from '@angular/compiler';
import { formatDate } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GenerarglnService } from 'src/app/services/generargln.service';
import { GlnService, GlnRequest } from 'src/app/services/gln.service';
import { NcontrolService, NumeroControlMinDto } from 'src/app/services/ncontrol.service';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { ClienteIndividual, ClienteService } from 'src/app/services/cliente.service';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';

@Component({
  selector: 'app-dialog-prefijo',
  templateUrl: './dialog-prefijo.component.html',
  styleUrl: './dialog-prefijo.component.css',
  encapsulation: ViewEncapsulation.None
})
export class DialogPrefijoComponent implements OnInit{

  idCliente: number;
  dataSourcePrefijo = new MatTableDataSource<PrefijoClienteResponse>();
  prefijoSeleccionado: PrefijoClienteResponse | null = null;
prefijoExistente = false;
  displayedPrefijoColumns: string[] = [
    'id_prefijos',
    'clientesCodigo',
    'nomcli',
    'codpre',
    'gln',
    'fecha',
    'estado',
    'act',
    'fechaCierre'
  ];
  selectedTabIndex: number = 0;
    modificarSecuencia = false;
      campoGlnVerde = false;
      longitudPrefijo = 6; // Se puede cambiar dinámicamente si quieres
  longitudPrefijoMin = 0;
  longitudPrefijoMax = 0;
  formPrefijo!: FormGroup;
  modoEdicion = false;

  @ViewChild('paginatorPrefijo', { static: false }) paginatorPrefijo!: MatPaginator;
  @ViewChild(MatSort) sortPrefijo!: MatSort;
 
  constructor(
    public dialogRef: MatDialogRef<DialogPrefijoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private prefijoService: PrefijoService,
    private renderer: Renderer2,
    private fb: FormBuilder ,
     private _snackBar: MatSnackBar,
     private generarglnService: GenerarglnService,
       private dialog: MatDialog,
       private ncontrolService: NcontrolService,
           private glnService: GlnService,
           private clienteService: ClienteService,
           
  ) {
    this.idCliente = data.idCliente;
  }

  ngOnInit(): void {
    
   
    this.formPrefijo = this.fb.group({
    prefix: ['', Validators.required],
     codigoCliente: [{ value: '', disabled: false }],
     prefijo: [{ value: '', disabled: true }],
        prefijogs1: [''],
        origen: [''],
        gln: [''],
        nomcli:[''],
        ruccli:['']
  
  });
  this.cargarCliente(this.idCliente);
  }

  confirmar(): void {
    this.dialogRef.close(this.prefijoSeleccionado);
  }

  


 onModificarSecuenciaChange(event: any): void {
    this.modificarSecuencia = event.target.checked;

    const prefijoControl = this.formPrefijo.get('prefijo');
    const asignacionPrefix = this.formPrefijo.get('prefix')?.value;

    if (this.modificarSecuencia) {
      prefijoControl?.enable();

      // Configurar límites dinámicamente
      if (asignacionPrefix === '5') {
        this.longitudPrefijoMin = 5;
        this.longitudPrefijoMax = 5;
      } else if (asignacionPrefix === '6') {
        this.longitudPrefijoMin = 6;
        this.longitudPrefijoMax = 6;
      } else if (asignacionPrefix === 'USA') {
        this.longitudPrefijoMin = 6;
        this.longitudPrefijoMax = 10;
      } else if (asignacionPrefix === 'MSV') {
        this.longitudPrefijoMin = 8;
        this.longitudPrefijoMax = 8;
      } else {
        this.longitudPrefijoMin = 0;
        this.longitudPrefijoMax = 0;
      }

      // 🔥 Aplicar validadores nuevos
      prefijoControl?.setValidators([
        Validators.required,
        Validators.pattern(/^\d+$/),
        this.prefijoValidator(this.longitudPrefijoMin, this.longitudPrefijoMax)
      ]);

    } else {
      prefijoControl?.disable();
      prefijoControl?.clearValidators();
      prefijoControl?.setValue('');
    }

    prefijoControl?.updateValueAndValidity();
  }
  actualizarValidacionPrefijo(prefix: string): void {
    const prefijoControl = this.formPrefijo.get('prefijo');

    if (!prefijoControl) return;

    if (prefix === '5') {
      this.longitudPrefijoMin = 5;
      this.longitudPrefijoMax = 5;
    } else if (prefix === '6') {
      this.longitudPrefijoMin = 6;
      this.longitudPrefijoMax = 6;
    } else if (prefix === '7') {
      this.longitudPrefijoMin = 7;
      this.longitudPrefijoMax = 7;
    } else if (prefix === '8') {
      this.longitudPrefijoMin = 8;
      this.longitudPrefijoMax = 8;
    } else if (prefix === 'USA') {
      this.longitudPrefijoMin = 4;
      this.longitudPrefijoMax = 10;
    } else if (prefix === 'MSV') {
      this.longitudPrefijoMin = 8;
      this.longitudPrefijoMax = 8;
    } else {
      this.longitudPrefijoMin = 0;
      this.longitudPrefijoMax = 0;
    }

    // 🔥 APLICAR NUEVOS VALIDADORES
    prefijoControl.setValidators([
      Validators.required,
      Validators.pattern(/^\d+$/),
      this.prefijoValidator(this.longitudPrefijoMin, this.longitudPrefijoMax)
    ]);

    prefijoControl.updateValueAndValidity();
  }


  onPrefijoInput(): void {
    const prefijoControl = this.formPrefijo.get('prefijo');
    let value = prefijoControl?.value || '';

    // Limpiar todo lo que no sea dígito
    value = value.replace(/\D/g, '');

    // Limitar al máximo permitido
    if (this.longitudPrefijoMax > 0 && value.length > this.longitudPrefijoMax) {
      value = value.substring(0, this.longitudPrefijoMax);
    }

    prefijoControl?.setValue(value, { emitEvent: false });

    // Marcar como tocado
    prefijoControl?.markAsTouched();
    prefijoControl?.updateValueAndValidity();

    // Verificar si el prefijo ya existe al salir del campo (blur)
    if (value.length >= this.longitudPrefijoMin) {
      this.prefijoService.buscarPorCodpre(value).subscribe({
        next: (data) => {
          if (data && data.length > 0) {
            this.prefijoExistente = true;
            this.mostrarAlerta('❗El prefijo ya existe. Ingrese uno diferente.', 'Advertencia');
            prefijoControl?.setValue('');
            prefijoControl?.markAsTouched();
            prefijoControl?.markAsDirty();
            prefijoControl?.updateValueAndValidity();
          } else {
            this.prefijoExistente = false;
          }
        },
        error: (err) => {
          console.error('❌ Error al buscar prefijo:', err);
        }
      });
    }
  }


  prefijoValidator(min: number, max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value || '';

      if (!value) return { required: true };
      if (value.length < min) return { minLengthError: true };
      if (value.length > max) return { maxLengthError: true };

      return null;
    };
  }

  mostrarAlerta(mensaje: string, tipo: string) {
    this._snackBar.open(mensaje, tipo, {
      horizontalPosition: "end",
      verticalPosition: "top",
      duration: 5000
    });
  }


guardarPrefijo(): void {
    const prefix = this.formPrefijo.get('prefix')?.value;
    let idControl: number;
    let pais: string = '';
    let codigogs1: string = ''

    debugger
    switch (prefix) {
      case '5':
        idControl = 70;
        pais = 'EC';
        codigogs1 = '786'
        break;
      case '6':
        idControl = 71;
        pais = 'EC';
        codigogs1 = '786'
        break;
      case '7':
        idControl = 73;
        pais = 'EC';
        codigogs1 = '786'
        break;
      case '8':
        idControl = 72;
        pais = 'EC';
        codigogs1 = '786'
        break;
      case 'MSV':
        idControl = 75;
        pais = 'EC';
        codigogs1 = '786'
        break;
      case 'USA':
        idControl = 0;
        pais = 'US';
        codigogs1 = ''
        break;
      default:
        this.mostrarAlerta('Prefijo no válido seleccionado', 'Error');
        return;
    }

    if (this.modificarSecuencia) {

      // Si se modifica la secuencia manualmente
      const paso1 = this.formPrefijo.getRawValue();
      const codigoCliente = paso1.codigoCliente || 0;
      const prefijo = paso1.prefijo || '0';
      this.formPrefijo.get('prefijogs1')?.enable(); // ✅ Habilita temporalmente
      this.formPrefijo.patchValue({
        prefijo: prefijo,
        prefijogs1: `${codigogs1}${prefijo}`,
        origen: pais
      });

      // Luego generamos el GLN
      const glnGenerado = this.generarGLN();
      this.campoGlnVerde = true;
      this.formPrefijo.patchValue({
        gln: glnGenerado
      });
      const bandera = prefix === 'USA' ? 2 : 0;
      const prefijoData = {
        codpre: prefijo,
        fecha: new Date().toISOString().split('T')[0],
        fechaCierre: null,
        observacion: '',
        digitos: prefijo.length.toString(),
        estado: false,
        control: 0,
        ngln: 0,
        bandera: bandera,
        facturar: 'C',
        codpro: '1174',
        nombre: `PREFIJO:`,
        fecfac: 'C',
        referenciaInterna: prefijo,
        prefijosgs1: `${codigogs1}${prefijo}`,
        origenPrefijo: pais,
        orden: 0,
        clientesCodigo: codigoCliente
      };

      console.log('✍️ Guardando prefijo ingresado manualmente:', prefijoData);

      this.prefijoService.guardarPrefijo(prefijoData).subscribe({
        next: () => {
          const msg = this.modoEdicion ? 'Creado' : 'creado';

          this.dialog.open(CustomMessageBoxComponent, {
            width: '400px',
            data: {
              title: 'Éxito',
              message: `El Cliente fue ${msg} correctamente.`,
              type: 'success',
              confirmText: '',
              showCancel: false
            }
          });

          this.formPrefijo.get('prefijo')?.disable();
         // this.botonGuardarDeshabilitado = true;
          this.guardarNuevoGln(); // ✅ estas van dentro del next
        },
        error: (err) => {
          console.error('❌ Error al actualizar cliente:', err);
          this.mostrarAlerta('No se pudo actualizar el cliente', 'Error');
        }
      });


    } else {
      // Flujo automático
      this.ncontrolService.obtenerNumeroControlMinPorId(idControl).subscribe({
        next: (data) => {
          const siguienteNum = (parseInt(data.numcon, 10) + 1).toString().padStart(data.numcon.length, '0');

          // Primero actualizamos prefijo, prefijoGS1 y origen
          this.formPrefijo.get('prefijogs1')?.enable(); // ✅ Habilita temporalmente
          this.formPrefijo.patchValue({
            prefijo: data.numcon,
            prefijogs1: `${codigogs1}${data.numcon}`,
            origen: pais
          });

          // Luego generamos el GLN
          const glnGenerado = this.generarGLN();
          this.campoGlnVerde = true;
          this.formPrefijo.patchValue({
            gln: glnGenerado
          });
          console.log('⚠️ Valores en form paso1:', this.formPrefijo.getRawValue());
          console.log('✅ Prefijo actualizado:', this.formPrefijo.get('prefijo')?.value);
          console.log('✅ Prefijo gs1 actualizado:', this.formPrefijo.get('prefijogs1')?.value);
          console.log('✅ GLN generado:', glnGenerado);

          const paso1 = this.formPrefijo.getRawValue();
          const codigoCliente = paso1.codigoCliente || 0;
          const prefijo = paso1.prefijo || '0';

          const prefijoData = {
            codpre: prefijo,
            fecha: new Date().toISOString().split('T')[0],
            fechaCierre: null,
            observacion: '',
            digitos: prefijo.length.toString(),
            estado: false,
            control: 0,
            ngln: 0,
            bandera: 0,
            facturar: 'C',
            codpro: '1174',
            nombre: `PREFIJO:`,
            fecfac: 'C',
            referenciaInterna: prefijo,
            prefijosgs1: `${codigogs1}${prefijo}`,
            origenPrefijo: pais,
            orden: 0,
            clientesCodigo: codigoCliente
          };

          console.log('📦 Enviando prefijo a guardar:', prefijoData);

          this.prefijoService.guardarPrefijo(prefijoData).subscribe({
            next: () => {
              const msg = this.modoEdicion ? 'Creado' : 'creado';

              this.dialog.open(CustomMessageBoxComponent, {
                width: '400px',
                data: {
                  title: 'Éxito',
                  message: `El Cliente fue ${msg} correctamente.`,
                  type: 'success',
                  confirmText: '',
                  showCancel: false
                }
              });

              this.guardarNuevoGln(); // ✅ llamada adicional
              this.actualizarNumeroControl(idControl, siguienteNum, false); // ✅ nueva lógica
              //this.botonGuardarDeshabilitado = true; // ✅ se desactiva el botón luego de guardar
            },
            error: () => {
              this.mostrarAlerta('Error al guardar el prefijo', 'Error');
            }
          });


        },
        error: (err) => {
          console.error('❌ Error al obtener el número de control:', err);
          this.mostrarAlerta('Error al obtener el número de control', 'Error');
        }
      });
    }
  }
 guardarNuevoGln(): void {
    
    
    const { prefijo, codigoCliente, gln } = this.formPrefijo.getRawValue();
console.log('✅ Prefijo leído con getRawValue():', prefijo);

    if (!prefijo || !codigoCliente || !gln) {
      console.warn('⚠️ Faltan datos necesarios para guardar el GLN.');
      return;
    }

    this.prefijoService.buscarPorCodpre(prefijo).subscribe({
      next: (resultado) => {
        if (!resultado || resultado.length === 0) {
          console.warn('⚠️ No se encontró ningún prefijo con ese código.');
          return;
        }

        const id_prefijos = resultado[0].id_prefijos;

        const nuevoGln: GlnRequest = {
          id_prefijos: id_prefijos,
          clientesCodigo: codigoCliente,
          gln1: gln,
          idTipoLocalizacion: 12,
          glnLatitud: '0.0000',
          glnLongitud: '0.0000',
          paisCodigo: 1,
          direccion: 'Calle Ejemplo 123',
          telefono: '12345678',
          fax: '',
          contacto: 'Juan Pérez',
          contactoTel: '12345678',
          email: 'correo@ejemplo.com',
          web: 'http://example.com',
          fda: '',
          europa: '',
          glnGlobal: '',
          glnFecha: '2025-04-29',
          idCiudad: 1,
          glnCodigopostal: '170515',
          glnCelular: '0999999999',
          glnContacto2: '',
          glnEmail2: '',
          glnTel2: '',
          glnContacto3: '',
          glnEmail3: '',
          glnTel3: '',
          glnFacturar: 'S',
          glnCodpro: 'PROD01',
          glnNombre: 'Sucursal Principal',
          glnOtro1: '',
          glnOtro2: '',
          glnObs1: '',
          glnObs2: '',
          glnOrigenprefijo: 'EC',
          glnPrefijogs1: gln,
          glnGlnp: '',
          glnGlne: '',
          nombreLocalizacion: 'Matriz',
          observ: '',
          expprod: 1,
          gs1ec: 1,
          gs1latam: 0,
          gas1org: 0,
          google: 1,
          gs1otros: '',
          longG: '',
          longM: '',
          longS: '',
          longE: '',
          latiG: '',
          latiM: '',
          latiS: '',
          latiE: '',
          idUsuario: 2
        };

        this.glnService.insertarGln({ request: nuevoGln }).subscribe({
          next: () => {
            console.log('✅ GLN guardado exitosamente:', nuevoGln);
          },
          error: (error) => {
            console.error('❌ Error al guardar GLN:', error);
          }
        });

      },
      error: (err) => {
        console.error('❌ Error al buscar prefijos:', err);
      }
    });
  }
    generarGLN(): string {
    const n = this.formPrefijo.get('prefijo')?.value;
    const prefix = this.formPrefijo.get('prefix')?.value;
    const modificarSecuencia = this.modificarSecuencia; // Asegúrate de tener esta propiedad en tu componente

    debugger;
    if (!n || !prefix) {
      console.error('Prefijo o prefix inválido.');
      return '';
    }

    let idControl: number;

    switch (prefix) {
      case '5':
        idControl = 5;
        break;
      case '6':
        idControl = 6;
        break;
      case '7':
        idControl = 7;
        break;
      case '8':
        idControl = 8;
        break;
      case 'MSV':
        idControl = 8;
        break;
      case 'USA':
        idControl = n.length;
        break;
      default:
        console.error('Prefijo no válido.');
        return '';
    }

    const resultado = this.generarglnService.generarGln(idControl, n, modificarSecuencia);
    return resultado[0]; // Devuelve el primer GLN generado
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
 limpiarPrefijo(): void {
    const prefijoControl = this.formPrefijo.get('prefijo');
    let value = prefijoControl?.value || '';

    value = value.replace(/\D/g, '');

    if (this.longitudPrefijoMax > 0 && value.length > this.longitudPrefijoMax) {
      value = value.substring(0, this.longitudPrefijoMax);
    }

    prefijoControl?.setValue(value, { emitEvent: false });
  }
  validarPrefijoExistente(): void {
    const prefijoControl = this.formPrefijo.get('prefijo');
    const value = prefijoControl?.value;

    if (!value || value.length < this.longitudPrefijoMin) return;

    this.prefijoService.buscarPorCodpre(value).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.prefijoExistente = true;
          this.mostrarAlerta('❗El prefijo ya existe. Ingrese uno diferente.', 'Advertencia');
          prefijoControl?.setValue('');
          prefijoControl?.markAsTouched();
          prefijoControl?.markAsDirty();
          prefijoControl?.updateValueAndValidity();

          setTimeout(() => {
            const inputElement = document.querySelector('input[formcontrolname="prefijo"]') as HTMLInputElement;
            inputElement?.focus();
          });
        } else {
          this.prefijoExistente = false;
        }
      },
      error: (err) => {
        console.error('❌ Error al buscar prefijo:', err);
      }
    });
  }
cargarCliente(idCliente: number): void {
  this.clienteService.getClienteById(idCliente).subscribe({
    next: (cliente: ClienteIndividual) => {
      console.log('✅ Cliente cargado:', cliente);

      // Puedes usar los valores del cliente para inicializar campos del formulario si lo necesitas
      this.formPrefijo.patchValue({
        codigoCliente: cliente.clientes_codigo,
        nomcli: cliente.nomcli,
        ruccli:cliente.ruc
        // otros campos si los tienes en el modelo
      });
    },
    error: (err) => {
      console.error('❌ Error al obtener cliente:', err);
    }
  });
}
cerrar(): void {
  this.dialogRef.close('actualizado'); // o cualquier otro valor que quieras retornar
}


}
