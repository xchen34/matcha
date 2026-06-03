import { User, Calendar } from "lucide-react";
import { FormInput } from "@/utils/components";

export default function ProfileBasics({
  form,
  handleChange,
  inputClass,
  MIN_BIRTH_DATE_ISO,
  maxAdultBirthDateIso,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* USERNAME */}
      <FormInput
        label="Username"
        icon={User}
        name="username"
        value={form.username}
        onChange={handleChange}
        required
      />

      {/* BIRTH DATE */}
      <FormInput
        label="Birth date"
        icon={Calendar}
        name="birth_date"
        type="date"
        value={form.birth_date}
        onChange={handleChange}
        min={MIN_BIRTH_DATE_ISO}
        max={maxAdultBirthDateIso}
        required
      />

      {/* FIRST NAME */}
      <FormInput
        label="First name"
        icon={User}
        name="first_name"
        value={form.first_name}
        onChange={handleChange}
        required
      />

      {/* LAST NAME */}
      <FormInput
        label="Last name"
        icon={User}
        name="last_name"
        value={form.last_name}
        onChange={handleChange}
        required
      />
    </div>
  );
}