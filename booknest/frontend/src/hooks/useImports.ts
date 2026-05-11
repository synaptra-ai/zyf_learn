import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'

export function useImportJob(jobId: string | null) {
  return useQuery({
    queryKey: ['import-job', jobId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/imports/${jobId}`)
      return data
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status
      return status === 'SUCCESS' || status === 'FAILED' ? false : 1000
    },
  })
}

export function useUploadCSV() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await apiClient.post('/imports/books', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
    },
  })
}

export async function exportBooksCSV() {
  const res = await apiClient.get('/exports/books', { responseType: 'blob' })
  const url = window.URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = 'booknest-books.csv'
  a.click()
  window.URL.revokeObjectURL(url)
}
