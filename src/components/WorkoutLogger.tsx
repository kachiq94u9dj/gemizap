'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Template {
  id: string
  name: string
  template_exercises: TemplateExercise[]
}

interface TemplateExercise {
  id: string
  exercise_name: string
  default_sets: number
  default_reps: number
  default_weight_kg: number | null
  sort_order: number
}

interface SetEntry {
  exercise_name: string
  set_number: number
  reps: number
  weight_kg: number | null
}

interface WorkoutSet {
  id: string
  exercise_name: string
  set_number: number
  reps: number
  weight_kg: number | null
}

interface TodayWorkout {
  id: string
  name: string
  created_at: string
  workout_sets: WorkoutSet[]
}

export default function WorkoutLogger() {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [view, setView] = useState<'menu' | 'template' | 'new' | 'log'>('menu')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [workoutName, setWorkoutName] = useState('')
  const [sets, setSets] = useState<SetEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [todayWorkouts, setTodayWorkouts] = useState<TodayWorkout[]>([])

  // テンプレート作成用
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newExercises, setNewExercises] = useState([{ name: '', sets: 3, reps: 10, weight: '' }])

  useEffect(() => { fetchTodayWorkouts() }, [])
  useEffect(() => { if (open) fetchTemplates() }, [open])

  const fetchTodayWorkouts = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('workouts')
      .select('*, workout_sets(*)')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
      .order('created_at', { ascending: false })

    setTodayWorkouts(data || [])
  }

  const fetchTemplates = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('workout_templates')
      .select('*, template_exercises(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setTemplates(data || [])
  }

  const loadTemplate = (template: Template) => {
    setSelectedTemplate(template)
    setWorkoutName(template.name)
    const entries = template.template_exercises
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((ex) =>
        Array.from({ length: ex.default_sets }, (_, i) => ({
          exercise_name: ex.exercise_name,
          set_number: i + 1,
          reps: ex.default_reps,
          weight_kg: ex.default_weight_kg,
        }))
      )
    setSets(entries)
    setView('log')
  }

  const saveWorkout = async () => {
    if (!workoutName || sets.length === 0) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: workout } = await supabase
      .from('workouts')
      .insert({ user_id: user.id, name: workoutName })
      .select()
      .single()

    if (workout) {
      await supabase.from('workout_sets').insert(
        sets.map((s) => ({ workout_id: workout.id, ...s }))
      )
    }

    setSaving(false)
    setOpen(false)
    setView('menu')
    setSets([])
    setWorkoutName('')
    setSelectedTemplate(null)
    fetchTodayWorkouts()
  }

  const deleteWorkout = async (workoutId: string) => {
    const supabase = createClient()
    await supabase.from('workout_sets').delete().eq('workout_id', workoutId)
    await supabase.from('workouts').delete().eq('id', workoutId)
    fetchTodayWorkouts()
  }

  const saveTemplate = async () => {
    if (!newTemplateName) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: tmpl } = await supabase
      .from('workout_templates')
      .insert({ user_id: user.id, name: newTemplateName })
      .select()
      .single()

    if (tmpl) {
      await supabase.from('template_exercises').insert(
        newExercises
          .filter((e) => e.name)
          .map((e, i) => ({
            template_id: tmpl.id,
            exercise_name: e.name,
            default_sets: e.sets,
            default_reps: e.reps,
            default_weight_kg: e.weight ? parseFloat(e.weight) : null,
            sort_order: i,
          }))
      )
    }

    setNewTemplateName('')
    setNewExercises([{ name: '', sets: 3, reps: 10, weight: '' }])
    setView('menu')
    fetchTemplates()
  }

  // 種目ごとにセットをグループ化
  const groupByExercise = (sets: WorkoutSet[]) => {
    const map = new Map<string, WorkoutSet[]>()
    sets.forEach((s) => {
      if (!map.has(s.exercise_name)) map.set(s.exercise_name, [])
      map.get(s.exercise_name)!.push(s)
    })
    return map
  }

  return (
    <>
      {/* ダッシュボードカード */}
      <div className="bg-gray-900/80 border border-green-500/20 rounded-2xl p-4 backdrop-blur">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-green-400">💪 今日の筋トレ</h2>
          <button
            onClick={() => setOpen(true)}
            className="text-xs bg-green-600/20 border border-green-500/30 text-green-400 px-3 py-1 rounded-lg hover:bg-green-600/30 transition-all"
          >
            ＋ 記録する
          </button>
        </div>

        {todayWorkouts.length === 0 ? (
          <p className="text-gray-500 text-xs text-center py-4">まだ記録なし。今日も頑張ろや！💪</p>
        ) : (
          <div className="space-y-3">
            {todayWorkouts.map((workout) => {
              const grouped = groupByExercise(workout.workout_sets)
              return (
                <div key={workout.id} className="bg-gray-800/60 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">{workout.name}</span>
                    <button
                      onClick={() => deleteWorkout(workout.id)}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                  <div className="space-y-2">
                    {Array.from(grouped.entries()).map(([exercise, exSets]) => (
                      <div key={exercise}>
                        <p className="text-xs text-green-400 font-semibold mb-1">{exercise}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {exSets
                            .sort((a, b) => a.set_number - b.set_number)
                            .map((s) => (
                              <div
                                key={s.id}
                                className="bg-gray-700/60 rounded-lg px-2 py-1 text-center"
                              >
                                <p className="text-xs text-gray-400">Set{s.set_number}</p>
                                <p className="text-xs font-bold text-white">
                                  {s.reps}rep
                                  {s.weight_kg ? <span className="text-gray-400 font-normal"> × {s.weight_kg}kg</span> : ''}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 記録モーダル */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-green-500/30 rounded-t-3xl p-6 pb-10 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => view !== 'menu' ? setView('menu') : setOpen(false)}
                className="text-gray-400 text-sm"
              >
                {view !== 'menu' ? '← 戻る' : '✕ 閉じる'}
              </button>
              <h3 className="text-lg font-bold text-green-400">筋トレ記録</h3>
              <div className="w-12" />
            </div>

            {view === 'menu' && (
              <div className="space-y-3">
                <button
                  onClick={() => setView('template')}
                  className="w-full py-4 bg-green-600/20 border border-green-500/30 rounded-2xl text-green-400 font-semibold text-sm hover:bg-green-600/30 transition-all"
                >
                  📋 テンプレートから始める
                </button>
                <button
                  onClick={() => { setWorkoutName(''); setSets([{ exercise_name: '', set_number: 1, reps: 10, weight_kg: null }]); setView('log') }}
                  className="w-full py-4 bg-gray-800 border border-gray-700 rounded-2xl text-gray-300 font-semibold text-sm hover:bg-gray-700 transition-all"
                >
                  ✏️ 自由に記録する
                </button>
                <button
                  onClick={() => setView('new')}
                  className="w-full py-4 bg-gray-800 border border-gray-700 rounded-2xl text-gray-300 font-semibold text-sm hover:bg-gray-700 transition-all"
                >
                  ➕ 新しいテンプレートを作る
                </button>
              </div>
            )}

            {view === 'template' && (
              <div className="space-y-3">
                {templates.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">テンプレートがまだないで。先に作ってみてな！</p>
                ) : (
                  templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => loadTemplate(t)}
                      className="w-full text-left bg-gray-800 border border-gray-700 rounded-2xl p-4 hover:border-green-500/40 transition-all"
                    >
                      <p className="text-white font-semibold mb-1">{t.name}</p>
                      <p className="text-gray-400 text-xs">
                        {t.template_exercises.map(e => e.exercise_name).join(' · ')}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}

            {view === 'new' && (
              <div className="space-y-4">
                <input
                  placeholder="テンプレート名（例: 胸の日）"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
                {newExercises.map((ex, i) => (
                  <div key={i} className="bg-gray-800/60 rounded-xl p-3 space-y-2">
                    <input
                      placeholder="種目名（例: ベンチプレス）"
                      value={ex.name}
                      onChange={(e) => {
                        const updated = [...newExercises]
                        updated[i].name = e.target.value
                        setNewExercises(updated)
                      }}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {['sets', 'reps', 'weight'].map((field) => (
                        <div key={field}>
                          <label className="text-xs text-gray-500">{field === 'sets' ? 'セット' : field === 'reps' ? 'レップ' : '重量(kg)'}</label>
                          <input
                            type="number"
                            value={(ex as Record<string, string | number>)[field]}
                            onChange={(e) => {
                              const updated = [...newExercises]
                              ;(updated[i] as Record<string, string | number>)[field] = field === 'weight' ? e.target.value : parseInt(e.target.value) || 0
                              setNewExercises(updated)
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none mt-0.5"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setNewExercises([...newExercises, { name: '', sets: 3, reps: 10, weight: '' }])}
                  className="w-full py-2 border border-dashed border-gray-600 rounded-xl text-gray-500 text-sm hover:border-green-500 hover:text-green-500 transition-all"
                >
                  + 種目を追加
                </button>
                <button
                  onClick={saveTemplate}
                  className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition-all"
                >
                  テンプレートを保存
                </button>
              </div>
            )}

            {view === 'log' && (
              <div className="space-y-4">
                <input
                  placeholder="ワークアウト名"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
                {sets.map((s, i) => (
                  <div key={i} className="bg-gray-800/60 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <input
                        placeholder="種目名"
                        value={s.exercise_name}
                        onChange={(e) => {
                          const updated = [...sets]
                          updated[i].exercise_name = e.target.value
                          setSets(updated)
                        }}
                        className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
                      />
                      <button
                        onClick={() => setSets(sets.filter((_, idx) => idx !== i))}
                        className="text-gray-500 hover:text-red-400 text-xs ml-2"
                      >
                        削除
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">セット</label>
                        <input
                          type="number"
                          value={s.set_number}
                          onChange={(e) => {
                            const updated = [...sets]; updated[i].set_number = parseInt(e.target.value) || 1; setSets(updated)
                          }}
                          className="w-full bg-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">レップ</label>
                        <input
                          type="number"
                          value={s.reps}
                          onChange={(e) => {
                            const updated = [...sets]; updated[i].reps = parseInt(e.target.value) || 0; setSets(updated)
                          }}
                          className="w-full bg-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">重量(kg)</label>
                        <input
                          type="number"
                          value={s.weight_kg ?? ''}
                          onChange={(e) => {
                            const updated = [...sets]; updated[i].weight_kg = e.target.value ? parseFloat(e.target.value) : null; setSets(updated)
                          }}
                          className="w-full bg-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none mt-0.5"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setSets([...sets, { exercise_name: '', set_number: sets.length + 1, reps: 10, weight_kg: null }])}
                  className="w-full py-2 border border-dashed border-gray-600 rounded-xl text-gray-500 text-sm hover:border-green-500 hover:text-green-500 transition-all"
                >
                  + セットを追加
                </button>
                <button
                  onClick={saveWorkout}
                  disabled={saving}
                  className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition-all disabled:opacity-50"
                >
                  {saving ? '保存中...' : '記録を保存する'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
