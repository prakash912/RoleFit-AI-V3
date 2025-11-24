/**
 * Agentic AI System for Resume Screening
 * 
 * This module implements an agent-based architecture where specialized AI agents
 * handle different aspects of resume analysis, making autonomous decisions and
 * coordinating their work.
 */

import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Export text extraction types for compatibility
export interface ExtractedContent {
  text: string
  links?: Array<{ url: string; label?: string }>
}

export interface AgentContext {
  resumeText: string
  jobRequirements: any
  jdTemplate: any
  previousResults?: any
  currentStage?: string
}

export interface AgentResult {
  success: boolean
  data: any
  confidence: number
  reasoning?: string
  nextActions?: string[]
}

/**
 * Base Agent Class - All agents extend this
 */
export abstract class BaseAgent {
  protected name: string
  protected model: string
  protected temperature: number

  constructor(name: string, model: string = "gpt-4o-mini", temperature: number = 0.2) {
    this.name = name
    this.model = model
    this.temperature = temperature
  }

  abstract execute(context: AgentContext): Promise<AgentResult>

  protected async callAI(systemPrompt: string, userPrompt: string, responseFormat?: any): Promise<any> {
    try {
      const completion = await openai.chat.completions.create({
        model: this.model,
        temperature: this.temperature,
        max_tokens: 2000,
        response_format: responseFormat || { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      })

      const content = completion.choices?.[0]?.message?.content || ""
      return JSON.parse(content)
    } catch (error: any) {
      console.error(`[${this.name}] AI call failed:`, error?.message)
      throw error
    }
  }
}

/**
 * Extraction Agent - Specialized in extracting structured data from resumes
 */
export class ExtractionAgent extends BaseAgent {
  constructor() {
    super("ExtractionAgent", "gpt-4o-mini", 0.1)
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const systemPrompt = `You are an expert data extraction agent. Your role is to extract structured information from resumes with high accuracy.
    
CRITICAL RULES:
1. Extract ONLY information that is explicitly stated in the resume
2. Do NOT infer or guess information
3. Return valid JSON with all extracted fields
4. Be precise and accurate`

    const userPrompt = `Extract the following information from this resume:

Resume Text:
"""
${context.resumeText.substring(0, 8000)}
"""

Return JSON with this structure:
{
  "name": "string",
  "email": "string or empty",
  "phone": "string or empty",
  "location": "string or empty",
  "currentTitle": "string or empty",
  "yearsOfExperience": number (calculate from work experience dates - sum all years from earliest start date to latest end date or present, be precise and accurate),
  "educationLevel": "string",
  "experience": [
    {
      "title": "string",
      "company": "string",
      "period": "string",
      "description": "string"
    }
  ],
  "skills": ["array of all technical skills mentioned"],
  "certifications": ["array of certifications"],
  "projects": ["array of project names or descriptions"],
  "languages": ["array of languages"],
  "extractionConfidence": number (0.0 to 1.0)
}`

    try {
      const result = await this.callAI(systemPrompt, userPrompt)
      return {
        success: true,
        data: result,
        confidence: result.extractionConfidence || 0.8,
        reasoning: "Successfully extracted structured data from resume"
      }
    } catch (error: any) {
      return {
        success: false,
        data: {},
        confidence: 0,
        reasoning: `Extraction failed: ${error?.message}`
      }
    }
  }
}

/**
 * Analysis Agent - Specialized in deep analysis and matching
 */
export class AnalysisAgent extends BaseAgent {
  constructor() {
    super("AnalysisAgent", "gpt-4o", 0.3) // Use GPT-4o for better reasoning
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const systemPrompt = `You are an expert technical recruiter and AI analysis agent. Your role is to perform deep analysis of candidates against job requirements.

CAPABILITIES:
- Understand candidate background and experience
- Match skills and qualifications against job requirements
- Identify strengths and weaknesses
- Provide detailed reasoning for your assessments
- Consider cultural fit and soft skills

ANALYSIS APPROACH:
1. Review candidate's experience and background
2. Compare against job requirements systematically
3. Identify both explicit matches and potential fits
4. Consider context and relevance
5. Provide balanced assessment`

    const jdItemsText = context.jdTemplate?.items?.map((item: any) => 
      `- ${item.text || item.id} (Must: ${item.must ? 'YES' : 'NO'})${item.tags ? `\n  Tags: ${Array.isArray(item.tags) ? item.tags.join(', ') : ''}` : ''}`
    ).join('\n') || ''

    const userPrompt = `Analyze this candidate against the job requirements:

JOB REQUIREMENTS:
Job Title: ${context.jobRequirements.jobTitle}
Job Description: ${context.jobRequirements.jobDescription}
Required Skills: ${context.jobRequirements.requiredSkills.join(", ")}
Minimum Experience: ${context.jobRequirements.minimumExperience} years
Education Level: ${context.jobRequirements.educationLevel}

JD CHECKLIST:
${jdItemsText}

CANDIDATE INFORMATION:
${JSON.stringify(context.previousResults?.extraction || {}, null, 2)}

RESUME TEXT:
"""
${context.resumeText.substring(0, 6000)}
"""

Perform a comprehensive analysis and return JSON with:
{
  "matchedSkills": ["skills explicitly found that match requirements"],
  "inferredSkills": ["related skills that might be relevant"],
  "additionalSkills": ["other valuable skills not in requirements"],
  "strengths": ["array of candidate strengths"],
  "weaknesses": ["array of potential concerns"],
  "culturalFit": "string (assessment of cultural fit)",
  "recommendation": "string (strong match / moderate match / weak match)",
  "reasoning": "string (detailed explanation of assessment)",
  "confidence": number (0.0 to 1.0),
  "potentialRisk": "string (low / medium / high)",
  "nextSteps": ["array of suggested next steps for this candidate"]
}`

    try {
      const result = await this.callAI(systemPrompt, userPrompt)
      return {
        success: true,
        data: result,
        confidence: result.confidence || 0.7,
        reasoning: result.reasoning || "Analysis completed",
        nextActions: result.nextSteps || []
      }
    } catch (error: any) {
      return {
        success: false,
        data: {},
        confidence: 0,
        reasoning: `Analysis failed: ${error?.message}`
      }
    }
  }
}

/**
 * Scoring Agent - Specialized in calculating accurate match scores
 */
export class ScoringAgent extends BaseAgent {
  constructor() {
    super("ScoringAgent", "gpt-4o-mini", 0.1)
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const systemPrompt = `You are an expert scoring agent. Your role is to calculate accurate match scores based on multiple factors.

SCORING CRITERIA:
1. Skill match (40%): How well skills align with requirements
2. Experience match (25%): Years and relevance of experience
3. Education match (15%): Education level and field relevance
4. Cultural fit (10%): Soft skills and cultural alignment
5. Additional value (10%): Extra skills or certifications that add value

SCORING APPROACH:
- Use weighted scoring based on job requirements
- Consider both explicit matches and inferred capabilities
- Provide detailed breakdown of score components
- Include confidence level for the score`

    const userPrompt = `Calculate a match score for this candidate:

CANDIDATE DATA:
${JSON.stringify(context.previousResults || {}, null, 2)}

JOB REQUIREMENTS:
${JSON.stringify(context.jobRequirements, null, 2)}

JD TEMPLATE WEIGHTS:
${JSON.stringify(context.jdTemplate?.weights || {}, null, 2)}

Return JSON with:
{
  "overallScore": number (0-100),
  "scoreBreakdown": {
    "skillMatch": number (0-100),
    "experienceMatch": number (0-100),
    "educationMatch": number (0-100),
    "culturalFit": number (0-100),
    "additionalValue": number (0-100)
  },
  "weightedScore": number (0-100, calculated using JD template weights),
  "confidence": number (0.0 to 1.0),
  "scoreExplanation": "string (explanation of how score was calculated)",
  "recommendation": "string (strongly recommend / recommend / consider / not recommended)"
}`

    try {
      const result = await this.callAI(systemPrompt, userPrompt)
      return {
        success: true,
        data: result,
        confidence: result.confidence || 0.8,
        reasoning: result.scoreExplanation || "Score calculated"
      }
    } catch (error: any) {
      return {
        success: false,
        data: {},
        confidence: 0,
        reasoning: `Scoring failed: ${error?.message}`
      }
    }
  }
}

/**
 * Recommendation Agent - Provides actionable recommendations
 */
export class RecommendationAgent extends BaseAgent {
  constructor() {
    super("RecommendationAgent", "gpt-4o", 0.4)
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const systemPrompt = `You are an expert recommendation agent. Your role is to provide actionable recommendations based on candidate analysis.

CAPABILITIES:
- Generate interview questions tailored to candidate
- Suggest areas to probe during interview
- Identify follow-up questions
- Recommend next steps in hiring process
- Provide hiring manager insights`

    const userPrompt = `Based on this candidate analysis, provide recommendations:

CANDIDATE ANALYSIS:
${JSON.stringify(context.previousResults || {}, null, 2)}

JOB REQUIREMENTS:
${JSON.stringify(context.jobRequirements, null, 2)}

Return JSON with:
{
  "recommendation": "string (strongly recommend / recommend / consider / not recommended)",
  "interviewQuestions": ["array of suggested interview questions"],
  "probeAreas": ["array of areas to explore further"],
  "strengthsToHighlight": ["array of strengths to discuss"],
  "concernsToAddress": ["array of concerns to verify"],
  "nextSteps": ["array of recommended next steps"],
  "hiringManagerNote": "string (insight for hiring manager)",
  "confidence": number (0.0 to 1.0)
}`

    try {
      const result = await this.callAI(systemPrompt, userPrompt)
      return {
        success: true,
        data: result,
        confidence: result.confidence || 0.7,
        reasoning: "Recommendations generated",
        nextActions: result.nextSteps || []
      }
    } catch (error: any) {
      return {
        success: false,
        data: {},
        confidence: 0,
        reasoning: `Recommendation failed: ${error?.message}`
      }
    }
  }
}

/**
 * Agent Orchestrator - Coordinates multiple agents
 */
export class AgentOrchestrator {
  private agents: BaseAgent[]
  private executionPlan: string[]

  constructor() {
    this.agents = [
      new ExtractionAgent(),
      new AnalysisAgent(),
      new ScoringAgent(),
      new RecommendationAgent()
    ]
    this.executionPlan = ["extraction", "analysis", "scoring", "recommendation"]
  }

  /**
   * Execute agent workflow with adaptive planning
   */
  async executeWorkflow(context: AgentContext): Promise<any> {
    const results: any = {}
    const workflowLog: string[] = []

    try {
      // Stage 1: Extraction
      workflowLog.push("🤖 Starting Extraction Agent...")
      const extractionAgent = this.agents[0] as ExtractionAgent
      const extractionResult = await extractionAgent.execute(context)
      results.extraction = extractionResult.data
      workflowLog.push(`✅ Extraction completed (confidence: ${extractionResult.confidence})`)

      if (!extractionResult.success) {
        workflowLog.push("⚠️ Extraction failed, continuing with fallback...")
      }

      // Update context with extraction results
      context.previousResults = results

      // Stage 2: Analysis
      workflowLog.push("🧠 Starting Analysis Agent...")
      const analysisAgent = this.agents[1] as AnalysisAgent
      const analysisResult = await analysisAgent.execute(context)
      results.analysis = analysisResult.data
      workflowLog.push(`✅ Analysis completed (confidence: ${analysisResult.confidence})`)

      // Stage 3: Scoring
      workflowLog.push("📊 Starting Scoring Agent...")
      const scoringAgent = this.agents[2] as ScoringAgent
      const scoringResult = await scoringAgent.execute(context)
      results.scoring = scoringResult.data
      workflowLog.push(`✅ Scoring completed (confidence: ${scoringResult.confidence})`)

      // Stage 4: Recommendation (only if score is moderate or high)
      if (scoringResult.data?.overallScore >= 40) {
        workflowLog.push("💡 Starting Recommendation Agent...")
        const recommendationAgent = this.agents[3] as RecommendationAgent
        const recommendationResult = await recommendationAgent.execute(context)
        results.recommendation = recommendationResult.data
        workflowLog.push(`✅ Recommendations generated (confidence: ${recommendationResult.confidence})`)
      } else {
        workflowLog.push("⏭️ Skipping recommendations (low score)")
        results.recommendation = {
          recommendation: "not recommended",
          nextSteps: ["Consider other candidates"]
        }
      }

      return {
        success: true,
        results,
        workflowLog,
        confidence: Math.min(
          extractionResult.confidence,
          analysisResult.confidence,
          scoringResult.confidence
        )
      }
    } catch (error: any) {
      workflowLog.push(`❌ Workflow failed: ${error?.message}`)
      return {
        success: false,
        results,
        workflowLog,
        error: error?.message
      }
    }
  }

  /**
   * Adaptive execution - agents can decide next steps
   */
  async executeAdaptive(context: AgentContext): Promise<any> {
    const results: any = {}
    const workflowLog: string[] = []

    // Extraction is always first
    workflowLog.push("🤖 Stage 1: Extraction...")
    const extractionAgent = this.agents[0] as ExtractionAgent
    const extractionResult = await extractionAgent.execute(context)
    results.extraction = extractionResult.data
    context.previousResults = results

    // Analysis agent decides if deep analysis is needed
    if (extractionResult.confidence > 0.5) {
      workflowLog.push("🧠 Stage 2: Deep Analysis...")
      const analysisAgent = this.agents[1] as AnalysisAgent
      const analysisResult = await analysisAgent.execute(context)
      results.analysis = analysisResult.data
      context.previousResults = results

      // Scoring agent uses analysis results
      workflowLog.push("📊 Stage 3: Intelligent Scoring...")
      const scoringAgent = this.agents[2] as ScoringAgent
      const scoringResult = await scoringAgent.execute(context)
      results.scoring = scoringResult.data

      // Adaptive: Only generate recommendations if score warrants it
      if (scoringResult.data?.overallScore >= 50) {
        workflowLog.push("💡 Stage 4: Generating Recommendations...")
        const recommendationAgent = this.agents[3] as RecommendationAgent
        const recommendationResult = await recommendationAgent.execute(context)
        results.recommendation = recommendationResult.data
      }
    } else {
      workflowLog.push("⚠️ Low extraction confidence, using fallback analysis")
    }

    return {
      success: true,
      results,
      workflowLog
    }
  }
}

/**
 * Advanced Agentic Features
 */

export class SelfCorrectingAgent extends BaseAgent {
  constructor() {
    super("SelfCorrectingAgent", "gpt-4o", 0.3)
  }

  async executeWithCorrection(context: AgentContext, initialResult: any): Promise<AgentResult> {
    // First pass
    let result = await this.execute(context)
    
    // Self-correction if confidence is low
    if (result.confidence < 0.7) {
      const correctionPrompt = `Review and correct this analysis. The confidence was low (${result.confidence}). 
      
Original Result:
${JSON.stringify(result.data, null, 2)}

Context:
${JSON.stringify(context, null, 2)}

Please provide a corrected and improved analysis.`

      try {
        const corrected = await this.callAI(
          "You are a self-correcting agent. Review and improve your previous analysis.",
          correctionPrompt
        )
        result = {
          ...result,
          data: corrected,
          confidence: Math.min(1.0, result.confidence + 0.2),
          reasoning: "Self-corrected analysis with improved confidence"
        }
      } catch (error) {
        // Keep original result if correction fails
      }
    }

    return result
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    // Base implementation - override in subclasses
    return {
      success: true,
      data: {},
      confidence: 0.5
    }
  }
}

/**
 * Multi-Agent Collaboration
 */
export class CollaborativeAgentSystem {
  private agents: Map<string, BaseAgent>

  constructor() {
    this.agents = new Map()
    this.agents.set("extraction", new ExtractionAgent())
    this.agents.set("analysis", new AnalysisAgent())
    this.agents.set("scoring", new ScoringAgent())
    this.agents.set("recommendation", new RecommendationAgent())
  }

  async collaborate(context: AgentContext, agentNames: string[]): Promise<any> {
    const results: any = {}
    
    // Run agents in parallel where possible
    const promises = agentNames.map(async (name) => {
      const agent = this.agents.get(name)
      if (!agent) return null
      
      return {
        agent: name,
        result: await agent.execute(context)
      }
    })

    const agentResults = await Promise.all(promises)
    
    agentResults.forEach((ar) => {
      if (ar) {
        results[ar.agent] = ar.result
      }
    })

    return results
  }
}

