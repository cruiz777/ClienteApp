import { Component, OnInit, ViewChild, effect, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule 
        ,FormControl,        // agregar para el control de combo auxiliares contables
       } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsuarioService } from 'src/app/services/usuario.service';
import { Optional, Inject } from '@angular/core';
import { MatDialogRef, MatDialog, MatDialogConfig, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { startWith, distinctUntilChanged } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { tap, shareReplay, map, catchError, finalize } from 'rxjs/operators';
import { TipoAsientoService } from 'src/app/services/tipoasiento.service';
import { TipoAsientoResponse } from 'src/app/interfaces/responses/tipo-asiento-response';
import { ZonaService } from 'src/app/services/zona.service';
import { ZonaResponse } from 'src/app/interfaces/responses/zona-response';

// LOCALES
import { LocalesService } from 'src/app/services/locales.service';
import { LocalesResponse } from 'src/app/interfaces/responses/local-response';

// ⬇️ Reutilizamos los cell editors del módulo de asientos contables
import { LocalCellEditorComponent } from '../../asientos-contables/asientos-contables-form/local-cell-editor.component';
import { PlanCuentasService, PlanCuenta } from 'src/app/services/plan-cuentas.service';
import { PlanCuentaCellEditorComponent } from '../../asientos-contables/asientos-contables-form/plan-cuenta-cell-editor.component';
import { CodigosContablesService } from 'src/app/services/codigoscontables.service';
import { CodigosContablesResponse } from 'src/app/interfaces/responses/codigos-contables-response';
import { CodContableCellEditorComponent } from '../../asientos-contables/asientos-contables-form/cod-contable-cell-editor.component';
import { MovimientoBancarioService } from 'src/app/services/movimiento-bancario.service';
import { MovimientoBancarioResponse } from 'src/app/interfaces/responses/movimiento-bancario-response';

import { MovimientoBancarioCellEditorComponent } from '../../asientos-contables/asientos-contables-form/movimiento-bancario-cell-editor.component';
// Datos tributarios
import { SustentoTributarioService } from 'src/app/services/sustento-tributario.service';
import { SustentoTributarioResponse } from 'src/app/interfaces/responses/sustento-tributario-response';

import { TipoComprobanteSriService } from 'src/app/services/tipocomprobantesri.service';
import { TipoComprobanteSriResponse } from 'src/app/interfaces/responses/tipo-comprobantesri-response';

import { AsientoTributarioDialogComponent, AsientoTributarioData } from '../../asientos-contables/datos-tributarios/asiento-tributario-dialog.component';

import { TipoRetencionService } from 'src/app/services/tiporetencion.service';
import { TipoRetencionResponse } from 'src/app/interfaces/responses/tipo-retencion-response';
import { TipoRetencionCellEditorComponent } from './tipo-retencion-cell-editor.component';

import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, switchMap } from 'rxjs/operators';
import { AsientosContablesService } from 'src/app/services/asientos-contables.service';
//para imprimir el pdf
import { generarPdfAsiento } from '../../util/asiento-pdf.util';
import { AsientoImpresion } from 'src/app/interfaces/responses/asiento-impresion.model';


// Mensajería
import {
  CustomMessageBoxComponent,
  MessageBoxData,
} from 'src/app/util/messages/custom-message-box.component';

import { AgGridAngular } from 'ag-grid-angular';

import {
  AllCommunityModule,
  ModuleRegistry,
  ColDef,
  GridApi,
  GridReadyEvent,
  CellValueChangedEvent,
  CellClickedEvent,
  CellKeyDownEvent,
  FullWidthCellKeyDownEvent,
} from 'ag-grid-community';

import {
  AsientoContableResponse,
  DetalleAsientoResponse,
  createEmptyAsientoContableResponse,
} from 'src/app/interfaces/responses/asiento-contable-response';

import { ViewEncapsulation } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// 🔹 Servicio específico para facturas de proveedor
import {
  FacturasProveedorService,
  ApiResponse,
} from 'src/app/services/facturas-proveedor.service';

ModuleRegistry.registerModules([AllCommunityModule]);

interface TipoRetencionCombo {
  id: number;
  label: string;   // ej: "001 - RENTA (10%)"
  codigo: string;     // CodigoTipoRet (para filtrar por 7%)
  porcentaje: number; // Porcentaje
}

@Component({
  selector: 'app-facturas-proveedor-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AgGridAngular,
    MatSnackBarModule,
    LocalCellEditorComponent,
    PlanCuentaCellEditorComponent,
    CodContableCellEditorComponent,
    MovimientoBancarioCellEditorComponent,
    TipoRetencionCellEditorComponent,  
    MatAutocompleteModule, //para autofiltrar
    MatFormFieldModule, //para autofiltrar
    MatInputModule, //para autofiltrar
  ],
  templateUrl: './facturas-proveedor-form.component.html',
  styleUrls: ['./facturas-proveedor-form.component.css'],
  encapsulation: ViewEncapsulation.None   //  👈 clave
})

export class FacturasProveedorFormComponent implements OnInit {
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

  modo = signal<'nuevo' | 'editar'>('nuevo');
  loading = signal(false);
  saving = signal(false);

  titulo = computed(() =>
    this.modo() === 'nuevo'
      ? 'Crear(Factura Proveedor) — NUEVO'
      : 'Editar (Factura Proveedor) — EDITAR'
  );
  // ? 'Crear/Editar (Factura Proveedor) — NUEVO'

  // USUARIO
  usuarioActual = this.usuarioService.getUsuarioActual();
  nombreusuario = this.usuarioActual?.nombre_usuario ?? '';
  numdocGenerado: string | null = null; // numero documento generado

  gridOptions = {
    rowHeight: 30,
    headerHeight: 32,
    stopEditingWhenCellsLoseFocus: true // para que desaparesca el control al perder el foco
  };

  private syncUsuarioEmpresa(): void {
    const idUsuario = this.usuarioActual?.id_usuario ?? 0;
    const idEmpresa = this.usuarioActual?.id_empresa ?? 0;
    this.form.patchValue({ idUsuario, idEmpresa }, { emitEvent: false });
    this.form.patchValue(
      { anio: getYearFromInput(this.form.get('fechatransaccion')!.value) },
      { emitEvent: false }
    );
  }

  // PARA VALIDAR CARACTERES ESPECIALES
  private readonly allowedTextPattern = /[^0-9a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.,;-]/g;

  validarTexto(controlName: 'observacion' | 'beneficiario', event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!input) return;

    const original = input.value;
    // eliminamos todo lo que NO está en el patrón permitido
    const limpio = original.replace(this.allowedTextPattern, '');

    if (original !== limpio) {
      input.value = limpio; // actualiza el input
    }

    // actualiza el formControl sin disparar eventos extra
    this.form.get(controlName)?.setValue(limpio, { emitEvent: false });
  }

  tiposAsiento$!: Observable<TipoAsientoResponse[]>;
  private tipoAsientos: Array<{ id: number; nombre: string; tipDoc: string }> = [];
  zonas$!: Observable<ZonaResponse[]>; // zonas

  locales: { id: number; nombre: string }[] = [];
  cuentas: { 
    id: number; 
    label: string; 
    codigo: string;
    idCodigoEspecial?: number | null; 
    }[] = [];
  ///para cargar en beneficiaroio lo del combo
  //auxiliares: { id: number; label: string }[] = [];
  auxiliares: { id: number; label: string; razon: string }[] = [];
  ///para el list en la cabecera
  auxiliarSeleccionadoCtrl = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(1),
  ]);
  ////para el numero de comprobante
  nroComprobanteCtrl = new FormControl<string>('', [Validators.required,]);

  // lista de movimientos bancarios añadir condicion
  movimientosBancarios: {
    id: number;
    movimiento: string;
    descripcion: string;
    label: string;
    condicion?: number | null;  //solo aquí, no en la fila la condicion para el filtro
  }[] = [];

    cabeceraBloqueada = false;
    //sustento tributario lista que viene del servicio
    listaSustentosTrib: { id: number; label: string }[] = [];
    // Control en cabecera (igual que Auxiliar Contable)
    sustentoTribCtrl = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(1),
    ]);

    //tipo comprobante sri
    listaTiposCompSriCab: { id: number; label: string }[] = [];
      tipoCompSriCtrl = new FormControl<number | null>(0, [
      Validators.required,
      Validators.min(1),
    ]);
    
  ////
   autorizacionCtrl = new FormControl<string>('', [
    Validators.required,
    Validators.maxLength(49),
   ]);
   fechacaducaCtrl = new FormControl<string | null>(null,[Validators.required,]);
   fechavencimientoCtrl = new FormControl<string | null>(null,[Validators.required,]);
  ////tipo retencion
  // tiposRetencion: { id: number; label: string }[] = [];
  tiposRetencion: TipoRetencionCombo[] = [];
  
  tiposRetencionAll: TipoRetencionCombo[] = [];

  
  //buscar
  // input de búsqueda del proveedor (texto que escribe el usuario)
  proveedorCtrl = new FormControl<{ id: number; label: string; razon: string } | string | null>(null,[]);
  // lista que se muestra en el autocomplete (se llena con el método buscar)
  filteredAuxiliares$ = of<{ id: number; label: string; razon: string }[]>([]);
  displayProveedor = (item: { id: number; label: string; razon: string } | string | null): string =>
  typeof item === 'string'
    ? item
    : item
    ? item.label
    : ''; 

  //


  form!: FormGroup;

  private gridApi!: GridApi<DetalleAsientoResponse>;
  rowData = signal<DetalleAsientoResponse[]>([]);

  private movimientosBancariosLoaded = false; ////cambio para refredcar los listas
  private refrescarColumnasDetalle(): void {
    if (!this.gridApi) return;

    this.gridApi.refreshCells({
      force: true,
      columns: [
        'idMovBancario',
        'movbancario',
        'idLocal',
        'idPlanCuentas',
        'idCodContable',
        'idTipoRetencion',
      ],
    });
  }
  ///////end

  onCellKeyDown(
    evt:
      | CellKeyDownEvent<DetalleAsientoResponse>
      | FullWidthCellKeyDownEvent<DetalleAsientoResponse>
  ): void {
    const keyboardEvent = evt.event as KeyboardEvent;

    if (keyboardEvent.key === 'Enter') {
      keyboardEvent.preventDefault();

      // ENTER → siguiente celda (misma fila)
      if (!keyboardEvent.shiftKey) {
        this.gridApi.tabToNextCell();
      } else {
        // SHIFT + ENTER → celda anterior (opcional)
        this.gridApi.tabToPreviousCell();
      }
    }
  }

  columnDefs: ColDef<DetalleAsientoResponse>[] = [
    {
      headerName: 'Acción',
      colId: 'accion',
      width: 80,
      pinned: 'right',
      suppressHeaderMenuButton: true,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => {
        // Usamos idMovBancario para decidir si hay movimiento válido
        const idMov = Number(params.data?.idMovBancario || 0);
        const tieneMovimiento = idMov > 0;

        const disabledClass = !tieneMovimiento ? 'btn-disabled' : '';
        const disabledAttr = !tieneMovimiento
          ? 'data-disabled="true"'
          : 'data-disabled="false"';

        return `
          <div class="acciones-cell">
            <button class="btn-icon danger"
                    data-action="delete"
                    title="Eliminar línea">
              <img src="assets/icons/borrarfila.png" width="15" height="15" alt="Eliminar" />
            </button>

            <button class="btn-icon primary ${disabledClass}"
                    data-action="edit-tributario"
                    ${disabledAttr}
                    title="Datos Tributarios">
              <img src="assets/icons/eye-open.png" width="15" height="15" alt="Editar" />
            </button>
          </div>
        `;
      },
    },
    { headerName: 'No', field: 'numlinea', width: 50, editable: false },
    {
      headerName: 'Local',
      field: 'idLocal',
      width: 150,
      editable: true,
      singleClickEdit: true,
      cellEditor: LocalCellEditorComponent,
      cellEditorParams: () => ({
        locales: this.locales,
      }),
      valueFormatter: (params) => {
        const v = params.value;
        if (v === null || v === undefined || v === '' || Number(v) === 0) {
          return 'Seleccione...';
        }
        const id = Number(v);
        const local = this.locales.find((l) => l.id === id);
        return local ? `${local.id} - ${local.nombre}` : String(v);
      },
    },

    ///// TIPO MOVIMIENTO
    {
      headerName: 'Tipo Movimiento',
      field: 'idMovBancario',
      width: 220,
      editable: true,
      singleClickEdit: true,
      cellEditor: MovimientoBancarioCellEditorComponent,
      cellEditorParams: () => ({
        movimientos: this.movimientosBancarios,
      }),
      valueFormatter: (params) => {
        const v = params.value;
        if (v == null || v === '' || Number(v) === 0) {
          return 'Seleccione...';
        }
        const id = Number(v);
        const mov = this.movimientosBancarios.find((m) => m.id === id);
        return mov ? mov.label : String(v);
      },
    },

    {
      headerName: 'Tipo Retención',
      field: 'idTipoRetencion',
      width: 220,
      editable: true,
      //valueParser: numberParser,
      //hide:  false,//true, 
      /////lista en tipo retencion
      singleClickEdit: true,
      cellEditor: TipoRetencionCellEditorComponent,
      /*
      cellEditorParams: () => ({
        tiposRetencion: this.tiposRetencion,
      }),
      valueFormatter: (params) => {
        const v = params.value;
        if (v == null || v === '' || Number(v) === 0) {
            return 'Seleccione...';
        }
        const id = Number(v);
        const tipo = this.tiposRetencion.find(t => t.id === id);
        return tipo ? tipo.label : String(v);
      },
      */

      cellEditorParams: (params: any) => {
          const row = params.data as DetalleAsientoResponse;
          const movCode = (row.movbancario || '').toString().trim().toUpperCase();

          let lista: TipoRetencionCombo[] = [];

          // 1) Solo IB / RIB -> retenciones cuyo CodigoTipoRet empieza con '7'
          if (movCode === 'IB' || movCode === 'RIB') {
            lista = this.tiposRetencionAll.filter(t => t.codigo?.startsWith('7'));
          }
          // 2) Movimientos donde NO aplica retención: 0, CH, DP, NC, ND, TB
          else if (['0', 'CH', 'DP', 'NC', 'ND', 'TB'].includes(movCode)) {
            lista = []; // no mostrar opciones
          }
          // 3) Cualquier otro tipo de movimiento -> todas las retenciones
          else {
            lista = this.tiposRetencionAll;
          }

          // guardamos la lista usada en este editor (opcional)
          this.tiposRetencion = lista;

          return { tiposRetencion: lista };
        },
        valueFormatter: (params) => {
          const v = params.value;
          if (v == null || v === '' || Number(v) === 0) {
            return 'Seleccione...';
          }
          const id = Number(v);
          // buscar SIEMPRE en la lista completa
          const tipo = this.tiposRetencionAll.find(t => t.id === id);
          return tipo ? tipo.label : String(v);
      },

    },

    {
      headerName: 'Cuenta Contable',
      field: 'idPlanCuentas',
      width: 280,
      editable: true,
      singleClickEdit: true,
      cellEditor: PlanCuentaCellEditorComponent,
      cellEditorParams: (params: any) => {
        const row = params.data as DetalleAsientoResponse;
        const idMov = Number(row.idMovBancario || 0);

        // Por defecto NO filtramos (mostramos todas las cuentas)
        let condicion: number | null = null;

        if (idMov > 0) {
          const mov = this.movimientosBancarios.find(m => m.id === idMov);

          // 👉 Sólo filtramos si Condicion > 0
          /*
          if (mov && mov.condicion != null && Number(mov.condicion) > 0) {
            condicion = Number(mov.condicion);
          }*/

           if (mov && mov.condicion != null && !isNaN(Number(mov.condicion)) && Number(mov.condicion) > 0) {
            condicion = Number(mov.condicion);
          } 
        }

        let cuentasFiltradas = this.cuentas;

        // Si hay condición > 0, filtramos por IdCodigoEspecial
        if (condicion !== null) {
          cuentasFiltradas = this.cuentas.filter(c =>
            c.idCodigoEspecial != null &&
            Number(c.idCodigoEspecial) === condicion
          );
        }

        // Si condicion es null ⇒ NO se filtró nada ⇒ se devuelven todas las cuentas
        return { cuentas: cuentasFiltradas };
      },

      valueFormatter: (params) => {
        const v = params.value;
        if (v === null || v === undefined || v === '' || Number(v) === 0) {
          return 'Seleccione...';
        }
        const id = Number(v);
        const cta = this.cuentas.find((c) => c.id === id);
        return cta ? cta.label : String(v);
      },
    },

    ///// CODIGOS CONTABLES
    {
      headerName: 'Auxiliar Contable',
      field: 'idCodContable',
      width: 260,
      editable: true,
      hide:false,
      /* ya no se utiliza cell editor aqui
      singleClickEdit: true,
      cellEditor: CodContableCellEditorComponent,
      cellEditorParams: () => ({
        auxiliares: this.auxiliares,
      }),
      valueFormatter: (params) => {
        const v = params.value;
        if (v == null || v === '' || Number(v) === 0) {
          return 'Seleccione...';
        }
        const id = Number(v);
        const aux = this.auxiliares.find((a) => a.id === id);
        return aux ? aux.label : String(v);
      },
      */
    },
    
    {
      headerName: 'No.Comprobante',
      field: 'nocomprobante',
      width: 160,
      editable: true,
      hide: true,//true,
    },
    {
      headerName: 'Cheque',
      field: 'cheque',
      width: 100,
      editable: true,
      valueParser: numberParser,
       hide: true,//true,
    },

    {
      headerName: 'Debe',
      field: 'debe',
      width: 100,
      editable: debeEditable,
      type: 'rightAligned',
      valueSetter: valueSetterDot2,
      valueFormatter: twoDecimalsDotFormatter,
      suppressKeyboardEvent: blockComma,
      cellClassRules: {
        'ag-disabled': (p: any) => toNumber(p.data?.haber) > 0,
      },
    },
    {
      headerName: 'Haber',
      field: 'haber',
      width: 100,
      editable: haberEditable,
      type: 'rightAligned',
      valueSetter: valueSetterDot2,
      valueFormatter: twoDecimalsDotFormatter,
      suppressKeyboardEvent: blockComma,
      cellClassRules: {
        'ag-disabled': (p: any) => toNumber(p.data?.debe) > 0,
      },
    },

    {
      headerName: 'Comentario / Nota',
      field: 'comentario',
      width: 300,
      editable: true,
      // para ingresar en una caja de texto
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true,  // opcional: editor en ventana emergente
      cellEditorParams: {
        maxLength: 150,       // NO permite escribir más de 150 caracteres
        rows: 4,
        cols: 40
      },
      suppressKeyboardEvent: onlyAllowedComentarioKey,
        valueSetter: (params) => {
          const limpio = sanitizeTextoGenerico(params.newValue);
          params.data.comentario = limpio;
          return true;
        }

    },
    {
      headerName: 'Codigo Mov.',
      field: 'movbancario',
      width: 160,
      editable: false,
      hide: true,//true,
    },
    {
      headerName: 'Sustento Trib.',
      field: 'idSustentoTrib',
      width: 150,
      editable: true,
      valueParser: numberParser,
      hide: true,//true,
    },
    {
      headerName: 'Tipo Comp. SRI',
      field: 'idTipoCompSri',
      width: 170,
      editable: true,
      valueParser: numberParser,
      hide: true,//true,
    },
    {
      headerName: 'Autorización',
      field: 'autorizacion',
      width: 160,
      editable: true,
      hide: true,//true,
    },
    {
      headerName: 'Fecha Caduca',
      field: 'fechacaduca',
      width: 150,
      editable: true,
      valueParser: isoParser,
      hide: true,//true,
    },

    {
      headerName: 'Centro Costos',
      field: 'idCentroCostos',
      width: 150,
      editable: true,
      valueParser: numberParser,
      hide: true,//true,
    },
    {
      headerName: 'Proyecto',
      field: 'idProyecto',
      width: 130,
      editable: true,
      valueParser: numberParser,
      hide: true,//true,
    },
    {
      headerName: 'Subproyecto',
      field: 'idSubproyecto',
      width: 160,
      editable: true,
      valueParser: numberParser,
      hide: true,//true,
    },

    {
      headerName: 'Transferido',
      field: 'transferido',
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['true', 'false'] },
      valueParser: boolParser,
      hide: true,//true,
    },
    {
      headerName: 'Fecha Transferido',
      field: 'fechatransferido',
      width: 170,
      editable: true,
      valueParser: isoParser,
      hide: true,//true,
    },
    {
      headerName: 'Fecha Vencimiento',
      field: 'fechavencimiento',
      width: 170,
      editable: true,
      valueParser: isoParser,
      hide: true,//true,
    },
    {
      headerName: 'Cod Conciliación',
      field: 'idConciliacion',
      width: 150,
      editable: true,
      valueParser: numberParser,
      hide: true,//true,
    },
    {
      headerName: 'Valor en Letras',
      field: 'valorLetras',
      width: 220,
      editable: true,
      hide: true,//true,
    },
    { headerName: 'Año', field: 'anio', width: 90, editable: true, hide: true }, ///cambiar a true solo para verificar datos
    {
      headerName: 'Fecha Transacción',
      field: 'fechatransaccion',
      width: 170,
      editable: true,
      valueParser: isoParser,
      hide: true,//true,
    },
    { headerName: 'Hora', field: 'hora', width: 100, editable: true, hide: true },//cambiar a true solo para pruebas
    {
      headerName: 'Zona',
      field: 'idZona',
      width: 110,
      editable: true,
      valueParser: numberParser,
      hide: true,//true,
    },

    {
      headerName: 'Doc. Relacionado',
      field: 'docurelacionado',
      width: 160,
      editable: true,
      hide: true,//true,
    },

    {
      headerName: 'Beneficiario',
      field: 'beneficiario',
      width: 180,
      editable: true,
      hide: true,//true,
    },
    {
      headerName: 'Fecha Ingreso',
      field: 'fechaingreso',
      width: 160,
      editable: true,
      valueParser: isoParser,
      hide: true,//true,
    },
    {
      headerName: 'Fecha Cierre',
      field: 'fechacierre',
      width: 160,
      editable: true,
      valueParser: isoParser,
      hide: true,//true,
    },

    {
      headerName: 'Fecha Conciliado',
      field: 'fechaconciliado',
      width: 170,
      editable: true,
      valueParser: isoParser,
      hide: true,//true,
    },
    { headerName: 'Cierre', field: 'cierre', width: 120, editable: true, hide: true }, //cambiar a true solo para ver data
    { headerName: 'CodprePc', field: 'codprePc', width: 180, editable: true, hide: true },//cambiar a true solo para ver data
    {
      headerName: 'Estado Ingreso',
      field: 'estadoIngreso',
      width: 140,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['true', 'false'] },
      valueParser: boolParser,
      hide: true,//true,
    },
    // ====== NUEVOS CAMPOS ======
    {
      headerName: 'Autorizacion Relacionado',
      field: 'autorizacionRelacionado',
      width: 200,
      editable: true,
      hide: true,         // visible en el grid
    },
    {
      headerName: 'Fecha Caduca Relacionado',
      field: 'fechaCadRelacionado',
      width: 190,
      editable: true,
      valueParser: isoParser,   // usa el mismo normalizador de fechas
      hide: true,              // visible en el grid
    },
  ];

  defaultColDef: ColDef = { resizable: true, editable: true };

  // Totales
  totDebe = computed(() =>
    (this.rowData() ?? []).reduce((a, d) => a + (Number(d.debe) || 0), 0)
  );
  totHaber = computed(() =>
    (this.rowData() ?? []).reduce((a, d) => a + (Number(d.haber) || 0), 0)
  );
  diferencia = computed(() => this.totDebe() - this.totHaber());

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private usuarioService: UsuarioService,
    //cuando entras directo sin opcional cuando entras una pantalla a otro componente
    //public dialogRef: MatDialogRef<FacturasProveedorFormComponent>,
    @Optional() public dialogRef: MatDialogRef<FacturasProveedorFormComponent> | null,
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data: { modo?: 'nuevo' | 'editar'; id?: number } | null,
    ////
    private tipoasientoservice: TipoAsientoService,
    private facturasService: FacturasProveedorService,
    private zonaService: ZonaService,
    private localesService: LocalesService,
    private planCuentasService: PlanCuentasService,
    private codigosContablesService: CodigosContablesService,
    private movimientoBancarioService: MovimientoBancarioService,
    private sustentoTribService: SustentoTributarioService, //sustento tributario
    private tipoCompSriService: TipoComprobanteSriService, //tipo comprobante
    private tipoRetencionService: TipoRetencionService, //tipo retencion
    private asientosService: AsientosContablesService,//para obtener la impresion
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {
    effect(() => {
      const tDebe = this.totDebe();
      const tHaber = this.totHaber();
      if (this.form) {
        this.form.patchValue(
          { totdebe: tDebe, tothaber: tHaber },
          { emitEvent: false }
        );
      }
    });
  }

  //// zonas
  private cargarZonasPorEmpresa(): void {
    const empresaId = this.usuarioActual?.id_empresa ?? 0;

    this.zonas$ = this.zonaService.getAll().pipe(
      map((list) => (list || []).filter((z) => z.empresaCodigo === empresaId)),
      shareReplay(1)
    );
  }
  /// end zonas

  ngOnInit(): void {
    
    this.buildForm();
    // parabuscar codigo contable
      const empresaId = this.usuarioActual?.id_empresa ?? 0;

    // Autocomplete de proveedor: buscar en backend al escribir
      this.filteredAuxiliares$ = this.proveedorCtrl.valueChanges.pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((value) => {
          // value puede ser string (cuando escribe) u objeto (cuando ya seleccionó)
          const term =
            typeof value === 'string'
              ? value
              : value?.label ?? '';

          const search = (term || '').trim();

          // solo buscar cuando tenga al menos 3 caracteres
          if (!search || search.length < 3) {
            this.auxiliares = [];
            return of([]);
          }

          return this.codigosContablesService
            .buscar(search, { idEmpresa: empresaId, maxResults: 20 })
            .pipe(
              map((resp) => {
                const data = (resp.data ?? []) as CodigosContablesResponse[];

                const list = data.map((a) => ({
                  id: a.IdCodContable,
                  label: `${a.Identificacionauxiliar} - ${a.Razonsocial}`,
                  razon: a.Razonsocial,
                }));

                // guardamos la lista actual también en auxiliares
                this.auxiliares = list;
                return list;
              }),
              catchError((err) => {
                console.error('Error buscando proveedores', err);
                this.auxiliares = [];
                return of([]);
              })
            );
        })
      );

    // Cuando cambia la selección del proveedor, sincronizar id + beneficiario
    this.proveedorCtrl.valueChanges.subscribe((value) => {
      if (typeof value === 'string') {
        // solo está escribiendo, todavía no ha seleccionado
         const term = value.trim();

         const idActualAux = Number(this.auxiliarSeleccionadoCtrl.value || 0);
        if (term === '' && idActualAux > 0) {
          // limpiar el id y el beneficiario
          this.auxiliarSeleccionadoCtrl.setValue(0, { emitEvent: true });
          this.auxiliarSeleccionadoCtrl.markAsTouched();

          this.form.patchValue(
            { beneficiario: '' },
            { emitEvent: false }
          );

          // mensaje al usuario
          this.snack.open(
            'Proveedor borrado, por favor vuelva a seleccionarlo.',
            'Cerrar',
            {
              duration: 4000,
              horizontalPosition: 'right',
              verticalPosition: 'top',
            }
          );
        }


        return;
      }

      const selected = value as { id: number; label: string; razon: string } | null;
      const id = selected?.id ?? 0;

      this.auxiliarSeleccionadoCtrl.setValue(id, { emitEvent: true });

      if (id > 0) {
        // beneficiario desde la selección
        this.form.patchValue(
          { beneficiario: selected?.razon ?? '' },
          { emitEvent: false }
        );
      } else {
        this.form.patchValue({ beneficiario: '' }, { emitEvent: false });
      }
    });

    //

    ///para llenar en nebeficiario
    //Cuando cambia el auxiliar contable, actualizar Beneficiario
    this.auxiliarSeleccionadoCtrl.valueChanges.subscribe((id) => {
        const numId = Number(id || 0);
        const aux = this.auxiliares.find(a => a.id === numId);

        if (aux) {
        // Solo ponemos la Razón Social en beneficiario
        this.form.patchValue(
            { beneficiario: aux.razon },
            { emitEvent: false }
        );
        } else {
        // Si se limpia el auxiliar, limpiamos beneficiario
        this.form.patchValue(
            { beneficiario: '' },
            { emitEvent: false }
        );
        }
    });

    ///
    const idDialog = this.data?.id ?? 0;
    const idRoute = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    const id       = idDialog || idRoute;

    if (id > 0) {
    this.modo.set('editar');
    } else {
      this.modo.set('nuevo');
    }
    
    this.tiposAsiento$ = this.tipoasientoservice.ListadoAsiento().pipe(
      tap((list) => {
        this.tipoAsientos = (list ?? []).map((r: any) => ({
          id: r.IdTipoAsiento ?? r[' IdTipoAsiento'],
          nombre: (r.Descripcion ?? r.TipAsiento ?? '').toString().trim(),
          tipDoc: (r.TipAsiento ?? r.CodigoDoc ?? '')
            .toString()
            .trim()
            .toUpperCase(),
        }));
        this.syncTipDocFromCurrentId();
        // Solo hace algo si modo === 'nuevo'
        this.setDefaultTipoAsientoNuevo();
      }),
      shareReplay(1)
    );

    this.bindTipoAsientoToTipDoc();

    // Siempre mantener tipdoc en mayúsculas
    this.form.get('tipdoc')?.valueChanges.subscribe((v) => {
      if (typeof v === 'string') {
        const up = v.toUpperCase();
        if (v !== up) this.form.get('tipdoc')?.setValue(up, { emitEvent: false });
      }
    });

    //this.syncUsuarioEmpresa();
    this.cargarZonasPorEmpresa();
    this.cargarLocales();
    this.cargarPlanCuentas();
    //this.cargarCodigosContables(); // se busca solo al digitar proveedor
    this.cargarMovimientosBancarios();
    this.cargarSustentosTributarios();
    this.cargarTiposCompSriCabecera();
    this.cargarTiposRetencion();

    if (id > 0) {
      this.modo.set('editar');
      this.cargarAsiento(id);
    } else {
      this.modo.set('nuevo');
      const empty = createEmptyAsientoContableResponse();
      this.syncUsuarioEmpresa();
      this.setFormFromHeader(empty);
      this.rowData.set([]);
      this.form.patchValue({ modulo: 1 }, { emitEvent: false }); ///modulo en 1
      this.form.patchValue(
        { anio: getYearFromInput(this.form.get('fechatransaccion')!.value) },
        { emitEvent: false }
      );

      this.form
        .get('fechatransaccion')!
        .valueChanges.pipe(
          startWith(this.form.get('fechatransaccion')!.value),
          map(getYearFromInput),
          distinctUntilChanged()
        )
        .subscribe((y) => {
          this.form.patchValue({ anio: y }, { emitEvent: false });
        });

        this.syncUsuarioEmpresa();
    }
  }

  private buildForm(): void {
    const ahora = new Date();
    const nowIso = formatLocalIso(new Date());
    const todayDate = formatLocalDateOnly(ahora);  // solo fecha (yyyy-MM-dd)

    this.form = this.fb.group({
      IdCabMaestro: [0],
      idZona: [0, [Validators.required, Validators.min(1)]],
      idUsuario: [this.usuarioActual?.id_usuario ?? null],
      idEmpresa: [this.usuarioActual?.id_empresa ?? null],
      idTipoAsiento: [null, [Validators.required, Validators.min(1)]],
      tipdoc: ['', [Validators.required]],
      numdoc: [0],
      anio: [''],
      fechatransaccion: [todayDate, [Validators.required]],
      fechaingreso: [nowIso, [Validators.required]],
      observacion: ['', [Validators.required, Validators.maxLength(250)]],
      totdebe: [0],
      tothaber: [0],
      beneficiario: ['', [Validators.required, Validators.maxLength(150)]],
      cierre: [''],
      fechacierre: [null as string | null],
      solicitado: [''],
      depto: [''],
      autorizado: [''],
      homCodigo: [0],
      estado: [true],
      modulo: [1],
    });
  }

  // tipo asiento
  private bindTipoAsientoToTipDoc(): void {
    this.form
      .get('idTipoAsiento')
      ?.valueChanges.subscribe((id: number | null) => {
        const ta = this.tipoAsientos.find((x) => x.id === Number(id));
        const tipDoc = (ta?.tipDoc ?? '').slice(0, 2);
        this.form.get('tipdoc')?.setValue(tipDoc, { emitEvent: false });
      });
  }

  private syncTipDocFromCurrentId(): void {
    const id = this.form.get('idTipoAsiento')?.value;
    const ta = this.tipoAsientos.find((x) => x.id === Number(id));
    const tipDoc = (ta?.tipDoc ?? '').slice(0, 2);
    this.form.get('tipdoc')?.setValue(tipDoc, { emitEvent: false });
  }

  ///para que el el AD ingreso solo con el ingreso de documentos
  /** Marca automáticamente el Tipo de Asiento por defecto al entrar (modo NUEVO) */
  private setDefaultTipoAsientoNuevo(): void {
        // Solo aplicar cuando es NUEVO
        if (this.modo() !== 'nuevo') return;

        const ctrl = this.form.get('idTipoAsiento');
        if (!ctrl) return;

        // Si ya tiene algún valor (por navegación con id, etc.) no tocarlo
        const current = Number(ctrl.value || 0);
        if (current > 0) return;

        // Código del tipo de asiento que quieres usar por defecto
        const DEFAULT_TIPO_ASIENTO = 'AD';   // <-- cámbialo si luego quieres otro

        // Buscamos en el array simplificado que llenas en el tap()
        const found = this.tipoAsientos.find(
        x => (x.tipDoc || '').toUpperCase() === DEFAULT_TIPO_ASIENTO
        );

        if (found) {
        ctrl.patchValue(found.id, { emitEvent: true }); // dispara el binding a tipdoc
        }
    }


  ///end

  private setFormFromHeader(h: AsientoContableResponse): void {
    const idTipoAsiento = h.idTipoAsiento && h.idTipoAsiento > 0 ? h.idTipoAsiento : null;

    this.form.reset({
      IdCabMaestro: h.IdCabMaestro,
      idZona: h.idZona,
      idUsuario: h.idUsuario,
      idEmpresa: h.idEmpresa,
      idTipoAsiento: idTipoAsiento,
      tipdoc: h.tipdoc,
      numdoc: h.numdoc,
      anio: h.anio,
      fechatransaccion: h.fechatransaccion
      ? normalizeToLocalDate(h.fechatransaccion)   // solo fecha
      : null,
      fechaingreso: h.fechaingreso,
      observacion: h.observacion,
      totdebe: h.totdebe,
      tothaber: h.tothaber,
      beneficiario: h.beneficiario,
      cierre: h.cierre,
      fechacierre: h.fechacierre ?? null,
      solicitado: h.solicitado,
      depto: h.depto,
      autorizado: h.autorizado,
      homCodigo: h.homCodigo,
      estado: h.estado,
      modulo: h.modulo != null ? Number(h.modulo) : 1,
    });
  }

  private cargarAsiento(idCabMaestro: number): void {
    this.loading.set(true);
    this.facturasService.getById(idCabMaestro).subscribe({
      next: (resp) => {
        this.setFormFromHeader(resp);

       
        this.rowData.set(resp.detalles ?? []);
        this.refrescarColumnasDetalle();
        //tomar el auxiliar para el selector
         const firstAux = resp.detalles && resp.detalles.length
          ? Number(resp.detalles[0].idCodContable || 0)
          : 0;
       
       
          if (firstAux > 0) {
          //para al editar se cargue el beneficiario PENDIENTE REVISION DEBE RECUPERAR 
          // LO QUE TIEN YA NO SE PUEDE CAMBIAR DE BENERFICIARIO POR AHORA QUEDA EN FALSE TOMAR EN CUENTA
          this.auxiliarSeleccionadoCtrl.setValue(firstAux, { emitEvent: false });
          // this.auxiliarSeleccionadoCtrl.setValue(firstAux, { emitEvent: true });  
        }
      
      const bene = resp.beneficiario ?? '';
      this.proveedorCtrl.setValue(bene, { emitEvent: false });

      // 3) Por si acaso, sincronizamos también el control del form,
      //    aunque setFormFromHeader ya lo hizo
      this.form.patchValue(
        { beneficiario: bene },
        { emitEvent: false }
      );

        /////no de comprobante
        // 🔹 Tomar el No.Comprobante de la primera línea y mostrarlo arriba
        const firstNoComp = resp.detalles && resp.detalles.length
          ? (resp.detalles[0].nocomprobante ?? '')
          : '';
        this.nroComprobanteCtrl.setValue(firstNoComp, { emitEvent: false });
        
        ///sustento tributario
        const firstSustento = resp.detalles && resp.detalles.length
        ? Number(resp.detalles[0].idSustentoTrib || 0)
        : 0;

        if (firstSustento > 0) {
        this.sustentoTribCtrl.setValue(firstSustento, { emitEvent: false });
        }
        ///tipo comprobante
         const firstTipoComp = resp.detalles && resp.detalles.length
          ? Number(resp.detalles[0].idTipoCompSri || 0)
          : 0;
        if (firstTipoComp > 0) {
          this.tipoCompSriCtrl.setValue(firstTipoComp, { emitEvent: false });
        }
        /////otros controles
        // 🔹 Autorización / Fechas tomadas de la primera línea del detalle
        const firstAut = resp.detalles && resp.detalles.length
          ? (resp.detalles[0].autorizacion ?? '')
          : '';
        this.autorizacionCtrl.setValue(firstAut, { emitEvent: false });

        ///fechas
        /* 
        const firstFechaCad = resp.detalles && resp.detalles.length
          ? (resp.detalles[0].fechacaduca || '')
          : '';
        this.fechacaducaCtrl.setValue(firstFechaCad || null, { emitEvent: false });

        const firstFechaVen = resp.detalles && resp.detalles.length
          ? (resp.detalles[0].fechavencimiento || '')
          : '';
        this.fechavencimientoCtrl.setValue(firstFechaVen || null, { emitEvent: false });
        */
      const firstFechaCad = resp.detalles && resp.detalles.length
        ? (resp.detalles[0].fechacaduca || '')
        : '';
      this.fechacaducaCtrl.setValue(
        firstFechaCad ? normalizeToLocalDate(firstFechaCad) : null,
        { emitEvent: false }
      );

      const firstFechaVen = resp.detalles && resp.detalles.length
        ? (resp.detalles[0].fechavencimiento || '')
        : '';
      this.fechavencimientoCtrl.setValue(
        firstFechaVen ? normalizeToLocalDate(firstFechaVen) : null,
        { emitEvent: false }
      );
        /////
        this.refrescarColumnasDetalle();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar factura de proveedor', err);
        this.loading.set(false);
      },


    });
  }

  private cargarLocales(): void {
    this.localesService.getAll().subscribe({
      next: (res) => {
        const data = (res.data ?? []) as LocalesResponse[];

        this.locales = data.map((l) => ({
          id: (l as any).idLocal ?? (l as any).id ?? 0,
          nombre: (l as any).nombre,
        }));

        this.gridApi?.refreshCells({ force: true, columns: ['idLocal'] });
      },
      error: (err) => {
        console.error('Error cargando locales', err);
      },
    });
  }

  /*
  private cargarPlanCuentas(): void {
    const empresaId = this.usuarioActual?.id_empresa ?? 0;

    this.planCuentasService
      .getAll({ idEmpresa: empresaId, estado: 'A' })
      .subscribe({
        next: (list: PlanCuenta[]) => {
          const movs = (list || []).filter((c) => c.EsMovimiento);

          this.cuentas = movs.map((c) => ({
            id: c.IdPlanCuentas,
            label: `${c.CuentaPresentacion} - ${c.NombreCuenta}`,
            codigo: c.CuentaPresentacion,
            // usamos exactamente IdCodigoEspecial del backend
            //idCodigoEspecial: c.IdCodigoEspecial ?? null,
            idCodigoEspecial:
            c.IdCodigoEspecial && c.IdCodigoEspecial > 0
              ? c.IdCodigoEspecial
              : null,
          }));

          this.gridApi?.refreshCells({ force: true, columns: ['idPlanCuentas'] });
        },
        error: (err) => {
          console.error('Error cargando plan de cuentas', err);
        },
      });
  }
*/

  private cargarPlanCuentas(): void {
    const empresaId = this.usuarioActual?.id_empresa ?? 0;

    this.planCuentasService
      .getAll({ idEmpresa: empresaId, estado: 'A' })
      .subscribe({
        next: (list: PlanCuenta[]) => {
          const lista = list || [];

          // ⚠️ IMPORTANTE:
          // Antes filtrábamos por c.EsMovimiento. Eso puede dejar FUERA
          // cuentas que sí tienen IdCodigoEspecial = 9 (IVA) y por eso
          // al filtrar por condición 9 no aparecía ninguna.
          //
          // Si quieres seguir filtrando por EsMovimiento, cambia la
          // siguiente línea a:
          //   const fuente = lista.filter(c => c.EsMovimiento);
          const fuente = lista; // TODAS las cuentas activas

          this.cuentas = fuente.map((c) => ({
            id: c.IdPlanCuentas,
            label: `${c.CuentaPresentacion} - ${c.NombreCuenta}`,
            codigo: c.CuentaPresentacion,
            // Normalizamos SIEMPRE a número o null
            idCodigoEspecial:
              c.IdCodigoEspecial != null && Number(c.IdCodigoEspecial) > 0
                ? Number(c.IdCodigoEspecial)
                : null,
          }));

          console.log('Plan de cuentas normalizado:', this.cuentas.slice(0, 5));

          this.gridApi?.refreshCells({ force: true, columns: ['idPlanCuentas'] });
        },
        error: (err) => {
          console.error('Error cargando plan de cuentas', err);
        },
      });
  }


  private cargarCodigosContables(): void {
    const empresaId = this.usuarioActual?.id_empresa ?? 0;

    this.codigosContablesService.getAll({ idEmpresa: empresaId }).subscribe({
      next: (res) => {
        const data = (res.data ?? []) as CodigosContablesResponse[];

        console.log('Codigos contables recibidos:', data[0]);

        this.auxiliares = data.map((a) => ({
          id: a.IdCodContable,
          label: `${a.Identificacionauxiliar} - ${a.Razonsocial}`,
          razon: a.Razonsocial,              // guardamos la razón social aparte
        }));

        this.gridApi?.refreshCells({ force: true, columns: ['idCodContable'] });
      },
      error: (err) => {
        console.error('Error cargando códigos contables', err);
      },
    });
  }

  /*
  private cargarMovimientosBancarios(): void {
    this.movimientoBancarioService.getAll().subscribe({
      next: (res) => {
        const data = (res.data ?? []) as MovimientoBancarioResponse[];

        // NO permitimos el movimiento con IdMovBancario = 0 (NINGUNO)
        this.movimientosBancarios = (data || [])
          .filter((m) => m.IdMovBancario && m.IdMovBancario > 0)
          .map((m) => ({
            id: m.IdMovBancario,
            movimiento: m.Movimiento,
            descripcion: m.Descripcion,
            label: `${m.Movimiento} - ${m.Descripcion}`,
            // 👇 usamos exactamente el campo Condicion del backend
            condicion: m.Condicion ?? null,
          }));

        this.gridApi?.refreshCells({ force: true, columns: ['idMovBancario'] });
      },
      error: (err) => {
        console.error('Error cargando movimientos bancarios', err);
      },
    });
  }
*/

  private cargarMovimientosBancarios(): void {
    this.movimientoBancarioService.getAll().subscribe({
      next: (res) => {
        const data = (res.data ?? []) as MovimientoBancarioResponse[];

        // NO permitimos el movimiento con IdMovBancario = 0 (NINGUNO)
        this.movimientosBancarios = (data || [])
          .filter((m) => m.IdMovBancario && m.IdMovBancario > 0)
          .map((m) => {
            const cond =
              m.Condicion != null && m.Condicion !== undefined
                ? Number(m.Condicion)
                : null;

            return {
              id: m.IdMovBancario,
              movimiento: m.Movimiento,
              descripcion: m.Descripcion,
              label: `${m.Movimiento} - ${m.Descripcion}`,
              condicion: !isNaN(cond as any) && (cond as number) > 0 ? cond : null,
            };
          });

        console.log(
          'Movimientos bancarios normalizados:',
          this.movimientosBancarios
        );

        //this.gridApi?.refreshCells({ force: true, columns: ['idMovBancario'] });
        this.movimientosBancariosLoaded = true;
        this.refrescarColumnasDetalle();

      },
      error: (err) => {
        console.error('Error cargando movimientos bancarios', err);
      },
    });
  }


  private cargarSustentosTributarios(): void {
    this.sustentoTribService.getAll().subscribe({
        next: (resp) => {
        const data = (resp.data ?? []) as SustentoTributarioResponse[];
        this.listaSustentosTrib = data.map((s) => ({
            id: s.IdSustentoTrib,
            label: `${s.Codsustento} — ${s.Dessustento}`,
        }));
        },
        error: (err) =>
        console.error('Error cargando Sustentos Tributarios', err),
    });
    }

    // comprban te sri
     // ====== CABECERA: Tipo Comprobante SRI ======
  private cargarTiposCompSriCabecera(): void {
    // usamos Listado() para tener Codtipcomp normalizado
    this.tipoCompSriService.Listado().subscribe({
      next: (list) => {
        this.listaTiposCompSriCab = (list ?? []).map((t) => ({
          id: t.IdTipoCompSri,
          label: `${t.Codtipcomp} - ${t.Destipcomp}`,
        }));
      },
      error: (err) => {
        console.error('Error cargando tipos comprobante SRI (cabecera)', err);
      },
    });
  }

  ///tipo retencion
 private cargarTiposRetencion(): void {
  this.tipoRetencionService.getAllTipo().subscribe({
    next: (data: TipoRetencionResponse[]) => {
      // 1) LLENAR lista completa
      this.tiposRetencionAll = data.map(t => ({
        id: t.IdTipoRetencion,
        codigo: t.CodigoTipoRet,                 // ej. "701"
        porcentaje: Number(t.Porcentaje || 0),   // ej. 10
        label: `${t.CodigoTipoRet} - ${t.Descripcion} (${t.Porcentaje}%)`,
      }));

      // 2) Por defecto la lista visible es toda
      this.tiposRetencion = [...this.tiposRetencionAll];

      console.log('Tipos retención cargados:', this.tiposRetencionAll);

      // 3) refrescar columna del grid
      this.gridApi?.refreshCells({
        force: true,
        columns: ['idTipoRetencion'],
      });
    },
    error: (err: any) => {
      console.error('Error cargando tipos de retención', err);
    },
  });
}
  ///tipo retencion
  
  //// validaciones
  private validarDetalle(): boolean {
    const filas = this.rowData() ?? [];
    const errores: string[] = [];

    if (!filas.length) {
      errores.push('Debe ingresar al menos una línea en el detalle.');
    }

    filas.forEach((f, idx) => {
      const linea = idx + 1;
      const idLocal = Number(f.idLocal || 0);
      const idPlanCuentas = Number(f.idPlanCuentas || 0);
      const idAuxiliar = Number(f.idCodContable || 0);
      const idMovBancario = Number(f.idMovBancario || 0);
      const debe = Number(f.debe || 0);
      const haber = Number(f.haber || 0);
      const idSust = Number(f.idSustentoTrib || 0);        // ⬅️ nuevo
      const idTipoComp = Number(f.idTipoCompSri || 0);     // ⬅️ nuevo

      if (idLocal <= 0) {
        errores.push(`Línea ${linea}: debe seleccionar el Local.`);
      }

      if (idMovBancario <= 0) {
        errores.push(
          `Línea ${linea}: debe seleccionar el Tipo de Movimiento (distinto de NINGUNO).`
        );
      }

      if (idPlanCuentas <= 0) {
        errores.push(`Línea ${linea}: debe seleccionar la Cuenta Contable.`);
      }

      if (idAuxiliar <= 0) {
        errores.push(`Línea ${linea}: debe seleccionar el Auxiliar Contable.`);
      }

      if (debe <= 0 && haber <= 0) {
        errores.push(
          `Línea ${linea}: debe ingresar un valor en Debe o en Haber.`
        );
      }

      if (debe > 0 && haber > 0) {
        errores.push(
          `Línea ${linea}: no puede tener valores en Debe y Haber al mismo tiempo.`
        );
      }

      ///sustento trib
      if (idSust <= 0) {
        errores.push(`Línea ${linea}: debe seleccionar el Sustento Tributario.`);
      }
      ///tipocomprobante sri
      if (idTipoComp <= 0) {
        errores.push(`Línea ${linea}: debe seleccionar el Tipo de Comprobante SRI.`);
      }

    });

    const diff = this.totDebe() - this.totHaber();
    if (Math.round(diff * 100) / 100 !== 0) {
      errores.push(
        'La diferencia entre Total Debe y Total Haber debe ser 0. Verifique los valores.'
      );
    }

    if (errores.length > 0) {
      this.snack.open(errores[0], 'Cerrar', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });

      console.warn('Errores en detalle de factura proveedor:', errores);
      return false;
    }

    return true;
  }

  ///guardar factura proveedor
  guardar(): void {
  if (this.saving() || this.loading()) return;

  this.numdocGenerado = null;

  this.form.markAllAsTouched();
  this.auxiliarSeleccionadoCtrl.markAsTouched();
  this.nroComprobanteCtrl.markAsTouched();
  this.sustentoTribCtrl.markAsTouched();
  this.tipoCompSriCtrl.markAsTouched();
  this.autorizacionCtrl.markAsTouched();
  this.fechacaducaCtrl.markAsTouched();
  this.fechavencimientoCtrl.markAsTouched();

  if (!this.validarCabecera() || this.form.invalid) {
    this.snack.open('Revisa los campos obligatorios', 'OK', {
      duration: 2500,
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
    return;
  }

  if (!this.validarDetalle()) {
    return;
  }

  const esNuevo = this.modo() === 'nuevo';

  // ===== FECHAS BASE =====
  const ahora = new Date();
  const nowIso = formatLocalIso(ahora);

  const fechaTransControl = this.form.get('fechatransaccion')!.value;

  if (!fechaTransControl) {
    this.snack.open('Debe ingresar la Fecha de Transacción.', 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
    return;
  }
  /*
  const fechaTransaccionIso = fechaTransControl
    ? normalizeToLocalIso(fechaTransControl)
    : nowIso;

  const anioTransaccion = getYearFromInput(fechaTransaccionIso);
  */
 // ✅ Solo FECHA (yyyy-MM-dd), respetando lo que puso el usuario
  const fechaTransaccionSoloFecha = normalizeToLocalDate(fechaTransControl);

  // Año basado en esa fecha
  const anioTransaccion = getYearFromInput(fechaTransaccionSoloFecha);


  this.form.patchValue(
    {
      anio: anioTransaccion,
      fechatransaccion: fechaTransaccionSoloFecha,// fechaTransaccionIso,
    },
    { emitEvent: false }
  );

  if (esNuevo) {
    this.form.patchValue(
      {
        fechaingreso: nowIso,
        fechacierre: null,
      },
      { emitEvent: false }
    );

    const detallesActuales = this.rowData() ?? [];

    const detallesConFecha = detallesActuales.map((d) => {
      const fechaIng =
        d.fechaingreso && d.fechaingreso !== ''
          ? normalizeToLocalIso(d.fechaingreso)
          : nowIso;

      const fechaTransDet =fechaTransaccionSoloFecha;
      /*
        d.fechatransaccion && d.fechatransaccion !== ''
          ? normalizeToLocalIso(d.fechatransaccion)
          : fechaTransaccionSoloFecha//fechaTransaccionIso;
      */
      return {
        ...d,
        anio: d.anio && d.anio !== '' ? d.anio : anioTransaccion,
        fechatransaccion: fechaTransDet,
        fechaingreso: fechaIng,
        hora: d.hora && d.hora !== '' ? d.hora : getTimeFromInput(fechaIng),
        fechacierre: d.fechacierre || '',
        autorizacionRelacionado: '',
        fechaCadRelacionado: '',
      } as DetalleAsientoResponse;
    });

    this.rowData.set(detallesConFecha);
  }

  const rawForm = this.form.value as AsientoContableResponse;

    const header: AsientoContableResponse = {
    ...rawForm,
    /*
    //modulo: 1,
     modulo: esNuevo
      ? 1
      : (rawForm.modulo != null && rawForm.modulo !== undefined
          ? Number(rawForm.modulo)
          : 0),
    */
    modulo:
    rawForm.modulo != null && !isNaN(Number(rawForm.modulo))
      ? Number(rawForm.modulo)
      : 1,    
    fechatransaccion: fechaTransaccionSoloFecha, //fechaTransaccionIso,
    fechaingreso: esNuevo ? nowIso : normalizeToLocalIso(rawForm.fechaingreso),
    fechacierre: esNuevo ? '' : rawForm.fechacierre,
    numdoc: esNuevo ? 0 : rawForm.numdoc ?? 0,
    totdebe: this.totDebe(),
    tothaber: this.totHaber(),
    detalles: this.rowData(),
  };
  // 🔹 ESTE es el objeto que debemos enviar
  const payload = this.normalizarParaBackend(header);

  console.log('>>> HEADER.fechaingreso ENVIADO:', header.fechaingreso);
  console.log('>>> DETALLE[0].fechaingreso ENVIADO:', payload.detalles?.[0]?.fechaingreso);
  console.log('form.modulo:', this.form.get('modulo')?.value);
  console.log('header.modulo:', header.modulo);
  console.log('payload.modulo:', payload.modulo);


  this.saving.set(true);
 // Respuesta puede ser ApiResponse<number> (crear) o ApiResponse<boolean> (update)
  type SaveResponse = ApiResponse<number> | ApiResponse<boolean>;
  let save$: Observable<SaveResponse>;

  if (esNuevo) {
    // POST /FacturaProveedor  -> ApiResponse<long> (IdCabMaestro)
    save$ = this.facturasService.crear(payload) as Observable<SaveResponse>;
  } else {
    const idCab =
      header.IdCabMaestro ||
      Number(this.route.snapshot.paramMap.get('id') ?? 0);
    // PUT /FacturaProveedor/{id} -> ApiResponse<bool>
    save$ = this.facturasService.actualizar(idCab, payload) as Observable<SaveResponse>;
  }
  save$
    .pipe(
      tap((resp) => {
        // si es nuevo y el backend devuelve el IdCabMaestro
        if (esNuevo && typeof resp.data === 'number' && resp.data > 0) {
          this.form.patchValue(
            { IdCabMaestro: resp.data },
            { emitEvent: false }
          );
        }

        // extraer Numdoc del mensaje si viene
        if ((resp as any).message) {
          const msg = (resp as any).message as string;
          const match = msg.match(/Numdoc\s*=\s*(\d+)/i);
          this.numdocGenerado = match?.[1] ?? null;
        }
      }),
      map((resp) => {
        console.log('Respuesta API Factura Proveedor:', resp);

        const ok =
          typeof resp.data === 'number'
            ? resp.data > 0
            : !!resp.data;

        if (!ok) {
          throw resp;
        }
        return true;
      }),
      catchError((err: any) => {
        let msg = 'No se ha podido registrar la factura del proveedor.';

        if (err?.status === 400) {
          msg =
            'No está definido el número de control o está ocupado, verifique.';
        } else if (err?.error?.message) {
          msg = err.error.message;
        } else if (err?.message) {
          msg = err.message;
        }

        this.snack.open(msg, 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });
        console.error('Error backend factura proveedor:', err);
        return of(false);
      }),
      finalize(() => this.saving.set(false))
    )
    .subscribe((ok) => {
      if (ok) {
        const msg = this.numdocGenerado
          ? `Guardado correctamente. AD Numdoc: ${this.numdocGenerado}`
          : 'Guardado correctamente';

        this.snack.open(msg, 'OK', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });

         ///imprimir asiento///
        const dlg = this.mostrarMensaje({
              title: 'Imprimir asiento',
              message: '¿Desea imprimir el asiento?',
              type: 'info',
              confirmText: 'Sí',
              cancelText: 'No',
              showCancel: true,
        });

        dlg.afterClosed().subscribe((imprimir) => {
            if (imprimir) {
              this.imprimirAsiento(); // usa el IdCabMaestro / id de ruta
            }
            // cerramos el formulario igual
            //this.dialogRef.close(true);

             if (this.dialogRef) {
                this.dialogRef.close(true);
              } else {
                this.resetParaNuevo();
              }

        });

       
      }
    });
}


  cancelar(): void {
    ///cuando es por ingreso de algun componente ej lista y de ahi a nuevo ahi llamas asi caso contrario directo
    ///la instruccion de abajo
    //this.dialogRef.close(false);
    if (this.dialogRef) {
        this.dialogRef.close(false);
    } else {
        this.router.navigate(['/cg-3000/inicio-cg']);
    }

  }

  onGridReady(evt: GridReadyEvent<DetalleAsientoResponse>): void {
    this.gridApi = evt.api;
    this.refrescarColumnasDetalle(); ////refrescar el detalle
  }

  onCellValueChanged(evt: CellValueChangedEvent<DetalleAsientoResponse>): void {
    if (evt.colDef.field === 'debe' || evt.colDef.field === 'haber') {
      
      const filas = this.rowData() ?? [];
      const rowIndex = evt.node.rowIndex ?? 0;
      const lastIndex = filas.length - 1;

      this.rowData.set([...filas]);
      //this.rowData.set([...this.rowData()]); estaba antes
      // Si cambió el DEBE, recalculamos el HABER global
      /* ESTABA ANTES
      if (evt.colDef.field === 'debe') {
        //this.recalcularHaberDesdeDebe();
        this.recalcularHaberDesdeDebe(false);
      }
      */
      //this.recalcularHaberDesdeDebe(false); estaba antes

       if (rowIndex < lastIndex) {
        this.recalcularHaberDesdeDebe(false);
      }

    }

    if (evt.colDef.field === 'idPlanCuentas') {
      const id = Number(evt.newValue ?? 0);
      const cta = this.cuentas.find((c) => c.id === id);

      if (cta && evt.data) {
        evt.data.codprePc = cta.codigo;

        this.rowData.set([...this.rowData()]);
        this.gridApi.refreshCells({
          rowNodes: [evt.node],
          columns: ['codprePc'],
          force: true,
        });
      }
    }

    // Tipo Movimiento → movbancario (código)
    // Tipo Movimiento → movbancario (código)
    if (evt.colDef.field === 'idMovBancario') {
      const idNuevo = Number(evt.newValue ?? 0);
      const idAnterior = Number(evt.oldValue ?? 0);

      // NO permitir que se quede en 0 (NINGUNO)
      if (!idNuevo || idNuevo <= 0) {
        // volvemos al valor anterior
        evt.data!.idMovBancario = idAnterior;

        const oldMov = this.movimientosBancarios.find((m) => m.id === idAnterior);
        evt.data!.movbancario = oldMov ? oldMov.movimiento : '';

        this.rowData.set([...this.rowData()]);
        this.gridApi.refreshCells({
          rowNodes: [evt.node],
          columns: ['idMovBancario', 'movbancario', 'accion'],
          force: true,
        });

        this.snack.open(
          'Debe seleccionar un Tipo de Movimiento válido (no se permite "0 - NINGUNO").',
          'Cerrar',
          {
            duration: 3500,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          }
        );
        return;
      }

      const mov = this.movimientosBancarios.find((m) => m.id === idNuevo);

      if (mov && evt.data) {
        // código del movimiento (ej. CH, DP, IB, etc.)
        evt.data.movbancario = mov.movimiento;

        // === LÓGICA TIPO RETENCIÓN SEGÚN MOVIMIENTO ===
        const movCode = mov.movimiento.toString().trim().toUpperCase();

        // 0, CH, DP, NC, ND, TB -> sin retención
        if (['0', 'CH', 'DP', 'NC', 'ND', 'TB'].includes(movCode)) {
          evt.data.idTipoRetencion = null as any;
        }
        // IB / RIB -> solo retenciones cuyo código empieza con '7'
        else if (movCode === 'IB' || movCode === 'RIB') {
          if (evt.data.idTipoRetencion) {
            const tr = this.tiposRetencionAll.find(
              t => t.id === Number(evt.data.idTipoRetencion)
            );
            if (!tr || !tr.codigo?.startsWith('7')) {
              evt.data.idTipoRetencion = null as any;
            }
          }
        }

        // 🔹 SI CAMBIÓ el Tipo Movimiento, limpiamos la Cuenta Contable
        if (idNuevo !== idAnterior) {
          evt.data.idPlanCuentas = 0 as any; // para que valueFormatter muestre "Seleccione..."
          evt.data.codprePc = '';            // limpia el código de la cuenta
        }

        this.rowData.set([...this.rowData()]);
        this.gridApi.refreshCells({
          rowNodes: [evt.node],
          columns: [
            'idMovBancario',
            'movbancario',
            'accion',
            'idTipoRetencion',
            'idPlanCuentas',
            'codprePc',
          ],
          force: true,
        });
      }
    }
    //
  }

  onCellClicked(evt: CellClickedEvent<DetalleAsientoResponse>): void {
    if (evt?.colDef?.colId !== 'accion') {
      return;
    }

    const button = (evt.event?.target as HTMLElement)?.closest('button');
    if (!button) {
      return;
    }

    const action = button.getAttribute('data-action');

    // Eliminar línea
    if (action === 'delete' && evt.node?.data) {
      this.eliminarLinea(evt.node.data);
      return;
    }

    // Datos tributarios
    if (action === 'edit-tributario' && evt.node?.data) {
      // Validación fuerte por idMovBancario
      const idMov = Number(evt.node.data.idMovBancario || 0);
      const disabled = button.getAttribute('data-disabled') === 'true';
      const movCode = (evt.node.data.movbancario ?? '').toString().trim();

      if (disabled || idMov <= 0) {
        this.snack.open(
          'Primero seleccione un Tipo de Movimiento válido para esta línea.',
          'Cerrar',
          {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          }
        );
        return;
      }

      if (disabled || movCode === '0') {
        this.snack.open(
          'No puede registrar datos tributarios cuando el tipo de movimiento es NINGUNO.',
          'Cerrar',
          {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          }
        );
        return;
      }

      this.abrirDialogoTributario(evt.node.data, evt.node);
    }
  }

  agregarLinea(): void {
    // VALIDAR QUE SE SELECCIONE ZONA Y TIPO ASIENTO PARA AÑADIR LINEA

    const idZonaCtrl = this.form.get('idZona');
    const idTipoAsientoCtrl = this.form.get('idTipoAsiento');
    const idZona = Number(idZonaCtrl?.value || 0);
    const idTipoAsiento = Number(idTipoAsientoCtrl?.value || 0);
    const idAuxiliar = Number(this.auxiliarSeleccionadoCtrl.value || 0); // para el auxiliar en cabecera
    const nroComprobante = (this.nroComprobanteCtrl.value || '').toString().trim();
    const idSustentoCab = Number(this.sustentoTribCtrl.value || 0);
    const idTipoCompSriCab = Number(this.tipoCompSriCtrl.value || 0); 
    const autorizacionCab = (this.autorizacionCtrl.value || '').toString().trim();

    const fechaCadCabForm = this.fechacaducaCtrl.value;
    const fechaVenCabForm = this.fechavencimientoCtrl.value;

    const fechaCadCab = fechaCadCabForm
    ? normalizeToLocalDate(fechaCadCabForm)
    : '';

  const fechaVenCab = fechaVenCabForm
    ? normalizeToLocalDate(fechaVenCabForm)
    : '';
    
    /*
    const fechaCadCabIso = fechaCadCabForm
      ? normalizeToLocalIso(fechaCadCabForm)
      : '';

    const fechaVenCabIso = fechaVenCabForm
      ? normalizeToLocalIso(fechaVenCabForm)
      : '';
    */
    const mensajes: string[] = [];
    if (idZona <= 0) {
      mensajes.push('Debe seleccionar la Zona.');
      idZonaCtrl?.markAsTouched();
    }
    if (!idTipoAsiento || idTipoAsiento <= 0) {
      mensajes.push('Debe seleccionar el Tipo de Asiento.');
      idTipoAsientoCtrl?.markAsTouched();
    }

    //para el auxilar---
    if (!idAuxiliar || idAuxiliar <= 0) {
        mensajes.push('Debe seleccionar el Auxiliar Contable.');
        this.auxiliarSeleccionadoCtrl.markAsTouched();
        }
    ///no de comprobante
     // 🔹 Nuevo: validar No. Comprobante
    if (!nroComprobante) {
      mensajes.push('Debe ingresar el No. Comprobante.');
      this.nroComprobanteCtrl.markAsTouched();
    }

    //sustento trinutario
    if (!idSustentoCab || idSustentoCab <= 0) {
        mensajes.push('Debe seleccionar el Sustento Tributario.');
        this.sustentoTribCtrl.markAsTouched();
    }

    if (!idTipoCompSriCab || idTipoCompSriCab <= 0) {
      mensajes.push('Debe seleccionar el Tipo de Comprobante SRI.');
      this.tipoCompSriCtrl.markAsTouched();
    }

     if (!autorizacionCab) {
      mensajes.push('Debe ingresar la Autorización.');
      this.autorizacionCtrl.markAsTouched();
    }

    if (!fechaCadCab) {
      mensajes.push('Debe ingresar la Fecha Caduca.');
      this.fechacaducaCtrl.markAsTouched();
    }

    if (!fechaVenCab) {
      mensajes.push('Debe ingresar la Fecha Vencimiento.');
      this.fechavencimientoCtrl.markAsTouched();
    }

    if (mensajes.length > 0) {
      this.snack.open(mensajes.join(' '), 'Cerrar', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return; // NO agrega la línea
    }

    const ahora = new Date();
    const nowIso = formatLocalIso(ahora);

    const items = this.rowData();
    const next = (items?.length ?? 0) + 1;

    const fechaTransFormulario = this.form.value?.fechatransaccion || nowIso;
    const fechaTransaccionDetalle = normalizeToLocalDate(fechaTransFormulario);//  normalizeToLocalIso(fechaTransFormulario);
    const anioTransaccion =
      this.form.value?.anio || getYearFromInput(fechaTransaccionDetalle);

    const fechaIngresoIso = nowIso;
    const horaIngreso = getTimeFromInput(fechaIngresoIso);

    const nueva: DetalleAsientoResponse = {
      IdDetMaestro: 0,
      IdCabMaestro: Number(this.form.value?.IdCabMaestro ?? 0),
      numlinea: next,

      anio: anioTransaccion,
      fechatransaccion: fechaTransaccionDetalle,
      fechaingreso: fechaIngresoIso,
      hora: horaIngreso,
      idZona: Number(this.form.value?.idZona ?? 0),

      idCentroCostos: null as any,//0,
      idLocal: 0,
      idPlanCuentas: 0,
      codprePc: '',
      idCodContable: idAuxiliar,///0, el id seleccionado en la cabecera
      nocomprobante: nroComprobante, //'',
      docurelacionado: '',
      cheque: 0,

      beneficiario: this.form.value?.beneficiario ?? '',
      debe: 0,
      haber: 0,
      comentario:this.form.value?.observacion ?? '',///'', '',
      idMovBancario: 0, // inicial 0 (ninguno) -> debe ser cambiado por el usuario
      movbancario: '',

      cierre: '',
      fechacierre: null as any,//'',
      conciliado: '',
      fechaconciliado: null as any,//'',

      idSustentoTrib: idSustentoCab, ///0, 
      idTipoCompSri: idTipoCompSriCab,//0,
      autorizacion: autorizacionCab,//'',
      fechacaduca: fechaCadCab, ///fechaCadCabIso,//'',
      idTipoRetencion: null as any,//0,
      idProyecto: null as any,//0,
      idSubproyecto:null as any,// 0,

      transferido: false,
      fechatransferido: null as any,//'',
      fechavencimiento: fechaVenCab, //fechaVenCabIso,//'',
      idConciliacion: 0,
      valorLetras: '',
      estadoIngreso: true,
      // NUEVOS CAMPOS
      autorizacionRelacionado: '',
      fechaCadRelacionado: null as any,//'',
    };

    this.rowData.set([...(items ?? []), nueva]);

    queueMicrotask(() => {
      const lastIndex = (this.rowData().length ?? 1) - 1;
      this.gridApi?.ensureIndexVisible(lastIndex);
      this.gridApi?.startEditingCell({
        rowIndex: lastIndex,
        colKey: 'codprePc',
      });
    });

    //bloquear cabecera debe bloquear en los 2 tiempos
    //if (this.modo() === 'nuevo') {
      this.bloquearCabecera();
    //}
     this.recalcularHaberDesdeDebe(true);


  }

  /*
  eliminarLinea(item: DetalleAsientoResponse): void {
    const items = (this.rowData() ?? []).filter((x) => x !== item);
    items.forEach((d, i) => (d.numlinea = i + 1));
    this.rowData.set(items);
    //automatico
     this.recalcularHaberDesdeDebe(false);
  }
*/

eliminarLinea(item: DetalleAsientoResponse): void {
    const filasActuales = this.rowData() ?? [];
    const removedIndex = filasActuales.indexOf(item);
    if (removedIndex === -1) return;

    // Nuevo arreglo SIN la fila eliminada
    const items = filasActuales.filter((x) => x !== item);

    // Reenumerar numlinea
    items.forEach((d, i) => (d.numlinea = i + 1));
    this.rowData.set(items);

    const removedWasLast = removedIndex === filasActuales.length - 1;

    // ✅ Reglas:
    // - Totales se recalculan solos por los computed.
    // - SOLO recalculamos la línea de saldo si:
    //      * quedan al menos 2 filas, Y
    //      * la fila eliminada NO era la última.
    if (items.length >= 2 && !removedWasLast) {
      this.recalcularHaberDesdeDebe(false);
    }
  }

  isReadOnly(): boolean {
    return this.saving() || this.loading();
  }

  private mostrarMensaje(data: MessageBoxData) {
    const config: MatDialogConfig<MessageBoxData> = {
      width: '400px',
      data: {
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        ...data,
      },
    };
    return this.dialog.open<unknown, MessageBoxData, boolean>(
      CustomMessageBoxComponent as ComponentType<unknown>,
      config
    );
  }

  private mostrarValidacion(campos: string[]): void {
    const message =
      'Faltan campos obligatorios:\n' +
      campos.map((c) => `• ${c}`).join('\n');

    this.mostrarMensaje({
      title: 'Formulario incompleto',
      message,
      type: 'warning',
      showCancel: false,
      confirmText: 'Aceptar',
    });
  }

  private abrirDialogoTributario(
    row: DetalleAsientoResponse,
    rowNode: any
  ): void {
    // obtener etiqueta completa del tipo movimiento
    const movLabel =
      this.movimientosBancarios.find(
        (m) => m.id === Number(row.idMovBancario || 0)
      )?.label || row.movbancario || '';

    const data: AsientoTributarioData & { movLabel?: string } = {
      idSustentoTrib: Number(row.idSustentoTrib || 0),
      idTipoCompSri: Number(row.idTipoCompSri || 0),
      autorizacion: row.autorizacion || '',
      fechacaduca: row.fechacaduca || null,
      idTipoRetencion: Number(row.idTipoRetencion || 0),
      idCentroCostos: Number(row.idCentroCostos || 0),
      idProyecto: Number(row.idProyecto || 0),
      idSubproyecto: Number(row.idSubproyecto || 0),
      movLabel,
    };

    const dialogRef = this.dialog.open(AsientoTributarioDialogComponent, {
      width: '820px',
      data: data as any,
    });

    dialogRef.afterClosed().subscribe((result?: AsientoTributarioData & { movLabel?: string }) => {
      if (!result) {
        return;
      }

      row.idSustentoTrib = result.idSustentoTrib;
      row.idTipoCompSri = result.idTipoCompSri;
      row.autorizacion = result.autorizacion;
      row.fechacaduca = (result as any).fechacaduca ?? '';
      row.idTipoRetencion = result.idTipoRetencion;
      row.idCentroCostos = result.idCentroCostos;
      row.idProyecto = result.idProyecto;
      row.idSubproyecto = result.idSubproyecto;

      this.rowData.set([...this.rowData()]);
      this.gridApi.refreshCells({
        rowNodes: [rowNode],
        force: true,
        columns: [
          'idSustentoTrib',
          'idTipoCompSri',
          'autorizacion',
          'fechacaduca',
          'idTipoRetencion',
          'idCentroCostos',
          'idProyecto',
          'idSubproyecto',
        ],
      });
    });
  }

////VALIDAR SOLO NUMEROS
  onNumericInput(ctrl: FormControl<any>, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;

    const original = input.value;
    const soloDigitos = original.replace(/\D/g, ''); // elimina todo lo que no sea número

    if (original !== soloDigitos) {
      input.value = soloDigitos;
    }

    ctrl.setValue(soloDigitos, { emitEvent: false });
  }
////END
////normalizar play
/** 
 * Normaliza el objeto AsientoContableResponse para que:
 * - Fechas vacías se envíen como null
 * - IDs opcionales (FK) en 0 se envíen como null
 */
private normalizarParaBackend(header: AsientoContableResponse): any {
  const h: any = { ...header };

  // CABECERA
  h.fechacierre = h.fechacierre ? normalizeToLocalDate(h.fechacierre) : null;

  // DETALLES
  h.detalles = (header.detalles ?? []).map((d) => {
    const det: any = { ...d };

    // ===== FECHAS OPCIONALES EN DETALLE ===== cambiar aqui a normalizeToLocalDate solo fecha sin hora
    /*
    det.fechacierre = det.fechacierre ? normalizeToLocalIso(det.fechacierre) : null;
    det.fechaconciliado = det.fechaconciliado ? normalizeToLocalIso(det.fechaconciliado) : null;
    det.fechatransferido = det.fechatransferido ? normalizeToLocalIso(det.fechatransferido) : null;
    det.fechaCadRelacionado = det.fechaCadRelacionado ? normalizeToLocalIso(det.fechaCadRelacionado) : null;
    */
    det.fechatransaccion = det.fechatransaccion ? normalizeToLocalDate(det.fechatransaccion) : null;
    det.fechacierre = det.fechacierre ? normalizeToLocalDate(det.fechacierre) : null;
    det.fechaconciliado = det.fechaconciliado ? normalizeToLocalDate(det.fechaconciliado) : null;
    det.fechatransferido = det.fechatransferido ? normalizeToLocalDate(det.fechatransferido) : null;
    det.fechaCadRelacionado = det.fechaCadRelacionado ? normalizeToLocalDate(det.fechaCadRelacionado) : null;


    // estas dos fechas SÍ las envías siempre si las tienes
    det.fechacaduca = det.fechacaduca ? normalizeToLocalDate(det.fechacaduca) : det.fechacaduca;
    det.fechavencimiento = det.fechavencimiento ? normalizeToLocalDate(det.fechavencimiento) : det.fechavencimiento;

    // ===== IDS OPCIONALES (FK) — 0 => null =====
    det.idCentroCostos = det.idCentroCostos && det.idCentroCostos > 0 ? det.idCentroCostos : null;
    det.idProyecto     = det.idProyecto     && det.idProyecto     > 0 ? det.idProyecto     : null;
    det.idSubproyecto  = det.idSubproyecto  && det.idSubproyecto  > 0 ? det.idSubproyecto  : null;
    det.idConciliacion = det.idConciliacion && det.idConciliacion > 0 ? det.idConciliacion : null;

    // Tipo de retención: si no se selecciona ninguno debe ir null
    det.idTipoRetencion = det.idTipoRetencion && det.idTipoRetencion > 0
      ? det.idTipoRetencion
      : null;

    // IMPORTANTE: NO tocar campos que realmente pueden ser 0:
    // - cheque (0)
    // - IdDetMaestro, IdCabMaestro, etc.
    // - transferido (true/false)
    // - idMovBancario (ya validas que sea > 0)

    return det;
  });

  return h;
}

///bloquear cabecera
  private bloquearCabecera(): void {
    if (this.cabeceraBloqueada) { 
      return; 
    }

    // Solo marcamos el flag. NO deshabilitamos controles.
    this.cabeceraBloqueada = true;
  }

  private recalcularHaberDesdeDebe(forzar: boolean = false): void {
    const filas = this.rowData() ?? [];

    // Si no hay al menos 2 filas, no hay saldo que calcular
    if (filas.length < 2) {
      if (forzar && filas.length === 1) {
        // Opcional: limpiar haber de la única fila
        filas[0].haber = 0;
        filas[0].debe = filas[0].debe || 0;
        this.rowData.set([...filas]);
        this.gridApi?.refreshCells({
          force: true,
          columns: ['debe', 'haber'],
        });
      }
      return;
    }

    const lastIndex = filas.length - 1;
    const filaSaldo = filas[lastIndex];

    // Total Debe de todas las filas
    const totalDebe = filas.reduce(
      (acc, f) => acc + (Number(f.debe) || 0),
      0
    );

    // ¿Existe ALGÚN valor en HABER en cualquier fila?
    const tieneHaber = filas.some(f => Number(f.haber) > 0);

    // ✅ Si no hay ningún HABER todavía y no estamos forzando (agregar línea),
    //    NO armamos línea de saldo. Solo se actualizan totales.
    if (!tieneHaber && !forzar) {
      return;
    }

    // Total Haber de todas las filas EXCEPTO la última (saldo)
    const totalHaberSinSaldo = filas.reduce((acc, f, idx) => {
      if (idx === lastIndex) return acc;
      return acc + (Number(f.haber) || 0);
    }, 0);

    // Saldo que debe ir en la última fila (HABER)
    let saldo = totalDebe - totalHaberSinSaldo;
    saldo = Number(saldo.toFixed(2));

    if (saldo < 0) {
      saldo = 0;
    }

    // La fila de saldo solo lleva HABER, no DEBE
    filaSaldo.debe = 0;
    filaSaldo.haber = saldo;

    this.rowData.set([...filas]);
    this.gridApi?.refreshCells({
      force: true,
      columns: ['debe', 'haber'],
    });
  }


///
private validarCabecera(): boolean {
    const errores: string[] = [];

    const idZona  = Number(this.form.get('idZona')?.value || 0);
    const idAux   = Number(this.auxiliarSeleccionadoCtrl.value || 0);
    const nroComp = (this.nroComprobanteCtrl.value || '').toString().trim();
    const idSust  = Number(this.sustentoTribCtrl.value || 0);
    const idTipoC = Number(this.tipoCompSriCtrl.value || 0);
    const aut     = (this.autorizacionCtrl.value || '').toString().trim();
    const fCad    = (this.fechacaducaCtrl.value || '').toString().trim();
    const fVen    = (this.fechavencimientoCtrl.value || '').toString().trim();
    const concepto = (this.form.get('observacion')?.value || '').toString().trim();

    if (idZona <= 0) {
      errores.push('Debe seleccionar la Zona.');
    }

    if (idAux <= 0) {
      errores.push('Debe seleccionar el Proveedor.');
    }

    if (!nroComp) {
      errores.push('Debe ingresar el No. Comprobante.');
    }

    if (idSust <= 0) {
      errores.push('Debe seleccionar el Sustento Tributario.');
    }

    if (idTipoC <= 0) {
      errores.push('Debe seleccionar el Tipo de Comprobante SRI.');
    }

    if (!aut) {
      errores.push('Debe ingresar la Autorización.');
    }

    if (!fCad) {
      errores.push('Debe ingresar la Fecha Caduca.');
    }

    if (!fVen) {
      errores.push('Debe ingresar la Fecha Vencimiento.');
    }

    if (!concepto) {
      errores.push('Debe ingresar el Concepto.');
    }

    if (errores.length > 0) {
      this.snack.open(errores[0], 'Cerrar', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return false;
    }

    return true;
  }
///retsear el componente para imngresar nueva factura
private resetParaNuevo(): void {
  this.cabeceraBloqueada = false;
  this.modo.set('nuevo');
  //numero documento generado
  this.numdocGenerado = null;
  this.loading.set(false);
  this.saving.set(false);

  const nowIso = formatLocalIso(new Date());
  const anio = getYearFromInput(nowIso);

  const ahora = new Date();
  const todayDate = formatLocalDateOnly(ahora); // solo fecha

  // Reset del form principal
  this.form.reset({
    IdCabMaestro: 0,
    idZona: 0,
    idUsuario: this.usuarioActual?.id_usuario ?? null,
    idEmpresa: this.usuarioActual?.id_empresa ?? null,
    idTipoAsiento: this.form.get('idTipoAsiento')?.value ?? null, // mantiene AD por defecto si ya lo cargaste
    tipdoc: this.form.get('tipdoc')?.value ?? '',
    numdoc: 0,
    anio: anio,
    fechatransaccion: todayDate, //nowIso,
    fechaingreso: nowIso,
    observacion: '',
    totdebe: 0,
    tothaber: 0,
    beneficiario: '',
    cierre: '',
    fechacierre: null,
    solicitado: '',
    depto: '',
    autorizado: '',
    homCodigo: 0,
    estado: true,
    modulo: 1, 
  });

  // Reset de controles auxiliares de cabecera
  this.proveedorCtrl.reset(null);
  this.auxiliarSeleccionadoCtrl.reset(null);
  this.nroComprobanteCtrl.reset('');
  this.sustentoTribCtrl.reset(null);
  this.tipoCompSriCtrl.reset(null);
  this.autorizacionCtrl.reset('');
  this.fechacaducaCtrl.reset(null);
  this.fechavencimientoCtrl.reset(null);

  this.auxiliarSeleccionadoCtrl.markAsPristine();
  this.auxiliarSeleccionadoCtrl.markAsUntouched();
  this.nroComprobanteCtrl.markAsPristine();
  this.nroComprobanteCtrl.markAsUntouched();
  this.sustentoTribCtrl.markAsPristine();
  this.sustentoTribCtrl.markAsUntouched();
  this.tipoCompSriCtrl.markAsPristine();
  this.tipoCompSriCtrl.markAsUntouched();
  this.autorizacionCtrl.markAsPristine();
  this.autorizacionCtrl.markAsUntouched();
  this.fechacaducaCtrl.markAsPristine();
  this.fechacaducaCtrl.markAsUntouched();
  this.fechavencimientoCtrl.markAsPristine();
  this.fechavencimientoCtrl.markAsUntouched();

  // Reset del detalle basta con esta instruccion para setear
  this.rowData.set([]);
  //this.gridApi?.setRowData([]);
  //Si por alguna razón quisieras forzar el cambio desde la API, en versiones nuevas de AG Grid se usa:
  //this.gridApi?.setGridOption('rowData', []);
  // Sincronizar usuario/empresa y año de nuevo
  this.syncUsuarioEmpresa();
}

imprimirAsiento(): void {
    const id = Number(
      this.form.get('IdCabMaestro')?.value ||
      this.route.snapshot.paramMap.get('id') ||
      0
    );

    if (!id || id <= 0) {
      this.snack.open(
        'Debe guardar el asiento antes de poder imprimirlo.',
        'Cerrar',
        {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        }
      );
      return;
    }

    this.loading.set(true);

    this.asientosService.getAsientoImpresion(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (asiento: AsientoImpresion) => {
          if (!asiento) {
            this.snack.open(
              'No se encontraron datos para la impresión del asiento.',
              'Cerrar',
              {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              }
            );
            return;
          }
          //this.generarPdfAsiento(asiento); ahora entra directo con el utilitario
          generarPdfAsiento(asiento, this.nombreusuario);
        },
        error: (err) => {
          console.error('Error al obtener asiento para impresión:', err);
          this.snack.open(
            'Ocurrió un error al preparar la impresión del asiento.',
            'Cerrar',
            {
              duration: 4000,
              horizontalPosition: 'right',
              verticalPosition: 'top',
            }
          );
        }
      });
  }

 
/// FINAL
}

/** Helpers de celdas Y OTRAS FUNCIONES A UTILIZAR */
function numberParser(params: any): number {
  const v = (params.newValue ?? '').toString().replace(',', '.').trim();
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function boolParser(params: any): boolean {
  const v = (params.newValue ?? '').toString().toLowerCase().trim();
  return v === 'true' || v === '1' || v === 'sí' || v === 'si';
}

function isoParser(params: any): string {
  const v = (params.newValue ?? '').toString().trim();
  if (!v) return '';
  return normalizeToLocalIso(v);
}

function blockComma(params: any): boolean {
  return params.event?.key === ',';
}

const decimalDot2Regex = /^\d*(\.\d{0,2})?$/;

function valueSetterDot2(params: any): boolean {
  const raw = String(params.newValue ?? '').trim();
  if (raw.includes(',')) return false;
  if (!decimalDot2Regex.test(raw)) return false;
  const n = Number(raw);
  if (Number.isNaN(n)) return false;

  const field = params.colDef.field!;
  if (field === 'debe') {
    params.data.debe = n > 0 ? Number(n.toFixed(2)) : 0;
    if (params.data.debe > 0) params.data.haber = 0;
  } else if (field === 'haber') {
    params.data.haber = n > 0 ? Number(n.toFixed(2)) : 0;
    if (params.data.haber > 0) params.data.debe = 0;
  } else {
    (params.data as any)[field] = n;
  }
  return true;
}

function twoDecimalsDotFormatter(p: any): string {
  const val = Number(p.value ?? 0);
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const toNumber = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const normalized = String(v).replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
};

function debeEditable(params: any) {
  const h = toNumber(params.data?.haber);
  return h <= 0;
}

function haberEditable(params: any) {
  const d = toNumber(params.data?.debe);
  return d <= 0;
}

function getYearFromInput(v: any): string {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? '' : String(d.getFullYear());
}

function getTimeFromInput(v: any): string {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return '';

  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
}

function formatLocalIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

function normalizeToLocalIso(v: any): string {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) {
    return String(v);
  }
  return formatLocalIso(d);
}


function onlyAllowedComentarioKey(params: any): boolean {
  const e = params.event as KeyboardEvent;
  const key = e.key;

  // Teclas de edición / navegación permitidas
  if (
    key === 'Backspace' ||
    key === 'Delete' ||
    key === 'Tab' ||
    key === 'Enter' ||
    key === 'Escape' ||
    key === 'ArrowLeft' ||
    key === 'ArrowRight' ||
    key === 'ArrowUp' ||
    key === 'ArrowDown' ||
    key === 'Home' ||
    key === 'End'
  ) {
    return false; // no suprimir
  }

  // Combos Ctrl/Cmd (copiar, pegar, etc.) permitidos
  if (e.ctrlKey || e.metaKey) {
    return false;
  }

  // SOLO permitimos: letras (con tildes y ñ), números, espacio, punto, coma, punto y coma y guion
  const allowedCharRegex = /^[0-9a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.,;-]$/;

  if (allowedCharRegex.test(key)) {
    return false; // carácter permitido
  }

  // Cualquier otro carácter (comillas, apóstrofes, símbolos raros, etc.) se BLOQUEA
  e.preventDefault();   // evita que se escriba en el textarea
  return true;          // indica al grid que suprima el evento
}

function sanitizeTextoGenerico(value: any): string {
  const raw = (value ?? '').toString();
  // permite letras (con tildes y ñ), números, espacio, punto, coma, punto y coma y guion
  return raw.replace(/[^0-9a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.,;-]/g, '');
}

function formatLocalDateOnly(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  // 👀 solo fecha
  return `${yyyy}-${mm}-${dd}`;
}


function normalizeToLocalDate(v: any): string {
  if (!v) return '';

  // Si ya viene como 'yyyy-MM-dd', la dejamos tal cual
  if (typeof v === 'string') {
    const s = v.trim();

    // caso: '2025-12-01'
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return s;
    }

    // caso: '2025-12-01T23:59:59' -> tomamos solo la parte de fecha
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
      return s.substring(0, 10);
    }
  }

  // Si es Date (o algo que Date pueda parsear) usamos la función de fecha sola
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) {
    return String(v);
  }
  return formatLocalDateOnly(d);
}

