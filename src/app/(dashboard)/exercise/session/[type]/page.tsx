"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  preloadPoseLandmarker,
} from "@/lib/pose-analysis"
import {
  EXERCISE_CONFIGS,
  ExerciseSessionManager,
  drawSkeleton,
  type ExerciseType,
  type ExerciseFeedback,
} from "@/lib/exercise-tracker"

type Phase = "instructions" | "countdown" | "active" | "done"

const EXERCISE_LABELS: Record<string, string> = {
  squat: "Squat",
  pushup: "Push-up",
  knee_raise: "Knee Raise",
  shoulder_rotation: "Shoulder Rotation",
  hip_raise: "Glute Bridge",
  standing_balance: "Single Leg Balance",
}

export default function ExerciseSessionPage() {
  const router = useRouter()
  const params = useParams()
  const type = params.type as ExerciseType

  const config = EXERCISE_CONFIGS[type]
  if (!config) return <div className="p-8 text-center"><p className="text-[#B53A45]">Exercise not found</p></div>

  const [phase, setPhase] = useState<Phase>("instructions")
  const [feedback, setFeedback] = useState<ExerciseFeedback | null>(null)
  const [cameraError, setCameraError] = useState("")
  const [modelReady, setModelReady] = useState(false)
  const [modelLoading, setModelLoading] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sessionRef = useRef<ExerciseSessionManager | null>(null)
  const animFrameRef = useRef<number>(0)
  const landmarkerRef = useRef<any>(null)

  // Preload model
  useEffect(() => {
    async function load() {
      setModelLoading(true)
      try {
        await preloadPoseLandmarker()
        setModelReady(true)
      } catch {
        setCameraError("Could not load the AI pose model. Try a different browser.")
      } finally {
        setModelLoading(false)
      }
    }
    load()
  }, [])

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      return true
    } catch {
      setCameraError("Camera access denied. Please allow camera access to use this feature.")
      return false
    }
  }, [])

  // Stop camera
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    cancelAnimationFrame(animFrameRef.current)
  }, [])

  // Start tracking
  async function handleStart() {
    setCameraError("")
    const ok = await startCamera()
    if (!ok) return

    // Wait a moment for camera to warm up
    setPhase("countdown")
    setTimeout(() => {
      setPhase("active")
      sessionRef.current = new ExerciseSessionManager(type)
      sessionRef.current.start()
      requestAnimationFrame(trackFrame)
    }, 2000)
  }

  // Process each frame
  async function trackFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !sessionRef.current) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Mirror the video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
    ctx.restore()

    // Get landmarks (we'll use a simplified approach - draw what we have)
    // For now, show the video with overlay
    // In production, we'd run PoseLandmarker.detectForVideo() here

    // Draw feedback overlay
    if (feedback) {
      ctx.fillStyle = "rgba(0,0,0,0.4)"
      ctx.fillRect(0, 0, canvas.width, 40)

      ctx.fillStyle = "#FFFFFF"
      ctx.font = "16px system-ui"
      ctx.fillText(`Reps: ${feedback.repCount}`, 16, 26)
      ctx.fillStyle = feedback.isCorrect ? "#2FE6C4" : "#FF6B6B"
      ctx.fillText(`Score: ${feedback.score}%`, canvas.width - 120, 26)
    }

    animFrameRef.current = requestAnimationFrame(trackFrame)
  }

  // End session
  function handleEnd() {
    stopCamera()
    if (sessionRef.current) {
      const session = sessionRef.current.end()
      setFeedback(session.frames[session.frames.length - 1]?.feedback ?? null)
    }
    setPhase("done")
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  // Countdown overlay
  const [countdown, setCountdown] = useState(3)
  useEffect(() => {
    if (phase !== "countdown") return
    setCountdown(3)
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#172033]">{config.name}</h1>
          <p className="text-sm text-[#4B5870] mt-1">
            {phase === "instructions" && `${config.targetSets} sets × ${config.targetReps} reps`}
            {phase === "active" && "Tracking your movement..."}
            {phase === "done" && "Session complete!"}
          </p>
        </div>
        <button
          onClick={() => router.push("/exercise")}
          className="h-9 px-4 text-sm text-[#4B5870] hover:text-[#172033] transition-colors"
        >
          ← Back
        </button>
      </div>

      {phase === "instructions" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-6"
        >
          {/* Instructions */}
          <div>
            <h2 className="text-sm font-semibold text-[#172033] mb-3">How to do it</h2>
            <ol className="space-y-2">
              {config.instructions.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-[#4B5870]">
                  <span className="w-6 h-6 rounded-full bg-[#176B63]/10 text-[#176B63] flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Tips */}
          <div className="bg-[#176B63]/5 rounded-xl p-4 border border-[#176B63]/10">
            <h3 className="text-sm font-semibold text-[#176B63] mb-2">💡 Tips</h3>
            <ul className="space-y-1">
              {config.tips.map((tip, i) => (
                <li key={i} className="text-xs text-[#4B5870] flex gap-2">
                  <span>•</span> {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Model loading */}
          {modelLoading && (
            <div className="flex items-center gap-2 text-sm text-[#4B5870]">
              <div className="w-4 h-4 border-2 border-[#176B63] border-t-transparent rounded-full animate-spin" />
              Loading AI pose model...
            </div>
          )}

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={!modelReady || modelLoading}
            className="w-full h-12 bg-gradient-to-r from-[#176B63] to-[#10554F] text-white rounded-xl text-sm font-semibold
              hover:shadow-lg disabled:opacity-40 transition-all"
          >
            {modelLoading ? "Loading AI model..." : "📸 Start Exercise"}
          </button>

          {cameraError && (
            <div className="bg-[#B53A45]/5 border border-[#B53A45]/10 text-[#B53A45] text-sm rounded-lg p-3">
              {cameraError}
            </div>
          )}
        </motion.div>
      )}

      {/* Camera View */}
      {(phase === "countdown" || phase === "active") && (
        <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3]">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" playsInline muted />

          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

          {/* Countdown overlay */}
          <AnimatePresence>
            {phase === "countdown" && (
              <motion.div
                initial={{ opacity: 0, scale: 2 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 flex items-center justify-center bg-black/60"
              >
                <span className="text-8xl font-bold text-white">{countdown}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live feedback overlay */}
          {phase === "active" && feedback && (
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start">
              <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2">
                <p className="text-white text-2xl font-bold tabular-nums">{feedback.repCount}</p>
                <p className="text-white/60 text-xs">Reps</p>
              </div>
              <div className={`bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 ${feedback.isCorrect ? "text-green-400" : "text-orange-400"}`}>
                <p className="text-lg font-bold">{feedback.score}%</p>
                <p className="text-white/60 text-xs">Form</p>
              </div>
            </div>
          )}

          {/* Form issues */}
          {phase === "active" && feedback && feedback.formIssues.length > 0 && (
            <div className="absolute bottom-16 left-0 right-0 px-4">
              {feedback.formIssues.slice(0, 1).map((issue, i) => (
                <div
                  key={i}
                  className={`text-sm px-4 py-2 rounded-xl backdrop-blur-sm mb-2 ${
                    issue.severity === "error"
                      ? "bg-red-500/80 text-white"
                      : "bg-yellow-500/80 text-black"
                  }`}
                >
                  {issue.message}
                </div>
              ))}
            </div>
          )}

          {/* End button */}
          <button
            onClick={handleEnd}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 h-10 bg-[#B53A45] text-white rounded-xl text-sm font-medium hover:bg-[#8B2D36] transition-all shadow-lg"
          >
            ■ End Session
          </button>
        </div>
      )}

      {/* Session Complete */}
      {phase === "done" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center"
        >
          {sessionRef.current ? (
            <>
              <div className="w-16 h-16 rounded-full bg-[#176B63]/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎉</span>
              </div>
              <h2 className="text-xl font-bold text-[#172033] mb-2">Great effort!</h2>
              <p className="text-sm text-[#4B5870] mb-6">Keep it up — consistency is key!</p>

              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-6">
                <div className="bg-[#F5F7FA] rounded-xl p-4">
                  <p className="text-2xl font-bold text-[#176B63]">{feedback?.repCount ?? 0}</p>
                  <p className="text-xs text-[#4B5870]">Reps</p>
                </div>
                <div className="bg-[#F5F7FA] rounded-xl p-4">
                  <p className="text-2xl font-bold text-[#476A91]">{feedback?.score ?? 0}%</p>
                  <p className="text-xs text-[#4B5870]">Form</p>
                </div>
                <div className="bg-[#F5F7FA] rounded-xl p-4">
                  <p className="text-2xl font-bold text-[#9B651B]">
                    {sessionRef.current ? Math.round(sessionRef.current.end().duration / 1000) : 0}s
                  </p>
                  <p className="text-xs text-[#4B5870]">Duration</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#4B5870] mb-6">No session data recorded.</p>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleStart}
              className="h-11 px-6 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all"
            >
              🔄 Do Again
            </button>
            <button
              onClick={() => router.push("/exercise")}
              className="h-11 px-6 bg-white border border-[#E2E8F0] text-[#172033] rounded-xl text-sm font-medium hover:bg-[#F5F7FA] transition-all"
            >
              ← All Exercises
            </button>
          </div>
        </motion.div>
      )}

      {/* Medical disclaimer */}
      <div className="text-xs text-[#4B5870]/40 text-center">
        Listen to your body. Stop if you experience pain. Consult a professional before starting.
      </div>
    </div>
  )
}
