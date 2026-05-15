import { useMemo, useState } from "react";
import { getMaxAdultBirthDateIso } from "@/utils/date.js";

export default function useProfileFormState() {
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    gender: "",
    sexual_preference: "",
    biography: "",
    birth_date: "",
    city: "",
    neighborhood: "",
    gps_consent: false,
    latitude: "",
    longitude: "",
    tags: [],
    photos: [],
  });

  const [loading, setLoading] = useState(true);

  // Check presence of required fields for validation and submission
  const hasUsername = (form.username || "").trim().length > 0;
  const hasFirstName = (form.first_name || "").trim().length > 0;
  const hasLastName = (form.last_name || "").trim().length > 0;
  const hasEmail = (form.email || "").trim().length > 0;
  const hasGender = (form.gender || "").trim().length > 0;
  const hasAge = (form.birth_date || "").trim().length > 0;
  const hasCity = (form.city || "").trim().length > 0;
  const hasRequiredFields =
    hasUsername &&
    hasFirstName &&
    hasLastName &&
    hasEmail &&
    hasGender &&
    hasAge &&
    hasCity;

  const missingRequiredFields = [
    !hasUsername ? "username" : null,
    !hasFirstName ? "first name" : null,
    !hasLastName ? "last name" : null,
    !hasEmail ? "email" : null,
    !hasGender ? "gender" : null,
    !hasAge ? "age" : null,
    !hasCity ? "city" : null,
  ].filter(Boolean);

  const maxAdultBirthDateIso = useMemo(() => getMaxAdultBirthDateIso(), []);

  return {
    form,
    setForm,
    loading,
    setLoading,
    hasGender,
    hasRequiredFields,
    missingRequiredFields,
    maxAdultBirthDateIso,
  };
}
