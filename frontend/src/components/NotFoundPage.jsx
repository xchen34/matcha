import { Link } from "react-router-dom";
import { secondaryButtonClass } from "@/styles/UIClasses";

export default function NotFoundPage({ currentUser }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-auto">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <h2 className="text-2xl font-semibold text-slate-800">Page not found</h2>
        
        {!currentUser ? (
          <p className="text-slate-600 max-w-md">
            Please login before accessing this page.
          </p>
        ) : (
          <p className="text-slate-600 max-w-md">
            The page you're looking for doesn't exist.
            <br />
            Let's get you back on track.
          </p>
        )}
        
        <div className="flex gap-4 justify-center pt-4">
          <Link
            to={currentUser ? "/" : "/login"}
            className={secondaryButtonClass}
          >
            {currentUser ? "Go back to find my match" : "Go to login"}
          </Link>
        </div>
      </div>
    </div>
  );
}
