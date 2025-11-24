"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FileUp, X, FileText, Loader2, Sparkles, Info, Zap, Clock, CheckCircle2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import type { ProgressUpdate } from "@/lib/resume-analyzer"

interface ResumeUploaderProps {
  onUpload: (files: File[], useAgenticAI: boolean) => void
  isLoading: boolean
  progress?: ProgressUpdate | null
}

export function ResumeUploader({ onUpload, isLoading, progress }: ResumeUploaderProps) {
  const [files, setFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [useAgenticAI, setUseAgenticAI] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastProgressPercentage = useRef(0)
  
  // Update last progress when new progress comes in - prevents going backward
  useEffect(() => {
    if (progress?.percentage && progress.percentage > lastProgressPercentage.current) {
      lastProgressPercentage.current = progress.percentage
    }
  }, [progress?.percentage])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(
        (file) =>
          file.type === "application/pdf" ||
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      )
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter(
        (file) =>
          file.type === "application/pdf" ||
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      )
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const removeFile = (fileName: string) => {
    setFiles(files.filter((file) => file.name !== fileName))
  }

  const handleSubmit = () => {
    if (files.length > 0) {
      onUpload(files, useAgenticAI)
    }
  }

  const progressPercentage = progress?.percentage || 0
  const currentProgress = Math.max(progressPercentage, lastProgressPercentage.current)
  const progressMessage = progress?.message || "Analyzing resumes..."

  return (
    <Card className="w-full overflow-hidden bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-xl">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"></div>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Upload Resumes</CardTitle>
        <CardDescription>Upload PDF or DOCX resume files for analysis</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-10 text-center transition-all duration-300 ${
            dragActive
              ? "border-purple-400 bg-purple-50 dark:bg-slate-800/60"
              : "border-gray-300 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-slate-800/50"
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <motion.div
            animate={{
              y: dragActive ? -10 : 0,
              scale: dragActive ? 1.1 : 1,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-slate-800 dark:to-slate-700 rounded-full flex items-center justify-center">
              <FileUp className="h-10 w-10 text-purple-500" />
            </div>
            <p className="mt-2 text-base text-gray-600 dark:text-slate-200 font-medium">
              Drag and drop resume files, or{" "}
              <button
                type="button"
                className="text-purple-600 hover:text-purple-700 hover:underline font-semibold"
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Supports: PDF, DOCX</p>
          </motion.div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 space-y-4 overflow-hidden"
            >
              <h3 className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-500" />
                Uploaded Files ({files.length})
              </h3>
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {files.map((file, index) => (
                  <motion.li
                    key={file.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-md border border-purple-100 dark:border-slate-700"
                  >
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center mr-3 shadow-sm">
                        <FileText className="h-4 w-4 text-purple-500" />
                      </div>
                      <span className="text-sm truncate max-w-[250px] dark:text-slate-100">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(file.name)}
                      className="text-gray-500 dark:text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && progress && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-purple-700 dark:text-purple-400">
                {progressMessage}
                {progress.currentFile && progress.totalFiles && (
                  <span className="ml-2 text-xs text-purple-600 dark:text-purple-500">
                    (File {progress.currentFile} of {progress.totalFiles})
                  </span>
                )}
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{currentProgress}%</span>
            </div>
            <Progress
              value={currentProgress}
              className="h-4 bg-purple-100 dark:bg-slate-800"
            />
            
            {/* AI Thinking Message - Gameified */}
            {progress.aiThinking && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={progress.aiThinking}
                className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-3 border border-purple-200 dark:border-slate-600"
              >
                <div className="flex items-center gap-2">
                  <div className="animate-pulse">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                      AI Thinking...
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-300 mt-1">
                      {progress.aiThinking}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full transition-colors ${
                  progress.stage === 'extract' || progressPercentage >= 10 ? 'bg-green-500 animate-pulse' : 
                  progress.stage && ['ai', 'checklist', 'projects'].includes(progress.stage) ? 'bg-green-500' : 
                  'bg-gray-300 dark:bg-gray-600'
                }`} />
                <span className={progress.stage === 'extract' || progressPercentage >= 10 ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                  Extracting text
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full transition-colors ${
                  progress.stage === 'ai' ? 'bg-yellow-500 animate-pulse' :
                  progress.stage === 'checklist' || progress.stage === 'projects' || progressPercentage >= 40 ? 'bg-green-500' : 
                  progress.stage === 'extract' ? 'bg-yellow-500' : 
                  'bg-gray-300 dark:bg-gray-600'
                }`} />
                <span className={progress.stage === 'ai' ? 'text-yellow-600 dark:text-yellow-400 font-medium animate-pulse' :
                  progress.stage === 'checklist' || progress.stage === 'projects' || progressPercentage >= 40 ? 'text-green-600 dark:text-green-400 font-medium' : 
                  progress.stage === 'extract' ? 'text-yellow-600 dark:text-yellow-400' : ''}>
                  AI Analysis
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full transition-colors ${
                  progress.stage === 'checklist' ? 'bg-yellow-500 animate-pulse' :
                  progress.stage === 'projects' || progressPercentage >= 70 ? 'bg-green-500' : 
                  ['ai', 'extract'].includes(progress.stage || '') ? 'bg-yellow-500' : 
                  'bg-gray-300 dark:bg-gray-600'
                }`} />
                <span className={progress.stage === 'checklist' ? 'text-yellow-600 dark:text-yellow-400 font-medium animate-pulse' :
                  progress.stage === 'projects' || progressPercentage >= 70 ? 'text-green-600 dark:text-green-400 font-medium' : 
                  ['ai', 'extract'].includes(progress.stage || '') ? 'text-yellow-600 dark:text-yellow-400' : ''}>
                  Checklist
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full transition-colors ${
                  progress.stage === 'projects' ? 'bg-yellow-500 animate-pulse' :
                  progressPercentage >= 90 ? 'bg-green-500' : 
                  ['checklist', 'ai', 'extract'].includes(progress.stage || '') ? 'bg-yellow-500' : 
                  'bg-gray-300 dark:bg-gray-600'
                }`} />
                <span className={progress.stage === 'projects' ? 'text-yellow-600 dark:text-yellow-400 font-medium animate-pulse' :
                  progressPercentage >= 90 ? 'text-green-600 dark:text-green-400 font-medium' : 
                  ['checklist', 'ai', 'extract'].includes(progress.stage || '') ? 'text-yellow-600 dark:text-yellow-400' : ''}>
                  Projects
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {/* Agentic AI Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between w-full p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-lg border border-purple-200 dark:border-slate-600">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <div>
                <Label htmlFor="agentic-ai" className="text-sm font-semibold text-purple-900 dark:text-purple-200 cursor-pointer">
                  🤖 Agentic AI Mode
                </Label>
                <p className="text-xs text-purple-600 dark:text-purple-300 mt-1">
                  Advanced AI with specialized agents, interview questions & recommendations
                </p>
              </div>
            </div>
            <Switch
              id="agentic-ai"
              checked={useAgenticAI}
              onCheckedChange={setUseAgenticAI}
              disabled={isLoading}
              className="data-[state=checked]:bg-purple-600"
            />
          </div>

          {/* Agentic AI Advantages (shown when enabled) */}
          {useAgenticAI && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <Alert className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-700">
                <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <AlertTitle className="text-purple-900 dark:text-purple-200 font-semibold">
                  What Agentic AI Adds:
                </AlertTitle>
                <AlertDescription className="text-purple-800 dark:text-purple-300 mt-2 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Strengths & Weaknesses:</strong> Detailed candidate assessment</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Interview Questions:</strong> Tailored questions for each candidate</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Score Breakdown:</strong> Detailed scoring by category</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Recommendations:</strong> Next steps & hiring manager notes</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Cultural Fit:</strong> Assessment of team compatibility</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Advanced Analysis:</strong> GPT-4o for deeper insights</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Time Warning */}
              <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-amber-900 dark:text-amber-200 font-semibold">
                  ⏱️ Analysis Will Take Longer
                </AlertTitle>
                <AlertDescription className="text-amber-800 dark:text-amber-300 mt-2">
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Agentic AI takes 2-3x longer</strong> than standard analysis because it uses specialized AI agents for deeper analysis.
                    </p>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-600" />
                        <span><strong>Standard:</strong> ~2-8 sec/resume</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-600" />
                        <span><strong>Agentic AI:</strong> ~9-22 sec/resume</span>
                      </div>
                    </div>
                    <p className="text-xs italic mt-2">
                      💡 Tip: Use standard analysis for bulk screening, then Agentic AI for top candidates.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </div>
        
        <Button
          onClick={handleSubmit}
          disabled={files.length === 0 || isLoading}
          className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 hover:from-purple-600 hover:via-pink-600 hover:to-indigo-600 transition-all duration-300 shadow-md"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing
            </>
          ) : (
            "Analyze Resumes"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

