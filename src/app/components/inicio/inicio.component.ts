import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent implements OnInit, OnDestroy {
  images: string[] = [
    'assets/carrusel-inicio-gs1-8.jpg',
    'assets/carrusel-inicio-gs1-2.jpg',
    'assets/carrusel-inicio-gs1-3.jpg',
    'assets/carrusel-inicio-gs1-4.jpg',
    'assets/carrusel-inicio-gs1-5.jpg'
  ];

  currentIndex = 0;
  intervalId: any;

  ngOnInit() {
    this.startCarousel();
  }

  startCarousel() {
    this.intervalId = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.images.length;
    }, 3000); // cambia cada 3 segundos
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
