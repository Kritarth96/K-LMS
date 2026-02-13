import { memo } from 'react';

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden h-full flex flex-col relative" role="progressbar" aria-busy="true" aria-label="Loading content">
      {/* Image Skeleton */}
      <div className="h-48 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-pulse w-full"></div>
      
      {/* Content Skeleton */}
      <div className="p-6 flex-1 space-y-4">
        {/* Title */}
        <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded animate-pulse w-3/4"></div>
        {/* Subtitle */}
        <div className="space-y-2">
          <div className="h-4 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 rounded animate-pulse w-full"></div>
          <div className="h-4 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 rounded animate-pulse w-5/6"></div>
        </div>
        {/* Button */}
        <div className="h-10 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-lg animate-pulse w-full mt-4"></div>
      </div>
    </div>
  );
}

export default memo(SkeletonCard);