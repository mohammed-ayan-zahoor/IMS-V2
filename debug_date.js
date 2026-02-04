
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
    "February 3rd, 2026 8:00 AM", // Student UI format
];

cases.forEach(c => {
    const d = new Date(c);
    console.log(`Input: "${c}"`);
    console.log(`Parsed: ${d.toString()}`);
    console.log(`ISO:    ${d.toISOString()}`);
    console.log(`Valid:  ${!isNaN(d.getTime())}`);
    console.log('---');
});
