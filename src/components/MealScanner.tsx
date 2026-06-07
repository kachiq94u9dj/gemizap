'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface MealScannerProps {
  onMealAdded: () => void
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

interface AnalysisResult {
  name: string
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  description?: string
}

export default function MealScanner({ onMealAdded }: MealScannerProps) {
  const [open, setOpen] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const albumRef = useRef<HTMLInputElement>(null)

  const handleImage = async (file: File) => {
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
    setResult(null)
    setAnalyzing(true)

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch('/api/analyze-meal', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || data.error) {
        alert(`AI分析に失敗したで😢\n${data.detail || ''}\n数値を手動で入力してな。`)
        // エラーでも手動入力できるようにデフォルト値をセット
        setResult({ name: '', calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, description: '' })
      } else {
        setResult(data)
      }
    } catch {
      alert('AI分析に失敗したで😢\n数値を手動で入力してな。')
      setResult({ name: '', calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, description: '' })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!result) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let photoUrl = null
    if (imageFile) {
      const fileName = `${user.id}/${Date.now()}.jpg`
      const { data } = await supabase.storage
        .from('meal-photos')
        .upload(fileName, imageFile, { upsert: true })
      if (data) {
        const { data: urlData } = supabase.storage.from('meal-photos').getPublicUrl(fileName)
        photoUrl = urlData.publicUrl
      }
    }

    await supabase.from('meals').insert({
      user_id: user.id,
      meal_type: mealType,
      name: result.name,
      calories: result.calories,
      protein_g: result.protein_g,
      fat_g: result.fat_g,
      carbs_g: result.carbs_g,
      photo_url: photoUrl,
    })

    setSaving(false)
    setOpen(false)
    setResult(null)
    setPreview(null)
    setImageFile(null)
    onMealAdded()
  }

  const mealLabels: Record<MealType, string> = {
    breakfast: '🌅 朝食',
    lunch: '☀️ 昼食',
    dinner: '🌙 夕食',
    snack: '🍎 間食',
  }

  return (
    <>
      {/* カメラFABボタン */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/40 z-50 text-2xl hover:bg-cyan-400 transition-all active:scale-95"
        style={{ boxShadow: '0 0 20px rgba(0,229,255,0.5)' }}
      >
        📸
      </button>

      {/* モーダル */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-cyan-500/30 rounded-t-3xl p-6 pb-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-cyan-400">AI食事スキャン</h3>
              <button onClick={() => {
                setOpen(false)
                setPreview(null)
                setResult(null)
                setImageFile(null)
              }} className="text-gray-400 text-xl">✕</button>
            </div>

            {/* 食事タイプ選択 */}
            <div className="flex gap-2 mb-4">
              {(Object.keys(mealLabels) as MealType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setMealType(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    mealType === t
                      ? 'bg-cyan-500 text-black'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {mealLabels[t]}
                </button>
              ))}
            </div>

            {/* 画像選択エリア */}
            {!preview ? (
              <div className="space-y-2">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-cyan-500/40 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-cyan-500 transition-all"
                >
                  <span className="text-3xl">📷</span>
                  <span className="text-sm">カメラで撮る</span>
                </button>
                <button
                  onClick={() => albumRef.current?.click()}
                  className="w-full h-20 border-2 border-dashed border-purple-500/40 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-purple-500 transition-all"
                >
                  <span className="text-2xl">🖼️</span>
                  <span className="text-sm">アルバムから選ぶ</span>
                </button>
              </div>
            ) : (
              <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-4">
                <img src={preview} alt="meal" className="w-full h-full object-cover" />
                {analyzing ? (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-cyan-400 text-center">
                      <div className="text-2xl mb-2 animate-spin">⚡</div>
                      <p className="text-sm">Gemini AIで分析中...</p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => {
                        setPreview(null); setResult(null); setImageFile(null)
                        setTimeout(() => inputRef.current?.click(), 100)
                      }}
                      className="bg-black/60 text-white text-xs px-2 py-1 rounded-lg"
                    >
                      📷 撮り直す
                    </button>
                    <button
                      onClick={() => {
                        setPreview(null); setResult(null); setImageFile(null)
                        setTimeout(() => albumRef.current?.click(), 100)
                      }}
                      className="bg-black/60 text-white text-xs px-2 py-1 rounded-lg"
                    >
                      🖼️ 選び直す
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* カメラ専用 */}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) { handleImage(e.target.files[0]); e.target.value = '' } }}
            />
            {/* アルバム専用（captureなし） */}
            <input
              ref={albumRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) { handleImage(e.target.files[0]); e.target.value = '' } }}
            />

            {/* 分析結果 */}
            {result && (
              <div className="mt-4 bg-gray-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">Gemini Vision</span>
                  <input
                    className="flex-1 text-sm font-semibold text-white bg-transparent border-b border-gray-600 focus:border-cyan-400 outline-none"
                    value={result.name}
                    onChange={(e) => setResult({ ...result, name: e.target.value })}
                  />
                </div>
                <p className="text-xs text-gray-500 mb-2">✏️ 数値をタップして修正できるで</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'kcal', key: 'calories' as const, color: 'text-yellow-400' },
                    { label: 'P(g)', key: 'protein_g' as const, color: 'text-cyan-400' },
                    { label: 'F(g)', key: 'fat_g' as const, color: 'text-purple-400' },
                    { label: 'C(g)', key: 'carbs_g' as const, color: 'text-orange-400' },
                  ].map(({ label, key, color }) => (
                    <div key={label} className="bg-gray-700/50 rounded-xl p-2">
                      <input
                        type="number"
                        className={`w-full text-lg font-bold ${color} bg-transparent text-center outline-none focus:bg-gray-600/50 rounded`}
                        value={Math.round(result[key])}
                        onChange={(e) => setResult({ ...result, [key]: Number(e.target.value) })}
                      />
                      <p className="text-xs text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>
                {result.description && (
                  <p className="text-xs text-gray-400 mt-2">{result.description}</p>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full mt-3 py-3 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 transition-all disabled:opacity-50"
                >
                  {saving ? '保存中...' : '記録する'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
