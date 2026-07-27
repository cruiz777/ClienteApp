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
  selector: 'app-navigation-rol',
  templateUrl: './navigation-rol.component.html',
  styleUrl: './navigation-rol.component.css'
})
export class NavigationRolComponent implements OnInit{
  usuarioActual = this.usuarioService.getUsuarioActual();
  currentDateTime: string = '';
  isHandset: boolean = false;
  isExpanded: boolean = true;

  // 👇 NUEVO: observable con los permisos del menú de ROL-3000
  menuRol$!: Observable<any>;

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
    this.menuRol$ = this.permissionsService.permisos$.pipe(
      map(permisos => ({
        // Empleados - Archivo
        estructuraEmpleado: permisos.includes('rol-3000.empleado.archivo.estructura-de-empleados'),
        empleadoFicha: permisos.includes('rol-3000.empleado.archivo.empleado'),
        bancoRol: permisos.includes('rol-3000.empleado.archivo.banco'),
        empleadoAdaptacion: permisos.includes('rol-3000.empleado.archivo.empresa-para-adaptación'),

        // Empleados - Reportes
        reporteEmpleados: permisos.includes('rol-3000.empleado.reportes.empleados'),
        reporteCumpleanios: permisos.includes('rol-3000.empleado.reportes.cumpleaños'),
        reporteCargas: permisos.includes('rol-3000.empleado.reportes.cargas'),
        listadoFondosReserva: permisos.includes('rol-3000.empleado.reportes.fondos-de-reserva'),
        terminacionContrato: permisos.includes('rol-3000.empleado.reportes.terminacion-de-contrato'),
        tipoContrato: permisos.includes('rol-3000.empleado.reportes.tipo-de-contrato'),
        reporteEntradaSalidas: permisos.includes('rol-3000.empleado.reportes.entrada-y-salidas'),
        personasDiscapacidad: permisos.includes('rol-3000.empleado.reportes.personas-con-discapacidad'),

        // Empleados - Procesos
        cambioSueldos: permisos.includes('rol-3000.empleado.procesos.cambio-de-sueldos'),

        // Novedades - Generar
        solicitudPermiso: permisos.includes('rol-3000.novedades.generar.solicitud-de-permiso'),
        aprobacion: permisos.includes('rol-3000.novedades.generar.aprobacion'),
        registroVacaciones: permisos.includes('rol-3000.novedades.generar.registro-de-vacaciones'),

        // Novedades - Reportes
        reportePermisos: permisos.includes('rol-3000.novedades.reportes.permisos'),
        reporteVacaciones: permisos.includes('rol-3000.novedades.reportes.vacaciones'),
        detalleVacacionesEmpleado: permisos.includes('rol-3000.novedades.reportes.vacaciones-de-empleado'),

        // Novedades - Procesos
        procesarVacaciones: permisos.includes('rol-3000.novedades.procesos.periodo-de-vacaciones'),

        // Nómina - Roles
        rolMensual: permisos.includes('rol-3000.nomina.roles.rol-mensual'),
        rolQuincenal: permisos.includes('rol-3000.nomina.roles.rol-quincena'),
        rubrosFijos: permisos.includes('rol-3000.nomina.roles.rubros-fijos'),
        anulacionRolMensual: permisos.includes('rol-3000.nomina.roles.anulación-de-rol-mensual'),
        anulacionRolQuincena: permisos.includes('rol-3000.nomina.roles.anulación-de-rol-quincenal'),
        cierrePeriodoQuincenal: permisos.includes('rol-3000.nomina.roles.cierre-de-periodo-quincenal'),
        cierrePeriodoMensualContable: permisos.includes('rol-3000.nomina.roles.cierre-de-periodo-mensual-contable'),
        cierrePeriodoMensualNomina: permisos.includes('rol-3000.nomina.roles.cierre-de-periodo-mensual-nomina'),
        generacionContabilidad: permisos.includes('rol-3000.nomina.roles.generacion-para-contabilidad'),
        impresionContabilidad: permisos.includes('rol-3000.nomina.roles.impresion-asientos-diarios-y-provisiones'),

        // Nómina - Reportes
        reporteRolNomina: permisos.includes('rol-3000.nomina.reportes.rol-nomina'),
        reporteRolIndividual: permisos.includes('rol-3000.nomina.reportes.rol-individual'),
        reporteListadoGeneral: permisos.includes('rol-3000.nomina.reportes.listado-general'),
        reporteListadoGeneralGastos: permisos.includes('rol-3000.nomina.reportes.listado-general-y-gastos'),
        reporteProvisiones: permisos.includes('rol-3000.nomina.reportes.provision'),
        reporteIngresoDescuentosEmpleado: permisos.includes('rol-3000.nomina.reportes.ingreso-descuentos-por-empleado'),
        empleadosExcluidos: permisos.includes('rol-3000.nomina.reportes.empleados-excluidos'),
        resumenInec: permisos.includes('rol-3000.nomina.reportes.resumen-inec'),
        personalOcupado: permisos.includes('rol-3000.nomina.reportes.personal-ocupado'),

        // Nómina - Generación de archivo
        avisoNuevoSueldo: permisos.includes('rol-3000.nomina.generacion-archivo.aviso-nuevo-sueldo'),

        // Nómina Especial
        decimoCuarto: permisos.includes('rol-3000.nomina-especial.nomina-especial.decimo-cuarto'),
        decimoTercero: permisos.includes('rol-3000.nomina-especial.nomina-especial.decimo-tercero'),
        fondoReserva: permisos.includes('rol-3000.nomina-especial.nomina-especial.fondos-reserva'),
        utilidades: permisos.includes('rol-3000.nomina-especial.nomina-especial.utilidades'),

        // Configuración
        cargos: permisos.includes('rol-3000.configuracion.cargos'),
        tipoEmp: permisos.includes('rol-3000.configuracion.tipos.tipo-empleado'),
        tipoGasto: permisos.includes('rol-3000.configuracion.tipos.tipo-gasto'),
        nivelInstruccion: permisos.includes('rol-3000.configuracion.niveles-de-instruccion'),
        parametrosCostos: permisos.includes('rol-3000.configuracion.parametros-y-costos'),
        ingresoDescuentos: permisos.includes('rol-3000.configuracion.ingreso-descuentos'),
        impuestosRenta: permisos.includes('rol-3000.configuracion.impuesto-a-la-renta'),
        sectorial: permisos.includes('rol-3000.configuracion.sectorial'),
        formaPago: permisos.includes('rol-3000.configuracion.formas-de-pago'),
        tipoSangre: permisos.includes('rol-3000.configuracion.tipos.tipo-sangre'),
        regimen: permisos.includes('rol-3000.configuracion.regimen'),
        tipoCuenta: permisos.includes('rol-3000.configuracion.tipos.tipo-cuenta'),
        bancosTercerosRol: permisos.includes('rol-3000.configuracion.bancos.bancos-terceros'),
        bancosRol: permisos.includes('rol-3000.configuracion.bancos'),
        empComp: permisos.includes('rol-3000.configuracion.empresas-complementarias'),
        tipoNominaEsp: permisos.includes('rol-3000.configuracion.tipos.tipo-nomina-especial'),
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
    this.router.navigate(['/rol-3000', ruta]); //corregido: apuntaba a '/sic-3000'
  }
  salir(): void {

    this.router.navigate(['/inicio']).then(() => {
      window.location.reload();

    });
  }

}