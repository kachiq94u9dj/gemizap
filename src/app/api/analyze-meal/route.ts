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

    const prompt = `この食事の写真を分析して、以下の情報をJSON形式で返してください。
推定値で構いません。日本語で食事名を答えてください。

{
  "name": "料理名",
  "calories": カロリー数値(kcal),
  "protein_g": タンパク質(g),
  "fat_g": 脂質(g),
  "carbs_g": 炭水化物(g),
  "description": "簡単な説明（1文）"
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

    const data = JSON.parse(jsonMatch[0])
    return NextResponse.json(data)
  } catch (error) {
    console.error('Meal analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze meal' }, { status: 500 })
  }
}
