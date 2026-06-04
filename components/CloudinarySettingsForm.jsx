import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Lock, Eye, EyeOff, Loader, Cloud, Save, Zap } from 'lucide-react';
import Card, { CardHeader } from '@/components/ui/Card';

/**
 * CloudinarySettingsForm Component
 * 
 * Allows admins to set/update Cloudinary credentials with proper warnings
 * when updating existing credentials
 */
export default function CloudinarySettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecretField, setShowSecretField] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);

  const [formData, setFormData] = useState({
    enabled: false,
    cloudName: '',
    apiKey: '',
    apiSecret: '',
    showSecret: false
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
      const cloudinary = data.settings?.cloudinary;

      if (cloudinary && cloudinary.cloudName) {
        setHasExistingConfig(true);
        setFormData({
          enabled: cloudinary.enabled ?? false,
          cloudName: cloudinary.cloudName || '',
          apiKey: cloudinary.apiKey || '',
          apiSecret: '',  // Never show actual secret
          showSecret: false
        });
      }
    } catch (error) {
      setErrorMessage('Failed to load Cloudinary settings');
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
    if (hasExistingConfig && (name === 'apiSecret' || name === 'apiKey') && value && !showWarning) {
      setShowWarning(true);
    }

    // Clear messages when user starts editing
    setSuccessMessage('');
    setErrorMessage('');
  };

  const testConnection = async () => {
    if (!formData.cloudName || !formData.apiKey || !formData.apiSecret) {
      setErrorMessage('Please fill in all fields before testing');
      return;
    }

    try {
      setTestingConnection(true);
      setErrorMessage('');

      const response = await fetch('/api/v1/admin/settings/cloudinary-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudName: formData.cloudName,
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage('✓ Connection successful! Your Cloudinary credentials are valid.');
      } else {
        setErrorMessage(`✗ Connection failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setErrorMessage(`Connection test failed: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // If changing existing config, require confirmation
    if (hasExistingConfig && showWarning) {
      if (!window.confirm(
        '⚠️ WARNING: You are changing your Cloudinary credentials.\n\n' +
        '• Existing files will remain accessible from your old account\n' +
        '• New uploads will use the new credentials\n' +
        '• API secret will be encrypted and stored securely\n\n' +
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
          cloudinary: {
            enabled: formData.enabled,
            cloudName: formData.cloudName,
            apiKey: formData.apiKey,
            apiSecret: formData.apiSecret || '••••••••'  // If masked, server keeps existing
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage('✓ Cloudinary settings saved successfully!');
        setShowWarning(false);
        setFormData(prev => ({ ...prev, apiSecret: '' }));
        setHasExistingConfig(true);
        
        // Refresh settings
        setTimeout(() => fetchSettings(), 1500);
      } else {
        setErrorMessage(`Failed to save: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setErrorMessage(`Error saving settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <Card>
      {/* Header */}
      <CardHeader 
        title="Cloudinary Settings" 
        subtitle="Configure your own Cloudinary account for secure, dedicated file storage" 
      />

      {/* Existing Config Warning */}
      {hasExistingConfig && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Custom credentials configured</p>
              <p className="text-sm text-blue-700 mt-1">
                You have already set up Cloudinary credentials. Your API secret is encrypted and stored securely.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Change Warning */}
      {showWarning && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg animate-pulse">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">⚠️ You are changing your credentials</p>
              <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                <li>Existing files remain accessible from your old Cloudinary account</li>
                <li>All new uploads will use the new credentials</li>
                <li>Your API secret will be encrypted with AES-256 encryption</li>
                <li>The secret is masked in all API responses for security</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Enable Toggle */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="enabled"
            name="enabled"
            checked={formData.enabled}
            onChange={handleInputChange}
            className="w-5 h-5 text-blue-600 rounded cursor-pointer"
          />
          <label htmlFor="enabled" className="flex-1 cursor-pointer">
            <p className="font-semibold text-gray-900">Enable Custom Cloudinary</p>
            <p className="text-sm text-gray-600">
              {formData.enabled
                ? 'Your uploads will use your own Cloudinary account'
                : 'Uploads will use platform defaults (not enabled)'}
            </p>
          </label>
        </div>

        {formData.enabled && (
          <>
            {/* Cloud Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Cloud Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="cloudName"
                value={formData.cloudName}
                onChange={handleInputChange}
                placeholder="e.g., demo-cloud"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={formData.enabled}
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in the blue badge at the top of your Cloudinary dashboard → API Keys page
              </p>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                API Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="apiKey"
                value={formData.apiKey}
                onChange={handleInputChange}
                placeholder="e.g., 123456789"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={formData.enabled}
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in your Cloudinary dashboard → Settings → API Keys
              </p>
            </div>

            {/* API Secret */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                API Secret <span className="text-red-500">*</span>
                <span className="ml-2 inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-1 rounded">
                  <Lock className="w-3 h-3" /> Encrypted
                </span>
              </label>
              <div className="relative">
                <input
                  type={showSecretField ? 'text' : 'password'}
                  name="apiSecret"
                  value={formData.apiSecret}
                  onChange={handleInputChange}
                  placeholder="••••••••••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  required={formData.enabled && !hasExistingConfig}
                />
                <button
                  type="button"
                  onClick={() => setShowSecretField(!showSecretField)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900"
                >
                  {showSecretField ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {hasExistingConfig && !formData.apiSecret
                  ? 'Leave blank to keep existing secret'
                  : 'Found in your Cloudinary dashboard → Settings → API Keys'}
              </p>
              <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Stored encrypted with AES-256. Never exposed in API responses.
              </p>
            </div>

            {/* Test Connection Button */}
            <button
              type="button"
              onClick={testConnection}
              disabled={testingConnection || !formData.cloudName || !formData.apiKey || !formData.apiSecret}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-900 font-semibold rounded-lg transition flex items-center justify-center gap-2"
            >
              {testingConnection ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Test Cloudinary Connection
                </>
              )}
            </button>
          </>
        )}

        {/* Form Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              fetchSettings();
              setShowWarning(false);
              setSuccessMessage('');
              setErrorMessage('');
            }}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Info Section */}
      <div className="mt-8 pt-6 border-t space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Cloud className="w-4 h-4" />
          How it works:
        </h3>
        <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
          <li>
            <strong>Enable custom Cloudinary:</strong> Check the toggle to use your own Cloudinary account
          </li>
          <li>
            <strong>Enter your credentials:</strong> Get them from your Cloudinary dashboard
          </li>
          <li>
            <strong>Test connection:</strong> Click the test button to verify credentials are valid
          </li>
          <li>
            <strong>Save:</strong> Your API secret is encrypted and stored securely
          </li>
          <li>
            <strong>Files organization:</strong> New uploads go to <code className="bg-gray-100 px-2 py-1 rounded">institutes/your-id/documents/</code>
          </li>
          <li>
            <strong>Existing files:</strong> Continue working from your previous account
          </li>
        </ul>
      </div>

      {/* Security Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Security Features
        </h4>
        <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
          <li>API secrets encrypted with AES-256-CBC</li>
          <li>Random IV generated for each encryption</li>
          <li>Secrets masked as "••••••••" in all API responses</li>
          <li>Rate limited to 5 connection tests per minute</li>
          <li>Only super_admin and admin can modify settings</li>
        </ul>
      </div>
    </Card>
  );
}
