import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {

  constructor(private titleService: Title) { }

  // Cambiar título de la aplicación
  setAppTitle(appName: string) {
    this.titleService.setTitle(appName);
  }

  // Cambiar favicon
  setAppIcon(iconPath: string) {
    // Remover icono existente
    const existingIcon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (existingIcon) {
      existingIcon.remove();
    }

    // Crear nuevo icono
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = iconPath;
    document.head.appendChild(link);
  }

  // Configurar app completa (título + icono)
  configureApp(appName: string, iconPath: string) {
    this.setAppTitle(appName);
    this.setAppIcon(iconPath);
  }
}