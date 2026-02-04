import { Component, OnInit } from '@angular/core';
import { ValidacionService } from 'src/app/services/validacion.service';
import { ProductoDetalleResponse } from 'src/app/interfaces/responses/producto-detalle-response';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-validacion-verified',
  templateUrl: './validacion-verified.component.html',
  styleUrls: ['./validacion-verified.component.css']
})
export class ProductoDetalleComponent implements OnInit {

  // Propiedades del componente
  codigoBarras: string = '';
  producto: ProductoDetalleResponse | null = null;
  isLoading: boolean = false;
  hasResult: boolean = false;
  errorMessage: string = '';

  constructor(private validacionService: ValidacionService) {}

  ngOnInit(): void {
    // Inicialización si es necesaria
  }

  /**
   * Busca el producto por código de barras
   */
  buscarProducto(): void {
    if (!this.codigoBarras?.trim()) {
      this.errorMessage = 'Por favor ingrese un código de barras válido';
      return;
    }

    // Validar que sea un código de 13 dígitos usando el helper del servicio
    if (!this.validacionService.isValidGtin(this.codigoBarras)) {
      this.errorMessage = 'El código de barras debe tener exactamente 13 dígitos';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.hasResult = false;

    console.log('Buscando producto con código:', this.codigoBarras);

    this.validacionService.getProductoDetalle(this.codigoBarras)
      .pipe(
        catchError(error => {
          console.error('Error al buscar producto:', error);
          
          // Manejar diferentes tipos de error
          if (error.status === 404) {
            this.errorMessage = 'Producto no encontrado con el código especificado';
          } else if (error.status === 400) {
            this.errorMessage = 'Código de barras inválido. Debe tener 13 dígitos numéricos.';
          } else {
            this.errorMessage = 'Error en la consulta. Verifique el código e intente nuevamente.';
          }
          
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(response => {
        if (response && response.data && response.type === 'success') {
          this.producto = response.data;
          this.hasResult = true;
          console.log('Producto encontrado:', this.producto);
        } else {
          this.producto = null;
          this.hasResult = false;
          this.errorMessage = response?.message || 'No se encontró el producto con el código especificado';
        }
      });
  }

  /**
   * Reinicia la búsqueda
   */
  nuevaBusqueda(): void {
    this.codigoBarras = '';
    this.producto = null;
    this.hasResult = false;
    this.errorMessage = '';
    this.isLoading = false;
  }

  /**
   * Formatea URL del sitio web usando el helper del servicio
   */
  getWebsiteUrl(website: string | undefined): string {
    if (!website || website.trim() === '') return '';
    return this.validacionService.formatWebsiteUrl(website);
  }

  /**
   * Validación en tiempo real del código de barras
   */
  onCodigoBarrasChange(event: any): void {
    const value = event.target.value;
    // Permitir solo números
    this.codigoBarras = value.replace(/\D/g, '');
    
    // Limpiar errores previos cuando empiece a escribir
    if (this.errorMessage && this.codigoBarras.length > 0) {
      this.errorMessage = '';
    }
  }

  /**
   * Maneja el enter en el input
   */
  onEnterKey(): void {
    if (this.validacionService.isValidGtin(this.codigoBarras)) {
      this.buscarProducto();
    }
  }

  /**
   * Verifica si tiene imagen de producto
   */
  hasProductImage(): boolean {
    return this.producto?.productImageUrl !== undefined && 
           this.producto?.productImageUrl !== null && 
           this.producto?.productImageUrl.trim() !== '';
  }

  /**
   * Verifica si tiene sitio web
   */
  hasWebsite(): boolean {
    return this.producto?.website !== undefined && 
           this.producto?.website !== null && 
           this.producto?.website.trim() !== '';
  }

  /**
   * Formatea la fecha de creación
   */
  formatFechaCreacion(fecha: string | undefined): string {
    if (!fecha) return 'N/A';
    
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-EC', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return fecha;
    }
  }

  /**
   * Obtiene el texto del contenido neto
   */
  getNetContentText(): string {
    if (!this.producto?.netContentValue) return 'N/A';
    
    const value = this.producto.netContentValue;
    const unit = this.producto.netContentUnitCode || '';
    
    return unit ? `${value}` : value;
  }
}