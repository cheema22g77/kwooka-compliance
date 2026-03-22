import { NextRequest, NextResponse } from 'next/server'
import { legislationMonitor, LEGISLATION_SOURCES } from '@/lib/legislation-monitor'

// This endpoint can be called by a cron service (Vercel Cron, GitHub Actions, etc.)
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = []
    const sources = await legislationMonitor.getSourceStatus()

    for (const monitoredSource of LEGISLATION_SOURCES) {
      const dbSource = sources.find(s => s.name === monitoredSource.name)
      const lastHash = dbSource?.metadata?.contentHash

      const checkResult = await legislationMonitor.checkForUpdates(
        monitoredSource.checkUrl,
        lastHash
      )

      if (checkResult.hasChanges) {
        // Log that changes were detected
        await legislationMonitor.logCheck(
          monitoredSource.name,
          'changes_detected',
          `Hash changed from ${lastHash} to ${checkResult.newHash}`
        )

        console.log(`[CRON] Changes detected for: ${monitoredSource.name}`)
      }

      // Update the hash even if no changes
      if (dbSource && checkResult.newHash) {
        await legislationMonitor.updateSourceHash(dbSource.id, checkResult.newHash)
      }

      results.push({
        name: monitoredSource.name,
        hasChanges: checkResult.hasChanges,
        lastModified: checkResult.lastModified
      })
    }

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      results,
      changesDetected: results.filter(r => r.hasChanges).length
    })
  } catch (error: any) {
    console.error('[CRON] Check failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
