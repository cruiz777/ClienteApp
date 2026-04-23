import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnulacionRolqComponent } from './anulacion-rolq.component';

describe('AnulacionRolqComponent', () => {
  let component: AnulacionRolqComponent;
  let fixture: ComponentFixture<AnulacionRolqComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnulacionRolqComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnulacionRolqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
