import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, Lock, Eye, EyeOff, Loader, MessageSquare, Save, Zap } from 'lucide-react';
import Card, { CardHeader } from '@/components/ui/Card';

export default function PusherSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecretField, setShowSecretField] = useState(false);
  const [showBeamsSecretField, setShowBeamsSecretField] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [highlightToggle, setHighlightToggle] = useState(false);
  const toggleRef = useRef(null);

  const [formData, setFormData] = useState({
    enabled: false,
    appId: '',
    key: '',
    secret: '',
    cluster: 'mt1',
    beamsInstanceId: '',
    beamsSecretKey: ''
  });

  // Fetch current settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/admin/settings', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      const pusher = data.settings?.pusher;

      if (pusher && (pusher.appId || pusher.beamsInstanceId)) {
        setHasExistingConfig(true);
        setFormData({
          enabled: pusher.enabled ?? false,
          appId: pusher.appId || '',
          key: pusher.key || '',
          secret: pusher.secret || '', // Masked as •••••••• from backend
          cluster: pusher.cluster || 'mt1',
          beamsInstanceId: pusher.beamsInstanceId || '',
          beamsSecretKey: pusher.beamsSecretKey || '' // Masked as •••••••• from backend
        });
      }
    } catch (error) {
      setErrorMessage('Failed to load Pusher settings');
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

    // Show warning if user is trying to change existing config
    if (hasExistingConfig && (name === 'secret' || name === 'beamsSecretKey') && value !== '••••••••' && value !== '' && !showWarning) {
      setShowWarning(true);
    }

    setSuccessMessage('');
    setErrorMessage('');
  };

  const testConnection = async () => {
    if (!formData.appId || !formData.key || !formData.secret) {
      setErrorMessage('Please fill in all Channels fields (App ID, Key, Secret) before testing');
      return;
    }

    try {
      setTestingConnection(true);
      setErrorMessage('');
      setSuccessMessage('');

      const hasBeams = !!(formData.beamsInstanceId && formData.beamsSecretKey);

      const response = await fetch('/api/v1/admin/settings/pusher-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: formData.appId,
          key: formData.key,
          secret: formData.secret,
          cluster: formData.cluster,
          beamsInstanceId: formData.beamsInstanceId,
          beamsSecretKey: formData.beamsSecretKey,
          testBeams: hasBeams
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (hasBeams) {
          setSuccessMessage('✓ Both Channels and Beams connection tests successful!');
        } else {
          setSuccessMessage('✓ Pusher Channels connection test successful!');
        }
      } else {
        let errorMsg = 'Connection test failed.';
        if (data.errors) {
          errorMsg = Object.entries(data.errors)
            .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
            .join(' | ');
        } else if (data.error) {
          errorMsg = data.error;
        }
        setErrorMessage(`✗ ${errorMsg}`);
      }
    } catch (error) {
      setErrorMessage(`Connection test failed: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (formData.enabled && (!formData.appId || !formData.key || !formData.secret)) {
      setErrorMessage('Please configure all Channels parameters before enabling');
      return;
    }

    if (hasExistingConfig && showWarning) {
      if (!window.confirm(
        '⚠️ WARNING: You are changing your Pusher credentials.\n\n' +
        '• This will immediately affect real-time updates and notification routing.\n' +
        '• Make sure your new Pusher instance is fully active and matching clusters.\n\n' +
        'Continue with this change?'
      )) {
        return;
      }
    }

    try {
      setSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      const response = await fetch('/api/v1/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pusher: {
            enabled: formData.enabled,
            appId: formData.appId,
            key: formData.key,
            secret: formData.secret,
            cluster: formData.cluster,
            beamsInstanceId: formData.beamsInstanceId,
            beamsSecretKey: formData.beamsSecretKey
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage('✓ Pusher settings saved successfully.');
        setHasExistingConfig(true);
        setShowWarning(false);
        // Refresh settings so masked secrets are updated
        fetchSettings();
      } else {
        setErrorMessage(data.error || 'Failed to save settings');
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
        <span className="text-sm text-slate-500 font-bold">Loading configuration...</span>
      </div>
    );
  }

  return (
    <Card className="border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 bg-slate-50/50 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100 shadow-sm shrink-0">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">BYO Pusher API</h3>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">Use your custom WebSockets Channels & Native Beams Push Notifications</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Enable Custom Pusher</span>
            <button
              ref={toggleRef}
              type="button"
              onClick={() => handleInputChange({ target: { name: 'enabled', type: 'checkbox', checked: !formData.enabled } })}
              className={`relative w-12 h-6 rounded-full transition-all duration-200 shrink-0 outline-none focus:ring-2 focus:ring-premium-blue/20 ${formData.enabled ? "bg-emerald-500" : "bg-slate-200"} ${highlightToggle ? "ring-4 ring-amber-400 ring-offset-2 scale-110" : ""}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${formData.enabled ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-6">
        {formData.enabled && (
          <div className="p-4 bg-sky-50 border border-sky-100 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-sky-600 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-xs font-black text-sky-800 uppercase tracking-wider">WebSocket Isolation Mode</h4>
              <p className="text-[11px] text-sky-600 font-bold mt-1 leading-relaxed">
                When enabled, chat socket events and native mobile push alerts are delivered exclusively through your dedicated Pusher application and cluster.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Channels settings */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Pusher Channels Configuration</h4>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">App ID</label>
              <input
                required={formData.enabled}
                type="text"
                name="appId"
                value={formData.appId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                placeholder="e.g. 2125246"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Key</label>
              <input
                required={formData.enabled}
                type="text"
                name="key"
                value={formData.key}
                onChange={handleInputChange}
                className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                placeholder="e.g. 21d9b92e47a03ae75f9e"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                Secret {formData.secret === '••••••••' && <Lock size={12} className="text-slate-400" />}
              </label>
              <div className="relative">
                <input
                  required={formData.enabled && !hasExistingConfig}
                  type={showSecretField ? "text" : "password"}
                  name="secret"
                  value={formData.secret}
                  onChange={handleInputChange}
                  className="w-full pl-4 pr-10 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                  placeholder={formData.secret === '••••••••' ? '••••••••' : 'Your Pusher Secret'}
                />
                <button
                  type="button"
                  onClick={() => setShowSecretField(!showSecretField)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                >
                  {showSecretField ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Cluster</label>
              <input
                required={formData.enabled}
                type="text"
                name="cluster"
                value={formData.cluster}
                onChange={handleInputChange}
                className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                placeholder="e.g. mt1"
              />
            </div>
          </div>

          {/* Beams settings */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Pusher Beams Push Notifications (Optional)</h4>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Instance ID</label>
              <input
                type="text"
                name="beamsInstanceId"
                value={formData.beamsInstanceId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                placeholder="e.g. d872a582-842a-4b7e-a980-fd4261e9998a"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                Secret Key (Primary) {formData.beamsSecretKey === '••••••••' && <Lock size={12} className="text-slate-400" />}
              </label>
              <div className="relative">
                <input
                  type={showBeamsSecretField ? "text" : "password"}
                  name="beamsSecretKey"
                  value={formData.beamsSecretKey}
                  onChange={handleInputChange}
                  className="w-full pl-4 pr-10 py-2 text-sm rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                  placeholder={formData.beamsSecretKey === '••••••••' ? '••••••••' : 'Your Pusher Beams Secret Key'}
                />
                <button
                  type="button"
                  onClick={() => setShowBeamsSecretField(!showBeamsSecretField)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                >
                  {showBeamsSecretField ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Warning block for pending edits */}
        {showWarning && (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3 animate-fade-in">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Unsaved Secrets Changes</h4>
              <p className="text-[11px] text-amber-600 font-bold mt-1 leading-relaxed">
                You have modified sensitive keys. Ensure you test connections before saving to prevent chat connection dropouts.
              </p>
            </div>
          </div>
        )}

        {/* Messaging blocks */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold">
            <CheckCircle size={16} className="text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-start gap-2 text-xs font-bold">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Panel */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={testingConnection || saving}
            onClick={testConnection}
            className="px-5 py-2 text-sm font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {testingConnection ? (
              <>
                <Loader className="animate-spin text-slate-500" size={16} />
                Testing...
              </>
            ) : (
              <>
                <Zap size={16} />
                Test Connection
              </>
            )}
          </button>

          <div
            onClick={() => {
              if (!formData.enabled && !saving && !testingConnection) {
                toggleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightToggle(true);
                setTimeout(() => setHighlightToggle(false), 1600);
              }
            }}
            className="cursor-pointer"
          >
            <button
              type="submit"
              disabled={saving || testingConnection || !formData.enabled}
              className={`px-6 py-2 text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 ${
                !formData.enabled
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-premium-blue text-white hover:bg-premium-blue-hover active:bg-premium-blue-active'
              }`}
            >
              {saving ? (
                <>
                  <Loader className="animate-spin text-white" size={16} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save API Config
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </Card>
  );
}
