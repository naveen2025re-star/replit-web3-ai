import { apiRequest } from "./queryClient";

export interface CreateSessionRequest {
  contractCode: string;
  contractLanguage: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  sessionKey: string;
  status: string;
}

export async function createAuditSession(data: CreateSessionRequest): Promise<CreateSessionResponse> {
  const response = await apiRequest("POST", "/api/audit/sessions", data);
  return response.json();
}

export async function analyzeContract(sessionId: string): Promise<void> {
  // This is handled via EventSource in the component
  // The actual analysis starts via POST to /api/audit/analyze/:sessionId
  // and streams results via Server-Sent Events
}

export interface AuditSessionData {
  id: string;
  sessionKey: string;
  contractCode: string;
  contractLanguage: string;
  status: string;
  createdAt: string;
  completedAt?: string;
}

export interface AuditResultData {
  id: string;
  sessionId: string;
  rawResponse?: string;
  formattedReport?: string;
  vulnerabilityCount?: {
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  securityScore?: number;
  createdAt: string;
}

export interface GetAuditResultResponse {
  session: AuditSessionData;
  result?: AuditResultData;
}

export async function getAuditResult(sessionId: string): Promise<GetAuditResultResponse> {
  const response = await apiRequest("GET", `/api/audit/results/${sessionId}`);
  return response.json();
}

export async function getRecentAuditSessions(): Promise<AuditSessionData[]> {
  const response = await apiRequest("GET", "/api/audit/sessions");
  return response.json();
}
