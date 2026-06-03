import { useState, useCallback } from "react";

export default function useTags({ form, setForm, setMessage, tagOptions }) {
  const [selectedTag, setSelectedTag] = useState("");

  /* ========== Normalize and validate tag input ========== */
  function normalizeTag(tag) {
    let value = (tag || "").trim().toLowerCase();
    if (!value) return "";

    if (!value.startsWith("#")) {
      value = `#${value}`;
    }

    return /^#[a-z0-9_]{1,30}$/.test(value) ? value : "";
  }

  /* ========== Add a new tag to the form state after validation ========== */
  const addTag = useCallback(
    (rawTag) => {
      const tag = normalizeTag(rawTag);

      if (!tag) {
        return setMessage(
          "Error: invalid tag format. Use letters, numbers or underscore.",
        );
      }

      if (form.tags.length >= 10) {
        return setMessage("Error: maximum 10 tags allowed.");
      }

      setForm((prev) => {
        if (prev.tags.includes(tag)) return prev;

        return {
          ...prev,
          tags: [...prev.tags, tag],
        };
      });

      setSelectedTag("");
      setMessage("");
    },
    [form.tags, setForm, setMessage],
  );

  /* ========== Remove a tag from the form state ========== */
  const removeTag = useCallback(
    (tagToRemove) => {
      setForm((prev) => ({
        ...prev,
        tags: prev.tags.filter((tag) => tag !== tagToRemove),
      }));
    },
    [setForm],
  );

  return {
    selectedTag,
    setSelectedTag,
    addTag,
    removeTag,
  };
}
