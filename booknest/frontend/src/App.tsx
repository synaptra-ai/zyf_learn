import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { PageSkeleton } from '@/components/ui/PageSkeleton'

const BookList = lazy(() => import('@/pages/BookList'))
const BookCreate = lazy(() => import('@/pages/BookCreate'))
const BookDetail = lazy(() => import('@/pages/BookDetail'))
const BookEdit = lazy(() => import('@/pages/BookEdit'))
const CategoryManager = lazy(() => import('@/pages/CategoryManager'))
const Stats = lazy(() => import('@/pages/Stats'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const WorkspaceMembers = lazy(() => import('@/pages/WorkspaceMembers'))
const Activities = lazy(() => import('@/pages/Activities'))
const DataTools = lazy(() => import('@/pages/DataTools'))

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<BookList />} />
              <Route path="books/new" element={<BookCreate />} />
              <Route path="books/:id" element={<BookDetail />} />
              <Route path="books/:id/edit" element={<BookEdit />} />
              <Route path="categories" element={<CategoryManager />} />
              <Route path="stats" element={<Stats />} />
              <Route path="members" element={<WorkspaceMembers />} />
              <Route path="activities" element={<Activities />} />
              <Route path="data-tools" element={<DataTools />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
