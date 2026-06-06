export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export function calculateTargetPFC(
  heightCm: number,
  weightKg: number,
  activityLevel: ActivityLevel = 'moderate',
  goal: 'cut' | 'maintain' | 'bulk' = 'cut'
) {
  // Mifflin-St Jeor式（男性）
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * 25 + 5
  const tdee = bmr * activityMultipliers[activityLevel]

  let targetCalories: number
  if (goal === 'cut') {
    targetCalories = tdee - 400 // 緩やかな減量
  } else if (goal === 'bulk') {
    targetCalories = tdee + 300
  } else {
    targetCalories = tdee
  }

  // PFC配分（腹筋を割るための高タンパク設定）
  const proteinG = weightKg * 2.0 // 体重×2g
  const fatG = (targetCalories * 0.25) / 9
  const carbsG = (targetCalories - proteinG * 4 - fatG * 9) / 4

  return {
    calories: Math.round(targetCalories),
    protein_g: Math.round(proteinG),
    fat_g: Math.round(fatG),
    carbs_g: Math.round(carbsG),
  }
}
