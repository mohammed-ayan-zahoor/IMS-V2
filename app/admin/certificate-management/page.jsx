"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { 
  Award, 
  AlertCircle, 
  Loader, 
  Download, 
  Eye,
  RefreshCw,
  Calendar
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { motion } from "framer-motion";

const CertificateManagementPage = () => {
  const { data: session } = useSession();
  const toast = useToast();

  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("COMPLETED");
  const [bulkGenerating, setBulkGenerating] = useState(false);

  // Fetch completed students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/v1/students?status=${statusFilter}&role=student`,
          { headers: { Accept: "application/json" } }
        );
        if (res.ok) {
          const data = await res.json();
          setStudents(data.students || []);
        } else {
          toast.error("Failed to load students");
        }
      } catch (error) {
        console.error("Error fetching students:", error);
        toast.error("Error loading students");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [statusFilter, toast]);

  // Filter students based on search term
  useEffect(() => {
    const filtered = students.filter((student) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        student.name?.toLowerCase().includes(searchLower) ||
        student.email?.toLowerCase().includes(searchLower) ||
        student._id?.includes(searchTerm)
      );
    });
    setFilteredStudents(filtered);
  }, [searchTerm, students]);

  // Toggle student selection
  const toggleStudentSelection = useCallback((studentId) => {
    setSelectedStudents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  }, []);

  // Select/deselect all visible students
  const toggleSelectAll = useCallback(() => {
    if (selectedStudents.size === filteredStudents.length && selectedStudents.size > 0) {
      setSelectedStudents(new Set());
    } else {
      const allIds = new Set(filteredStudents.map((s) => s._id));
      setSelectedStudents(allIds);
    }
  }, [filteredStudents, selectedStudents]);

  // Bulk generate certificates
  const handleBulkGenerateCertificates = async () => {
    if (selectedStudents.size === 0) {
      toast.warning("Please select students to generate certificates for");
      return;
    }

    try {
      setBulkGenerating(true);
      const studentIds = Array.from(selectedStudents);

      const res = await fetch("/api/v1/students/bulk-generate-certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success(
          `Successfully generated ${result.successCount} certificate(s)`
        );
        setSelectedStudents(new Set());
        
        // Refresh students list
        setStudents((prev) =>
          prev.map((s) =>
            selectedStudents.has(s._id) ? { ...s, certificateId: true } : s
          )
        );
      } else {
        toast.error(result.error || "Failed to generate certificates");
        if (result.errors && result.errors.length > 0) {
          console.error("Errors:", result.errors);
        }
      }
    } catch (error) {
      console.error("Error generating certificates:", error);
      toast.error("Error generating certificates");
    } finally {
      setBulkGenerating(false);
    }
  };

  // Generate certificate for individual student
  const generateCertificateForStudent = async (studentId) => {
    try {
      const res = await fetch("/api/v1/students/bulk-generate-certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: [studentId] }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success("Certificate generated successfully");
        setStudents((prev) =>
          prev.map((s) =>
            s._id === studentId ? { ...s, certificateId: true } : s
          )
        );
      } else {
        toast.error("Failed to generate certificate");
      }
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast.error("Error generating certificate");
    }
  };

  // Download certificate for student
  const downloadCertificate = async (studentId) => {
    try {
      const res = await fetch(`/api/v1/students/certificates/${studentId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `certificate-${studentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Certificate downloaded");
      } else {
        toast.error("Failed to download certificate");
      }
    } catch (error) {
      console.error("Error downloading certificate:", error);
      toast.error("Error downloading certificate");
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="premium-card-hover">
          <CardHeader className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Certificate Management
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Generate and manage student certificates
              </p>
            </div>
            {selectedStudents.size > 0 && (
              <Badge variant="info">{selectedStudents.size} selected</Badge>
            )}
          </CardHeader>
        </Card>
      </motion.div>

      {/* Filters and Actions */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card padding="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={true}
            />
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={[
                { value: "COMPLETED", label: "Completed Students" },
                { value: "ACTIVE", label: "Active Students" },
                { value: "DROPPED", label: "Dropped Students" },
              ]}
            />
          </div>

          {/* Bulk Actions */}
          {selectedStudents.size > 0 && (
            <div className="flex gap-3 justify-between items-center">
              <div className="text-sm text-slate-600">
                <span className="font-semibold">{selectedStudents.size}</span>{" "}
                student(s) selected
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedStudents(new Set())}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleBulkGenerateCertificates}
                  disabled={bulkGenerating}
                  icon={bulkGenerating ? <Loader className="animate-spin" size={16} /> : <Award size={16} />}
                >
                  {bulkGenerating ? "Generating..." : "Generate Certificates"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Students Table */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card padding="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="animate-spin text-slate-400" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <AlertCircle className="mx-auto mb-3 text-slate-300" size={32} />
                <p className="text-slate-500">No students found</p>
              </div>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="border-b border-slate-200">
                <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 font-semibold text-sm text-slate-600">
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedStudents.size === filteredStudents.length &&
                        filteredStudents.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300"
                    />
                  </div>
                  <div className="col-span-3">Name</div>
                  <div className="col-span-2">Email</div>
                  <div className="col-span-2">Completed</div>
                  <div className="col-span-2">Certificate</div>
                  <div className="col-span-2">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-slate-200">
                {filteredStudents.map((student) => (
                  <div
                    key={student._id}
                    className={`grid grid-cols-12 gap-4 p-4 hover:bg-slate-50 transition-colors ${
                      selectedStudents.has(student._id)
                        ? "bg-blue-50"
                        : ""
                    }`}
                  >
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student._id)}
                        onChange={() => toggleStudentSelection(student._id)}
                        className="rounded border-slate-300"
                      />
                    </div>
                    <div className="col-span-3 flex items-center">
                      <span className="font-medium text-slate-900">
                        {student.name}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center text-slate-600 text-sm">
                      {student.email}
                    </div>
                    <div className="col-span-2 flex items-center">
                      {student.completedAt ? (
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Calendar size={14} />
                          {formatDate(student.completedAt)}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Not completed</span>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center">
                      {student.certificateId ? (
                        <Badge variant="success">Generated</Badge>
                      ) : (
                        <Badge variant="warning">Not Generated</Badge>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      {student.certificateId ? (
                        <button
                          onClick={() => downloadCertificate(student._id)}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Download certificate"
                        >
                          <Download size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => generateCertificateForStudent(student._id)}
                          className="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Generate certificate"
                        >
                          <RefreshCw size={18} />
                        </button>
                      )}
                      <a
                        href={`/admin/students/${student._id}`}
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View details"
                      >
                        <Eye size={18} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </motion.div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card padding="p-4" className="bg-blue-50 border border-blue-200">
          <div className="flex gap-3">
            <Award className="text-blue-600 flex-shrink-0" size={20} />
            <div className="text-sm text-slate-700">
              <p className="font-medium mb-1">Certificate Management Tips:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-600">
                <li>Select multiple completed students and generate certificates in bulk</li>
                <li>Click the refresh icon to generate a certificate for a student</li>
                <li>Click the download icon to download an already generated certificate</li>
                <li>Only completed students can have certificates generated</li>
              </ul>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default CertificateManagementPage;
