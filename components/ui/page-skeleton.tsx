export function PageSkeleton({ label = "Memuat halaman" }: { label?: string }) {
  return (
    <main
      className="page-shell min-h-[70vh] py-12"
      aria-busy="true"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      <div className="h-3 w-28 animate-pulse rounded bg-line" />
      <div className="mt-5 h-12 max-w-xl animate-pulse rounded bg-line" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="panel h-44 animate-pulse bg-sand" />
        ))}
      </div>
    </main>
  );
}
