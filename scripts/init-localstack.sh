#!/bin/bash
set -e

echo "Initializing LocalStack resources..."

# Payment API Resources
echo "Creating Payment API SNS topics and SQS queues..."
awslocal sns create-topic --name payment-events
awslocal sqs create-queue --queue-name payment-events-dlq
awslocal sqs create-queue --queue-name payment-events-queue --attributes '{"RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:000000000000:payment-events-dlq\",\"maxReceiveCount\":\"3\"}"}'
awslocal sns subscribe --topic-arn arn:aws:sns:us-east-1:000000000000:payment-events --protocol sqs --notification-endpoint arn:aws:sqs:us-east-1:000000000000:payment-events-queue

echo "LocalStack initialization complete."
