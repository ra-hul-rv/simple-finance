import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { confirmPendingAction } from '@/lib/ai/actions';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    const result = await confirmPendingAction(id, session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[API Action Confirm] Error confirming action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error confirming action' },
      { status: 500 }
    );
  }
}
