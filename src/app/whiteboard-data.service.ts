import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs'; // For managing data

@Injectable({
  providedIn: 'root',
})
export class WhiteboardDataService {
  private whiteboardDataSubject = new BehaviorSubject<any>(null); // Initialize with null data
  whiteboardData$ = this.whiteboardDataSubject.asObservable();

  updateWhiteboardData(data: any) {
    this.whiteboardDataSubject.next(data);
  }
}
