import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { ClienteService } from 'src/app/services/cliente.service';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { GlnService } from 'src/app/services/gln.service';
import { ProductoAdicionalService,ApiResponse } from 'src/app/services/producto-adicional.service';
import { Codigos14Service } from 'src/app/services/codigos14.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { ExportService } from 'src/app/services/export.service';
import { EmpresaService } from 'src/app/services/empresa.service';
import { LogoService } from 'src/app/services/logo.service';

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
import { AuditoriaTransferenciaService } from 'src/app/services/auditoria-transferencia.service';

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
    MatMenuModule
  ]
})
export class TraspasoPrefijosComponent implements OnInit {

  activeTab: string = 'Transferir';
  filtroBusqueda: string = '';
  filtroCliente: string = '';
  botonActivo: string = '';

  clienteOrigenControl = new FormControl('');
  clienteDestinoControl = new FormControl('');

  clientesOrigenFiltrados: ClienteSummary[] = [];
  clientesDestinoFiltrados: ClienteSummary[] = [];

  prefijosClienteOrigen: (PrefijoClienteTResponse & { seleccionado?: boolean })[] = [];
  prefijosClienteDestino: PrefijoClienteTResponse[] = [];

  codcliO: number = 0;
  codcliD: number = 0;
  usuarioActual = this.usuarioService.getUsuarioActual();
  listado = []; // Para evitar errores de plantilla
  asignaciones = []; // Para evitar errores de plantilla

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

  ) { }

  ngOnInit(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
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
  }

  seleccionarClienteOrigen(cliente: ClienteSummary): void {
    if (!cliente || !cliente.clientes_codigo) return;
    this.prefijoService.obtenerPorClienteCodigo(cliente.clientes_codigo)
      .subscribe(prefijos => {
        this.prefijosClienteOrigen = prefijos.map(p => ({ ...p, seleccionado: false }));
        this.codcliO = cliente.clientes_codigo;
      });
  }

  seleccionarClienteDestino(cliente: ClienteSummary): void {
    if (!cliente || !cliente.clientes_codigo) return;
    this.prefijoService.obtenerPorClienteCodigo(cliente.clientes_codigo)
      .subscribe(prefijos => {
        this.prefijosClienteDestino = prefijos;
        this.codcliD = cliente.clientes_codigo;
      });
  }

  cambiarTab(tab: string): void {
    this.activeTab = tab;
  }

  seleccionarBoton(nombre: string): void {
    this.botonActivo = nombre;
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
    if (!result) {
      console.log('Transferencia cancelada');
      return;
    }

    console.log('Prefijos a transferir:', seleccionados.map(p => p.id_prefijos));
    let errores: string[] = [];

    for (const prefijo of seleccionados) {
      try {
        // 1. Auditoría
        const auditoriaResp = await this.auditoriaTransferenciaService.crearAuditoriaTransferencia({
          clientesCodigoOrigen: this.codcliO,
          clientesCodigoDestino: this.codcliD,
          fecha: new Date().toISOString(),
          idPrefijos: prefijo.id_prefijos,
          idUsuario: this.usuarioActual?.id_usuario || 1,
          tipo: prefijo.bandera === 0 ? 'NACIONAL' : 'INTER'
        }).toPromise();

        if (!auditoriaResp?.data) {
          errores.push(`❌ No se registró auditoría para prefijo ${prefijo.id_prefijos}`);
          continue;
        }

        // 2. Actualizar Cliente en Prefijo
        await this.prefijoService.actualizarClientesCodigoDePrefijo(prefijo.id_prefijos, this.codcliD).toPromise();
        console.log(`✔ Prefijo ${prefijo.id_prefijos} actualizado con codcliD ${this.codcliD}`);

        // 3. Actualizar GLN
        const glnResp = await this.glnService.actualizarGlnClientesCodigoPorIdPrefijo({
          idPrefijos: prefijo.id_prefijos,
          clientesCodigo: this.codcliD
        }).toPromise();

        if (!glnResp?.data) {
          errores.push(`⚠ GLN no actualizado para prefijo ${prefijo.id_prefijos}`);
        } else {
          console.log(`✔ GLN actualizado para prefijo ${prefijo.id_prefijos}`);
        }

        // 4. Actualizar ProductoDatosAdicionales
        const prodResp = await this.productoAdicionalService.actualizarCodigosClientePorIdPrefijos(prefijo.id_prefijos, this.codcliD).toPromise();

        if (!prodResp?.data) {
          errores.push(`⚠ ProductoDatosAdicionales no actualizado para prefijo ${prefijo.id_prefijos}`);
        } else {
          console.log(`✔ ProductoDatosAdicionales actualizado para prefijo ${prefijo.id_prefijos}`);
        }

        // 5. Actualizar Codigos14
        const cod14Resp = await this.codigos14Service.actualizarClientesCodigo14PorIdPrefijos({
          idPrefijos: prefijo.id_prefijos,
          clientesCodigo: this.codcliD
        }).toPromise();
       
        if (!cod14Resp?.data) {
          errores.push(`⚠ Codigos14 no actualizado para prefijo ${prefijo.id_prefijos}`);
        } else {
          console.log(`✔ Codigos14 actualizado para prefijo ${prefijo.id_prefijos}`);
        }

      } catch (err: any) {
        errores.push(`❌ Error en prefijo ${prefijo.id_prefijos}: ${err.message}`);
      }
    }

    if (errores.length > 0) {
      this.mostrarAlerta(`Algunos errores ocurrieron:\n${errores.join('\n')}`, 'warning');
    } else {
      this.mostrarAlerta('✅ Todos los prefijos fueron transferidos correctamente', 'success');
    }
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

  mostrarAlerta(mensaje: string, tipo: string) {
    this._snackBar.open(mensaje, tipo, {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3000
    });
  }

  guardarTransferencia(): void {
    const seleccionados = this.prefijosClienteOrigen.filter(p => p.seleccionado); // ✅ corregido

    if (seleccionados.length === 0) {
      this._snackBar.open('Debe seleccionar al menos un prefijo', 'Advertencia', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
      return;
    }

    seleccionados.forEach(prefijo => {
      const tipo = prefijo.bandera === 0 ? 'Nacional' : 'Internacional';
      this.auditoriaTransferenciaService.crearAuditoriaTransferencia({
        clientesCodigoOrigen: this.codcliO,
        clientesCodigoDestino: this.codcliD,
        fecha: new Date().toISOString(),
        idPrefijos: prefijo.id_prefijos, // ✅ usa id_prefijos
        idUsuario: this.usuarioActual?.id_usuario || 1,
        tipo: tipo
      }).subscribe(resp => {
        if (resp.data) {
          console.log(`✔ Auditoría registrada para ID ${prefijo.id_prefijos}`);
        } else {
          console.warn(`❌ Error al registrar auditoría para ID ${prefijo.id_prefijos}:`, resp.message);
        }
      });
    });
  }

  actualizarClientesCodigoDePrefijosSeleccionados(): void {

    const seleccionados = this.prefijosClienteOrigen.filter(p => p.seleccionado);

    if (seleccionados.length === 0) {
      this._snackBar.open('Debe seleccionar al menos un prefijo para actualizar', 'Advertencia', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
      return;
    }

    seleccionados.forEach(prefijo => {
      this.prefijoService.actualizarClientesCodigoDePrefijo(prefijo.id_prefijos, this.codcliD)
        .subscribe({
          next: () => {
            console.log(`✔ Prefijo ${prefijo.id_prefijos} actualizado con codcliD ${this.codcliD}`);
          },
          error: err => {
            console.error(`❌ Error actualizando prefijo ${prefijo.id_prefijos}:`, err);
          }
        });
    });

  }

  



}
