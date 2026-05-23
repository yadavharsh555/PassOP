import React, { useRef, useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { v4 as uuidv4 } from "uuid";

const Manager = ({ token, theme }) => {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const isDark = theme === "dark";
  const ref = useRef();
  const passwordRef = useRef();
  const [form, setform] = useState({ site: "", username: "", password: "" });
  const [PasswordArray, setPasswordArray] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [copiedStates, setCopiedStates] = useState({});
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const getpassword = async () => {
    try {
      let req = await fetch(`${API_URL}/`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (req.ok) {
        let passwords = await req.json();
        setPasswordArray(passwords);
      } else {
        toast.error("Failed to fetch passwords from secure vault");
      }
    } catch (err) {
      console.error(err);
      toast.error("Unable to connect to server");
    }
  };

  useEffect(() => {
    getpassword();
  }, [token]);

  const toggleShowPassword = () => {
    setShowPasswordText(!showPasswordText);
  };

  const copytext = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedStates((prev) => ({ ...prev, [key]: true }));
    toast.success("Copied to Clipboard!", {
      theme: isDark ? "dark" : "light",
      autoClose: 1500,
    });
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: "None", color: "bg-slate-800" };
    let score = 0;
    if (pass.length > 5) score++;
    if (pass.length > 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score, label: "Weak", color: "bg-red-550" };
    if (score <= 4) return { score, label: "Medium", color: "bg-amber-550" };
    return { score, label: "Strong", color: "bg-emerald-555" };
  };

  const SavePassword = async () => {
    if (
      form.site.length > 3 &&
      form.username.length > 3 &&
      form.password.length > 3
    ) {
      try {
        // If we are editing, first delete the old record
        if (form.id) {
          await fetch(`${API_URL}/`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ id: form.id }),
          });
        }

        const newId = form.id || uuidv4();
        const payload = { ...form, id: newId };

        // Save new/updated record to Mongo
        let response = await fetch(`${API_URL}/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          setform({ site: "", username: "", password: "" });
          await getpassword();
          toast.success("Password Saved to Secure Vault!", { theme: isDark ? "dark" : "light" });
        } else {
          toast.error("Failed to save password record");
        }
      } catch (err) {
        console.error(err);
        toast.error("Server connection error");
      }
    } else {
      toast.error("All fields must be at least 4 characters long!", { theme: isDark ? "dark" : "light" });
    }
  };

  const DeletePassword = async (id) => {
    let c = confirm("Are you sure you want to permanently delete this credentials record?");
    if (c) {
      try {
        let res = await fetch(`${API_URL}/`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ id }),
        });

        if (res.ok) {
          await getpassword();
          toast.success("Credential Deleted permanently!", { theme: isDark ? "dark" : "light" });
        } else {
          toast.error("Failed to delete record");
        }
      } catch (err) {
        console.error(err);
        toast.error("Server connection error");
      }
    }
  };

  const EditPassword = (id) => {
    const itemToEdit = PasswordArray.find((i) => i.id === id);
    if (itemToEdit) {
      setform({ ...itemToEdit });
    }
  };

  const handlechange = (e) => {
    setform({ ...form, [e.target.name]: e.target.value });
  };

  const toggleRowPassword = (id) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter passwords based on search query
  const filteredPasswords = PasswordArray.filter(
    (item) =>
      item.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const strength = getPasswordStrength(form.password);

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={isDark ? "dark" : "light"}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 w-full">
        {/* Header Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold tracking-tight">
            <span className="text-emerald-500 font-mono">&lt;</span>
            <span
              className={`bg-gradient-to-r ${
                isDark
                  ? "from-white via-slate-200 to-emerald-400"
                  : "from-slate-800 via-slate-900 to-emerald-600"
              } bg-clip-text text-transparent transition-colors duration-500`}
            >
              Pass
            </span>
            <span className="text-emerald-500">OP/&gt;</span>
          </h1>
          <p className={`mt-3 ${isDark ? "text-slate-400" : "text-slate-500"} text-lg max-w-xl mx-auto transition-colors duration-500`}>
            Your Premium, Zero-Knowledge AES-256 Encrypted Password Vault
          </p>
        </div>

        {/* Input Form Glass Card */}
        <div
          className={`${
            isDark
              ? "bg-slate-900/40 border-slate-800 text-white"
              : "bg-white/75 border-slate-200 shadow-xl shadow-slate-100/30 text-slate-800"
          } backdrop-blur-xl border p-8 rounded-3xl relative mb-12 transition-all duration-500`}
        >
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>

          <div className="flex flex-col gap-6">
            {/* Website URL Input */}
            <div className="relative">
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Website URL
              </label>
              <input
                placeholder="https://example.com"
                value={form.site}
                onChange={handlechange}
                className={`${
                  isDark
                    ? "bg-slate-950/40 border-slate-800 text-white placeholder-slate-600 focus:ring-emerald-500/80"
                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-emerald-500/80 focus:bg-white"
                } w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 text-sm`}
                type="text"
                name="site"
                id="site"
              />
            </div>

            {/* Username & Password Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <label
                  className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Username or Email
                </label>
                <input
                  placeholder="Enter Username"
                  value={form.username}
                  onChange={handlechange}
                  className={`${
                    isDark
                      ? "bg-slate-950/40 border-slate-800 text-white placeholder-slate-600 focus:ring-emerald-500/80"
                      : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-emerald-500/80 focus:bg-white"
                  } w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 text-sm`}
                  type="text"
                  name="username"
                  id="username"
                />
              </div>

              <div className="relative">
                <label
                  className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    placeholder="Enter Secure Password"
                    ref={passwordRef}
                    value={form.password}
                    onChange={handlechange}
                    className={`${
                      isDark
                        ? "bg-slate-950/40 border-slate-800 text-white placeholder-slate-600 focus:ring-emerald-500/80"
                        : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-emerald-500/80 focus:bg-white"
                    } w-full pl-4 pr-12 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 text-sm`}
                    type={showPasswordText ? "text" : "password"}
                    name="password"
                    id="password"
                  />
                  <button
                    type="button"
                    onClick={toggleShowPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400 transition-colors p-1"
                  >
                    {showPasswordText ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Strength Meter */}
                {form.password && (
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-1 flex-1 max-w-[150px] mr-2">
                      <div className={`h-1 flex-1 rounded-full ${strength.score >= 1 ? strength.color : "bg-slate-800"}`}></div>
                      <div className={`h-1 flex-1 rounded-full ${strength.score >= 3 ? strength.color : "bg-slate-800"}`}></div>
                      <div className={`h-1 flex-1 rounded-full ${strength.score >= 5 ? strength.color : "bg-slate-800"}`}></div>
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Strength: <span className={isDark ? "text-white" : "text-slate-800"}>{strength.label}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Trigger */}
            <div className="flex justify-center mt-4">
              <button
                onClick={SavePassword}
                className="relative inline-flex items-center justify-center p-0.5 mb-2 mr-2 overflow-hidden text-sm font-semibold text-slate-900 rounded-xl group bg-gradient-to-br from-emerald-400 to-teal-500 hover:text-slate-950 focus:ring-4 focus:outline-none focus:ring-emerald-800 transition-all duration-300 shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <span
                  className={`relative px-8 py-3 transition-all ease-in duration-75 ${
                    isDark ? "bg-slate-950 text-emerald-400" : "bg-white text-emerald-600"
                  } rounded-[10px] group-hover:bg-opacity-0 group-hover:text-slate-950 group-hover:dark:text-slate-950 flex items-center gap-2`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {form.id ? "Update Vault Record" : "Save to Secure Vault"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Vault list & Filtering Card */}
        <div
          className={`${
            isDark
              ? "bg-slate-900/30 border-slate-800 text-white"
              : "bg-white/60 border-slate-200 shadow-xl shadow-slate-100/30 text-slate-800"
          } backdrop-blur-xl border p-8 rounded-3xl shadow-2xl relative overflow-hidden transition-all duration-500`}
        >
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>

          {/* Search and Metadata Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className={isDark ? "text-white" : "text-slate-850"}>Your Secure Vault</span>
              </h2>
              <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                {PasswordArray.length === 0
                  ? "No credentials stored yet"
                  : `Managing ${PasswordArray.length} encrypted credential record${PasswordArray.length > 1 ? "s" : ""}`}
              </p>
            </div>

            {PasswordArray.length > 0 && (
              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Filter by site or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${
                    isDark
                      ? "bg-slate-950/60 border-slate-800/80 text-white placeholder-slate-500"
                      : "bg-slate-55 border-slate-250 text-slate-800 placeholder-slate-400 focus:bg-white"
                  } w-full pl-9 pr-4 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/80 focus:border-transparent transition-all duration-200`}
                />
              </div>
            )}
          </div>

          {/* Records Table */}
          {PasswordArray.length === 0 ? (
            <div
              className={`text-center py-12 bg-slate-950/10 border border-dashed rounded-2xl ${
                isDark ? "border-slate-800/80" : "border-slate-300"
              }`}
            >
              <svg className="mx-auto h-12 w-12 text-slate-600 mb-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              <h3 className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Vault Empty</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                Start adding your sensitive accounts above. All stored secrets are encrypted directly before entering the database.
              </p>
            </div>
          ) : filteredPasswords.length === 0 ? (
            <div className="text-center py-12">
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                No passwords match your search query.
              </p>
            </div>
          ) : (
            <div
              className={`overflow-x-auto rounded-xl border transition-all duration-500 ${
                isDark ? "border-slate-800/60 bg-slate-950/30" : "border-slate-200 bg-white/40 shadow-sm"
              }`}
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className={`${
                      isDark ? "bg-slate-900/80 border-slate-800 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-650"
                    } border-b text-xs uppercase font-bold transition-all duration-500`}
                  >
                    <th className="py-3.5 px-6">Website</th>
                    <th className="py-3.5 px-6">Username / Email</th>
                    <th className="py-3.5 px-6">Secure Password</th>
                    <th className="py-3.5 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-slate-800/50" : "divide-slate-200/60"} text-sm`}>
                  {filteredPasswords.map((item) => {
                    const rowCopyKeySite = `site-${item.id}`;
                    const rowCopyKeyUser = `user-${item.id}`;
                    const rowCopyKeyPass = `pass-${item.id}`;

                    return (
                      <tr
                        key={item.id}
                        className={`${
                          isDark ? "hover:bg-slate-900/30 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                        } transition-all duration-200`}
                      >
                        {/* Site */}
                        <td className="py-4 px-6 font-medium">
                          <div className="flex items-center gap-2">
                            <a
                              href={item.site}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-500 hover:text-emerald-400 hover:dark:text-emerald-350 transition-colors hover:underline truncate max-w-[200px]"
                            >
                              {item.site}
                            </a>
                            <button
                              onClick={() => copytext(item.site, rowCopyKeySite)}
                              className={`${
                                isDark ? "text-slate-500 hover:text-slate-350" : "text-slate-400 hover:text-slate-600"
                              } transition-colors p-1`}
                              title="Copy URL"
                            >
                              {copiedStates[rowCopyKeySite] ? (
                                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Username */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[150px]">{item.username}</span>
                            <button
                              onClick={() => copytext(item.username, rowCopyKeyUser)}
                              className={`${
                                isDark ? "text-slate-500 hover:text-slate-350" : "text-slate-400 hover:text-slate-600"
                              } transition-colors p-1`}
                              title="Copy Username"
                            >
                              {copiedStates[rowCopyKeyUser] ? (
                                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Password */}
                        <td className="py-4 px-6 font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <span className="tracking-widest font-sans text-sm">
                              {visiblePasswords[item.id] ? item.password : "••••••••"}
                            </span>
                            
                            <button
                              onClick={() => toggleRowPassword(item.id)}
                              className={`${
                                isDark ? "text-slate-500 hover:text-slate-355" : "text-slate-400 hover:text-slate-600"
                              } transition-colors p-1`}
                              title={visiblePasswords[item.id] ? "Hide Password" : "Show Password"}
                            >
                              {visiblePasswords[item.id] ? (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>

                            <button
                              onClick={() => copytext(item.password, rowCopyKeyPass)}
                              className={`${
                                isDark ? "text-slate-500 hover:text-slate-355" : "text-slate-400 hover:text-slate-600"
                              } transition-colors p-1`}
                              title="Copy Password"
                            >
                              {copiedStates[rowCopyKeyPass] ? (
                                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-center">
                          <div className="flex justify-center gap-3">
                            {/* Edit */}
                            <button
                              onClick={() => EditPassword(item.id)}
                              className={`${
                                isDark
                                  ? "bg-slate-900 border-slate-800 hover:bg-emerald-500/10 text-slate-450 hover:text-emerald-450"
                                  : "bg-slate-50 border-slate-200 hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-600"
                              } p-2 border rounded-xl transition-all duration-300 active:scale-90`}
                              title="Edit Credentials"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => DeletePassword(item.id)}
                              className={`${
                                isDark
                                  ? "bg-slate-900 border-slate-800 hover:bg-rose-500/10 text-slate-455 hover:text-rose-455"
                                  : "bg-slate-50 border-slate-200 hover:bg-rose-500/10 text-slate-500 hover:text-rose-600"
                              } p-2 border rounded-xl transition-all duration-300 active:scale-90`}
                              title="Delete Credentials"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Manager;
