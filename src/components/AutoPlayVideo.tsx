import React, { useState } from "react";
import { ExternalLink, Youtube, AlertCircle } from "lucide-react";

export function extractYouTubeId(url: string | undefined | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. Raw 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Extract src if iframe code was pasted
  if (trimmed.includes("<iframe")) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/);
    if (srcMatch && srcMatch[1]) {
      return extractYouTubeId(srcMatch[1]);
    }
  }

  // 3. YouTube URL regex matching standard, shorts, live, embed, youtu.be, etc.
  const ytRegex = /(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(ytRegex);
  if (match && match[1]) {
    return match[1];
  }

  // 4. Query param v=
  const vParamMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (vParamMatch && vParamMatch[1]) return vParamMatch[1];

  // 5. Any /shorts/ID or /embed/ID or /v/ID or /live/ID or /youtu.be/ID
  const pathMatch = trimmed.match(/\/(shorts|embed|v|live|watch|youtu\.be)\/([a-zA-Z0-9_-]{11})/);
  if (pathMatch && pathMatch[2]) return pathMatch[2];

  return null;
}

export function parseVideoUrl(url: string | undefined) {
  if (!url || typeof url !== "string") return { isVideo: false };
  const trimmed = url.trim();
  if (!trimmed) return { isVideo: false };

  // Try YouTube extraction first
  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    return {
      isVideo: true,
      isYouTube: true,
      videoId: ytId,
      embedUrl: `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&playsinline=1&controls=1&rel=0&modestbranding=1&enablejsapi=1`,
      watchUrl: `https://www.youtube.com/watch?v=${ytId}`
    };
  }

  // Try Vimeo
  if (trimmed.includes("vimeo.com")) {
    const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch && vimeoMatch[1]) {
      return {
        isVideo: true,
        isYouTube: false,
        isVimeo: true,
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1&autopause=0&background=1`,
        watchUrl: `https://vimeo.com/${vimeoMatch[1]}`
      };
    }
  }

  // Direct video file or Cloudinary video link
  if (trimmed.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || (trimmed.includes("cloudinary.com") && trimmed.includes("/video/upload/"))) {
    return {
      isVideo: true,
      isYouTube: false,
      isDirectVideo: true,
      embedUrl: trimmed
    };
  }

  // Generic URL fallback
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (trimmed.toLowerCase().includes("youtube") || trimmed.toLowerCase().includes("youtu.be")) {
      return {
        isVideo: true,
        isYouTube: true,
        embedUrl: trimmed,
        watchUrl: trimmed
      };
    }

    return {
      isVideo: true,
      isYouTube: false,
      isOtherEmbed: true,
      embedUrl: trimmed
    };
  }

  return { isVideo: false };
}

interface AutoPlayVideoProps {
  url: string;
  className?: string;
  title?: string;
  showYouTubeLink?: boolean;
  interactive?: boolean;
}

export const AutoPlayVideo: React.FC<AutoPlayVideoProps> = ({
  url,
  className = "w-full h-full object-cover",
  title = "Campus Video",
  showYouTubeLink = true,
  interactive = false
}) => {
  const [hasError, setHasError] = useState(false);
  const parsed = parseVideoUrl(url);

  if (!parsed.isVideo || !parsed.embedUrl) return null;

  const { isYouTube, isVimeo, isDirectVideo, embedUrl, watchUrl } = parsed;

  if (isYouTube || isVimeo || embedUrl.includes("youtube") || embedUrl.includes("vimeo") || embedUrl.includes("embed")) {
    return (
      <div className="relative w-full h-full group overflow-hidden bg-slate-950">
        {hasError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-900 text-white text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <p className="text-xs font-bold text-slate-300">Video cannot be embedded directly</p>
            {watchUrl && (
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
              >
                <Youtube className="w-3.5 h-3.5" />
                <span>Watch on YouTube</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            )}
          </div>
        ) : (
          <>
            <iframe
              src={embedUrl}
              title={title}
              onError={() => setHasError(true)}
              className={`w-full h-full border-0 ${interactive ? "" : "pointer-events-none scale-105"} ${className}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />

            {/* Direct Watch on YouTube button overlay */}
            {showYouTubeLink && watchUrl && (
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="absolute top-3 right-3 z-20 px-2.5 py-1 bg-black/80 hover:bg-rose-600 text-white text-[10px] font-black rounded-full backdrop-blur-md border border-white/20 transition-all flex items-center space-x-1 shadow-lg opacity-80 hover:opacity-100 hover:scale-105 cursor-pointer"
                title="Open directly on YouTube"
              >
                <Youtube className="w-3 h-3 text-rose-400 group-hover:text-white" />
                <span>Watch on YouTube</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </a>
            )}
          </>
        )}
      </div>
    );
  }

  if (isDirectVideo) {
    return (
      <video
        src={embedUrl}
        autoPlay
        muted
        loop
        playsInline
        controls={interactive}
        className={className}
        onError={() => setHasError(true)}
      />
    );
  }

  return null;
};

export default AutoPlayVideo;
