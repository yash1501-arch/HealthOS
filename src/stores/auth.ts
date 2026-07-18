import { create } from "zustand"

type AuthState = {
  userId: string | null
  email: string | null
  isAuthenticated: boolean
  setUser: (userId: string, email: string) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  isAuthenticated: false,
  setUser: (userId, email) => set({ userId, email, isAuthenticated: true }),
  clearUser: () => set({ userId: null, email: null, isAuthenticated: false }),
}))
