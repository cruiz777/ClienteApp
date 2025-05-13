import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalImpresionComponent } from './modal-impresion.component';

describe('ModalImpresionComponent', () => {
  let component: ModalImpresionComponent;
  let fixture: ComponentFixture<ModalImpresionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalImpresionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalImpresionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
