export default function LegalFooterLinks() {
  return (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
      <a href="/privacy-policy" className="hover:text-green-700 hover:underline font-medium">Privacy Policy</a>
      <a href="/terms-of-service" className="hover:text-green-700 hover:underline font-medium">Terms of Service</a>
      <a href="/cookie-policy" className="hover:text-green-700 hover:underline font-medium">Cookie Policy</a>
    </div>
  )
}