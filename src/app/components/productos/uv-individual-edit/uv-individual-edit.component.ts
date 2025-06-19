import { Component } from '@angular/core';

@Component({
  selector: 'app-uv-individual-edit',
  standalone: true,
  imports: [],
  templateUrl: './uv-individual-edit.component.html',
  styleUrl: './uv-individual-edit.component.css'
})
export class UvIndividualEditComponent {
constructor() {}

  // Method to handle menu item clicks
  onMenuItemClick(menuItem: string): void {
    console.log('Menu item clicked:', menuItem);
  }

  // Method to handle tab clicks
  onTabClick(tab: string): void {
    console.log('Tab clicked:', tab);
  }

  // Method to handle button clicks
  onButtonClick(action: string): void {
    console.log('Button clicked:', action);
  }

  // Method to handle checkbox changes
  onCheckboxChange(option: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    console.log(`${option} checkbox changed:`, target.checked);
  }

  // Method to handle form input changes
  onInputChange(field: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    console.log(`${field} input changed:`, target.value);
  }

  // Method to handle exit action
  onExit(): void {
    console.log('Exit clicked');
  }
}
