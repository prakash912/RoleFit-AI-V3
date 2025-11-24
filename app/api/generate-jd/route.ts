import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { defaultTemplates } from "@/lib/jd-templates"

export const runtime = "nodejs"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 })
    }

    const { role, defaultTemplate, passkey } = await req.json()

    // Validate passkey
    const expectedKey = process.env.JD_EDIT_PASSKEY
    if (!expectedKey) {
      return NextResponse.json({ error: "Server missing JD_EDIT_PASSKEY" }, { status: 500 })
    }
    if (!passkey || passkey !== expectedKey) {
      return NextResponse.json({ error: "Invalid passkey" }, { status: 403 })
    }
    const rawRole = (role ?? "").toString()
    const hasRoleInput = !!rawRole.trim()

    const roleName = hasRoleInput ? rawRole.toLowerCase().trim().replace(/\s+/g, '_') : 'software_engineer'
    const displayTitle = roleName.replace(/_/g, " ").replace(/\b\w/g, (m: string) => m.toUpperCase())
    
    // Get default template as reference (use software_engineer as example if role doesn't exist)
    let referenceTemplate: any = {};
    if (defaultTemplate && defaultTemplate.items && defaultTemplate.items.length > 0) {
      referenceTemplate = defaultTemplate;
    } else if (!hasRoleInput) {
      // No role provided: use software_engineer as the default reference
      if (
        defaultTemplates['software_engineer'] &&
        defaultTemplates['software_engineer'].items &&
        defaultTemplates['software_engineer'].items.length > 0
      ) {
        referenceTemplate = defaultTemplates['software_engineer']
      }
    } // else, for dynamic roles keep reference empty so AI generates fresh JD

    const system = `You are an expert job description template creator. Create comprehensive JD templates with weighted categories and detailed checklist items that match the structure and quality of the provided reference template.`
    const referenceBlock =
    referenceTemplate && referenceTemplate.items && referenceTemplate.items.length > 0
      ? `\nUse this reference template structure and style as a guide:\n${JSON.stringify(referenceTemplate, null, 2)}\n`
      : "";
      const user = `Create a comprehensive JD template JSON for the role: "${roleName}" (${displayTitle}).
      ${referenceBlock}
      Create a JD template with this structure:
      {
        "role": "${roleName}",
        "weights": {
          // Create 6-10 weighted categories relevant to ${displayTitle}
          // Weights MUST sum to exactly 1.0 (100%). Do NOT exceed 1.0.
          // Use category names that make sense for this role (e.g., for a data scientist: "data_analysis", "machine_learning", "statistics", etc.)
        },
        "items": [
          {
            "id": "weight_category_key",
            "text": "Clear description of requirement",
            "must": true/false,
            "veryMust": ["critical", "skills"], // Only for must:true items, max 2-3 critical skills
            "tags": ["relevant", "skills", "technologies"]
          }
        ]
      }
      
      CRITICAL REQUIREMENTS:
      - Role must be exactly "${roleName}"
      - First, create the "weights" object with category keys (e.g., "frontend", "backend", "database", etc.)
      - Then, create items where each item's "id" MUST be one of the weight category keys from the "weights" object
      - Each item's "id" must exactly match a key from the "weights" object (e.g., if weights has "frontend": 0.3, then items can have "id": "frontend")
      - DO NOT use generic IDs like "item_1", "item_2", "item_id" - each item ID must be a weight category key
      - Create 8-12 comprehensive items covering ALL key aspects of ${displayTitle}
      - Use realistic weights that sum to EXACTLY 1.0 (100%). Do NOT exceed 1.0. If weights sum to more than 1.0, normalize them proportionally.
      - Mark critical/core requirements as "must": true
      - Add "veryMust" array ONLY for absolutely essential skills (max 2-3 per must:true item)
      - Include 5-8 relevant tags per item
      - Make items specific and measurable
      - Distribute items across all weight categories (each category should have at least 1-2 items)
      - ${referenceBlock ? "Follow the same structure and depth as the reference template." : "You must design an original JD structure for this role."}
      - Return ONLY valid JSON, no markdown, no explanation`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    })

    let jdJson = completion.choices?.[0]?.message?.content || ""
    
    // Remove markdown code blocks if present
    jdJson = jdJson.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    
    // Try to extract JSON if wrapped in text
    if (!jdJson.match(/^\{/)) {
      const jsonMatch = jdJson.match(/\{[\s\S]*\}/)
      if (jsonMatch) jdJson = jsonMatch[0]
    }

    // Validate and format the JD
    try {
      const parsed = JSON.parse(jdJson)
      
      // Ensure structure
      if (!parsed.role) parsed.role = roleName
      if (!parsed.weights || typeof parsed.weights !== 'object') {
        parsed.weights = {
          foundation: 0.15,
          core_skills: 0.30,
          tools_tech: 0.20,
          experience: 0.15,
          communication: 0.10,
          other: 0.10
        }
      }
      
      // Convert weights to decimals if they're stored as percentages (e.g., 10 -> 0.1, 15 -> 0.15)
      // Weights should be stored as decimals (0.0 to 1.0), not percentages (0 to 100)
      Object.keys(parsed.weights).forEach(key => {
        const weightValue = Number(parsed.weights[key]) || 0
        // If weight is greater than 1, it's likely stored as percentage, convert to decimal
        if (weightValue > 1) {
          parsed.weights[key] = weightValue / 100
        } else {
          parsed.weights[key] = weightValue
        }
      })
      
      if (!parsed.items || !Array.isArray(parsed.items)) {
        parsed.items = []
      }

      // Ensure weights sum to exactly 1.0 (100%)
      const weightSum = Object.values(parsed.weights).reduce((sum: number, w: any) => sum + (Number(w) || 0), 0)
      if (weightSum > 0 && Math.abs(weightSum - 1.0) > 0.001) {
        // Normalize weights to exactly 1.0 (prevent exceeding 100%)
        Object.keys(parsed.weights).forEach(key => {
          parsed.weights[key] = Number(parsed.weights[key]) / weightSum
        })
      }

      const formatted = JSON.stringify(parsed, null, 2)
      return NextResponse.json({ jdTemplate: formatted, success: true })
    } catch (parseError) {
      return NextResponse.json({ 
        error: "Failed to parse generated JD", 
        details: parseError instanceof Error ? parseError.message : String(parseError),
        rawResponse: jdJson.substring(0, 500)
      }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ 
      error: "API error", 
      details: error?.message || String(error) 
    }, { status: 500 })
  }
}

