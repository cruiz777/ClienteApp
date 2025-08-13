import { Component, OnInit } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { UsuarioService } from 'src/app/services/usuario.service';

@Component({
  selector: 'app-navegar',
  templateUrl: './navegar.component.html',
  styleUrls: ['./navegar.component.css']
})
export class NavegarComponent implements OnInit {
  currentDateTime: string = '';
  isHandset: boolean = false;
  isExpanded: boolean = true;
  usuarioActual : any;
  constructor(
    private breakpointObserver: BreakpointObserver,
    private usuarioService: UsuarioService
  ) {
    
    this.usuarioActual = this.usuarioService.getUsuarioActual();
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
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    const formattedDate = now.toLocaleDateString('es-EC', options);
    const formattedTime = now.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    this.currentDateTime = `${this.capitalizeFirstLetter(formattedDate)}, ${formattedTime}`;
  }

  capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  toggleSidebar(): void {
    this.isExpanded = !this.isExpanded;
  }
}
