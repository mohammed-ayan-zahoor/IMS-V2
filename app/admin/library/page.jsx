'use client';
import { useState } from 'react';
import { HelpCircle, RefreshCw } from 'lucide-react';
import CatalogTab from '@/components/library/CatalogTab';
import CirculationPanel from '@/components/library/CirculationPanel';
import HoldsTab from '@/components/library/HoldsTab';
import ReportsTab from '@/components/library/ReportsTab';
import SettingsTab from '@/components/library/SettingsTab';
import LibraryGuideModal from '@/components/library/LibraryGuideModal';

const TABS = ['Catalog', 'Circulation', 'Holds', 'Reports', 'Settings'];

const TAB_DESCRIPTIONS = {
    Catalog: 'Book catalog, title master records, and physical copy accessioning',
    Circulation: 'Desk checkouts, returns, renewals, and barcode scanner wedge',
    Holds: 'Patron reservation queues, copy locks, and automated queue advancement',
    Reports: 'Library performance, overdue loans, and fine transaction ledger',
    Settings: 'Configure borrowing limits, overdue fines, hold expiry, and barcode prefixes'
};

export default function LibraryPage() {
    const [tab, setTab] = useState('Catalog');
    const [showGuide, setShowGuide] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <div className="w-full space-y-6 px-4 sm:px-6 py-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black">Library</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{TAB_DESCRIPTIONS[tab]}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setRefreshKey(k => k + 1)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                        title="Refresh"
                    >
                        <RefreshCw size={14} />
                    </button>
                    <button
                        onClick={() => setShowGuide(true)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                    >
                        <HelpCircle size={14} /> How to Use
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b flex gap-0 overflow-x-auto">
                {TABS.map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div key={`${tab}-${refreshKey}`}>
                {tab === 'Catalog' && <CatalogTab />}
                {tab === 'Circulation' && <CirculationPanel />}
                {tab === 'Holds' && <HoldsTab />}
                {tab === 'Reports' && <ReportsTab />}
                {tab === 'Settings' && <SettingsTab />}
            </div>

            <LibraryGuideModal
                isOpen={showGuide}
                onClose={() => setShowGuide(false)}
            />
        </div>
    );
}
