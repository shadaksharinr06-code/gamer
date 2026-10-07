import { NextRequest, NextResponse } from 'next/server';
import { vectorStore } from '@/lib/vector-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId } = body;

    if (sessionId) {
      vectorStore.clearSession(sessionId);
    }

    return NextResponse.json({
      success: true,
      message: 'Document cache and session reset successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to reset session' },
      { status: 500 }
    );
  }
}
