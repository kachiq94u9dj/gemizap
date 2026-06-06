'use client'

interface RingProps {
  label: string
  current: number
  target: number
  unit: string
  color: string
  size?: number
}

function Ring({ label, current, target, unit, color, size = 80 }: RingProps) {
  const pct = Math.min((current / target) * 100, 100)
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#1a1a2e"
            strokeWidth={10}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease', filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>{Math.round(pct)}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xs font-semibold text-white">
          {Math.round(current)}<span className="text-gray-500">/{Math.round(target)}{unit}</span>
        </p>
      </div>
    </div>
  )
}

interface PFCRingsProps {
  current: { calories: number; protein: number; fat: number; carbs: number }
  target: { calories: number; protein: number; fat: number; carbs: number }
}

export default function PFCRings({ current, target }: PFCRingsProps) {
  return (
    <div className="bg-gray-900/80 border border-cyan-500/20 rounded-2xl p-4 backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-cyan-400">今日のPFC</h2>
        <span className="text-xs text-gray-500">{Math.round(current.calories)} / {Math.round(target.calories)} kcal</span>
      </div>
      <div className="flex justify-around">
        <Ring label="タンパク質(P)" current={current.protein} target={target.protein} unit="g" color="#00e5ff" />
        <Ring label="脂質(F)" current={current.fat} target={target.fat} unit="g" color="#d400ff" />
        <Ring label="炭水化物(C)" current={current.carbs} target={target.carbs} unit="g" color="#ffc107" />
      </div>
    </div>
  )
}
