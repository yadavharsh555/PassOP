import React from "react";

const Navbar = ({ user, onLogout, theme, onToggleTheme }) => {
  const isDark = theme === "dark";

  return (
    <nav
      className={`${
        isDark
          ? "bg-slate-900/70 border-slate-800/60 text-white"
          : "bg-white/75 border-slate-250/60 text-slate-800 shadow-sm"
      } backdrop-blur-md border-b sticky top-0 z-50 transition-all duration-500`}
    >
      <div className="max-w-7xl mx-auto flex h-16 px-6 lg:px-8 justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-1 cursor-pointer">
          <span className="text-emerald-500 font-mono text-2xl font-bold">&lt;</span>
          <div className="w-10 h-10 flex justify-center items-center overflow-hidden rounded-lg">
            <img
              className="w-8 h-8 object-contain"
              src="/wired-outline-946-equity-security-hover-locked-new3.gif"
              alt="PassOP Security Logo"
            />
          </div>
          <span
            className={`${
              isDark ? "text-white" : "text-slate-800"
            } font-sans text-xl font-bold transition-colors duration-500`}
          >
            Pass
          </span>
          <span className="text-emerald-500 font-sans text-xl font-bold">OP</span>
          <span className="text-emerald-500 font-mono text-2xl font-bold">/&gt;</span>
        </div>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-3">
          {/* GitHub Link */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`${
              isDark
                ? "text-slate-300 hover:text-white bg-slate-950/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                : "text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200 hover:border-slate-300"
            } border rounded-xl px-4 py-1.5 flex items-center gap-2 transition-all duration-300 group shadow-sm`}
          >
            <img
              className={`w-5 h-5 transition-opacity ${
                isDark ? "opacity-80 group-hover:opacity-100" : "opacity-70 group-hover:opacity-90 dark-svg-icon"
              }`}
              src="/github.svg"
              alt="GitHub"
              style={!isDark ? { filter: "invert(0.1)" } : {}}
            />
            <span className="font-semibold text-xs tracking-wide">GitHub</span>
          </a>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className={`${
              isDark
                ? "bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-amber-400"
                : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-indigo-600"
            } border rounded-xl p-2 transition-all duration-300 active:scale-90 shadow-sm`}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? (
              // Sun Icon for Light Mode transition
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m2.828 0l-.707-.707m12.02-12.02l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
                />
              </svg>
            ) : (
              // Moon Icon for Dark Mode transition
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          {/* User Welcome & Logout */}
          {user && (
            <div
              className={`flex items-center gap-3 border-l ${
                isDark ? "border-slate-800" : "border-slate-200"
              } pl-3`}
            >
              <div className="flex flex-col text-right hidden sm:flex">
                <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Welcome,</span>
                <span
                  className={`text-xs font-semibold ${
                    isDark ? "text-slate-200" : "text-slate-700"
                  } transition-colors duration-500`}
                >
                  {user.username}
                </span>
              </div>

              <button
                onClick={onLogout}
                className="text-xs font-semibold px-4 py-2 border border-rose-950/20 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all duration-300 active:scale-95 shadow-sm"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
