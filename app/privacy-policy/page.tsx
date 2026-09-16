import type { Metadata } from 'next'
import LegalShell, { H, P, UL } from '@/components/LegalShell'

export const metadata: Metadata = {
  title: 'Privacy Policy | Mannaplus Group of Schools',
  description: 'How Mannaplus Group of Schools collects, uses, stores and protects personal data on its School Management System.',
}

export default function PrivacyPolicyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <H>1. Introduction and Scope</H>
      <P>
        This Privacy Policy explains how Mannaplus Group of Schools (&ldquo;the School&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, stores, protects and discloses personal data through its online School Management System (the &ldquo;Platform&rdquo;). The Platform provides student records, academic results, attendance tracking, fee management, payment recording, notices and report cards.
      </P>
      <P>
        This Policy applies to every person who accesses the Platform: administrators, teachers, parents and legal guardians, and students (each a &ldquo;User&rdquo;, collectively &ldquo;you&rdquo;). By creating an account or by using the Platform, you acknowledge that you have read and understood this Policy. This Policy is drafted in compliance with the Nigeria Data Protection Act, 2023 (&ldquo;NDPA&rdquo;).
      </P>

      <H>2. Data Controller</H>
      <P>
        The data controller is Mannaplus Group of Schools, 34, Orisun Ibukun Avenue, Arinko Sango Ota, Ogun State, Nigeria. All privacy requests must be addressed to mannapluscollege@school.com, or by telephone to +234 342 872 28 or +234 803 496 7499.
      </P>

      <H>3. Personal Data We Collect</H>
      <P>We process only the categories of personal data listed below:</P>
      <UL items={[
        <><strong>Account data:</strong> full name, email address, user role (administrator, teacher, parent or student) and authentication identifiers, managed by our authentication provider, Clerk.</>,
        <><strong>Student records:</strong> full name, admission number, class, arm, department, enrolment status and the link to the parent or guardian account.</>,
        <><strong>Academic data:</strong> continuous assessment scores, examination scores, subject totals, grades, subject and class positions, report-card comments, and conduct and physical-skill ratings.</>,
        <><strong>Attendance data:</strong> the daily attendance status of each student (present, absent, late or excused).</>,
        <><strong>Financial data:</strong> published fee structures; recorded payments (amount, date, method, reference number and receipt number); and payment requests submitted by parents or students together with their notes. <strong>The Platform never collects or stores debit or credit card numbers, card verification codes, personal identification numbers or online banking login credentials.</strong> Where card payment is offered in the future, it will be processed exclusively by a licensed payment gateway under that gateway&rsquo;s own privacy policy.</>,
        <><strong>Uploaded content:</strong> images of class-teacher and head-teacher signatures, the school stamp, and payment proof images where a User supplies them.</>,
        <><strong>Notice data:</strong> notices published by the School and, on your own device only, a local record of the notices you have already read.</>,
        <><strong>Technical and security data:</strong> session tokens, IP address, browser type, and audit logs of staff actions performed within the Platform.</>,
      ]} />

      <H>4. Purposes of Processing and Legal Bases</H>
      <UL items={[
        <><strong>Educational administration</strong> (enrolment, classes, results, attendance, report cards): performance of the contract between the School and the parent or student, and compliance with education regulations.</>,
        <><strong>Fee management and payment reconciliation</strong>: performance of contract and compliance with statutory accounting obligations.</>,
        <><strong>Publication of notices to parents and students</strong>: the legitimate interest of the School in safeguarding and in timely communication.</>,
        <><strong>Account security, access control and audit logging</strong>: legitimate interest and legal obligation under the Cybercrimes (Prohibition, Prevention, etc.) Act, 2015.</>,
        <><strong>Parental oversight of a child&rsquo;s education</strong>: the consent of the parent or guardian, exercised through the Parent Portal, together with the duty of care of the School.</>,
      ]} />

      <H>5. Children&rsquo;s Personal Data</H>
      <P>
        Many data subjects on the Platform are children. The School processes children&rsquo;s personal data under its statutory duty of care and the Child Rights Act, 2003 (as adopted in Ogun State), with parental or guardian consent obtained at enrolment and exercised at any time through the Parent Portal. We apply data minimisation: only the fields required for educational administration are collected. A parent or guardian may review, correct or request the deletion of a child&rsquo;s personal data at any time by contacting the address in Section 2.
      </P>

      <H>6. Disclosure of Personal Data and Processors</H>
      <P>
        We do not sell, rent, trade or otherwise commercialise personal data. We disclose personal data only to: (a) the service processors listed below, and (b) a competent authority where disclosure is required by law.
      </P>
      <UL items={[
        <><strong>Clerk</strong> &mdash; user authentication and session management.</>,
        <><strong>Supabase</strong> &mdash; database hosting and encrypted file storage.</>,
        <><strong>Vercel</strong> &mdash; application hosting and content delivery.</>,
      ]} />
      <P>
        Each processor acts only on the documented instructions of the School and is bound by contractual confidentiality and security obligations.
      </P>

      <H>7. Cookies and Local Storage</H>
      <P>
        The Platform uses strictly necessary session cookies and one functional local-storage entry. No advertising, tracking or analytics cookies are used. Full details are set out in our Cookie Policy.
      </P>

      <H>8. Data Retention</H>
      <UL items={[
        <><strong>Student academic and attendance records:</strong> for the period of enrolment plus six (6) years after the student leaves the School.</>,
        <><strong>Financial and payment records:</strong> six (6) years from the date of each transaction, as required by accounting law.</>,
        <><strong>Audit logs:</strong> twenty-four (24) months.</>,
        <><strong>Account data:</strong> until the account is closed, plus twelve (12) months.</>,
        <><strong>Payment proof images:</strong> twelve (12) months after the related payment is confirmed.</>,
      ]} />
      <P>Upon expiry of the applicable period, the data is securely deleted or irreversibly anonymised.</P>

      <H>9. Security Measures</H>
      <UL items={[
        'Role-based access control separating administrator, teacher, parent and student permissions.',
        'Database row-level security that restricts every query to the records the signed-in User is entitled to see.',
        'Encryption of data in transit (HTTPS/TLS) and encryption at rest by our processors.',
        'Automatic session expiry after periods of inactivity.',
        'Audit logging of sensitive administrative actions.',
        'Absolute prohibition on the storage of payment card data within the Platform.',
      ]} />

      <H>10. Your Rights Under the NDPA, 2023</H>
      <P>You have the right to:</P>
      <UL items={[
        'access your personal data and obtain a copy of it;',
        'rectify inaccurate or incomplete personal data;',
        'erase personal data, subject to the statutory retention periods in Section 8;',
        'restrict or object to processing in the circumstances provided by law;',
        'receive your data in a structured, commonly used and machine-readable format (data portability);',
        'withdraw consent at any time where processing is based on consent, without affecting prior lawful processing.',
      ]} />
      <P>
        To exercise any right, write to mannapluscollege@school.com. We respond within thirty (30) days and never charge a fee for a first request. You also have the right to lodge a complaint with the Nigeria Data Protection Commission (NDPC).
      </P>

      <H>11. International Transfers</H>
      <P>
        Our processors may store data on servers located outside Nigeria. Every such transfer relies on the safeguards recognised by the NDPA, 2023, namely binding contractual clauses and verified technical and organisational security measures.
      </P>

      <H>12. Personal Data Breaches</H>
      <P>
        Where a breach is likely to result in risk to data subjects, we will notify the NDPC within seventy-two (72) hours of becoming aware of it. Where the risk is high, we will also inform the affected Users without undue delay.
      </P>

      <H>13. Changes to This Policy</H>
      <P>
        We may update this Policy. Every update is published on this page with a new effective date. Material changes are additionally announced through a notice on the Platform. Continued use of the Platform after publication constitutes acceptance of the revised Policy.
      </P>

      <H>14. Contact</H>
      <P>
        Mannaplus Group of Schools, 34, Orisun Ibukun Avenue, Arinko Sango Ota, Ogun State, Nigeria. Email: mannapluscollege@school.com. Telephone: +234 342 872 28, +234 803 496 7499.
      </P>
    </LegalShell>
  )
}