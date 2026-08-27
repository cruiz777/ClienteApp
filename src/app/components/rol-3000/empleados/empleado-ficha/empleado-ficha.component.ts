import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormControl
} from '@angular/forms';

import { forkJoin } from 'rxjs';
import { TipoDocumentoService } from 'src/app/services/tipo-documento.service';
import { TipoDocumento } from 'src/app/interfaces/catalogs/tipo-documento.interface';
import { EstadoCivilService } from 'src/app/services/estado-civil.service';
import { EstadoCivil } from 'src/app/interfaces/catalogs/estado-civil.interface';
import { GeneroService } from 'src/app/services/genero.service';
import { Genero } from 'src/app/interfaces/catalogs/genero.interface';
import { LocalesResponse } from 'src/app/interfaces/responses/local-response';
import { LocalesService } from 'src/app/services/locales.service';
import { ZonaService, Zona } from 'src/app/services/zona.service';
import { CiudadService, Ciudad } from 'src/app/services/ciudad.service';
import { NacionalidadService, NacionalidadResponse } from 'src/app/services/rol/nacionalidad.service.service';
import { RpRegimenService } from 'src/app/services/rol/regimen.service';
import { RpTipoSangreService } from 'src/app/services/rol/tipo-sangre.service';
import { RpRegimenResponse } from 'src/app/interfaces/responses/regimen-response';
import { RpTipoSangreResponse } from 'src/app/interfaces/responses/tipo-sangre-response';
import { RpNivelInstruccionResponse } from 'src/app/interfaces/responses/nivel-instruccion.response';
import { RpNivelInstruccionService } from 'src/app/services/nivel-instruccion.service';
import { RpTipoDiscapacidadService } from 'src/app/services/rol/rp-tipo-discapacidad.service';
import { ColDef } from 'ag-grid-community';
import { TipoObservacionService, TipoObservacion } from 'src/app/services/rol/tipo-observacion.service';
import { ObservacionEmpleadoResponse, ObservacionesEmpleadoService } from 'src/app/services/rol/observaciones-empleado.service';
import { EmpleadoDiscapacidadService, EmpleadoDiscapacidadResponse } from 'src/app/services/rol/empleado-discapacidad.service';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
import {
  GastosSriEmpleadoService,
  GastoSriEmpleadoResponse
} from 'src/app/services/rol/gastos-sri-empleado.service';

import { RpEmpresaComplementariaService, RpEmpresaComplementaria } from 'src/app/services/rol/rp-empresa-complementaria.service';
import {
  debounceTime,
  distinctUntilChanged
} from 'rxjs';
import { TipoGastoService } from 'src/app/services/tipo-gasto.service';
import {
  EmpleadoSyncService,
  SyncEmpleadoRequest
} from 'src/app/services/rol/empleado-sync.service';
import {
  RpMaeEmpFormacionService,
  RpMaeEmpFormacionResponse
} from 'src/app/services/rol/rp-mae-emp-formacion.service';


import {
  RpMaeEmpHistorialBancoService,
  RpMaeEmpHistorialBancoResponse
} from 'src/app/services/rol/rp-mae-emp-historial-banco.service.service';
import {
  RpTipoContratoService,
  RpTipoContrato
} from 'src/app/services/rol/rp-tipo-contrato.service.service';

import {
  RpMaeEmpCronologiaService,
  RpMaeEmpCronologiaResponse
} from 'src/app/services/rol/rp-mae-emp-cronologia.service.service';
import {
  EmpleadoFichaService,
  EmpleadoFichaResponse, EmpleadoBusquedaResponse
} from 'src/app/services/rol/empleado-ficha.service';

import {
  RpCargoResponse,
  RpCargosService
} from 'src/app/services/rol/rp-cargos.service.service';

import {
  RpTipEmpResponse,
  RpTipEmpService
} from 'src/app/services/rol/rp-tip-emp.service';

import { DepartamentoResponse } from 'src/app/interfaces/responses/departamentos-response';
import { DepartamentosService } from 'src/app/services/departamentos.service';
import { RpGrupoOcupacionalService, RpGrupoOcupacional } from 'src/app/services/rol/rp-grupo-ocupacional.service.service';
import { RpBancosService } from 'src/app/services/rol/bancos-rol.service';
import { RpFormaPagoService } from 'src/app/services/rol/forma-pago-rol.service';
import { TipoCuentaBancoService } from 'src/app/services/rol/tipo-cuenta.service';
import { RpBanTerceroService } from 'src/app/services/rol/bancos-terceros-rol.service';
import { CargasEmpleadoService, CargaEmpleadoResponse } from 'src/app/services/rol/cargas-empleado.service';
import { SectorialService } from 'src/app/services/sectorial.service';

function formatFechaGrid(value: any): string {
  if (!value) return '';

  const texto = value.toString().substring(0, 10);

  if (texto.includes('-')) {
    const [year, month, day] = texto.split('-');
    return `${day}/${month}/${year}`;
  }

  return texto;
}

function parseFechaGrid(value: any): string | null {
  if (!value) return null;

  const texto = value.toString().trim();

  if (texto.includes('/')) {
    const [day, month, year] = texto.split('/');
    return `${year}-${month}-${day}`;
  }

  return texto;
}
function esFechaValidaDDMMYYYY(value: string): boolean {
  const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;

  if (!regex.test(value)) return false;

  const [day, month, year] = value.split('/').map(Number);
  const fecha = new Date(year, month - 1, day);

  return (
    fecha.getFullYear() === year &&
    fecha.getMonth() === month - 1 &&
    fecha.getDate() === day
  );
}

function convertirDDMMYYYYaISO(value: string): string {
  const [day, month, year] = value.split('/');
  return `${year}-${month}-${day}`;
}
@Component({
  selector: 'app-empleado-ficha',
  templateUrl: './empleado-ficha.component.html',
  styleUrls: ['./empleado-ficha.component.css']
})

export class EmpleadoFichaComponent implements OnInit {

  form!: FormGroup;

  cargos: RpCargoResponse[] = [];
  departamentos: DepartamentoResponse[] = [];
  tiposEmpleado: RpTipEmpResponse[] = [];
  tiposDocumento: TipoDocumento[] = [];
  estadosCivil: EstadoCivil[] = [];
  generos: Genero[] = [];
  locales: LocalesResponse[] = [];
  zonas: Zona[] = [];
  ciudades: Ciudad[] = [];
  
ciudadCtrl = new FormControl<Ciudad | string | null>('');
ciudadTrabajoCtrl = new FormControl<Ciudad | string | null>('');

ciudadesFiltradas: Ciudad[] = [];
ciudadesTrabajoFiltradas: Ciudad[] = [];
  nacionalidades: NacionalidadResponse[] = [];
  gruposOcupacionales: RpGrupoOcupacional[] = [];
  regimenes: RpRegimenResponse[] = [];
  tiposSangre: RpTipoSangreResponse[] = [];
  tiposContrato: RpTipoContrato[] = [];
  cronologiaRowData: RpMaeEmpCronologiaResponse[] = [];
  idEmpleadoActual: number | null = null;

  tiposGasto: any[] = [];
  empresaComplementaria: RpEmpresaComplementaria[] = [];
  gastosRowData: (GastoSriEmpleadoResponse & { modificado?: boolean })[] = [];
  gastosEliminados: number[] = [];
  empleadosBusqueda: any[] = [];
  empleadosFiltrados: any[] = [];
  esNuevoEmpleado = false;
  nivelesInstruccion: RpNivelInstruccionResponse[] = [];
  cronologiaEliminados: number[] = [];
  bancos: any[] = [];
  formasPago: any[] = [];
  bancosTerceros: any[] = [];
  tiposCuentaBanco: any[] = [];
  bancoRowData: (RpMaeEmpHistorialBancoResponse & { modificado?: boolean })[] = [];
  bancoEliminados: number[] = [];
  sectoriales: any[] = [];
  cargasRowData: any[] = [];
  cargasEliminadas: number[] = [];
  tiposDiscapacidad: any[] = [];
  academicosRowData: (RpMaeEmpFormacionResponse & { modificado?: boolean })[] = [];
  academicosEliminados: number[] = [];
  idPersonaActual: number | null = null;
  cronologiaColumnDefs: ColDef[] = [
    {
      headerName: 'Fecha Ingreso',
      field: 'fecIngreso',
      editable: true,
      width: 120,
      minWidth: 120,
      cellEditor: 'agDateStringCellEditor',
      valueFormatter: (params) => formatFechaGrid(params.value),
      onCellValueChanged: (params) => {
        params.data.modificado = true;
      }
    },
    {
      headerName: 'Fecha Salida',
      field: 'fecSalida',
      editable: true,
      width: 120,
      minWidth: 120,
      cellEditor: 'agDateStringCellEditor',
      valueFormatter: (params) => formatFechaGrid(params.value),
      onCellValueChanged: (params) => {
        params.data.modificado = true;
      }
    },
    {
      headerName: 'Terminación Contrato',
      field: 'fecTercont',
      editable: true,
      width: 150,
      minWidth: 150,
      cellEditor: 'agDateStringCellEditor',
      valueFormatter: (params) => formatFechaGrid(params.value),
      onCellValueChanged: (params) => {
        params.data.modificado = true;
      }
    },
    {
      headerName: 'Tipo de Contrato',
      field: 'idTipoContrato',
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: () => ({
        values: this.tiposContrato.map(x => x.idTipoContrato)
      }),
      valueFormatter: (params) => {
        const tipo = this.tiposContrato.find(
          x => x.idTipoContrato === Number(params.value)
        );

        return tipo?.descripcion ?? '';
      },
      valueParser: (params) => Number(params.newValue),
      onCellValueChanged: (params) => {
        const idTipoContrato = Number(params.newValue);

        const tipo = this.tiposContrato.find(
          x => x.idTipoContrato === idTipoContrato
        );

        params.data.horasContrato = tipo?.valor ?? null;
        params.data.modificado = true;

        if (params.node) {
          params.api.refreshCells({
            rowNodes: [params.node],
            columns: ['horasContrato'],
            force: true
          });
        }
      }
    },
    {
      headerName: 'N° Horas',
      field: 'horasContrato',
      editable: true,
      type: 'numericColumn',
      valueParser: (params) => {
        const value = Number(params.newValue);
        return isNaN(value) ? null : value;
      }
    },
    {
      headerName: '',
      width: 34,
      minWidth: 34,
      maxWidth: 34,
      pinned: 'right',
      suppressSizeToFit: true,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0'
      },
      cellRenderer: () => {
        return ` <button class="btn-grid-delete" title="Eliminar">
    <span class="material-icons">delete</span>
  </button>`;
      },
      onCellClicked: (params) => {
        this.eliminarFilaCronologia(params.data);
      }
    }
  ];

  cronologiaDefaultColDef: ColDef = {
    flex: 1,
    minWidth: 120,
    resizable: true,
    sortable: false,
    filter: false
  };

  referenciaRowData = [
    {
      contactoReferencia: '',
      telefonoReferencia: ''
    }
  ];

  referenciaColumnDefs: ColDef[] = [
    {
      headerName: 'Contacto de Referencia',
      field: 'contactoReferencia',
      editable: true,
      flex: 1
    },
    {
      headerName: 'Teléfono de Referencia',
      field: 'telefonoReferencia',
      editable: true,
      flex: 1
    }
  ];

  referenciaDefaultColDef: ColDef = {
    resizable: true,
    sortable: false,
    filter: false
  };



  bancoColumnDefs: ColDef[] = [
    {
      headerName: 'Banco',
      field: 'codban',
      editable: true,
      width: 160,
      hide:true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: () => ({
        values: this.bancos.map(x => x.codban)
      }),
      valueFormatter: (params) => {
        const item = this.bancos.find(x => Number(x.codban) === Number(params.value));
        return item?.desban ?? '';
      },
      valueParser: (params) => Number(params.newValue),
      onCellValueChanged: (params) => {
        params.data.modificado = true;
      }
    },
    {
      headerName: 'Cta Contable Emp.',
      field: 'codcuenta',
      editable: true,
      width: 160,
      onCellValueChanged: (params) => {
        params.data.modificado = true;
      }
    },
    {
      headerName: 'Forma de Pago',
      field: 'idFormaPago',
      editable: true,
      width: 170,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: () => ({
        values: this.formasPago.map(x => x.idFormaPago)
      }),
      valueFormatter: (params) => {
        const item = this.formasPago.find(x => x.idFormaPago === Number(params.value));
        return item?.descripcion ?? params.data?.formaPago ?? '';
      },
      valueParser: (params) => Number(params.newValue),
      onCellValueChanged: (params) => {
        params.data.modificado = true;
      }
    },
    {
      headerName: 'Tipo de Cuenta',
      field: 'idCuentaBanco',
      editable: true,
      width: 170,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: () => ({
        values: this.tiposCuentaBanco.map(x => Number(x.idCuentaBanco))
      }),
      valueFormatter: (params) => {
        const item = this.tiposCuentaBanco.find(x =>
          Number(x.idCuentaBanco) === Number(params.value)
        );

        return item?.descripcion ?? params.data?.tipoCuentaBanco ?? '';
      },
      valueParser: (params) => Number(params.newValue),
      onCellValueChanged: (params) => {
        const item = this.tiposCuentaBanco.find(x =>
          Number(x.idCuentaBanco) === Number(params.data.idCuentaBanco)
        );

        params.data.tipoCuentaBanco = item?.descripcion ?? null;
        params.data.modificado = true;
      }
    },
    {
      headerName: 'Banco Tercero',
      field: 'codBanTercero',
      editable: true,
      width: 160,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: () => ({
        values: this.bancosTerceros.map(x => x.codBanTercero)
      }),
      valueFormatter: (params) => {
        const item = this.bancosTerceros.find(x => Number(x.codBanTercero) === Number(params.value));
        return item?.descripcion ?? '';
      },
      valueParser: (params) => Number(params.newValue),
      onCellValueChanged: (params) => {
        params.data.modificado = true;
      }
    },
    {
      headerName: 'N° Cuenta',
      field: 'ctacte',
      editable: true,
      width: 160,
      onCellValueChanged: (params) => {
        params.data.modificado = true;
      }
    },
    {
      headerName: 'Fecha Desde',
      field: 'fechaDesde',
      editable: true,
      width: 130,
      cellEditor: 'agDateStringCellEditor',
      valueFormatter: (params) => formatFechaGrid(params.value),
      onCellValueChanged: (params) => {
        params.data.modificado = true;
      }
    },
    {
      headerName: 'Fecha Hasta',
      field: 'fechaHasta',
      editable: true,
      width: 130,
      cellEditor: 'agDateStringCellEditor',
      valueFormatter: (params) => formatFechaGrid(params.value),
      onCellValueChanged: (params) => {
        params.data.modificado = true;
      }
    },
    {
      headerName: '',
      width: 34,
      minWidth: 34,
      maxWidth: 34,
      pinned: 'right',
      suppressSizeToFit: true,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0'
      },
      cellRenderer: () => ` <button class="btn-grid-delete" title="Eliminar">
    <span class="material-icons">delete</span>
  </button>`,
      onCellClicked: (params) => {
        this.eliminarFilaBanco(params.data);
      }
    }
  ];

  bancoDefaultColDef: ColDef = {
    flex: 1,
    minWidth: 180,
    resizable: true,
    sortable: false,
    filter: false
  };


  cargasColumnDefs: ColDef[] = [
    {
      headerName: 'Código',
      field: 'idCarga',
      width: 100,
      editable: false
    },
    {
      headerName: 'Nombres',
      field: 'nombre',
      editable: true,
      minWidth: 160,
      onCellValueChanged: p => p.data.modificado = true
    },
    {
      headerName: 'Apellidos',
      field: 'apellido',
      editable: true,
      minWidth: 160,
      onCellValueChanged: p => p.data.modificado = true
    },
    {
      headerName: 'Cédula',
      field: 'identificacion',
      editable: true,
      width: 130,
      onCellValueChanged: p => p.data.modificado = true
    },
    {
      headerName: 'Dirección',
      field: 'direccion',
      editable: true,
      minWidth: 220,
      onCellValueChanged: p => p.data.modificado = true
    },
    {
      headerName: 'Teléfono',
      field: 'telefono',
      editable: true,
      width: 130,
      onCellValueChanged: p => p.data.modificado = true
    },
    {
      headerName: 'Fecha Nacim.',
      field: 'fechaNacimiento',
      editable: true,
      width: 140,
      cellEditor: 'agDateStringCellEditor',
      valueFormatter: p => formatFechaGrid(p.value),
      onCellValueChanged: p => p.data.modificado = true
    },
    {
      headerName: 'Sexo',
      field: 'idGenero',
      editable: true,
      width: 130,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: () => ({
        values: this.generos.map(g => Number(g.generoCodigo))
      }),
      valueFormatter: p => {
        const item = this.generos.find(g => Number(g.generoCodigo) === Number(p.value));
        return item?.generoDescripcion ?? p.data?.genero ?? '';
      },
      valueParser: p => Number(p.newValue),
      onCellValueChanged: p => {
        const item = this.generos.find(g => Number(g.generoCodigo) === Number(p.data.idGenero));
        p.data.genero = item?.generoDescripcion ?? null;
        p.data.modificado = true;
      }
    },
    {
      headerName: 'Parentesco',
      field: 'parentesco',
      editable: true,
      width: 130,
      onCellValueChanged: p => p.data.modificado = true
    },
    {
      headerName: 'Discapacidad',
      field: 'idTipoDiscapacidad',
      editable: true,
      width: 170,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: () => ({
        values: this.tiposDiscapacidad.map(x => Number(x.idTipoDiscapacidad))
      }),
      valueFormatter: p => {
        const item = this.tiposDiscapacidad.find(x => Number(x.idTipoDiscapacidad) === Number(p.value));
        return item?.descripcion ?? p.data?.tipoDiscapacidad ?? '';
      },
      valueParser: p => Number(p.newValue),
      onCellValueChanged: p => {
        const item = this.tiposDiscapacidad.find(x => Number(x.idTipoDiscapacidad) === Number(p.data.idTipoDiscapacidad));
        p.data.tipoDiscapacidad = item?.descripcion ?? null;
        p.data.modificado = true;
      }
    },
    {
      headerName: 'Utilidad',
      field: 'utilidad',
      width: 110,
      editable: false,
      cellRenderer: (params: any) => {
        const checked = params.data?.utilidad === true;

        return `
      <div class="custom-check ${checked ? 'checked' : ''}">
        ${checked ? '✓' : ''}
      </div>
    `;
      },
      onCellClicked: (params) => {
        params.data.utilidad = params.data.utilidad !== true;
        params.data.modificado = true;
        params.api.refreshCells({ rowNodes: [params.node], force: true });
      }
    },
    {
      headerName: 'Imp. Rent.',
      field: 'imprenta',
      width: 120,
      editable: false,
      cellRenderer: (params: any) => {
        const checked = params.data?.imprenta === true;

        return `
      <div class="custom-check ${checked ? 'checked' : ''}">
        ${checked ? '✓' : ''}
      </div>
    `;
      },
      onCellClicked: (params) => {
        params.data.imprenta = params.data.imprenta !== true;
        params.data.modificado = true;
        params.api.refreshCells({ rowNodes: [params.node], force: true });
      }
    },
    {
      headerName: '',
      width: 34,
      minWidth: 34,
      maxWidth: 34,
      pinned: 'right',
      suppressSizeToFit: true,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0'
      },
      cellRenderer: () => ` <button class="btn-grid-delete" title="Eliminar">
    <span class="material-icons">delete</span>
  </button>`,
      onCellClicked: p => this.eliminarFilaCarga(p.data)
    }
  ];
  cargasDefaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: false
  };

  gastosColumnDefs: ColDef[] = [
    {
      headerName: 'Código',
      field: 'idGasSri',
      width: 100,
      editable: false
    },
    {
      headerName: 'Tipo de Gasto',
      field: 'idTipoGasto',
      editable: true,
      minWidth: 220,

      cellEditor: 'agSelectCellEditor',
      cellEditorParams: () => ({
        values: this.tiposGasto.map(x => Number(x.idTipoGasto))
      }),
      valueFormatter: (p: any) => {
        const item = this.tiposGasto.find(x =>
          Number(x.idTipoGasto) === Number(p.value)
        );

        return item?.descripcion ?? p.data?.tipoGasto ?? '';
      },
      valueParser: (p: any) => Number(p.newValue),
      onCellValueChanged: (p: any) => {
        const item = this.tiposGasto.find(x =>
          Number(x.idTipoGasto) === Number(p.data.idTipoGasto)
        );

        p.data.tipoGasto = item?.descripcion ?? null;
        p.data.montoMaximo = item?.monto ?? null;
        p.data.modificado = true;

        if (p.node) {
          p.api.refreshCells({
            rowNodes: [p.node],
            columns: ['montoMaximo'],
            force: true
          });
        }
      }
    },
    {
      headerName: 'Monto Máximo',
      field: 'montoMaximo',
      width: 160,
      editable: false
    },
    {
      headerName: 'Valor Proyectado',
      field: 'montoProyectado',
      width: 170,
      type: 'numericColumn',
      editable: true,
      valueParser: (p: any) => {
        const value = Number(p.newValue);
        return isNaN(value) ? null : value;
      },
      onCellValueChanged: (p: any) => {
        p.data.modificado = true;
      }
    },
    {
      headerName: 'Valor Real',
      field: 'montoReal',
      width: 120,
      type: 'numericColumn',
      editable: true,
      valueParser: (p: any) => {
        const value = Number(p.newValue);
        return isNaN(value) ? null : value;
      },
      onCellValueChanged: (p: any) => {
        p.data.modificado = true;
      }
    },
    {
      headerName: '',
      width: 50,
      minWidth: 50,
      maxWidth: 50,
      pinned: 'right',
      suppressSizeToFit: true,
      cellRenderer: () => `
      <button class="btn-grid-delete" title="Eliminar">
        <span class="material-icons">delete</span>
      </button>
    `,
      onCellClicked: (p: any) => this.eliminarFilaGasto(p.data)
    }
  ];

  gastosDefaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: false
  };


  observacionColumnDefs: ColDef[] = [
    {
      headerName: 'Fecha',
      field: 'fecha',
      editable: true,
      width: 140,
      cellEditor: 'agDateStringCellEditor',
      valueFormatter: p => formatFechaGrid(p.value),
      onCellValueChanged: p => p.data.modificado = true
    },
    {
      headerName: 'Tipo',
      field: 'idTipoObservacion',
      editable: true,
      width: 180,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: () => ({
        values: this.tiposObservacion.map(x => Number(x.idTipoObservacion))
      }),
      valueFormatter: p => {
        const item = this.tiposObservacion.find(x =>
          Number(x.idTipoObservacion) === Number(p.value)
        );

        return item?.descripcion ?? p.data?.tipoObservacion ?? '';
      },
      valueParser: p => Number(p.newValue),
      onCellValueChanged: p => {
        const item = this.tiposObservacion.find(x =>
          Number(x.idTipoObservacion) === Number(p.data.idTipoObservacion)
        );

        p.data.tipoObservacion = item?.descripcion ?? null;
        p.data.modificado = true;
      }
    },
    {
      headerName: 'Detalle',
      field: 'detalle',
      editable: true,
      flex: 1,
      minWidth: 280,
      wrapText: true,
      autoHeight: true,
      onCellValueChanged: p => p.data.modificado = true
    },
    {
      headerName: 'Unidad Tiempo',
      field: 'unidadTiempo',
      editable: true,
      width: 150,
      onCellValueChanged: p => p.data.modificado = true
    },
    {
      headerName: 'Tiempo',
      field: 'tiempo',
      editable: true,
      width: 100,
      onCellValueChanged: p => p.data.modificado = true
    },
    {
      headerName: 'Incluir Nómina',
      field: 'incluirNomina',
      width: 140,
      editable: false,
      cellRenderer: (params: any) => {
        const checked = params.data?.incluirNomina === true;

        return `
        <div class="custom-check ${checked ? 'checked' : ''}">
          ${checked ? '✓' : ''}
        </div>
      `;
      },
      onCellClicked: p => {
        p.data.incluirNomina = p.data.incluirNomina !== true;
        p.data.modificado = true;
        p.api.refreshCells({ rowNodes: [p.node], force: true });
      }
    },
    {
      headerName: '',
      width: 34,
      minWidth: 34,
      maxWidth: 34,
      pinned: 'right',
      suppressSizeToFit: true,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0'
      },
      cellRenderer: () => `
      <button class="btn-grid-delete" title="Eliminar">
        <span class="material-icons">delete</span>
      </button>
    `,
      onCellClicked: p => this.eliminarFilaObservacion(p.data)
    }
  ];

  observacionDefaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: false
  };

  academicosColumnDefs: ColDef[] = [
    {
      headerName: 'Institución',
      field: 'institucion',
      editable: true,
      minWidth: 180,
      onCellValueChanged: p => p.data.modificado = true
    },
    {
      headerName: 'Título',
      field: 'titulo',
      editable: true,
      minWidth: 180,
      onCellValueChanged: p => p.data.modificado = true
    },
    {
      headerName: 'Nivel Instrucción',
      field: 'idNivelInstruccion',
      editable: true,
      minWidth: 180,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: () => ({
        values: this.nivelesInstruccion.map(x => Number(x.id_nivel_instruccion))
      }),
      valueFormatter: p => {
        const item = this.nivelesInstruccion.find(x =>
          Number(x.id_nivel_instruccion) === Number(p.value)
        );

        return item?.descripcion ?? p.data?.nivelInstruccion ?? '';
      },
      valueParser: p => Number(p.newValue),
      onCellValueChanged: p => {
        const item = this.nivelesInstruccion.find(x =>
          Number(x.id_nivel_instruccion) === Number(p.data.idNivelInstruccion)
        );

        p.data.nivelInstruccion = item?.descripcion ?? null;
        p.data.modificado = true;
      }
    },
    {
      headerName: 'Fecha Desde',
      field: 'fechaDesde',
      editable: true,
      width: 140,
      cellEditor: 'agDateStringCellEditor',
      valueFormatter: p => formatFechaGrid(p.value),
      onCellValueChanged: p => p.data.modificado = true
    },
    {
      headerName: 'Fecha Hasta',
      field: 'fechaHasta',
      editable: true,
      width: 140,
      cellEditor: 'agDateStringCellEditor',
      valueFormatter: p => formatFechaGrid(p.value),
      onCellValueChanged: p => p.data.modificado = true
    },
    {
      headerName: 'Observación',
      field: 'observacion',
      editable: true,
      minWidth: 220,
      flex: 1,
      onCellValueChanged: p => p.data.modificado = true
    },
    {
      headerName: '',
      width: 34,
      minWidth: 34,
      maxWidth: 34,
      pinned: 'right',
      suppressSizeToFit: true,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0'
      },
      cellRenderer: () => ` <button class="btn-grid-delete" title="Eliminar">
    <span class="material-icons">delete</span>
  </button>`,
      onCellClicked: p => this.eliminarFilaAcademica(p.data)
    }
  ];

  academicosDefaultColDef: ColDef = {
    resizable: true,
    sortable: false,
    filter: false
  };
  cargasColumns: string[] = [
    'codigo',
    'nombres',
    'apellidos',
    'cedula',
    'direccion',
    'telefono',
    'fechaNacimiento',
    'sexo',
    'parentesco',
    'discapacidad',
    'utilidad',
    'impRenta'
  ];

  gastosColumns: string[] = [
    'codigo',
    'tipoGasto',
    'montoMaximo',
    'valorProyectado',
    'valorReal'
  ];

  observacionColumns: string[] = [
    'fecha',
    'usuario',
    'tipo',
    'observacion'
  ];
  tiposObservacion: TipoObservacion[] = [];
  observacionRowData: (ObservacionEmpleadoResponse & { modificado?: boolean })[] = [];
  observacionEliminados: number[] = [];
  cargasData: any[] = [];
  gastosData: any[] = [];
  observacionData: any[] = [];


  constructor(
    private fb: FormBuilder,
    private empleadoFichaService: EmpleadoFichaService,
    private rpCargosService: RpCargosService,
    private rpTipoEmpleadoService: RpTipEmpService,
    private rpDepartamentosService: DepartamentosService,
    private tipoDocumentoService: TipoDocumentoService,
    private estadoCivilService: EstadoCivilService,
    private generoService: GeneroService,
    private localesService: LocalesService,
    private zonaService: ZonaService,
    private ciudadService: CiudadService,
    private nacionalidadService: NacionalidadService,
    private grupoOcupacionalService: RpGrupoOcupacionalService,
    private nivelInstruccionService: RpNivelInstruccionService,
    private regimenService: RpRegimenService,
    private tipoSangreService: RpTipoSangreService,
    private tipoContratoService: RpTipoContratoService,
    private cronologiaService: RpMaeEmpCronologiaService,
    private historialBancoService: RpMaeEmpHistorialBancoService,
    private bancosService: RpBancosService,
    private formaPagoService: RpFormaPagoService,
    private banTerceroService: RpBanTerceroService,
    private tipoCuentaBancoService: TipoCuentaBancoService,
    private sectorialService: SectorialService,
    private cargasEmpleadoService: CargasEmpleadoService,
    private tipoDiscapacidadService: RpTipoDiscapacidadService,
    private formacionService: RpMaeEmpFormacionService,
    private empleadoSyncService: EmpleadoSyncService,
    private observacionesEmpleadoService: ObservacionesEmpleadoService,
    private tipoObservacionService: TipoObservacionService,
    private gastosSriEmpleadoService: GastosSriEmpleadoService,
    private tipoGastoService: TipoGastoService,
    private RpEmpresaComplementariaService: RpEmpresaComplementariaService,
    private empleadoDiscapacidadService: EmpleadoDiscapacidadService,
    private dialog: MatDialog
  ) { }

ngOnInit(): void {
  this.crearFormulario();

  this.configurarBusquedaCiudades();
  this.cargarCiudades();

  this.form.get('datosGenerales.empleadoBusqueda')?.valueChanges.subscribe(valor => {
    this.cargarEmpleadosBusqueda(valor ?? '');
  });

  this.cargarCatalogos();
}
  crearFormulario(): void {
    this.form = this.fb.group({
      datosGenerales: this.fb.group({
        empleadoBusqueda: [''],
        codigoEmpleado: [''],
        tipoDocumento: [null],
        identificacion: [''],
        sexo: [null],

        nombres: [''],
        apellidos: [''],
        estadoCivil: [null],
        fechaNacimiento: [''],
        linkFoto: [null],

        pais: [''],
        ciudad: [null],
        direccion: [null],
        telefono: [null],
        celular: [null],
        nacionalidad: [null],
        email: [null],
        contactoReferencia: [''],
        telefonoReferencia: [''],

        empresaAportacion: [''],
        zona: [null],
        ciudadTrabajo: [null],
        local: [null],

        departamento: [null],
        cargo: [null],
        tipoEmpleado: [null],

        grupoOcupacion: [null]
      }),

      datosAdicionales: this.fb.group({
        empleado: [''],

        noRecibeProvisiones: [false],
        pagoDecimoCuarto: [false],
        pagoDecimoTercero: [false],
        pagoFondosReserva: [false],
        terceraEdad: [false],

        nivelInstruccion: [''],
        fechaPagoDecimoInicio: [''],
        fechaPagoDecimoFin: [''],
        regimen: [''],

        gerenteRepLegal: [false],
        noPagaImpuestoRenta: [false],

        cargaConyugeUtilidades: [false],
        cargaHijosUtilidades: [''],

        codigoBanco: [null],
        ctaContableEmpleado: [''],
        formaPago: [null],
        tipoCuenta: [null],
        numeroCuenta: [''],
        codigoBancoEmpleado: [null],

        establecimiento: [''],
        codigoSectorialIess: [''],
        grupoSanguineo: [''],
        rucEmpresaComplementaria: [''],
        libretaMilitar: ['']
      }),

      datosSalariales: this.fb.group({
        empleado: [''],
        fechaSalario: [''],
        salario: [null],
        valorHoraNormal: [''],
        valorHoraEspecial: [''],
        incluyeAportacion: [false],
        anticipoQuincenal1: [''],
        anticipoQuincenal2: [''],
        retencionJudicial: [false],
        valoresRetencion: ['']
      }),

      datosAcademicos: this.fb.group({
        empleado: [''],
        educacionPrimaria: [''],
        educacionSuperior: [''],
        educacionSecundaria: [''],
        cursosMaestriasPosgrados: ['']
      }),

      datosEspeciales: this.fb.group({
        empleado: [''],
        residenciaTrabajador: [''],
        aplicaConvenio: [''],
        sistemaSalarioNeto: [''],
        paisResidencia: [''],
        beneficioGalapagos: [false],

        ingresosAgraviados: [''],
        aportePersonalIess: [''],
        valorImpuestoRetenido: [''],
        compensacionEconomicaDigna: [''],

        discapacitado: [false],
        carnetConadis: [''],
        condicionTrabajador: [''],
        idTipoDiscapacidad: [null],
        porcentajeDiscapacidad: [''],
         enfermedadCatastrofica: [false],
        descripcionDiscapacidad: [''],
        tipoIdentidad: [''],
        identificacion: [''],
        nombreDiscapacidad: ['']
      })
    });
    const salarioCtrl = this.form.get('datosSalariales.salario');

    salarioCtrl?.valueChanges.subscribe(valor => {
      this.aplicarReglaSueldoManual(valor);
    });
  }


  cargarCatalogos(): void {
    forkJoin({
      departamentos: this.rpDepartamentosService.getDepartamentos(),
      cargos: this.rpCargosService.getAll(),
      tiposEmpleado: this.rpTipoEmpleadoService.getAll(),
      tiposDocumento: this.tipoDocumentoService.getTiposDocumento(),
      estadosCivil: this.estadoCivilService.getEstadoCivil(),
      generos: this.generoService.getGeneros(),
      locales: this.localesService.getAll(),
      zonas: this.zonaService.obtenerZona(),
      nacionalidades: this.nacionalidadService.getAll(),
      gruposOcupacionales: this.grupoOcupacionalService.getAll(),
      regimenes: this.regimenService.getAll(),
      tiposSangre: this.tipoSangreService.getAll(),
      tiposContrato: this.tipoContratoService.getTiposContrato(),
      bancos: this.bancosService.getAll(),
      formasPago: this.formaPagoService.getAll(),
      bancosTerceros: this.banTerceroService.getAll(),
      tiposCuentaBanco: this.tipoCuentaBancoService.getAll(),
      sectoriales: this.sectorialService.getAll(),
      tiposDiscapacidad: this.tipoDiscapacidadService.getAll(),
      nivelInstruccion: this.nivelInstruccionService.getAll(),
      tiposObservacion: this.tipoObservacionService.getTiposObservacion(),
      tiposGasto: this.tipoGastoService.getAll(),
      empleados: this.empleadoFichaService.getFicha(),
      empresasComplementarias: this.RpEmpresaComplementariaService.getAll()
    }).subscribe({
      next: ({ departamentos, cargos, tiposEmpleado, tiposDocumento, estadosCivil, generos, locales, zonas, nacionalidades, gruposOcupacionales, regimenes, tiposSangre, tiposContrato, bancos, formasPago, bancosTerceros, tiposCuentaBanco, sectoriales, tiposDiscapacidad, nivelInstruccion, tiposObservacion, tiposGasto, empleados, empresasComplementarias }) => {
        this.empleadosBusqueda = empleados.data ?? [];
        this.empleadosFiltrados = this.empleadosBusqueda;
        this.departamentos = departamentos.map(dep => ({
          ...dep,
          id_departamento: Number(dep.id_departamento)
        }));

        this.cargos = cargos.map(cargo => ({
          ...cargo,
          idCargo: Number(cargo.idCargo)
        }));

        this.tiposEmpleado = tiposEmpleado.map(tipo => ({
          ...tipo,
          idTipemp: Number(tipo.idTipemp)
        }));

        this.tiposDocumento = tiposDocumento.map(tipo => ({
          ...tipo,
          idTipoDocumento: Number(tipo.idTipoDocumento)
        }));

        this.estadosCivil = estadosCivil.map(ec => ({
          ...ec,
          estadoCivilCodigo: Number(ec.estadoCivilCodigo)
        }));
        this.generos = generos.map(g => ({
          ...g,
          generoCodigo: Number(g.generoCodigo)
        }));
        this.locales = (locales.data ?? []).map(l => ({
          ...l,
          id: Number(l.id)
        }));
        this.zonas = zonas.map(z => ({
          ...z,
          id: Number(z.id)
        }));
        
        this.nacionalidades = nacionalidades.map(n => ({
          ...n,
          id_nacionalidad: Number(n.id_nacionalidad)
        }));
        this.gruposOcupacionales = gruposOcupacionales.data.map(g => ({
          ...g,
          id_grupo_ocupacional: Number(g.id_grupo_ocupacional)
        }));
        this.regimenes = (regimenes.data ?? []).map(r => ({
          ...r,
          id_regimen: Number(r.id_regimen)
        }));

        this.tiposSangre = (tiposSangre.data ?? []).map(t => ({
          ...t,
          id_tipo_sangre: Number(t.idTipoSangre)
        }));
        this.tiposContrato = (tiposContrato.data ?? []).map(t => ({
          ...t,
          idTipoContrato: Number(t.idTipoContrato)
        }));
        this.bancos = (bancos.data ?? []).map((x: any) => ({
          ...x,
          codban: Number(x.codban ?? x.codBan ?? x.Codban ?? x.CodBan),
          desban: x.desban ?? x.desBan ?? x.Desban ?? x.DesBan ?? ''
        }));

        this.formasPago = (formasPago.data ?? []).map((x: any) => ({
          ...x,
          idFormaPago: Number(x.idFormaPago ?? x.id_forma_pago ?? x.IdFormaPago),
          descripcion: x.descripcion ?? x.Descripcion ?? ''
        }));

        this.bancosTerceros = (bancosTerceros.data ?? []).map((x: any) => ({
          ...x,
          codBanTercero: Number(x.codBanTercero ?? x.cod_ban_tercero ?? x.CodBanTercero),
          descripcion: x.descripcion ?? x.Descripcion ?? ''
        }));

        this.tiposCuentaBanco = (tiposCuentaBanco.data ?? []).map((x: any) => ({
          ...x,
          idCuentaBanco: Number(x.idCuentaBanco ?? x.id_cuenta_banco ?? x.IdCuentaBanco),
          descripcion: x.desCuentaBanco ?? x.descripcion ?? x.Descripcion ?? x.nombre ?? x.Nombre ?? ''
        }));
        this.sectoriales = (sectoriales.data ?? []).map((x: any) => ({
          ...x,
          idSectorial: Number(x.idSectorial ?? x.id_sectorial ?? x.IdSectorial),
          descripcion: x.descripcion ?? x.Descripcion ?? ''
        }));
        this.tiposDiscapacidad = (tiposDiscapacidad.data ?? []).map((x: any) => ({
          ...x,
          idTipoDiscapacidad: Number(x.idTipoDiscapacidad ?? x.id_tipo_discapacidad ?? x.IdTipoDiscapacidad),
          descripcion: x.descripcion ?? x.Descripcion ?? ''
        }));
        this.nivelesInstruccion = (nivelInstruccion.data ?? []).map((x: any) => ({
          ...x,
          id_nivel_instruccion: Number(x.id_nivel_instruccion ?? x.idNivelInstruccion ?? x.IdNivelInstruccion),
          descripcion: x.descripcion ?? x.Descripcion ?? ''
        }));
        this.tiposObservacion = (tiposObservacion ?? []).map(x => ({
          idTipoObservacion: Number(x.idTipoObservacion),
          descripcion: x.descripcion,
          estado: x.estado
        }));
        this.tiposGasto = (tiposGasto.data ?? []).map((x: any) => ({
          ...x,
          idTipoGasto: Number(x.idTipoGasto ?? x.id_tipo_gasto),
          descripcion: x.descripcion ?? '',
          monto: x.monto ?? x.Monto ?? null
        }));
        this.empresaComplementaria = (empresasComplementarias ?? []).map((x: any) => ({
          ...x,
          idEmpresaComplementaria: Number(x.idEmpresaComplementaria),
          empresa: x.empresa ?? '',
          ruc: x.ruc ?? '',
          estado: x.estado
        }));
        this.cargarFichaEmpleado();
      },
      error: (err: any) => {
        console.error('Error al cargar catálogos:', err);
      }
    });
  }

cargarFichaEmpleado(idEmpleado?: number): void {
  this.empleadoFichaService.getFicha(idEmpleado).subscribe({
    next: (resp) => {
      if (
        resp.type !== 'LIST' ||
        !resp.data ||
        resp.data.length === 0
      ) {
        console.warn(resp.message || 'No se encontró empleado');
        return;
      }

      const emp: EmpleadoFichaResponse = resp.data[0];

      this.esNuevoEmpleado = false;
      this.idEmpleadoActual = Number(emp.idEmpleado);
      this.idPersonaActual = (emp as any).idPersona ?? null;

      if (
        this.idEmpleadoActual &&
        !isNaN(this.idEmpleadoActual)
      ) {
        this.cargarCronologiaEmpleado(this.idEmpleadoActual);
        this.cargarHistorialBancoEmpleado(this.idEmpleadoActual);
        this.cargarCargasEmpleado(this.idEmpleadoActual);
        this.cargarFormacionEmpleado(this.idEmpleadoActual);
        this.cargarObservacionesEmpleado(this.idEmpleadoActual);
        this.cargarGastosSriEmpleado(this.idEmpleadoActual);
        this.cargarDiscapacidadEmpleado(this.idEmpleadoActual);
      }

      const nombreCompleto =
        emp.nombre ||
        `${emp.apellidos ?? ''} ${emp.nombres ?? ''}`.trim();

      const sueldoEmpleado =
        emp.sueldo ??
        (emp as any).Sueldo ??
        (emp as any).salario ??
        (emp as any).Salario ??
        null;

      const tieneSueldo =
        emp.sueldo !== null &&
        emp.sueldo !== undefined &&
        Number(emp.sueldo) !== 0;

      this.form.patchValue({
        datosGenerales: {
          codigoEmpleado: emp.idEmpleado,
          identificacion: emp.documento ?? '',
          nombres: emp.nombres ?? '',
          apellidos: emp.apellidos ?? '',
          fechaNacimiento: emp.fecNac ?? '',
          zona: Number(emp.idZona),

          departamento: Number(emp.id_departamento),
          cargo: Number(emp.idCargo),
          tipoEmpleado: Number(emp.idTipemp),
          tipoDocumento: Number(emp.idTipoDocumento),
          estadoCivil: Number(emp.estadoCivilCodigo),
          sexo: Number(emp.generoCodigo),
          local: Number(emp.id),

          ciudad: Number(emp.idCiudad),
          ciudadTrabajo: Number(emp.idCiudadTrabajo),

          direccion: emp.direccion ?? '',
          telefono: emp.telefono ?? '',
          email: emp.mail ?? '',
          nacionalidad: Number(emp.id_nacionalidad),
          empresaAportacion: emp.empresa ?? '',
          grupoOcupacion: Number(emp.id_grupo_ocupacional),
          linkFoto: emp.foto ?? null
        },

        datosAdicionales: {
          empleado: nombreCompleto,
          ctaContableEmpleado: emp.ctaCble ?? '',
          noRecibeProvisiones: emp.proviciones === true,
          pagoDecimoCuarto: emp.decimos === true,
          pagoDecimoTercero: emp.decimo3ro === true,
          pagoFondosReserva: emp.freserva === true,
          terceraEdad: emp.teredad === true,
          noPagaImpuestoRenta: emp.imp_renta === true,
          cargaConyugeUtilidades: emp.carcony === true,
          cargaHijosUtilidades: emp.carhijos ?? 0,
          gerenteRepLegal: emp.rep_legal === true,
          fechaPagoDecimoInicio: emp.feinivac ?? '',
          fechaPagoDecimoFin: emp.fefinvac ?? '',
          regimen: emp.id_regimen ?? '',
          grupoSanguineo: emp.id_tipo_sangre ?? '',
          establecimiento: emp.establecimiento ?? '',
          libretaMilitar: emp.lmilitar ?? '',
          codigoSectorialIess: emp.idSectorial ?? '',
          rucEmpresaComplementaria:
            emp.idEmpresaComplementaria ?? ''
        },

        datosSalariales: {
          empleado: nombreCompleto,
          fechaSalario: emp.fecha_sueldo ?? '',
          salario: tieneSueldo ? sueldoEmpleado : '',
          incluyeAportacion: false,
          retencionJudicial: emp.ret_judicial === true,
          anticipoQuincenal1: emp.quincena ?? 0,
          anticipoQuincenal2: emp.quincenaIi ?? 0,
          valoresRetencion: emp.valor_retencion_j ?? 0,
          valorHoraNormal: emp.valor_hora ?? 0,
          valorHoraEspecial: emp.valor_hora_espe ?? 0
        },

        datosAcademicos: {
          empleado: nombreCompleto
        },

        datosEspeciales: {
          empleado: nombreCompleto,
          identificacion: emp.documento ?? '',
          discapacitado: emp.discap === true,
            enfermedadCatastrofica:
    emp.enfcatastro === true,
          beneficioGalapagos: emp.galapagos === true
        }
      });
      
      // Estas líneas deben estar DENTRO del next,
      // porque aquí sí existe la variable emp.
      this.idCiudadPendiente =
        emp.idCiudad !== null &&
        emp.idCiudad !== undefined
          ? Number(emp.idCiudad)
          : null;

      this.idCiudadTrabajoPendiente =
        emp.idCiudadTrabajo !== null &&
        emp.idCiudadTrabajo !== undefined
          ? Number(emp.idCiudadTrabajo)
          : null;

      this.mostrarCiudadesEmpleado(
        this.idCiudadPendiente,
        this.idCiudadTrabajoPendiente
      );

      this.aplicarReglaSueldo(sueldoEmpleado);
    },

    error: (err: any) => {
      console.error(
        'Error al cargar ficha de empleado:',
        err
      );
    }
  });
}
  nuevo(): void {
    this.esNuevoEmpleado = true;
    this.idEmpleadoActual = null;
    this.idPersonaActual = null;
    this.ultimoEmpleadoConsultado = null;

    this.cronologiaRowData = [];
    this.bancoRowData = [];
    this.cargasRowData = [];
    this.academicosRowData = [];
    this.referenciaRowData = [];
    this.gastosRowData = [];
    this.observacionRowData = [];
    this.observacionRowData = [];
    this.observacionEliminados = [];

    this.cronologiaEliminados = [];
    this.bancoEliminados = [];
    this.cargasEliminadas = [];
    this.academicosEliminados = [];
    this.gastosRowData = [];
    this.gastosEliminados = [];
    this.form.reset({
      datosGenerales: {
        empleadoBusqueda: '',
        codigoEmpleado: '',
        tipoDocumento: null,
        identificacion: '',
        sexo: null,
        nombres: '',
        apellidos: '',
        estadoCivil: null,
        fechaNacimiento: '',
        ciudad: null,
        direccion: '',
        telefono: '',
        celular: '',
        nacionalidad: null,
        email: '',
        linkFoto: null,
        zona: null,
        ciudadTrabajo: null,
        local: null,
        departamento: null,
        cargo: null,
        tipoEmpleado: null,
        grupoOcupacion: null,
        empresaAportacion: ''
      },
      datosAdicionales: {
        empleado: '',
        noRecibeProvisiones: false,
        pagoDecimoCuarto: false,
        pagoDecimoTercero: false,
        pagoFondosReserva: false,
        terceraEdad: false,
        fechaPagoDecimoInicio: '',
        fechaPagoDecimoFin: '',
        regimen: null,
        gerenteRepLegal: false,
        noPagaImpuestoRenta: false,
        cargaConyugeUtilidades: false,
        cargaHijosUtilidades: '',
        establecimiento: '',
        codigoSectorialIess: null,
        grupoSanguineo: null,
        rucEmpresaComplementaria: '',
        libretaMilitar: ''
      },
      datosSalariales: {
        empleado: '',
        fechaSalario: '',
        salario: '',
        valorHoraNormal: '',
        valorHoraEspecial: '',
        incluyeAportacion: false,
        anticipoQuincenal1: '',
        anticipoQuincenal2: '',
        retencionJudicial: false,
        valoresRetencion: ''
      },
      datosAcademicos: {
        empleado: ''
      },
      datosEspeciales: {
        empleado: '',
        residenciaTrabajador: '',
        aplicaConvenio: '',
        sistemaSalarioNeto: '',
        paisResidencia: '',
        beneficioGalapagos: false,
        ingresosAgraviados: '',
        aportePersonalIess: '',
        valorImpuestoRetenido: '',
        compensacionEconomicaDigna: '',
        discapacitado: false,
        carnetConadis: '',
        condicionTrabajador: '',
        idTipoDiscapacidad: null,
        porcentajeDiscapacidad: '',
        enfermedadCatastrofica: false,
        descripcionDiscapacidad: '',
        tipoIdentidad: '',
        identificacion: '',
        nombreDiscapacidad: ''
      }
    }, { emitEvent: false });
  }

  grabar(): void {
    this.guardarEmpleadoPrincipal();
    // this.guardarCronologia();
    // this.guardarHistorialBanco();
    // this.guardarCargas();
    // this.guardarFormacion();
  }

  borrar(): void {
    console.log('Borrar');
  }

  cancelar(): void {
    this.nuevo();
    this.limpiarBusquedaEmpleado();
  }

  agregarNomina(): void {
    console.log('Agregar Nómina');
  }

  imprimir(): void {
    console.log('Imprimir');
  }

  actualizarCargas(): void {
    console.log('Actualizar Cargas');
  }

  actualizarObservacion(): void {
    console.log('Actualizar Observación');
  }

  reporte(): void {
    console.log('Reporte');
  }
  limpiarFoto(): void {
    this.form.get('datosGenerales.linkFoto')?.setValue('');
  }
  aplicarReglaSueldo(sueldo: any): void {

    const salarioCtrl = this.form.get('datosSalariales.salario');
    const incluyeCtrl = this.form.get('datosSalariales.incluyeAportacion');

    const tieneSueldo =
      sueldo !== null &&
      sueldo !== undefined &&
      Number(sueldo) !== 0;

    if (tieneSueldo) {

      salarioCtrl?.setValue(sueldo);

      incluyeCtrl?.setValue(false);

      incluyeCtrl?.disable();

    } else {

      salarioCtrl?.setValue('');

      incluyeCtrl?.enable();
    }
  }
  aplicarReglaSueldoManual(valor: any): void {
    const incluyeCtrl = this.form.get('datosSalariales.incluyeAportacion');

    const tieneSueldo =
      valor !== null &&
      valor !== undefined &&
      valor !== '' &&
      Number(valor) !== 0;

    if (tieneSueldo) {
      incluyeCtrl?.setValue(false, { emitEvent: false });
      incluyeCtrl?.disable({ emitEvent: false });
    } else {
      incluyeCtrl?.enable({ emitEvent: false });
    }
  }
  cargarCronologiaEmpleado(idEmpleado: number): void {
    this.cronologiaService.getByEmpleado(idEmpleado).subscribe({
      next: (resp) => {
        this.cronologiaRowData = resp.data ?? [];
      },
      error: (err) => {
        console.error('Error cargando cronología:', err);
        this.cronologiaRowData = [];
      }
    });
  }
  agregarFilaCronologia(): void {
    if (!this.idEmpleadoActual) {
      alert('Primero debe seleccionar un empleado.');
      return;
    }

    const nuevaFila: RpMaeEmpCronologiaResponse & { modificado?: boolean } = {
      idCronologia: 0,
      idEmpleado: this.idEmpleadoActual,
      nroContrato: this.cronologiaRowData.length + 1,
      idTipoContrato: null,
      tipoContrato: null,
      fecIngreso: null,
      fecSalida: null,
      fecTercont: null,
      numContrato: null,
      horasContrato: null,
      modificado: true
    };

    this.cronologiaRowData = [...this.cronologiaRowData, nuevaFila];
  }
  eliminarFilaCronologia(row: RpMaeEmpCronologiaResponse): void {
    if (!row) return;

    if (row.idCronologia && row.idCronologia > 0) {
      this.cronologiaEliminados.push(row.idCronologia);
    }

    this.cronologiaRowData = this.cronologiaRowData.filter(x => x !== row);
  }
  guardarCronologia(): void {

    if (!this.idEmpleadoActual) {
      alert('Primero debe seleccionar un empleado.');
      return;
    }

    const crear = this.cronologiaRowData
      .filter(x => !x.idCronologia || x.idCronologia === 0)
      .map((x, index) => ({
        idEmpleado: this.idEmpleadoActual!,
        nroContrato: x.nroContrato && x.nroContrato > 0 ? x.nroContrato : index + 1,
        idTipoContrato: x.idTipoContrato,
        fecIngreso: x.fecIngreso,
        fecSalida: x.fecSalida,
        fecTercont: x.fecTercont,
        numContrato: x.numContrato,
        horasContrato: x.horasContrato
      }));

    const actualizar = this.cronologiaRowData
      .filter(x => x.idCronologia > 0 && (x as any).modificado === true)
      .map(x => ({
        idCronologia: x.idCronologia,
        nroContrato: x.nroContrato,
        idTipoContrato: x.idTipoContrato,
        fecIngreso: x.fecIngreso,
        fecSalida: x.fecSalida,
        fecTercont: x.fecTercont,
        numContrato: x.numContrato,
        horasContrato: x.horasContrato
      }));

    const request = {
      idEmpleado: this.idEmpleadoActual,
      crear,
      actualizar,
      eliminar: this.cronologiaEliminados
    };

    this.cronologiaService.sync(request).subscribe({
      next: (resp) => {
        if (resp.type === 'Success') {
          this.cronologiaEliminados = [];
          this.cargarCronologiaEmpleado(this.idEmpleadoActual!);
          //alert('Cronología guardada correctamente.');
        } else {
          alert(resp.message ?? 'No se pudo guardar la cronología.');
        }
      },
      error: (err) => {
        console.error('Error guardando cronología:', err);
        alert('Error guardando cronología.');
      }
    });
  }
  cargarHistorialBancoEmpleado(idEmpleado: number): void {
    this.historialBancoService.getByEmpleado(idEmpleado).subscribe({
      next: (resp) => {
        this.bancoRowData = resp.data ?? [];
      },
      error: (err) => {
        console.error('Error cargando historial banco:', err);
        this.bancoRowData = [];
      }
    });
  }
  agregarFilaBanco(): void {
    if (!this.idEmpleadoActual) {
      alert('Primero debe seleccionar un empleado.');
      return;
    }

    const nuevaFila: RpMaeEmpHistorialBancoResponse & { modificado?: boolean } = {
      idHistorialBanco: 0,
      idEmpleado: this.idEmpleadoActual,
      codcuenta: null,
      codban: null,
      banco: null,
      ctacte: null,
      idFormaPago: null,
      formaPago: null,
      codBanTercero: null,
      bancoTercero: null,
      fechaDesde: new Date().toISOString().substring(0, 10),
      fechaHasta: null,
      modificado: true,
      idCuentaBanco: null,
      tipoCuentaBanco: null,
    };

    this.bancoRowData = [...this.bancoRowData, nuevaFila];
  }
  eliminarFilaBanco(row: RpMaeEmpHistorialBancoResponse): void {
    if (!row) return;

    if (row.idHistorialBanco && row.idHistorialBanco > 0) {
      this.bancoEliminados.push(row.idHistorialBanco);
    }

    this.bancoRowData = this.bancoRowData.filter(x => x !== row);
  }
  guardarHistorialBanco(): void {
    if (!this.idEmpleadoActual) {
      alert('Primero debe seleccionar un empleado.');
      return;
    }

    const crear = this.bancoRowData
      .filter(x => !x.idHistorialBanco || x.idHistorialBanco === 0)
      .map(x => ({
        idEmpleado: this.idEmpleadoActual!,
        codcuenta: x.codcuenta,
        codban: x.codban,
        ctacte: x.ctacte,
        idFormaPago: x.idFormaPago,
        codBanTercero: x.codBanTercero,
        idCuentaBanco: x.idCuentaBanco,
        fechaDesde: x.fechaDesde,
        fechaHasta: x.fechaHasta
      }));

    const actualizar = this.bancoRowData
      .filter(x => x.idHistorialBanco > 0 && x.modificado === true)
      .map(x => ({
        idHistorialBanco: x.idHistorialBanco,
        codcuenta: x.codcuenta,
        codban: x.codban,
        ctacte: x.ctacte,
        idFormaPago: x.idFormaPago,
        codBanTercero: x.codBanTercero,
        idCuentaBanco: x.idCuentaBanco,
        fechaDesde: x.fechaDesde,
        fechaHasta: x.fechaHasta
      }));

    this.historialBancoService.sync({
      idEmpleado: this.idEmpleadoActual,
      crear,
      actualizar,
      eliminar: this.bancoEliminados
    }).subscribe({
      next: (resp) => {
        if (resp.type === 'Success') {
          this.bancoEliminados = [];
          console.log('Historial banco:', resp.data);
          this.cargarHistorialBancoEmpleado(this.idEmpleadoActual!);
        } else {
          alert(resp.message ?? 'No se pudo guardar historial bancario.');
        }
      },
      error: (err) => {
        console.error('Error guardando historial banco:', err);
        alert('Error guardando historial banco.');
      }
    });
  }
  cargarCargasEmpleado(idEmpleado: number): void {
    this.cargasEmpleadoService.getByEmpleado(idEmpleado).subscribe({
      next: (resp) => {
        this.cargasRowData = resp.data ?? [];
      },
      error: (err) => {
        console.error('Error cargando cargas:', err);
        this.cargasRowData = [];
      }
    });
  }
  eliminarFilaCarga(row: any): void {
    if (!row) return;

    if (row.idCarga && row.idCarga > 0) {
      this.cargasEliminadas.push(row.idCarga);
    }

    this.cargasRowData = this.cargasRowData.filter(x => x !== row);
  }
  agregarFilaCarga(): void {
    if (!this.idEmpleadoActual) {
      alert('Primero debe seleccionar un empleado.');
      return;
    }

    const nuevaFila = {
      idCarga: 0,
      idEmpleado: this.idEmpleadoActual,
      idEmpresa: 1,
      nombre: null,
      apellido: null,
      identificacion: null,
      direccion: null,
      telefono: null,
      fechaNacimiento: null,
      idGenero: null,
      genero: null,
      parentesco: null,
      discapacidad: null,
      utilidad: null,
      imprenta: null,
      estado: true,
      idTipoDiscapacidad: null,
      tipoDiscapacidad: null,
      modificado: true
    };

    this.cargasRowData = [...this.cargasRowData, nuevaFila];
  }
  guardarCargas(): void {
    debugger;
    if (!this.idEmpleadoActual) {
      return;
    }

    const crear = this.cargasRowData
      .filter(x => !x.idCarga || x.idCarga === 0)
      .map(x => ({
        idEmpleado: this.idEmpleadoActual!,
        idEmpresa: x.idEmpresa ?? this.form.get('datosGenerales.empresa')?.value ?? 1,
        nombre: x.nombre ?? null,
        apellido: x.apellido ?? null,
        identificacion: x.identificacion ?? null,
        direccion: x.direccion ?? null,
        telefono: x.telefono ?? null,
        fechaNacimiento: x.fechaNacimiento ?? null,
        idGenero: x.idGenero ?? null,
        parentesco: x.parentesco ?? null,
        estado: x.estado ?? true,
        discapacidad: x.discapacidad ?? null,
        utilidad: x.utilidad === true,
        imprenta: x.imprenta === true,
        idTipoDiscapacidad: x.idTipoDiscapacidad ?? null
      }));

    const actualizar = this.cargasRowData
      .filter(x => x.idCarga && x.idCarga > 0 && x.modificado === true)
      .map(x => ({
        idCarga: x.idCarga,
        idEmpleado: this.idEmpleadoActual!,
        idEmpresa: x.idEmpresa ?? this.form.get('datosGenerales.empresa')?.value ?? 1,
        nombre: x.nombre ?? null,
        apellido: x.apellido ?? null,
        identificacion: x.identificacion ?? null,
        direccion: x.direccion ?? null,
        telefono: x.telefono ?? null,
        fechaNacimiento: x.fechaNacimiento ?? null,
        idGenero: x.idGenero ?? null,
        parentesco: x.parentesco ?? null,
        estado: x.estado ?? true,
        discapacidad: x.discapacidad ?? null,
        utilidad: x.utilidad === true,
        imprenta: x.imprenta === true,
        idTipoDiscapacidad: x.idTipoDiscapacidad ?? null
      }));

    const eliminar = this.cargasEliminadas ?? [];

    console.log('SYNC CARGAS:', {
      crear,
      actualizar,
      eliminar
    });

    if (crear.length === 0 && actualizar.length === 0 && eliminar.length === 0) {
      return;
    }

    this.cargasEmpleadoService.sync({
      crear,
      actualizar,
      eliminar
    }).subscribe({
      next: (resp) => {
        if (resp.type === 'Success') {
          this.cargasEliminadas = [];
          this.cargarCargasEmpleado(this.idEmpleadoActual!);
        } else {
          alert(resp.message ?? 'No se pudo guardar cargas.');
        }
      },
      error: (err) => {
        console.error('Error guardando cargas:', err);
        alert('Error guardando cargas.');
      }
    });
  }
  cargarFormacionEmpleado(idEmpleado: number): void {
    this.formacionService.getByEmpleado(idEmpleado).subscribe({
      next: resp => {
        this.academicosRowData = resp.data ?? [];
      },
      error: err => {
        console.error('Error cargando formación:', err);
        this.academicosRowData = [];
      }
    });
  }
  agregarFilaAcademica(): void {
    if (!this.idEmpleadoActual) {
      alert('Primero debe seleccionar un empleado.');
      return;
    }

    this.academicosRowData = [
      ...this.academicosRowData,
      {
        idFormacion: 0,
        idEmpleado: this.idEmpleadoActual,
        institucion: null,
        observacion: null,
        titulo: null,
        idNivelInstruccion: null,
        nivelInstruccion: null,
        fechaDesde: null,
        fechaHasta: null,
        modificado: true
      }
    ];
  }
  eliminarFilaAcademica(row: any): void {
    if (!row) return;

    if (row.idFormacion && row.idFormacion > 0) {
      this.academicosEliminados.push(row.idFormacion);
    }

    this.academicosRowData = this.academicosRowData.filter(x => x !== row);
  }
  guardarFormacion(): void {
    if (!this.idEmpleadoActual) return;

    const crear = this.academicosRowData
      .filter(x => !x.idFormacion || x.idFormacion === 0)
      .map(x => ({
        idEmpleado: this.idEmpleadoActual!,
        institucion: x.institucion,
        observacion: x.observacion,
        titulo: x.titulo,
        idNivelInstruccion: x.idNivelInstruccion,
        fechaDesde: x.fechaDesde,
        fechaHasta: x.fechaHasta
      }));

    const actualizar = this.academicosRowData
      .filter(x => x.idFormacion > 0 && x.modificado === true)
      .map(x => ({
        idFormacion: x.idFormacion,
        idEmpleado: this.idEmpleadoActual!,
        institucion: x.institucion,
        observacion: x.observacion,
        titulo: x.titulo,
        idNivelInstruccion: x.idNivelInstruccion,
        fechaDesde: x.fechaDesde,
        fechaHasta: x.fechaHasta
      }));

    const eliminar = this.academicosEliminados ?? [];

    if (crear.length === 0 && actualizar.length === 0 && eliminar.length === 0) {
      return;
    }

    this.formacionService.sync({ crear, actualizar, eliminar }).subscribe({
      next: resp => {
        if (resp.type === 'Success') {
          this.academicosEliminados = [];
          this.cargarFormacionEmpleado(this.idEmpleadoActual!);
        } else {
          alert(resp.message ?? 'No se pudo guardar formación.');
        }
      },
      error: err => {
        console.error('Error guardando formación:', err);
        alert('Error guardando formación.');
      }
    });
  }
  ultimoEmpleadoConsultado: number | null = null;

  buscarEmpleadoPorCodigo(): void {
    const valor = this.form.get('datosGenerales.codigoEmpleado')?.value;

    const idEmpleado = Number(valor);

    if (!idEmpleado || isNaN(idEmpleado)) {
      return;
    }

    if (this.ultimoEmpleadoConsultado === idEmpleado) {
      return;
    }

    this.ultimoEmpleadoConsultado = idEmpleado;

    this.limpiarFichaEmpleado();
    this.cargarFichaEmpleado(idEmpleado);
  }
  limpiarFichaEmpleado(): void {
    this.idEmpleadoActual = null;

    this.cronologiaRowData = [];
    this.bancoRowData = [];
    this.cargasRowData = [];
    this.academicosRowData = [];

    this.cronologiaEliminados = [];
    this.bancoEliminados = [];
    this.cargasEliminadas = [];
    this.academicosEliminados = [];

    this.form.patchValue({
      datosGenerales: {
        identificacion: '',
        nombres: '',
        apellidos: '',
        fechaNacimiento: '',
        zona: null,
        departamento: null,
        cargo: null,
        tipoEmpleado: null,
        tipoDocumento: null,
        estadoCivil: null,
        sexo: null,
        local: null,
        ciudad: null,
        ciudadTrabajo: null,
        direccion: '',
        telefono: '',
        celular: '',
        email: '',
        nacionalidad: null,
        empresaAportacion: '',
        grupoOcupacion: null,
        linkFoto: null
      },

      datosAdicionales: {
        empleado: '',
        noRecibeProvisiones: false,
        pagoDecimoCuarto: false,
        pagoDecimoTercero: false,
        pagoFondosReserva: false,
        terceraEdad: false,
        noPagaImpuestoRenta: false,
        cargaConyugeUtilidades: false,
        cargaHijosUtilidades: 0,
        gerenteRepLegal: false,
        fechaPagoDecimoInicio: '',
        fechaPagoDecimoFin: '',
        regimen: null,
        grupoSanguineo: null,
        establecimiento: '',
        libretaMilitar: '',
        codigoSectorialIess: null
      },

      datosSalariales: {
        empleado: '',
        fechaSalario: '',
        salario: '',
        incluyeAportacion: false,
        retencionJudicial: false,
        anticipoQuincenal1: 0,
        anticipoQuincenal2: 0,
        valoresRetencion: 0,
        valorHoraNormal: 0,
        valorHoraEspecial: 0
      },

      datosAcademicos: {
        empleado: ''
      },

      datosEspeciales: {
        empleado: '',
        identificacion: '',
        discapacitado: false,
          enfermedadCatastrofica: false,  
        beneficioGalapagos: false
      }
    }, { emitEvent: false });
  }
  guardarEmpleadoPrincipal(): void {
    const dg = this.form.get('datosGenerales')?.value;
    const da = this.form.get('datosAdicionales')?.value;
    const ds = this.form.get('datosSalariales')?.value;
    const de = this.form.get('datosEspeciales')?.value;

    const request: SyncEmpleadoRequest = {
      idEmpleado: this.esNuevoEmpleado ? null : this.idEmpleadoActual,
      idPersona: this.esNuevoEmpleado ? null : this.idPersonaActual,

      documento: dg.identificacion ?? '',
      nombre1: dg.nombres ?? '',
      nombre2: null,
      apellido1: dg.apellidos ?? '',
      apellido2: null,
      fechaNacimiento: dg.fechaNacimiento || null,
      idEstadoCivil: Number(dg.estadoCivil ?? 1),
      tipoPersona: 'N',
      idTipoDocumento: Number(dg.tipoDocumento ?? 1),
      idGenero: dg.sexo ? Number(dg.sexo) : null,
      idCiudad: Number(dg.ciudad ?? 1),
      direccion: dg.direccion ?? null,
      telefono: dg.telefono ?? null,
      email: dg.email ?? null,
      status: true,

      idEmpresa: 1,
      idCargo: Number(dg.cargo ?? 1),
      idTipemp: Number(dg.tipoEmpleado ?? 1),
      idNacionalidad: Number(dg.nacionalidad ?? 1),

      carcony: da.cargaConyugeUtilidades === true,
      carhijos: da.cargaHijosUtilidades ? Number(da.cargaHijosUtilidades) : null,
      numafil: null,
      idSectorial: da.codigoSectorialIess ? Number(da.codigoSectorialIess) : null,
      foto: dg.linkFoto ?? null,
      idTipoSangre: da.grupoSanguineo ? Number(da.grupoSanguineo) : null,
      codcentel: null,
      ctaCble: null,

      provisiones: da.noRecibeProvisiones === false,
      decimos: da.pagoDecimoCuarto === true,
      decimo3ro: da.pagoDecimoTercero === true,
      freserva: da.pagoFondosReserva === true,

      idRegimen: da.regimen ? Number(da.regimen) : null,
      discap: de.discapacitado === true,
      teredad: da.terceraEdad === true,

      galapagos:
  de.beneficioGalapagos === true,

enfcatastro:
  de.enfermedadCatastrofica === true,

      retJudicial: ds.retencionJudicial === true,
      valorRetencionJ: ds.valoresRetencion ? Number(ds.valoresRetencion) : null,
      idGrupoOcupacional: dg.grupoOcupacion ? Number(dg.grupoOcupacion) : null,
      repLegal: da.gerenteRepLegal === true,
      impRenta: da.noPagaImpuestoRenta === true,
      idObs: null,

      fechaSueldo: ds.fechaSalario || null,
      sueldo: ds.salario ? Number(ds.salario) : null,
      valorHora: ds.valorHoraNormal ? Number(ds.valorHoraNormal) : null,
      valorHoraEspe: ds.valorHoraEspecial ? Number(ds.valorHoraEspecial) : null,
      valhorain: ds.incluyeAportacion === true,
      quincena: ds.anticipoQuincenal1 ? Number(ds.anticipoQuincenal1) : null,
      quincenaIi: ds.anticipoQuincenal2 ? Number(ds.anticipoQuincenal2) : null,

      idZona: dg.zona ? Number(dg.zona) : null,
      idLocal: dg.local ? Number(dg.local) : null,
      idGasSri: null,
      idDepartamento: dg.departamento ? Number(dg.departamento) : null,
      fecNac: dg.fechaNacimiento || null,
      idCiudadTrabajo: dg.ciudadTrabajo ? Number(dg.ciudadTrabajo) : null,
      feinivac: da.fechaPagoDecimoInicio || null,
      fefinvac: da.fechaPagoDecimoFin || null,
      establecimiento: da.establecimiento ?? null,
      lmilitar: da.libretaMilitar ?? null,
      idEmpresaComplementaria: da.rucEmpresaComplementaria ? Number(da.rucEmpresaComplementaria) : null
    };

    console.log('SYNC EMPLEADO:', request);

    this.empleadoSyncService.sync(request).subscribe({
      next: (resp) => {
        if (resp.type === 'Success') {
          this.idEmpleadoActual = resp.data;
          this.esNuevoEmpleado = false;
          this.esNuevoEmpleado = false;
          this.guardarCronologia();
          this.guardarHistorialBanco();
          this.guardarCargas();
          this.guardarFormacion();
          this.guardarObservaciones();
          this.guardarGastosSri();
          this.guardarDiscapacidadEmpleado();

          this.mostrarMensajeExito('Empleado guardado correctamente.');
        } else {
          alert(resp.message ?? 'No se pudo guardar el empleado.');
        }
      },
      error: (err) => {
        console.error('Error guardando empleado:', err);
        alert('Error guardando empleado.');
      }
    });
  }
  agregarFilaObservacion(): void {
    if (!this.idEmpleadoActual) {
      alert('Primero debe guardar o seleccionar un empleado.');
      return;
    }

    this.observacionRowData = [
      ...this.observacionRowData,
      {
        idObs: 0,
        idEmpresa: 1,
        idEmpleado: this.idEmpleadoActual,
        fecha: null,
        detalle: null,
        unidadTiempo: null,
        tiempo: null,
        incluirNomina: false,
        idTipoObservacion: 0,
        tipoObservacion: null,
        idDoc: 0,
        idTipoVacacion: 0,
        estado: true,
        modificado: true
      }
    ];
  }
  cargarObservacionesEmpleado(idEmpleado: number): void {
    this.observacionesEmpleadoService.getByEmpleado(idEmpleado).subscribe({
      next: resp => {
        this.observacionRowData = resp.data ?? [];
      },
      error: err => {
        console.error('Error cargando observaciones:', err);
        this.observacionRowData = [];
      }
    });
  }
  guardarObservaciones(): void {
    if (!this.idEmpleadoActual) return;

    const crear = this.observacionRowData
      .filter(x => !x.idObs || x.idObs === 0)
      .map(x => ({
        idEmpresa: x.idEmpresa ?? 1,
        idEmpleado: this.idEmpleadoActual!,
        fecha: x.fecha ?? null,
        detalle: x.detalle ?? null,
        unidadTiempo: x.unidadTiempo ?? null,
        tiempo: x.tiempo ?? null,
        incluirNomina: x.incluirNomina === true,
        idTipoObservacion: Number(x.idTipoObservacion ?? 0),
        idDoc: x.idDoc ?? 0,
        idTipoVacacion: x.idTipoVacacion ?? 0,
        estado: x.estado ?? true
      }));

    const actualizar = this.observacionRowData
      .filter(x => x.idObs && x.idObs > 0 && x.modificado === true)
      .map(x => ({
        idObs: x.idObs,
        idEmpresa: x.idEmpresa ?? 1,
        idEmpleado: this.idEmpleadoActual!,
        fecha: x.fecha ?? null,
        detalle: x.detalle ?? null,
        unidadTiempo: x.unidadTiempo ?? null,
        tiempo: x.tiempo ?? null,
        incluirNomina: x.incluirNomina === true,
        idTipoObservacion: Number(x.idTipoObservacion ?? 0),
        idDoc: x.idDoc ?? 0,
        idTipoVacacion: x.idTipoVacacion ?? 0,
        estado: x.estado ?? true
      }));

    const eliminar = this.observacionEliminados ?? [];

    if (crear.length === 0 && actualizar.length === 0 && eliminar.length === 0) {
      return;
    }

    this.observacionesEmpleadoService.sync({
      crear,
      actualizar,
      eliminar
    }).subscribe({
      next: resp => {
        if (resp.type === 'Success') {
          this.observacionEliminados = [];
          this.cargarObservacionesEmpleado(this.idEmpleadoActual!);
        } else {
          alert(resp.message ?? 'No se pudo guardar observaciones.');
        }
      },
      error: err => {
        console.error('Error guardando observaciones:', err);
        alert('Error guardando observaciones.');
      }
    });
  }
  eliminarFilaObservacion(row: any): void {
    if (!row) return;

    if (row.idObs && row.idObs > 0) {
      this.observacionEliminados.push(row.idObs);
    }

    this.observacionRowData = this.observacionRowData.filter(x => x !== row);
  }
  cargarGastosSriEmpleado(idEmpleado: number): void {
    this.gastosSriEmpleadoService.getByEmpleado(idEmpleado).subscribe({
      next: resp => {
        this.gastosRowData = resp.data ?? [];
      },
      error: err => {
        console.error('Error cargando gastos SRI:', err);
        this.gastosRowData = [];
      }
    });
  }
  agregarFilaGasto(): void {
    if (!this.idEmpleadoActual) {
      alert('Primero debe guardar o seleccionar un empleado.');
      return;
    }

    this.gastosRowData = [
      ...this.gastosRowData,
      {
        idGasSri: 0,
        idEmpresa: 1,
        idEmpleado: this.idEmpleadoActual,
        idTipoGasto: 0,
        tipoGasto: null,
        montoMaximo: null,
        montoProyectado: null,
        montoReal: null,
        modificado: true
      }
    ];
  }
  eliminarFilaGasto(row: any): void {
    if (!row) return;

    if (row.idGasSri && row.idGasSri > 0) {
      this.gastosEliminados.push(row.idGasSri);
    }

    this.gastosRowData = this.gastosRowData.filter(x => x !== row);
  }

  guardarGastosSri(): void {
    if (!this.idEmpleadoActual) return;

    const crear = this.gastosRowData
      .filter(x => !x.idGasSri || x.idGasSri === 0)
      .map(x => ({
        idEmpresa: x.idEmpresa ?? 1,
        idEmpleado: this.idEmpleadoActual!,
        idTipoGasto: Number(x.idTipoGasto ?? 0),
        montoProyectado: x.montoProyectado ? Number(x.montoProyectado) : null,
        montoReal: x.montoReal ? Number(x.montoReal) : null
      }));

    const actualizar = this.gastosRowData
      .filter(x => x.idGasSri && x.idGasSri > 0 && x.modificado === true)
      .map(x => ({
        idGasSri: x.idGasSri,
        idEmpresa: x.idEmpresa ?? 1,
        idEmpleado: this.idEmpleadoActual!,
        idTipoGasto: Number(x.idTipoGasto ?? 0),
        montoProyectado: x.montoProyectado ? Number(x.montoProyectado) : null,
        montoReal: x.montoReal ? Number(x.montoReal) : null
      }));

    const eliminar = this.gastosEliminados ?? [];

    if (crear.length === 0 && actualizar.length === 0 && eliminar.length === 0) {
      return;
    }

    this.gastosSriEmpleadoService.sync({
      crear,
      actualizar,
      eliminar
    }).subscribe({
      next: resp => {
        if (resp.type === 'Success') {
          this.gastosEliminados = [];
          this.cargarGastosSriEmpleado(this.idEmpleadoActual!);
        } else {
          alert(resp.message ?? 'No se pudo guardar gastos SRI.');
        }
      },
      error: err => {
        console.error('Error guardando gastos SRI:', err);
        alert('Error guardando gastos SRI.');
      }
    });
  }
  filtrarEmpleadosBusqueda(): void {
    const texto = (this.form.get('datosGenerales.empleadoBusqueda')?.value ?? '')
      .toString()
      .toLowerCase()
      .trim();

    this.empleadosFiltrados = this.empleadosBusqueda.filter(e =>
      `${e.idEmpleado ?? ''} ${e.nombres ?? ''} ${e.apellidos ?? ''} ${e.documento ?? ''}`
        .toLowerCase()
        .includes(texto)
    );
  }
  seleccionarEmpleadoBusqueda(emp: EmpleadoBusquedaResponse): void {
    this.form.get('datosGenerales.empleadoBusqueda')?.setValue(
      emp.nombreCompleto,
      { emitEvent: false }
    );

    this.limpiarFichaEmpleado();
    this.cargarFichaEmpleado(Number(emp.idEmpleado));
  }
  cargarEmpleadosBusqueda(texto: string = ''): void {
    this.empleadoFichaService.getBusqueda(texto).subscribe({
      next: resp => {
        this.empleadosBusqueda = resp.data ?? [];
        this.empleadosFiltrados = this.empleadosBusqueda;
      },
      error: err => {
        console.error('Error cargando empleados:', err);
        this.empleadosBusqueda = [];
        this.empleadosFiltrados = [];
      }
    });
  }
  limpiarBusquedaEmpleado(): void {
    this.form.get('datosGenerales.empleadoBusqueda')?.setValue('');
    this.empleadosFiltrados = [];
  }
 cargarDiscapacidadEmpleado(
  idEmpleado: number
): void {

  this.empleadoDiscapacidadService
    .getByEmpleado(idEmpleado)
    .subscribe({

      next: (resp) => {

        // =====================================================
        // SI NO EXISTEN DATOS DE DISCAPACIDAD
        // =====================================================

        if (!resp.data) {

          this.form.patchValue(
            {
              datosEspeciales: {

                residenciaTrabajador: '',
                aplicaConvenio: '',
                sistemaSalarioNeto: '',
                paisResidencia: '',

                carnetConadis: '',
                condicionTrabajador: '',
                idTipoDiscapacidad: null,
                porcentajeDiscapacidad: '',
                descripcionDiscapacidad: '',
                
                identificacion: '',
                nombreDiscapacidad: '',

                ingresosAgraviados: '',
                aportePersonalIess: '',
                valorImpuestoRetenido: '',
                compensacionEconomicaDigna: ''

                /*
                 * IMPORTANTE:
                 *
                 * NO tocar:
                 * discapacitado
                 *
                 * Ese valor viene de:
                 * RpMaeEmp.discap
                 */
              }
            },
            {
              emitEvent: false
            }
          );

          return;
        }


        const dis =
          resp.data;


        // =====================================================
        // CARGAR INFORMACIÓN ADICIONAL
        // =====================================================

        this.form.patchValue(
          {
            datosEspeciales: {

              residenciaTrabajador:
                dis.recidenciaEmp ?? '',

              aplicaConvenio:
                dis.convenioEmp ?? '',

              sistemaSalarioNeto:
                dis.sisSalNetEmp ?? '',

              paisResidencia:
                dis.pais ?? '',


              // ===============================================
              // DISCAPACIDAD
              // ===============================================

              carnetConadis:
                dis.carnetConadis ?? '',

              condicionTrabajador:
                dis.codCondDiscap ?? '',

              idTipoDiscapacidad:
                dis.idTipoDiscapacidad
                  ? Number(
                      dis.idTipoDiscapacidad
                    )
                  : null,

              porcentajeDiscapacidad:
                dis.porcentajeDiscap ?? '',

              descripcionDiscapacidad:
                dis.descripcionDiscap ?? '',


              // ===============================================
              // PERSONA / SUSTITUTO
              // ===============================================

              identificacion:
                dis.cedulaDis ?? '',

              nombreDiscapacidad:
                dis.nombreDis ?? '',


              // ===============================================
              // OTROS DATOS
              // ===============================================

              ingresosAgraviados:
                dis.ingresosGravOtroEmp !== null &&
                dis.ingresosGravOtroEmp !== undefined
                  ? String(
                      dis.ingresosGravOtroEmp
                    )
                  : '',

              aportePersonalIess:
                dis.aporteIessOtroEmp !== null &&
                dis.aporteIessOtroEmp !== undefined
                  ? String(
                      dis.aporteIessOtroEmp
                    )
                  : '',

              valorImpuestoRetenido:
                dis.impuestoRetOtroEmp !== null &&
                dis.impuestoRetOtroEmp !== undefined
                  ? String(
                      dis.impuestoRetOtroEmp
                    )
                  : '',

              compensacionEconomicaDigna:
                dis.compEconSalarioDigno !== null &&
                dis.compEconSalarioDigno !== undefined
                  ? String(
                      dis.compEconSalarioDigno
                    )
                  : ''

              /*
               * NO agregar:
               *
               * discapacitado: !!dis.idTipoDiscapacidad
               *
               * porque eso vuelve a marcar el checkbox.
               */
            }
          },
          {
            emitEvent: false
          }
        );

      },


      error: (err) => {

        console.error(
          'Error cargando discapacidad',
          err
        );

      }

    });

}
  private toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const n = Number(value);
    return isNaN(n) ? null : n;
  }
  guardarDiscapacidadEmpleado(): void {
    if (!this.idEmpleadoActual) {
      return;
    }

    const de = this.form.get('datosEspeciales')?.value;

    const request = {
      idEmpleado: this.idEmpleadoActual,
      idEmpresa: 1,
      idTipoDiscapacidad: this.toNumberOrNull(de.idTipoDiscapacidad),

      cedulaDis: de.identificacion ?? null,
      nombreDis: de.nombreDiscapacidad ?? null,
      recidenciaEmp: de.residenciaTrabajador ?? null,
      idPais: this.toNumberOrNull(de.paisResidencia),

      convenioEmp: de.aplicaConvenio ?? null,
      sisSalNetEmp: de.sistemaSalarioNeto ?? null,
      codCondDiscap: de.condicionTrabajador ?? null,

      codTipoDiscap: de.idTipoDiscapacidad
        ? String(de.idTipoDiscapacidad)
        : null,

      porcentajeDiscap: de.porcentajeDiscapacidad ?? null,
      carnetConadis: de.carnetConadis ?? null,
      descripcionDiscap: de.descripcionDiscapacidad ?? null,

      ingresosGravOtroEmp: this.toNumberOrNull(de.ingresosAgraviados),
      aporteIessOtroEmp: this.toNumberOrNull(de.aportePersonalIess),
      impuestoRetOtroEmp: this.toNumberOrNull(de.valorImpuestoRetenido),
      compEconSalarioDigno: this.toNumberOrNull(de.compensacionEconomicaDigna)
    };

    this.empleadoDiscapacidadService.sync(request).subscribe({
      next: resp => {
        if (resp.type === 'Success') {
          this.cargarDiscapacidadEmpleado(this.idEmpleadoActual!);
        } else {
          alert(resp.message ?? 'No se pudo guardar discapacidad.');
        }
      },
      error: err => {
        console.error('Error guardando discapacidad:', err);
        alert('Error guardando discapacidad.');
      }
    });
  }
private mostrarMensajeExito(mensaje: string): void {
  this.dialog.open(CustomMessageBoxComponent, {
    width: '400px',
    disableClose: true,
    data: {
      title: 'Proceso completado',
      message: mensaje,
      type: 'success',
      confirmText: 'Continuar',
      showCancel: false
    }
  });
}

private mostrarMensajeError(mensaje: string): void {
  this.dialog.open(CustomMessageBoxComponent, {
    width: '450px',
    disableClose: true,
    data: {
      title: 'Error',
      message: mensaje,
      type: 'error',
      confirmText: 'Aceptar',
      showCancel: false
    }
  });
}
private cargarCiudades(): void {
  this.ciudadService.obtenerCiudad().subscribe({
    next: data => {
      this.ciudades = (data ?? []).map(c => ({
        ...c,
        id_ciudad: Number(c.id_ciudad),
        idzona: Number(c.idzona)
      }));

      this.ciudadesFiltradas =
        this.ciudades.slice(0, 100);

      this.ciudadesTrabajoFiltradas =
        this.ciudades.slice(0, 100);

      this.mostrarCiudadesEmpleado(
        this.idCiudadPendiente,
        this.idCiudadTrabajoPendiente
      );
    },

    error: err => {
      console.error(
        'Error al cargar ciudades:',
        err
      );

      this.ciudades = [];
      this.ciudadesFiltradas = [];
      this.ciudadesTrabajoFiltradas = [];
    }
  });
}
private configurarBusquedaCiudades(): void {
  this.ciudadCtrl.valueChanges
    .pipe(
      debounceTime(250),
      distinctUntilChanged()
    )
    .subscribe(valor => {
      this.ciudadesFiltradas = this.filtrarCiudades(valor);
    });

  this.ciudadTrabajoCtrl.valueChanges
    .pipe(
      debounceTime(250),
      distinctUntilChanged()
    )
    .subscribe(valor => {
      this.ciudadesTrabajoFiltradas = this.filtrarCiudades(valor);
    });
}
private filtrarCiudades(valor: string | Ciudad | null): Ciudad[] {
  if (typeof valor === 'object' && valor !== null) {
    return [valor];
  }

  const texto = (valor ?? '')
    .toString()
    .toLowerCase()
    .trim();

  if (!texto) {
    return this.ciudades.slice(0, 100);
  }

  return this.ciudades
    .filter(c =>
      `${c.ciudad ?? ''} ${c.canton ?? ''} ${c.provincia ?? ''} ${c.codigo ?? ''}`
        .toLowerCase()
        .includes(texto)
    )
    .slice(0, 100);
}
displayCiudad(ciudad: Ciudad | string | null): string {
  if (!ciudad) {
    return '';
  }

  if (typeof ciudad === 'string') {
    return ciudad;
  }

  return [
    ciudad.ciudad,
    ciudad.canton,
    ciudad.provincia
  ]
    .filter(Boolean)
    .join(' - ');
}
seleccionarCiudad(ciudad: Ciudad): void {
  this.form
    .get('datosGenerales.ciudad')
    ?.setValue(Number(ciudad.id_ciudad));

  this.ciudadCtrl.setValue(ciudad, {
    emitEvent: false
  });
}
seleccionarCiudadTrabajo(ciudad: Ciudad): void {
  this.form
    .get('datosGenerales.ciudadTrabajo')
    ?.setValue(Number(ciudad.id_ciudad));

  this.ciudadTrabajoCtrl.setValue(ciudad, {
    emitEvent: false
  });
}
limpiarCiudad(): void {
  this.ciudadCtrl.setValue('', {
    emitEvent: false
  });

  this.form
    .get('datosGenerales.ciudad')
    ?.setValue(null);

  this.ciudadesFiltradas = this.ciudades.slice(0, 100);
}

limpiarCiudadTrabajo(): void {
  this.ciudadTrabajoCtrl.setValue('', {
    emitEvent: false
  });

  this.form
    .get('datosGenerales.ciudadTrabajo')
    ?.setValue(null);

  this.ciudadesTrabajoFiltradas = this.ciudades.slice(0, 100);
}
private mostrarCiudadesEmpleado(
  idCiudad: number | null,
  idCiudadTrabajo: number | null
): void {
  const ciudad = idCiudad
    ? this.ciudades.find(
        c =>
          Number(c.id_ciudad) ===
          Number(idCiudad)
      )
    : undefined;

  const ciudadTrabajo = idCiudadTrabajo
    ? this.ciudades.find(
        c =>
          Number(c.id_ciudad) ===
          Number(idCiudadTrabajo)
      )
    : undefined;

  this.ciudadCtrl.setValue(
    ciudad ?? '',
    { emitEvent: false }
  );

  this.ciudadTrabajoCtrl.setValue(
    ciudadTrabajo ?? '',
    { emitEvent: false }
  );
}
private idCiudadPendiente: number | null = null;
private idCiudadTrabajoPendiente: number | null = null;
}
