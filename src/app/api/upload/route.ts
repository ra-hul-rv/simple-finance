import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'attachments');
const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Use JPEG, PNG, WebP, GIF, or PDF.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const userDir = path.join(UPLOAD_DIR, session.user.id);
    await mkdir(userDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.name) || (file.type === 'application/pdf' ? '.pdf' : '.jpg');
    const uniqueName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(userDir, uniqueName);
    const relativePath = `/uploads/attachments/${session.user.id}/${uniqueName}`;

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    return NextResponse.json({ success: true, filePath: relativePath });
  } catch (error) {
    console.error('Failed to upload file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
