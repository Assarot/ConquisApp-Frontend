import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MaterialBackend {
  idMaterial?: string;
  tipo: string;
  urlOArchivo: string;
  idEspecialidad?: string;
  idClase?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MaterialesService {
  private apiUrl = `${environment.apiUrl}/materiales`;

  constructor(private http: HttpClient) {}

  getMaterialesByClase(idClase: string): Observable<MaterialBackend[]> {
    return this.http.get<MaterialBackend[]>(`${this.apiUrl}/clase/${idClase}`).pipe(
      catchError(err => {
        console.warn('Error fetching materiales from backend, using fallback', err);
        return of([]);
      })
    );
  }

  getMaterialesByEspecialidad(idEspecialidad: string): Observable<MaterialBackend[]> {
    return this.http.get<MaterialBackend[]>(`${this.apiUrl}/especialidad/${idEspecialidad}`).pipe(
      catchError(() => of([]))
    );
  }

  guardarMaterial(material: MaterialBackend): Observable<MaterialBackend> {
    return this.http.post<MaterialBackend>(this.apiUrl, material);
  }

  eliminarMaterial(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
