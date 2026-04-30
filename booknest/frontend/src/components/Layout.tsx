import { NavLink, Outlet } from 'react-router-dom'
import { BookOpen, Moon, Sun, BarChart3, FolderOpen, Plus } from 'lucide-react'
import { useThemeStore } from '@/stores/useThemeStore'

export default function Layout() {
  const { isDark, toggleTheme } = useThemeStore()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
    }`

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="flex items-center gap-2 font-bold text-primary-600 dark:text-primary-400">
              <BookOpen className="h-5 w-5" />
              BookNest
            </NavLink>
            <nav className="flex items-center gap-1">
              <NavLink to="/" className={linkClass} end>
                <BookOpen className="h-4 w-4" />
                书籍
              </NavLink>
              <NavLink to="/books/new" className={linkClass}>
                <Plus className="h-4 w-4" />
                添加
              </NavLink>
              <NavLink to="/categories" className={linkClass}>
                <FolderOpen className="h-4 w-4" />
                分类
              </NavLink>
              <NavLink to="/stats" className={linkClass}>
                <BarChart3 className="h-4 w-4" />
                统计
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
