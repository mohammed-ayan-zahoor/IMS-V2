import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import {
    detectFileType,
    extractArchive,
    findBestAttendanceFile,
    parsePdfAttendance,
    parseTimeToMinutes,
    normalizeName
} from "../lib/attendance/biometricParser.js";

test("Biometric RAR Import Suite", async (t) => {

    await t.test("1. Magic Bytes & File Type Detection", () => {
        // Test RAR
        const rarBuffer = fs.readFileSync("Aug Att 2026.rar");
        assert.equal(detectFileType(rarBuffer), "rar");

        // Test PDF
        const pdfHeader = Buffer.from("%PDF-1.4\n");
        assert.equal(detectFileType(pdfHeader), "pdf");

        // Test XLS
        const xlsHeader = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
        assert.equal(detectFileType(xlsHeader), "xls");

        // Test ZIP
        const zipHeader = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
        assert.equal(detectFileType(zipHeader), "zip");

        // Test Unknown
        const unknownHeader = Buffer.from("random text content");
        assert.equal(detectFileType(unknownHeader), "unknown");
    });

    await t.test("2. RAR Decompression & Target Selection", async () => {
        const rarBuffer = fs.readFileSync("Aug Att 2026.rar");
        const extracted = await extractArchive(rarBuffer, "rar");
        
        assert.ok(extracted.length >= 3, `Expected at least 3 files, got ${extracted.length}`);
        const names = extracted.map(f => f.name);
        assert.ok(names.includes("Aug Att in Out.pdf"));
        assert.ok(names.includes("Att Aug 2026.xls"));
        assert.ok(names.includes("Mont Aug 2026.pdf"));

        // Best attendance file selector should pick In/Out PDF
        const best = await findBestAttendanceFile(extracted);
        assert.equal(best.type, "pdf_in_out");
        assert.equal(best.file.name, "Aug Att in Out.pdf");
    });

    await t.test("3. PDF Parsing Ground Truth on Aug Att in Out.pdf", async () => {
        const rarBuffer = fs.readFileSync("Aug Att 2026.rar");
        const extracted = await extractArchive(rarBuffer, "rar");
        const best = await findBestAttendanceFile(extracted);

        const parsed = await parsePdfAttendance(best.file.data);
        assert.equal(parsed.detectedMonth, 8, "Expected August (8)");
        assert.equal(parsed.detectedYear, 2026, "Expected Year 2026");
        assert.equal(parsed.employees.length, 63, "Expected 63 employees");

        // Spot check Rashmi B R (0058)
        const rashmi = parsed.employees.find(e => e.empCode === "0058");
        assert.ok(rashmi, "Employee 0058 should exist");
        assert.equal(rashmi.empName, "Rashmi B R");
        assert.equal(rashmi.days[1].code, "A", "Day 1 should be Absent");
        assert.equal(rashmi.days[2].code, "WO-I", "Day 2 should be Week Off");
        assert.equal(rashmi.days[3].in, "09:31", "Day 3 should have In time 09:31");
        assert.equal(rashmi.days[3].out, "", "Day 3 should have no Out time (MIS)");
        assert.equal(rashmi.days[4].in, "09:27", "Day 4 In should be 09:27");
        assert.equal(rashmi.days[4].out, "17:10", "Day 4 Out should be 17:10");
        assert.equal(rashmi.days[5].in, "09:33", "Day 5 In should be 09:33");
        assert.equal(rashmi.days[5].out, "15:07", "Day 5 Out should be 15:07");

        // Spot check Jagruthi N (0059)
        const jagruthi = parsed.employees.find(e => e.empCode === "0059");
        assert.ok(jagruthi, "Employee 0059 should exist");
        assert.equal(jagruthi.days[1].in, "09:25");
        assert.equal(jagruthi.days[1].out, "15:42");
    });

    await t.test("4. Shift Grace, Penalty & Overtime Boundaries", () => {
        const shiftStartMins = parseTimeToMinutes("09:00"); // 540
        const shiftEndMins = parseTimeToMinutes("18:00");   // 1080
        const checkInGrace = 15;
        const checkOutGrace = 10;
        const overtimeBuffer = 30;

        // Check-in on or before grace limit (09:15)
        const in915 = parseTimeToMinutes("09:15");
        assert.equal(in915 <= (shiftStartMins + checkInGrace), true);
        const late915 = in915 > (shiftStartMins + checkInGrace) ? in915 - shiftStartMins : 0;
        assert.equal(late915, 0, "09:15 should give 0 late minutes");

        // Check-in 1 minute past grace limit (09:16) -> measured from shift start (09:00)
        const in916 = parseTimeToMinutes("09:16");
        assert.equal(in916 > (shiftStartMins + checkInGrace), true);
        const late916 = in916 - shiftStartMins;
        assert.equal(late916, 16, "09:16 should give 16 late minutes");

        // Early arrival (08:30)
        const in830 = parseTimeToMinutes("08:30");
        const late830 = in830 > (shiftStartMins + checkInGrace) ? in830 - shiftStartMins : 0;
        assert.equal(late830, 0, "Early arrival 08:30 should give 0 late minutes");

        // Check-out on grace limit (17:50)
        const out1750 = parseTimeToMinutes("17:50");
        const early1750 = out1750 < (shiftEndMins - checkOutGrace) ? shiftEndMins - out1750 : 0;
        assert.equal(early1750, 0, "17:50 should give 0 early departure minutes");

        // Check-out 1 minute before grace limit (17:49)
        const out1749 = parseTimeToMinutes("17:49");
        const early1749 = out1749 < (shiftEndMins - checkOutGrace) ? shiftEndMins - out1749 : 0;
        assert.equal(early1749, 11, "17:49 should give 11 early departure minutes");

        // Check-out at 18:29 (within 30m overtime buffer)
        const out1829 = parseTimeToMinutes("18:29");
        const ot1829 = out1829 >= (shiftEndMins + overtimeBuffer) ? out1829 - shiftEndMins : 0;
        assert.equal(ot1829, 0, "18:29 should give 0 overtime minutes");

        // Check-out at 18:30 (meets 30m overtime buffer)
        const out1830 = parseTimeToMinutes("18:30");
        const ot1830 = out1830 >= (shiftEndMins + overtimeBuffer) ? out1830 - shiftEndMins : 0;
        assert.equal(ot1830, 30, "18:30 should give 30 overtime minutes");
    });

    await t.test("5. Timezone Safety & Date Boundaries", () => {
        const year = 2026;
        const month = 8; // August
        
        const day1 = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        assert.equal(day1.getUTCFullYear(), 2026);
        assert.equal(day1.getUTCMonth(), 7); // 0-indexed August
        assert.equal(day1.getUTCDate(), 1);
        assert.equal(day1.toISOString().split("T")[0], "2026-08-01");

        const day31 = new Date(Date.UTC(year, month - 1, 31, 0, 0, 0, 0));
        assert.equal(day31.getUTCDate(), 31);
        assert.equal(day31.toISOString().split("T")[0], "2026-08-31");
    });

    await t.test("6. Staff Name Normalization & Safe Matching", () => {
        assert.equal(normalizeName("Dr. Anil S"), "anils");
        assert.equal(normalizeName("Prof. Raj Kumar M"), "rajkumarm");
        assert.equal(normalizeName("Preethi G  Preethi"), "preethigpreethi");
        assert.equal(normalizeName("SARVATH BANU"), "sarvathbanu");
    });
});
