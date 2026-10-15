import { useId } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export function TrendChart({
  points,
  fields,
  label,
  height = 240
}: {
  points: Record<string, string | number | null>[]
  fields: { key: string; label: string; color: string }[]
  label: string
  height?: number
}) {
  const id = useId().replaceAll(":", "")
  return (
    <div className="an-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={points}
          accessibilityLayer
          aria-label={label}
          margin={{ top: 12, right: 12, bottom: 0, left: -20 }}
        >
          <defs>
            {fields.map((field) => (
              <linearGradient key={field.key} id={`${id}-${field.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={field.color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={field.color} stopOpacity={0.01} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            minTickGap={50}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            tickMargin={12}
            height={35}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--foreground)",
              boxShadow: "0 6px 24px #00000010"
            }}
            labelStyle={{ color: "var(--muted-foreground)", marginBottom: 6 }}
          />
          {fields.map((field) => (
            <Area
              key={field.key}
              dataKey={field.key}
              name={field.label}
              type="monotone"
              stroke={field.color}
              strokeWidth={2}
              fill={`url(#${id}-${field.key})`}
              isAnimationActive={false}
              activeDot={{ r: 4, strokeWidth: 3, stroke: "var(--card)" }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
