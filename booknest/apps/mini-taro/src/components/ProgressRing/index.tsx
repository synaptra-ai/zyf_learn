import { Text, View } from '@tarojs/components'
import './index.scss'

interface ProgressRingProps {
  percentage: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  showText?: boolean
}

const SIZE_MAP = {
  sm: 64,
  md: 120,
  lg: 200,
}

export function ProgressRing({ percentage, size = 'md', label, showText = true }: ProgressRingProps) {
  const r = SIZE_MAP[size]
  const strokeWidth = size === 'sm' ? 6 : size === 'md' ? 10 : 14
  const radius = (r - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference
  const center = r / 2

  return (
    <View className={`progress-ring progress-ring--${size}`}>
      <svg width={r} height={r} className="progress-ring__svg">
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#F0ECE8"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#C4956A"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          className="progress-ring__progress"
        />
      </svg>
      {showText && size !== 'sm' && (
        <View className="progress-ring__text">
          <Text className="progress-ring__percentage">{Math.round(percentage)}%</Text>
          {label && <Text className="progress-ring__label">{label}</Text>}
        </View>
      )}
    </View>
  )
}
