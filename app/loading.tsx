export default function Loading() {
  return (
    <main
      className="page-shell py-16"
      aria-busy="true"
      aria-label="Memuat halaman"
    >
      <div className="h-4 w-28 animate-pulse bg-line" />
      <div className="mt-6 h-14 max-w-xl animate-pulse bg-line" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-40 animate-pulse rounded-[8px] border border-line bg-sand"
          />
        ))}
      </div>
    </main>
  );
}
