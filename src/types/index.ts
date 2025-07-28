// Core types for the document processing system
export interface User {
  id: string;
  email: string;
  role: 'user' | 'reviewer' | 'admin';
  created_at: string;
}

export interface Document {
  id: string;
  filename: string;
  file_path: string;
  document_type: string | null;
  status: 'queued' | 'processing' | 'awaiting_review' | 'completed' | 'failed';
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  file_size: number;
  confidence_score?: number;
}

export interface ExtractedData {
  id: string;
  document_id: string;
  field_name: string;
  field_value: string;
  confidence_score: number;
  bounding_box: {
    page: number;
    left: number;
    top: number;
    width: number;
    height: number;
  };
  created_at: string;
}

export interface JobQueue {
  id: string;
  document_id: string;
  job_type: 'document_processing';
  payload: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  max_attempts: number;
  created_at: string;
  scheduled_for: string;
  error_message?: string;
}

export interface Prompt {
  id: string;
  prompt_name: string;
  version: number;
  prompt_text: string;
  model_parameters: Record<string, any>;
  status: 'draft' | 'active' | 'archived';
  changelog: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface AIFeedbackLog {
  id: string;
  document_id: string;
  field_name: string;
  ai_extracted_value: string;
  human_corrected_value: string;
  reviewer_id: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  target_resource_type?: string;
  target_resource_id?: string;
  details: Record<string, any>;
  created_at: string;
}

export interface Highlight {
  id: string;
  content: {
    text: string;
  };
  position: {
    boundingRect: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      width: number;
      height: number;
    };
    rects: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      width: number;
      height: number;
    }>;
    pageNumber: number;
  };
  comment?: {
    text: string;
    emoji: string;
  };
}