import React from 'react'
import { Text, View } from '@tarojs/components'
import { ProgressRing } from '@/components/ProgressRing'
import './index.scss'

interface ReadingCardProps {
  todayMinutes: number
  dailyGoal: number
  streakDays: number
  goalMet: boolean
  onStartReading: () => void
  onViewTimeline: () => void
}

export const ReadingCard: React.FC<ReadingCardProps> = React.memo(function ReadingCard({
  todayMinutes,
  dailyGoal,
  streakDays,
  goalMet,
  onStartReading,
  onViewTimeline,
}) {
  const progress = Math.min(100, Math.round((todayMinutes / dailyGoal) * 100))

  return (
    <View className="reading-card">
      <View className="reading-card__left">
        <ProgressRing
          percentage={progress}
          size="md"
          showText={false}
        />
        <View className="reading-card__minutes-container">
          <Text className="reading-card__minutes">{todayMinutes}</Text>
          <Text className="reading-card__unit">min</Text>
        </View>
      </View>

      <View className="reading-card__right">
        <View className="reading-card__streak">
          <Text className="reading-card__streak-icon">🔥</Text>
          <Text className="reading-card__streak-text">连续阅读 {streakDays} 天</Text>
        </View>
        <Text className="reading-card__goal-text">
          今日目标 {todayMinutes}/{dailyGoal} 分钟
        </Text>
        {goalMet && (
          <Text className="reading-card__goal-met">今日目标已达成</Text>
        )}
        <View className="reading-card__actions">
          <View className="reading-card__btn reading-card__btn--primary" onClick={onStartReading}>
            <Text className="reading-card__btn-text">开始阅读</Text>
          </View>
          <View className="reading-card__btn reading-card__btn--ghost" onClick={onViewTimeline}>
            <Text className="reading-card__btn-text reading-card__btn-text--ghost">记录</Text>
          </View>
        </View>
      </View>
    </View>
  )
})
