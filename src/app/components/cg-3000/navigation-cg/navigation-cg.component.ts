import { Component, OnInit } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { UsuarioService } from 'src/app/services/usuario.service';


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

  constructor(private breakpointObserver: BreakpointObserver
    , private router: Router,
    private usuarioService:UsuarioService
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
  this.router.navigate(['/sic-3000', ruta]);
}
  salir(): void {

    this.router.navigate(['/inicio']).then(() => {
      window.location.reload();

    });
  }

}
