import { User, Compass } from "lucide-react";
import { SelectField } from "@/utils/components";

export default function GenderSelector({
  form,
  handleChange,
}) {
  return (
    <>
      {/* GENDER */}
      <div className="space-y-1">
        {/* Label */}
        <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <User size={13} aria-hidden="true" />
            <span>
              Gender<span className="text-primary-dark">*</span>
            </span>
          </span>
        </label>

        {/* Select input */}
        <SelectField
          name="gender"
          value={form.gender}
          onChange={handleChange}
          options={[
            { value: "", label: "Select gender" },
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "non_binary", label: "Non-binary" },
            { value: "other", label: "Other" },
          ]}
        />
      </div>

      {/* SEXUAL PREFERENCE */}
      <div className="space-y-1">
        {/* Label */}
        <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <Compass size={13} aria-hidden="true" />
            <span>Sexual preference</span>
          </span>
        </label>

        {/* Select input */}
        <SelectField
          name="sexual_preference"
          value={form.sexual_preference}
          onChange={handleChange}
          options={[
            { value: "", label: "Select sexual preference" },
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "both", label: "Both" },
            { value: "other", label: "Other" },
          ]}
        />
      </div>
    </>
  );
}