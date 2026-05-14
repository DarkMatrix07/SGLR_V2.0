import { getSession } from './authRouting';
import { supabase } from './supabase';

export type AuditAction =
    | 'create_officer' | 'update_officer' | 'deactivate_officer' | 'reset_pin'
    | 'create_resort' | 'update_resort' | 'deactivate_resort'
    | 'create_checklist_item' | 'update_checklist_item' | 'delete_checklist_item'
    | 'update_settings'
    | 'approve_inspection' | 'reject_inspection' | 'unfreeze_inspection';

export type EntityType = 'officer' | 'resort' | 'checklist_item' | 'inspection' | 'settings';

export async function logAudit(
    action: AuditAction,
    entityType: EntityType,
    entityId: string | null,
    details?: Record<string, any>,
) {
    const session = await getSession();
    if (!session) return;
    await supabase.from('audit_logs').insert({
        actor_officer_id: session.officerId,
        actor_name: session.name ?? session.phone,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: details ?? null,
    });
}
