import { Github, ShieldCheck, Lock } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto bg-[#0B0E15] border-t border-[#323947]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="grid place-items-center w-7 h-7 rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-corncine-mark.svg" alt="" className="w-full h-full" />
              </span>
              <span className="text-base font-bold text-[#F8FAFC]">CornCine</span>
            </div>
            <p className="text-xs text-[#949AA5] leading-relaxed max-w-sm">
              Client-side link parsing and media indexing. No media files are hosted on CornCine
              servers — all resolution happens in your browser or through local native binaries.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#949AA5]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#6AB27A]" />
              <span>Zero ads • Zero tracking • GPLv3</span>
            </div>
          </div>

          {/* Project links */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#949AA5]">Project</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="https://github.com/pcli-bot/pcli" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#B3B7C1] hover:text-[#EC69AE] spring-transition">
                  <Github className="w-3.5 h-3.5" /> Source on GitHub
                </a>
              </li>
              <li><a href="https://github.com/pcli-bot/pcli/blob/main/LICENSE" target="_blank" rel="noreferrer" className="text-[#B3B7C1] hover:text-[#EC69AE] spring-transition">License (GPLv3)</a></li>
              <li><a href="https://github.com/pcli-bot/pcli/issues" target="_blank" rel="noreferrer" className="text-[#B3B7C1] hover:text-[#EC69AE] spring-transition">Report an Issue</a></li>
              <li><a href="https://github.com/fmhy/FMHY" target="_blank" rel="noreferrer" className="text-[#B3B7C1] hover:text-[#EC69AE] spring-transition">FMHY Provider Wiki</a></li>
              <li>
                <a href="/mcp" className="inline-flex items-center gap-1.5 text-[#B3B7C1] hover:text-red-400 spring-transition">
                  <Lock className="w-3 h-3" /> MCP for AI Agents <span className="text-[10px] font-bold text-red-400">18+</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Legal / compliance */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#949AA5]">Legal</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="/dmca" className="text-[#B3B7C1] hover:text-[#EC69AE] spring-transition">DMCA / Takedown</a></li>
              <li><a href="/2257" className="text-[#B3B7C1] hover:text-[#EC69AE] spring-transition">2257 Compliance</a></li>
              <li><a href="/csam-policy" className="text-[#B3B7C1] hover:text-[#EF4444] spring-transition">CSAM Policy</a></li>
              <li><a href="/dsa-policy" className="text-[#B3B7C1] hover:text-[#EC69AE] spring-transition">DSA Contact</a></li>
              <li><a href="/cookies-policy" className="text-[#B3B7C1] hover:text-[#EC69AE] spring-transition">Cookies Policy</a></li>
              <li><a href="/terms-of-service" className="text-[#B3B7C1] hover:text-[#EC69AE] spring-transition">Terms of Service</a></li>
              <li><a href="/privacy-policy" className="text-[#B3B7C1] hover:text-[#EC69AE] spring-transition">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Directory */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#949AA5]">Directory</h4>
            <ul className="grid grid-cols-2 gap-2 text-xs">
              <li><a href="?q=Interstellar" className="text-[#B3B7C1] hover:text-[#EC69AE] spring-transition">Free Movies</a></li>
              <li><a href="?q=One+Piece&mode=anime" className="text-[#B3B7C1] hover:text-[#6AB27A] spring-transition">Anime Stream</a></li>
              <li><a href="#desktop-apps" className="text-[#B3B7C1] hover:text-[#EC69AE] spring-transition">Desktop App</a></li>
              <li><a href="#faq-section" className="text-[#B3B7C1] hover:text-[#EC69AE] spring-transition">FAQ</a></li>
              <li><a href="#directory-hub" className="text-[#B3B7C1] hover:text-[#EC69AE] spring-transition">Site Index</a></li>
              <li><a href="https://corncine.pages.dev/sitemap.xml" className="text-[#B3B7C1] hover:text-[#EC69AE] spring-transition">Sitemap</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#323947] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#949AA5]">
          <p>© {new Date().getFullYear()} CornCine open source collective. Built for the open web.</p>
          <p className="font-mono">v2.6.0 • 1,896+ providers indexed</p>
        </div>
      </div>
    </footer>
  );
}
