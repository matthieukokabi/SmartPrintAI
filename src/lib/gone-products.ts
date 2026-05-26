/**
 * Product IDs that should serve HTTP 410 Gone instead of the standard
 * blocked-Gooten 308 → /products redirect.
 *
 * These are products that Google Search Console captured in its
 * "Not found (404)" indexing bucket BEFORE the blocked-Gooten safety
 * filter shipped (7a512af). They're still active=true in the DB but
 * effectively unreachable via the storefront. Serving 410 explicitly
 * signals permanent removal so Google drops them from re-validation
 * attempts.
 *
 * Source: GSC Indexation des pages > Introuvable (404) validation
 *   cycle 2026-04-26 → failed 2026-05-23. Cowork extract 2026-05-26.
 *
 * Process for adding new IDs here: if GSC flags additional stale URLs
 * in a future validation cycle AND those URLs map to blocked-Gooten
 * products, add the ID here.
 */
export const GONE_PRODUCT_IDS = new Set<string>([
    'cmmtjqrq4000lqwl2uabumkdw', // Stainless Steel Travel Mugs (gooten:408)
    'cmmtjreet000oqwl2x138srq7', // Klean Kanteen TKWide (gooten:390)
    'cmmtjnf3f0006qwl2outzyuu1', // All-Over Print Pullover Hoodies (gooten:280)
    'cmmtjrkl8000pqwl2sgjrhftq', // Klean Kanteen Eco Insulated (gooten:388)
])
