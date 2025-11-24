import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { defaultTemplates, type JDTemplate } from "@/lib/jd-templates"

export const runtime = "nodejs"

const COLLECTION = "jd_templates"

// Helper function to normalize role names (spaces to underscores, lowercase)
function normalizeRoleName(role: string): string {
  return role
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const rawRole = searchParams.get("role") || "software_engineer"
    const role = normalizeRoleName(rawRole)

    // Try DB first; if it fails or not found, fall back to defaults
    try {
      const db = await getDb()
      const coll = db.collection(COLLECTION)
      const doc = await coll.findOne<{ role: string; template: JDTemplate }>({ role })
      if (doc) {
        return NextResponse.json({ template: doc.template })
      }
    } catch {
      // ignore DB errors, continue with default
    }
    // Fallback to default
    const def = defaultTemplates[role]
    if (!def) return NextResponse.json({ error: "Template not found" }, { status: 404 })
    return NextResponse.json({ template: def })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to fetch JD" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { role: rawRole, template, passkey } = body as { role: string; template: JDTemplate; passkey?: string }

    if (!rawRole || !template) {
      return NextResponse.json({ error: "Missing role/template" }, { status: 400 })
    }

    // Normalize role name
    const role = normalizeRoleName(rawRole)
    // Ensure template role matches normalized role
    template.role = role

    const expectedKey = process.env.JD_EDIT_PASSKEY
    if (!expectedKey) {
      return NextResponse.json({ error: "Server missing JD_EDIT_PASSKEY" }, { status: 500 })
    }
    if (passkey !== expectedKey) {
      return NextResponse.json({ error: "Invalid passkey" }, { status: 403 })
    }

    const db = await getDb()
    const coll = db.collection(COLLECTION)
    await coll.updateOne(
      { role },
      { $set: { role, template, updatedAt: new Date() } },
      { upsert: true }
    )

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to save JD" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { role: rawRole, passkey } = body as { role?: string; passkey?: string }
    if (!rawRole) return NextResponse.json({ error: "Missing role" }, { status: 400 })

    // Normalize role name
    const role = normalizeRoleName(rawRole)

    const expectedKey = process.env.JD_EDIT_PASSKEY
    if (!expectedKey) return NextResponse.json({ error: "Server missing JD_EDIT_PASSKEY" }, { status: 500 })
    if (passkey !== expectedKey) return NextResponse.json({ error: "Invalid passkey" }, { status: 403 })

    const db = await getDb()
    const coll = db.collection(COLLECTION)
    const res = await coll.deleteOne({ role })
    if (res.deletedCount === 0) {
      return NextResponse.json({ error: "Role not found in database" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to delete JD" }, { status: 500 })
  }
}


