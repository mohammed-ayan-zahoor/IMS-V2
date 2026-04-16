"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { 
  Check, 
  AlertCircle, 
  Loader, 
  Trash2, 
  Eye,
  CheckCircle,
  Clock
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { motion } from "framer-motion";

const CompletionTrackingPage = () => {
  const { data: session } = useSession();
  const toast = useToast();

  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [bulkMarking, setBulkMarking] = useState(false);
  const [completionReason, setCompletionReason] = useState("");

  // Fetch active students
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

  // Bulk mark students as completed
  const handleBulkMarkCompleted = async () => {
    if (selectedStudents.size === 0) {
      toast.warning("Please select students to mark as completed");
      return;
    }

    if (!completionReason.trim()) {
      toast.warning("Please enter a completion reason");
      return;
    }

    try {
      setBulkMarking(true);
      const studentIds = Array.from(selectedStudents);

      const res = await fetch("/api/v1/students/bulk-mark-completed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds,
          reason: completionReason,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success(
          `Successfully marked ${result.successCount} student(s) as completed`
        );
        setSelectedStudents(new Set());
        setCompletionReason("");
        
        // Refresh students list
        setStudents((prev) =>
          prev.filter((s) => !selectedStudents.has(s._id))
        );
      } else {
        toast.error(result.error || "Failed to mark students as completed");
        if (result.errors && result.errors.length > 0) {
          console.error("Errors:", result.errors);
        }
      }
    } catch (error) {
      console.error("Error marking students completed:", error);
      toast.error("Error marking students as completed");
    } finally {
      setBulkMarking(false);
    }
  };

  // Mark individual student as completed
  const markStudentCompleted = async (studentId) => {
    try {
      const res = await fetch("/api/v1/students/bulk-mark-completed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: [studentId],
          reason: "Marked as completed via completion tracking",
        }),
      });

      if (res.ok) {
        toast.success("Student marked as completed");
        setStudents((prev) => prev.filter((s) => s._id !== studentId));
      } else {
        toast.error("Failed to mark student as completed");
      }
    } catch (error) {
      console.error("Error marking student completed:", error);
      toast.error("Error marking student as completed");
    }
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
                Completion Tracking
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage student completion status and mark students as completed
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
                { value: "ACTIVE", label: "Active Students" },
                { value: "COMPLETED", label: "Completed Students" },
                { value: "DROPPED", label: "Dropped Students" },
              ]}
            />
          </div>

          {/* Completion Reason Input */}
          {selectedStudents.size > 0 && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="section-label mb-2 block">
                Completion Reason
              </label>
              <Input
                placeholder="Enter reason for marking completion (e.g., 'Course completed', 'All assignments done')..."
                value={completionReason}
                onChange={(e) => setCompletionReason(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-slate-500 mt-2">
                {completionReason.length}/200 characters
              </p>
            </div>
          )}

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
                  onClick={() => {
                    setSelectedStudents(new Set());
                    setCompletionReason("");
                  }}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleBulkMarkCompleted}
                  disabled={bulkMarking || !completionReason.trim()}
                  icon={bulkMarking ? <Loader className="animate-spin" size={16} /> : <Check size={16} />}
                >
                  {bulkMarking ? "Processing..." : "Mark as Completed"}
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
                  <div className="col-span-3">Email</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-3">Actions</div>
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
                    <div className="col-span-3 flex items-center text-slate-600 text-sm">
                      {student.email}
                    </div>
                    <div className="col-span-2 flex items-center">
                      <Badge
                        variant={
                          student.status === "ACTIVE"
                            ? "success"
                            : student.status === "COMPLETED"
                            ? "info"
                            : "error"
                        }
                      >
                        {student.status}
                      </Badge>
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <button
                        onClick={() => markStudentCompleted(student._id)}
                        className="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Mark as completed"
                      >
                        <CheckCircle size={18} />
                      </button>
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
            <Clock className="text-blue-600 flex-shrink-0" size={20} />
            <div className="text-sm text-slate-700">
              <p className="font-medium mb-1">Completion Tracking Tips:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-600">
                <li>Select multiple students and mark them as completed together</li>
                <li>Or use the checkbox on each row to mark individual students</li>
                <li>Completion reason is required for bulk operations</li>
                <li>Completed students will be moved out of the active list</li>
              </ul>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default CompletionTrackingPage;
