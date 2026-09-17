import type { Metadata } from 'next';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import ConditionalNavbar from '@/components/ConditionalNavbar';
import Footer from '@/components/Footer';
import { Toaster } from 'react-hot-toast';
import LayoutWrapper from '@/components/LayoutWrapper';
import IdleTimeout from '@/components/IdleTimeout';
import ConditionalFooter from '@/components/ConditionalFooter';



export const metadata: Metadata = {
  title: 'Mannaplus Group of Schools - Grooming the Future Leaders',
  description: "Ogun State's premier private school group (Nursery, Primary & College), producing Nigeria's brightest minds since 1998.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="font-sans antialiased">
          {/* ✅ Global faded student-photo background (sits behind everything) */}
          <div
            aria-hidden="true"
            className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(240, 253, 244, 0.80), rgba(255, 255, 255, 0.78), rgba(220, 252, 231, 0.82)), url('https://mecvtpnqmffqvniioudk.supabase.co/storage/v1/object/public/school-assets/backgrounds/app-bg.jpg')`,
            }}
          />
          <ConditionalNavbar />
          <main className="flex-grow">
            <LayoutWrapper>{children}</LayoutWrapper>
          </main>
          <ConditionalFooter />
          <IdleTimeout />
          <Toaster position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}