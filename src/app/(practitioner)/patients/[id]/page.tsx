"use client"

import { use } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { api } from "@/lib/api-client"
import { PatientDetailView } from "@/components/practitioner/PatientDetailView"
import Link from "next/link"

type PostureIssue = {
  characteristic: string
  severity: string | null
  description: string | null
}

type PatientDetailData = {
  id: string
  name: string
  email: string
  healthScore: number
  sharedData: string[]
  postureChars: PostureIssue[]
  lastLabResults: Array<{ testName: string; value: number | null; unit: string; isAbnormal: boolean | null; date: string }>
  hasDietPlan: boolean
  hasExercisePlan: boolean
  latestCheckin: { weekStart: string; aiSummary: string | null; energyLevel: number | null } | null
  clinicalNotes: Array<{ id: string; title: string; description: string; createdAt: string; metadata: Record<string, unknown> }>
}

type NotesResponse = {
  notes: Array<{ id: string; title: string; description: string; createdAt: string; metadata: Record<string, unknown> }>
}

const EASE = [0.16, 1, 0.3, 1] as const

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const queryClient = useQueryClient()

  const { data: patientData, isPending: patientLoading } = useQuery<PatientDetailData>({
    queryKey: ["practitioner-patient", id],
    queryFn: () => api.get(`/practitioner/patients/${id}`),
  })

  const { data: notesData } = useQuery<NotesResponse>({
    queryKey: ["patient-notes", id],
    queryFn: () => api.get(`/practitioner/patients/${id}/notes`),
  })

  const notes = notesData?.notes ?? []
  const patient = patientData ?? null

  // Loading state
  if (patientLoading) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4B5870] hover:text-[#172033] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to patients
        </Link>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-[#E2E8F0] rounded-2xl" />
          <div className="h-10 bg-[#E2E8F0] rounded-xl" />
          <div className="h-40 bg-[#E2E8F0] rounded-xl" />
        </div>
      </div>
    )
  }

  // Error state
  if (!patient) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4B5870] hover:text-[#172033] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to patients
        </Link>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center">
          <p className="text-sm text-[#4B5870]">Patient not found or link is inactive.</p>
          <Link href="/dashboard" className="inline-block mt-3 text-xs font-medium text-[#176B63] hover:text-[#10554F]">
            Return to practitioner dashboard →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4B5870] hover:text-[#172033] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to patients
        </Link>
      </motion.div>

      <PatientDetailView
        patient={{ ...patient, clinicalNotes: notes }}
        onNoteAdded={() => {
          queryClient.invalidateQueries({ queryKey: ["patient-notes", id] })
          queryClient.invalidateQueries({ queryKey: ["practitioner-patient", id] })
        }}
      />
    </div>
  )
}
