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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

type PlanCuentaCreateRequest = {
  CuentaPrincipal: string;
  CuentaMayor: string;
  CuentaSubcta: string;
  CuentaPresentacion: string;
  NombreCuenta: string;
  IdCodigoEspecial: number | null;///number;
  IdNivel: number;
  Descripcion: string;
  CuentaHomologacion: string;
  PorcentajeRetencion: number;
  Estado: boolean;
  FechaActivacion: string;
  IdUsuario: number;
  IdCabModelo: number | null;//number;
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
    IdCodigoEspecial: [null as number | null],// [0, [Validators.required, this.requireSelection()]],
    CuentaHomologacion: [''],
    PorcentajeRetencion: [0, [Validators.required]],
    FechaActivacion: [''],
    IdUsuario: this.usuarioActual?.id_usuario,
    IdCabModelo:  [null as number | null],  /// [0, [Validators.required, this.requireSelection()]],
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
      IdCodigoEspecial:(it.IdCodigoEspecial ?? null) as number | null,///Number(it.IdCodigoEspecial ?? 0),
      CuentaHomologacion: it.CuentaHomologacion ?? '',
      PorcentajeRetencion: Number(it.PorcentajeRetencion ?? 0),
      FechaActivacion: it.FechaActivacion ?? '',
      IdUsuario: Number(it.IdUsuario ?? 0),
      IdCabModelo: (it.IdCabModelo ?? null) as number | null,// Number(it.IdCabModelo ?? 0),
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
      IdCodigoEspecial: null as number | null,//0,
      CuentaHomologacion: '',
      PorcentajeRetencion: 0,
      FechaActivacion: '',
      IdUsuario: this.usuarioActual?.id_usuario,
      IdCabModelo: null as number | null, //0,
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
      IdCodigoEspecial:  null as number | null, // 0,
      CuentaHomologacion: '',
      PorcentajeRetencion: 0,
      FechaActivacion: '',
      IdUsuario: this.usuarioActual?.id_usuario, // ✅ corregido
      IdCabModelo:  null as number | null, // 0,
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

    const idCodEsp =
    val.IdCodigoEspecial == null || Number(val.IdCodigoEspecial) === 0
    ? null
    : Number(val.IdCodigoEspecial);

    const idCabModelo =
    val.IdCabModelo == null || Number(val.IdCabModelo) === 0
    ? null
    : Number(val.IdCabModelo);

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
        IdCodigoEspecial: idCodEsp, //Number(val.IdCodigoEspecial ?? 0),
        CuentaHomologacion: String(val.CuentaHomologacion ?? ''),
        PorcentajeRetencion: Number(val.PorcentajeRetencion ?? 0),
        FechaActivacion: fechaActivacion,
        IdUsuario: Number(val.IdUsuario ?? 0),
        IdCabModelo:  idCabModelo,// Number(val.IdCabModelo ?? 0),
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

      const idCodEsp =
        val.IdCodigoEspecial == null || Number(val.IdCodigoEspecial) === 0
          ? null
          : Number(val.IdCodigoEspecial);

      const idCabModelo =
        val.IdCabModelo == null || Number(val.IdCabModelo) === 0
          ? null
          : Number(val.IdCabModelo);

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
        IdCodigoEspecial: idCodEsp, //Number(val.IdCodigoEspecial ?? 0),
        CuentaHomologacion: String(val.CuentaHomologacion ?? ''),
        PorcentajeRetencion: Number(val.PorcentajeRetencion ?? 0),
        Estado: true,
        FechaActivacion: fechaActivacion,
        IdUsuario: Number(val.IdUsuario ?? 0),
        IdCabModelo: idCabModelo,// Number(val.IdCabModelo ?? 0),
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

  /* IMPRESIÓN DE PLAN DE CUENTAS  */

   /**
   * Estructura de datos plana con toda la información
   */
  private generarDatosCompletos(): any[] {
    const resultado: any[] = [];
    
    const procesarNodo = (node: TreeNode, nivelReal: number, padre: string = '') => {
      const item = node.item;
      
      // Calcular indentación visual según nivel real
      const indent = '  '.repeat(nivelReal);
      
      resultado.push({
        // Datos originales
        nivelBD: item.IdNivel || 1, // Nivel desde la BD
        nivelReal: nivelReal + 1, // Nivel jerárquico real (empezando en 1)
        cuenta: item.CuentaPresentacion || '',
        nombreCuenta: item.NombreCuenta || '',
        
        // Datos adicionales
        tipoCuenta: '', // Si tienes este campo, agrégalo aquí
        marca: '', // Si tienes este campo, agrégalo aquí
        porcentajeRI: item.PorcentajeRetencion || 0,
        informacionGeneral: item.Descripcion || '',
        
        // Datos complementarios
        cuentaPrincipal: item.CuentaPrincipal || '',
        cuentaMayor: item.CuentaMayor || '',
        cuentaSubcta: item.CuentaSubcta || '',
        esMovimiento: item.EsMovimiento ? 'Sí' : 'No',
        estado: item.Estado ? 'Activo' : 'Inactivo',
        codigoEspecial: item.IdCodigoEspecial || '',
        modelo: item.IdCabModelo || '',
        orden: item.Orden || 0,
        
        // Para visualización jerárquica
        indentacion: indent,
        padre: padre
      });

      // Procesar hijos recursivamente
      if (node.children && node.children.length > 0) {
        node.children.forEach(hijo => {
          procesarNodo(hijo, nivelReal + 1, item.CuentaPresentacion || '');
        });
      }
    };

    // Procesar todos los nodos raíz
    this.treeRoots.forEach(root => procesarNodo(root, 0));
    
    return resultado;
  }

  /**
   * Obtener color según nivel jerárquico - PALETA CORPORATIVA
   */
  private getColorPorNivel(nivel: number): { bg: string, text: string, rgb: number[] } {
    const colores = {
      1: { bg: '#002c6c', text: '#FFFFFF', rgb: [0, 44, 108] },     // Azul corporativo principal
      2: { bg: '#004080', text: '#FFFFFF', rgb: [0, 64, 128] },     // Azul corporativo claro
      3: { bg: '#e0e7ef', text: '#002c6c', rgb: [224, 231, 239] },  // Gris azulado claro
      4: { bg: '#f0f4f8', text: '#1f2937', rgb: [240, 244, 248] },  // Gris muy claro
      5: { bg: '#FFFFFF', text: '#1f2937', rgb: [255, 255, 255] }   // Blanco (nivel de detalle)
    };
    
    return colores[nivel as keyof typeof colores] || colores[5];
  }

  /**
   * Exportar a PDF mejorado con colores y diseño profesional
   */
  exportarPDF(): void {
    this.loading.set(true);
    
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Orientación horizontal
      const datos = this.generarDatosCompletos();
      
      // Configuración de fuente
      doc.setFont('helvetica');
      
      // ==================== ENCABEZADO ====================
      // Título principal (sin fondo azul)
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('LISTADO PLAN DE CUENTAS', 14, 12);

      // Línea decorativa debajo del título
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(14, 15, doc.internal.pageSize.width - 14, 15);

      // Fecha y empresa en la misma línea
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const fecha = new Date().toLocaleDateString('es-EC', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      doc.text(`${fecha}`, doc.internal.pageSize.width - 14, 12, { align: 'right' });

      // Info adicional
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(`Empresa: ${this.idEmpresaActual} | Total: ${datos.length} cuentas`, 14, 20);
      
      // ==================== LEYENDA DE COLORES ====================
      const leyendaY = 25;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Niveles:', 14, leyendaY);

      let leyendaX = 28;
      const niveles = [
        { n: 1, label: 'Principal', color: this.getColorPorNivel(1) },
        { n: 2, label: 'Grupo', color: this.getColorPorNivel(2) },
        { n: 3, label: 'Subgrupo', color: this.getColorPorNivel(3) },
        { n: 4, label: 'Detalle', color: this.getColorPorNivel(4) },
        { n: 5, label: 'Movimiento', color: this.getColorPorNivel(5) }
      ];

      doc.setFont('helvetica', 'normal');
      niveles.forEach(nv => {
        const color = nv.color;
        // Cuadro de color
        doc.setFillColor(color.rgb[0], color.rgb[1], color.rgb[2]);
        doc.rect(leyendaX, leyendaY - 2.5, 3, 3, 'F');
        // Borde del cuadro
        doc.setDrawColor(100, 100, 100); // 👈 Borde más oscuro
        doc.setLineWidth(0.2); // 👈 Borde más grueso
        doc.rect(leyendaX, leyendaY - 2.5, 3, 3, 'S');
        // Texto
        doc.setTextColor(0, 44, 108); // 👈 Color corporativo
        doc.setFontSize(6.5);
        doc.text(`${nv.n}-${nv.label}`, leyendaX + 4, leyendaY);
        leyendaX += 24;
      });

      doc.setTextColor(0, 0, 0); // Resetear color
      // ==================== TABLA DE DATOS ====================
      // Preparar datos para la tabla
      const rows = datos.map(item => {
        // INDENTACIÓN SIMPLE CON ESPACIOS
        const nivel = item.nivelReal;
        const espacios = '  '.repeat(nivel - 1); // 2 espacios por nivel
        
        const nombreConIndent = espacios + item.nombreCuenta;
        
        return [
          item.cuenta,
          nombreConIndent,
          item.tipoCuenta,
          item.marca,
          item.nivelReal.toString(),
          item.porcentajeRI ? item.porcentajeRI.toFixed(2) : '0.00',
          item.informacionGeneral || item.nombreCuenta
        ];
      });

      // Generar tabla con formato mejorado
      autoTable(doc, {
        startY: 33,
        head: [[
          'CUENTA',
          'NOMBRE CUENTA',
          'TIPO CUENTA',
          'MARCA',
          'NIVEL',
          '% R/I',
          'INFORMACION GENERAL'
        ]],
        body: rows,
        
        // Estilos generales
        styles: { 
          fontSize: 7,
          cellPadding: 2,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        
        // Estilos del encabezado
        headStyles: {
          fillColor: [0, 44, 108], // #002c6c - Azul corporativo
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.1,
          lineColor: [0, 44, 108] // Mismo color corporativo
        },
        
        // Anchos de columna
        columnStyles: {
          0: { cellWidth: 24, halign: 'left' },   // CUENTA (más ancho)
          1: { cellWidth: 95, halign: 'left' },   // NOMBRE CUENTA (más ancho para indentación)
          2: { cellWidth: 18, halign: 'center' }, // TIPO CUENTA
          3: { cellWidth: 15, halign: 'center' }, // MARCA
          4: { cellWidth: 12, halign: 'center' }, // NIVEL
          5: { cellWidth: 15, halign: 'right' },  // % R/I
          6: { cellWidth: 48, halign: 'left' }    // INFORMACION GENERAL (reducido)
        },
        
        // Márgenes
        margin: { top: 33, right: 14, bottom: 20, left: 14 },
        
        // Callback para aplicar colores por nivel
        didParseCell: (data) => {
          if (data.section === 'body') {
            const rowIndex = data.row.index;
            const nivel = datos[rowIndex]?.nivelReal || 5;
            const color = this.getColorPorNivel(nivel);
            
            // Color de fondo según nivel
            data.cell.styles.fillColor = color.rgb as [number, number, number];
            
            // Bordes más suaves
            data.cell.styles.lineColor = [220, 220, 220];
            data.cell.styles.lineWidth = 0.1;
            
            // Texto en negrita SOLO para niveles 1 y 2
            if (nivel <= 2) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 8;
            } else if (nivel === 3) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 7.5;
            } else {
              data.cell.styles.fontSize = 7;
            }
            
            // Color de texto más oscuro para mejor contraste
            const textColorRgb = color.text;
            data.cell.styles.textColor = [
              parseInt(textColorRgb.substring(1, 3), 16),
              parseInt(textColorRgb.substring(3, 5), 16),
              parseInt(textColorRgb.substring(5, 7), 16)
            ];
          }
        },
        
        // Pie de página
        didDrawPage: (data) => {
          const pageHeight = doc.internal.pageSize.height;
          
          // Línea superior del pie
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.line(14, pageHeight - 15, doc.internal.pageSize.width - 14, pageHeight - 15);
          
          // Información en el pie
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          
          // Total de cuentas (izquierda)
          doc.text(
            `Total de cuentas: ${datos.length}`,
            14,
            pageHeight - 10
          );
          
          // Número de página (derecha) - CORREGIDO
          const pageNumber = data.pageNumber;
          const totalPages = (doc as any).internal.pages.length - 1; // -1 porque pages incluye una página vacía al inicio
          
          doc.text(
            `Página ${pageNumber}`,
            doc.internal.pageSize.width - 14,
            pageHeight - 10,
            { align: 'right' }
          );
        }
      });

      // ==================== GUARDAR ARCHIVO ====================
      const nombreArchivo = `plan-cuentas-${this.idEmpresaActual}-${new Date().getTime()}.pdf`;
      doc.save(nombreArchivo);
      
      this.snack.open('✓ PDF generado exitosamente', 'OK', { 
        duration: 2500, 
        horizontalPosition: 'right', 
        verticalPosition: 'top' 
      });
      
    } catch (error) {
      console.error('Error al generar PDF:', error);
      this.snack.open('✗ Error al generar PDF', 'OK', { 
        duration: 3000, 
        horizontalPosition: 'right', 
        verticalPosition: 'top' 
      });
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Exportar a Excel mejorado con formato profesional
   */
  async exportarExcel(): Promise<void> {
    this.loading.set(true);
    
    try {
      const datos = this.generarDatosCompletos();
      
      // Crear libro de trabajo
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistema Contable';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      // ==================== HOJA 1: PLAN DE CUENTAS ====================
      const worksheet = workbook.addWorksheet('Plan de Cuentas', {
        pageSetup: { 
          paperSize: 9, // A4
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1
        },
        views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }] // Congelar encabezados
      });

      // ENCABEZADO PRINCIPAL
      worksheet.mergeCells('A1:G1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'LISTADO PLAN DE CUENTAS';
      titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
          fgColor: { argb: 'FF002c6c' }
      };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 25;
      
      // INFORMACIÓN
      worksheet.mergeCells('A2:G2');
      const infoCell = worksheet.getCell('A2');
      infoCell.value = `Fecha: ${new Date().toLocaleDateString('es-EC')} | Empresa ID: ${this.idEmpresaActual} | Total: ${datos.length} cuentas`;
      infoCell.font = { size: 10 };
      infoCell.alignment = { vertical: 'middle', horizontal: 'center' };
      infoCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFe0e7ef' }
      };
      worksheet.getRow(2).height = 18;
      
      // LEYENDA DE NIVELES
      worksheet.mergeCells('A3:G3');
      const legendCell = worksheet.getCell('A3');
      legendCell.value = 'NIVELES: Nivel 1 (Azul Oscuro) | Nivel 2 (Azul) | Nivel 3 (Azul Claro) | Nivel 4 (Verde) | Nivel 5 (Blanco)';
      legendCell.font = { size: 9, italic: true };
      legendCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(3).height = 16;

      // ENCABEZADOS DE COLUMNAS (Fila 4)
      const headerRow = worksheet.addRow([
        'CUENTA',
        'NOMBRE CUENTA',
        'TIPO CUENTA',
        'MARCA',
        'NIVEL',
        '% R/I',
        'INFORMACION GENERAL'
      ]);
      
      // Estilo de encabezados
      headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.height = 22;
      
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF002c6c'  }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // DATOS CON COLORES POR NIVEL
      datos.forEach((item, index) => {
        const nombreConIndent = item.indentacion + item.nombreCuenta;
        
        const row = worksheet.addRow([
          item.cuenta,
          nombreConIndent,
          item.tipoCuenta,
          item.marca,
          item.nivelReal,
          item.porcentajeRI,
          item.informacionGeneral
        ]);

        // Altura de fila
        row.height = 16;
        row.alignment = { vertical: 'middle' };
        
        // Obtener color según nivel
        const nivel = item.nivelReal;
        const colorMap: { [key: number]: string } = {
          1: 'FF002c6c', // Azul corporativo principal
          2: 'FF004080', // Azul corporativo claro
          3: 'FFe0e7ef', // Gris azulado claro
          4: 'FFf0f4f8', // Gris muy claro
          5: 'FFFFFFFF'  // Blanco
        };

        const textColorMap: { [key: number]: string } = {
          1: 'FFFFFFFF', // Blanco para fondo oscuro
          2: 'FFFFFFFF', // Blanco para fondo oscuro
          3: 'FF002c6c', // Azul corporativo
          4: 'FF1f2937', // Gris oscuro
          5: 'FF1f2937'  // Gris oscuro
        };
        
        // Aplicar estilo según nivel
        row.eachCell((cell, colNumber) => {
          // Color de fondo
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: colorMap[nivel] || 'FFFFFFFF' }
          };
          
          // Fuente
          cell.font = {
            size: nivel <= 3 ? 10 : 9,
            bold: nivel <= 3,
            color: { argb: textColorMap[nivel] || 'FF424242' }
          };
          
          // Bordes sutiles
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
          };
          
          // Alineaciones específicas por columna
          if (colNumber === 4 || colNumber === 5) { // MARCA y NIVEL
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber === 6) { // % R/I
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '0.00';
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        });
      });

      // ANCHOS DE COLUMNA
      worksheet.columns = [
        { key: 'cuenta', width: 18 },
        { key: 'nombre', width: 60 },
        { key: 'tipo', width: 15 },
        { key: 'marca', width: 12 },
        { key: 'nivel', width: 10 },
        { key: 'porcentaje', width: 12 },
        { key: 'info', width: 40 }
      ];

      // Filtros automáticos
      worksheet.autoFilter = {
        from: 'A4',
        to: 'G4'
      };

      // ==================== HOJA 2: RESUMEN ESTADÍSTICO ====================
      const summarySheet = workbook.addWorksheet('Resumen');
      
      // Título
      summarySheet.mergeCells('A1:B1');
      const summaryTitle = summarySheet.getCell('A1');
      summaryTitle.value = 'RESUMEN ESTADÍSTICO DEL PLAN DE CUENTAS';
      summaryTitle.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      summaryTitle.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF002c6c' }
      };
      summaryTitle.alignment = { vertical: 'middle', horizontal: 'center' };
      summarySheet.getRow(1).height = 25;
      
      summarySheet.addRow([]);
      
      // Información general
      const infoData = [
        ['Empresa ID:', this.idEmpresaActual],
        ['Fecha generación:', new Date().toLocaleDateString('es-EC', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        })],
        ['Usuario:', this.usuarioActual?.nombre_usuario || 'N/A'],
        [],
        ['ESTADÍSTICAS GENERALES', ''],
        ['Total de cuentas:', datos.length],
        ['Cuentas activas:', datos.filter(d => d.estado === 'Activo').length],
        ['Cuentas inactivas:', datos.filter(d => d.estado === 'Inactivo').length],
        ['Cuentas de movimiento:', datos.filter(d => d.esMovimiento === 'Sí').length],
        [],
        ['DISTRIBUCIÓN POR NIVEL', ''],
      ];
      
      infoData.forEach(row => {
      const excelRow = summarySheet.addRow(row);
      // Validar que row[0] sea string antes de usar includes
      if (row[0] && typeof row[0] === 'string' && 
          (row[0].includes('ESTADÍSTICAS') || row[0].includes('DISTRIBUCIÓN'))) {
        excelRow.font = { bold: true, size: 11 };
        excelRow.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE3F2FD' }
        };
      }
    });
      
      // Distribución por nivel
      for (let i = 1; i <= 5; i++) {
        const count = datos.filter(d => d.nivelReal === i).length;
        const percentage = ((count / datos.length) * 100).toFixed(1);
        const row = summarySheet.addRow([`  Nivel ${i}:`, `${count} (${percentage}%)`]);
        
        const colorMap: { [key: number]: string } = {
          1: 'FF002c6c', // Actualizado
          2: 'FF004080', // Actualizado
          3: 'FFe0e7ef', // Actualizado
          4: 'FFf0f4f8', // Actualizado
          5: 'FFFFFFFF'
        };
        
        row.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colorMap[i] }
        };
        
        // Color de texto según fondo
        if (i <= 2) {
          row.getCell(1).font = { color: { argb: 'FFFFFFFF' } }; // Texto blanco
        }
      }

      summarySheet.columns = [
        { width: 35 },
        { width: 20 }
      ];

      // ==================== HOJA 3: DETALLES COMPLETOS ====================
      const detailSheet = workbook.addWorksheet('Detalles Completos');
      
      // Encabezado
      const detailHeader = detailSheet.addRow([
        'CUENTA',
        'NOMBRE',
        'NIVEL',
        'PRINCIPAL',
        'MAYOR',
        'SUBCTA',
        'CÓD. ESPECIAL',
        'MODELO',
        'MOVIMIENTO',
        'ESTADO',
        '% RETENCIÓN',
        'ORDEN',
        'DESCRIPCIÓN'
      ]);
      
      detailHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      detailHeader.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF212121' }
      };
      detailHeader.alignment = { vertical: 'middle', horizontal: 'center' };
      detailHeader.height = 20;

      datos.forEach(item => {
        detailSheet.addRow([
          item.cuenta,
          item.nombreCuenta,
          item.nivelReal,
          item.cuentaPrincipal,
          item.cuentaMayor,
          item.cuentaSubcta,
          item.codigoEspecial,
          item.modelo,
          item.esMovimiento,
          item.estado,
          item.porcentajeRI,
          item.orden,
          item.informacionGeneral
        ]);
      });

      detailSheet.columns = [
        { width: 18 }, { width: 40 }, { width: 10 }, { width: 12 },
        { width: 12 }, { width: 12 }, { width: 15 }, { width: 10 },
        { width: 12 }, { width: 12 }, { width: 12 }, { width: 10 },
        { width: 40 }
      ];

      // Aplicar bordes y formato
      detailSheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
            };
          });
        }
      });

      // ==================== GUARDAR ARCHIVO ====================
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const nombreArchivo = `plan-cuentas-${this.idEmpresaActual}-${new Date().getTime()}.xlsx`;
      saveAs(blob, nombreArchivo);
      
      this.snack.open('✓ Excel generado exitosamente', 'OK', { 
        duration: 2500, 
        horizontalPosition: 'right', 
        verticalPosition: 'top' 
      });
      
    } catch (error) {
      console.error('Error al generar Excel:', error);
      this.snack.open('✗ Error al generar Excel', 'OK', { 
        duration: 3000, 
        horizontalPosition: 'right', 
        verticalPosition: 'top' 
      });
    } finally {
      this.loading.set(false);
    }
  }

  // Variables para el menú de exportación
  menuExportarAbierto = signal(false);
  
  toggleMenuExportar(): void {
    this.menuExportarAbierto.update(v => !v);
  }

  cerrarMenuExportar(): void {
    this.menuExportarAbierto.set(false);
  }
}
