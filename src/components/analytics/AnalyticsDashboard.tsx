import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Document } from '../../types';
import { format, subDays, startOfDay } from 'date-fns';

interface AnalyticsDashboardProps {
  documents: Document[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ documents }) => {
  // Process data for charts
  const processedData = React.useMemo(() => {
    // Daily processing volume (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = startOfDay(subDays(new Date(), i));
      const dayDocs = documents.filter(doc => 
        startOfDay(new Date(doc.created_at)).getTime() === date.getTime()
      );
      
      return {
        date: format(date, 'MMM dd'),
        uploaded: dayDocs.length,
        completed: dayDocs.filter(d => d.status === 'completed').length,
        failed: dayDocs.filter(d => d.status === 'failed').length
      };
    }).reverse();

    // Status distribution
    const statusCounts = documents.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: count,
      color: getStatusColor(status)
    }));

    // Document type distribution
    const typeData = documents
      .filter(doc => doc.document_type)
      .reduce((acc, doc) => {
        const type = doc.document_type!;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const typeChartData = Object.entries(typeData).map(([type, count]) => ({
      name: type,
      value: count
    }));

    // Processing time analysis
    const completedDocs = documents.filter(d => d.status === 'completed' && d.processed_at);
    const processingTimes = completedDocs.map(doc => {
      const start = new Date(doc.created_at).getTime();
      const end = new Date(doc.processed_at!).getTime();
      return (end - start) / 1000 / 60; // Convert to minutes
    });

    const avgProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length 
      : 0;

    return {
      dailyVolume: last7Days,
      statusData,
      typeChartData,
      avgProcessingTime: Math.round(avgProcessingTime),
      totalProcessed: documents.length,
      successRate: documents.length > 0 
        ? Math.round((documents.filter(d => d.status === 'completed').length / documents.length) * 100)
        : 0
    };
  }, [documents]);

  const getStatusColor = (status: string) => {
    const colors = {
      queued: '#f59e0b',
      processing: '#3b82f6',
      awaiting_review: '#f97316',
      completed: '#10b981',
      failed: '#ef4444'
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Celkem zpracováno</p>
              <p className="text-2xl font-bold text-gray-900">{processedData.totalProcessed}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <BarChart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Míra úspěšnosti</p>
              <p className="text-2xl font-bold text-gray-900">{processedData.successRate}%</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <BarChart className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Průměrný čas zpracování</p>
              <p className="text-2xl font-bold text-gray-900">{processedData.avgProcessingTime}m</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <BarChart className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Typy dokumentů</p>
              <p className="text-2xl font-bold text-gray-900">{processedData.typeChartData.length}</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-lg">
              <BarChart className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Volume Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Denní objem zpracování</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={processedData.dailyVolume}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="uploaded" fill="#3b82f6" name="Nahráno" />
              <Bar dataKey="completed" fill="#10b981" name="Dokončeno" />
              <Bar dataKey="failed" fill="#ef4444" name="Selhalo" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rozložení stavů</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={processedData.statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {processedData.statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Document Types */}
        {processedData.typeChartData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Typy dokumentů</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={processedData.typeChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {processedData.typeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Processing Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trend zpracování</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={processedData.dailyVolume}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Dokončeno"
              />
              <Line 
                type="monotone" 
                dataKey="uploaded" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Nahráno"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};