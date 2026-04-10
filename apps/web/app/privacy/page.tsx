import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Database, Eye, Share2, Trash2, Lock, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية | Rukny.io',
  description: 'سياسة الخصوصية لمنصة ركني',
};

const sections = [
  {
    id: 'intro',
    title: 'المقدمة',
    icon: Shield,
    content: `مرحباً بك في منصة ركني (Rukny.io). نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.
توضح هذه السياسة كيف نجمع بياناتك ونستخدمها ونحميها عند استخدام خدماتنا.`,
  },
  {
    id: 'data-collection',
    title: 'البيانات التي نجمعها',
    icon: Database,
    content: `**معلومات الحساب:**
• الاسم، البريد الإلكتروني، صورة الملف الشخصي

**بيانات الملف الشخصي:**
• الروابط الاجتماعية، الوصف، المحتوى المضاف

**بيانات الاستخدام:**
• سجلات الزيارات والتفاعل مع المنصة

**بيانات التكامل:**
• عند ربط حسابات خارجية مثل Instagram، نحصل على بيانات الملف العام فقط`,
  },
  {
    id: 'data-usage',
    title: 'كيف نستخدم بياناتك',
    icon: Eye,
    content: `**نستخدم بياناتك من أجل:**
• تقديم وتحسين خدماتنا
• عرض محتواك على صفحتك الشخصية
• إرسال إشعارات مهمة متعلقة بحسابك
• تحليل الاستخدام لتحسين تجربة المستخدم`,
  },
  {
    id: 'data-sharing',
    title: 'مشاركة البيانات',
    icon: Share2,
    content: `لا نبيع أو نشارك بياناتك الشخصية مع أطراف ثالثة إلا في الحالات التالية:

**الحالات المسموحة:**
• بموافقتك الصريحة
• للامتثال للقانون
• لحماية حقوقنا وسلامة مستخدمينا`,
  },
  {
    id: 'data-deletion',
    title: 'حذف البيانات',
    icon: Trash2,
    content: `**حقك في حذف بياناتك:**
• يمكنك طلب حذف بياناتك في أي وقت عبر إعدادات الحساب أو بالتواصل معنا
• سنقوم بحذف جميع بياناتك الشخصية خلال 30 يوماً من الطلب

**عند إلغاء ربط حسابات خارجية:**
• عند إلغاء ربط حساب Instagram، نحذف جميع البيانات المرتبطة فوراً
• يمكنك إلغاء الربط من إعدادات حسابك في أي وقت`,
  },
  {
    id: 'security',
    title: 'أمان البيانات',
    icon: Lock,
    content: `**نحمي بياناتك باستخدام:**
• التشفير أثناء النقل والتخزين (TLS/HTTPS)
• آليات دخول أكثر أماناً (مثل الرابط السحري عند توفره)
• إدارة جلسات المستخدم وإمكانية إنهاء الجلسات النشطة
• نسخ احتياطية مشفرة ومراقبة أمنية مستمرة`,
  },
  {
    id: 'contact',
    title: 'التواصل معنا',
    icon: Mail,
    content: `لأي استفسارات حول سياسة الخصوصية:

**البريد الإلكتروني:**
support@rukny.io`,
  },
];

export default function PrivacyPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-32 pb-12 sm:pb-20">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-primary/[0.02] to-background" />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Shield className="size-4" />
            خصوصيتك تهمنا
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            سياسة الخصوصية
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            نحن نلتزم بحماية بياناتك الشخصية. تعرّف على كيفية جمع واستخدام وحماية معلوماتك.
          </p>
          <p className="text-sm text-muted-foreground/60 mt-4">
            آخر تحديث: مارس 2026
          </p>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="py-6 sm:py-8 mx-4 sm:mx-6 md:mx-auto md:max-w-4xl bg-muted/30 rounded-2xl sm:rounded-3xl border border-border/30">
        <div className="px-4 sm:px-6">
          <h2 className="text-base font-semibold mb-4">محتويات الصفحة</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-background border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-xs sm:text-sm"
              >
                <section.icon className="size-4 text-primary shrink-0" />
                <span className="line-clamp-1">{section.title}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="space-y-10 sm:space-y-12">
            {sections.map((section, index) => (
              <div key={section.id} id={section.id} className="scroll-mt-24">
                <div className="flex items-start gap-3 sm:gap-4 mb-4">
                  <div className="size-10 sm:size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <section.icon className="size-5 sm:size-6 text-primary" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm text-muted-foreground/60">القسم {index + 1}</span>
                    <h2 className="text-xl sm:text-2xl font-bold">{section.title}</h2>
                  </div>
                </div>
                <div className="pr-[52px] sm:pr-16">
                  <div className="space-y-3">
                    {section.content.split('\n\n').map((paragraph, pIndex) => (
                      <div key={pIndex}>
                        {paragraph.startsWith('**') ? (
                          <div>
                            {paragraph.split('\n').map((line, lIndex) => {
                              if (line.startsWith('**') && line.endsWith('**')) {
                                return (
                                  <h3 key={lIndex} className="text-sm sm:text-base font-semibold mt-3 mb-1.5">
                                    {line.replace(/\*\*/g, '')}
                                  </h3>
                                );
                              }
                              if (line.startsWith('•')) {
                                return (
                                  <p key={lIndex} className="text-muted-foreground text-sm mr-3 leading-relaxed">
                                    {line}
                                  </p>
                                );
                              }
                              return (
                                <p key={lIndex} className="text-muted-foreground text-sm">
                                  {line.replace(/\*\*/g, '')}
                                </p>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                            {paragraph}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {index < sections.length - 1 && <div className="mt-8 border-b border-border/30" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} ركني. جميع الحقوق محفوظة.</p>
            <div className="flex gap-6">
              <Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">شروط الاستخدام</Link>
              <Link href="/security" className="hover:text-primary transition-colors">الأمان</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
