import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FechasControlService } from 'src/app/services/fechascontrol.service';
import { FechasControlRequest } from 'src/app/interfaces/requests/fechas-control-request';
import { Observable } from 'rxjs';
import { TipoAsientoService } from 'src/app/services/tipoasiento.service';
import { TipoAsientoResponse } from 'src/app/interfaces/responses/tipo-asiento-response';
import { tap, shareReplay } from 'rxjs/operators';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { UsuarioService } from 'src/app/services/usuario.service';



@Component({
  selector: 'app-fechas-control-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './fechas-control-form.component.html',
  styleUrls: ['./fechas-control-form.component.css']
})
export class FechasControlFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  fecValMonth: string | null = null;

   usuarioActual = this.usuarioService.getUsuarioActual();


  // para el <select> (async) y para mapear en TS
  tiposAsiento$!: Observable<TipoAsientoResponse[]>;
  private tipoAsientos: Array<{ id: number; nombre: string; tipDoc: string }> = [];

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private fechascontrolservice: FechasControlService,
    private dialog: MatDialog,
    private tipoasientoservice: TipoAsientoService,
    public dialogRef: MatDialogRef<FechasControlFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      IdFechaControl: [0],
      FecVal: ['', [Validators.required, Validators.maxLength(7)]], // MM/YYYY
      TipDoc: ['', [Validators.required, Validators.maxLength(2)]],
      VarVal: ['', [Validators.required, Validators.maxLength(1)]],
      Dias: [0, [Validators.required]],
      NumDoc: [0],
      TipoCon: ['', [Validators.required, Validators.maxLength(1)]],
      Fecha: ['', [Validators.required, Validators.maxLength(10)]], // YYYYMM (según tu uso)
      Ocupado: [false],
      IdTipoAsiento: [null, Validators.required],
      IdEmpresa:this.usuarioActual?.id_empresa,

    });

    // Forzar mayúsculas en TipDoc mientras escribe
    this.form.get('TipDoc')?.valueChanges.subscribe(v => {
      if (typeof v === 'string') {
        const up = v.toUpperCase();
        if (v !== up) this.form.get('TipDoc')?.setValue(up, { emitEvent: false });
      }
    });

    // Cargar tipos de asiento (para el combo) y guardar copia normalizada para lookup
    this.tiposAsiento$ = this.tipoasientoservice.ListadoAsiento().pipe(
      tap(list => {
        this.tipoAsientos = (list ?? []).map((r: any) => ({
          id: r.IdTipoAsiento ?? r[' IdTipoAsiento'], // por si viene con espacio
          nombre: (r.Descripcion ?? r.TipAsiento ?? '').toString().trim(),
          // Campo que representa el código de doc a copiar a TipDoc (ajusta si tu API usa otro nombre)
          tipDoc: (r.TipAsiento ?? r.CodigoDoc ?? '').toString().trim().toUpperCase()
        }));
        // Si ya hay IdTipoAsiento (edición), sincroniza TipDoc cuando llegue el catálogo
        this.syncTipDocFromCurrentId();
      }),
      shareReplay(1)
    );

    // Vincular cambios del combo a TipDoc
    this.bindTipoAsientoToTipDoc();

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.fechascontrolservice.getById(this.data.id).subscribe({
        next: (res) => {
          this.form.patchValue(res.data);
          this.syncMonthFromFecVal();
          // Si el catálogo ya está cargado, sincroniza; si no, lo hará el tap() de arriba
          this.syncTipDocFromCurrentId();
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar control de fechas.',
          showCancel: false
        })
      });
    } else {
      this.syncMonthFromFecVal();
    }

    if (this.isEditMode) {
        this.form.get('IdTipoAsiento')?.disable({ emitEvent: false });
      } else {
        this.form.get('IdTipoAsiento')?.enable({ emitEvent: false });
      }


  }

  private bindTipoAsientoToTipDoc(): void {
    this.form.get('IdTipoAsiento')?.valueChanges.subscribe((id: number | null) => {
      const ta = this.tipoAsientos.find(x => x.id === Number(id));
      const tipDoc = (ta?.tipDoc ?? '').slice(0, 2); // asegura 2 caracteres
      this.form.get('TipDoc')?.setValue(tipDoc, { emitEvent: false });
    });
  }

  private syncTipDocFromCurrentId(): void {
    const id = this.form.get('IdTipoAsiento')?.value;
    const ta = this.tipoAsientos.find(x => x.id === Number(id));
    const tipDoc = (ta?.tipDoc ?? '').slice(0, 2);
    this.form.get('TipDoc')?.setValue(tipDoc, { emitEvent: false });
  }

  private syncMonthFromFecVal(): void {
    const mmYY: string = (this.form.get('FecVal')?.value ?? '').toString().trim();
    const [mm, yyyy] = mmYY.split('/');
    this.fecValMonth = (mm && yyyy) ? `${yyyy}-${mm.padStart(2,'0')}` : null;
  }

  onSelectMonth(ev: Event) {
    const value = (ev.target as HTMLInputElement)?.value || ''; // YYYY-MM
    if (!value) return;

    const [yyyy, mm] = value.split('-');
    if (!yyyy || !mm) return;

    const mm2 = mm.padStart(2, '0');

    const fecVal = `${mm2}/${yyyy}`; // MM/YYYY
    const fecha  = `${yyyy}${mm2}`;  // YYYYMM (según tu código)
    const dias   = new Date(+yyyy, +mm2, 0).getDate();
    const yy     = fecha.slice(2, 4);
    const numedoc = `${yy}${mm2}0001`;

    this.form.patchValue({
      FecVal: fecVal,
      Fecha:  fecha,
      Dias:   dias,
      TipoCon:'A',
      VarVal: 'A',
      NumDoc: numedoc
    }, { emitEvent: true });

    this.fecValMonth = value;
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
    const data: FechasControlRequest = {
      ...raw,
      FecVal:  String(raw.FecVal ?? '').trim().toUpperCase(),
      TipDoc:  String(raw.TipDoc ?? '').trim().toUpperCase(),
      VarVal:  String(raw.VarVal ?? '').trim().toUpperCase(),
      TipoCon: String(raw.TipoCon ?? '').trim().toUpperCase(),
      Fecha:   String(raw.Fecha ?? '').trim(),
      Dias:    Number(raw.Dias ?? 0),
      NumDoc:  Number(raw.NumDoc ?? 0),
      IdTipoAsiento: Number(raw.IdTipoAsiento ?? 0),
    };

    const req$ = this.isEditMode
      ? this.fechascontrolservice.update(data.IdFechaControl!, data)
      : this.fechascontrolservice.create(data);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Fecha de Control ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: () =>
        this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} Fecha de Control.`,
          showCancel: false
        })
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

  soloNumeros(ev: KeyboardEvent) {
    const k = ev.key;
    if (!/[0-9]/.test(k) && k !== 'Backspace' && k !== 'Tab' &&
        k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'Delete') {
      ev.preventDefault();
    }
  }
  soloLetras(ev: KeyboardEvent) {
    const k = ev.key;
    if (!/[A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s]/.test(k) && k !== 'Backspace' && k !== 'Tab' &&
        k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'Delete') {
      ev.preventDefault();
    }
  }
  bloquearPegadoSiSoloLectura(ev: ClipboardEvent | DragEvent) {
    if (this.isEditMode) ev.preventDefault();
  }
}
