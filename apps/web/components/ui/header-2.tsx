'use client';
import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Menu, Share2, QrCode, UserPlus, UserCheck, LayoutGrid, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// --- Rukny Logo (identical to hero-section-1) --------------------------------
const RuknyLogo = ({ className }: { className?: string }) => (
  <div className={cn('flex items-center gap-2', className)}>
    <svg className="size-7" viewBox="0 0 1080 1080" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="352.46" y="211.99" width="411.5" height="239.89" />
      <rect x="25" y="539.45" width="415.04" height="239.89" transform="translate(891.92 426.88) rotate(90)" />
      <path d="m967.42,665.78v175.97c0,13.89-11.26,25.15-25.15,25.15h-190.54c-6.67,0-13.07-2.65-17.78-7.37l-141.2-141.2c-15.84-15.84-4.62-42.93,17.78-42.93h128.24c13.89,0,25.15-11.26,25.15-25.15v-137.68c0-22.41,27.09-33.63,42.93-17.78l153.21,153.21c4.72,4.72,7.37,11.11,7.37,17.78Z" />
    </svg>
  </div>
);

// --- Props --------------------------------------------------------------------
export interface ProfileHeaderProps {
  displayName?: string;
  username?: string;
  links?: Array<{ label: string; href: string }>;
  isOwnProfile?: boolean;
  isFollowing?: boolean;
  followLoading?: boolean;
  onFollow?: () => void;
  onShowShare?: () => void;
  onShowQR?: () => void;
  cartCount?: number;
  onCartClick?: () => void;
}

// --- Component ----------------------------------------------------------------
export function ProfileHeader({
  displayName,
  username,
  links = [],
  isOwnProfile = false,
  isFollowing = false,
  followLoading = false,
  onFollow,
  onShowShare,
  onShowQR,
  cartCount = 0,
  onCartClick,
}: ProfileHeaderProps) {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = menuState ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuState]);

  return (
    <header dir="rtl" className="relative">
      <nav className="fixed z-50 w-full px-3 sm:px-4 pt-3 sm:pt-4">
        {/* Pill container */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'mx-auto transition-all duration-500 ease-out border',
            isScrolled
              ? 'max-w-3xl bg-white/85 backdrop-blur-2xl shadow-lg shadow-black/[0.04] border-[#e5e1da] rounded-2xl'
              : 'max-w-[1200px] p-4 bg-transparent backdrop-blur-none border-transparent rounded-full',
          )}
        >
          <div className={cn(
            'mx-auto transition-all duration-500 ease-out',
            isScrolled ? 'px-3 sm:px-4' : 'px-3 sm:px-5',
          )}>
            <div className={cn(
              'flex items-center justify-between transition-all duration-500',
              isScrolled ? 'h-16' : 'h-12 sm:h-14',
            )}>
              {/* Logo */}
              <Link href="/" aria-label="الصفحة الرئيسية" className="flex items-center gap-2 shrink-0">
                <RuknyLogo />
              </Link>

              {/* Center: profile name + username + section links */}
              <div className="hidden md:flex items-center gap-1">
                {links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              {/* Desktop right actions */}
              <div className="hidden md:flex items-center gap-2 shrink-0">
                {onShowQR && (
                  <button
                    onClick={onShowQR}
                    className="flex items-center justify-center size-9 rounded-lg text-foreground/70 hover:bg-muted/70 hover:text-foreground transition-colors"
                    title="كود QR"
                  >
                    <QrCode className="size-4" />
                  </button>
                )}
                {onShowShare && (
                  <button
                    onClick={onShowShare}
                    className="flex items-center justify-center size-9 rounded-lg text-foreground/70 hover:bg-muted/70 hover:text-foreground transition-colors"
                    title="مشاركة"
                  >
                    <Share2 className="size-4" />
                  </button>
                )}
                {onCartClick && cartCount > 0 && (
                  <button
                    onClick={onCartClick}
                    className="relative flex items-center justify-center size-9 rounded-lg text-foreground/70 hover:bg-muted/70 hover:text-foreground transition-colors"
                    title="السلة"
                  >
                    <ShoppingCart className="size-4" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  </button>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? 'إغلاق القائمة' : 'فتح القائمة'}
                className="flex md:hidden items-center justify-center size-9 sm:size-10 rounded-lg hover:bg-muted/80 active:bg-muted transition-colors"
              >
                <AnimatePresence mode="wait">
                  {menuState ? (
                    <motion.div key="close"
                      initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.15 }}>
                      <X className="size-5" />
                    </motion.div>
                  ) : (
                    <motion.div key="menu"
                      initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.15 }}>
                      <Menu className="size-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Mobile Menu - Top Sheet (same spring/drag as hero-section-1) */}
        <AnimatePresence>
          {menuState && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setMenuState(false)}
              />
              <motion.div
                initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 250 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.4 }}
                dragMomentum
                dragTransition={{ bounceStiffness: 200, bounceDamping: 30 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 100 || info.velocity.y > 200) setMenuState(false);
                }}
                whileDrag={{ cursor: 'grabbing' }}
                className="fixed top-0 left-0 right-0 bg-white rounded-b-3xl shadow-2xl z-50 md:hidden max-h-[90vh] overflow-hidden touch-pan-y"
                style={{ touchAction: 'pan-y' }}
              >
                <div className="overflow-y-auto max-h-[90vh] px-5 pt-5 pb-6" dir="rtl">
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

                  {/* Profile info card */}
                  {(displayName || username) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="mb-5 p-4 rounded-2xl bg-muted/40 border border-border/50"
                    >
                      {displayName && <p className="font-bold text-base">{displayName}</p>}
                      {username && <p className="text-sm text-muted-foreground">@{username}</p>}
                    </motion.div>
                  )}

                  {/* Section links */}
                  {links.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="mb-5"
                    >
                      <div className="flex flex-wrap gap-2">
                        {links.map((link) => (
                          <a
                            key={link.label}
                            href={link.href}
                            onClick={() => setMenuState(false)}
                            className="flex-1 min-w-[100px] flex items-center justify-center p-3 rounded-xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all text-sm font-medium"
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* CTA Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-2 gap-3 mb-4"
                  >
                    {onShowShare && (
                      <Button variant="outline" className="w-full rounded-xl h-12 text-sm gap-2"
                        onClick={() => { onShowShare(); setMenuState(false); }}>
                        <Share2 className="size-4" />مشاركة
                      </Button>
                    )}
                    {onShowQR && (
                      <Button variant="outline" className="w-full rounded-xl h-12 text-sm gap-2"
                        onClick={() => { onShowQR(); setMenuState(false); }}>
                        <QrCode className="size-4" />كود QR
                      </Button>
                    )}
                    {onCartClick && cartCount > 0 && (
                      <Button variant="outline" className="col-span-2 w-full rounded-xl h-12 text-sm gap-2 relative"
                        onClick={() => { onCartClick(); setMenuState(false); }}>
                        <ShoppingCart className="size-4" />
                        السلة
                        <span className="mr-1 px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                          {cartCount > 9 ? '9+' : cartCount}
                        </span>
                      </Button>
                    )}
                    {!isOwnProfile && onFollow && (
                      <Button
                        className="col-span-2 w-full rounded-xl h-12 text-sm gap-2"
                        onClick={() => { onFollow(); setMenuState(false); }}
                        disabled={followLoading}
                        variant={isFollowing ? 'outline' : 'default'}
                      >
                        {isFollowing
                          ? <><UserCheck className="size-4" />متابَع</>
                          : <><UserPlus className="size-4" />متابعة</>}
                      </Button>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
