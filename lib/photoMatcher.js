/**
 * Photo Indexer, Matcher, and Concurrent Downsampler
 * Efficiently matches Excel rows against image folders and uploads compressed avatars.
 */

// Allowed image file extensions
const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|webp|gif|bmp|tiff|svg)$/i;

/**
 * Indexes an uploaded image folder into a multi-key lookup Map
 * @param {FileList|File[]} files - Files from <input webkitdirectory>
 * @returns {{ map: Map<string, File>, count: number }}
 */
export function processImageFolder(files) {
    const photoMap = new Map();
    let count = 0;

    if (!files || files.length === 0) {
        return { map: photoMap, count: 0 };
    }

    for (const file of Array.from(files)) {
        const isImgType = file.type && file.type.startsWith('image/');
        const isImgExt = IMAGE_EXT_REGEX.test(file.name);
        if (!isImgType && !isImgExt) continue;

        const fullName = file.name.trim();
        const fullNameLower = fullName.toLowerCase();
        const nameWithoutExt = fullName.replace(/\.[^/.]+$/, "").trim();
        const nameWithoutExtLower = nameWithoutExt.toLowerCase();

        // 1. Exact & Lowercase filenames
        photoMap.set(fullName, file);
        photoMap.set(fullNameLower, file);
        photoMap.set(nameWithoutExt, file);
        photoMap.set(nameWithoutExtLower, file);

        // 2. Alphanumeric version (strips spaces, underscores, dashes)
        const cleanAlphaNum = nameWithoutExtLower.replace(/[^a-z0-9]/g, '');
        if (cleanAlphaNum) {
            photoMap.set(cleanAlphaNum, file);
        }

        // 3. Numeric extraction & zero-padding/stripping
        const numMatch = nameWithoutExt.match(/\d+/);
        if (numMatch) {
            const numStr = numMatch[0];
            photoMap.set(numStr, file);

            const stripped = numStr.replace(/^0+/, '') || '0';
            photoMap.set(stripped, file);
            photoMap.set(stripped + '.0', file); // Excel floating number support

            // Common zero-padded formats (4-digit, 6-digit)
            photoMap.set(stripped.padStart(4, '0'), file);
            photoMap.set(stripped.padStart(6, '0'), file);
        }

        count++;
    }

    return { map: photoMap, count };
}

/**
 * Finds the best matching photo for a student record using candidate fallbacks
 * @param {object} student - Student record from Excel
 * @param {Map<string, File>} photoMap - Indexed photo map
 * @returns {File|null} Matched image file or null
 */
export function findMatchingPhoto(student, photoMap) {
    if (!photoMap || photoMap.size === 0 || !student) return null;

    // Ordered candidate keys to check
    const candidateKeys = [
        student.photoNo,
        student.PhotoNo,
        student.admissionNo,
        student.AdmissionNo,
        student.grNumber,
        student.GRNumber,
        student.enrollmentNumber,
        student.EnrollmentNumber,
        student.rollNo,
        student.RollNo,
        student.metadata?.studentDetails?.rollNo,
        student.studentName,
        student.fullName,
        student.firstName,
        student.FirstName,
        student.profile?.firstName,
        student.StudentID,
        student.studentId,
        student._id
    ].filter(Boolean);

    for (const rawKey of candidateKeys) {
        const keyStr = String(rawKey).trim();
        if (!keyStr) continue;

        // Clean trailing Excel decimal if present (e.g. "101.0" -> "101")
        const cleanKey = keyStr.endsWith('.0') ? keyStr.slice(0, -2) : keyStr;
        const lowerKey = cleanKey.toLowerCase();
        const withoutExt = lowerKey.replace(/\.[^/.]+$/, "");
        const alphaNum = withoutExt.replace(/[^a-z0-9]/g, "");

        if (photoMap.has(cleanKey)) return photoMap.get(cleanKey);
        if (photoMap.has(lowerKey)) return photoMap.get(lowerKey);
        if (photoMap.has(withoutExt)) return photoMap.get(withoutExt);
        if (alphaNum && photoMap.has(alphaNum)) return photoMap.get(alphaNum);

        // Check stripped leading zeros
        const numMatch = withoutExt.match(/\d+/);
        if (numMatch) {
            const strippedNum = numMatch[0].replace(/^0+/, '') || '0';
            if (photoMap.has(strippedNum)) return photoMap.get(strippedNum);
            if (photoMap.has(strippedNum + '.0')) return photoMap.get(strippedNum + '.0');
        }
    }

    return null;
}

/**
 * Downsamples an image file client-side to maximum dimensions for lightweight avatar storage
 * @param {File} file - Original high-res image file
 * @param {number} maxDimension - Max width/height in px (default 500)
 * @param {number} quality - JPEG compression quality (default 0.85)
 * @returns {Promise<Blob>} Compressed image blob
 */
export async function downsampleImage(file, maxDimension = 500, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            let { width, height } = img;
            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Canvas context unavailable'));
            }

            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Image conversion to blob failed'));
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Failed to load image ${file.name}`));
        };

        img.src = objectUrl;
    });
}

/**
 * Uploads matched photos concurrently with a worker pool and progress tracking
 * @param {Array<{ rowIdx: number, file: File }>} matchedEntries - Array of row index and File
 * @param {function({ completed: number, total: number, percent: number })} onProgress - Progress callback
 * @param {number} concurrency - Max simultaneous uploads (default 6)
 * @returns {Promise<Record<number, { url: string, publicId: string }>>} Mapping of rowIdx to upload result
 */
export async function compressAndUploadPhotos(matchedEntries, onProgress, concurrency = 6) {
    const results = {};
    const total = matchedEntries.length;
    let completed = 0;

    if (total === 0) return results;

    let index = 0;

    async function worker() {
        while (index < total) {
            const currentIndex = index++;
            const item = matchedEntries[currentIndex];

            try {
                // 1. Downscale on client canvas
                const compressedBlob = await downsampleImage(item.file, 500, 0.85);

                // 2. Upload via standard /api/v1/upload
                const formData = new FormData();
                formData.append('file', compressedBlob, item.file.name.replace(/\.[^/.]+$/, '.jpg'));
                formData.append('fileType', 'image');

                const res = await fetch('/api/v1/upload', {
                    method: 'POST',
                    body: formData
                });

                if (res.ok) {
                    const data = await res.json();
                    results[item.rowIdx] = {
                        url: data.url,
                        publicId: data.public_id || data.publicId || ''
                    };
                } else {
                    console.warn(`[PhotoUpload] Failed for row ${item.rowIdx}:`, await res.text());
                }
            } catch (err) {
                console.error(`[PhotoUpload Error] Row ${item.rowIdx}:`, err);
            } finally {
                completed++;
                if (onProgress) {
                    onProgress({
                        completed,
                        total,
                        percent: Math.round((completed / total) * 100)
                    });
                }
            }
        }
    }

    const pool = Array.from({ length: Math.min(concurrency, total) }, () => worker());
    await Promise.all(pool);

    return results;
}
