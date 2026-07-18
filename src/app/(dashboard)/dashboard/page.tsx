"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

type DashboardStats = {
  current: Record<string, number>
  trends: Record<string, { change: number; period: string }>
}

export default function DashboardPage() {
  const { data, isPending } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/dashboard/stats"),
  })

  if (isPending) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Weight" value={data?.current?.weightKg} unit="kg" trend={data?.trends?.weightKg?.change} />
        <StatCard label="Pain" value={data?.current?.avgPainScore} unit="/10" trend={data?.trends?.avgPainScore?.change} />
        <StatCard label="Sleep" value={data?.current?.avgSleepHours} unit="h" />
        <StatCard label="Health Score" value={data?.current?.healthScore} unit="/100" />
      </div>

      <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-dashed border-gray-300">
        <p className="text-lg font-medium mb-2">📈 Progress charts coming soon</p>
        <p className="text-sm">Complete your assessment to start tracking</p>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  unit,
  trend,
}: {
  label: string
  value?: number | null
  unit: string
  trend?: number | null
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">
        {value ?? "—"}
        <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
      </p>
      {trend !== undefined && trend !== null && (
        <p className={`text-xs mt-1 ${trend > 0 ? "text-green-600" : trend < 0 ? "text-red-500" : "text-gray-400"}`}>
          {trend > 0 ? "▲" : trend < 0 ? "▼" : "—"} {Math.abs(trend).toFixed(1)}
        </p>
      )}
    </div>
  )
}
