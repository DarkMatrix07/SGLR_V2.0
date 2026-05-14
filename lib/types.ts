export type Resort = {
    id: string;
    serial_no: number;
    name: string;
    area: string;
    owner_name: string | null;
    owner_phone: string | null;
    room_count: number | null;
    is_active: boolean;
};

export type InspectionStatus = 'pending' | 'approved' | 'rejected';

export type Inspection = {
    id: string;
    resort_id: string;
    officer_id: string | null;
    responses: Record<string, any>;
    total_score: number;
    stars: number;
    status: InspectionStatus;
    district_comments: string | null;
    reviewed_at: string | null;
    reviewed_by: string | null;
    created_at: string;
};

export type InspectionWithReviewer = Inspection & {
    reviewer?: { name: string | null } | null;
};

export type InspectionWithResort = Inspection & {
    resort: Pick<Resort, 'name' | 'serial_no' | 'area'>;
};
