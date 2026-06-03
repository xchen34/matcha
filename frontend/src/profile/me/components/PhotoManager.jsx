import { Image, FileUp } from "lucide-react";
import { bytesToKB } from "@/utils/utils.js";
import { MAX_PHOTO_SIZE_BYTES,
  MAX_TOTAL_PHOTOS_SIZE_BYTES, MAX_PHOTOS_COUNT,
} from "@/utils/photoValidator.js";
import { ProfilePhotosGrid } from "@/components/ProfilePhotosGrid.jsx";

export default function PhotoManager({
  photos,
  handlePhotoUpload,
  setPrimaryPhoto,
  removePhoto,
  movePhoto,
  photoMessage,
}) {
  return (
    <div className="space-y-2">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        {/* Label */}
        <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <Image size={16} aria-hidden="true" />
            <span>
              Photos (max {MAX_PHOTOS_COUNT}, {bytesToKB(MAX_PHOTO_SIZE_BYTES)}KB each)
            </span>
          </span>
        </label>

        {/* UPLOAD BUTTON */}
        <div>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-primary px-3 py-2 text-xs font-semibold text-primary-dark transition hover:scale-105 active:scale-95 sm:px-4 sm:py-2.5">
            <span className="inline-flex items-center gap-1.5">
              <FileUp size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Upload image</span>
              <span className="sm:hidden">Upload</span>
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
      <p className="text-xs text-slate-500">
        You can reorder photos using the arrows below each image.
      </p>

      {photoMessage && (
        <p className="text-xs text-primary">({photoMessage})</p>
      )}

      {/* PHOTOS */}
      {photos.length === 0 ? (
        <div className="col-span-2 sm:col-span-3 rounded-xl border border-dashed border-primary-medium p-4 text-sm text-slate-500">
          No photos yet. Upload up to {MAX_PHOTOS_COUNT} images (
          {bytesToKB(MAX_PHOTO_SIZE_BYTES)}KB each, {bytesToKB(MAX_TOTAL_PHOTOS_SIZE_BYTES)}KB total).
        </div>
      ) : (
        <ProfilePhotosGrid
          photos={photos}
          editable
          onSetPrimary={setPrimaryPhoto}
          onRemove={removePhoto}
          onMovePhoto={movePhoto}
        />
      )}
    </div>
  );
}