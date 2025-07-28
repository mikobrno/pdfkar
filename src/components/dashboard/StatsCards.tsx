import React from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Users
} from 'lucide-react';
import { Document } from '../../types';

interface StatsCardsProps {
  documents: Document[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ documents }) => {
  const stats = React.useMemo(() => {
    const total = documents.length;
    const queued = documents.filter(d => d.status === 'queued').length;
    const processing = documents.filter(d => d.status === 'processing').length;
    const awaitingReview = documents.filter(d => d.status === 'awaiting_review').length;
    const completed = documents.filter(d => d.status === 'completed').length;
    const failed = documents.filter(d => d.status === 'failed').length;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Calculate processing time average for completed documents
    const completedDocs = documents.filter(d => d.status === 'completed' && d.processed_at);
    const avgProcessingTime = completedDocs.length > 0 
      ? completedDocs.reduce((acc, doc) => {
          const start = new Date(doc.created_at).getTime();
          const end = new Date(doc.processed_at!).getTime();
          return acc + (end - start);
        }, 0) / completedDocs.length / 1000 / 60 // Convert to minutes
      : 0;

    return {
      total,
      queued,
      processing,
      awaitingReview,
      completed,
      failed,
      completionRate,
      avgProcessingTime: Math.round(avgProcessingTime)
    };
  }, [documents]);

  const cards = [
    {
      title: 'Total Documents',
      value: stats.total,
      icon: FileText,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'In Queue',
      value: stats.queued + stats.processing,
      icon: Clock,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Awaiting Review',
      value: stats.awaitingReview,
      icon: Users,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Completion Rate',
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    },
    {
      title: 'Avg. Processing Time',
      value: `${stats.avgProcessingTime}m`,
      icon: Clock,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                {card.title}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {card.value}
              </p>
            </div>
            <div className={`${card.bgColor} p-3 rounded-lg`}>
              <card.icon className={`w-6 h-6 ${card.textColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};