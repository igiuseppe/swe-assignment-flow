import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { MockServicesService } from './mock-services.service';
import { SendWhatsAppDto } from './dto/send-whatsapp.dto';
import { AddNoteDto } from './dto/add-note.dto';

@Controller('mock')
export class MockServicesController {
  constructor(private readonly mockServicesService: MockServicesService) {}

  @Post('whatsapp/send')
  async sendWhatsAppMessage(@Body() dto: SendWhatsAppDto) {
    return this.mockServicesService.sendWhatsAppMessage(
      dto.to,
      dto.message,
      dto.template,
      dto.idempotencyKey,
    );
  }

  @Post('orders/:orderId/notes')
  async addOrderNote(
    @Param('orderId') orderId: string,
    @Body() dto: AddNoteDto,
  ) {
    return this.mockServicesService.addOrderNote(
      orderId,
      dto.note,
      dto.idempotencyKey,
    );
  }

  @Post('customers/:customerId/notes')
  async addCustomerNote(
    @Param('customerId') customerId: string,
    @Body() dto: AddNoteDto,
  ) {
    return this.mockServicesService.addCustomerNote(
      customerId,
      dto.note,
      dto.idempotencyKey,
    );
  }

  @Get('whatsapp/messages')
  async getAllWhatsAppMessages() {
    return this.mockServicesService.getAllWhatsAppMessages();
  }

  @Get('orders/:orderId/notes')
  async getOrderNotes(@Param('orderId') orderId: string) {
    return this.mockServicesService.getOrderNotesByOrderId(orderId);
  }

  @Get('orders/notes')
  async getAllOrderNotes() {
    return this.mockServicesService.getAllOrderNotes();
  }

  @Get('customers/:customerId/notes')
  async getCustomerNotes(@Param('customerId') customerId: string) {
    return this.mockServicesService.getCustomerNotesByCustomerId(customerId);
  }

  @Get('customers/notes')
  async getAllCustomerNotes() {
    return this.mockServicesService.getAllCustomerNotes();
  }

  @Get('logs')
  async getAllLogs() {
    return {
      whatsappMessages: this.mockServicesService.getAllWhatsAppMessages(),
      orderNotes: this.mockServicesService.getAllOrderNotes(),
      customerNotes: this.mockServicesService.getAllCustomerNotes(),
    };
  }

  @Delete('clear')
  async clearAll() {
    this.mockServicesService.clearAll();
    return { message: 'All mock data cleared' };
  }
}

