// Discriminated union for checklist responses, keyed by input_type
export type NegativeKey = 'single_pit' | 'septic_tank' | 'offsite_stp' | 'onsite_stp';

export type YesNoResponse = { answer: 'yes' | 'no' | 'manual'; marks: number };
export type SingleSelectResponse = { selected: number; marks: number };
export type NegativeSelectResponse = { selected: NegativeKey; subScore?: number; marks: number };
export type NumericalResponse = { score: number; marks: number };
export type ChecklistResponse = YesNoResponse | SingleSelectResponse | NegativeSelectResponse | NumericalResponse;

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
    responses: Record<string, ChecklistResponse>;
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
