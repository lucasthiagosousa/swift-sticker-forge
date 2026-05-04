import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Etiqueta — Gerador de QR Code & Código de Barras" },
      { name: "description", content: "Crie, edite e exporte etiquetas com QR code e código de barras em PDF. 100% no navegador." },
      { name: "author", content: "Etiqueta" },
      { property: "og:title", content: "Etiqueta — Gerador de QR Code & Código de Barras" },
      { property: "og:description", content: "Crie, edite e exporte etiquetas com QR code e código de barras em PDF. 100% no navegador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Etiqueta — Gerador de QR Code & Código de Barras" },
      { name: "twitter:description", content: "Crie, edite e exporte etiquetas com QR code e código de barras em PDF. 100% no navegador." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e5cc1338-3609-4000-85c8-b27be1b858d7/id-preview-f50c65d9--4421eb9c-dfb8-49c0-8801-1110ea65a5f3.lovable.app-1777869743247.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e5cc1338-3609-4000-85c8-b27be1b858d7/id-preview-f50c65d9--4421eb9c-dfb8-49c0-8801-1110ea65a5f3.lovable.app-1777869743247.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
