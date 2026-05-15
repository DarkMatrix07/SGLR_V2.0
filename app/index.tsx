import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getRouteForRole, getSession } from '../lib/authRouting';
import { loadThresholds } from '../lib/settings';
import Spinner from '../components/Spinner';

export default function EntryRouter() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    // Warm the threshold cache from app_settings before any screen calls getStars.
    // Falls back to compile-time defaults if the network is unavailable.
    Promise.all([getSession(), loadThresholds()]).then(([session]) => {
      if (!active) return;
      router.replace((session ? getRouteForRole(session.role) : '/login') as never);
    });
    return () => { active = false; };
  }, [router]);

  return <Spinner />;
}
