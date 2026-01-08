import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Institute from '@/models/Institute';
import { getInstituteScope } from '@/middleware/instituteScope';
import { createAuditLog } from '@/services/auditService';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope.instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 404 });
        }

        const institute = await Institute.findById(scope.instituteId);
        if (!institute) {
            return NextResponse.json({ error: "Institute not found" }, { status: 404 });
        }

        return NextResponse.json({ institute });
    } catch (error) {
        console.error("GET /api/v1/institute error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);

        // Only Admin or Super Admin can update institute settings
        if (scope.user.role !== 'admin' && scope.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!scope.instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 404 });
        }

        const body = await req.json();

        // Allowed updates
        const updateData = {};
        if (body.name) updateData.name = body.name;
        if (body.branding) {
            updateData.branding = {};
            if (body.branding.logo) updateData.branding.logo = body.branding.logo;
            if (body.branding.primaryColor) updateData.branding.primaryColor = body.branding.primaryColor;
            if (body.branding.secondaryColor) updateData.branding.secondaryColor = body.branding.secondaryColor;
            // Add other allowed branding fields
        }
        if (body.address) {
            updateData.address = {};
            if (body.address.street) updateData.address.street = body.address.street;
            if (body.address.city) updateData.address.city = body.address.city;
            if (body.address.state) updateData.address.state = body.address.state;
            if (body.address.postalCode) updateData.address.postalCode = body.address.postalCode;
            if (body.address.country) updateData.address.country = body.address.country;
            // Add other allowed address fields
        } if (body.contactEmail) updateData.contactEmail = body.contactEmail;
        if (body.contactPhone) updateData.contactPhone = body.contactPhone;
        if (body.website) updateData.website = body.website;

        if (body.settings) {
            updateData.settings = {};
            const allowedSettings = ['timezone', 'dateFormat', 'currency', 'language', 'receiptTemplate', 'emailNotifications', 'smsNotifications'];

            allowedSettings.forEach(key => {
                if (body.settings[key] !== undefined) {
                    updateData.settings[key] = body.settings[key];
                }
            });

            // Handle nested features object
            if (body.settings.features) {
                updateData.settings.features = {};
                const allowedFeatures = ['exams', 'attendance', 'fees', 'materials'];
                allowedFeatures.forEach(feature => {
                    if (body.settings.features[feature] !== undefined) {
                        updateData.settings.features[feature] = Boolean(body.settings.features[feature]);
                    }
                });
            }
        }

        // Validate Inputs
        if (updateData.contactEmail && !/^\S+@\S+\.\S+$/.test(updateData.contactEmail)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }
        if (updateData.contactPhone && !/^\+?[\d\s-]{10,}$/.test(updateData.contactPhone)) {
            return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
        }
        if (updateData.website) {
            try {
                const url = new URL(updateData.website);
                if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
            } catch (e) {
                return NextResponse.json({ error: "Invalid website URL" }, { status: 400 });
            }
        }

        const updatedInstitute = await Institute.findByIdAndUpdate(
            scope.instituteId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        // Audit Log
        const actorId = session?.user?.id || 'unknown';
        if (actorId !== 'unknown') {
            await createAuditLog({
                actor: actorId,
                action: 'institute.update',
                resource: { type: 'Institute', id: scope.instituteId },
                institute: scope.instituteId,
                details: {
                    changes: Object.keys(updateData).reduce((acc, key) => {
                        if (key === 'settings' && updateData.settings) {
                            // Expand settings keys
                            const settingKeys = Object.keys(updateData.settings).map(sk => `settings.${sk}`);
                            return [...acc, ...settingKeys];
                        }
                        return [...acc, key];
                    }, [])
                }
            });
        }

        return NextResponse.json({
            success: true,
            institute: updatedInstitute
        });

    } catch (error) {
        console.error("PATCH /api/v1/institute error:", error);
        return NextResponse.json({ error: "Failed to update institute" }, { status: 500 });
    }
}
