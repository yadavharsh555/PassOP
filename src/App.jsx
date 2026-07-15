import React, { useState, useEffect } from "react";
import "./App.css";
import Footer from "./components/Footer";
import Manager from "./components/Manager";
import Navbar from "./components/Navbar";
import Auth from "./components/Auth";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  useEffect(() => {
    // Detect Chrome Extension context
    const isExtension = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;
    if (isExtension) {
      document.body.classList.add("chrome-extension-body");
    }

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Error parsing stored user data", err);
      }
    }
  }, [token]);

  const handleLoginSuccess = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <div
      className={`${
        theme === "dark"
          ? "bg-slate-950 text-slate-100 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"
          : "bg-slate-50 text-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-emerald-50/10"
      } min-h-screen flex flex-col justify-between font-sans selection:bg-emerald-500/30 selection:text-emerald-400 transition-colors duration-500`}
    >
      <Navbar user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
      
      <main className="flex-grow">
        {token ? (
          <Manager token={token} theme={theme} />
        ) : (
          <Auth onLoginSuccess={handleLoginSuccess} theme={theme} />
        )}
      </main>

      <Footer theme={theme} />
    </div>
  );
}

export default App;
