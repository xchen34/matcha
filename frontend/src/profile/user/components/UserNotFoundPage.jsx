import { Link } from "react-router-dom";
import { secondaryButtonClass } from "@/styles/UIClasses.jsx";

export default function UserNotFoundPage({ currentUser }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-auto">
      <div className="text-center space-y-6">
        {/* 404 TITLE */ }
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <h2 className="text-2xl font-semibold text-slate-800">
          User not found
        </h2>

        {/* DESCRIPTION */ }
        <p className="text-slate-600 max-w-md">
          This profile don't exist or has been deleted.
        </p>

        {/* BACK TO FIND MATCH OR LOGIN */ }
        <div className="flex gap-4 justify-center pt-4">
          <Link
            to={currentUser ? "/find-match" : "/login"}
            className={secondaryButtonClass}
          >
            {currentUser ? "Go back to find my match" : "Go to login"}
          </Link>
        </div>
      </div>
    </div>
  );
}
