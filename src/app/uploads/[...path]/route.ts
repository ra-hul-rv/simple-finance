import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await auth();
    console.log('[SERVING UPLOAD] Session fetched:', session?.user?.id);
    if (!session?.user?.id) {
      console.log('[SERVING UPLOAD] Unauthorized access request');
      return new Response('Unauthorized', { status: 401 });
    }

    const { path: pathSegments } = await params;
    console.log('[SERVING UPLOAD] Path segments:', pathSegments);
    
    // Construct the actual file path inside /app/uploads
    // pathSegments will be something like ["attachments", "user-uuid", "filename.jpg"]
    const filePath = path.join(process.cwd(), 'uploads', ...pathSegments);
    console.log('[SERVING UPLOAD] Resolved file path:', filePath);

    if (!existsSync(filePath)) {
      console.log('[SERVING UPLOAD] File does not exist on disk:', filePath);
      return new Response('File not found', { status: 404 });
    }

    // Read file bytes
    const fileBuffer = await readFile(filePath);

    // Determine content type based on extension
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.pdf') contentType = 'application/pdf';

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Failed to serve upload:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
