import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BookOpen } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱'),
  password: z.string().min(1, '密码不能为空'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('')
      await login(data.email, data.password)
      navigate('/?welcome=true')
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BookOpen className="mx-auto h-12 w-12 text-primary-600" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">BookNest</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">登录你的账号</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          {error && (
            <div data-testid="login-error" className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">{error}</div>
          )}

          <Input
            id="email"
            data-testid="login-email"
            label="邮箱"
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            id="password"
            data-testid="login-password"
            label="密码"
            type="password"
            placeholder="••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <Button type="submit" data-testid="login-submit" className="w-full" isLoading={isSubmitting}>
            登录
          </Button>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            没有账号？{' '}
            <Link to="/register" className="text-primary-600 hover:underline dark:text-primary-400">
              去注册
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
