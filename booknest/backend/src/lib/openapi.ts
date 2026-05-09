import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi'
import { z } from './zod-extended'

import { bookSchema, createBookBodySchema, updateBookBodySchema, listBooksQuerySchema } from '../schemas/book.schema'
import { authResponseSchema, loginBodySchema, registerBodySchema } from '../schemas/auth.schema'
import {
  categorySchema,
  createCategoryBodySchema,
  updateCategoryBodySchema,
} from '../schemas/category.schema'
import { createReviewBodySchema, reviewSchema } from '../schemas/review.schema'
import { errorResponseSchema, paginatedResponse, successResponse } from '../schemas/common.schema'

export const registry = new OpenAPIRegistry()

// 注册 schema
registry.register('Book', bookSchema)
registry.register('CreateBookBody', createBookBodySchema)
registry.register('UpdateBookBody', updateBookBodySchema)
registry.register('ListBooksQuery', listBooksQuerySchema)
registry.register('LoginBody', loginBodySchema)
registry.register('RegisterBody', registerBodySchema)
registry.register('AuthResponse', authResponseSchema)
registry.register('ErrorResponse', errorResponseSchema)
registry.register('Category', categorySchema)
registry.register('CreateCategoryBody', createCategoryBodySchema)
registry.register('UpdateCategoryBody', updateCategoryBodySchema)
registry.register('Review', reviewSchema)
registry.register('CreateReviewBody', createReviewBodySchema)

// Auth 路径
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/register',
  summary: '用户注册',
  request: {
    body: { content: { 'application/json': { schema: registerBodySchema } } },
  },
  responses: {
    201: {
      description: '注册成功',
      content: { 'application/json': { schema: successResponse(authResponseSchema) } },
    },
    400: {
      description: '参数错误',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/login',
  summary: '用户登录',
  request: {
    body: { content: { 'application/json': { schema: loginBodySchema } } },
  },
  responses: {
    200: {
      description: '登录成功',
      content: { 'application/json': { schema: successResponse(authResponseSchema) } },
    },
    400: {
      description: '参数错误',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
})

// Book 路径
registry.registerPath({
  method: 'get',
  path: '/api/v1/books',
  summary: '书籍列表',
  security: [{ bearerAuth: [] }],
  request: { query: listBooksQuerySchema },
  responses: {
    200: {
      description: '书籍分页列表',
      content: { 'application/json': { schema: paginatedResponse(bookSchema) } },
    },
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/v1/books',
  summary: '创建书籍',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createBookBodySchema } } },
  },
  responses: {
    201: {
      description: '创建成功',
      content: { 'application/json': { schema: successResponse(bookSchema) } },
    },
    400: {
      description: '参数错误',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
})

registry.registerPath({
  method: 'put',
  path: '/api/v1/books/{id}',
  summary: '更新书籍',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: updateBookBodySchema } } },
  },
  responses: {
    200: {
      description: '更新成功',
      content: { 'application/json': { schema: successResponse(bookSchema) } },
    },
  },
})

registry.registerPath({
  method: 'delete',
  path: '/api/v1/books/{id}',
  summary: '删除书籍',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: '删除成功',
      content: { 'application/json': { schema: successResponse(z.null()) } },
    },
  },
})

// Category 路径
registry.registerPath({
  method: 'get',
  path: '/api/v1/categories',
  summary: '分类列表',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: '分类列表',
      content: { 'application/json': { schema: successResponse(z.array(categorySchema)) } },
    },
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/v1/categories',
  summary: '创建分类',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createCategoryBodySchema } } },
  },
  responses: {
    201: {
      description: '创建成功',
      content: { 'application/json': { schema: successResponse(categorySchema) } },
    },
  },
})

// Security schemes
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
})

// Review 路径
registry.registerPath({
  method: 'post',
  path: '/api/v1/books/{bookId}/reviews',
  summary: '创建评论',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ bookId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: createReviewBodySchema } } },
  },
  responses: {
    201: {
      description: '创建成功',
      content: { 'application/json': { schema: successResponse(reviewSchema) } },
    },
  },
})

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions)

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'BookNest API',
      version: '1.0.0',
      description: 'BookNest 全栈藏书管理系统 API 文档',
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Local development' },
    ],
  })
}
