import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getRouteForRole, getSession } from '../lib/authRouting';
import Spinner from '../components/Spinner';

export default function EntryRouter() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    getSession().then((session) => {
      if (!active) return;
      router.replace((session ? getRouteForRole(session.role) : '/login') as never);
    });
    return () => { active = false; };
  }, [router]);

  return <Spinner />;
}
