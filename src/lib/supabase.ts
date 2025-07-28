import { createClient } from '@supabase/supabase-js';
import { ApartmentBuilding, RevisionType } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Database helper functions
export const db = {
  // Documents
  async getDocuments(userId?: string) {
    let query = supabase
      .from('documents')
      .select(`
        *,
        extracted_data (*)
      `)
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('uploaded_by', userId);
    }
    
    return query;
  },

  async createDocument(document: Partial<Document>) {
    return supabase
      .from('documents')
      .insert(document)
      .select()
      .single();
  },

  // Apartment Buildings CRUD
  async getApartmentBuildings(userId?: string) {
    let query = supabase
      .from('apartment_buildings')
      .select('*')
      .order('name');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    return query;
  },

  async createApartmentBuilding(building: Omit<ApartmentBuilding, 'id' | 'created_at'>) {
    return supabase
      .from('apartment_buildings')
      .insert({
        ...building,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
  },

  async updateApartmentBuilding(id: string, updates: Partial<ApartmentBuilding>) {
    return supabase
      .from('apartment_buildings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  },

  async deleteApartmentBuilding(id: string) {
    return supabase
      .from('apartment_buildings')
      .delete()
      .eq('id', id);
  },

  // Revision Types CRUD
  async getRevisionTypes(userId?: string) {
    let query = supabase
      .from('revision_types')
      .select('*')
      .order('name');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    return query;
  },

  async createRevisionType(revisionType: Omit<RevisionType, 'id' | 'created_at'>) {
    return supabase
      .from('revision_types')
      .insert({
        ...revisionType,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
  },

  async updateRevisionType(id: string, updates: Partial<RevisionType>) {
    return supabase
      .from('revision_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  },

  async deleteRevisionType(id: string) {
    return supabase
      .from('revision_types')
      .delete()
      .eq('id', id);
  },

  async updateDocumentStatus(id: string, status: Document['status'], metadata?: Record<string, any>) {
    const updateData: any = { 
      status, 
      updated_at: new Date().toISOString() 
    };
    
    if (status === 'completed' || status === 'failed') {
      updateData.processed_at = new Date().toISOString();
    }
    
    if (metadata) {
      Object.assign(updateData, metadata);
    }

    return supabase
      .from('documents')
      .update(updateData)
      .eq('id', id);
  },

  // Job Queue
  async enqueueJob(job: Omit<JobQueue, 'id' | 'created_at' | 'attempts'>) {
    return supabase
      .from('job_queue')
      .insert({
        ...job,
        attempts: 0,
        created_at: new Date().toISOString(),
        scheduled_for: new Date().toISOString()
      })
      .select()
      .single();
  },

  async getNextJob() {
    return supabase
      .from('job_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempts', supabase.rpc('max_attempts'))
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
  },

  // Prompts
  async getActivePrompt(promptName: string) {
    return supabase
      .from('prompts')
      .select('*')
      .eq('prompt_name', promptName)
      .eq('status', 'active')
      .single();
  },

  async getPromptVersions(promptName: string) {
    return supabase
      .from('prompts')
      .select('*')
      .eq('prompt_name', promptName)
      .order('version', { ascending: false });
  },

  async createPromptVersion(prompt: Omit<Prompt, 'id' | 'created_at' | 'updated_at'>) {
    return supabase
      .from('prompts')
      .insert({
        ...prompt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
  },

  async activatePrompt(id: string, promptName: string) {
    // First, archive current active version
    await supabase
      .from('prompts')
      .update({ status: 'archived' })
      .eq('prompt_name', promptName)
      .eq('status', 'active');

    // Then activate the new version
    return supabase
      .from('prompts')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
  },

  // Extracted Data
  async saveExtractedData(data: Omit<ExtractedData, 'id' | 'created_at'>[]) {
    return supabase
      .from('extracted_data')
      .insert(data.map(item => ({
        ...item,
        created_at: new Date().toISOString()
      })));
  },

  async getExtractedData(documentId: string) {
    return supabase
      .from('extracted_data')
      .select('*')
      .eq('document_id', documentId)
      .order('field_name');
  },

  // AI Feedback
  async logAIFeedback(feedback: Omit<AIFeedbackLog, 'id' | 'created_at'>) {
    return supabase
      .from('ai_feedback_log')
      .insert({
        ...feedback,
        created_at: new Date().toISOString()
      });
  },

  // Audit Log
  async logAudit(log: Omit<AuditLog, 'id' | 'created_at'>) {
    return supabase
      .from('audit_log')
      .insert({
        ...log,
        created_at: new Date().toISOString()
      });
  }
};

// File upload helper
export const uploadFile = async (file: File, bucket: string = 'documents') => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;
  return { data, filePath };
};

// Get file URL
export const getFileUrl = (filePath: string, bucket: string = 'documents') => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};