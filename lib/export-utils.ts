import * as XLSX from 'xlsx'
import type { Candidate } from '@/lib/types'

/**
 * Export all candidates to Excel file
 * Columns: Name, Email, Score, Skills, Skill Score, Experience, Education, Location, Phone
 */
export function exportCandidatesToExcel(candidates: Candidate[], jobTitle: string) {
  // Sort candidates by score (descending)
  const sortedCandidates = [...candidates].sort((a, b) => b.matchScore - a.matchScore)

  // Prepare data for Excel
  const excelData = sortedCandidates.map((candidate, index) => {
    // Calculate skill score (percentage of matched skills)
    const skillScore = candidate.matchedSkills.length > 0
      ? `${candidate.matchedSkills.length} skill${candidate.matchedSkills.length > 1 ? 's' : ''} matched`
      : 'No skills matched'

    return {
      'Rank': index + 1,
      'Name': candidate.name || 'N/A',
      'Email': candidate.email || 'N/A',
      'Phone': candidate.phone || 'N/A',
      'Location': candidate.location || 'N/A',
      'Score': candidate.matchScore || 0,
      'Current Title': candidate.currentTitle || 'N/A',
      'Years of Experience': candidate.yearsOfExperience || 0,
      'Education Level': candidate.educationLevel || 'N/A',
      'Skills': candidate.matchedSkills.join(', ') || 'N/A',
      'Skill Score': skillScore,
      'Total Skills Matched': candidate.matchedSkills.length || 0,
      'Additional Skills': candidate.additionalSkills?.join(', ') || 'N/A',
      'Inferred Skills': candidate.inferredSkills?.join(', ') || 'N/A',
    }
  })

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(excelData)

  // Set column widths
  const colWidths = [
    { wch: 5 },   // Rank
    { wch: 25 },  // Name
    { wch: 30 },  // Email
    { wch: 15 },  // Phone
    { wch: 20 },  // Location
    { wch: 8 },   // Score
    { wch: 25 },  // Current Title
    { wch: 10 },  // Years of Experience
    { wch: 15 },  // Education Level
    { wch: 40 },  // Skills
    { wch: 20 },  // Skill Score
    { wch: 10 },  // Total Skills Matched
    { wch: 40 },  // Additional Skills
    { wch: 40 },  // Inferred Skills
  ]
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Candidates')

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `candidates_${jobTitle.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.xlsx`

  // Write file
  XLSX.writeFile(wb, filename)
}

