/// <reference types="vite/client" />
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";

import { authQueryOptions, type AuthQueryResult } from "@/lib/auth/queries";
import appCss from "@/styles.css?url";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PlaybackSpeedProvider } from "@/lib/context/PlaybackSpeedContext";
import { PusherProvider } from "@/lib/provider/puhser/pusher-provider";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  user: AuthQueryResult;
}>()({
  beforeLoad: ({ context }) => {
    // we're using react-query for client-side caching to reduce client-to-server calls, see /src/router.tsx
    // better-auth's cookieCache is also enabled server-side to reduce server-to-db calls, see /src/lib/auth/auth.ts
    context.queryClient.prefetchQuery(authQueryOptions());
    // typically we don't need the user immediately in landing pages,
    // so we're only prefetching here and not awaiting.
    // for protected routes with loader data, see /(authenticated)/route.tsx
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "React TanStarter",
      },
      {
        name: "description",
        content: "A minimal starter template for 🏝️ TanStack Start.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap",
      },
      // preload this video casa-de-cha.mp4
      {
        rel: "prefetch",
        href: "/assets/videos/casa-de-cha.mp4",
        as: "video",
        type: "video/mp4",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { readonly children: React.ReactNode }) {
  return (
    // suppress since we're updating the "dark" class in ThemeProvider
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PusherProvider>
          <ThemeProvider>
            <PlaybackSpeedProvider>
              {children}
              <Toaster richColors position="top-center" />
            </PlaybackSpeedProvider>
          </ThemeProvider>
        </PusherProvider>
        {/* <DevTools /> */}
        <Scripts />
      </body>
    </html>
  );
}
