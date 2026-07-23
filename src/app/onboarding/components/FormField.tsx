"use client"

import { type ReactNode } from "react"
import {
  FIELD_LABELS,
  FIELD_PLACEHOLDERS,
} from "@/lib/onboarding-schema"

// ─── Shared Props ───────────────────────────────────────────────

interface BaseFieldProps {
  name: string
  label?: string
  placeholder?: string
  hint?: string
  error?: string
  children?: ReactNode
}

// ─── Text Input ─────────────────────────────────────────────────

interface TextInputProps extends BaseFieldProps {
  value: string
  onChange: (value: string) => void
  type?: "text" | "time"
}

export function TextInput({
  name,
  label,
  placeholder,
  hint,
  error,
  value,
  onChange,
  type = "text",
}: TextInputProps) {
  const displayLabel = label ?? FIELD_LABELS[name] ?? name
  const displayPlaceholder = placeholder ?? FIELD_PLACEHOLDERS[name] ?? ""

  return (
    <FieldWrapper name={name} label={displayLabel} hint={hint} error={error}>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={displayPlaceholder}
        className={`w-full h-12 px-4 rounded-xl border text-sm bg-white transition-all duration-200
          outline-none
          ${error
            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
            : "border-gray-200 focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10"
          }
          placeholder:text-gray-300 text-gray-900`}
      />
    </FieldWrapper>
  )
}

// ─── Number Input ───────────────────────────────────────────────

interface NumberInputProps extends BaseFieldProps {
  value: number | null | undefined
  onChange: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}

export function NumberInput({
  name,
  label,
  placeholder,
  hint,
  error,
  value,
  onChange,
  min,
  max,
  step = 0.5,
  suffix,
}: NumberInputProps) {
  const displayLabel = label ?? FIELD_LABELS[name] ?? name
  const displayPlaceholder = placeholder ?? FIELD_PLACEHOLDERS[name] ?? ""

  return (
    <FieldWrapper name={name} label={displayLabel} hint={hint} error={error}>
      <div className="relative">
        <input
          id={name}
          name={name}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value ?? ""}
          onChange={(e) => {
            const val = e.target.value
            if (val === "") {
              onChange(null)
            } else {
              const num = parseFloat(val)
              onChange(Number.isNaN(num) ? null : num)
            }
          }}
          placeholder={displayPlaceholder}
          className={`w-full h-12 px-4 rounded-xl border text-sm bg-white transition-all duration-200
            outline-none
            ${error
              ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
              : "border-gray-200 focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10"
            }
            placeholder:text-gray-300 text-gray-900
            ${suffix ? "pr-12" : ""}`}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </FieldWrapper>
  )
}

// ─── Select ─────────────────────────────────────────────────────

interface SelectOption {
  value: string
  label: string
}

interface SelectInputProps extends BaseFieldProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
}

export function SelectInput({
  name,
  label,
  hint,
  error,
  value,
  onChange,
  options,
}: SelectInputProps) {
  const displayLabel = label ?? FIELD_LABELS[name] ?? name

  return (
    <FieldWrapper name={name} label={displayLabel} hint={hint} error={error}>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-12 px-4 rounded-xl border text-sm bg-white transition-all duration-200
          outline-none appearance-none cursor-pointer
          ${error
            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
            : "border-gray-200 focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10"
          }
          ${value ? "text-gray-900" : "text-gray-300"}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239CA3AF' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 16px center",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  )
}

// ─── Tags Input (for arrays like allergens, conditions) ─────────

interface TagsInputProps extends BaseFieldProps {
  values: string[]
  onChange: (values: string[]) => void
  suggestions?: string[]
}

export function TagsInput({
  name,
  label,
  hint,
  error,
  values,
  onChange,
  suggestions = [],
}: TagsInputProps) {
  const displayLabel = label ?? FIELD_LABELS[name] ?? name

  function removeTag(tag: string) {
    onChange(values.filter((t) => t !== tag))
  }

  function addTag(tag: string) {
    const trimmed = tag.trim()
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed])
    }
  }

  return (
    <FieldWrapper name={name} label={displayLabel} hint={hint} error={error}>
      <div
        className={`w-full min-h-[48px] px-3 py-2 rounded-xl border bg-white transition-all duration-200
          focus-within:border-[#176B63] focus-within:ring-2 focus-within:ring-[#176B63]/10 cursor-text
          ${error ? "border-red-300" : "border-gray-200"}`}
        onClick={(e) => {
          const input = (e.currentTarget as HTMLElement).querySelector("input")
          input?.focus()
        }}
      >
        <div className="flex flex-wrap gap-1.5">
          {values.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E8F2FB] text-[#176B63] text-xs font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-red-500 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <input
            type="text"
            className="flex-1 min-w-[120px] h-7 border-none outline-none text-sm bg-transparent text-gray-900 placeholder:text-gray-300"
            placeholder={values.length === 0 ? "Type and press Enter to add..." : "Add more..."}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                const input = e.currentTarget
                addTag(input.value)
                input.value = ""
              } else if (e.key === "Backspace" && !e.currentTarget.value && values.length > 0) {
                onChange(values.slice(0, -1))
              }
            }}
            onBlur={(e) => {
              if (e.target.value.trim()) {
                addTag(e.target.value)
                e.target.value = ""
              }
            }}
          />
        </div>
      </div>

      {/* Quick-add suggestions */}
      {suggestions.length > 0 && values.length < suggestions.length && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions
            .filter((s) => !values.includes(s))
            .slice(0, 6)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addTag(s)}
                className="px-2.5 py-1 rounded-lg text-xs text-gray-500 bg-gray-50 border border-gray-100
                  hover:bg-[#E8F2FB] hover:text-[#176B63] hover:border-[#176B63]/20 transition-all duration-150"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </FieldWrapper>
  )
}

// ─── Text Area ──────────────────────────────────────────────────

interface TextAreaProps extends BaseFieldProps {
  value: string
  onChange: (value: string) => void
  rows?: number
}

export function TextArea({
  name,
  label,
  placeholder,
  hint,
  error,
  value,
  onChange,
  rows = 4,
}: TextAreaProps) {
  const displayLabel = label ?? FIELD_LABELS[name] ?? name
  const displayPlaceholder = placeholder ?? FIELD_PLACEHOLDERS[name] ?? ""

  return (
    <FieldWrapper name={name} label={displayLabel} hint={hint} error={error}>
      <textarea
        id={name}
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={displayPlaceholder}
        className={`w-full px-4 py-3 rounded-xl border text-sm bg-white transition-all duration-200
          outline-none resize-none
          ${error
            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
            : "border-gray-200 focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10"
          }
          placeholder:text-gray-300 text-gray-900`}
      />
    </FieldWrapper>
  )
}

// ─── Field Wrapper ──────────────────────────────────────────────

function FieldWrapper({
  name,
  label,
  hint,
  error,
  children,
}: {
  name: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-800 leading-relaxed"
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-gray-400 mt-1">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
