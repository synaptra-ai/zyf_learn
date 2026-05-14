import React, { useEffect, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { getReadingTimeline, getReadingGoal, updateReadingGoal } from '@/services/reading'
import type { TimelineDay } from '@/services/reading'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import './index.scss'

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<TimelineDay[]>([])
  const [loading, setLoading] = useState(true)
  const [dailyGoal, setDailyGoal] = useState(30)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('30')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [tl, goal] = await Promise.all([
        getReadingTimeline(14),
        getReadingGoal(),
      ])
      setTimeline(tl)
      setDailyGoal(goal.dailyGoalMinutes)
      setGoalInput(String(goal.dailyGoalMinutes))
    } catch {
      // request.ts handles toast
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  usePullDownRefresh(async () => {
    await fetchData()
    Taro.stopPullDownRefresh()
  })

  Taro.useDidShow(() => { fetchData() })

  const handleSaveGoal = async () => {
    const val = Number(goalInput)
    if (val < 1 || val > 480) {
      Taro.showToast({ title: '目标范围 1-480 分钟', icon: 'none' })
      return
    }
    try {
      await updateReadingGoal(val)
      setDailyGoal(val)
      setEditingGoal(false)
      Taro.showToast({ title: '目标已更新', icon: 'success' })
    } catch {
      // request.ts handles toast
    }
  }

  const weekDays = ['一', '二', '三', '四', '五', '六', '日']

  if (loading) return <LoadingState text="加载中..." />

  return (
    <View className="timeline-page">
      {/* Weekly overview */}
      <View className="timeline-week">
        <Text className="timeline-week__title">本周概览</Text>
        <View className="timeline-week__grid">
          {weekDays.map((d, i) => {
            const dayData = timeline.length > 6 - i ? timeline[6 - i] : null
            const met = dayData?.goalMet
            const hasData = dayData && dayData.totalMinutes > 0
            return (
              <View
                key={d}
                className={`timeline-week__cell ${met ? 'timeline-week__cell--met' : hasData ? 'timeline-week__cell--partial' : 'timeline-week__cell--empty'}`}
              >
                <Text className="timeline-week__day-label">{d}</Text>
                {hasData && (
                  <Text className="timeline-week__day-min">{dayData.totalMinutes}</Text>
                )}
              </View>
            )
          })}
        </View>
      </View>

      {/* Goal setting */}
      <View className="timeline-goal">
        <Text className="timeline-goal__label">每日目标</Text>
        {editingGoal ? (
          <View className="timeline-goal__edit">
            <input
              className="timeline-goal__input"
              type="number"
              value={goalInput}
              onInput={(e: any) => setGoalInput(e.detail.value || e.target.value)}
            />
            <Text className="timeline-goal__unit">分钟</Text>
            <View className="timeline-goal__save" onClick={handleSaveGoal}>
              <Text className="timeline-goal__save-text">保存</Text>
            </View>
          </View>
        ) : (
          <View className="timeline-goal__display" onClick={() => setEditingGoal(true)}>
            <Text className="timeline-goal__value">{dailyGoal} 分钟/天</Text>
            <Text className="timeline-goal__edit-icon">编辑</Text>
          </View>
        )}
      </View>

      {/* Timeline list */}
      <View className="timeline-list">
        {timeline.length === 0 ? (
          <EmptyState title="还没有阅读记录" description="开始你的第一次阅读吧" />
        ) : (
          timeline.map((day) => (
            <View key={day.date} className="timeline-day">
              <View className="timeline-day__header">
                <Text className="timeline-day__date">{formatDisplayDate(day.date)}</Text>
                <Text className="timeline-day__total">{day.totalMinutes} min</Text>
              </View>
              {day.sessions.map((session) => (
                <View key={session.id} className="timeline-session">
                  {session.book?.coverUrl ? (
                    <Image className="timeline-session__cover" src={session.book.coverUrl} mode="aspectFill" />
                  ) : (
                    <View className="timeline-session__cover timeline-session__cover--placeholder">
                      <Text>{session.book?.title?.[0] || '📖'}</Text>
                    </View>
                  )}
                  <View className="timeline-session__info">
                    <Text className="timeline-session__title">{session.book?.title || '未知书籍'}</Text>
                    <Text className="timeline-session__time">
                      {formatTime(session.startTime)} · {session.durationMinutes} min
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </View>
  )
}

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const diff = (today.getTime() - target.getTime()) / 86400000
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff === 2) return '前天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function formatTime(isoStr: string) {
  const d = new Date(isoStr)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
