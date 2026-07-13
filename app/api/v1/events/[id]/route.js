import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import { createAuditLog } from "@/services/auditService";
import mongoose from "mongoose";

/**
 * @route   GET /api/v1/events/[id]
 * @desc    Get a specific calendar event
 */
export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin', 'instructor'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;
        const event = await Event.findOne({ 
            _id: id,
            institute: session.user.institute.id,
            deletedAt: null
        });

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        return NextResponse.json({ event });
    } catch (error) {
        console.error("GET Event ID Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * @route   PATCH /api/v1/events/[id]
 * @desc    Update a calendar event
 */
export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        const hasAccess = session && (['admin', 'super_admin'].includes(session.user.role) || 
            (session.user.role === 'instructor' && session.user.permissions?.includes('manage_events')));
        if (!hasAccess) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id } = await params;

        await connectDB();
        const event = await Event.findOneAndUpdate(
            { _id: id, institute: session.user.institute.id, deletedAt: null },
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!event) {
            return NextResponse.json({ error: "Event not found or access denied" }, { status: 404 });
        }

        // Safe audit log creation
        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'event.update',
                resource: { type: 'Event', id: event._id },
                institute: session.user.institute.id,
                details: { title: event.title, category: event.category }
            });
        } catch (auditErr) {
            console.error("=> Failed to create event audit log:", auditErr);
        }

        return NextResponse.json({ message: "Event updated successfully", event });
    } catch (error) {
        console.error("PATCH Event ID Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * @route   DELETE /api/v1/events/[id]
 * @desc    Delete a calendar event
 */
export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        const hasAccess = session && (['admin', 'super_admin'].includes(session.user.role) || 
            (session.user.role === 'instructor' && session.user.permissions?.includes('manage_events')));
        if (!hasAccess) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        await connectDB();
        const event = await Event.findOneAndUpdate(
            { _id: id, institute: session.user.institute.id, deletedAt: null },
            { $set: { deletedAt: new Date() } },
            { new: true }
        );

        if (!event) {
            return NextResponse.json({ error: "Event not found or access denied" }, { status: 404 });
        }

        // Safe audit log creation
        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'event.delete',
                resource: { type: 'Event', id: event._id },
                institute: session.user.institute.id,
                details: { title: event.title }
            });
        } catch (auditErr) {
            console.error("=> Failed to create event audit log:", auditErr);
        }

        return NextResponse.json({ message: "Event deleted successfully" });
    } catch (error) {
        console.error("DELETE Event ID Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
