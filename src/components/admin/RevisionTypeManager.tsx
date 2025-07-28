import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  X,
  FileText,
  Code,
  Eye
} from 'lucide-react';
import { db } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { RevisionType } from '../../types';
import toast from 'react-hot-toast';

export const RevisionTypeManager: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingType, setEditingType] = useState<RevisionType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    extraction_rules: {
      revision_date: '',
      next_revision_date: '',
      defects: ''
    },
    file_naming_format: '{building_name}_{revision_name}_{date}.pdf'
  });

  // Fetch revision types
  const { data: revisionTypes = [], isLoading } = useQuery({
    queryKey: ['revision-types', user?.id],
    queryFn: async () => {
      const { data, error } = await db.getRevisionTypes(user?.id);
      if (error) throw error;
      return data as RevisionType[];
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result, error } = await db.createRevisionType({
        name: data.name,
        extraction_rules: data.extraction_rules,
        file_naming_format: data.file_naming_format,
        user_id: user!.id
      });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revision-types'] });
      setIsCreating(false);
      resetForm();
      toast.success('Typ revize byl úspěšně vytvořen');
    },
    onError: (error) => {
      console.error('Failed to create revision type:', error);
      toast.error('Nepodařilo se vytvořit typ revize');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string } & typeof formData) => {
      const { data: result, error } = await db.updateRevisionType(data.id, {
        name: data.name,
        extraction_rules: data.extraction_rules,
        file_naming_format: data.file_naming_format
      });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revision-types'] });
      setEditingType(null);
      resetForm();
      toast.success('Typ revize byl úspěšně aktualizován');
    },
    onError: (error) => {
      console.error('Failed to update revision type:', error);
      toast.error('Nepodařilo se aktualizovat typ revize');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.deleteRevisionType(id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revision-types'] });
      toast.success('Typ revize byl úspěšně smazán');
    },
    onError: (error) => {
      console.error('Failed to delete revision type:', error);
      toast.error('Nepodařilo se smazat typ revize');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      extraction_rules: {
        revision_date: '',
        next_revision_date: '',
        defects: ''
      },
      file_naming_format: '{building_name}_{revision_name}_{date}.pdf'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingType) {
      updateMutation.mutate({
        id: editingType.id,
        ...formData
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (revisionType: RevisionType) => {
    setEditingType(revisionType);
    setFormData({
      name: revisionType.name,
      extraction_rules: revisionType.extraction_rules,
      file_naming_format: revisionType.file_naming_format
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setEditingType(null);
    setIsCreating(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Opravdu chcete smazat tento typ revize?')) {
      deleteMutation.mutate(id);
    }
  };

  const generatePreview = () => {
    const sampleData = {
      building_name: 'Bytový_dům_Na_Kopci_15',
      revision_name: formData.name.replace(/\s+/g, '_'),
      date: new Date().toISOString().split('T')[0]
    };

    let preview = formData.file_naming_format;
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(`{${key}}`, value);
    });

    return preview;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Správa typů revizí</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Přidat typ revize
        </button>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingType ? 'Upravit typ revize' : 'Přidat nový typ revize'}
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Název typu revize
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="např. Revize elektroinstalace"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pravidla pro extrakci dat
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Datum revize (regex pattern)
                  </label>
                  <input
                    type="text"
                    value={formData.extraction_rules.revision_date}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      extraction_rules: {
                        ...prev.extraction_rules,
                        revision_date: e.target.value
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                    placeholder="např. \\d{1,2}\\.\\d{1,2}\\.\\d{4}"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Datum příští revize (regex pattern)
                  </label>
                  <input
                    type="text"
                    value={formData.extraction_rules.next_revision_date}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      extraction_rules: {
                        ...prev.extraction_rules,
                        next_revision_date: e.target.value
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                    placeholder="např. příští revize.*?(\\d{1,2}\\.\\d{1,2}\\.\\d{4})"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Závady (regex pattern)
                  </label>
                  <input
                    type="text"
                    value={formData.extraction_rules.defects}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      extraction_rules: {
                        ...prev.extraction_rules,
                        defects: e.target.value
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                    placeholder="např. závad[ay].*?(?=\\n\\n|$)"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Formát pojmenování souboru
              </label>
              <input
                type="text"
                value={formData.file_naming_format}
                onChange={(e) => setFormData(prev => ({ ...prev, file_naming_format: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                placeholder="{building_name}_{revision_name}_{date}.pdf"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Dostupné proměnné: {'{building_name}'}, {'{revision_name}'}, {'{date}'}
              </p>
              
              {/* Preview */}
              <div className="mt-2 p-2 bg-gray-50 rounded border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Náhled:</span>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    <Eye className="w-3 h-3 inline mr-1" />
                    {showPreview ? 'Skrýt' : 'Zobrazit'}
                  </button>
                </div>
                {showPreview && (
                  <div className="mt-1 font-mono text-xs text-gray-800">
                    {generatePreview()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Zrušit
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingType ? 'Uložit změny' : 'Vytvořit typ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Revision Types List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Seznam typů revizí</h3>
        </div>
        
        {revisionTypes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Žádné typy revizí</h3>
            <p className="text-gray-500 mb-4">
              Zatím jste nepřidali žádné typy revizí.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Přidat první typ
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {revisionTypes.map((revisionType) => (
              <div key={revisionType.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{revisionType.name}</h4>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div className="flex items-center">
                          <Code className="w-3 h-3 mr-1" />
                          Formát: <span className="font-mono ml-1">{revisionType.file_naming_format}</span>
                        </div>
                        <div className="text-xs">
                          Pravidla: {Object.keys(revisionType.extraction_rules).length} definovaných polí
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(revisionType)}
                      className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(revisionType.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};