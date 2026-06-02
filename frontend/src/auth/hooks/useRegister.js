import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MIN_BIRTH_DATE_ISO,
  isValidBirthDateIso,
  getMaxAdultBirthDateIso,
} from "@/utils/date.js";

export function useRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    birth_date: "",
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [devVerifyUrl, setDevVerifyUrl] = useState("");

  const maxAdultBirthDateIso = getMaxAdultBirthDateIso();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("Submitting...");
    setPreviewUrl("");
    setDevVerifyUrl("");

    if (
      !isValidBirthDateIso(
        form.birth_date,
        MIN_BIRTH_DATE_ISO,
        maxAdultBirthDateIso,
      )
    ) {
      return setMessage(
        `Invalid birth date must be between ${MIN_BIRTH_DATE_ISO} and ${maxAdultBirthDateIso}`,
      );
    }

    if (form.password !== form.confirmPassword) {
      return setMessage("Passwords do not match");
    }

    try {
      const payload = {
        ...form,
        email: (form.email || "").trim().toLowerCase(),
      };

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return setMessage(`Error: ${data.error || "Register failed"}`);
      }

      const delivery = data?.email_delivery;

      setPreviewUrl(delivery?.preview_url || "");
      setDevVerifyUrl(data?.dev_verify_url || "");

      setMessage("Account created. Check your email.");

      setTimeout(() => {
        navigate("/verification-sent", {
          state: {
            prefillEmail: form.email,
            previewUrl: delivery?.preview_url || null,
            devVerifyUrl: data?.dev_verify_url || null,
          },
        });
      }, 500);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  }

  return {
    form,
    message,
    previewUrl,
    devVerifyUrl,
    maxAdultBirthDateIso,
    handleChange,
    handleSubmit,
  };
}
