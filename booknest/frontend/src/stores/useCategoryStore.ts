import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Category } from '@/types'

interface CategoryState {
  categories: Category[]
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => void
  updateCategory: (id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>) => void
  deleteCategory: (id: string) => void
  setCategories: (categories: Category[]) => void
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set) => ({
      categories: [],

      addCategory: (category) => {
        const newCategory: Category = {
          ...category,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ categories: [...state.categories, newCategory] }))
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((cat) =>
            cat.id === id ? { ...cat, ...updates } : cat
          ),
        }))
      },

      deleteCategory: (id) => {
        set((state) => ({ categories: state.categories.filter((cat) => cat.id !== id) }))
      },

      setCategories: (categories) => {
        set({ categories })
      },
    }),
    { name: 'booknest-categories' }
  )
)
