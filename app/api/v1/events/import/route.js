import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import { createAuditLog } from "@/services/auditService";
import { parseISO, startOfDay, endOfDay, isValid } from "date-fns";

const VALID_CATEGORIES = ['holiday', 'exam', 'cultural', 'academic_assembly', 'sports', 'general'];

function detectCategory(title = "", description = "") {
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes("holiday") || text.includes("vacation") || text.includes("jayanti") || 
        text.includes("diwali") || text.includes("eid") || text.includes("christmas") || 
        text.includes("republic day") || text.includes("independence day") || text.includes("break")) {
        return "holiday";
    }
    if (text.includes("exam") || text.includes("test") || text.includes("assessment") || 
        text.includes("fa-") || text.includes("fa1") || text.includes("fa2") || 
        text.includes("sa1") || text.includes("sa2") || text.includes("pre-board") || text.includes("mid-term")) {
        return "exam";
    }
    if (text.includes("sport") || text.includes("athletics") || text.includes("tournament") || text.includes("match")) {
        return "sports";
    }
    if (text.includes("cultural") || text.includes("annual day") || text.includes("celebration") || 
        text.includes("fest") || text.includes("teachers day") || text.includes("childrens day")) {
        return "cultural";
    }
    if (text.includes("assembly") || text.includes("exhibition") || text.includes("workshop") || 
        text.includes("seminar") || text.includes("science fair") || text.includes("orientation")) {
        return "academic_assembly";
    }
    return "general";
}

function parseFlexibleDate(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date && isValid(dateInput)) return dateInput;

    // Try standard ISO or string date
    const d = new Date(dateInput);
    if (isValid(d)) return d;

    // Try DD/MM/YYYY or DD-MM-YYYY format
    if (typeof dateInput === 'string') {
        const parts = dateInput.split(/[-/.]/);
        if (parts.length === 3) {
            // Check if day is first (e.g. 15/08/2026)
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            if (year > 1900 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
                const constructed = new Date(year, month, day);
                if (isValid(constructed)) return constructed;
            }
        }
    }
    return null;
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        const hasAccess = session && (['admin', 'super_admin'].includes(session.user.role) || 
            (session.user.role === 'instructor' && session.user.permissions?.includes('manage_events')));
        
        if (!hasAccess) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const rawEvents = Array.isArray(body) ? body : (body.events || body.fixtures || body.data || []);
        const clearExisting = body.clearExisting === true;

        if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
            return NextResponse.json({ error: "No events provided. Expected an array of event objects." }, { status: 400 });
        }

        await connectDB();
        const instituteId = session.user.institute.id;

        // Optionally clear existing calendar events if user explicitly requests clean slate
        if (clearExisting) {
            await Event.updateMany(
                { institute: instituteId, deletedAt: null },
                { $set: { deletedAt: new Date() } }
            );
        }

        let createdCount = 0;
        let skippedCount = 0;
        const validDocsToInsert = [];

        for (const item of rawEvents) {
            const title = item.title || item.name || item.event || item.activity;
            if (!title) {
                skippedCount++;
                continue;
            }

            const rawStart = item.startDate || item.start || item.date || item.from;
            const rawEnd = item.endDate || item.end || item.to || rawStart;

            const parsedStart = parseFlexibleDate(rawStart);
            if (!parsedStart) {
                skippedCount++;
                continue;
            }

            const parsedEnd = parseFlexibleDate(rawEnd) || parsedStart;

            // Ensure start date <= end date
            const finalStart = parsedStart <= parsedEnd ? parsedStart : parsedEnd;
            const finalEnd = parsedEnd >= parsedStart ? parsedEnd : parsedStart;

            let category = (item.category || "").toLowerCase();
            if (category === "celebration") category = "cultural";
            if (category === "meeting" || category === "academic") category = "academic_assembly";
            if (!VALID_CATEGORIES.includes(category)) {
                category = detectCategory(title, item.description || "");
            }

            validDocsToInsert.push({
                title: title.trim(),
                description: item.description || item.notes || item.details || "",
                startDate: finalStart,
                endDate: finalEnd,
                category,
                target: item.target || 'all',
                targetIds: Array.isArray(item.targetIds) ? item.targetIds : [],
                institute: instituteId,
                createdBy: session.user.id
            });
        }

        if (validDocsToInsert.length > 0) {
            await Event.insertMany(validDocsToInsert);
            createdCount = validDocsToInsert.length;
        }

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'event.bulk_import',
                resource: { type: 'Event' },
                institute: instituteId,
                details: { importedCount: createdCount, skippedCount, clearExisting }
            });
        } catch (auditErr) {
            console.error("Audit log failed for event import:", auditErr);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully imported ${createdCount} calendar fixture(s).`,
            stats: {
                totalProvided: rawEvents.length,
                created: createdCount,
                skipped: skippedCount
            }
        });

    } catch (error) {
        console.error("Bulk Import Events Error:", error);
        return NextResponse.json({ error: error.message || "Failed to import calendar events" }, { status: 500 });
    }
}
