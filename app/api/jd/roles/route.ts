import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { defaultTemplates } from "@/lib/jd-templates"

export const runtime = "nodejs"

const COLLECTION = "jd_templates"

export async function GET() {
  try {
    let dbRoles: string[] = []
    try {
      const db = await getDb()
      const coll = db.collection(COLLECTION)
      const docs = await coll.find({}, { projection: { role: 1, _id: 0 } }).toArray()
      dbRoles = docs.map((d: any) => d.role)
    } catch {
      // DB not available: fall back to defaults only
      dbRoles = []
    }
    const defaultRoles = Object.keys(defaultTemplates)
    const roles = Array.from(new Set([...defaultRoles, ...dbRoles]))
    return NextResponse.json({ roles })
  } catch (e: any) {
    // As a last resort, still return default roles
    return NextResponse.json({ roles: Object.keys(defaultTemplates), warning: e?.message || "fallback" })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { role, passkey } = body as { role?: string; passkey?: string }
    if (!role) return NextResponse.json({ error: "Missing role" }, { status: 400 })

    const expectedKey = process.env.JD_EDIT_PASSKEY
    if (!expectedKey) return NextResponse.json({ error: "Server missing JD_EDIT_PASSKEY" }, { status: 500 })
    if (passkey !== expectedKey) return NextResponse.json({ error: "Invalid passkey" }, { status: 403 })

    const normalized = role.trim().toLowerCase().replace(/\s+/g, "_")
    const db = await getDb()
    const coll = db.collection(COLLECTION)
    const exists = await coll.findOne({ role: normalized })
    if (!exists) {
      await coll.insertOne({ role: normalized, template: { role: normalized, weights: {}, items: [] }, createdAt: new Date() })
    }
    return NextResponse.json({ ok: true, role: normalized })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create role" }, { status: 500 })
  }
}



