import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  Output,
  EventEmitter,
  SimpleChanges,
  AfterViewInit
} from '@angular/core';
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

  @Output() coordenadasCambio = new EventEmitter<{ lat: number; lng: number }>();

  private mapa!: L.Map;
  private marcador!: L.Marker;
  private clickListener?: (e: L.LeafletMouseEvent) => void;

  ngAfterViewInit(): void {
    this.inicializarMapa();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['lat'] || changes['lng']) && this.mapa && this.marcador) {
      this.mapa.setView([this.lat, this.lng], 15);
      this.marcador.setLatLng([this.lat, this.lng]);
    }

    if (changes['editable'] && !changes['editable'].firstChange) {
      this.configurarModoEditable(); // <<<< centralizamos aquí la lógica
    }
  }

  private inicializarMapa(): void {
    this.mapa = L.map('map', {
      center: [this.lat, this.lng],
      zoom: 15,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.mapa);

    const martIcon = L.icon({
      iconUrl: 'assets/icons/location-marker.png',
      iconSize: [30, 41],
      iconAnchor: [15, 41],
      popupAnchor: [0, -41]
    });

    this.marcador = L.marker([this.lat, this.lng], {
      icon: martIcon,
      draggable: this.editable
    }).addTo(this.mapa);

    this.configurarModoEditable();
  }

  private configurarModoEditable(): void {
    // Limpiar listeners previos
    this.marcador.off('dragend', this.enviarCoordenadasDesdeMarcador);
    if (this.clickListener) {
      this.mapa.off('click', this.clickListener);
      this.clickListener = undefined;
    }

    // Configurar comportamiento según `editable`
    if (this.editable) {
      this.marcador.dragging?.enable();
      this.mapa.dragging.enable();
      this.mapa.scrollWheelZoom.enable();

      this.marcador.on('dragend', this.enviarCoordenadasDesdeMarcador);

      this.clickListener = (e: L.LeafletMouseEvent) => {
        this.marcador.setLatLng(e.latlng);
        this.coordenadasCambio.emit(e.latlng);
      };
      this.mapa.on('click', this.clickListener);
    } else {
      this.marcador.dragging?.disable();
      this.mapa.dragging.disable();
      this.mapa.scrollWheelZoom.disable();
    }
  }

  private enviarCoordenadasDesdeMarcador = () => {
    const { lat, lng } = this.marcador.getLatLng();
    this.coordenadasCambio.emit({ lat, lng });
  };
}
