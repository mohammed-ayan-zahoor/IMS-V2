import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getInstituteScope } from "@/middleware/instituteScope";
import Batch from "@/models/Batch";
import Fee from "@/models/Fee";
import Session from "@/models/Session";
import Attendance from "@/models/Attendance";
import TransportFee from "@/models/TransportFee";
import HostelAllotment from "@/models/HostelAllotment";
import mongoose from "mongoose";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        const instituteId = scope?.instituteId || session.user?.institute?.id || session.user?.institute?._id || (typeof session.user?.institute === 'string' ? session.user?.institute : null);

        // If user is a student, prioritize batches they are enrolled in
        if (session.user.role === 'student') {
            const studentObjId = new mongoose.Types.ObjectId(session.user.id);

            // Find all batches the student is enrolled in (active or completed)
            const batches = await Batch.find({
                "enrolledStudents.student": studentObjId,
                deletedAt: null
            }).select("session");

            // Also include sessions from Fee records
            const fees = await Fee.find({
                student: studentObjId,
                deletedAt: null
            }).select("session");

            const batchSessionIds = batches.map(b => b.session?.toString()).filter(Boolean);
            const feeSessionIds = fees.map(f => f.session?.toString()).filter(Boolean);
            const sessionIds = [...new Set([...batchSessionIds, ...feeSessionIds])];

            if (sessionIds.length > 0) {
                // Fetch in chronological order (earliest first) to accurately determine student's semester progression
                const chronologicalSessions = await Session.find({
                    _id: { $in: sessionIds },
                    deletedAt: null
                }).sort({ startDate: 1, createdAt: 1 }).lean();

                if (chronologicalSessions.length > 0) {
                    // Pre-compute semester metadata for each session
                    const sessionSemesterMap = new Map();
                    for (let i = 0; i < chronologicalSessions.length; i++) {
                        const s = chronologicalSessions[i];
                        const sIdStr = s._id.toString();

                        // 1. Check batches enrolled in this session
                        const sessBatches = await Batch.find({
                            session: s._id,
                            "enrolledStudents.student": studentObjId,
                            deletedAt: null
                        }).select("_id name course semester").populate("course", "name code").lean();

                        let semNum = null;
                        for (const b of sessBatches) {
                            if (b.semester && b.semester >= 1 && b.semester <= 12) {
                                semNum = b.semester;
                                break;
                            }
                            const m = (b.name || '').match(/(?:^|[^\d])(\d+)(?:st|nd|rd|th)?\s*sem/i);
                            if (m) {
                                semNum = parseInt(m[1], 10);
                                break;
                            }
                        }

                        // 2. Parse session name for direct Sem number or ODD/EVEN pattern
                        const name = (s.sessionName || '').toUpperCase();
                        if (!semNum) {
                            const semMatch = name.match(/SEM(?:ESTER)?\s*[-:]?\s*(\d+)/i);
                            if (semMatch) {
                                semNum = parseInt(semMatch[1], 10);
                            }
                        }

                        if (!semNum) {
                            const isOdd = name.includes('ODD');
                            const isEven = name.includes('EVEN');
                            const yrMatch = name.match(/20(\d{2})[-–/](\d{2})/);
                            if (yrMatch && (isOdd || isEven)) {
                                const startYr = parseInt(yrMatch[1], 10);
                                // Base from 2025: 25 -> Year 1, 26 -> Year 2, 27 -> Year 3, 28 -> Year 4
                                const yearIndex = Math.max(0, startYr - 25);
                                semNum = (yearIndex * 2) + (isOdd ? 1 : 2);
                            }
                        }

                        // 3. Fallback to chronological index + 1
                        if (!semNum || semNum <= 0) {
                            semNum = i + 1;
                        }

                        // Extract clean academic year e.g. "2025–26"
                        let academicYear = null;
                        const yrExtract = (s.sessionName || '').match(/(20\d{2}\s*[-–/]\s*\d{2,4})/);
                        if (yrExtract) {
                            academicYear = yrExtract[1].replace('/', '–').replace('-', '–');
                        } else if (s.startDate && s.endDate) {
                            const sy = new Date(s.startDate).getFullYear();
                            const ey = new Date(s.endDate).getFullYear();
                            academicYear = sy === ey ? `${sy}` : `${sy}–${String(ey).slice(-2)}`;
                        }

                        const shortName = `Sem ${semNum}`;
                        const displayName = academicYear ? `Semester ${semNum} · ${academicYear}` : `Semester ${semNum}`;

                        sessionSemesterMap.set(sIdStr, {
                            semesterNumber: semNum,
                            academicYear,
                            displayName,
                            shortName,
                            sessBatches
                        });
                    }

                    // Display order: active session first, then latest first
                    const studentSessions = [...chronologicalSessions].sort((a, b) => {
                        if (a.isActive && !b.isActive) return -1;
                        if (!a.isActive && b.isActive) return 1;
                        return new Date(b.startDate || 0) - new Date(a.startDate || 0);
                    });

                    // Enrich sessions with attendance, fees, and semester names
                    const enrichedSessions = await Promise.all(studentSessions.map(async (s) => {
                        try {
                            const sessObjId = s._id;
                            const sIdStr = sessObjId.toString();
                            const sessMeta = sessionSemesterMap.get(sIdStr) || {};
                            const sessBatches = sessMeta.sessBatches || [];

                            const batchIds = sessBatches.map(b => b._id);
                            const batchName = sessBatches.map(b => b.course?.name ? `${b.course.name} - ${b.name}` : b.name).join(", ") || null;

                            // 2. Attendance stats
                            let attendanceRate = null;
                            let attendanceTotal = 0;
                            if (batchIds.length > 0 && instituteId) {
                                const attRecords = await Attendance.find({
                                    institute: instituteId,
                                    batch: { $in: batchIds },
                                    records: { $elemMatch: { student: studentObjId } }
                                }).select("records").lean();

                                let presentCount = 0;
                                let lateCount = 0;
                                let absentCount = 0;
                                let excusedCount = 0;

                                for (const rec of attRecords) {
                                    const stRec = rec.records.find(r => r.student && String(r.student) === session.user.id);
                                    if (stRec) {
                                        const st = (stRec.status || '').toLowerCase();
                                        if (st === 'present') presentCount++;
                                        else if (st === 'late') lateCount++;
                                        else if (st === 'absent') absentCount++;
                                        else if (st === 'excused') excusedCount++;
                                    }
                                }

                                const totalMarked = presentCount + lateCount + absentCount + excusedCount;
                                if (totalMarked > 0) {
                                    attendanceTotal = totalMarked;
                                    attendanceRate = Math.min(100, Math.round(((presentCount + lateCount) / totalMarked) * 100));
                                }
                            }

                            // 3. Fee summary
                            let hasFees = false;
                            let totalDue = 0;

                            const feeRecords = await Fee.find({
                                student: studentObjId,
                                deletedAt: null,
                                $or: [
                                    { session: sessObjId },
                                    { session: { $in: [null, undefined] }, batch: { $in: batchIds } }
                                ]
                            }).lean();

                            for (const fee of feeRecords) {
                                hasFees = true;
                                const net = Math.max(0, (fee.totalAmount || 0) - (fee.discount?.amount || 0));
                                const paid = fee.paidAmount || 0;
                                totalDue += Math.max(0, net - paid);
                            }

                            // Transport fees
                            const transportFees = await TransportFee.find({
                                student: studentObjId,
                                session: sessObjId,
                                deletedAt: null
                            }).lean();
                            for (const tf of transportFees) {
                                const total = (tf.installments || []).reduce((acc, i) => acc + (i.amount || 0), 0);
                                if (total > 0) {
                                    hasFees = true;
                                    totalDue += Math.max(0, total - (tf.paidAmount || 0));
                                }
                            }

                            // Hostel fees
                            const hostelAllotments = await HostelAllotment.find({
                                student: studentObjId,
                                session: sessObjId,
                                deletedAt: null
                            }).lean();
                            for (const ha of hostelAllotments) {
                                const total = (ha.installments || []).reduce((acc, i) => acc + (i.amount || 0), 0);
                                if (total > 0) {
                                    hasFees = true;
                                    totalDue += Math.max(0, total - (ha.paidAmount || 0));
                                }
                            }

                            let feeStatus = 'clear';
                            if (hasFees) {
                                feeStatus = totalDue > 0 ? 'due' : 'paid';
                            }

                            return {
                                ...s,
                                batchName,
                                semesterNumber: sessMeta.semesterNumber || null,
                                academicYear: sessMeta.academicYear || null,
                                displayName: sessMeta.displayName || s.sessionName,
                                shortName: sessMeta.shortName || s.sessionName,
                                attendanceRate,
                                attendanceTotal,
                                feeStatus,
                                feeDueAmount: totalDue
                            };
                        } catch (err) {
                            console.error("Error enriching session:", err);
                            return s;
                        }
                    }));

                    return NextResponse.json({ sessions: enrichedSessions });
                }
            }
        }

        // For teachers, instructors, admins, or students without enrolled batches: return institute sessions
        if (instituteId) {
            const sessions = await Session.find({
                instituteId,
                deletedAt: null
            }).sort({ isActive: -1, startDate: -1, createdAt: -1 });

            return NextResponse.json({ sessions });
        }

        return NextResponse.json({ sessions: [] });

    } catch (error) {
        console.error("Fetch Student Sessions Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
