import { request } from './request'

export interface Note {
  id: string
  content: string
  pageNumber: number | null
  bookId: string
  createdAt: string
  updatedAt: string
}

export const createNote = (data: { bookId: string; content: string; pageNumber?: number }) =>
  request<Note>({ url: '/api/v1/notes', method: 'POST', data })

export const listNotes = (bookId: string) =>
  request<Note[]>({ url: `/api/v1/notes/book/${bookId}` })

export const updateNote = (id: string, data: { content?: string; pageNumber?: number }) =>
  request<Note>({ url: `/api/v1/notes/${id}`, method: 'PUT', data })

export const deleteNote = (id: string) =>
  request<void>({ url: `/api/v1/notes/${id}`, method: 'DELETE' })
