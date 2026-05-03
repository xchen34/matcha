import { useEffect, useState } from "react";

export function ProfilePhotosGrid({ photos }) {
  const FRAME_SIZE = 224;
  const [modalIndex, setModalIndex] = useState(null);
  const openModal = (idx) => setModalIndex(idx);
  const closeModal = () => setModalIndex(null);
  const showPrev = () => setModalIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
  const showNext = () => setModalIndex((i) => (i < photos.length - 1 ? i + 1 : 0));

  // Keyboard navigation for modal
  useEffect(() => {
    if (modalIndex === null) return;
    function handleKeyDown(e) {
      if (e.key === 'ArrowLeft') {
        showPrev();
      } else if (e.key === 'ArrowRight') {
        showNext();
      } else if (e.key === 'Escape') {
        closeModal();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalIndex]);

  return (
    <>
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        {photos.map((photo, idx) => (
          <div
            key={photo.id}
            className={`flex items-center justify-center bg-slate-100 overflow-hidden rounded-xl border group ${photo.is_primary ? "border-brand" : "border-slate-200"}`}
            style={{ width: FRAME_SIZE, height: FRAME_SIZE, minWidth: FRAME_SIZE, minHeight: FRAME_SIZE, maxWidth: FRAME_SIZE, maxHeight: FRAME_SIZE, position: 'relative', zIndex: 1 }}
          >
            <div className="relative w-full h-full">
              <img
                src={photo.data_url}
                alt="Profile"
                className="object-contain w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:shadow-2xl cursor-zoom-in"
                style={{ background: "#f1f5f9" }}
                onClick={() => openModal(idx)}
              />
            </div>
          </div>
        ))}
      </div>
      {modalIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadein"
          onClick={closeModal}
        >
          <div className="relative flex items-center" onClick={e => e.stopPropagation()}>
            <button
              className="absolute left-[-3rem] md:left-[-4rem] top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition z-10"
              onClick={showPrev}
              aria-label="Photo précédente"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <img
              src={photos[modalIndex].data_url}
              alt="Profile large"
              className="max-h-[70vh] max-w-[70vw] rounded-xl shadow-2xl border-4 border-white"
              style={{ background: '#f1f5f9' }}
            />
            <button
              className="absolute right-[-3rem] md:right-[-4rem] top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition z-10"
              onClick={showNext}
              aria-label="Photo suivante"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition"
              onClick={closeModal}
              aria-label="Fermer"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}