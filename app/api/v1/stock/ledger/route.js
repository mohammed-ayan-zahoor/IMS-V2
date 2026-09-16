import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStockAuth } from "@/lib/stock/auth";
import { computeStockLedger, getAllConsumableStockSummary } from "@/lib/stock/computeStockLevel";

export async function GET(req) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date');
        const locationId = searchParams.get('locationId');
        const itemId = searchParams.get('itemId');

        await connectDB();

        const [ledger, itemsSummary] = await Promise.all([
            computeStockLedger({
                instituteId: auth.instituteId,
                date,
                locationId: locationId || null,
                itemId: itemId || null
            }),
            getAllConsumableStockSummary(auth.instituteId)
        ]);

        return NextResponse.json({
            ledger,
            itemsSummary
        });
    } catch (error) {
        console.error("Failed to compute stock ledger:", error);
        return NextResponse.json({ error: "Failed to compute stock ledger" }, { status: 500 });
    }
}
