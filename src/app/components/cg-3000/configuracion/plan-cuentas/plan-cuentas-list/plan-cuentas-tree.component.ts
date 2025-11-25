// src/app/components/plan-cuentas/plan-cuentas-tree/plan-cuentas-tree.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, AsyncValidatorFn } from '@angular/forms';
import { debounceTime, distinctUntilChanged, first, map, startWith, switchMap, catchError, tap } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTreeModule, MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { PlanCuentasService, PlanCuenta } from 'src/app/services/plan-cuentas.service';
import { CodigosEspecialesService, CodigoEspecialOpcion } from 'src/app/services/codigos-especiales.service';
import { CabeceraModeloService, CabeceraModeloOpcion } from 'src/app/services/cabeceramodelo.service';
import { Observable, of } from 'rxjs';
import { UsuarioService } from 'src/app/services/usuario.service';

type PlanCuentaCreateRequest = {
  CuentaPrincipal: string;
  CuentaMayor: string;
  CuentaSubcta: string;
  CuentaPresentacion: string;
  NombreCuenta: string;
  IdCodigoEspecial: number;
  IdNivel: number;
  Descripcion: string;
  CuentaHomologacion: string;
  PorcentajeRetencion: number;
  Estado: boolean;
  FechaActivacion: string;
  IdUsuario: number;
  IdCabModelo: number;
  ParentId: number;
  EsMovimiento: boolean;
  Orden: number;
  CuentaDetalle: string;
  CodigoCompleto: string;
  CodigoExterno: string;
  Norma: string;
  Alcanse: string;
  Medicion: string;
  IdEmpresa: number;
  Numerocuenta:string; 
  Formato:string; 
};
type PlanCuentaUpdateRequest = PlanCuentaCreateRequest & { IdPlanCuentas: number };

interface TreeNode { item: PlanCuenta; children: TreeNode[]; }
interface FlatNode { expandable: boolean; level: number; item: PlanCuenta; }

function buildTree(items: PlanCuenta[]): TreeNode[] {
  const byId = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];
  items.forEach(it => byId.set(it.IdPlanCuentas, { item: it, children: [] }));
  items.forEach(it => {
    const node = byId.get(it.IdPlanCuentas)!;
    const pid = it.ParentId ?? 0;
    if (pid && byId.has(pid)) byId.get(pid)!.children.push(node);
    else roots.push(node);
  });
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      const ao = a.item.Orden ?? 0, bo = b.item.Orden ?? 0;
      return ao !== bo ? ao - bo : (a.item.NombreCuenta ?? '').localeCompare(b.item.NombreCuenta ?? '');
    });
    nodes.forEach(n => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function dot(v: any): string {
  const s = (v ?? '').toString().trim();
  return s.length ? s : '.';
}

@Component({
  selector: 'app-plan-cuentas-tree',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTreeModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatCheckboxModule, MatTooltipModule, MatProgressBarModule, MatSnackBarModule
  ],
  templateUrl: './plan-cuentas-tree.component.html',
  styleUrls: ['./plan-cuentas-tree.component.css']
})
export class PlanCuentasTreeComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(PlanCuentasService);
  private snack = inject(MatSnackBar);

  private auth = inject(UsuarioService);
  usuarioActual = this.auth.getUsuarioActual();
  private idEmpresaActual = this.usuarioActual?.id_empresa ?? 0;

  loading = signal(false);
  errorMsg = signal<string | null>(null);

  allItems: PlanCuenta[] = [];
  treeRoots: TreeNode[] = [];

  private codEspSvc = inject(CodigosEspecialesService);
  opcionesCodEsp$!: Observable<CodigoEspecialOpcion[]>;

  private cabSvc = inject(CabeceraModeloService);
  modelosCabecera$!: Observable<CabeceraModeloOpcion[]>;
  trackByIdModelo = (_: number, it: CabeceraModeloOpcion) => it.id;

  // MatTree
  treeControl = new FlatTreeControl<FlatNode>(n => n.level, n => n.expandable);
  private _transformer = (n: TreeNode, level: number): FlatNode => ({ level, expandable: !!n.children?.length, item: n.item });
  treeFlattener = new MatTreeFlattener<TreeNode, FlatNode>(this._transformer, n => n.level, n => n.expandable, n => n.children);
  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
  hasChild = (_: number, node: FlatNode) => node.expandable;

  selectedNode = signal<FlatNode | null>(null);

  // Form
  form = this.fb.group({
    IdPlanCuentas: [0],
    ParentId: [0],
    IdNivel: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
    EsMovimiento: [false],
    Estado: [true],
    Orden: [0, [Validators.required]],
    NombreCuenta: ['', [Validators.required, Validators.maxLength(200)]],
    Descripcion: [''],
    CuentaDetalle: [''],
    CodigoCompleto: [''],
    CuentaPrincipal: [''],
    CuentaMayor: [''],
    CuentaSubcta: [''],
    CuentaPresentacion: [
      '',
      [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(10),
        Validators.pattern(/^\d{6}-\d{3}$/)
      ],
      [this.cuentaPresentacionUnicaValidator()]
    ],
    IdCodigoEspecial: [0, [Validators.required, this.requireSelection()]],
    CuentaHomologacion: [''],
    PorcentajeRetencion: [0, [Validators.required]],
    FechaActivacion: [''],
    IdUsuario: this.usuarioActual?.id_usuario,
    IdCabModelo: [0, [Validators.required, this.requireSelection()]],
    CodigoExterno: [''],
    Norma: [''],
    Alcanse: [''],
    Medicion: [''],
    IdEmpresa: this.idEmpresaActual,
    Numerocuenta:[''], 
    Formato:[''], 
  }, { updateOn: 'blur' });

  modoEdicion = toSignal(
    this.form.get('IdPlanCuentas')!.valueChanges.pipe(
      map(v => Number(v ?? 0) > 0),
      startWith(false)
    ),
    { initialValue: false }
  );

  ngOnInit(): void {
    // cargar solo por empresa
    this.cargar();

    this.form.get('EsMovimiento')?.disable({ emitEvent: false });
    this.form.patchValue({ IdEmpresa: this.idEmpresaActual }, { emitEvent: false });

    ['CuentaMayor', 'CuentaSubcta', 'CuentaPrincipal'].forEach(ctrl => {
      this.form.get(ctrl)?.valueChanges.pipe(debounceTime(150), distinctUntilChanged())
        .subscribe(() => this.recalcularPresentacion());
    });

    this.opcionesCodEsp$ = this.codEspSvc.ListadoCodigosEspeciales();
    this.modelosCabecera$ = this.cabSvc.listarCabModelos();
  }

  /** Validador asíncrono */
  private cuentaPresentacionUnicaValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      const valor = (control.value ?? '').toString().trim();
      if (!valor) return of(null);

      const idActual   = Number(this.form.get('IdPlanCuentas')?.value ?? 0);
      const idEmpresa  = Number(this.form.get('IdEmpresa')?.value ?? this.idEmpresaActual);

      // Si estoy editando y no cambió el valor, no validar
      if (idActual > 0) {
        const actual = this.allItems.find(x => x.IdPlanCuentas === idActual);
        if (actual && (actual.CuentaPresentacion ?? '') === valor && actual.IdEmpresa === idEmpresa) {
          return of(null);
        }
      }

      // ✅ Chequeo local rápido por empresa
      const existeLocal = this.allItems.some(x =>
        x.IdEmpresa === idEmpresa &&
        (x.CuentaPresentacion ?? '') === valor &&
        x.IdPlanCuentas !== idActual
      );
      if (existeLocal) {
        return of({ duplicada: true, message: 'La cuenta ya existe en esta empresa.' });
      }

      // ✅ Chequeo en servidor por empresa (y excluir Id actual)
      return of(valor).pipe(
        debounceTime(220),
        switchMap(v => this.svc.existeCuentaPresentacion(v, idEmpresa, idActual > 0 ? idActual : undefined)),
        map(r => (r.exists ? { duplicada: true, message: r.message || 'La cuenta ya existe en esta empresa.' } : null)),
        catchError(() => of(null)),
        first()
      );
    };
  }

  cargar(): void {
    this.loading.set(true);
    this.errorMsg.set(null);

    // ✅ filtra en el request por empresa
    this.svc.getAll({ idEmpresa: this.idEmpresaActual }).subscribe({
      next: items => {
        this.allItems = items ?? [];
        this.rebuildTree();
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set('No se pudo cargar el Plan de Cuentas');
        console.error(err);
      }
    });
  }

  rebuildTree(): void {
    const activos = (this.allItems ?? []).filter(x => x.Estado !== false);

    const expandedIds = new Set<number>(
      (this.treeControl.expansionModel.selected ?? []).map(n => n.item.IdPlanCuentas)
    );

    this.treeRoots = buildTree(activos);
    this.dataSource.data = this.treeRoots;

    queueMicrotask(() => {
      (this.treeControl.dataNodes ?? []).forEach(n => {
        if (expandedIds.has(n.item.IdPlanCuentas)) this.treeControl.expand(n);
      });
    });
  }

  seleccionar(node: FlatNode): void {
    this.selectedNode.set(node);
    const it = node.item;
    this.form.reset({
      IdPlanCuentas: it.IdPlanCuentas,
      ParentId: it.ParentId ?? 0,
      IdNivel: it.IdNivel,
      EsMovimiento: it.EsMovimiento,
      Estado: it.Estado !== false,
      Orden: it.Orden ?? 0,
      NombreCuenta: it.NombreCuenta,
      Descripcion: it.Descripcion ?? '',
      CuentaDetalle: it.CuentaDetalle ?? '',
      CodigoCompleto: it.CodigoCompleto ?? '',
      CuentaPrincipal: it.CuentaPrincipal ?? '',
      CuentaMayor: it.CuentaMayor ?? '',
      CuentaSubcta: it.CuentaSubcta ?? '',
      CuentaPresentacion: it.CuentaPresentacion ?? '',
      IdCodigoEspecial: Number(it.IdCodigoEspecial ?? 0),
      CuentaHomologacion: it.CuentaHomologacion ?? '',
      PorcentajeRetencion: Number(it.PorcentajeRetencion ?? 0),
      FechaActivacion: it.FechaActivacion ?? '',
      IdUsuario: Number(it.IdUsuario ?? 0),
      IdCabModelo: Number(it.IdCabModelo ?? 0),
      CodigoExterno: it.CodigoExterno ?? '',
      Norma: it.Norma ?? '',
      Alcanse: it.Alcanse ?? '',
      Medicion: it.Medicion ?? '',
      IdEmpresa: Number(it.IdEmpresa ?? this.idEmpresaActual),
      Numerocuenta: it.Numerocuenta ?? '',
      Formato: it.Formato ?? '',
    });
  }

  nuevoRaiz(): void {
    this.selectedNode.set(null);
    this.form.reset({
      IdPlanCuentas: 0,
      ParentId: 0,
      IdNivel: 1,
      EsMovimiento: false,
      Estado: true,
      Orden: 0,
      NombreCuenta: '',
      Descripcion: '',
      CuentaDetalle: '',
      CodigoCompleto: '',
      CuentaPrincipal: '',
      CuentaMayor: '',
      CuentaSubcta: '',
      CuentaPresentacion: '',
      IdCodigoEspecial: 0,
      CuentaHomologacion: '',
      PorcentajeRetencion: 0,
      FechaActivacion: '',
      IdUsuario: this.usuarioActual?.id_usuario,
      IdCabModelo: 0,
      CodigoExterno: '',
      Norma: '',
      Alcanse: '',
      Medicion: '',
      IdEmpresa: this.idEmpresaActual,
      Numerocuenta: '',
      Formato:''
    });
  }

  nuevoHijoDesde(node: FlatNode): void {
    const nivelPadre = Number(node.item.IdNivel ?? 1);
    if (nivelPadre >= 5) {
      this.snack.open('Nivel máximo alcanzado (5)', 'OK', { duration: 2500, horizontalPosition: 'right', verticalPosition: 'top' });
      return;
    }
    const nextLevel = nivelPadre + 1;
    this.form.reset({
      IdPlanCuentas: 0,
      ParentId: Number(node.item.IdPlanCuentas),
      IdNivel: nextLevel,
      EsMovimiento: nextLevel === 5,
      Estado: true,
      Orden: 0,
      NombreCuenta: '',
      Descripcion: '',
      CuentaDetalle: '',
      CodigoCompleto: '',
      CuentaPrincipal: '',
      CuentaMayor: '',
      CuentaSubcta: '',
      CuentaPresentacion: '',
      IdCodigoEspecial: 0,
      CuentaHomologacion: '',
      PorcentajeRetencion: 0,
      FechaActivacion: '',
      IdUsuario: this.usuarioActual?.id_usuario, // ✅ corregido
      IdCabModelo: 0,
      CodigoExterno: '',
      Norma: '',
      Alcanse: '',
      Medicion: '',
      IdEmpresa: this.idEmpresaActual,
      Numerocuenta: '',
      Formato: ''
    });
  }

  private generarCodigoCompleto(payload: any): string {
    const segs = [payload.CuentaPrincipal, payload.CuentaMayor, payload.CuentaSubcta, payload.CuentaPresentacion]
      .filter((s: string) => !!s);
    return segs.join('.');
  }

  guardar(): void {
    const cpCtrl = this.form.get('CuentaPresentacion')!;
    if (this.form.pending || cpCtrl.pending) {
      cpCtrl.markAsTouched();
      this.snack.open('Validando cuenta, espera un momento…', 'OK', { duration: 2000, horizontalPosition: 'right', verticalPosition: 'top' });
      return;
    }
    if (cpCtrl.hasError('duplicada')) {
      const msg = cpCtrl.getError('message') || 'La cuenta ya existe.';
      this.snack.open(String(msg), 'OK', { duration: 2500, horizontalPosition: 'right', verticalPosition: 'top' });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Complete los campos obligatorios', 'OK', { duration: 2500, horizontalPosition: 'right', verticalPosition: 'top' });
      return;
    }

    const val = this.form.getRawValue();
    const isEdit = Number(val.IdPlanCuentas ?? 0) > 0;

    const nivelNum  = Number(val.IdNivel ?? 1);
    const parentId  = Number(val.ParentId ?? 0);
    const esMovimiento = nivelNum === 5;

    const codigoCompleto = (val.CodigoCompleto && String(val.CodigoCompleto).trim() !== '')
      ? String(val.CodigoCompleto)
      : this.generarCodigoCompleto(val);

    const fechaActivacion = val.FechaActivacion && String(val.FechaActivacion).trim() !== ''
      ? String(val.FechaActivacion)
      : new Date().toISOString();

    this.loading.set(true);

    if (isEdit) {
      const payloadUpdate: PlanCuentaUpdateRequest = {
        IdPlanCuentas: Number(val.IdPlanCuentas),
        ParentId: parentId,
        IdNivel: nivelNum,
        NombreCuenta: String(val.NombreCuenta),
        Descripcion: String(val.Descripcion ?? ''),
        CuentaDetalle: String(val.CuentaDetalle ?? ''), ////dot(val.CuentaDetalle),
        Orden: Number(val.Orden ?? 0),
        CodigoCompleto: String(val.CodigoCompleto ?? ''), ///codigoCompleto,
        Estado: !!val.Estado,
        CuentaPrincipal: String(val.CuentaPrincipal ?? ''),
        CuentaMayor: String(val.CuentaMayor ?? ''),
        CuentaSubcta: String(val.CuentaSubcta ?? ''),
        CuentaPresentacion: String(val.CuentaPresentacion ?? ''),
        IdCodigoEspecial: Number(val.IdCodigoEspecial ?? 0),
        CuentaHomologacion: String(val.CuentaHomologacion ?? ''),
        PorcentajeRetencion: Number(val.PorcentajeRetencion ?? 0),
        FechaActivacion: fechaActivacion,
        IdUsuario: Number(val.IdUsuario ?? 0),
        IdCabModelo: Number(val.IdCabModelo ?? 0),
        EsMovimiento: esMovimiento,
        CodigoExterno: String(val.CodigoExterno ?? ''),
        Norma: String(val.Norma ?? ''),
        Alcanse: String(val.Alcanse ?? ''),
        Medicion: String(val.Medicion ?? ''),
        IdEmpresa: Number(val.IdEmpresa ?? this.idEmpresaActual),
        Numerocuenta:String(val.Numerocuenta ?? ''),
        Formato:String(val.Formato ?? ''),
      };

      this.svc.update(payloadUpdate.IdPlanCuentas, payloadUpdate as any).subscribe({
        next: saved => {
          const newId = Number(saved?.IdPlanCuentas ?? 0);
          if (newId > 0) {
            const idx = this.allItems.findIndex(x => x.IdPlanCuentas === newId);
            if (idx >= 0) this.allItems[idx] = saved; else this.allItems.push(saved);
            this.rebuildTree();
            this.loading.set(false);
            this.snack.open('Actualizado', 'OK', { duration: 2000, horizontalPosition: 'right', verticalPosition: 'top' });
            const flat = this.treeControl.dataNodes?.find(f => f.item.IdPlanCuentas === newId);
            if (flat) this.seleccionar(flat);
          } else {
            this.cargar();
            this.loading.set(false);
            this.snack.open('Actualizado', 'OK', { duration: 2000, horizontalPosition: 'right', verticalPosition: 'top' });
          }
        },
        error: err => {
          this.loading.set(false);
          console.error(err);
          this.snack.open('No se pudo guardar', 'OK', { duration: 2500, horizontalPosition: 'right', verticalPosition: 'top' });
        }
      });

    } else {
      const payloadCreate: PlanCuentaCreateRequest = {
        ParentId: parentId,
        IdNivel: nivelNum,
        NombreCuenta: String(val.NombreCuenta),
        Descripcion: String(val.Descripcion ?? ''),
        CuentaDetalle: String(val.CuentaDetalle ?? ''), ///dot(val.CuentaDetalle),
        Orden: Number(val.Orden ?? 0),
        CodigoCompleto: String(val.CodigoCompleto ?? ''), ///codigoCompleto,
        CuentaPrincipal: String(val.CuentaPrincipal ?? ''),
        CuentaMayor: String(val.CuentaMayor ?? ''),
        CuentaSubcta: String(val.CuentaSubcta ?? ''),
        CuentaPresentacion: String(val.CuentaPresentacion ?? ''),
        IdCodigoEspecial: Number(val.IdCodigoEspecial ?? 0),
        CuentaHomologacion: String(val.CuentaHomologacion ?? ''),
        PorcentajeRetencion: Number(val.PorcentajeRetencion ?? 0),
        Estado: true,
        FechaActivacion: fechaActivacion,
        IdUsuario: Number(val.IdUsuario ?? 0),
        IdCabModelo: Number(val.IdCabModelo ?? 0),
        EsMovimiento: esMovimiento,
        CodigoExterno: String(val.CodigoExterno ?? ''),
        Norma: String(val.Norma ?? ''),
        Alcanse: String(val.Alcanse ?? ''),
        Medicion: String(val.Medicion ?? ''),
        IdEmpresa: Number(val.IdEmpresa ?? this.idEmpresaActual),
        Numerocuenta: String(val.Numerocuenta ?? ''),
        Formato: String(val.Formato ?? ''),
      };

      this.svc.create(payloadCreate as any).subscribe({
        next: saved => {
          const newId = Number(saved?.IdPlanCuentas ?? 0);
          if (newId > 0) {
            this.allItems.push(saved);
            this.rebuildTree();
            this.loading.set(false);
            this.snack.open('Creado', 'OK', { duration: 2000, horizontalPosition: 'right', verticalPosition: 'top' });
            const flat = this.treeControl.dataNodes?.find(f => f.item.IdPlanCuentas === newId);
            if (flat) this.seleccionar(flat);
          } else {
            this.cargar();
            this.loading.set(false);
            this.snack.open('Creado', 'OK', { duration: 2000, horizontalPosition: 'right', verticalPosition: 'top' });
          }
        },
        error: err => {
          this.loading.set(false);
          console.error(err);
          this.snack.open('No se pudo guardar', 'OK', { duration: 2500, horizontalPosition: 'right', verticalPosition: 'top' });
        }
      });
    }
  }

  inactivar(node: FlatNode): void {
    const id = node.item.IdPlanCuentas;
    this.loading.set(true);
    this.svc.setEstado(id, false).subscribe({
      next: () => {
        this.allItems = this.allItems.filter(x => x.IdPlanCuentas !== id);
        this.rebuildTree();
        this.loading.set(false);
        this.snack.open('Inactivado', 'OK', { duration: 1800, horizontalPosition: 'right', verticalPosition: 'top' });
        if (this.selectedNode()?.item.IdPlanCuentas === id) {
          this.selectedNode.set(null);
          this.nuevoRaiz();
        }
      },
      error: err => {
        this.loading.set(false);
        console.error(err);
        this.snack.open('No se pudo inactivar', 'OK', { duration: 2000, horizontalPosition: 'right', verticalPosition: 'top' });
      }
    });
  }

  onPresentacionInput(evt?: Event) {
    const v = (evt?.target as HTMLInputElement)?.value ?? this.form.get('CuentaPresentacion')?.value ?? '';
    const raw = String(v).trim().replace(/[^\d-]/g, '');
    let izquierda = '', derecha = '';
    if (raw.includes('-')) {
      const p = raw.split('-'); izquierda = p[0] ?? ''; derecha = p[1] ?? '';
    } else {
      const d = raw.replace(/\D/g, '');
      if (d.length >= 7) { izquierda = d.slice(0, d.length - 3); derecha = d.slice(-3); }
      else { izquierda = d; derecha = ''; }
    }
    const principal = izquierda.substring(0, 1);
    const mayor = izquierda;
    const subcta = (derecha || '').replace(/\D/g, '').padStart(3, '0');

    this.form.patchValue({ CuentaPrincipal: principal || '', CuentaMayor: mayor || '', CuentaSubcta: subcta || '' }, { emitEvent: false });
  }

  recalcularPresentacion() {
    const mayor = String(this.form.get('CuentaMayor')?.value ?? '').replace(/\D/g, '');
    const sub   = String(this.form.get('CuentaSubcta')?.value ?? '').replace(/\D/g, '').padStart(3, '0');
    const presentacion = mayor ? `${mayor}-${sub}` : '';
    this.form.patchValue({ CuentaPresentacion: presentacion }, { emitEvent: false });
  }

  onPresentacionBlur() {
    const raw = String(this.form.get('CuentaPresentacion')?.value ?? '').replace(/\D/g, '');
    if (raw.length >= 9) {
      const mayor = raw.slice(0, 6);
      const sub   = raw.slice(-3);
      this.form.patchValue({ CuentaPresentacion: `${mayor}-${sub}` });
    }
  }

  trackById = (_: number, it: CodigoEspecialOpcion) => it.id;

  limpiarFormulario(): void {
    if (this.modoEdicion()) {
      const sel = this.selectedNode();
      if (sel) this.seleccionar(sel);
    } else {
      this.nuevoRaiz();
    }
  }

  formatCuenta(evt: Event) {
    const el = evt.target as HTMLInputElement;
    const digits = (el.value || '').replace(/\D/g, '').slice(0, 9);
    const left  = digits.slice(0, 6);
    const right = digits.slice(6, 9);
    el.value = right ? `${left}-${right}` : left;
    this.form.get('CuentaPresentacion')?.setValue(el.value, { emitEvent: false });
  }

  fixCuenta() {
    const ctrl = this.form.get('CuentaPresentacion');
    const digits = (ctrl?.value || '').toString().replace(/\D/g, '');
    if (!digits) return;
    const left  = digits.slice(0, 6).padEnd(6, '0');
    const right = digits.slice(6, 9).padEnd(3, '0');
    const value = `${left}-${right}`;
    ctrl?.setValue(value, { emitEvent: false });
  }

  private requireSelection() {
    return (ctrl: AbstractControl) => {
      const v = ctrl.value;
      const inval = v === null || v === undefined || v === '' || v === 0;
      return inval ? { requiredSelection: true } : null;
    };
  }
}
