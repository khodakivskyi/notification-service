const {ValidationError} = require('../exceptions');

/**
 * Validate required fields in data object
 * @param {object} data - Data object to validate
 * @param {string[]} requiredFields - Array of required field names
 * @throws {ValidationError} If any required field is missing
 */
function validateRequiredFields(data, requiredFields) {
    const missing = [];
    const missingDetails = {};

    for (const field of requiredFields) {
        if (!data || data[field] === undefined || data[field] === null || data[field] === '') {
            missing.push(field);
            missingDetails[field] = true;
        }
    }

    if (missing.length > 0) {
        throw new ValidationError(
            `Missing required fields: ${missing.join(', ')}`,
            {missing: missingDetails}
        );
    }
}

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email format is valid
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validate email format and throw error if invalid
 * @param {string} email - Email address to validate
 * @param {string} [fieldName='email'] - Field name for error message
 * @throws {ValidationError} If email format is invalid
 */
function validateEmail(email, fieldName = 'email') {
    if (!isValidEmail(email)) {
        throw new ValidationError(`Invalid email address format`, {
            field: fieldName,
            value: email,
        });
    }
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL format is valid
 */
function isValidUrl(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Validate URL format and throw error if invalid
 * @param {string} url - URL to validate
 * @param {string} [fieldName='url'] - Field name for error message
 * @throws {ValidationError} If URL format is invalid
 */
function validateUrl(url, fieldName = 'url') {
    if (!isValidUrl(url)) {
        throw new ValidationError(`Invalid URL format`, {
            field: fieldName,
            value: url,
        });
    }
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if UUID format is valid
 */
function isValidUuid(uuid) {
    if (!uuid || typeof uuid !== 'string') {
        return false;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Validate UUID format and throw error if invalid
 * @param {string} uuid - UUID to validate
 * @param {string} [fieldName='id'] - Field name for error message
 * @throws {ValidationError} If UUID format is invalid
 */
function validateUuid(uuid, fieldName = 'id') {
    if (!isValidUuid(uuid)) {
        throw new ValidationError(`Invalid UUID format`, {
            field: fieldName,
            value: uuid,
        });
    }
}

module.exports = {
    validateRequiredFields,
    isValidEmail,
    validateEmail,
    isValidUrl,
    validateUrl,
    isValidUuid,
    validateUuid,
};
