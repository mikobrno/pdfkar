/*
  # Initial Database Schema for Intelligent Document Processing System

  1. New Tables
    - `documents` - Core document metadata and processing status
    - `job_queue` - Asynchronous job processing queue with retry logic
    - `extracted_data` - AI-extracted data with confidence scores and bounding boxes
    - `prompts` - Versioned AI prompt management system
    - `ai_feedback_log` - Human corrections for AI model improvement
    - `audit_log` - Complete system audit trail for compliance

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for role-based access control
    - Support for user, reviewer, and admin roles

  3. Features
    - Automatic timestamping
    - UUID primary keys for security
    - JSON fields for flexible metadata storage
    - Proper foreign key relationships
    - Optimized indexes for performance
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Documents table - Core document metadata and processing status
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename text NOT NULL,
  file_path text NOT NULL,
  document_type text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'awaiting_review', 'completed', 'failed')),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  file_size bigint NOT NULL DEFAULT 0,
  confidence_score numeric(3,2),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Job Queue table - Asynchronous processing with retry logic
CREATE TABLE IF NOT EXISTS job_queue (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  job_type text NOT NULL DEFAULT 'document_processing',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  scheduled_for timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text
);

-- Extracted Data table - AI-extracted data with spatial information
CREATE TABLE IF NOT EXISTS extracted_data (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_value text NOT NULL,
  confidence_score numeric(3,2) NOT NULL DEFAULT 0.0,
  bounding_box jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Prompts table - Versioned AI prompt management
CREATE TABLE IF NOT EXISTS prompts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  prompt_text text NOT NULL,
  model_parameters jsonb DEFAULT '{"temperature": 0.7, "max_tokens": 2048}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  changelog text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(prompt_name, version)
);

-- AI Feedback Log table - Human corrections for model improvement
CREATE TABLE IF NOT EXISTS ai_feedback_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  ai_extracted_value text NOT NULL,
  human_corrected_value text NOT NULL,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Audit Log table - Complete system audit trail
CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_resource_type text,
  target_resource_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);

CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_queue_scheduled_for ON job_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_job_queue_document_id ON job_queue(document_id);

CREATE INDEX IF NOT EXISTS idx_extracted_data_document_id ON extracted_data(document_id);
CREATE INDEX IF NOT EXISTS idx_extracted_data_field_name ON extracted_data(field_name);

CREATE INDEX IF NOT EXISTS idx_prompts_name_status ON prompts(prompt_name, status);
CREATE INDEX IF NOT EXISTS idx_prompts_status ON prompts(status);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_document_id ON ai_feedback_log(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON ai_feedback_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents table
CREATE POLICY "Users can view own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "Reviewers can view all documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' IN ('reviewer', 'admin')
    )
  );

CREATE POLICY "Users can insert own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "System can update document status"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' IN ('reviewer', 'admin')
    )
  );

-- RLS Policies for job_queue table
CREATE POLICY "Users can view jobs for own documents"
  ON job_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE id = job_queue.document_id 
      AND uploaded_by = auth.uid()
    )
  );

CREATE POLICY "System can manage job queue"
  ON job_queue
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' IN ('admin')
    )
  );

-- RLS Policies for extracted_data table
CREATE POLICY "Users can view extracted data for own documents"
  ON extracted_data
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE id = extracted_data.document_id 
      AND uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Reviewers can view all extracted data"
  ON extracted_data
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' IN ('reviewer', 'admin')
    )
  );

CREATE POLICY "System can insert extracted data"
  ON extracted_data
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' IN ('admin')
    )
  );

-- RLS Policies for prompts table
CREATE POLICY "All authenticated users can view active prompts"
  ON prompts
  FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Admins can manage all prompts"
  ON prompts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- RLS Policies for ai_feedback_log table
CREATE POLICY "Reviewers can insert feedback"
  ON ai_feedback_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' IN ('reviewer', 'admin')
    )
  );

CREATE POLICY "Admins can view all feedback"
  ON ai_feedback_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- RLS Policies for audit_log table
CREATE POLICY "Users can view own audit logs"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "All authenticated users can insert audit logs"
  ON audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at 
  BEFORE UPDATE ON prompts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default prompts for common document types
INSERT INTO prompts (prompt_name, version, prompt_text, status, changelog, created_by) VALUES
(
  'classify_document',
  1,
  'Analyze the following document text and classify it into one of these categories: "review_report", "handover_protocol", "technical_specification", "contract", "invoice", or "other".

Document text:
{{document_text}}

Respond with a JSON object in this exact format:
{
  "document_type": "category_name",
  "confidence": 0.95
}',
  'active',
  'Initial document classification prompt',
  NULL
),
(
  'extract_review_report_data',
  1,
  'Extract key information from this review report document. Focus on finding:
- Review number/ID
- Date of review
- Reviewer name
- Location/facility
- Key findings
- Recommendations
- Status/conclusion

Document text:
{{document_text}}

For each piece of information found, provide the exact text and its location coordinates if available. Respond with a JSON array of objects in this format:
[
  {
    "field_name": "review_number",
    "field_value": "extracted_value",
    "confidence": 0.95,
    "bounding_box": {
      "page": 1,
      "left": 100,
      "top": 200,
      "width": 150,
      "height": 20
    }
  }
]',
  'active',
  'Initial review report extraction prompt',
  NULL
),
(
  'extract_handover_protocol_data',
  1,
  'Extract key information from this handover protocol document. Focus on finding:
- Protocol number/ID
- Date of handover
- Handover from (person/department)
- Handover to (person/department)
- Items/responsibilities transferred
- Conditions/notes
- Signatures

Document text:
{{document_text}}

For each piece of information found, provide the exact text and its location coordinates if available. Respond with a JSON array of objects in this format:
[
  {
    "field_name": "protocol_number",
    "field_value": "extracted_value",
    "confidence": 0.95,
    "bounding_box": {
      "page": 1,
      "left": 100,
      "top": 200,
      "width": 150,
      "height": 20
    }
  }
]',
  'active',
  'Initial handover protocol extraction prompt',
  NULL
);