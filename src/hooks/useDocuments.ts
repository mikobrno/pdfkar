import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, uploadFile } from '../lib/supabase';
import { Document } from '../types';
import toast from 'react-hot-toast';

export const useDocuments = (userId?: string) => {
  const queryClient = useQueryClient();

  const documentsQuery = useQuery({
    queryKey: ['documents', userId],
    queryFn: async () => {
      const { data, error } = await db.getDocuments(userId);
      if (error) throw error;
      return data;
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { files: File[]; metadata?: { building_id?: string; revision_type_id?: string } }) => {
      const { files, metadata } = data;
      const results = [];
      
      for (const file of files) {
        try {
          // Upload file to storage
          const { filePath } = await uploadFile(file);
          
          // Create document record
          const { data: document, error } = await db.createDocument({
            filename: file.name,
            file_path: filePath,
            status: 'queued',
            uploaded_by: userId,
            file_size: file.size,
            building_id: metadata?.building_id,
            revision_type_id: metadata?.revision_type_id
          });

          if (error) throw error;

          // Enqueue processing job
          await db.enqueueJob({
            document_id: document.id,
            job_type: 'document_processing',
            payload: {
              file_path: filePath,
              filename: file.name,
              building_id: metadata?.building_id,
              revision_type_id: metadata?.revision_type_id
            },
            status: 'pending',
            max_attempts: 3
          });

          results.push(document);
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          toast.error(`Nepodařilo se nahrát ${file.name}`);
        }
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Dokumenty úspěšně nahrány');
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error('Nepodařilo se nahrát dokumenty');
    }
  });

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    error: documentsQuery.error,
    uploadDocuments: (files: File[], metadata?: { building_id?: string; revision_type_id?: string }) => 
      uploadMutation.mutate({ files, metadata }),
    isUploading: uploadMutation.isPending
  };
};