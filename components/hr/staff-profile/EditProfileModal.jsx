"use client";

import React from "react";
import { Loader2, Upload, Trash2, KeyRound, AlertCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export function EditProfileModal({
  isOpen,
  onClose,
  saving,
  profileForm,
  setProfileForm,
  onSubmit,
  staff,
  designations = [],
  departments = [],
  uploadingPhoto,
  modalFileInputRef,
  onPhotoUpload,
  onRemovePhoto,
}) {
  const fullName = `${staff?.profile?.firstName || ""} ${staff?.profile?.lastName || ""}`.trim() || "Staff Member";

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !saving && onClose()}
      title="Edit Staff Member Details"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Photo Upload in Edit Modal */}
        <div className="flex items-center gap-4 p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200/80 dark:border-gray-700/80">
          <input
            ref={modalFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onPhotoUpload}
            disabled={uploadingPhoto}
          />
          <div className="relative shrink-0">
            {staff?.profile?.avatar ? (
              <img
                src={staff.profile.avatar}
                alt={fullName}
                className="w-14 h-14 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-xs">
                {staff?.profile?.firstName?.[0]?.toUpperCase() || "S"}
              </div>
            )}
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center text-white">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-white">
              Staff Photo
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              JPG, PNG, or WebP (max 5MB). Shown on payslips and directory.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingPhoto}
              onClick={() => modalFileInputRef.current?.click()}
              className="text-xs flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              {staff?.profile?.avatar ? "Change Photo" : "Upload Photo"}
            </Button>
            {staff?.profile?.avatar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploadingPhoto}
                onClick={onRemovePhoto}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                title="Remove photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              First Name *
            </label>
            <Input
              value={profileForm.firstName || ""}
              onChange={(e) =>
                setProfileForm({ ...profileForm, firstName: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Last Name
            </label>
            <Input
              value={profileForm.lastName || ""}
              onChange={(e) =>
                setProfileForm({ ...profileForm, lastName: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Role / Category
            </label>
            <select
              value={profileForm.role}
              onChange={(e) =>
                setProfileForm({ ...profileForm, role: e.target.value })
              }
              className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="staff">Support Staff (Maid, Driver, Peon, Helper)</option>
              <option value="instructor">Teaching Faculty / Teacher</option>
              <option value="admin">Administrator / Office Staff</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Designation
            </label>
            <select
              value={profileForm.designation}
              onChange={(e) =>
                setProfileForm({ ...profileForm, designation: e.target.value })
              }
              className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="">Select Designation...</option>
              {designations.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Department / Shift Group
            </label>
            <select
              value={profileForm.department || ""}
              onChange={(e) =>
                setProfileForm({ ...profileForm, department: e.target.value })
              }
              className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="">Select Department...</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}{" "}
                  {d.shiftTimings?.useCustomShift
                    ? `(${d.shiftTimings.shiftStart} - ${d.shiftTimings.shiftEnd})`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Phone
            </label>
            <Input
              value={profileForm.phone || ""}
              onChange={(e) =>
                setProfileForm({ ...profileForm, phone: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Qualification
            </label>
            <Input
              value={profileForm.qualification || ""}
              onChange={(e) =>
                setProfileForm({
                  ...profileForm,
                  qualification: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Date of Joining
            </label>
            <Input
              type="date"
              value={profileForm.joiningDate || ""}
              onChange={(e) =>
                setProfileForm({
                  ...profileForm,
                  joiningDate: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Date of Birth
            </label>
            <Input
              type="date"
              value={profileForm.dob || ""}
              onChange={(e) =>
                setProfileForm({ ...profileForm, dob: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Gender
            </label>
            <select
              value={profileForm.gender || ""}
              onChange={(e) =>
                setProfileForm({ ...profileForm, gender: e.target.value })
              }
              className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Blood Group
            </label>
            <Input
              placeholder="e.g. O+, B+, A+"
              value={profileForm.bloodGroup || ""}
              onChange={(e) =>
                setProfileForm({ ...profileForm, bloodGroup: e.target.value })
              }
            />
          </div>
        </div>

        {/* Portal Login Credentials Section */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                Allow Portal Login
              </span>
              <p className="text-[11px] text-gray-400">
                Keep disabled for support staff who do not require login access.
              </p>
            </div>
            <input
              type="checkbox"
              checked={profileForm.allowLogin}
              onChange={(e) =>
                setProfileForm({
                  ...profileForm,
                  allowLogin: e.target.checked,
                })
              }
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 cursor-pointer"
            />
          </div>

          {profileForm.allowLogin && (
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              {profileForm.existingInternalEmail && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg p-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Currently has internal placeholder (
                    <code className="font-mono text-[11px]">
                      {profileForm.existingInternalEmail}
                    </code>
                    ). Please set a real email address and password so this staff member can log in at{" "}
                    <strong className="font-semibold">/login</strong>.
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Login Email <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="staff@example.com"
                    value={profileForm.email || ""}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, email: e.target.value })
                    }
                    required={profileForm.allowLogin}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Reset Password (Optional)
                  </label>
                  <Input
                    type="password"
                    placeholder="Leave blank to keep existing password"
                    value={profileForm.password || ""}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        password: e.target.value,
                      })
                    }
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Min 6 characters. Leave blank if unchanged.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Address Section */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
            Address
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input
                placeholder="Street Address"
                value={profileForm.street || ""}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, street: e.target.value })
                }
              />
            </div>
            <div>
              <Input
                placeholder="City"
                value={profileForm.city || ""}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, city: e.target.value })
                }
              />
            </div>
            <div>
              <Input
                placeholder="State"
                value={profileForm.state || ""}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, state: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        {/* Bank & Statutory Details Section */}
        <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-800">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
            Bank & Statutory Information
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                PAN Number
              </label>
              <Input
                value={profileForm.panNumber || ""}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    panNumber: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                UAN / EPF Number
              </label>
              <Input
                value={profileForm.uanNumber || ""}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    uanNumber: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                ESI Number
              </label>
              <Input
                value={profileForm.esiNumber || ""}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    esiNumber: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                Bank Name
              </label>
              <Input
                value={profileForm.bankName || ""}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, bankName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                Account Holder Name
              </label>
              <Input
                value={profileForm.accountName || ""}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    accountName: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                Account Number
              </label>
              <Input
                value={profileForm.accountNumber || ""}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    accountNumber: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                IFSC Code
              </label>
              <Input
                value={profileForm.ifscCode || ""}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    ifscCode: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#4F46E5] hover:bg-indigo-700 text-white flex items-center gap-2 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
