'use client'

import { Printer } from 'lucide-react'

interface UnifiedReportCardProps {
  student: { full_name: string; admission_number: string; class_name: string; position?: string | number; no_in_class?: string | number }
  results: any[]
  session: string
  term: string
  attendance?: { opened: number; present: number; punctual: number; beg_term: string; end_term: string; next_term: string }
  conductRatings?: Record<string, string>
  physicalSkills?: Record<string, string>
  healthComment?: string
  teacherComment?: string
  principalComment?: string
  className?: string
  teacherSignatureUrl?: string | null
  principalSignatureUrl?: string |null
  stampUrl?: string | null
  teacherDate?: string | null
  headTeacherDate?: string | null
}

const CONDUCT = ['Attentiveness', 'Cleanliness', 'Emotional Balance', 'Honesty', 'Leadership', 'Maturity', 'Politeness', 'Punctuality']
const PHYSICAL = ['Handwriting', 'Verbal Fluency', 'Debate/Quiz', 'Sports', 'Drawing & Painting', 'Musical Skills', 'Handling Tools']

export default function UnifiedReportCard(props: UnifiedReportCardProps) {
  const { student, results, session, term, className = '' } = props

  const termNum = term.toLowerCase().includes('first') ? '1ST' : term.toLowerCase().includes('second') ? '2ND' : '3RD'

  // ✅ TERM-AWARE COLUMNS:
  // 1st Term card  → CA, Exam, Total, Position, Remarks ONLY
  // 2nd Term card  → + First Term column
  // 3rd Term card  → + First Term + Second Term columns
  const showFirstTermCol = !term.toLowerCase().includes('first')
  const showSecondTermCol = term.toLowerCase().includes('third')

  const handlePrint = () => {
    if (results.length === 0) return

    const isPrimary = student.class_name.toLowerCase().includes('primary') || student.class_name.toLowerCase().includes('nursery')
    const logoToUse = isPrimary
      ? "https://mecvtpnqmffqvniioudk.supabase.co/storage/v1/object/public/school-assets/logo_primary.png"
      : "https://mecvtpnqmffqvniioudk.supabase.co/storage/v1/object/public/school-assets/logo_secondary.png"

    let grandTotal = 0
    results.forEach(r => { grandTotal += (r.ca_score || 0) + (r.exam_score || 0) })
    const maxTotal = results.length * 100
    const overallPct = maxTotal > 0 ? ((grandTotal / maxTotal) * 100).toFixed(1) : '0'

    const getGrade = (p: number) => p >= 75 ? 'A1' : p >= 70 ? 'B2' : p >= 65 ? 'B3' : p >= 60 ? 'C4' : p >= 55 ? 'C5' : p >= 50 ? 'C6' : p >= 45 ? 'D7' : p >= 40 ? 'E8' : 'F9'
    const overallGrade = getGrade(parseFloat(overallPct))
    const passed = parseFloat(overallPct) >= 40

    // Subject rows (columns adapt to the term)
    let subjectsHtml = ''
    results.forEach((r, i) => {
      const ca = r.ca_score || 0, ex = r.exam_score || 0, tot = ca + ex
      const ft = (r.first_term_total === null || r.first_term_total === undefined) ? '-' : r.first_term_total
      const st = (r.second_term_total === null || r.second_term_total === undefined) ? '-' : r.second_term_total
      subjectsHtml += `<tr>
        <td>${i + 1}. ${r.subject_name || 'Unknown'}</td>
        <td style="text-align:center">${ca}</td>
        <td style="text-align:center">${ex}</td>
        <td style="text-align:center;font-weight:bold">${tot}</td>
        <td style="text-align:center">${r.position || '-'}</td>
        ${showFirstTermCol ? `<td style="text-align:center">${ft}</td>` : ''}
        ${showSecondTermCol ? `<td style="text-align:center">${st}</td>` : ''}
        <td style="text-align:center">${r.remark || (tot >= 40 ? 'Pass' : 'Fail')}</td>
      </tr>`
    })

    // Rating tables helper
    const ratingRows = (items: string[], ratings?: Record<string, string>) => items.map(item => {
      const v = ratings?.[item] || 'Good'
      return `<tr>
        <td>${item}</td>
        <td style="text-align:center">${v === 'Excellent' ? '✓' : ''}</td>
        <td style="text-align:center">${v === 'Good' ? '✓' : ''}</td>
        <td style="text-align:center">${v === 'Fair' ? '✓' : ''}</td>
        <td style="text-align:center">${v === 'Poor' ? '✓' : ''}</td>
      </tr>`
    }).join('')

    const att = props.attendance || { opened: 0, present: 0, punctual: 0, beg_term: '6th April 2026', end_term: '6th July 2026', next_term: 'To be announced' }

    const printWindow = window.open('', '_blank', 'width=900,height=1100')
    if (!printWindow) { alert('Please allow popups to print report cards'); return }

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<title>Report Card - ${student.full_name}</title>
<style>
  @media print { @page { size: A4; margin: 6mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  * { box-sizing: border-box; }
  body { 
    font-family: 'Times New Roman', Arial, serif; 
    font-size: 10px; 
    line-height: 1.25; 
    color: #000; 
    margin: 0; 
    padding: 4px; 
    background: #fff; 
    font-weight: bold;
  }
  .header { display: flex; align-items: center; gap: 10px; border-bottom: 2px solid #16a34a; padding-bottom: 5px; margin-bottom: 6px; }
  .logo { width: 80px; height: 80px; object-fit: contain; }
  .school-info { flex: 1; text-align: center; }
  h1 { margin: 0; font-size: 16px; color: #16a34a; text-transform: uppercase; font-weight: bold; }
  h2 { margin: 1px 0; font-size: 11px; font-style: italic; color: #333; font-weight: bold; }
  .addr { margin: 1px 0; font-size: 9px; color: #555; font-weight: bold; }
  .title { text-align: center; font-size: 13px; font-weight: bold; margin: 5px 0; text-transform: uppercase; }
  .srow { display: flex; justify-content: space-between; font-size: 10px; border-bottom: 1px solid #999; padding-bottom: 3px; margin-bottom: 6px; font-weight: bold; }
  .srow span { flex: 1; }
  .sec { font-weight: bold; font-size: 11px; margin: 6px 0 3px 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  th, td { border: 1px solid #000; padding: 3px 4px; font-size: 9.5px; font-weight: bold; }
  th { background: #f0fdf4; text-align: center; font-size: 9px; font-weight: bold; }
  .two { display: flex; gap: 6px; }
  .two > div { flex: 1; }
  .sum td { font-weight: bold; background: #f0fdf4; }
  .sig { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14px; }
  .sig-box { width: 30%; text-align: center; font-size: 9px; font-weight: bold; }
  .sig-line { border-top: 1px solid #000; padding-top: 3px; }
  .stamp { 
    width: 72px; height: 72px; 
    border: 2px double #16a34a; 
    border-radius: 50%; 
    display: flex; align-items: center; justify-content: center; 
    color: #16a34a; font-weight: bold; font-size: 8px; text-align: center; 
    transform: rotate(-15deg); opacity: 0.85; margin: 0 auto; 
  }
</style>
</head>
<body>
  <div class="header">
    <img src="${logoToUse}" class="logo" alt="Logo" />
    <div class="school-info">
      <h1>Mannaplus Group of Schools</h1>
      <h2>Motto: Grooming the Future Leaders</h2>
      <p class="addr">34, Orisun Ibukun Avenue, Arinko Sango Ota, Ogun State | +23434287228, +2348034967499 | mannapluscollege@school.com</p>
    </div>
  </div>

  <div class="title">Continuous Assessment Report<br/>${termNum} TERM ${session} SESSION</div>

  <div class="srow">
    <span><strong>Name of Student:</strong> ${student.full_name}</span>
    <span><strong>Class:</strong> ${student.class_name}</span>
    <span><strong>No in Class:</strong> ${student.no_in_class || '-'}</span>
    <span><strong>Position:</strong> ${student.position || '-'}</span>
  </div>

  <div class="sec">1. ATTENDANCE</div>
  <table>
    <tr>
      <td style="width:28%"><strong>No of times school opened</strong></td><td style="width:10%;text-align:center">${att.opened}</td>
      <td style="width:24%"><strong>No of times present</strong></td><td style="width:10%;text-align:center">${att.present}</td>
      <td style="width:18%"><strong>No of times punctual</strong></td><td style="width:10%;text-align:center">${att.punctual}</td>
    </tr>
    <tr>
      <td><strong>Beginning of Term</strong></td><td colspan="2">${att.beg_term}</td>
      <td><strong>End of Term</strong></td><td colspan="2">${att.end_term}</td>
    </tr>
    <tr>
      <td><strong>Beginning of Next Term</strong></td><td colspan="5">${att.next_term}</td>
    </tr>
  </table>

  <div class="two">
    <div>
      <div class="sec">2. OBSERVATIONS ON CONDUCT</div>
      <table>
        <thead><tr><th style="width:52%;text-align:left">Qualities</th><th>Exc</th><th>Good</th><th>Fair</th><th>Poor</th></tr></thead>
        <tbody>${ratingRows(CONDUCT, props.conductRatings)}</tbody>
      </table>
    </div>
    <div>
      <div class="sec">3. PERFORMANCE IN PHYSICAL SKILLS</div>
      <table>
        <thead><tr><th style="width:52%;text-align:left">Activities</th><th>Exc</th><th>Good</th><th>Fair</th><th>Poor</th></tr></thead>
        <tbody>${ratingRows(PHYSICAL, props.physicalSkills)}</tbody>
      </table>
    </div>
  </div>

  <div class="sec">4. PERFORMANCE IN SUBJECTS</div>
  <table>
    <thead>
      <tr>
        <th style="width:30%;text-align:left">SUBJECTS</th>
        <th style="width:9%">CA (30)</th>
        <th style="width:9%">Exam (70)</th>
        <th style="width:10%">Total (100)</th>
        <th style="width:8%">Position</th>
        ${showFirstTermCol ? '<th style="width:11%">First Term</th>' : ''}
        ${showSecondTermCol ? '<th style="width:11%">Second Term</th>' : ''}
        <th style="width:12%">Remarks</th>
      </tr>
      <tr class="sum">
        <td>Max. Obtainable</td><td style="text-align:center">30</td><td style="text-align:center">70</td><td style="text-align:center">100</td><td></td>
        ${showFirstTermCol ? '<td style="text-align:center">100</td>' : ''}
        ${showSecondTermCol ? '<td style="text-align:center">100</td>' : ''}
        <td></td>
      </tr>
    </thead>
    <tbody>${subjectsHtml}
      <tr class="sum">
        <td>TOTAL</td><td></td><td></td><td style="text-align:center">${grandTotal}/${maxTotal}</td><td></td>
        ${showFirstTermCol ? '<td></td>' : ''}
        ${showSecondTermCol ? '<td></td>' : ''}
        <td style="text-align:center">${overallGrade}</td>
      </tr>
    </tbody>
  </table>

  <table>
    <tr class="sum">
      <td style="width:25%">Overall Total: ${grandTotal}/${maxTotal}</td>
      <td style="width:25%">Overall Percentage: ${overallPct}%</td>
      <td style="width:25%">Grade: ${overallGrade}</td>
      <td style="width:25%">Status: ${passed ? 'PASSED' : 'FAILED'}</td>
    </tr>
  </table>

  <div class="sec">8. HEALTH / PHYSICAL GROWTH</div>
  <table>
    <tr><td style="width:30%"><strong>General Comments on Health</strong></td><td>${props.healthComment || 'Student is fit and healthy. No known medical conditions.'}</td></tr>
  </table>

  <div class="sec">GENERAL COMMENTS</div>
  <table>
    <tr><td style="width:22%"><strong>Class Teacher's Comment</strong></td><td>${props.teacherComment || 'Good performance'}</td><td style="width:12%"><strong>Signature</strong></td><td style="width:18%">${props.teacherSignatureUrl ? `<img src="${props.teacherSignatureUrl}" style="height:35px;object-fit:contain" alt=""/>` : ''}</td></tr>
    <tr><td><strong>Head Teacher's Comments</strong></td><td colspan="3">${props.principalComment || 'Keep it up'}</td></tr>
    <tr><td><strong>Parent's Comment</strong></td><td colspan="3" style="height:22px"></td></tr>
  </table>

  <div class="sig">
    <div class="sig-box">
      ${props.teacherSignatureUrl ? `<img src="${props.teacherSignatureUrl}" style="height:45px;object-fit:contain;margin-bottom:2px" alt=""/>` : ''}
      <div class="sig-line">Class Teacher's Signature</div>Date: ${props.teacherDate ? new Date(props.teacherDate).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}) : '______________'}
    </div>
    <div class="sig-box">
      ${props.stampUrl ? `<img src="${props.stampUrl}" style="width:90px;height:90px;object-fit:contain" alt="School Stamp"/>` : `<div class="stamp">OFFICIAL<br/>SCHOOL<br/>STAMP</div>`}
      <div style="margin-top:2px">Affix School Stamp &<br/>Authorized Signature Here</div>
    </div>
    <div class="sig-box">
      ${props.principalSignatureUrl ? `<img src="${props.principalSignatureUrl}" style="height:45px;object-fit:contain;margin-bottom:2px" alt=""/>` : ''}
      <div class="sig-line">Head Teacher's Signature</div>Date: ${props.headTeacherDate ? new Date(props.headTeacherDate).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}) : '______________'}
    </div>
  </div>

  <script>window.onload = function() { setTimeout(() => window.print(), 250); }</script>
</body>
</html>`

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  return (
    <button
      onClick={handlePrint}
      disabled={results.length === 0}
      className={`flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed ${className}`}
    >
      <Printer size={16} />
      Print / Download Report Card
    </button>
  )
}