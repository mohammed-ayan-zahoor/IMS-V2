"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, Tag, ShieldCheck, ArrowRight, Building2, Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";

const PUBLIC_PRICE_PER_SEAT = 100;
const GST_RATE = 0.18;

const STATES_LIST = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal", "Delhi", "Puducherry"
];

export default function OnboardingForm() {
  const [form, setForm] = useState({
    instituteName: "",
    city: "",
    state: "Maharashtra",
    contactName: "",
    designation: "Principal",
    email: "",
    phone: "",
    seats: "100",
    udiseCode: "",
    couponCode: ""
  });

  const [couponState, setCouponState] = useState({
    isValidating: false,
    applied: false,
    discountedPricePerSeat: null,
    gstType: 'exclusive',
    error: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [provisionDetails, setProvisionDetails] = useState(null);

  // Load Razorpay checkout SDK
  useEffect(() => {
    if (document.getElementById("razorpay-sdk")) return;
    const script = document.createElement("script");
    script.id = "razorpay-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === "couponCode" && couponState.applied) {
      // Reset coupon state if user changes code
      setCouponState({ isValidating: false, applied: false, discountedPricePerSeat: null, gstType: 'exclusive', error: "" });
    }
  };

  const validateCoupon = async () => {
    if (!form.couponCode.trim()) return;
    if (!form.email.trim()) {
      toast.error("Please enter your email first to validate the coupon.");
      return;
    }

    setCouponState(prev => ({ ...prev, isValidating: true, error: "" }));

    try {
      const res = await fetch("/api/v1/onboarding/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: form.couponCode.trim(), email: form.email.trim() })
      });

      const data = await res.json();

      if (data.valid) {
        setCouponState({
          isValidating: false,
          applied: true,
          discountedPricePerSeat: data.discountedPricePerSeat,
          gstType: data.gstType,
          error: ""
        });
        toast.success(`Coupon applied! Rate: ₹${data.discountedPricePerSeat}/seat`);
      } else {
        setCouponState({
          isValidating: false,
          applied: false,
          discountedPricePerSeat: null,
          gstType: 'exclusive',
          error: data.error || "Invalid coupon"
        });
        toast.error(data.error || "Invalid coupon code");
      }
    } catch (err) {
      setCouponState({ isValidating: false, applied: false, discountedPricePerSeat: null, gstType: 'exclusive', error: "Validation failed" });
      toast.error("Failed to validate coupon");
    }
  };

  // Pricing math
  const seatsNum = Math.max(1, parseInt(form.seats) || 0);
  const activePricePerSeat = couponState.applied && couponState.discountedPricePerSeat ? couponState.discountedPricePerSeat : PUBLIC_PRICE_PER_SEAT;
  const baseTotal = seatsNum * activePricePerSeat;
  
  let gstAmount = 0;
  let finalTotal = baseTotal;
  
  if (couponState.applied && couponState.gstType === 'inclusive') {
    gstAmount = 0;
    finalTotal = baseTotal;
  } else {
    gstAmount = Math.round(baseTotal * GST_RATE);
    finalTotal = baseTotal + gstAmount;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.instituteName || !form.city || !form.contactName || !form.email || !form.phone || !form.seats) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (seatsNum < 1) {
      toast.error("Seats count must be at least 1.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/onboarding/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          seats: seatsNum,
          couponCode: couponState.applied ? form.couponCode.trim() : undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate payment");
      }

      // Check if Razorpay SDK is loaded
      if (typeof window.Razorpay === "undefined") {
        throw new Error("Payment gateway SDK failed to load. Please refresh and try again.");
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || "INR",
        name: "Quantech IMS",
        description: `Self-Onboarding: ${seatsNum} Student Seats`,
        order_id: data.orderId,
        prefill: {
          name: form.contactName,
          email: form.email,
          contact: form.phone
        },
        theme: { color: "#4F46E5" },
        handler: function (response) {
          setIsSuccess(true);
          setProvisionDetails({
            email: form.email,
            instituteName: form.instituteName,
            paymentId: response.razorpay_payment_id
          });
          toast.success("Payment successful! Your institute portal is being provisioned.");
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        toast.error(response.error.description || "Payment failed");
        setIsSubmitting(false);
      });
      rzp.open();

    } catch (err) {
      toast.error(err.message || "Something went wrong");
      setIsSubmitting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess && provisionDetails) {
    return (
      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl border border-emerald-100 text-center space-y-6 max-w-2xl mx-auto">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-widest font-extrabold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            Payment Verified & Account Provisioned
          </span>
          <h3 className="text-3xl font-black text-slate-900">Welcome to Quantech IMS!</h3>
          <p className="text-slate-600 max-w-md mx-auto text-sm leading-relaxed">
            Your payment for <strong>{provisionDetails.instituteName}</strong> has been received. We have emailed your login credentials and Institute Code to:
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 inline-block text-slate-900 font-bold font-mono text-base my-2">
            {provisionDetails.email}
          </div>
        </div>
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/login"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25"
          >
            Go to Portal Login <ArrowRight size={18} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div id="onboard-form" className="bg-white rounded-3xl p-6 md:p-10 shadow-2xl border border-slate-100 max-w-4xl mx-auto">
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
          <Sparkles size={14} /> Instant Self-Onboarding
        </div>
        <h3 className="text-3xl md:text-4xl font-black text-slate-900">Get Your School Started in 2 Minutes</h3>
        <p className="text-slate-500 text-sm max-w-lg mx-auto">
          Fill details, select your student capacity, and pay securely online to activate your portal instantly.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: School Info */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <Building2 size={14} /> 1. Institution Details
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Institute / School Name *</label>
              <input
                type="text"
                name="instituteName"
                value={form.instituteName}
                onChange={handleInputChange}
                required
                placeholder="e.g. St. Ann's High School"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">UDISE Code (Optional)</label>
              <input
                type="text"
                name="udiseCode"
                value={form.udiseCode}
                onChange={handleInputChange}
                placeholder="e.g. 27250100101"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City / District *</label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleInputChange}
                required
                placeholder="e.g. Malegaon"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">State *</label>
              <select
                name="state"
                value={form.state}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-900 bg-white"
              >
                {STATES_LIST.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Contact Info */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <ShieldCheck size={14} /> 2. Administrator Account
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person Name *</label>
              <input
                type="text"
                name="contactName"
                value={form.contactName}
                onChange={handleInputChange}
                required
                placeholder="e.g. Dr. Rajesh Sharma"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
              <input
                type="text"
                name="designation"
                value={form.designation}
                onChange={handleInputChange}
                placeholder="e.g. Principal / Director"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address (Login ID) *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleInputChange}
                required
                placeholder="principal@school.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (WhatsApp) *</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleInputChange}
                required
                placeholder="e.g. 9876543210"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Capacity & Pricing */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <Tag size={14} /> 3. Seat Capacity & Coupon
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Number of Student Seats *</label>
              <input
                type="number"
                name="seats"
                min="1"
                step="1"
                value={form.seats}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Have an MOU Coupon Code?</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="couponCode"
                  value={form.couponCode}
                  onChange={handleInputChange}
                  placeholder="e.g. SWAPN-MOU-2025"
                  className="uppercase w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-900"
                />
                <button
                  type="button"
                  onClick={validateCoupon}
                  disabled={couponState.isValidating || !form.couponCode.trim()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shrink-0"
                >
                  {couponState.isValidating ? <Loader2 className="animate-spin" size={14} /> : "Apply"}
                </button>
              </div>
              {couponState.applied && (
                <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                  ✓ MOU Coupon Applied (₹{couponState.discountedPricePerSeat}/seat {couponState.gstType === 'inclusive' ? 'GST incl.' : '+ GST'})
                </p>
              )}
              {couponState.error && (
                <p className="text-xs font-semibold text-rose-500 mt-1">{couponState.error}</p>
              )}
            </div>
          </div>
        </div>

        {/* Live Calculation Box */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-3">
          <div className="flex justify-between items-center text-sm text-slate-300">
            <span>{seatsNum} seats × ₹{activePricePerSeat}/seat</span>
            <span className="font-mono">₹{baseTotal.toLocaleString("en-IN")}</span>
          </div>

          <div className="flex justify-between items-center text-sm text-slate-300">
            <span>GST ({couponState.applied && couponState.gstType === 'inclusive' ? '0% / Inclusive' : '18% Exclusive'})</span>
            <span className="font-mono">₹{gstAmount.toLocaleString("en-IN")}</span>
          </div>

          <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-lg font-black text-white">
            <span>Total Amount Payable</span>
            <span className="text-indigo-400 font-mono text-2xl">₹{finalTotal.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-lg py-4 rounded-2xl shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={20} /> Processing Order...
            </>
          ) : (
            <>
              Proceed to Razorpay Checkout <ArrowRight size={20} />
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-400 font-medium">
          🔒 Secure 256-bit encrypted Razorpay payment. Account instantly activated.
        </p>
      </form>
    </div>
  );
}
