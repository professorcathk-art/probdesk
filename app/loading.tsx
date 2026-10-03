/** Light shell while a route resolves. */
export default function RootPageLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="h-10 max-w-xl animate-pulse rounded-2xl bg-violet-100" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-3xl bg-white" />
        <div className="h-28 animate-pulse rounded-3xl bg-white" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((key) => (
          <div key={key} className="h-48 animate-pulse rounded-3xl bg-white" />
        ))}
      </div>
    </main>
  );
}
