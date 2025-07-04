import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';

export interface SearchParams {
  registro?: string;
  ruc?: string;
  tipo?: string;
  prefijo?: string;
  fechaDerecha?: string;
  prefijoEstado?: string;
  empresaEstado?: string;
}

export interface License {
  id?: number;
  licenseType: string;
  licenseStatus: string;
  licenseName: string;
  licenseGLN: string;
  address: string;
  addressSuburb: string;
  addressLocality: string;
  addressRegion: string;
  telephone: string;
  email: string;
  website: string;
}

@Component({
  selector: 'app-validador-licenses',
  templateUrl: './validador-licenses.component.html',
  styleUrls: ['./validador-licenses.component.css']
})
export class LicenseValidatorComponent implements OnInit {
 
  // Parámetros de búsqueda
  searchParams: SearchParams = {
    registro: '1561' // Valor por defecto
  };

  // Datos de la tabla (datos de ejemplo para mostrar como en la imagen objetivo)
  licencias: License[] = [
    {
      id: 1,
      licenseType: 'GCP',
      licenseStatus: 'Active',
      licenseName: 'Arezzo Valdez',
      licenseGLN: '7659002470652',
      address: 'Julia Avenida',
      addressSuburb: 'Ambato',
      addressLocality: 'Ambato',
      addressRegion: 'Tungurahua',
      telephone: '+593304',
      email: 'johyertez0@gq',
      website: 'N/D'
    },
    {
      id: 2,
      licenseType: 'GCP',
      licenseStatus: 'Active',
      licenseName: 'Albert Herrera',
      licenseGLN: '7659002470653',
      address: 'Av. Principal',
      addressSuburb: 'Quito',
      addressLocality: 'Quito',
      addressRegion: 'Pichincha',
      telephone: '+59323956565',
      email: 'max.alherr@gq',
      website: 'www.albert.com'
    },
    {
      id: 3,
      licenseType: 'GCP',
      licenseStatus: 'Active',
      licenseName: 'Jocelyn Chicaiza',
      licenseGLN: '7659002470654',
      address: 'Barrio Vinuesa',
      addressSuburb: 'Cuenca',
      addressLocality: 'Cuenca',
      addressRegion: 'Azuay',
      telephone: '+59307',
      email: 'jcense.chicai@gq',
      website: 'N/D'
    },
    {
      id: 4,
      licenseType: 'GCP',
      licenseStatus: 'Active',
      licenseName: 'Antoella SHIR',
      licenseGLN: '7659002470655',
      address: 'Pueblo de la C',
      addressSuburb: 'Guayaquil',
      addressLocality: 'Guayaquil',
      addressRegion: 'Azuay',
      telephone: '+59307',
      email: 'dgvincai@gq',
      website: 'N/D'
    }
  ];
 
  // Estados de carga y búsqueda
  isLoading = false;
  hasSearched = false;

  // Paginación
  currentPage = 1;
  pageSize = 10;
  totalItems = 4; // Actualizado para coincidir con los datos de ejemplo

  ngOnInit(): void {
    // Establecer fecha actual por defecto en el campo de fecha derecha
    this.searchParams.fechaDerecha = new Date().toISOString().split('T')[0];
  }

  // Getters para la información de paginación
  get startItem(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    const end = this.currentPage * this.pageSize;
    return end > this.totalItems ? this.totalItems : end;
  }

  // Métodos para funcionalidad
  buscar(): void {
    console.log('Buscar llamado con parámetros:', this.searchParams);
    this.isLoading = true;
    this.hasSearched = true;
    
    // Simular llamada a servicio
    setTimeout(() => {
      this.isLoading = false;
      // Aquí conectarás tu servicio más adelante
    }, 1500);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1; // Material paginator usa índice base 0
    this.pageSize = event.pageSize;
    console.log('Página cambiada a:', this.currentPage, 'Tamaño:', this.pageSize);
    // Aquí llamarás a buscar() con la nueva página y tamaño
  }

  nuevaBusqueda(): void {
    console.log('Nueva búsqueda');
    this.searchParams = {
      registro: '1561',
      fechaDerecha: new Date().toISOString().split('T')[0]
    };
    this.hasSearched = false;
    this.currentPage = 1;
  }

  limpiarForm(): void {
    console.log('Limpiar formulario');
    this.searchParams = {
      registro: this.searchParams.registro,
      fechaDerecha: new Date().toISOString().split('T')[0]
    };
  }

  exportarJSON(): void {
    console.log('Exportar JSON');
    if (this.licencias.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    
    // Crear y descargar JSON
    const dataStr = JSON.stringify(this.licencias, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `licencias_verified_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  verDetalle(licencia: License): void {
    console.log('Ver detalle de licencia:', licencia);
    // Aquí puedes abrir un modal o navegar a una página de detalle
    alert(`Detalle de la licencia:\nNombre: ${licencia.licenseName}\nTipo: ${licencia.licenseType}\nEstado: ${licencia.licenseStatus}`);
  }
}