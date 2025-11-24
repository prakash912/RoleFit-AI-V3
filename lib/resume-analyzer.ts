import type { JobRequirements, Candidate } from "@/lib/types"

export interface ProgressUpdate {
  percentage: number
  message: string
  currentFile?: number
  totalFiles?: number
  stage?: string // 'extract', 'ai', 'checklist', 'projects', 'batch', 'validate'
  aiThinking?: string // AI thinking message for gameified experience
}

export async function analyzeResumes(
  files: File[], 
  jobRequirements: JobRequirements,
  onProgress?: (progress: ProgressUpdate) => void,
  useAgenticAI: boolean = false
): Promise<Candidate[]> {
  const form = new FormData()
  for (const f of files) form.append("files", f)
  form.append("jobRequirements", JSON.stringify(jobRequirements))
  if (useAgenticAI) {
    form.append("useAgenticAI", "true")
  }

  const res = await fetch("/api/analyze", {
    method: "POST",
    body: form,
  })

  if (!res.ok) {
    let details = ""
    try {
      const data = await res.json()
      details = data?.error ? ` - ${data.error}` : ""
    } catch {
      try {
        details = ` - ${await res.text()}`
      } catch {}
    }
    throw new Error(`Analysis failed: ${res.status}${details}`)
  }

  if (!res.body) {
    throw new Error("Response body is null")
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let candidates: Candidate[] = []

  try {
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6))
            
            if (data.type === "progress" && onProgress) {
              onProgress({
                percentage: data.percentage || 0,
                message: data.message || "Processing...",
                currentFile: data.currentFile,
                totalFiles: data.totalFiles,
                stage: data.stage, // 'extract', 'ai', 'checklist', 'projects'
                aiThinking: data.aiThinking, // AI thinking message
              })
            } else if (data.type === "result") {
              candidates = data.candidates || []
            } else if (data.type === "error") {
              throw new Error(data.error || "Unknown error")
            }
          } catch (e) {
            // Skip invalid JSON lines
            if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
              console.warn("Failed to parse SSE data:", e)
            }
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const lines = buffer.split("\n")
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === "result") {
              candidates = data.candidates || []
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    return candidates
  } finally {
    reader.releaseLock()
  }
}

