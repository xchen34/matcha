import { useEffect, useState } from "react";
import { CircleX, ChevronLeft, ChevronRight, Star } from "lucide-react";

export function ProfilePhotosGrid({
  photos,
  editable = false,
  onSetPrimary,
  onRemove,
  onMovePhoto,
}) {
  const FRAME_SIZE = 224;

  const [modalIndex, setModalIndex] = useState(null);

  const openModal = (idx) => setModalIndex(idx);
  const closeModal = () => setModalIndex(null);

  const showPrev = () =>
    setModalIndex((i) => (i > 0 ? i - 1 : photos.length - 1));

  const showNext = () =>
    setModalIndex((i) => (i < photos.length - 1 ? i + 1 : 0));

  useEffect(() => {
    if (modalIndex === null) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
      if (e.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalIndex]);

  const handleRemove = (idx, e) => {
    e.stopPropagation();

    const ok = window.confirm("Delete this photo ?");
    if (!ok) return;

    onRemove?.(idx);
  };

  return (
    <>
      {/* GRID */}
      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
        {photos.map((photo, idx) => (
          <div key={photo.id || idx} className="flex flex-col items-center gap-2">

            {/* IMAGE */}
            <div
              className={`
                relative flex items-center justify-center overflow-hidden
                rounded-xl border bg-slate-100 group
                ${photo.is_primary ? "border-primary-dark" : "border-slate-200"}
              `}
              style={{ width: FRAME_SIZE, height: FRAME_SIZE }}
            >
              <img
                src={photo.data_url}
                alt="Profile"
                className="h-full w-full object-contain cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
                onClick={() => openModal(idx)}
              />

              {/* SET PRIMARY */}
              {editable && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetPrimary?.(idx);
                  }}
                  className="
                    absolute top-2 left-2
                    flex items-center gap-1
                    rounded-full px-2 py-1 text-[10px]
                    bg-black/40 text-white backdrop-blur
                    hover:bg-black/60 transition
                  "
                >
                  <Star size={12} />
                  {photo.is_primary ? "Primary photo" : "Set primary"}
                </button>
              )}

              {/* REMOVE */}
              {editable && (
                <button
                  type="button"
                  onClick={(e) => handleRemove(idx, e)}
                  className="
                    absolute top-2 right-2
                    flex h-7 w-7 items-center justify-center
                    rounded-full bg-black/40 text-white
                    backdrop-blur hover:bg-black/60 transition
                  "
                >
                  <CircleX size={16} />
                </button>
              )}
            </div>

            {/* REORDER */}
            {editable && (
              <div className="flex items-center gap-2 rounded-full bg-black/5 px-2 py-1 border border-slate-200">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMovePhoto?.(idx, -1);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200 disabled:opacity-30"
                >
                  <ChevronLeft size={18} />
                </button>

                <span className="text-[10px] text-slate-500 select-none whitespace-nowrap">
                  {idx + 1} / {photos.length}
                </span>

                <button
                  type="button"
                  disabled={idx === photos.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMovePhoto?.(idx, 1);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200 disabled:opacity-30"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL */}
      {modalIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="relative flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={showPrev}
              className="absolute left-[-4rem] flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg hover:bg-white"
            >
              <ChevronLeft size={26} />
            </button>

            <img
              src={photos[modalIndex]?.data_url}
              className="max-h-[70vh] max-w-[70vw] rounded-xl border-4 border-white shadow-2xl"
            />

            <button
              type="button"
              onClick={showNext}
              className="absolute right-[-4rem] flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg hover:bg-white"
            >
              <ChevronRight size={26} />
            </button>

            <button
              type="button"
              onClick={closeModal}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
            >
              <CircleX size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}