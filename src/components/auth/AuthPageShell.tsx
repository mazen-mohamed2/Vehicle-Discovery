import type { ReactNode } from "react";
export function AuthPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-14 sm:px-6">
      <section className="rounded-2xl surface-card p-6 shadow-elegant sm:p-8">
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {children}
      </section>
    </main>
  );
}
