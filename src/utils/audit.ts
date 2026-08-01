import { db } from '../db';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

interface AuditEntry {
    userId: number;
    action: AuditAction;
    resourceName: string;
    recordId: string | number;
}

// callers never `await` this. 
// and logged locally so a failed audit write can never affect the response
// already being sent to the client.
export function recordAudit(entry: AuditEntry): void {
    db('audit_logs')
        .insert({
            user_id: entry.userId,
            action: entry.action,
            resource_name: entry.resourceName,
            record_id: String(entry.recordId),
            timestamp: db.fn.now(),
        })
        .catch((err) => {
            console.error('Failed to write audit log:', err);
        });
}