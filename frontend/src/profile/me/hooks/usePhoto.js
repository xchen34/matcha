import { useCallback, useState } from "react";
import { 
  MAX_TOTAL_PHOTOS_SIZE_BYTES,
  MAX_PHOTOS_COUNT, 
  validatePhotoFile,
} from "@/utils/photoValidator.js";
import { bytesToKB } from "@/utils/utils.js";

export default function usePhoto({ form, setForm }) {
  const [photoMessage, setPhotoMessage] = useState("");

  /* ========= Handle photo file input change and add photos to form ========== */
  function handlePhotoUpload(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    /* Calculate remaining photo slots and enforce maximum count */
    const remaining = Math.max(0, MAX_PHOTOS_COUNT - form.photos.length);
    if (remaining <= 0) {
      setPhotoMessage(`Error: maximum ${MAX_PHOTOS_COUNT} photos allowed.`);
      event.target.value = "";
      return;
    }

    const slice = files.slice(0, remaining);

    /* ========== Size check approximation ========== */
    const currentApproxTotal = form.photos.reduce(
      (sum, photo) => sum + String(photo.data_url || "").length,
      0,
    );

    const newFilesTotal = slice.reduce((sum, file) => sum + file.size, 0);

    if (currentApproxTotal + newFilesTotal > MAX_TOTAL_PHOTOS_SIZE_BYTES) {
      setPhotoMessage(
        `Error: total photos size exceeds ${bytesToKB(MAX_TOTAL_PHOTOS_SIZE_BYTES)}KB. Remove a photo first.`,
      );
      event.target.value = "";
      return;
    }

    /* ========== Validate individual files ========== */
    for (const file of slice) {
      const result = validatePhotoFile(file);
      if (!result.valid) {
        setPhotoMessage(`Error: ${result.error}`);
        event.target.value = "";
        return;
      }
    }

    /* ========== Convert files to data URLs and add to form ========== */
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

    /* ========== Add new photos to the form ========== */
    Promise.all(readers).then((newPhotos) => {
      setForm((prev) => {
        const merged = [...prev.photos, ...newPhotos];
        if (!merged.some((p) => p.is_primary) && merged.length > 0) {
          merged[0].is_primary = true;
        }
        return { ...prev, photos: merged };
      });
      setPhotoMessage("");
    });

    event.target.value = "";
  }

  /* ========= Set a photo as primary by index ========== */
  const setPrimaryPhoto = useCallback((index) => {
    setForm((prev) => {
      const photos = Array.isArray(prev.photos) ? [...prev.photos] : [];
      if (index < 0 || index >= photos.length) return prev;

      /* Extract the selected photo and mark it primary */
      const [selected] = photos.splice(index, 1);
      const updatedSelected = { ...selected, is_primary: true };

      /* Ensure no other photo is primary */
      const rest = photos.map((p) => ({ ...p, is_primary: false }));

      /* Put the selected photo first for UX consistency */
      const reordered = [updatedSelected, ...rest];

      return { ...prev, photos: reordered };
    });
  }, [setForm]);

  /* ========= Remove a photo by index and ensure one primary remains ========== */
  const removePhoto = useCallback((index) => {
    setForm((prev) => {
      const next = prev.photos.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((p) => p.is_primary)) {
        next[0].is_primary = true;
      }
      return { ...prev, photos: next };
    });
  }, [setForm]);

  /* ========= Move a photo one step left or right ========== */
  const movePhoto = useCallback((index, direction) => {
    if (direction !== -1 && direction !== 1) return;

    setForm((prev) => {
      const photos = Array.isArray(prev.photos) ? [...prev.photos] : [];
      const targetIndex = index + direction;

      if (index < 0 || index >= photos.length) return prev;
      if (targetIndex < 0 || targetIndex >= photos.length) return prev;

      const next = [...photos];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

      if (targetIndex === 0) {
        next.forEach((photo, photoIndex) => {
          photo.is_primary = photoIndex === 0;
        });
      }

      return { ...prev, photos: next };
    });
  }, [setForm]);

  return {
    handlePhotoUpload,
    setPrimaryPhoto,
    removePhoto,
    movePhoto,
    photoMessage,
  };
}