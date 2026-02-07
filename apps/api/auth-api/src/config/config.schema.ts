import Joi from 'joi';

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),

  JWT_ACCESS_TOKEN_TTL: Joi.number().default(900),
  JWT_REFRESH_TOKEN_TTL: Joi.number().default(604800),

  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),

  RSA_PRIVATE_KEY: Joi.string().optional(),
  RSA_PUBLIC_KEY: Joi.string().optional(),
  RSA_PRIVATE_KEY_PATH: Joi.string().optional(),
  RSA_PUBLIC_KEY_PATH: Joi.string().optional(),
});
