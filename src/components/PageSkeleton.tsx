export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 animate-pulse">
      {/* Nav skeleton */}
      <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-6 gap-4">
        <div className="h-8 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="flex-1" />
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="grid md:grid-cols-3 gap-4 pt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700" />
          ))}
        </div>
        <div className="space-y-3 pt-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="h-24 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse p-4 space-y-3">
      <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="space-y-3 p-4 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
