import { jsPDF } from 'jspdf'
import type { Candidate, JobRequirements } from '@/lib/types'

/**
 * Helper function to format labels: remove underscores and capitalize properly
 */
function formatLabel(text: string): string {
  return text
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Generate and download professional PDF report for a single candidate
 * Includes agentic AI insights if available
 */
export async function generateCandidatePDF(candidate: Candidate, jobRequirements: JobRequirements) {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  const footerHeight = 15
  const usableHeight = pageHeight - margin - footerHeight
  let yPosition = margin

  // Helper function to calculate text height
  const calculateTextHeight = (text: string, fontSize: number, maxWidth: number): number => {
    pdf.setFontSize(fontSize)
    const lines = pdf.splitTextToSize(text, maxWidth)
    return lines.length * (fontSize * 0.5)
  }

  // Helper function to add a new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > usableHeight) {
      pdf.addPage()
      yPosition = margin
      return true
    }
    return false
  }

  // Helper function to ensure content fits completely on page
  const ensureFits = (totalHeight: number) => {
    if (yPosition + totalHeight > usableHeight) {
      pdf.addPage()
      yPosition = margin
    }
  }

  // Helper function to add text with wrapping
  const addText = (text: string, fontSize: number, isBold = false, color: [number, number, number] = [0, 0, 0], xOffset = 0) => {
    pdf.setFontSize(fontSize)
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal')
    pdf.setTextColor(color[0], color[1], color[2])
    
    const maxWidth = contentWidth - xOffset
    const lines = pdf.splitTextToSize(text, maxWidth)
    const lineHeight = fontSize * 0.5
    
    lines.forEach((line: string) => {
      checkNewPage(lineHeight + 2)
      pdf.text(line, margin + xOffset, yPosition)
      yPosition += lineHeight
    })
  }

  // Helper function to add a section header
  const addSectionHeader = (title: string) => {
    checkNewPage(15)
    yPosition += 5
    pdf.setFillColor(59, 130, 246)
    pdf.rect(margin, yPosition - 2, contentWidth, 6, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text(title, margin + 3, yPosition + 3)
    yPosition += 10
    pdf.setTextColor(0, 0, 0)
  }

  // Simple header
  pdf.setFillColor(59, 130, 246)
  pdf.rect(0, 0, pageWidth, 30, 'F')
  
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(18)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Candidate Analysis Report', margin, 18)
  
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  const dateStr = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  pdf.text(`Generated: ${dateStr}`, margin, 25)
  
  if (candidate.agenticAI) {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.text('🤖 Agentic AI', pageWidth - margin - 30, 25)
  }
  
  yPosition = 40

  // Executive Summary
  addSectionHeader('Executive Summary')
  
  const scoreColor = candidate.matchScore >= 80 ? [34, 197, 94] : candidate.matchScore >= 60 ? [234, 179, 8] : [239, 68, 68]
  addText(`Overall Score: ${candidate.matchScore.toFixed(1)}%`, 14, true, scoreColor as [number, number, number])
  yPosition += 4
  
  if (candidate.agenticAI?.recommendation) {
    const recColor = candidate.agenticAI.recommendation.toLowerCase().includes('strongly') ? [34, 197, 94] :
                     candidate.agenticAI.recommendation.toLowerCase().includes('recommend') ? [59, 130, 246] :
                     candidate.agenticAI.recommendation.toLowerCase().includes('consider') ? [234, 179, 8] : [239, 68, 68]
    addText(`Recommendation: ${candidate.agenticAI.recommendation.toUpperCase()}`, 11, true, recColor as [number, number, number])
    yPosition += 4
  }
  
  if (candidate.agenticAI?.confidence) {
    addText(`Confidence: ${Math.round(candidate.agenticAI.confidence * 100)}%`, 10, false, [128, 128, 128])
    yPosition += 4
  }
  
  yPosition += 5

  // Candidate Information
  addSectionHeader('Candidate Information')
  
  const infoItems = [
    ['Name', candidate.name || 'N/A'],
    ['Email', candidate.email || 'N/A'],
    ['Phone', candidate.phone || 'N/A'],
    ['Location', candidate.location || 'N/A'],
    ['Current Title', candidate.currentTitle || 'N/A'],
    ['Experience', `${candidate.yearsOfExperience || 0} years`],
    ['Education', candidate.educationLevel || 'N/A'],
  ]
  
  infoItems.forEach(([label, value]) => {
    checkNewPage(8)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(60, 60, 60)
    pdf.text(`${label}:`, margin, yPosition)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(0, 0, 0)
    const valueLines = pdf.splitTextToSize(String(value), contentWidth - 50)
    pdf.text(valueLines[0], margin + 45, yPosition)
    if (valueLines.length > 1) {
      yPosition += 5
      pdf.text(valueLines.slice(1).join(' '), margin + 45, yPosition)
    }
    yPosition += 7
  })
  
  yPosition += 5

  // Agentic AI Score Breakdown
  if (candidate.agenticAI?.scoreBreakdown && Object.keys(candidate.agenticAI.scoreBreakdown).length > 0) {
    addSectionHeader('Score Breakdown')
    
    Object.entries(candidate.agenticAI.scoreBreakdown).forEach(([key, value]) => {
      checkNewPage(10)
      const score = value as number
      const scoreColor = score >= 80 ? [34, 197, 94] : score >= 60 ? [234, 179, 8] : [239, 68, 68]
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(60, 60, 60)
      pdf.text(`${formatLabel(key)}:`, margin, yPosition)
      pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2])
      pdf.text(`${score}%`, margin + 80, yPosition)
      pdf.setTextColor(0, 0, 0)
      yPosition += 8
    })
    
    yPosition += 5
  }

  // Skills Analysis
  addSectionHeader('Skills Analysis')
  
  if (candidate.matchedSkills && candidate.matchedSkills.length > 0) {
    const skillsText = candidate.matchedSkills.join(', ')
    const skillsHeight = calculateTextHeight(skillsText, 10, contentWidth) + 8
    ensureFits(skillsHeight)
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(34, 197, 94)
    pdf.text(`Matched Skills (${candidate.matchedSkills.length}):`, margin, yPosition)
    yPosition += 6
    addText(skillsText, 10)
    yPosition += 5
  }
  
  if (candidate.inferredSkills && candidate.inferredSkills.length > 0) {
    const skillsText = candidate.inferredSkills.join(', ')
    const skillsHeight = calculateTextHeight(skillsText, 10, contentWidth) + 8
    ensureFits(skillsHeight)
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(59, 130, 246)
    pdf.text(`Related Skills (${candidate.inferredSkills.length}):`, margin, yPosition)
    yPosition += 6
    addText(skillsText, 10)
    yPosition += 5
  }
  
  if (candidate.additionalSkills && candidate.additionalSkills.length > 0) {
    const skillsText = candidate.additionalSkills.join(', ')
    const skillsHeight = calculateTextHeight(skillsText, 10, contentWidth) + 8
    ensureFits(skillsHeight)
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(128, 128, 128)
    pdf.text(`Additional Skills (${candidate.additionalSkills.length}):`, margin, yPosition)
    yPosition += 6
    addText(skillsText, 10)
    yPosition += 5
  }
  
  yPosition += 5

  // Agentic AI: Strengths
  if (candidate.agenticAI?.strengths && candidate.agenticAI.strengths.length > 0) {
    addSectionHeader('Strengths')
    
    candidate.agenticAI.strengths.forEach((strength) => {
      const strengthHeight = calculateTextHeight(strength, 10, contentWidth - 10) + 3
      ensureFits(strengthHeight)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(0, 0, 0)
      pdf.text(`•`, margin, yPosition)
      addText(strength, 10, false, [0, 0, 0], 8)
      yPosition += 2
    })
    
    yPosition += 5
  }

  // Agentic AI: Weaknesses
  if (candidate.agenticAI?.weaknesses && candidate.agenticAI.weaknesses.length > 0) {
    addSectionHeader('Areas for Improvement')
    
    candidate.agenticAI.weaknesses.forEach((weakness) => {
      const weaknessHeight = calculateTextHeight(weakness, 10, contentWidth - 10) + 3
      ensureFits(weaknessHeight)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(0, 0, 0)
      pdf.text(`•`, margin, yPosition)
      addText(weakness, 10, false, [0, 0, 0], 8)
      yPosition += 2
    })
    
    yPosition += 5
  }

  // Agentic AI: Cultural Fit
  if (candidate.agenticAI?.culturalFit) {
    addSectionHeader('Cultural Fit')
    const culturalFitHeight = calculateTextHeight(candidate.agenticAI.culturalFit, 10, contentWidth) + 5
    ensureFits(culturalFitHeight)
    addText(candidate.agenticAI.culturalFit, 10)
    yPosition += 5
  }

  // Work Experience
  if (candidate.experience && candidate.experience.length > 0) {
    addSectionHeader('Work Experience')
    
    candidate.experience.slice(0, 5).forEach((exp, idx) => {
      let itemHeight = 6 // title
      itemHeight += 5 // company
      if (exp.period) itemHeight += 5
      if (exp.description) {
        const desc = exp.description.length > 600 ? exp.description.substring(0, 600) + '...' : exp.description
        itemHeight += calculateTextHeight(desc, 9, contentWidth) + 3
      }
      itemHeight += 5
      
      ensureFits(itemHeight)
      
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(59, 130, 246)
      pdf.text(`${exp.title || 'N/A'}`, margin, yPosition)
      yPosition += 6
      
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(60, 60, 60)
      pdf.text(`${exp.company || 'N/A'}`, margin, yPosition)
      yPosition += 5
      
      if (exp.period) {
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(128, 128, 128)
        pdf.text(`Period: ${exp.period}`, margin, yPosition)
        yPosition += 5
      }
      
      if (exp.description) {
        const desc = exp.description.length > 600 ? exp.description.substring(0, 600) + '...' : exp.description
        addText(desc, 9)
        yPosition += 3
      }
      
      yPosition += 5
    })
    
    yPosition += 5
  }

  // Projects
  if (candidate.projects && candidate.projects.length > 0) {
    addSectionHeader('Projects')
    
    candidate.projects.slice(0, 5).forEach((project) => {
      let itemHeight = 6 // title
      if (project.description) {
        const desc = project.description.length > 600 ? project.description.substring(0, 600) + '...' : project.description
        itemHeight += calculateTextHeight(desc, 9, contentWidth) + 3
      }
      if (project.points) itemHeight += 6
      itemHeight += 5
      
      ensureFits(itemHeight)
      
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(59, 130, 246)
      pdf.text(`${project.title || 'N/A'}`, margin, yPosition)
      yPosition += 6
      
      if (project.description) {
        const desc = project.description.length > 600 ? project.description.substring(0, 600) + '...' : project.description
        addText(desc, 9)
        yPosition += 3
      }
      
      if (project.points && project.points > 0) {
        checkNewPage(6)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(34, 197, 94)
        pdf.text(`Points: ${project.points.toFixed(1)}`, margin, yPosition)
        pdf.setTextColor(0, 0, 0)
        yPosition += 6
      }
      
      yPosition += 5
    })
    
    yPosition += 5
  }

  // External Profiles
  if (candidate.profilesWithAnalysis && candidate.profilesWithAnalysis.length > 0) {
    addSectionHeader('External Profiles')
    
    candidate.profilesWithAnalysis.forEach((profile) => {
      const platformName = profile.type === 'github' ? 'GitHub' :
        profile.type === 'linkedin' ? 'LinkedIn' :
        profile.type === 'leetcode' ? 'LeetCode' :
        profile.type === 'geeksforgeeks' ? 'GeeksforGeeks' :
        profile.type?.toUpperCase() || 'Profile'
      
      const urlLines = pdf.splitTextToSize(profile.url, contentWidth - 50)
      let itemHeight = 6 + (urlLines.length * 5)
      if (profile.points) itemHeight += 5
      if (profile.type === 'github' && profile.data?.contributions) itemHeight += 5
      itemHeight += 3
      
      ensureFits(itemHeight)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(59, 130, 246)
      pdf.text(`${platformName}:`, margin, yPosition)
      
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(0, 0, 150)
      pdf.setFontSize(9)
      pdf.text(urlLines[0], margin + 45, yPosition)
      yPosition += 5
      
      if (profile.points && profile.points > 0) {
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(34, 197, 94)
        pdf.text(`Points: ${profile.points.toFixed(1)}`, margin + 45, yPosition)
        pdf.setTextColor(0, 0, 0)
        yPosition += 5
      }
      
      if (profile.type === 'github' && profile.data?.contributions) {
        const contrib = profile.data.contributions
        if (contrib.total) {
          pdf.setFontSize(8)
          pdf.setTextColor(128, 128, 128)
          pdf.text(`Contributions (3 years): ${contrib.total}`, margin + 45, yPosition)
          pdf.setTextColor(0, 0, 0)
          yPosition += 5
        }
      }
      
      yPosition += 3
    })
    
    yPosition += 5
  }

  // Agentic AI: Interview Questions
  if (candidate.agenticAI?.interviewQuestions && candidate.agenticAI.interviewQuestions.length > 0) {
    addSectionHeader('Interview Questions')
    
    candidate.agenticAI.interviewQuestions.forEach((question, idx) => {
      const questionHeight = calculateTextHeight(question, 9, contentWidth - 15) + 8
      ensureFits(questionHeight)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(59, 130, 246)
      pdf.text(`Q${idx + 1}:`, margin, yPosition)
      addText(question, 9, false, [0, 0, 0], 12)
      yPosition += 5
    })
    
    yPosition += 5
  }

  // Agentic AI: Next Steps
  if (candidate.agenticAI?.nextSteps && candidate.agenticAI.nextSteps.length > 0) {
    addSectionHeader('Next Steps')
    
    candidate.agenticAI.nextSteps.forEach((step, idx) => {
      const stepHeight = calculateTextHeight(step, 10, contentWidth - 10) + 2
      ensureFits(stepHeight)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(0, 0, 0)
      pdf.text(`${idx + 1}.`, margin, yPosition)
      addText(step, 10, false, [0, 0, 0], 8)
      yPosition += 2
    })
    
    yPosition += 5
  }

  // Agentic AI: Hiring Manager Note
  if (candidate.agenticAI?.hiringManagerNote) {
    addSectionHeader('Hiring Manager Note')
    const noteHeight = calculateTextHeight(candidate.agenticAI.hiringManagerNote, 10, contentWidth) + 5
    ensureFits(noteHeight)
    addText(candidate.agenticAI.hiringManagerNote, 10)
    yPosition += 5
  }

  // AI Analysis
  if (candidate.aiAnalysis) {
    addSectionHeader('AI Analysis')
    const analysisText = candidate.aiAnalysis.length > 1200 
      ? candidate.aiAnalysis.substring(0, 1200) + '...' 
      : candidate.aiAnalysis
    const analysisHeight = calculateTextHeight(analysisText, 10, contentWidth) + 5
    ensureFits(analysisHeight)
    addText(analysisText, 10)
    yPosition += 5
  }

  // JD Checklist
  if (candidate.checklist && candidate.checklist.length > 0) {
    addSectionHeader('JD Requirements Checklist')
    
    candidate.checklist.forEach((item) => {
      const statusColor = item.passed ? [34, 197, 94] : [239, 68, 68]
      const statusText = item.passed ? 'PASSED' : 'FAILED'
      
      // Calculate width needed for status text
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      const statusTextWidth = pdf.getTextWidth(statusText)
      const statusMargin = 25 // Space for status text + margin
      
      // Calculate available width for main text (leave space for status)
      const mainTextWidth = contentWidth - statusMargin
      
      // Calculate heights
      let itemHeight = 0
      
      // Main text height
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      const mainTextLines = pdf.splitTextToSize(item.text, mainTextWidth)
      itemHeight += mainTextLines.length * 6 + 3
      
      if (item.matchedTags && item.matchedTags.length > 0) {
        const matchedText = `Matched: ${item.matchedTags.map(t => formatLabel(t)).join(', ')}`
        itemHeight += calculateTextHeight(matchedText, 8, contentWidth - 5) + 4
      }
      if (item.missingTags && item.missingTags.length > 0) {
        const missingText = `Missing: ${item.missingTags.map(t => formatLabel(t)).join(', ')}`
        itemHeight += calculateTextHeight(missingText, 8, contentWidth - 5) + 4
      }
      itemHeight += 5 // coverage
      itemHeight += 5
      
      ensureFits(itemHeight)
      
      // Render main text with proper wrapping
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      const textLines = pdf.splitTextToSize(item.text, mainTextWidth)
      textLines.forEach((line: string, idx: number) => {
        checkNewPage(6)
        pdf.text(line, margin, yPosition)
        // Only add status on first line if text fits on one line
        if (idx === 0 && textLines.length === 1) {
          pdf.setFontSize(9)
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2])
          pdf.text(statusText, pageWidth - margin - statusTextWidth, yPosition)
          pdf.setTextColor(0, 0, 0)
        }
        yPosition += 6
      })
      
      // Add status on new line if text wrapped
      if (textLines.length > 1) {
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2])
        pdf.text(statusText, pageWidth - margin - statusTextWidth, yPosition - 6)
        pdf.setTextColor(0, 0, 0)
      }
      
      yPosition += 3
      
      if (item.matchedTags && item.matchedTags.length > 0) {
        const matchedText = `Matched: ${item.matchedTags.map(t => formatLabel(t)).join(', ')}`
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(34, 197, 94)
        addText(matchedText, 8, false, [34, 197, 94], 5)
        yPosition += 4
      }
      
      if (item.missingTags && item.missingTags.length > 0) {
        const missingText = `Missing: ${item.missingTags.map(t => formatLabel(t)).join(', ')}`
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(239, 68, 68)
        addText(missingText, 8, false, [239, 68, 68], 5)
        yPosition += 4
      }
      
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(128, 128, 128)
      pdf.text(`Coverage: ${(item.coverage * 100).toFixed(1)}%`, margin + 5, yPosition)
      pdf.setTextColor(0, 0, 0)
      
      yPosition += 5
    })
    
    yPosition += 5
  }

  // Job Requirements
  addSectionHeader('Job Requirements')
  
  let jobReqHeight = 7 // title
  jobReqHeight += 6 // experience
  jobReqHeight += 6 // education
  if (jobRequirements.requiredSkills && jobRequirements.requiredSkills.length > 0) {
    const skillsText = jobRequirements.requiredSkills.join(', ')
    jobReqHeight += 6 + calculateTextHeight(skillsText, 10, contentWidth) + 3
  }
  if (jobRequirements.jobDescription) {
    const desc = jobRequirements.jobDescription.length > 800 
      ? jobRequirements.jobDescription.substring(0, 800) + '...' 
      : jobRequirements.jobDescription
    jobReqHeight += 6 + calculateTextHeight(desc, 9, contentWidth) + 3
  }
  jobReqHeight += 5
  
  ensureFits(jobReqHeight)
  
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(59, 130, 246)
  pdf.text(`Job Title: ${jobRequirements.jobTitle || 'N/A'}`, margin, yPosition)
  yPosition += 7
  
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(0, 0, 0)
  pdf.text(`Minimum Experience: ${jobRequirements.minimumExperience || 0} years`, margin, yPosition)
  yPosition += 6
  
  pdf.text(`Education Level: ${jobRequirements.educationLevel || 'N/A'}`, margin, yPosition)
  yPosition += 6
  
  if (jobRequirements.requiredSkills && jobRequirements.requiredSkills.length > 0) {
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(60, 60, 60)
    pdf.text(`Required Skills:`, margin, yPosition)
    yPosition += 6
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(0, 0, 0)
    addText(jobRequirements.requiredSkills.join(', '), 10)
    yPosition += 3
  }
  
  if (jobRequirements.jobDescription) {
    const desc = jobRequirements.jobDescription.length > 800 
      ? jobRequirements.jobDescription.substring(0, 800) + '...' 
      : jobRequirements.jobDescription
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(60, 60, 60)
    pdf.text(`Description:`, margin, yPosition)
    yPosition += 6
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(128, 128, 128)
    addText(desc, 9)
    yPosition += 3
  }
  
  yPosition += 5

  // Footer on all pages
  const totalPages = pdf.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i)
    
    pdf.setDrawColor(200, 200, 200)
    pdf.setLineWidth(0.3)
    pdf.line(margin, pageHeight - footerHeight, pageWidth - margin, pageHeight - footerHeight)
    
    pdf.setFontSize(8)
    pdf.setTextColor(128, 128, 128)
    
    pdf.text('RoleFit AI - Resume Screening System', margin, pageHeight - 8)
    
    const pageText = `Page ${i} of ${totalPages}`
    pdf.text(pageText, pageWidth - margin - pdf.getTextWidth(pageText), pageHeight - 8)
    
    const dateText = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
    pdf.text(dateText, pageWidth / 2, pageHeight - 8, { align: 'center' })
  }

  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0]
  const sanitizedName = (candidate.name || 'Candidate').replace(/[^a-z0-9]/gi, '_').substring(0, 30)
  const filename = `Candidate_Report_${sanitizedName}_${timestamp}.pdf`

  // Download PDF
  pdf.save(filename)
}
