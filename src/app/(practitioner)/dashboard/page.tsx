"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { api } from "@/lib/api-client"
import { PatientList } from "@/components/practitioner/PatientList"
import { InvitePatientModal } from "@/components/practitioner/InvitePatientModal"
import Link from "next/link"

type Stats = {
  totalPatients: number
  averageHealthScore: number
  recentCheckins: number
}

type PatientResponse = {
  patients: Array<{
    linkId: string
    patientId: string
    name: string
    email: string
    sharedData: string[]
    lastVisit: string | null
    healthScore: number
    concerns: Array<{ characteristic: string; severity: string | null }>
  }>
}

const EASE = [0.16, 1, 0.3, 1] as const

export default function PractitionerDashboardPage() {
  const [showInvite, setShowInvite] = useState(false)

  const { data, isPending } = useQuery<PatientResponse>({
    queryKey: ["practitioner-patients"],
    queryFn: () => api.get("/practitioner/patients"),
  })

  const patients = data?.patients ?? []
  const stats: Stats = {
    totalPatients: patients.length,
    averageHealthScore: patients.length > 0
      ? Math.round(patients.reduce((s, p) => s + p.healthScore, 0) / patients.length)
      : 0,
    recentCheckins: patients.filter((p) => {
      if (!p.lastVisit) return false
      const daysSince = (Date.now() - new Date(p.lastVisit).getTime()) / (1000 * 60 * 60 * 24)
      return daysSince <= 7
    }).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#172033]">Practitioner Dashboard</h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#176B63]/10 text-[#176B63] rounded-full">
              CLINIC
            </span>
          </div>
          <p className="text-sm text-[#4B5870]">Manage your patients and their health plans</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="h-10 px-4 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all shadow-sm"
        >
          + Add Patient
        </button>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#4B5870] opacity-70 mb-1">
            Total Patients
          </p>
          <p className="text-2xl font-bold text-[#172033] tabular-nums">
            {isPending ? "..." : stats.totalPatients}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#4B5870] opacity-70 mb-1">
            Avg Health Score
          </p>
          <p className="text-2xl font-bold text-[#176B63] tabular-nums">
            {isPending ? "..." : stats.averageHealthScore}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11 }}
          className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#4B5870] opacity-70 mb-1">
            Check-ins This Week
          </p>
          <p className="text-2xl font-bold text-[#9B651B] tabular-nums">
            {isPending ? "..." : stats.recentCheckins}
          </p>
        </motion.div>
      </div>

      {/* Patient list */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#172033]">Patients</h2>
            <p className="text-xs text-[#4B5870]">
              {patients.length > 0
                ? `${patients.length} patient${patients.length > 1 ? "s" : ""} connected`
                : "Invite a patient to get started"}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-xs font-medium text-[#176B63] hover:text-[#10554F] transition-colors"
          >
            My Dashboard →
          </Link>
        </div>

        <PatientList patients={patients} loading={isPending} />
      </motion.div>

      {/* Invite modal */}
      {showInvite && (
        <InvitePatientModal
          onClose={() => setShowInvite(false)}
          onInvited={() => {}}
        />
      )}
    </div>
  )
}
