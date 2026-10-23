import { createExtractorFromData } from "node-unrar-js";
import PizZip from "pizzip";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// ── Resolve unrar.wasm binary safely across Node/Next.js runtimes ───────────
function getUnrarWasmBinary() {
    const candidatePaths = [
        path.join(process.cwd(), "node_modules", "node-unrar-js", "dist", "js", "unrar.wasm"),
        path.join(path.dirname(require.resolve("node-unrar-js")), "js", "unrar.wasm"),
        path.join(process.cwd(), ".next", "server", "unrar.wasm")
    ];

    for (const p of candidatePaths) {
        try {
            if (fs.existsSync(p)) {
                return fs.readFileSync(p);
            }
        } catch {
            // continue checking
        }
    }
    return null;
}

// ── Ensure DOMMatrix for pdfjs in Node.js ────────────────────────────────────
if (!global.DOMMatrix) {
    global.DOMMatrix = class DOMMatrix {
        constructor() {
            this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        }
    };
}

// ── Magic Bytes Detection ───────────────────────────────────────────────────
export function detectFileType(buffer) {
    if (!buffer || buffer.length < 4) return "unknown";

    // RAR (both RAR4 and RAR5)
    if (buffer.length >= 7 &&
        buffer[0] === 0x52 && buffer[1] === 0x61 && buffer[2] === 0x72 &&
        buffer[3] === 0x21 && buffer[4] === 0x1A && buffer[5] === 0x07) {
        return "rar";
    }

    // PDF (%PDF)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
        return "pdf";
    }

    // XLS (OLE compound file)
    if (buffer.length >= 8 &&
        buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0) {
        return "xls";
    }

    // ZIP (could be .zip or .xlsx)
    if (buffer[0] === 0x50 && buffer[1] === 0x4B &&
        (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)) {
        return "zip";
    }

    return "unknown";
}

// ── Time parsing helper ─────────────────────────────────────────────────────
export function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const clean = String(timeStr).trim().replace(".", ":");
    const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM))?$/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridian = match[3]?.toUpperCase();
    if (meridian === "PM" && hours < 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

// ── Name Normalizer for Fuzzy / Safe Matching ───────────────────────────────
export function normalizeName(name) {
    if (!name) return "";
    return String(name).toLowerCase()
        .replace(/\b(dr|mr|mrs|prof|miss|ms)\b/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

// ── Archive Extractor (In-Memory for RAR and ZIP) ───────────────────────────
export async function extractArchive(buffer, fileType = "rar") {
    const MAX_ARCHIVE_SIZE = 25 * 1024 * 1024; // 25 MB
    const MAX_UNCOMPRESSED_SIZE = 100 * 1024 * 1024; // 100 MB
    const MAX_FILES = 50;

    if (buffer.length > MAX_ARCHIVE_SIZE) {
        throw new Error("Archive file exceeds the 25 MB size limit.");
    }

    let extractedFiles = [];

    if (fileType === "zip") {
        try {
            const zip = new PizZip(buffer);
            const fileKeys = Object.keys(zip.files);
            if (fileKeys.length === 0) {
                throw new Error("The uploaded ZIP archive is empty.");
            }
            if (fileKeys.length > MAX_FILES) {
                throw new Error(`Archive contains too many files (${fileKeys.length}). Maximum allowed is ${MAX_FILES}.`);
            }

            let totalUncompressed = 0;
            for (const key of fileKeys) {
                const f = zip.files[key];
                if (!f.dir) {
                    const data = f.asNodeBuffer();
                    totalUncompressed += data.length;
                    if (totalUncompressed > MAX_UNCOMPRESSED_SIZE) {
                        throw new Error("Archive uncompressed content exceeds the 100 MB safety limit.");
                    }
                    const baseName = key.split(/[\\/]/).pop();
                    extractedFiles.push({
                        name: baseName,
                        path: key,
                        data,
                        size: data.length
                    });
                }
            }
        } catch (zipErr) {
            throw new Error(`Failed to extract ZIP archive: ${zipErr.message}`);
        }
    } else {
        // RAR extraction
        try {
            const wasmBinary = getUnrarWasmBinary();
            const extractorOpts = { data: buffer.buffer };
            if (wasmBinary) {
                extractorOpts.wasmBinary = wasmBinary;
            }
            const extractor = await createExtractorFromData(extractorOpts);
            const list = extractor.getFileList();

            if (list.arcHeader?.flags?.headerEncrypted) {
                throw new Error("Password-protected archives are not supported. Please remove the password and re-upload.");
            }
            if (list.arcHeader?.flags?.volume) {
                throw new Error("Multi-volume RAR files (.part1, .part2) are not supported. Please upload a single complete archive.");
            }

            const headers = [...list.fileHeaders];
            if (headers.length === 0) {
                throw new Error("The uploaded archive is empty.");
            }
            if (headers.length > MAX_FILES) {
                throw new Error(`Archive contains too many files (${headers.length}). Maximum allowed is ${MAX_FILES}.`);
            }

            let totalUncompressed = 0;
            for (const h of headers) {
                totalUncompressed += h.unpSize || 0;
                if (totalUncompressed > MAX_UNCOMPRESSED_SIZE) {
                    throw new Error("Archive uncompressed content exceeds the 100 MB safety limit.");
                }
            }

            const extracted = extractor.extract({});
            for (const file of extracted.files) {
                if (!file.fileHeader.flags.directory && file.extraction) {
                    // Strip directory traversal or path prefixes for security
                    const baseName = file.fileHeader.name.split(/[\\/]/).pop();
                    extractedFiles.push({
                        name: baseName,
                        path: file.fileHeader.name,
                        data: Buffer.from(file.extraction),
                        size: file.extraction.length
                    });
                }
            }
        } catch (err) {
            if (err.message && (err.message.includes("Password") || err.message.includes("Multi-volume") || err.message.includes("limit"))) {
                throw err;
            }
            throw new Error(`Failed to extract RAR archive: ${err.message || "Corrupt or malformed archive"}`);
        }
    }

    if (extractedFiles.length === 0) {
        throw new Error("No readable files found inside the archive.");
    }

    return extractedFiles;
}

// ── In/Out PDF Target Resolver ──────────────────────────────────────────────
export async function findBestAttendanceFile(files) {
    // 1. First priority: PDF with "in out" in its filename
    const pdfs = files.filter(f => f.name.toLowerCase().endsWith(".pdf"));
    
    for (const pdf of pdfs) {
        const name = pdf.name.toLowerCase();
        if (name.includes("in out") || name.includes("in_out") || name.includes("in-out") || name.includes("inout")) {
            return { file: pdf, type: "pdf_in_out" };
        }
    }

    // 2. Check PDF contents for "Monthly Attendance Report with ( In \ Out ) Time" header
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    for (const pdf of pdfs) {
        try {
            const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf.data) }).promise;
            if (doc.numPages >= 1) {
                const page1 = await doc.getPage(1);
                const textContent = await page1.getTextContent();
                // Filter items near header (y >= 540) to prevent false positives from footers
                const headerItems = textContent.items.filter(it => it.transform[5] >= 540);
                const headerText = headerItems.map(it => it.str).join(" ").toLowerCase();

                if (headerText.includes("in") && headerText.includes("out") && headerText.includes("monthly attendance")) {
                    return { file: pdf, type: "pdf_in_out" };
                }
            }
        } catch {
            // continue checking other files
        }
    }

    // 3. Fallback: Excel file if present
    const excelFile = files.find(f => {
        const n = f.name.toLowerCase();
        return n.endsWith(".xls") || n.endsWith(".xlsx");
    });

    if (excelFile) {
        return { file: excelFile, type: "excel_summary" };
    }

    // 4. Fallback to any PDF
    if (pdfs.length > 0) {
        return { file: pdfs[0], type: "pdf_generic" };
    }

    throw new Error("No valid biometric attendance PDF or Excel file found inside the archive.");
}

// ── High-Precision PDF Column-Binning Parser ────────────────────────────────
export async function parsePdfAttendance(buffer) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        isEvalSupported: false // Security sandbox
    }).promise;

    if (doc.numPages === 0) {
        throw new Error("The PDF document contains no pages.");
    }

    let detectedMonth = null;
    let detectedYear = null;
    const monthNames = {
        jan: 1, january: 1,
        feb: 2, february: 2,
        mar: 3, march: 3,
        apr: 4, april: 4,
        may: 5,
        jun: 6, june: 6,
        jul: 7, july: 7,
        aug: 8, august: 8,
        sep: 9, september: 9,
        oct: 10, october: 10,
        nov: 11, november: 11,
        dec: 12, december: 12
    };

    const employees = [];
    const seenEmpCodes = new Set();
    let hasExtractableText = false;

    for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const rawItems = content.items;

        if (rawItems.length > 0) {
            hasExtractableText = true;
        }

        // Detect Period on Page 1 Header
        if (p === 1 && (!detectedMonth || !detectedYear)) {
            const headerItems = rawItems.filter(it => it.transform[5] >= 550);
            const headerStr = headerItems.map(it => it.str).join(" ");
            
            // Match "To 31-Aug-2026" or "01/08/2026 To 31/08/2026"
            const pMatch = headerStr.match(/To\s+(\d{1,2})\s*[\-\/]\s*([a-z]+|\d{1,2})\s*[\-\/]\s*(\d{4})/i) ||
                           headerStr.match(/(\d{1,2})\s*[\-\/]\s*([a-z]+|\d{1,2})\s*[\-\/]\s*(\d{4})/i);
            if (pMatch) {
                const rawM = pMatch[2].toLowerCase();
                detectedMonth = monthNames[rawM] || parseInt(rawM, 10);
                detectedYear = parseInt(pMatch[3], 10);
            }
        }

        // Expand items with character-interpolated X coordinates
        const expandedItems = [];
        for (const it of rawItems) {
            const text = it.str;
            if (!text) continue;
            const width = it.width || 0;
            const x = it.transform[4];
            const y = it.transform[5];

            // Split into non-whitespace chunks while computing exact spatial positions
            const tokens = text.split(/(\s+)/);
            let curIndex = 0;
            for (const tok of tokens) {
                if (!tok) continue;
                const tokX = text.length > 0 ? x + (curIndex / text.length) * width : x;
                curIndex += tok.length;
                if (!/^\s+$/.test(tok)) {
                    expandedItems.push({ str: tok, x: tokX, y });
                }
            }
        }

        // Find day header X positions (1..31) on this page
        const dayHeaders = expandedItems
            .filter(it => Math.abs(it.y - 529) < 5 && /^\d+$/.test(it.str.trim()))
            .map(it => ({ day: parseInt(it.str.trim(), 10), x: it.x }))
            .sort((a, b) => a.day - b.day);

        const dayX = {};
        for (let d = 1; d <= 31; d++) {
            const found = dayHeaders.find(h => h.day === d);
            dayX[d] = found ? found.x : (108.7 + (d - 1) * 20.9);
        }

        // Dynamic days in month (handling Feb 28/29, Apr 30, Aug 31)
        const effectiveYear = detectedYear || new Date().getFullYear();
        const effectiveMonth = detectedMonth || (new Date().getMonth() + 1);
        const daysInMonth = new Date(effectiveYear, effectiveMonth, 0).getDate();

        // Calculate column bins [minX, maxX]
        const dayBins = {};
        for (let d = 1; d <= daysInMonth; d++) {
            const curX = dayX[d];
            const prevX = d > 1 ? dayX[d - 1] : curX - 21;
            const nextX = d < 31 ? dayX[d + 1] : curX + 21;
            dayBins[d] = {
                minX: (curX + prevX) / 2,
                maxX: (curX + nextX) / 2
            };
        }

        // Extract employee identifiers on this page
        const empCodeItems = expandedItems
            .filter(it => it.x < 45 && it.y < 525 && /^\d{2,6}$/.test(it.str.trim()))
            .sort((a, b) => b.y - a.y);

        for (const empItem of empCodeItems) {
            const empCode = empItem.str.trim();
            const empY = empItem.y;

            // Prevent duplicate parsing if employee block repeated
            const empKey = `${empCode}_p${p}`;
            if (seenEmpCodes.has(empKey)) continue;
            seenEmpCodes.add(empKey);

            // Find employee name near employee code
            const nameItems = expandedItems.filter(it => it.x >= 45 && it.x < 100 && Math.abs(it.y - empY) < 10);
            nameItems.sort((a, b) => b.y - a.y || a.x - b.x);
            const empName = nameItems.map(it => it.str.trim()).filter(Boolean).join(" ");

            // Employee row items in table grid
            const empRowItems = expandedItems.filter(it => it.x >= 95 && it.y >= empY - 14 && it.y <= empY + 6);

            const days = {};
            for (let d = 1; d <= daysInMonth; d++) {
                const bin = dayBins[d];
                if (!bin) continue;

                const cellItems = empRowItems.filter(it => it.x >= bin.minX && it.x < bin.maxX);

                // Upper row: Check-In or Status Codes
                const topItems = cellItems.filter(it => it.y >= empY - 4.5).sort((a, b) => a.x - b.x);
                // Lower row: Check-Out
                const botItems = cellItems.filter(it => it.y < empY - 4.5).sort((a, b) => a.x - b.x);

                const topStr = topItems.map(it => it.str).join("").replace(/\s+/g, "");
                const botStr = botItems.map(it => it.str).join("").replace(/\s+/g, "");

                let inTime = "";
                let outTime = "";
                let code = "";

                // Extract In Time or Code
                const inMatch = topStr.match(/(\d{1,2}):(\d{2})/);
                if (inMatch) {
                    inTime = `${inMatch[1].padStart(2, "0")}:${inMatch[2]}`;
                } else if (/WO/i.test(topStr)) {
                    code = "WO-I";
                } else if (/MIS/i.test(topStr)) {
                    code = "MIS";
                } else if (/HD|HL/i.test(topStr)) {
                    code = "HD";
                } else if (/CL|EL|SL|LV/i.test(topStr)) {
                    code = "L";
                } else if (/\bA\b/i.test(topStr)) {
                    code = "A";
                } else if (/\bP\b/i.test(topStr)) {
                    code = "P";
                } else if (topStr) {
                    code = topStr; // Preserve any other vendor status code
                }

                // Extract Out Time
                const outMatch = botStr.match(/(\d{1,2}):(\d{2})/);
                if (outMatch) {
                    outTime = `${outMatch[1].padStart(2, "0")}:${outMatch[2]}`;
                }

                days[d] = { in: inTime, out: outTime, code };
            }

            employees.push({ empCode, empName, days });
        }
    }

    if (!hasExtractableText) {
        throw new Error("The PDF appears to be a scanned image without an extractable text layer.");
    }

    if (employees.length === 0) {
        throw new Error("Could not detect any employee attendance rows in the PDF.");
    }

    return {
        detectedMonth: detectedMonth || (new Date().getMonth() + 1),
        detectedYear: detectedYear || new Date().getFullYear(),
        employees
    };
}
