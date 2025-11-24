"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { JobRequirementsForm } from "@/components/job-requirements-form"
import { ResumeUploader } from "@/components/resume-uploader"
import { CandidateResults } from "@/components/candidate-results"
import { analyzeResumes, type ProgressUpdate } from "@/lib/resume-analyzer"
import type { JobRequirements, Candidate } from "@/lib/types"
import { motion } from "framer-motion"

export function ResumeScreeningDashboard() {
  const [jobRequirements, setJobRequirements] = useState<JobRequirements | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState<ProgressUpdate | null>(null)
  const [activeTab, setActiveTab] = useState("requirements")

  const handleJobRequirementsSubmit = (requirements: JobRequirements) => {
    setJobRequirements(requirements)
    setActiveTab("upload")
  }

  const handleResumesUpload = async (files: File[], useAgenticAI: boolean) => {
    if (!jobRequirements) return

    setIsAnalyzing(true)
    setProgress({ percentage: 0, message: useAgenticAI ? "🤖 Initializing Agentic AI System..." : "Starting analysis..." })

    try {
      const results = await analyzeResumes(files, jobRequirements, (progressUpdate) => {
        setProgress(progressUpdate)
      }, useAgenticAI)
      setCandidates(results)
      setProgress({ percentage: 100, message: "Analysis complete!" })
      setActiveTab("results")
    } catch (error) {
      console.error("Error analyzing resumes:", error)
      setProgress({ percentage: 0, message: `Error: ${error instanceof Error ? error.message : "Unknown error"}` })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 p-1 bg-white dark:bg-slate-800 bg-opacity-70 dark:bg-opacity-90 backdrop-blur-sm rounded-xl shadow-md border border-slate-200 dark:border-slate-700 transition-colors">
          <TabsTrigger
            value="requirements"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
          >
            Job Requirements
          </TabsTrigger>
          <TabsTrigger
            value="upload"
            disabled={!jobRequirements}
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
          >
            Resume Upload
          </TabsTrigger>
          <TabsTrigger
            value="results"
            disabled={candidates.length === 0}
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
          >
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requirements">
          <JobRequirementsForm onSubmit={handleJobRequirementsSubmit} />
        </TabsContent>

        <TabsContent value="upload">
          <ResumeUploader 
            onUpload={handleResumesUpload} 
            isLoading={isAnalyzing} 
            progress={progress}
          />
        </TabsContent>

        <TabsContent value="results">
          <CandidateResults candidates={candidates} jobRequirements={jobRequirements!} />
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}

