import { Test, TestingModule } from '@nestjs/testing';
import { FlashSaleController } from './flash-sale.controller';
import { FlashSaleService } from './flash-sale.service';

describe('FlashSaleController', () => {
  let controller: FlashSaleController;
  let service: jest.Mocked<FlashSaleService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlashSaleController],
      providers: [
        {
          provide: FlashSaleService,
          useValue: {
            getActiveFlashSales: jest.fn(),
            getFlashSaleForProduct: jest.fn(),
            checkEligibility: jest.fn(),
            purchaseFlashSaleItem: jest.fn(),
            createFlashSale: jest.fn(),
            updateFlashSale: jest.fn(),
            addItemToFlashSale: jest.fn(),
            removeItemFromFlashSale: jest.fn(),
          } as unknown as jest.Mocked<FlashSaleService>,
        },
      ],
    }).compile();

    controller = module.get<FlashSaleController>(FlashSaleController);
    service = module.get(FlashSaleService);
  });

  it('should delegate getActiveFlashSales to service', async () => {
    (service.getActiveFlashSales as jest.Mock).mockResolvedValue([]);

    const result = await controller.getActiveFlashSales();

    expect(service.getActiveFlashSales).toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});


