export function AuthCard({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-14 sm:px-6">
      <div className="rounded-card bg-white p-8 shadow-soft">
        <h1 className="font-serif text-3xl text-forest">{title}</h1>
        {intro && <p className="mt-2 text-sm text-brown">{intro}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
