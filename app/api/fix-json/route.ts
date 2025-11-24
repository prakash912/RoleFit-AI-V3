import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export const runtime = "nodejs"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 })
    }

    const { jsonString, passkey } = await req.json()
    if (!jsonString || typeof jsonString !== 'string') {
      return NextResponse.json({ error: "Invalid request: jsonString required" }, { status: 400 })
    }

    // Validate passkey
    const expectedKey = process.env.JD_EDIT_PASSKEY
    if (!expectedKey) {
      return NextResponse.json({ error: "Server missing JD_EDIT_PASSKEY" }, { status: 500 })
    }
    if (!passkey || passkey !== expectedKey) {
      return NextResponse.json({ error: "Invalid passkey" }, { status: 403 })
    }

    const system = `You are a JSON expert. Fix any malformed JSON while preserving all data. Return ONLY valid JSON, no explanation or commentary.`

    const user = `Fix this JSON and return ONLY the corrected JSON (no markdown, no explanation):

${jsonString}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 4000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    })

    let fixedJson = completion.choices?.[0]?.message?.content || ""
    
    // Remove markdown code blocks if present
    fixedJson = fixedJson.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    
    // Try to extract JSON if wrapped in text
    if (!fixedJson.match(/^\{/)) {
      const jsonMatch = fixedJson.match(/\{[\s\S]*\}/)
      if (jsonMatch) fixedJson = jsonMatch[0]
    }

    // Validate the fixed JSON
    try {
      const parsed = JSON.parse(fixedJson)
      // Reformat nicely
      const formatted = JSON.stringify(parsed, null, 2)
      return NextResponse.json({ fixedJson: formatted, success: true })
    } catch (parseError) {
      return NextResponse.json({ 
        error: "Failed to fix JSON", 
        details: parseError instanceof Error ? parseError.message : String(parseError),
        rawResponse: fixedJson.substring(0, 500)
      }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ 
      error: "API error", 
      details: error?.message || String(error) 
    }, { status: 500 })
  }
}

