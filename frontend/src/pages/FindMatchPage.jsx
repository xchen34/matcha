// Moved to pages/FindMatchPage.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import UserCard from "../components/UserCard.jsx";
import { buildApiHeaders } from "../utils.js";

function FindMatchPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMatches() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/matches", {
          headers: buildApiHeaders(currentUser),
        });
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          setUsers([]);
          setError("No matches found.");
        }
      } catch (err) {
        setError("Failed to load matches");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }
    if (currentUser) fetchMatches();
  }, [currentUser]);

  if (!currentUser) return <Navigate to="/login" replace />;
  if (loading) return <p>Loading matches...</p>;
  if (error) return <p className="message">{error}</p>;

  return (
    <section className="card">
      <h2>Find your match</h2>
      <div className="user-list">
        {(!Array.isArray(users) || users.length === 0) && <p>No users found.</p>}
        {Array.isArray(users) && users.map((user) => (
          <div key={user.id} style={{ marginBottom: "1.5em", width: "100%" }}>
            <UserCard user={user} currentUser={currentUser} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default FindMatchPage;