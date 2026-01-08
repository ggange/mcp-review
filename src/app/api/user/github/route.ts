import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in' } },
        { status: 401 }
      )
    }

    // Fetch GitHub account
    const githubAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'github',
      },
      select: {
        providerAccountId: true,
        access_token: true,
      },
    })

    if (!githubAccount?.access_token) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'GitHub account not found' } },
        { status: 404 }
      )
    }

    // Fetch GitHub user info
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${githubAccount.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch GitHub user')
      }

      const githubUser = await response.json()

      return NextResponse.json({
        username: githubUser.login,
        avatar: githubUser.avatar_url,
        name: githubUser.name || githubUser.login,
      })
    } catch (error) {
      console.error('Failed to fetch GitHub user:', error)
      return NextResponse.json(
        { error: { code: 'EXTERNAL_ERROR', message: 'Failed to fetch GitHub user info' } },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('GitHub info error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get GitHub info' } },
      { status: 500 }
    )
  }
}
