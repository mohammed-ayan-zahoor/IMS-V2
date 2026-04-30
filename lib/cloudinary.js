import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
if (process.env.CLOUDINARY_URL) {
    cloudinary.config(true); // Trust the URL
} else {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

/**
 * Uploads a buffer to Cloudinary
 * @param {Buffer} buffer - The file buffer
 * @param {string} folder - The destination folder in Cloudinary
 * @returns {Promise<Object>} - The Cloudinary upload result
 */
export const uploadToCloudinary = (buffer, folder = 'ims') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: 'auto',
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        uploadStream.end(buffer);
    });
};

export default cloudinary;
