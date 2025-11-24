export interface JobRequirements {
  jobTitle: string
  jobDescription: string
  requiredSkills: string[]
  minimumExperience: number
  educationLevel: string
  role?: string
}

export interface Experience {
  title: string
  company: string
  period: string
  description: string
}

export interface Candidate {
  id: string
  name: string
  email: string
  phone: string
  location: string
  currentTitle: string
  yearsOfExperience: number
  educationLevel: string
  matchScore: number
  matchedSkills: string[]
  inferredSkills: string[] // Related skills from ontology
  additionalSkills: string[]
  experience: Experience[]
  aiAnalysis: string
  // Experience helpfulness scoring (derived)
  experiencePointsAvg?: number
  experiencePointsTotal?: number
  experienceImpactBonus?: number
  experienceHelpful?: boolean
  experienceMatchedSkills?: string[]
  experienceAnalysis?: string
  // New: Projects and profile links
  projects?: Array<{ title: string; description: string; helpfulness?: string; points?: number }>
  projectAnalysis?: string
  projectPoints?: number
  profileLinks?: Array<{ url: string; label?: string }>
  profileAnalysis?: string
  profilePoints?: number
  profileExtra?: any
  profilesWithAnalysis?: Array<{ url: string; type: string; data: any; points: number; analysis: string; details: string; matchedSkills?: string[] }>
  linkedInUrl?: string | null // LinkedIn URL for async analysis
  checklist?: Array<{
    id: string
    text: string
    must: boolean
    passed: boolean
    coverage: number
    matchedTags: string[]
    missingTags: string[]
    confidence?: number
  }>
  // Agentic AI fields (optional - only present when agentic AI is used)
  agenticAI?: {
    strengths?: string[]
    weaknesses?: string[]
    culturalFit?: string
    scoreBreakdown?: {
      skillMatch?: number
      experienceMatch?: number
      educationMatch?: number
      culturalFit?: number
      additionalValue?: number
    }
    weightedScore?: number
    recommendation?: string // "strongly recommend" | "recommend" | "consider" | "not recommended"
    interviewQuestions?: string[]
    nextSteps?: string[]
    hiringManagerNote?: string
    workflowLog?: string[]
    confidence?: number
  }
}

