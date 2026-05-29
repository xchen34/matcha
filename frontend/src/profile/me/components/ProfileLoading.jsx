import { LoaderCircle } from "lucide-react";

export default function ProfileLoading() {
  return (
    <p className="text-sm text-slate-500">
      <span className="inline-flex items-center gap-1.5">
        <LoaderCircle
          size={14}
          className="animate-spin"
          aria-hidden="true"
        />
        Loading...
      </span>
    </p>
  );
}