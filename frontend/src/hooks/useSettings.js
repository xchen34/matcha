import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export function useSettings() {
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsMenuRef = useRef(null);

  // Handle click outside and escape key
  useEffect(() => {
    if (!isSettingsOpen) {
      return undefined;
    }

    function handleDocumentMouseDown(event) {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target)
      ) {
        setIsSettingsOpen(false);
      }
    }

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
