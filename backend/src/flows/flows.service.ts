import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Flow, FlowDocument, NodeType, NodeCategory, TriggerType } from './schemas/flow.schema';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { ValidateFlowDto } from './dto/validate-flow.dto';
import { FlowValidatorService, ValidationResult } from './flow-validator.service';

@Injectable()
export class FlowsService {
  constructor(
    @InjectModel(Flow.name) private flowModel: Model<FlowDocument>,
    private flowValidator: FlowValidatorService,
  ) {}

  async create(createFlowDto: CreateFlowDto): Promise<Flow> {
    // Auto-create trigger and end nodes
    const triggerNode = {
      id: 'trigger',
      type: NodeType.TRIGGER,
      category: NodeCategory.SYSTEM,
      position: { x: 250, y: 50 },
      config: {},
    };

    const endNode = {
      id: 'end',
      type: NodeType.END,
      category: NodeCategory.SYSTEM,
      position: { x: 250, y: 400 },
      config: {},
    };

    const createdFlow = new this.flowModel({
      ...createFlowDto,
      nodes: [triggerNode, endNode],
      edges: [],
      isActive: false,
    });
    return createdFlow.save();
  }

  async findAll(): Promise<Flow[]> {
    return this.flowModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Flow> {
    const flow = await this.flowModel.findById(id).exec();
    if (!flow) {
      throw new NotFoundException(`Flow with ID ${id} not found`);
    }
    return flow;
  }

  async update(id: string, updateFlowDto: UpdateFlowDto): Promise<Flow> {
    const updatedFlow = await this.flowModel
      .findByIdAndUpdate(id, updateFlowDto, { new: true })
      .exec();
    
    if (!updatedFlow) {
      throw new NotFoundException(`Flow with ID ${id} not found`);
    }
    
    return updatedFlow;
  }

  async remove(id: string): Promise<void> {
    const result = await this.flowModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Flow with ID ${id} not found`);
    }
  }

  async validate(id: string): Promise<ValidationResult> {
    const flow = await this.findOne(id);
    return this.flowValidator.validate(flow);
  }

  async validateData(validateFlowDto: ValidateFlowDto): Promise<ValidationResult> {
    // Create a temporary flow object for validation
    const tempFlow = {
      triggerType: validateFlowDto.triggerType,
      nodes: validateFlowDto.nodes,
      edges: validateFlowDto.edges,
    } as Flow;
    return this.flowValidator.validate(tempFlow);
  }

  async activate(id: string): Promise<Flow> {
    // Validate before activating
    const validationResult = await this.validate(id);
    if (!validationResult.valid) {
      throw new BadRequestException({
        message: 'Cannot activate flow with validation errors',
        errors: validationResult.errors,
      });
    }

    return this.update(id, { isActive: true });
  }

  async deactivate(id: string): Promise<Flow> {
    return this.update(id, { isActive: false });
  }

  async findActiveByTriggerType(triggerType: TriggerType): Promise<Flow[]> {
    return this.flowModel
      .find({ triggerType, isActive: true })
      .exec();
  }
}

