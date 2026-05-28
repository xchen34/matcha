import { useState, useCallback } from "react";
import { buildApiHeaders } from "@/utils/utils.js";

export default function useEmailChange({ currentUser, setMessage }) {
  const userId = currentUser?.id ?? null;
  const [emailChangeOpen, setEmailChangeOpen] = useState(false);
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [emailChangeForm, setEmailChangeForm] = useState({
    new_email: "",
    password: "",
  });
  // URLs for email change confirmation
  const [emailChangePreviewUrl, setEmailChangePreviewUrl] = useState("");
  const [emailChangeDevVerifyUrl, setEmailChangeDevVerifyUrl] = useState("");
  // Error message state
  const [emailChangeError, setEmailChangeError] = useState("");

  /* Handle input changes for email change form */
  function handleEmailChangeInput(event) {
    const { name, value } = event.target;

    setEmailChangeForm((prev) => ({ ...prev, [name]: value }));
    setEmailChangeError(""); // reset erreur quand user tape
  }

  /* Handle email change form submission */
  const handleEmailChangeSubmit = useCallback(async () => {
    setEmailChangeError("");

    if (!userId) {
      setEmailChangeError("Please login first.");
      return;
    }

    const newEmail = (emailChangeForm.new_email || "").trim().toLowerCase();
    const password = emailChangeForm.password || "";

    if (!newEmail || !password) {
      setEmailChangeError("New email and password are required.");
      return;
    }

    setEmailChangeLoading(true);
    setEmailChangePreviewUrl("");
    setEmailChangeDevVerifyUrl("");

    try {
      const response = await fetch("/api/auth/request-email-change", {
        method: "POST",
        headers: buildApiHeaders(currentUser, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ new_email: newEmail, password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMsg = data.error || "Unable to request email change";
        setEmailChangeError(errorMsg);
        return;
      }

      // Store preview and dev verify URLs if provided by the API
      if (data?.email_delivery?.preview_url) {
        setEmailChangePreviewUrl(data.email_delivery.preview_url);
      }

      if (data?.dev_verify_url) {
        setEmailChangeDevVerifyUrl(data.dev_verify_url);
      }

      setEmailChangeForm({ new_email: "", password: "" });
      setMessage("");
    } catch (error) {
      setEmailChangeError(error.message);
    } finally {
      setEmailChangeLoading(false);
    }
  }, [emailChangeForm, currentUser, setMessage]);

  return {
    emailChangeOpen,
    setEmailChangeOpen,
    emailChangeLoading,
    emailChangeForm,
    setEmailChangeForm,
    emailChangePreviewUrl,
    emailChangeDevVerifyUrl,
    emailChangeError,
    handleEmailChangeInput,
    handleEmailChangeSubmit,
  };
}
