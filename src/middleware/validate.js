// Middleware for routes validations
const validate = (schema, source = 'body') => {
    return async (req, res, next) => {
        try{
            req[source] = await schema.validateAsync(req[source], {abortEarly: false});
        }
        catch (error) {
            next(error);
        }
    }
}

module.exports = validate;