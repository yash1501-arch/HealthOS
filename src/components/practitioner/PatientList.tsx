"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import Link from "next/link"

type PatientSummary = {
  linkId: string
  patientId: string
  name: string
  email: string
  sharedData: string[]
  lastVisit: string | null
  healthScore: number
  concerns: Array<{ characteristic: string; severity: string | null }>
}

type PatientListProps = {
  patients: PatientSummary[]
  loading?: boolean
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#176B63"
  if (score >= 40) return "#9B651B"
  return "#B53A45"
}

function getScoreBg(score: number): string {
  if (score >= 70) return "#F0FDF4"
  if (score >= 40) return "#FFFBEB"
  return "#FEF2F2"
}

const EASE = [0.16, 1, 0.3, 1] as const

export function PatientList({ patients, loading }: PatientListProps) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search.trim()) return patients
    const q = search.toLowerCase()
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    )
  }, [patients, search])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-10 bg-[#E2E8F0] rounded-lg animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-[#E2E8F0] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-xl bg-[#476A91]/5 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-[#476A91]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[#172033]">No patients yet</p>
        <p className="text-xs text-[#4B5870] mt-1">Invite your first patient to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5870]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patients by name or email..."
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E2E8F0] text-sm bg-white
            focus:outline-none focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10"
        />
      </div>

      {/* Patient list */}
      <div className="space-y-1.5">
        {filtered.map((patient, i) => (
          <motion.div
            key={patient.patientId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, ease: EASE }}
          >
            <Link
              href={`/dashboard/patients/${patient.patientId}`}
              className="flex items-center gap-4 p-3.5 rounded-xl border border-[#E2E8F0] bg-white
                hover:border-[#176B63]/20 hover:shadow-sm transition-all duration-200"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#176B63] to-[#10554F] flex items-center justify-center text-sm font-bold text-white shrink-0">
                {patient.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#172033] truncate">{patient.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {patient.lastVisit ? (
                    <span className="text-[11px] text-[#4B5870]/60">
                      Last visit: {new Date(patient.lastVisit).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#4B5870]/40">No visits yet</span>
                  )}
                  {patient.sharedData.length > 0 && (
                    <span className="text-[11px] text-[#176B63]">
                      {patient.sharedData.length} data types shared
                    </span>
                  )}
                </div>
                {patient.concerns.length > 0 && (
                  <div className="flex gap-1.5 mt-1">
                    {patient.concerns.slice(0, 2).map((c, ci) => (
                      <span
                        key={ci}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F8F9FB] text-[#4B5870]"
                      >
                        {c.characteristic}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Health score badge */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                style={{ backgroundColor: getScoreBg(patient.healthScore), color: getScoreColor(patient.healthScore) }}
              >
                {patient.healthScore}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && search && (
        <p className="text-sm text-[#4B5870] text-center py-4">
          No patients matching &quot;{search}&quot;
        </p>
      )}
    </div>
  )
}
