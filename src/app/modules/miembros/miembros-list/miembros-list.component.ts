import { Component, OnInit, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MiembroService } from '../../../core/services/miembro.service';
import { AuthService } from '../../../core/services/auth.service';
import { Miembro } from '../../../core/models/miembro.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-miembros-list',
  templateUrl: './miembros-list.component.html',
  standalone: false
})
export class MiembrosListComponent implements OnInit {
  miembros: Miembro[] = [];
  filteredMiembros: Miembro[] = [];
  isLoading = false;

  // Filter properties
  searchTerm = '';
  roleFilter = '';

  // Modals state
  showMemberModal = false;
  isEditing = false;
  selectedMiembroId: string | null = null;
  memberForm: FormGroup;

  // Acceso de usuario
  showCreateUserModal = false;
  selectedMiembro: Miembro | null = null;
  userForm: FormGroup;
  isSavingUser = false;

  // Seeded static data for dropdowns (mapped to DB seeds)
  unidades = [
    { id: '1', nombre: 'Halcones' },
    { id: '2', nombre: 'Águilas' },
    { id: '3', nombre: 'Leones' },
    { id: '4', nombre: 'Estrellas' }
  ];

  clases = [
    { id: '1', nombre: 'Amigo' },
    { id: '2', nombre: 'Compañero' },
    { id: '3', nombre: 'Explorador' },
    { id: '4', nombre: 'Pionero' },
    { id: '5', nombre: 'Excursionista' },
    { id: '6', nombre: 'Guía' }
  ];

  // Auth permissions using auth signals
  currentUser = computed(() => this.authService.currentUser());
  canImportMembers = computed(() => {
    const rawRol = this.currentUser()?.rol;
    const role = typeof rawRol === 'string' ? rawRol : (rawRol as any)?.nombre;
    return role === 'ADMINISTRADOR' || role === 'DIRECTOR' || role === 'SECRETARIO' || role === 'DIRECTOR_ASOCIADO';
  });

  constructor(
    private miembroService: MiembroService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.memberForm = this.fb.group({
      nombre: ['', [Validators.required]],
      apellido: ['', [Validators.required]],
      funcion: ['CONQUISTADOR', [Validators.required]],
      estado: ['ACTIVO', [Validators.required]],
      estadoFichaSalud: ['PENDIENTE', [Validators.required]],
      estadoSeguro: ['NO_POSEE_SEGURO', [Validators.required]],
      estadoAdhesionPadres: ['PENDIENTE', [Validators.required]],
      idClase: ['1', [Validators.required]],
      idUnidad: ['1', [Validators.required]]
    });

    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.loadMiembros();
  }

  loadMiembros(): void {
    this.isLoading = true;
    const clubId = this.currentUser()?.idClub?.toString() || '1';
    this.miembroService.getMiembrosByClub(clubId).subscribe({
      next: (data) => {
        // Map JPA relationships if returned as nested objects
        this.miembros = data.map((item: any) => {
          return {
            idMiembro: item.idMiembro,
            nombre: item.nombre,
            apellido: item.apellido,
            funcion: item.funcion,
            estado: item.estado,
            estadoFichaSalud: item.estadoFichaSalud,
            estadoSeguro: item.estadoSeguro,
            estadoAdhesionPadres: item.estadoAdhesionPadres,
            pendientes: item.pendientes,
            idClub: item.club?.idClub?.toString() || item.idClub?.toString(),
            idUnidad: item.unidad?.idUnidad?.toString() || item.idUnidad?.toString(),
            idClase: item.clase?.idClase?.toString() || item.idClase?.toString(),
            nombreUnidad: item.unidad?.nombre || item.nombreUnidad || (item.unidad?.idUnidad?.toString() === '1' ? 'Halcones' : item.unidad?.idUnidad?.toString() === '2' ? 'Águilas' : item.unidad?.idUnidad?.toString() === '3' ? 'Leones' : item.unidad?.idUnidad?.toString() === '4' ? 'Estrellas' : ''),
            nombreClase: item.clase?.nombre || item.nombreClase || (item.clase?.idClase?.toString() === '6' ? 'Guía' : item.clase?.idClase?.toString() === '2' ? 'Compañero' : item.clase?.idClase?.toString() === '1' ? 'Amigo' : '')
          };
        });
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error fetching members', err);
      }
    });
  }

  applyFilters(): void {
    this.filteredMiembros = this.miembros.filter(miembro => {
      const fullname = `${miembro.nombre} ${miembro.apellido}`.toLowerCase();
      const matchesSearch =
        fullname.includes(this.searchTerm.toLowerCase()) ||
        miembro.funcion.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesRole = this.roleFilter ? miembro.funcion === this.roleFilter : true;

      return matchesSearch && matchesRole;
    });
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.selectedMiembroId = null;
    this.memberForm.reset({
      nombre: '',
      apellido: '',
      funcion: 'CONQUISTADOR',
      estado: 'ACTIVO',
      estadoFichaSalud: 'PENDIENTE',
      estadoSeguro: 'NO_POSEE_SEGURO',
      estadoAdhesionPadres: 'PENDIENTE',
      idClase: '1',
      idUnidad: '1'
    });
    this.showMemberModal = true;
  }

  openEditModal(miembro: Miembro): void {
    this.isEditing = true;
    this.selectedMiembroId = miembro.idMiembro;
    this.memberForm.patchValue({
      nombre: miembro.nombre,
      apellido: miembro.apellido,
      funcion: miembro.funcion,
      estado: miembro.estado,
      estadoFichaSalud: miembro.estadoFichaSalud,
      estadoSeguro: miembro.estadoSeguro,
      estadoAdhesionPadres: miembro.estadoAdhesionPadres,
      idClase: miembro.idClase,
      idUnidad: miembro.idUnidad
    });
    this.showMemberModal = true;
  }

  closeMemberModal(): void {
    this.showMemberModal = false;
  }

  onSubmitMember(): void {
    if (this.memberForm.invalid) return;

    const formVal = this.memberForm.value;
    const clubId = this.currentUser()?.idClub || 'uuid-club-conquistadores-orion';

    // Map properties to full nested objects for Spring Boot JPA
    const payload: any = {
      nombre: formVal.nombre,
      apellido: formVal.apellido,
      funcion: formVal.funcion,
      estado: formVal.estado,
      estadoFichaSalud: formVal.estadoFichaSalud,
      estadoSeguro: formVal.estadoSeguro,
      estadoAdhesionPadres: formVal.estadoAdhesionPadres,
      club: { idClub: clubId },
      clase: { idClase: formVal.idClase },
      unidad: { idUnidad: formVal.idUnidad }
    };

    if (this.isEditing && this.selectedMiembroId) {
      payload.idMiembro = this.selectedMiembroId;
    }

    this.isLoading = true;
    this.miembroService.registrarMiembro(payload).subscribe({
      next: () => {
        this.closeMemberModal();
        Swal.fire({
          title: this.isEditing ? 'Miembro Actualizado' : 'Miembro Registrado',
          text: this.isEditing ? 'La información del miembro ha sido modificada.' : 'El miembro se registró en el padrón con éxito.',
          icon: 'success',
          background: '#111827',
          color: '#f3f4f6',
          confirmButtonColor: '#10b981'
        });
        this.loadMiembros();
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudo guardar la información del miembro.',
          icon: 'error',
          background: '#111827',
          color: '#f3f4f6',
          confirmButtonColor: '#eab308'
        });
        console.error(err);
      }
    });
  }

  onInactivate(miembro: Miembro): void {
    Swal.fire({
      title: '¿Inactivar miembro?',
      text: `El estado de ${miembro.nombre} ${miembro.apellido} cambiará a INACTIVO. El historial no se perderá.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, inactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      background: '#111827',
      color: '#f3f4f6'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.miembroService.inactivarMiembro(miembro.idMiembro).subscribe({
          next: () => {
            Swal.fire({
              title: 'Inactivado',
              text: 'El miembro ha sido marcado como inactivo.',
              icon: 'success',
              background: '#111827',
              color: '#f3f4f6',
              confirmButtonColor: '#10b981'
            });
            this.loadMiembros();
          },
          error: (err) => {
            this.isLoading = false;
            Swal.fire({
              title: 'Error',
              text: 'No se pudo inactivar el miembro.',
              icon: 'error',
              background: '#111827',
              color: '#f3f4f6'
            });
          }
        });
      }
    });
  }

  onChangeUnit(miembro: Miembro): void {
    // Dynamically query or display choices using SwAl select
    const inputOptions: { [key: string]: string } = {};
    this.unidades.forEach(u => {
      inputOptions[u.id] = u.nombre;
    });

    Swal.fire({
      title: 'Cambiar Unidad',
      text: `Selecciona la nueva unidad para ${miembro.nombre}:`,
      input: 'select',
      inputOptions: inputOptions,
      inputValue: miembro.idUnidad || '1',
      showCancelButton: true,
      confirmButtonText: 'Cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#eab308',
      background: '#111827',
      color: '#f3f4f6',
      inputValidator: (value) => {
        return new Promise((resolve) => {
          if (value) {
            resolve();
          } else {
            resolve('Debes seleccionar una unidad.');
          }
        });
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.isLoading = true;
        this.miembroService.cambiarUnidad(miembro.idMiembro, result.value).subscribe({
          next: () => {
            Swal.fire({
              title: 'Unidad Cambiada',
              text: 'Se registró el traspaso en el historial de unidades.',
              icon: 'success',
              background: '#111827',
              color: '#f3f4f6',
              confirmButtonColor: '#10b981'
            });
            this.loadMiembros();
          },
          error: (err) => {
            this.isLoading = false;
            Swal.fire({
              title: 'Error',
              text: 'No se pudo cambiar la unidad.',
              icon: 'error',
              background: '#111827',
              color: '#f3f4f6'
            });
          }
        });
      }
    });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      Swal.fire({
        title: 'Archivo Inválido',
        text: 'Por favor, selecciona únicamente un archivo con extensión .xlsx o .xls',
        icon: 'error',
        background: '#111827',
        color: '#f3f4f6',
        confirmButtonColor: '#eab308'
      });
      return;
    }

    const clubId = this.currentUser()?.idClub?.toString() || '1';
    this.isLoading = true;

    this.miembroService.importarMiembrosExcel(file, clubId).subscribe({
      next: () => {
        Swal.fire({
          title: 'Importación Exitosa',
          text: 'Padrón de miembros actualizado con éxito.',
          icon: 'success',
          background: '#111827',
          color: '#f3f4f6',
          confirmButtonColor: '#10b981'
        });
        this.loadMiembros();
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({
          title: 'Error de Importación',
          text: 'Ocurrió un problema al procesar el archivo Excel. Verifica el formato de las columnas.',
          icon: 'error',
          background: '#111827',
          color: '#f3f4f6',
          confirmButtonColor: '#eab308'
        });
        console.error(err);
      }
    });
  }

  onExportExcel(): void {
    const clubId = this.currentUser()?.idClub?.toString() || '1';
    this.isLoading = true;
    this.miembroService.exportarExcel(clubId).subscribe({
      next: (blob) => {
        this.isLoading = false;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const extension = blob.type.includes('csv') ? 'csv' : 'xlsx';
        a.download = `Miembros-Club-${clubId}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
        Swal.fire({
          title: 'Exportación Exitosa',
          text: 'Archivo Excel generado correctamente.',
          icon: 'success',
          background: '#111827',
          color: '#f3f4f6',
          confirmButtonColor: '#10b981'
        });
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({
          title: 'Error al exportar',
          text: 'No se pudo generar el archivo Excel.',
          icon: 'error',
          background: '#111827',
          color: '#f3f4f6',
          confirmButtonColor: '#eab308'
        });
        console.error(err);
      }
    });
  }

  getPendientesBadgeClass(pendientes: number): string {
    if (pendientes === 0) {
      return 'bg-green-100 text-green-800 border border-green-200';
    } else if (pendientes <= 2) {
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    } else {
      return 'bg-red-100 text-red-800 border border-red-200';
    }
  }

  getPendientesLabel(pendientes: number): string {
    if (pendientes === 0) return 'Apto (0)';
    if (pendientes <= 2) return `Advertencia (${pendientes})`;
    return `Crítico (${pendientes})`;
  }

  openCreateUserModal(miembro: Miembro): void {
    this.selectedMiembro = miembro;
    this.userForm.reset({
      email: '',
      password: ''
    });
    this.showCreateUserModal = true;
  }

  closeCreateUserModal(): void {
    this.showCreateUserModal = false;
    this.selectedMiembro = null;
  }

  onSubmitUser(): void {
    if (this.userForm.invalid || !this.selectedMiembro) return;

    this.isSavingUser = true;
    const formVal = this.userForm.value;
    const rolId = this.mapFuncionToRolId(this.selectedMiembro.funcion);
    const clubId = this.selectedMiembro.idClub || this.currentUser()?.idClub || '1';

    const payload = {
      nombre: this.selectedMiembro.nombre,
      apellido: this.selectedMiembro.apellido,
      email: formVal.email,
      password: formVal.password,
      idClub: Number(clubId),
      idRol: Number(rolId)
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.isSavingUser = false;
        this.closeCreateUserModal();
        Swal.fire({
          title: 'Usuario Creado',
          text: `Se ha creado el usuario de acceso para ${this.selectedMiembro?.nombre} correctamente.`,
          icon: 'success',
          background: '#111827',
          color: '#f3f4f6',
          confirmButtonColor: '#10b981'
        });
      },
      error: (err) => {
        this.isSavingUser = false;
        Swal.fire({
          title: 'Error al registrar',
          text: err?.error?.error || 'No se pudo crear el usuario. Es posible que el correo electrónico ya esté registrado.',
          icon: 'error',
          background: '#111827',
          color: '#f3f4f6',
          confirmButtonColor: '#eab308'
        });
      }
    });
  }

  mapFuncionToRolId(funcion: string): string {
    const fn = funcion?.toUpperCase() || '';
    if (fn.includes('ADMINISTRADOR')) return '1';
    if (fn.includes('DIRECTOR')) return '2';
    if (fn.includes('SECRETARIO')) return '3';
    if (fn.includes('DIRECTOR_ASOCIADO')) return '4';
    if (fn.includes('INSTRUCTOR')) return '5';
    if (fn.includes('CONSEJERO')) return '6';
    if (fn.includes('CONQUISTADOR')) return '7';
    if (fn.includes('PADRE')) return '8';
    return '7';
  }
}
