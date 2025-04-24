import { Component } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent {

  isHandset: boolean = false;   // Detecta si es móvil
  isExpanded: boolean = true;   // Control del sidebar

  constructor(private breakpointObserver: BreakpointObserver) {
    this.breakpointObserver.observe([Breakpoints.Handset])
      .subscribe(result => {
        this.isHandset = result.matches;

        // Ajustar automáticamente el sidebar según el dispositivo
        this.isExpanded = !this.isHandset;
      });
  }

  toggleSidebar(): void {
    this.isExpanded = !this.isExpanded;
  }
}
