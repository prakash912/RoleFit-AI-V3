"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { X, Briefcase, GraduationCap, ListChecks, Wand2, Check, Sparkles, FileText } from "lucide-react"
import type { JobRequirements } from "@/lib/types"
import { motion } from "framer-motion"
import { defaultTemplates, type JDTemplate } from "@/lib/jd-templates"
import { PasskeyDialog } from "@/components/passkey-dialog"
import { useAlertDialog } from "@/components/alert-dialog-custom"

interface JobRequirementsFormProps {
  onSubmit: (requirements: JobRequirements) => void
}

// Helper function to format labels: remove underscores and capitalize properly
function formatLabel(text: string): string {
  return text
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Helper function to normalize role names for backend (convert spaces to underscores, lowercase)
function normalizeRoleName(role: string): string {
  return role
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '') // Remove special characters except underscores
}

export function JobRequirementsForm({ onSubmit }: JobRequirementsFormProps) {
  const [jobTitle, setJobTitle] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [experienceYears, setExperienceYears] = useState(3)
  const [skillInput, setSkillInput] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [educationLevel, setEducationLevel] = useState("Bachelor's")
  const [role, setRole] = useState("software_engineer")
  const [roles, setRoles] = useState<string[]>(Object.keys(defaultTemplates))
  const [editing, setEditing] = useState(false)
  const [template, setTemplate] = useState<JDTemplate | null>(null)
  const [templateJson, setTemplateJson] = useState<string>("")
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false)
  // Removed separate Add Role modal; role+JD are handled in the edit modal
  // Draft states used in the edit modal so current selection isn't impacted until save
  const [draftRole, setDraftRole] = useState<string>("")
  const [draftTemplateJson, setDraftTemplateJson] = useState<string>("")
  const [jsonFixed, setJsonFixed] = useState(false)
  const [showPasskeyDialog, setShowPasskeyDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<((passkey?: string) => void) | null>(null)
  const { showAlert, AlertComponent } = useAlertDialog()
  const [isFixing, setIsFixing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [editorMode, setEditorMode] = useState<'form' | 'json'>('form')
  const [weightsForm, setWeightsForm] = useState<Array<{ key: string; value: number }>>([])
  const [itemsForm, setItemsForm] = useState<Array<{ id: string; text: string; must: boolean; veryMust: string[]; tags: string[] }>>([])
  // Store raw input strings for comma-separated fields to allow free typing
  const [veryMustRawInputs, setVeryMustRawInputs] = useState<Record<number, string>>({})
  const [tagsRawInputs, setTagsRawInputs] = useState<Record<number, string>>({})
  // Store raw percentage input strings to allow free typing without cursor issues
  const [weightsRawInputs, setWeightsRawInputs] = useState<Record<number, string>>({})

  const loadFormFromJson = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr || '{}') as JDTemplate
      const weights = parsed.weights || {}
      const weightsArr = Object.keys(weights).map((k) => {
        const weightValue = Number((weights as any)[k]) || 0
        // Convert to decimal if stored as percentage (value > 1 means it's percentage)
        // Weights should be stored as decimals (0.0 to 1.0), not percentages (0 to 100)
        const decimalValue = weightValue > 1 ? weightValue / 100 : weightValue
        return { key: k, value: decimalValue }
      })
      setWeightsForm(weightsArr)
      // Initialize raw inputs from loaded values
      const rawInputs: Record<number, string> = {}
      weightsArr.forEach((w, idx) => {
        rawInputs[idx] = Math.round(w.value * 100).toString()
      })
      setWeightsRawInputs(rawInputs)
      
      // Get weight keys for validation
      const weightKeys = weightsArr.map(w => w.key.trim()).filter(Boolean)
      
      const items = Array.isArray(parsed.items) ? parsed.items : []
        const itemsData = items.map((it: any) => {
          const itemId = String(it.id || '').trim()
          // Check if the ID matches a valid weight category
          const isValidId = itemId && weightKeys.includes(itemId)
          // If ID is invalid or empty, use first weight key if available
          const validId = isValidId ? itemId : (weightKeys.length > 0 ? weightKeys[0] : '')
          return {
            id: validId,
            text: String(it.text || ''),
            must: Boolean(it.must),
            veryMust: Array.isArray(it.veryMust) ? it.veryMust.map(String) : [],
            tags: Array.isArray(it.tags) ? it.tags.map(String) : []
          }
        })
      setItemsForm(itemsData)
      
      // Initialize raw inputs for comma-separated fields
      const veryMustRaw: Record<number, string> = {}
      const tagsRaw: Record<number, string> = {}
      itemsData.forEach((it, idx) => {
        veryMustRaw[idx] = it.veryMust.join(', ')
        tagsRaw[idx] = it.tags.join(', ')
      })
      setVeryMustRawInputs(veryMustRaw)
      setTagsRawInputs(tagsRaw)
      
      if (parsed.role) {
        setDraftRole(parsed.role)
      }
    } catch {
      // keep form empty if invalid JSON
      setWeightsForm([])
      setItemsForm([])
      setVeryMustRawInputs({})
      setTagsRawInputs({})
    }
  }

  const syncJsonFromForm = (roleOverride?: string) => {
    const rawRole = (roleOverride ?? draftRole ?? role) || 'software_engineer'
    const roleValue = normalizeRoleName(rawRole)
    const weightsObj: Record<string, number> = {}
    for (const w of weightsForm) {
      if (w.key.trim()) weightsObj[w.key.trim()] = Number(w.value) || 0
    }
    const itemsArr = itemsForm.map((it) => ({
      id: it.id || 'item',
      text: it.text || '',
      must: !!it.must,
      veryMust: it.must ? (it.veryMust || []) : [],
      tags: it.tags || []
    }))
    const tpl: JDTemplate = {
      role: roleValue,
      weights: weightsObj,
      items: itemsArr
    }
    setDraftTemplateJson(JSON.stringify(tpl, null, 2))
  }

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()])
      setSkillInput("")
    }
  }

  // JSON cleaning/fixing utility (similar to backend cleanJsonString)
  const cleanJsonString = (jsonStr: string): string => {
    // Remove trailing commas before } or ]
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')
    
    // Fix unquoted keys (common in malformed JSON)
    jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    
    // Convert single quotes to double quotes (but be careful with apostrophes)
    jsonStr = jsonStr.replace(/([{,]\s*)'/g, '$1"').replace(/':/g, '":').replace(/',/g, '",').replace(/'(\s*[}\]])/g, '"$1')
    
    // Remove comments
    jsonStr = jsonStr.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    
    // Fix incomplete string values at end of lines
    jsonStr = jsonStr.replace(/:\s*"([^"]*?)$/gm, ': ""')
    
    // Remove extra commas in arrays
    jsonStr = jsonStr.replace(/,\s*,/g, ',')
    
    // Try to close unclosed strings (basic attempt)
    const openQuotes = (jsonStr.match(/"/g) || []).length
    if (openQuotes % 2 !== 0) {
      // Odd number of quotes, try to fix last one
      const lastQuoteIndex = jsonStr.lastIndexOf('"')
      if (lastQuoteIndex !== -1) {
        const afterLastQuote = jsonStr.substring(lastQuoteIndex + 1).trim()
        if (afterLastQuote && !afterLastQuote.match(/^[,}\]]/)) {
          jsonStr = jsonStr + '"'
        }
      }
    }
    
    return jsonStr
  }

  const fixJsonWithAI = async (passkey?: string) => {
    const currentJson = draftTemplateJson.trim()
    if (!currentJson) {
      showAlert("No JSON to Fix", "Please enter some JSON first.", "warning")
      return
    }

    // Check for passkey
    const passkeyStored = passkey || (typeof window !== 'undefined' ? localStorage.getItem('analyzer_passkey') : null)
    if (!passkeyStored) {
      // Show passkey dialog
      setPendingAction(() => (providedPasskey?: string) => fixJsonWithAI(providedPasskey))
      setShowPasskeyDialog(true)
      return
    }

    setIsFixing(true)
    setJsonFixed(false)

    try {
      const res = await fetch('/api/fix-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonString: currentJson, passkey: passkeyStored })
      })

      const data = await res.json()
      
      if (data.success && data.fixedJson) {
        setDraftTemplateJson(data.fixedJson)
        setJsonFixed(true)
        setTimeout(() => setJsonFixed(false), 3000)
      } else {
        // Fallback to local fix
        try {
          const cleaned = cleanJsonString(currentJson)
          const parsed = JSON.parse(cleaned)
          const fixed = JSON.stringify(parsed, null, 2)
          setDraftTemplateJson(fixed)
          setJsonFixed(true)
          setTimeout(() => setJsonFixed(false), 3000)
        } catch {
          showAlert("Fix JSON Failed", `${data.error || data.details || 'Unknown error'}`, "error")
        }
      }
    } catch (error) {
      // Fallback to local fix
      try {
        const cleaned = cleanJsonString(currentJson)
        const parsed = JSON.parse(cleaned)
        const fixed = JSON.stringify(parsed, null, 2)
        setDraftTemplateJson(fixed)
        setJsonFixed(true)
        setTimeout(() => setJsonFixed(false), 3000)
      } catch (localError) {
        showAlert("Fix JSON Failed", `Error: ${error instanceof Error ? error.message : String(error)}`, "error")
      }
    } finally {
      setIsFixing(false)
    }
  }

  const generateJDWithAI = async (passkey?: string) => {
    // Prefer the role typed in the Add Role popup when editing; otherwise use main dropdown role
    const roleToUseRaw = (editing && draftRole && draftRole.trim()) ? draftRole : role
    if (!roleToUseRaw || !roleToUseRaw.trim()) {
      showAlert("Role Required", "Please enter or select a role first to generate JD.", "warning")
      return
    }

    // Check for passkey
    const passkeyStored = passkey || (typeof window !== 'undefined' ? localStorage.getItem('analyzer_passkey') : null)
    if (!passkeyStored) {
      // Show passkey dialog
      setPendingAction(() => (providedPasskey?: string) => generateJDWithAI(providedPasskey))
      setShowPasskeyDialog(true)
      return
    }

    // Normalize role name for backend
    const roleToUse = normalizeRoleName(roleToUseRaw)

    setIsGenerating(true)

    try {
      // Get default template for the role if exists, otherwise send empty to force fresh generation
      const defaultTemplateForRole = (defaultTemplates as any)[roleToUse] || { role: roleToUse, weights: {}, items: [] }
      
      const res = await fetch('/api/generate-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: roleToUse,
          defaultTemplate: defaultTemplateForRole,
          passkey: passkeyStored
        })
      })

      const data = await res.json()
      
      if (data.success && data.jdTemplate) {
        setDraftTemplateJson(data.jdTemplate)
        // If editing, ensure draftRole matches the used role
        if (editing) {
          setDraftRole(roleToUse)
        }
        // Sync form editor from the newly generated JSON
        loadFormFromJson(data.jdTemplate)
        setEditorMode('form')
        showAlert("JD Generated", "JD template generated successfully based on selected role and default template!", "success")
      } else {
        showAlert("Generate JD Failed", `${data.error || data.details || 'Unknown error'}`, "error")
      }
    } catch (error) {
      showAlert("Generate JD Error", `${error instanceof Error ? error.message : String(error)}`, "error")
    } finally {
      setIsGenerating(false)
    }
  }

  const loadDefaultTemplate = () => {
    const defaultTemplate = defaultTemplates[draftRole || role] || defaultTemplates['software_engineer']
    let templateJson = ''
    if (defaultTemplate) {
      templateJson = JSON.stringify(defaultTemplate, null, 2)
      setDraftTemplateJson(templateJson)
      if (!draftRole) {
        setDraftRole(defaultTemplate.role || role)
      }
    } else {
      // Minimal template
      const minimal = { role: draftRole || role || "software_engineer", weights: {}, items: [] }
      templateJson = JSON.stringify(minimal, null, 2)
      setDraftTemplateJson(templateJson)
    }
    // Sync form editor with the loaded template
    loadFormFromJson(templateJson)
    // Switch to form mode to show the updated form
    setEditorMode('form')
  }

  // Check if JSON is valid (for visual feedback)
  const isValidJson = (jsonStr: string): boolean => {
    if (!jsonStr.trim()) return false
    try {
      JSON.parse(jsonStr)
      return true
    } catch {
      return false
    }
  }
  const applyTemplateToFields = (t: JDTemplate) => {
    // Combine item texts into JD and tags into required skills default
    const jdText = t.items.map((i) => `- ${i.text}`).join("\n")
    const tags = Array.from(new Set(t.items.flatMap((i) => i.tags)))
    setJobTitle(t.role.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()))
    setJobDescription(jdText)
    if (tags.length) setSkills(tags)
    setTemplateJson(JSON.stringify(t, null, 2))
  }

  const fetchTemplate = async (roleKey: string) => {
    setIsLoadingTemplate(true)
    try {
      const res = await fetch(`/api/jd?role=${encodeURIComponent(roleKey)}`)
      if (res.ok) {
        const data = await res.json()
        setTemplate(data.template)
        applyTemplateToFields(data.template)
      } else {
        // fallback to local default
        const def = (defaultTemplates as any)[roleKey]
        if (def) {
          setTemplate(def)
          applyTemplateToFields(def)
        }
      }
    } finally {
      setIsLoadingTemplate(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/jd/roles")
        if (res.ok) {
          const data = await res.json()
          setRoles(data.roles || ["software_engineer"])
        }
      } catch {}
      fetchTemplate(role)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRoleChange = (newRole: string) => {
    setRole(newRole)
    fetchTemplate(newRole)
    const human = newRole.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
    setJobTitle(human)
  }

  const saveTemplate = async (passkey?: string) => {
    // Sync form data to JSON before saving (if in form mode)
    let jsonToSave = draftTemplateJson
    if (editorMode === 'form') {
      // Manually build JSON from form state to ensure latest data is saved
      const rawRole = draftRole || role
      const roleValue = normalizeRoleName(rawRole)
      const weightsObj: Record<string, number> = {}
      for (const w of weightsForm) {
        if (w.key.trim()) weightsObj[w.key.trim()] = Number(w.value) || 0
      }
      const itemsArr = itemsForm.map((it) => ({
        id: it.id || 'item',
        text: it.text || '',
        must: !!it.must,
        veryMust: it.must ? (it.veryMust || []) : [],
        tags: it.tags || []
      }))
      const tpl: JDTemplate = {
        role: roleValue,
        weights: weightsObj,
        items: itemsArr
      }
      jsonToSave = JSON.stringify(tpl, null, 2)
      // Also update draftTemplateJson for consistency
      setDraftTemplateJson(jsonToSave)
    }
    
    // JSON editor is the single source of truth for JD; no synthetic items
    let updated: JDTemplate | null = null
    // Use the synced JSON
    const currentJson = jsonToSave.trim()
    if (currentJson) {
      try {
        const parsed = JSON.parse(currentJson)
        updated = parsed
      } catch (e) {
        showAlert("Invalid JSON", "JSON is invalid. Please fix and try again.", "error")
        return
      }
    } else {
      showAlert("JD Template Required", "Please provide JD Template JSON before saving.", "warning")
      return
    }

    if (!updated) {
      showAlert("Invalid JSON", "JSON is invalid. Please fix and try again.", "error")
      return
    }

    // Ensure role aligns with current role selection and normalize it
    const rawRole = draftRole || role
    updated.role = normalizeRoleName(rawRole)

    // Validate weights sum to 100%
    const weightsSum = Object.values(updated.weights || {}).reduce((sum: number, w: any) => sum + (Number(w) || 0), 0)
    if (Math.abs(weightsSum - 1.0) >= 0.001) {
      showAlert("Invalid Weights", `Weights must sum to exactly 100%. Current sum: ${(weightsSum * 100).toFixed(1)}%`, "error")
      return
    }

    // Check for passkey
    const passkeyStored = passkey || (typeof window !== 'undefined' ? localStorage.getItem('analyzer_passkey') : null)
    if (!passkeyStored) {
      // Show passkey dialog
      setPendingAction(() => (providedPasskey?: string) => saveTemplate(providedPasskey))
      setShowPasskeyDialog(true)
      return
    }

    const res = await fetch("/api/jd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: updated.role, template: updated, passkey: passkeyStored }),
    })
    if (res.ok) {
      setTemplate(updated)
      setTemplateJson(JSON.stringify(updated, null, 2))
      setEditing(false)
      // Update roles list if a new role name was used
      setRoles((prev) => Array.from(new Set([...prev, updated.role])))
      // Switch current selection to the updated/new role and refresh view
      setRole(updated.role)
      await fetchTemplate(updated.role)
    } else {
      const err = await res.json().catch(() => ({}))
                    showAlert("Save Failed", `${err.error || res.status}`, "error")
    }
  }

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (skills.length === 0) {
      return
    }

    const descriptionFromTemplate = template
      ? (template.items || []).map((i) => `- ${i.text}`).join("\n")
      : jobDescription

    const requirements: JobRequirements = {
      jobTitle: jobTitle || role.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
      jobDescription: descriptionFromTemplate,
      requiredSkills: skills,
      minimumExperience: experienceYears,
      educationLevel,
      role,
    }

    onSubmit(requirements)
  }

  return (
    <Card className="w-full overflow-hidden bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-xl">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      <form onSubmit={handleSubmit}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Job Requirements</CardTitle>
          <CardDescription>Define the requirements for the position you're hiring for</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-base">Role</Label>
            <select
              className="w-full p-2 rounded-md border border-indigo-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {isLoadingTemplate ? "Loading role template..." : template ? "Template loaded" : "Using defaults"}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-red-200 text-red-600"
                onClick={async () => {
                  if (!role) return
                  
                  const deleteRole = async (passkey?: string) => {
                    const passkeyStored = passkey || (typeof window !== 'undefined' ? localStorage.getItem('analyzer_passkey') : null)
                    if (!passkeyStored) {
                      // Show passkey dialog
                      setPendingAction(() => (providedPasskey?: string) => deleteRole(providedPasskey))
                      setShowPasskeyDialog(true)
                      return
                    }
                    
                    const confirmDelete = confirm(`Delete role "${role.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())}" and its JD from database?`)
                    if (!confirmDelete) return
                    
                    const res = await fetch('/api/jd', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, passkey: passkeyStored }) })
                    if (res.ok) {
                      // Remove from roles list and switch to default if available
                      setRoles((prev) => prev.filter((r) => r !== role))
                      const fallback = (defaultTemplates as any)['software_engineer'] ? 'software_engineer' : (roles[0] || '')
                      const newRole = fallback && fallback !== role ? fallback : ''
                      if (newRole) {
                        setRole(newRole)
                        await fetchTemplate(newRole)
                      }
                    } else {
                      const err = await res.json().catch(() => ({}))
                      showAlert("Delete Failed", `${err.error || res.status}`, "error")
                    }
                  }
                  
                  // Call deleteRole initially
                  await deleteRole()
                }}
              >
                Delete Role
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraftRole(role)
                  setDraftTemplateJson(
                    JSON.stringify(template ?? defaultTemplates[role] ?? { role, weights: {}, items: [] }, null, 2)
                  )
                  // Initialize form editor from JSON
                  setTimeout(() => loadFormFromJson(JSON.stringify(template ?? defaultTemplates[role] ?? { role, weights: {}, items: [] })), 0)
                  setEditing(true)
                }}
                className="border-indigo-200"
              >
                Edit Template
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-pink-200"
                onClick={() => {
                  const base = { role: "", weights: {}, items: [] as any[] }
                  setDraftRole("")
                  setDraftTemplateJson(JSON.stringify(base, null, 2))
                  setWeightsForm([])
                  setItemsForm([])
                  setEditing(true)
                }}
              >
                Add Role + JD
              </Button>
            </div>
          </div>

          {template && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Weights Section - Enhanced Styling */}
              <div className="p-4 rounded-lg border-2 border-indigo-200 dark:border-indigo-700 bg-gradient-to-br from-indigo-50 via-indigo-50/50 to-purple-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                  <h3 className="text-base font-bold text-indigo-900 dark:text-indigo-100">Weights</h3>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {Object.entries(template.weights || {}).map(([k, v]) => {
                    const weightValue = Number(v)
                    const weightPercentage = (weightValue * 100).toFixed(0) // Convert to percentage
                    const weightColor = weightValue >= 0.2 
                      ? 'from-emerald-500 to-teal-500 border-emerald-300 dark:border-emerald-600'
                      : weightValue >= 0.1
                      ? 'from-blue-500 to-indigo-500 border-blue-300 dark:border-blue-600'
                      : 'from-slate-400 to-slate-500 border-slate-300 dark:border-slate-600'
                    
                    return (
                      <span 
                        key={k} 
                        className={`px-3 py-1.5 rounded-lg bg-gradient-to-r ${weightColor} text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all transform hover:scale-105 border`}
                      >
                        <span className="font-medium">{formatLabel(k)}</span>
                        <span className="ml-1.5 opacity-90">: {weightPercentage}%</span>
                      </span>
                    )
                  })}
                  {Object.keys(template.weights || {}).length === 0 && (
                    <span className="text-muted-foreground text-xs italic">No weights defined</span>
                  )}
                </div>
              </div>
              
              {/* JD Items Section - Enhanced Styling */}
              <div className="p-4 rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-gradient-to-br from-purple-50 via-purple-50/50 to-pink-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                  <h3 className="text-base font-bold text-purple-900 dark:text-purple-100">JD Items</h3>
                </div>
                <ul className="space-y-2.5">
                  {(template.items || []).map((it) => (
                    <li 
                      key={it.id} 
                      className="group relative pl-6 text-sm leading-relaxed"
                    >
                      {/* Custom bullet point */}
                      <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 group-hover:scale-125 transition-transform"></div>
                      
                      <div className="flex flex-wrap items-start gap-2">
                        <span className="font-semibold text-indigo-700 dark:text-indigo-300 text-xs tracking-wide bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded">
                          {formatLabel(it.id)}
                        </span>
                        <span className="text-slate-700 dark:text-slate-200 flex-1 min-w-0">
                          {it.text}
                        </span>
                        {it.must && (
                          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            must
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                  {(!template.items || template.items.length === 0) && (
                    <li className="text-muted-foreground text-xs italic pl-6">No items defined</li>
                  )}
                </ul>
              </div>
            </div>
          )}
          {/* Job Title field removed; title derived from role */}

          {/* Job Description removed; derived from JD JSON. */}

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-purple-500" />
              <Label className="text-base">Required Skills</Label>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill (e.g. React, Python, Project Management)"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addSkill()
                  }
                }}
                className="border-purple-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus-visible:ring-purple-500"
              />
              <Button
                type="button"
                onClick={addSkill}
                className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition-all duration-300"
              >
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {skills.map((skill, index) => (
                <motion.div
                  key={skill}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 hover:from-indigo-200 hover:to-purple-200 px-3 py-1"
                  >
                    {skill}
                    <X className="h-3 w-3 cursor-pointer text-indigo-700" onClick={() => removeSkill(skill)} />
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-pink-500" />
                <Label htmlFor="experience" className="text-base">
                  Minimum Years of Experience: {experienceYears}
                </Label>
              </div>
            </div>
            <Slider
              id="experience"
              min={0}
              max={8}
              step={1}
              value={[Math.min(8, Math.max(0, experienceYears))]}
              onValueChange={(value) => setExperienceYears(Math.min(8, Math.max(0, value[0])))}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Entry Level</span>
              <span>Mid Level</span>
              <span>Senior Level</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-500" />
              <Label htmlFor="education" className="text-base">
                Minimum Education Level
              </Label>
            </div>
            <select
              id="education"
              className="w-full p-2 rounded-md border border-indigo-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
            >
              <option value="High School">High School</option>
              <option value="Associate's">Associate's Degree</option>
              <option value="Bachelor's">Bachelor's Degree</option>
              <option value="Master's">Master's Degree</option>
              <option value="PhD">PhD</option>
            </select>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 shadow-md"
          >
            Continue to Resume Upload
          </Button>
        </CardFooter>
      </form>

      {editing && (
        <div 
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={(e) => {
            // Close modal when clicking outside (on the overlay)
            if (e.target === e.currentTarget) {
              setEditing(false)
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl p-6 space-y-4 border border-slate-200 dark:border-slate-700 max-h-[85vh] overflow-y-auto"
            onClick={(e) => {
              // Prevent closing when clicking inside the modal content
              e.stopPropagation()
            }}
          >
            <h3 className="text-lg font-semibold">Edit Role & JD Template (Passkey Required)</h3>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label>JD Editor</Label>
                    <Badge variant="outline" className="text-xs">{editorMode === 'form' ? 'Form' : 'JSON'}</Badge>
                    {editorMode === 'json' && draftTemplateJson.trim() && !isValidJson(draftTemplateJson) && (
                      <Badge variant="destructive" className="text-xs">Invalid JSON</Badge>
                    )}
                    {editorMode === 'json' && isValidJson(draftTemplateJson) && draftTemplateJson.trim() && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300">Valid</Badge>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button type="button" variant="outline" className="border-slate-300" onClick={() => setEditorMode(editorMode === 'form' ? 'json' : 'form')}>
                      Switch to {editorMode === 'form' ? 'JSON' : 'Form'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={`border-green-200 ${jsonFixed ? 'bg-green-50 text-green-700' : ''} ${isFixing ? 'opacity-70 cursor-wait' : ''}`}
                      onClick={() => fixJsonWithAI()}
                      disabled={editorMode !== 'json' || isFixing || !draftTemplateJson.trim()}
                    >
                      <Wand2 className="h-4 w-4 mr-1" />
                      AI Fix JSON
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={`border-purple-200 ${isGenerating ? 'opacity-70 cursor-wait' : ''}`}
                      onClick={() => generateJDWithAI()}
                      disabled={isGenerating || !((editing && draftRole && draftRole.trim()) || (!editing && role && role.trim()))}
                    >
                      {isGenerating ? (
                        <>
                          <Sparkles className="h-4 w-4 mr-1 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-1" />
                          Generate JD
                        </>
                      )}
                    </Button>
                    <Button type="button" variant="outline" className="border-blue-200" onClick={loadDefaultTemplate}>
                      <FileText className="h-4 w-4 mr-1" />
                      Default Template
                    </Button>
                  </div>
                </div>

                {editorMode === 'form' ? (
                  <div className="space-y-6">
                    <div>
                      <Label className="mb-2 block">Role</Label>
                      <Input
                        value={draftRole}
                        onChange={(e) => {
                          setDraftRole(e.target.value)
                          // Normalize for backend when syncing
                          const normalized = normalizeRoleName(e.target.value)
                          syncJsonFromForm(normalized)
                        }}
                        placeholder="e.g. QA Engineer or qa_engineer"
                        className="dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Type naturally with spaces and capitals. Will be saved as: {draftRole ? normalizeRoleName(draftRole) : 'normalized_format'}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Weights</Label>
                        <Button type="button" variant="outline" className="h-8 px-2 text-xs" onClick={() => { 
                          const newIdx = weightsForm.length
                          setWeightsForm([...weightsForm, { key: '', value: 0 }])
                          const newRawInputs = { ...weightsRawInputs }
                          newRawInputs[newIdx] = ''
                          setWeightsRawInputs(newRawInputs)
                          setTimeout(() => syncJsonFromForm(), 0) 
                        }}>Add Weight</Button>
                      </div>
                      <div className="space-y-2">
                        {weightsForm.map((w, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                            <Input className="col-span-5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" placeholder="category" value={w.key} onChange={(e) => { const arr = [...weightsForm]; arr[idx] = { ...arr[idx], key: e.target.value }; setWeightsForm(arr); syncJsonFromForm() }} />
                            <div className="col-span-5 flex items-center gap-1">
                              <Input 
                                className="flex-1 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" 
                                type="text" 
                                inputMode="numeric"
                                placeholder="15" 
                                value={weightsRawInputs[idx] !== undefined ? weightsRawInputs[idx] : (w.value !== undefined && w.value !== null ? Math.round(w.value * 100).toString() : '')} 
                                onChange={(e) => { 
                                  const rawInput = e.target.value
                                  
                                  // Store raw input to allow free typing without cursor issues
                                  const newRawInputs = { ...weightsRawInputs }
                                  newRawInputs[idx] = rawInput
                                  setWeightsRawInputs(newRawInputs)
                                  
                                  // If empty, don't update the decimal value yet
                                  if (rawInput === '' || rawInput === null || rawInput === undefined) {
                                    return
                                  }
                                  
                                  // Parse the input value as percentage
                                  // Remove any non-numeric characters except decimal point
                                  const cleanInput = rawInput.toString().replace(/[^\d.]/g, '')
                                  const percentValue = parseFloat(cleanInput)
                                  
                                  // If not a valid number, don't update decimal value
                                  if (isNaN(percentValue)) {
                                    return
                                  }
                                  
                                  // Validate and clamp range (0-100)
                                  const clampedPercent = Math.max(0, Math.min(100, percentValue))
                                  
                                  // Convert percentage to decimal (10% = 0.1, not 0.01)
                                  // Critical: percentValue / 100, NOT / 1000
                                  const decimalValue = clampedPercent / 100
                                  
                                  const arr = [...weightsForm]
                                  arr[idx] = { ...arr[idx], value: decimalValue }
                                  setWeightsForm(arr)
                                  // Don't sync on every keystroke - only on blur
                                }}
                                onBlur={() => {
                                  // Normalize the raw input on blur
                                  const rawInput = weightsRawInputs[idx] || ''
                                  if (rawInput !== '') {
                                    const cleanInput = rawInput.toString().replace(/[^\d.]/g, '')
                                    const percentValue = parseFloat(cleanInput)
                                    if (!isNaN(percentValue)) {
                                      const clampedPercent = Math.max(0, Math.min(100, percentValue))
                                      const normalizedInput = Math.round(clampedPercent).toString()
                                      const newRawInputs = { ...weightsRawInputs }
                                      newRawInputs[idx] = normalizedInput
                                      setWeightsRawInputs(newRawInputs)
                                      
                                      // Update decimal value
                                      const decimalValue = clampedPercent / 100
                                      const arr = [...weightsForm]
                                      arr[idx] = { ...arr[idx], value: decimalValue }
                                      setWeightsForm(arr)
                                    }
                                  }
                                  // Sync JSON when user finishes editing
                                  syncJsonFromForm()
                                }}
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                            <Button type="button" variant="outline" className="col-span-2 h-9" onClick={() => { 
                              const arr = [...weightsForm]; 
                              arr.splice(idx, 1); 
                              setWeightsForm(arr)
                              // Remove raw input for this index and reindex remaining inputs
                              const newRawInputs: Record<number, string> = {}
                              arr.forEach((w, newIdx) => {
                                const oldIdx = weightsForm.findIndex((oldW, oldIdx) => oldIdx === newIdx || (oldIdx > idx && oldIdx === newIdx + 1))
                                if (oldIdx >= 0 && oldIdx < weightsForm.length) {
                                  const value = weightsRawInputs[oldIdx] !== undefined ? weightsRawInputs[oldIdx] : Math.round(w.value * 100).toString()
                                  newRawInputs[newIdx] = value
                                } else {
                                  newRawInputs[newIdx] = Math.round(w.value * 100).toString()
                                }
                              })
                              setWeightsRawInputs(newRawInputs)
                              syncJsonFromForm() 
                            }}>Remove</Button>
                          </div>
                        ))}
                        {(() => {
                          const weightsSum = weightsForm.reduce((s, w) => s + (Number(w.value) || 0), 0)
                          const weightsSumPercent = weightsSum * 100
                          const isExactly100 = Math.abs(weightsSum - 1.0) < 0.001 // Allow small floating point errors
                          return (
                            <div className="space-y-1">
                              <div className={`text-xs ${isExactly100 ? 'text-muted-foreground' : 'text-red-600 dark:text-red-400 font-semibold'}`}>
                                Sum: {weightsSumPercent.toFixed(1)}%
                              </div>
                              {!isExactly100 && weightsForm.length > 0 && (
                                <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                                  ⚠️ Weights must sum to exactly 100% to save JD
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Items</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="h-8 px-2 text-xs" 
                          disabled={weightsForm.length === 0}
                          onClick={() => { 
                            const newIdx = itemsForm.length
                            // Default to first weight key if available
                            const defaultId = weightsForm.length > 0 ? weightsForm[0].key.trim() : ''
                            setItemsForm([...itemsForm, { id: defaultId, text: '', must: false, veryMust: [], tags: [] }])
                            // Initialize empty raw inputs for new item
                            setVeryMustRawInputs(prev => ({ ...prev, [newIdx]: '' }))
                            setTagsRawInputs(prev => ({ ...prev, [newIdx]: '' }))
                            setTimeout(() => syncJsonFromForm(), 0) 
                          }}
                        >
                          Add Item
                        </Button>
                      </div>
                      <div className="space-y-4">
                        {itemsForm.map((it, idx) => (
                          <div key={idx} className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <select
                                  className={`w-full p-2 rounded-md border ${
                                    it.id && !weightsForm.some(w => w.key.trim() === it.id)
                                      ? 'border-red-500 dark:border-red-500'
                                      : 'border-slate-300 dark:border-slate-700'
                                  } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none`}
                                  value={it.id}
                                  onChange={(e) => { 
                                    const arr = [...itemsForm]
                                    arr[idx] = { ...arr[idx], id: e.target.value }
                                    setItemsForm(arr)
                                    syncJsonFromForm() 
                                  }}
                                >
                                  <option value="">Select Weight Category</option>
                                  {weightsForm.map((w, wIdx) => (
                                    <option key={wIdx} value={w.key.trim()}>
                                      {w.key.trim() || `Category ${wIdx + 1}`}
                                    </option>
                                  ))}
                                </select>
                                {it.id && !weightsForm.some(w => w.key.trim() === it.id) && weightsForm.length > 0 && (
                                  <p className="text-xs text-red-600 dark:text-red-400">
                                    ⚠️ "{it.id}" is not a weight category. Please select a valid category.
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" checked={it.must} onChange={(e) => { const arr = [...itemsForm]; arr[idx] = { ...arr[idx], must: e.target.checked }; setItemsForm(arr); syncJsonFromForm() }} />
                                <span className="text-sm">Must</span>
                              </div>
                            </div>
                            <Textarea placeholder="Requirement text" className="dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" value={it.text} onChange={(e) => { const arr = [...itemsForm]; arr[idx] = { ...arr[idx], text: e.target.value }; setItemsForm(arr); syncJsonFromForm() }} />
                            <Input 
                              placeholder="Very must (comma separated)" 
                              className="dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" 
                              value={veryMustRawInputs[idx] !== undefined ? veryMustRawInputs[idx] : it.veryMust.join(', ')} 
                              onChange={(e) => { 
                                const inputValue = e.target.value
                                // Store raw input to allow free typing with commas
                                setVeryMustRawInputs(prev => ({ ...prev, [idx]: inputValue }))
                              }}
                              onBlur={(e) => {
                                // Parse and update array when user leaves the field
                                const inputValue = e.target.value
                                const parsed = inputValue ? inputValue.split(',').map(s => s.trim()).filter(Boolean) : []
                                const arr = [...itemsForm]
                                arr[idx] = { ...arr[idx], veryMust: parsed }
                                setItemsForm(arr)
                                syncJsonFromForm()
                              }}
                            />
                            <Input 
                              placeholder="Tags (comma separated)" 
                              className="dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" 
                              value={tagsRawInputs[idx] !== undefined ? tagsRawInputs[idx] : it.tags.join(', ')} 
                              onChange={(e) => { 
                                const inputValue = e.target.value
                                // Store raw input to allow free typing with commas
                                setTagsRawInputs(prev => ({ ...prev, [idx]: inputValue }))
                              }}
                              onBlur={(e) => {
                                // Parse and update array when user leaves the field
                                const inputValue = e.target.value
                                const parsed = inputValue ? inputValue.split(',').map(s => s.trim()).filter(Boolean) : []
                                const arr = [...itemsForm]
                                arr[idx] = { ...arr[idx], tags: parsed }
                                setItemsForm(arr)
                                syncJsonFromForm()
                              }}
                            />
                            <div className="flex justify-end">
                              <Button type="button" variant="outline" onClick={() => { 
                                const arr = [...itemsForm]
                                arr.splice(idx, 1)
                                setItemsForm(arr)
                                // Rebuild raw inputs from remaining items (simpler approach)
                                const newVeryMustRaw: Record<number, string> = {}
                                const newTagsRaw: Record<number, string> = {}
                                arr.forEach((it, newIdx) => {
                                  newVeryMustRaw[newIdx] = it.veryMust.join(', ')
                                  newTagsRaw[newIdx] = it.tags.join(', ')
                                })
                                setVeryMustRawInputs(newVeryMustRaw)
                                setTagsRawInputs(newTagsRaw)
                                syncJsonFromForm() 
                              }}>Remove Item</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Textarea
                    rows={16}
                    value={draftTemplateJson}
                    onChange={(e) => { setDraftTemplateJson(e.target.value); loadFormFromJson(e.target.value) }}
                    placeholder='{
  "role": "software_engineer",
  "weights": { "foundation": 0.15, ... },
  "items": [{ "id": "foundation", "text": "...", "must": true, "tags": ["..."] }]
}'
                    className="font-mono dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(false)} className="border-indigo-200">Cancel</Button>
              <Button onClick={() => saveTemplate()} className="bg-gradient-to-r from-indigo-500 to-purple-500">Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Removed separate Add Role modal */}

      {/* Passkey Dialog */}
      <PasskeyDialog
        open={showPasskeyDialog}
        onOpenChange={(open) => {
          setShowPasskeyDialog(open)
          if (!open) {
            setPendingAction(null)
          }
        }}
        onConfirm={(passkey) => {
          if (pendingAction) {
            pendingAction(passkey)
            setPendingAction(null)
          }
        }}
        title="Enter Passkey"
        description="Please enter your passkey to perform this action."
      />

      {/* Custom Alert Dialog */}
      <AlertComponent />
    </Card>
  )
}

