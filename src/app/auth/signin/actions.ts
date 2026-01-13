'use server'

import { signIn } from '@/lib/auth'

export async function signInAction(redirectTo: string) {
  await signIn('github', { redirectTo })
}
