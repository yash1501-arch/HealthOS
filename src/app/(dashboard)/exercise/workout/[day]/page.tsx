"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { preloadPoseLandmarker } from "@/lib/pose-analysis"
import { ExerciseSessionManager, EXERCISE_CONFIGS, type ExerciseType, type ExerciseFeedback } from "@/lib/exercise-tracker"
import { generateWorkoutPlan, getNextSessionNotes, type WorkoutDay, type WorkoutExercise, type ExerciseResult, type SessionReport } from "@/lib/workout-plans"
import { t, LANGUAGES, type Language } from "@/lib/i18n/exercise"
import { api } from "@/lib/api-client"
import { toastSuccess, toastError } from "@/stores/toast"

type Phase = "intro" | "demo" | "countdown" | "active" | "rest" | "report"

const EASE = [0.16, 1, 0.3, 1] as const

export default function WorkoutSessionPage() {
  const router = useRouter()
  const params = useParams()
  const dayIndex = parseInt(params.day as string)

  const [plan, setPlan] = useState<WorkoutDay | null>(null)
  const [lang, setLang] = useState<Language>("en")
  const [phase, setPhase] = useState<Phase>("intro")
  const [currentEx, setCurrentEx] = useState(0)
  const [feedback, setFeedback] = useState<ExerciseFeedback | null>(null)
  const [sessionResults, setSessionResults] = useState<ExerciseResult[]>([])
  const [countdown, setCountdown] = useState(3)
  const [modelReady, setModelReady] = useState(false)
  const [demoProgress, setDemoProgress] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyzerRef = useRef<ExerciseSessionManager | null>(null)
  const animRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    const assessment = localStorage.getItem("healthos-assessment-draft")
    const painAreas: string[] = []
    try {
      const data = JSON.parse(assessment || "{}")
      preloadPoseLandmarker().then(() => setModelReady(true)).catch(() => {})
    } catch {}
    setPlan(generateWorkoutPlan([], "beginner", painAreas).days.find((d) => d.day === dayIndex) || null)
  }, [dayIndex])

  const exercises = plan?.exercises || []
  const currentWorkout = exercises[currentEx]

  // Demo timer
  useEffect(() => {
    if (phase !== "demo" || !currentWorkout) return
    setDemoProgress(0)
    const duration = currentWorkout.demoDuration * 10 // 10 ticks per second for smooth progress
    let tick = 0
    timerRef.current = setInterval(() => {
      tick++
      setDemoProgress((tick / duration) * 100)
      if (tick >= duration) {
        clearInterval(timerRef.current)
        startCamera()
      }
    }, 100)
    return () => clearInterval(timerRef.current)
  }, [phase, currentEx])

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return
    setCountdown(3)
    const interval = setInterval(() => {
      setCountdown((prev) => { if (prev <= 1) { clearInterval(interval); return 0 } return prev - 1 })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  const startCamera = useCallback(async () => {
    const workout = exercises[currentEx]
    if (!workout) {
      toastError("No exercise data", "Please go back and try again.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setPhase("countdown")
      setTimeout(() => {
        setPhase("active")
        const session = new ExerciseSessionManager(workout.type)
        session.start()
        analyzerRef.current = session
        requestAnimationFrame(trackFrame)
      }, 3000)
    } catch {
      toastError("Camera access denied", "Please allow camera to use this feature.")
      setPhase("intro")
    }
  }, [currentEx])

  function trackFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !analyzerRef.current) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
    ctx.restore()

    // Draw feedback
    if (feedback) {
      ctx.fillStyle = "rgba(0,0,0,0.5)"
      ctx.fillRect(0, 0, canvas.width, 48)
      ctx.fillStyle = "#FFFFFF"
      ctx.font = "bold 20px system-ui"
      ctx.fillText(`🏋️ ${feedback.repCount}`, 16, 32)
      ctx.fillStyle = feedback.isCorrect ? "#2FE6C4" : "#FF6B6B"
      ctx.fillText(`${feedback.score}%`, canvas.width - 80, 32)
    }

    animRef.current = requestAnimationFrame(trackFrame)
  }

  function endExercise() {
    stopCamera()
    if (analyzerRef.current) {
      const sessionData = analyzerRef.current.end()
      const result: ExerciseResult = {
        exerciseType: currentWorkout!.type,
        completedReps: sessionData.completedReps,
        targetReps: currentWorkout!.targetReps,
        completedSets: sessionData.completedSets,
        targetSets: currentWorkout!.targetSets,
        avgFormScore: sessionData.avgScore,
        issues: sessionData.frames.filter((f: any) => !f.feedback.isCorrect).map((f: any) => f.feedback.formIssues.map((i: any) => i.message)).flat(),
        duration: sessionData.duration,
      }
      setSessionResults((prev) => [...prev, result])
    }

    if (currentEx < exercises.length - 1) {
      setPhase("rest")
      setTimeout(() => {
        setCurrentEx((prev) => prev + 1)
        setFeedback(null)
        setPhase("demo")
      }, exercises[currentEx]?.restAfter || 30 * 1000)
    } else {
      finishSession()
    }
  }

  async function finishSession() {
    const results = sessionResults
    const overallScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.avgFormScore, 0) / results.length) : 0
    const totalDuration = results.reduce((s, r) => s + r.duration, 0)
    const notes = results.length > 0 ? getNextSessionNotes({ results, overallScore, totalDuration, date: "", dayName: plan?.dayName || "", focus: plan?.focus || "full_body", recommendations: [] }) : []

    try {
      await api.post("/exercise/report", {
        dayName: plan?.dayName,
        focus: plan?.focus,
        overallScore,
        totalDuration,
        results,
        recommendations: notes,
      })
    } catch {}

    setPhase("report")
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    cancelAnimationFrame(animRef.current)
  }

  useEffect(() => () => stopCamera(), [])

  if (!plan) return <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-[#176B63] border-t-transparent rounded-full animate-spin mx-auto" /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#172033]">{plan.dayName}</h1>
          <p className="text-sm text-[#4B5870] mt-1 capitalize">{plan.focus.replace("_", " ")} · {exercises.length} exercises</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={lang} onChange={(e) => setLang(e.target.value as Language)} className="h-8 px-2 rounded-lg border border-[#E2E8F0] text-xs bg-white">
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.code.toUpperCase()}</option>)}
          </select>
          <button onClick={() => router.push("/exercise")} className="text-sm text-[#4B5870] hover:text-[#172033]">✕</button>
        </div>
      </div>

      {/* Phase: Intro */}
      {phase === "intro" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[#172033]">{t("exercise.start", lang)}</h2>
          <div className="space-y-3">
            {exercises.map((ex, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-[#F5F7FA] rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-[#176B63]/10 flex items-center justify-center text-sm font-bold text-[#176B63]">{i + 1}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#172033]">{ex.name}</p>
                  <p className="text-xs text-[#4B5870]">{ex.targetSets} × {ex.targetReps} reps</p>
                </div>
                <span className="text-xs text-[#4B5870]/60">{ex.demoDuration}s demo</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setPhase("demo")}
            disabled={!modelReady}
            className="w-full h-12 bg-[#176B63] text-white rounded-xl font-semibold hover:bg-[#10554F] disabled:opacity-40 transition-all"
          >
            {modelReady ? `▶ ${t("exercise.start", lang)}` : "Loading AI model..."}
          </button>
          {plan.tips.length > 0 && (
            <div className="bg-[#176B63]/5 rounded-xl p-3 text-xs text-[#4B5870]">
              💡 {plan.tips[0]}
            </div>
          )}
        </div>
      )}

      {/* Phase: Demo */}
      {phase === "demo" && currentWorkout && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center">
          {/* Animated exercise visualization */}
          <div className="w-40 h-40 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-[#176B63]/5 rounded-full" />
            <div className="absolute inset-4 bg-[#176B63]/10 rounded-full flex items-center justify-center">
              <span className="text-6xl">
                {currentWorkout.type === "squat" ? "🏋️" : currentWorkout.type === "pushup" ? "💪" : currentWorkout.type === "knee_raise" ? "🦵" : currentWorkout.type === "shoulder_rotation" ? "🔄" : currentWorkout.type === "hip_raise" ? "🧘" : "⚖️"}
              </span>
            </div>
            {/* Animated progress ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="72" fill="none" stroke="#E2E8F0" strokeWidth="4" />
              <circle cx="80" cy="80" r="72" fill="none" stroke="#176B63" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 72}`}
                strokeDashoffset={`${2 * Math.PI * 72 * (1 - demoProgress / 100)}`}
                strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.1s linear" }} />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#172033]">{currentWorkout.name}</h2>
          <p className="text-sm text-[#4B5870] mt-2">{t("exercise.demo", lang)} — {currentWorkout.targetSets} × {currentWorkout.targetReps}</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-2 h-2 rounded-full bg-[#176B63] animate-pulse" />
            <span className="text-sm text-[#4B5870]">{t("exercise.ready_in", lang)}...</span>
          </div>
          {/* Exercise demo instructions */}
          <div className="mt-6 text-left max-w-md mx-auto space-y-3">
            <p className="text-xs font-semibold text-[#4B5870] uppercase tracking-wider">How to do it:</p>
            {EXERCISE_CONFIGS[currentWorkout.type]?.instructions.map((s, i) => (
              <div key={i} className="flex gap-3 text-sm text-[#4B5870]">
                <div className="w-6 h-6 rounded-full bg-[#176B63]/10 text-[#176B63] flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                <p className="pt-0.5">{s}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Phase: Countdown / Active */}
      {(phase === "countdown" || phase === "active") && (
        <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3]">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" playsInline muted />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          {phase === "countdown" && (
            <motion.div initial={{ opacity: 0, scale: 2 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/60">
              <span className="text-8xl font-bold text-white">{countdown}</span>
            </motion.div>
          )}
          {phase === "active" && feedback && (
            <>
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2">
                <p className="text-white text-2xl font-bold">{feedback.repCount}</p>
                <p className="text-white/60 text-xs">{t("exercise.reps", lang)}</p>
              </div>
              <div className={`absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 ${feedback.isCorrect ? "text-green-400" : "text-orange-400"}`}>
                <p className="text-lg font-bold">{feedback.score}%</p>
                <p className="text-white/60 text-xs">{t("exercise.form", lang)}</p>
              </div>
              {feedback.formIssues.slice(0, 1).map((issue, i) => (
                <div key={i} className={`absolute bottom-20 left-4 right-4 ${issue.severity === "error" ? "bg-red-500/80" : "bg-yellow-500/80"} backdrop-blur-sm rounded-xl px-4 py-2 text-sm text-white`}>
                  {issue.message}
                </div>
              ))}
              <button onClick={endExercise} className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 h-10 bg-[#B53A45] text-white rounded-xl text-sm font-medium hover:bg-[#8B2D36] shadow-lg">
                ■ {t("exercise.end", lang)}
              </button>
            </>
          )}
        </div>
      )}

      {/* Phase: Rest */}
      {phase === "rest" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center">
          <span className="text-4xl">⏳</span>
          <h2 className="text-lg font-semibold text-[#172033] mt-2">{t("exercise.rest", lang)}</h2>
          <p className="text-sm text-[#4B5870] mt-1">
            {currentEx < exercises.length - 1 ? `Next: ${exercises[currentEx + 1]?.name}` : t("exercise.almost_there", lang)}
          </p>
          <div className="w-32 h-1 bg-[#E2E8F0] rounded-full mx-auto mt-4 overflow-hidden">
            <motion.div className="h-full bg-[#176B63] rounded-full" animate={{ width: "100%" }} transition={{ duration: (exercises[currentEx - 1]?.restAfter || 30) / 1000, ease: "linear" }} />
          </div>
        </motion.div>
      )}

      {/* Phase: Report */}
      {phase === "report" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center">
          <span className="text-5xl">🎉</span>
          <h2 className="text-xl font-bold text-[#172033] mt-3">{t("exercise.session_summary", lang)}</h2>
          <p className="text-sm text-[#4B5870] mt-1">{t("exercise.great_job", lang)}</p>

          <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto mt-6">
            <div className="bg-[#F5F7FA] rounded-xl p-3">
              <p className="text-xl font-bold text-[#176B63]">{sessionResults.reduce((s, r) => s + r.completedReps, 0)}</p>
              <p className="text-[10px] text-[#4B5870]">{t("report.reps_completed", lang)}</p>
            </div>
            <div className="bg-[#F5F7FA] rounded-xl p-3">
              <p className="text-xl font-bold text-[#476A91]">
                {sessionResults.length > 0 ? Math.round(sessionResults.reduce((s, r) => s + r.avgFormScore, 0) / sessionResults.length) : 0}%
              </p>
              <p className="text-[10px] text-[#4B5870]">{t("report.avg_form", lang)}</p>
            </div>
            <div className="bg-[#F5F7FA] rounded-xl p-3">
              <p className="text-xl font-bold text-[#9B651B]">{Math.round(sessionResults.reduce((s, r) => s + r.duration, 0) / 60000)}m</p>
              <p className="text-[10px] text-[#4B5870]">{t("exercise.duration", lang)}</p>
            </div>
          </div>

          {/* Results per exercise */}
          <div className="mt-6 text-left space-y-2">
            {sessionResults.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-[#F5F7FA] rounded-xl">
                <div>
                  <p className="text-sm font-medium text-[#172033]">{r.exerciseType}</p>
                  <p className="text-xs text-[#4B5870]">{r.completedReps}/{r.targetReps} reps · {r.completedSets}/{r.targetSets} sets</p>
                </div>
                <div className={`text-sm font-bold ${r.avgFormScore >= 70 ? "text-[#176B63]" : r.avgFormScore >= 50 ? "text-[#9B651B]" : "text-[#B53A45]"}`}>
                  {r.avgFormScore}%
                </div>
              </div>
            ))}
          </div>

          {/* Next session notes (not saved recordings) */}
          <div className="mt-6 bg-[#176B63]/5 rounded-xl p-4 text-left">
            <p className="text-xs font-semibold text-[#176B63] mb-2">{t("next_session.focus", lang)}</p>
            <ul className="space-y-1">
              {getNextSessionNotes({ results: sessionResults, overallScore: 0, totalDuration: 0, date: "", dayName: "", focus: "full_body", recommendations: [] }).map((note, i) => (
                <li key={i} className="text-xs text-[#4B5870] flex gap-2"><span>→</span>{note}</li>
              ))}
              <li className="text-xs text-[#4B5870]/60 mt-2">ℹ️ No video recordings saved — only summary data</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-center mt-6">
            <button onClick={() => { setCurrentEx(0); setSessionResults([]); setPhase("intro") }}
              className="h-11 px-6 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all">
              🔄 Redo Workout
            </button>
            <Link href="/exercise"
              className="h-11 px-6 bg-white border border-[#E2E8F0] text-[#172033] rounded-xl text-sm font-medium hover:bg-[#F5F7FA] transition-all">
              ← Overview
            </Link>
          </div>
        </motion.div>
      )}

      {/* Progress bar */}
      <div className="flex gap-1 justify-center">
        {exercises.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentEx ? "w-8 bg-[#176B63]" : i < currentEx ? "w-4 bg-[#176B63]/40" : "w-4 bg-[#E2E8F0]"}`} />
        ))}
      </div>
    </div>
  )
}
