"use client";

import { useState, useEffect } from "react";
import { Calendar, CalendarDays, Clock, MapPin, Tag } from "lucide-react";
import { format } from "date-fns";

export default function MobileInstructorCalendar() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCalendarEvents();
    }, []);

    const fetchCalendarEvents = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/calendar');
            if (res.ok) {
                const data = await res.json();
                setEvents(data.events || []);
            }
        } catch (e) {
            console.error("Failed to fetch calendar events", e);
        } finally {
            setLoading(false);
        }
    };

    const currentMonthFormatted = format(new Date(), 'MMMM yyyy');

    return (
        <div className="space-y-3 pb-8 pt-1">
            {/* Header */}
            <div className="bg-slate-900 text-white rounded-lg p-3 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Teacher Portal
                </span>
                <h1 className="text-base font-bold text-white flex items-center gap-2">
                    <CalendarDays size={18} /> School Calendar ({currentMonthFormatted})
                </h1>
            </div>

            {/* Event List Feed */}
            {loading ? (
                <div className="bg-white p-6 rounded-lg text-center border border-slate-200 text-xs font-medium text-slate-500">
                    Loading school calendar...
                </div>
            ) : events.length === 0 ? (
                <div className="bg-white p-6 rounded-lg text-center border border-slate-200">
                    <Calendar size={24} className="text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">No Events Scheduled</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">No school events or holidays scheduled for this month.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {events.map(ev => (
                        <div key={ev._id} className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-1.5">
                            <div className="flex justify-between items-start">
                                <h3 className="text-xs font-bold text-slate-900 leading-snug">{ev.title}</h3>
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border bg-slate-50 text-slate-700 border-slate-200">
                                    {ev.type || 'EVENT'}
                                </span>
                            </div>

                            {ev.description && (
                                <p className="text-xs text-slate-600 font-normal leading-relaxed">
                                    {ev.description}
                                </p>
                            )}

                            <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 font-medium flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                    <Calendar size={11} /> {ev.startDate ? format(new Date(ev.startDate), 'MMM d, yyyy') : ''}
                                </span>
                                {ev.location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin size={11} /> {ev.location}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
