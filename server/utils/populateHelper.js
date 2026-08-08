/**
 * Helper to manually "populate" related data for Supabase models
 * Replaces Mongoose .populate() functionality
 */

const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');

/**
 * Populate a single field in an object or array of objects
 * @param {Object|Array} data - The data to populate
 * @param {string} field - The field name to populate
 * @param {string} model - The model name ('User', 'Job', 'Application', etc.)
 * @param {string|Array} select - Fields to select (space-separated string or array)
 */
async function populateField(data, field, model, select = null) {
  if (!data) return data;
  
  const isArray = Array.isArray(data);
  const items = isArray ? data : [data];
  
  // Get the model
  const models = { User, Job, Application, Candidate, Recruiter };
  const Model = models[model];
  
  if (!Model) {
    console.warn(`Model ${model} not found for populate`);
    return data;
  }
  
  // Parse select fields
  const selectFields = select 
    ? (Array.isArray(select) ? select : select.split(' '))
    : null;
  
  // Populate each item
  for (const item of items) {
    const refId = item[field];
    if (refId) {
      try {
        const related = await Model.findById(refId);
        if (related) {
          // If select is specified, only include those fields
          if (selectFields) {
            const filtered = {};
            selectFields.forEach(f => {
              if (related[f] !== undefined) filtered[f] = related[f];
            });
            item[field] = filtered;
          } else {
            item[field] = related;
          }
        }
      } catch (err) {
        console.warn(`Error populating ${field}:`, err.message);
      }
    }
  }
  
  return data;
}

/**
 * Populate multiple fields in sequence
 * @param {Object|Array} data - The data to populate
 * @param {Array} populateConfigs - Array of {field, model, select} objects
 */
async function populateMultiple(data, populateConfigs) {
  let result = data;
  for (const config of populateConfigs) {
    result = await populateField(result, config.field, config.model, config.select);
  }
  return result;
}

/**
 * Convenient helpers for common populate patterns
 */
async function populateJob(data, select = 'title company location type id') {
  return populateField(data, 'jobId', 'Job', select);
}

async function populateCandidate(data, select = 'fullName email phone skills') {
  return populateField(data, 'candidateId', 'User', select);
}

async function populateRecruiter(data, select = 'fullName companyName id avatarUrl name') {
  return populateField(data, 'recruiterId', 'User', select);
}

async function populateApplication(data, select = 'status') {
  return populateField(data, 'applicationId', 'Application', select);
}

async function populateUser(data, select = 'id') {
  return populateField(data, 'user', 'User', select);
}

module.exports = {
  populateField,
  populateMultiple,
  populateJob,
  populateCandidate,
  populateRecruiter,
  populateApplication,
  populateUser
};
