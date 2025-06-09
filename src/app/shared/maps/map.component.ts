import { Component, ElementRef, Input, OnChanges, Output, EventEmitter, SimpleChanges, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  template: `<div id="map" class="map-container"></div>`,
  styleUrls: ['./map.component.scss']
})
export class MapaComponent implements AfterViewInit, OnChanges {
  @Input() lat: number = -0.22985;
  @Input() lng: number = -78.52495;
  @Input() editable: boolean = true;

  @Output() coordenadasCambio = new EventEmitter<{ lat: number, lng: number }>();

  private mapa!: L.Map;
  private marcador!: L.Marker;

  ngAfterViewInit(): void {
    this.inicializarMapa();
  }

    ngOnChanges(changes: SimpleChanges): void {
        if ((changes['lat'] || changes['lng']) && this.mapa && this.marcador) {
            this.mapa.setView([this.lat, this.lng], 15);
            this.marcador.setLatLng([this.lat, this.lng]);
        }
    }

  private inicializarMapa(): void {
    this.mapa = L.map('map', {
      center: [this.lat, this.lng],
      zoom: 15
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.mapa);

    const martIcon = L.icon({
    iconUrl: 'assets/icons/location-marker.png',
    iconSize: [30, 41],       // Ajusta al tamaño real del ícono
    iconAnchor: [15, 41],     // Punto donde se ancla el ícono al mapa
    popupAnchor: [0, -41],    // Dónde aparece el popup relativo al ícono
    // shadowUrl: 'assets/icons/location-marker-shadow.png', // (opcional)
    // shadowSize: [41, 41],     // (opcional)
    // shadowAnchor: [15, 41]    // (opcional)
    });

    this.marcador = L.marker([this.lat, this.lng], {
    icon: martIcon,
    draggable: this.editable
    }).addTo(this.mapa);

    if (this.editable) {
      this.marcador.on('dragend', () => {
        const { lat, lng } = this.marcador.getLatLng();
        this.coordenadasCambio.emit({ lat, lng });
      });
    }
  }
}
