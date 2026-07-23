"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api-client"
import {
  analyzePose,
  fileToImage,
  revokeImageUrl,
  preloadPoseLandmarker,
  analyzeMovementVideos,
  POSE_MODEL_VERSION,
  type PostureFinding,
  type MovementAnalysisResult,
  type GaitMetrics,
  type SquatMetrics,
  type BendingMetrics,
} from "@/lib/pose-analysis"

// ─── Types ─────────────────────────────────────────────────────

type Step = "consent" | "photos" | "videos" | "processing" | "results"

type PhotoUpload = {
  angle: "front" | "side" | "back"
  label: string
  description: string
  file: File | null
  preview: string | null
  uploadKey: string | null
}

type VideoUpload = {
  movementType: "walking" | "squatting" | "bending"
  label: string
  description: string
  file: File | null
  preview: string | null
  uploadKey: string | null
}

// ─── Constants ─────────────────────────────────────────────────

const PHOTO_ANGLES: PhotoUpload[] = [
  { angle: "front", label: "Front View", description: "Face the camera, arms relaxed at sides", file: null, preview: null, uploadKey: null },
  { angle: "side", label: "Side View", description: "Turn to your right side, arms crossed over chest", file: null, preview: null, uploadKey: null },
  { angle: "back", label: "Back View", description: "Face away from camera, arms relaxed", file: null, preview: null, uploadKey: null },
]

const VIDEO_TYPES: VideoUpload[] = [
  { movementType: "walking", label: "Walking", description: "Walk naturally towards and away from camera (10 sec)", file: null, preview: null, uploadKey: null },
  { movementType: "squatting", label: "Squatting", description: "Perform 3 slow squats from the side view", file: null, preview: null, uploadKey: null },
  { movementType: "bending", label: "Bending", description: "Bend forward to touch toes, then return up", file: null, preview: null, uploadKey: null },
]

const MOVEMENT_META = {
  walking: {
    label: "Gait Analysis",
    icon: "🚶",
    description: "Walking pattern, stride, and arm swing symmetry",
    tip: "Walk naturally at a comfortable pace. Look straight ahead.",
    color: "from-[#176B63] to-[#10554F]",
  },
  squatting: {
    label: "Squat Analysis",
    icon: "🏋️",
    description: "Squat depth, knee tracking, and torso stability",
    tip: "Perform slow, controlled squats. Keep your chest up.",
    color: "from-[#476A91] to-[#36536F]",
  },
  bending: {
    label: "Bending Analysis",
    icon: "🤸",
    description: "Forward bend range of motion and hip hinge mechanics",
    tip: "Bend at the hips, keep your back straight, and go only as far as comfortable.",
    color: "from-[#9B651B] to-[#7A4E13]",
  },
}

const CHARACTERISTIC_META_LOOKUP: Record<string, { icon: string; explanation: string }> = {
  "Forward Head": { icon: "🧠", explanation: "Common in desk workers and phone users. Can cause neck strain, headaches, and upper back tension. Ergonomic adjustments and specific stretches can help." },
  "Rounded Shoulders": { icon: "💪", explanation: "Often accompanies forward head posture. Weakens upper back muscles and tightens chest. Focus on chest opening stretches and rowing exercises." },
  "Pelvic Tilt": { icon: "🦴", explanation: "Pelvic tilt can contribute to lower back discomfort. Focus on core stability, glute activation, and hamstring flexibility." },
  "Knee Valgus": { icon: "🦵", explanation: "Mild knee valgus can indicate weak hip abductors or tight adductors. Strengthening glute medius and hip external rotators is recommended." },
  "Flat Feet": { icon: "🦶", explanation: "Flat feet can affect your gait and cause strain up the kinetic chain. Supportive footwear and arch-strengthening exercises may help." },
  "Weight Distribution": { icon: "⚖️", explanation: "Uneven weight distribution can lead to hip and lower back imbalances. Being mindful of standing evenly and strengthening the weaker side can help." },
}

const SEVERITY_COLORS: Record<string, { dot: string; bg: string; text: string; bar: string; border: string }> = {
  none: { dot: "bg-[#176B63]", bg: "bg-[#176B63]/5", text: "text-[#176B63]", bar: "bg-[#176B63]", border: "border-[#176B63]/20" },
  mild: { dot: "bg-[#9B651B]", bg: "bg-[#9B651B]/5", text: "text-[#9B651B]", bar: "bg-[#9B651B]", border: "border-[#9B651B]/20" },
  moderate: { dot: "bg-[#FF8B6B]", bg: "bg-[#FF8B6B]/5", text: "text-[#FF8B6B]", bar: "bg-[#FF8B6B]", border: "border-[#FF8B6B]/20" },
  severe: { dot: "bg-[#B53A45]", bg: "bg-[#B53A45]/5", text: "text-[#B53A45]", bar: "bg-[#B53A45]", border: "border-[#B53A45]/20" },
}

// ─── Easing ────────────────────────────────────────────────────

const ease = [0.16, 1, 0.3, 1] as const

// ─── Variants ──────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.25, ease } },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
}

const fadeUpFast = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
}

// ─── Camera Capture Component ──────────────────────────────────

function CameraCapture({ onCapture, onClose }: { onCapture: (blob: Blob) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState("")
  const [captured, setCaptured] = useState(false)

  useEffect(() => {
    async function start() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        setStream(s)
        if (videoRef.current) videoRef.current.srcObject = s
      } catch {
        setError("Camera access denied. Please upload a photo instead.")
      }
    }
    start()
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function capture() {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d")?.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) {
        stream?.getTracks().forEach((t) => t.stop())
        setCaptured(true)
        setTimeout(() => onCapture(blob), 300)
      }
    }, "image/jpeg", 0.92)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gray-50/95 flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease }}
        className="relative w-full max-w-lg"
      >
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xl">
          {error ? (
            <div className="text-center p-10">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📷</span>
              </div>
              <p className="text-[#B53A45] mb-6 text-sm">{error}</p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-white/[0.06] text-gray-900 rounded-xl text-sm font-medium hover:bg-white/[0.10] transition-all"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className={`w-full aspect-[4/3] object-cover transition-all duration-300 ${captured ? "opacity-50 scale-95 blur-sm" : ""}`}
                />
                <canvas ref={canvasRef} className="hidden" />
                {/* Corner accents */}
                <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#176B63]/40 rounded-tl" />
                <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#176B63]/40 rounded-tr" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#176B63]/40 rounded-bl" />
                <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#176B63]/40 rounded-br" />
                {captured && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-[#176B63] flex items-center justify-center shadow-lg shadow-[#176B63]/30 animate-in zoom-in">
                      <span className="text-3xl">✓</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-3 p-4">
                <button
                  onClick={capture}
                  disabled={captured}
                  className="px-8 py-3 bg-[#176B63] text-gray-900 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#176B63]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {captured ? "Captured!" : "📸 Capture Photo"}
                </button>
                <button
                  onClick={() => { stream?.getTracks().forEach((t) => t.stop()); onClose() }}
                  className="px-6 py-3 bg-white/[0.06] text-gray-900 rounded-xl text-sm font-medium hover:bg-white/[0.10] transition-all"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Upload Dropzone ──────────────────────────────────────────

function UploadDropzone({
  label,
  description,
  preview,
  onFile,
  onRemove,
  accept = "image/*",
  icon = "📸",
}: {
  label: string
  description: string
  preview: string | null
  onFile: (file: File) => void
  onRemove: () => void
  accept?: string
  icon?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showCamera, setShowCamera] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleCapture(blob: Blob) {
    const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" })
    onFile(file)
    setShowCamera(false)
  }

  const canUseCamera = typeof navigator !== "undefined" && "mediaDevices" in navigator

  return (
    <>
      <motion.div
        whileHover={{ scale: preview ? 1 : 1.01 }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative group rounded-xl border border-dashed transition-all duration-300 overflow-hidden ${
          preview
            ? "border-[#176B63]/30 bg-[#176B63]/3"
            : isDragging
              ? "border-[#176B63] bg-[#176B63]/5 scale-[1.02]"
              : "border-gray-200 bg-white hover:border-[#176B63]/20 hover:bg-white"
        }`}
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt={label} className="w-full h-40 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 w-7 h-7 bg-red-500/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 shadow-lg backdrop-blur-sm text-xs"
            >
              ✕
            </button>
            <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-gray-50/70 text-gray-900 text-[10px] rounded-lg backdrop-blur-sm border border-gray-200">
              {label}
            </div>
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center h-40 cursor-pointer p-4"
          >
            <div className="w-11 h-11 rounded-full bg-[#176B63]/5 border border-[#176B63]/10 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:bg-[#176B63]/10 transition-all duration-300">
              <span className="text-lg">{icon}</span>
            </div>
            <p className="text-sm font-medium text-gray-900">{label}</p>
            <p className="text-xs text-gray-500 text-center mt-1 max-w-[200px]">{description}</p>
            <div className="flex gap-2 mt-3">
              <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full border border-gray-100">Click to browse</span>
              <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full border border-gray-100">Drag & drop</span>
              {canUseCamera && accept === "image/*" && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowCamera(true) }}
                  className="text-[10px] px-2 py-0.5 bg-[#176B63]/10 text-[#176B63] rounded-full border border-[#176B63]/20 hover:bg-[#176B63]/20 transition-colors"
                >
                  📷 Camera
                </button>
              )}
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFile(file)
            e.target.value = ""
          }}
          className="hidden"
        />
      </motion.div>

      <AnimatePresence>
        {showCamera && <CameraCapture onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
      </AnimatePresence>
    </>
  )
}

// ─── Processing Animation ─────────────────────────────────────

function ProcessingAnimation({ progress, status }: { progress: number; status: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Body scan visual */}
      <div className="relative w-40 h-56 mb-8">
        {/* Body outline */}
        <div className="absolute inset-0 border border-gray-200 rounded-2xl">
          {/* Scan line */}
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#176B63] to-transparent shadow-lg shadow-[#176B63]/30"
            animate={{ top: `${progress}%` }}
            transition={{ duration: 0.3, ease }}
          />
        </div>
        {/* Body silhouette */}
        <svg viewBox="0 0 120 200" className="w-full h-full opacity-[0.04]">
          <ellipse cx="60" cy="30" rx="25" ry="30" fill="#172033" />
          <rect x="42" y="55" width="36" height="50" rx="10" fill="#172033" />
          <rect x="25" y="55" width="15" height="40" rx="7" fill="#172033" />
          <rect x="80" y="55" width="15" height="40" rx="7" fill="#172033" />
          <rect x="42" y="100" width="36" height="60" rx="10" fill="#172033" />
          <rect x="25" y="120" width="15" height="50" rx="7" fill="#172033" />
          <rect x="80" y="120" width="15" height="50" rx="7" fill="#172033" />
        </svg>
        {/* Corner accents */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-[#176B63]/30 rounded-tl" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-[#176B63]/30 rounded-tr" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-[#176B63]/30 rounded-bl" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-[#176B63]/30 rounded-br" />
      </div>

      {/* Progress bar */}
      <div className="w-64 mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Analyzing</span>
          <span className="font-mono">{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#176B63] to-[#10554F] rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease }}
          />
        </div>
      </div>

      {/* Status text with animated dots */}
      <div className="flex items-center gap-1.5">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-[#176B63]"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <p className="text-sm text-gray-500">{status}</p>
      </div>
    </div>
  )
}

// ─── Result Card ──────────────────────────────────────────────

function PostureCard({ finding, index }: { finding: PostureFinding; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const colors = SEVERITY_COLORS[finding.severity]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease, delay: index * 0.08 }}
      className={`rounded-xl border transition-all duration-300 overflow-hidden ${colors.border} ${colors.bg}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 text-left"
      >
        <div className={`w-10 h-10 rounded-lg ${colors.dot} bg-opacity-20 flex items-center justify-center shrink-0`}>
          <span className="text-lg">{finding.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">{finding.characteristic}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
              {finding.severity === "none" ? "✓ Normal" : finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{finding.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden hidden sm:block">
            <div className={`h-full ${colors.bar} rounded-full opacity-60`} style={{ width: `${finding.confidence * 100}%` }} />
          </div>
          <span className={`text-xs transition-colors ${expanded ? "text-[#176B63]" : "text-gray-500/40"}`}>
            <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-gray-100">
              <div className="pt-3 space-y-3">
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 leading-relaxed border border-gray-100">
                  {finding.explanation}
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500/60">
                  <span>AI Confidence: {Math.round(finding.confidence * 100)}%</span>
                  <span>Severity: {finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Score Bar Component ─────────────────────────────────────

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 0.7 ? "bg-[#176B63]" :
    score >= 0.5 ? "bg-[#9B651B]" :
    score >= 0.3 ? "bg-[#FF8B6B]" :
    "bg-[#B53A45]"

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score * 100}%` }}
          transition={{ duration: 0.8, ease, delay: 0.2 }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
      <span className="text-xs font-mono text-gray-500 w-10 text-right tabular-nums">{Math.round(score * 100)}%</span>
    </div>
  )
}

// ─── Movement Analysis Card ───────────────────────────────────

function MovementCard({
  type,
  metrics,
  index,
}: {
  type: "walking" | "squatting" | "bending"
  metrics: GaitMetrics | SquatMetrics | BendingMetrics
  index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = MOVEMENT_META[type]
  const isGait = type === "walking"
  const isSquat = type === "squatting"
  const isBend = type === "bending"

  const severityColors: Record<string, { bg: string; text: string; border: string }> = {
    none: { bg: "bg-[#176B63]/5", text: "text-[#176B63]", border: "border-[#176B63]/20" },
    mild: { bg: "bg-[#9B651B]/5", text: "text-[#9B651B]", border: "border-[#9B651B]/20" },
    moderate: { bg: "bg-[#FF8B6B]/5", text: "text-[#FF8B6B]", border: "border-[#FF8B6B]/20" },
    severe: { bg: "bg-[#B53A45]/5", text: "text-[#B53A45]", border: "border-[#B53A45]/20" },
  }
  const sc = severityColors[metrics.severity] || severityColors.moderate

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease, delay: index * 0.1 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-all duration-300"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-5 text-left"
      >
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center shrink-0 shadow-sm`}>
          <span className="text-xl">{meta.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">{meta.label}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${sc.bg} ${sc.text} border ${sc.border}`}>
              {metrics.severity === "none" ? "✓ Good" : metrics.severity.charAt(0).toUpperCase() + metrics.severity.slice(1)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{meta.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900 tabular-nums">{Math.round(metrics.overallScore * 100)}%</div>
            <div className="text-[10px] text-gray-500/60">Overall</div>
          </div>
          <span className={`text-sm transition-colors ${expanded ? "text-[#176B63]" : "text-gray-500/30"}`}>
            <svg className={`w-4 h-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0 border-t border-gray-100">
              <div className="pt-4 space-y-4">
                {/* Score bars */}
                <div className="space-y-2.5">
                  {isGait && (
                    <>
                      <ScoreBar label="Stride Consistency" score={(metrics as GaitMetrics).strideLengthScore} />
                      <ScoreBar label="Cadence" score={(metrics as GaitMetrics).cadenceScore} />
                      <ScoreBar label="Arm Swing Symmetry" score={(metrics as GaitMetrics).armSwingSymmetry} />
                      <ScoreBar label="Hip Stability" score={(metrics as GaitMetrics).hipStabilityScore} />
                    </>
                  )}
                  {isSquat && (
                    <>
                      <ScoreBar label="Squat Depth" score={(metrics as SquatMetrics).depthScore} />
                      <ScoreBar label="Knee Tracking" score={(metrics as SquatMetrics).kneeTrackingScore} />
                      <ScoreBar label="Torso Lean" score={(metrics as SquatMetrics).torsoLeanScore} />
                      <ScoreBar label="Heel Contact" score={(metrics as SquatMetrics).heelContactScore} />
                    </>
                  )}
                  {isBend && (
                    <>
                      <ScoreBar label="Range of Motion" score={(metrics as BendingMetrics).romScore} />
                      <ScoreBar label="Hip Hinge" score={(metrics as BendingMetrics).hipHingeScore} />
                      <ScoreBar label="Symmetry" score={(metrics as BendingMetrics).symmetryScore} />
                    </>
                  )}
                </div>

                {/* Findings */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-900/70">Findings</p>
                  {metrics.findings.map((finding, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                      <span className="text-[#176B63]/50 mt-0.5">◆</span>
                      <span>{finding}</span>
                    </div>
                  ))}
                </div>

                {/* Tips */}
                <div className="bg-[#176B63]/5 border border-[#176B63]/10 rounded-xl p-3">
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <span>💡</span>
                    <span>{meta.tip}</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────

export default function VisionPage() {
  const [step, setStep] = useState<Step>("consent")
  const [photos, setPhotos] = useState<PhotoUpload[]>(PHOTO_ANGLES)
  const [videos, setVideos] = useState<VideoUpload[]>(VIDEO_TYPES)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState("Initializing analysis...")
  const [findings, setFindings] = useState<PostureFinding[]>([])
  const [existingData, setExistingData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isExisting, setIsExisting] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const [modelLoading, setModelLoading] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [modelLoadError, setModelLoadError] = useState("")
  const [analysisResult, setAnalysisResult] = useState<{
    summary: string
    confidenceScore: number
    processingTimeMs: number
    landmarksDetected: boolean
  } | null>(null)
  const [movementResult, setMovementResult] = useState<MovementAnalysisResult | null>(null)
  const [resultTab, setResultTab] = useState<"posture" | "movement">("posture")
  const hasNavigatedToPhotos = useRef(false)
  const initialLoadDone = useRef(false)
  const modelPreloaded = useRef(false)

  // Load existing data
  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true

    async function load() {
      try {
        const data = await api.get<any>("/vision")
        setExistingData(data)
        const visionConsent = data?.consentVision ?? false
        setConsentGiven(visionConsent)

        if (data?.analyses?.length > 0 || data?.media?.length > 0) {
          setIsExisting(true)
        } else if (visionConsent && !hasNavigatedToPhotos.current) {
          hasNavigatedToPhotos.current = true
          setStep("photos")
        }
      } catch {
        // Not authenticated or no data
      } finally {
        setLoading(false)

        if (!modelPreloaded.current) {
          modelPreloaded.current = true
          preloadModel()
        }
      }
    }
    load()
  }, [])

  // ─── Preload MediaPipe Model ──────────────────────────────

  async function preloadModel() {
    setModelLoading(true)
    try {
      await preloadPoseLandmarker()
      setModelReady(true)
    } catch (err) {
      console.error("Failed to load pose model:", err)
      setModelLoadError("Could not load the AI model. Your browser may not support WebAssembly or GPU acceleration.")
    } finally {
      setModelLoading(false)
    }
  }

  // ─── Consent Handler ──────────────────────────────────────

  async function handleConsent() {
    setSaving(true)
    try {
      await api.post("/vision?action=consent", { consentVision: true })
      setConsentGiven(true)
      setIsExisting(false)
      setStep("photos")
    } catch (err) {
      console.error("Failed to save consent", err)
    } finally {
      setSaving(false)
    }
  }

  // Auto-skip consent if already given and no existing data
  useEffect(() => {
    if (!loading && consentGiven && !isExisting && step === "consent" && !hasNavigatedToPhotos.current) {
      hasNavigatedToPhotos.current = true
      setStep("photos")
    }
  }, [loading, consentGiven, isExisting, step])

  // ─── Photo Handlers ───────────────────────────────────────

  async function handlePhoto(index: number, file: File) {
    const reader = new FileReader()
    reader.onloadend = async () => {
      const preview = reader.result as string
      setPhotos((prev) =>
        prev.map((p, i) => (i === index ? { ...p, file, preview } : p))
      )

      api.post("/vision?action=upload-media", {
        mediaType: "photo",
        angle: PHOTO_ANGLES[index].angle,
        fileKey: `vision/upload/photo_${PHOTO_ANGLES[index].angle}_${Date.now()}.jpg`,
        fileSizeBytes: file.size,
        mimeType: file.type,
      }).catch(() => {})
    }
    reader.readAsDataURL(file)
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, file: null, preview: null, uploadKey: null } : p)))
  }

  function allPhotosDone() {
    return photos.every((p) => p.file !== null)
  }

  // ─── Video Handlers ───────────────────────────────────────

  async function handleVideo(index: number, file: File) {
    const reader = new FileReader()
    reader.onloadend = async () => {
      const preview = reader.result as string
      setVideos((prev) =>
        prev.map((v, i) => (i === index ? { ...v, file, preview } : v))
      )

      api.post("/vision?action=upload-media", {
        mediaType: "video",
        movementType: VIDEO_TYPES[index].movementType,
        fileKey: `vision/upload/video_${VIDEO_TYPES[index].movementType}_${Date.now()}.mp4`,
        fileSizeBytes: file.size,
        mimeType: file.type,
      }).catch(() => {})
    }
    reader.readAsDataURL(file)
  }

  function removeVideo(index: number) {
    setVideos((prev) => prev.map((v, i) => (i === index ? { ...v, file: null, preview: null, uploadKey: null } : v)))
  }

  // ─── Real MediaPipe Processing ────────────────────────────

  async function startProcessing() {
    setStep("processing")
    setProcessingProgress(0)
    setProcessingStatus("Initializing MediaPipe PoseLandmarker...")

    if (!modelReady) {
      try {
        await preloadPoseLandmarker()
        setModelReady(true)
      } catch (err) {
        console.error("Model load failed:", err)
        setProcessingStatus("Failed to load AI model. Please try again.")
        return
      }
    }

    setProcessingStatus("Loading photos...")

    const photoFiles = photos.filter((p) => p.file !== null)
    const imageElements: { angle: "front" | "side" | "back"; element: HTMLImageElement }[] = []

    try {
      for (const photo of photoFiles) {
        const img = await fileToImage(photo.file!)
        imageElements.push({ angle: photo.angle, element: img })
      }
    } catch {
      setProcessingStatus("Failed to load images for analysis.")
      return
    }

    setProcessingStatus("Running pose detection (MediaPipe on-device)...")
    setProcessingProgress(30)

    try {
      const result = await analyzePose(imageElements)
      imageElements.forEach(({ element }) => revokeImageUrl(element))

      setProcessingProgress(65)
      setProcessingStatus("Analyzing movement videos...")

      // Process videos if any were uploaded
      const videoFiles = videos
        .filter((v) => v.file !== null)
        .map((v) => ({ movementType: v.movementType, file: v.file! }))

      if (videoFiles.length > 0) {
        setProcessingStatus(`Analyzing ${videoFiles.length} video(s)...`)
        const movementResult = await analyzeMovementVideos(videoFiles, (type, progress, status) => {
          setProcessingProgress(65 + Math.round(progress * 0.25))
          setProcessingStatus(`${status}`)
        })
        setMovementResult(movementResult)
      }

      setProcessingProgress(92)
      setProcessingStatus("Analyzing posture characteristics...")

      const enrichedFindings = result.findings.map((f) => ({
        ...f,
        explanation: f.explanation || CHARACTERISTIC_META_LOOKUP[f.characteristic]?.explanation || "",
      }))

      setFindings(enrichedFindings)
      setAnalysisResult({
        summary: result.summary,
        confidenceScore: result.confidenceScore,
        processingTimeMs: result.processingTimeMs,
        landmarksDetected: result.landmarksDetected,
      })

      setProcessingProgress(97)
      setProcessingStatus("Finalizing results...")

      await saveAnalysisToApi(enrichedFindings, result)

      setProcessingProgress(100)
      setProcessingStatus("Analysis complete!")

      setTimeout(() => setStep("results"), 500)
    } catch (err) {
      console.error("Pose analysis failed:", err)
      setProcessingStatus("Analysis failed. Please try again with clearer photos.")
      imageElements.forEach(({ element }) => revokeImageUrl(element))
    }
  }

  async function saveAnalysisToApi(
    enrichedFindings: PostureFinding[],
    result: { summary: string; confidenceScore: number; processingTimeMs: number }
  ) {
    const nonNormal = enrichedFindings.filter((f) => f.severity !== "none")
    api.post("/vision?action=save-analysis", {
      findings: {
        detected: nonNormal.map((f) => f.characteristic),
        summary: result.summary,
      },
      summary: result.summary,
      postureCharacteristics: enrichedFindings.map((f) => ({
        characteristic: f.characteristic,
        severity: f.severity,
        confidence: f.confidence,
        description: f.description,
      })),
      confidenceScore: result.confidenceScore,
      processingTimeMs: result.processingTimeMs,
      modelVersion: POSE_MODEL_VERSION,
    }).catch(() => {})
  }

  // ─── Delete Data ──────────────────────────────────────────

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete all your vision analysis data? This action cannot be undone.")) return
    try {
      await api.delete("/vision")
      setPhotos(PHOTO_ANGLES)
      setVideos(VIDEO_TYPES)
      setFindings([])
      setIsExisting(false)
      setConsentGiven(false)
      setAnalysisResult(null)
      setStep("consent")
    } catch (err) {
      console.error("Failed to delete vision data", err)
    }
  }

  // ─── View Existing Results ────────────────────────────────

  function viewExistingResults() {
    if (existingData?.analyses?.length > 0) {
      const latest = existingData.analyses[0]
      const mappedFindings = latest.postureCharacteristics?.length > 0
        ? latest.postureCharacteristics.map((pc: any) => {
            const meta = CHARACTERISTIC_META_LOOKUP[pc.characteristic] || { icon: "🔍", explanation: "" }
            return {
              characteristic: pc.characteristic,
              severity: pc.severity || "mild",
              icon: meta.icon,
              description: pc.description || "",
              explanation: pc.description || meta.explanation || "",
              confidence: pc.confidence || 0.7,
            }
          })
        : []

      setFindings(mappedFindings)
      setAnalysisResult({
        summary: latest.summary || `Previous analysis found ${mappedFindings.filter((f: PostureFinding) => f.severity !== "none").length} areas to address.`,
        confidenceScore: latest.confidenceScore || 0.7,
        processingTimeMs: latest.processingTimeMs || 0,
        landmarksDetected: true,
      })
      setStep("results")
    } else {
      setPhotos(PHOTO_ANGLES)
      setVideos(VIDEO_TYPES)
      setStep("photos")
    }
  }

  // ─── Loading State ────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Vision Analysis</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#176B63] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Get step description ─────────────────────────────────

  function getStepDescription(s: Step): string {
    switch (s) {
      case "consent": return "AI-powered analysis of your body posture and movement patterns"
      case "photos": return "Upload or capture 3 body photos for analysis"
      case "videos": return "Optional: add movement videos for deeper analysis"
      case "processing": return "AI is analyzing your images and videos..."
      case "results": return "Your posture analysis results"
    }
  }

  // ─── Render Steps ─────────────────────────────────────────

  function renderStepContent() {
    switch (step) {
      case "consent": return renderConsent()
      case "photos": return renderPhotos()
      case "videos": return renderVideos()
      case "processing": return renderProcessing()
      case "results": return renderResults()
    }
  }

  // ─── Render: Consent ──────────────────────────────────────

  function renderConsent() {
    return (
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-[#176B63]/5 border border-[#176B63]/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Privacy & Consent</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
              We take your privacy seriously. Please review how your data will be used.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {[
              { icon: "🔐", label: "End-to-End Encryption", desc: "All photos and videos are encrypted in transit and at rest.", color: "border-[#176B63]/10 bg-[#176B63]/3" },
              { icon: "🤖", label: "AI Analysis Only", desc: "Your images are used solely for posture analysis. They are not shared with third parties.", color: "border-[#476A91]/10 bg-[#476A91]/3" },
              { icon: "⚕️", label: "Not a Medical Diagnosis", desc: "Posture analysis results are AI-generated observations, not medical diagnoses. Always consult a healthcare professional.", color: "border-[#9B651B]/10 bg-[#9B651B]/3" },
              { icon: "🗑️", label: "You're in Control", desc: "You can delete your photos and analysis data at any time.", color: "border-[#176B63]/10 bg-[#176B63]/3" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                variants={fadeUpFast}
                className={`flex gap-3 p-4 rounded-xl border ${item.color}`}
              >
                <span className="text-lg shrink-0">{item.icon}</span>
                <div className="text-sm">
                  <p className="font-medium text-gray-900 mb-0.5">{item.label}</p>
                  <p className="text-gray-500">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Model loading indicator */}
          {modelLoading && (
            <motion.div variants={fadeUpFast} className="mb-4 flex items-center gap-2 p-3 bg-[#176B63]/5 rounded-xl border border-[#176B63]/10">
              <div className="w-4 h-4 border-2 border-[#176B63] border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-xs text-gray-500">Loading AI pose model in background for faster analysis...</p>
            </motion.div>
          )}
          {modelLoadError && !modelLoading && (
            <motion.div variants={fadeUpFast} className="mb-4 p-3 bg-[#9B651B]/5 rounded-xl border border-[#9B651B]/10">
              <p className="text-xs text-[#9B651B]">⚠️ {modelLoadError} Analysis may still work but could be slower.</p>
            </motion.div>
          )}

          <motion.div variants={fadeUp} className="border-t border-gray-100 pt-6">
            {isExisting ? (
              <div className="space-y-3">
                <button
                  onClick={viewExistingResults}
                  className="w-full py-3 bg-[#176B63] text-gray-900 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#176B63]/20 transition-all"
                >
                  📊 View Previous Analysis
                </button>
                <button
                  onClick={() => setStep("photos")}
                  className="w-full py-3 bg-gray-100 text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-200 transition-all border border-gray-200"
                >
                  📸 Upload New Photos
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full py-2 text-sm text-[#B53A45] hover:text-[#FF8B6B] transition-colors"
                >
                  Delete my vision data
                </button>
              </div>
            ) : (
              <button
                onClick={handleConsent}
                disabled={saving}
                className="w-full py-3 bg-gradient-to-r from-[#176B63] to-[#10554F] text-gray-900 rounded-xl font-semibold text-sm
                  hover:shadow-lg hover:shadow-[#176B63]/20 disabled:opacity-50 transition-all"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "I Consent — Start Analysis"
                )}
              </button>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    )
  }

  // ─── Render: Photos ───────────────────────────────────────

  function renderPhotos() {
    return (
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Upload Body Photos</h2>
          <p className="text-sm text-gray-500 mb-6">
            Take or upload 3 photos for a complete posture analysis. Wear form-fitting clothing for best results.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {photos.map((photo, index) => (
              <motion.div key={photo.angle} variants={fadeUpFast} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{photo.label}</span>
                  {photo.file && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[#176B63] text-xs">✓</motion.span>}
                </div>
                <UploadDropzone
                  label={photo.label}
                  description={photo.description}
                  preview={photo.preview}
                  onFile={(file) => handlePhoto(index, file)}
                  onRemove={() => removePhoto(index)}
                  icon={photo.angle === "front" ? "🤳" : photo.angle === "side" ? "🧍" : "🔙"}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="flex justify-between items-center">
          <button
            onClick={() => setStep("consent")}
            className="px-5 h-10 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Back
          </button>
          <motion.button
            whileHover={allPhotosDone() ? { scale: 1.02 } : {}}
            whileTap={allPhotosDone() ? { scale: 0.98 } : {}}
            onClick={() => setStep("videos")}
            disabled={!allPhotosDone()}
            className={`px-6 h-10 text-sm font-medium rounded-xl transition-all duration-200 ${
              allPhotosDone()
                ? "bg-gradient-to-r from-[#176B63] to-[#10554F] text-gray-900 shadow-sm hover:shadow-lg hover:shadow-[#176B63]/20"
                : "bg-gray-50 text-gray-500/40 cursor-not-allowed border border-gray-100"
            }`}
          >
            {allPhotosDone() ? "Next: Optional Videos →" : "Upload all 3 photos first"}
          </motion.button>
        </motion.div>
      </motion.div>
    )
  }

  // ─── Render: Videos ───────────────────────────────────────

  function renderVideos() {
    return (
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-gray-900">Movement Videos</h2>
            <span className="text-[10px] px-2 py-0.5 bg-[#176B63]/5 text-[#176B63] rounded-full border border-[#176B63]/20">Optional</span>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Upload short videos for dynamic movement analysis. This helps us assess your gait and mobility.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {videos.map((video, index) => (
              <motion.div key={video.movementType} variants={fadeUpFast} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{video.label}</span>
                  {video.file && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[#176B63] text-xs">✓</motion.span>}
                </div>
                <UploadDropzone
                  label={video.label}
                  description={video.description}
                  preview={video.preview}
                  onFile={(file) => handleVideo(index, file)}
                  onRemove={() => removeVideo(index)}
                  accept="video/*"
                  icon={video.movementType === "walking" ? "🚶" : video.movementType === "squatting" ? "🏋️" : "🤸"}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="flex justify-between items-center">
          <button
            onClick={() => setStep("photos")}
            className="px-5 h-10 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Back
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startProcessing}
            className="px-8 h-10 bg-gradient-to-r from-[#176B63] to-[#10554F] text-gray-900 text-sm font-semibold rounded-xl
              hover:shadow-lg hover:shadow-[#176B63]/20 transition-all"
          >
            {videos.some((v) => v.file)
              ? "Submit Photos & Videos for Analysis →"
              : "Skip Videos & Analyze Photos →"}
          </motion.button>
        </motion.div>
      </motion.div>
    )
  }

  // ─── Render: Processing ───────────────────────────────────

  function renderProcessing() {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease }}
        className="bg-white rounded-2xl border border-gray-200 p-8"
      >
        <ProcessingAnimation progress={processingProgress} status={processingStatus} />
        {processingStatus.includes("Failed") && (
          <div className="mt-6 text-center">
            <p className="text-xs text-[#B53A45] mb-4">{modelLoadError || "Make sure your photos show your full body clearly."}</p>
            <button
              onClick={() => setStep("videos")}
              className="px-6 py-2.5 bg-white/[0.06] text-gray-900 rounded-xl text-sm font-medium hover:bg-white/[0.10] transition-all"
            >
              ← Go Back
            </button>
          </div>
        )}
      </motion.div>
    )
  }

  // ─── Render: Results ──────────────────────────────────────

  function renderResults() {
    return (
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
        {/* Overall Summary */}
        <motion.div
          variants={fadeUp}
          className={`rounded-2xl p-6 text-white border ${
            findings.some((f) => f.severity !== "none")
              ? "bg-gradient-to-br from-[#0A0E1A] via-[#0D1425] to-[#0E1A1A] border-[#176B63]/10"
              : "bg-gradient-to-br from-[#0E1A0E] via-[#0E1A0E] to-[#0E1A0E] border-[#176B63]/10"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Analysis Results</h2>
            {analysisResult && (
              <span className="px-3 py-1 bg-[#176B63]/10 text-[#176B63] rounded-full text-[10px] font-medium border border-[#176B63]/20">
                AI Confidence: {Math.round(analysisResult.confidenceScore * 100)}%
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            {analysisResult?.summary || findings.map((f) => f.characteristic).join(", ")}
          </p>
          <div className="mt-4 flex gap-2 flex-wrap">
            <span className="text-[10px] px-2 py-1 bg-gray-100 text-gray-500 rounded-full border border-gray-100">⚕️ Not a medical diagnosis</span>
            <span className="text-[10px] px-2 py-1 bg-gray-100 text-gray-500 rounded-full border border-gray-100">📸 Based on {photos.filter((p) => p.file).length} photos</span>
            {analysisResult && (
              <span className="text-[10px] px-2 py-1 bg-gray-100 text-gray-500 rounded-full border border-gray-100">
                ⚡ Processed in {(analysisResult.processingTimeMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        </motion.div>

        {/* Tab: Posture / Movement */}
        {movementResult && (movementResult.walking || movementResult.squatting || movementResult.bending) && (
          <motion.div variants={fadeUp} className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 w-fit">
            {(["posture", "movement"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setResultTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  resultTab === tab
                    ? "bg-[#176B63] text-gray-900"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {tab === "posture" ? "🧍 Posture" : "🏃 Movement"}
              </button>
            ))}
          </motion.div>
        )}

        {/* Posture Findings */}
        <AnimatePresence mode="wait">
          {resultTab === "posture" ? (
            <motion.div
              key="posture"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25, ease }}
              className="space-y-2"
            >
              <h3 className="text-sm font-semibold text-gray-900/70 mb-3">Detailed Findings</h3>
              {findings.map((finding, index) => (
                <PostureCard key={finding.characteristic} finding={finding} index={index} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="movement"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25, ease }}
              className="space-y-4"
            >
              <h3 className="text-sm font-semibold text-gray-900/70 mb-3">Movement Analysis</h3>
              {movementResult?.walking && <MovementCard type="walking" metrics={movementResult.walking} index={0} />}
              {movementResult?.squatting && <MovementCard type="squatting" metrics={movementResult.squatting} index={1} />}
              {movementResult?.bending && <MovementCard type="bending" metrics={movementResult.bending} index={2} />}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tips Section */}
        <motion.div variants={fadeUp} className="bg-[#9B651B]/3 border border-[#9B651B]/10 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#9B651B] mb-3">💡 What You Can Do</h3>
          <ul className="space-y-2">
            {[
              { icon: "🖥️", text: "Adjust your monitor height to eye level and use a chair with lumbar support" },
              { icon: "🧘", text: "Take 5-min stretch breaks every hour — focus on chest opening and chin tucks" },
              { icon: "🏋️", text: "Strengthen upper back (rows, face pulls) and glutes (bridges, clamshells)" },
              { icon: "👟", text: "Consider supportive footwear and be mindful of standing evenly on both feet" },
            ].map((tip, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08, ease }}
                className="flex items-start gap-2 text-sm text-gray-500"
              >
                <span className="mt-0.5 shrink-0">{tip.icon}</span>
                <span>{tip.text}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Medical Disclaimer */}
        <motion.div variants={fadeUp} className="bg-[#B53A45]/3 border border-[#B53A45]/10 rounded-xl p-4 text-xs text-gray-500">
          <p className="font-medium text-[#B53A45] mb-1">⚠️ Important Disclaimer</p>
          <p>
            These results are AI-generated observations based on visual analysis of uploaded photos/videos.
            They are <strong className="text-[#B53A45]">not a medical diagnosis</strong> and should not replace professional medical advice.
            If you're experiencing pain or discomfort, please consult a qualified healthcare provider,
            physiotherapist, or orthopedic specialist.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              setPhotos(PHOTO_ANGLES)
              setVideos(VIDEO_TYPES)
              setFindings([])
              setStep("photos")
            }}
            className="flex-1 py-3 bg-[#176B63] text-gray-900 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#176B63]/20 transition-all"
          >
            📸 New Analysis
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 py-3 bg-[#B53A45]/5 text-[#B53A45] rounded-xl font-medium text-sm hover:bg-[#B53A45]/10 transition-all border border-[#B53A45]/10"
          >
            🗑️ Delete My Data
          </button>
        </motion.div>
      </motion.div>
    )
  }

  // ─── Main Render ─────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-gray-900">Vision Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">{getStepDescription(step)}</p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-5">
          {(["consent", "photos", "videos", "processing", "results"] as const).map((s, i) => {
            const stepNames = ["Consent", "Photos", "Videos", "Analysis", "Results"]
            const currentIdx = ["consent", "photos", "videos", "processing", "results"].indexOf(step)
            const thisIdx = i
            const isCompleted = thisIdx < currentIdx
            const isCurrent = thisIdx === currentIdx
            return (
              <div key={s} className="flex items-center gap-2">
                <motion.div
                  animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5, repeat: isCurrent ? Infinity : 0, repeatDelay: 2 }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                    isCompleted
                      ? "bg-[#176B63] text-gray-900"
                      : isCurrent
                        ? "bg-[#176B63]/10 text-[#176B63] border border-[#176B63]/30"
                        : "bg-gray-50 text-gray-500/40 border border-gray-100"
                  }`}
                >
                  {isCompleted ? "✓" : i + 1}
                </motion.div>
                <span
                  className={`text-[10px] font-medium hidden sm:block transition-colors ${
                    isCurrent ? "text-[#176B63]" : isCompleted ? "text-gray-500" : "text-gray-500/30"
                  }`}
                >
                  {stepNames[i]}
                </span>
                {i < 4 && <div className={`w-5 h-px transition-colors ${thisIdx < currentIdx ? "bg-[#176B63]/30" : "bg-gray-100"}`} />}
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
