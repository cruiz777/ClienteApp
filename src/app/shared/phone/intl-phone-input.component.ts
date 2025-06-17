import {
  AfterViewInit, Component, ElementRef, EventEmitter, forwardRef,
  Input, Output, ViewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import intlTelInput from 'intl-tel-input';

@Component({
  selector: 'app-intl-phone-input',
  templateUrl: './intl-phone-input.component.html',
  styleUrls: ['./intl-phone-input.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => IntlPhoneInputComponent),
    multi: true
  }]
})
export class IntlPhoneInputComponent implements AfterViewInit, ControlValueAccessor {
  @ViewChild('phoneInput', { static: true }) phoneInput!: ElementRef;
  @Input() preferredCountries: string[] = ['ec', 'us', 'co'];
  @Output() valueChange = new EventEmitter<string>();
  @Input() defaultCountry: string = 'ec'; // Puede pasar 'ec', 'us', etc.
  private pendingValue: string | null = null;
  iti: any;
  onChange = (_: any) => {};
  onTouched = () => {};

  ngAfterViewInit(): void {
    this.iti = intlTelInput(this.phoneInput.nativeElement, {
        preferredCountries: this.preferredCountries,
        separateDialCode: true,
        utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@17/build/js/utils.js'
    }as any); 

    if (this.pendingValue) {
        this.iti.setNumber(this.pendingValue);
        this.pendingValue = null;
    }

    this.phoneInput.nativeElement.addEventListener('input', () => {
        const number = this.iti.getNumber();
        this.onChange(number);
        this.valueChange.emit(number);
    });
    }

   writeValue(value: string): void {
        if (!value) return;

        if (this.iti) {
            this.setPhoneValue(value);
        } else {
            this.pendingValue = value;
        }
    }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  private setPhoneValue(raw: string): void {
  if (!raw.startsWith('+')) {
    const dialCode = this.iti.getSelectedCountryData()?.dialCode;
    if (dialCode) {
      raw = `+${dialCode}${raw}`;
    }
  }
  this.iti.setNumber(raw);
}

}
