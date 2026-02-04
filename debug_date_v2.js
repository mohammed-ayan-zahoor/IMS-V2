
console.log("Current Time:", new Date().toString());
console.log("Current Time ISO:", new Date().toISOString());

const cases = [
    "03-02-2026 08:00",
    "03-02-2026 20:00",
    "2026-02-03 08:00",
    "2026-03-02 08:00",
    "2026-02-03T08:00",
    "2026-02-03T08:00:00",
    "2026-02-03T08:00:00Z",
];

cases.forEach(c => {
    try {
        const d = new Date(c);
        console.log(`Input: "${c}"`);
        console.log(`Parsed: ${d.toString()}`);
        console.log(`ISO:    ${!isNaN(d.getTime()) ? d.toISOString() : 'Invalid'}`);
        console.log('---');
    } catch (e) {
        console.log(`Error parsing "${c}":`, e.message);
    }
});
