import React from "react";

const Footer = () => {
  return (
    <footer className="bg-slate-950/80 backdrop-blur-md border-t border-slate-900/80 text-slate-400 py-8 px-6 lg:px-8 mt-12 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-1">
          <span className="text-emerald-500 font-mono text-xl font-bold">&lt;</span>
          <span className="text-white font-sans font-bold">Pass</span>
          <span className="text-emerald-500 font-sans font-bold">OP</span>
          <span className="text-emerald-500 font-mono text-xl font-bold">/&gt;</span>
          <span className="text-xs text-slate-500 ml-2">© 2026. All Rights Reserved.</span>
        </div>

        {/* Info */}
        <div className="flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            AES-256 Protected Vault
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Zero-Knowledge Storage
          </span>
        </div>

        {/* Footer links */}
        <div className="flex gap-4 text-xs font-medium text-slate-500 hover:text-slate-400">
          <a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
