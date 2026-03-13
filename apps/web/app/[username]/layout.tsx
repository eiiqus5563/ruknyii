import { Metadata } from 'next';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}

const API_SERVER_URL = process.env.NEXT_PUBLIC_API_EXTERNAL_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'http://localhost:3001/api/v1';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;

  let name = `@${username}`;
  let description = `تصفح الملف الشخصي لـ @${username} على Rukny`;
  const url = `https://rukny.io/${username}`;

  try {
    const res = await fetch(`${API_SERVER_URL}/profiles/${encodeURIComponent(username)}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const profile = await res.json();
      if (profile.name) name = profile.name;
      if (profile.bio) description = profile.bio;
    }
  } catch {
    // fallback to defaults
  }

  const title = `${name} | Rukny`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Rukny',
      type: 'profile',
      images: [
        {
          url: `/api/og/${username}`,
          width: 1200,
          height: 630,
          alt: `${name}'s profile`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/api/og/${username}`],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default function ProfileLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen" dir="rtl">
      {children}
    </div>
  );
}
