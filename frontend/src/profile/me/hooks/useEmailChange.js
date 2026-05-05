import { useState, useCallback } from "react";
import { buildApiHeaders } from "@/utils.js";

export default function useEmailChange({ userId, setMessage }) {
  const [emailChangeOpen, setEmailChangeOpen] = useState(false);
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);

  const [emailChangeForm, setEmailChangeForm] = useState({
    new_email: "",
    password: "",
  });

  const [emailChangePreviewUrl, setEmailChangePreviewUrl] = useState("");
  const [emailChangeDevVerifyUrl, setEmailChangeDevVerifyUrl] = useState("");

  const [emailChangeError, setEmailChangeError] = useState("");

  function handleEmailChangeInput(event) {
    const { name, value } = event.target;

    setEmailChangeForm((prev) => ({ ...prev, [name]: value }));
    setEmailChangeError(""); // reset erreur quand user tape
  }

  const handleEmailChangeSubmit = useCallback(async () => {
    setEmailChangeError("");

    if (!userId) {
      setEmailChangeError("Please login first.");
      return;
    }

    const newEmail = (emailChangeForm.new_email || "").trim();
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
        headers: buildApiHeaders(
          { id: userId },
          { "Content-Type": "application/json" }
        ),
        body: JSON.stringify({ new_email: newEmail, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.error || "Unable to request email change";
        setEmailChangeError(errorMsg);
        return;
      }

      // URLs
      if (data?.email_delivery?.preview_url) {
        setEmailChangePreviewUrl(data.email_delivery.preview_url);
      }

      if (data?.dev_verify_url) {
        setEmailChangeDevVerifyUrl(data.dev_verify_url);
      }

      // succès
      setEmailChangeForm({ new_email: "", password: "" });
      setMessage(""); // optionnel : éviter doublon avec message global
    } catch (error) {
      setEmailChangeError(error.message);
    } finally {
      setEmailChangeLoading(false);
    }
  }, [emailChangeForm, userId, setMessage]);

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