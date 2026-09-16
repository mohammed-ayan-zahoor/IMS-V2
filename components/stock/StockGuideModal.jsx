"use client";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

export default function StockGuideModal({ isOpen, onClose }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Stock & Inventory Guide" className="max-w-4xl">
            <div className="space-y-6 text-sm text-slate-700">
                {/* Intro summary */}
                <p className="text-slate-600 leading-relaxed border-b border-slate-100 pb-4 text-xs">
                    Institutional inventory is divided into two core tracks:
                    <strong className="text-slate-900 font-semibold"> Consumables</strong> (quantity-based goods like stationery, chemicals, uniforms) and
                    <strong className="text-slate-900 font-semibold"> Fixed Assets</strong> (discrete serialized equipment like computers, lab apparatus, and furniture).
                </p>

                {/* 2-Column Responsive Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Left Column: Masters & Consumables */}
                    <div className="space-y-6">
                        {/* Step 1 */}
                        <div className="space-y-1.5">
                            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                1. Setting Up Master Data
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Configure baseline records under the <strong className="text-slate-700">Master Data</strong> tab before transacting:
                            </p>
                            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                                <li><strong>Locations / Stores</strong>: Define stock points (Main Store, Labs, Library, Canteen).</li>
                                <li><strong>Categories</strong>: Group items (Stationery, Lab Glassware, Sports, IT).</li>
                                <li><strong>Vendors</strong>: Suppliers with contact person, phone, and GSTIN.</li>
                                <li>
                                    <strong>Items</strong>: Set SKU and choose the <em>Tracking Type</em>:
                                    <span className="block pl-4 text-slate-500 mt-0.5">
                                        • <strong>Consumable</strong>: Count-based stock with reorder level alerts.<br />
                                        • <strong>Fixed Asset</strong>: Discrete serialized units with custody tracking.
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/* Step 2 */}
                        <div className="space-y-1.5 border-t border-slate-100 pt-5">
                            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                2. Consumable Stock Movements
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Record movements under the <strong className="text-slate-700">Consumables & Stock</strong> tab:
                            </p>
                            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                                <li><strong>Receive Stock (+ In)</strong>: Record purchases against supplier bills into a selected store.</li>
                                <li><strong>Issue Out (- Out)</strong>: Disburse to a staff member or room. Inventory is guarded against going negative.</li>
                                <li><strong>Transfer</strong>: Shift stock between stores (e.g. Main Store to Physics Lab).</li>
                                <li><strong>Adjustment</strong>: Audit recount corrections or damaged goods write-offs.</li>
                                <li><strong>Low Stock Alerts</strong>: Automatically warns when stock reaches or drops below the reorder level.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Right Column: Assets, Day Book, Permissions */}
                    <div className="space-y-6">
                        {/* Step 3 */}
                        <div className="space-y-1.5">
                            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                3. Fixed Asset Custody & Register
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Manage individual equipment under the <strong className="text-slate-700">Asset Register</strong> tab:
                            </p>
                            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                                <li><strong>Register Assets</strong>: Add units with unique Asset Tags (e.g. AST-001) or batch generate tags (e.g. LAP-2026-001 to 010).</li>
                                <li><strong>Check Out to Staff</strong>: Hand over custody to a teacher or staff member with an optional due date.</li>
                                <li><strong>Assign to Room / Lab</strong>: Assign permanent equipment (projectors, server racks) to a room label.</li>
                                <li><strong>Check In / Return</strong>: Click <em>Check In</em> to return the unit back to store when custody ends.</li>
                            </ul>
                        </div>

                        {/* Step 4 */}
                        <div className="space-y-1.5 border-t border-slate-100 pt-5">
                            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                4. Daily Stock Book & Audit
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Audit daily changes under the <strong className="text-slate-700">Stock Day Book</strong> tab:
                            </p>
                            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                                <li>View Opening Stock, Inflows, Outflows, and Closing Stock for any selected day.</li>
                                <li>Filter by individual store location or view the consolidated institute book.</li>
                                <li>Export complete movement registers to <strong>Excel (.xlsx)</strong> or print audit sheets.</li>
                            </ul>
                        </div>

                        {/* Step 5 */}
                        <div className="space-y-1.5 border-t border-slate-100 pt-5">
                            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                5. Staff Permissions (Storekeepers)
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Non-admin staff (storekeepers) can be granted access by enabling the <strong className="text-slate-800">Manage stock & inventory (Storekeeper)</strong> checkbox in <em>Administration → User Management</em>.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button onClick={onClose} size="sm">
                        Got it
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
