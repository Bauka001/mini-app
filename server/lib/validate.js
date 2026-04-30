'use strict';

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

function requireString(value, field, { min = 1, max = 5000, trim = true } = {}) {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`);
  }
  const out = trim ? value.trim() : value;
  if (out.length < min) {
    throw new ValidationError(`${field} must be at least ${min} character${min === 1 ? '' : 's'}`);
  }
  if (out.length > max) {
    throw new ValidationError(`${field} must be at most ${max} characters`);
  }
  return out;
}

function optionalString(value, field, opts = {}) {
  if (value === undefined || value === null || value === '') return null;
  return requireString(value, field, { ...opts, min: opts.min ?? 0 });
}

function requireInt(value, field, { min = -Number.MAX_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!isFiniteNumber(n) || !Number.isInteger(n)) {
    throw new ValidationError(`${field} must be an integer`);
  }
  if (n < min || n > max) {
    throw new ValidationError(`${field} must be between ${min} and ${max}`);
  }
  return n;
}

function optionalIsoDate(value, field) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be an ISO date string`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${field} is not a valid ISO date`);
  }
  return date.toISOString();
}

function optionalHttpUrl(value, field, { maxLength = 2048 } = {}) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a URL string`);
  }
  if (value.length > maxLength) {
    throw new ValidationError(`${field} exceeds ${maxLength} characters`);
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new ValidationError(`${field} is not a valid URL`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new ValidationError(`${field} must use http(s) protocol`);
  }
  return parsed.toString();
}

function handleValidationError(error, res) {
  if (error instanceof ValidationError) {
    res.status(400).json({ error: error.message });
    return true;
  }
  return false;
}

module.exports = {
  ValidationError,
  requireString,
  optionalString,
  requireInt,
  optionalIsoDate,
  optionalHttpUrl,
  handleValidationError,
};
