import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Document, ExtractedData } from '../../types';
import { ApartmentBuilding, RevisionType } from '../../types';
import { PDFViewer } from '../pdf/PDFViewer';
import { db, getFileUrl } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface ReviewInterfaceProps {
  document: Document;
  extractedData: ExtractedData[];
  onComplete: () => void;
}

// Dynamic schema based on extracted data
const createValidationSchema = (fields: ExtractedData[]) => {
  const schemaFields: Record<string, z.ZodString> = {};
  
  fields.forEach(field => {
    schemaFields[field.field_name] = z.string().min(1, `${field.field_name} is required`);
  });
  
  return z.object(schemaFields);
};

export const ReviewInterface: React.FC<ReviewInterfaceProps> = ({
  document,
  extractedData,
  onComplete
}) => {
  const { user } = useAuth();
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch building and revision type details
  const { data: building } = useQuery({
    queryKey: ['apartment-building', document.building_id],
    queryFn: async () => {
      if (!document.building_id) return null;
      const { data, error } = await db.supabase
        .from('apartment_buildings')
        .select('*')
        .eq('id', document.building_id)
        .single();
      if (error) throw error;
      return data as ApartmentBuilding;
    },
    enabled: !!document.building_id
  });

  const { data: revisionType } = useQuery({
    queryKey: ['revision-type', document.revision_type_id],
    queryFn: async () => {
      if (!document.revision_type_id) return null;
      const { data, error } = await db.supabase
        .from('revision_types')
        .select('*')
        .eq('id', document.revision_type_id)
        .single();
      if (error) throw error;
      return data as RevisionType;
    },
    enabled: !!document.revision_type_id
  });
  
  const validationSchema = createValidationSchema(extractedData);
  type FormData = z.infer<typeof validationSchema>;
  
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch
  } = useForm<FormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: extractedData.reduce((acc, field) => ({
      ...acc,
      [field.field_name]: field.field_value
    }), {} as FormData)
  });

  const watchedValues = watch();

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Check for changes and log feedback
      const changes: Array<{
        field_name: string;
        ai_extracted_value: string;
        human_corrected_value: string;
      }> = [];

      extractedData.forEach(field => {
        const newValue = data[field.field_name];
        if (newValue !== field.field_value) {
          changes.push({
            field_name: field.field_name,
            ai_extracted_value: field.field_value,
            human_corrected_value: newValue
          });
        }
      });

      // Log feedback for AI improvement
      for (const change of changes) {
        await db.logAIFeedback({
          document_id: document.id,
          field_name: change.field_name,
          ai_extracted_value: change.ai_extracted_value,
          human_corrected_value: change.human_corrected_value,
          reviewer_id: user.id
        });
      }

      // Update document status
      await db.updateDocumentStatus(document.id, 'completed');

      // Log audit event
      await db.logAudit({
        user_id: user.id,
        action: 'DOCUMENT_REVIEWED',
        target_resource_type: 'document',
        target_resource_id: document.id,
        details: {
          changes_made: changes.length,
          filename: document.filename
        }
      });

      toast.success('Document review completed successfully');
      onComplete();
    } catch (error) {
      console.error('Failed to save review:', error);
      toast.error('Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldFocus = (fieldName: string) => {
    setSelectedField(fieldName);
  };

  const getFieldConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'border-green-300 bg-green-50';
    if (confidence >= 0.6) return 'border-yellow-300 bg-yellow-50';
    return 'border-red-300 bg-red-50';
  };

  const fileUrl = getFileUrl(document.file_path);

  // Separate defects from other extracted data
  const defects = extractedData.filter(data => 
    data.field_name.toLowerCase().includes('defect') || 
    data.field_name.toLowerCase().includes('závada')
  );
  const otherData = extractedData.filter(data => 
    !data.field_name.toLowerCase().includes('defect') && 
    !data.field_name.toLowerCase().includes('závada')
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Kontrola dokumentu
              </h1>
              <div className="space-y-2">
                <p className="text-gray-600">
                  {document.filename}
                </p>
                {building && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Bytový dům:</span> {building.name}
                  </p>
                )}
                {revisionType && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Typ revize:</span> {revisionType.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                <AlertCircle className="w-4 h-4 mr-1" />
                Čeká na kontrolu
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PDF Viewer */}
          <div className="space-y-4">
            <PDFViewer
              fileUrl={fileUrl}
              extractedData={extractedData}
              onHighlightClick={(highlight) => {
                const fieldName = highlight.comment?.text;
                if (fieldName) {
                  setSelectedField(fieldName);
                  document.getElementById(`field-${fieldName}`)?.focus();
                }
              }}
            />
          </div>

          {/* Review Form */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Kontrola extrahovaných dat
              </h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {otherData.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {field.field_name}
                      <span className="ml-2 text-xs text-gray-500">
                        (Spolehlivost: {Math.round(field.confidence_score * 100)}%)
                      </span>
                    </label>
                    
                    <div className="relative">
                      <input
                        id={`field-${field.field_name}`}
                        type="text"
                        {...register(field.field_name)}
                        onFocus={() => handleFieldFocus(field.field_name)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                          getFieldConfidenceColor(field.confidence_score)
                        } ${
                          selectedField === field.field_name ? 'ring-2 ring-indigo-500' : ''
                        }`}
                      />
                      
                      {field.confidence_score < 0.8 && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <AlertCircle className="w-4 h-4 text-yellow-500" title="Nízká spolehlivost - prosím ověřte" />
                        </div>
                      )}
                    </div>
                    
                    {errors[field.field_name] && (
                      <p className="text-sm text-red-600">
                        {errors[field.field_name]?.message}
                      </p>
                    )}
                    
                    {watchedValues[field.field_name] !== field.field_value && (
                      <p className="text-sm text-blue-600">
                        Původní: "{field.field_value}"
                      </p>
                    )}
                  </div>
                ))}

                {/* Defects Section */}
                {defects.length > 0 && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Nalezené závady
                    </h3>
                    <div className="space-y-4">
                      {defects.map((defect) => (
                        <div key={defect.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-red-800 mb-1">
                                {defect.field_name}
                                <span className="ml-2 text-xs text-red-600">
                                  (Spolehlivost: {Math.round(defect.confidence_score * 100)}%)
                                </span>
                              </label>
                              <textarea
                                {...register(defect.field_name)}
                                onFocus={() => handleFieldFocus(defect.field_name)}
                                rows={3}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors bg-white ${
                                  selectedField === defect.field_name ? 'ring-2 ring-red-500' : ''
                                }`}
                              />
                              {watchedValues[defect.field_name] !== defect.field_value && (
                                <p className="text-sm text-blue-600 mt-1">
                                  Původní: "{defect.field_value}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {isDirty ? (
                        <span className="text-orange-600">Máte neuložené změny</span>
                      ) : (
                        <span className="text-green-600">Všechny změny uloženy</span>
                      )}
                    </div>
                    
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Ukládá se...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Dokončit kontrolu
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                Pokyny pro kontrolu
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Klikněte na zvýrazněné oblasti v PDF pro zaměření na odpovídající pole</li>
                <li>• Pole s nízkou spolehlivostí (žluté/červené pozadí) potřebují zvláštní pozornost</li>
                <li>• Věnujte zvláštní pozornost sekci závad - tyto informace jsou kritické</li>
                <li>• Ověřte všechna extrahovaná data proti původnímu dokumentu</li>
                <li>• Proveďte opravy podle potřeby před dokončením kontroly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};