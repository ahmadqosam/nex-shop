
import { Injectable, Logger } from '@nestjs/common';
import { SNSClient, PublishCommand, CreateTopicCommand } from '@aws-sdk/client-sns';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SnsService {
  private readonly client: SNSClient;
  private readonly logger = new Logger(SnsService.name);

  constructor(private readonly configService: ConfigService) {
    this.client = new SNSClient({
      endpoint: this.configService.get('SNS_ENDPOINT'),
      region: this.configService.get('AWS_REGION'),
    });
  }

  async publish(
    topicArn: string,
    message: string,
    attributes?: Record<string, { DataType: string; StringValue: string }>
  ): Promise<void> {
    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: message,
      MessageAttributes: attributes,
    });

    try {
      await this.client.send(command);
      this.logger.debug(`Published message to ${topicArn}`);
    } catch (error) {
      this.logger.error(`Failed to publish message: ${error.message}`, error.stack);
      throw error;
    }
  }

  async ensureTopic(topicName: string): Promise<string> {
    const command = new CreateTopicCommand({ Name: topicName });
    try {
      const result = await this.client.send(command);
      this.logger.log(`Ensured topic ${topicName}: ${result.TopicArn}`);
      return result.TopicArn!;
    } catch (error) {
       this.logger.error(`Failed to create topic: ${error.message}`, error.stack);
       throw error;
    }
  }
}
