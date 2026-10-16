import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Download, Users, CheckCircle, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function AdminWaitlistPage() {
  const [entries, totalCount, completedCount] = await Promise.all([
    prisma.waitlistEntry.findMany({
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
    }),
    prisma.waitlistEntry.count(),
    prisma.testAttempt.count(),
  ]);

  return (
    <div className="min-h-screen bg-[#e3dcc2] p-6 sm:p-10 text-[#1b2021]" dir="rtl">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 border-b border-[#51513d]/20">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#1b2021]">
              إدارة قائمة الانتظار والبيانات البحثية
            </h1>
            <p className="mt-1 text-sm text-[#1b2021]/70">
              استعراض المسجلين في قائمة الانتظار، جلسات اختبار القراءة، وتصدير البيانات إلى Excel.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a href="/api/waitlist/export" download>
              <Button className="bg-[#51513d] text-[#e3dcc2] hover:bg-[#1b2021] shadow-sm">
                <Download className="ml-2 h-4 w-4" />
                تصدير إلى Excel (CSV)
              </Button>
            </a>
            <Link href="/">
              <Button variant="outline" className="border-[#51513d]/30 text-xs">
                الصفحة الرئيسية
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="border border-[#51513d]/18 bg-[#f3edd7] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#51513d]">إجمالي المسجلين</span>
              <Users className="h-5 w-5 text-[#8b6f25]" />
            </div>
            <p className="mt-3 text-3xl font-black text-[#1b2021]">{totalCount}</p>
            <p className="mt-1 text-xs text-[#1b2021]/60">مسجل في قائمة الانتظار</p>
          </div>

          <div className="border border-[#51513d]/18 bg-[#f3edd7] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#51513d]">جلسات القراءة المسجلة</span>
              <CheckCircle className="h-5 w-5 text-green-700" />
            </div>
            <p className="mt-3 text-3xl font-black text-[#1b2021]">{completedCount}</p>
            <p className="mt-1 text-xs text-[#1b2021]/60">جلسة تتبع عين مكتملة على الخادم</p>
          </div>

          <div className="border border-[#51513d]/18 bg-[#f3edd7] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#51513d]">نسبة المشاركة في الاختبار</span>
              <FileText className="h-5 w-5 text-[#51513d]" />
            </div>
            <p className="mt-3 text-3xl font-black text-[#1b2021]">
              {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
            </p>
            <p className="mt-1 text-xs text-[#1b2021]/60">من إجمالي المسجلين</p>
          </div>
        </div>

        {/* Data Table */}
        <div className="mt-8 border border-[#51513d]/18 bg-[#f3edd7] shadow-[8px_8px_0_rgba(81,81,61,.08)] overflow-hidden">
          <div className="p-4 border-b border-[#51513d]/15 flex items-center justify-between">
            <h2 className="font-bold text-[#1b2021] text-base">قائمة المسجلين ({entries.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#e3dcc2]/60 text-[#51513d] font-bold border-b border-[#51513d]/15">
                <tr>
                  <th className="p-3.5">الاسم</th>
                  <th className="p-3.5">البريد الإلكتروني</th>
                  <th className="p-3.5">الهاتف</th>
                  <th className="p-3.5">عمر الطفل</th>
                  <th className="p-3.5">الصفة</th>
                  <th className="p-3.5">حالة الاختبار</th>
                  <th className="p-3.5">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#51513d]/10">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#1b2021]/60">
                      لا توجد تسجيلات بعد في قائمة الانتظار.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#e3dcc2]/30 transition-colors">
                      <td className="p-3.5 font-bold text-[#1b2021]">{entry.fullName}</td>
                      <td className="p-3.5 font-mono">{entry.email}</td>
                      <td className="p-3.5">{entry.phone || '—'}</td>
                      <td className="p-3.5">{entry.childAge ? `${entry.childAge} سنوات` : '—'}</td>
                      <td className="p-3.5">
                        <span className="rounded bg-[#e3dcc2] px-2 py-0.5 text-[11px] font-medium text-[#51513d]">
                          {entry.userRole || 'ولي أمر'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {entry.hasCompletedTest || entry.testAttempts.length > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-green-100 text-green-800 px-2 py-0.5 text-[11px] font-bold">
                            <CheckCircle className="h-3 w-3" />
                            مكتمل ({entry.testAttempts.reduce((acc, t) => acc + t.totalGazePoints, 0)} نقطة)
                          </span>
                        ) : (
                          <span className="rounded bg-[#51513d]/10 text-[#51513d] px-2 py-0.5 text-[11px]">
                            قيد الانتظار
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-[#1b2021]/65">
                        {new Date(entry.createdAt).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
