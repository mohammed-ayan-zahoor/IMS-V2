"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  MessageSquare, 
  Save, 
  PhoneCall, 
  Send, 
  QrCode, 
  RefreshCw, 
  Power, 
  Globe, 
  Smartphone,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

export default function NotificationSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Visibility toggles for secrets
  const [showMsg91AuthKey, setShowMsg91AuthKey] = useState(false);
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [showMetaAccessToken, setShowMetaAccessToken] = useState(false);

  // Section collapse states
  const [metaExpanded, setMetaExpanded] = useState(false);
  const [smsExpanded, setSmsExpanded] = useState(false);
  const [twilioExpanded, setTwilioExpanded] = useState(false);

  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Test WhatsApp State
  const [waTestPhone, setWaTestPhone] = useState('');
  const [waTestStatus, setWaTestStatus] = useState(null); // null | 'sending' | 'ok' | 'err'
  const [waTestMsg, setWaTestMsg] = useState('');

  // WhatsApp Web QR Modal & Live Connection State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrError, setQrError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    phone: null,
    status: 'UNKNOWN'
  });
  const [disconnecting, setDisconnecting] = useState(false);

  const qrPollRef = useRef(null);

  const [formData, setFormData] = useState({
    // SMS
    smsProvider: 'mock',
    msg91AuthKey: '',
    msg91SenderId: '',
    msg91TemplateId: '',
    twilioSid: '',
    twilioToken: '',
    twilioNumber: '',
    // WhatsApp
    whatsappProvider: 'openwa',
    metaPhoneNumberId: '',
    metaAccessToken: '',
    openwaServerUrl: '',
    openwaApiKey: '',
    openwaSessionId: '',
    // Voice
    voiceCallProvider: 'mock',
    overdueVoiceReminderEnabled: false,
    dedicatedCallerId: ''
  });

  useEffect(() => {
    fetchSettings();
    checkOpenWaStatus();
    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current);
    };
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/institute/notifications/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      const notifications = data.notifications;

      if (notifications) {
        setFormData({
          smsProvider: notifications.smsProvider || 'mock',
          msg91AuthKey: notifications.msg91AuthKey || '',
          msg91SenderId: notifications.msg91SenderId || '',
          msg91TemplateId: notifications.msg91TemplateId || '',
          twilioSid: notifications.twilioSid || '',
          twilioToken: notifications.twilioToken || '',
          twilioNumber: notifications.twilioNumber || '',
          whatsappProvider: notifications.whatsappProvider || 'openwa',
          metaPhoneNumberId: notifications.metaPhoneNumberId || '',
          metaAccessToken: notifications.metaAccessToken || '',
          openwaServerUrl: notifications.openwaServerUrl || '',
          openwaApiKey: notifications.openwaApiKey || '',
          openwaSessionId: notifications.openwaSessionId || '',
          voiceCallProvider: notifications.voiceCallProvider || 'mock',
          overdueVoiceReminderEnabled: notifications.overdueVoiceReminderEnabled || false,
          dedicatedCallerId: notifications.dedicatedCallerId || ''
        });

        // Expand sections if they already have credentials configured
        if (notifications.metaPhoneNumberId || notifications.metaAccessToken) {
          setMetaExpanded(true);
        }
        if (notifications.msg91AuthKey || notifications.msg91SenderId) {
          setSmsExpanded(true);
        }
        if (notifications.twilioSid || notifications.twilioToken) {
          setTwilioExpanded(true);
        }
      }
    } catch (error) {
      setErrorMessage('Failed to load notification configurations');
    } finally {
      setLoading(false);
    }
  };

  const checkOpenWaStatus = async () => {
    try {
      const res = await fetch('/api/v1/institute/notifications/openwa-qr');
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus({
          connected: !!data.connected,
          phone: data.phone || null,
          status: data.status || (data.connected ? 'CONNECTED' : 'DISCONNECTED')
        });
      }
    } catch {
      // Ignore background status errors
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      const response = await fetch('/api/v1/institute/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMessage('✓ Configurations saved and encrypted successfully.');
        fetchSettings();
      } else {
        setErrorMessage(data.error || 'Failed to save settings.');
      }
    } catch (error) {
      setErrorMessage(`Save failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleWaTest = async () => {
    if (!waTestPhone.trim()) return;
    setWaTestStatus('sending');
    setWaTestMsg('');
    try {
      const res = await fetch('/api/v1/institute/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'whatsapp',
          to: waTestPhone.trim(),
          message: 'This is a test WhatsApp message from your IMS platform. Configuration is working correctly! ✓'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWaTestStatus('ok');
        setWaTestMsg(`Sent via ${data.testResult?.provider || 'provider'}`);
      } else {
        setWaTestStatus('err');
        setWaTestMsg(data.error || 'Test failed');
      }
    } catch (e) {
      setWaTestStatus('err');
      setWaTestMsg(e.message);
    }
  };

  // Open QR modal & poll
  const handleOpenQrModal = async () => {
    setQrModalOpen(true);
    setQrLoading(true);
    setQrError('');
    setQrData(null);
    fetchLiveQr();

    if (qrPollRef.current) clearInterval(qrPollRef.current);
    qrPollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/v1/institute/notifications/openwa-qr');
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setConnectionStatus({
              connected: true,
              phone: data.phone || null,
              status: 'CONNECTED'
            });
            clearInterval(qrPollRef.current);
            setTimeout(() => {
              setQrModalOpen(false);
            }, 1200);
          } else if (data.qr) {
            setQrData(data.qr);
          }
        }
      } catch {
        // Continue polling
      }
    }, 3000);
  };

  const fetchLiveQr = async () => {
    try {
      setQrLoading(true);
      setQrError('');
      const res = await fetch('/api/v1/institute/notifications/openwa-qr');
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch QR');

      if (data.connected) {
        setConnectionStatus({
          connected: true,
          phone: data.phone,
          status: 'CONNECTED'
        });
        setQrModalOpen(false);
      } else if (data.qr) {
        setQrData(data.qr);
      } else {
        setQrError('Waiting for QR code generation from OpenWA engine... Please retry in a few seconds.');
      }
    } catch (err) {
      setQrError(err.message || 'Unable to connect to OpenWA server. Please ensure the server is active.');
    } finally {
      setQrLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to unlink this WhatsApp number from your institute?')) return;
    try {
      setDisconnecting(true);
      const res = await fetch('/api/v1/institute/notifications/openwa-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
      if (res.ok) {
        setConnectionStatus({ connected: false, phone: null, status: 'DISCONNECTED' });
      }
    } catch {
      // Disconnect error
    } finally {
      setDisconnecting(false);
    }
  };

  const handleCloseQrModal = () => {
    setQrModalOpen(false);
    if (qrPollRef.current) clearInterval(qrPollRef.current);
    checkOpenWaStatus();
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-[#444CE7] mb-3" size={28} />
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loading notification configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Notifications Alert / Banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-xs font-bold animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-xs font-bold animate-in fade-in">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* CHANNEL 1: WhatsApp Web (Instant QR Link) */}
      <div className="bg-white border-2 border-emerald-500/20 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
        <div className="p-6 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <MessageSquare size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900">WhatsApp Web (Instant QR Link)</h3>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Zero-template restrictions. Send automated fee receipts, MOU receipts, and announcements directly from your institute's phone number.
              </p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="shrink-0 flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border ${
              connectionStatus.connected 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${connectionStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {connectionStatus.connected 
                ? `Connected ${connectionStatus.phone ? `(${connectionStatus.phone})` : ''}` 
                : 'Not Linked'
              }
            </div>
          </div>
        </div>

        {/* WhatsApp Actions & Controls */}
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-600 font-medium leading-relaxed max-w-lg">
              {connectionStatus.connected ? (
                <span>
                  🟢 <strong>Active:</strong> Your WhatsApp account is linked and ready. Outgoing messages will be sent directly through this phone.
                </span>
              ) : (
                <span>
                  Link your institute's WhatsApp phone in 10 seconds. Click below to generate your QR code, then scan it with WhatsApp.
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {connectionStatus.connected ? (
                <Button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {disconnecting ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                  Disconnect Device
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleOpenQrModal}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-2.5 text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <QrCode size={16} />
                  Scan QR Code & Link WhatsApp
                </Button>
              )}
            </div>
          </div>

          {/* Test WhatsApp Field */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700">Test Live Delivery:</span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="tel"
                value={waTestPhone}
                onChange={e => { setWaTestPhone(e.target.value); setWaTestStatus(null); }}
                placeholder="+919876543210"
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none font-medium w-48"
              />
              <button
                type="button"
                onClick={handleWaTest}
                disabled={!waTestPhone.trim() || waTestStatus === 'sending'}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {waTestStatus === 'sending' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Send Test
              </button>
            </div>
          </div>
          {waTestStatus === 'ok' && (
            <p className="text-[11px] text-emerald-700 font-bold">✓ {waTestMsg}</p>
          )}
          {waTestStatus === 'err' && (
            <p className="text-[11px] text-rose-600 font-bold">✗ {waTestMsg}</p>
          )}
        </div>
      </div>

      {/* CHANNEL 2: Meta WhatsApp Cloud API (Official) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setMetaExpanded(!metaExpanded)}
          className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Globe size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">Meta WhatsApp Cloud API (Official BSP)</h3>
                {(formData.metaPhoneNumberId || formData.metaAccessToken) && (
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-800 rounded-full">Configured</span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Official Cloud API credentials for verified Meta Business Manager accounts.
              </p>
            </div>
          </div>
          <div className="text-slate-400">
            {metaExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {metaExpanded && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/40 space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Meta Phone Number ID</label>
                <input
                  type="text"
                  name="metaPhoneNumberId"
                  value={formData.metaPhoneNumberId}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 outline-none font-medium bg-white"
                  placeholder="e.g. 10672849382103"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  Meta Permanent Access Token {formData.metaAccessToken === 'meta_••••••••••••' && <Lock size={12} className="text-slate-400" />}
                </label>
                <div className="relative">
                  <input
                    type={showMetaAccessToken ? "text" : "password"}
                    name="metaAccessToken"
                    value={formData.metaAccessToken}
                    onChange={handleInputChange}
                    className="w-full pl-3.5 pr-9 py-2 text-xs rounded-lg border border-slate-200 focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 outline-none font-medium bg-white"
                    placeholder={formData.metaAccessToken === 'meta_••••••••••••' ? '••••••••••••' : 'EAAG...'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowMetaAccessToken(!showMetaAccessToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                  >
                    {showMetaAccessToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Note: Meta requires pre-approved template IDs for outbound business broadcasts.
            </p>
          </div>
        )}
      </div>

      {/* CHANNEL 3: SMS Gateways (MSG91 & Twilio) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setSmsExpanded(!smsExpanded)}
          className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <Smartphone size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">SMS Gateway Configuration (MSG91 / Twilio)</h3>
                {(formData.msg91AuthKey || formData.twilioSid) && (
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-indigo-100 text-indigo-800 rounded-full">Configured</span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Send transactional SMS, student OTPs, and attendance alerts directly to mobile numbers.
              </p>
            </div>
          </div>
          <div className="text-slate-400">
            {smsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {smsExpanded && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/40 space-y-6 animate-in fade-in duration-150">
            {/* MSG91 Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>MSG91 Provider</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    Auth Key {formData.msg91AuthKey === 'msg91_••••••••••••' && <Lock size={12} className="text-slate-400" />}
                  </label>
                  <div className="relative">
                    <input
                      type={showMsg91AuthKey ? "text" : "password"}
                      name="msg91AuthKey"
                      value={formData.msg91AuthKey}
                      onChange={handleInputChange}
                      className="w-full pl-3.5 pr-9 py-2 text-xs rounded-lg border border-slate-200 focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 outline-none font-medium bg-white"
                      placeholder={formData.msg91AuthKey === 'msg91_••••••••••••' ? '••••••••••••' : 'Enter MSG91 Auth Key'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowMsg91AuthKey(!showMsg91AuthKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                    >
                      {showMsg91AuthKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Sender ID (6 Chars)</label>
                  <input
                    type="text"
                    name="msg91SenderId"
                    value={formData.msg91SenderId}
                    onChange={handleInputChange}
                    maxLength={6}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 outline-none font-medium bg-white uppercase"
                    placeholder="e.g. QTECHP"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Flow Template ID (Optional)</label>
                  <input
                    type="text"
                    name="msg91TemplateId"
                    value={formData.msg91TemplateId}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 outline-none font-medium bg-white"
                    placeholder="e.g. 642e128919..."
                  />
                </div>
              </div>
            </div>

            {/* Twilio Section */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>Twilio SMS & Virtual Number</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Twilio Account SID</label>
                  <input
                    type="text"
                    name="twilioSid"
                    value={formData.twilioSid}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 outline-none font-medium bg-white"
                    placeholder="AC..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    Twilio Auth Token {formData.twilioToken === 'twilio_••••••••••••' && <Lock size={12} className="text-slate-400" />}
                  </label>
                  <div className="relative">
                    <input
                      type={showTwilioToken ? "text" : "password"}
                      name="twilioToken"
                      value={formData.twilioToken}
                      onChange={handleInputChange}
                      className="w-full pl-3.5 pr-9 py-2 text-xs rounded-lg border border-slate-200 focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 outline-none font-medium bg-white"
                      placeholder={formData.twilioToken === 'twilio_••••••••••••' ? '••••••••••••' : 'Auth Token'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowTwilioToken(!showTwilioToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                    >
                      {showTwilioToken ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Twilio Phone Number</label>
                  <input
                    type="text"
                    name="twilioNumber"
                    value={formData.twilioNumber}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 outline-none font-medium bg-white"
                    placeholder="+1877234567"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CHANNEL 4: Automated Voice Call Reminders (Coming Soon) */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 opacity-75 relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
              <PhoneCall size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-black text-slate-800">Automated Voice Call Reminders</h3>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 rounded-full border border-purple-200 flex items-center gap-1">
                  <Sparkles size={11} /> Coming Soon
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                AI-powered outbound voice call reminders to parents on the exact day fees cross overdue status.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Save Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#444CE7] hover:bg-[#3538CD] text-white font-bold rounded-xl px-7 py-2.5 text-xs shadow-sm flex items-center gap-2 cursor-pointer transition-all"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Notification Settings
        </Button>
      </div>

      {/* QR Code Connection Modal */}
      <Modal
        isOpen={qrModalOpen}
        onClose={handleCloseQrModal}
        title="Connect WhatsApp Web"
      >
        <div className="p-6 space-y-6 text-center">
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">Scan to Link Institute WhatsApp</h3>
            <p className="text-xs text-slate-500">
              Open WhatsApp on your phone → Settings / 3-dots → <strong>Linked Devices</strong> → <strong>Link a Device</strong>
            </p>
          </div>

          {/* QR Display Area */}
          <div className="w-64 h-64 mx-auto bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-inner">
            {qrLoading ? (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Loader2 size={32} className="animate-spin text-emerald-600" />
                <span className="text-[11px] font-bold">Connecting to WhatsApp...</span>
              </div>
            ) : qrError ? (
              <div className="p-4 text-xs font-bold text-rose-600">
                {qrError}
              </div>
            ) : qrData ? (
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <img
                  src={qrData.startsWith('data:') ? qrData : `data:image/png;base64,${qrData}`}
                  alt="WhatsApp QR Code"
                  className="w-56 h-56 object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Loader2 size={32} className="animate-spin text-emerald-600" />
                <span className="text-[11px] font-bold">Generating QR Code...</span>
              </div>
            )}
          </div>

          {/* Live Status indicator */}
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Waiting for scan... (Auto-refreshes every 3 seconds)
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={fetchLiveQr}
              disabled={qrLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={qrLoading ? "animate-spin" : ""} />
              Refresh QR Code
            </button>
            <button
              type="button"
              onClick={handleCloseQrModal}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
