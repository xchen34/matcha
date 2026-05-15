import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export function useSettings() {
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsMenuRef = useRef(null);

  useEffect(() => {
    if (!isSettingsOpen) {
      return undefined;
    }

    /* ========== Close settings on outside click ========== */
    function handleDocumentMouseDown(event) {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target)
      ) {
        setIsSettingsOpen(false);
      }
    }

    /* =========== Close settings on Escape key ========== */
    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isSettingsOpen]);

  /* ========== Close settings and navigate ========== */
  function closeSettings() {
    setIsSettingsOpen(false);
  }

  function navigateTo(path) {
    closeSettings();
    navigate(path);
  }

  return {
    isSettingsOpen,
    setIsSettingsOpen,
    settingsMenuRef,
    closeSettings,
    navigateTo,
  };
}
