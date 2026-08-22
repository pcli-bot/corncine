import { AnicineProviders } from "@/components/anicine/providers";
import { Header } from "@/components/anicine/header";
import { HeroSearch } from "@/components/anicine/hero-search";
import { CatalogBrowser } from "@/components/anicine/catalog-browser";
import { LeakBrowser } from "@/components/anicine/leak-browser";
import { ContinueWatching } from "@/components/anicine/continue-watching";
import { DesktopApps } from "@/components/anicine/desktop-apps";
import { KnowledgeBase } from "@/components/anicine/knowledge-base";
import { Footer } from "@/components/anicine/footer";
import { DownloadsDrawer } from "@/components/anicine/downloads-drawer";
import { PlayerModal } from "@/components/anicine/player-modal";
import { CommandPalette } from "@/components/anicine/command-palette";

export default function Home() {
  return (
    <AnicineProviders>
      {/* Sticky-footer flex shell: min-h-screen + flex-col on body (layout.tsx),
          <main> grows with flex-grow, footer uses mt-auto. */}
      <Header />
      <main className="flex-grow flex flex-col">
        <HeroSearch />
        <ContinueWatching />
        <CatalogBrowser />
        <LeakBrowser />
        <DesktopApps />
        <KnowledgeBase />
      </main>
      <Footer />

      {/* Overlays */}
      <DownloadsDrawer />
      <PlayerModal />
      <CommandPalette />
    </AnicineProviders>
  );
}
