import axios from 'axios';
import { Flow, ValidationResult, CreateFlowDto, Execution } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const flowsApi = {
  async getAll(): Promise<Flow[]> {
    const response = await api.get<Flow[]>('/flows');
    return response.data;
  },

  async getOne(id: string): Promise<Flow> {
    const response = await api.get<Flow>(`/flows/${id}`);
    return response.data;
  },

  async create(flow: CreateFlowDto): Promise<Flow> {
    const response = await api.post<Flow>('/flows', flow);
    return response.data;
  },

  async update(id: string, flow: Partial<Flow>): Promise<Flow> {
    const response = await api.patch<Flow>(`/flows/${id}`, flow);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/flows/${id}`);
  },

  async validate(id: string): Promise<ValidationResult> {
    const response = await api.post<ValidationResult>(`/flows/${id}/validate`);
    return response.data;
  },

  async validateData(flowData: { triggerType: string; nodes: any[]; edges: any[] }): Promise<ValidationResult> {
    const response = await api.post<ValidationResult>('/flows/validate', flowData);
    return response.data;
  },

  async activate(id: string): Promise<Flow> {
    const response = await api.post<Flow>(`/flows/${id}/activate`);
    return response.data;
  },

  async deactivate(id: string): Promise<Flow> {
    const response = await api.post<Flow>(`/flows/${id}/deactivate`);
    return response.data;
  },

  async execute(id: string, triggerData: Record<string, any>): Promise<Execution> {
    const response = await api.post<Execution>(`/flows/${id}/execute`, triggerData);
    return response.data;
  },

  async getExecutions(flowId: string): Promise<Execution[]> {
    const response = await api.get<Execution[]>(`/flows/${flowId}/executions`);
    return response.data;
  },

  async getExecution(executionId: string): Promise<Execution> {
    const response = await api.get<Execution>(`/flows/executions/${executionId}`);
    return response.data;
  },

  async retryExecution(executionId: string): Promise<Execution> {
    const response = await api.post<Execution>(`/flows/executions/${executionId}/retry`);
    return response.data;
  },
};

