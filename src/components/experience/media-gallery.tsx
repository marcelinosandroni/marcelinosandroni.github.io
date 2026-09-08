"use client";

import type { ResumeMediaAsset } from "@/domain/resume/types";
import { useState } from "react";

type ExperienceMediaGalleryProps = {
  assets: ResumeMediaAsset[];
};

export function ExperienceMediaGallery({ assets }: ExperienceMediaGalleryProps) {
  const [selectedAsset, setSelectedAsset] = useState<ResumeMediaAsset | null>(null);

  if (!assets || assets.length === 0) {
    return null;
  }

  const getIconForType = (type: ResumeMediaAsset["type"]) => {
    switch (type) {
      case "image":
        return "🖼️";
      case "video":
        return "🎬";
      case "link":
        return "🔗";
      case "document":
        return "📄";
      default:
        return "📎";
    }
  };

  const handleOpenModal = (asset: ResumeMediaAsset) => {
    setSelectedAsset(asset);
  };

  const handleCloseModal = () => {
    setSelectedAsset(null);
  };

  return (
    <>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {assets.map((asset, index) => (
          <button
            key={index}
            onClick={() => handleOpenModal(asset)}
            className="group relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`View ${asset.caption || asset.type}`}
          >
            {asset.thumbnailUrl ? (
              <img
                src={asset.thumbnailUrl}
                alt={asset.caption || ""}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">
                {getIconForType(asset.type)}
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-end p-2">
              {asset.caption && (
                <span className="text-white text-xs line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {asset.caption}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Modal/Lightbox */}
      {selectedAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] overflow-auto bg-white dark:bg-gray-900 rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label="Close modal"
            >
              ✕
            </button>

            <div className="p-4">
              {selectedAsset.caption && (
                <h3 id="modal-title" className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  {selectedAsset.caption}
                </h3>
              )}

              {selectedAsset.type === "image" && (
                <img
                  src={selectedAsset.url}
                  alt={selectedAsset.caption || ""}
                  className="w-full h-auto rounded"
                />
              )}

              {selectedAsset.type === "video" && (
                <video
                  src={selectedAsset.url}
                  controls
                  className="w-full h-auto rounded"
                  aria-label={selectedAsset.caption || "Video"}
                >
                  Your browser does not support the video tag.
                </video>
              )}

              {selectedAsset.type === "link" && (
                <div className="text-center py-8">
                  <a
                    href={selectedAsset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-lg"
                  >
                    Open Link →
                  </a>
                  <p className="mt-2 text-gray-600 dark:text-gray-400 break-all">{selectedAsset.url}</p>
                </div>
              )}

              {selectedAsset.type === "document" && (
                <div className="text-center py-8">
                  <a
                    href={selectedAsset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-lg"
                  >
                    📄 Download/View Document
                  </a>
                  <p className="mt-2 text-gray-600 dark:text-gray-400 break-all">{selectedAsset.url}</p>
                </div>
              )}

              {selectedAsset.thumbnailUrl && selectedAsset.type !== "image" && selectedAsset.type !== "video" && (
                <div className="mt-4">
                  <img
                    src={selectedAsset.thumbnailUrl}
                    alt=""
                    className="w-32 h-32 object-cover rounded mx-auto"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
