'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  Settings, 
  BarChart3, 
  ExternalLink,
  ChevronRight
} from 'lucide-react'

interface NavigationProps {
  className?: string
}

export function Navigation({ className }: NavigationProps) {
  const pathname = usePathname()

  const navItems = [
    {
      href: '/',
      label: 'Home',
      icon: <Home className="h-4 w-4" />,
      description: 'Participant evaluation interface'
    },
    {
      href: '/admin',
      label: 'Admin',
      icon: <Settings className="h-4 w-4" />,
      description: 'Experiment management dashboard',
      adminOnly: true
    }
  ]

  return (
    <nav className={`border-b bg-white ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Owl Eval</h1>
                <p className="text-xs text-gray-500 leading-none">Human Evaluation Platform</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.adminOnly && (
                    <Badge variant="secondary" className="text-xs">
                      Protected
                    </Badge>
                  )}
                  {!isActive && (
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}

interface BreadcrumbsProps {
  items: Array<{
    label: string
    href?: string
  }>
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={`flex items-center space-x-1 text-sm text-gray-500 ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="h-3 w-3 mx-1" />}
          {item.href ? (
            <Link 
              href={item.href} 
              className="hover:text-gray-700 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}