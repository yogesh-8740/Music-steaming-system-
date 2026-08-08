import React from "react";

export function SongCardSkeleton() {
  return (
    <div className="p-3 rounded-lg bg-surface-card">
      <div className="skeleton w-full aspect-square rounded-md mb-3" />
      <div className="skeleton h-4 w-3/4 rounded mb-2" />
      <div className="skeleton h-3 w-1/2 rounded" />
    </div>
  );
}

export function SongCardSkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SongCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <div className="skeleton w-10 h-10 rounded" />
      <div className="flex-1">
        <div className="skeleton h-3 w-1/3 rounded mb-2" />
        <div className="skeleton h-3 w-1/5 rounded" />
      </div>
    </div>
  );
}
