import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserInfo, Province, AdminLevel } from '@shared/types';

interface AppState {
  user: UserInfo | null;
  token: string | null;
  currentProvince: string | null;
  currentUnit: string | null;
  provinces: Province[];
  sidebarCollapsed: boolean;
  unreadAlerts: number;

  setUser: (user: UserInfo | null) => void;
  setToken: (token: string | null) => void;
  setCurrentProvince: (code: string | null) => void;
  setCurrentUnit: (id: string | null) => void;
  setProvinces: (provinces: Province[]) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setUnreadAlerts: (count: number) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  getAdminLevel: () => AdminLevel;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      currentProvince: null,
      currentUnit: null,
      provinces: [],
      sidebarCollapsed: false,
      unreadAlerts: 0,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setCurrentProvince: (code) => set({ currentProvince: code, currentUnit: null }),
      setCurrentUnit: (id) => set({ currentUnit: id }),
      setProvinces: (provinces) => set({ provinces }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setUnreadAlerts: (count) => set({ unreadAlerts: count }),

      logout: () => {
        set({
          user: null,
          token: null,
          currentProvince: null,
          currentUnit: null,
        });
      },

      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        return user.permissions.includes(permission) || user.permissions.includes('*');
      },

      getAdminLevel: () => {
        const { user } = get();
        return user?.role || 'unit';
      },
    }),
    {
      name: 'chemical-safety-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        currentProvince: state.currentProvince,
        currentUnit: state.currentUnit,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
