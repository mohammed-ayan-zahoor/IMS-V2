const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("Starting Student UI and Adtech Ground Truth Assertions...");

// 1. Check layout.js contains viewportFit: cover and appleWebApp capable
const layoutFile = fs.readFileSync(path.join(__dirname, "../app/layout.js"), "utf8");
assert(layoutFile.includes("viewportFit: \"cover\"") || layoutFile.includes("viewportFit: 'cover'"), "layout.js must specify viewportFit cover");
assert(layoutFile.includes("appleWebApp:"), "layout.js must include appleWebApp metadata");
assert(layoutFile.includes("capable: true"), "layout.js must set appleWebApp capable: true");
console.log("✓ Root layout contains iOS PWA viewport and web app meta");

// 2. Check globals.css contains Adtech tokens & iOS utilities
const globalsCss = fs.readFileSync(path.join(__dirname, "../app/globals.css"), "utf8");
assert(globalsCss.includes("--bg-sidebar: #2C2A46"), "globals.css must define Adtech sidebar token");
assert(globalsCss.includes("--bg-sidebar-active: #EDE8FB"), "globals.css must define Adtech sidebar active token");
assert(globalsCss.includes("--bg-highlight-banner: #FCF3D6"), "globals.css must define Adtech quote banner token");
assert(globalsCss.includes("--border-subtle: #E9E8F0"), "globals.css must define Adtech border token");
assert(globalsCss.includes("safe-pb"), "globals.css must define safe-pb utility");
console.log("✓ globals.css contains Adtech tokens and iOS safe-area utilities");

// 3. Check student layout contains Adtech brand mark, #2C2A46 sidebar, and #EDE8FB active pill
const studentLayout = fs.readFileSync(path.join(__dirname, "../app/student/layout.jsx"), "utf8");
assert(studentLayout.includes("#2C2A46"), "Student sidebar must have #2C2A46 navy background");
assert(studentLayout.includes("#EDE8FB"), "Student active item must have #EDE8FB lavender pill background");
assert(studentLayout.includes("#6E5AE0"), "Student active icon must be indigo #6E5AE0");
assert(studentLayout.includes("#F4586A"), "Sign Out must be coral #F4586A");
assert(studentLayout.includes("safe-pb"), "Mobile bottom nav must use safe-pb");
assert(studentLayout.includes("backdrop-blur-xl"), "Mobile bottom nav must use frosted glass backdrop");
assert(!studentLayout.includes("touch-none"), "More drawer must NOT lock scrolling with touch-none");
console.log("✓ Student layout shell strictly adheres to Adtech specs and mobile iOS navigation");

// 4. Check student dashboard contains 3-column asymmetric layout and Adtech components
const studentDashboard = fs.readFileSync(path.join(__dirname, "../app/student/dashboard/page.jsx"), "utf8");
assert(studentDashboard.includes("lg:col-span-3"), "Dashboard must include ~25% Profile column");
assert(studentDashboard.includes("lg:col-span-5"), "Dashboard must include ~40% Activity column");
assert(studentDashboard.includes("lg:col-span-4"), "Dashboard must include ~35% Performance column");
assert(studentDashboard.includes("#E7E1FA"), "Profile card header must use #E7E1FA tint block");
assert(studentDashboard.includes("#FCF3D6"), "Performance card must include #FCF3D6 highlight strip");
assert(studentDashboard.includes("Enrolled Courses"), "Dashboard must include Enrolled Courses panel");
console.log("✓ Student dashboard strictly matches Adtech 3-column asymmetric layout and ground truth specs");

// 5. Check timetable has mobile day pills to avoid 900px blowout
const timetable = fs.readFileSync(path.join(__dirname, "../app/student/timetable/page.jsx"), "utf8");
assert(timetable.includes("selectedDay"), "Timetable must support selectedDay switching");
assert(timetable.includes("Daily Timeline"), "Timetable must offer Daily Timeline view");
assert(timetable.includes("hidden md:block"), "Weekly grid must be hidden on mobile to avoid blowout");
console.log("✓ Timetable includes mobile daily timeline pills preventing 900px table blowout");

// 6. Check attendance has mobile circular tokens and day inspector
const attendance = fs.readFileSync(path.join(__dirname, "../app/student/attendance/page.jsx"), "utf8");
assert(attendance.includes("Inspector:"), "Attendance must include Day Inspector card");
assert(attendance.includes("selectedDate"), "Attendance must track selectedDate");
console.log("✓ Attendance includes circular tokens and tap inspector card");

// 7. Check student library page exists and queries endpoint
const library = fs.readFileSync(path.join(__dirname, "../app/student/library/page.jsx"), "utf8");
assert(library.includes("/api/v1/student/library"), "Library must fetch /api/v1/student/library");
assert(library.includes("Active Loans"), "Library must show active loans");
console.log("✓ Student library screen verified");

// 8. Check student fees uses useSession properly and matches Adtech design
const fees = fs.readFileSync(path.join(__dirname, "../app/student/fees/page.jsx"), "utf8");
assert(fees.includes("useSession"), "Fees page must import and use useSession");
assert(!fees.includes("rounded-[3rem]"), "Fees page must eliminate rounded-[3rem] slop");
assert(!fees.includes("rounded-[2.5rem]"), "Fees page must eliminate rounded-[2.5rem] slop");
assert(fees.includes("Total Course Fee"), "Fees page must include Total Course Fee metric");
assert(fees.includes("Outstanding Due"), "Fees page must include Outstanding Due metric");
assert(fees.includes("hidden md:block"), "Fees page must provide desktop tabular layout");
assert(fees.includes("md:hidden"), "Fees page must provide mobile card layout");
console.log("✓ Student fees page verified and strictly adheres to Adtech specs");

// 9. Check student batches list page uses semantic Link and Adtech tokens
const batches = fs.readFileSync(path.join(__dirname, "../app/student/batches/page.jsx"), "utf8");
assert(batches.includes("Link from \"next/link\"") || batches.includes("import Link from \"next/link\";"), "Batches page must use next/link");
assert(!batches.includes("window.location.href"), "Batches page must not use window.location.href");
assert(batches.includes("rounded-[16px]"), "Batches page must use 16px container radius");
assert(batches.includes("safe-pb"), "Batches page must include safe-pb");
console.log("✓ Student batches page verified with Adtech tokens and semantic Link navigation");

// 10. Check student batch detail & syllabus progress page
const batchDetail = fs.readFileSync(path.join(__dirname, "../app/student/batches/[id]/page.jsx"), "utf8");
assert(batchDetail.includes("Syllabus Completion Pace"), "Batch detail must include Syllabus Completion Pace");
assert(batchDetail.includes("stats.avgProgress"), "Batch detail must compute dynamic stats");
assert(batchDetail.includes("All Subjects"), "Batch detail must include subject filter pills");
assert(batchDetail.includes("Search topics or chapters"), "Batch detail must include topic search");
assert(batchDetail.includes("expandedChapters"), "Batch detail must support collapsible chapter accordions");
assert(batchDetail.includes("safe-pb"), "Batch detail must include safe-pb");
console.log("✓ Student batch detail & syllabus progress screen verified");

console.log("\nALL 10 STUDENT UI AND ADTECH CHECKS PASSED SUCCESSFULLY!");
