
import { Test, TestingModule } from '@nestjs/testing';
import { SnsService } from './sns.service';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand, CreateTopicCommand } from '@aws-sdk/client-sns';
import { mockClient } from 'aws-sdk-client-mock';

describe('SnsService', () => {
  let service: SnsService;
  const snsMock = mockClient(SNSClient);

  beforeEach(async () => {
    snsMock.reset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SnsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SNS_ENDPOINT') return 'http://localhost:4566';
              if (key === 'AWS_REGION') return 'us-east-1';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SnsService>(SnsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should publish message successfully', async () => {
    snsMock.on(PublishCommand).resolves({});

    await service.publish('test-arn', 'test-message');

    expect(snsMock.calls()).toHaveLength(1);
    const callInput = snsMock.call(0).args[0].input;
    expect(callInput).toEqual({
      TopicArn: 'test-arn',
      Message: 'test-message',
      MessageAttributes: undefined,
    });
  });

  it('should create topic successfully', async () => {
    snsMock.on(CreateTopicCommand).resolves({ TopicArn: 'new-topic-arn' });

    const result = await service.ensureTopic('test-topic');

    expect(result).toBe('new-topic-arn');
    expect(snsMock.calls()).toHaveLength(1);
  });
});
