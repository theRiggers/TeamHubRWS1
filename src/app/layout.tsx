
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { StoreProvider } from '@/lib/store';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Headquarter RWS2',
  description: 'Verwalte deine Fußballmannschaft effizient und smart.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Headquarter RWS2',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  }
};

export const viewport: Viewport = {
  themeColor: '#d12d2d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning className={inter.variable}>
      <body className="font-body antialiased bg-background text-foreground overflow-x-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <StoreProvider>
              {children}
              <Toaster />
            </StoreProvider>
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
