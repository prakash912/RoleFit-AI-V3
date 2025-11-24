"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Mail, Phone, MapPin, Briefcase, GraduationCap, CheckCircle, XCircle, Star, ListChecks, Sparkles } from "lucide-react"
import type { Candidate, JobRequirements } from "@/lib/types"
import { generateCandidatePDF } from "@/lib/pdf-utils"

interface CandidateDetailProps {
  candidate: Candidate
  jobRequirements: JobRequirements
}

// Helper function to format labels: remove underscores and capitalize properly
function formatLabel(text: string): string {
  return text
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function CandidateDetail({ candidate, jobRequirements }: CandidateDetailProps) {
  // Missing skills = required skills that are neither matched nor inferred
  const matchedOrInferred = new Set([...candidate.matchedSkills, ...(candidate.inferredSkills || [])])
  const missingSkills = jobRequirements.requiredSkills.filter((skill) => !matchedOrInferred.has(skill))

  const experienceMatch = candidate.yearsOfExperience >= jobRequirements.minimumExperience

  const educationRank = {
    "High School": 1,
    "Associate's": 2,
    "Bachelor's": 3,
    "Master's": 4,
    PhD: 5,
  }

  const requiredEducationRank = educationRank[jobRequirements.educationLevel as keyof typeof educationRank] || 0
  const candidateEducationRank = educationRank[candidate.educationLevel as keyof typeof educationRank] || 0
  const educationMatch = candidateEducationRank >= requiredEducationRank

  const evaluateExperienceHelpfulness = (text: string): { helpful: boolean; points: number; matched: string[]; total: number } => {
    const normalized = (text || "").toLowerCase()
    const reqs = Array.isArray(jobRequirements.requiredSkills) ? jobRequirements.requiredSkills : []
    const matched: string[] = []
    for (const skill of reqs) {
      const s = String(skill || "").toLowerCase()
      if (!s) continue
      // simple contains check; could be improved with word boundaries
      if (normalized.includes(s)) matched.push(skill)
    }
    const points = matched.length
    return { helpful: points > 0, points, matched, total: reqs.length }
  }

  return (
    <Card className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-bold">{candidate.name}</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            onClick={() => generateCandidatePDF(candidate, jobRequirements)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
        <div className="text-sm text-muted-foreground mt-1">{candidate.currentTitle}</div>
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
            <Mail className="h-4 w-4" />
            <span>{candidate.email}</span>
          </div>
          <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
            <Phone className="h-4 w-4" />
            <span>{candidate.phone}</span>
          </div>
          <div className="flex items-center gap-1 text-pink-600 dark:text-pink-400">
            <MapPin className="h-4 w-4" />
            <span>{candidate.location}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="match">
          <TabsList className={`grid w-full ${candidate.agenticAI ? 'grid-cols-6' : 'grid-cols-5'} p-1 bg-gray-100 dark:bg-slate-800 rounded-lg`}>
            <TabsTrigger
              value="match"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-300 rounded-md transition-all duration-200"
            >
              Match Analysis
            </TabsTrigger>
            <TabsTrigger
              value="experience"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300 rounded-md transition-all duration-200"
            >
              Experience
            </TabsTrigger>
            <TabsTrigger
              value="skills"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-pink-700 dark:data-[state=active]:text-pink-300 rounded-md transition-all duration-200"
            >
              Skills
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300 rounded-md transition-all duration-200"
            >
              Projects
            </TabsTrigger>
            <TabsTrigger
              value="profiles"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300 rounded-md transition-all duration-200"
            >
              Profiles
            </TabsTrigger>
            {candidate.agenticAI && (
              <TabsTrigger
                value="agentic-ai"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300 rounded-md transition-all duration-200"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Agentic AI
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="match" className="pt-4 space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                Overall Match
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${
                      candidate.matchScore > 85
                        ? "bg-gradient-to-r from-pink-500 to-indigo-500"
                        : "bg-gradient-to-r from-indigo-500 to-purple-500"
                    }`}
                    style={{ width: `${Math.round(candidate.matchScore)}%` }}
                  ></div>
                </div>
                <span className={`font-bold ${candidate.matchScore > 85 ? "text-pink-600 dark:text-pink-400" : "text-indigo-600 dark:text-indigo-400"}`}>
                  {Math.round(candidate.matchScore)}%
                </span>
              </div>
              {typeof candidate.experienceImpactBonus === 'number' && candidate.experienceImpactBonus > 0 && (
                <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  +{candidate.experienceImpactBonus.toFixed(2)} from experience helpfulness (avg points {Number(candidate.experiencePointsAvg || 0).toFixed(2)})
                </div>
              )}
              {typeof candidate.projectPoints === 'number' && candidate.projectPoints > 0 && (
                <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  +{candidate.projectPoints.toFixed(2)} from projects relevance
                </div>
              )}
              {typeof candidate.profilePoints === 'number' && candidate.profilePoints > 0 && (
                <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  +{candidate.profilePoints.toFixed(2)} from profiles relevance
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Requirements Match</h3>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-md border border-indigo-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-indigo-500" />
                  <span>Experience ({jobRequirements.minimumExperience}+ years)</span>
                </div>
                <div className="flex items-center gap-1">
                  {experienceMatch ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400 font-medium">{candidate.yearsOfExperience} years</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-600 dark:text-red-400 font-medium">{candidate.yearsOfExperience} years</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-md border border-purple-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-purple-500" />
                  <span>Education ({jobRequirements.educationLevel})</span>
                </div>
                <div className="flex items-center gap-1">
                  {educationMatch ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400 font-medium">{candidate.educationLevel}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-600 dark:text-red-400 font-medium">{candidate.educationLevel}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-pink-50 dark:from-slate-800 dark:to-slate-700 rounded-md border border-pink-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-pink-500" />
                  <span>Skills ({jobRequirements.requiredSkills.length})</span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`font-medium ${
                      candidate.matchedSkills.length === jobRequirements.requiredSkills.length
                        ? "text-green-600 dark:text-green-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {candidate.matchedSkills.length}/{jobRequirements.requiredSkills.length} matched
                  </span>
                </div>
              </div>
            </div>

            {candidate.checklist && candidate.checklist.length > 0 && (
              <div className="space-y-2 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-lg border border-indigo-100 dark:border-slate-700">
                <h3 className="text-sm font-medium flex items-center gap-1">
                  <ListChecks className="h-4 w-4 text-indigo-500" />
                  JD Checklist
                </h3>
                <ul className="space-y-2">
                  {candidate.checklist.map((item) => (
                    <li key={item.id} className="flex items-start justify-between rounded-md border p-2 bg-white dark:bg-slate-900 dark:border-slate-700">
                      <div>
                        <div className="font-medium text-sm">
                          {item.text} {item.must && <span className="ml-2 text-[10px] uppercase text-pink-600">must</span>}
                        </div>
                        <div className="text-xs mt-1">
                          <span className="text-green-700 dark:text-green-400">+ {item.matchedTags.map(tag => formatLabel(tag)).join(", ")}</span>
                          {item.missingTags.length > 0 && (
                            <span className="ml-2 text-red-600 dark:text-red-400">- {item.missingTags.map(tag => formatLabel(tag)).join(", ")}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 dark:bg-slate-800 rounded-full h-2">
                          <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${Math.round(item.coverage * 100)}%` }} />
                        </div>
                        {item.passed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-lg border border-indigo-100 dark:border-slate-700">
              <h3 className="text-sm font-medium flex items-center gap-1">
                <Star className="h-4 w-4 text-indigo-500" />
                AI Analysis
              </h3>
              <p className="text-sm">{candidate.aiAnalysis}</p>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="pt-4 space-y-4">
            {candidate.projectAnalysis && (
              <div className="p-3 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20 text-xs mb-4">
                {candidate.projectAnalysis}
              </div>
            )}
            {candidate.projects && candidate.projects.length > 0 ? (
              <div className="space-y-4">
                {candidate.projects.map((p, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-lg text-indigo-700 dark:text-indigo-300 mb-1">{p.title}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-300 mt-2">{p.description}</div>
                      </div>
                      {typeof p.points === 'number' && p.points > 0 ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200 border border-emerald-400/30 dark:border-emerald-500/30 whitespace-nowrap">
                          +{p.points.toFixed(1)} pts
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 whitespace-nowrap">
                          Not helpful
                        </Badge>
                      )}
                    </div>
                    {p.helpfulness && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">How it helps this JD:</div>
                        <div className="text-sm text-slate-700 dark:text-slate-200">{p.helpfulness}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No personal projects found.</div>
            )}
          </TabsContent>

          <TabsContent value="profiles" className="pt-4 space-y-4">
            {candidate.profileAnalysis && (
              <div className="p-3 rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-900/20 text-xs mb-4">
                {candidate.profileAnalysis}
              </div>
            )}
            {candidate.profilesWithAnalysis && candidate.profilesWithAnalysis.length > 0 ? (
              <div className="space-y-4">
                {candidate.profilesWithAnalysis.map((profile, idx) => {
                  const isGithub = profile.type === 'github'
                  const isLinkedin = profile.type === 'linkedin'
                  const isLeetcode = profile.type === 'leetcode'
                  const isGeeksforgeeks = profile.type === 'geeksforgeeks'
                  const isHackerrank = profile.type === 'hackerrank'
                  const isKaggle = profile.type === 'kaggle'
                  const isGitlab = profile.type === 'gitlab'
                  
                  // Ensure URL is properly formatted
                  let profileUrl = profile.url || ''
                  if (profileUrl && !profileUrl.startsWith('http://') && !profileUrl.startsWith('https://')) {
                    profileUrl = 'https://' + profileUrl
                  }
                  
                  // Validate URL format
                  let isValidUrl = false
                  try {
                    if (profileUrl) {
                      new URL(profileUrl)
                      isValidUrl = true
                    }
                  } catch {
                    isValidUrl = false
                  }
                  
                  const platformName = isGithub ? 'GitHub' :
                    isLinkedin ? 'LinkedIn' :
                    isLeetcode ? 'LeetCode' :
                    isGeeksforgeeks ? 'GeeksforGeeks' :
                    isHackerrank ? 'HackerRank' :
                    isKaggle ? 'Kaggle' :
                    isGitlab ? 'GitLab' :
                    'Profile'
                  
                  return (
                    <div key={idx} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          {isValidUrl ? (
                            <>
                              <a 
                                href={profileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-lg font-semibold text-indigo-700 dark:text-indigo-300 hover:underline inline-block cursor-pointer"
                              >
                                {platformName}
                              </a>
                              <a 
                                href={profileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-all block hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                              >
                                {profileUrl}
                              </a>
                            </>
                          ) : (
                            <>
                              <span className="text-lg font-semibold text-slate-600 dark:text-slate-400 inline-block">
                                {platformName}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-all block">
                                {profileUrl || 'URL not available'}
                              </span>
                            </>
                          )}
                          
                          {/* Platform-specific details */}
                          {isGithub && profile.data && (
                            <div className="mt-3 space-y-3">
                              {/* Highlighted Contributions Section */}
                              <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm">Total Contributions (Last 3 Years)</span>
                                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                    {profile.data.total_contributions?.toLocaleString() || 0}
                                  </span>
                                </div>
                                
                                {/* 3-Year Breakdown */}
                                {profile.data.contributions_by_year && profile.data.contributions_by_year.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-700">
                                    <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1.5">Year-by-Year Breakdown:</div>
                                    <div className="grid grid-cols-3 gap-2">
                                      {profile.data.contributions_by_year.map((yearData: { year: number; contributions: number }, idx: number) => (
                                        <div key={idx} className="text-center p-1.5 rounded bg-white/50 dark:bg-slate-800/50">
                                          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{yearData.year}</div>
                                          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-300 mt-0.5">
                                            {yearData.contributions?.toLocaleString() || 0}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Contribution Points (if available) */}
                                {(profile as any).contributionPoints !== undefined && (profile as any).contributionPoints > 0 && (
                                  <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-700">
                                    <div className="text-xs text-emerald-600 dark:text-emerald-400">
                                      Contribution Bonus: <span className="font-semibold">+{(profile as any).contributionPoints.toFixed(1)} points</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Other GitHub Stats */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                <div>
                                  <span className="font-medium text-slate-600 dark:text-slate-400">Repositories:</span>
                                  <span className="ml-1 text-slate-900 dark:text-slate-100">{profile.data.public_repos || 0}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-slate-600 dark:text-slate-400">Stars:</span>
                                  <span className="ml-1 text-slate-900 dark:text-slate-100">{profile.data.total_stars || 0}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-slate-600 dark:text-slate-400">Followers:</span>
                                  <span className="ml-1 text-slate-900 dark:text-slate-100">{profile.data.followers || 0}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-slate-600 dark:text-slate-400">Following:</span>
                                  <span className="ml-1 text-slate-900 dark:text-slate-100">{profile.data.following || 0}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* LinkedIn skills */}
                          {isLinkedin && profile.data && profile.data.skills && profile.data.skills.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Skills Found:</div>
                              <div className="flex flex-wrap gap-1">
                                {profile.data.skills.slice(0, 10).map((skill: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs px-2 py-0.5 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600">
                                    {skill}
                                  </Badge>
                                ))}
                                {profile.data.skills.length > 10 && (
                                  <Badge variant="outline" className="text-xs px-2 py-0.5 text-slate-500 dark:text-slate-400">
                                    +{profile.data.skills.length - 10} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* LeetCode problem stats */}
                          {isLeetcode && profile.data && (
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Problems Solved:</div>
                              <div className="grid grid-cols-4 gap-2 text-xs">
                                <div>
                                  <span className="font-medium text-slate-600 dark:text-slate-400">Total:</span>
                                  <span className="ml-1 text-slate-900 dark:text-slate-100 font-semibold">{profile.data.total_solved || 0}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-green-600 dark:text-green-400">Easy:</span>
                                  <span className="ml-1 text-slate-900 dark:text-slate-100">{profile.data.easy_solved || 0}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-yellow-600 dark:text-yellow-400">Medium:</span>
                                  <span className="ml-1 text-slate-900 dark:text-slate-100">{profile.data.medium_solved || 0}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-red-600 dark:text-red-400">Hard:</span>
                                  <span className="ml-1 text-slate-900 dark:text-slate-100">{profile.data.hard_solved || 0}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* GeeksforGeeks problem stats */}
                          {isGeeksforgeeks && profile.data && (
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Problems Solved:</div>
                              <div className="grid grid-cols-4 gap-2 text-xs">
                                <div>
                                  <span className="font-medium text-slate-600 dark:text-slate-400">Total:</span>
                                  <span className="ml-1 text-slate-900 dark:text-slate-100 font-semibold">{profile.data.total_solved || 0}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-green-600 dark:text-green-400">Easy:</span>
                                  <span className="ml-1 text-slate-900 dark:text-slate-100">{profile.data.easy_solved || 0}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-yellow-600 dark:text-yellow-400">Medium:</span>
                                  <span className="ml-1 text-slate-900 dark:text-slate-100">{profile.data.medium_solved || 0}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-red-600 dark:text-red-400">Hard:</span>
                                  <span className="ml-1 text-slate-900 dark:text-slate-100">{profile.data.hard_solved || 0}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {!isGithub && !isLinkedin && !isLeetcode && !isGeeksforgeeks && profile.data && profile.data.username && (
                            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                              Username: <span className="font-medium text-slate-900 dark:text-slate-100">{profile.data.username}</span>
                            </div>
                          )}
                        </div>
                        {typeof profile.points === 'number' && profile.points > 0 ? (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200 border border-amber-400/30 dark:border-amber-500/30 whitespace-nowrap">
                            +{profile.points.toFixed(1)} pts
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 whitespace-nowrap">
                            Not helpful
                          </Badge>
                        )}
                      </div>
                      
                      {profile.details && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Profile Details:</div>
                          <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{profile.details}</div>
                        </div>
                      )}
                      
                      {/* Matched JD Skills */}
                      {profile.matchedSkills && profile.matchedSkills.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Matched JD Skills:</div>
                          <div className="flex flex-wrap gap-1">
                            {profile.matchedSkills.map((skill: string, idx: number) => (
                              <Badge key={idx} className="text-xs px-2 py-0.5 bg-emerald-500/15 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-200 border border-emerald-400/30 dark:border-emerald-500/30">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {profile.analysis && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">How it helps this JD:</div>
                          <div className="text-sm text-slate-700 dark:text-slate-200">{profile.analysis}</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : candidate.profileLinks && candidate.profileLinks.length > 0 ? (
              <div className="flex flex-col gap-2">
                {candidate.profileLinks.map((pl, idx) => (
                  <a key={idx} href={pl.url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 dark:text-indigo-300 underline break-all">
                    {pl.url}
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No external profiles detected.</div>
            )}
          </TabsContent>

          <TabsContent value="experience" className="pt-4 space-y-4">
            {candidate.experienceAnalysis && (
              <div className="p-3 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20 text-xs">
                {candidate.experienceAnalysis}
              </div>
            )}
            {candidate.experience.map((exp, index) => {
              const evalTitle = evaluateExperienceHelpfulness(`${exp.title} ${exp.company}`)
              const evalDesc = evaluateExperienceHelpfulness(exp.description)
              const points = evalTitle.points + evalDesc.points
              const matched = Array.from(new Set([...
                evalTitle.matched,
                ...evalDesc.matched
              ]))
              const helpful = points > 0
              return (
                <div key={index} className="border-l-2 border-purple-300 dark:border-purple-700 pl-4 pb-4 relative">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-indigo-400"></div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-medium text-indigo-700 dark:text-indigo-300">{exp.title}</div>
                      <div className="text-sm text-purple-600 dark:text-purple-300 font-medium">{exp.company}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{exp.period}</div>
                    </div>
                    {helpful ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200 border border-emerald-400/30 dark:border-emerald-500/30">
                        Helpful +{points} pts
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-700">Not helpful</Badge>
                    )}
                  </div>
                  <p className="text-sm mt-2">{exp.description}</p>
                  {helpful && matched.length > 0 && (
                    <div className="mt-2 text-xs p-2 rounded-md bg-indigo-50/50 dark:bg-slate-800/60 border border-indigo-100 dark:border-slate-700">
                      <div className="font-medium mb-1">Why helpful</div>
                      <div className="flex flex-wrap gap-1">
                        {matched.map((m) => (
                          <Badge key={m} className="rounded-full px-2 py-0.5 bg-indigo-500/15 dark:bg-indigo-400/10 text-indigo-700 dark:text-indigo-200 border border-indigo-400/30 dark:border-indigo-500/30">
                            {m}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </TabsContent>

          <TabsContent value="skills" className="pt-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Matched Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {candidate.matchedSkills.map((skill) => (
                    <Badge
                      key={skill}
                      className="rounded-full px-3 py-1 bg-emerald-500/15 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-200 border border-emerald-400/30 dark:border-emerald-500/30 shadow-sm"
                    >
                      {skill}
                    </Badge>
                  ))}
                  {candidate.matchedSkills.length === 0 && (
                    <p className="text-sm text-muted-foreground">No matched skills found</p>
                  )}
                </div>
              </div>

              {candidate.inferredSkills && candidate.inferredSkills.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500" />
                    Inferred Skills <span className="text-xs text-muted-foreground ml-1">(Related)</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {candidate.inferredSkills.map((skill) => (
                    <Badge
                        key={skill}
                      className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-300 hover:from-amber-200 hover:to-orange-200 border-none"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Missing Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {missingSkills.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-red-500 dark:text-red-400 border-red-200 dark:border-red-700">
                      {skill}
                    </Badge>
                  ))}
                  {missingSkills.length === 0 && <p className="text-sm text-green-600">No missing skills</p>}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Star className="h-4 w-4 text-indigo-500" />
                  Additional Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {candidate.additionalSkills.map((skill) => (
                    <Badge
                      key={skill}
                      className="bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-slate-800 dark:to-slate-700 text-indigo-700 dark:text-indigo-300 hover:from-indigo-200 hover:to-purple-200 border-none"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Agentic AI Tab - Only shown when agentic AI data exists */}
          {candidate.agenticAI && (
            <TabsContent value="agentic-ai" className="pt-4 space-y-4">
              <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 via-pink-50 to-indigo-50 dark:from-slate-800 dark:via-slate-750 dark:to-slate-700 rounded-lg border border-purple-200 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-200">
                    🤖 Agentic AI Insights
                  </h3>
                  {candidate.agenticAI.confidence && (
                    <Badge className="ml-auto bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                      Confidence: {Math.round(candidate.agenticAI.confidence * 100)}%
                    </Badge>
                  )}
                </div>

                {/* Recommendation */}
                {candidate.agenticAI.recommendation && (
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-slate-700">
                    <div className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-1">
                      Recommendation
                    </div>
                    <div className="text-base font-medium capitalize">
                      {candidate.agenticAI.recommendation}
                    </div>
                  </div>
                )}

                {/* Score Breakdown */}
                {candidate.agenticAI.scoreBreakdown && Object.keys(candidate.agenticAI.scoreBreakdown).length > 0 && (
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-slate-700">
                    <div className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-2">
                      Score Breakdown
                    </div>
                    <div className="space-y-2">
                      {Object.entries(candidate.agenticAI.scoreBreakdown).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm text-slate-600 dark:text-slate-300">{formatLabel(key)}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" 
                                style={{ width: `${Math.min(100, Math.max(0, value as number))}%` }} 
                              />
                            </div>
                            <span className="text-sm font-medium w-10 text-right">{value as number}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths */}
                {candidate.agenticAI.strengths && candidate.agenticAI.strengths.length > 0 && (
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-green-200 dark:border-green-800">
                    <div className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                      ✅ Strengths
                    </div>
                    <ul className="space-y-1">
                      {candidate.agenticAI.strengths.map((strength, idx) => (
                        <li key={idx} className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses */}
                {candidate.agenticAI.weaknesses && candidate.agenticAI.weaknesses.length > 0 && (
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800">
                    <div className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                      ⚠️ Areas for Improvement
                    </div>
                    <ul className="space-y-1">
                      {candidate.agenticAI.weaknesses.map((weakness, idx) => (
                        <li key={idx} className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2">
                          <span className="text-amber-500 mt-1">•</span>
                          <span>{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Cultural Fit */}
                {candidate.agenticAI.culturalFit && (
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800">
                    <div className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                      🤝 Cultural Fit
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-200">{candidate.agenticAI.culturalFit}</div>
                  </div>
                )}

                {/* Interview Questions */}
                {candidate.agenticAI.interviewQuestions && candidate.agenticAI.interviewQuestions.length > 0 && (
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800">
                    <div className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
                      💬 Suggested Interview Questions
                    </div>
                    <ol className="space-y-2 list-decimal list-inside">
                      {candidate.agenticAI.interviewQuestions.map((question, idx) => (
                        <li key={idx} className="text-sm text-slate-700 dark:text-slate-200">
                          {question}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Next Steps */}
                {candidate.agenticAI.nextSteps && candidate.agenticAI.nextSteps.length > 0 && (
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800">
                    <div className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-2">
                      📋 Recommended Next Steps
                    </div>
                    <ul className="space-y-1">
                      {candidate.agenticAI.nextSteps.map((step, idx) => (
                        <li key={idx} className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2">
                          <span className="text-purple-500 mt-1">→</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Hiring Manager Note */}
                {candidate.agenticAI.hiringManagerNote && (
                  <div className="p-3 rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-300 dark:border-purple-700">
                    <div className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-1">
                      📝 Hiring Manager Note
                    </div>
                    <div className="text-sm text-slate-800 dark:text-slate-100">{candidate.agenticAI.hiringManagerNote}</div>
                  </div>
                )}

                {/* Workflow Log (for debugging) */}
                {candidate.agenticAI.workflowLog && candidate.agenticAI.workflowLog.length > 0 && process.env.NODE_ENV === 'development' && (
                  <details className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <summary className="text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
                      🔍 Workflow Log (Dev Only)
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-500">
                      {candidate.agenticAI.workflowLog.map((log, idx) => (
                        <li key={idx}>{log}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}

