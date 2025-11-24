/**
 * Advanced Agentic AI Analysis Route
 * 
 * This endpoint uses an agent-based architecture with specialized AI agents
 * that work together to provide more intelligent and accurate resume analysis.
 */

import { NextRequest, NextResponse } from "next/server"
import { AgentOrchestrator, CollaborativeAgentSystem, type AgentContext } from "@/lib/ai-agents"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]
    const jobRequirementsStr = formData.get("jobRequirements") as string

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    if (!jobRequirementsStr) {
      return NextResponse.json({ error: "No job requirements provided" }, { status: 400 })
    }

    const jobRequirements = JSON.parse(jobRequirementsStr)
    const jdTemplate = jobRequirements.jdTemplate || {}

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder()
          
          // Send initial progress
          const sendProgress = (percentage: number, message: string, stage?: string) => {
            const data = JSON.stringify({
              type: 'progress',
              percentage,
              message,
              stage,
            })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }

          sendProgress(5, "🤖 Initializing Agentic AI System...", "init")

          const orchestrator = new AgentOrchestrator()
          const results: any[] = []

          // Process each file with agentic AI
          for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const fileNum = i + 1
            
            sendProgress(
              5 + (i / files.length) * 90,
              `🤖 Processing ${file.name} with Agentic AI...`,
              "processing"
            )

            try {
              // Extract text from file (simplified - you'd use your actual extraction)
              const text = await extractTextFromFile(file)

              // Create agent context
              const context: AgentContext = {
                resumeText: text,
                jobRequirements,
                jdTemplate,
                currentStage: "agentic-analysis"
              }

              // Execute agent workflow
              sendProgress(
                10 + (i / files.length) * 80,
                `🧠 Agentic AI: Orchestrating multiple agents for ${file.name}...`,
                "agentic"
              )

              const workflowResult = await orchestrator.executeWorkflow(context)

              // Format result as candidate
              const candidate = {
                id: `${i + 1}`,
                name: workflowResult.results.extraction?.name || file.name,
                email: workflowResult.results.extraction?.email || "",
                phone: workflowResult.results.extraction?.phone || "",
                location: workflowResult.results.extraction?.location || "",
                currentTitle: workflowResult.results.extraction?.currentTitle || "",
                yearsOfExperience: workflowResult.results.extraction?.yearsOfExperience || 0,
                educationLevel: workflowResult.results.extraction?.educationLevel || jobRequirements.educationLevel,
                matchScore: workflowResult.results.scoring?.overallScore || 0,
                matchedSkills: workflowResult.results.analysis?.matchedSkills || [],
                inferredSkills: workflowResult.results.analysis?.inferredSkills || [],
                additionalSkills: workflowResult.results.analysis?.additionalSkills || [],
                experience: workflowResult.results.extraction?.experience || [],
                aiAnalysis: workflowResult.results.analysis?.reasoning || "Agentic AI analysis completed",
                // Agentic AI specific fields
                agenticAnalysis: {
                  workflowLog: workflowResult.workflowLog,
                  confidence: workflowResult.confidence,
                  scoreBreakdown: workflowResult.results.scoring?.scoreBreakdown,
                  recommendation: workflowResult.results.recommendation,
                  strengths: workflowResult.results.analysis?.strengths,
                  weaknesses: workflowResult.results.analysis?.weaknesses,
                  interviewQuestions: workflowResult.results.recommendation?.interviewQuestions,
                  nextSteps: workflowResult.results.recommendation?.nextSteps,
                  hiringManagerNote: workflowResult.results.recommendation?.hiringManagerNote
                }
              }

              results.push(candidate)

              sendProgress(
                10 + ((i + 1) / files.length) * 80,
                `✅ Agentic AI analysis complete for ${file.name}`,
                "complete"
              )
            } catch (error: any) {
              console.error(`Error processing ${file.name} with agentic AI:`, error)
              results.push({
                id: `${i + 1}`,
                name: file.name,
                email: "",
                phone: "",
                location: "",
                currentTitle: "",
                yearsOfExperience: 0,
                educationLevel: jobRequirements.educationLevel,
                matchScore: 0,
                matchedSkills: [],
                inferredSkills: [],
                additionalSkills: [],
                experience: [],
                aiAnalysis: `Agentic AI analysis failed: ${error?.message}`,
              })
            }
          }

          sendProgress(95, "✅ Finalizing agentic AI results...", "finalizing")

          // Send final results
          const resultData = JSON.stringify({
            type: 'result',
            candidates: results,
            meta: {
              agenticAI: true,
              totalFiles: files.length,
              timestamp: new Date().toISOString()
            }
          })
          controller.enqueue(encoder.encode(`data: ${resultData}\n\n`))

          controller.close()
        } catch (error: any) {
          const errorData = JSON.stringify({
            type: 'error',
            error: error?.message || "Agentic AI analysis failed"
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Agentic AI analysis failed", details: error?.message },
      { status: 500 }
    )
  }
}

// Import text extraction from main analyze route
// Note: You'll need to export extractTextFromFile from analyze/route.ts
// For now, using a simplified version - integrate with your existing extraction
async function extractTextFromFile(file: File): Promise<string> {
  // TODO: Import and use the actual extractTextFromFile from analyze/route.ts
  // This is a placeholder - replace with actual extraction
  try {
    // For PDF files
    if (file.type === 'application/pdf') {
      // Use your existing PDF extraction logic
      // For now, return placeholder
      return `[PDF content extracted from ${file.name}]`
    }
    // For DOCX files  
    if (file.type.includes('wordprocessingml')) {
      // Use your existing DOCX extraction logic
      return `[DOCX content extracted from ${file.name}]`
    }
    return `[Content extracted from ${file.name}]`
  } catch (error) {
    console.error(`Error extracting text from ${file.name}:`, error)
    return ``
  }
}

