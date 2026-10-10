// Runnable self-check for quick add presets and matching logic
import assert from "assert";
import {
    SCHOOL_CLASS_PRESETS,
    SCHOOL_SECTION_PRESETS,
    getGradeSortRank,
    findMatchingCourse,
    findMatchingSection
} from "../lib/schoolPresets.js";

console.log("Running self-check on schoolPresets...");

// 1. Presets validation
assert(SCHOOL_CLASS_PRESETS.length === 15, "Should have 15 school class presets");
assert(SCHOOL_CLASS_PRESETS.some(p => p.name === "1st" && p.code === "1"), "1st preset should exist");
assert(SCHOOL_CLASS_PRESETS.some(p => p.name === "2nd" && p.code === "2"), "2nd preset should exist");
assert(SCHOOL_SECTION_PRESETS.length === 4, "Should have 4 section presets");

// 2. Natural sort rank check
assert(getGradeSortRank("Nursery") === -3, "Nursery rank should be -3");
assert(getGradeSortRank("LKG") === -2, "LKG rank should be -2");
assert(getGradeSortRank("UKG") === -1, "UKG rank should be -1");
assert(getGradeSortRank("1st") === 1, "1st rank should be 1");
assert(getGradeSortRank("2nd Standard") === 2, "2nd Standard rank should be 2");
assert(getGradeSortRank("Class 10") === 10, "Class 10 rank should be 10");
assert(getGradeSortRank("12th Grade") === 12, "12th Grade rank should be 12");

// Verify sort order
const sampleClasses = [
    { name: "10th" },
    { name: "2nd" },
    { name: "Nursery" },
    { name: "1st" },
    { name: "UKG" },
    { name: "12th" },
    { name: "LKG" }
];
sampleClasses.sort((a, b) => getGradeSortRank(a.name) - getGradeSortRank(b.name));
assert.deepStrictEqual(
    sampleClasses.map(c => c.name),
    ["Nursery", "LKG", "UKG", "1st", "2nd", "10th", "12th"],
    "Classes should sort naturally from Nursery through 12th"
);

// 3. Course matching check
const existingCourses = [
    { name: "1st", code: "1" },
    { name: "2nd Standard", code: "STD2" },
    { name: "Nursery", code: "NUR" }
];

const preset1st = SCHOOL_CLASS_PRESETS.find(p => p.name === "1st");
const preset2nd = SCHOOL_CLASS_PRESETS.find(p => p.name === "2nd");
const preset3rd = SCHOOL_CLASS_PRESETS.find(p => p.name === "3rd");

assert(findMatchingCourse(preset1st, existingCourses) !== null, "Should match 1st");
assert(findMatchingCourse(preset2nd, existingCourses) !== null, "Should match 2nd Standard");
assert(findMatchingCourse(preset3rd, existingCourses) === undefined || findMatchingCourse(preset3rd, existingCourses) === null, "3rd should not match");

// 4. Section matching check
const existingBatches = [
    { name: "1st A" },
    { name: "Section B" }
];

assert(findMatchingSection("Section A", existingBatches) !== null, "Should match Section A from 1st A");
assert(findMatchingSection("Section B", existingBatches) !== null, "Should match Section B");
assert(findMatchingSection("Section C", existingBatches) === undefined || findMatchingSection("Section C", existingBatches) === null, "Section C should not match");

console.log("All self-check assertions passed successfully!");
