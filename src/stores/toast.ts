import { create } from "zustand"

export type ToastType = "success" | "error" | "info" | "warning"

export type Toast = {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

type ToastState = {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

let toastCounter = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++toastCounter}`
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }))

    const duration = toast.duration ?? 4000
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }

    return id
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  clearToasts: () => {
    set({ toasts: [] })
  },
}))

// Convenience helpers
export function toastSuccess(title: string, message?: string) {
  useToastStore.getState().addToast({ type: "success", title, message })
}

export function toastError(title: string, message?: string) {
  useToastStore.getState().addToast({ type: "error", title, message, duration: 6000 })
}

export function toastInfo(title: string, message?: string) {
  useToastStore.getState().addToast({ type: "info", title, message })
}
