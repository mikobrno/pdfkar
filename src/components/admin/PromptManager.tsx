import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Edit, 
  Archive, 
  Play, 
  History, 
  Save,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { db } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Prompt } from '../../types';
import toast from 'react-hot-toast';

interface PromptGroup {
  prompt_name: string;
  versions: Prompt[];
  active_version?: Prompt;
}

export const PromptManager: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [testing, setTesting] = useState(false);

  // Fetch all prompts
  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ['prompts'],
    queryFn: async () => {
      const { data, error } = await db.supabase
        .from('prompts')
        .select('*')
        .order('prompt_name')
        .order('version', { ascending: false });
      
      if (error) throw error;
      return data as Prompt[];
    }
  });

  // Group prompts by name
  const promptGroups: PromptGroup[] = React.useMemo(() => {
    const groups = prompts.reduce((acc, prompt) => {
      if (!acc[prompt.prompt_name]) {
        acc[prompt.prompt_name] = {
          prompt_name: prompt.prompt_name,
          versions: [],
          active_version: undefined
        };
      }
      
      acc[prompt.prompt_name].versions.push(prompt);
      
      if (prompt.status === 'active') {
        acc[prompt.prompt_name].active_version = prompt;
      }
      
      return acc;
    }, {} as Record<string, PromptGroup>);
    
    return Object.values(groups);
  }, [prompts]);

  // Create new prompt version
  const createMutation = useMutation({
    mutationFn: async (data: {
      prompt_name: string;
      prompt_text: string;
      model_parameters: Record<string, any>;
      changelog: string;
    }) => {
      const existingVersions = prompts.filter(p => p.prompt_name === data.prompt_name);
      const nextVersion = existingVersions.length > 0 
        ? Math.max(...existingVersions.map(p => p.version)) + 1 
        : 1;

      const { data: result, error } = await db.createPromptVersion({
        prompt_name: data.prompt_name,
        version: nextVersion,
        prompt_text: data.prompt_text,
        model_parameters: data.model_parameters,
        status: 'draft',
        changelog: data.changelog,
        created_by: user!.id
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      setIsCreating(false);
      setEditingPrompt(null);
      toast.success('Prompt version created successfully');
    },
    onError: (error) => {
      console.error('Failed to create prompt:', error);
      toast.error('Failed to create prompt version');
    }
  });

  // Activate prompt version
  const activateMutation = useMutation({
    mutationFn: async ({ id, promptName }: { id: string; promptName: string }) => {
      const { error } = await db.activatePrompt(id, promptName);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      toast.success('Prompt version activated');
    },
    onError: (error) => {
      console.error('Failed to activate prompt:', error);
      toast.error('Failed to activate prompt version');
    }
  });

  const handleCreatePrompt = (data: {
    prompt_name: string;
    prompt_text: string;
    model_parameters: Record<string, any>;
    changelog: string;
  }) => {
    createMutation.mutate(data);
  };

  const handleActivatePrompt = (prompt: Prompt) => {
    activateMutation.mutate({
      id: prompt.id,
      promptName: prompt.prompt_name
    });
  };

  const testPrompt = async (prompt: Prompt) => {
    if (!testInput.trim()) {
      toast.error('Please enter test input');
      return;
    }

    setTesting(true);
    try {
      // Simulate AI API call - in real implementation, this would call your AI service
      const processedPrompt = prompt.prompt_text.replace('{{document_text}}', testInput);
      
      // Mock response for demonstration
      setTimeout(() => {
        setTestOutput(`Mock AI Response for prompt "${prompt.prompt_name}" v${prompt.version}:\n\nProcessed input: ${testInput.substring(0, 100)}...\n\nExtracted data would appear here based on the prompt logic.`);
        setTesting(false);
      }, 2000);
    } catch (error) {
      console.error('Test failed:', error);
      toast.error('Failed to test prompt');
      setTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prompt Management</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Prompt
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prompt Groups List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Prompt Library</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {promptGroups.map((group) => (
              <div
                key={group.prompt_name}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedGroup === group.prompt_name ? 'bg-indigo-50 border-r-2 border-indigo-500' : ''
                }`}
                onClick={() => setSelectedGroup(group.prompt_name)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{group.prompt_name}</h3>
                    <p className="text-sm text-gray-500">
                      {group.versions.length} version{group.versions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {group.active_version && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        v{group.active_version.version}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Version History */}
        {selectedGroup && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Version History</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {promptGroups
                .find(g => g.prompt_name === selectedGroup)
                ?.versions.map((prompt) => (
                  <div key={prompt.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          Version {prompt.version}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          prompt.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : prompt.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {prompt.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setEditingPrompt(prompt)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {prompt.status !== 'active' && (
                          <button
                            onClick={() => handleActivatePrompt(prompt)}
                            className="p-1 text-gray-400 hover:text-green-600"
                            title="Activate this version"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{prompt.changelog}</p>
                    <p className="text-xs text-gray-500">
                      Created {new Date(prompt.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Prompt Editor/Playground */}
        {(editingPrompt || isCreating) && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">
                  {isCreating ? 'Create New Prompt' : `Edit ${editingPrompt?.prompt_name} v${editingPrompt?.version}`}
                </h2>
                <button
                  onClick={() => {
                    setEditingPrompt(null);
                    setIsCreating(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <PromptEditor
                prompt={editingPrompt}
                isCreating={isCreating}
                onSave={handleCreatePrompt}
                onTest={(prompt) => testPrompt(prompt)}
                testInput={testInput}
                setTestInput={setTestInput}
                testOutput={testOutput}
                testing={testing}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Prompt Editor Component
interface PromptEditorProps {
  prompt: Prompt | null;
  isCreating: boolean;
  onSave: (data: {
    prompt_name: string;
    prompt_text: string;
    model_parameters: Record<string, any>;
    changelog: string;
  }) => void;
  onTest: (prompt: Prompt) => void;
  testInput: string;
  setTestInput: (input: string) => void;
  testOutput: string;
  testing: boolean;
}

const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt,
  isCreating,
  onSave,
  onTest,
  testInput,
  setTestInput,
  testOutput,
  testing
}) => {
  const [formData, setFormData] = useState({
    prompt_name: prompt?.prompt_name || '',
    prompt_text: prompt?.prompt_text || '',
    model_parameters: prompt?.model_parameters || { temperature: 0.7, max_tokens: 2048 },
    changelog: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isCreating && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prompt Name
          </label>
          <input
            type="text"
            value={formData.prompt_name}
            onChange={(e) => setFormData(prev => ({ ...prev, prompt_name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="e.g., extract_review_report_data"
            required
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Prompt Text
        </label>
        <textarea
          value={formData.prompt_text}
          onChange={(e) => setFormData(prev => ({ ...prev, prompt_text: e.target.value }))}
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
          placeholder="Enter your prompt here. Use {{document_text}} as placeholder for document content."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Model Parameters (JSON)
        </label>
        <textarea
          value={JSON.stringify(formData.model_parameters, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setFormData(prev => ({ ...prev, model_parameters: parsed }));
            } catch {
              // Invalid JSON, don't update
            }
          }}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Changelog
        </label>
        <textarea
          value={formData.changelog}
          onChange={(e) => setFormData(prev => ({ ...prev, changelog: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Describe what changed in this version..."
          required
        />
      </div>

      {/* Test Playground */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Test Playground</h3>
        <div className="space-y-2">
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            placeholder="Enter test document text here..."
          />
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => prompt && onTest(prompt)}
              disabled={testing || !testInput.trim()}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test Prompt'}
            </button>
          </div>
          {testOutput && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Test Output:</h4>
              <pre className="text-sm text-gray-600 whitespace-pre-wrap">{testOutput}</pre>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Version
        </button>
      </div>
    </form>
  );
};