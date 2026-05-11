import { Modal } from './Modal'
import { HandMetal } from 'lucide-react'

interface WelcomeModalProps {
  open: boolean
  onClose: () => void
  userName?: string
}

export function WelcomeModal({ open, onClose, userName }: WelcomeModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="欢迎回来"
      confirmText="开始使用"
      onConfirm={onClose}
    >
      <div className="flex flex-col items-center py-4">
        <HandMetal className="h-12 w-12 text-primary-600 mb-4" />
        <p className="text-lg text-gray-700 dark:text-gray-300">
          你好，<span className="font-semibold text-primary-600">{userName || '用户'}</span>！
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          今天想读点什么？
        </p>
      </div>
    </Modal>
  )
}
