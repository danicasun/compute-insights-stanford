import type { CSSProperties } from "react"

/** Jobs = blue, energy = green, derived = amber, anomaly = violet */
export const COLOR_JOBS = "#2563eb"
export const COLOR_ENERGY = "#16a34a"
export const COLOR_DERIVED = "#d97706"
export const COLOR_ANOMALY = "#a855f7"
export const COLOR_PEAK = "#0ea5e9"

export const chartGridProps = {
  stroke: "#e5e7eb",
  strokeOpacity: 0.85,
  vertical: false,
} as const

export const chartMargin = { top: 8, right: 12, left: 8, bottom: 8 }

/** Uniform chart tooltips: border only, no shadow */
export const chartTooltipContentStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "6px",
  fontSize: "12px",
  boxShadow: "none",
}
