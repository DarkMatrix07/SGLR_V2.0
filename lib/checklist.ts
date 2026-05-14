export type ChecklistItem = {
    id: string;
    category: string;
    subcategory: string;
    label: string;
    description: string | null;
    input_type: string;
    min_marks: number;
    max_marks: number;
    options: any[] | null;
    visibility_condition: any | null;
    sort_order?: number;
};

export type Responses = Record<string, any>;

export const CATEGORY_LABELS_FULL: Record<string, string> = {
    A: 'A. Faecal Sludge Management (80 Marks)',
    B: 'B. Solid Waste Management (80 Marks)',
    C: 'C. Grey Water Management (40 Marks)',
};

export const CATEGORY_LABELS: Record<string, string> = {
    A: 'A. Faecal Sludge Management',
    B: 'B. Solid Waste Management',
    C: 'C. Grey Water Management',
};

export const SUB_LABELS: Record<string, string> = {
    infrastructure: 'Infrastructure',
    practices: 'Practices',
    awareness: 'Awareness Generation',
    innovations: 'Innovations',
};

export const NEGATIVE_KEYS = ['single_pit', 'septic_tank', 'offsite_stp', 'onsite_stp'];

export const NEGATIVE_LABELS: Record<string, string> = {
    single_pit: 'Single-pit toilet',
    septic_tank: 'Septic tank',
    offsite_stp: 'Off-site STP via sewer',
    onsite_stp: 'On-site decentralised STP',
};

export const CATEGORIES = ['A', 'B', 'C'] as const;
export const SUBCATEGORIES = ['infrastructure', 'practices', 'awareness', 'innovations'] as const;

export function isVisible(item: ChecklistItem, responses: Responses): boolean {
    if (!item.visibility_condition) return true;
    const { dependsOn, showWhen } = item.visibility_condition;
    const parent = responses?.[dependsOn];
    if (!parent) return false;
    return parent.selected === showWhen;
}

export function getStars(score: number): number {
    if (score >= 170) return 5;
    if (score >= 130) return 4;
    if (score >= 90) return 3;
    if (score >= 50) return 2;
    return 1;
}

export function getStarLabel(stars: number): string {
    if (stars === 5) return 'Excellent';
    if (stars === 4) return 'Good';
    if (stars === 3) return 'Average';
    if (stars === 2) return 'Below Average';
    return 'Poor';
}

export function getScoreColor(score: number): string {
    if (score >= 130) return '#2ECC71';
    if (score >= 90) return '#F4A423';
    if (score >= 50) return '#FF6B35';
    return '#E63946';
}

export function getStatusColor(status: string): string {
    if (status === 'approved') return '#2ECC71';
    if (status === 'pending') return '#F4A423';
    if (status === 'rejected') return '#E63946';
    return '#8A9BAE';
}

export function getAnswerText(item: ChecklistItem, response: any): string {
    if (!response) return 'Not answered';
    if (item.input_type === 'yes_no') {
        if (response.answer === 'yes') return `Yes (${response.marks})`;
        if (response.answer === 'no') return 'No (0)';
        if (response.answer === 'manual') return `Manual: ${response.marks}`;
    }
    if (item.input_type === 'single_select') {
        const opt = item.options?.[response.selected];
        return opt ? `${opt.label} (${response.marks})` : 'Not answered';
    }
    if (item.input_type === 'negative_select') {
        const label = NEGATIVE_LABELS[response.selected] || response.selected;
        return `${label} (${response.marks})`;
    }
    if (item.input_type === 'numerical') {
        return `${response.score} / ${item.max_marks}`;
    }
    return 'Not answered';
}

export function getCategoryScore(items: ChecklistItem[], responses: Responses, category: string): number {
    return items
        .filter(i => i.category === category && isVisible(i, responses))
        .reduce((sum, i) => sum + (responses[i.id]?.marks || 0), 0);
}

export function getTotalScore(items: ChecklistItem[], responses: Responses): number {
    return items
        .filter(i => isVisible(i, responses))
        .reduce((sum, i) => sum + (responses[i.id]?.marks || 0), 0);
}
