"use client";

import Link from "next/link";
import {
  Github,
  Twitter,
  Linkedin,
  Mail,
  Youtube,
  Facebook,
  Instagram,
  Store,
  Calendar,
  FileText,
  User,
  BarChart3,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const footerConfig = {
  description:
    "ركني هي منصة عربية متكاملة تمكّنك من إنشاء صفحتك الاحترافية، إدارة متجرك الإلكتروني، وأنشاء نماذج ذكية بكل سهوله. نوفر لك كل الأدوات التي تحتاجها للتواصل مع جمهورك وتنمية أعمالك.",
  contact: {
    email: "support@rukny.io",
    phone: "+964 773 714 2672",
  },
  socials: [
    { icon: Facebook, href: "#", label: "فيسبوك" },
    { icon: Instagram, href: "#", label: "انستغرام" },
    { icon: Twitter, href: "#", label: "تويتر" },
    { icon: Youtube, href: "#", label: "يوتيوب" },
    { icon: Linkedin, href: "#", label: "لينكدإن" },
  ],
  products: [
    { label: "المتاجر الإلكترونية", href: "/products/stores", icon: Store },
    { label: "إدارة الفعاليات", href: "/products/events", icon: Calendar },
    { label: "النماذج الذكية", href: "/products/forms", icon: FileText },
    { label: "الملف الشخصي", href: "/products/profile", icon: User },
    { label: "التحليلات", href: "/products/analytics", icon: BarChart3 },
    { label: "الذكاء الاصطناعي", href: "/products/ai", icon: Bot },
  ],
  columns: [
    {
      title: "الشركة",
      links: [
        { label: "من نحن", href: "/about" },
        { label: "الوظائف", href: "/careers" },
        { label: "المدونة", href: "/blog" },
        { label: "فريقنا", href: "/team" },
        { label: "تواصل معنا", href: "/contact" },
      ],
    },
    {
      title: "المنصة",
      links: [
        { label: "المميزات", href: "/features" },
        { label: "الأسعار", href: "/pricing" },
        { label: "التوثيق", href: "/docs" },
        { label: "واجهة API", href: "/api-docs" },
        { label: "التحديثات", href: "/updates" },
      ],
    },
    {
      title: "الموارد",
      links: [
        { label: "مركز المساعدة", href: "/help" },
        { label: "الأدلة والإرشادات", href: "/guides" },
        { label: "حالة النظام", href: "/status" },
        { label: "الأسئلة الشائعة", href: "/faq" },
      ],
    },
    {
      title: "القانونية",
      links: [
        { label: "سياسة الخصوصية", href: "/privacy" },
        { label: "شروط الاستخدام", href: "/terms" },
        { label: "الأمان و الأسترداد", href: "/security" },      ],
    },
  ],
};

const RuknyLogo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg className="size-7" viewBox="0 0 1080 1080" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <rect x="352.46" y="211.99" width="411.5" height="239.89"/>
        <rect x="25" y="539.45" width="415.04" height="239.89" transform="translate(891.92 426.88) rotate(90)"/>
        <path d="m967.42,665.78v175.97c0,13.89-11.26,25.15-25.15,25.15h-190.54c-6.67,0-13.07-2.65-17.78-7.37l-141.2-141.2c-15.84-15.84-4.62-42.93,17.78-42.93h128.24c13.89,0,25.15-11.26,25.15-25.15v-137.68c0-22.41,27.09-33.63,42.93-17.78l153.21,153.21c4.72,4.72,7.37,11.11,7.37,17.78Z"/>
      </svg>
      <span
        className="text-2xl font-bold"
        style={{ fontFamily: "var(--font-courgette), cursive" }}
      >
        Rukny
      </span>
    </div>
  );
};

export default function Footer() {
  return (
    <footer
      dir="rtl"
      className="bg-white dark:bg-black text-black dark:text-white px-4 sm:px-6 py-12 sm:py-16 border-t border-gray-200 dark:border-gray-800"
    >
      <div className="max-w-7xl mx-auto">
        {/* Top Section: Logo and Description */}
        <div className="mb-10 sm:mb-12">
          <div className="mb-6">
            <RuknyLogo />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
            {footerConfig.description}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-10 lg:gap-8">
          {/* Right Side (RTL): Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 flex-1">
            {footerConfig.columns.map((col, idx) => (
              <div key={idx}>
                <h3 className="text-sm font-semibold mb-4">{col.title}</h3>
                <ul className="space-y-3">
                  {col.links.map((link, i) => (
                    <li key={i}>
                      <Link
                        href={link.href}
                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Social Links */}
        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">تابعنا على:</span>
              <div className="flex gap-3">
                {footerConfig.socials.map(({ icon: Icon, href, label }, idx) => (
                  <Link
                    key={idx}
                    href={href}
                    aria-label={label}
                    className="size-9 rounded-full bg-muted/50 flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary/10 transition-all"
                  >
                    <Icon className="size-4" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Contact Info */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a
                href={`mailto:${footerConfig.contact.email}`}
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Mail className="size-4" />
                {footerConfig.contact.email}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 dark:text-gray-400 gap-4">
          <p>© {new Date().getFullYear()} ركني. جميع الحقوق محفوظة.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              الخصوصية
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              الشروط
            </Link>
            <Link href="/sitemap" className="hover:text-primary transition-colors">
              خريطة الموقع
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export { Footer };
