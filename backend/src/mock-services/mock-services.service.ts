import { Injectable, Logger } from '@nestjs/common';

export interface WhatsAppMessage {
  id: string;
  to: string;
  message: string;
  template: string;
  status: string;
  timestamp: string;
}

export interface OrderNote {
  id: string;
  orderId: string;
  note: string;
  timestamp: string;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  note: string;
  timestamp: string;
}

@Injectable()
export class MockServicesService {
  private readonly logger = new Logger(MockServicesService.name);
  
  // In-memory storage for mock data
  private whatsappMessages = new Map<string, WhatsAppMessage>();
  private orderNotes = new Map<string, OrderNote>();
  private customerNotes = new Map<string, CustomerNote>();
  
  // Idempotency tracking
  private messageIdempotency = new Map<string, WhatsAppMessage>();
  private orderNoteIdempotency = new Map<string, OrderNote>();
  private customerNoteIdempotency = new Map<string, CustomerNote>();

  async sendWhatsAppMessage(
    to: string,
    message: string,
    template: string,
    idempotencyKey?: string,
  ): Promise<WhatsAppMessage> {
    // Check idempotency
    if (idempotencyKey && this.messageIdempotency.has(idempotencyKey)) {
      this.logger.log(`[Idempotent] WhatsApp message already sent with key: ${idempotencyKey}`);
      return this.messageIdempotency.get(idempotencyKey)!;
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const msg: WhatsAppMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      to,
      message,
      template,
      status: 'sent',
      timestamp: new Date().toISOString(),
    };

    this.whatsappMessages.set(msg.id, msg);
    
    if (idempotencyKey) {
      this.messageIdempotency.set(idempotencyKey, msg);
    }

    this.logger.log(`📱 Sent WhatsApp message to ${to}: ${message}`);
    return msg;
  }

  async addOrderNote(
    orderId: string,
    note: string,
    idempotencyKey?: string,
  ): Promise<OrderNote> {
    // Check idempotency
    if (idempotencyKey && this.orderNoteIdempotency.has(idempotencyKey)) {
      this.logger.log(`[Idempotent] Order note already added with key: ${idempotencyKey}`);
      return this.orderNoteIdempotency.get(idempotencyKey)!;
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    const orderNote: OrderNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      note,
      timestamp: new Date().toISOString(),
    };

    this.orderNotes.set(orderNote.id, orderNote);
    
    if (idempotencyKey) {
      this.orderNoteIdempotency.set(idempotencyKey, orderNote);
    }

    this.logger.log(`📝 Added note to order ${orderId}: ${note}`);
    return orderNote;
  }

  async addCustomerNote(
    customerId: string,
    note: string,
    idempotencyKey?: string,
  ): Promise<CustomerNote> {
    // Check idempotency
    if (idempotencyKey && this.customerNoteIdempotency.has(idempotencyKey)) {
      this.logger.log(`[Idempotent] Customer note already added with key: ${idempotencyKey}`);
      return this.customerNoteIdempotency.get(idempotencyKey)!;
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    const customerNote: CustomerNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customerId,
      note,
      timestamp: new Date().toISOString(),
    };

    this.customerNotes.set(customerNote.id, customerNote);
    
    if (idempotencyKey) {
      this.customerNoteIdempotency.set(idempotencyKey, customerNote);
    }

    this.logger.log(`📝 Added note to customer ${customerId}: ${note}`);
    return customerNote;
  }

  // Query methods for testing/verification
  getAllWhatsAppMessages(): WhatsAppMessage[] {
    return Array.from(this.whatsappMessages.values());
  }

  getAllOrderNotes(): OrderNote[] {
    return Array.from(this.orderNotes.values());
  }

  getAllCustomerNotes(): CustomerNote[] {
    return Array.from(this.customerNotes.values());
  }

  getOrderNotesByOrderId(orderId: string): OrderNote[] {
    return Array.from(this.orderNotes.values()).filter(
      (note) => note.orderId === orderId,
    );
  }

  getCustomerNotesByCustomerId(customerId: string): CustomerNote[] {
    return Array.from(this.customerNotes.values()).filter(
      (note) => note.customerId === customerId,
    );
  }

  // Clear methods for testing
  clearAll(): void {
    this.whatsappMessages.clear();
    this.orderNotes.clear();
    this.customerNotes.clear();
    this.messageIdempotency.clear();
    this.orderNoteIdempotency.clear();
    this.customerNoteIdempotency.clear();
    this.logger.log('🧹 Cleared all mock data');
  }
}

