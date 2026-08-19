import { supabase } from '@/lib/supabaseClient';

/**
 * Uploads product images to Supabase storage.
 * @param {string} productId - The ID of the product.
 * @param {File|null} file1 - First image file.
 * @param {File|null} file2 - Second image file.
 * @returns {Promise<{image_1_url: string|null, image_2_url: string|null}>}
 */
export const uploadProductImages = async (productId, file1, file2) => {
  const urls = { image_1_url: null, image_2_url: null };
  
  if (!productId) return urls;

  const uploadSingleFile = async (file, index) => {
    if (!file) return null;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `image-${index}-${Date.now()}.${fileExt}`;
      const filePath = `pos/${productId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error(`Upload error for image ${index}:`, uploadError);
        return null;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error(`Unexpected error uploading image ${index}:`, err);
      return null;
    }
  };

  urls.image_1_url = await uploadSingleFile(file1, 1);
  urls.image_2_url = await uploadSingleFile(file2, 2);

  return urls;
};