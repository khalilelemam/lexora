import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const adminSecret = process.env.ADMIN_SECRET || 'lexora-waitlist-secret';

    if (secret && secret !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entries = await prisma.waitlistEntry.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        testAttempts: {
          select: {
            id: true,
            totalGazePoints: true,
          },
        },
      },
    });

    // Escape CSV values
    const escapeCsv = (str: string | number | boolean | null | undefined): string => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      'المعرف (ID)',
      'الاسم الكامل (Name)',
      'البريد الإلكتروني (Email)',
      'رقم الهاتف (Phone)',
      'عمر الطفل (Child Age)',
      'الصفة (Role)',
      'أكمل اختبار القراءة (Completed Test)',
      'عدد نقاط تتبع العين (Gaze Points)',
      'ملاحظات (Notes)',
      'تاريخ التسجيل (Created At)',
    ];

    const rows = entries.map((e) => {
      const totalPoints = e.testAttempts.reduce((acc, t) => acc + (t.totalGazePoints || 0), 0);
      return [
        escapeCsv(e.id),
        escapeCsv(e.fullName),
        escapeCsv(e.email),
        escapeCsv(e.phone),
        escapeCsv(e.childAge),
        escapeCsv(e.userRole),
        escapeCsv(e.hasCompletedTest ? 'نعم (Yes)' : 'لا (No)'),
        escapeCsv(totalPoints),
        escapeCsv(e.notes),
        escapeCsv(e.createdAt.toISOString()),
      ].join(',');
    });

    // Prepend UTF-8 BOM (\uFEFF) so Excel opens Arabic without encoding corruption
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="lexora-waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('[Waitlist Export Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export CSV' },
      { status: 500 },
    );
  }
}
