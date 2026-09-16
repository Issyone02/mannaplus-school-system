import Link from 'next/link';
import LegalFooterLinks from '@/components/LegalFooterLinks'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* School Info */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <img
                src="https://mecvtpnqmffqvniioudk.supabase.co/storage/v1/object/public/school-assets/school-logo.png"
                alt="Mannaplus Group of Schools"
                className="h-14 w-14 object-contain rounded-full bg-white p-1"
              />
              <h3 className="text-2xl font-bold">Mannaplus Group of Schools</h3>
            </div>
            <p className="text-gray-400 mb-4">
              Ogun's premier private school group — Nursery, Primary & College —
              producing Nigeria's brightest minds since 1998.
            </p>
            <p className="text-green-400 font-medium italic mb-4">"Grooming the Future Leaders"</p>
            <div className="space-y-2 text-gray-400 text-sm">
              <p>📍 34, Orisun Ibukun Avenue, Arinko Sango Ota, Ogun State</p>
              <p>📞 +234 342 872 28 • +234 803 496 7499</p>
              <p>✉️ mannapluscollege@school.com</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-gray-400 hover:text-green-400 transition-colors">About Us</Link></li>
              <li><Link href="/academics" className="text-gray-400 hover:text-green-400 transition-colors">Academics</Link></li>
              <li><Link href="/news" className="text-gray-400 hover:text-green-400 transition-colors">News & Events</Link></li>
              <li><Link href="/admissions" className="text-gray-400 hover:text-green-400 transition-colors">Admissions</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-green-400 transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Portals */}
          <div>
            <h4 className="text-lg font-bold mb-4">Portals</h4>
            <ul className="space-y-2">
              <li><Link href="/admin" className="text-gray-400 hover:text-green-400 transition-colors">Admin Portal</Link></li>
              <li><Link href="/teacher" className="text-gray-400 hover:text-green-400 transition-colors">Teacher Portal</Link></li>
              <li><Link href="/parent" className="text-gray-400 hover:text-green-400 transition-colors">Parent Portal</Link></li>
              <li><Link href="/student" className="text-gray-400 hover:text-green-400 transition-colors">Student Portal</Link></li>
            </ul>
          </div>
        </div>

        {/* ✅ Legal Links Section - Added Here */}
        <div className="border-t border-gray-800 mt-8 pt-6 mb-6">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <LegalFooterLinks />
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Mannaplus Group of Schools. All rights reserved.</p>
          <p>Nursery • Primary • College — Sango Ota, Ogun State</p>
        </div>
      </div>
    </footer>
  );
}