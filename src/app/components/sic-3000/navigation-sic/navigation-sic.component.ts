import { Component, OnInit } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { UsuarioService } from 'src/app/services/usuario.service';
import { ParametrosFacturaService } from 'src/app/services/parametros-factura.service';
import { PermissionsService } from 'src/app/services/permission.service';
import { Observable } from 'rxjs'; 
import { map } from 'rxjs/operators'; 

@Component({
  selector: 'app-navigation-sic',
  templateUrl: './navigation-sic.component.html',
  styleUrl: './navigation-sic.component.css'
})
export class NavigationSicComponent implements OnInit{
  usuarioActual = this.usuarioService.getUsuarioActual();
  currentDateTime: string = '';
  isHandset: boolean = false;
  isExpanded: boolean = true;
  isLoadingUrl: boolean = true;

  //Observable con los permisos del menú de SIC-3000
  menuSic$!: Observable<any>;

  constructor(private breakpointObserver: BreakpointObserver
    , private router: Router,
    private usuarioService:UsuarioService,
    private permissionsService: PermissionsService //Servicio de permisos
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

    //Calcular permisos del menú a partir de permisos_flat
    this.menuSic$ = this.permissionsService.permisos$.pipe(
      map(permisos => ({
        estructuraComercial: permisos.includes('sic-3000.inventarios.estructura-comercial'),
        producto: permisos.includes('sic-3000.inventarios.producto'),
        proveedores: permisos.includes('sic-3000.inventarios.proveedores'),

        facturacionIndividual: permisos.includes('sic-3000.facturacion.facturacion-individual'),
        facturacionGlobal: permisos.includes('sic-3000.facturacion.facturacion-global'),
        facturasAnuladas: permisos.includes('sic-3000.facturacion.facturas-anuladas'),
        docElectronicos: permisos.includes('sic-3000.facturacion.documentos-electronicos'),
        docLocales: permisos.includes('sic-3000.facturacion.comparacion-documentos-electronicos'),
        notaCredito: permisos.includes('sic-3000.facturacion.notas-de-credito-debito.notas-de-credito'),
        creacionAnticipos: permisos.includes('sic-3000.facturacion.anticipos.creacion-de-anticipos'),
        reporteAnticipos: permisos.includes('sic-3000.facturacion.anticipos.reporte-de-anticipos'),
        cierreAnticipos: permisos.includes('sic-3000.facturacion.anticipos.cierre-de-anticipos'),
        reenvioFact: permisos.includes('sic-3000.facturacion.reenvio-documentos-electronicos'),
        reporteVentas: permisos.includes('sic-3000.facturacion.reporte-ventas'),

        registroCobros: permisos.includes('sic-3000.cuentas-por-cobrar.registro-cobros'),
        reversionPagos: permisos.includes('sic-3000.cuentas-por-cobrar.reversion-pagos'),
        listadoPagos: permisos.includes('sic-3000.cuentas-por-cobrar.listado-pagos'),
        expEstadoCuenta: permisos.includes('sic-3000.cuentas-por-cobrar.reportes.estado-de-cuenta-cliente'),
        expEstadoCuentaGeneral: permisos.includes('sic-3000.cuentas-por-cobrar.explorador-estados-de-cuenta-general'),
        expCxcGeneral: permisos.includes('sic-3000.cuentas-por-cobrar.explorador-cuentas-por-cobrar-general'),
        expCuentaxcobrar: permisos.includes('sic-3000.cuentas-por-cobrar.explorador-de-cuentas-por-cobrar'),

        parametroCaja: permisos.includes('sic-3000.configuracion.parametros.parametro-caja'), // ⚠️ compartido con 'caja', ver nota
        descuento: permisos.includes('sic-3000.configuracion.descuentos'),
        tipDocSri: permisos.includes('sic-3000.configuracion.tip-doc-sri'),
        clasificacion: permisos.includes('sic-3000.configuracion.forma-de-pago.clasificacion-de-pagos'),
        formaPago: permisos.includes('sic-3000.configuracion.forma-de-pago'),
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
    if (!ruta || ruta.trim() === '') {
      console.warn('La URL no está disponible');
      return; // No hace nada si está vacía
    }
    window.open(ruta, '_blank');
  }

  salir(): void {

    this.router.navigate(['/inicio']).then(() => {
      window.location.reload();

    });
  }

}