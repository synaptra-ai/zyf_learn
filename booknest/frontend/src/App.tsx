import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import BookList from '@/pages/BookList'
import BookCreate from '@/pages/BookCreate'
import BookDetail from '@/pages/BookDetail'
import BookEdit from '@/pages/BookEdit'
import CategoryManager from '@/pages/CategoryManager'
import Stats from '@/pages/Stats'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<BookList />} />
          <Route path="books/new" element={<BookCreate />} />
          <Route path="books/:id" element={<BookDetail />} />
          <Route path="books/:id/edit" element={<BookEdit />} />
          <Route path="categories" element={<CategoryManager />} />
          <Route path="stats" element={<Stats />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
