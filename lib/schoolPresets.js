// ponytail: Standard school presets and helpers for 1-click class & section generation

export const SCHOOL_CLASS_PRESETS = [
    { label: "Nursery", name: "Nursery", code: "NUR" },
    { label: "LKG", name: "LKG", code: "LKG" },
    { label: "UKG", name: "UKG", code: "UKG" },
    { label: "1st", name: "1st", code: "1" },
    { label: "2nd", name: "2nd", code: "2" },
    { label: "3rd", name: "3rd", code: "3" },
    { label: "4th", name: "4th", code: "4" },
    { label: "5th", name: "5th", code: "5" },
    { label: "6th", name: "6th", code: "6" },
    { label: "7th", name: "7th", code: "7" },
    { label: "8th", name: "8th", code: "8" },
    { label: "9th", name: "9th", code: "9" },
    { label: "10th", name: "10th", code: "10" },
    { label: "11th", name: "11th", code: "11" },
    { label: "12th", name: "12th", code: "12" },
];

export const SCHOOL_SECTION_PRESETS = [
    { label: "Section A", name: "Section A", shortLabel: "Sec A" },
    { label: "Section B", name: "Section B", shortLabel: "Sec B" },
    { label: "Section C", name: "Section C", shortLabel: "Sec C" },
    { label: "Section D", name: "Section D", shortLabel: "Sec D" },
];

/**
 * Natural grade sort rank.
 * Nursery (-3), LKG (-2), UKG (-1), 1st (1) ... 12th (12).
 */
export function getGradeSortRank(name) {
    const str = (name || '').toLowerCase().trim();
    if (str.startsWith('nursery') || str.startsWith('pre-kg') || str.startsWith('play')) return -3;
    if (str.startsWith('lkg') || str.startsWith('jr')) return -2;
    if (str.startsWith('ukg') || str.startsWith('sr') || str.startsWith('kg')) return -1;
    const match = str.match(/^(\d+)/);
    if (match) {
        return parseInt(match[1], 10);
    }
    const classMatch = str.match(/^class\s*(\d+)/i) || str.match(/^std\s*(\d+)/i) || str.match(/^grade\s*(\d+)/i);
    if (classMatch) {
        return parseInt(classMatch[1], 10);
    }
    return 999;
}

/**
 * Match preset against existing courses list (handles "1st", "1st Standard", "Class 1", code "1", etc.)
 */
export function findMatchingCourse(preset, courses) {
    if (!courses || !Array.isArray(courses)) return null;
    const pName = preset.name.toLowerCase().trim();
    const pCode = preset.code.toLowerCase().trim();
    const numMatch = preset.name.match(/^(\d+)/);
    const num = numMatch ? numMatch[1] : null;

    return courses.find(c => {
        if (!c) return false;
        const cName = (c.name || '').toLowerCase().trim();
        const cCode = (c.code || '').toLowerCase().trim();

        if (cName === pName || cCode === pCode) return true;

        if (num) {
            if (cName === `${num}st` || cName === `${num}nd` || cName === `${num}rd` || cName === `${num}th`) return true;
            if (cName.startsWith(`${preset.name.toLowerCase()} `)) return true;
            if (cName === `class ${num}` || cName === `grade ${num}` || cName === `std ${num}`) return true;
            if (cCode === num || cCode === `${num}st` || cCode === `${num}nd` || cCode === `${num}rd` || cCode === `${num}th`) return true;
        }

        return false;
    });
}

/**
 * Match section name against existing course batches list (handles "Section A", "Sec A", "A", "1st A", etc.)
 */
export function findMatchingSection(sectionName, courseBatches) {
    if (!courseBatches || !Array.isArray(courseBatches)) return null;
    const target = sectionName.toLowerCase().trim();
    const letterMatch = target.match(/\b([a-z])\b/i);
    const letter = letterMatch ? letterMatch[1].toLowerCase() : null;

    return courseBatches.find(b => {
        if (!b) return false;
        const bName = (b.name || '').toLowerCase().trim();
        if (bName === target) return true;
        if (letter) {
            if (bName === letter) return true;
            if (bName.endsWith(` ${letter}`) || bName.endsWith(`-${letter}`)) return true;
            if (bName.match(new RegExp(`sec(tion)?\\s*${letter}$`, 'i'))) return true;
        }
        return false;
    });
}
