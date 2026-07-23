"use client"

import { useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { motion } from "framer-motion"

type ActivityDay = {
  date: string
  completed: number
  planned: number
}

type ActivityChartProps = {
  data: ActivityDay[] | null | undefined
  loading?: boolean
}

const EASE = [0.16, 1, 0.3, 1] as const

export function ActivityChart({ data, loading }: ActivityChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map((d) => {
      const date = new Date(d.date)
      return {
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        date: d.date,
        Completed: d.completed,
        Missed: Math.max(0, d.planned - d.completed),
      }
    })
  }, [data])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-[#E2E8F0] rounded" />
          <div className="h-48 bg-[#E2E8F0] rounded" />
        </div>
      </div>
    )
  }

  if (!data || data.length === 0 || data.every((d) => d.planned === 0)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
      >
        <h3 className="text-sm font-semibold text-[#172033] mb-1">Weekly Activity</h3>
        <p className="text-xs text-[#4B5870] mb-4">Track your workout completion over the last 7 days</p>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#176B63]/5 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-[#176B63]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </div>
          <p className="text-sm text-[#4B5870]">No activity data yet</p>
          <p className="text-xs text-[#4B5870]/60 mt-1">Complete workouts to see your weekly activity chart</p>
        </div>
      </motion.div>
    )
  }

  const hasAnyCompletion = data.some((d) => d.completed > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#172033]">Weekly Activity</h3>
          <p className="text-xs text-[#4B5870]">Workout completion rate</p>
        </div>
        {hasAnyCompletion && (
          <span className="text-xs font-medium text-[#176B63] bg-[#176B63]/5 px-2.5 py-1 rounded-full">
            {Math.round((data.reduce((s, d) => s + d.completed, 0) / Math.max(data.reduce((s, d) => s + d.planned, 0), 1)) * 100)}% adherence
          </span>
        )}
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={4} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "#4B5870" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#4B5870" }}
              axisLine={false}
              tickLine={false}
              unit="%"
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                fontSize: 12,
              }}
              formatter={(value: unknown) => [`${value}%`, "Completed"]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "#4B5870" }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="Completed"
              fill="#176B63"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              animationDuration={800}
            />
            <Bar
              dataKey="Missed"
              fill="#B53A45"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              opacity={0.25}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
