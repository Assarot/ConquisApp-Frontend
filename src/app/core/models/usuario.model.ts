export interface Rol {
  idRol: string;
  nombre: string;
}

export interface Usuario {
  idUsuario: string;
  nombre: string;
  apellido: string;
  email: string;
  idClub: string;
  rol: Rol | string;
  estado: string;
}

export interface TokenResponse {
  token: string;
  tokenType: string;
}
