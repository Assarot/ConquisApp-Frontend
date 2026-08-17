import { Component, OnInit, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PoaService } from '../../../core/services/poa.service';
import { AuthService } from '../../../core/services/auth.service';
import { Poa, ActividadPoa } from '../../../core/models/poa.model';
import Swal from 'sweetalert2';

// Responsables estándar del club
const RESPONSABLES_ESTANDAR = ['Jóvenes', 'Directiva', 'Director', 'Director Asociado', 'Secretario', 'Tesorero'];

@Component({
  selector: 'app-poa',
  templateUrl: './poa.component.html',
  standalone: false
})

export class PoaComponent implements OnInit {
  poas: Poa[] = [];
  selectedPoa: Poa | null = null;
  actividades: ActividadPoa[] = [];
  isLoading = false;

  // Forms
  activityForm: FormGroup;
  poaForm: FormGroup;
  editForm!: FormGroup;

  // Modals visibility toggles
  showActivityModal = false;
  showPoaModal = false;
  showEditModal = false;
  isUploading = false;
  actividadEditando: ActividadPoa | null = null;

  // Multi-responsable
  responsablesSeleccionados: string[] = [];
  nuevoResponsable = '';
  responsablesExtra: string[] = [];    // añadidos manualmente en sesión
  responsablesOcultos: string[] = [];  // no-estándar ocultados por el usuario

  get responsablesDelPoa(): string[] {
    const todos = this.actividades
      .flatMap(a => (a.responsable || '').split(',').map(r => r.trim()))
      .filter(r => r && r !== 'Sin asignar');
    return [...new Set(todos)];
  }

  get responsablesDisponibles(): string[] {
    const combinados = [
      ...RESPONSABLES_ESTANDAR,
      ...this.responsablesDelPoa,
      ...this.responsablesExtra
    ];
    // Excluir los ocultos (solo aplica a no-estándar)
    return [...new Set(combinados)].filter(r => !this.responsablesOcultos.includes(r));
  }

  /** Devuelve true si el responsable NO es parte de los estándar por defecto */
  isResponsableExtra(r: string): boolean {
    return !RESPONSABLES_ESTANDAR.includes(r);
  }

  // Permission helper using auth signals
  currentUser = computed(() => this.authService.currentUser());
  canManagePoa = computed(() => {
    const rawRol = this.currentUser()?.rol;
    const role = typeof rawRol === 'string' ? rawRol : (rawRol as any)?.nombre;
    return role === 'ADMINISTRADOR' || role === 'DIRECTOR' || role === 'SECRETARIO' || role === 'DIRECTOR_ASOCIADO';
  });

  constructor(
    private poaService: PoaService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.activityForm = this.fb.group({
      nombre: ['', [Validators.required]],
      fecha: ['', [Validators.required]],
      ambito: ['CLUB', [Validators.required]],
      lugar: [''],
      responsable: [''] // manejado por responsablesSeleccionados
    });

    this.poaForm = this.fb.group({
      anio: [new Date().getFullYear() + 1, [Validators.required, Validators.min(2020), Validators.max(2100)]]
    });

    this.editForm = this.fb.group({
      nombre: ['', [Validators.required]],
      fecha: ['', [Validators.required]],
      ambito: ['CLUB', [Validators.required]],
      lugar: [''],
      responsable: [''] // manejado por responsablesSeleccionados
    });
  }

  ngOnInit(): void {
    this.loadPoas();
  }

  loadPoas(): void {
    const clubId = this.currentUser()?.idClub?.toString() || '1';
    this.isLoading = true;
    this.poaService.getPoasByClub(clubId).subscribe({
      next: (poas) => {
        this.poas = poas;
        // Select active or latest POA
        const active = poas.find(p => p.estado === 'ACTIVO') || poas[0];
        if (active) {
          this.selectPoa(active);
        } else {
          this.isLoading = false;
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  selectPoa(poa: Poa): void {
    this.selectedPoa = poa;
    this.isLoading = true;
    this.poaService.getActividades(poa.idPoa).subscribe({
      next: (acts) => {
        this.actividades = acts;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  // ── Multi-responsable helpers ─────────────────────────────────────────────
  toggleResponsable(r: string): void {
    const idx = this.responsablesSeleccionados.indexOf(r);
    if (idx >= 0) {
      this.responsablesSeleccionados.splice(idx, 1);
    } else {
      this.responsablesSeleccionados.push(r);
    }
  }

  isResponsableSelected(r: string): boolean {
    return this.responsablesSeleccionados.includes(r);
  }

  addNuevoResponsable(): void {
    const raw = this.nuevoResponsable.trim();
    if (!raw) return;
    
    const val = raw;
    if (!this.responsablesDisponibles.includes(val)) {
      this.responsablesExtra.push(val);
    }
    if (!this.responsablesSeleccionados.includes(val)) {
      this.responsablesSeleccionados.push(val);
    }
    this.nuevoResponsable = '';
  }

  removeResponsableExtra(r: string): void {
    // Quitar de extras de sesión (si fue añadido en esta sesión)
    this.responsablesExtra = this.responsablesExtra.filter(e => e !== r);
    // Ocultar del listado para esta sesión (aplica a los del POA también)
    if (!this.responsablesOcultos.includes(r)) {
      this.responsablesOcultos.push(r);
    }
    // Deseleccionar si estaba seleccionado
    this.responsablesSeleccionados = this.responsablesSeleccionados.filter(s => s !== r);
  }

  // ── POA Modal ──────────────────────────────────────────────────────────────
  openNewPoaModal(): void {
    this.showPoaModal = true;
  }

  closeNewPoaModal(): void {
    this.showPoaModal = false;
    this.poaForm.reset({ anio: new Date().getFullYear() + 1 });
  }

  onCreatePoa(): void {
    if (this.poaForm.invalid) return;
    const { anio } = this.poaForm.value;
    const clubId = this.currentUser()?.idClub?.toString() || '1';

    this.poaService.inicializarPoa(clubId, anio).subscribe({
      next: (newPoa) => {
        this.closeNewPoaModal();
        Swal.fire({
          title: 'POA Inicializado',
          text: `El Plan Operativo Anual para el año ${anio} ha sido creado.`,
          icon: 'success',
          background: '#111827',
          color: '#f3f4f6'
        });
        this.loadPoas();
      }
    });
  }

  openActivityModal(): void {
    this.responsablesSeleccionados = [];
    this.responsablesOcultos = [];
    this.nuevoResponsable = '';
    this.showActivityModal = true;
  }

  closeActivityModal(): void {
    this.showActivityModal = false;
    this.responsablesSeleccionados = [];
    this.responsablesOcultos = [];
    this.nuevoResponsable = '';
    this.activityForm.reset({ ambito: 'CLUB', lugar: '', responsable: '', nombre: '', fecha: '' });
  }

  onAddActivity(): void {
    if (this.activityForm.invalid || !this.selectedPoa) return;
    if (this.responsablesSeleccionados.length === 0) return;

    const payload = {
      ...this.activityForm.value,
      responsable: this.responsablesSeleccionados.join(', ')
    };

    this.poaService.addActividad(this.selectedPoa.idPoa, payload).subscribe({
      next: () => {
        this.closeActivityModal();
        Swal.fire({
          title: 'Actividad Agregada',
          text: 'La actividad se ha planificado con éxito.',
          icon: 'success',
          background: '#111827',
          color: '#f3f4f6'
        });
        this.selectPoa(this.selectedPoa!);
      }
    });
  }

  openEditModal(actividad: ActividadPoa): void {
    this.actividadEditando = actividad;
    // Pre-poblar chips con los responsables guardados
    this.responsablesSeleccionados = (actividad.responsable || '')
      .split(',')
      .map(r => r.trim())
      .filter(r => r && r !== 'Sin asignar');
    this.responsablesOcultos = [];
    this.nuevoResponsable = '';
    this.editForm.setValue({
      nombre: actividad.nombre ?? '',
      fecha: actividad.fecha ?? '',
      ambito: actividad.ambito ?? 'CLUB',
      lugar: actividad.lugar ?? '',
      responsable: actividad.responsable ?? ''
    });
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.actividadEditando = null;
    this.responsablesSeleccionados = [];
    this.responsablesOcultos = [];
    this.nuevoResponsable = '';
    this.editForm.reset({ ambito: 'CLUB' });
  }

  onGuardarEdicion(): void {
    if (this.editForm.invalid || !this.actividadEditando?.idActividad) return;
    if (this.responsablesSeleccionados.length === 0) return;
    const id = this.actividadEditando.idActividad;
    const payload = {
      ...this.editForm.value,
      responsable: this.responsablesSeleccionados.join(', ')
    };
    this.poaService.actualizarActividad(id, payload).subscribe({
      next: () => {
        this.closeEditModal();
        Swal.fire({
          title: 'Actividad actualizada',
          text: 'Los datos de la actividad se guardaron correctamente.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#111827',
          color: '#f3f4f6'
        });
        this.selectPoa(this.selectedPoa!);
      },
      error: () => {
        Swal.fire({
          title: 'Error al guardar',
          text: 'No se pudo actualizar la actividad. Intenta de nuevo.',
          icon: 'error',
          background: '#111827',
          color: '#f3f4f6'
        });
      }
    });
  }

  onExcelFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.selectedPoa) return;
    const file = input.files[0];
    // Reset input so the same file can be re-uploaded if needed
    input.value = '';

    this.isUploading = true;
    Swal.fire({
      title: 'Importando actividades…',
      text: 'Por favor espera.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      background: '#111827',
      color: '#f3f4f6'
    });

    this.poaService.importarExcel(this.selectedPoa.idPoa, file).subscribe({
      next: (res) => {
        this.isUploading = false;
        Swal.fire({
          title: '¡Importación exitosa!',
          text: `Se importaron ${res.totalImportadas} actividad(es) correctamente.`,
          icon: 'success',
          background: '#111827',
          color: '#f3f4f6'
        });
        this.selectPoa(this.selectedPoa!);
      },
      error: (err) => {
        this.isUploading = false;
        Swal.fire({
          title: 'Error al importar',
          text: err?.error?.error || 'Verifica que el archivo sea un Excel válido con el formato correcto.',
          icon: 'error',
          background: '#111827',
          color: '#f3f4f6'
        });
      }
    });
  }

  onEliminarActividad(actividad: ActividadPoa): void {
    Swal.fire({
      title: '¿Eliminar actividad?',
      html: `<span class="font-semibold">${actividad.nombre}</span> será eliminada permanentemente del POA.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b7102a',
      background: '#111827',
      color: '#f3f4f6'
    }).then(result => {
      if (!result.isConfirmed || !actividad.idActividad) return;
      this.poaService.eliminarActividad(actividad.idActividad).subscribe({
        next: () => {
          Swal.fire({
            title: 'Actividad eliminada',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            background: '#111827',
            color: '#f3f4f6'
          });
          this.selectPoa(this.selectedPoa!);
        },
        error: () => {
          Swal.fire({
            title: 'Error al eliminar',
            text: 'No se pudo eliminar la actividad. Intenta de nuevo.',
            icon: 'error',
            background: '#111827',
            color: '#f3f4f6'
          });
        }
      });
    });
  }

  onExportarExcel(): void {
    if (!this.selectedPoa) return;
    this.poaService.exportarExcel(this.selectedPoa.idPoa).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `POA-${this.selectedPoa!.anio}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        Swal.fire({
          title: 'Error al exportar',
          text: 'No se pudo generar el archivo Excel.',
          icon: 'error',
          background: '#111827',
          color: '#f3f4f6'
        });
      }
    });
  }
}
