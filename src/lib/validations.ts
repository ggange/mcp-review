import { z } from 'zod'

export const ratingSchema = z.object({
  serverId: z.string().min(1),
  trustworthiness: z.number().int().min(1).max(5),
  usefulness: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional(),
})

export const reviewVoteSchema = z.object({
  helpful: z.boolean(),
})

export const reviewFlagSchema = z.object({
  // No fields needed, just authentication
})

export const reviewUpdateSchema = z.object({
  text: z.string().max(2000).optional(),
  trustworthiness: z.number().int().min(1).max(5).optional(),
  usefulness: z.number().int().min(1).max(5).optional(),
})

export const serverUploadSchema = z.object({
  name: z.string().min(1).max(100),
  organization: z.string().min(1).max(100),
  description: z.string().max(2000).nullable().optional(),
  version: z.string().max(50).nullable().optional(),
  repositoryUrl: z.string().url().nullable().optional(),
})

