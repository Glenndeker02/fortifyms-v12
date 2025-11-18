import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const millId = searchParams.get('millId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    const whereClause: any = {}
    if (millId) whereClause.millId = millId
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) whereClause.createdAt.gte = new Date(startDate)
      if (endDate) whereClause.createdAt.lte = new Date(endDate)
    }

    // Fetch diagnostic results
    const diagnosticResults = await prisma.diagnosticResult.findMany({
      where: whereClause,
      include: {
        questionnaire: {
          select: {
            category: true,
            name: true,
          },
        },
        user: {
          select: {
            name: true,
            mill: {
              select: {
                name: true,
                country: true,
                region: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Aggregate statistics
    const totalDiagnostics = diagnosticResults.length

    // Group by category
    const categoryStats: Record<
      string,
      {
        count: number
        issuesIdentified: number
        avgIssuesPerDiagnostic: number
      }
    > = {}

    diagnosticResults.forEach((result) => {
      const category = result.questionnaire.category
      if (!categoryStats[category]) {
        categoryStats[category] = {
          count: 0,
          issuesIdentified: 0,
          avgIssuesPerDiagnostic: 0,
        }
      }
      categoryStats[category].count++
      const issues = result.flaggedIssues ? JSON.parse(result.flaggedIssues).length : 0
      categoryStats[category].issuesIdentified += issues
    })

    // Calculate averages
    Object.keys(categoryStats).forEach((category) => {
      const stat = categoryStats[category]
      stat.avgIssuesPerDiagnostic = stat.issuesIdentified / stat.count
    })

    // Most common problems
    const allIssues: Record<string, number> = {}
    diagnosticResults.forEach((result) => {
      if (result.flaggedIssues) {
        const issues = JSON.parse(result.flaggedIssues) as any[]
        issues.forEach((issue) => {
          const issueKey = issue.category || issue.problem || 'Unknown Issue'
          allIssues[issueKey] = (allIssues[issueKey] || 0) + 1
        })
      }
    })

    const topIssues = Object.entries(allIssues)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([issue, count]) => ({
        issue,
        count,
        percentage: (count / totalDiagnostics) * 100,
      }))

    // Completion rate by mill
    const millStats: Record<
      string,
      {
        millName: string
        country: string
        diagnosticsCount: number
        issuesCount: number
      }
    > = {}

    diagnosticResults.forEach((result) => {
      const mill = result.user.mill
      if (mill) {
        const millKey = mill.name
        if (!millStats[millKey]) {
          millStats[millKey] = {
            millName: mill.name,
            country: mill.country,
            diagnosticsCount: 0,
            issuesCount: 0,
          }
        }
        millStats[millKey].diagnosticsCount++
        const issues = result.flaggedIssues ? JSON.parse(result.flaggedIssues).length : 0
        millStats[millKey].issuesCount += issues
      }
    })

    // Trend data (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentDiagnostics = await prisma.diagnosticResult.findMany({
      where: {
        ...whereClause,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdAt: true,
        flaggedIssues: true,
      },
    })

    // Group by day
    const trendData: Record<string, { date: string; count: number; issues: number }> = {}
    recentDiagnostics.forEach((result) => {
      const dateKey = result.createdAt.toISOString().split('T')[0]
      if (!trendData[dateKey]) {
        trendData[dateKey] = { date: dateKey, count: 0, issues: 0 }
      }
      trendData[dateKey].count++
      const issues = result.flaggedIssues ? JSON.parse(result.flaggedIssues).length : 0
      trendData[dateKey].issues += issues
    })

    const trendArray = Object.values(trendData).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    // Response time analysis (how long it takes to complete diagnostics)
    const avgResponseTime = diagnosticResults.reduce((acc, result) => {
      if (result.completedAt) {
        const timeToComplete =
          new Date(result.completedAt).getTime() - new Date(result.createdAt).getTime()
        return acc + timeToComplete
      }
      return acc
    }, 0) / diagnosticResults.filter((r) => r.completedAt).length

    return NextResponse.json({
      summary: {
        totalDiagnostics,
        completedDiagnostics: diagnosticResults.filter((r) => r.completedAt).length,
        avgResponseTimeMinutes: Math.round(avgResponseTime / 60000),
        totalIssuesIdentified: Object.values(allIssues).reduce((a, b) => a + b, 0),
      },
      categoryStats,
      topIssues,
      millStats: Object.values(millStats),
      trendData: trendArray,
    })
  } catch (error) {
    console.error('Error fetching diagnostic analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
