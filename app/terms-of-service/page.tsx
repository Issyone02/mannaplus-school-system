import type { Metadata } from 'next'
import LegalShell, { H, P, UL } from '@/components/LegalShell'

export const metadata: Metadata = {
  title: 'Terms of Service | Mannaplus Group of Schools',
  description: 'The binding terms governing use of the Mannaplus Group of Schools School Management System.',
}

export default function TermsOfServicePage() {
  return (
    <LegalShell title="Terms of Service">
      <H>1. Acceptance of Terms</H>
      <P>
        These Terms of Service (&ldquo;Terms&rdquo;) constitute a binding agreement between Mannaplus Group of Schools (&ldquo;the School&rdquo;) and every person who accesses the School Management System (the &ldquo;Platform&rdquo;). By creating an account or by using the Platform, you accept these Terms in full. If you do not accept them, you must not use the Platform.
      </P>

      <H>2. Definitions</H>
      <UL items={[
        <><strong>&ldquo;Platform&rdquo;</strong> means the web-based School Management System operated by the School, including all portals, pages and services within it.</>,
        <><strong>&ldquo;User&rdquo;</strong> means any administrator, teacher, parent, guardian or student holding an account on the Platform.</>,
        <><strong>&ldquo;Content&rdquo;</strong> means all text, data, images, report cards, notices and files transmitted through the Platform.</>,
      ]} />

      <H>3. Accounts and Eligibility</H>
      <UL items={[
        'Parent and guardian accounts may be held only by persons of eighteen (18) years or older.',
        'Student accounts are created or linked by the School as part of enrolment.',
        'You must keep your credentials confidential. You are responsible for every action performed under your account.',
        'You must notify the School immediately at mannapluscollege@school.com upon any suspected unauthorised use of your account.',
      ]} />

      <H>4. Licence and Acceptable Use</H>
      <P>The School grants you a personal, non-exclusive, non-transferable licence to use the Platform for its intended educational purposes. You shall not:</P>
      <UL items={[
        'access, or attempt to access, any account or record that you are not authorised to view;',
        'copy, scrape, extract or redistribute Platform data, including other Users&rsquo; personal data, without written permission;',
        'introduce malware, scripts or automated tools that interfere with the operation of the Platform;',
        'impersonate any person or misrepresent your role;',
        'upload unlawful, offensive or infringing content;',
        'use the Platform in any manner that violates the privacy or safety of a child.',
      ]} />

      <H>5. User Submissions</H>
      <P>
        Where you submit content (for example a payment proof image or a payment note), you warrant that you own it or have the right to submit it, and you grant the School a licence to use it solely for the administration of the related student record.
      </P>

      <H>6. Responsibilities of the School</H>
      <UL items={[
        'To keep the Platform available with commercially reasonable effort.',
        'To ensure that results, attendance and fee records reflect the entries made by authorised staff.',
        'To correct any verified error in a student record. A correction request must be made to the school administration within fourteen (14) days of the publication of the relevant result or fee entry.',
      ]} />

      <H>7. Fees and Payments</H>
      <UL items={[
        'Fee amounts are determined solely by the School and are published on the Platform per class and term.',
        'The Platform records payments and payment requests; it is not a bank, a payment gateway or a financial institution.',
        'The Platform never stores debit or credit card numbers, card verification codes, personal identification numbers or online banking credentials.',
        'A payment request submitted by a parent or student becomes effective only after the School verifies the payment and approves the request. Approval rests at the discretion of the School following verification.',
        'The obligation to pay school fees arises from the enrolment contract with the School and exists independently of the Platform.',
      ]} />

      <H>8. Intellectual Property</H>
      <P>
        All software, design, logos, report-card formats, notices and other Content of the Platform belong to the School or its licensors. Nothing in these Terms transfers any intellectual-property right to you. You may print or download your own (or your child&rsquo;s) report card and receipts for personal use; any other reproduction is prohibited.
      </P>

      <H>9. Third-Party Services</H>
      <P>
        The Platform relies on Clerk (authentication), Supabase (database and storage) and Vercel (hosting). The terms and privacy policies of those providers govern their respective services.
      </P>

      <H>10. Legal Compliance (Legal Policy)</H>
      <P>
        Every use of the Platform must comply with all applicable laws of the Federal Republic of Nigeria, including without limitation:
      </P>
      <UL items={[
        'the Nigeria Data Protection Act, 2023;',
        'the Cybercrimes (Prohibition, Prevention, etc.) Act, 2015;',
        'the Child Rights Act, 2003, as adopted in Ogun State;',
        'all regulations governing basic and secondary education in Ogun State.',
      ]} />
      <P>
        Unauthorised access to a computer system, interference with data, and unlawful processing of personal data are criminal offences under Nigerian law and will be reported to the competent authorities.
      </P>

      <H>11. Disclaimer of Warranties</H>
      <P>
        The Platform is provided &ldquo;as is&rdquo;. The School does not warrant that the Platform will be uninterrupted or error-free. Report cards and fee statements reflect the records entered by authorised staff as at the date of generation.
      </P>

      <H>12. Limitation of Liability</H>
      <P>
        To the maximum extent permitted by law, the School shall not be liable for indirect, incidental or consequential damages arising from the use of, or inability to use, the Platform. Nothing in these Terms limits liability for fraud, or for death or personal injury caused by negligence, or any liability that cannot be limited by law.
      </P>

      <H>13. Indemnity</H>
      <P>
        You shall indemnify the School against all losses, claims and expenses arising from your breach of these Terms or from your unlawful use of the Platform.
      </P>

      <H>14. Suspension and Termination</H>
      <P>
        The School may suspend or terminate any account that breaches these Terms, that poses a security risk, or whose holder ceases to be connected with the School. Upon termination, your right to use the Platform ceases immediately; statutory record-retention obligations continue.
      </P>

      <H>15. Governing Law and Dispute Resolution</H>
      <P>
        These Terms are governed by the laws of the Federal Republic of Nigeria. The parties shall first attempt to resolve any dispute amicably within thirty (30) days of written notice. Failing amicable settlement, the dispute shall be submitted to the courts of competent jurisdiction in Ogun State.
      </P>

      <H>16. General Provisions</H>
      <P>
        If any provision of these Terms is held invalid, the remaining provisions continue in force. A failure to enforce a provision is not a waiver of it. These Terms, together with the Privacy Policy and the Cookie Policy, constitute the entire agreement between you and the School regarding the Platform.
      </P>

      <H>17. Changes to These Terms</H>
      <P>
        The School may amend these Terms. Amendments are published on this page with a new effective date and, where material, announced through a notice on the Platform. Continued use after publication constitutes acceptance.
      </P>

      <H>18. Contact</H>
      <P>
        Mannaplus Group of Schools, 34, Orisun Ibukun Avenue, Arinko Sango Ota, Ogun State, Nigeria. Email: mannapluscollege@school.com. Telephone: +234 342 872 28, +234 803 496 7499.
      </P>
    </LegalShell>
  )
}