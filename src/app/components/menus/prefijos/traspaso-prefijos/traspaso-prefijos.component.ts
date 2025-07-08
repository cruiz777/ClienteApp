import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { ClienteService } from 'src/app/services/cliente.service';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { GlnService } from 'src/app/services/gln.service';
import { ProductoAdicionalService } from 'src/app/services/producto-adicional.service';
import { Codigos14Service } from 'src/app/services/codigos14.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { ExportService } from 'src/app/services/export.service';
import { EmpresaService } from 'src/app/services/empresa.service';
import { LogoService } from 'src/app/services/logo.service';
import { AuditoriaTransferenciaService, AuditoriaTransferenciaResponse } from 'src/app/services/auditoria-transferencia.service';
import { CuponService } from 'src/app/services/cupones.service';
import { SsccService } from 'src/app/services/sscc.service';

import { ClienteSummary } from 'src/app/interfaces/responses/cliente-summary-response';
import { PrefijoClienteTResponse } from 'src/app/interfaces/responses/PrefijoClienteResponse';

import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import { AfterViewInit } from '@angular/core';
import { MatPaginatorModule } from '@angular/material/paginator';
import { ExportOptions } from 'src/app/interfaces/export-options';
@Component({
  selector: 'app-traspaso-prefijos',
  standalone: true,
  templateUrl: './traspaso-prefijos.component.html',
  styleUrls: ['./traspaso-prefijos.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatButtonModule,
    MatMenuModule,
    MatPaginator,
    MatTableModule,
    MatPaginatorModule  
  ]
})
export class TraspasoPrefijosComponent implements OnInit, AfterViewInit {

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  activeTab: string = 'Transferir';

  filtroCliente: string = '';
  botonActivo: string = '';

  clienteOrigenControl = new FormControl('');
  clienteDestinoControl = new FormControl('');
   clienteEntidadControl = new FormControl('');

  clientesOrigenFiltrados: ClienteSummary[] = [];
  clientesDestinoFiltrados: ClienteSummary[] = [];
  clientesEntidadFiltrados: ClienteSummary[] = [];

  prefijosClienteOrigen: (PrefijoClienteTResponse & { seleccionado?: boolean })[] = [];
  prefijosClienteDestino: PrefijoClienteTResponse[] = [];
  prefijosClienteEntidad: (PrefijoClienteTResponse & { seleccionado?: boolean })[] = [];
  codcliO: number = 0;
  codcliD: number = 0;
    codcliE: number = 0;
  usuarioActual = this.usuarioService.getUsuarioActual();
  auditoriasTransferencia = new MatTableDataSource<AuditoriaTransferenciaResponse>();
  displayedColumns: string[] = ['index', 'prefijo', 'origen', 'rucOrigen', 'destino', 'rucDestino', 'fecha'];
  logoUrl: string = '';
  constructor(
    private clienteService: ClienteService,
    private prefijoService: PrefijoService,
    private glnService: GlnService,
    private codigos14Service: Codigos14Service,
    private productoAdicionalService: ProductoAdicionalService,
    private usuarioService: UsuarioService,
    private exportService: ExportService,
    private empresaService: EmpresaService,
    private logoService: LogoService,
    private dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private auditoriaTransferenciaService: AuditoriaTransferenciaService,
    private cuponService: CuponService,
    private ssccService: SsccService
  ) {}

  ngOnInit(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    this.cargarAuditorias();

    this.clienteOrigenControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(valor => {
          const filtro = typeof valor === 'string' ? valor.trim() : '';
          return filtro ? this.clienteService.getClientesSummary(filtro) : of({ data: [] });
        })
      )
      .subscribe(resp => this.clientesOrigenFiltrados = resp.data || []);

    this.clienteDestinoControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(valor => {
          const filtro = typeof valor === 'string' ? valor.trim() : '';
          return filtro ? this.clienteService.getClientesSummary(filtro) : of({ data: [] });
        })
      )
      .subscribe(resp => this.clientesDestinoFiltrados = resp.data || []);

      this.clienteEntidadControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(valor => {
          const filtro = typeof valor === 'string' ? valor.trim() : '';
          return filtro ? this.clienteService.getClientesSummary(filtro) : of({ data: [] });
        })
      )
      .subscribe(resp => this.clientesEntidadFiltrados = resp.data || []);
      
  }

  mostrarNombreCliente(cliente: any): string {
    return cliente ? cliente.nomcli : '';
  }

  onNuevaBusqueda(): void {
    this.clienteOrigenControl.setValue('');
    this.clienteDestinoControl.setValue('');
    this.clientesOrigenFiltrados = [];
    this.clientesDestinoFiltrados = [];
    this.prefijosClienteOrigen = [];
    this.prefijosClienteDestino = [];
    this.prefijosClienteEntidad=[];
  }

  seleccionarClienteOrigen(cliente: ClienteSummary): void {
    if (!cliente?.clientes_codigo) return;
    this.prefijoService.obtenerPorClienteCodigo(cliente.clientes_codigo)
      .subscribe(prefijos => {
        this.prefijosClienteOrigen = prefijos.map(p => ({ ...p, seleccionado: false }));
        this.codcliO = cliente.clientes_codigo;
      });
  }


  seleccionarClienteDestino(cliente: ClienteSummary): void {
    if (!cliente?.clientes_codigo) return;
    this.prefijoService.obtenerPorClienteCodigo(cliente.clientes_codigo)
      .subscribe(prefijos => {
        this.prefijosClienteDestino = prefijos;
        this.codcliD = cliente.clientes_codigo;
      });
  
  }

   seleccionarClienteEntidad(cliente: ClienteSummary): void {
    if (!cliente?.clientes_codigo) return;
    this.prefijoService.obtenerPorClienteCodigo(cliente.clientes_codigo)
      .subscribe(prefijos => {
        this.prefijosClienteEntidad = prefijos.map(p => ({ ...p, seleccionado: false }));
        this.codcliE = cliente.clientes_codigo;
      });
  }

  cambiarTab(tab: string): void {
  this.activeTab = tab;

  if (tab === 'Listado') {
    // Esperar al renderizado del paginator
    setTimeout(() => {
      if (this.paginator) {
        this.auditoriasTransferencia.paginator = this.paginator;
        console.log('Paginator asignado en tab Listado:', this.paginator);
      } else {
        console.warn('Paginator aún no disponible al cambiar de tab');
      }
    });
  }
}


  seleccionarBoton(nombre: string): void {
    this.botonActivo = nombre;
  }

  mostrarAlerta(mensaje: string, tipo: string): void {
    this._snackBar.open(mensaje, tipo, {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
cargarAuditorias(): void {
  this.auditoriaTransferenciaService.getAuditoriasTransferencia()
    .subscribe(data => {
      this.auditoriasTransferencia = new MatTableDataSource<AuditoriaTransferenciaResponse>(data);
      setTimeout(() => {
        this.auditoriasTransferencia.paginator = this.paginator;
      });
    });
}


  exportarPDF(): void {
    console.log('Exportar PDF');
    this.mostrarAlerta('Exportación PDF simulada', 'info');
  }

  exportarExcel(): void {
    console.log('Exportar Excel');
    this.mostrarAlerta('Exportación Excel simulada', 'info');
  }

  onBuscar(filtro: string): void {
    console.log('Buscar con filtro:', filtro);
    this.mostrarAlerta(`Filtro aplicado: ${filtro}`, 'info');
  }

  onAsignar(): void {
    const seleccionados = this.prefijosClienteOrigen.filter(p => p.seleccionado);
    if (seleccionados.length === 0) {
      this.mostrarAlerta('Debe seleccionar al menos un prefijo para transferir.', 'warning');
      return;
    }

    if (this.codcliO === this.codcliD) {
      this.mostrarAlerta('Los clientes origen y destino deben ser diferentes.', 'warning');
      return;
    }

    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: '¿Desea confirmar?',
        message: `¿Está seguro que desea transferir los ${seleccionados.length} prefijos seleccionados?`,
        type: 'info',
        confirmText: 'Sí, transferir',
        cancelText: 'Cancelar',
        showCancel: true
      }
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (!result) return;

      let errores: string[] = [];

      for (const prefijo of seleccionados) {
        try {
          const auditoriaResp = await this.auditoriaTransferenciaService.crearAuditoriaTransferencia({
            clientesCodigoOrigen: this.codcliO,
            clientesCodigoDestino: this.codcliD,
            fecha: new Date().toISOString(),
            idPrefijos: prefijo.id_prefijos,
            idUsuario: this.usuarioActual?.id_usuario || 1,
            tipo: prefijo.bandera === 0 ? 'NACIONAL' : 'INTER'
          }).toPromise();

          if (!auditoriaResp?.data) {
            errores.push(`❌ Auditoría no registrada para prefijo ${prefijo.id_prefijos}`);
            continue;
          }

          await this.prefijoService.actualizarClientesCodigoDePrefijo(prefijo.id_prefijos, this.codcliD).toPromise();
          await this.glnService.actualizarGlnClientesCodigoPorIdPrefijo({ idPrefijos: prefijo.id_prefijos, clientesCodigo: this.codcliD }).toPromise();
          await this.productoAdicionalService.actualizarCodigosClientePorIdPrefijos(prefijo.id_prefijos, this.codcliD).toPromise();
          await this.codigos14Service.actualizarClientesCodigo14PorIdPrefijos({ idPrefijos: prefijo.id_prefijos, clientesCodigo: this.codcliD }).toPromise();
          debugger
          await this.cuponService.actualizarClientePorPrefijo(prefijo.id_prefijos, this.codcliD).toPromise();
          await this.ssccService.actualizarClientePorPrefijo(prefijo.id_prefijos, this.codcliD).toPromise();
          

        } catch (err: any) {
         // errores.push(`❌ Error en prefijo ${prefijo.id_prefijos}: ${err.message}`);
        }
      }

      if (errores.length > 0) {
        this.mostrarAlerta(`Errores:\n${errores.join('\n')}`, 'warning');
      } else {
        this.mostrarAlerta('✅ Transferencia completada con éxito', 'success');
      }

      this.cargarAuditorias();
    });
  }
  seleccionarUnico(seleccionadoItem: any): void {
  this.prefijosClienteEntidad.forEach(item => {
    item.seleccionado = false;
  });
  seleccionadoItem.seleccionado = true;
}


asignarOrdenPrefijo(): void {
  // Buscar el que tiene orden = 1
  const seleccionado = this.prefijosClienteEntidad.find(p => p.orden === 1);

  if (!seleccionado) {
    this._snackBar.open('⚠️ Debe seleccionar un prefijo.', 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['snackbar-warning']
    });
    return;
  }

  const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
    width: '400px',
    data: {
      title: 'Confirmar asignación',
      message: `¿Está seguro que desea asignar el prefijo "${seleccionado.codpre}" como Entidad (orden 1)?`,
      type: 'info',
      confirmText: 'Sí, asignar',
      cancelText: 'Cancelar',
      showCancel: true
    }
  });

  dialogRef.afterClosed().subscribe(resultado => {
    if (resultado) {
      const actualizaciones = this.prefijosClienteEntidad.map(p => {
        return {
          idPrefijos: p.id_prefijos,
          orden: p.orden === 1 ? 1 : 0  // ya está marcado en la tabla
        };
      });

      const observables = actualizaciones.map(p =>
        this.prefijoService.actualizarOrdenDePrefijo(p.idPrefijos, p.orden)
      );

      forkJoin(observables).subscribe({
        next: () => {
          this._snackBar.open('✅ Orden actualizado correctamente.', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['snackbar-success']
          });
        },
        error: (err) => {
          console.error('Error al actualizar orden:', err);
          this._snackBar.open('❌ Error al actualizar el orden.', 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['snackbar-error']
          });
        }
      });
    }
  });
}




onNuevaBusqueda2(): void {
    this.clienteOrigenControl.setValue('');
    this.clienteDestinoControl.setValue('');
    this.clienteEntidadControl.setValue('');
    this.clientesOrigenFiltrados = [];
    this.clientesDestinoFiltrados = [];
    this.prefijosClienteOrigen = [];
    this.prefijosClienteDestino = [];
    this.prefijosClienteEntidad=[];
    
  }
seleccionarUnico2(prefijoSeleccionado: any): void {
  this.prefijosClienteEntidad.forEach(p => {
    if (p === prefijoSeleccionado) {
      p.orden = 1;
    } else {
      p.orden = 0;
    }
  });
}
ngAfterViewInit(): void {
  console.log('Paginator:', this.paginator);
  this.auditoriasTransferencia.paginator = this.paginator;
}
private _filtroBusqueda: string = '';
get filtroBusqueda(): string {
  return this._filtroBusqueda;
}
set filtroBusqueda(value: string) {
  this._filtroBusqueda = value;
  this.auditoriasTransferencia.filter = value.trim().toLowerCase();
}

exportar(tipo: 'excel' | 'pdf'): void {
  const headers = ['Prefijo', 'Empresa Anterior', 'RUC Anterior', 'Empresa Actual', 'RUC Actual', 'Fecha'];
  const columns = ['prefijo', 'origen', 'rucOrigen', 'destino', 'rucDestino', 'fecha'];

  const data = this.auditoriasTransferencia.data.map(item => ({
    prefijo: item.prefijo,
    origen: item.origen,
    rucOrigen: item.rucOrigen,
    destino: item.destino,
    rucDestino: item.rucDestino,
    fecha: item.fecha
      ? new Date(item.fecha).toLocaleDateString('es-EC', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : ''
  }));

  const options: ExportOptions = {
    data,
    columns,
    headers,
    filename: 'ListadoPrefijosTransferencia',
    title: 'ListadoPrefijosTransferencia',
    logoUrl: this.logoUrl
  };

  if (tipo === 'excel') {
    this.exportService.exportarExcel(options);
  } else {
    this.exportService.exportarPDF(options);
  }
}



}
