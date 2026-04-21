'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronDown, Menu, X, ShoppingBag, CalendarDays, ClipboardList, UserCircle2, TrendingUp, BrainCircuit, Sparkles, LayoutGrid, BarChart3, FileText, User, Bot, Zap, Shield, Clock, Headphones, Globe, Store, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnimatedGroup } from '@/components/ui/animated-group';
import { LogoCloud } from '@/components/ui/logo-cloud';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import Footer from '@/components/layout/footer';
import { cn } from '@/lib/utils';
import type { Variants } from 'framer-motion';
import { motion, AnimatePresence } from 'framer-motion';

const transitionVariants = {
    item: {
        hidden: {
            opacity: 0,
            filter: 'blur(12px)',
            y: 12,
        },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: {
                type: 'spring' as const,
                bounce: 0.3,
                duration: 1.5,
            },
        },
    },
} satisfies { item: Variants };

const rotatingItems = [
    { text: 'روابطك',    color: '#0090FF' },
    { text: 'منتجاتك',   color: '#FF2B3A' },
    { text: 'فعالياتك',  color: '#f97316' },
    { text: 'نماذجك',    color: '#FFBB26' },
    { text: 'إعلاناتك', color: '#9F4FFF' },
    { text: 'مطوريك',   color: '#10b981' },
    { text: 'أعمالك',   color: '#0090FF' },
];

const ITEM_H = 1.15; // em — must match h1 leading-[1.15]

function RotatingText() {
    const [index, setIndex] = React.useState(0);

    React.useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % rotatingItems.length);
        }, 2400);
        return () => clearInterval(timer);
    }, []);

    return (
        <span
            style={{
                display: 'inline-block',
                overflow: 'hidden',
                height: `${ITEM_H}em`,
                verticalAlign: 'bottom',
            }}
        >
            <motion.span
                style={{ display: 'flex', flexDirection: 'column' }}
                animate={{ y: `-${index * ITEM_H}em` }}
                transition={{ type: 'spring', stiffness: 210, damping: 28 }}
            >
                {rotatingItems.map((item, i) => (
                    <span
                        key={i}
                        style={{
                            display: 'block',
                            height: `${ITEM_H}em`,
                            lineHeight: `${ITEM_H}em`,
                            color: item.color,
                            flexShrink: 0,
                            fontWeight: 900,
                        }}
                    >
                        {item.text}
                    </span>
                ))}
            </motion.span>
        </span>
    );
}

const trustedLogos = [
    { src: "/logos/aws.svg", alt: "AWS", color: "#FF9900" },
    { src: "/logos/google-cloud.svg", alt: "Google Cloud", color: "#4285F4" },
    { src: "/logos/tiktok.svg", alt: "TikTok", color: "#111111" },
    { src: "/logos/soundcloud-wordmark.svg", alt: "SoundCloud", color: "#FF5500" },
    { src: "/logos/tL_v571NdZ0.svg", alt: "Meta", color: "#0866FF" },
    { src: "/logos/facebook-wordmark.svg", alt: "Facebook", color: "#1877F2" },
    { src: "/logos/whatsapp-wordmark.svg", alt: "WhatsApp", color: "#25D366" },
    { src: "/logos/instagram-wordmark.svg", alt: "Instagram", color: "#E4405F" },
    { src: "/logos/udemy.svg", alt: "Udemy", color: "#A435F0" },
    { src: "/logos/google-wordmark.svg", alt: "Google", color: "#4285F4" },
    { src: "/logos/gemini_wordmark.svg", alt: "Gemini", color: "#5F7CFF" },
    { src: "/logos/LI-Logo.png", alt: "linkedin", color: "#0A66C2" },
    { src: "/logos/notion-full.svg", alt: "Notion", color: "#111111" },
    { src: "/logos/microsoft.svg", alt: "Microsoft", color: "#5E5E5E" },
    
];

export function HeroSection() {
    return (
        <>
            <HeroHeader />
            <main className="overflow-hidden bg-white" dir="rtl">
                <section className="relative">
                    {/* Subtle background glow */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className="absolute -top-32 right-1/4 size-[480px] rounded-full bg-primary/[0.06] blur-[90px]" />
                        <div className="absolute top-24 left-1/4 size-[320px] rounded-full bg-primary/[0.04] blur-[70px]" />
                    </div>

                    <div className="relative pt-24 mt-12 sm:pt-28 md:pt-32 lg:pt-36 pb-8 sm:pb-12 md:pb-14">
                        <div className="mx-auto max-w-6xl px-4 sm:px-6">
                            {/* Badge row */}
                            <motion.div
                                className="flex justify-center lg:justify-end mb-6 sm:mb-8"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: 'spring', bounce: 0.3, duration: 1, delay: 0.05 }}
                            >
                                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs sm:text-sm font-medium text-primary/80">
                                    <span className="relative flex size-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
                                        <span className="relative inline-flex size-2 rounded-full bg-primary" />
                                    </span>
                                    نسخة مستقرة · متاح الآن
                                </span>
                            </motion.div>

                            <div className="flex flex-col-reverse lg:flex-row gap-8 lg:gap-12 xl:gap-20 items-center lg:items-start">
                                {/* Right side in RTL - Big Heading */}
                                <motion.div
                                    className="flex-1 text-center lg:text-right"
                                    initial={{ opacity: 0, y: 24 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ type: 'spring', bounce: 0.3, duration: 1.3, delay: 0.2 }}
                                >
                                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[4.25rem] font-black leading-[1.15] tracking-tight">
                                        <div>منصة رقمية</div>
                                        <div className="flex gap-2 sm:gap-3 items-baseline">
                                            <span>متكاملة لـ</span>
                                            <RotatingText />
                                        </div>
                                        <div>على الانترنت</div>
                                    </h1>
                                </motion.div>

                                {/* Left side in RTL - Description & CTA */}
                                <motion.div
                                    className="flex-1 flex flex-col items-center lg:items-start gap-4 sm:gap-5 lg:max-w-sm lg:pt-2"
                                    initial={{ opacity: 0, y: 24 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ type: 'spring', bounce: 0.3, duration: 1.3, delay: 0.35 }}
                                >
                                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-center lg:text-right">
                                        أطلق مشروعك على الانترنت خلال دقائق.
                                        أنشئ متجرك، أضف منتجاتك وروابطك، نظّم فعالياتك،
                                        وتواصل مع عملائك — كل ذلك من لوحة تحكم واحدة.
                                    </p>

                                    {/* Quick feature pills */}
                                    <div className="flex flex-wrap justify-center lg:justify-start gap-2">
                                        {['روابط', 'منتجات', 'نماذج', 'إعلانات', 'مطورين'].map((tag) => (
                                            <span key={tag} className="rounded-full border border-border/50 bg-muted/40 px-3 py-0.5 text-[11px] sm:text-xs font-medium text-foreground/60">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="bg-foreground/10 rounded-4xl border p-0.5">
                                            <Button
                                                asChild
                                                size="default"
                                                className="rounded-4xl px-6 text-sm h-10 sm:h-11 gap-2">
                                                <Link href="/app">
                                                    <span className="text-nowrap">ابدأ مجاناً</span>
                                                </Link>
                                            </Button>
                                        </div>
                                        <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group">
                                            <span>الأسعار</span>
                                            <ArrowRight className="size-3.5 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                                        </Link>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Bottom Stats Bar */}
                        <motion.div
                            className="mx-auto max-w-6xl px-4 sm:px-6 mt-12 sm:mt-14 md:mt-16"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', bounce: 0.3, duration: 1.3, delay: 0.7 }}
                        >
                            <div className="border-t border-border/30 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-muted-foreground">
                                    {['متاجر', 'فعاليات', 'روابط', 'نماذج', 'تحليلات'].map((item, i) => (
                                        <React.Fragment key={item}>
                                            <span>{item}</span>
                                            {i < 4 && <span className="size-1 rounded-full bg-border/60 hidden sm:inline-block" />}
                                        </React.Fragment>
                                    ))}
                                    <span className="text-primary font-semibold">كلها في منصة واحدة</span>
                                </div>
                                <p className="text-muted-foreground flex items-center gap-2 shrink-0">
                                    <span className="size-1.5 rounded-full bg-primary/60" />
                                    انضم لأكثر من <span className="font-bold text-foreground mx-1">1000+</span> صاحب عمل
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Trusted Companies Section - LogoCloud */}
                <section className="relative w-full px-4 py-8 sm:py-10 md:py-14">
                    <div className="mx-auto w-full max-w-6xl">
                        <div className="mb-5 text-center sm:mb-6">
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground/70 uppercase tracking-widest">
                                نعتمد على أحدث التقنيات من الشركات الرائدة
                            </p>
                        </div>

                        <div className="relative overflow-hidden px-2 py-2 sm:px-3 sm:py-3" dir="ltr">
                            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent sm:w-24" />
                            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent sm:w-24" />

                            <LogoCloud className="py-1" logos={trustedLogos} />
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-16 md:py-28">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <div className="text-center mb-10 md:mb-16">
                            <Badge variant="secondary" className="text-xs sm:text-sm mb-4">
                                المنتجات
                            </Badge>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3 md:mb-4">كل ما تحتاجه في مكان واحد</h2>
                            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                                أدوات متكاملة لإدارة أعمالك الرقمية بكفاءة عالية
                            </p>
                        </div>

                        {/* Bento Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {/* Card 1 - المتاجر (Large) */}
                            <div className="sm:col-span-2 lg:col-span-2 group relative rounded-2xl sm:rounded-3xl border border-border/40 bg-muted/20 p-5 sm:p-7 md:p-8 transition-all duration-300 hover:border-primary/30 hover:bg-muted/40 overflow-hidden">
                                <div className="relative z-10">
                                    <div className="mb-4 inline-flex size-11 sm:size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Store className="size-5 sm:size-6" />
                                    </div>
                                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2">المتاجر الإلكترونية</h3>
                                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md">
                                        أنشئ متجرك الإلكتروني وابدأ البيع فوراً. أضف منتجاتك، أدر طلباتك، واستقبل مدفوعاتك في مكان واحد.
                                    </p>
                                </div>
                                <div className="absolute -left-8 -bottom-8 size-32 sm:size-40 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-500" />
                            </div>

                            {/* Card 2 - الفعاليات */}
                            <div className="group relative rounded-2xl sm:rounded-3xl border border-border/40 bg-muted/20 p-5 sm:p-7 md:p-8 transition-all duration-300 hover:border-primary/30 hover:bg-muted/40">
                                <div className="mb-4 inline-flex size-11 sm:size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Calendar className="size-5 sm:size-6" />
                                </div>
                                <h3 className="text-base sm:text-lg font-bold mb-1.5">إدارة الفعاليات</h3>
                                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                                    نظّم فعالياتك واستقبل الحجوزات والتسجيلات بشكل آلي ومتكامل.
                                </p>
                            </div>

                            {/* Card 3 - النماذج */}
                            <div className="group relative rounded-2xl sm:rounded-3xl border border-border/40 bg-muted/20 p-5 sm:p-7 md:p-8 transition-all duration-300 hover:border-primary/30 hover:bg-muted/40">
                                <div className="mb-4 inline-flex size-11 sm:size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <FileText className="size-5 sm:size-6" />
                                </div>
                                <h3 className="text-base sm:text-lg font-bold mb-1.5">النماذج الذكية</h3>
                                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                                    أنشئ نماذج واستبيانات متقدمة لجمع بيانات عملائك بسهولة.
                                </p>
                            </div>

                            {/* Card 4 - الملف الشخصي */}
                            <div className="group relative rounded-2xl sm:rounded-3xl border border-border/40 bg-muted/20 p-5 sm:p-7 md:p-8 transition-all duration-300 hover:border-primary/30 hover:bg-muted/40">
                                <div className="mb-4 inline-flex size-11 sm:size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <User className="size-5 sm:size-6" />
                                </div>
                                <h3 className="text-base sm:text-lg font-bold mb-1.5">الملف الشخصي</h3>
                                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                                    صفحة شخصية احترافية تعرض خدماتك وأعمالك بأفضل شكل.
                                </p>
                            </div>

                            {/* Card 5 - التحليلات و الذكاء الاصطناعي (Large) */}
                            <div className="sm:col-span-2 lg:col-span-2 group relative rounded-2xl sm:rounded-3xl border border-border/40 bg-muted/20 p-5 sm:p-7 md:p-8 transition-all duration-300 hover:border-primary/30 hover:bg-muted/40 overflow-hidden">
                                <div className="relative z-10 flex flex-col sm:flex-row gap-6 sm:gap-10">
                                    <div className="flex-1">
                                        <div className="mb-4 inline-flex size-11 sm:size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <BarChart3 className="size-5 sm:size-6" />
                                        </div>
                                        <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2">تحليلات وذكاء اصطناعي</h3>
                                        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md">
                                            راقب أداء أعمالك بتقارير مفصلة، واستفد من أدوات الذكاء الاصطناعي لاتخاذ قرارات أذكى وأسرع.
                                        </p>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-3">
                                        <div className="flex flex-col gap-2 items-center">
                                            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Bot className="size-5 text-primary" />
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">AI</span>
                                        </div>
                                        <div className="flex flex-col gap-2 items-center">
                                            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Sparkles className="size-5 text-primary" />
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">تحليلات</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -right-8 -bottom-8 size-32 sm:size-40 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-500" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Advantages Section */}
                <section className="bg-muted/10 py-10 sm:py-12 md:py-20 lg:py-28 m-2 md:m-12 rounded-3xl sm:rounded-4xl">
                    <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
                        <div className="flex gap-4 flex-col items-start sm:items-center sm:text-center">
                            <Badge variant="secondary" className="text-xs sm:text-sm">
                                لماذا ركني؟
                            </Badge>
                            <div className="flex gap-2 sm:gap-3 flex-col">
                                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight font-bold">
                                    مميزات تجعلنا الخيار الأول
                                </h2>
                                <p className="text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed text-muted-foreground">
                                    نقدم لك أدوات متكاملة تساعدك على إدارة أعمالك بكفاءة وسهولة، مع دعم فني متواصل.
                                </p>
                            </div>
                            <div className="flex gap-6 sm:gap-8 md:gap-10 pt-8 sm:pt-10 md:pt-12 flex-col w-full">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                                    <AdvantageItem 
                                        icon={<Zap className="size-4 sm:size-5 text-primary" />}
                                        title="سرعة فائقة"
                                        description="أداء سريع وموثوق يضمن تجربة سلسة لك ولعملائك."
                                    />
                                    <AdvantageItem 
                                        icon={<Shield className="size-4 sm:size-5 text-primary" />}
                                        title="أمان متقدم"
                                        description="حماية بياناتك وبيانات عملائك بأعلى معايير الأمان."
                                    />
                                    <AdvantageItem 
                                        icon={<Clock className="size-4 sm:size-5 text-primary" />}
                                        title="توفير الوقت"
                                        description="أتمتة المهام المتكررة لتركز على تنمية أعمالك."
                                    />
                                    <AdvantageItem 
                                        icon={<Headphones className="size-4 sm:size-5 text-primary" />}
                                        title="دعم متواصل"
                                        description="فريق دعم جاهز لمساعدتك على مدار الساعة."
                                    />
                                    <AdvantageItem 
                                        icon={<Globe className="size-4 sm:size-5 text-primary" />}
                                        title="وصول عالمي"
                                        description="اعرض منتجاتك وخدماتك للعملاء في كل مكان."
                                    />
                                    <AdvantageItem 
                                        icon={<BarChart3 className="size-4 sm:size-5 text-primary" />}
                                        title="تحليلات ذكية"
                                        description="تقارير مفصلة تساعدك على اتخاذ قرارات أفضل."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <Footer />
            </main>
        </>
    );
}


function AdvantageItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex flex-row gap-3 sm:gap-4 w-full items-start p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-background/60 border border-border/50 hover:border-primary/30 hover:bg-background transition-all duration-300">
            <div className="size-8 sm:size-9 md:size-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="flex flex-col gap-0.5 sm:gap-1 text-right">
                <p className="font-semibold text-sm sm:text-base">{title}</p>
                <p className="text-muted-foreground text-[11px] sm:text-xs md:text-sm leading-relaxed">
                    {description}
                </p>
            </div>
        </div>
    );
}



const menuItems = [
    { name: 'الأسعار', href: '/pricing' },
    { name: 'المطورين', href: '/developers' },
    { name: 'التحديثات', href: '/updates' },
];

const productItems = [
    { name: 'المتاجر الإلكترونية', href: '/products/stores', icon: ShoppingBag, description: 'أنشئ متجرك وابدأ البيع فوراً', color: '#f97316', bg: '#fff7ed' },
    { name: 'إدارة الفعاليات', href: '/products/events', icon: CalendarDays, description: 'نظّم فعالياتك واستقبل الحجوزات', color: '#8b5cf6', bg: '#f5f3ff' },
    { name: 'النماذج الذكية', href: '/products/forms', icon: ClipboardList, description: 'أنشئ نماذج واستبيانات متقدمة', color: '#0ea5e9', bg: '#f0f9ff' },
    { name: 'الملف الشخصي', href: '/products/profile', icon: UserCircle2, description: 'صفحة شخصية احترافية لعملك', color: '#10b981', bg: '#f0fdf4' },
    { name: 'التحليلات', href: '/products/analytics', icon: TrendingUp, description: 'راقب أداء أعمالك بالتفصيل', color: '#e11d48', bg: '#fff1f2' },
    { name: 'الذكاء الاصطناعي', href: '/products/ai', icon: BrainCircuit, description: 'أدوات ذكية لتطوير أعمالك', color: '#6366f1', bg: '#eef2ff' },
];

const HeroHeader = () => {
    const [menuState, setMenuState] = React.useState(false);
    const [isScrolled, setIsScrolled] = React.useState(false);
    const [productMenuOpen, setProductMenuOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 60);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setProductMenuOpen(false);
            }
        };
        if (productMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [productMenuOpen]);

    // Lock body scroll when mobile menu is open
    React.useEffect(() => {
        document.body.style.overflow = menuState ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [menuState]);

    return (
        <header dir="rtl" className="relative">
            {/* ─── Nav Bar ─── */}
            <nav
                className={cn(
                    'fixed top-0 left-0 w-full z-50 transition-all duration-500 ease-out',
                    isScrolled
                        ? 'bg-white/95 backdrop-blur-md shadow-[0_1px_0_0_rgba(0,0,0,0.06)] py-3'
                        : 'pt-8 pb-4'
                )}
            >
                <div className="mx-auto max-w-7xl px-5 sm:px-6 flex items-center justify-between lg:grid lg:grid-cols-5">
                    {/* Logo */}
                    <Link href="/" aria-label="الصفحة الرئيسية" className="flex items-center gap-2">
                        <RuknyLogo />
                    </Link>

                    {/* Desktop Nav – centre col-span-3 */}
                    <div className="col-span-3 hidden lg:flex items-center justify-center gap-8">
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setProductMenuOpen(!productMenuOpen)}
                                onMouseEnter={() => setProductMenuOpen(true)}
                                className="flex items-center gap-1.5 text-[14px] text-[#132327] transition-all duration-200 ease-out hover:opacity-60"
                            >
                                <span>المنتجات</span>
                                <ChevronDown className={cn('size-3.5 transition-transform duration-300', productMenuOpen && 'rotate-180')} />
                            </button>
                        </div>
                        {menuItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="text-[14px] text-[#132327] transition-all duration-200 ease-out hover:opacity-60"
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden lg:flex items-center mr-auto">
                        <Link href="/app">
                            <div className="relative group flex items-center gap-1 text-[14px] text-[#132327] px-3 py-2">
                                <span>لوحة التحكم</span>
                                <LayoutGrid className="size-4" />
                                <div className="absolute inset-[-5px] rounded-xl opacity-0 group-hover:opacity-100 bg-black/[0.06] scale-95 group-hover:scale-105 transition-all duration-300 ease-in-out -z-10" />
                            </div>
                        </Link>
                    </div>

                    {/* Mobile Hamburger */}
                    <button
                        onClick={() => setMenuState(!menuState)}
                        aria-label={menuState ? 'إغلاق القائمة' : 'فتح القائمة'}
                        className="flex lg:hidden items-center justify-center size-9 rounded-xl hover:bg-black/5 active:bg-black/10 transition-colors"
                    >
                        <AnimatePresence mode="wait">
                            {menuState ? (
                                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                                    <X className="size-5" />
                                </motion.div>
                            ) : (
                                <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                                    <Menu className="size-5" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </button>
                </div>
            </nav>

            {/* ─── Desktop Mega Menu ─── */}
            <AnimatePresence>
                {productMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                            'fixed inset-x-0 z-40 hidden lg:block px-6',
                            isScrolled ? 'top-[3.5rem]' : 'top-[5rem]'
                        )}
                        onMouseEnter={() => setProductMenuOpen(true)}
                        onMouseLeave={() => setProductMenuOpen(false)}
                    >
                        <div className="mx-auto max-w-7xl">
                            <div className="h-2" />
                            <div className="bg-white border border-black/[0.07] shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-4xl overflow-hidden">
                                {/* Label bar */}
                                <div className="px-8 pt-6 pb-4 flex items-center justify-between">
                                    <p className="text-[11px] font-semibold uppercase tracking-widest text-black/30">المنتجات</p>
                                    <Link
                                        href="/products"
                                        className="text-[12px] text-black/40 hover:text-black/70 transition-colors flex items-center gap-1"
                                        onClick={() => setProductMenuOpen(false)}
                                    >
                                        <span>عرض الكل</span>
                                        <ArrowRight className="size-3 rotate-180" />
                                    </Link>
                                </div>

                                <div className="flex">
                                    {/* Products grid */}
                                    <div className="flex-1 px-5 pb-6">
                                        <div className="grid grid-cols-3 gap-1">
                                            {productItems.map((item, index) => (
                                                <motion.div
                                                    key={item.name}
                                                    initial={{ opacity: 0, y: 6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.025 }}
                                                >
                                                    <Link
                                                        href={item.href}
                                                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-black/[0.03] transition-all duration-150 group cursor-pointer"
                                                        onClick={() => setProductMenuOpen(false)}
                                                    >
                                                        <div
                                                            className="size-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150"
                                                            style={{ backgroundColor: item.bg }}
                                                        >
                                                            <item.icon className="size-4 transition-colors duration-150" style={{ color: item.color }} />
                                                        </div>
                                                        <div className="text-right min-w-0">
                                                            <span className="block text-[13px] font-medium text-[#132327] leading-tight">{item.name}</span>
                                                            <span className="block text-[11px] text-black/40 mt-0.5 leading-snug line-clamp-1">{item.description}</span>
                                                        </div>
                                                    </Link>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="w-px bg-black/[0.05] my-5" />

                                    {/* CTA panel */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.1 }}
                                        className="w-64 shrink-0 px-7 py-6 flex flex-col justify-between"
                                    >
                                        <div>
                                            <h3 className="text-[15px] font-bold text-[#132327] mb-2 leading-snug">مشروع خاص<br />أو مؤسسة؟</h3>
                                            <p className="text-[12px] text-black/45 leading-relaxed">
                                                تواصل معنا للحصول على حلول مخصصة تناسب احتياجات عملك تماماً.
                                            </p>
                                        </div>
                                        <Link
                                            href="/contact"
                                            className="mt-5 inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#132327] text-white text-[13px] font-medium py-2.5 hover:bg-[#132327]/85 transition-colors duration-200"
                                            onClick={() => setProductMenuOpen(false)}
                                        >
                                            <span>احجز استشارة</span>
                                            <ArrowRight className="size-3.5 rotate-180" />
                                        </Link>
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Mobile Menu ─── */}
            <AnimatePresence>
                {menuState && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                            onClick={() => setMenuState(false)}
                        />

                        {/* Sheet */}
                        <motion.div
                            initial={{ y: '-100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '-100%' }}
                            transition={{ type: 'spring', damping: 32, stiffness: 260 }}
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.35 }}
                            dragMomentum={false}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 80 || info.velocity.y > 300) setMenuState(false);
                            }}
                            className="fixed top-0 inset-x-0 bg-white rounded-b-[2rem] shadow-2xl z-50 lg:hidden max-h-[92dvh] flex flex-col"
                            style={{ touchAction: 'pan-y' }}
                        >
                            {/* Drag handle */}
                            <div className="flex justify-center pt-3 pb-1 shrink-0">
                                <div className="w-9 h-1 rounded-full bg-black/10" />
                            </div>

                            {/* Top bar */}
                            <div className="flex items-center justify-between px-5 pt-2 pb-4 shrink-0">
                                <RuknyLogo />
                                <button
                                    onClick={() => setMenuState(false)}
                                    className="size-9 rounded-full bg-black/[0.06] hover:bg-black/10 active:scale-95 flex items-center justify-center transition-all"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>

                            {/* Scrollable content */}
                            <div className="overflow-y-auto flex-1 px-4 pb-6 space-y-1">

                                {/* Section label */}
                                <p className="text-[11px] font-semibold text-black/35 uppercase tracking-wider px-2 pb-2 pt-1">
                                    المنتجات
                                </p>

                                {/* Product list – single column for readability */}
                                {productItems.map((item, index) => (
                                    <motion.div
                                        key={item.name}
                                        initial={{ opacity: 0, x: 12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 28 }}
                                    >
                                        <Link
                                            href={item.href}
                                            className="flex items-center gap-3.5 px-3 py-3 rounded-2xl hover:bg-black/[0.04] active:bg-black/[0.07] active:scale-[0.99] transition-all"
                                            onClick={() => setMenuState(false)}
                                        >
                                            <div
                                                className="size-10 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ backgroundColor: item.bg }}
                                            >
                                                <item.icon className="size-5" style={{ color: item.color }} />
                                            </div>
                                            <div className="flex-1 min-w-0 text-right">
                                                <p className="text-[14px] font-semibold text-[#132327] leading-tight">{item.name}</p>
                                                <p className="text-[12px] text-black/40 mt-0.5 leading-snug line-clamp-1">{item.description}</p>
                                            </div>
                                            <ChevronDown className="size-3.5 text-black/20 -rotate-90 shrink-0" />
                                        </Link>
                                    </motion.div>
                                ))}

                                {/* Divider */}
                                <div className="h-px bg-black/[0.06] mx-2 my-3" />

                                {/* Nav links row */}
                                <div className="grid grid-cols-3 gap-2 pt-1">
                                    {menuItems.map((item, index) => (
                                        <motion.div
                                            key={item.name}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 + 0.28 }}
                                        >
                                            <Link
                                                href={item.href}
                                                className="flex items-center justify-center py-3 rounded-2xl bg-black/[0.04] hover:bg-black/[0.07] text-[13px] font-medium text-[#132327] transition-all active:scale-95"
                                                onClick={() => setMenuState(false)}
                                            >
                                                {item.name}
                                            </Link>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-black/[0.06] mx-2 my-3" />

                                {/* CTA Buttons */}
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.42 }}
                                    className="grid grid-cols-2 gap-3 pt-1"
                                >
                                    <Button asChild variant="outline" className="rounded-2xl h-12 text-[13px] font-medium">
                                        <Link href="/auth/login" onClick={() => setMenuState(false)}>
                                            تسجيل الدخول
                                        </Link>
                                    </Button>
                                    <Button asChild className="rounded-2xl h-12 text-[13px] font-medium gap-2">
                                        <Link href="/app" onClick={() => setMenuState(false)}>
                                            <LayoutGrid className="size-4" />
                                            لوحة التحكم
                                        </Link>
                                    </Button>
                                </motion.div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </header>
    );
};

const RuknyLogo = ({ className }: { className?: string }) => {
    return (
        <div className={cn('flex items-center gap-2', className)}>
            <svg className="size-7" viewBox="0 0 1080 1080" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <rect x="352.46" y="211.99" width="411.5" height="239.89"/>
                <rect x="25" y="539.45" width="415.04" height="239.89" transform="translate(891.92 426.88) rotate(90)"/>
                <path d="m967.42,665.78v175.97c0,13.89-11.26,25.15-25.15,25.15h-190.54c-6.67,0-13.07-2.65-17.78-7.37l-141.2-141.2c-15.84-15.84-4.62-42.93,17.78-42.93h128.24c13.89,0,25.15-11.26,25.15-25.15v-137.68c0-22.41,27.09-33.63,42.93-17.78l153.21,153.21c4.72,4.72,7.37,11.11,7.37,17.78Z"/>
            </svg>
        </div>
    );
};

export default HeroSection;
