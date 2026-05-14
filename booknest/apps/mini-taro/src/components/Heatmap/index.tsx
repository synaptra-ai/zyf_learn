import { Text, View } from '@tarojs/components'
import './index.scss'

interface HeatmapProps {
  year: number
  data: Record<string, number>
}

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getIntensity(count: number): string {
  if (count === 0) return 'heat-cell--0'
  if (count <= 1) return 'heat-cell--1'
  if (count <= 3) return 'heat-cell--2'
  if (count <= 5) return 'heat-cell--3'
  return 'heat-cell--4'
}

export function Heatmap({ year, data }: HeatmapProps) {
  const months = MONTHS.map((label, mi) => {
    const days = getDaysInMonth(year, mi)
    const cells = Array.from({ length: days }, (_, di) => {
      const key = `${year}-${String(mi + 1).padStart(2, '0')}-${String(di + 1).padStart(2, '0')}`
      return { key, count: data[key] || 0 }
    })
    return { label, cells }
  })

  return (
    <View className="heatmap">
      <Text className="heatmap__title">{year} 年阅读日历</Text>
      <View className="heatmap__grid">
        {months.map((m) => (
          <View key={m.label} className="heatmap__month">
            <Text className="heatmap__month-label">{m.label}</Text>
            <View className="heatmap__cells">
              {m.cells.map((c) => (
                <View key={c.key} className={`heat-cell ${getIntensity(c.count)}`} />
              ))}
            </View>
          </View>
        ))}
      </View>
      <View className="heatmap__legend">
        <Text className="heatmap__legend-label">少</Text>
        <View className="heat-cell heat-cell--0 heat-cell--legend" />
        <View className="heat-cell heat-cell--1 heat-cell--legend" />
        <View className="heat-cell heat-cell--2 heat-cell--legend" />
        <View className="heat-cell heat-cell--3 heat-cell--legend" />
        <View className="heat-cell heat-cell--4 heat-cell--legend" />
        <Text className="heatmap__legend-label">多</Text>
      </View>
    </View>
  )
}
