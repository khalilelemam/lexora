'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Sparkles, Camera, Heart, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function WaitlistForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    childAge: '',
    userRole: 'parent',
    notes: '',
    consentResearch: true,
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [createdWaitlistId, setCreatedWaitlistId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          childAge: formData.childAge ? parseInt(formData.childAge, 10) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'حدث خطأ أثناء التسجيل');
      }

      setCreatedWaitlistId(data.waitlistId);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'حدث خطأ، يرجى المحاولة لاحقاً');
    }
  };

  if (status === 'success') {
    return (
      <div
        className="border border-[#51513d]/20 bg-[#f3edd7] p-8 shadow-[12px_12px_0_rgba(81,81,61,.14)] text-right"
        style={{ animation: 'float-up 0.4s ease-out' }}
        dir="rtl"
      >
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-green-700 text-white shadow-md">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <h3 className="text-2xl sm:text-3xl font-black text-[#1b2021]">
          تم تسجيلك بنجاح في قائمة الانتظار! 🎉
        </h3>

        <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#1b2021]/80">
          شكراً لاهتمامك وثقتك. سنرسل لك إشعاراً فورياً على بريدك الإلكتروني عند فتح التجربة الكاملة للمنصة.
        </p>

        {/* Optional Data Collection Test Prompt */}
        <div className="mt-7 border-2 border-[#51513d] bg-[#e3dcc2]/70 p-6 shadow-[6px_6px_0_rgba(81,81,61,.12)]">
          <div className="flex items-center gap-2 text-xs font-black tracking-widest text-[#51513d] uppercase mb-2">
            <Heart className="h-4 w-4 text-red-600 fill-red-600" />
            مبادرة بحثية: ساهم معنا اليوم
          </div>

          <h4 className="text-lg sm:text-xl font-black text-[#1b2021]">
            هل تود مساعدة أطفالنا وإجراء اختبار سريع مع طفلك؟
          </h4>

          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#1b2021]/75">
            يمكن لطفلك الآن إجراء جلسة قراءة سريعة مدتها <strong>3 دقائق</strong> أمام كاميرا الحاسوب. نسجل خلالها مسار حركة العين للمقاطع الصوتية والنصوص لمساعدتنا في تدريب أول نموذج ذكاء اصطناعي عربي متخصص.
          </p>

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <Link
              href={`/test/webcam?waitlistId=${createdWaitlistId}&age=${formData.childAge || ''}`}
              className="flex-1"
            >
              <Button
                size="lg"
                className="w-full h-12 bg-[#51513d] text-sm font-bold text-[#e3dcc2] shadow-[4px_4px_0_rgba(81,81,61,.18)] hover:bg-[#1b2021]"
              >
                <Camera className="ml-2 h-4 w-4" />
                ابدأ اختبار القراءة مع طفلك الآن (3 دقائق)
              </Button>
            </Link>

            <Button
              variant="outline"
              size="lg"
              onClick={() => setStatus('idle')}
              className="border-[#51513d]/30 text-xs font-bold text-[#51513d]"
            >
              لاحقاً، شكراً
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      id="waitlist-form"
      onSubmit={handleSubmit}
      className="border border-[#51513d]/20 bg-[#f3edd7] p-6 sm:p-9 shadow-[12px_12px_0_rgba(81,81,61,.14)] text-right"
      dir="rtl"
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-[#8b6f25]" />
        <span className="text-xs font-black tracking-wider text-[#51513d] uppercase">
          أولوية الوصول المبكر
        </span>
      </div>

      <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1b2021]">
        انضم لقائمة الانتظار في ليكسورا
      </h3>
      <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#1b2021]/70">
        سجّل بياناتك لتكون أول من يجرب المنصة مع توفير جلسات تقييم استكشافية مجانية لطفلك فور الإطلاق.
      </p>

      {status === 'error' && (
        <div className="mt-4 flex items-center gap-2 border border-red-300 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#1b2021] mb-1.5">
            الاسم الكامل <span className="text-red-600">*</span>
          </label>
          <Input
            required
            type="text"
            placeholder="مثال: د. محمد أحمد / سارة محمود"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="border-[#51513d]/20 bg-[#e3dcc2] text-right h-11"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#1b2021] mb-1.5">
              البريد الإلكتروني <span className="text-red-600">*</span>
            </label>
            <Input
              required
              type="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="border-[#51513d]/20 bg-[#e3dcc2] text-right h-11"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1b2021] mb-1.5">
              رقم الهاتف / واتساب (اختياري)
            </label>
            <Input
              type="tel"
              placeholder="+20 100 000 0000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="border-[#51513d]/20 bg-[#e3dcc2] text-right h-11"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#1b2021] mb-1.5">
              عمر الطفل (إن وجد)
            </label>
            <Input
              type="number"
              min="4"
              max="25"
              placeholder="مثال: 9"
              value={formData.childAge}
              onChange={(e) => setFormData({ ...formData, childAge: e.target.value })}
              className="border-[#51513d]/20 bg-[#e3dcc2] text-right h-11"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1b2021] mb-1.5">
              صفتك أو اهتمامك
            </label>
            <select
              value={formData.userRole}
              onChange={(e) => setFormData({ ...formData, userRole: e.target.value })}
              className="w-full h-11 border border-[#51513d]/20 bg-[#e3dcc2] px-3 text-xs font-medium text-[#1b2021] rounded-md focus:outline-none focus:ring-1 focus:ring-[#51513d]"
            >
              <option value="parent">ولي أمر (Parent)</option>
              <option value="specialist">أخصائي تخاطب وصعوبات تعلم (Specialist)</option>
              <option value="educator">معلم / تربوي (Educator)</option>
              <option value="researcher">باحث أكاديمي (Researcher)</option>
              <option value="other">مهتم بالتقنية والذكاء الاصطناعي (Other)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1b2021] mb-1.5">
            ملاحظات أو صعوبات قراءة يواجهها الطفل (اختياري)
          </label>
          <textarea
            rows={3}
            placeholder="مثال: بطء في القراءة، خلط في ترتيب الحروف، تشتت الانتباه أثناء القراءة..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full border border-[#51513d]/20 bg-[#e3dcc2] p-3 text-xs text-[#1b2021] rounded-md focus:outline-none focus:ring-1 focus:ring-[#51513d] resize-none"
          />
        </div>

        <div className="flex items-start gap-2.5 pt-1">
          <input
            id="consent"
            type="checkbox"
            checked={formData.consentResearch}
            onChange={(e) => setFormData({ ...formData, consentResearch: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-[#51513d]/30 text-[#51513d] focus:ring-[#51513d]"
          />
          <label htmlFor="consent" className="text-xs text-[#1b2021]/75 leading-relaxed cursor-pointer">
            أوافق على استلام التحديثات والمشاركة في أبحاث ليكسورا لدعم وتطوير القراءة للأطفال باللغة العربية.
          </label>
        </div>
      </div>

      <Button
        type="submit"
        disabled={status === 'loading'}
        className="mt-6 w-full h-13 bg-[#51513d] text-sm sm:text-base font-bold text-[#e3dcc2] shadow-[5px_5px_0_rgba(81,81,61,.18)] transition-all hover:bg-[#1b2021] hover:-translate-y-0.5"
      >
        {status === 'loading' ? 'جاري التسجيل...' : 'انضم إلى قائمة الانتظار الآن ✨'}
      </Button>

      <p className="mt-3 text-center text-[11px] text-[#1b2021]/55">
        🔒 نحافظ على خصوصية بياناتك بالكامل ولن نشاركها مع أي جهة خارجية.
      </p>
    </form>
  );
}
