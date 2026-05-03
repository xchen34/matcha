import { useCallback } from "react";
import {
  MAX_PHOTO_SIZE_BYTES,
  MAX_TOTAL_PHOTOS_SIZE_BYTES,
  MAX_PHOTOS_COUNT,
  validatePhotoFile,
} from "../../../utils/photoValidator.js";
import { bytesToKB } from "../../../utils/formatUtils.js";

export default function usePhoto({ form, setForm, setMessage }) {
  function handlePhotoUpload(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remaining = Math.max(0, MAX_PHOTOS_COUNT - form.photos.length);
    if (remaining <= 0) {
      setMessage(`Error: maximum ${MAX_PHOTOS_COUNT} photos allowed.`);
      event.target.value = "";
      return;
    }

    const slice = files.slice(0, remaining);

    const currentApproxTotal = form.photos.reduce(
      (sum, photo) => sum + String(photo.data_url || "").length,
      0,
    );

    const newFilesTotal = slice.reduce((sum, file) => sum + file.size, 0);

    if (currentApproxTotal + newFilesTotal > MAX_TOTAL_PHOTOS_SIZE_BYTES) {
      setMessage(
        `Error: total photos size exceeds ${bytesToKB(MAX_TOTAL_PHOTOS_SIZE_BYTES)}KB. Remove a photo first.`,
      );
      event.target.value = "";
      return;
    }

    for (const file of slice) {
      const result = validatePhotoFile(file);
      if (!result.valid) {
        setMessage(`Error: ${result.error}`);
        event.target.value = "";
        return;
      }
    }

    const readers = slice.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              data_url: String(reader.result),
              is_primary: false,
              name: file.name,
            });
          reader.readAsDataURL(file);
        }),
    );

    Promise.all(readers).then((newPhotos) => {
      setForm((prev) => {
        const merged = [...prev.photos, ...newPhotos];
        if (!merged.some((p) => p.is_primary) && merged.length > 0) {
          merged[0].is_primary = true;
        }
        return { ...prev, photos: merged };
      });
      setMessage("");
    });

    event.target.value = "";
  }

  const setPrimaryPhoto = useCallback((index) => {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.map((photo, i) => ({
        ...photo,
        is_primary: i === index,
      })),
    }));
  }, [setForm]);

  const removePhoto = useCallback((index) => {
    setForm((prev) => {
      const next = prev.photos.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((p) => p.is_primary)) {
        next[0].is_primary = true;
      }
      return { ...prev, photos: next };
    });
  }, [setForm]);

  return {
    handlePhotoUpload,
    setPrimaryPhoto,
    removePhoto,
  };
}