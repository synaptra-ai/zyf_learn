import { Text, View } from '@tarojs/components'
import './index.scss'

export interface Note {
  id: string
  content: string
  pageNumber?: number | null
  createdAt: string
}

interface NoteCardProps {
  note: Note
}

export function NoteCard({ note }: NoteCardProps) {
  const date = new Date(note.createdAt).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <View className="note-card">
      <Text className="note-card__content">{note.content}</Text>
      <View className="note-card__footer">
        {note.pageNumber && (
          <Text className="note-card__page">P.{note.pageNumber}</Text>
        )}
        <Text className="note-card__date">{date}</Text>
      </View>
    </View>
  )
}
