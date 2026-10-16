'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Camera,
  HeartHandshake,
  ShieldCheck,
  Search,
  BookOpen,
} from 'lucide-react';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WaitlistSuccessData {
  waitlistId: string;
  fullName: string;
  childAge?: number | null;
}

export default function WaitlistDedicatedPage() {
  const router = useRouter();

  // Mode: 'register' | 'lookup'
  const [activeTab, setActiveTab] = useState<'register' | 'lookup'>('register');

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [childAge, setChildAge] = useState<number | ''>('');
  const [userRole, setUserRole] = useState('parent');
  const [notes, setNotes] = useState('');
  const [consentResearch, setConsentResearch] = useState(true);

  // Lookup State
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<WaitlistSuccessData | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone: phone || undefined,
          childAge: childAge !== '' ? Number(childAge) : undefined,
          userRole,
          notes: notes || undefined,
          consentResearch,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل التسجيل، يرجى التحقق من المدخلات.');
      }

      setSuccessData({
        waitlistId: data.waitlistId,
        fullName,
        childAge: childAge !== '' ? Number(childAge) : null,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupEmail) return;

    setLookupError(null);
    setLookupLoading(true);

    try {
      const res = await fetch(`/api/waitlist?email=${encodeURIComponent(lookupEmail.trim().toLowerCase())}`);
      const data = await res.json();

      if (!res.ok || !data.found) {
        setLookupError(data.error || 'لم نجد هذا البريد مسجلاً في قائمة الانتظار.');
        return;
      }

      const entry = data.entry;
      const targetUrl = `/test/webcam?waitlistId=${entry.id}&age=${entry.childAge || 9}&name=${encodeURIComponent(entry.fullName)}`;
      router.push(targetUrl);
    } catch {
      setLookupError('تعذر التحقق من البريد حالياً. يرجى المحاولة لاحقاً.');
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e3dcc2] text-[#1b2021] py-12 px-5 sm:px-8" dir="rtl">
      <div className="mx-auto max-w-3xl">
        {/* Header / Brand */}
        <div className="flex items-center justify-between pb-8 mb-8 border-b border-[#51513d]/18">
          <Link href="/" className="inline-block">
            <LexoraLogo size="md" />
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm" className="border-[#51513d]/30 text-xs font-bold">
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              العودة للرئيسية
            </Button>
          </Link>
        </div>

        {/* ─── SUCCESS SCREEN STATE ─── */}
        {successData ? (
          <div className="border border-[#51513d]/20 bg-[#f3edd7] p-8 sm:p-12 shadow-[12px_12px_0_rgba(81,81,61,.14)] text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#a6a867] text-[#1b2021] shadow-md">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <span className="inline-block rounded-full border border-[#51513d]/20 bg-[#e3dcc2] px-4 py-1 text-xs font-bold text-[#51513d] mb-3">
              تم حجز مقعدك بنجاح
            </span>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1b2021]">
              مرحباً بك في قائمة انتظار ليكسورا، {successData.fullName}!
            </h1>

            <p className="mt-4 text-base leading-relaxed text-[#1b2021]/78 max-w-xl mx-auto font-medium">
              تم تسجيل بياناتك وحفظ مقعدك في أسبقية الوصول للمنصة. سنرسل لك إشعاراً على بريدك الإلكتروني فور إطلاق أولى النسخ التجريبية.
            </p>

            {/* Test Journey Invitation Card */}
            <div className="mt-10 border-2 border-[#51513d] bg-[#e3dcc2] p-6 sm:p-8 text-right shadow-sm">
              <div className="flex items-center gap-3 border-b border-[#51513d]/18 pb-4 mb-5">
                <div className="p-2.5 bg-[#51513d] text-[#e3dc95]">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#1b2021]">
                    خطوتك التالية: مساعدة البحث عبر اختبار قراءة سريع
                  </h3>
                  <p className="text-xs text-[#51513d] mt-0.5 font-bold">
                    3 دقائق فقط • عبر كاميرا الحاسوب • بدون أي درجات أو ضغط
                  </p>
                </div>
              </div>

              <p className="text-sm leading-7 text-[#1b2021]/80 mb-6 font-medium">
                يمكنك الآن دعوة طفلك لخوض تجربة قراءة ممتعة وسريعة تتضمن قراءة مقاطع صوتية وكلمات وقصة قصيرة. ستُسجل حركات العين لدعم تدريب أول نموذج ذكاء اصطناعي عربي مخصص للأطفال، وستُربط الجلسة تلقائياً برقم تسجيلك:
                <span className="font-mono text-xs font-black text-[#51513d] block mt-1">
                  معرّف المشاركة: {successData.waitlistId}
                </span>
              </p>

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Link
                  href={`/test/webcam?waitlistId=${successData.waitlistId}&age=${successData.childAge || 9}&name=${encodeURIComponent(successData.fullName)}`}
                  className="w-full sm:w-auto flex-1"
                >
                  <Button size="lg" className="w-full h-13 bg-[#51513d] hover:bg-[#1b2021] text-[#e3dcc2] font-black text-base shadow-md">
                    <Camera className="ml-2 h-5 w-5 text-[#e3dc95]" />
                    ابدأ اختبار القراءة مع طفلك الآن (3 دقائق)
                    <ArrowLeft className="mr-2 h-5 w-5" />
                  </Button>
                </Link>

                <Link href="/" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full h-13 border-[#51513d]/30 font-bold text-sm">
                    العودة للصفحة الرئيسية
                  </Button>
                </Link>
              </div>

              <p className="mt-4 text-[11px] text-[#51513d]/70 text-center">
                * يمكنك أيضاً العودة لاحقاً واستكمال الاختبار في أي وقت باستخدام بريدك الإلكتروني.
              </p>
            </div>
          </div>
        ) : (
          /* ─── FORM & LOOKUP TABS ─── */
          <div className="border border-[#51513d]/20 bg-[#f3edd7] shadow-[12px_12px_0_rgba(81,81,61,.14)]">
            {/* Tabs Header */}
            <div className="grid grid-cols-2 border-b border-[#51513d]/20">
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className={`py-4 text-center text-sm font-black transition-colors ${
                  activeTab === 'register'
                    ? 'bg-[#f3edd7] text-[#1b2021] border-b-2 border-[#51513d]'
                    : 'bg-[#e3dcc2]/60 text-[#1b2021]/60 hover:text-[#1b2021]'
                }`}
              >
                انضم إلى قائمة الانتظار
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lookup')}
                className={`py-4 text-center text-sm font-black transition-colors ${
                  activeTab === 'lookup'
                    ? 'bg-[#f3edd7] text-[#1b2021] border-b-2 border-[#51513d]'
                    : 'bg-[#e3dcc2]/60 text-[#1b2021]/60 hover:text-[#1b2021]'
                }`}
              >
                مسجل مسبقاً؟ أجرِ الاختبار الآن
              </button>
            </div>

            <div className="p-8 sm:p-12">
              {activeTab === 'register' ? (
                /* Registration Form */
                <div>
                  <div className="mb-8">
                    <span className="inline-block rounded-full border border-[#51513d]/20 bg-[#e3dcc2] px-3.5 py-1 text-xs font-bold text-[#51513d] mb-2.5">
                      كن أول من يجرب المنصة
                    </span>
                    <h1 className="text-3xl font-black text-[#1b2021] tracking-tight">
                      التسجيل في قائمة الانتظار والمبادرة البحثية
                    </h1>
                    <p className="mt-2 text-sm text-[#1b2021]/75 leading-relaxed font-medium">
                      سجل بياناتك للانضمام إلى قائمة أولياء الأمور والمعلمين المهتمين، وساعدنا اختيارياً في جمع بيانات قراءة طبيعية لتطوير خوارزمياتنا.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="mb-6 border border-red-300 bg-red-50 p-4 text-sm text-red-800 font-medium">
                      {errorMessage}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-xs font-black text-[#1b2021]">
                          الاسم الكامل <span className="text-red-700">*</span>
                        </Label>
                        <Input
                          id="fullName"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="مثال: سارة أحمد"
                          className="bg-[#e3dcc2]/70 border-[#51513d]/25 text-[#1b2021] h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-black text-[#1b2021]">
                          البريد الإلكتروني <span className="text-red-700">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="bg-[#e3dcc2]/70 border-[#51513d]/25 text-[#1b2021] h-11 text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs font-black text-[#1b2021]">
                          رقم الهاتف أو الواتساب (اختياري)
                        </Label>
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+966 / +20..."
                          className="bg-[#e3dcc2]/70 border-[#51513d]/25 text-[#1b2021] h-11 text-left"
                          dir="ltr"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="childAge" className="text-xs font-black text-[#1b2021]">
                          عمر الطفل بالسنوات (اختياري)
                        </Label>
                        <Input
                          id="childAge"
                          type="number"
                          min="4"
                          max="25"
                          value={childAge}
                          onChange={(e) => setChildAge(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="مثال: 9"
                          className="bg-[#e3dcc2]/70 border-[#51513d]/25 text-[#1b2021] h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="userRole" className="text-xs font-black text-[#1b2021]">
                        صفتك أو اهتمامك بالمشروع
                      </Label>
                      <select
                        id="userRole"
                        value={userRole}
                        onChange={(e) => setUserRole(e.target.value)}
                        className="w-full bg-[#e3dcc2]/70 border border-[#51513d]/25 text-[#1b2021] text-sm h-11 px-3 rounded-md"
                      >
                        <option value="parent">ولي أمر (أب / أم)</option>
                        <option value="teacher">معلم / تربوي</option>
                        <option value="specialist">أخصائي تخاطب أو صعوبات تعلم</option>
                        <option value="researcher">باحث أكاديمي / طالب دراسات عليا</option>
                        <option value="other">مهتم آخر</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-xs font-black text-[#1b2021]">
                        أي ملاحظات أو تحديات قرائية تواجه طفلك (اختياري)
                      </Label>
                      <textarea
                        id="notes"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="شاركنا ما تود أن تراه في ليكسورا لمساعدة طفلك..."
                        className="w-full bg-[#e3dcc2]/70 border border-[#51513d]/25 text-[#1b2021] text-sm p-3 rounded-md focus:outline-none focus:ring-1 focus:ring-[#51513d]"
                      />
                    </div>

                    {/* Research Consent */}
                    <div className="flex items-start gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="consent"
                        checked={consentResearch}
                        onChange={(e) => setConsentResearch(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-[#51513d]/30 text-[#51513d] focus:ring-[#51513d]"
                      />
                      <label htmlFor="consent" className="text-xs text-[#1b2021]/80 leading-relaxed cursor-pointer font-medium">
                        أوافق على استخدام بيانات جلسات القراءة للأغراض البحثية وتدريب نماذج الذكاء الاصطناعي مع الحفاظ التام على السرية والخصوصية.
                      </label>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-13 bg-[#51513d] hover:bg-[#1b2021] text-[#e3dcc2] font-black text-base shadow-md cursor-pointer"
                    >
                      {isSubmitting ? (
                        'جاري حفظ البيانات...'
                      ) : (
                        <>
                          <Sparkles className="ml-2 h-5 w-5 text-[#e3dc95]" />
                          انضم الآن إلى قائمة الانتظار
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              ) : (
                /* Return User Lookup */
                <div>
                  <div className="mb-8">
                    <span className="inline-block rounded-full border border-[#51513d]/20 bg-[#e3dcc2] px-3.5 py-1 text-xs font-bold text-[#51513d] mb-2.5">
                      متابعة الجلسة البحثية
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-[#1b2021] tracking-tight">
                      هل سجلت مسبقاً في قائمة الانتظار؟
                    </h2>
                    <p className="mt-2 text-sm text-[#1b2021]/75 leading-relaxed font-medium">
                      أدخل بريدك الإلكتروني المسجل لنسترجع بياناتك ونربط بيانات اختبار القراءة مباشرة بملفك.
                    </p>
                  </div>

                  {lookupError && (
                    <div className="mb-6 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 font-medium">
                      {lookupError}
                    </div>
                  )}

                  <form onSubmit={handleLookup} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="lookupEmail" className="text-xs font-black text-[#1b2021]">
                        البريد الإلكتروني المسجل <span className="text-red-700">*</span>
                      </Label>
                      <Input
                        id="lookupEmail"
                        type="email"
                        required
                        value={lookupEmail}
                        onChange={(e) => setLookupEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="bg-[#e3dcc2]/70 border-[#51513d]/25 text-[#1b2021] h-12 text-left"
                        dir="ltr"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={lookupLoading}
                      className="w-full h-13 bg-[#51513d] hover:bg-[#1b2021] text-[#e3dcc2] font-black text-base shadow-md cursor-pointer"
                    >
                      {lookupLoading ? (
                        'جاري التحقق...'
                      ) : (
                        <>
                          <Search className="ml-2 h-5 w-5 text-[#e3dc95]" />
                          التحقق والبدء في اختبار القراءة السريع
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-8 border-t border-[#51513d]/15 pt-6 text-center">
                    <p className="text-xs text-[#1b2021]/70">
                      لم تسجل بعد؟{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('register')}
                        className="font-bold text-[#51513d] underline hover:text-[#1b2021]"
                      >
                        سجل الآن في قائمة الانتظار
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
