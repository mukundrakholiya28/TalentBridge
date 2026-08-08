const { getClient } = require("./supabaseClient");
const crypto = require("crypto");

// Convert snake_case DB row to camelCase JS object
function toCamelCase(row) {
    if (!row || typeof row !== "object") return row;
    if (Array.isArray(row)) return row.map(toCamelCase);

    const obj = {};
    for (const key of Object.keys(row)) {
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

    return obj;
}

// Convert camelCase JS object to snake_case DB object
function toSnakeCase(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(toSnakeCase);

    const row = {};
    for (const key of Object.keys(obj)) {
        if (key === "_id") continue;
        let snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (snakeKey === "google") {
            snakeKey = "google_data";
        }
        row[snakeKey] = obj[key];
    }
    return row;
}

// Base Supabase Model Class
class SupabaseModel {
    constructor(tableName) {
        this.tableName = tableName;
    }

    get client() {
        return getClient();
    }

    async find(query = {}) {
        let q = this.client.from(this.tableName).select("*");
        const snakeQuery = toSnakeCase(query);

        for (const [key, value] of Object.entries(snakeQuery)) {
            if (value !== undefined && value !== null) {
                if (typeof value === "object" && !Array.isArray(value)) {
                    if (value.$ne !== undefined) q = q.neq(key, value.$ne);
                    if (value.$in !== undefined) q = q.in(key, value.$in);
                } else {
                    q = q.eq(key, value);
                }
            }
        }

        const { data, error } = await q;
        if (error) throw new Error(error.message);
        return (data || []).map(toCamelCase);
    }

    async findOne(query = {}) {
        const results = await this.find(query);
        return results[0] || null;
    }

    async findById(id) {
        if (!id) return null;
        return this.findOne({ id: String(id) });
    }

    async create(data) {
        const rowData = toSnakeCase(data);
        if (!rowData.id) {
            rowData.id = crypto.randomUUID();
        }

        const { data: inserted, error } = await this.client
            .from(this.tableName)
            .insert(rowData)
            .select();

        if (error) throw new Error(error.message);
        const result = Array.isArray(inserted) ? inserted[0] : inserted;
        return toCamelCase(result || rowData);
    }

    async findByIdAndUpdate(id, updates, options = { new: true }) {
        if (!id) return null;
        const rowUpdates = toSnakeCase(updates.$set || updates);
        delete rowUpdates.id;

        const { data, error } = await this.client
            .from(this.tableName)
            .update(rowUpdates)
            .eq("id", String(id))
            .select();

        if (error) throw new Error(error.message);
        const result = Array.isArray(data) ? data[0] : data;
        return toCamelCase(result);
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

        const { error } = await this.client
            .from(this.tableName)
            .delete()
            .eq("id", String(id));

        if (error) throw new Error(error.message);
        return target;
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

        this.save = async () => {
            const dataToSave = { ...this };
            delete dataToSave.save;

            if (dataToSave.id || dataToSave._id) {
                const id = dataToSave.id || dataToSave._id;
                const updated = await rawModel.findByIdAndUpdate(id, dataToSave);
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
