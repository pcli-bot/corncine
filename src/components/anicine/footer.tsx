import { Github, ShieldCheck, Zap } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto bg-[#0B0F17] border-t border-[#1E2A3C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="grid place-items-center w-7 h-7 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#06B6D4]">
                <Zap className="w-4 h-4 text-white" />
              </span>
              <span className="text-base font-bold text-[#F8FAFC]">CornCine</span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed max-w-sm">
              Client-side link parsing and media indexing. No media files are hosted on CornCine
              servers — all resolution happens in your browser or through local native binaries.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Zero ads • Zero tracking • GPLv3</span>
            </div>
          </div>

          {/* Project links */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#64748B]">Project</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="https://github.com/pcli-bot/pcli" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#94A3B8] hover:text-[#3B82F6] spring-transition">
                  <Github className="w-3.5 h-3.5" /> Source on GitHub
                </a>
              </li>
              <li><a href="https://github.com/pcli-bot/pcli/blob/main/LICENSE" target="_blank" rel="noreferrer" className="text-[#94A3B8] hover:text-[#3B82F6] spring-transition">License (GPLv3)</a></li>
              <li><a href="https://github.com/pcli-bot/pcli/issues" target="_blank" rel="noreferrer" className="text-[#94A3B8] hover:text-[#3B82F6] spring-transition">Report an Issue</a></li>
              <li><a href="https://github.com/fmhy/FMHY" target="_blank" rel="noreferrer" className="text-[#94A3B8] hover:text-[#3B82F6] spring-transition">FMHY Provider Wiki</a></li>
            </ul>
          </div>

          {/* Legal / compliance */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#64748B]">Legal</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="/dmca" className="text-[#94A3B8] hover:text-[#3B82F6] spring-transition">DMCA / Takedown</a></li>
              <li><a href="/2257" className="text-[#94A3B8] hover:text-[#3B82F6] spring-transition">2257 Compliance</a></li>
              <li><a href="/csam-policy" className="text-[#94A3B8] hover:text-[#EF4444] spring-transition">CSAM Policy</a></li>
              <li><a href="/dsa-policy" className="text-[#94A3B8] hover:text-[#3B82F6] spring-transition">DSA Contact</a></li>
              <li><a href="/cookies-policy" className="text-[#94A3B8] hover:text-[#3B82F6] spring-transition">Cookies Policy</a></li>
              <li><a href="/terms-of-service" className="text-[#94A3B8] hover:text-[#3B82F6] spring-transition">Terms of Service</a></li>
              <li><a href="/privacy-policy" className="text-[#94A3B8] hover:text-[#3B82F6] spring-transition">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Directory */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#64748B]">Directory</h4>
            <ul className="grid grid-cols-2 gap-2 text-xs">
              <li><a href="?q=Interstellar" className="text-[#94A3B8] hover:text-[#3B82F6] spring-transition">Free Movies</a></li>
              <li><a href="?q=One+Piece&mode=anime" className="text-[#94A3B8] hover:text-[#10B981] spring-transition">Anime Stream</a></li>
              <li><a href="#desktop-apps" className="text-[#94A3B8] hover:text-[#3B82F6] spring-transition">Desktop App</a></li>
              <li><a href="#faq-section" className="text-[#94A3B8] hover:text-[#3B82F6] spring-transition">FAQ</a></li>
              <li><a href="#directory-hub" className="text-[#94A3B8] hover:text-[#3B82F6] spring-transition">Site Index</a></li>
              <li><a href="https://corncine.pages.dev/sitemap.xml" className="text-[#94A3B8] hover:text-[#3B82F6] spring-transition">Sitemap</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#1E2A3C] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#64748B]">
          <p>© {new Date().getFullYear()} CornCine open source collective. Built for the open web.</p>
          <p className="font-mono">v2.6.0 • 1,896+ providers indexed</p>
        </div>
      </div>
    </footer>
  );
}
