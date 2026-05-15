# Month-wise Admission Reports - Quick Implementation Guide

## 1-Minute Overview

**Goal:** Create month-wise admission reports for vocational institutions

**Key Data Points to Track:**
- Daily admission applications
- Status breakdown (pending, converted, cancelled)
- Course-wise distribution
- Referral source analysis
- Conversion funnel
- Institution type filtering

---

## Quick Facts

| Item | Details |
|------|---------|
| **DB Model** | AdmissionApplication (timestamps ✅) |
| **Data Availability** | createdAt, updatedAt, status, institute |
| **Multi-tenant** | ✅ institute field indexes queries |
| **Institution Types** | VOCATIONAL, SCHOOL (already defined) |
| **Tech Stack** | Next.js, MongoDB, Recharts, XLSX |
| **Existing Pattern** | `/app/admin/reports/attendance/page.jsx` |
| **Export Format** | XLSX (already in use) |
| **Date Handling** | date-fns 4.1.0 available |

---

## Implementation Checklist

### Phase 1: Backend (30 mins)

- [ ] Create `/app/api/v1/admissions/report/route.js`
  - GET endpoint
  - Query params: startDate, endDate, status, course, groupBy
  - Returns: summary + timeSeries + byCourse + byReferral
  
- [ ] Add MongoDB indexes (optional but recommended)
  ```javascript
  // In AdmissionApplication schema
  index({ institute: 1, createdAt: -1 })
  index({ institute: 1, status: 1, createdAt: 1 })
  index({ course: 1, createdAt: -1 })
  ```

### Phase 2: Service Layer (20 mins)

- [ ] Create `/services/admissionReportService.js`
  - `getMonthlyReport(instituteId, year, month)`
  - `getTimeSeries(instituteId, startDate, endDate)`
  - `getCourseBreakdown(instituteId, startDate, endDate)`

### Phase 3: Frontend (45 mins)

- [ ] Create `/app/admin/reports/admissions/page.jsx`
  - Copy structure from `/app/admin/reports/attendance/page.jsx`
  - Add period selector (month/year pickers)
  - Add filters (institution type, course, status)
  - Add visualizations (Recharts)
  - Add export to Excel

### Phase 4: Integration (15 mins)

- [ ] Add menu item to admin navigation
- [ ] Link from admissions management page
- [ ] Test with sample data

---

## File Template: API Route

```javascript
// /app/api/v1/admissions/report/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AdmissionApplication from "@/models/AdmissionApplication";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "super_admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const instituteId = session.user.institute?.id;
    const startDate = new Date(searchParams.get("startDate"));
    const endDate = new Date(searchParams.get("endDate"));
    const status = searchParams.get("status") || "all";

    // 1. Get summary
    const summaryPipeline = [
      {
        $match: {
          institute: new mongoose.Types.ObjectId(instituteId),
          createdAt: { $gte: startDate, $lte: endDate },
          ...(status !== "all" && { status })
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          converted: { $sum: { $cond: [{ $eq: ["$status", "converted"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } }
        }
      }
    ];

    const summary = await AdmissionApplication.aggregate(summaryPipeline);

    // 2. Get time series
    const timeSeriesPipeline = [
      {
        $match: {
          institute: new mongoose.Types.ObjectId(instituteId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          converted: { $sum: { $cond: [{ $eq: ["$status", "converted"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ];

    const timeSeries = await AdmissionApplication.aggregate(timeSeriesPipeline);

    // 3. Get by course
    const courseBreakdownPipeline = [
      {
        $match: {
          institute: new mongoose.Types.ObjectId(instituteId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$course",
          total: { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ["$status", "converted"] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "courseInfo"
        }
      }
    ];

    const courseBreakdown = await AdmissionApplication.aggregate(courseBreakdownPipeline);

    return NextResponse.json({
      summary: summary[0] || {},
      timeSeries,
      courseBreakdown
    });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
```

---

## File Template: Frontend Page

```javascript
// /app/admin/reports/admissions/page.jsx

"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/contexts/ToastContext";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";

export default function AdmissionReportsPage() {
  const toast = useToast();
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchReport = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select dates");
      return;
    }

    setLoading(true);
    try {
      const query = new URLSearchParams({
        startDate,
        endDate,
        status: statusFilter
      });

      const res = await fetch(`/api/v1/admissions/report?${query}`);
      if (!res.ok) throw new Error("Failed to fetch");
      
      const data = await res.json();
      setReportData(data);
    } catch (error) {
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!reportData) return;
    
    const worksheet = XLSX.utils.json_to_sheet(reportData.timeSeries);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Admissions");
    XLSX.writeFile(workbook, `admissions_${startDate}_${endDate}.xlsx`);
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const summary = reportData?.summary || {};
  const conversionRate = summary.total ? ((summary.converted / summary.total) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-6 flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-sm font-semibold mb-1">Start Date</label>
            <Input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">End Date</label>
            <Input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button onClick={fetchReport} disabled={loading}>
            {loading ? "Loading..." : "Generate Report"}
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!reportData}>
            Export to Excel
          </Button>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 mb-1">Total Applications</p>
              <p className="text-3xl font-bold">{summary.total || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 mb-1">Pending</p>
              <p className="text-3xl font-bold text-amber-600">{summary.pending || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 mb-1">Converted</p>
              <p className="text-3xl font-bold text-emerald-600">{summary.converted || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 mb-1">Cancelled</p>
              <p className="text-3xl font-bold text-red-600">{summary.cancelled || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 mb-1">Conversion Rate</p>
              <p className="text-3xl font-bold text-blue-600">{conversionRate}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {reportData?.timeSeries && reportData.timeSeries.length > 0 && (
        <Card>
          <CardHeader>Time Series Trend</CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pending" stroke="#f59e0b" />
                <Line type="monotone" dataKey="converted" stroke="#10b981" />
                <Line type="monotone" dataKey="cancelled" stroke="#ef4444" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## Database Indexes to Add

```javascript
// In /models/AdmissionApplication.js, add to the schema:

AdmissionApplicationSchema.index({ institute: 1, createdAt: -1 });
AdmissionApplicationSchema.index({ institute: 1, status: 1, createdAt: 1 });
AdmissionApplicationSchema.index({ course: 1, createdAt: -1 });
```

---

## API Response Example

```json
{
  "summary": {
    "_id": null,
    "total": 150,
    "pending": 45,
    "converted": 100,
    "cancelled": 5
  },
  "timeSeries": [
    {
      "_id": "2024-05-01",
      "pending": 5,
      "converted": 3,
      "cancelled": 1,
      "total": 9
    },
    {
      "_id": "2024-05-02",
      "pending": 8,
      "converted": 5,
      "cancelled": 0,
      "total": 13
    }
  ],
  "courseBreakdown": [
    {
      "_id": "course123",
      "total": 50,
      "converted": 40,
      "courseInfo": [
        {
          "_id": "course123",
          "name": "Web Development Bootcamp",
          "code": "WEB101"
        }
      ]
    }
  ]
}
```

---

## Testing Checklist

- [ ] Generate report for current month
- [ ] Export data to Excel
- [ ] Verify conversion rate calculation
- [ ] Test with different date ranges
- [ ] Verify institute isolation (no cross-tenant data leak)
- [ ] Test with vocational and school types
- [ ] Check performance with large datasets

---

## Performance Optimization Tips

1. **Use aggregation pipeline** - Don't load all records to memory
2. **Add indexes** - Query on institute + createdAt
3. **Limit date ranges** - Don't go beyond 1 year if possible
4. **Cache monthly reports** - Monthly reports are immutable
5. **Use $facet** - Get count and data in single query

---

## References

- **Existing Report Pattern**: `/app/admin/reports/attendance/page.jsx`
- **API Pattern**: `/api/v1/reports/attendance/route.js`
- **Model Reference**: `/models/AdmissionApplication.js`
- **Service Pattern**: `/services/studentService.js`

---

**Total Implementation Time: ~2-3 hours**
**Lines of Code: ~500-600**
**Complexity: Low-Medium**

