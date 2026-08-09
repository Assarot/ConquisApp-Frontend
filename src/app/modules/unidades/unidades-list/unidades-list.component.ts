import { Component, OnInit, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UnidadService } from '../../../core/services/unidad.service';
import { Unidad } from '../../../models/api.models';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-unidades-list',
  templateUrl: './unidades-list.component.html',
  standalone: false
})
export class UnidadesListComponent implements OnInit {
  unidades: Unidad[] = [];
  isLoading = false;
  showModal = false;
  isEditing = false;
  selectedUnidadId: string | null = null;
  unidadForm: FormGroup;

  currentUser = computed(() => this.authService.currentUser());
  canEdit = computed(() => {
    const rawRol = this.currentUser()?.rol;
    const role = typeof rawRol === 'string' ? rawRol : (rawRol as any)?.nombre;
    return role === 'ADMINISTRADOR' || role === 'DIRECTOR' || role === 'SECRETARIO' || role === 'DIRECTOR_ASOCIADO';
  });

  // Color options for unit icon
  colorOptions = [
    { label: 'Azul Marino', value: 'primary' },
    { label: 'Rojo', value: 'secondary' },
    { label: 'Dorado', value: 'tertiary' }
  ];

  iconOptions = ['pets', 'flight', 'auto_awesome', 'bolt', 'local_fire_department', 'waves', 'grass', 'star'];

  constructor(
    private authService: AuthService,
    private unidadService: UnidadService,
    private fb: FormBuilder
  ) {
    this.unidadForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      descripcion: [''],
      icono: ['pets'],
      color: ['primary']
    });
  }

  ngOnInit(): void {
    this.loadUnidades();
  }

  loadUnidades(): void {
    this.isLoading = true;
    this.unidadService.getUnidades().subscribe({
      next: (data) => {
        this.unidades = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error cargando unidades', err);
      }
    });
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.selectedUnidadId = null;
    this.unidadForm.reset({ nombre: '', descripcion: '', icono: 'pets', color: 'primary' });
    this.showModal = true;
  }

  openEditModal(unidad: Unidad): void {
    this.isEditing = true;
    this.selectedUnidadId = unidad.idUnidad;
    this.unidadForm.patchValue({ nombre: unidad.nombre, descripcion: '' });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  onSubmit(): void {
    if (this.unidadForm.invalid) return;
    const formVal = this.unidadForm.value;
    this.isLoading = true;

    if (this.isEditing && this.selectedUnidadId) {
      this.unidadService.actualizarUnidad(this.selectedUnidadId, {
        nombre: formVal.nombre,
        descripcion: formVal.descripcion,
        icono: formVal.icono,
        color: formVal.color
      }).subscribe({
        next: () => {
          this.closeModal();
          this.loadUnidades();
          Swal.fire({ title: 'Unidad Actualizada', icon: 'success', timer: 1500, showConfirmButton: false,
            background: '#f8f9fa', color: '#191c1d', confirmButtonColor: '#00113a' });
        },
        error: () => {
          this.isLoading = false;
          Swal.fire({ title: 'Error', text: 'No se pudo actualizar la unidad.', icon: 'error',
            background: '#f8f9fa', color: '#191c1d' });
        }
      });
    } else {
      this.unidadService.crearUnidad({
        idUnidad: '',
        nombre: formVal.nombre,
        descripcion: formVal.descripcion,
        icono: formVal.icono,
        color: formVal.color
      }).subscribe({
        next: () => {
          this.closeModal();
          this.loadUnidades();
          Swal.fire({ title: 'Unidad Creada', icon: 'success', timer: 1500, showConfirmButton: false,
            background: '#f8f9fa', color: '#191c1d', confirmButtonColor: '#00113a' });
        },
        error: () => {
          this.isLoading = false;
          Swal.fire({ title: 'Error', text: 'No se pudo crear la unidad.', icon: 'error',
            background: '#f8f9fa', color: '#191c1d' });
        }
      });
    }
  }

  onDelete(unidad: Unidad): void {
    Swal.fire({
      title: `¿Eliminar "${unidad.nombre}"?`,
      text: 'Esta acción no se puede deshacer. Los miembros de esta unidad quedarán sin unidad asignada.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b7102a',
      cancelButtonColor: '#444650',
      background: '#f8f9fa',
      color: '#191c1d'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.unidadService.eliminarUnidad(unidad.idUnidad).subscribe({
          next: () => {
            Swal.fire({ title: 'Eliminada', icon: 'success', timer: 1500, showConfirmButton: false,
              background: '#f8f9fa', color: '#191c1d' });
            this.loadUnidades();
          },
          error: () => {
            this.isLoading = false;
            Swal.fire({ title: 'Error', text: 'No se pudo eliminar la unidad.', icon: 'error',
              background: '#f8f9fa', color: '#191c1d' });
          }
        });
      }
    });
  }

  getIconForUnidad(nombre: string): string {
    const name = nombre?.toLowerCase() || '';
    if (name.includes('halcon') || name.includes('halcón')) return 'flight';
    if (name.includes('aguila') || name.includes('águila')) return 'bolt';
    if (name.includes('leon') || name.includes('león')) return 'pets';
    if (name.includes('estrella')) return 'auto_awesome';
    return 'group_work';
  }

  getColorClassForUnidad(idx: number): string {
    const colors = [
      'bg-[#002366] text-[#758dd5]',
      'bg-[#b7102a] text-white',
      'bg-[#ffdea9] text-[#5e4100]',
      'bg-[#dbe1ff] text-[#2a4386]'
    ];
    return colors[idx % colors.length];
  }
}
