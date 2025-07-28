import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const useRealTimeUpdates = (userId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    // Subscribe to document status changes
    const documentsSubscription = supabase
      .channel('documents_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `uploaded_by=eq.${userId}`
        },
        (payload) => {
          console.log('Document updated:', payload);
          
          // Update the documents cache
          queryClient.invalidateQueries({ queryKey: ['documents'] });
          
          // Show notification based on status
          const newStatus = payload.new.status;
          const filename = payload.new.filename;
          
          switch (newStatus) {
            case 'processing':
              toast.loading(`Zpracovává se ${filename}...`, { id: payload.new.id });
              break;
            case 'awaiting_review':
              toast.dismiss(payload.new.id);
              toast.success(`${filename} je připraven ke kontrole`);
              break;
            case 'completed':
              toast.dismiss(payload.new.id);
              toast.success(`Zpracování ${filename} dokončeno`);
              break;
            case 'failed':
              toast.dismiss(payload.new.id);
              toast.error(`Nepodařilo se zpracovat ${filename}`);
              break;
          }
        }
      )
      .subscribe();

    // Subscribe to job queue changes for progress updates
    const jobsSubscription = supabase
      .channel('jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_queue'
        },
        (payload) => {
          console.log('Job updated:', payload);
          // Could be used for more granular progress updates
        }
      )
      .subscribe();

    return () => {
      documentsSubscription.unsubscribe();
      jobsSubscription.unsubscribe();
    };
  }, [userId, queryClient]);
};