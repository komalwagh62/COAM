import { TestBed } from '@angular/core/testing';

import { StreamServiceService } from './stream-service.service';

describe('StreamServiceService', () => {
  let service: StreamServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StreamServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
