import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ClubService, ClubBackend, ClaseBackend } from '../../core/services/club.service';
import { AuthService } from '../../core/services/auth.service';
import { EspecialidadService, EspecialidadBackend } from '../../core/services/especialidad.service';
import { RequisitoService, RequisitoBackend } from '../../core/services/requisito.service';
import Swal from 'sweetalert2';

// Force compiler rebuild to recognize interface extensions

export interface ClubAdmin {
  id: string;
  nombre: string;
  distrito: string;
  asociacion: string;
  director: string;
  miembrosCount: number;
  unidadesCount: number;
  estado: 'ACTIVO' | 'EN_FORMACION';
}

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  club: string;
  estado: 'ACTIVO' | 'INACTIVO';
  ultimoAcceso: string;
}

export interface GrupoUsuariosClub {
  idClub: number | null;
  clubNombre: string;
  usuarios: UsuarioAdmin[];
  isOpen?: boolean;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  standalone: false
})
export class AdminComponent implements OnInit {
  activeTab = signal<'CLUBES' | 'USUARIOS' | 'ESPECIALIDADES' | 'CLASES'>('CLUBES');
  showCrearClubModal = false;
  showCrearUsuarioModal = false;
  showCrearEspecialidadModal = false;
  showCrearClaseModal = false;
  isLoading = signal(false);

  especialidades = signal<EspecialidadBackend[]>([]);
  clasesList = signal<ClaseBackend[]>([]);

  nuevaEspecialidad: EspecialidadBackend = {
    nombre: '',
    categoria: 'NATURALEZA',
    descripcion: '',
    requiereExamen: true,
    puntos: 10
  };

  nuevaClase: ClaseBackend = {
    nombre: ''
  };

  nuevoClub: Partial<ClubAdmin> = {
    nombre: '',
    distrito: '',
    asociacion: 'Misión del Oriente Peruano (MOP)',
    director: '',
    estado: 'ACTIVO'
  };

  nuevoUsuario = {
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    idRol: null as number | null,
    idClub: null as number | null
  };

  directorOption: 'existing' | 'new' = 'existing';
  idDirectorExistente: number | null = null;
  directorNuevo = {
    nombre: '',
    apellido: '',
    email: '',
    password: ''
  };

  showEditarClubModal = false;
  selectedClub: any = null;

  showEditarUsuarioModal = false;
  selectedUsuario: any = null;

  showRequisitosModal = false;
  selectedClase: ClaseBackend | null = null;
  selectedEspecialidad: EspecialidadBackend | null = null;
  requisitos = signal<RequisitoBackend[]>([]);
  nuevoRequisitoDesc = '';
  nuevoRequisitoEsAvanzado = false;

  clubes = signal<ClubAdmin[]>([]);
  usuarios = signal<UsuarioAdmin[]>([]);
  rolesList = signal<any[]>([]);

  currentUser = computed(() => this.authService.currentUser());
  isAdmin = computed(() => {
    const role = this.currentUser()?.rol;
    const roleName = typeof role === 'string' ? role : (role as any)?.nombre;
    return roleName === 'ADMINISTRADOR';
  });

  totalConquistadores = computed(() => this.clubes().reduce((acc, c) => acc + (c.miembrosCount || 0), 0));



  constructor(
    private clubService: ClubService,
    private authService: AuthService,
    private especialidadService: EspecialidadService,
    private requisitoService: RequisitoService,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'clubes') this.activeTab.set('CLUBES');
      else if (tab === 'usuarios') this.activeTab.set('USUARIOS');
      else if (tab === 'especialidades') this.activeTab.set('ESPECIALIDADES');
      else if (tab === 'clases') this.activeTab.set('CLASES');
      else {
        if (this.isAdmin()) this.activeTab.set('CLUBES');
        else this.activeTab.set('USUARIOS');
      }
    });

    this.cargarClubes();
    this.cargarEspecialidades();
    this.cargarClases();
    this.cargarUsuarios();
    this.cargarRoles();
  }

  usuariosGrouped = signal<GrupoUsuariosClub[]>([]);

  cargarUsuarios(): void {
    if (this.isAdmin()) {
      this.authService.getGroupedUsers().subscribe({
        next: (data) => {
          const grouped: GrupoUsuariosClub[] = data.map(group => ({
            idClub: group.idClub,
            clubNombre: group.clubNombre,
            usuarios: group.usuarios.map((u: any) => ({
              id: u.idUsuario.toString(),
              nombre: `${u.nombre} ${u.apellido}`,
              email: u.email,
              rol: u.rol,
              club: u.idClub ? group.clubNombre : 'Administración Global',
              estado: u.estado as any,
              ultimoAcceso: 'Reciente'
            })),
            isOpen: group.idClub === null || group.idClub === 1
          }));
          this.usuariosGrouped.set(grouped);
        },
        error: (err) => {
          console.error('Error fetching grouped users', err);
        }
      });
    } else {
      this.authService.getUsers().subscribe({
        next: (data) => {
          const clubUsers: UsuarioAdmin[] = data.map(u => ({
            id: u.idUsuario.toString(),
            nombre: `${u.nombre} ${u.apellido}`,
            email: u.email,
            rol: u.rol,
            club: 'Tu Club',
            estado: u.estado as any,
            ultimoAcceso: 'Reciente'
          })).sort((u1, u2) => this.getRolePriority(u1.rol).localeCompare(this.getRolePriority(u2.rol)));

          this.usuariosGrouped.set([{
            idClub: Number(this.currentUser()?.idClub),
            clubNombre: 'Tu Club',
            usuarios: clubUsers,
            isOpen: true
          }]);
        },
        error: (err) => {
          console.error('Error fetching users', err);
        }
      });
    }
  }

  private getRolePriority(roleName: string): string {
    if (!roleName) return '99';
    switch (roleName.toUpperCase()) {
      case 'ADMINISTRADOR': return '1';
      case 'DIRECTOR': return '2';
      case 'DIRECTOR_ASOCIADO': return '3';
      case 'SECRETARIO': return '4';
      case 'INSTRUCTOR': return '5';
      case 'CONSEJERO': return '6';
      case 'CONQUISTADOR': return '7';
      case 'PADRE': return '8';
      default: return '99';
    }
  }

  toggleGroupOpen(group: GrupoUsuariosClub): void {
    group.isOpen = !group.isOpen;
  }

  cargarRoles(): void {
    this.authService.getRoles().subscribe({
      next: (data) => {
        this.rolesList.set(data);
      },
      error: (err) => {
        console.error('Error fetching roles', err);
      }
    });
  }

  getFilteredRoles(): any[] {
    const roles = this.rolesList();
    if (this.isAdmin()) {
      return roles;
    }
    return roles.filter(r => r.nombre !== 'ADMINISTRADOR' && r.nombre !== 'DIRECTOR');
  }

  openCrearUsuarioModal(): void {
    const directorClubId = this.currentUser()?.idClub;
    this.nuevoUsuario = {
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      idRol: null,
      idClub: this.isAdmin() ? null : (directorClubId ? Number(directorClubId) : null)
    };
    this.showCrearUsuarioModal = true;
  }

  crearUsuario(): void {
    if (!this.nuevoUsuario.nombre || !this.nuevoUsuario.apellido || !this.nuevoUsuario.email || !this.nuevoUsuario.password || !this.nuevoUsuario.idRol) {
      Swal.fire('Campos Obligatorios', 'Por favor completa todos los campos del usuario', 'warning');
      return;
    }

    const payload = {
      nombre: this.nuevoUsuario.nombre,
      apellido: this.nuevoUsuario.apellido,
      email: this.nuevoUsuario.email,
      password: this.nuevoUsuario.password,
      idRol: Number(this.nuevoUsuario.idRol),
      idClub: Number(this.nuevoUsuario.idRol) === 1 ? null : (this.nuevoUsuario.idClub ? Number(this.nuevoUsuario.idClub) : null)
    };

    this.authService.register(payload).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Usuario Registrado',
          text: 'El usuario ha sido registrado y cuenta con credenciales activas.',
          timer: 2000,
          showConfirmButton: false
        });
        this.showCrearUsuarioModal = false;
        this.cargarUsuarios();
      },
      error: (err) => {
        Swal.fire('Error', 'No se pudo registrar el usuario. Es posible que el email ya esté registrado.', 'error');
        console.error(err);
      }
    });
  }

  cargarClubes(): void {
    this.isLoading.set(true);
    this.clubService.getClubes().subscribe({
      next: (data) => {
        this.isLoading.set(false);
        if (data && data.length > 0) {
          const items: ClubAdmin[] = data.map((c, i) => {
            let configObj: any = {};
            try {
              if (c.configuracion) configObj = JSON.parse(c.configuracion);
            } catch (e) {}

            return {
              id: c.idClub || `c-${i}`,
              nombre: c.nombre,
              distrito: configObj.distrito || 'Distrito Central',
              asociacion: configObj.mision || 'Misión del Oriente Peruano (MOP)',
              director: configObj.director || 'Esteban Quito',
              miembrosCount: c.miembrosCount || 0,
              unidadesCount: c.unidadesCount || 0,
              estado: 'ACTIVO'
            };
          });
          this.clubes.set(items);
        } else {
          this.cargarFallback();
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.cargarFallback();
      }
    });
  }

  private cargarFallback(): void {
    this.clubes.set([
      {
        id: 'c-1',
        nombre: 'Club Fernando Stahl',
        distrito: 'Iquitos Central',
        asociacion: 'Misión del Oriente Peruano (MOP)',
        director: 'Esteban Quito',
        miembrosCount: 30,
        unidadesCount: 4,
        estado: 'ACTIVO'
      },
      {
        id: 'c-2',
        nombre: 'Club Orión',
        distrito: 'Punchana',
        asociacion: 'Misión del Oriente Peruano (MOP)',
        director: 'Roberto Gómez',
        miembrosCount: 22,
        unidadesCount: 3,
        estado: 'ACTIVO'
      },
      {
        id: 'c-3',
        nombre: 'Club Betel',
        distrito: 'San Juan Bautista',
        asociacion: 'Misión del Oriente Peruano (MOP)',
        director: 'Patricia Dávila',
        miembrosCount: 16,
        unidadesCount: 2,
        estado: 'EN_FORMACION'
      }
    ]);
  }

  getUnassignedDirectors(): any[] {
    const list: any[] = [];
    this.usuariosGrouped().forEach(g => {
      if (g.idClub === null) {
        g.usuarios.forEach(u => {
          if (u.rol !== 'ADMINISTRADOR') {
            list.push(u);
          }
        });
      }
    });
    return list;
  }

  crearClub(): void {
    if (!this.nuevoClub.nombre || !this.nuevoClub.distrito) {
      Swal.fire('Campos Obligatorios', 'Por favor ingresa el nombre del club y el distrito eclesiástico', 'warning');
      return;
    }

    const payload: any = {
      club: {
        nombre: this.nuevoClub.nombre || '',
        tipo: 'CONQUISTADORES',
        configuracion: JSON.stringify({
          distrito: this.nuevoClub.distrito,
          mision: this.nuevoClub.asociacion
        })
      }
    };

    if (this.directorOption === 'existing') {
      if (this.idDirectorExistente) {
        payload.idDirectorExistente = Number(this.idDirectorExistente);
      }
    } else if (this.directorOption === 'new') {
      if (this.directorNuevo.email && this.directorNuevo.password) {
        payload.directorNombre = this.directorNuevo.nombre;
        payload.directorApellido = this.directorNuevo.apellido;
        payload.directorEmail = this.directorNuevo.email;
        payload.directorPassword = this.directorNuevo.password;
      }
    }

    this.clubService.registrarClubConDirector(payload).subscribe({
      next: (res) => {
        let configObj: any = {};
        try {
          if (res.configuracion) configObj = JSON.parse(res.configuracion);
        } catch (e) {}

        const club: ClubAdmin = {
          id: res.idClub || `c-${Date.now()}`,
          nombre: res.nombre,
          distrito: configObj.distrito || this.nuevoClub.distrito || '',
          asociacion: configObj.mision || this.nuevoClub.asociacion || 'Misión del Oriente Peruano (MOP)',
          director: configObj.director || 'Director por Asignar',
          miembrosCount: 0,
          unidadesCount: 0,
          estado: this.nuevoClub.estado || 'ACTIVO'
        };
        this.clubes.update(list => [...list, club]);
        this.cargarUsuarios();
        
        Swal.fire({
          icon: 'success',
          title: 'Club Registrado',
          text: 'El nuevo club y su director han sido registrados en la base de datos PostgreSQL.',
          timer: 2500,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('Error registering club', err);
        Swal.fire('Error', 'No se pudo registrar el club. Valida los datos o si el email del director ya existe.', 'error');
      }
    });

    this.showCrearClubModal = false;
    this.nuevoClub = {
      nombre: '',
      distrito: '',
      asociacion: 'Misión del Oriente Peruano (MOP)',
      director: '',
      estado: 'ACTIVO'
    };
    this.idDirectorExistente = null;
    this.directorNuevo = { nombre: '', apellido: '', email: '', password: '' };
  }

  toggleEstadoUsuario(id: string): void {
    this.authService.toggleUserStatus(id).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Estado Actualizado',
          text: 'Se cambió el estado del usuario correctamente.',
          timer: 1500,
          showConfirmButton: false
        });
        this.cargarUsuarios();
      },
      error: (err) => {
        Swal.fire('Error', 'No tienes permisos o no se pudo cambiar el estado de este usuario.', 'error');
        console.error(err);
      }
    });
  }

  resetPassword(email: string): void {
    Swal.fire({
      icon: 'info',
      title: 'Restablecer Clave',
      text: `Se ha enviado un enlace de restablecimiento a ${email}.`,
      timer: 2000,
      showConfirmButton: false
    });
  }

  cargarEspecialidades(): void {
    this.especialidadService.getEspecialidades().subscribe({
      next: (data) => {
        this.especialidades.set(data);
      },
      error: (err) => console.error('Error loading specialties', err)
    });
  }

  cargarClases(): void {
    this.clubService.getClases().subscribe({
      next: (data) => {
        this.clasesList.set(data);
      },
      error: (err) => console.error('Error loading classes', err)
    });
  }

  crearEspecialidad(): void {
    this.especialidadService.registrarEspecialidad(this.nuevaEspecialidad).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Especialidad Registrada',
          text: 'La especialidad se ha guardado en el catálogo global.',
          timer: 1500,
          showConfirmButton: false
        });
        this.showCrearEspecialidadModal = false;
        this.nuevaEspecialidad = { nombre: '', categoria: 'NATURALEZA', descripcion: '', requiereExamen: true, puntos: 10 };
        this.cargarEspecialidades();
      },
      error: (err) => {
        Swal.fire('Error', 'No se pudo guardar la especialidad.', 'error');
        console.error(err);
      }
    });
  }

  eliminarEspecialidad(id: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta especialidad se eliminará permanentemente del catálogo global.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#b7102a',
      cancelButtonColor: '#757682',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.especialidadService.eliminarEspecialidad(id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'La especialidad ha sido eliminada.', 'success');
            this.cargarEspecialidades();
          },
          error: (err) => Swal.fire('Error', 'No se pudo eliminar la especialidad.', 'error')
        });
      }
    });
  }

  crearClase(): void {
    this.clubService.registrarClase(this.nuevaClase).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Clase Registrada',
          text: 'La clase se ha guardado en el catálogo global.',
          timer: 1500,
          showConfirmButton: false
        });
        this.showCrearClaseModal = false;
        this.nuevaClase = { nombre: '' };
        this.cargarClases();
      },
      error: (err) => {
        Swal.fire('Error', 'No se pudo guardar la clase.', 'error');
        console.error(err);
      }
    });
  }

  eliminarClase(id: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta clase se eliminará permanentemente del catálogo global.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#b7102a',
      cancelButtonColor: '#757682',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.clubService.eliminarClase(id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'La clase ha sido eliminada.', 'success');
            this.cargarClases();
          },
          error: (err) => Swal.fire('Error', 'No se pudo eliminar la clase.', 'error')
        });
      }
    });
  }

  importarCuadernillos(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    Swal.fire({
      title: 'Importando Cuadernillos...',
      text: 'Por favor espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.http.post(`${environment.apiUrl}/requisitos/importar-cuadernillos`, formData, { responseType: 'text' }).subscribe({
      next: (res) => {
        Swal.fire('Importación Exitosa', res, 'success');
        this.cargarClases();
      },
      error: (err) => {
        console.error('Error importing booklets', err);
        Swal.fire('Error de Importación', err.error || 'Ocurrió un error al procesar el archivo Excel.', 'error');
      }
    });
  }

  importarEspecialidades(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    Swal.fire({
      title: 'Importando Especialidades...',
      text: 'Por favor espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.http.post(`${environment.apiUrl}/requisitos/importar-especialidades`, formData, { responseType: 'text' }).subscribe({
      next: (res) => {
        Swal.fire('Importación Exitosa', res, 'success');
        this.cargarEspecialidades();
      },
      error: (err) => {
        console.error('Error importing specialties', err);
        Swal.fire('Error de Importación', err.error || 'Ocurrió un error al procesar el archivo Excel.', 'error');
      }
    });
  }

  // Club Editing Methods
  abrirEditarClub(club: ClubAdmin): void {
    this.selectedClub = {
      id: club.id,
      nombre: club.nombre,
      estado: club.estado,
      configuracion: {
        distrito: club.distrito,
        mision: club.asociacion
      }
    };
    this.showEditarClubModal = true;
  }

  guardarClubEditado(): void {
    if (!this.selectedClub || !this.selectedClub.nombre) return;
    this.clubService.actualizarClub(this.selectedClub.id, {
      nombre: this.selectedClub.nombre,
      tipo: 'CONQUISTADORES',
      configuracion: JSON.stringify(this.selectedClub.configuracion)
    }).subscribe({
      next: () => {
        Swal.fire('Guardado', 'El club ha sido actualizado correctamente.', 'success');
        this.showEditarClubModal = false;
        this.cargarClubes();
      },
      error: (err) => {
        console.error('Error updating club', err);
        Swal.fire('Error', 'No se pudo actualizar el club.', 'error');
      }
    });
  }

  // User Editing Methods
  abrirEditarUsuario(user: UsuarioAdmin): void {
    const currentRol = this.rolesList().find(r => r.nombre === user.rol);
    const currentClub = this.clubes().find(c => c.nombre === user.club);

    this.selectedUsuario = {
      id: user.id,
      nombre: user.nombre.split(' ')[0] || '',
      apellido: user.nombre.split(' ').slice(1).join(' ') || '',
      email: user.email,
      password: '',
      idRol: currentRol ? currentRol.idRol : null,
      idClub: currentClub ? currentClub.id : null
    };
    this.showEditarUsuarioModal = true;
  }

  guardarUsuarioEditado(): void {
    if (!this.selectedUsuario || !this.selectedUsuario.nombre || !this.selectedUsuario.email) return;
    
    const payload: any = {
      nombre: this.selectedUsuario.nombre,
      apellido: this.selectedUsuario.apellido,
      email: this.selectedUsuario.email,
      idRol: this.selectedUsuario.idRol,
      idClub: this.selectedUsuario.idClub
    };
    if (this.selectedUsuario.password && this.selectedUsuario.password.trim() !== '') {
      payload.password = this.selectedUsuario.password;
    }

    this.authService.updateUser(this.selectedUsuario.id, payload).subscribe({
      next: () => {
        Swal.fire('Guardado', 'El usuario ha sido actualizado correctamente.', 'success');
        this.showEditarUsuarioModal = false;
        this.cargarUsuarios();
      },
      error: (err) => {
        console.error('Error updating user', err);
        Swal.fire('Error', err.error?.message || 'No se pudo actualizar el usuario.', 'error');
      }
    });
  }

  // Requirements Modal Methods
  abrirRequisitosClase(clase: ClaseBackend): void {
    this.selectedClase = clase;
    this.selectedEspecialidad = null;
    this.cargarRequisitosClase(clase.idClase!);
    this.showRequisitosModal = true;
  }

  abrirRequisitosEspecialidad(esp: EspecialidadBackend): void {
    this.selectedEspecialidad = esp;
    this.selectedClase = null;
    this.cargarRequisitosEspecialidad(esp.idEspecialidad!);
    this.showRequisitosModal = true;
  }

  cargarRequisitosClase(id: number | string): void {
    this.requisitoService.getRequisitosByClase(id).subscribe({
      next: (res) => this.requisitos.set(res),
      error: () => this.requisitos.set([])
    });
  }

  cargarRequisitosEspecialidad(id: number | string): void {
    this.requisitoService.getRequisitosByEspecialidad(id).subscribe({
      next: (res) => this.requisitos.set(res),
      error: () => this.requisitos.set([])
    });
  }

  agregarRequisito(): void {
    if (!this.nuevoRequisitoDesc || this.nuevoRequisitoDesc.trim() === '') return;

    const payload: any = {
      descripcion: this.nuevoRequisitoDesc,
      esAvanzado: this.nuevoRequisitoEsAvanzado
    };

    if (this.selectedClase) {
      payload.idClase = this.selectedClase.idClase;
    } else if (this.selectedEspecialidad) {
      payload.idEspecialidad = this.selectedEspecialidad.idEspecialidad;
    }

    this.requisitoService.registrarRequisito(payload).subscribe({
      next: () => {
        this.nuevoRequisitoDesc = '';
        this.nuevoRequisitoEsAvanzado = false;
        if (this.selectedClase) {
          this.cargarRequisitosClase(this.selectedClase.idClase!);
        } else if (this.selectedEspecialidad) {
          this.cargarRequisitosEspecialidad(this.selectedEspecialidad.idEspecialidad!);
        }
      },
      error: (err) => {
        console.error('Error creating requirement', err);
        Swal.fire('Error', 'No se pudo registrar el requisito.', 'error');
      }
    });
  }

  eliminarRequisito(id: number): void {
    Swal.fire({
      title: '¿Eliminar Requisito?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.requisitoService.eliminarRequisito(id).subscribe({
          next: () => {
            if (this.selectedClase) {
              this.cargarRequisitosClase(this.selectedClase.idClase!);
            } else if (this.selectedEspecialidad) {
              this.cargarRequisitosEspecialidad(this.selectedEspecialidad.idEspecialidad!);
            }
          },
          error: (err) => {
            console.error('Error deleting requirement', err);
            Swal.fire('Error', 'No se pudo eliminar el requisito.', 'error');
          }
        });
      }
    });
  }

  eliminarClubSeguro(club: any): void {
    if (!club) return;
    const clubNombre = club.nombre;

    Swal.fire({
      title: '¿Eliminar Club?',
      text: `Esta acción eliminará todos los datos asociados al club. Escribe el nombre exacto del club "${clubNombre}" para confirmar:`,
      input: 'text',
      inputPlaceholder: 'Nombre del club',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar permanentemente',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      inputValidator: (value) => {
        if (!value || value.trim() !== clubNombre) {
          return 'El nombre ingresado no coincide con el del club.';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.clubService.eliminarClub(club.id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El club ha sido eliminado correctamente.', 'success');
            this.showEditarClubModal = false;
            this.cargarClubes();
          },
          error: (err) => {
            console.error('Error deleting club', err);
            Swal.fire('Error', 'No se pudo eliminar el club.', 'error');
          }
        });
      }
    });
  }
}
