import { supabase } from './supabase';

export type Thresholds = {
    five_star: number;
    four_star: number;
    three_star: number;
    two_star: number;
};

export const DEFAULT_THRESHOLDS: Thresholds = {
    five_star: 170,
    four_star: 130,
    three_star: 90,
    two_star: 50,
};

// Module-level cache. Read synchronously by getStars; refreshed via loadThresholds().
let thresholdsCache: Thresholds = DEFAULT_THRESHOLDS;

export function getThresholdsSync(): Thresholds {
    return thresholdsCache;
}

/**
 * Fetch the latest thresholds from app_settings and update the in-memory cache.
 * Called once on app start (entry route) and again after admin saves new values.
 * Silently falls back to defaults if the row doesn't exist or the network call fails.
 */
export async function loadThresholds(): Promise<Thresholds> {
    try {
        const { data } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'rating_thresholds')
            .maybeSingle();
        if (data?.value) {
            const v = data.value as Partial<Thresholds>;
            thresholdsCache = {
                five_star: v.five_star ?? DEFAULT_THRESHOLDS.five_star,
                four_star: v.four_star ?? DEFAULT_THRESHOLDS.four_star,
                three_star: v.three_star ?? DEFAULT_THRESHOLDS.three_star,
                two_star: v.two_star ?? DEFAULT_THRESHOLDS.two_star,
            };
        }
    } catch {
        // keep cache as-is on failure
    }
    return thresholdsCache;
}
