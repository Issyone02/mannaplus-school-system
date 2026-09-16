import type { Metadata } from 'next'
import LegalShell, { H, P, UL } from '@/components/LegalShell'

export const metadata: Metadata = {
  title: 'Cookie Policy | Mannaplus Group of Schools',
  description: 'The cookies and local storage used by the Mannaplus Group of Schools School Management System.',
}

export default function CookiePolicyPage() {
  return (
    <LegalShell title="Cookie Policy">
      <H>1. What Cookies Are</H>
      <P>
        Cookies are small text files placed on your device when you visit a website. Local storage is a similar browser facility that stores data on your device without transmitting it to the server on every visit. This Policy explains exactly which cookies and local-storage entries the Platform uses.
      </P>

      <H>2. What We Use and Why</H>
      <P>The Platform uses only the following:</P>
      <UL items={[
        <><strong>Session cookies set by Clerk (for example &ldquo;__session&rdquo; and &ldquo;__client&rdquo;)</strong> &mdash; category: strictly necessary. Purpose: to keep you signed in and to protect your account. Duration: until you sign out or the session expires.</>,
        <><strong>Local-storage entry &ldquo;seen_notices_&lt;your user id&gt;&rdquo;</strong> &mdash; category: functional. Purpose: to remember, on your device only, which school notices you have already read, so that they are not shown to you again. Duration: until you clear your browser storage.</>,
      ]} />
      <P>
        The Platform uses <strong>no advertising cookies, no tracking cookies and no third-party analytics cookies</strong>.
      </P>

      <H>3. Managing Cookies</H>
      <P>
        You may block or delete cookies through your browser settings. Please note that the session cookies are strictly necessary: if you block them, you will not be able to sign in to the Platform. Deleting local storage removes your notice-read history on that device.
      </P>

      <H>4. Changes to This Policy</H>
      <P>
        Any change to our use of cookies is published on this page with a new effective date before the change takes effect.
      </P>

      <H>5. Contact</H>
      <P>
        Mannaplus Group of Schools, 34, Orisun Ibukun Avenue, Arinko Sango Ota, Ogun State, Nigeria. Email: mannapluscollege@school.com. Telephone: +234 342 872 28, +234 803 496 7499.
      </P>
    </LegalShell>
  )
}