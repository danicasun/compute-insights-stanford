import { NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'
import fs from 'fs'
import path from 'path'

// Refresh cached data every 5 minutes
let cachedData: unknown = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 5 * 60 * 1000

async function loadFromGCS(bucket: string, file: string): Promise<string> {
  const storage = new Storage()
  const [contents] = await storage.bucket(bucket).file(file).download()
  return contents.toString('utf8')
}

function loadFromFilesystem(): string {
  const publicDataPath = path.join(process.cwd(), 'public', 'tabpfn_dashboard_insights.json')
  const repoRootDataPath = path.join(process.cwd(), '..', 'tabpfn_dashboard_insights.json')

  if (!fs.existsSync(publicDataPath) && fs.existsSync(repoRootDataPath)) {
    fs.copyFileSync(repoRootDataPath, publicDataPath)
  }

  const dataPath = fs.existsSync(publicDataPath) ? publicDataPath : repoRootDataPath
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Dashboard insights file not found at ${dataPath}`)
  }
  return fs.readFileSync(dataPath, 'utf8')
}

export async function GET() {
  try {
    const now = Date.now()

    if (!cachedData || now - cacheTimestamp > CACHE_TTL_MS) {
      const bucket = process.env.GCS_BUCKET_NAME
      const file = process.env.GCS_DATA_FILE ?? 'tabpfn_dashboard_insights.json'

      let raw: string
      if (bucket) {
        console.log(`Loading dashboard data from GCS: gs://${bucket}/${file}`)
        raw = await loadFromGCS(bucket, file)
      } else {
        console.log('GCS_BUCKET_NAME not set — loading from filesystem')
        raw = loadFromFilesystem()
      }

      const sanitized = raw
        .replace(/\bNaN\b/g, 'null')
        .replace(/\bInfinity\b/g, 'null')
        .replace(/\b-Infinity\b/g, 'null')

      cachedData = JSON.parse(sanitized)
      cacheTimestamp = now
      console.log('Dashboard insights loaded and cached')
    }

    return NextResponse.json(cachedData)
  } catch (error) {
    console.error('Error reading dashboard insights:', error)
    return NextResponse.json(
      { error: 'Failed to load dashboard insights', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
