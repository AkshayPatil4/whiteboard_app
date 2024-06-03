import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';


interface SaveResponse {
    success: boolean;
    fileId?: string;
    error?: string;
  }
@Injectable({
  providedIn: 'root'
})
export class WhiteboardService {
  private backendUrl = 'http://localhost:3000/whiteboard'; // Update with your backend URL

  constructor(private http: HttpClient) {}

  saveWhiteboard(filename: string, data: any): Observable<any> {
    return this.http.post(`${this.backendUrl}/save`, { filename, data }); // Send as JSON
  }
 
  saveWhiteboardasimage(filename: string, data: any): Observable<any> {
    return this.http.post(`${this.backendUrl}/save/image`, { filename, data }); // Send as JSON
  }

  


}
