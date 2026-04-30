import { useRef } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { BookOpen, Moon, Sun, BarChart3, FolderOpen, Plus, Download, Upload } from 'lucide-react'
import { useThemeStore } from '@/stores/useThemeStore'
import { useBookStore } from '@/stores/useBookStore'
import { useCategoryStore } from '@/stores/useCategoryStore'

export default function Layout() {
  const { isDark, toggleTheme } = useThemeStore()
  const books = useBookStore((s) => s.books)
  const categories = useCategoryStore((s) => s.categories)
  const setBooks = useBookStore((s) => s.setBooks)
  const setCategories = useCategoryStore((s) => s.setCategories)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
    }`

  const handleExport = () => {
    const data = JSON.stringify({ books, categories }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `booknest-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (data.books) setBooks(data.books)
        if (data.categories) setCategories(data.categories)
        alert('导入成功！')
      } catch {
        alert('导入失败：文件格式不正确')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

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
              onClick={handleExport}
              title="导出数据"
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="导入数据"
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <Upload className="h-5 w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
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
