"use client"

import { create } from "zustand"

type Theme = "light" | "dark"

type ThemeState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light"
  const stored = localStorage.getItem("healthos-theme")
  if (stored === "dark" || stored === "light") return stored
  // Check system preference
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark"
  return "light"
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
  localStorage.setItem("healthos-theme", theme)
}

export const useThemeStore = create<ThemeState>((set) => {
  // Initialize on first call
  const initial = getInitialTheme()
  if (typeof window !== "undefined") {
    applyTheme(initial)
  }

  return {
    theme: initial,
    setTheme: (theme) => {
      applyTheme(theme)
      set({ theme })
    },
    toggleTheme: () => {
      set((state) => {
        const next = state.theme === "light" ? "dark" : "light"
        applyTheme(next)
        return { theme: next }
      })
    },
  }
})
