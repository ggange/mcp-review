#!/usr/bin/env tsx
/**
 * Script to create an example server for testing badges
 * 
 * Usage:
 *   tsx scripts/create-example-server.ts [--with-ratings]
 * 
 * This creates a server with ID "example/test-server" that can be used
 * to test badge generation in different states (no ratings, with ratings, etc.)
 * 
 * Options:
 *   --with-ratings: Also create a test user and add sample ratings
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const EXAMPLE_SERVER_ID = 'example/test-server'
const EXAMPLE_SERVER_NAME = 'Test Server'
const EXAMPLE_SERVER_DESCRIPTION = 'An example server for testing badge generation'
const TEST_USER_EMAIL = 'test-badge-user@example.com'
const TEST_USER_NAME = 'Test Badge User'

async function createTestUser() {
  // Check if test user already exists
  let testUser = await prisma.user.findUnique({
    where: { email: TEST_USER_EMAIL },
  })

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: TEST_USER_EMAIL,
        name: TEST_USER_NAME,
        role: 'user',
      },
    })
    console.log(`✅ Created test user: ${testUser.email}`)
  } else {
    console.log(`ℹ️  Using existing test user: ${testUser.email}`)
  }

  return testUser
}

async function addSampleRatings(serverId: string, userId: string) {
  // Sample ratings: [5, 4, 5, 3, 4] = average of 4.2
  const sampleRatings = [
    { rating: 5, text: 'Excellent server! Very useful.' },
    { rating: 4, text: 'Great functionality, easy to use.' },
    { rating: 5, text: 'Perfect for my use case.' },
    { rating: 3, text: 'Good but could use some improvements.' },
    { rating: 4, text: 'Solid server with good documentation.' },
  ]

  console.log(`\nAdding ${sampleRatings.length} sample ratings...`)

  // We need to create multiple users for multiple ratings (one rating per user per server)
  const users = []
  for (let i = 0; i < sampleRatings.length; i++) {
    const userEmail = `test-badge-user-${i}@example.com`
    let user = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userEmail,
          name: `Test User ${i + 1}`,
          role: 'user',
        },
      })
    }
    users.push(user)
  }

  // Create ratings
  for (let i = 0; i < sampleRatings.length; i++) {
    const { rating, text } = sampleRatings[i]
    await prisma.rating.upsert({
      where: {
        serverId_userId: {
          serverId,
          userId: users[i].id,
        },
      },
      create: {
        serverId,
        userId: users[i].id,
        rating,
        text,
        status: 'approved',
      },
      update: {
        rating,
        text,
        status: 'approved',
      },
    })
  }

  // Update server aggregates
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [aggregates, recentCount] = await Promise.all([
    prisma.rating.aggregate({
      where: {
        serverId,
        status: 'approved',
      },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.rating.count({
      where: {
        serverId,
        status: 'approved',
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
  ])

  const avgRating = aggregates._avg.rating || 0
  const totalRatings = aggregates._count

  await prisma.server.update({
    where: { id: serverId },
    data: {
      avgRating: avgRating,
      totalRatings: totalRatings,
      combinedScore: avgRating,
      recentRatingsCount: recentCount,
    },
  })

  console.log(`✅ Added ${sampleRatings.length} ratings`)
  console.log(`   Average rating: ${avgRating.toFixed(1)}`)
  console.log(`   Total ratings: ${totalRatings}`)
}

async function main() {
  const withRatings = process.argv.includes('--with-ratings')
  
  console.log('Creating example server for badge testing...')
  if (withRatings) {
    console.log('(Will also create test users and add sample ratings)')
  }

  try {
    // Check if server already exists
    const existingServer = await prisma.server.findUnique({
      where: { id: EXAMPLE_SERVER_ID },
      include: {
        ratings: {
          where: { status: 'approved' },
        },
      },
    })

    if (existingServer) {
      console.log(`\n⚠️  Server with ID "${EXAMPLE_SERVER_ID}" already exists.`)
      console.log(`\nCurrent stats:`)
      console.log(`  - Name: ${existingServer.name}`)
      console.log(`  - Average Rating: ${existingServer.avgRating}`)
      console.log(`  - Total Ratings: ${existingServer.totalRatings}`)
      console.log(`\nYou can test badges at:`)
      console.log(`  - Badge URL: /api/badge/${encodeURIComponent(EXAMPLE_SERVER_ID)}`)
      console.log(`  - Badge with custom text: /api/badge/${encodeURIComponent(EXAMPLE_SERVER_ID)}?text=Custom+Text`)
      console.log(`  - Badge without totals: /api/badge/${encodeURIComponent(EXAMPLE_SERVER_ID)}?totals=false`)
      console.log(`  - Server page: /servers/${EXAMPLE_SERVER_ID}`)
      
      if (withRatings && existingServer.totalRatings === 0) {
        console.log(`\nAdding ratings to existing server...`)
        const testUser = await createTestUser()
        await addSampleRatings(EXAMPLE_SERVER_ID, testUser.id)
        
        // Fetch updated server
        const updatedServer = await prisma.server.findUnique({
          where: { id: EXAMPLE_SERVER_ID },
        })
        console.log(`\n✅ Updated server stats:`)
        console.log(`  - Average Rating: ${updatedServer?.avgRating}`)
        console.log(`  - Total Ratings: ${updatedServer?.totalRatings}`)
      }
      
      return
    }

    // Create the example server
    const server = await prisma.server.create({
      data: {
        id: EXAMPLE_SERVER_ID,
        name: EXAMPLE_SERVER_NAME,
        description: EXAMPLE_SERVER_DESCRIPTION,
        category: 'tools',
        source: 'user',
        avgRating: 0,
        totalRatings: 0,
        combinedScore: 0,
        recentRatingsCount: 0,
        packages: Prisma.JsonNull,
        remotes: Prisma.JsonNull,
      },
    })

    console.log(`✅ Created example server successfully!`)
    console.log(`\nServer ID: ${server.id}`)
    console.log(`Server Name: ${server.name}`)

    // Add ratings if requested
    if (withRatings) {
      const testUser = await createTestUser()
      await addSampleRatings(EXAMPLE_SERVER_ID, testUser.id)
      
      // Fetch updated server
      const updatedServer = await prisma.server.findUnique({
        where: { id: EXAMPLE_SERVER_ID },
      })
      console.log(`\n✅ Final server stats:`)
      console.log(`  - Average Rating: ${updatedServer?.avgRating}`)
      console.log(`  - Total Ratings: ${updatedServer?.totalRatings}`)
    }

    console.log(`\n📋 Badge Testing URLs:`)
    console.log(`  - Badge URL: /api/badge/${encodeURIComponent(EXAMPLE_SERVER_ID)}`)
    console.log(`  - Badge with custom text: /api/badge/${encodeURIComponent(EXAMPLE_SERVER_ID)}?text=Custom+Text`)
    console.log(`  - Badge without totals: /api/badge/${encodeURIComponent(EXAMPLE_SERVER_ID)}?totals=false`)
    console.log(`  - Server page: /servers/${EXAMPLE_SERVER_ID}`)
    
    if (!withRatings) {
      console.log(`\n💡 To add ratings, run:`)
      console.log(`   tsx scripts/create-example-server.ts --with-ratings`)
      console.log(`\n   Or visit the server page and add ratings manually`)
    }
  } catch (error) {
    console.error('Error creating example server:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })
