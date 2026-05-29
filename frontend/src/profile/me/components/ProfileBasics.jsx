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
        label={
          <span className="inline-flex items-center gap-1.5">
            <User size={13} />
            <span>
              Username<span className="text-primary-dark">*</span>
            </span>
          </span>
        }
        name="username"
        value={form.username}
        onChange={handleChange}
      />

      {/* BIRTH DATE */}
      <FormInput
        label={
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={13} />
            <span>
              Birth date<span className="text-primary-dark">*</span>
            </span>
          </span>
        }
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
        label={
          <span className="inline-flex items-center gap-1.5">
            <User size={13} />
            <span>
              First name<span className="text-primary-dark">*</span>
            </span>
          </span>
        }
        name="first_name"
        value={form.first_name}
        onChange={handleChange}
      />

      {/* LAST NAME */}
      <FormInput
        label={
          <span className="inline-flex items-center gap-1.5">
            <User size={13} />
            <span>
              Last name<span className="text-primary-dark">*</span>
            </span>
          </span>
        }
        name="last_name"
        value={form.last_name}
        onChange={handleChange}
      />
    </div>
  );
}