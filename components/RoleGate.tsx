import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { AppRole, getRouteForRole, getSession } from '../lib/authRouting';
import Spinner from './Spinner';

type Props = {
    role: AppRole | AppRole[];
    children: ReactNode;
};

/**
 * Guards a route group so only sessions with one of the given roles can render its children.
 * Redirects to /login if no session, or to the session's home if the role mismatches.
 */
export default function RoleGate({ role, children }: Props) {
    const router = useRouter();
    const [allowed, setAllowed] = useState(false);
    const allowedRoles = Array.isArray(role) ? role : [role];

    useEffect(() => {
        let active = true;
        getSession().then((session) => {
            if (!active) return;
            if (!session) {
                router.replace('/login');
                return;
            }
            if (!allowedRoles.includes(session.role)) {
                router.replace(getRouteForRole(session.role) as never);
                return;
            }
            setAllowed(true);
        });
        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router, allowedRoles.join(',')]);

    if (!allowed) return <Spinner />;
    return <>{children}</>;
}
