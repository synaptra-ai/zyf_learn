import { useState } from 'react'
import { useImportJob, useUploadCSV, exportBooksCSV } from '@/hooks/useImports'
import { Upload, Download, FileText } from 'lucide-react'

export default function DataTools() {
  const [jobId, setJobId] = useState<string | null>(null)
  const { data: job } = useImportJob(jobId)
  const uploadCSV = useUploadCSV()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    uploadCSV.mutate(file, {
      onSuccess: (data) => setJobId(data.id),
    })
  }

  const progress = job?.total ? Math.round((job.processed / job.total) * 100) : 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">数据工具</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
          <Upload className="h-5 w-5" />
          CSV 导入书籍
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          上传包含 title, author, status, pageCount, description 列的 CSV 文件
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={uploadCSV.isPending}
          className="mt-3 text-sm"
        />
      </div>

      {job && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
            <FileText className="h-5 w-5" />
            导入进度
          </h2>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span>状态：{job.status}</span>
              <span>{job.processed}/{job.total}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
              <div
                className={`h-2 rounded-full transition-all ${
                  job.status === 'SUCCESS' ? 'bg-green-500' : job.status === 'FAILED' ? 'bg-red-500' : 'bg-primary-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-sm text-gray-500">
              成功：{job.successCount}，失败：{job.failedCount}
            </div>
            {job.error && (
              <p className="text-sm text-red-600">{job.error}</p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
          <Download className="h-5 w-5" />
          导出书籍
        </h2>
        <p className="mt-1 text-sm text-gray-500">导出当前 Workspace 的所有书籍为 CSV 文件</p>
        <button
          onClick={exportBooksCSV}
          className="mt-3 rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 dark:bg-gray-600 dark:hover:bg-gray-500"
        >
          导出 CSV
        </button>
      </div>
    </div>
  )
}
