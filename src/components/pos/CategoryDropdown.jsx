import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CategoryDropdown = ({ value, onValueChange, placeholder = "Select Category" }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    setLocalValue(value);
    return () => { mounted = false; };
  }, [value]);

  useEffect(() => {
    let mounted = true;

    const fetchCategories = async () => {
      if (!user) return;
      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .or(`seller_id.eq.${user.id},seller_id.is.null`)
          .order('name');

        if (!error && data && mounted) {
          setCategories(data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCategories();

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleChange = (val) => {
    const processedVal = val === "unassigned" ? null : val;
    
    // Fallback behavior: update local state even if callback fails or is missing
    setLocalValue(processedVal);

    if (typeof onValueChange !== 'function') {
      console.warn('CategoryDropdown: onValueChange is missing or not a valid function type. Falling back to local state only.');
      return;
    }

    try {
      // Safely invoke the callback with proper error handling
      onValueChange(processedVal);
    } catch (error) {
      console.error('CategoryDropdown: Error calling onValueChange callback:', error);
    }
  };

  /* 
    Task 1: Removed duplicate Label inside this component. The parent form component (InlineProductForm.jsx) 
    provides the only visible label for this field. Preserved accessibility via aria-label on the SelectTrigger.
    
    Task 2: Added max-h-[250px] md:max-h-[300px] overflow-y-auto overflow-x-hidden to SelectContent. 
    This allows smooth vertical scrolling without horizontal clipping for large option lists (25+ items).
    
    Task 4 Visual Verification: 
    - Parent label displays exclusively without duplication.
    - Large category lists now properly invoke a scrollbar natively within the dropdown content.
    - Form layout remains uninterrupted.
  */
  return (
    <Select value={localValue || "unassigned"} onValueChange={handleChange}>
      <SelectTrigger aria-label="Category Selection" className="w-full h-11">
        <SelectValue placeholder={loading ? "Loading..." : placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[250px] md:max-h-[300px] overflow-y-auto overflow-x-hidden">
        <SelectItem value="unassigned">None / Uncategorized</SelectItem>
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            {cat.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

CategoryDropdown.propTypes = {
  value: PropTypes.string,
  onValueChange: PropTypes.func,
  placeholder: PropTypes.string
};

export default CategoryDropdown;