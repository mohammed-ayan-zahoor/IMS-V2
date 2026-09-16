"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Boxes, Monitor, FileSpreadsheet, Settings, RefreshCw, HelpCircle } from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";

import StockOverviewTab from "@/components/stock/StockOverviewTab";
import AssetRegisterTab from "@/components/stock/AssetRegisterTab";
import StockLedgerTab from "@/components/stock/StockLedgerTab";
import StockMastersTab from "@/components/stock/StockMastersTab";
import StockGuideModal from "@/components/stock/StockGuideModal";
import { MovementModal, TransferModal, AssetModal, CheckoutModal } from "@/components/stock/StockModals";
import { CategoryModal, LocationModal, VendorModal, ItemModal } from "@/components/stock/MasterModals";

function StockDashboardContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const toast = useToast();

    const activeTab = searchParams.get("tab") || "overview";
    const setActiveTab = (tab) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.push(`/admin/stock?${params.toString()}`);
    };

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Master data
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [locations, setLocations] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [users, setUsers] = useState([]);

    // Module-specific data
    const [consumableSummary, setConsumableSummary] = useState([]);
    const [assets, setAssets] = useState([]);

    // Modals
    const [movementModal, setMovementModal] = useState({ isOpen: false, type: 'PURCHASE_IN', itemId: null });
    const [transferModal, setTransferModal] = useState({ isOpen: false, itemId: null });
    const [assetModalOpen, setAssetModalOpen] = useState(false);
    const [checkoutModal, setCheckoutModal] = useState({ isOpen: false, asset: null });

    // Master Modals
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [vendorModalOpen, setVendorModalOpen] = useState(false);
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [helpModalOpen, setHelpModalOpen] = useState(false);

    const fetchAllData = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            else setRefreshing(true);

            const [
                catRes,
                locRes,
                venRes,
                itmRes,
                usrRes,
                legRes,
                astRes
            ] = await Promise.all([
                fetch("/api/v1/stock/categories"),
                fetch("/api/v1/stock/locations"),
                fetch("/api/v1/stock/vendors"),
                fetch("/api/v1/stock/items"),
                fetch("/api/v1/stock/staff"),
                fetch("/api/v1/stock/ledger"),
                fetch("/api/v1/stock/assets")
            ]);

            const [catData, locData, venData, itmData, usrData, legData, astData] = await Promise.all([
                catRes.json(),
                locRes.json(),
                venRes.json(),
                itmRes.json(),
                usrRes.json(),
                legRes.json(),
                astRes.json()
            ]);

            setCategories(catData.categories || []);
            setLocations(locData.locations || []);
            setVendors(venData.vendors || []);
            setItems(itmData.items || []);
            setUsers(usrData.users || []);
            setConsumableSummary(legData.itemsSummary || []);
            setAssets(astData.assets || []);
        } catch (err) {
            console.error("Failed to load inventory data:", err);
            toast.error("Failed to load stock data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleOpenMovement = (type = 'PURCHASE_IN', itemId = null) => {
        setMovementModal({ isOpen: true, type, itemId });
    };

    const handleOpenTransfer = (itemId = null) => {
        setTransferModal({ isOpen: true, itemId });
    };

    const handleOpenCheckout = (asset) => {
        setCheckoutModal({ isOpen: true, asset });
    };

    if (loading) {
        return (
            <div className="p-8">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 pb-12 animate-fade-in">
            {/* Header - Flat, Open, Containerless */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">
                        Stock & Inventory
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Consumables, serialized equipment, and day-book movement ledger
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setHelpModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        title="Module Guide & Help"
                    >
                        <HelpCircle size={14} />
                        How to Use
                    </button>
                    <button
                        onClick={() => fetchAllData(true)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        title="Refresh Data"
                    >
                        <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Flat Navigation Tabs - strictly no container boxes */}
            <div className="flex items-center gap-6 border-b border-slate-200 text-sm font-medium">
                {[
                    { id: "overview", label: "Consumables & Stock", icon: Boxes },
                    { id: "assets", label: "Asset Register", icon: Monitor },
                    { id: "ledger", label: "Stock Day Book", icon: FileSpreadsheet },
                    { id: "masters", label: "Master Data", icon: Settings }
                ].map(tab => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 py-3 border-b-2 font-semibold text-xs tracking-wide transition-colors ${
                                isActive
                                    ? "border-slate-900 text-slate-900"
                                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                            }`}
                        >
                            <Icon size={15} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Views */}
            {activeTab === "overview" && (
                <StockOverviewTab
                    consumableItems={consumableSummary}
                    categories={categories}
                    locations={locations}
                    onOpenMovement={handleOpenMovement}
                    onOpenTransfer={handleOpenTransfer}
                />
            )}

            {activeTab === "assets" && (
                <AssetRegisterTab
                    assets={assets}
                    locations={locations}
                    items={items}
                    onOpenAssetModal={() => setAssetModalOpen(true)}
                    onOpenCheckoutModal={handleOpenCheckout}
                    onRefresh={() => fetchAllData(true)}
                />
            )}

            {activeTab === "ledger" && (
                <StockLedgerTab
                    locations={locations}
                    items={items}
                />
            )}

            {activeTab === "masters" && (
                <StockMastersTab
                    items={items}
                    categories={categories}
                    locations={locations}
                    vendors={vendors}
                    onOpenItemModal={() => setItemModalOpen(true)}
                    onOpenCategoryModal={() => setCategoryModalOpen(true)}
                    onOpenLocationModal={() => setLocationModalOpen(true)}
                    onOpenVendorModal={() => setVendorModalOpen(true)}
                    onRefresh={() => fetchAllData(true)}
                />
            )}

            {/* Operational Modals */}
            <MovementModal
                isOpen={movementModal.isOpen}
                onClose={() => setMovementModal({ isOpen: false, type: 'PURCHASE_IN', itemId: null })}
                items={items}
                locations={locations}
                vendors={vendors}
                users={users}
                onSuccess={() => fetchAllData(true)}
            />

            <TransferModal
                isOpen={transferModal.isOpen}
                onClose={() => setTransferModal({ isOpen: false, itemId: null })}
                items={items}
                locations={locations}
                onSuccess={() => fetchAllData(true)}
            />

            <AssetModal
                isOpen={assetModalOpen}
                onClose={() => setAssetModalOpen(false)}
                items={items}
                locations={locations}
                vendors={vendors}
                onSuccess={() => fetchAllData(true)}
            />

            <CheckoutModal
                isOpen={checkoutModal.isOpen}
                onClose={() => setCheckoutModal({ isOpen: false, asset: null })}
                asset={checkoutModal.asset}
                users={users}
                onSuccess={() => fetchAllData(true)}
            />

            {/* Master Creation Modals */}
            <CategoryModal
                isOpen={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                onSuccess={() => fetchAllData(true)}
            />

            <LocationModal
                isOpen={locationModalOpen}
                onClose={() => setLocationModalOpen(false)}
                users={users}
                onSuccess={() => fetchAllData(true)}
            />

            <VendorModal
                isOpen={vendorModalOpen}
                onClose={() => setVendorModalOpen(false)}
                onSuccess={() => fetchAllData(true)}
            />

            <ItemModal
                isOpen={itemModalOpen}
                onClose={() => setItemModalOpen(false)}
                categories={categories}
                locations={locations}
                vendors={vendors}
                onSuccess={() => fetchAllData(true)}
            />

            {/* Guide & Help Walkthrough */}
            <StockGuideModal
                isOpen={helpModalOpen}
                onClose={() => setHelpModalOpen(false)}
            />
        </div>
    );
}

export default function StockPage() {
    return (
        <Suspense fallback={<div className="p-8"><LoadingSpinner /></div>}>
            <StockDashboardContent />
        </Suspense>
    );
}
