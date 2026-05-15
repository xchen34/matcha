import { useEffect, useState } from "react";
import { buildApiHeaders } from "@/utils/utils.js";

export function useUserModeration(id, currentUser, profileData) {
  const [reportedFake, setReportedFake] = useState(false);
  const [blockedUser, setBlockedUser] = useState(false);
  const [moderationMessage, setModerationMessage] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [unblocking, setUnblocking] = useState(false);
  const [reporting, setReporting] = useState(false);

  /* ========== Update moderation state based on profile data ========== */
  useEffect(() => {
    setReportedFake(Boolean(profileData?.relation?.reported_fake_by_me));
    setBlockedUser(Boolean(profileData?.relation?.blocked_by_you));
  }, [profileData]);

  /* ====== Block a user ====== */
  async function blockUser() {
    setBlocking(true);
    try {
      const res = await fetch(`/api/users/${id}/block`, {
        method: "POST",
        headers: buildApiHeaders(currentUser),
      });

      if (res.ok) setBlockedUser(true);
    } finally {
      setBlocking(false);
    }
  }

  /* ====== Unblock an user ====== */
  async function unblockUser() {
    setUnblocking(true);
    try {
      const res = await fetch(`/api/users/${id}/block`, {
        method: "DELETE",
        headers: buildApiHeaders(currentUser),
      });

      if (res.ok) setBlockedUser(false);
    } finally {
      setUnblocking(false);
    }
  }

  /* ====== Report fake user ====== */
  async function reportFake(reason) {
    setReporting(true);

    try {
      const res = await fetch(`/api/users/${id}/report-fake`, {
        method: "POST",
        headers: {
          ...buildApiHeaders(currentUser),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        setReportedFake(true);
        setModerationMessage("Reported successfully");
      }
    } finally {
      setReporting(false);
    }
  }

  return {
    reportedFake,
    blockedUser,
    moderationMessage,
    blocking,
    unblocking,
    reporting,
    blockUser,
    unblockUser,
    reportFake,
    setModerationMessage,
  };
}
