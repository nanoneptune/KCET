import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, RotateCw, RotateCcw, Maximize2, Minimize2, AlertCircle, X } from "lucide-react";

export function extractYouTubeId(url: string | undefined | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.includes("<iframe")) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/);
    if (srcMatch && srcMatch[1]) {
      return extractYouTubeId(srcMatch[1]);
    }
  }

  const ytRegex = /(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(ytRegex);
  if (match && match[1]) {
    return match[1];
  }

  const vParamMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (vParamMatch && vParamMatch[1]) return vParamMatch[1];

  const pathMatch = trimmed.match(/\/(shorts|embed|v|live|watch|youtu\.be)\/([a-zA-Z0-9_-]{11})/);
  if (pathMatch && pathMatch[2]) return pathMatch[2];

  return null;
}

export function parseVideoUrl(url: string | undefined, isMuted: boolean = true) {
  if (!url || typeof url !== "string") return { isVideo: false, isVertical: false };
  const trimmed = url.trim();
  if (!trimmed) return { isVideo: false, isVertical: false };

  const isVertical = trimmed.includes("/shorts/") || trimmed.includes("vertical") || trimmed.includes("9:16") || trimmed.includes("9/16");

  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    return {
      isVideo: true,
      isYouTube: true,
      videoId: ytId,
      isVertical,
      embedUrl: `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${ytId}&playsinline=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1`,
      watchUrl: `https://www.youtube.com/watch?v=${ytId}`
    };
  }

  if (trimmed.includes("vimeo.com")) {
    const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch && vimeoMatch[1]) {
      return {
        isVideo: true,
        isYouTube: false,
        isVimeo: true,
        isVertical,
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=${isMuted ? 1 : 0}&loop=1&autopause=0&background=1`,
        watchUrl: `https://vimeo.com/${vimeoMatch[1]}`
      };
    }
  }

  if (trimmed.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || (trimmed.includes("cloudinary.com") && trimmed.includes("/video/upload/"))) {
    return {
      isVideo: true,
      isYouTube: false,
      isDirectVideo: true,
      isVertical,
      embedUrl: trimmed
    };
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return {
      isVideo: true,
      isYouTube: trimmed.toLowerCase().includes("youtube") || trimmed.toLowerCase().includes("youtu.be"),
      isVertical,
      embedUrl: trimmed,
      watchUrl: trimmed
    };
  }

  return { isVideo: false, isVertical: false };
}

interface AutoPlayVideoProps {
  url: string;
  className?: string;
  title?: string;
  interactive?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export const AutoPlayVideo: React.FC<AutoPlayVideoProps> = ({
  url,
  className = "w-full h-full object-cover",
  title = "Campus Video",
  interactive = true,
  onFullscreenChange
}) => {
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [forceRotateHorizontal, setForceRotateHorizontal] = useState(false);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<{ side: "left" | "right"; text: string } | null>(null);

  // Video Zoom & Pan State & Handlers
  const [videoZoom, setVideoZoom] = useState(1);
  const [videoPan, setVideoPan] = useState({ x: 0, y: 0 });

  const isDraggingVideo = useRef(false);
  const videoDragStart = useRef({ x: 0, y: 0 });

  const videoTouchStartDist = useRef<number | null>(null);
  const videoTouchStartZoom = useRef<number>(1);
  const videoTouchStartCenter = useRef<{ x: number; y: number } | null>(null);
  const videoTouchStartPan = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const videoTouchSingleStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (videoZoom <= 1) {
      setVideoPan({ x: 0, y: 0 });
    }
  }, [videoZoom]);

  const handleVideoMouseDown = (e: React.MouseEvent) => {
    if (videoZoom <= 1) return;
    e.preventDefault();
    isDraggingVideo.current = true;
    videoDragStart.current = {
      x: e.clientX - videoPan.x,
      y: e.clientY - videoPan.y
    };
  };

  const handleVideoMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingVideo.current || videoZoom <= 1) return;
    e.preventDefault();
    setVideoPan({
      x: e.clientX - videoDragStart.current.x,
      y: e.clientY - videoDragStart.current.y
    });
  };

  const handleVideoMouseUpOrLeave = () => {
    isDraggingVideo.current = false;
  };

  const handleVideoTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      videoTouchSingleStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      videoTouchStartPan.current = { ...videoPan };
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      videoTouchStartDist.current = dist;
      videoTouchStartZoom.current = videoZoom;

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      videoTouchStartCenter.current = { x: midX, y: midY };
      videoTouchStartPan.current = { ...videoPan };
    }
  };

  const handleVideoTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && videoTouchSingleStart.current && videoZoom > 1) {
      const dx = e.touches[0].clientX - videoTouchSingleStart.current.x;
      const dy = e.touches[0].clientY - videoTouchSingleStart.current.y;
      setVideoPan({
        x: videoTouchStartPan.current.x + dx,
        y: videoTouchStartPan.current.y + dy
      });
    } else if (e.touches.length === 2 && videoTouchStartDist.current !== null && videoTouchStartCenter.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = dist / videoTouchStartDist.current;
      const nextZoom = Math.min(4, Math.max(1, videoTouchStartZoom.current * ratio));
      setVideoZoom(nextZoom);

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const dx = midX - videoTouchStartCenter.current.x;
      const dy = midY - videoTouchStartCenter.current.y;
      setVideoPan({
        x: videoTouchStartPan.current.x + dx,
        y: videoTouchStartPan.current.y + dy
      });
    }
  };

  const handleVideoTouchEnd = () => {
    videoTouchSingleStart.current = null;
    videoTouchStartDist.current = null;
    videoTouchStartCenter.current = null;
  };

  const toggleVideoZoom = () => {
    setVideoZoom(prev => (prev > 1 ? 1 : 2.5));
  };

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fullscreenIframeRef = useRef<HTMLIFrameElement>(null);

  const lastTapLeft = useRef<number>(0);
  const lastTapRight = useRef<number>(0);

  const parsed = parseVideoUrl(url, isMuted);

  if (!parsed.isVideo || !parsed.embedUrl) return null;

  const { isYouTube, isVimeo, isDirectVideo, embedUrl, isVertical } = parsed;

  const sendYtCommand = (func: string, args: any[] = [], targetRef = iframeRef) => {
    const activeRef = isFullscreen ? fullscreenIframeRef : targetRef;
    if (activeRef.current && activeRef.current.contentWindow) {
      try {
        activeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
      } catch (e) {
        console.warn("YouTube player command error:", e);
      }
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sendYtCommand(nextMuted ? "mute" : "unMute");
  };

  const skipForward = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sendYtCommand("seekTo", [30, true]);
  };

  const skipBackward = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sendYtCommand("seekTo", [-30, true]);
  };

  const triggerDoubleTapFeedback = (side: "left" | "right", text: string) => {
    setDoubleTapFeedback({ side, text });
    setTimeout(() => {
      setDoubleTapFeedback(null);
    }, 700);
  };

  const handleLeftClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTapLeft.current < 300) {
      // Double tap!
      skipBackward();
      triggerDoubleTapFeedback("left", "-30s");
      lastTapLeft.current = 0;
    } else {
      lastTapLeft.current = now;
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTapRight.current < 300) {
      // Double tap!
      skipForward();
      triggerDoubleTapFeedback("right", "+30s");
      lastTapRight.current = 0;
    } else {
      lastTapRight.current = now;
    }
  };

  const openFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFullscreen(true);
    onFullscreenChange?.(true);
    if (!isVertical) {
      setForceRotateHorizontal(true);
    }
  };

  const closeFullscreen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsFullscreen(false);
    onFullscreenChange?.(false);
  };

  const renderVideoElement = (refObj: React.RefObject<HTMLIFrameElement | null>, customClass = "") => {
    if (isYouTube || isVimeo || embedUrl.includes("youtube") || embedUrl.includes("vimeo") || embedUrl.includes("embed")) {
      return (
        <iframe
          ref={refObj}
          src={embedUrl}
          title={title}
          onError={() => setHasError(true)}
          className={`w-full h-full border-0 pointer-events-none ${customClass || className}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      );
    }

    if (isDirectVideo) {
      return (
        <video
          src={embedUrl}
          autoPlay
          muted={isMuted}
          loop
          playsInline
          className={`w-full h-full ${customClass || className}`}
          onError={() => setHasError(true)}
        />
      );
    }

    return null;
  };

  return (
    <div className="relative w-full h-full group overflow-hidden bg-slate-950 flex flex-col justify-between">
      {hasError ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-900 text-white text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-rose-500" />
          <p className="text-xs font-bold text-slate-300">Campus Video Preview</p>
        </div>
      ) : (
        <>
          <div 
            className="relative flex-1 w-full overflow-hidden flex items-center justify-center min-h-0 touch-none select-none cursor-zoom-in"
            onMouseDown={handleVideoMouseDown}
            onMouseMove={handleVideoMouseMove}
            onMouseUp={handleVideoMouseUpOrLeave}
            onMouseLeave={handleVideoMouseUpOrLeave}
            onTouchStart={handleVideoTouchStart}
            onTouchMove={handleVideoTouchMove}
            onTouchEnd={handleVideoTouchEnd}
            onDoubleClick={(e) => {
              e.stopPropagation();
              toggleVideoZoom();
            }}
          >
            <div 
              className="w-full h-full relative transition-transform duration-200"
              style={{
                transform: `scale(${videoZoom}) translate(${videoPan.x / videoZoom}px, ${videoPan.y / videoZoom}px)`,
                transformOrigin: "center"
              }}
            >
              {renderVideoElement(iframeRef, "w-full h-full object-cover")}
            </div>
          </div>

          {/* Minimalist Control Buttons Below Video Frame (No Background, No Border, Low Opacity Icons) */}
          {interactive && (
            <div 
              className="w-full bg-slate-950/95 py-1 px-3 flex items-center justify-between text-white z-30 shrink-0 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={skipBackward}
                  className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center space-x-1 text-[10px] font-medium text-white/90 active:scale-95"
                  title="Rewind 30s"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>-30s</span>
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center space-x-1 text-[10px] font-medium text-white/90 active:scale-95"
                  title={isMuted ? "Enable Audio" : "Disable Audio"}
                >
                  {isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>{isMuted ? "Muted" : "Sound On"}</span>
                </button>

                <button
                  type="button"
                  onClick={skipForward}
                  className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center space-x-1 text-[10px] font-medium text-white/90 active:scale-95"
                  title="Skip 30s"
                >
                  <span>+30s</span>
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {videoZoom > 1 && (
                <button
                  type="button"
                  onClick={() => setVideoZoom(1)}
                  className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-medium text-white/90 active:scale-95 flex items-center space-x-1"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Zoom</span>
                </button>
              )}

              <button
                type="button"
                onClick={openFullscreen}
                className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer p-0.5 text-white/90 active:scale-95 flex items-center justify-center"
                title="Full Screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Fullscreen Video Overlay Viewport */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-[300] bg-black flex items-center justify-center overflow-hidden animate-in fade-in duration-200"
          onClick={closeFullscreen}
        >
          {/* Full Screen Player Container */}
          <div 
            className={`relative w-full h-full flex items-center justify-center ${
              !isVertical && forceRotateHorizontal 
                ? "sm:rotate-0 rotate-90 w-[100vh] h-[100vw] max-w-none max-h-none transition-transform duration-300" 
                : "w-full h-full"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Video Frame */}
            <div 
              className={`w-full h-full relative overflow-hidden flex items-center justify-center touch-none select-none ${isVertical ? "max-w-md aspect-[9/16]" : "w-full h-full"}`}
              onMouseDown={handleVideoMouseDown}
              onMouseMove={handleVideoMouseMove}
              onMouseUp={handleVideoMouseUpOrLeave}
              onMouseLeave={handleVideoMouseUpOrLeave}
              onTouchStart={handleVideoTouchStart}
              onTouchMove={handleVideoTouchMove}
              onTouchEnd={handleVideoTouchEnd}
              onDoubleClick={(e) => {
                e.stopPropagation();
                toggleVideoZoom();
              }}
            >
              <div 
                className="w-full h-full relative transition-transform duration-200"
                style={{
                  transform: `scale(${videoZoom}) translate(${videoPan.x / videoZoom}px, ${videoPan.y / videoZoom}px)`,
                  transformOrigin: "center"
                }}
              >
                {renderVideoElement(fullscreenIframeRef, "w-full h-full object-cover")}
              </div>

              {/* Invisible Double-Tap Zones for Skip 30s */}
              <div 
                className="absolute inset-y-0 left-0 w-1/2 z-20 cursor-pointer flex items-center justify-center"
                onClick={handleLeftClick}
              >
                {doubleTapFeedback?.side === "left" && (
                  <div className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center space-x-2 text-sm font-black animate-ping">
                    <RotateCcw className="w-5 h-5 text-rose-400" />
                    <span>{doubleTapFeedback.text}</span>
                  </div>
                )}
              </div>

              <div 
                className="absolute inset-y-0 right-0 w-1/2 z-20 cursor-pointer flex items-center justify-center"
                onClick={handleRightClick}
              >
                {doubleTapFeedback?.side === "right" && (
                  <div className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center space-x-2 text-sm font-black animate-ping">
                    <span>{doubleTapFeedback.text}</span>
                    <RotateCw className="w-5 h-5 text-rose-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Floating Minimalist Controls (Borderless, Low Opacity Icons Only) */}
            <div 
              className="absolute bottom-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-auto opacity-50 hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sound Off / On Button */}
              <button
                type="button"
                onClick={toggleMute}
                className="p-3 text-white hover:scale-110 active:scale-90 transition-all cursor-pointer drop-shadow-2xl"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX className="w-6 h-6 text-rose-400" />
                ) : (
                  <Volume2 className="w-6 h-6 text-emerald-400" />
                )}
              </button>

              <div className="flex items-center space-x-3">
                {videoZoom > 1 && (
                  <button
                    type="button"
                    onClick={() => setVideoZoom(1)}
                    className="p-2 bg-black/40 text-white rounded-full transition-all flex items-center space-x-1 text-xs"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Zoom</span>
                  </button>
                )}

                {/* Rotate Option for Horizontal on Mobile */}
                {!isVertical && (
                  <button
                    type="button"
                    onClick={() => setForceRotateHorizontal(!forceRotateHorizontal)}
                    className="p-2.5 text-white/70 hover:text-white transition-all cursor-pointer"
                    title="Toggle Auto Rotation"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Minimize / Back to Stage Button */}
              <button
                type="button"
                onClick={closeFullscreen}
                className="p-3 text-white hover:scale-110 active:scale-90 transition-all cursor-pointer drop-shadow-2xl"
                title="Minimize / Exit Fullscreen"
              >
                <Minimize2 className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoPlayVideo;

