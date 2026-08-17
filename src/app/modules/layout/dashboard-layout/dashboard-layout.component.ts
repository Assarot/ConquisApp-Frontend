import { Component, computed, HostListener, signal, OnInit, effect } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ClubService } from '../../../core/services/club.service';

@Component({
  selector: 'app-dashboard-layout',
  templateUrl: './dashboard-layout.component.html',
  standalone: false
})
export class DashboardLayoutComponent implements OnInit {
  /** On mobile: controls the slide-in sidebar overlay.
   *  Starts CLOSED on mobile, always visible on md+ via CSS `md:translate-x-0`. */
  isSidebarOpen = false;

  /** Desktop sidebar collapse state (expanded by default) */
  isCollapsed = false;

  /** Open submenu identifier */
  activeSubmenu: string | null = null;

  currentUser = computed(() => this.authService.currentUser());
  clubName = signal<string>('Club Fernando Stahl');

  // Helper to extract role name regardless of whether rol is string ("DIRECTOR") or object ({ idRol, nombre })
  private getRoleName(): string {
    const user = this.currentUser();
    if (!user || !user.rol) return '';
    if (typeof user.rol === 'string') return user.rol.toUpperCase();
    return ((user.rol as any).nombre || '').toUpperCase();
  }

  // Role Checks
  userRoleName = computed(() => this.getRoleName());
  isAdmin = computed(() => this.getRoleName() === 'ADMINISTRADOR');
  isDirector = computed(() => this.getRoleName() === 'DIRECTOR');
  isSecretario = computed(() => this.getRoleName() === 'SECRETARIO');
  isDirectorAsociado = computed(() => this.getRoleName() === 'DIRECTOR_ASOCIADO');
  isLeader = computed(() => {
    const role = this.getRoleName();
    return role === 'DIRECTOR' || role === 'SECRETARIO';
  });
  isInstructor = computed(() => this.getRoleName() === 'INSTRUCTOR');
  isConsejero = computed(() => this.getRoleName() === 'CONSEJERO');
  isConquistador = computed(() => this.getRoleName() === 'CONQUISTADOR');
  isPadre = computed(() => this.getRoleName() === 'PADRE');

  constructor(
    private authService: AuthService,
    private clubService: ClubService
  ) {
    effect(() => {
      const user = this.currentUser();
      if (user && user.idClub) {
        this.clubService.getClubById(String(user.idClub)).subscribe({
          next: (club) => this.clubName.set(club.nombre),
          error: () => this.clubName.set('Club ' + user.idClub)
        });
      } else {
        this.clubName.set('Administración Global');
      }
    });
  }

  ngOnInit(): void {}

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  toggleSidebarCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      this.activeSubmenu = null; // Close all submenus when sidebar collapses
    }
  }

  toggleSubmenu(menuId: string): void {
    if (this.isCollapsed) {
      this.isCollapsed = false; // Expand sidebar first if collapsed when opening a submenu
    }
    this.activeSubmenu = this.activeSubmenu === menuId ? null : menuId;
  }

  isSubmenuOpen(menuId: string): boolean {
    return this.activeSubmenu === menuId;
  }

  logout(): void {
    this.authService.logout();
  }

  /** Close sidebar overlay when Escape is pressed on mobile */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeSidebar();
  }
}
