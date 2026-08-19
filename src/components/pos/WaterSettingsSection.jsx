import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from '@/components/ui/switch'; // Added Switch import
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Droplet, MapPin, X } from 'lucide-react';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Badge } from '@/components/ui/badge';

const WaterSettingsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allServiceAreas, setAllServiceAreas] = useState([]);
  
  const [settings, setSettings] = useState({
    water_delivery_enabled: false,
    water_delivery_areas: []
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch Global Service Areas
      const { data: areas, error: areasError } = await supabase
        .from('water_delivery_areas')
        .select('id, name, delivery_charge')
        .eq('is_active', true)
        .order('name');
        
      if (areasError) throw areasError;
      setAllServiceAreas(areas || []);

      // Fetch Seller's Settings
      const { data: retailerSettings, error: settingsError } = await supabase
        .from('pos_retailer_settings')
        .select('water_delivery_enabled, water_delivery_areas')
        .eq('user_id', user.id)
        .single();
      
      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      
      if (retailerSettings) {
        setSettings({
          water_delivery_enabled: retailerSettings.water_delivery_enabled || false,
          water_delivery_areas: retailerSettings.water_delivery_areas || []
        });
      }

    } catch (error) {
      console.error('Error fetching water settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddArea = (areaId) => {
    if (areaId && !settings.water_delivery_areas.includes(areaId)) {
      setSettings(prev => ({
        ...prev,
        water_delivery_areas: [...prev.water_delivery_areas, areaId]
      }));
    }
  };

  const handleRemoveArea = (areaId) => {
    setSettings(prev => ({
      ...prev,
      water_delivery_areas: prev.water_delivery_areas.filter(id => id !== areaId)
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Save Settings
      const { error: settingsError } = await supabase
        .from('pos_retailer_settings')
        .upsert({
          user_id: user.id,
          water_delivery_enabled: settings.water_delivery_enabled,
          water_delivery_areas: settings.water_delivery_areas
        }, { onConflict: 'user_id' });

      if (settingsError) throw settingsError;

      toast({
        title: "Success",
        description: "Water delivery settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings: " + error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Prepare options for the searchable select
  const areaOptions = allServiceAreas.map(area => ({
    value: area.id,
    label: `${area.name} (₹${area.delivery_charge})`
  }));

  // Identify selected areas for display
  const selectedAreasList = allServiceAreas.filter(area => 
    settings.water_delivery_areas.includes(area.id)
  );

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Droplet className="w-5 h-5 text-blue-500" />
            Water Delivery Service
          </CardTitle>
          <CardDescription>
            Enable or disable water delivery for your shop and define your service areas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* Enable/Disable Water Delivery */}
          <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg bg-slate-50">
            <div className="grid gap-1.5">
              <Label htmlFor="water_delivery_enabled" className="font-semibold text-base">Enable Water Delivery</Label>
              <p className="text-sm text-slate-500">Allow customers to order water for delivery from your shop.</p>
            </div>
            <Switch
              id="water_delivery_enabled"
              checked={settings.water_delivery_enabled}
              onCheckedChange={(c) => setSettings(prev => ({...prev, water_delivery_enabled: c}))}
            />
          </div>

          {/* Service Area Selection */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Select Service Areas
            </h3>
            <p className="text-sm text-slate-500 mb-4">Choose the areas where you provide water delivery services.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Add Service Area</Label>
                <SearchableSelect
                  options={areaOptions}
                  value=""
                  onSelect={handleAddArea}
                  placeholder="Search and select area..."
                  searchPlaceholder="Type area name..."
                  className="w-full"
                />
                <p className="text-xs text-slate-500">Search by area name to add to your list.</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 min-h-[100px]">
                <Label className="text-sm font-medium block mb-3">Selected Areas</Label>
                {selectedAreasList.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedAreasList.map(area => (
                      <Badge 
                        key={area.id} 
                        variant="secondary" 
                        className="pl-3 pr-1 py-1.5 flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                      >
                        {area.name} <span className="text-xs text-slate-400">₹{area.delivery_charge}</span>
                        <button 
                          type="button" // Important for accessibility and form submission
                          onClick={() => handleRemoveArea(area.id)}
                          className="hover:bg-red-100 p-0.5 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 italic text-center py-4">
                    No service areas selected yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t p-4 flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="min-w-[140px] bg-blue-600 hover:bg-blue-700 shadow-md gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
      </Card>
    </div>
  );
};

export default WaterSettingsSection;