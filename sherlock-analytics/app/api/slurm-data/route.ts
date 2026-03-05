import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    // Read the TabPFN dashboard insights from the public directory (fallback to repo root)
    const publicDataPath = path.join(process.cwd(), 'public', 'tabpfn_dashboard_insights.json')
    const repoRootDataPath = path.join(process.cwd(), '..', 'tabpfn_dashboard_insights.json')

    if (!fs.existsSync(publicDataPath) && fs.existsSync(repoRootDataPath)) {
      fs.copyFileSync(repoRootDataPath, publicDataPath)
    }

    const dataPath = fs.existsSync(publicDataPath) ? publicDataPath : repoRootDataPath
    console.log('Attempting to read from:', dataPath)
    
    if (!fs.existsSync(dataPath)) {
      console.error('File does not exist at:', dataPath)
      return NextResponse.json(
        { error: 'Dashboard insights file not found' },
        { status: 404 }
      )
    }
    
    const data = fs.readFileSync(dataPath, 'utf8')
    const sanitizedData = data
      .replace(/\bNaN\b/g, 'null')
      .replace(/\bInfinity\b/g, 'null')
      .replace(/\b-Infinity\b/g, 'null')

    const parsedData = JSON.parse(sanitizedData)
    
    console.log('Successfully loaded dashboard insights')
    return NextResponse.json(parsedData)
  } catch (error) {
    console.error('Error reading dashboard insights:', error)
    return NextResponse.json(
      { error: 'Failed to load dashboard insights', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
