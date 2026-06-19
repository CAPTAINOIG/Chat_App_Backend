const Joi = require('joi');

const  userValidators = {
  register: Joi.object({
    username: Joi.string().min(3).max(30).required().trim(),
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string().min(6).max(128).required(),
    number: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
  }),

  login: Joi.object({
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string().required(),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required().lowercase().trim(),
  }),

  resetPassword: Joi.object({
    otp: Joi.string().required(),
    password: Joi.string().required(),
    newPassword: Joi.string().required(),
  }),

  googleAuth: Joi.object({
    googleToken: Joi.string().optional(), // Made optional for now
  }),

  updateProfile: Joi.object({
    profileName: Joi.string().min(1).max(50).optional().trim(),
    aboutMe: Joi.string().max(200).optional().trim(),
  }),

  profilePicture: Joi.object({
    userId: Joi.string().required(),
    base64: Joi.string().required(),
  }),
};

const messageValidators = {
  forward: Joi.object({
    messageId: Joi.string().required(),
    senderId: Joi.string().required(),
    receiverId: Joi.array().items(Joi.string()).min(1).required(),
  }),

  pin: Joi.object({
    messageId: Joi.string().required(),
    senderId: Joi.string().required(),
    receiverId: Joi.string().required(),
  }),

  unpin: Joi.object({
    messageId: Joi.string().required(),
    senderId: Joi.string().required(),
    receiverId: Joi.string().required(),
  }),
};

/**
 * Middleware to validate request body against schema
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
    }

    req.body = value;
    next();
  };
};

module.exports = {
  userValidators,
  messageValidators,
  validate,
};
