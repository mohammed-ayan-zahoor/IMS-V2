import { NextResponse } from "next/server";
import { getInstituteScope } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import TransportRoute from "@/models/TransportRoute";
import Vehicle from "@/models/Vehicle";
import TransportFee from "@/models/TransportFee";
import User from "@/models/User";

export async function GET(req) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const sessionId = searchParams.get('sessionId');

        await connectDB();
        const instituteId = scope.instituteId;

        if (type === 'route-students') {
            // Route-wise student list
            const routes = await TransportRoute.find({ institute: instituteId, deletedAt: null }).lean();
            
            const routeStudents = await Promise.all(routes.map(async (route) => {
                const students = await User.find({
                    'transport.route': route._id,
                    'transport.isAvailing': true,
                    institute: instituteId,
                    deletedAt: null
                })
                .select('profile.firstName profile.lastName enrollmentNumber transport.pickupStop transport.vehicle')
                .populate('transport.vehicle', 'registrationNumber type')
                .lean();

                return {
                    route: { _id: route._id, name: route.name, stops: route.stops },
                    students,
                    count: students.length
                };
            }));

            return NextResponse.json({ report: routeStudents });
        }

        if (type === 'vehicle-utilization') {
            // Vehicle utilization report
            const vehicles = await Vehicle.find({ institute: instituteId, deletedAt: null })
                .populate('route', 'name')
                .lean();

            const vehicleIds = vehicles.map(v => v._id);
            const occupancyCounts = await User.aggregate([
                { $match: { 'transport.isAvailing': true, 'transport.vehicle': { $in: vehicleIds }, deletedAt: null } },
                { $group: { _id: '$transport.vehicle', count: { $sum: 1 } } }
            ]);
            const occupancyMap = {};
            occupancyCounts.forEach(o => { occupancyMap[o._id.toString()] = o.count; });

            const report = vehicles.map(v => ({
                vehicle: {
                    _id: v._id,
                    registrationNumber: v.registrationNumber,
                    type: v.type,
                    capacity: v.capacity,
                    route: v.route
                },
                currentOccupancy: occupancyMap[v._id.toString()] || 0,
                utilizationPercent: Math.round(((occupancyMap[v._id.toString()] || 0) / v.capacity) * 100)
            }));

            return NextResponse.json({ report });
        }

        if (type === 'fee-collection') {
            // Fee collection summary
            const query = { institute: instituteId, deletedAt: null };
            if (sessionId) query.session = sessionId;

            const fees = await TransportFee.find(query)
                .populate('student', 'profile.firstName profile.lastName enrollmentNumber')
                .populate('route', 'name')
                .lean();

            const summary = {
                totalStudents: fees.length,
                totalExpected: fees.reduce((sum, f) => sum + f.totalAmount, 0),
                totalCollected: fees.reduce((sum, f) => sum + f.paidAmount, 0),
                totalPending: fees.reduce((sum, f) => sum + f.balanceAmount, 0),
                statusBreakdown: {
                    paid: fees.filter(f => f.status === 'paid').length,
                    partial: fees.filter(f => f.status === 'partial').length,
                    not_started: fees.filter(f => f.status === 'not_started').length,
                    overdue: fees.filter(f => f.status === 'overdue').length
                },
                fees
            };

            return NextResponse.json({ report: summary });
        }

        return NextResponse.json({ error: "Invalid report type. Use: route-students, vehicle-utilization, fee-collection" }, { status: 400 });
    } catch (error) {
        console.error("GET /api/v1/transport/reports error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
