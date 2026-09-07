import { Providers } from './providers';
import { DerivWSProvider } from './deriv-ws-provider';
import { Toaster } from '@/components/ui/sonner';
import ViewportScaler from './ViewportScaler';
import { EnvCheck } from './env-check';

/**
 * Shared layout wrapper for all template apps.
 *
 * Composes theme provider, mobile viewport scaling, and toast notifications
 * in a single import. Template `app/layout.tsx` files should wrap their
 * children with this component instead of manually composing these pieces.
 *
 * Usage in a template's app/layout.tsx:
 *
 *   import { TemplateLayout } from '@/components/custom/template-layout'
 *
 *   <html lang="en" className="h-full lg:h-auto" suppressHydrationWarning>
 *     <body className="... max-lg:h-dvh max-lg:overflow-hidden lg:overflow-y-auto">
 *       <TemplateLayout>{children}</TemplateLayout>
 *     </body>
 *   </html>
 *
 * Notes:
 * - ViewportScaler is mobile-only (active below the `lg` / 1024px breakpoint).
 * - Toaster sits outside ViewportScaler so toasts are never CSS-transformed.
 */
export function TemplateLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <DerivWSProvider>
        <ViewportScaler>{children}</ViewportScaler>
      </DerivWSProvider>
      <Toaster />
      <EnvCheck />
    </Providers>
  );
}
