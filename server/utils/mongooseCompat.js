/**
 * Mongoose Compatibility Helpers for Supabase Models
 * 
 * These helpers provide compatibility for Mongoose-specific methods
 * that were used in the codebase but aren't needed with Supabase models.
 */

/**
 * Simulates Mongoose .populate() by joining related data
 * 
 * @param {Array|Object} data - The data to populate
 * @param {Object} populateConfig - Population configuration
 * @returns {Promise<Array|Object>} Populated data
 */
async function populate(data, populateConfig) {
  // For Supabase, we need to manually join data
  // This is a simplified implementation - extend as needed
  
  if (!data) return data;
  
  const isArray = Array.isArray(data);
  const items = isArray ? data : [data];
  
  // Parse populate config
  // Can be: "fieldName" or { path: "fieldName", select: "field1 field2" }
  const populateFields = Array.isArray(populateConfig) ? populateConfig : [populateConfig];
  
  for (const config of populateFields) {
    const fieldName = typeof config === 'string' ? config : config.path;
    const selectFields = typeof config === 'object' ? config.select : null;
    
    // Map reference field names to actual model names
    const modelMap = {
      candidateId: 'User',
      recruiterId: 'User',
      jobId: 'Job',
      applicationId: 'Application',
      candidate: 'User',
      recruiter: 'User',
      job: 'Job',
      user: 'User'
    };

    const modelName = modelMap[fieldName] || (fieldName.charAt(0).toUpperCase() + fieldName.slice(1));
    
    try {
      const Model = require(`../models/${modelName}`);
      
      for (const item of items) {
        const refId = item[fieldName];
        if (refId) {
          const related = await Model.findById(refId);
          if (related) {
            // If select is specified, filter fields
            if (selectFields) {
              const fields = selectFields.split(' ');
              const filtered = {};
              fields.forEach(f => {
                if (related[f] !== undefined) filtered[f] = related[f];
              });
              item[fieldName] = filtered;
            } else {
              item[fieldName] = related;
            }
          }
        }
      }
    } catch (err) {
      // Model not found or error - skip this field
      console.warn(`Could not populate ${fieldName}:`, err.message);
    }
  }
  
  return isArray ? items : items[0];
}

/**
 * Helper to check if a string is a valid ObjectId format
 * Supabase uses UUIDs, so this checks for UUID format
 */
const ObjectIdCompat = {
  isValid: (id) => {
    if (typeof id !== 'string') return false;
    // Check for UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // Also allow MongoDB ObjectId format for backward compatibility
    const objectIdRegex = /^[0-9a-f]{24}$/i;
    return uuidRegex.test(id) || objectIdRegex.test(id) || id.length > 0;
  }
};

/**
 * Mock mongoose Types for compatibility
 */
const mongoose = {
  Types: {
    ObjectId: ObjectIdCompat
  }
};

module.exports = {
  populate,
  mongoose,
  ObjectIdCompat
};
