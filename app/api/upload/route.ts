import { NextRequest, NextResponse } from 'next/server';
import { parseDocument } from '@/lib/document-parser';
import { RecursiveTextSplitter } from '@/lib/text-splitter';
import { vectorStore } from '@/lib/vector-store';
import { DocumentMetadata } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sessionId = (formData.get('sessionId') as string) || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds maximum limit of 25MB' },
        { status: 413 }
      );
    }

    const filename = file.name;
    const mimeType = file.type;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Parse document text & page layout
    const parseResult = await parseDocument(buffer, filename, mimeType);

    // 2. Split into chunks (chunk_size=1000, chunk_overlap=150)
    const splitter = new RecursiveTextSplitter({ chunkSize: 1000, chunkOverlap: 150 });
    const chunks = splitter.createChunksFromPages(parseResult.pages, filename);

    if (chunks.length === 0) {
      return NextResponse.json(
        {
          error:
            'Could not extract readable text from document. If this is a scanned PDF image, OCR is required.',
        },
        { status: 422 }
      );
    }

    const apiKey = (formData.get('apiKey') as string) || undefined;
    const provider = (formData.get('provider') as any) || undefined;

    // 3. Store in vector store with embeddings & BM25 index
    await vectorStore.storeDocumentChunks(
      sessionId,
      chunks,
      {
        filename,
        pageCount: parseResult.pageCount,
        chunkCount: chunks.length,
      },
      { apiKey, provider }
    );

    const metadata: DocumentMetadata = {
      id: sessionId,
      name: filename,
      size: file.size,
      type: mimeType || 'application/octet-stream',
      pageCount: parseResult.pageCount,
      chunkCount: chunks.length,
      uploadedAt: new Date().toISOString(),
      isScannedWarning: parseResult.isScannedWarning,
      status: 'ready',
    };

    return NextResponse.json({
      success: true,
      sessionId,
      metadata,
    });
  } catch (error: any) {
    console.error('Error in /api/upload:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process document' },
      { status: 500 }
    );
  }
}
