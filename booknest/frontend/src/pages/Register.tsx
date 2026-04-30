import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BookOpen } from 'lucide-react'

const registerSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  email: z.string().email('请输入有效的邮箱'),
  password: z.string().min(6, '密码至少 6 个字符'),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function Register() {
  const navigate = useNavigate()
  const registerUser = useAuthStore((s) => s.register)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError('')
      await registerUser(data.email, data.password, data.name)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BookOpen className="mx-auto h-12 w-12 text-primary-600" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">BookNest</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">创建新账号</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">{error}</div>
          )}

          <Input
            id="name"
            label="姓名"
            placeholder="你的名字"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            id="email"
            label="邮箱"
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            id="password"
            label="密码"
            type="password"
            placeholder="至少 6 个字符"
            error={errors.password?.message}
            {...register('password')}
          />

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            注册
          </Button>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            已有账号？{' '}
            <Link to="/login" className="text-primary-600 hover:underline dark:text-primary-400">
              去登录
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
