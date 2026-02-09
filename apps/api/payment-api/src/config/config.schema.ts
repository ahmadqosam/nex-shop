import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(4006),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  RSA_PUBLIC_KEY: Joi.string().required(),
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),
  STRIPE_API_URL: Joi.string().default('https://api.stripe.com'),
  SNS_ENDPOINT: Joi.string().default('http://localhost:4571'),
  AWS_REGION: Joi.string().default('us-east-1'),
  SNS_TOPIC_ARN: Joi.string().required(),
});
