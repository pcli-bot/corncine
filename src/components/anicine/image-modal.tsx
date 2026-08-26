"use client";

import { useEffect, useState, useCallback } from "react";
import { useAnicineStore } from "@/lib/anicine-store";
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Image as ImageIcon } from "lucide-react";
import { showToast } from "@/lib/anicine-toast";

export function ImageModal() {
  const imageViewer = useAnicineStore((s) => s.imageViewer);
  const setImageViewer = useAnicineStore((s) => s.setImageViewer);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);

  const images = imageViewer?.images && imageViewer.images.length > 0 
    ? imageViewer.images 
    : imageViewer?.url ? [imageViewer.url] : [];
  const currentIndex = imageViewer?.currentIndex ?? 0;
  const currentUrl = images[currentIndex] || imageViewer?.url;

  const close = () => {
    setImageViewer({ open: false });
    setZoom(1);
  };

  const next = useCallback(() => {
    if (images.length <= 1) return;
    const nextIdx = (currentIndex + 1) % images.length;
    setImageViewer({ currentIndex: nextIdx, url: images[nextIdx] });
    setLoading(true);
  }, [images, currentIndex, setImageViewer]);

  const prev = useCallback(() => {
    if (images.length <= 1) return;
    const prevIdx = (currentIndex - 1 + images.length) % images.length;
    setImageViewer({ currentIndex: prevIdx, url: images[prevIdx] });
    setLoading(true);
  }, [images, currentIndex, setImageViewer]);

  useEffect(() => {
    if (!imageViewer?.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imageViewer?.open, next, prev]);

  if (!imageViewer?.open || !currentUrl) return null;

  const handleDownload = async () => {
    try {
      showToast("Downloading image...", "info");
      const filename = `${(imageViewer.title || "image").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${currentIndex + 1}.jpg`;
      
      const res = await fetch(currentUrl, { mode: "cors" });
      if (!res.ok) throw new Error("Fetch failed");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      
      showToast("Image saved successfully!", "success");
    } catch {
      const a = document.createElement("a");
      a.href = currentUrl;
      a.target = "_blank";
      a.download = `${(imageViewer.title || "image").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("Image opened in browser for save", "info");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md transition-opacity">
      <div className="absolute inset-0" onClick={close} />

      {/* Header Controls */}
      <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-20 pointer-events-auto">
        <div className="flex items-center space-x-3 overflow-hidden max-w-[65%]">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#6AB27A]/20 text-[#6AB27A] border border-[#6AB27A]/30 uppercase flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            HD Photo
          </span>
          <h3 className="text-sm sm:text-base font-bold text-white truncate">
            {imageViewer.title || "Media Viewer"}
          </h3>
          {images.length > 1 && (
            <span className="text-xs font-mono text-slate-400 bg-white/10 px-2 py-0.5 rounded-full">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Zoom controls */}
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="px-3.5 py-1.5 rounded-lg bg-[#6AB27A] hover:bg-[#059669] text-black font-bold text-xs flex items-center gap-1.5 transition shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Save Image</span>
          </button>

          {/* Close button */}
          <button
            onClick={close}
            className="p-2 rounded-lg bg-white/10 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div className="relative max-w-7xl max-h-[85vh] w-full h-full flex items-center justify-center p-4 z-10 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <Loader2 className="w-8 h-8 text-[#6AB27A] animate-spin" />
          </div>
        )}
        
        <img
          src={currentUrl}
          alt={imageViewer.title}
          onLoad={() => setLoading(false)}
          style={{ transform: `scale(${zoom})`, transition: "transform 200ms ease-out" }}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl select-none"
        />

        {/* Previous / Next Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 hover:border-white/30 transition shadow-xl"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 hover:border-white/30 transition shadow-xl"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Thumbnail Strip (if multi-image set) */}
      {images.length > 1 && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center items-center gap-2 p-2 bg-gradient-to-t from-black/90 to-transparent z-20 overflow-x-auto max-w-2xl mx-auto">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setImageViewer({ currentIndex: idx, url: img });
                setLoading(true);
              }}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition shrink-0 ${
                idx === currentIndex ? "border-[#6AB27A] scale-105" : "border-white/20 opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
