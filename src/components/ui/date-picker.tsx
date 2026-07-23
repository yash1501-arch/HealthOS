"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"

// ─── Helpers ───────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatDate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0")
  const dd = String(day).padStart(2, "0")
  return `${year}-${mm}-${dd}`
}

function displayDate(value: string): string {
  if (!value) return ""
  const [y, m, d] = value.split("-").map(Number)
  if (!y || !m || !d) return ""
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function isToday(year: number, month: number, day: number): boolean {
  const today = new Date()
  return (
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day
  )
}

function parseAge(value: string): { year: number; month: number; day: number } | null {
  if (!value) return null
  const [y, m, d] = value.split("-").map(Number)
  if (!y || !m || !d) return null
  return { year: y, month: m - 1, day: d }
}

// ─── Props ─────────────────────────────────────────────────────

interface DatePickerProps {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  min?: string
  max?: string
}

// ─── Component ─────────────────────────────────────────────────

export default function DatePicker({
  label,
  value,
  onChange,
  required = false,
  min,
  max,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [animStyle, setAnimStyle] = useState<"left" | "right">("left")
  const containerRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLButtonElement>(null)

  const today = new Date()

  // Parse value
  const parsed = useMemo(() => parseAge(value), [value])

  // View state
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth())

  // Sync view to value when value changes externally
  const prevValueRef = useRef(value)
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value
      const p = parseAge(value)
      if (p) {
        setViewYear(p.year)
        setViewMonth(p.month)
      }
    }
  }, [value])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    // Small delay to avoid closing immediately on trigger click
    const id = requestAnimationFrame(() =>
      document.addEventListener("mousedown", handleClick)
    )
    return () => {
      cancelAnimationFrame(id)
      document.removeEventListener("mousedown", handleClick)
    }
  }, [open])

  // Keyboard handling
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false)
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open])

  // Focus trap: focus the calendar when opened
  useEffect(() => {
    if (open) {
      calendarRef.current?.focus()
    }
  }, [open])

  const prevMonth = useCallback(() => {
    setAnimStyle("right")
    setShowYearPicker(false)
    setShowMonthPicker(false)
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
  }, [])

  const nextMonth = useCallback(() => {
    setAnimStyle("left")
    setShowYearPicker(false)
    setShowMonthPicker(false)
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1)
        return 0
      }
      return m + 1
    })
  }, [])

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  // Min/max constraints
  const minDate = min ? new Date(min) : null
  const maxDate = max ? new Date(max) : null

  function canSelect(year: number, month: number, day: number): boolean {
    const d = new Date(year, month, day)
    d.setHours(0, 0, 0, 0)
    if (minDate && d < minDate) return false
    if (maxDate && d > maxDate) return false
    return true
  }

  function handleSelect(day: number) {
    if (!canSelect(viewYear, viewMonth, day)) return
    onChange(formatDate(viewYear, viewMonth, day))
    setOpen(false)
    setShowYearPicker(false)
    setShowMonthPicker(false)
  }

  function handleToday() {
    const t = new Date()
    const y = t.getFullYear()
    const m = t.getMonth()
    const d = t.getDate()
    onChange(formatDate(y, m, d))
    setViewYear(y)
    setViewMonth(m)
    setOpen(false)
    setShowYearPicker(false)
    setShowMonthPicker(false)
  }

  function handleClear() {
    onChange("")
    setOpen(false)
    setShowYearPicker(false)
    setShowMonthPicker(false)
  }

  function toggleOpen() {
    setOpen((o) => !o)
    setShowYearPicker(false)
    setShowMonthPicker(false)
  }

  // Build day cells
  const days: (number | null)[] = useMemo(() => {
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) {
      cells.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push(i)
    }
    return cells
  }, [firstDay, daysInMonth])

  // Year range for year picker: ±100 years from current view year
  const yearRange = useMemo(() => {
    const years: number[] = []
    const start = viewYear - 100
    const end = viewYear + 10
    for (let y = start; y <= end; y++) {
      years.push(y)
    }
    return years
  }, [viewYear])

  const calendarKey = `${viewYear}-${viewMonth}`

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>

      {/* ── Trigger ── */}
      <button
        ref={inputRef}
        type="button"
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            toggleOpen()
          }
        }}
        className={`w-full h-10 px-3 rounded-lg border text-sm text-left flex items-center gap-2
          transition-all duration-200 cursor-pointer
          ${open
            ? "border-[#176B63] ring-2 ring-[#176B63]/20"
            : "border-gray-300 hover:border-gray-400"
          }
          ${value ? "text-gray-900" : "text-gray-400"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {/* Calendar icon */}
        <svg
          className="w-4 h-4 text-gray-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>

        <span className="flex-1 truncate">
          {value ? displayDate(value) : "Pick a date..."}
        </span>

        {value && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation()
                handleClear()
              }
            }}
            role="button"
            tabIndex={-1}
            aria-label="Clear date"
            className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        )}

        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Calendar Popover ── */}
      {open && (
        <div
          ref={calendarRef}
          tabIndex={-1}
          className="absolute z-50 top-full mt-1 left-0 w-[320px] bg-white rounded-xl border border-gray-200
            shadow-xl shadow-black/10 outline-none"
          style={{ animation: "datepicker-in 0.2s ease-out" }}
          role="dialog"
          aria-label="Date picker"
        >
          <style>{`
            @keyframes datepicker-in {
              from { opacity: 0; transform: translateY(-4px) scale(0.97); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes slide-left {
              from { opacity: 0; transform: translateX(10px); }
              to { opacity: 1; transform: translateX(0); }
            }
            @keyframes slide-right {
              from { opacity: 0; transform: translateX(-10px); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}</style>

          {/* ── Header: Month/Year Navigation ── */}
          {showYearPicker ? (
            /* ── Year Picker ── */
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setViewYear((y) => y - 20)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400
                    hover:bg-gray-100 hover:text-gray-600 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm font-semibold text-gray-900 select-none">
                  {yearRange[0]} – {yearRange[yearRange.length - 1]}
                </span>
                <button
                  type="button"
                  onClick={() => setViewYear((y) => y + 20)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400
                    hover:bg-gray-100 hover:text-gray-600 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1 max-h-[220px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                {yearRange.map((y) => {
                  const isSelected = y === viewYear
                  const isCurrent = y === today.getFullYear()
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setViewYear(y)
                        setShowYearPicker(false)
                      }}
                      className={`h-9 text-sm rounded-lg transition-all duration-150
                        ${isSelected
                          ? "bg-[#176B63] text-white font-semibold shadow-sm"
                          : isCurrent
                            ? "text-[#176B63] font-medium hover:bg-[#E8F2FB]"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                      {y}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : showMonthPicker ? (
            /* ── Month Picker ── */
            <div className="p-4">
              <div className="text-sm font-semibold text-gray-900 mb-3 text-center">{viewYear}</div>
              <div className="grid grid-cols-3 gap-2">
                {MONTH_NAMES_SHORT.map((name, idx) => {
                  const isSelected = idx === viewMonth
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setViewMonth(idx)
                        setShowMonthPicker(false)
                      }}
                      className={`h-10 text-sm rounded-lg transition-all duration-150
                        ${isSelected
                          ? "bg-[#176B63] text-white font-semibold shadow-sm"
                          : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            /* ── Calendar Grid ── */
            <>
              {/* Month/Year header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400
                    hover:bg-gray-100 hover:text-gray-600 transition-all duration-200"
                  aria-label="Previous month"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowMonthPicker(true)}
                    className="text-sm font-semibold text-gray-900 hover:text-[#176B63] transition-colors
                      px-2 py-1 rounded-md hover:bg-[#E8F2FB] select-none"
                  >
                    {MONTH_NAMES[viewMonth]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowYearPicker(true)}
                    className="text-sm font-semibold text-gray-900 hover:text-[#176B63] transition-colors
                      px-2 py-1 rounded-md hover:bg-[#E8F2FB] select-none"
                  >
                    {viewYear}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400
                    hover:bg-gray-100 hover:text-gray-600 transition-all duration-200"
                  aria-label="Next month"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 px-3 mb-1">
                {DAY_NAMES.map((name) => (
                  <div
                    key={name}
                    className="h-8 flex items-center justify-center text-xs font-medium text-gray-400 select-none"
                  >
                    {name}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div
                className="grid grid-cols-7 px-3 pb-2"
                key={calendarKey}
                style={{
                  animation: animStyle === "left" ? "slide-left 0.15s ease-out" : "slide-right 0.15s ease-out",
                }}
              >
                {days.map((day, i) => {
                  if (day === null) {
                    return <div key={`e-${i}`} className="h-10" />
                  }

                  const selected = value === formatDate(viewYear, viewMonth, day)
                  const todayFlag = isToday(viewYear, viewMonth, day)
                  const disabled = !canSelect(viewYear, viewMonth, day)

                  return (
                    <button
                      key={`d-${day}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleSelect(day)}
                      className={`h-10 w-full flex items-center justify-center text-sm rounded-lg
                        transition-all duration-150 relative
                        ${disabled
                          ? "text-gray-300 cursor-not-allowed"
                          : selected
                            ? "bg-[#176B63] text-white font-semibold shadow-sm hover:bg-[#10554F]"
                            : todayFlag
                              ? "text-[#176B63] font-semibold hover:bg-[#E8F2FB]"
                              : "text-gray-700 hover:bg-gray-100"
                        }`}
                    >
                      {day}
                      {todayFlag && !selected && (
                        <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-[#176B63]" />
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
            <button
              type="button"
              onClick={handleToday}
              className="text-xs font-medium text-[#176B63] hover:text-[#10554F] transition-colors
                px-2.5 py-1.5 rounded-md hover:bg-[#E8F2FB]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors
                px-2.5 py-1.5 rounded-md hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
