import { Component, OnInit } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { UsuarioService } from 'src/app/services/usuario.service';
import { PermissionsService } from 'src/app/services/permission.service'; // 👈 NUEVO
import { Observable } from 'rxjs'; // 👈 NUEVO
import { map } from 'rxjs/operators'; // 👈 NUEVO


@Component({
  selector: 'app-navigation-cg',
  templateUrl: './navigation-cg.component.html',
  styleUrl: './navigation-cg.component.css'
})
export class NavigationCgComponent implements OnInit{
  usuarioActual = this.usuarioService.getUsuarioActual();
  currentDateTime: string = '';
  isHandset: boolean = false;
  isExpanded: boolean = true;

  // 👇 NUEVO: observable con los permisos del menú de CG-3000
  menuCg$!: Observable<any>;

  constructor(private breakpointObserver: BreakpointObserver
    , private router: Router,
    private usuarioService:UsuarioService,
    private permissionsService: PermissionsService // 👈 NUEVO
  ) {
    this.breakpointObserver.observe([Breakpoints.Handset])
      .subscribe(result => {
        this.isHandset = result.matches;
        this.isExpanded = !this.isHandset;
      });
  }

  ngOnInit(): void {
    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 1000);

    // 👇 NUEVO: calcular permisos del menú a partir de permisos_flat
    this.menuCg$ = this.permissionsService.permisos$.pipe(
      map(permisos => ({
        // Transacciones
        transaccionesGenerales: permisos.includes('cg-3000.transacciones.transacciones-generales'),

        // Cuentas por Pagar
        facturas: permisos.includes('cg-3000.cuentas-por-pagar.ingreso-documentos.facturas'),
        liquidacionesCompra: permisos.includes('cg-3000.cuentas-por-pagar.ingreso-documentos.liquidaciones-de-compra'),
        anticiposProveedores: permisos.includes('cg-3000.cuentas-por-pagar.pagos-a-proveedores.anticipos-a-proveedores'),
        pagosIndividuales: permisos.includes('cg-3000.cuentas-por-pagar.pagos-a-proveedores.pagos-individuales'),
        planificacionPagos: permisos.includes('cg-3000.cuentas-por-pagar.pagos-a-proveedores.planificacion-de-pagos'),

        // Balance
        diarioMovimiento: permisos.includes('cg-3000.balance.balance.diario-de-movimiento'),
        balanceComprobacion: permisos.includes('cg-3000.balance.balance.balance-de-comprobacion'),
        mayorCuentas: permisos.includes('cg-3000.balance.balance.mayor-de-cuentas'),
        mayorCodigos: permisos.includes('cg-3000.balance.balance.mayor-de-codigos'),
        estadoFinanciero: permisos.includes('cg-3000.balance.estados-financieros.estado-financiero'),
        conciliacionBancaria: permisos.includes('cg-3000.balance.conciliacion.conciliacion-bancaria'),
        reversarConciliacion: permisos.includes('cg-3000.balance.conciliacion.reversar-conciliacion'),

        // Anexo Transaccional
        reporteCompras: permisos.includes('cg-3000.anexo-transaccional.reporte-de-compras'),
        generarAts: permisos.includes('cg-3000.anexo-transaccional.generar-ats'),

        // Activos Fijos
        exploradorActivos: permisos.includes('cg-3000.activos-fijos.explorador-activos-fijos'),

        // Configuración
        bancos: permisos.includes('cg-3000.configuracion.bancos'),
        bancosTerceros: permisos.includes('cg-3000.configuracion.bancos.bancos-terceros'),
        comprobantesSri: permisos.includes('cg-3000.configuracion.comprobantes-sri'),
        codigosContables: permisos.includes('cg-3000.configuracion.codigos-contables'),
        fechasControl: permisos.includes('cg-3000.configuracion.fechas-de-control'),
        planCuentas: permisos.includes('cg-3000.configuracion.plan-de-cuentas'),
        numeroCheques: permisos.includes('cg-3000.configuracion.numeracion-de-cheques'),
        tipoDocumento: permisos.includes('cg-3000.configuracion.tipo-documentos'),
        tipoCuenta: permisos.includes('cg-3000.configuracion.registro-de-tipo-de-cuenta'),
        tipoRetencion: permisos.includes('cg-3000.configuracion.tipo-de-retenciones'),

        // Cierres
        cierreMensual: permisos.includes('cg-3000.cierres.cierre-mensual'),
        cierreAnual: permisos.includes('cg-3000.cierres.cierre-anual'),
      }))
    );
  }

  updateDateTime(): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('es-EC', options);
    const formattedTime = now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    this.currentDateTime = `${this.capitalizeFirstLetter(formattedDate)}, ${formattedTime}`;
  }

  capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  toggleSidebar(): void {
    this.isExpanded = !this.isExpanded;
  }
  //goTo(ruta: string): void {
    //this.router.navigate([ruta]);
  //}
  goTo(ruta: string): void {
    this.router.navigate(['/cg-3000', ruta]);
  }
  salir(): void {

    this.router.navigate(['/inicio']).then(() => {
      window.location.reload();

    });
  }

}