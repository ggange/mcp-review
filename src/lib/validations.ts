import { z } from 'zod'

export const ratingSchema = z.object({
  serverId: z.string().min(1),
  trustworthiness: z.number().int().min(1).max(5),
  usefulness: z.number().int().min(1).max(5),
})

export const serverUploadSchema = z.object({
  name: z.string().min(1).max(100),
  organization: z.string().min(1).max(100),
  description: z.string().max(2000).nullable().optional(),
  version: z.string().max(50).nullable().optional(),
  repositoryUrl: z.string().url().nullable().optional(),
})

