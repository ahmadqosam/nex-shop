import { Test, TestingModule } from '@nestjs/testing';
import { InventoryConsumer } from './inventory.consumer';
import { InventoryService } from './inventory.service';
import { Logger } from '@nestjs/common';

describe('InventoryConsumer', () => {
  let consumer: InventoryConsumer;
  let service: InventoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryConsumer,
        {
          provide: InventoryService,
          useValue: {
            syncOrderItems: jest.fn(),
          },
        },
      ],
    }).compile();

    consumer = module.get<InventoryConsumer>(InventoryConsumer);
    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('handleOrderEvent', () => {
    it('should process ORDER_CONFIRMED event', async () => {
      const event = {
        eventType: 'ORDER_CONFIRMED',
        orderId: '123',
        items: [{ sku: 'SKU1', quantity: 1 }],
      };
      const message = {
        Body: JSON.stringify({
          Message: JSON.stringify(event),
        }),
      } as any;

      await consumer.handleOrderEvent(message);

      expect(service.syncOrderItems).toHaveBeenCalledWith(event.items);
    });

    it('should ignore other events', async () => {
      const event = {
        eventType: 'ORDER_CREATED',
        orderId: '123',
      };
      const message = {
        Body: JSON.stringify({
          Message: JSON.stringify(event),
        }),
      } as any;

      await consumer.handleOrderEvent(message);

      expect(service.syncOrderItems).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const message = {
        Body: 'invalid-json',
      } as any;

      // Mock logger to verify error logging
      const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      await consumer.handleOrderEvent(message);

      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});
