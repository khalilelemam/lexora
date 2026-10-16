import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const waitlistSchema = z.object({
  fullName: z.string().trim().min(2, 'الاسم يجب أن يحتوي على حرفين على الأقل'),
  email: z.string().trim().email('يرجى إدخال بريد إلكتروني صحيح').toLowerCase(),
  phone: z.string().trim().optional(),
  childAge: z
    .union([z.number().int().min(4).max(25), z.string().regex(/^\d+$/).transform(Number)])
    .optional(),
  userRole: z.string().trim().optional().default('parent'),
  notes: z.string().trim().max(1000).optional(),
  consentResearch: z.boolean().default(true),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = waitlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'بيانات غير صالحة',
        },
        { status: 400 },
      );
    }

    const { fullName, email, phone, childAge, userRole, notes, consentResearch } = parsed.data;

    const entry = await prisma.waitlistEntry.upsert({
      where: { email },
      update: {
        fullName,
        phone: phone || undefined,
        childAge: typeof childAge === 'number' ? childAge : undefined,
        userRole: userRole || undefined,
        notes: notes || undefined,
        consentResearch,
      },
      create: {
        fullName,
        email,
        phone: phone || null,
        childAge: typeof childAge === 'number' ? childAge : null,
        userRole: userRole || 'parent',
        notes: notes || null,
        consentResearch,
      },
    });

    return NextResponse.json({
      success: true,
      waitlistId: entry.id,
      message: 'تم تسجيلك بنجاح في قائمة الانتظار!',
    });
  } catch (error) {
    console.error('[Waitlist API Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء حفظ البيانات، يرجى المحاولة مرة أخرى.',
      },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const adminSecret = process.env.ADMIN_SECRET || 'lexora-waitlist-secret';

    // Public count summary for social proof
    if (secret !== adminSecret) {
      const count = await prisma.waitlistEntry.count();
      const testCount = await prisma.testAttempt.count();
      return NextResponse.json({
        totalCount: Math.max(count, 48), // baseline social proof
        completedTestsCount: testCount,
      });
    }

    // Admin full list
    const entries = await prisma.waitlistEntry.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        testAttempts: {
          select: {
            id: true,
            totalGazePoints: true,
            calibrationQuality: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      count: entries.length,
      entries,
    });
  } catch (error) {
    console.error('[Waitlist GET Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve waitlist' },
      { status: 500 },
    );
  }
}
