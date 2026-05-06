import { Info } from "lucide-react";
import { FieldLabel } from "./FieldLabel.jsx";

export default function ProfileBio({ biography }) {
  return (
    <div>
      <FieldLabel icon={Info}>Bio</FieldLabel>
      <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-slate-100 bg-white/70 p-2 text-slate-800">
        {biography || "-"}
      </div>
    </div>
  );
}