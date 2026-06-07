import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const bytes = await image.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = image.type

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `この写真に写っている食べ物または飲み物を分析して、栄養情報をJSON形式で返してください。

重要なルール：
- 食事だけでなく、コーヒー・お茶・ジュース・プロテインドリンクなど飲み物も分析する
- ブラックコーヒーは1杯あたり約5kcal、タンパク質0.3g、脂質0g、炭水化物1g程度
- ミルク入りコーヒー（ラテ等）は約60-120kcal
- 必ず全ての数値を0以上の数値で返すこと（nullや未定義は絶対に使わない）
- カップや容器が空でも、直前まで何が入っていたかを推定して数値を出す
- 推定値で構わない。絶対に数値を返すこと

{
  "name": "食品・飲料名（日本語）",
  "calories": カロリー数値(kcal、必ず数値),
  "protein_g": タンパク質(g、必ず数値),
  "fat_g": 脂質(g、必ず数値),
  "carbs_g": 炭水化物(g、必ず数値),
  "description": "簡単な説明（何が写っているか、推定の根拠）"
}

JSONのみを返し、他のテキストは含めないでください。`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64,
          mimeType,
        },
      },
    ])

    const text = result.response.text().trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid response from Gemini')
    }

    const parsed = JSON.parse(jsonMatch[0])
    // nullや非数値をフォールバック
    const data = {
      name: parsed.name || '不明な食品',
      calories: Number(parsed.calories) || 0,
      protein_g: Number(parsed.protein_g) || 0,
      fat_g: Number(parsed.fat_g) || 0,
      carbs_g: Number(parsed.carbs_g) || 0,
      description: parsed.description || '',
    }
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Meal analysis error:', message)
    return NextResponse.json({ error: 'Failed to analyze meal', detail: message }, { status: 500 })
  }
}
