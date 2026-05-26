import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { writeStoredUser } from "@/utils/userStorage.js";

//useLogin handle the login logic
//it will redirect the user to the find-match page if the profile is completed
//otherwise it will redirect the user to the profile page
//if the email is not verified, it will redirect the user to the resend-verification page
//if the login is successful, it will write the user to the local storage
//it will also update the user in the parent component
//
export function useLogin(onLogin) {  //onLogin is the function to update the user in the parent component which is the App.jsx
  const navigate = useNavigate(); //useNavigate is used to navigate the user to the find-match page if the profile is completed

  const [form, setForm] = useState({   //useState is a hook that is used to store the state of the component, it will return an array with two elements, the first element is the state, and the second element is the function to update the state
    username: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("Submitting...");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data?.requires_email_verification) {
          const fallbackEmail =
            (typeof data?.email === "string" && data.email.trim()) ||
            ((form.username || "").includes("@") ? form.username.trim() : "");

          setMessage("Email not verified...");

          setTimeout(() => {
            navigate("/resend-verification", {
              state: { prefillEmail: fallbackEmail },
            });
          }, 400);

          return;
        }

        setMessage(`Error: ${data.error || "Login failed"}`);
        return;
      }

      writeStoredUser(data.user);
      onLogin(data.user);

      setMessage(`Welcome ${data.user.username}`);

      const nextPath =
        data?.user?.profile_completed ? "/find-match" : "/profile";

      setTimeout(() => navigate(nextPath), 400);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  }

  return {
    form,
    message,
    handleChange,
    handleSubmit,
  };
}