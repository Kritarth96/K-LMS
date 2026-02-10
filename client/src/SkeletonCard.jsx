export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden h-full flex flex-col relative">
      {/* Image Skeleton */}
      <div className="h-48 bg-gray-200 animate-pulse w-full"></div>
      
      {/* Content Skeleton */}
      <div className="p-6 flex-1 space-y-4">
        {/* Title */}
        <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4"></div>
        {/* Subtitle */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-100 rounded animate-pulse w-full"></div>
          <div className="h-4 bg-gray-100 rounded animate-pulse w-5/6"></div>
        </div>
        {/* Button */}
        <div className="h-10 bg-gray-200 rounded-lg animate-pulse w-full mt-4"></div>
      </div>
    </div>
  );
}