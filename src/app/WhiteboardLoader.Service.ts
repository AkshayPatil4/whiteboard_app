import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WhiteboardLoaderService {
  private whiteboardDataSubject = new BehaviorSubject<any>(null);
  whiteboardData$ = this.whiteboardDataSubject.asObservable();

  constructor() {}

  updateWhiteboardData(data: any) {
    this.whiteboardDataSubject.next(data);
  }
}