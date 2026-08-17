export interface Poa {
  idPoa: string;
  idClub: string;
  anio: number;
  estado: string;
}

export interface ActividadPoa {
  idActividad?: string;
  idPoa: string;
  nombre: string;
  fecha: string; // YYYY-MM-DD
  ambito: string; // CLUB, IGLESIA, REGION, ASOCIACION, RECURRENTE
  responsable: string;
  lugar?: string;
}
