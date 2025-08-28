import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleDescripcionModalComponent } from './detalle-descripcion-modal.component';

describe('DetalleDescripcionModalComponent', () => {
  let component: DetalleDescripcionModalComponent;
  let fixture: ComponentFixture<DetalleDescripcionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleDescripcionModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetalleDescripcionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
