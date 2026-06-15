import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Lock, Eye, EyeOff, Loader, MessageSquare, Save, Settings, PhoneCall, Key } from 'lucide-react';
import Card, { CardHeader } from '@/components/ui/Card';

export default function NotificationSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMsg91AuthKey, setShowMsg91AuthKey] = useState(false);
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [showMetaAccessToken, setShowMetaAccessToken] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('sms'); // 'sms' | 'whatsapp' | 'voice'

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
    whatsappProvider: 'mock',
    metaPhoneNumberId: '',
    metaAccessToken: '',
    // Voice (Platform Master Billed Model)
    voiceCallProvider: 'mock',
    overdueVoiceReminderEnabled: false,
    dedicatedCallerId: ''
  });

  // Fetch current settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/institute/notifications/settings', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

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
          whatsappProvider: notifications.whatsappProvider || 'mock',
          metaPhoneNumberId: notifications.metaPhoneNumberId || '',
          metaAccessToken: notifications.metaAccessToken || '',
          voiceCallProvider: notifications.voiceCallProvider || 'mock',
          overdueVoiceReminderEnabled: notifications.overdueVoiceReminderEnabled || false,
          dedicatedCallerId: notifications.dedicatedCallerId || ''
        });
      }
    } catch (error) {
      setErrorMessage('Failed to load notification configurations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
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
        // Refresh to fetch masked placeholders
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

  if (loading) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center min-h-[300px]">
        <Loader className="animate-spin text-premium-blue mr-2" />
        <span className="text-sm text-slate-500 font-bold">Loading configurations...</span>
      </div>
    );
  }

  return (
    <Card className="border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 bg-slate-50/50 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm shrink-0">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Notification Settings</h3>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">Configure custom SMS, WhatsApp gateway integrations and automated calls</p>
            </div>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex space-x-1 mt-6 border-b border-slate-200/60">
          <button
            type="button"
            onClick={() => setActiveSubTab('sms')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeSubTab === 'sms'
                ? 'border-premium-blue text-premium-blue'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            SMS Configuration
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('whatsapp')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeSubTab === 'whatsapp'
                ? 'border-premium-blue text-premium-blue'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            WhatsApp Credentials
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('voice')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeSubTab === 'voice'
                ? 'border-premium-blue text-premium-blue'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Voice Call Reminders
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-6">
        {/* SMS Sub Tab */}
        {activeSubTab === 'sms' && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">SMS Provider</label>
              <select
                name="smsProvider"
                value={formData.smsProvider}
                onChange={handleInputChange}
                className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
              >
                <option value="mock">Console Logger (Mock)</option>
                <option value="msg91">MSG91 Gateway</option>
                <option value="twilio">Twilio SMS</option>
              </select>
            </div>

            {formData.smsProvider === 'msg91' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    MSG91 Auth Key {formData.msg91AuthKey === 'msg91_••••••••••••' && <Lock size={12} className="text-slate-400" />}
                  </label>
                  <div className="relative">
                    <input
                      type={showMsg91AuthKey ? "text" : "password"}
                      name="msg91AuthKey"
                      value={formData.msg91AuthKey}
                      onChange={handleInputChange}
                      className="w-full pl-4 pr-10 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                      placeholder={formData.msg91AuthKey === 'msg91_••••••••••••' ? '••••••••••••' : 'Enter MSG91 Auth Key'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowMsg91AuthKey(!showMsg91AuthKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                    >
                      {showMsg91AuthKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">MSG91 Sender ID</label>
                  <input
                    type="text"
                    name="msg91SenderId"
                    value={formData.msg91SenderId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                    placeholder="e.g. QTECHP"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Flow Template ID (Optional)</label>
                  <input
                    type="text"
                    name="msg91TemplateId"
                    value={formData.msg91TemplateId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                    placeholder="MSG91 Flow ID"
                  />
                </div>
              </div>
            )}

            {formData.smsProvider === 'twilio' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Twilio Account SID</label>
                  <input
                    type="text"
                    name="twilioSid"
                    value={formData.twilioSid}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                    placeholder={formData.twilioSid === 'sid_••••••••••••' ? '••••••••••••' : 'Enter Twilio SID'}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    Twilio Auth Token {formData.twilioToken === 'twilio_••••••••••••' && <Lock size={12} className="text-slate-400" />}
                  </label>
                  <div className="relative">
                    <input
                      type={showTwilioToken ? "text" : "password"}
                      name="twilioToken"
                      value={formData.twilioToken}
                      onChange={handleInputChange}
                      className="w-full pl-4 pr-10 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                      placeholder={formData.twilioToken === 'twilio_••••••••••••' ? '••••••••••••' : 'Enter Twilio Auth Token'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowTwilioToken(!showTwilioToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                    >
                      {showTwilioToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Twilio Virtual Phone Number</label>
                  <input
                    type="text"
                    name="twilioNumber"
                    value={formData.twilioNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                    placeholder="e.g. +1877234567"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Sub Tab */}
        {activeSubTab === 'whatsapp' && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">WhatsApp Provider</label>
              <select
                name="whatsappProvider"
                value={formData.whatsappProvider}
                onChange={handleInputChange}
                className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
              >
                <option value="mock">Console Logger (Mock)</option>
                <option value="meta">Meta Cloud API (Official)</option>
                <option value="twilio">Twilio WhatsApp Sandbox/Number</option>
              </select>
            </div>

            {formData.whatsappProvider === 'meta' && (
              <div className="grid grid-cols-1 gap-6 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Meta Phone Number ID</label>
                  <input
                    type="text"
                    name="metaPhoneNumberId"
                    value={formData.metaPhoneNumberId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                    placeholder="e.g. 10672849382103"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    Meta Access Token {formData.metaAccessToken === 'meta_••••••••••••' && <Lock size={12} className="text-slate-400" />}
                  </label>
                  <div className="relative">
                    <input
                      type={showMetaAccessToken ? "text" : "password"}
                      name="metaAccessToken"
                      value={formData.metaAccessToken}
                      onChange={handleInputChange}
                      className="w-full pl-4 pr-10 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                      placeholder={formData.metaAccessToken === 'meta_••••••••••••' ? '••••••••••••' : 'Meta Permanent Access Token'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowMetaAccessToken(!showMetaAccessToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                    >
                      {showMetaAccessToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {formData.whatsappProvider === 'twilio' && (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs font-bold text-slate-500 leading-relaxed">
                <p>Twilio WhatsApp operates using the Twilio credentials configured in the **SMS Configuration** tab.</p>
                <p>Ensure Twilio SID, Auth Token, and Twilio Number are configured there. Your Twilio number will be automatically prefixed with <code className="bg-slate-200/60 px-1 py-0.5 rounded">whatsapp:</code> when messaging.</p>
              </div>
            )}
          </div>
        )}

        {/* Voice Reminders Sub Tab */}
        {activeSubTab === 'voice' && (
          <div className="space-y-6 animate-fade-in">
            {/* Premium Feature Alert */}
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
              <PhoneCall className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Premium Automated Call Reminders</h4>
                <p className="text-[11px] text-amber-600 font-bold mt-1 leading-relaxed">
                  Enabling automated voice reminders will upgrade your institute's platform subscription billing rate to **69 INR per student / year** instead of the standard 59 INR. All call expenses and verification overheads are managed by the platform.
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <div>
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Enable Voice Call Reminders</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Automatically trigger outbound call reminders to students on the day they cross overdue.</p>
              </div>
              <button
                type="button"
                onClick={() => handleInputChange({
                  target: {
                    name: 'overdueVoiceReminderEnabled',
                    type: 'checkbox',
                    checked: !formData.overdueVoiceReminderEnabled
                  }
                })}
                className={`relative w-12 h-6 rounded-full transition-all duration-200 shrink-0 outline-none focus:ring-2 focus:ring-premium-blue/20 ${formData.overdueVoiceReminderEnabled ? "bg-emerald-500" : "bg-slate-200"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${formData.overdueVoiceReminderEnabled ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>

            {formData.overdueVoiceReminderEnabled && (
              <div className="grid grid-cols-1 gap-6 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Dedicated Caller ID (Optional)</label>
                  <input
                    type="text"
                    name="dedicatedCallerId"
                    value={formData.dedicatedCallerId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                    placeholder="e.g. 08047284917"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    Enter your verified Exophone virtual number if you have rented a dedicated outbound line. Leave blank to use the shared platform Caller ID.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messaging blocks */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold animate-fade-in">
            <CheckCircle size={16} className="text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-start gap-2 text-xs font-bold animate-fade-in">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Panel */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-sm font-bold bg-premium-blue hover:bg-premium-blue-hover active:bg-premium-blue-active text-white rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader className="animate-spin text-white" size={16} />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Config
              </>
            )}
          </button>
        </div>
      </form>
    </Card>
  );
}
