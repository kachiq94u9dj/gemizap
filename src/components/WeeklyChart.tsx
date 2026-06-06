'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface DayData {
  date: string
  calories: number
  label: string
}

export default function WeeklyChart({ targetCalories }: { targetCalories: number }) {
  const [days, setDays] = useState<DayData[]>([])

  useEffect(() => { fetchWeekly() }, [])

  const fetchWeekly = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const result: DayData[] = []
    const dayLabels = ['月', '火', '水', '木', '金', '土', '日']

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]

      const { data } = await supabase
        .from('meals')
        .select('calories')
        .eq('user_id', user.id)
        .eq('meal_date', dateStr)

      const total = (data || []).reduce((sum, m) => sum + (m.calories || 0), 0)
      result.push({
        date: dateStr,
        calories: total,
        label: dayLabels[d.getDay() === 0 ? 6 : d.getDay() - 1],
      })
    }

    setDays(result)
  }

  const maxCal = Math.max(targetCalories * 1.2, ...days.map(d => d.calories), 1)

  return (
    <div className="bg-gray-900/80 border border-yellow-500/20 rounded-2xl p-4 backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-yellow-400">週間カロリートレンド</h2>
        <span className="text-xs text-gray-500">目標: {Math.round(targetCalories)}kcal</span>
      </div>
      <div className="flex items-end gap-1.5 h-20">
        {days.map((d) => {
          const h = Math.max((d.calories / maxCal) * 72, 2)
          const overTarget = d.calories > targetCalories
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${h}px`,
                  background: overTarget
                    ? 'linear-gradient(to top, #ff4444, #ff6666)'
                    : 'linear-gradient(to top, #00e5ff, #0099cc)',
                  boxShadow: overTarget ? '0 0 4px #ff4444' : '0 0 4px #00e5ff',
                  opacity: d.calories === 0 ? 0.2 : 1,
                }}
              />
              <span className="text-xs text-gray-500">{d.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
