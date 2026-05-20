'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { ChevronLeft, Settings } from 'lucide-react'

export default function Nav() {
  const pathname = usePathname()
  const params = useParams<{ slug?: string }>()
  const slug = params?.slug
  const insideEngagement = !!slug

  const engagementLinks = slug
    ? [
        { href: `/${slug}/dashboard`, label: 'Dashboard' },
        { href: `/${slug}/tracker`, label: 'Status Tracker' },
      ]
    : []

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          {insideEngagement ? (
            <Link href="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <ChevronLeft size={15} />
              All Clients
            </Link>
          ) : (
            <span className="font-semibold text-gray-900 tracking-tight">TRA Status Master</span>
          )}

          {insideEngagement && (
            <>
              <span className="text-gray-300">|</span>
              <div className="flex gap-1">
                {engagementLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      pathname === link.href
                        ? 'bg-red-50 text-red-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        <Link
          href="/settings"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            pathname === '/settings'
              ? 'bg-red-50 text-red-700'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Settings size={14} />
          Settings
        </Link>
      </div>
    </nav>
  )
}
