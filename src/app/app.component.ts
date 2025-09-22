import { Component } from '@angular/core';
import { IdleService } from './services/idle.service';
import { NavigationStart, Router } from '@angular/router';
import { RequiredFieldsToastService } from './components/utils/messages/required-fields-toast.service';
import { AppConfigService } from './services/app-config.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'ClientApp';
  constructor(
    private idleService: IdleService, // Al inyectarlo, el servicio empieza a escuchar inactividad automáticamente
    private router: Router,
    private toastCampos: RequiredFieldsToastService,
    private appConfig: AppConfigService
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.toastCampos.cerrar(); //Cierra el toast (pop ups) al navegar a distintas paginas o rutas
      }
    });
    
    // Configurar nombre de la app e icono
    this.appConfig.configureApp(
      'ERP Series3000',                           // 👈 Nombre de tu app
      '/assets/icons/gs1-icon.ico'            // 👈 Ruta de tu icono
    );
  }
}

