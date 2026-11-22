import { lazy, Suspense, type ReactNode } from 'react';
import type { GameService } from '../app/gameService';
import type { AdjustableDateService } from '../services/dateService';
import { AppProvider, useApp } from './AppContext';
import { ProfilesScreen } from './screens/ProfilesScreen';
import { HomeScreen } from './screens/HomeScreen';
import { GameScreen } from './screens/GameScreen';
import { FinaleScreen } from './screens/FinaleScreen';
import { AlbumScreen, TreeScreen } from './screens/TreeAndAlbum';
import { ParentsScreen } from './screens/ParentsScreen';

// Udviklerværktøjet indlæses KUN i udvikling/test – fjernes helt fra produktionsbuildet.
const DevPanel = import.meta.env.DEV ? lazy(() => import('../dev/DevPanel')) : null;

function Router() {
  const { screen, activeProfile } = useApp();
  let content: ReactNode;
  if (!activeProfile && screen.name !== 'parents') content = <ProfilesScreen />;
  else
    switch (screen.name) {
      case 'profiles':
        content = <ProfilesScreen />;
        break;
      case 'home':
        content = <HomeScreen />;
        break;
      case 'game':
        content = <GameScreen key={JSON.stringify(screen.target)} target={screen.target} />;
        break;
      case 'finale':
        content = <FinaleScreen key={`${screen.year}-${screen.replay}`} year={screen.year} replay={screen.replay} />;
        break;
      case 'album':
        content = <AlbumScreen />;
        break;
      case 'tree':
        content = <TreeScreen year={screen.year} />;
        break;
      case 'parents':
        content = <ParentsScreen />;
        break;
    }
  return <div className="app-root">{content}</div>;
}

export function App({
  service,
  storageWarning,
  devDates,
}: {
  service: GameService;
  storageWarning?: string;
  devDates?: AdjustableDateService;
}) {
  return (
    <AppProvider service={service} storageWarning={storageWarning}>
      <Router />
      {DevPanel && devDates && (
        <Suspense fallback={null}>
          <DevPanel dates={devDates} />
        </Suspense>
      )}
    </AppProvider>
  );
}
