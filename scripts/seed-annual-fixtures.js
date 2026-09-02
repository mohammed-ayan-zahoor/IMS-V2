import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';

const FIXTURES_DATA = [
  {
    "title": "New Students Report",
    "startDate": "2026-06-06",
    "endDate": "2026-06-06",
    "category": "event",
    "description": "New students report for the academic year"
  },
  {
    "title": "Old Students Report",
    "startDate": "2026-06-07",
    "endDate": "2026-06-07",
    "category": "event",
    "description": "Returning students report"
  },
  {
    "title": "School Re-opens",
    "startDate": "2026-06-08",
    "endDate": "2026-06-08",
    "category": "event",
    "description": "First day of the new academic year"
  },
  {
    "title": "Class Rules and Goal Setting Session",
    "startDate": "2026-06-09",
    "endDate": "2026-06-09",
    "category": "event",
    "description": ""
  },
  {
    "title": "Baseline Assessment",
    "startDate": "2026-06-10",
    "endDate": "2026-06-10",
    "category": "exam",
    "description": "Baseline Assessment for Grade 1 – Grade XII"
  },
  {
    "title": "Distribution of New Books",
    "startDate": "2026-06-11",
    "endDate": "2026-06-11",
    "category": "event",
    "description": ""
  },
  {
    "title": "Height and Weight Record",
    "startDate": "2026-06-12",
    "endDate": "2026-06-12",
    "category": "event",
    "description": ""
  },
  {
    "title": "Allotment of House",
    "startDate": "2026-06-13",
    "endDate": "2026-06-13",
    "category": "event",
    "description": ""
  },
  {
    "title": "Career Counseling Session",
    "startDate": "2026-06-15",
    "endDate": "2026-06-15",
    "category": "event",
    "description": "Grade VII-XII; Preparation for CISCE Games & Sports"
  },
  {
    "title": "Inter House Chess Competition",
    "startDate": "2026-06-16",
    "endDate": "2026-06-16",
    "category": "sports",
    "description": ""
  },
  {
    "title": "Yoga Day",
    "startDate": "2026-06-21",
    "endDate": "2026-06-21",
    "category": "event",
    "description": ""
  },
  {
    "title": "Inter House Debate Round - 1",
    "startDate": "2026-06-27",
    "endDate": "2026-06-27",
    "category": "event",
    "description": ""
  },
  {
    "title": "Founders Day Practice",
    "startDate": "2026-07-06",
    "endDate": "2026-07-06",
    "category": "event",
    "description": ""
  },
  {
    "title": "World Population Day",
    "startDate": "2026-07-11",
    "endDate": "2026-07-11",
    "category": "event",
    "description": "IX Grade will conduct a seminar"
  },
  {
    "title": "Special Assembly",
    "startDate": "2026-07-13",
    "endDate": "2026-07-13",
    "category": "event",
    "description": "Values & ethics; Grade X ICSE/SSC"
  },
  {
    "title": "Inter House Choral Recitation",
    "startDate": "2026-07-15",
    "endDate": "2026-07-15",
    "category": "event",
    "description": "Grade II – V"
  },
  {
    "title": "Inter House Storytelling",
    "startDate": "2026-07-18",
    "endDate": "2026-07-18",
    "category": "event",
    "description": "Grade I – III"
  },
  {
    "title": "Founder Day Practice Dress Rehearsal",
    "startDate": "2026-08-01",
    "endDate": "2026-08-01",
    "category": "event",
    "description": ""
  },
  {
    "title": "Founders Day Celebration",
    "startDate": "2026-08-07",
    "endDate": "2026-08-07",
    "category": "celebration",
    "description": "Exit after 6:00 pm"
  },
  {
    "title": "Students Return",
    "startDate": "2026-08-09",
    "endDate": "2026-08-09",
    "category": "event",
    "description": "Students return before 6:00 pm"
  },
  {
    "title": "Independence Day Practice Begins",
    "startDate": "2026-08-10",
    "endDate": "2026-08-10",
    "category": "event",
    "description": ""
  },
  {
    "title": "Inter House Literary Fest",
    "startDate": "2026-08-14",
    "endDate": "2026-08-14",
    "category": "event",
    "description": ""
  },
  {
    "title": "Independence Day",
    "startDate": "2026-08-15",
    "endDate": "2026-08-15",
    "category": "holiday",
    "description": "Flag Hoisting; One Act Play"
  },
  {
    "title": "Inter House T.T Competition",
    "startDate": "2026-08-17",
    "endDate": "2026-08-17",
    "category": "sports",
    "description": ""
  },
  {
    "title": "Inter House Carom Competition",
    "startDate": "2026-08-21",
    "endDate": "2026-08-21",
    "category": "sports",
    "description": ""
  },
  {
    "title": "Inter House Football / Writing / Poetry Day",
    "startDate": "2026-08-31",
    "endDate": "2026-08-31",
    "category": "sports",
    "description": ""
  },
  {
    "title": "Science Fun Week",
    "startDate": "2026-09-07",
    "endDate": "2026-09-11",
    "category": "event",
    "description": "Grade III - V"
  },
  {
    "title": "Inter House Debate Final",
    "startDate": "2026-09-12",
    "endDate": "2026-09-12",
    "category": "event",
    "description": ""
  },
  {
    "title": "Grandparents Day",
    "startDate": "2026-09-13",
    "endDate": "2026-09-13",
    "category": "event",
    "description": "KG - IV"
  },
  {
    "title": "Ganpati Festival",
    "startDate": "2026-09-14",
    "endDate": "2026-09-14",
    "category": "holiday",
    "description": "Exit after 1:00 pm"
  },
  {
    "title": "Students Return from Ganpati Break",
    "startDate": "2026-09-20",
    "endDate": "2026-09-20",
    "category": "event",
    "description": "Before 6:00 pm"
  },
  {
    "title": "Inter House Science Exhibition",
    "startDate": "2026-09-26",
    "endDate": "2026-09-26",
    "category": "event",
    "description": "Grade VI – VIII"
  },
  {
    "title": "Gandhi Jayanti - Cleanliness Drive",
    "startDate": "2026-10-02",
    "endDate": "2026-10-02",
    "category": "holiday",
    "description": ""
  },
  {
    "title": "Pre Board Educational Trip",
    "startDate": "2026-10-03",
    "endDate": "2026-10-09",
    "category": "event",
    "description": "1 week trip"
  },
  {
    "title": "Clay Modeling & Color Splash",
    "startDate": "2026-10-10",
    "endDate": "2026-10-10",
    "category": "event",
    "description": "KG – II"
  },
  {
    "title": "Spell Bee",
    "startDate": "2026-10-12",
    "endDate": "2026-10-12",
    "category": "event",
    "description": "Grade III – V"
  },
  {
    "title": "Leadership Workshop",
    "startDate": "2026-10-14",
    "endDate": "2026-10-14",
    "category": "event",
    "description": "Grade IX – XII"
  },
  {
    "title": "Social Science Exhibition",
    "startDate": "2026-10-17",
    "endDate": "2026-10-17",
    "category": "event",
    "description": "Grade VI – VIII"
  },
  {
    "title": "First Semester Examination",
    "startDate": "2026-10-19",
    "endDate": "2026-10-19",
    "category": "exam",
    "description": ""
  },
  {
    "title": "Dussehra",
    "startDate": "2026-10-20",
    "endDate": "2026-10-20",
    "category": "holiday",
    "description": ""
  },
  {
    "title": "Open Day / PTM",
    "startDate": "2026-11-04",
    "endDate": "2026-11-04",
    "category": "meeting",
    "description": "KG – XII"
  },
  {
    "title": "Teachers Leave for Diwali Break",
    "startDate": "2026-11-05",
    "endDate": "2026-11-05",
    "category": "holiday",
    "description": "Diwali Break begins"
  },
  {
    "title": "Warden Matron Report",
    "startDate": "2026-11-12",
    "endDate": "2026-11-12",
    "category": "event",
    "description": ""
  },
  {
    "title": "Teachers Report",
    "startDate": "2026-11-13",
    "endDate": "2026-11-13",
    "category": "event",
    "description": ""
  },
  {
    "title": "Students Report",
    "startDate": "2026-11-14",
    "endDate": "2026-11-14",
    "category": "event",
    "description": ""
  },
  {
    "title": "Athletic Season Begins",
    "startDate": "2026-11-16",
    "endDate": "2026-11-16",
    "category": "sports",
    "description": ""
  },
  {
    "title": "Torch Ceremony",
    "startDate": "2026-11-18",
    "endDate": "2026-11-18",
    "category": "sports",
    "description": ""
  },
  {
    "title": "Inter House Marathon",
    "startDate": "2026-11-21",
    "endDate": "2026-11-21",
    "category": "sports",
    "description": ""
  },
  {
    "title": "Pre Board Inter House Athletic Heats",
    "startDate": "2026-11-23",
    "endDate": "2026-11-23",
    "category": "sports",
    "description": "Grade X & XII"
  },
  {
    "title": "Science Olympiad",
    "startDate": "2026-11-25",
    "endDate": "2026-11-25",
    "category": "event",
    "description": ""
  },
  {
    "title": "Class X Project Submission",
    "startDate": "2026-12-05",
    "endDate": "2026-12-05",
    "category": "academic",
    "description": "External Visit"
  },
  {
    "title": "Pre Prize Distribution",
    "startDate": "2026-12-14",
    "endDate": "2026-12-14",
    "category": "event",
    "description": ""
  },
  {
    "title": "Christmas Celebration",
    "startDate": "2026-12-16",
    "endDate": "2026-12-16",
    "category": "celebration",
    "description": "Choral Singing"
  },
  {
    "title": "Annual Sports Meet / Winter Vacation Begins",
    "startDate": "2026-12-19",
    "endDate": "2026-12-19",
    "category": "sports",
    "description": "Winter vacation begins; Exit after 6:00 pm"
  },
  {
    "title": "Teachers Report",
    "startDate": "2027-01-01",
    "endDate": "2027-01-01",
    "category": "event",
    "description": ""
  },
  {
    "title": "Boarders Report",
    "startDate": "2027-01-03",
    "endDate": "2027-01-03",
    "category": "event",
    "description": ""
  },
  {
    "title": "New Year Assembly / Pre-Board 3",
    "startDate": "2027-01-04",
    "endDate": "2027-01-04",
    "category": "event",
    "description": ""
  },
  {
    "title": "Kite Making",
    "startDate": "2027-01-09",
    "endDate": "2027-01-09",
    "category": "event",
    "description": "KG – III"
  },
  {
    "title": "Class X / XII Farewell",
    "startDate": "2027-01-16",
    "endDate": "2027-01-16",
    "category": "celebration",
    "description": ""
  },
  {
    "title": "Annual Fete Celebration",
    "startDate": "2027-01-30",
    "endDate": "2027-01-30",
    "category": "celebration",
    "description": ""
  },
  {
    "title": "Board Practical (Football / Kho-Kho) - Mini Sports League",
    "startDate": "2027-02-01",
    "endDate": "2027-02-28",
    "category": "sports",
    "description": "Every Mini Sports League held throughout February"
  },
  {
    "title": "Investiture Ceremony / Class Photographs",
    "startDate": "2027-02-13",
    "endDate": "2027-02-13",
    "category": "event",
    "description": ""
  },
  {
    "title": "Concept Game: Math Relay / Inter House Cricket",
    "startDate": "2027-02-15",
    "endDate": "2027-02-15",
    "category": "sports",
    "description": "Grade II – IV"
  },
  {
    "title": "Grammar Treasure Hunt",
    "startDate": "2027-02-17",
    "endDate": "2027-02-17",
    "category": "event",
    "description": "Grade V – VI"
  },
  {
    "title": "Olympiad Style Quizzes / Handwriting & Calligraphy",
    "startDate": "2027-02-20",
    "endDate": "2027-02-20",
    "category": "event",
    "description": "Grade VII – IX Olympiad quizzes; Grade II – V handwriting & calligraphy"
  },
  {
    "title": "ICSE Examination",
    "startDate": "2027-02-22",
    "endDate": "2027-02-22",
    "category": "exam",
    "description": ""
  },
  {
    "title": "Creative Poster Making - Values & Environment",
    "startDate": "2027-02-27",
    "endDate": "2027-02-27",
    "category": "event",
    "description": "Grade VI – IX"
  },
  {
    "title": "Inter House Volley Ball",
    "startDate": "2027-03-01",
    "endDate": "2027-03-01",
    "category": "sports",
    "description": ""
  },
  {
    "title": "Inter House Swimming",
    "startDate": "2027-03-05",
    "endDate": "2027-03-05",
    "category": "sports",
    "description": ""
  },
  {
    "title": "Reading Marathon",
    "startDate": "2027-03-06",
    "endDate": "2027-03-06",
    "category": "event",
    "description": ""
  },
  {
    "title": "Personal Hygiene and Self Care Workshop",
    "startDate": "2027-03-07",
    "endDate": "2027-03-07",
    "category": "event",
    "description": ""
  },
  {
    "title": "Final Exam Preparation",
    "startDate": "2027-03-15",
    "endDate": "2027-03-15",
    "category": "exam",
    "description": ""
  },
  {
    "title": "Gudi Padwa",
    "startDate": "2027-03-19",
    "endDate": "2027-03-19",
    "category": "holiday",
    "description": ""
  },
  {
    "title": "Second Semester (Final Examination)",
    "startDate": "2027-03-22",
    "endDate": "2027-03-22",
    "category": "exam",
    "description": ""
  },
  {
    "title": "Memory Book Making / Boarding Cultural Night",
    "startDate": "2027-04-02",
    "endDate": "2027-04-02",
    "category": "event",
    "description": ""
  },
  {
    "title": "Annual Day / PTM Meeting & Feedback",
    "startDate": "2027-04-06",
    "endDate": "2027-04-06",
    "category": "meeting",
    "description": "Students leave for summer vacation"
  },
  {
    "title": "Staff Meeting / Curriculum Planning",
    "startDate": "2027-04-07",
    "endDate": "2027-04-07",
    "category": "meeting",
    "description": "Teachers leave after 3:00 pm"
  },
  {
    "title": "Grade X / XII Results",
    "startDate": "2027-05-24",
    "endDate": "2027-05-31",
    "category": "academic",
    "description": "Results declared in the last week of May"
  },
  {
    "title": "Staff Meeting",
    "startDate": "2027-06-04",
    "endDate": "2027-06-04",
    "category": "meeting",
    "description": ""
  },
  {
    "title": "New Boarders Report",
    "startDate": "2027-06-06",
    "endDate": "2027-06-06",
    "category": "event",
    "description": "Before 6:00 pm"
  },
  {
    "title": "Old Boarders Return",
    "startDate": "2027-06-07",
    "endDate": "2027-06-07",
    "category": "event",
    "description": ""
  },
  {
    "title": "New Academic Year Begins",
    "startDate": "2027-06-08",
    "endDate": "2027-06-08",
    "category": "event",
    "description": ""
  }
];

function mapCategory(item) {
    const raw = (item.category || "").toLowerCase();
    if (raw === "celebration") return "cultural";
    if (raw === "meeting" || raw === "academic") return "academic_assembly";
    if (raw === "sports") return "sports";
    if (raw === "holiday") return "holiday";
    if (raw === "exam") return "exam";
    
    // Auto-detect from title
    const t = `${item.title} ${item.description || ""}`.toLowerCase();
    if (t.includes("holiday") || t.includes("vacation") || t.includes("jayanti") || t.includes("padwa") || t.includes("dussehra") || t.includes("break")) return "holiday";
    if (t.includes("exam") || t.includes("assessment") || t.includes("pre-board") || t.includes("olympiad")) return "exam";
    if (t.includes("sport") || t.includes("chess") || t.includes("marathon") || t.includes("athletic") || t.includes("cricket") || t.includes("volley ball") || t.includes("swimming")) return "sports";
    if (t.includes("celebration") || t.includes("farewell") || t.includes("fete") || t.includes("cultural") || t.includes("recitation") || t.includes("storytelling") || t.includes("fest") || t.includes("debate") || t.includes("poetry")) return "cultural";
    if (t.includes("meeting") || t.includes("assembly") || t.includes("workshop") || t.includes("exhibition") || t.includes("seminar") || t.includes("counseling") || t.includes("orientation") || t.includes("ptm")) return "academic_assembly";
    return "general";
}

async function seed() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✓ Connected.");

        const Institute = mongoose.models.Institute || mongoose.model("Institute", new mongoose.Schema({ name: String, code: String, type: String }));
        const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({ name: String, email: String, role: String, institute: mongoose.Schema.Types.ObjectId }));
        
        // Find school institute
        const instituteCode = process.argv[2] || process.env.TARGET_INSTITUTE_CODE;
        let institute = null;
        if (instituteCode) {
            institute = await Institute.findOne({ code: instituteCode });
        }
        if (!institute) {
            // Find Quantech or first School institute
            institute = await Institute.findOne({ 
                $or: [
                    { code: "QISJC" },
                    { code: "QISDHL" },
                    { type: "SCHOOL" }
                ]
            });
        }

        if (!institute) {
            console.error("No institute found to seed fixtures into.");
            process.exit(1);
        }

        console.log(`Target Institute: ${institute.name} [Code: ${institute.code}, ID: ${institute._id}]`);

        // Find an admin for createdBy
        const adminUser = await User.findOne({
            $or: [
                { institute: institute._id, role: { $in: ["admin", "super_admin"] } },
                { role: "super_admin" }
            ]
        }) || await User.findOne({});

        const createdBy = adminUser ? adminUser._id : institute._id;

        // Import Event model schema
        const EventSchema = new mongoose.Schema({
            institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
            title: { type: String, required: true, trim: true },
            description: { type: String, trim: true },
            startDate: { type: Date, required: true, index: true },
            endDate: { type: Date, required: true, index: true },
            category: { type: String, enum: ['holiday', 'exam', 'cultural', 'academic_assembly', 'sports', 'general'], default: 'general', index: true },
            target: { type: String, enum: ['all', 'batches', 'courses'], default: 'all', index: true },
            targetIds: [{ type: mongoose.Schema.Types.ObjectId, index: true }],
            createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            deletedAt: { type: Date, default: null, index: true }
        }, { timestamps: true });

        const Event = mongoose.models.Event || mongoose.model("Event", EventSchema);

        // Check if user requested clear
        const clearExisting = process.argv.includes("--clear");
        if (clearExisting) {
            const delRes = await Event.updateMany(
                { institute: institute._id, deletedAt: null },
                { $set: { deletedAt: new Date() } }
            );
            console.log(`Archived ${delRes.modifiedCount} existing calendar events.`);
        }

        const docsToInsert = FIXTURES_DATA.map(f => {
            const cat = mapCategory(f);
            return {
                title: f.title.trim(),
                description: f.description || "",
                startDate: new Date(`${f.startDate}T09:00:00.000Z`),
                endDate: new Date(`${f.endDate}T17:00:00.000Z`),
                category: cat,
                target: "all",
                targetIds: [],
                institute: institute._id,
                createdBy
            };
        });

        const inserted = await Event.insertMany(docsToInsert);
        console.log(`\n🎉 Successfully seeded ${inserted.length} annual fixtures into ${institute.name}!`);

        // Print breakdown by category
        const counts = {};
        docsToInsert.forEach(d => {
            counts[d.category] = (counts[d.category] || 0) + 1;
        });
        console.log("Breakdown by category:", counts);

        await mongoose.disconnect();
        console.log("Done.");
    } catch (err) {
        console.error("Seeding error:", err);
        process.exit(1);
    }
}

seed();
