const { createClient } = require("@supabase/supabase-js");

const rawUrl = process.env.SUPABASE_URL || "";
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";

const isRealUrl = (url) => url && !url.includes("your-supabase-project") && (url.startsWith("http://") || url.startsWith("https://"));
const isRealKey = (key) => key && !key.includes("your-supabase-service-role-key") && !key.includes("your-supabase-key") && key.length > 20;

let supabase = null;
let isConfigured = false;

if (isRealUrl(rawUrl) && isRealKey(rawKey)) {
    try {
        supabase = createClient(rawUrl, rawKey, {
            auth: { persistSession: false },
            global: { fetch: (...args) => fetch(...args) }
        });
        isConfigured = true;
    } catch (err) {
        console.warn("⚠️ Could not initialize Supabase client:", err.message);
    }
}

// In-Memory Database Fallback for local development when Supabase credentials are not set
class LocalMemoryStore {
    constructor() {
        this.tables = {
            users: [],
            candidates: [],
            recruiters: [],
            jobs: [],
            applications: [],
            offers: [],
            messages: [],
            assessments: [],
            assessment_attempts: [],
            resume_chunks: []
        };
    }

    from(tableName) {
        if (!this.tables[tableName]) {
            this.tables[tableName] = [];
        }
        const rows = this.tables[tableName];

        const queryObj = {
            _filters: [],
            _select: '*',
            _order: null,
            _limit: null,

            select(columns = '*') {
                this._select = columns;
                return this;
            },

            eq(column, value) {
                this._filters.push(r => String(r[column]) === String(value));
                return this;
            },

            neq(column, value) {
                this._filters.push(r => String(r[column]) !== String(value));
                return this;
            },

            in(column, values) {
                const set = new Set((values || []).map(String));
                this._filters.push(r => set.has(String(r[column])));
                return this;
            },

            or(filterString) {
                // e.g. "sender_id.eq.123,receiver_id.eq.123"
                return this;
            },

            order(column, { ascending = true } = {}) {
                this._order = { column, ascending };
                return this;
            },

            limit(count) {
                this._limit = count;
                return this;
            },

            async single() {
                const res = await this.exec();
                if (res.error) return res;
                return { data: res.data[0] || null, error: null };
            },

            async maybeSingle() {
                const res = await this.exec();
                if (res.error) return res;
                return { data: res.data[0] || null, error: null };
            },

            async exec() {
                let filtered = [...rows];
                for (const filterFn of this._filters) {
                    filtered = filtered.filter(filterFn);
                }
                if (this._order) {
                    const { column, ascending } = this._order;
                    filtered.sort((a, b) => {
                        if (a[column] < b[column]) return ascending ? -1 : 1;
                        if (a[column] > b[column]) return ascending ? 1 : -1;
                        return 0;
                    });
                }
                if (this._limit) {
                    filtered = filtered.slice(0, this._limit);
                }
                return { data: filtered, error: null };
            },

            async insert(data) {
                const items = Array.isArray(data) ? data : [data];
                const inserted = [];
                for (const item of items) {
                    const row = {
                        id: item.id || require('crypto').randomUUID(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        ...item
                    };
                    rows.push(row);
                    inserted.push(row);
                }
                return { data: Array.isArray(data) ? inserted : inserted[0], error: null };
            },

            async update(updates) {
                let filtered = [...rows];
                for (const filterFn of this._filters) {
                    filtered = filtered.filter(filterFn);
                }
                const updated = [];
                for (const row of filtered) {
                    Object.assign(row, updates, { updated_at: new Date().toISOString() });
                    updated.push(row);
                }
                return { data: updated, error: null };
            },

            async delete() {
                let toRemove = [...rows];
                for (const filterFn of this._filters) {
                    toRemove = toRemove.filter(filterFn);
                }
                for (const row of toRemove) {
                    const idx = rows.indexOf(row);
                    if (idx !== -1) rows.splice(idx, 1);
                }
                return { data: toRemove, error: null };
            },

            then(resolve, reject) {
                return this.exec().then(resolve, reject);
            }
        };

        return queryObj;
    }
}

const localStore = new LocalMemoryStore();

const getClient = () => {
    if (isConfigured && supabase) {
        return supabase;
    }
    return localStore;
};

module.exports = {
    supabase,
    isConfigured,
    getClient,
    localStore
};
