import React from 'react'

export function H({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-gray-900 mt-7 mb-2">{children}</h2>
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-[15px]">{children}</p>
}

export function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-6 mb-3 space-y-1 text-[15px]">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  )
}

export default function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <a href="/" className="text-green-700 hover:underline font-bold text-sm">← Back to Home</a>
        <p className="text-sm text-gray-500 font-bold uppercase tracking-wide mt-4">Mannaplus Group of Schools</p>
        <h1 className="text-3xl font-bold text-gray-900 mt-1">{title}</h1>
        <p className="text-sm text-gray-600 mt-2">Effective date: 16th September 2026 &middot; Last updated: 16th September 2026</p>
        <div className="mt-8 bg-white rounded-xl shadow p-6 md:p-10 text-gray-800 leading-relaxed">
          {children}
        </div>
        <p className="text-xs text-gray-500 mt-6 text-center">
          Questions about this document? Contact: mannapluscollege@school.com &middot; +234 342 872 28 &middot; +234 803 496 7499
        </p>
      </div>
    </div>
  )
}