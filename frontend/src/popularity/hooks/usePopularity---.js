import { useState, useEffect } from "react";
import { buildApiHeaders } from "@/utils.js";

export function usePopularity(currentUser, mode, MODE_CONFIG) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLists = async () => {
      if (!currentUser) return;
      setLoading(true);
      setError("");

      try {
        const res = await fetch(MODE_CONFIG[mode].endpoint, {
          headers: buildApiHeaders(currentUser),
        });
        const data = await res.json();

        if (res.ok && Array.isArray(data.users)) {
          setLists(data.users);
        } else {
          setError("Failed to load data.");
        }
      } catch (err) {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchLists();
  }, [currentUser, mode, MODE_CONFIG]);

  return { lists, loading, error };
}