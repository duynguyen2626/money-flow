import { NextResponse } from 'next/server'
import { debugYoutube } from '@/services/debug.service'

export async function GET() {
    const logs = await debugYoutube()
    return NextResponse.json({ logs })
}
