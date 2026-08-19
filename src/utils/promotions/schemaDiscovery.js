import { supabase } from '@/lib/supabaseClient';

/**
 * Diagnostic utility to discover the actual promotions table schema
 * Returns all column names, data types, and constraints
 */
export const discoverPromotionsSchema = async () => {
  try {
    // Query information_schema to get actual column definitions
    const { data, error } = await supabase.rpc('get_table_schema', {
      table_name: 'promotions',
      schema_name: 'public'
    });

    if (error) {
      console.error('[Schema Discovery] Error:', error);
      // Fallback: try querying the table directly to see what columns exist
      const { data: sampleData, error: sampleError } = await supabase
        .from('promotions')
        .select('*')
        .limit(1);
      
      if (!sampleError && sampleData && sampleData.length > 0) {
        const columns = Object.keys(sampleData[0]);
        console.log('[Schema Discovery] Discovered columns from sample query:', columns);
        return { columns, source: 'sample_query' };
      }
      
      throw error;
    }

    return { columns: data, source: 'information_schema' };
  } catch (err) {
    console.error('[Schema Discovery] Failed to discover schema:', err);
    // Return known schema from database documentation
    return {
      columns: [
        'id', 'shop_id', 'type', 'title', 'description', 
        'discount_value', 'discount_type', 'combo_products',
        'bogo_product_id', 'bogo_free_product_id',
        'validity_start', 'validity_end', 'status',
        'created_at', 'updated_at', 'is_active'
      ],
      source: 'fallback_documentation'
    };
  }
};

/**
 * Documented promotions table schema (based on database analysis)
 * Source of truth for all promotion queries
 */
export const PROMOTIONS_SCHEMA = {
  tableName: 'promotions',
  columns: {
    id: { type: 'uuid', required: true, description: 'Primary key' },
    shop_id: { type: 'uuid', required: true, description: 'Foreign key to profiles table' },
    type: { type: 'text', required: true, description: 'Promotion type (NOT offer_type)' },
    title: { type: 'text', required: true, description: 'Promotion title (NOT name)' },
    description: { type: 'text', required: false, description: 'Promotion description' },
    discount_value: { type: 'numeric', required: false, description: 'Discount amount or percentage' },
    discount_type: { type: 'text', required: false, description: 'Type of discount (percentage/fixed)' },
    combo_products: { type: 'jsonb', required: false, description: 'Products in combo deals' },
    bogo_product_id: { type: 'uuid', required: false, description: 'Buy product ID for BOGO' },
    bogo_free_product_id: { type: 'uuid', required: false, description: 'Free product ID for BOGO' },
    validity_start: { type: 'timestamp with time zone', required: false, description: 'Promotion start date' },
    validity_end: { type: 'timestamp with time zone', required: false, description: 'Promotion end date' },
    status: { type: 'text', required: false, description: 'Promotion status' },
    created_at: { type: 'timestamp with time zone', required: false, description: 'Creation timestamp' },
    updated_at: { type: 'timestamp with time zone', required: false, description: 'Last update timestamp' },
    is_active: { type: 'boolean', required: false, description: 'Whether promotion is active' }
  },
  selectColumns: 'id, shop_id, type, title, description, discount_value, discount_type, combo_products, bogo_product_id, bogo_free_product_id, validity_start, validity_end, status, created_at, updated_at, is_active',
  editableColumns: ['type', 'title', 'description', 'discount_value', 'discount_type', 'validity_start', 'validity_end', 'is_active']
};

/**
 * Get a safe select string for promotions queries
 */
export const getPromotionsSelectString = () => {
  return PROMOTIONS_SCHEMA.selectColumns;
};