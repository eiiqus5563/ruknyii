'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronDown, Menu, X, Store, Calendar, Users, Sparkles, LayoutGrid, BarChart3, FileText, User, Bot, Zap, Shield, Clock, Headphones, Globe } from 'lucide-react';
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
                <section>
                    <div className="relative pt-24 mt-12 sm:pt-28 md:pt-32 lg:pt-36 pb-8 sm:pb-12 md:pb-14">
                        <div className="mx-auto max-w-6xl px-4 sm:px-6">
                            <div className="flex flex-col-reverse lg:flex-row gap-8 lg:gap-12 xl:gap-20 items-center lg:items-start">
                                {/* Right side in RTL - Big Heading */}
                                <motion.div
                                    className="flex-1 text-center lg:text-right"
                                    initial={{ opacity: 0, y: 24 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ type: 'spring', bounce: 0.3, duration: 1.3, delay: 0.2 }}
                                >
                                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[4.25rem] font-black leading-[1.1] tracking-tight">
                                        منصة رقمية
                                        <br />
                                        متكاملة{' '}
                                        <span className="text-primary">لأعمالك</span>
                                        <br />
                                        <span className="text-primary">على الانترنت</span>
                                    </h1>
                                </motion.div>

                                {/* Left side in RTL - Description & CTA */}
                                <motion.div
                                    className="flex-1 flex flex-col items-center lg:items-start gap-4 sm:gap-5 lg:max-w-sm lg:pt-2"
                                    initial={{ opacity: 0, y: 24 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ type: 'spring', bounce: 0.3, duration: 1.3, delay: 0.35 }}
                                >
                                    <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-3.5 py-1 text-xs sm:text-sm font-medium text-foreground/80">
                                        نسخة مستقرة
                                    </span>
                                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-center lg:text-right">
                                        أطلق مشروعك على الانترنت خلال دقائق.
                                        أنشئ متجرك، نظّم فعالياتك، وتواصل مع عملائك.
                                        أدر مدفوعاتك، زبائنك، ومنتجاتك في مكان واحد.
                                    </p>
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
                                <p className="text-muted-foreground">
                                    متاجر، فعاليات، ملفك الشخصي نماذج وتحليلات{' '}
                                    <span className="text-primary font-semibold">كلها في منصة واحدة</span>
                                </p>
                                <p className="text-muted-foreground flex items-center gap-2">
                                    <span className="size-1.5 rounded-full bg-primary/60" />
                                    انضم لأكثر من <span className="font-bold text-foreground mx-1">1000+</span> صاحب عمل يدير مشروعه عبر ركني
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
    { name: 'المتاجر الإلكترونية', href: '/products/stores', icon: Store, description: 'أنشئ متجرك وابدأ البيع فوراً' },
    { name: 'إدارة الفعاليات', href: '/products/events', icon: Calendar, description: 'نظّم فعالياتك واستقبل الحجوزات' },
    { name: 'النماذج الذكية', href: '/products/forms', icon: FileText, description: 'أنشئ نماذج واستبيانات متقدمة' },
    { name: 'الملف الشخصي', href: '/products/profile', icon: User, description: 'صفحة شخصية احترافية لعملك' },
    { name: 'التحليلات', href: '/products/analytics', icon: BarChart3, description: 'راقب أداء أعمالك بالتفصيل بشكل متقدم' },
    { name: 'الذكاء الاصطناعي', href: '/products/ai', icon: Bot, description: 'أدوات ذكية لتطوير أعمالك' },
];

const HeroHeader = () => {
    const [menuState, setMenuState] = React.useState(false);
    const [isScrolled, setIsScrolled] = React.useState(false);
    const [productMenuOpen, setProductMenuOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close product menu when clicking outside
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

    return (
        <header dir="rtl" className="relative">
            <nav className="fixed z-50 w-full px-3 sm:px-4 pt-3 sm:pt-4">
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ 
                        y: 0, 
                        opacity: 1,
                    }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                        'mx-auto transition-all duration-500 ease-out border',
                        isScrolled 
                            ? 'max-w-4xl bg-white/80 backdrop-blur-xl shadow-lg shadow-black/5 border-border/30 rounded-2xl' 
                            : 'max-w-7xl bg-white/60 backdrop-blur-md border-border/20 rounded-4xl'
                    )}
                >
                    <div className={cn(
                        'mx-auto transition-all duration-500 ease-out',
                        isScrolled ? 'px-3 sm:px-4' : 'px-4 sm:px-6'
                    )}>
                        <div className={cn(
                            'flex items-center justify-between transition-all duration-500',
                            isScrolled ? 'h-12 sm:h-12' : 'h-14 sm:h-16'
                        )}>
                            {/* Logo */}
                            <Link
                                href="/"
                                aria-label="الصفحة الرئيسية"
                                className="flex items-center gap-2 shrink-0">
                                <RuknyLogo />
                            </Link>

                            {/* Desktop Navigation - Center */}
                            <div className="hidden lg:flex items-center gap-1">
                                {/* Products Dropdown */}
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setProductMenuOpen(!productMenuOpen)}
                                        onMouseEnter={() => setProductMenuOpen(true)}
                                        className={cn(
                                            'flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors duration-200',
                                            'text-foreground/80 hover:text-foreground',
                                            productMenuOpen && 'text-foreground'
                                        )}
                                    >
                                        <span>المنتجات</span>
                                        <ChevronDown className={cn(
                                            'size-4 transition-transform duration-300',
                                            productMenuOpen && 'rotate-180'
                                        )} />
                                    </button>
                                </div>

                                {/* Other Menu Items */}
                                {menuItems.map((item) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors duration-200"
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                            </div>

                            {/* Desktop CTA Buttons */}
                            <div className="hidden lg:flex items-center gap-4 shrink-0">
                                <Button
                                    asChild
                                    size="sm"
                                    className="rounded-lg px-5 h-9"
                                >
                                    <Link href="/app">
                                        <LayoutGrid className="size-4 ml-2" />
                                        لوحة التحكم
                                    </Link>
                                </Button>
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState ? 'إغلاق القائمة' : 'فتح القائمة'}
                                className="flex lg:hidden items-center justify-center size-9 sm:size-10 rounded-lg hover:bg-muted/80 active:bg-muted transition-colors"
                            >
                                <AnimatePresence mode="wait">
                                    {menuState ? (
                                        <motion.div
                                            key="close"
                                            initial={{ rotate: -90, opacity: 0 }}
                                            animate={{ rotate: 0, opacity: 1 }}
                                            exit={{ rotate: 90, opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <X className="size-5" />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="menu"
                                            initial={{ rotate: 90, opacity: 0 }}
                                            animate={{ rotate: 0, opacity: 1 }}
                                            exit={{ rotate: -90, opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <Menu className="size-5" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Mega Menu Dropdown - Full Width like wayl.io */}
                <AnimatePresence>
                    {productMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className={cn(
                                "fixed inset-x-0 z-40 hidden lg:block px-4",
                                isScrolled ? "top-[4.5rem]" : "top-[5.25rem]"
                            )}
                            onMouseEnter={() => setProductMenuOpen(true)}
                            onMouseLeave={() => setProductMenuOpen(false)}
                        >
                            <div className={cn(
                                "mx-auto bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl shadow-black/5 transition-all duration-300",
                                isScrolled ? "max-w-4xl rounded-2xl" : "max-w-7xl rounded-xl"
                            )}>
                                <div className="px-6 py-8">
                                    <div className="grid grid-cols-12 gap-8">
                                        {/* Products Grid - 3 columns for 6 items */}
                                        <div className="col-span-9">
                                            <div className="grid grid-cols-3 gap-3">
                                                {productItems.map((item, index) => (
                                                    <motion.div
                                                        key={item.name}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: index * 0.03 }}
                                                    >
                                                        <Link
                                                            href={item.href}
                                                            className="flex items-start gap-3 p-4 rounded-xl hover:bg-muted/50 transition-colors group"
                                                            onClick={() => setProductMenuOpen(false)}
                                                        >
                                                            <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                                                                <item.icon className="size-5 text-primary" />
                                                            </div>
                                                            <div className="text-right min-w-0">
                                                                <span className="block text-sm font-semibold text-foreground mb-0.5">{item.name}</span>
                                                                <span className="block text-xs text-muted-foreground leading-relaxed">{item.description}</span>
                                                            </div>
                                                        </Link>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* CTA Card */}
                                        <div className="col-span-3">
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.15 }}
                                                className="bg-muted/50 rounded-2xl p-6 h-full flex flex-col justify-between"
                                            >
                                                <div>
                                                    <h3 className="text-xl font-bold mb-2">مشروع خاص<br />أو مؤسسة؟</h3>
                                                    <p className="text-muted-foreground text-sm">
                                                        تواصل معنا للحصول على حلول مخصصة لاحتياجات عملك
                                                    </p>
                                                </div>
                                                <Link
                                                    href="/contact"
                                                    className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors mt-4 group"
                                                    onClick={() => setProductMenuOpen(false)}
                                                >
                                                    <ArrowRight className="size-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                                                    <span>احجز استشارة الآن</span>
                                                </Link>
                                            </motion.div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mobile Menu - Top Sheet */}
                <AnimatePresence>
                    {menuState && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                                onClick={() => setMenuState(false)}
                            />
                            
                            {/* Top Sheet */}
                            <motion.div
                                initial={{ y: '-100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '-100%' }}
                                transition={{ type: 'spring', damping: 30, stiffness: 250 }}
                                drag="y"
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0, bottom: 0.4 }}
                                dragMomentum={true}
                                dragTransition={{ bounceStiffness: 200, bounceDamping: 30 }}
                                onDragEnd={(_, info) => {
                                    // Close if dragged down more than 100px or with fast velocity
                                    if (info.offset.y > 100 || info.velocity.y > 200) {
                                        setMenuState(false);
                                    }
                                }}
                                whileDrag={{ cursor: 'grabbing' }}
                                className="fixed top-0 left-0 right-0 bg-white rounded-b-3xl shadow-2xl z-50 lg:hidden max-h-[90vh] overflow-hidden touch-pan-y"
                                style={{ touchAction: 'pan-y' }}
                            >
                                <div className="overflow-y-auto max-h-[90vh] px-5 pt-5 pb-4">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-6">
                                        <RuknyLogo />
                                        <button
                                            onClick={() => setMenuState(false)}
                                            className="size-9 rounded-full bg-muted hover:bg-muted/80 active:scale-95 flex items-center justify-center transition-all"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </div>

                                    {/* Products Section - Cards with Text */}
                                    <div className="mb-5">
                                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">المنتجات</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {productItems.map((item, index) => (
                                                <motion.div
                                                    key={item.name}
                                                    initial={{ opacity: 0, y: -20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 + 0.1 }}
                                                >
                                                    <Link
                                                        href={item.href}
                                                        className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 hover:bg-muted active:scale-[0.98] transition-all border border-border/50"
                                                        onClick={() => setMenuState(false)}
                                                    >
                                                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                                            <item.icon className="size-5 text-primary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0 text-right">
                                                            <span className="block text-sm font-semibold leading-tight">{item.name}</span>
                                                            <span className="block text-[11px] text-muted-foreground mt-0.5 leading-tight line-clamp-1">{item.description}</span>
                                                        </div>
                                                    </Link>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Quick Links */}
                                    <div className="flex gap-2 mb-5">
                                        {menuItems.map((item, index) => (
                                            <motion.div
                                                key={item.name}
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 + 0.4 }}
                                                className="flex-1"
                                            >
                                                <Link
                                                    href={item.href}
                                                    className="flex items-center justify-center p-3 rounded-xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all"
                                                    onClick={() => setMenuState(false)}
                                                >
                                                    <span className="text-sm font-medium">{item.name}</span>
                                                </Link>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Consultation CTA Card */}
                                    <motion.div
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-5 mb-5 border border-primary/10"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="size-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                                                <Sparkles className="size-5 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-base mb-1">مشروع خاص أو مؤسسة؟</h4>
                                                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                                                    تواصل معنا للحصول على حلول مخصصة لاحتياجات عملك
                                                </p>
                                                <Link
                                                    href="/contact"
                                                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                                                    onClick={() => setMenuState(false)}
                                                >
                                                    <ArrowRight className="size-4 rotate-180" />
                                                    <span>احجز استشارة مجانية</span>
                                                </Link>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* CTA Buttons */}
                                    <motion.div
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.55 }}
                                        className="grid grid-cols-2 gap-3 mb-4"
                                    >
                                        <Button asChild variant="outline" className="w-full rounded-xl h-12 text-sm">
                                            <Link href="/auth/login" onClick={() => setMenuState(false)}>
                                                تسجيل الدخول
                                            </Link>
                                        </Button>
                                        <Button asChild className="w-full rounded-xl h-12 text-sm">
                                            <Link href="/app" onClick={() => setMenuState(false)}>
                                                <LayoutGrid className="size-4 ml-2" />
                                                لوحة التحكم
                                            </Link>
                                        </Button>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </nav>
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
