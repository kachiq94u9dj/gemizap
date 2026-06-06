'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Meal {
  id: string
  meal_type: string
  name: string
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  photo_url: string | null
  created_at: string
}

const mealTypeIcon: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}
const mealTypeLabel: Record<string, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
}

export default function MealList({ refreshKey }: { refreshKey: number }) {
  const [meals, setMeals] = useState<Meal[]>([])

  useEffect(() => { fetchMeals() }, [refreshKey])

  const fetchMeals = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .eq('meal_date', today)
      .order('created_at', { ascending: false })

    setMeals(data || [])
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('meals').delete().eq('id', id)
    fetchMeals()
  }

  if (meals.length === 0) {
    return (
      <div className="bg-gray-900/80 border border-gray-700/30 rounded-2xl p-4 text-center text-gray-600 text-sm">
        今日の食事記録がまだないで。📸ボタンから追加してな！
      </div>
    )
  }

  return (
    <div className="bg-gray-900/80 border border-gray-700/30 rounded-2xl p-4 backdrop-blur space-y-3">
      <h2 className="text-sm font-semibold text-gray-400">今日の食事</h2>
      {meals.map((meal) => (
        <div key={meal.id} className="flex items-center gap-3 bg-gray-800/60 rounded-xl p-3">
          {meal.photo_url ? (
            <img src={meal.photo_url} alt={meal.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center text-xl flex-shrink-0">
              {mealTypeIcon[meal.meal_type] || '🍽️'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs text-cyan-500">{mealTypeLabel[meal.meal_type]}</span>
              <span className="text-sm font-semibold text-white truncate">{meal.name}</span>
            </div>
            <div className="flex gap-2 text-xs text-gray-400">
              <span className="text-yellow-400">{Math.round(meal.calories)}kcal</span>
              <span>P:{Math.round(meal.protein_g)}g</span>
              <span>F:{Math.round(meal.fat_g)}g</span>
              <span>C:{Math.round(meal.carbs_g)}g</span>
            </div>
          </div>
          <button
            onClick={() => handleDelete(meal.id)}
            className="text-gray-600 hover:text-red-400 text-lg flex-shrink-0 transition-colors"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
