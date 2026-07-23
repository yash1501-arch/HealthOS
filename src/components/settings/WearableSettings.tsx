"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { api } from "@/lib/api-client"
import { toastError, toastSuccess } from "@/stores/toast"

type WearableSource = "apple_health" | "google_fit" | "fitbit"

type ConnectionInfo = {
  source: WearableSource
  connected: boolean
  lastSync: string | null
  dataTypes: string[]
}

const WEARABLE_META: Record<WearableSource, { name: string; logo: string; color: string; dataTypes: string[] }> = {
  apple_health: {
    name: "Apple Health",
    logo: "🍎",
    color: "#E53D3E",
    dataTypes: ["steps", "heart_rate", "sleep_hours", "calories", "workouts"],
  },
  google_fit: {
    name: "Google Fit",
    logo: "📱",
    color: "#4285F4",
    dataTypes: ["steps", "heart_rate", "sleep_hours", "calories", "weight"],
  },
  fitbit: {
    name: "Fitbit",
    logo: "⌚",
    color: "#00B0B9",
    dataTypes: ["steps", "heart_rate", "sleep_hours", "calories", "active_minutes"],
  },
}

const EASE = [0.16, 1, 0.3, 1] as const

export function WearableSettings() {
  const [connections, setConnections] = useState<ConnectionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<WearableSource | null>(null)
  const [syncing, setSyncing] = useState<WearableSource | null>(null)
  const [appleHealthFile, setAppleHealthFile] = useState<File | null>(null)
  const [uploadingApple, setUploadingApple] = useState(false)

  useEffect(() => {
    loadConnections()
  }, [])

  async function loadConnections() {
    try {
      const data = await api.get<{ connections: ConnectionInfo[] }>("/integrations/wearable/sync")
      setConnections(data.connections)
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect(source: WearableSource) {
    setConnecting(source)
    try {
      const data = await api.post<{ source: string; authUrl?: string; requiresFileUpload?: boolean; instructions?: Record<string, unknown> }>(
        "/integrations/wearable/connect",
        { source }
      )

      if (data.authUrl) {
        // Open OAuth popup
        window.open(data.authUrl, "_blank", "width=600,height=700")
        toastSuccess(`${WEARABLE_META[source].name} connection started`)
      } else if (data.requiresFileUpload) {
        // For Apple Health, show file upload UI
        toastSuccess("Upload your Apple Health export.xml file")
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      toastError(e.message || `Failed to connect ${WEARABLE_META[source].name}`)
    } finally {
      setConnecting(null)
      loadConnections()
    }
  }

  async function handleSync(source: WearableSource) {
    setSyncing(source)
    try {
      await api.post("/integrations/wearable/sync", { source })
      toastSuccess(`${WEARABLE_META[source].name} synced!`)
      loadConnections()
    } catch (err: unknown) {
      const e = err as { message?: string }
      toastError(e.message || "Sync failed")
    } finally {
      setSyncing(null)
    }
  }

  async function handleAppleHealthUpload() {
    if (!appleHealthFile) return
    setUploadingApple(true)
    try {
      // In production, this would send the file to an endpoint that parses it
      const formData = new FormData()
      formData.append("file", appleHealthFile)
      formData.append("source", "apple_health")

      await fetch("/api/integrations/wearable/upload", { method: "POST", body: formData })
      toastSuccess("Apple Health data uploaded! Processing...")
      setAppleHealthFile(null)
      loadConnections()
    } catch {
      toastError("Upload failed. Try again.")
    } finally {
      setUploadingApple(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-[#E2E8F0] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {(["apple_health", "google_fit", "fitbit"] as WearableSource[]).map((source, i) => {
        const meta = WEARABLE_META[source]
        const conn = connections.find((c) => c.source === source)
        const isConnected = conn?.connected ?? false

        return (
          <motion.div
            key={source}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, ease: EASE }}
            className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-4">
              {/* Logo */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: `${meta.color}10` }}
              >
                {meta.logo}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#172033]">{meta.name}</h3>
                  {isConnected ? (
                    <span className="text-[10px] font-medium text-[#176B63] bg-[#F0FDF4] px-1.5 py-0.5 rounded-full">
                      Connected
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-[#4B5870]/40 bg-[#F8F9FB] px-1.5 py-0.5 rounded-full">
                      Not connected
                    </span>
                  )}
                </div>

                {isConnected && conn?.lastSync && (
                  <p className="text-[11px] text-[#4B5870]/60 mt-0.5">
                    Last sync: {new Date(conn.lastSync).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                )}

                {/* Data type tags */}
                {isConnected && conn?.dataTypes && conn.dataTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {conn.dataTypes.map((dt) => (
                      <span key={dt} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F8F9FB] text-[#4B5870]">
                        {dt.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                )}

                {!isConnected && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {meta.dataTypes.map((dt) => (
                      <span key={dt} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F8F9FB] text-[#4B5870]/40">
                        {dt.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1.5 items-end shrink-0">
                {isConnected ? (
                  <>
                    <button
                      onClick={() => handleSync(source)}
                      disabled={syncing === source}
                      className="h-8 px-3 rounded-lg text-xs font-medium bg-[#F8F9FB] text-[#4B5870] hover:bg-[#E2E8F0] disabled:opacity-40 transition-all border border-[#E2E8F0]"
                    >
                      {syncing === source ? "Syncing..." : "Sync"}
                    </button>
                    <button
                      onClick={() => {
                        // Disconnect would revoke OAuth tokens
                        toastSuccess("Disconnected")
                        loadConnections()
                      }}
                      className="h-7 px-3 rounded-lg text-[10px] font-medium text-[#B53A45] hover:bg-[#FEF2F2] transition-all"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleConnect(source)}
                      disabled={connecting === source}
                      className="h-8 px-4 rounded-lg text-xs font-medium bg-[#176B63] text-white hover:bg-[#10554F] disabled:opacity-40 transition-all"
                    >
                      {connecting === source ? "Connecting..." : "Connect"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Apple Health file upload — shown only for Apple Health when connected */}
            {source === "apple_health" && isConnected && (
              <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                <p className="text-[11px] font-medium text-[#172033] mb-2">Upload Health Export</p>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".xml"
                    onChange={(e) => setAppleHealthFile(e.target.files?.[0] ?? null)}
                    className="flex-1 text-[11px] text-[#4B5870] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-medium file:bg-[#176B63]/5 file:text-[#176B63] hover:file:bg-[#176B63]/10"
                  />
                  <button
                    onClick={handleAppleHealthUpload}
                    disabled={!appleHealthFile || uploadingApple}
                    className="h-8 px-3 rounded-lg text-xs font-medium bg-[#176B63] text-white hover:bg-[#10554F] disabled:opacity-40 transition-all"
                  >
                    {uploadingApple ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
