import { Cloudinary } from '@cloudinary/url-gen';
import { auto } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';

// Initialize Cloudinary with your cloud name
const cld = new Cloudinary({ 
  cloud: { 
    cloudName: 'dxttm3ivu' 
  } 
});

// Utility function to create optimized images
export const createOptimizedImage = (imageId, options = {}) => {
  const {
    width = 500,
    height = 500,
    format = 'auto',
    quality = 'auto',
    gravity = autoGravity(),
    crop = 'auto'
  } = options;

  return cld
    .image(imageId)
    .format(format)
    .quality(quality)
    .resize(auto().gravity(gravity).width(width).height(height));
};

// Utility function for hero images
export const createHeroImage = (imageId) => {
  return createOptimizedImage(imageId, {
    width: 800,
    height: 600,
    crop: 'fill'
  });
};

// Utility function for thumbnail images
export const createThumbnailImage = (imageId) => {
  return createOptimizedImage(imageId, {
    width: 200,
    height: 200,
    crop: 'fill'
  });
};

// Utility function for gallery images
export const createGalleryImage = (imageId) => {
  return createOptimizedImage(imageId, {
    width: 400,
    height: 300,
    crop: 'fill'
  });
};

// Export the Cloudinary instance for direct use
export { cld }; 