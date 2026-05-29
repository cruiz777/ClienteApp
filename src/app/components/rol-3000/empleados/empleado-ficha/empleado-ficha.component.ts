import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
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
  EmpleadoFichaResponse
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
  ciudadesTrabajo: Ciudad[] = [];
  nacionalidades: NacionalidadResponse[] = [];
  gruposOcupacionales: RpGrupoOcupacional[] = [];
  regimenes: RpRegimenResponse[] = [];
  tiposSangre: RpTipoSangreResponse[] = [];
  tiposContrato: RpTipoContrato[] = [];
  cronologiaRowData: RpMaeEmpCronologiaResponse[] = [];
  idEmpleadoActual: number | null = null;
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

  gastosRowData: any[] = [];

  gastosColumnDefs: ColDef[] = [
    {
      headerName: 'Código',
      field: 'codigo',
      width: 120
    },
    {
      headerName: 'Tipo de Gasto',
      field: 'tipoGasto',
      minWidth: 220,
      flex: 1
    },
    {
      headerName: 'Monto Máximo',
      field: 'montoMaximo',
      width: 160,
      type: 'numericColumn'
    },
    {
      headerName: 'Valor Proyectado',
      field: 'valorProyectado',
      width: 170,
      type: 'numericColumn',
      editable: true
    },
    {
      headerName: 'Valor Real',
      field: 'valorReal',
      width: 160,
      type: 'numericColumn',
      editable: true
    }
  ];

  gastosDefaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: false
  };
  observacionRowData: any[] = [];

  observacionColumnDefs: ColDef[] = [
    {
      headerName: 'Fecha',
      field: 'fecha',
      width: 160
    },
    {
      headerName: 'Usuario',
      field: 'usuario',
      width: 180
    },
    {
      headerName: 'Tipo',
      field: 'tipo',
      width: 160
    },
    {
      headerName: 'Observación',
      field: 'observacion',
      flex: 1,
      minWidth: 300,
      editable: true,
      wrapText: true,
      autoHeight: true
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
  ) { }

  ngOnInit(): void {
    this.crearFormulario();
    this.cargarCatalogos();
  }

  crearFormulario(): void {
    this.form = this.fb.group({
      datosGenerales: this.fb.group({
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
        tipoDiscapacidad: [''],
        porcentajeDiscapacidad: [''],
        discapacitadoSustituto: [false],
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
      ciudades: this.ciudadService.obtenerCiudad(),
      ciudadesTrabajo: this.ciudadService.obtenerCiudad(),
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

    }).subscribe({
      next: ({ departamentos, cargos, tiposEmpleado, tiposDocumento, estadosCivil, generos, locales, zonas, ciudades, ciudadesTrabajo, nacionalidades, gruposOcupacionales, regimenes, tiposSangre, tiposContrato, bancos, formasPago, bancosTerceros, tiposCuentaBanco, sectoriales, tiposDiscapacidad, nivelInstruccion }) => {
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
        this.ciudades = ciudades.map(c => ({
          ...c,
          id_ciudad: Number(c.id_ciudad)
        }));
        this.ciudadesTrabajo = ciudadesTrabajo.map(c => ({
          ...c,
          id_ciudad: Number(c.id_ciudad)
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
        if (resp.type !== 'LIST' || !resp.data || resp.data.length === 0) {
          console.warn(resp.message || 'No se encontró empleado');
          return;
        }

        const emp: EmpleadoFichaResponse = resp.data[0];
        this.idEmpleadoActual = Number(emp.idEmpleado);
        if (this.idEmpleadoActual && !isNaN(this.idEmpleadoActual)) {
          this.cargarCronologiaEmpleado(this.idEmpleadoActual);
          this.cargarHistorialBancoEmpleado(this.idEmpleadoActual);
          this.cargarCargasEmpleado(this.idEmpleadoActual);
          this.cargarFormacionEmpleado(this.idEmpleadoActual);
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
        const tieneSueldo = emp.sueldo !== null && emp.sueldo !== undefined && Number(emp.sueldo) !== 0;
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
            linkFoto: emp.foto ?? null,



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
            valorHoraEspecial: emp.valor_hora_espe ?? 0,

          },

          datosAcademicos: {
            empleado: nombreCompleto
          },

          datosEspeciales: {
            empleado: nombreCompleto,
            identificacion: emp.documento ?? '',
            discapacitado: emp.discap === true
          }
        });
        this.aplicarReglaSueldo(sueldoEmpleado);
      },
      error: (err: any) => {
        console.error('Error al cargar ficha de empleado:', err);
      }
    });

  }

  nuevo(): void {
    this.form.reset({
      datosGenerales: {
        tipoDocumento: null,
        sexo: null,
        departamento: null,
        cargo: null,
        tipoEmpleado: null
      }
    });
  }

  grabar(): void {
    this.guardarCronologia();
    this.guardarHistorialBanco();
    this.guardarCargas();
    this.guardarFormacion();
  }

  borrar(): void {
    console.log('Borrar');
  }

  cancelar(): void {
    console.log('Cancelar');
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
          alert('Cronología guardada correctamente.');
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
        discapacitado: false
      }
    }, { emitEvent: false });
  }
}