import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Institute from '@/models/Institute';
import Membership from '@/models/Membership';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email')?.trim().toLowerCase();
        const code = searchParams.get('code')?.trim().toUpperCase();

        if (!email && !code) {
            return NextResponse.json({ success: true, institute: null });
        }

        await connectDB();

        // 1. Lookup by Institute Code directly (e.g. from bookmarked URL ?code=GVA)
        if (code) {
            const institute = await Institute.findOne({ 
                code, 
                isActive: true, 
                status: 'active' 
            }).select('name code branding.logo branding.primaryColor type');

            if (institute) {
                return NextResponse.json({
                    success: true,
                    institute: {
                        name: institute.name,
                        code: institute.code,
                        logo: institute.branding?.logo || null,
                        primaryColor: institute.branding?.primaryColor || '#2563eb',
                        type: institute.type
                    }
                });
            }
        }

        // 2. Lookup by User Email
        if (email && /^\S+@\S+\.\S+$/.test(email)) {
            const user = await User.findOne({ 
                email, 
                deletedAt: null 
            })
            .select('institute role');

            if (user) {
                // Check if user has memberships (sorted by most recently accessed)
                const memberships = await Membership.find({
                    user: user._id,
                    isActive: true
                })
                .sort({ lastAccessed: -1 })
                .populate({
                    path: 'institute',
                    select: 'name code branding.logo branding.primaryColor type isActive status'
                });

                const activeMemberships = memberships.filter(
                    m => m.institute && m.institute.isActive && m.institute.status === 'active'
                );

                if (activeMemberships.length > 0) {
                    const primaryInst = activeMemberships[0].institute;
                    return NextResponse.json({
                        success: true,
                        institute: {
                            name: primaryInst.name,
                            code: primaryInst.code,
                            logo: primaryInst.branding?.logo || null,
                            primaryColor: primaryInst.branding?.primaryColor || '#2563eb',
                            type: primaryInst.type,
                            totalInstitutes: activeMemberships.length
                        }
                    });
                }

                // Fallback to legacy primary institute on user model if memberships empty
                if (user.institute) {
                    const legacyInst = await Institute.findById(user.institute).select('name code branding.logo branding.primaryColor type isActive status');
                    if (legacyInst && legacyInst.isActive && legacyInst.status === 'active') {
                        return NextResponse.json({
                            success: true,
                            institute: {
                                name: legacyInst.name,
                                code: legacyInst.code,
                                logo: legacyInst.branding?.logo || null,
                                primaryColor: legacyInst.branding?.primaryColor || '#2563eb',
                                type: legacyInst.type,
                                totalInstitutes: 1
                            }
                        });
                    }
                }
            }
        }

        return NextResponse.json({ success: true, institute: null });
    } catch (error) {
        console.error('Institute lookup error:', error);
        return NextResponse.json({ success: true, institute: null });
    }
}

