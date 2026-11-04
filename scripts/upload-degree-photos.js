/**
 * Smt. Danamma Channabasavaiah Degree College (SDCDEGKOLAR)
 * Student Photo Cloudinary Uploader
 *
 * Runs locally on your PC:
 * 1. Reads "SDC Kolar Data Collection (GSheet).xlsx" to match Photo No -> Student ID
 * 2. Uploads photos from local disk directly to Cloudinary (zero GitHub footprint!)
 * 3. Saves the resulting CDN URLs to "scripts/data/sdc-photo-urls.json"
 *
 * Usage:
 *   node scripts/upload-degree-photos.js --dry-run
 *   node scripts/upload-degree-photos.js --limit 5
 *   node scripts/upload-degree-photos.js
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: '.env.local' });

// ============================================================================
// CONFIGURATION
// ============================================================================

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function run() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

    const limit = get('--limit') ? parseInt(get('--limit'), 10) : Infinity;
    const concurrency = get('--concurrency') ? parseInt(get('--concurrency'), 10) : 5;

    let photosDir = get('--photos-dir') || 'E:/Users/SN01-01-15/Desktop/Schools/SDC/SDC Degree Kolar/SDC Deg Kolar Photos';
    if (!fs.existsSync(photosDir)) {
        photosDir = path.resolve('C:/Users/Comp/Desktop/Schools/SDC/SDC Degree Kolar/SDC Deg Kolar Photos');
    }

    let gsheetFile = get('--gsheet') || path.join(__dirname, 'data', 'SDC Kolar Data Collection (GSheet).xlsx');
    if (!fs.existsSync(gsheetFile)) {
        gsheetFile = 'E:/Users/SN01-01-15/Desktop/Schools/SDC/SDC Degree Kolar/SDC Kolar Data Collection (GSheet).xlsx';
    }

    const outputJsonFile = path.join(__dirname, 'data', 'sdc-photo-urls.json');

    console.log('=================================================================');
    console.log('   SDC DEGREE COLLEGE — STUDENT PHOTO CLOUDINARY UPLOADER       ');
    console.log('=================================================================');
    console.log(`Cloudinary Cloud: ${process.env.CLOUDINARY_CLOUD_NAME || 'NOT CONFIGURED'}`);
    console.log(`Photos Folder   : ${photosDir}`);
    console.log(`GSheet File     : ${gsheetFile}`);
    console.log(`Output URLs File: ${outputJsonFile}`);
    console.log(`Mode            : ${isDryRun ? '⚠️  DRY-RUN (no uploads)' : '🚀 LIVE'}`);
    if (limit !== Infinity) console.log(`Limit           : First ${limit} photos`);
    console.log('-----------------------------------------------------------------\n');

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error('❌ Cloudinary credentials missing in .env.local');
        process.exit(1);
    }

    if (!fs.existsSync(photosDir)) {
        console.error(`❌ Photos folder not found: ${photosDir}`);
        process.exit(1);
    }

    if (!fs.existsSync(gsheetFile)) {
        console.error(`❌ GSheet file not found: ${gsheetFile}`);
        process.exit(1);
    }

    // Load existing mapping if present (to allow resume without re-uploading)
    let urlMap = {};
    if (fs.existsSync(outputJsonFile)) {
        try {
            urlMap = JSON.parse(fs.readFileSync(outputJsonFile, 'utf8'));
            console.log(`Loaded ${Object.keys(urlMap).length} previously uploaded photo URLs from JSON.`);
        } catch (e) {
            urlMap = {};
        }
    }

    // 1. Read GSheet
    const wb = XLSX.readFile(gsheetFile);
    const sheetName = wb.Sheets['Sheet1'] ? 'Sheet1' : wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

    const tasks = [];
    const seenStudents = new Set();

    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r) continue;
        const studentName = String(r[1] || '').trim();
        const id1 = String(r[2] || '').trim().toUpperCase();
        const id2 = String(r[3] || '').trim().toUpperCase();
        const photoNo = String(r[15] || '').trim();

        if (!photoNo) continue;

        const sdcId = id1.startsWith('SDC') ? id1 : (id2.startsWith('SDC') ? id2 : null);
        const regNo = id1.startsWith('U') ? id1 : (id2.startsWith('U') ? id2 : null);
        const primaryKey = sdcId || regNo || id1;

        if (!primaryKey || seenStudents.has(primaryKey)) continue;
        seenStudents.add(primaryKey);

        // Check if photo exists on disk
        const cleanNo = photoNo.replace(/\.jpg$/i, '');
        const candidateFiles = [
            path.join(photosDir, `${cleanNo}.jpg`),
            path.join(photosDir, `${cleanNo}.jpeg`),
            path.join(photosDir, `${cleanNo}.png`),
            path.join(photosDir, `${cleanNo}.JPG`)
        ];
        const photoPath = candidateFiles.find(f => fs.existsSync(f));

        if (photoPath) {
            tasks.push({
                primaryKey,
                sdcId,
                regNo,
                name: studentName,
                photoNo: cleanNo,
                photoPath,
                alreadyUploaded: !!(urlMap[primaryKey] || (sdcId && urlMap[sdcId]))
            });
        }
    }

    console.log(`\nFound ${tasks.length} students with matching local photos.`);
    const toUpload = tasks.filter(t => !t.alreadyUploaded).slice(0, limit);
    const skippedAlready = tasks.filter(t => t.alreadyUploaded).length;

    console.log(`  - Already uploaded : ${skippedAlready}`);
    console.log(`  - Pending to upload: ${toUpload.length}\n`);

    if (toUpload.length === 0) {
        console.log('✅ All matched photos are already uploaded! Nothing to do.');
        return;
    }

    if (isDryRun) {
        console.log('--- Sample 10 items that would be uploaded ---');
        toUpload.slice(0, 10).forEach(t => {
            console.log(`  📸 ${t.sdcId} (${t.name}) -> ${path.basename(t.photoPath)}`);
        });
        console.log('\nDry run complete. Remove --dry-run to start upload.');
        return;
    }

    // 2. Upload with controlled concurrency
    let completed = 0;
    let failed = 0;

    async function uploadOne(task) {
        try {
            const publicId = (task.sdcId || task.primaryKey).toLowerCase();
            const res = await cloudinary.uploader.upload(task.photoPath, {
                folder: 'ims/students/sdcdeg',
                public_id: publicId,
                overwrite: true,
                transformation: [
                    { width: 600, height: 750, crop: 'fill', gravity: 'face' },
                    { quality: 'auto', fetch_format: 'auto' }
                ]
            });

            urlMap[task.primaryKey] = res.secure_url;
            if (task.sdcId) urlMap[task.sdcId] = res.secure_url;
            if (task.regNo) urlMap[task.regNo] = res.secure_url;
            completed++;
            process.stdout.write(`\r✅ Uploaded [${completed}/${toUpload.length}] ${task.primaryKey} (${task.name})            `);

            // Save JSON incrementally every 10 uploads
            if (completed % 10 === 0) {
                fs.writeFileSync(outputJsonFile, JSON.stringify(urlMap, null, 2));
            }
        } catch (err) {
            failed++;
            console.error(`\n❌ Failed ${task.sdcId} (${task.photoNo}): ${err.message}`);
        }
    }

    // Parallel queue worker
    console.log(`Starting upload with concurrency ${concurrency}...`);
    const queue = [...toUpload];
    const workers = [];

    for (let c = 0; c < concurrency; c++) {
        workers.push((async () => {
            while (queue.length > 0) {
                const task = queue.shift();
                if (task) await uploadOne(task);
            }
        })());
    }

    await Promise.all(workers);

    // Final save
    fs.writeFileSync(outputJsonFile, JSON.stringify(urlMap, null, 2));

    console.log('\n\n=================================================================');
    console.log('                      UPLOAD COMPLETE                           ');
    console.log('=================================================================');
    console.log(`Total URLs in Map : ${Object.keys(urlMap).length}`);
    console.log(`Uploaded this run : ${completed}`);
    console.log(`Failed            : ${failed}`);
    console.log(`Mapping saved to  : ${outputJsonFile}`);
    console.log('=================================================================\n');
    console.log('Next step:');
    console.log('1. Commit and push scripts/data/sdc-photo-urls.json to GitHub.');
    console.log('2. Run onboarding on production to assign avatar URLs to students in MongoDB.\n');
}

run().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});
