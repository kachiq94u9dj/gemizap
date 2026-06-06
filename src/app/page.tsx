'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import PFCRings from '@/components/PFCRings'
import MealScanner from '@/components/MealScanner'
import MealList from '@/components/MealList'
import WeightChart from '@/components/WeightChart'
import WeeklyChart from '@/components/WeeklyChart'
import WorkoutLogger from '@/components/WorkoutLogger'
import { calculateTargetPFC } from '@/lib/pfc-calculator'

interface Profile {
  height_cm: number
  current_weight_kg: number
  activity_level: string
  goal: string
  target_calories: number | null
  target_protein_g: number | null
  target_fat_g: number | null
  target_carbs_g: number | null
}

interface UserMeta {
  id: string
  email?: string
  user_metadata?: { full_name?: string; avatar_url?: string }
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<UserMeta | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [todayPFC, setTodayPFC] = useState({ calories: 0, protein: 0, fat: 0, carbs: 0 })
  const [mealRefreshKey, setMealRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchTodayPFC = useCallback(async (userId: string) => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('meals')
      .select('calories, protein_g, fat_g, carbs_g')
      .eq('user_id', userId)
      .eq('meal_date', today)

    if (data) {
      setTodayPFC({
        calories: data.reduce((s, m) => s + (m.calories || 0), 0),
        protein: data.reduce((s, m) => s + (m.protein_g || 0), 0),
        fat: data.reduce((s, m) => s + (m.fat_g || 0), 0),
        carbs: data.reduce((s, m) => s + (m.carbs_g || 0), 0),
      })
    }
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient()
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) {
      if (!data.target_calories) {
        const calculated = calculateTargetPFC(
          data.height_cm,
          data.current_weight_kg,
          data.activity_level as 'moderate',
          data.goal as 'cut'
        )
        await supabase.from('profiles').update({
          target_calories: calculated.calories,
          target_protein_g: calculated.protein_g,
          target_fat_g: calculated.fat_g,
          target_carbs_g: calculated.carbs_g,
        }).eq('id', userId)
        setProfile({ ...data, ...{ target_calories: calculated.calories, target_protein_g: calculated.protein_g, target_fat_g: calculated.fat_g, target_carbs_g: calculated.carbs_g } })
      } else {
        setProfile(data)
      }
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user as UserMeta)
      fetchProfile(user.id)
      fetchTodayPFC(user.id)
      setLoading(false)
    })
  }, [router, fetchProfile, fetchTodayPFC])

  const handleMealAdded = () => {
    setMealRefreshKey((k) => k + 1)
    if (user) fetchTodayPFC(user.id)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-cyan-400 text-2xl animate-pulse">⚡ GemiZap</div>
      </div>
    )
  }

  const target = {
    calories: profile?.target_calories || 1800,
    protein: profile?.target_protein_g || 110,
    fat: profile?.target_fat_g || 50,
    carbs: profile?.target_carbs_g || 180,
  }

  const today = new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* ヘッダー */}
      <div className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800/50">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1
              className="text-xl font-black"
              style={{
                background: 'linear-gradient(135deg, #00e5ff, #d400ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ⚡ GemiZap
            </h1>
            <p className="text-xs text-gray-500">{today}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-gray-400">{user?.user_metadata?.full_name || user?.email}</p>
              <p className="text-xs text-cyan-500">🎯 腹筋を割る</p>
            </div>
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="avatar"
                className="w-8 h-8 rounded-full border border-cyan-500/30 cursor-pointer"
                onClick={handleSignOut}
              />
            ) : (
              <button
                onClick={handleSignOut}
                className="w-8 h-8 rounded-full bg-gray-800 border border-cyan-500/30 flex items-center justify-center text-xs text-gray-400"
              >
                出
              </button>
            )}
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        <PFCRings current={todayPFC} target={target} />
        <MealList refreshKey={mealRefreshKey} />
        <WeightChart />
        <WeeklyChart targetCalories={target.calories} />
        <WorkoutLogger />
      </div>

      <MealScanner onMealAdded={handleMealAdded} />
    </div>
  )
}
