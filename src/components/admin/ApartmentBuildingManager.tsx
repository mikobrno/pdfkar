import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  X,
  Building,
  MapPin
} from 'lucide-react';
import { db } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { ApartmentBuilding } from '../../types';
import toast from 'react-hot-toast';

export const ApartmentBuildingManager: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingBuilding, setEditingBuilding] = useState<ApartmentBuilding | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: ''
  });

  // Fetch apartment buildings
  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ['apartment-buildings', user?.id],
    queryFn: async () => {
      const { data, error } = await db.getApartmentBuildings(user?.id);
      if (error) throw error;
      return data as ApartmentBuilding[];
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; address: string }) => {
      const { data: result, error } = await db.createApartmentBuilding({
        name: data.name,
        address: data.address,
        user_id: user!.id
      });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apartment-buildings'] });
      setIsCreating(false);
      setFormData({ name: '', address: '' });
      toast.success('Bytový dům byl úspěšně vytvořen');
    },
    onError: (error) => {
      console.error('Failed to create building:', error);
      toast.error('Nepodařilo se vytvořit bytový dům');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; address: string }) => {
      const { data: result, error } = await db.updateApartmentBuilding(data.id, {
        name: data.name,
        address: data.address
      });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apartment-buildings'] });
      setEditingBuilding(null);
      setFormData({ name: '', address: '' });
      toast.success('Bytový dům byl úspěšně aktualizován');
    },
    onError: (error) => {
      console.error('Failed to update building:', error);
      toast.error('Nepodařilo se aktualizovat bytový dům');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.deleteApartmentBuilding(id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apartment-buildings'] });
      toast.success('Bytový dům byl úspěšně smazán');
    },
    onError: (error) => {
      console.error('Failed to delete building:', error);
      toast.error('Nepodařilo se smazat bytový dům');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBuilding) {
      updateMutation.mutate({
        id: editingBuilding.id,
        name: formData.name,
        address: formData.address
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (building: ApartmentBuilding) => {
    setEditingBuilding(building);
    setFormData({
      name: building.name,
      address: building.address
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setEditingBuilding(null);
    setIsCreating(false);
    setFormData({ name: '', address: '' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Opravdu chcete smazat tento bytový dům?')) {
      deleteMutation.mutate(id);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Správa bytových domů</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Přidat dům
        </button>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingBuilding ? 'Upravit bytový dům' : 'Přidat nový bytový dům'}
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Název domu
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="např. Bytový dům Na Kopci 15"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresa
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="např. Na Kopci 15, 120 00 Praha 2"
                required
              />
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
                {editingBuilding ? 'Uložit změny' : 'Vytvořit dům'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Buildings List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Seznam bytových domů</h3>
        </div>
        
        {buildings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Žádné bytové domy</h3>
            <p className="text-gray-500 mb-4">
              Zatím jste nepřidali žádné bytové domy.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Přidat první dům
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {buildings.map((building) => (
              <div key={building.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <Building className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{building.name}</h4>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="w-4 h-4 mr-1" />
                      {building.address}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(building)}
                    className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(building.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};