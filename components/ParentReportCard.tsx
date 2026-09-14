'use client'

import { Printer } from 'lucide-react'

interface AttendanceStats {
  total: number
  present: number
  absent: number
  late: number
  percentage: number
}

interface ParentReportCardProps {
  student: {
    full_name: string
    admission_number: string
    class_name: string
  }
  results: any[]
  session: string
  term: string
  attendanceStats?: AttendanceStats // New prop for attendance data
  className?: string
}

export default function ParentReportCard({ 
  student, 
  results, 
  session, 
  term, 
  attendanceStats,
  className = '' 
}: ParentReportCardProps) {
  
  // Normalize term
  const normalizedTerm = term.includes('Term') ? term : `${term} Term`
  const isFirstTerm = normalizedTerm === 'First Term'
  const isSecondTerm = normalizedTerm === 'Second Term'
  const isThirdTerm = normalizedTerm === 'Third Term'

  const handlePrint = () => {
    if (results.length === 0) return

    const isPrimary = student.class_name.toLowerCase().includes('primary')
    const primaryLogoUrl = "https://mecvtpnqmffqvniioudk.supabase.co/storage/v1/object/public/school-assets/logo_primary.png"
    const secondaryLogoUrl = "https://mecvtpnqmffqvniioudk.supabase.co/storage/v1/object/public/school-assets/logo_secondary.png"
    const logoToUse = isPrimary ? primaryLogoUrl : secondaryLogoUrl

    // Calculate statistics
    let grandTotal = 0
    const totalSubjects = results.length
    
    results.forEach(r => {
      let termTotal = r.total_score
      if (isSecondTerm) termTotal = (r.first_term_total || 0) + r.total_score
      else if (isThirdTerm) termTotal = (r.first_term_total || 0) + (r.second_term_total || 0) + r.total_score
      grandTotal += termTotal
    })

    const average = totalSubjects > 0 ? (grandTotal / totalSubjects).toFixed(1) : '0'
    const maxTotal = isFirstTerm ? totalSubjects * 100 : isSecondTerm ? totalSubjects * 200 : totalSubjects * 300
    const teacherComment = results[0]?.teacher_comment || 'Good performance'
    const principalComment = results[0]?.principal_comment || 'Keep it up'

    // Build table rows
    let rowsHtml = ''
    results.forEach(r => {
      let displayTotal = r.total_score
      let prevTerm1: string | number = '-'
      let prevTerm2: string | number = '-'
      
      if (isSecondTerm) {
        prevTerm1 = r.first_term_total || 0
        displayTotal = (r.first_term_total || 0) + r.total_score
      } else if (isThirdTerm) {
        prevTerm1 = r.first_term_total || 0
        prevTerm2 = r.second_term_total || 0
        displayTotal = (r.first_term_total || 0) + (r.second_term_total || 0) + r.total_score
      }
      
      const percentage = isFirstTerm 
        ? displayTotal 
        : isSecondTerm ? (displayTotal / 2).toFixed(1) : (displayTotal / 3).toFixed(1)

      // Format previous terms to show Score and Percentage (assuming max 100 per term)
      const formatPrevTerm = (score: string | number) => {
        if (score === '-' || score === 0) return '-'
        return `${score} (${score}%)`
      }

      rowsHtml += `
        <tr>
          <td style="padding:8px;border:1px solid #ddd">${r.subject_name}</td>
          ${!isFirstTerm ? `<td style="padding:8px;border:1px solid #ddd;text-align:center;font-size:12px">${formatPrevTerm(prevTerm1)}</td>` : ''}
          ${isThirdTerm ? `<td style="padding:8px;border:1px solid #ddd;text-align:center;font-size:12px">${formatPrevTerm(prevTerm2)}</td>` : ''}
          <td style="padding:8px;border:1px solid #ddd;text-align:center">${r.ca_score || 0}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center">${r.exam_score || 0}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:bold;color:#16a34a">${displayTotal}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center">${percentage}%</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:bold">${r.grade}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center">${r.remark || 'Excellent'}</td>
        </tr>`
    })

    // Attendance HTML
    const att = attendanceStats || { total: 0, present: 0, absent: 0, late: 0, percentage: 0 }
    const attendanceHtml = `
      <div class="section-title">Attendance Record</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:13px;">
        <thead>
          <tr style="background:#f0fdf4;">
            <th style="border:1px solid #333; padding:8px; text-align:center;">Total Days</th>
            <th style="border:1px solid #333; padding:8px; text-align:center;">Days Present</th>
            <th style="border:1px solid #333; padding:8px; text-align:center;">Days Absent</th>
            <th style="border:1px solid #333; padding:8px; text-align:center;">Days Late</th>
            <th style="border:1px solid #333; padding:8px; text-align:center;">Attendance %</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #333; padding:8px; text-align:center;">${att.total}</td>
            <td style="border:1px solid #333; padding:8px; text-align:center; color:green; font-weight:bold;">${att.present}</td>
            <td style="border:1px solid #333; padding:8px; text-align:center; color:red;">${att.absent}</td>
            <td style="border:1px solid #333; padding:8px; text-align:center; color:orange;">${att.late}</td>
            <td style="border:1px solid #333; padding:8px; text-align:center; font-weight:bold;">${att.percentage}%</td>
          </tr>
        </tbody>
      </table>
    `

    // Co-Curricular & Health HTML (Placeholder structure)
    const extraHtml = `
      <div class="section-title">Co-Curricular Activities & Health Report</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:13px;">
        <tbody>
          <tr>
            <td style="border:1px solid #333; padding:8px; width:30%; font-weight:bold;">Extra-Curricular Activities</td>
            <td style="border:1px solid #333; padding:8px;">${results[0]?.extra_curricular || 'Sports, Debate Club, Cultural Day'}</td>
          </tr>
          <tr>
            <td style="border:1px solid #333; padding:8px; font-weight:bold;">Health Report / Medical Note</td>
            <td style="border:1px solid #333; padding:8px;">${results[0]?.health_report || 'Student is fit and healthy. No known allergies.'}</td>
          </tr>
          <tr>
            <td style="border:1px solid #333; padding:8px; font-weight:bold;">Teacher's Comment on Conduct</td>
            <td style="border:1px solid #333; padding:8px;">${results[0]?.conduct_comment || 'Excellent behavior and discipline.'}</td>
          </tr>
        </tbody>
      </table>
    `

    const printWindow = window.open('', '_blank', 'width=900,height=1200')
    if (!printWindow) { alert('Please allow popups'); return }
    
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Report Card - ${student.full_name}</title>
  <style>
    @media print {
      @page { size: A4; margin: 15mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body { font-family: 'Times New Roman', Arial, sans-serif; padding: 20px; color: #000; background: #fff; position: relative; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); opacity: 0.05; width: 400px; height: 400px; z-index: 0; pointer-events: none; }
    .header { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 15px; border-bottom: 3px double #16a34a; padding-bottom: 15px; position: relative; z-index: 1; }
    .logo { width: 80px; height: 80px; object-fit: contain; }
    .school-info { text-align: center; }
    .school-info h1 { margin: 0; font-size: 24px; color: #16a34a; text-transform: uppercase; font-weight: bold; }
    .school-info h2 { margin: 5px 0; font-size: 16px; color: #333; }
    .school-info p { margin: 2px 0; font-size: 12px; font-style: italic; color: #555; }
    .title { text-align: center; font-size: 18px; font-weight: bold; margin: 15px 0; text-decoration: underline; }
    .student-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; font-size: 13px; position: relative; z-index: 1; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; position: relative; z-index: 1; }
    th, td { border: 1px solid #333; padding: 6px; text-align: left; }
    th { background: #f0fdf4; color: #166534; font-weight: bold; text-align: center; }
    .section-title { font-weight: bold; font-size: 14px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
    .summary { margin-top: 20px; padding: 15px; background: #f9fafb; border: 2px solid #16a34a; position: relative; z-index: 1; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 10px; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; position: relative; z-index: 1; }
    .signature-block { text-align: center; width: 30%; }
    .sig-line { border-top: 1px solid #000; width: 100%; margin-bottom: 5px; padding-top: 5px; font-size: 12px; }
    .sig-label { font-size: 12px; font-weight: bold; margin-bottom: 10px; }
    .sig-date { font-size: 11px; margin-top: 15px; }
    .stamp { width: 100px; height: 100px; border: 3px double #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #16a34a; font-weight: bold; font-size: 10px; text-align: center; transform: rotate(-15deg); opacity: 0.8; }
  </style>
</head>
<body>
  <img src="${logoToUse}" class="watermark" alt="Watermark" />
  
  <div class="header">
    <img src="${logoToUse}" class="logo" alt="School Logo" />
    <div class="school-info">
      <h1>Mannaplus Group of Schools</h1>
      <h2>${isPrimary ? 'Nursery & Primary School' : 'College Sango-Ota'}</h2>
      <p>"Grooming the Future Leaders"</p>
      <p style="font-size: 11px; font-weight: bold;">73, Orisun Ibukun, Sango Otta, Ogun State</p>
      <p style="font-size: 11px;">Tel: +2348030433466 | Email: Mannaplusgroupofschools@gmail.com</p>
    </div>
  </div>
  
  <div class="title">OFFICIAL ${normalizedTerm.toUpperCase()} REPORT CARD</div>
  
  <div class="student-details">
    <div><strong>Student Name:</strong> ${student.full_name.toUpperCase()}</div>
    <div><strong>Admission No:</strong> ${student.admission_number}</div>
    <div><strong>Class:</strong> ${student.class_name}</div>
    <div><strong>Session:</strong> ${session}</div>
    <div><strong>Term:</strong> ${normalizedTerm}</div>
    <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th style="width:20%">Subject</th>
        ${!isFirstTerm ? '<th style="width:12%">1st Term<br>(Score %)</th>' : ''}
        ${isThirdTerm ? '<th style="width:12%">2nd Term<br>(Score %)</th>' : ''}
        <th style="width:10%">3rd Term<br>CA (40)</th>
        <th style="width:10%">3rd Term<br>Exam (60)</th>
        <th style="width:10%">Total</th>
        <th style="width:8%">Avg %</th>
        <th style="width:8%">Grade</th>
        <th style="width:10%">Remark</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  
  <div class="summary">
    <div class="summary-grid">
      <div><strong>Total Subjects:</strong> ${totalSubjects}</div>
      <div><strong>Cumulative Total:</strong> ${grandTotal} / ${maxTotal}</div>
      <div><strong>Average Score:</strong> ${average}%</div>
    </div>
    <div style="margin-top:15px; font-size:13px;">
      <p><strong>Class Teacher's Comment:</strong> ${teacherComment}</p>
      <p><strong>Principal's Comment:</strong> ${principalComment}</p>
    </div>
  </div>

  ${attendanceHtml}
  ${extraHtml}
  
  <div class="footer">
    <div class="signature-block">
      <div class="sig-line"></div>
      <div class="sig-label">Class Teacher's Signature</div>
      <div class="sig-date">Date: _______________</div>
    </div>
    
    <div class="stamp">
      OFFICIAL<br/>SCHOOL<br/>STAMP
    </div>

    <div class="signature-block">
      <div class="sig-line"></div>
      <div class="sig-label">Principal's Signature</div>
      <div class="sig-date">Date: _______________</div>
    </div>
  </div>
  
  <script>
    window.onload = function() { setTimeout(() => window.print(), 250); }
  </script>
</body>
</html>`
    
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  return (
    <button
      onClick={handlePrint}
      disabled={results.length === 0}
      className={`mb-6 flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed ${className}`}
    >
      <Printer size={20} />
      Download/Print Report Card
    </button>
  )
}