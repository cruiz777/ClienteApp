import { Component } from '@angular/core';
import { IdleService } from './services/idle.service';
import { NavigationStart, Router } from '@angular/router';
import { RequiredFieldsToastService } from './components/utils/messages/required-fields-toast.service';

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
    private toastCampos: RequiredFieldsToastService
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.toastCampos.cerrar(); //Cierra el toast (pop ups) al navegar a distintas paginas o rutas
      }
    });
    
  }
}

