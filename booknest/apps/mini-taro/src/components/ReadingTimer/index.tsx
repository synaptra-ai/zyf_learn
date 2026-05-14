import React, { useEffect, useRef, useState } from 'react'
import { Picker, Slider, Text, View } from '@tarojs/components'
import Taro, { useDidHide, useDidShow } from '@tarojs/taro'
import { createReadingSession } from '@/services/reading'
import './index.scss'

interface ReadingTimerProps {
  books: { id: string; title: string; coverUrl?: string | null }[]
  visible: boolean
  onClose: () => void
  onComplete: () => void
}

export const ReadingTimer: React.FC<ReadingTimerProps> = React.memo(function ReadingTimer({
  books,
  visible,
  onClose,
  onComplete,
}) {
  const [selectedBookId, setSelectedBookId] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [readingProgress, setReadingProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const [phase, setPhase] = useState<'select' | 'timing' | 'finish'>('select')

  const startTimestampRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  useDidShow(() => {
    if (isRunning && startTimestampRef.current > 0) {
      setElapsedSeconds(Math.floor((Date.now() - startTimestampRef.current) / 1000))
    }
  })

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimestampRef.current) / 1000))
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    if (!selectedBookId) {
      Taro.showToast({ title: '请先选择一本书', icon: 'none' })
      return
    }
    startTimestampRef.current = Date.now()
    setElapsedSeconds(0)
    setIsRunning(true)
    setPhase('timing')
  }

  const handleStop = () => {
    setIsRunning(false)
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('finish')
  }

  const handleSave = async () => {
    if (elapsedSeconds < 60) {
      Taro.showToast({ title: '阅读不足1分钟，不记录', icon: 'none' })
      onClose()
      resetState()
      return
    }

    setSaving(true)
    try {
      const startTime = new Date(startTimestampRef.current).toISOString()
      const endTime = new Date().toISOString()
      await createReadingSession({
        bookId: selectedBookId,
        startTime,
        endTime,
        readingProgress,
      })
      Taro.showToast({ title: '阅读记录已保存', icon: 'success' })
      onComplete()
      onClose()
      resetState()
    } catch {
      // request.ts handles error toast
    } finally {
      setSaving(false)
    }
  }

  const resetState = () => {
    setSelectedBookId('')
    setIsRunning(false)
    setElapsedSeconds(0)
    setReadingProgress(0)
    setPhase('select')
    startTimestampRef.current = 0
  }

  if (!visible) return null

  const selectedBook = books.find((b) => b.id === selectedBookId)

  return (
    <View className="timer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <View className="timer-sheet">
        <View className="timer-sheet__header">
          <Text className="timer-sheet__title">
            {phase === 'select' ? '选择书籍' : phase === 'timing' ? '阅读中...' : '阅读完成'}
          </Text>
          <Text className="timer-sheet__close" onClick={onClose}>✕</Text>
        </View>

        {phase === 'select' && (
          <View className="timer-sheet__body">
            <Picker
              mode="selector"
              range={books.map((b) => b.title)}
              value={books.findIndex((b) => b.id === selectedBookId)}
              onChange={(e) => setSelectedBookId(books[Number(e.detail.value)]?.id || '')}
            >
              <View className="timer-sheet__book-picker">
                <Text className="timer-sheet__book-label">
                  {selectedBook ? selectedBook.title : '点击选择要阅读的书籍'}
                </Text>
                <Text className="timer-sheet__book-arrow">›</Text>
              </View>
            </Picker>
            <View
              className={`timer-sheet__start-btn ${!selectedBookId ? 'timer-sheet__start-btn--disabled' : ''}`}
              onClick={handleStart}
            >
              <Text className="timer-sheet__start-text">开始阅读</Text>
            </View>
          </View>
        )}

        {phase === 'timing' && (
          <View className="timer-sheet__body timer-sheet__body--center">
            <Text className="timer-sheet__book-name">{selectedBook?.title}</Text>
            <Text className="timer-sheet__elapsed">{formatTime(elapsedSeconds)}</Text>
            <View className="timer-sheet__stop-btn" onClick={handleStop}>
              <Text className="timer-sheet__stop-text">结束阅读</Text>
            </View>
          </View>
        )}

        {phase === 'finish' && (
          <View className="timer-sheet__body">
            <Text className="timer-sheet__summary">
              阅读《{selectedBook?.title}》 {Math.floor(elapsedSeconds / 60)} 分钟
            </Text>
            <View className="timer-sheet__progress-section">
              <Text className="timer-sheet__progress-label">阅读进度 {readingProgress}%</Text>
              <Slider
                min={0}
                max={100}
                value={readingProgress}
                activeColor="#8B7355"
                backgroundColor="#EDE8E1"
                blockSize={20}
                onChange={(e) => setReadingProgress(e.detail.value)}
              />
            </View>
            <View className="timer-sheet__save-btn" onClick={handleSave}>
              <Text className="timer-sheet__save-text">{saving ? '保存中...' : '保存记录'}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
})
