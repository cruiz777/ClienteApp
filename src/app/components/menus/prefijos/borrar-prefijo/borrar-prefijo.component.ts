import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { formatDate } from '@angular/common';
import { CustomValidators } from 'src/app/components/utils/validators/validator.util';
import { ProductoAdicionalService } from 'src/app/services/producto-adicional.service';
import { GlnService } from 'src/app/services/gln.service';
import { AuditoriaPrefijo, AuditoriaPrefijosService } from 'src/app/services/auditoria-prefijos.service';
import { UsuarioService } from '../../../../services/usuario.service';
import { ExportService } from 'src/app/services/export.service';
import { ExportOptions } from 'src/app/interfaces/export-options';
import { EmpresaService } from 'src/app/services/empresa.service';
import { LogoService } from 'src/app/services/logo.service';
import { CuponService } from 'src/app/services/cupones.service';
import { SsccService } from 'src/app/services/sscc.service';
import { PermissionsService } from 'src/app/services/permission.service';
import { MatTooltipModule } from '@angular/material/tooltip';
@Component({
  selector: 'app-borrar-prefijo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './borrar-prefijo.component.html',
  styleUrl: './borrar-prefijo.component.css'
})
export class BorrarPrefijoComponent implements OnInit {
  CustomValidators = CustomValidators;
  activeTab: string = 'eliminar';
  filtroBusqueda: string = '';
  eliminar: any[] = [];
  listado: any[] = [];
  idSeleccionado: number | null = null;
  usuarioActual = this.usuarioService.getUsuarioActual();
  logoUrl: string = '';

  constructor(
    private prefijoService: PrefijoService,
    private dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private productoAdicionalService: ProductoAdicionalService,
    private glnService: GlnService,
    private auditoriaService: AuditoriaPrefijosService,
    private usuarioService: UsuarioService,
    private exportService: ExportService,
    private empresaService: EmpresaService,
    private logoService: LogoService,
    private cuponService:CuponService,
    private ssccService:SsccService,
    public permissions: PermissionsService
  ) { }

  ngOnInit(): void {
    this.cargarAuditoriaPrefijos();
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    this.logo();

  }

  cambiarTab(tab: string) {
    this.activeTab = tab;
  }

  buscarPrefijos(codpre: string): void {
    if (!codpre) return;

    this.prefijoService.buscarPorCodpre(codpre).subscribe({
      next: (data) => {
        const extendido = data as any[];
        if (extendido.length === 0) {
          this.mostrarAlerta('No se encontraron resultados para el prefijo ingresado.', 'Info');
          this.eliminar = [];
          this.limpiarBusqueda();
          this.filtroBusqueda = '';
          return;
        }

        this.eliminar = extendido.map(item => ({
          id: item.id_prefijos,
          prefijo: item.codpre,
          cliente: item.nomcli,
          ruc: item.ruccli,
          fecha: formatDate(item.fecha, 'dd/MM/yyyy', 'en-US')
        }));
      },
      error: (err) => {
        console.error('❌ Error al buscar prefijos por código:', err);
        this.mostrarAlerta('Ocurrió un error al realizar la búsqueda.', 'Error');
      }
    });
  }

eliminarPrefijo(): void {
  if (this.eliminar.length === 0) {
    console.warn('⚠️ No hay datos cargados para eliminar.');
    return;
  }

  const id = this.eliminar[0].id;
  const datosAuditoria: AuditoriaPrefijo = {
    codpre: this.eliminar[0].prefijo,
    usuario: this.usuarioActual?.nombre_usuario || '',
    fecha: new Date().toISOString(),
    empresa: this.eliminar[0].cliente,
    ruc: this.eliminar[0].ruc
  };

  // Paso 1: Verificar si existen productos adicionales asociados
  this.productoAdicionalService.obtenerProductoDatosAdicionalesPorIdPrefijos(id).subscribe({
    next: (resp) => {
      if (resp.data) {
        this.mostrarAlerta('⚠️ No se puede eliminar el prefijo porque tiene productos asociados.', 'Advertencia');
        return;
      }

      // Paso 2: Verificar si existen cupones asociados al prefijo
      this.cuponService.getByPrefijo(id).subscribe({
        next: (cuponResp) => {
          if (cuponResp.data && cuponResp.data.length > 0) {
            this.mostrarAlerta('⚠️ No se puede eliminar el prefijo porque tiene cupones asociados.', 'Advertencia');
            return;
          }

          // ✅ Paso 3: Verificar si existen SSCC asociados
          this.ssccService.getTodosPorIdPrefijo(id).subscribe({
            next: (ssccResp) => {
              if (ssccResp.data && ssccResp.data.length > 0) {
                this.mostrarAlerta('⚠️ No se puede eliminar el prefijo porque tiene SSCC asociados.', 'Advertencia');
                return;
              }

              // Paso 4: Confirmación por parte del usuario
              const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
                width: '400px',
                data: {
                  title: '¿Desea confirmar?',
                  message: `¿Está seguro que desea eliminar el prefijo con ID ${id}?`,
                  type: 'info',
                  confirmText: 'Sí, eliminar',
                  cancelText: 'Cancelar',
                  showCancel: true
                }
              });

              dialogRef.afterClosed().subscribe(result => {
                if (result === true) {
                  console.log('✅ Confirmado, registrando auditoría y eliminando...');

                  // Registrar en auditoría
                  this.auditoriaService.insertarAuditoriaPrefijo(datosAuditoria).subscribe({
                    next: () => {
                      console.log('📝 Auditoría registrada.');

                      // Eliminar GLNs
                      this.glnService.eliminarGlnPorIdPrefijos(id).subscribe({
                        next: () => {
                          console.log('🗑️ GLNs eliminados.');

                          // Eliminar prefijo
                          this.prefijoService.eliminarPrefijo(id).subscribe({
                            next: () => {
                              this.mostrarAlerta('✅ Prefijo eliminado exitosamente.', 'OK');
                              this.limpiarBusqueda();
                            },
                            error: (err) => {
                              console.error('❌ Error al eliminar prefijo', err);
                              this.mostrarAlerta('❌ Error al eliminar prefijo', 'Error');
                            }
                          });
                        },
                        error: (err) => {
                          console.error('❌ Error al eliminar GLNs', err);
                          this.mostrarAlerta('❌ No se pudo eliminar los GLN asociados.', 'Error');
                        }
                      });
                    },
                    error: (err) => {
                      console.error('❌ Error al registrar en auditoría', err);
                      this.mostrarAlerta('❌ Error al registrar auditoría.', 'Error');
                    }
                  });
                } else {
                  console.log('❎ Eliminación cancelada por el usuario');
                }
              });
            },
            error: (err) => {
              console.error('❌ Error al consultar SSCC asociados', err);
              this.mostrarAlerta('❌ Error al verificar SSCC asociados.', 'Error');
            }
          });
        },
        error: (err) => {
          console.error('❌ Error al consultar cupones asociados', err);
          this.mostrarAlerta('❌ Error al verificar cupones asociados.', 'Error');
        }
      });
    },
    error: (err) => {
      console.error('❌ Error al consultar productos adicionales', err);
      this.mostrarAlerta('❌ Error al verificar productos adicionales.', 'Error');
    }
  });
}


  

  

  limpiarBusqueda(): void {
    this.filtroBusqueda = '';
    this.eliminar = [];
  }

  mostrarAlerta(mensaje: string, tipo: string) {
    this._snackBar.open(mensaje, tipo, {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3000
    });
  }

  cargarAuditoriaPrefijos(): void {
    this.auditoriaService.obtenerTodosAuditoriaPrefijos().subscribe({
      next: (resp: AuditoriaPrefijo[]) => {
        console.log('👉 Datos auditoría recibidos:', resp);
        if (!resp || resp.length === 0) {
          this.listado = [];
          this.mostrarAlerta('⚠️ No se encontraron datos de auditoría.', 'Advertencia');
          return;
        }

        this.listado = resp.map((item, index) => ({
          prefijo: item.codpre,
          cliente: item.empresa,
          ruc: item.ruc,
          usuario: item.usuario,
          fecha: new Date(item.fecha).toLocaleDateString('es-EC', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })

        }));
      },
      error: (err) => {
        console.error('❌ Error al obtener auditoría de prefijos', err);
        this.mostrarAlerta('❌ Error al cargar auditoría de prefijos.', 'Error');
      }
    });
  }

 exportar(tipo: 'excel' | 'pdf'): void {
  const headers = ['Prefijo', 'Cliente', 'RUC', 'Usuario', 'Fecha'];
  const columns = ['prefijo', 'cliente', 'ruc', 'usuario', 'fecha'];

  const data = this.listado.map((item) => ({
    prefijo: item.prefijo,
    cliente: item.cliente,
    ruc: item.ruc,
    usuario: item.usuario,
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
    filename: 'ListadoPrefijosEliminados',
    title: 'Auditoría de Prefijos Eliminados',
    logoUrl: this.logoUrl
  };

  if (tipo === 'excel') {
    this.exportService.exportarExcel(options);
  } else {
    this.exportService.exportarPDF(options);
  }
}
  logo()
  {
      this.empresaService.getEmpresas().subscribe({
      next: (empresas) => {
        if (empresas.length > 0 && empresas[0].empresaLogo) {
          this.logoUrl = this.logoService.getLogoUrl(empresas[0].empresaLogo);
          console.log('Logo cargado desde empresa:', this.logoUrl);
        } else {
          console.warn('No se encontró empresa o logo.');
        }
      },
      error: (err) => {
        console.error('Error al cargar empresa para obtener logo:', err);
      }
    });
  }

}
