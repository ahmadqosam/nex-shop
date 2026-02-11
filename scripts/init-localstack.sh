#!/bin/bash
set -e

echo "Initializing LocalStack resources..."

# Payment API Resources
echo "Creating Payment API SNS topics and SQS queues..."
awslocal sns create-topic --name payment-events

# Cart API Queue & DLQ
awslocal sqs create-queue --queue-name cart-payment-events-dlq
awslocal sqs create-queue --queue-name cart-payment-events-queue --attributes '{"RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:000000000000:cart-payment-events-dlq\",\"maxReceiveCount\":\"3\"}"}'
awslocal sns subscribe --topic-arn arn:aws:sns:us-east-1:000000000000:payment-events --protocol sqs --notification-endpoint arn:aws:sqs:us-east-1:000000000000:cart-payment-events-queue

# Order API Queue & DLQ
awslocal sqs create-queue --queue-name order-payment-events-dlq
awslocal sqs create-queue --queue-name order-payment-events-queue --attributes '{"RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:000000000000:order-payment-events-dlq\",\"maxReceiveCount\":\"3\"}"}'
awslocal sns subscribe --topic-arn arn:aws:sns:us-east-1:000000000000:payment-events --protocol sqs --notification-endpoint arn:aws:sqs:us-east-1:000000000000:order-payment-events-queue

# Order API SNS Topics
echo "Creating Order API SNS topics..."
awslocal sns create-topic --name order-events

# Inventory API Queue & DLQ
awslocal sqs create-queue --queue-name inventory-order-events-dlq
awslocal sqs create-queue --queue-name inventory-order-events-queue --attributes '{"RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:000000000000:inventory-order-events-dlq\",\"maxReceiveCount\":\"3\"}"}'
awslocal sns subscribe --topic-arn arn:aws:sns:us-east-1:000000000000:order-events --protocol sqs --notification-endpoint arn:aws:sqs:us-east-1:000000000000:inventory-order-events-queue

awslocal apigateway create-rest-api \
    --name "nex-api" \
    --tags '{"_custom_id_":"nex-gw", "_custom_id_root_": "nex-infra"}'

echo "LocalStack initialization complete."
