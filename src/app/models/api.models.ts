export interface Unidad {
  idUnidad: string;
  nombre: string;
  consejeroId?: number;
  consejeroNombre?: string;
  miembrosCount?: number;
  puntos?: number;
  icono?: string;
  color?: string;
  descripcion?: string;
}

export interface Clase {
  idClase: string;
  nombre: string;
  // add additional fields as needed
}

export interface Sesion {
  idSesion: string;
  nombre: string;
  fecha: string; // ISO date string
  // add additional fields as needed
}

export interface Evento {
  idEvento: string;
  nombre: string;
  fecha: string; // ISO date string
  // add additional fields as needed
}
