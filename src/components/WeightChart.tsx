'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface WeightEntry {
  recorded_date: string
  weight_kg: number
}

export default function WeightChart() {
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [inputWeight, setInputWeight] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchWeights() }, [])

  const fetchWeights = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('weights')
      .select('recorded_date, weight_kg')
      .eq('user_id', user.id)
      .order('recorded_date', { ascending: true })
      .limit(14)

    setWeights(data || [])
  }

  const handleSaveWeight = async () => {
    const w = parseFloat(inputWeight)
    if (!w || w < 30 || w > 200) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('weights').upsert({
      user_id: user.id,
      recorded_date: new Date().toISOString().split('T')[0],
      weight_kg: w,
    })

    setInputWeight('')
    setSaving(false)
    fetchWeights()
  }

  const latest = weights[weights.length - 1]
  const prev = weights[weights.length - 2]
  const diff = latest && prev ? (latest.weight_kg - prev.weight_kg).toFixed(1) : null

  const minW = weights.length ? Math.min(...weights.map(w => w.weight_kg)) - 1 : 50
  const maxW = weights.length ? Math.max(...weights.map(w => w.weight_kg)) + 1 : 60
  const range = maxW - minW

  const chartW = 280
  const chartH = 80

  const points = weights.map((w, i) => {
    const x = (i / Math.max(weights.length - 1, 1)) * chartW
    const y = chartH - ((w.weight_kg - minW) / range) * chartH
    return `${x},${y}`
  })

  return (
    <div className="bg-gray-900/80 border border-purple-500/20 rounded-2xl p-4 backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-purple-400">体重トレンド</h2>
        <div className="flex items-center gap-1">
          {latest && (
            <span className="text-white font-bold">{latest.weight_kg}kg</span>
          )}
          {diff && (
            <span className={`text-xs ${parseFloat(diff) < 0 ? 'text-green-400' : 'text-red-400'}`}>
              {parseFloat(diff) > 0 ? '+' : ''}{diff}
            </span>
          )}
        </div>
      </div>

      {weights.length >= 2 ? (
        <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} className="mb-3">
          <defs>
            <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d400ff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#d400ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke="#d400ff"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 4px #d400ff)' }}
          />
        </svg>
      ) : (
        <div className="h-20 flex items-center justify-center text-gray-600 text-xs mb-3">
          データが2件以上になるとグラフが表示されるで
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="number"
          placeholder="今日の体重(kg)"
          value={inputWeight}
          onChange={(e) => setInputWeight(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          step="0.1"
        />
        <button
          onClick={handleSaveWeight}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-500 transition-all disabled:opacity-50"
        >
          {saving ? '...' : '記録'}
        </button>
      </div>
    </div>
  )
}
