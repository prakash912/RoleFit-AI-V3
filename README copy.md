# Complete Resume Analysis System - Detailed Step-by-Step Guide

## 📚 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [File Upload & Processing](#file-upload--processing)
4. [Text Extraction Process](#text-extraction-process)
5. [AI Analysis Pipeline](#ai-analysis-pipeline)
6. [Skill Matching System](#skill-matching-system)
7. [JD Checklist Matching](#jd-checklist-matching)
8. [Experience Analysis](#experience-analysis)
9. [Project Extraction & Analysis](#project-extraction--analysis)
10. [Profile Link Analysis](#profile-link-analysis)
11. [Scoring System](#scoring-system)
12. [Technical vs Non-Technical Resumes](#technical-vs-non-technical-resumes)
13. [Complete Flow Example](#complete-flow-example)
14. [Error Handling & Edge Cases](#error-handling--edge-cases)

---

## 🎯 Overview

This document provides a **complete, detailed explanation** of how the resume analysis system works, covering every step from file upload to final scoring. The system handles both **technical resumes** (software engineers, developers) and **non-technical resumes** (marketing, sales, HR, etc.).

### Key Capabilities

- **Multi-format Support**: PDF and DOCX files
- **Intelligent Extraction**: Extracts text, hyperlinks, and structured data
- **AI-Powered Analysis**: Uses GPT-4o-mini and GPT-4o for analysis
- **Smart Matching**: Matches skills using ontology and keyword matching
- **Weighted Scoring**: Calculates match scores based on JD templates
- **Profile Analysis**: Analyzes GitHub, LinkedIn, and other profiles
- **Project Detection**: Identifies and evaluates personal projects

---

## 🏗️ System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER UPLOADS RESUME                      │
│              (PDF or DOCX file via web form)                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 1: FILE VALIDATION                        │
│  - Check file type (PDF/DOCX)                                │
│  - Validate file size (< 10MB)                              │
│  - Check file count (max 20 files)                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 2: TEXT EXTRACTION                        │
│  PDF: pdfjs-dist → pdf-lib → pdf-parse (fallback)           │
│  DOCX: mammoth.js → HTML parsing → XML parsing (fallback)    │
│  Output: { text: string, links: Array<{url, text}> }        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 3: AI ANALYSIS                            │
│  Model: GPT-4o-mini (temperature: 0.1)                     │
│  Role: "Expert technical recruiter and resume analyst"      │
│  Extracts: Name, Email, Phone, Location, Title,            │
│            Experience, Skills, Education                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 4: SKILL MATCHING                         │
│  - Direct matching (exact string match)                      │
│  - Ontology matching (React → JavaScript, JSX)              │
│  - Related skills inference                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 5: JD CHECKLIST MATCHING                 │
│  - For each JD item, check if tags are present              │
│  - Calculate coverage percentage                            │
│  - Mark as passed/failed                                    │
│  - Calculate weighted score                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 6: EXPERIENCE ANALYSIS                    │
│  - Analyze work experience descriptions                     │
│  - Match required skills in experience text                  │
│  - Calculate experience bonus points                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 7: PROJECT EXTRACTION                    │
│  - Extract personal projects from resume                     │
│  - Evaluate project relevance to job                        │
│  - Award project points                                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 8: PROFILE ANALYSIS                      │
│  - Detect GitHub, LinkedIn, LeetCode profiles               │
│  - Fetch GitHub contribution data                           │
│  - Analyze LinkedIn profile (if available)                │
│  - Award profile points                                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 9: SCORE CALCULATION                      │
│  Base Score = (earnedWeight / totalWeight) * 100             │
│  Final Score = Base + Experience Bonus +                    │
│                Project Points + Profile Points              │
│  (Capped at 100)                                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 10: RANKING & RESULTS                     │
│  - Sort candidates by score (highest first)                  │
│  - Generate detailed candidate reports                      │
│  - Export to Excel or PDF                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📤 File Upload & Processing

### Step 1.1: File Reception

**Location**: `app/api/analyze/route.ts` - `POST` handler

**Process**:

```typescript
// 1. Receive FormData from frontend
const form = await req.formData()

// 2. Extract files
const files = form.getAll("files") as File[]

// 3. Extract job requirements
const jobStr = form.get("jobRequirements") as string
const job = JSON.parse(jobStr) as JobRequirements

// 4. Check if Agentic AI is enabled
const useAgenticAI = form.get("useAgenticAI") === "true"
```

**Validation Checks**:

1. **File Count Check**:
   ```typescript
   if (files.length > 20) {
     sendError(controller, "Too many files. Maximum 20 files allowed.")
     return
   }
   ```

2. **File Type Check** (done during extraction):
   - Only `.pdf` and `.docx` files are processed
   - Other file types are rejected

3. **Job Requirements Validation**:
   ```typescript
   if (!job.jobTitle || !job.jobDescription || !Array.isArray(job.requiredSkills)) {
     sendError(controller, "Invalid job requirements")
     return
   }
   ```

---

## 📄 Text Extraction Process

### Step 2.1: PDF Text Extraction

**Location**: `app/api/analyze/route.ts` - `extractTextFromPdf()` function

**Method 1: pdf-lib (Hyperlink Extraction)**

```typescript
// Extract hyperlinks from PDF annotations
const { PDFDocument } = await import("pdf-lib")
const pdfDoc = await PDFDocument.load(buffer)

// Iterate through pages
for (const page of pages) {
  const annots = page.node.get(PDFName.of("Annots"))
  
  // Extract link annotations
  for (const annot of annots) {
    const uri = annot.get(PDFName.of("URI"))
    // Extract URL and link text
  }
}
```

**Purpose**: Extracts clickable hyperlinks (GitHub, LinkedIn URLs)

**Method 2: pdfjs-dist (Primary Text Extraction)**

```typescript
// Load PDF.js library
const pdfjsLib = await loadPdfjs()

// Load PDF document
const loadingTask = pdfjsLib.getDocument({
  data: buffer,
  disableWorker: true,
  useWorkerFetch: false
})

const pdfDocument = await loadingTask.promise

// Extract text from each page
for (let pageNum = 1; pageNum <= numPages; pageNum++) {
  const page = await pdfDocument.getPage(pageNum)
  const textContent = await page.getTextContent()
  
  // Combine all text items
  const pageText = textContent.items.map(item => item.str).join(" ")
  textLines.push(pageText)
}
```

**Purpose**: Extracts all visible text from PDF (skills, experience, education)

**Method 3: pdfjs-dist Annotations (Link Text Matching)**

```typescript
// Get annotations (hyperlinks)
const annots = await page.getAnnotations({ intent: "display" })

for (const annotation of annots) {
  const url = annotation.url || annotation.unsafeUrl
  
  // Find text that overlaps with annotation rectangle
  // This matches link text (e.g., "GitHub") with the URL
  const overlappingText = findTextInRect(annotation.rect)
  
  links.push({ text: overlappingText, url: url })
}
```

**Purpose**: Matches link text (e.g., "GitHub") with actual URLs

**Method 4: pdf-parse (Fallback)**

```typescript
// If pdfjs-dist fails, use pdf-parse
if (!text) {
  const pdfParse = await import("pdf-parse")
  const parsed = await pdfParse(buffer)
  text = parsed.text
}
```

**Purpose**: Fallback method if primary extraction fails

**Method 5: Regex URL Extraction**

```typescript
// Extract visible URLs from text
const urlPattern = /https?:\/\/[\w.-]+\.[\w./#?=&%~+-]+/gi
for (const match of text.matchAll(urlPattern)) {
  links.push({ text: "", url: match[0] })
}
```

**Purpose**: Catches URLs that weren't extracted as hyperlinks

---

### Step 2.2: DOCX Text Extraction

**Location**: `app/api/analyze/route.ts` - `extractTextFromDocx()` function

**Method 1: mammoth.js HTML Conversion (Primary)**

```typescript
const mammoth = await import("mammoth")

// Convert DOCX to HTML
const htmlResult = await mammoth.convertToHtml({ buffer })
const html = htmlResult.value

// Extract text (remove HTML tags)
text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

// Extract hyperlinks from <a href> tags
const linkPattern = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi

let match
while ((match = linkPattern.exec(html)) !== null) {
  const url = match[1]  // URL
  const linkText = match[2]  // Link text (e.g., "GitHub")
  
  // Normalize URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }
  
  links.push({ text: linkText, url: url })
}
```

**Purpose**: Extracts text and hyperlinks from DOCX files

**Method 2: mammoth.js Raw Text (Fallback)**

```typescript
// If HTML conversion fails
if (!text) {
  const textResult = await mammoth.extractRawText({ buffer })
  text = textResult.value || ''
}
```

**Purpose**: Fallback text extraction if HTML conversion fails

**Method 3: Direct XML Parsing (Advanced Fallback)**

```typescript
// Parse DOCX as ZIP archive
const JSZip = await import("jszip")
const zip = await JSZip.loadAsync(buffer)

// Read document.xml and relationships
const documentXml = await zip.file("word/document.xml")?.async("string")
const relationshipsXml = await zip.file("word/_rels/document.xml.rels")?.async("string")

// Parse relationships to map link IDs to URLs
const relMap = new Map()
const relMatches = relationshipsXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"[^>]*\/>/gi)

for (const match of relMatches) {
  relMap.set(match[1], match[2])  // ID → URL
}

// Parse document.xml to find hyperlinks
const hyperlinkPattern = /<w:hyperlink[^>]+r:id="([^"]+)"[^>]*>([\s\S]*?)<\/w:hyperlink>/gi
// Match hyperlink IDs with URLs from relMap
```

**Purpose**: Advanced fallback for hyperlink extraction

---

### Step 2.3: Text Extraction Output

**Format**:
```typescript
interface ExtractedContent {
  text: string        // All text from resume
  links: Array<{      // Extracted hyperlinks
    text: string      // Link text (e.g., "GitHub")
    url: string       // Actual URL
  }>
}
```

**Example Output**:
```typescript
{
  text: "John Doe\nSoftware Engineer\nEmail: john@example.com\n...",
  links: [
    { text: "GitHub", url: "https://github.com/johndoe" },
    { text: "LinkedIn", url: "https://linkedin.com/in/johndoe" }
  ]
}
```

---

## 🤖 AI Analysis Pipeline

### Step 3.1: AI Model Configuration

**Model**: GPT-4o-mini  
**Temperature**: 0.1 (low for consistency)  
**Max Tokens**: 2000  
**Response Format**: JSON object (forced)

**AI Role**:
```
"You are an expert technical recruiter and resume analyst. 
Your task is to accurately analyze resumes against comprehensive job requirements.

CRITICAL RULES:
1. Only match skills/technologies that are EXPLICITLY mentioned in the resume text
2. Do NOT infer or guess skills that are not directly stated
3. Be very strict - only claim a skill is present if you find clear evidence in the resume
4. Return valid JSON only, no commentary or markdown
5. Extract accurate information from the resume text"
```

---

### Step 3.2: AI Prompt Construction

**Location**: `app/api/analyze/route.ts` - `analyzeWithOpenAI()` function

**System Prompt**:
```typescript
const system = `You are an expert technical recruiter and resume analyst...`
```

**User Prompt Structure**:
```typescript
const user = `Analyze this resume against the comprehensive job requirements below.

JOB REQUIREMENTS:
Job Title: ${job.jobTitle}
Job Description: ${job.jobDescription}
Required Skills: ${job.requiredSkills.join(", ")}
Minimum Experience: ${job.minimumExperience} years
Education Level: ${job.educationLevel}

JD CHECKLIST ITEMS:
${jdItemsText}  // Formatted JD template items

RESUME TEXT:
"""
${resumeText}  // Extracted text from resume
"""

Return JSON with this EXACT structure:
{
  "name": "string from resume",
  "email": "string from resume or empty",
  "phone": "string from resume or empty",
  "location": "string from resume or empty",
  "currentTitle": "string from resume or empty",
  "yearsOfExperience": number (calculate from work experience dates),
  "educationLevel": "string from resume",
  "matchedSkills": ["only skills explicitly found in resume"],
  "additionalSkills": ["other technical skills found"],
  "experience": [
    {
      "title": "string",
      "company": "string",
      "period": "string",
      "description": "string"
    }
  ],
  "aiAnalysis": "detailed analysis of how well candidate matches job"
}`
```

---

### Step 3.3: AI API Call

**Process**:

```typescript
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  temperature: 0.1,
  max_tokens: 2000,
  response_format: { type: "json_object" },
  messages: [
    { role: "system", content: system },
    { role: "user", content: user }
  ]
})

const content = completion.choices?.[0]?.message?.content || ""
```

**Retry Logic**:
- **Max Attempts**: 3
- **Retry Conditions**: Rate limit errors (429 status)
- **Backoff Strategy**: Exponential (2s, 4s, 8s)

```typescript
for (let attempt = 0; attempt <= 2; attempt++) {
  try {
    const completion = await openai.chat.completions.create(...)
    // Success - parse and return
  } catch (e) {
    if (e?.status === 429 && attempt < 2) {
      const delay = Math.pow(2, attempt) * 2000
      await new Promise(resolve => setTimeout(resolve, delay))
      continue  // Retry
    }
    // Fail after max attempts
  }
}
```

---

### Step 3.4: JSON Parsing & Cleaning

**Process**:

```typescript
// 1. Remove markdown code blocks
let jsonStr = content.trim()
jsonStr = jsonStr.replace(/^```json\s*/i, '')
                 .replace(/^```\s*/i, '')
                 .replace(/\s*```$/i, '')

// 2. Clean JSON string (remove trailing commas, fix quotes)
jsonStr = cleanJsonString(jsonStr)

// 3. Parse JSON
let parsed = JSON.parse(jsonStr)

// 4. Fallback: Extract JSON block if direct parse fails
if (parseError) {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    parsed = JSON.parse(cleanJsonString(jsonMatch[0]))
  }
}
```

**Extracted Data Structure**:
```typescript
{
  name: "John Doe",
  email: "john@example.com",
  phone: "+1-234-567-8900",
  location: "San Francisco, CA",
  currentTitle: "Senior Software Engineer",
  yearsOfExperience: 5.5,  // Calculated from work dates
  educationLevel: "Bachelor's",
  matchedSkills: ["React", "Node.js", "TypeScript"],
  additionalSkills: ["Docker", "AWS", "MongoDB"],
  experience: [
    {
      title: "Senior Software Engineer",
      company: "Tech Corp",
      period: "2020 - Present",
      description: "Led development of..."
    }
  ],
  aiAnalysis: "Candidate has strong experience in..."
}
```

---

## 🎯 Skill Matching System

### Step 4.1: Direct Skill Matching

**Process**:

```typescript
// Normalize skills for comparison
function normalize(skill: string): string {
  return skill
    .toLowerCase()
    .replace(/[^a-z0-9\s/+.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// Direct matching
const matchedSkills: string[] = []
const requiredSkills = job.requiredSkills

for (const requiredSkill of requiredSkills) {
  const normalizedRequired = normalize(requiredSkill)
  
  for (const candidateSkill of candidateSkills) {
    const normalizedCandidate = normalize(candidateSkill)
    
    // Exact match
    if (normalizedRequired === normalizedCandidate) {
      matchedSkills.push(requiredSkill)
      break
    }
    
    // Contains match (e.g., "React" matches "React.js")
    if (normalizedCandidate.includes(normalizedRequired) || 
        normalizedRequired.includes(normalizedCandidate)) {
      matchedSkills.push(requiredSkill)
      break
    }
  }
}
```

**Example**:
- Required: `["React", "Node.js"]`
- Candidate Skills: `["React.js", "React Native", "Node", "Express"]`
- Matched: `["React", "Node.js"]` (React.js → React, Node → Node.js)

---

### Step 4.2: Ontology-Based Matching

**Location**: `lib/skill-ontology.ts`

**Concept**: Skill ontology maps related skills together

**Example Ontology**:
```typescript
export const TAG_ONTOLOGY: Record<string, SkillRelation> = {
  react: {
    exact: ["react", "reactjs", "react.js"],  // Exact synonyms
    similar: ["react native", "nextjs"],        // Similar skills
    related: ["jsx", "hooks", "redux"]         // Related skills
  },
  node: {
    exact: ["node", "nodejs", "node.js"],
    similar: ["express", "nest", "fastify"],
    related: ["npm", "yarn", "package.json"]
  }
}
```

**Matching Process**:

```typescript
function isRelatedSkill(skill: string, target: string): boolean {
  const normalizedSkill = normalize(skill)
  const normalizedTarget = normalize(target)
  
  // Check ontology
  for (const [key, relation] of Object.entries(TAG_ONTOLOGY)) {
    // Check if skill matches target's exact synonyms
    if (relation.exact.includes(normalizedTarget)) {
      if (relation.exact.includes(normalizedSkill) ||
          relation.similar.includes(normalizedSkill) ||
          relation.related.includes(normalizedSkill)) {
        return true
      }
    }
  }
  
  return false
}
```

**Example**:
- Required: `["React"]`
- Candidate has: `["JSX", "Redux"]`
- Result: `["React"]` is matched (JSX and Redux are related to React)

---

### Step 4.3: Inferred Skills

**Process**:

```typescript
const inferredSkills: string[] = []

for (const matchedSkill of matchedSkills) {
  // Find related skills in ontology
  const relation = TAG_ONTOLOGY[normalize(matchedSkill)]
  
  if (relation) {
    // Check if candidate has related skills
    for (const relatedSkill of relation.related) {
      if (candidateSkills.includes(relatedSkill)) {
        inferredSkills.push(relatedSkill)
      }
    }
  }
}
```

**Example**:
- Matched: `["React"]`
- Candidate has: `["JSX", "Hooks", "Redux"]`
- Inferred: `["JSX", "Hooks", "Redux"]` (inferred from React)

---

### Step 4.4: Additional Skills

**Process**:

```typescript
const additionalSkills: string[] = []

for (const candidateSkill of candidateSkills) {
  // Check if skill is not in required skills
  const isRequired = requiredSkills.some(req => 
    normalize(req) === normalize(candidateSkill)
  )
  
  // Check if skill is not inferred
  const isInferred = inferredSkills.some(inf => 
    normalize(inf) === normalize(candidateSkill)
  )
  
  if (!isRequired && !isInferred) {
    additionalSkills.push(candidateSkill)
  }
}
```

**Purpose**: Identifies skills candidate has that aren't required (bonus points)

---

## 📋 JD Checklist Matching

### Step 5.1: JD Template Structure

**Format**:
```typescript
interface JDTemplate {
  role: string
  weights: {
    [category: string]: number  // Must sum to 1.0 (100%)
  }
  items: Array<{
    id: string              // Must match a weight key
    text: string            // Description
    must: boolean           // Must-have item
    tags: string[]         // Required tags/skills
    veryMust?: string[]    // Critical tags (must have all)
  }>
}
```

**Example**:
```typescript
{
  role: "software_engineer",
  weights: {
    cloud_devops: 0.25,    // 25%
    frontend: 0.20,        // 20%
    backend: 0.20,         // 20%
    database: 0.15,        // 15%
    testing: 0.10,         // 10%
    soft_skills: 0.10     // 10%
  },
  items: [
    {
      id: "cloud_devops",
      text: "Cloud and DevOps experience",
      must: true,
      tags: ["AWS", "Docker", "Kubernetes"],
      veryMust: ["AWS", "Docker"]  // Critical
    },
    {
      id: "frontend",
      text: "Frontend development skills",
      must: false,
      tags: ["React", "TypeScript", "CSS"]
    }
  ]
}
```

---

### Step 5.2: JD Item Matching Process

**Location**: `app/api/analyze/route.ts` - JD checklist matching function

**For Each JD Item**:

```typescript
async function matchJDItem(
  item: JDItem,
  resumeText: string,
  extractedSkills: string[]
): Promise<{
  passed: boolean
  coverage: number
  matchedTags: string[]
  missingTags: string[]
}> {
  
  // Step 1: Check if critical tags (veryMust) are present
  let veryMustOk = true
  if (item.veryMust && item.veryMust.length > 0) {
    for (const criticalTag of item.veryMust) {
      const found = extractedSkills.some(skill => 
        normalize(skill).includes(normalize(criticalTag))
      ) || resumeText.toLowerCase().includes(normalize(criticalTag))
      
      if (!found) {
        veryMustOk = false
        break
      }
    }
  }
  
  // Step 2: Count matched tags
  const matchedTags: string[] = []
  const missingTags: string[] = []
  
  for (const tag of item.tags) {
    const found = extractedSkills.some(skill => 
      normalize(skill).includes(normalize(tag))
    ) || resumeText.toLowerCase().includes(normalize(tag))
    
    if (found) {
      matchedTags.push(tag)
    } else {
      missingTags.push(tag)
    }
  }
  
  // Step 3: Calculate coverage
  const coverage = matchedTags.length / item.tags.length
  
  // Step 4: Determine if passed
  let passed = false
  
  if (item.must) {
    // Must-have: requires 100% coverage AND all critical tags
    passed = coverage === 1.0 && veryMustOk
  } else {
    // Optional: requires 60% coverage OR all critical tags
    passed = coverage >= 0.6 || veryMustOk
  }
  
  return {
    passed,
    coverage,
    matchedTags,
    missingTags
  }
}
```

---

### Step 5.3: AI-Powered JD Matching (Alternative)

**For Complex Matching**:

```typescript
const system = `You are an expert JD requirement analyzer. 
Analyze if specific job requirements are met in a resume.

CRITICAL RULES:
1. Only match tags that are EXPLICITLY mentioned in the resume
2. Be very strict - do NOT infer skills that are not directly stated
3. Return valid JSON only`

const prompt = `Analyze if these requirements are met:

JD Item: ${item.text}
Required Tags: ${item.tags.join(", ")}
Critical Tags: ${item.veryMust?.join(", ") || "None"}

Resume Text:
"""
${resumeText}
"""

Return JSON:
{
  "matched": ["array of matched tags"],
  "missing": ["array of missing tags"],
  "coverage": 0.0-1.0,
  "veryMustOk": true/false
}`

const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  temperature: 0.1,
  messages: [
    { role: "system", content: system },
    { role: "user", content: prompt }
  ]
})
```

---

### Step 5.4: Weighted Score Calculation

**Process**:

```typescript
let earnedWeight = 0
let totalWeight = 0

for (const item of jdTemplate.items) {
  const weight = jdTemplate.weights[item.id] || 0
  totalWeight += weight
  
  const matchResult = await matchJDItem(item, resumeText, skills)
  
  if (matchResult.passed) {
    // Full credit
    earnedWeight += weight
  } else if (item.must) {
    // Must-have failure: 0 points
    earnedWeight += 0
  } else {
    // Optional item: partial credit based on coverage
    earnedWeight += weight * matchResult.coverage
  }
}

// Base score (0-100)
const baseScore = (earnedWeight / totalWeight) * 100
```

**Example Calculation**:

```
JD Template:
- cloud_devops (25%, must): PASSED → +25
- frontend (20%, optional): 80% coverage → +16 (20 * 0.8)
- backend (20%, optional): FAILED → +0
- database (15%, optional): 100% coverage → +15
- testing (10%, optional): 50% coverage → +5 (10 * 0.5)
- soft_skills (10%, optional): PASSED → +10

Total Weight: 100%
Earned Weight: 25 + 16 + 0 + 15 + 5 + 10 = 71
Base Score: (71 / 100) * 100 = 71
```

---

## 💼 Experience Analysis

### Step 6.1: Experience Extraction

**Already Extracted by AI**:
```typescript
experience: [
  {
    title: "Senior Software Engineer",
    company: "Tech Corp",
    period: "2020 - Present",
    description: "Led development of React applications..."
  }
]
```

---

### Step 6.2: Experience Skill Matching

**Process**:

```typescript
function analyzeExperience(
  experience: Experience[],
  requiredSkills: string[]
): {
  matchedSkills: string[]
  points: number
  analysis: string
} {
  
  const matchedSkills: string[] = []
  let totalPoints = 0
  
  for (const exp of experience) {
    const expText = `${exp.title} ${exp.description}`.toLowerCase()
    
    // Check each required skill
    for (const skill of requiredSkills) {
      const normalizedSkill = normalize(skill)
      
      // Check if skill appears in experience
      if (expText.includes(normalizedSkill)) {
        if (!matchedSkills.includes(skill)) {
          matchedSkills.push(skill)
        }
        totalPoints += 2  // 2 points per skill match
      }
    }
  }
  
  // Cap at 10 points
  const points = Math.min(10, totalPoints)
  
  return {
    matchedSkills,
    points,
    analysis: `Found ${matchedSkills.length} required skills in experience`
  }
}
```

**Example**:
- Required Skills: `["React", "Node.js", "AWS"]`
- Experience: "Developed React applications using Node.js backend"
- Matched: `["React", "Node.js"]`
- Points: 4 (2 points each)

---

### Step 6.3: Experience Bonus Calculation

**Formula**:
```typescript
// Base: 2 points per skill found in experience
let experiencePoints = matchedSkills.length * 2

// Bonus for years of experience
if (yearsOfExperience >= job.minimumExperience) {
  experiencePoints += 2
}

// Cap at 10 points
const experienceBonus = Math.min(10, experiencePoints)
```

---

## 🚀 Project Extraction & Analysis

### Step 7.1: Project Extraction

**Location**: `app/api/analyze/route.ts` - `extractProjects()` function

**Method 1: AI Extraction (Primary)**

```typescript
const system = `You are a resume parser. 
Extract ONLY personal projects/portfolio items. 
Exclude work experience, job roles, technologies, skills, education.`

const user = `Extract ONLY personal/portfolio projects from this resume.

Return JSON array: [{"title": "Project Name", "description": "Brief description"}]

Resume text:
"""
${resumeText}
"""

Return ONLY actual projects. If no projects found, return [].`

const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  temperature: 0.1,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ]
})
```

**Method 2: Pattern-Based Extraction (Fallback)**

```typescript
// Find PROJECTS section
const sectionPattern = /(?:^|\n)\s*(PROJECTS?|PERSONAL\s+PROJECTS?|PORTFOLIO)\s*(?:[:\-]|\n)/i
const sectionMatch = text.match(sectionPattern)

if (sectionMatch) {
  const searchStart = sectionMatch.index + sectionMatch[0].length
  
  // Find next section (EXPERIENCE, EDUCATION, etc.)
  const nextSection = text.substring(searchStart).match(
    /\n\s*(EXPERIENCE|EDUCATION|SKILLS)\s*(?:[:\-]|\n)/i
  )
  const searchEnd = nextSection ? searchStart + nextSection.index : text.length
  
  // Extract projects from this section
  const projectsSection = text.substring(searchStart, searchEnd)
  const lines = projectsSection.split(/\n/).map(l => l.trim())
  
  // Parse project titles and descriptions
  let currentProject = null
  for (const line of lines) {
    // Detect project title (capitalized, reasonable length)
    if (/^[A-Z][a-z]/.test(line) && line.length >= 5 && line.length <= 80) {
      if (currentProject) {
        projects.push(currentProject)
      }
      currentProject = { title: line, description: '' }
    } else if (currentProject && line.length > 10) {
      currentProject.description += ' ' + line
    }
  }
}
```

---

### Step 7.2: Project Filtering

**Exclude Patterns**:
```typescript
// Exclude job titles
if (/\b(software engineer|developer|engineer|manager)\b/i.test(title)) {
  return false
}

// Exclude dates
if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\s*[-\–]/i.test(title)) {
  return false
}

// Exclude technology lists
if (/^(technologies|tech stack|skills|tools):?/i.test(title)) {
  return false
}

// Exclude education
if (/\b(university|college|degree|bachelor|master|phd)\b/i.test(title)) {
  return false
}
```

---

### Step 7.3: Project Relevance Analysis

**Process**:

```typescript
async function evaluateProject(
  project: { title: string; description: string },
  job: JobRequirements
): Promise<{
  points: number
  helpfulness: string
}> {
  
  const system = `You are a concise recruiting assistant. Return valid JSON only.`
  
  const user = `Evaluate how this project helps the candidate fit for this JD.

JD: ${job.jobTitle}
Required Skills: ${job.requiredSkills.join(', ')}

Project: "${project.title}"
Description: ${project.description}

Return JSON: {
  "points": 0-3,
  "helpfulness": "brief explanation"
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    max_tokens: 200,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  })
  
  const result = JSON.parse(completion.choices[0].message.content)
  return {
    points: result.points || 0,
    helpfulness: result.helpfulness || ''
  }
}
```

**Scoring**:
- **0 points**: Not relevant
- **1 point**: Somewhat relevant
- **2 points**: Relevant
- **3 points**: Highly relevant

**Total Project Points**: Sum of all project points (capped at 15)

---

## 🔗 Profile Link Analysis

### Step 8.1: Profile Link Extraction

**Already Extracted During Text Extraction**:
```typescript
links: [
  { text: "GitHub", url: "https://github.com/johndoe" },
  { text: "LinkedIn", url: "https://linkedin.com/in/johndoe" }
]
```

**Supported Platforms**:
- GitHub
- LinkedIn
- LeetCode
- GeeksforGeeks
- HackerRank
- Kaggle
- GitLab
- Codeforces

---

### Step 8.2: GitHub Profile Analysis

**Process**:

```typescript
async function analyzeGitHubProfile(
  username: string,
  job: JobRequirements
): Promise<{
  contributions: number
  repositories: number
  points: number
  analysis: string
}> {
  
  // Method 1: GraphQL API (if token available)
  if (process.env.GITHUB_TOKEN) {
    const query = `
      query {
        user(login: "${username}") {
          contributionsCollection(from: "${threeYearsAgo}", to: "${now}") {
            totalCommitContributions
            totalIssueContributions
            totalPullRequestContributions
          }
          repositories {
            totalCount
          }
        }
      }
    `
    
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    })
    
    const data = await response.json()
    // Extract contribution data
  }
  
  // Method 2: SVG Scraping (fallback)
  else {
    // Scrape contribution graph SVG
    const svgUrl = `https://github.com/users/${username}/contributions`
    const svgResponse = await fetch(svgUrl)
    const svgText = await svgResponse.text()
    
    // Parse SVG to extract contribution data
    const contributionMatches = svgText.matchAll(/data-count="(\d+)"/g)
    let totalContributions = 0
    for (const match of contributionMatches) {
      totalContributions += parseInt(match[1])
    }
  }
  
  // Calculate points based on contributions
  let points = 0
  if (totalContributions > 1000) points = 4
  else if (totalContributions > 500) points = 3
  else if (totalContributions > 200) points = 2
  else if (totalContributions > 50) points = 1
  
  return {
    contributions: totalContributions,
    repositories: repoCount,
    points,
    analysis: `High GitHub activity with ${totalContributions} contributions`
  }
}
```

---

### Step 8.3: LinkedIn Profile Analysis

**Process**:

```typescript
async function analyzeLinkedInProfile(
  linkedInUrl: string,
  job: JobRequirements
): Promise<{
  points: number
  analysis: string
  details: string
}> {
  
  // Normalize LinkedIn URL
  const normalizedUrl = normalizeLinkedInUrl(linkedInUrl)
  
  // Fetch LinkedIn snapshot (using external service)
  const snapshot = await fetchLinkedInSnapshot(normalizedUrl)
  
  if (snapshot) {
    // Parse LinkedIn data
    const parsed = parseLinkedInSnapshot(snapshot)
    
    // Analyze against job requirements
    const system = `You are an expert technical recruiter analyzing a LinkedIn profile.`
    
    const user = `Analyze this LinkedIn profile against the job description:

Job Title: ${job.jobTitle}
Required Skills: ${job.requiredSkills.join(', ')}

LinkedIn Profile:
${parsed.headline}
${parsed.description}
Skills: ${parsed.skills.join(', ')}
Experience: ${parsed.experience.map(e => `${e.title} at ${e.company}`).join(', ')}

Return JSON: {
  "points": 0-4,
  "analysis": "brief analysis",
  "details": "detailed assessment"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
    
    return JSON.parse(completion.choices[0].message.content)
  }
  
  return { points: 0, analysis: '', details: '' }
}
```

---

## 📊 Scoring System

### Step 9.1: Base Score Calculation

**Formula**:
```typescript
Base Score = (earnedWeight / totalWeight) * 100
```

**Example**:
- Total Weight: 100%
- Earned Weight: 71%
- Base Score: 71

---

### Step 9.2: Bonus Points

**Experience Bonus**:
```typescript
experienceBonus = Math.min(10, experiencePoints)
```

**Project Points**:
```typescript
projectPoints = Math.min(15, sum of all project points)
```

**Profile Points**:
```typescript
profilePoints = Math.min(10, sum of all profile points)
```

---

### Step 9.3: Final Score

**Formula**:
```typescript
Final Score = Base Score + Experience Bonus + Project Points + Profile Points
Final Score = Math.min(100, Final Score)  // Cap at 100
```

**Example**:
- Base Score: 71
- Experience Bonus: 8
- Project Points: 5
- Profile Points: 3
- **Final Score**: 71 + 8 + 5 + 3 = **87**

---

## 🔧 Technical vs Non-Technical Resumes

### Technical Resumes

**Characteristics**:
- Programming languages and frameworks
- Technical tools and platforms
- Code repositories (GitHub)
- Technical certifications
- Technical projects

**Analysis Focus**:
1. **Skills**: Direct matching of technical skills (React, Python, AWS)
2. **Projects**: Code repositories, technical projects
3. **Experience**: Technical roles, development experience
4. **Profiles**: GitHub contributions, technical blogs

**Example**:
```
Resume: Software Engineer
Skills: React, Node.js, TypeScript, AWS, Docker
Projects: E-commerce platform, API gateway
GitHub: 500+ contributions
```

**Matching**:
- Direct: React, Node.js, TypeScript ✅
- Ontology: JSX, npm (inferred from React/Node.js)
- Projects: Evaluated for technical relevance
- GitHub: High activity = bonus points

---

### Non-Technical Resumes

**Characteristics**:
- Soft skills (communication, leadership)
- Industry-specific knowledge
- Certifications (non-technical)
- Achievements and metrics
- Professional networks (LinkedIn)

**Analysis Focus**:
1. **Skills**: Soft skills, industry knowledge
2. **Experience**: Role relevance, achievements
3. **Education**: Degree relevance
4. **Profiles**: LinkedIn professional network

**Example**:
```
Resume: Marketing Manager
Skills: Digital Marketing, SEO, Content Strategy, Analytics
Experience: Increased sales by 30%, Managed team of 5
LinkedIn: 500+ connections
```

**Matching**:
- Direct: Digital Marketing, SEO, Analytics ✅
- Soft Skills: Leadership, Communication (inferred)
- Experience: Achievement metrics evaluated
- LinkedIn: Professional network = bonus points

---

### System Adaptability

**The system handles both types because**:

1. **Flexible JD Templates**:
   - Technical roles: Focus on technical skills
   - Non-technical roles: Focus on soft skills and industry knowledge

2. **Adaptive Skill Matching**:
   - Technical: Uses ontology for technical skills
   - Non-technical: Uses keyword matching for soft skills

3. **Context-Aware Analysis**:
   - AI analyzes resume in context of job requirements
   - Adapts analysis style based on job type

---

## 📝 Complete Flow Example

### Example: Technical Resume Analysis

**Input**:
- **Resume**: Software Engineer with 5 years experience
- **Job**: Senior Full-Stack Developer
- **Required Skills**: React, Node.js, TypeScript, AWS, Docker

**Step-by-Step**:

1. **File Upload**:
   - File: `john_doe_resume.pdf`
   - Size: 245 KB
   - Type: PDF ✅

2. **Text Extraction**:
   ```
   Text: "John Doe\nSenior Software Engineer\n..."
   Links: [
     { text: "GitHub", url: "https://github.com/johndoe" },
     { text: "LinkedIn", url: "https://linkedin.com/in/johndoe" }
   ]
   ```

3. **AI Analysis**:
   ```json
   {
     "name": "John Doe",
     "email": "john@example.com",
     "currentTitle": "Senior Software Engineer",
     "yearsOfExperience": 5.5,
     "matchedSkills": ["React", "Node.js", "TypeScript"],
     "additionalSkills": ["Docker", "AWS", "MongoDB"],
     "experience": [
       {
         "title": "Senior Software Engineer",
         "company": "Tech Corp",
         "period": "2020 - Present",
         "description": "Developed React applications with Node.js backend..."
       }
     ]
   }
   ```

4. **Skill Matching**:
   - Direct: React ✅, Node.js ✅, TypeScript ✅
   - Inferred: JSX, npm (from React/Node.js)
   - Additional: Docker, AWS, MongoDB

5. **JD Checklist**:
   - cloud_devops (25%, must): AWS ✅, Docker ✅ → PASSED (+25)
   - frontend (20%, optional): React ✅, TypeScript ✅ → PASSED (+20)
   - backend (20%, optional): Node.js ✅ → PASSED (+20)
   - database (15%, optional): MongoDB ✅ → PASSED (+15)
   - testing (10%, optional): No testing skills → FAILED (+0)
   - soft_skills (10%, optional): Communication mentioned → PASSED (+10)
   - **Base Score**: (90/100) * 100 = **90**

6. **Experience Analysis**:
   - Found: React, Node.js in experience descriptions
   - Points: 4 (2 points each)
   - **Experience Bonus**: 4

7. **Project Extraction**:
   - Projects: ["E-commerce Platform", "API Gateway"]
   - Evaluation:
     - E-commerce Platform: 3 points (highly relevant)
     - API Gateway: 2 points (relevant)
   - **Project Points**: 5

8. **GitHub Analysis**:
   - Contributions: 750 (last 3 years)
   - Repositories: 25
   - **Profile Points**: 3 (750 > 500)

9. **Final Score**:
   - Base: 90
   - Experience: +4
   - Projects: +5
   - Profile: +3
   - **Final Score**: **102** → **100** (capped)

---

### Example: Non-Technical Resume Analysis

**Input**:
- **Resume**: Marketing Manager with 7 years experience
- **Job**: Digital Marketing Lead
- **Required Skills**: Digital Marketing, SEO, Content Strategy, Analytics

**Step-by-Step**:

1. **Text Extraction**: ✅

2. **AI Analysis**:
   ```json
   {
     "name": "Jane Smith",
     "currentTitle": "Marketing Manager",
     "yearsOfExperience": 7,
     "matchedSkills": ["Digital Marketing", "SEO", "Analytics"],
     "additionalSkills": ["Social Media", "Email Marketing"],
     "experience": [
       {
         "title": "Marketing Manager",
         "company": "Marketing Corp",
         "period": "2017 - Present",
         "description": "Increased sales by 30% through digital marketing campaigns..."
       }
     ]
   }
   ```

3. **Skill Matching**:
   - Direct: Digital Marketing ✅, SEO ✅, Analytics ✅
   - Missing: Content Strategy ❌

4. **JD Checklist**:
   - digital_marketing (30%, must): Digital Marketing ✅ → PASSED (+30)
   - seo (25%, must): SEO ✅ → PASSED (+25)
   - content_strategy (20%, optional): Content Strategy ❌ → FAILED (+0)
   - analytics (15%, optional): Analytics ✅ → PASSED (+15)
   - leadership (10%, optional): Team management mentioned → PASSED (+10)
   - **Base Score**: (80/100) * 100 = **80**

5. **Experience Analysis**:
   - Found: Digital Marketing, Analytics in experience
   - Achievement: "Increased sales by 30%"
   - **Experience Bonus**: 6

6. **Project Extraction**: None (non-technical resume)

7. **LinkedIn Analysis**:
   - Connections: 500+
   - Professional network: Strong
   - **Profile Points**: 2

8. **Final Score**:
   - Base: 80
   - Experience: +6
   - Projects: +0
   - Profile: +2
   - **Final Score**: **88**

---

## ⚠️ Error Handling & Edge Cases

### Error Handling

1. **File Extraction Failures**:
   ```typescript
   try {
     const extracted = await extractTextFromFile(file)
   } catch (error) {
     // Fallback to alternative extraction method
     // Or return empty text and continue
   }
   ```

2. **AI API Failures**:
   ```typescript
   // Retry with exponential backoff
   for (let attempt = 0; attempt <= 2; attempt++) {
     try {
       const result = await openai.chat.completions.create(...)
       break
     } catch (e) {
       if (e?.status === 429 && attempt < 2


# RoleFit AI - AI-Powered Resume Screening and Ranking System

<div align="center">
  
  <h1>RoleFit AI</h1>
  <p><strong>Intelligent Resume Analysis & Candidate Ranking System</strong></p>
  <p>Automatically screen, analyze, and rank candidates using advanced AI technology</p>
 
</div>

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How It Works](#how-it-works)
4. [Features](#features)
5. [Installation & Setup](#installation--setup)
6. [Configuration](#configuration)
7. [API Endpoints](#api-endpoints)
8. [Components](#components)
9. [Analysis Modes](#analysis-modes)
10. [JD Template System](#jd-template-system)
11. [Project Structure](#project-structure)
12. [Usage Guide](#usage-guide)
13. [Technical Details](#technical-details)

---

## 🎯 Overview

**RoleFit AI** is a comprehensive resume screening and candidate ranking system that uses artificial intelligence to automatically analyze resumes against job requirements. The system provides:

- **Automated Resume Analysis**: Extract and analyze candidate information from PDF and DOCX files
- **Intelligent Matching**: Match candidates against job requirements using AI-powered analysis
- **Smart Ranking**: Rank candidates based on weighted scoring system
- **Detailed Insights**: Generate comprehensive candidate reports with AI-generated insights
- **JD Template Management**: Create, manage, and reuse job description templates
- **Export Capabilities**: Export results to Excel and generate PDF reports

### Key Technologies

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **AI Integration**: OpenAI GPT-4, GPT-4o-mini, GPT-4o
- **File Processing**: PDF.js, pdf-parse, mammoth.js
- **Database**: MongoDB (for JD templates)
- **Export**: xlsx (Excel), jspdf (PDF reports)

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Dashboard   │  │  Job Form    │  │  Results     │     │
│  └───────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│          │                  │                  │             │
│  ┌───────▼──────────────────▼──────────────────▼───────┐   │
│  │         Resume Uploader & Progress Tracker          │   │
│  └───────────────────────┬──────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           │ HTTP POST (FormData)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Backend API (Next.js API Routes)               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/analyze (Server-Sent Events - SSE)            │   │
│  │  - File Upload & Text Extraction                     │   │
│  │  - AI Analysis (Standard or Agentic)                 │   │
│  │  - Skill Matching                                    │   │
│  │  - JD Checklist Matching                             │   │
│  │  - Experience & Project Analysis                     │   │
│  │  - GitHub Profile Analysis                           │   │
│  │  - Score Calculation                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/jd - JD Template Management                    │   │
│  │  - GET: Fetch template by role                       │   │
│  │  - POST: Save template (requires passkey)            │   │
│  │  - DELETE: Delete template (requires passkey)        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/generate-jd - AI JD Generation                  │   │
│  │  - Generate JD template from role description        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/fix-json - AI JSON Fixer                        │   │
│  │  - Fix malformed JSON using AI                       │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ API Calls
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                    External Services                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   OpenAI API  │  │   MongoDB    │  │  GitHub API  │      │
│  │  (GPT-4/4o)   │  │  (Templates) │  │  (Profiles)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → Job requirements + Resume files
2. **File Processing** → Extract text from PDF/DOCX
3. **AI Analysis** → Analyze resume against job requirements
4. **Skill Matching** → Match skills using ontology and keyword matching
5. **JD Checklist** → Check against JD template items
6. **Scoring** → Calculate weighted match score
7. **Ranking** → Sort candidates by score
8. **Results** → Display ranked candidates with detailed insights

---

## 🔄 How It Works

### Complete Workflow

#### Step 1: Job Requirements Setup

1. **User enters job requirements:**
   - Job Title
   - Job Description
   - Required Skills (comma-separated)
   - Minimum Years of Experience (0-8 years)
   - Education Level (High School, Associate's, Bachelor's, Master's, PhD)

2. **JD Template System (Optional but Recommended):**
   - **Weights**: Define weight categories (e.g., `cloud_devops: 0.25`, `frontend: 0.20`)
   - **JD Items**: Create checklist items with:
     - ID (must match a weight category)
     - Text description
     - Required tags (skills/technologies)
     - Critical tags (very must-have)
     - Must-have flag
   - **Validation**: Weights must sum to exactly 100%
   - **Storage**: Templates saved to MongoDB by role name

3. **Template Features:**
   - **AI Generation**: Generate JD template from role description
   - **Default Templates**: Pre-built templates for common roles
   - **Role Normalization**: Automatically normalizes role names (e.g., "Software Engineer" → "software_engineer")

#### Step 2: Resume Upload

1. **File Upload:**
   - Supports PDF and DOCX formats
   - Multiple files can be uploaded simultaneously
   - Drag-and-drop or file browser interface

2. **File Processing:**
   - **PDF**: Extracted using `pdfjs-dist` and `pdf-parse`
   - **DOCX**: Extracted using `mammoth.js`
   - Text extraction includes hyperlinks for profile detection

3. **Progress Tracking:**
   - Real-time progress updates via Server-Sent Events (SSE)
   - Shows current file being processed
   - Displays analysis stage and AI thinking messages
   - Progress bar never goes backward (cumulative tracking)

#### Step 3: Resume Analysis

The system supports two analysis modes:

##### A. Standard Analysis Mode

**Process:**

1. **Text Extraction** (0.5-2 seconds)
   - Extract raw text from resume file
   - Extract hyperlinks (GitHub, LinkedIn, etc.)

2. **AI Analysis** (2-8 seconds per resume)
   - Send resume text to OpenAI GPT-4o-mini
   - Extract structured data:
     - Name, Email, Phone, Location
     - Current Title
     - Years of Experience (calculated from dates)
     - Education Level
     - Work Experience (with periods)
     - Skills
   - Generate AI analysis text

3. **Skill Matching** (0.5-1 second)
   - **Direct Matching**: Match required skills against extracted skills
   - **Ontology Matching**: Use skill ontology to infer related skills
     - Example: "React" → infers "JavaScript", "JSX", "Frontend"
   - **Additional Skills**: Identify other technical skills not in requirements

4. **JD Checklist Matching** (1-3 seconds)
   - For each JD template item:
     - Check if required tags are present in resume
     - Check if critical tags are present
     - Calculate coverage percentage
     - Mark as passed/failed based on coverage threshold
   - Calculate weighted score based on checklist results

5. **Experience Analysis** (0.5 seconds)
   - Analyze work experience descriptions
   - Match required skills in experience text
   - Award bonus points for relevant experience

6. **Project & Profile Analysis** (2-5 seconds)
   - Extract project descriptions from resume
   - Detect GitHub profile links
   - If GitHub found:
     - Fetch contribution data (last 3 years)
     - Fetch repository statistics
     - Award bonus points for high contributions
   - Analyze project relevance to job

7. **Score Calculation** (instant)
   - Base score from JD checklist (weighted)
   - Add experience bonus (up to +10 points)
   - Add project points
   - Add profile points
   - Final score: 0-100

**Total Time**: ~5-20 seconds per resume

##### B. Agentic AI Mode (Advanced)

**Process:**

Uses specialized AI agents working in sequence:

1. **Extraction Agent** (GPT-4o-mini, ~2-5 seconds)
   - Extracts structured data from resume
   - High accuracy extraction with confidence scoring
   - Self-corrects if extraction fails

2. **Analysis Agent** (GPT-4o, ~3-8 seconds)
   - Deep analysis of candidate qualifications
   - Identifies strengths and weaknesses
   - Assesses cultural fit
   - Provides detailed reasoning

3. **Scoring Agent** (GPT-4o-mini, ~2-4 seconds)
   - Calculates detailed score breakdown:
     - Skill Match Score
     - Experience Match Score
     - Education Match Score
     - Cultural Fit Score
     - Additional Value Score
   - Generates weighted overall score
   - Provides recommendation (strongly recommend, recommend, consider, not recommended)

4. **Recommendation Agent** (GPT-4o, ~2-5 seconds, only if score ≥ 40)
   - Generates interview questions
   - Provides next steps
   - Creates hiring manager note

**Total Time**: ~9-22 seconds per resume

**Advantages:**
- More accurate analysis
- Detailed insights (strengths, weaknesses, cultural fit)
- Interview questions tailored to candidate
- Better reasoning and transparency
- Self-correction capabilities

#### Step 4: Results Display

1. **Ranked Candidates:**
   - Sorted by match score (highest first)
   - Display: Name, Title, Experience, Score
   - Color-coded badges (green/yellow/red based on score)

2. **Candidate Detail View:**
   - **Overview Tab**: Basic information, match score, skills
   - **Experience Tab**: Work history with descriptions
   - **Projects Tab**: Projects and portfolio items
   - **Profiles Tab**: External profiles (GitHub, etc.) with analysis
   - **Checklist Tab**: JD requirements checklist with pass/fail status
   - **Agentic AI Tab** (if used): Detailed AI insights, interview questions, recommendations

3. **Export Options:**
   - **Export to Excel**: All candidates with scores, skills, sorted by rank
   - **Download PDF Report**: Professional PDF report for individual candidate

---

## ✨ Features

### Core Features

1. **AI-Powered Resume Analysis**
   - Automatic extraction of candidate information
   - Intelligent skill matching
   - Experience and education validation
   - AI-generated candidate insights

2. **Dual Analysis Modes**
   - **Standard Mode**: Fast, efficient analysis (~5-20 sec/resume)
   - **Agentic AI Mode**: Advanced analysis with specialized agents (~9-22 sec/resume)

3. **JD Template System**
   - Weighted scoring categories
   - Customizable checklist items
   - AI-powered JD generation
   - Template management (save, load, delete)
   - Role-based template storage

4. **Smart Skill Matching**
   - Direct skill matching
   - Ontology-based skill inference
   - Related skills detection
   - Missing skills identification

5. **GitHub Profile Analysis**
   - Contribution tracking (last 3 years)
   - Repository statistics
   - Bonus points for high activity
   - Contribution-based scoring

6. **Real-Time Progress Tracking**
   - Server-Sent Events (SSE) for live updates
   - Stage indicators (extract, AI analysis, checklist, projects)
   - AI thinking messages (gameified experience)
   - Progress bar that never goes backward

7. **Export Capabilities**
   - **Excel Export**: All candidates with comprehensive data
   - **PDF Reports**: Professional candidate reports with:
     - Executive summary
     - Detailed score breakdown (if Agentic AI)
     - Skills analysis
     - Work experience
     - Projects
     - Interview questions (if Agentic AI)
     - Hiring manager notes (if Agentic AI)

8. **Security Features**
   - Passkey protection for sensitive operations
   - Custom dialog system (no native alerts)
   - Secure template management

### UI/UX Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Mode**: Full dark mode support
- **Theme Switching**: Toggle between light and dark themes
- **Professional Styling**: Clean, modern interface with gradients and animations
- **Accessibility**: Keyboard navigation, screen reader support

---

## 🚀 Installation & Setup

### Prerequisites

- **Node.js**: 18.0 or later
- **npm** or **yarn**: Package manager
- **MongoDB**: (Optional) For JD template storage. If not available, system uses default templates
- **OpenAI API Key**: Required for AI analysis

### Step-by-Step Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd AI-Resume-Screening-and-Ranking-System-main
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables:**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Required
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Optional - MongoDB connection (for JD template storage)
   MONGODB_URI=mongodb://localhost:27017/rolefit_ai
   # or
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rolefit_ai
   
   # Optional - Passkey for JD template editing
   JD_EDIT_PASSKEY=your_secure_passkey_here
   
   # Optional - GitHub token for better GitHub API access
   GITHUB_TOKEN=your_github_token_here
   
   # Optional - App URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI analysis |
| `MONGODB_URI` | No | MongoDB connection string for JD templates |
| `JD_EDIT_PASSKEY` | No | Passkey for saving/deleting JD templates |
| `GITHUB_TOKEN` | No | GitHub token for better API rate limits |
| `NEXT_PUBLIC_APP_URL` | No | Public URL of the application |

### Rate Limiting

The system includes built-in rate limiting protection:
- **Cooldown Period**: 60 seconds after rate limit error
- **Max Consecutive Rate Limits**: 3 before stopping analysis
- **Automatic Retry**: Retries with exponential backoff

### AI Model Configuration

**Standard Analysis:**
- Model: GPT-4o-mini
- Temperature: 0.1 (for accuracy)
- Max Tokens: 2000

**Agentic AI:**
- Extraction Agent: GPT-4o-mini (0.1 temperature)
- Analysis Agent: GPT-4o (0.3 temperature)
- Scoring Agent: GPT-4o-mini (0.1 temperature)
- Recommendation Agent: GPT-4o (0.3 temperature)

---

## 🔌 API Endpoints

### `/api/analyze` (POST)

**Purpose**: Main endpoint for resume analysis

**Request:**
- `files`: Array of File objects (PDF or DOCX)
- `jobRequirements`: JSON string of job requirements
- `useAgenticAI`: (Optional) "true" to use Agentic AI mode

**Response**: Server-Sent Events (SSE) stream with:
- Progress updates
- Analysis results
- Error messages

**Example:**
```typescript
const formData = new FormData()
formData.append('files', file1)
formData.append('files', file2)
formData.append('jobRequirements', JSON.stringify(jobRequirements))
formData.append('useAgenticAI', 'true')

const response = await fetch('/api/analyze', {
  method: 'POST',
  body: formData
})

// Handle SSE stream
const reader = response.body.getReader()
// ... process stream
```

### `/api/jd` (GET, POST, DELETE)

**Purpose**: JD template management

**GET `/api/jd?role=software_engineer`**
- Returns JD template for specified role
- Falls back to default template if not found

**POST `/api/jd`**
- Saves JD template
- Requires passkey in body
- Body: `{ role: string, template: JDTemplate, passkey: string }`

**DELETE `/api/jd`**
- Deletes JD template
- Requires passkey in query: `?role=software_engineer&passkey=xxx`

### `/api/jd/roles` (GET)

**Purpose**: Get list of all available roles

**Response:**
```json
{
  "roles": ["software_engineer", "data_scientist", "product_manager"]
}
```

### `/api/generate-jd` (POST)

**Purpose**: Generate JD template using AI

**Request:**
- `role`: Role name/description
- `passkey`: Passkey for authentication

**Response:**
```json
{
  "template": {
    "role": "software_engineer",
    "weights": { ... },
    "items": [ ... ]
  }
}
```

### `/api/fix-json` (POST)

**Purpose**: Fix malformed JSON using AI

**Request:**
- `json`: Malformed JSON string
- `passkey`: Passkey for authentication

**Response:**
```json
{
  "fixed": { ... }
}
```

---

## 🧩 Components

### Main Components

#### `resume-screening-dashboard.tsx`
- **Purpose**: Main orchestrator component
- **Features**:
  - Manages overall application state
  - Coordinates between job form and resume uploader
  - Handles analysis results
  - Tab navigation (requirements, upload, results)

#### `job-requirements-form.tsx`
- **Purpose**: Job requirements input and JD template editor
- **Features**:
  - Job requirements form (title, description, skills, experience, education)
  - JD template editor (weights and items)
  - Template management (save, load, delete, generate)
  - Form/JSON editor toggle
  - Validation (weights must sum to 100%)
  - Passkey protection

#### `resume-uploader.tsx`
- **Purpose**: File upload and progress display
- **Features**:
  - Drag-and-drop file upload
  - File browser
  - Progress tracking with SSE
  - Stage indicators
  - AI thinking messages
  - Agentic AI toggle
  - Real-time progress updates

#### `candidate-results.tsx`
- **Purpose**: Display ranked candidate list
- **Features**:
  - Sorted candidate list
  - Score-based color coding
  - Export to Excel button
  - Candidate selection

#### `candidate-detail.tsx`
- **Purpose**: Detailed candidate view
- **Features**:
  - Tabbed interface (Overview, Experience, Projects, Profiles, Checklist, Agentic AI)
  - Skills display (matched, inferred, additional)
  - Experience timeline
  - Project portfolio
  - External profiles (GitHub with contributions)
  - JD checklist with pass/fail status
  - Agentic AI insights (if available)
  - Download PDF report button

### UI Components (shadcn/ui)

Located in `components/ui/`:
- Buttons, Cards, Dialogs, Tabs, Progress, Badges, etc.
- Fully accessible and customizable
- Dark mode support

---

## 🧠 Analysis Modes

### Standard Analysis

**When to Use:**
- Bulk resume screening
- Quick initial screening
- When speed is priority
- Large batches of resumes

**Process:**
1. Single AI call to extract and analyze
2. Keyword-based skill matching
3. JD checklist matching
4. Experience and project analysis
5. Score calculation

**Output:**
- Basic candidate information
- Matched/missing skills
- JD checklist results
- AI analysis text
- Match score

### Agentic AI Mode

**When to Use:**
- Top candidate deep dive
- Detailed candidate assessment
- When accuracy is critical
- Need for interview questions
- Hiring manager notes required

**Process:**
1. **Extraction Agent**: Structured data extraction
2. **Analysis Agent**: Deep analysis (strengths, weaknesses, cultural fit)
3. **Scoring Agent**: Detailed score breakdown
4. **Recommendation Agent**: Interview questions and next steps

**Output:**
- All standard analysis output PLUS:
- Strengths and weaknesses
- Cultural fit assessment
- Detailed score breakdown (by category)
- Interview questions
- Next steps
- Hiring manager note
- Workflow log
- Confidence score

**Performance:**
- Takes 2-3x longer than standard analysis
- More accurate and detailed
- Better for final candidate evaluation

---

## 📋 JD Template System

### Template Structure

```typescript
{
  role: "software_engineer",
  weights: {
    cloud_devops: 0.25,      // 25%
    frontend: 0.20,           // 20%
    backend: 0.20,            // 20%
    database: 0.15,           // 15%
    testing: 0.10,            // 10%
    soft_skills: 0.10         // 10%
    // Total must equal 1.0 (100%)
  },
  items: [
    {
      id: "cloud_devops",     // Must match a weight key
      text: "Cloud and DevOps experience",
      must: true,             // Must-have item
      tags: ["AWS", "Docker", "Kubernetes"],
      veryMust: ["AWS", "Docker"]  // Critical tags
    },
    // ... more items
  ]
}
```

### How Scoring Works

1. **For each JD item:**
   - Check if tags are present in resume
   - Calculate coverage: `matchedTags / totalTags`
   - Mark as passed if coverage ≥ threshold (0.6 for optional, 1.0 for must-have)

2. **Weighted Score Calculation:**
   ```
   earnedWeight = 0
   totalWeight = 0
   
   For each item:
     weight = weights[item.id]
     totalWeight += weight
     
     if item.passed:
       earnedWeight += weight
     else if item.must:
       earnedWeight += 0  // Must-have failures get 0
     else:
       earnedWeight += weight * coverage  // Optional items get partial credit
   
   Score = (earnedWeight / totalWeight) * 100
   ```

3. **Bonus Points:**
   - Experience bonus: Up to +10 points
   - Project points: Based on relevance
   - Profile points: Based on GitHub contributions

4. **Final Score:**
   - Base score (from JD checklist) + bonuses
   - Capped at 100

### Template Management

1. **Create Template:**
   - Define weights (must sum to 100%)
   - Add items with IDs matching weight keys
   - Save with passkey

2. **Load Template:**
   - Select role from dropdown
   - Template loads automatically
   - Can edit and save changes

3. **Generate Template:**
   - Enter role description
   - AI generates template with weights and items
   - Items automatically match weight categories
   - Weights automatically sum to 100%

4. **Default Templates:**
   - Pre-built templates for common roles
   - Can be loaded and customized

---

## 📁 Project Structure

```
AI-Resume-Screening-and-Ranking-System-main/
├── app/
│   ├── analyzer/
│   │   └── page.tsx              # Main analyzer page
│   ├── api/
│   │   ├── analyze/
│   │   │   └── route.ts          # Main analysis endpoint (SSE)
│   │   ├── analyze-advanced/
│   │   │   └── route.ts          # Advanced agentic AI endpoint
│   │   ├── fix-json/
│   │   │   └── route.ts          # AI JSON fixer
│   │   ├── generate-jd/
│   │   │   └── route.ts          # AI JD generator
│   │   └── jd/
│   │       ├── route.ts          # JD template CRUD
│   │       └── roles/
│   │           └── route.ts       # List available roles
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
│
├── components/
│   ├── candidate-detail.tsx      # Detailed candidate view
│   ├── candidate-results.tsx     # Ranked candidate list
│   ├── job-requirements-form.tsx # Job form & JD editor
│   ├── resume-screening-dashboard.tsx # Main dashboard
│   ├── resume-uploader.tsx       # File upload & progress
│   ├── passkey-dialog.tsx        # Passkey input dialog
│   ├── alert-dialog-custom.tsx   # Custom alert dialogs
│   └── ui/                       # shadcn/ui components
│
├── lib/
│   ├── ai-agents.ts              # Agentic AI system
│   ├── export-utils.ts           # Excel export
│   ├── pdf-utils.ts              # PDF report generation
│   ├── jd-templates.ts           # Default JD templates
│   ├── mongodb.ts                # MongoDB connection
│   ├── resume-analyzer.ts        # Resume analysis client
│   ├── skill-ontology.ts         # Skill inference rules
│   ├── types.ts                  # TypeScript interfaces
│   └── utils.ts                  # Utility functions
│
├── hooks/
│   ├── use-mobile.tsx            # Mobile detection hook
│   └── use-toast.ts              # Toast notification hook
│
├── public/                        # Static assets
├── styles/                       # Additional styles
├── types/                        # Type definitions
│
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.js            # Tailwind config
├── next.config.mjs               # Next.js config
└── README.md                     # This file
```

---

## 📖 Usage Guide

### Basic Workflow

1. **Navigate to Analyzer:**
   - Go to `/analyzer` page
   - Or click "Start Screening" from home page

2. **Set Job Requirements:**
   - Enter job title and description
   - Add required skills (comma-separated)
   - Set minimum experience (0-8 years)
   - Select education level

3. **Configure JD Template (Optional but Recommended):**
   - Click "JD Editor" tab
   - Define weights (must sum to 100%)
   - Add checklist items
   - Save template (requires passkey)

4. **Upload Resumes:**
   - Drag and drop files or use file browser
   - Supports PDF and DOCX
   - Multiple files can be uploaded

5. **Choose Analysis Mode:**
   - **Standard**: Fast, efficient (default)
   - **Agentic AI**: Advanced analysis (toggle on)

6. **Start Analysis:**
   - Click "Analyze Resumes"
   - Watch real-time progress
   - See AI thinking messages

7. **Review Results:**
   - View ranked candidate list
   - Click candidate to see details
   - Export to Excel or download PDF report

### Advanced Features

#### Using JD Templates

1. **Load Existing Template:**
   - Select role from dropdown
   - Template loads automatically
   - Edit as needed

2. **Generate New Template:**
   - Enter role description
   - Click "Generate JD"
   - AI creates template with weights and items
   - Review and save

3. **Default Templates:**
   - Click "Default Template"
   - Loads pre-built template
   - Customize and save

#### Agentic AI Mode

1. **Enable Agentic AI:**
   - Toggle "Agentic AI Mode" switch
   - Read advantages and time warning
   - Upload resumes and analyze

2. **View Agentic AI Insights:**
   - Open candidate detail
   - Click "Agentic AI" tab
   - See strengths, weaknesses, interview questions, etc.

#### Export Options

1. **Export to Excel:**
   - Click "Export to Excel" in results view
   - Downloads Excel file with all candidates
   - Includes: Name, Email, Score, Skills, Skill Scores
   - Sorted by score

2. **Download PDF Report:**
   - Open candidate detail
   - Click "Download Report"
   - Professional PDF report generated
   - Includes all candidate information and insights

---

## 🔧 Technical Details

### Text Extraction

**PDF Files:**
- Uses `pdfjs-dist` for text extraction
- Extracts hyperlinks for profile detection
- Handles various PDF formats
- Fallback to `pdf-parse` if needed

**DOCX Files:**
- Uses `mammoth.js` for text extraction
- Preserves formatting where possible
- Converts to plain text for analysis

### Skill Matching Algorithm

1. **Direct Matching:**
   - Exact string matching (case-insensitive)
   - Normalized comparison

2. **Ontology Matching:**
   - Uses skill ontology (`lib/skill-ontology.ts`)
   - Maps skills to related skills
   - Example: "React" → ["JavaScript", "JSX", "Frontend", "Web Development"]

3. **Fuzzy Matching:**
   - Handles variations (e.g., "JS" → "JavaScript")
   - Abbreviation expansion

### Score Calculation Formula

```
Base Score = (earnedWeight / totalWeight) * 100

Where:
- earnedWeight = sum of weights for passed items + partial credit for optional items
- totalWeight = sum of all weights

Bonus Points:
- Experience Bonus = min(10, avgExperiencePoints * 2)
- Project Points = based on project relevance
- Profile Points = based on GitHub contributions

Final Score = min(100, Base Score + Experience Bonus + Project Points + Profile Points)
```

### Rate Limiting Protection

- **Cooldown**: 60 seconds after rate limit error
- **Max Attempts**: 3 consecutive rate limits before stopping
- **Automatic Retry**: Exponential backoff
- **Fallback**: Keyword matching if AI unavailable

### Progress Tracking

- **Cumulative Progress**: Never goes backward
- **Stage Tracking**: extract → ai → checklist → projects
- **File Tracking**: Shows current file number
- **AI Thinking**: Random messages for engagement

### GitHub Profile Analysis

1. **Profile Detection:**
   - Scans resume for GitHub URLs
   - Extracts username from URL

2. **Data Fetching:**
   - **GraphQL API** (if token available): More accurate
   - **SVG Scraping**: Contribution graph parsing
   - **HTML Scraping**: Repository statistics

3. **Contribution Calculation:**
   - Last 3 years of contributions
   - Total contributions
   - Year-by-year breakdown

4. **Scoring:**
   - Bonus points for high contributions
   - Points added to overall score

---

## 🎨 UI/UX Features

### Design System

- **Color Scheme**: Indigo/Purple primary, Green/Yellow/Red for status
- **Typography**: Helvetica font family
- **Spacing**: Consistent 4px grid system
- **Components**: shadcn/ui for consistency

### Responsive Design

- **Desktop**: Full feature set, multi-column layouts
- **Tablet**: Adapted layouts, touch-friendly
- **Mobile**: Single column, optimized for small screens

### Dark Mode

- Full dark mode support
- Theme switching
- Persistent theme preference
- Smooth transitions

### Accessibility

- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus management
- Color contrast compliance

---

## 🐛 Troubleshooting

### Common Issues

1. **"Missing OPENAI_API_KEY"**
   - Solution: Add `OPENAI_API_KEY` to `.env.local`

2. **"Rate limit exceeded"**
   - Solution: Wait for cooldown period (60 seconds)
   - Or: Use standard analysis instead of Agentic AI
   - Or: Process fewer resumes at once

3. **"Template not found"**
   - Solution: Use default template or create new one

4. **PDF extraction fails**
   - Solution: Ensure PDF is not password-protected
   - Or: Try converting to DOCX format

5. **MongoDB connection fails**
   - Solution: System falls back to default templates
   - Or: Check `MONGODB_URI` in `.env.local`

---

## 📚 Additional Documentation

- **HOW_STANDARD_ANALYSIS_WORKS.md**: Detailed explanation of standard analysis
- **HOW_AGENTIC_AI_WORKS.md**: Detailed explanation of agentic AI system
- **AGENTIC_AI_COMPARISON.md**: Comparison between standard and agentic AI
- **AGENTIC_AI_GUIDE.md**: Guide to using agentic AI
- **AGENTIC_AI_PERFORMANCE.md**: Performance comparison

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

[Add your license here]

---

## 🙏 Acknowledgements

- [OpenAI](https://openai.com/) for AI models (GPT-4, GPT-4o, GPT-4o-mini)
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- [Next.js](https://nextjs.org/) for the framework
- [Vercel](https://vercel.com/) for hosting
- [MongoDB](https://www.mongodb.com/) for database
- [GitHub](https://github.com/) for profile analysis

---

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with ❤️ using Next.js, React, TypeScript, and OpenAI**
