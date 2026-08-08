"use client";

import { useState, useEffect } from "react";
import { 
  Tag, Plus, Search, Check, Copy, Trash2, Power, 
  Loader2, Mail, Calendar, Info, AlertCircle, RefreshCw 
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function SuperAdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedCode, setCopiedCode] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discountedPricePerSeat: "59",
    gstType: "inclusive",
    lockedToEmail: "",
    maxUses: "1",
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    topUpsAtCouponPrice: true,
    notes: "",
    sendEmail: true
  });

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/coupons");
      const data = await res.json();
      if (res.ok) {
        setCoupons(data.coupons || []);
      } else {
        toast.error(data.error || "Failed to fetch coupons");
      }
    } catch (err) {
      toast.error("Error loading coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!form.lockedToEmail || !form.discountedPricePerSeat || !form.validUntil) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim() || undefined,
          discountedPricePerSeat: parseFloat(form.discountedPricePerSeat),
          gstType: form.gstType,
          lockedToEmail: form.lockedToEmail.trim(),
          maxUses: parseInt(form.maxUses) || 1,
          validUntil: form.validUntil,
          topUpsAtCouponPrice: form.topUpsAtCouponPrice,
          notes: form.notes.trim(),
          sendEmail: form.sendEmail
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Coupon ${data.coupon.code} generated successfully!`);
        setIsModalOpen(false);
        setForm({
          code: "",
          discountedPricePerSeat: "59",
          gstType: "inclusive",
          lockedToEmail: "",
          maxUses: "1",
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          topUpsAtCouponPrice: true,
          notes: "",
          sendEmail: true
        });
        fetchCoupons();
      } else {
        toast.error(data.error || "Failed to generate coupon");
      }
    } catch (err) {
      toast.error("Error creating coupon");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      const res = await fetch(`/api/v1/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        toast.success(`Coupon ${!currentStatus ? "activated" : "deactivated"}`);
        setCoupons(prev => prev.map(c => c._id === id ? { ...c, isActive: !currentStatus } : c));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to toggle status");
      }
    } catch (err) {
      toast.error("Error updating coupon");
    }
  };

  const handleDelete = async (id, usedCount) => {
    if (usedCount > 0) {
      toast.error("Cannot delete a used coupon. Deactivate it instead.");
      return;
    }

    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const res = await fetch(`/api/v1/coupons/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Coupon deleted");
        setCoupons(prev => prev.filter(c => c._id !== id));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete coupon");
      }
    } catch (err) {
      toast.error("Error deleting coupon");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success("Coupon code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.lockedToEmail?.toLowerCase().includes(search.toLowerCase()) ||
    c.notes?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-2">
            <Tag className="text-indigo-600" /> MOU Coupon Manager
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and manage custom onboarding discount coupons for MOU-signed schools.
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={fetchCoupons}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
            title="Refresh list"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 text-sm"
          >
            <Plus size={18} /> Generate Coupon
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search by code, email, or school name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-900"
        />
      </div>

      {/* Coupon List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-sm font-medium">Loading coupons...</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Tag size={40} className="mx-auto text-slate-300" />
            <p className="font-bold text-slate-700">No coupons found</p>
            <p className="text-xs text-slate-400">Click "Generate Coupon" above to create one for an MOU school.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-extrabold text-slate-500">
                <tr>
                  <th className="px-6 py-4">Coupon Code</th>
                  <th className="px-6 py-4">Locked Email / School</th>
                  <th className="px-6 py-4">Price / Seat</th>
                  <th className="px-6 py-4">Uses</th>
                  <th className="px-6 py-4">Expiry Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCoupons.map((c) => {
                  const isExpired = new Date(c.validUntil) < new Date();
                  const isUsedUp = c.usedCount >= c.maxUses;

                  return (
                    <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-bold font-mono text-sm border border-indigo-100">
                            {c.code}
                          </code>
                          <button
                            onClick={() => copyToClipboard(c.code)}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            title="Copy code"
                          >
                            {copiedCode === c.code ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="text-slate-900 font-bold text-sm">{c.lockedToEmail}</p>
                          {c.notes && <p className="text-xs text-slate-400 truncate max-w-xs">{c.notes}</p>}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-900 text-base">₹{c.discountedPricePerSeat}</span>
                          <span className="text-xs text-slate-400 block">
                            {c.gstType === 'inclusive' ? 'GST Incl.' : '+ 18% GST'}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          isUsedUp ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                        }`}>
                          {c.usedCount} / {c.maxUses}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold ${isExpired ? "text-rose-600" : "text-slate-600"}`}>
                          {new Date(c.validUntil).toLocaleDateString("en-IN")}
                          {isExpired && " (Expired)"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          c.isActive && !isExpired && !isUsedUp
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.isActive && !isExpired && !isUsedUp ? "bg-emerald-600" : "bg-slate-400"}`} />
                          {c.isActive && !isExpired && !isUsedUp ? "Active" : isExpired ? "Expired" : isUsedUp ? "Exhausted" : "Disabled"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleActive(c._id, c.isActive)}
                            className={`p-2 rounded-lg transition-colors ${
                              c.isActive ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100"
                            }`}
                            title={c.isActive ? "Deactivate" : "Activate"}
                          >
                            <Power size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(c._id, c.usedCount)}
                            disabled={c.usedCount > 0}
                            className="p-2 text-rose-500 hover:bg-rose-50 disabled:opacity-30 rounded-lg transition-colors"
                            title={c.usedCount > 0 ? "Cannot delete used coupon" : "Delete coupon"}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Generate Coupon */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Tag size={20} className="text-indigo-600" /> Generate MOU Coupon
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  School Admin Email (Locked) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="principal@school.edu"
                  value={form.lockedToEmail}
                  onChange={(e) => setForm({ ...form, lockedToEmail: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">Only this exact email can apply the coupon on signup.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Discounted Rate / Seat (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.discountedPricePerSeat}
                    onChange={(e) => setForm({ ...form, discountedPricePerSeat: e.target.value })}
                    placeholder="e.g. 59, 69, 79"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    GST Mode *
                  </label>
                  <select
                    value={form.gstType}
                    onChange={(e) => setForm({ ...form, gstType: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 bg-white"
                  >
                    <option value="inclusive">GST Inclusive (Flat ₹59)</option>
                    <option value="exclusive">GST Exclusive (+18% GST)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Custom Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="uppercase w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  School Name / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Swapnpurti School, Malegaon — 3 Year MOU"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.topUpsAtCouponPrice}
                    onChange={(e) => setForm({ ...form, topUpsAtCouponPrice: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Allow future seat top-ups at this discounted coupon price
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.sendEmail}
                    onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Email coupon code to recipient automatically
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Generate Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
