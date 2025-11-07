import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { CodigosContablesService } from 'src/app/services/codigoscontables.service';
import { CodigosContablesRequest } from 'src/app/interfaces/requests/codigos-contables-request';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { UsuarioService } from 'src/app/services/usuario.service';
import { catchError } from 'rxjs/operators';
import { of, Observable } from 'rxjs';

type ApiResponse<T> = { success: boolean; message?: string; data: T };

@Component({
  selector: 'app-codigos-contables-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './maestro-codigos-form.component.html',
  styleUrls: ['./maestro-codigos-form.component.css']
})
export class CodigosContablesFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  usuarioActual = this.usuarioService.getUsuarioActual();

  constructor(
    private fb: FormBuilder,
    private codigosservice: CodigosContablesService,
    private usuarioService: UsuarioService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<CodigosContablesFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      // nombres en camelCase (coinciden con HTML)
      idCodContable: [0, [Validators.required]],
      identificacionauxiliar: ['', [Validators.required, Validators.maxLength(150)]],

      // campos adicionales
      idEmpresa: [this.usuarioActual?.id_empresa ?? null],
      nombreauxiliar: ['', [Validators.maxLength(150)]],
      direccionauxiliar: ['', [Validators.maxLength(200)]],
      telefonoauxiliar: ['', [Validators.maxLength(30)]],
      celularauxiliar: ['', [Validators.maxLength(30)]],
      emailauxiliar: ['', [Validators.maxLength(150)]],
      plazo: [0],
      razonsocial: ['', [Validators.maxLength(200)]],
      actividadComercial: ['', [Validators.maxLength(200)]],
      tipopersona: ['01', [Validators.required]],

      // 🔹 Mantenemos el checkbox para la UI...
      parterelacionadaBool: [false],
      // 🔹 ...y añadimos el valor entero que va al backend
      parterelacionada: [0], // 0 = No, 1 = Sí

      idPersona: [null],
      idCiudad: [null],
      idTipoContribuyente: [null],
      idUsuario: [this.usuarioActual?.id_usuario ?? null],
      estado: [true],
      fechaRegistro: [
        this.todayYmd(),
        [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]
      ]
    });

    /*
    // 🔄 Sincroniza checkbox (bool) -> entero (0/1)
    this.form.get('parterelacionadaBool')!.valueChanges.subscribe((v: boolean) => {
      this.form.get('parterelacionada')!.setValue(v ? 1 : 0, { emitEvent: false });
    });
*/
    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.codigosservice.getById(this.data.id)
        .pipe(
          catchError(() => {
            this.mostrarMensaje({
              type: 'error',
              title: 'Error',
              message: 'No se pudo cargar códigos contables.',
              showCancel: false
            });
            return of(null);
          })
        )
        .subscribe(res => {
          if (!res?.data) return;

          // adapta PascalCase -> camelCase y convierte a 0/1
          const d = res.data as any;
          const parNum: number =0;
           

          this.form.patchValue({
            idCodContable: d.idCodContable ?? d.IdCodContable ?? 0,
            identificacionauxiliar: d.identificacionauxiliar ?? d.Identificacionauxiliar ?? '',
            idEmpresa: d.idEmpresa ?? d.IdEmpresa ?? this.usuarioActual?.id_empresa ?? null,
            nombreauxiliar: d.nombreauxiliar ?? d.Nombreauxiliar ?? '',
            direccionauxiliar: d.direccionauxiliar ?? d.Direccionauxiliar ?? '',
            telefonoauxiliar: d.telefonoauxiliar ?? d.Telefonoauxiliar ?? '',
            celularauxiliar: d.celularauxiliar ?? d.Celularauxiliar ?? '',
            emailauxiliar: d.emailauxiliar ?? d.Emailauxiliar ?? '',
            plazo: d.plazo ?? d.Plazo ?? 0,
            razonsocial: d.razonsocial ?? d.RazonSocial ?? '',
            actividadComercial: d.actividadComercial ?? d.ActividadComercial ?? '',
            tipopersona: d.tipopersona ?? d.TipoPersona ?? '01',
            parterelacionada: parNum,
           // parterelacionadaBool: parNum === 1, // reflejar en el checkbox
            idPersona: d.idPersona ?? d.IdPersona ?? null,
            idCiudad: d.idCiudad ?? d.IdCiudad ?? null,
            idTipoContribuyente: d.idTipoContribuyente ?? d.IdTipoContribuyente ?? null,
            idUsuario: d.idUsuario ?? d.IdUsuario ?? this.usuarioActual?.id_usuario ?? null,
            estado: d.estado ?? d.Estado ?? true,
            fechaRegistro: (d.fechaRegistro ?? d.FechaRegistro ?? this.todayYmd()).toString().substring(0,10)
          });
        });
    }
  }

  
  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarMensaje({
        type: 'warning',
        title: 'Formulario inválido',
        message: 'Completa todos los campos obligatorios.',
        showCancel: false
      });
      return;
    }

    const raw = this.form.getRawValue();


    
    // arma el request; enviamos `parterelacionada` como entero 0/1
    const data: CodigosContablesRequest = {
      ...raw,
      idCodContable: Number(raw.idCodContable ?? 0),
      identificacionauxiliar: String(raw.identificacionauxiliar ?? '').trim().toUpperCase(),
      nombreauxiliar: String(raw.nombreauxiliar ?? '').trim().toUpperCase(),
      direccionauxiliar: String(raw.direccionauxiliar ?? '').trim().toUpperCase(),
      telefonoauxiliar: String(raw.telefonoauxiliar ?? ''),
      celularauxiliar: String(raw.celularauxiliar ?? ''),
      emailauxiliar: String(raw.emailauxiliar ?? ''),
      plazo: Number(raw.idCodContable ?? 0),
      razonsocial: String(raw.razonsocial ?? ''),
      actividadComercial: String(raw.actividadComercial ?? ''),
      tipopersona: String(raw.tipopersona ?? ''),

      //parterelacionada: Number(raw.parterelacionada ?? (raw.parterelacionadaBool ? 1 : 0))
      parterelacionada: Number(raw.parterelacionada ?? 0),
      
      idPersona: Number(raw.idPersona ?? ''),
      idCiudad: Number(raw.idCiudad ?? ''),
      idTipoContribuyente: Number(raw.idTipoContribuyente ?? ''),
      idUsuario: Number(raw.idUsuario ?? ''),
      estado: Boolean(raw.estado ?? ''),
      fechaRegistro: (raw.fechaRegistro ?? raw.fechaRegistro ?? this.todayYmd()).toString().substring(0,10)
      //Number(raw.fechaRegistro ?? ''),

    } as unknown as CodigosContablesRequest;

    // Opcional: si NO quieres mandar el bool al backend
    // delete (data as any).parterelacionadaBool;

    console.log('parterelacionada ->', raw.parterelacionada, 'bool ->', raw.parterelacionadaBool);
    

    let req$: Observable<ApiResponse<any>>;
    if (this.isEditMode) {
      req$ = this.codigosservice.update(data.IdCodContable as any, data) as unknown as Observable<ApiResponse<any>>;
    } else {
      req$ = this.codigosservice.create(data) as unknown as Observable<ApiResponse<any>>;
    }

    req$
      .pipe(
        catchError(() => {
          this.mostrarMensaje({
            type: 'error',
            title: 'Error',
            message: `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} códigos contables.`,
            showCancel: false
          });
          return of(null);
        })
      )
      .subscribe(res => {
        if (!res) return;
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Códigos contables ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false
        }).afterClosed().subscribe(() => this.dialogRef.close(true));
      });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }

  private todayYmd(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }
}
