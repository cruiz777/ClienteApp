import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TgtinComponent } from './tgtin.component';

describe('TgtinComponent', () => {
  let component: TgtinComponent;
  let fixture: ComponentFixture<TgtinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TgtinComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TgtinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
