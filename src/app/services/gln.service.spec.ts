import { TestBed } from '@angular/core/testing';

import { GlnService } from './gln.service';

describe('GlnService', () => {
  let service: GlnService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GlnService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
