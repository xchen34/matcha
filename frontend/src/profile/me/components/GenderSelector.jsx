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
        {/* Select input */}
        <SelectField
          label="Gender"
          icon={User}
          required
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
        {/* Select input */}
        <SelectField
          label="Sexual preference"
          icon={Compass}
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