import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Miembro } from '../models/miembro.model';

@Injectable({
  providedIn: 'root'
})
export class MiembroService {
  private miembrosUrl = `${environment.apiUrl}/miembros`;

  // Internal memory mock state for members (used only if backend is offline)
  private mockMiembros: Miembro[] = [
    {
      idMiembro: 'miembro-1',
      nombre: 'Esteban',
      apellido: 'Quito',
      funcion: 'CONQUISTADOR',
      estado: 'ACTIVO',
      estadoFichaSalud: 'ACTUALIZADA',
      estadoSeguro: 'POSEE_SEGURO',
      estadoAdhesionPadres: 'FIRMADA',
      pendientes: 0,
      idClub: 'uuid-club-conquistadores-orion',
      idUnidad: 'unidad-orion-1',
      idClase: 'clase-guia',
      nombreUnidad: 'Halcones',
      nombreClase: 'Guía'
    },
    {
      idMiembro: 'miembro-2',
      nombre: 'Aquiles',
      apellido: 'Brinco',
      funcion: 'CONQUISTADOR',
      estado: 'ACTIVO',
      estadoFichaSalud: 'PENDIENTE',
      estadoSeguro: 'POSEE_SEGURO',
      estadoAdhesionPadres: 'FIRMADA',
      pendientes: 1,
      idClub: 'uuid-club-conquistadores-orion',
      idUnidad: 'unidad-orion-1',
      idClase: 'clase-viajero',
      nombreUnidad: 'Halcones',
      nombreClase: 'Viajero'
    },
    {
      idMiembro: 'miembro-3',
      nombre: 'Elsa',
      apellido: 'Pato',
      funcion: 'CONQUISTADOR',
      estado: 'ACTIVO',
      estadoFichaSalud: 'PENDIENTE',
      estadoSeguro: 'NO_POSEE_SEGURO',
      estadoAdhesionPadres: 'PENDIENTE',
      pendientes: 3,
      idClub: 'uuid-club-conquistadores-orion',
      idUnidad: 'unidad-orion-2',
      idClase: 'clase-amigo',
      nombreUnidad: 'Águilas',
      nombreClase: 'Amigo'
    }
  ];

  constructor(private http: HttpClient) {}

  getMiembrosByClub(idClub: string): Observable<Miembro[]> {
    return this.http.get<Miembro[]>(`${this.miembrosUrl}/club/${idClub}`).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('MiembroService.getMiembrosByClub failed (offline), using mock data', err);
          return of(this.mockMiembros.filter(m => m.idClub === idClub));
        }
        return throwError(() => err);
      })
    );
  }

  registrarMiembro(miembro: any): Observable<Miembro> {
    return this.http.post<Miembro>(this.miembrosUrl, miembro).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('MiembroService.registrarMiembro failed (offline), simulating locally', err);
          const newMiemb: Miembro = {
            ...miembro,
            idMiembro: miembro.idMiembro || `miembro-mock-${Date.now()}`,
            estado: miembro.estado || 'ACTIVO',
            idClub: miembro.club?.idClub || 'uuid-club-conquistadores-orion',
            idUnidad: miembro.unidad?.idUnidad || 'unidad-orion-1',
            idClase: miembro.clase?.idClase || 'clase-guia',
            nombreUnidad: miembro.unidad?.idUnidad === 'unidad-orion-1' ? 'Halcones' : 'Águilas',
            nombreClase: miembro.clase?.idClase === 'clase-guia' ? 'Guía' : miembro.clase?.idClase === 'clase-viajero' ? 'Viajero' : 'Amigo',
            pendientes: this.calculateMockPendientes(miembro)
          };
          
          if (miembro.idMiembro) {
            const idx = this.mockMiembros.findIndex(m => m.idMiembro === miembro.idMiembro);
            if (idx !== -1) {
              this.mockMiembros[idx] = newMiemb;
            }
          } else {
            this.mockMiembros.push(newMiemb);
          }
          return of(newMiemb);
        }
        return throwError(() => err);
      })
    );
  }

  cambiarUnidad(idMiembro: string, idUnidadDestino: string): Observable<Miembro> {
    let params = new HttpParams().set('idUnidadDestino', idUnidadDestino);
    return this.http.put<Miembro>(`${this.miembrosUrl}/${idMiembro}/unidad`, {}, { params }).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('MiembroService.cambiarUnidad failed (offline), simulating locally', err);
          const idx = this.mockMiembros.findIndex(m => m.idMiembro === idMiembro);
          if (idx !== -1) {
            this.mockMiembros[idx].idUnidad = idUnidadDestino;
            this.mockMiembros[idx].nombreUnidad = idUnidadDestino === 'unidad-orion-1' ? 'Halcones' : 'Águilas';
            return of(this.mockMiembros[idx]);
          }
        }
        return throwError(() => err);
      })
    );
  }

  inactivarMiembro(idMiembro: string): Observable<Miembro> {
    return this.http.delete<Miembro>(`${this.miembrosUrl}/${idMiembro}`).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('MiembroService.inactivarMiembro failed (offline), simulating locally', err);
          const idx = this.mockMiembros.findIndex(m => m.idMiembro === idMiembro);
          if (idx !== -1) {
            this.mockMiembros[idx].estado = 'INACTIVO';
            return of(this.mockMiembros[idx]);
          }
        }
        return throwError(() => err);
      })
    );
  }

  importarMiembrosCsv(file: File, idClub: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('idClub', idClub);

    return this.http.post<any>(`${this.miembrosUrl}/importar`, formData, { responseType: 'text' as 'json' }).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('MiembroService.importarMiembrosCsv failed (offline), simulating locally', err);
          return of({
            success: true,
            message: 'Importación masiva completada con éxito. (Simulado)'
          });
        }
        return throwError(() => err);
      })
    );
  }

  private calculateMockPendientes(miembro: any): number {
    let count = 0;
    if (miembro.estadoFichaSalud === 'PENDIENTE') count++;
    if (miembro.estadoSeguro === 'NO_POSEE_SEGURO') count++;
    if (miembro.estadoAdhesionPadres === 'PENDIENTE') count++;
    return count;
  }
}
