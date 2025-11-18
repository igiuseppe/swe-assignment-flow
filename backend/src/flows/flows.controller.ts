import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FlowsService } from './flows.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { ValidateFlowDto } from './dto/validate-flow.dto';

@Controller('flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Post()
  create(@Body() createFlowDto: CreateFlowDto) {
    return this.flowsService.create(createFlowDto);
  }

  @Get()
  findAll() {
    return this.flowsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.flowsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFlowDto: UpdateFlowDto) {
    return this.flowsService.update(id, updateFlowDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.flowsService.remove(id);
  }

  @Post(':id/validate')
  validate(@Param('id') id: string) {
    return this.flowsService.validate(id);
  }

  @Post('validate')
  validateData(@Body() validateFlowDto: ValidateFlowDto) {
    return this.flowsService.validateData(validateFlowDto);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.flowsService.activate(id);
  }

  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.flowsService.deactivate(id);
  }
}

