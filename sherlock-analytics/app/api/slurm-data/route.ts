import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    // Read the SLURM analysis data from the public directory
    const dataPath = path.join(process.cwd(), 'public', 'slurm_analysis.json')
    console.log('Attempting to read from:', dataPath)
    
    if (!fs.existsSync(dataPath)) {
      console.error('File does not exist at:', dataPath)
      return NextResponse.json(
        { error: 'SLURM data file not found' },
        { status: 404 }
      )
    }
    
    const data = fs.readFileSync(dataPath, 'utf8')
    const parsedData = JSON.parse(data)
    
    console.log('Successfully loaded SLURM data')
    return NextResponse.json(parsedData)
  } catch (error) {
    console.error('Error reading SLURM data:', error)
    return NextResponse.json(
      { error: 'Failed to load SLURM data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
