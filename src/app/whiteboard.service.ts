import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WhiteboardService {
  private backendUrl = 'http://localhost:3000/whiteboard'; // Update with your backend URL

  constructor(private http: HttpClient) {}

  saveWhiteboard(filename: string, data: any): Observable<string> {
    const formData = new FormData();
    formData.append('filename', filename);
    formData.append('data', JSON.stringify(data));
    return this.http.post<any>(`${this.backendUrl}/save`, formData)
      .pipe(map(response => {
        if (response.success) {
          return response.fileId;
        } else {
          throw new Error(response.error); // or return Observable.throwError()
        }
      }));
  }

  loadWhiteboard(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.backendUrl}/load`, formData)
      .pipe(map(response => {
        if (response.success) {
          return response.data;
        } else {
          throw new Error(response.error); 
        }
      }));
  }
}
