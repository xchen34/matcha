import { Image, FileUp } from "lucide-react";
import { bytesToKB } from "@/utils/formatUtils.js";
import { MAX_PHOTO_SIZE_BYTES,
  MAX_TOTAL_PHOTOS_SIZE_BYTES, MAX_PHOTOS_COUNT,
} from "@/utils/photoValidator.js";

export default function PhotoManager({
  photos,
  handlePhotoUpload,
  setPrimaryPhoto,
  removePhoto,
}) {
  return (
    <div className="space-y-2">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <Image size={13} aria-hidden="true" />
            <span>
              Photos (max {MAX_PHOTOS_COUNT}, {bytesToKB(MAX_PHOTO_SIZE_BYTES)}KB each)
            </span>
          </span>
        </label>

        <div>
        <label className={"text-primary-dark font-semibold border border-primary rounded-full px-2 py-1 text-xs cursor-pointer hover:scale-105"}>
          <span className="inline-flex items-center gap-1.5">
            <FileUp size={13} aria-hidden="true" />
            Upload image
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </span>
        </label>
      </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((photo, index) => (
          <div
            key={`${photo.id || "new"}-${index}`}
            className={`relative overflow-hidden rounded-xl border ${
              photo.is_primary ? "border-primary-dark" : "border-slate-200"
            }`}
          >
            <img
              src={photo.data_url}
              alt={`Upload ${index + 1}`}
              className="h-32 w-full object-cover"
            />

            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-2 py-1 text-xs text-white">
              <button
                type="button"
                onClick={() => setPrimaryPhoto(index)}
                className="hover:underline"
              >
                {photo.is_primary ? "Primary" : "Set primary"}
              </button>

              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {/* EMPTY STATE */}
        {photos.length === 0 && (
          <div className="col-span-2 sm:col-span-3 rounded-xl border border-dashed border-primary-medium p-4 text-sm text-slate-500">
            No photos yet. Upload up to {MAX_PHOTOS_COUNT} images (
            {bytesToKB(MAX_PHOTO_SIZE_BYTES)}KB each,{" "}
            {bytesToKB(MAX_TOTAL_PHOTOS_SIZE_BYTES)}KB total).
          </div>
        )}
      </div>
    </div>
  );
}