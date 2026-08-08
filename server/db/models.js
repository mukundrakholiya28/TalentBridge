const { getClient } = require("./supabaseClient");
const crypto = require("crypto");

// Convert snake_case DB row to camelCase JS object
function toCamelCase(row, model) {
    if (!row || typeof row !== "object") return row;
    if (Array.isArray(row)) return row.map(r => toCamelCase(r, model));

    const obj = {};
    for (const key of Object.keys(row)) {
        if (key === "save" || typeof row[key] === "function") continue;
        const camelKey = key.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
        obj[camelKey] = row[key];
    }

    // Ensure both _id and id are accessible for Mongoose compatibility
    if (obj.id && !obj._id) {
        obj._id = obj.id;
    } else if (obj._id && !obj.id) {
        obj.id = obj._id;
    }

    if (obj.googleData && !obj.google) {
        obj.google = obj.googleData;
    } else if (obj.google && !obj.googleData) {
        obj.googleData = obj.google;
    }

    if (model && (obj.id || obj._id)) {
        Object.defineProperty(obj, "toObject", {
            value: function() {
                const copy = { ...this };
                return copy;
            },
            writable: true,
            configurable: true,
            enumerable: false
        });

        Object.defineProperty(obj, "save", {
            value: async function() {
                const targetId = this.id || this._id;
                let updated = await model.findByIdAndUpdate(targetId, this);
                if (!updated) {
                    updated = await model.create(this);
                }
                if (updated) {
                    Object.assign(this, updated);
                }
                return this;
            },
            writable: true,
            configurable: true,
            enumerable: false
        });
    }

    return obj;
}

// Convert camelCase JS object to snake_case DB object
function toSnakeCase(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(toSnakeCase);

    const row = {};
    for (const key of Object.keys(obj)) {
        if (key === "_id" || key === "save" || typeof obj[key] === "function") continue;
        let snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (snakeKey === "google") {
            snakeKey = "google_data";
        }
        row[snakeKey] = obj[key];
    }
    return row;
}

const QUERY_TIMEOUT_MS = 10000; // 10s for Vercel cold starts

const withTimeout = (promise, ms = QUERY_TIMEOUT_MS) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Supabase Query Timeout")), ms))
    ]);
};

/**
 * Convert a MongoDB-style $or query into a Supabase .or() filter string.
 * E.g. $or: [{ email: "a" }, { username: "b" }] → "email.eq.a,username.eq.b"
 */
function buildOrFilter(orArray) {
    if (!Array.isArray(orArray) || !orArray.length) return null;
    const parts = [];
    for (const condition of orArray) {
        const snake = toSnakeCase(condition);
        for (const [key, value] of Object.entries(snake)) {
            if (value !== undefined && value !== null) {
                parts.push(`${key}.eq.${value}`);
            }
        }
    }
    return parts.length ? parts.join(",") : null;
}

function createQueryPromise(asyncFn, model) {
    const promise = (async () => {
        return await asyncFn();
    })();

    promise.sort = function(sortObj) {
        return createQueryPromise(async () => {
            const results = await promise;
            if (!Array.isArray(results)) return results;
            const items = [...results];
            if (typeof sortObj === 'string') {
                const desc = sortObj.startsWith('-');
                const field = desc ? sortObj.slice(1) : sortObj;
                items.sort((a, b) => {
                    const valA = a[field] ?? '';
                    const valB = b[field] ?? '';
                    if (valA < valB) return desc ? 1 : -1;
                    if (valA > valB) return desc ? -1 : 1;
                    return 0;
                });
            } else if (typeof sortObj === 'object' && sortObj !== null) {
                const entries = Object.entries(sortObj);
                items.sort((a, b) => {
                    for (const [key, dir] of entries) {
                        const valA = a[key] ?? '';
                        const valB = b[key] ?? '';
                        const isDesc = dir === -1 || dir === 'desc' || dir === 'descending';
                        if (valA < valB) return isDesc ? 1 : -1;
                        if (valA > valB) return isDesc ? -1 : 1;
                    }
                    return 0;
                });
            }
            return items;
        }, model);
    };

    promise.populate = function(path, select) {
        return createQueryPromise(async () => {
            const results = await promise;
            const { populate } = require("../utils/mongooseCompat");
            return await populate(results, typeof path === 'object' ? path : { path, select });
        }, model);
    };

    promise.select = function(fields) {
        return createQueryPromise(async () => {
            const result = await promise;
            if (!result) return result;
            if (typeof fields === 'string' && fields.startsWith('-')) {
                const excluded = fields.slice(1).split(' ');
                if (Array.isArray(result)) {
                    return result.map(item => {
                        const copy = typeof item?.toObject === 'function' ? item.toObject() : { ...item };
                        excluded.forEach(f => delete copy[f]);
                        return copy;
                    });
                } else if (typeof result === 'object') {
                    const copy = typeof result?.toObject === 'function' ? result.toObject() : { ...result };
                    excluded.forEach(f => delete copy[f]);
                    return copy;
                }
            }
            return result;
        }, model);
    };

    promise.lean = function() {
        return promise;
    };

    promise.exec = function() {
        return promise;
    };

    return promise;
}

// Base Supabase Model Class
class SupabaseModel {
    constructor(tableName) {
        this.tableName = tableName;
    }

    get client() {
        return getClient();
    }

    find(query = {}) {
        return createQueryPromise(async () => {
            let q = this.client.from(this.tableName).select("*");
            const snakeQuery = toSnakeCase(query);

            // Handle $or queries (MongoDB compat)
            if (query.$or) {
                const orFilter = buildOrFilter(query.$or);
                if (orFilter) {
                    q = q.or(orFilter);
                }
                delete snakeQuery.$or;
            }

            for (const [key, value] of Object.entries(snakeQuery)) {
                if (key.startsWith("$")) continue;
                if (value !== undefined && value !== null) {
                    if (typeof value === "object" && !Array.isArray(value)) {
                        if (value.$ne !== undefined) q = q.neq(key, value.$ne);
                        if (value.$in !== undefined) q = q.in(key, value.$in);
                    } else {
                        q = q.eq(key, value);
                    }
                }
            }

            const { data, error } = await withTimeout(q);
            if (error) {
                console.error(`❌ Supabase query error for ${this.tableName}:`, error.message);
                throw new Error(error.message);
            }
            return (data || []).map(r => toCamelCase(r, this));
        }, this);
    }

    findOne(query = {}) {
        return createQueryPromise(async () => {
            const results = await this.find(query);
            return results[0] || null;
        }, this);
    }

    findById(id) {
        return createQueryPromise(async () => {
            if (!id) return null;
            const targetId = typeof id === 'object' ? (id.id || id._id) : String(id);
            if (!targetId) return null;
            const results = await this.find({ id: String(targetId) });
            return results[0] || null;
        }, this);
    }

    async create(data) {
        const rowData = toSnakeCase(data);
        if (!rowData.id) {
            rowData.id = crypto.randomUUID();
        }

        const { data: inserted, error } = await withTimeout(
            this.client.from(this.tableName).insert(rowData).select()
        );
        if (error) {
            console.error(`❌ Supabase create error for ${this.tableName}:`, error.message);
            throw new Error(error.message);
        }
        const result = Array.isArray(inserted) ? inserted[0] : inserted;
        return toCamelCase(result || rowData, this);
    }

    async findByIdAndUpdate(id, updates, options = { new: true }) {
        if (!id) return null;
        const rowUpdates = toSnakeCase(updates.$set || updates);
        delete rowUpdates.id;

        const { data, error } = await withTimeout(
            this.client
                .from(this.tableName)
                .update(rowUpdates)
                .eq("id", String(id))
                .select()
        );
        if (error) {
            console.error(`❌ Supabase update error for ${this.tableName}:`, error.message);
            throw new Error(error.message);
        }
        const result = Array.isArray(data) ? data[0] : data;
        return toCamelCase(result, this);
    }

    async findOneAndUpdate(query, updates, options = { new: true, upsert: false }) {
        let existing = await this.findOne(query);

        if (!existing) {
            if (options.upsert) {
                const createData = { ...query, ...(updates.$set || updates) };
                return this.create(createData);
            }
            return null;
        }

        return this.findByIdAndUpdate(existing.id, updates, options);
    }

    async findByIdAndDelete(id) {
        if (!id) return null;
        const target = await this.findById(id);
        if (!target) return null;

        const { error } = await withTimeout(
            this.client
                .from(this.tableName)
                .delete()
                .eq("id", String(id))
        );
        if (error) {
            console.error(`❌ Supabase delete error for ${this.tableName}:`, error.message);
            throw new Error(error.message);
        }
        return target;
    }

    async deleteOne(query = {}) {
        const item = await this.findOne(query);
        if (item && (item.id || item._id)) {
            return this.findByIdAndDelete(item.id || item._id);
        }
        return null;
    }

    async countDocuments(query = {}) {
        const items = await this.find(query);
        return items.length;
    }

    async deleteMany(query = {}) {
        const items = await this.find(query);
        for (const item of items) {
            if (item.id) {
                await this.findByIdAndDelete(item.id);
            }
        }
        return { deletedCount: items.length };
    }
}

// Factory function to create models that work both via static methods (User.findOne) and constructors (new User({...}).save())
function createModelConstructor(tableName) {
    const rawModel = new SupabaseModel(tableName);

    function ModelInstance(initialData = {}) {
        Object.assign(this, toCamelCase(initialData));

        this.toObject = function() {
            const copy = { ...this };
            delete copy.save;
            delete copy.toObject;
            return copy;
        };

        this.save = async () => {
            const dataToSave = this.toObject();

            if (dataToSave.id || dataToSave._id) {
                const id = dataToSave.id || dataToSave._id;
                let updated = await rawModel.findByIdAndUpdate(id, dataToSave);
                if (!updated) {
                    updated = await rawModel.create(dataToSave);
                }
                Object.assign(this, updated);
                return this;
            } else {
                const created = await rawModel.create(dataToSave);
                Object.assign(this, created);
                return this;
            }
        };
    }

    // Attach all SupabaseModel static methods directly onto the constructor function
    ModelInstance.tableName = tableName;
    ModelInstance.find = (...args) => rawModel.find(...args);
    ModelInstance.findOne = (...args) => rawModel.findOne(...args);
    ModelInstance.findById = (...args) => rawModel.findById(...args);
    ModelInstance.create = (...args) => rawModel.create(...args);
    ModelInstance.findByIdAndUpdate = (...args) => rawModel.findByIdAndUpdate(...args);
    ModelInstance.findOneAndUpdate = (...args) => rawModel.findOneAndUpdate(...args);
    ModelInstance.findByIdAndDelete = (...args) => rawModel.findByIdAndDelete(...args);
    ModelInstance.deleteOne = (...args) => rawModel.deleteOne(...args);
    ModelInstance.countDocuments = (...args) => rawModel.countDocuments(...args);
    ModelInstance.deleteMany = (...args) => rawModel.deleteMany(...args);

    return ModelInstance;
}

// Export Constructor Models
const User = createModelConstructor("users");
const Candidate = createModelConstructor("candidates");
const Recruiter = createModelConstructor("recruiters");
const Job = createModelConstructor("jobs");
const Application = createModelConstructor("applications");
const Offer = createModelConstructor("offers");
const Message = createModelConstructor("messages");
const Assessment = createModelConstructor("assessments");
const AssessmentAttempt = createModelConstructor("assessment_attempts");
const ResumeChunk = createModelConstructor("resume_chunks");

module.exports = {
    User,
    Candidate,
    Recruiter,
    Job,
    Application,
    Offer,
    Message,
    Assessment,
    AssessmentAttempt,
    ResumeChunk,
    toCamelCase,
    toSnakeCase
};
