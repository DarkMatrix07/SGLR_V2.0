import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { AppRole, getRouteForRole, getSession } from '../lib/authRouting';
import Spinner from './Spinner';

type Props = {
    role: AppRole;
    children: ReactNode;
};

/**
 * Guards a route group so only sessions with the given role can render its children.
 * Redirects to /login if no session, or to the other role's home if the role mismatches.
 */
export default function RoleGate({ role, children }: Props) {
    const router = useRouter();
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        let active = true;
        getSession().then((session) => {
            if (!active) return;
            if (!session) {
                router.replace('/login');
                return;
            }
            if (session.role !== role) {
                router.replace(getRouteForRole(session.role) as never);
                return;
            }
            setAllowed(true);
        });
        return () => { active = false; };
    }, [router, role]);

    if (!allowed) return <Spinner />;
    return <>{children}</>;
}
