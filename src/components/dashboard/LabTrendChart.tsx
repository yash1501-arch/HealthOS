"use client"

import { useState, useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Scatter,
  ComposedChart,
} from "recharts"
import { motion } from "framer-motion"

type LabTrendValue = {
  date: string
  value: number | null
  isAbnormal: boolean | null
}

type LabTrend = {
  testName: string
  unit: string
  values: LabTrendValue[]
  referenceRange: string | null
}

type LabTrendChartProps = {
  labTrends: LabTrend[] | null | undefined
  loading?: boolean
}

const EASE = [0.16, 1, 0.3, 1] as const

function parseReferenceRange(range: string | null): { min: number; max: number } | null {
  if (!range) return null
  const match = range.match(/(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/)
  if (match) return { min: parseFloat(match[1]), max: parseFloat(match[2]) }
  const ltMatch = range.match(/<(\d+\.?\d*)/)
  if (ltMatch) return { min: 0, max: parseFloat(ltMatch[1]) }
  const gtMatch = range.match(/>(\d+\.?\d*)/)
  if (gtMatch) return { min: parseFloat(gtMatch[1]), max: parseFloat(gtMatch[1]) * 2 }
  return null
}

export function LabTrendChart({ labTrends, loading }: LabTrendChartProps) {
  const [selectedLab, setSelectedLab] = useState<string>("")

  const sorted = useMemo(() => {
    if (!labTrends) return []
    return labTrends
      .filter((t) => t.values.length > 0)
      .sort((a, b) => a.testName.localeCompare(b.testName))
  }, [labTrends])

  const activeLab = useMemo(() => {
    if (!selectedLab) return sorted.length > 0 ? sorted[0] : null
    return sorted.find((t) => t.testName === selectedLab) ?? sorted[0] ?? null
  }, [selectedLab, sorted])

  const chartData = useMemo(() => {
    if (!activeLab) return []
    return activeLab.values
      .filter((v) => v.value !== null)
      .map((v) => ({
        date: v.date
          ? new Date(v.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "",
        value: v.value,
        isAbnormal: v.isAbnormal,
        // For scatter: only show abnormal points, dataKey is same as line
        abnormal: v.isAbnormal ? v.value : null,
        normal: !v.isAbnormal ? v.value : null,
      }))
  }, [activeLab])

  const refRange = activeLab ? parseReferenceRange(activeLab.referenceRange) : null

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 bg-[#E2E8F0] rounded" />
          <div className="h-8 w-40 bg-[#E2E8F0] rounded" />
          <div className="h-48 bg-[#E2E8F0] rounded" />
        </div>
      </div>
    )
  }

  if (!labTrends || labTrends.length === 0 || sorted.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
      >
        <h3 className="text-sm font-semibold text-[#172033] mb-1">Lab Results</h3>
        <p className="text-xs text-[#4B5870] mb-4">Track your lab values over time</p>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#476A91]/5 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-[#476A91]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-sm text-[#4B5870]">No lab data yet</p>
          <p className="text-xs text-[#4B5870]/60 mt-1">Upload medical reports to see your lab trends</p>
        </div>
      </motion.div>
    )
  }

  if (!activeLab) return null

  const hasAbnormal = chartData.some((d) => d.isAbnormal)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
      className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[#172033]">Lab Results</h3>
          <p className="text-xs text-[#4B5870]">Select a test to view trends</p>
        </div>
        {hasAbnormal && (
          <span className="text-[10px] font-medium text-[#B53A45] bg-[#FEF2F2] px-2 py-0.5 rounded-full">
            ⚠ Abnormal values detected
          </span>
        )}
      </div>

      {/* Lab selector */}
      <div className="relative mb-4">
        <select
          value={activeLab.testName}
          onChange={(e) => setSelectedLab(e.target.value)}
          className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm bg-white
            focus:outline-none focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10
            appearance-none cursor-pointer
            bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8"
          >
          {sorted.map((lab) => (
            <option key={lab.testName} value={lab.testName}>
              {lab.testName}
            </option>
          ))}
        </select>
      </div>

      {/* Chart */}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />

            {refRange && (
              <ReferenceArea
                y1={refRange.min}
                y2={refRange.max}
                fill="#176B63"
                fillOpacity={0.06}
              />
            )}

            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#4B5870" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#4B5870" }}
              axisLine={false}
              tickLine={false}
              unit={activeLab.unit ? ` ${activeLab.unit}` : ""}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                fontSize: 12,
              }}
              formatter={(value: unknown, name: unknown) => {
                const label = name === "abnormal" ? "⚠ Abnormal" : activeLab.testName
                return [`${value}${activeLab.unit ? ` ${activeLab.unit}` : ""}`, label]
              }}
            />

            {/* Normal line */}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#476A91"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#476A91", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6, fill: "#476A91", strokeWidth: 2, stroke: "#fff" }}
              animationDuration={800}
              connectNulls={false}
            />

            {/* Abnormal points highlighted in red */}
            <Scatter
              dataKey="abnormal"
              fill="#B53A45"
              shape={(props: { cx?: number; cy?: number }) => {
                if (props.cx === undefined || props.cy === undefined) return null
                return (
                  <g>
                    <circle cx={props.cx} cy={props.cy} r={8} fill="#B53A45" fillOpacity={0.15} />
                    <circle cx={props.cx} cy={props.cy} r={5} fill="#B53A45" stroke="#fff" strokeWidth={2} />
                  </g>
                )
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <span className="flex items-center gap-1.5 text-[10px] text-[#4B5870]">
          <span className="w-3 h-0.5 bg-[#476A91] rounded-full" />
          Value
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-[#4B5870]">
          <span className="w-2.5 h-2.5 bg-[#176B63]/10 rounded" />
          Normal range
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-[#B53A45]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#B53A45]" />
          Abnormal
        </span>
      </div>

      {/* Reference range note */}
      {activeLab.referenceRange && (
        <p className="text-[10px] text-[#4B5870]/50 mt-2 text-center">
          Reference range: {activeLab.referenceRange}
          {activeLab.unit ? ` ${activeLab.unit}` : ""}
        </p>
      )}
    </motion.div>
  )
}
