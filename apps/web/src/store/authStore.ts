import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, JwtPayload } from '@amass/shared';

interface AuthState {
  user: User | null;
  payload: JwtPayload | null;
  isAuthenticated: boolean;
  setAuth: (user: User, payload: JwtPayload) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      payload: null,
      isAuthenticated: false,
      setAuth: (user, payload) => set({ user, payload, isAuthenticated: true }),
      clearAuth: () => set({ user: null, payload: null, isAuthenticated: false }),
    }),
    {
      name: 'amass-auth',
      partialize: (state) => ({ user: state.user, payload: state.payload, isAuthenticated: state.isAuthenticated }),
    }
  )
);
