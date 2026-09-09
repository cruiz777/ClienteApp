// phone-input.component.ts
import { Component, Input, forwardRef, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  maxLength: number;
  placeholder: string;
}

@Component({
  selector: 'app-phone-input',
  template: `
    <div class="phone-container">
      <div class="country-wrapper">
        <select 
          [(ngModel)]="selectedCountry" 
          (change)="onCountryChange()"
          [disabled]="isDisabled"
          class="country-select">
          <option *ngFor="let country of countries" [value]="country.dialCode">
            {{ country.flag }} {{ country.dialCode }}
          </option>
        </select>
      </div>
      
      <div class="number-wrapper">
        <input 
          [(ngModel)]="phoneNumber" 
          (ngModelChange)="onPhoneChange()"
          (blur)="handleBlur()"
          [disabled]="isDisabled"
          [placeholder]="currentCountry?.placeholder || '999999999'"
          [maxlength]="currentCountry?.maxLength || 15"
          type="tel"
          class="phone-input">
        <small *ngIf="fullNumber && !isDisabled" class="phone-preview">{{ fullNumber }}</small>
        <small *ngIf="phoneNumber && !isValidPhone() && !isDisabled" class="error-message">
          Número inválido para {{ currentCountry?.name }}
        </small>
      </div>
    </div>
  `,
  styles: [`
    .phone-container {
      display: flex;
      gap: 16px;
      width: 100%;
      align-items: flex-start;
    }
    
    .country-wrapper,
    .number-wrapper {
      display: flex;
      flex-direction: column;
    }
    
    .country-wrapper {
      min-width: 160px;
      max-width: 180px;
    }
    
    .number-wrapper {
      flex: 1;
      min-width: 200px;
    }
    
    .phone-label {
      font-size: 12px;
      margin-bottom: 4px;
      color: #002c6c;
      font-weight: 600;
    }
    
    .country-select,
    .phone-input {
      padding: 5px 10px;
      border: none;
      border-bottom: 1px solid #ccd5e2;
      font-size: 12px;
      color: #333;
      outline: none;
      background: #fff;
      font-family: 'Inter', sans-serif;
    }
    
    .country-select:focus,
    .phone-input:focus {
      border-bottom-color: #002c6c;
    }
    
    .country-select:disabled,
    .phone-input:disabled {
      background-color: #f5f5f5;
      color: #666;
    }
    
    .phone-input {
      font-family: 'Roboto Mono', monospace;
    }
    
    .phone-preview {
      font-size: 10px;
      color: #28a745;
      margin-top: 2px;
      font-weight: 500;
      font-family: 'Roboto Mono', monospace;
    }
    
    .error-message {
      color: #dc3545;
      font-size: 10px;
      margin-top: 2px;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .phone-container {
        flex-direction: column;
        gap: 12px;
      }
      
      .country-wrapper,
      .number-wrapper {
        width: 100%;
        min-width: auto;
        max-width: none;
      }
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    }
  ]
})
export class PhoneInputComponent implements ControlValueAccessor, OnInit {
  @Input() defaultCountry = '+593'; // Ecuador por defecto
  @Input() preferredCountries: string[] = ['EC', 'US', 'CO']; // Países prioritarios
  
  selectedCountry = '+593';
  phoneNumber = '';
  fullNumber = '';
  currentCountry?: Country;
  isDisabled = false; // ← Agregar esta propiedad
  
  // 🌍 Países más usados mundialmente + Ecuador prioritario
  private allCountries: Country[] = [
    // 🏆 PRIORITARIOS (Ecuador y principales)
    { code: 'EC', name: 'Ecuador', dialCode: '+593', flag: '🇪🇨', maxLength: 9, placeholder: '' },
    { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸', maxLength: 10, placeholder: '(555) 123-4567' },
    { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', maxLength: 11, placeholder: '138 0000 0000' },
    { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', maxLength: 10, placeholder: '98765 43210' },
    { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷', maxLength: 11, placeholder: '(11) 99999-9999' },
    
    // 🌎 LATINOAMÉRICA
    { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴', maxLength: 10, placeholder: '300 123 4567' },
    { code: 'PE', name: 'Perú', dialCode: '+51', flag: '🇵🇪', maxLength: 9, placeholder: '987 654 321' },
    { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', maxLength: 10, placeholder: '11 2345-6789' },
    { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱', maxLength: 9, placeholder: '9 8765 4321' },
    { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽', maxLength: 10, placeholder: '55 1234 5678' },
    { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪', maxLength: 10, placeholder: '412-123-4567' },
    { code: 'UY', name: 'Uruguay', dialCode: '+598', flag: '🇺🇾', maxLength: 8, placeholder: '99 123 456' },
    { code: 'PY', name: 'Paraguay', dialCode: '+595', flag: '🇵🇾', maxLength: 9, placeholder: '981 123456' },
    { code: 'BO', name: 'Bolivia', dialCode: '+591', flag: '🇧🇴', maxLength: 8, placeholder: '7123 4567' },
    
    // 🇪🇺 EUROPA
    { code: 'GB', name: 'Reino Unido', dialCode: '+44', flag: '🇬🇧', maxLength: 10, placeholder: '7911 123456' },
    { code: 'DE', name: 'Alemania', dialCode: '+49', flag: '🇩🇪', maxLength: 11, placeholder: '1512 3456789' },
    { code: 'FR', name: 'Francia', dialCode: '+33', flag: '🇫🇷', maxLength: 9, placeholder: '6 12 34 56 78' },
    { code: 'IT', name: 'Italia', dialCode: '+39', flag: '🇮🇹', maxLength: 10, placeholder: '312 345 6789' },
    { code: 'ES', name: 'España', dialCode: '+34', flag: '🇪🇸', maxLength: 9, placeholder: '612 34 56 78' },
    { code: 'RU', name: 'Rusia', dialCode: '+7', flag: '🇷🇺', maxLength: 10, placeholder: '912 345-67-89' },
    { code: 'NL', name: 'Países Bajos', dialCode: '+31', flag: '🇳🇱', maxLength: 9, placeholder: '6 12345678' },
    { code: 'CH', name: 'Suiza', dialCode: '+41', flag: '🇨🇭', maxLength: 9, placeholder: '78 123 45 67' }
  ];
  
  countries: Country[] = [];
  
  private onChange = (value: string) => {};
  private onTouched = () => {};

  // Método público para el template
  handleBlur(): void {
    this.onTouched();
  }

  ngOnInit() {
    this.setupCountries();
    this.selectedCountry = this.defaultCountry;
    this.updateCurrentCountry();
  }

  private setupCountries(): void {
    // Primero agregar países prioritarios
    const priorityCountries = this.allCountries.filter(country => 
      this.preferredCountries.includes(country.code)
    );
    
    // Luego agregar el resto ordenados alfabéticamente
    const otherCountries = this.allCountries
      .filter(country => !this.preferredCountries.includes(country.code))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    this.countries = [...priorityCountries, ...otherCountries];
  }

  onCountryChange(): void {
    this.updateCurrentCountry();
    this.updateValue();
  }

  onPhoneChange(): void {
    // Limpiar caracteres no numéricos excepto espacios y guiones para formato
    this.phoneNumber = this.phoneNumber.replace(/[^0-9\s\-()]/g, '');
    this.updateValue();
  }

  private updateCurrentCountry(): void {
    this.currentCountry = this.countries.find(c => c.dialCode === this.selectedCountry);
    console.log('📞 País actualizado:', this.currentCountry?.name, this.selectedCountry); // Debug temporal
  }

  private updateValue(): void {
    if (this.phoneNumber.trim()) {
      // Limpiar para guardar solo números
      const cleanNumber = this.phoneNumber.replace(/[^0-9]/g, '');
      this.fullNumber = `${this.selectedCountry}${cleanNumber}`;
      this.onChange(this.fullNumber);
    } else {
      this.fullNumber = '';
      this.onChange('');
    }
  }

  // Validación inteligente por país
  isValidPhone(): boolean {
    if (!this.phoneNumber.trim() || !this.currentCountry) return true; // No mostrar error si está vacío
    
    const cleanNumber = this.phoneNumber.replace(/[^0-9]/g, '');
    const length = cleanNumber.length;
    
    // Validar longitud según el país
    if (this.currentCountry.maxLength) {
      return length >= Math.max(1, this.currentCountry.maxLength - 2) && 
             length <= this.currentCountry.maxLength;
    }
    
    // Validación general para países sin regla específica
    return length >= 7 && length <= 15;
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    console.log('📞 Cargando valor:', value); // Debug temporal
    
    if (value && typeof value === 'string' && value.trim() !== '') {
      // Buscar el código de país conocido más largo que coincida
      let dialCodeEncontrado = null;
      let numeroEncontrado = null;

      // Ordenar países por longitud de dialCode (más largo primero) para encontrar la mejor coincidencia
      const paisesPorLongitud = [...this.countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
      
      for (const country of paisesPorLongitud) {
        if (value.startsWith(country.dialCode)) {
          dialCodeEncontrado = country.dialCode;
          numeroEncontrado = value.substring(country.dialCode.length);
          break;
        }
      }

      if (dialCodeEncontrado && numeroEncontrado) {
        console.log('📞 Parseado correctamente:', { dialCode: dialCodeEncontrado, number: numeroEncontrado });
        
        this.selectedCountry = dialCodeEncontrado;
        this.phoneNumber = numeroEncontrado;
        this.fullNumber = value;
        
        // Actualizar país actual después de establecer el código
        setTimeout(() => {
          this.updateCurrentCountry();
        }, 0);
      } else {
        // Fallback: usar regex simple pero solo para códigos comunes
        const match = value.match(/^(\+1|\+7|\+20|\+27|\+30|\+31|\+33|\+34|\+39|\+40|\+41|\+44|\+45|\+46|\+47|\+48|\+49|\+51|\+52|\+54|\+55|\+56|\+57|\+58|\+60|\+61|\+62|\+63|\+65|\+66|\+81|\+82|\+86|\+90|\+91|\+234|\+351|\+358|\+380|\+420|\+593|\+595|\+598|\+966|\+971|\+972)(\d+)$/);
        
        if (match) {
          const [, dialCode, number] = match;
          console.log('📞 Parseado con regex fallback:', { dialCode, number });
          
          this.selectedCountry = dialCode;
          this.phoneNumber = number;
          this.fullNumber = value;
          
          setTimeout(() => {
            this.updateCurrentCountry();
          }, 0);
        } else {
          console.log('📞 Formato no reconocido:', value);
          this.phoneNumber = value.replace(/[^0-9]/g, '');
          this.selectedCountry = this.defaultCountry;
          this.updateCurrentCountry();
        }
      }
    } else {
      // Valor vacío, null o undefined
      console.log('📞 Valor vacío o null, reseteando');
      this.phoneNumber = '';
      this.fullNumber = '';
      this.selectedCountry = this.defaultCountry;
      this.updateCurrentCountry();
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Implementar el estado disabled
    this.isDisabled = isDisabled;
    console.log('📞 Phone component disabled state:', isDisabled); // Debug temporal
  }
}