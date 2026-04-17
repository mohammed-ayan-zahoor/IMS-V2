"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { 
  Check, 
  AlertCircle, 
  Loader, 
  Eye,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { motion } from "framer-motion";

const CompletionTrackingPage = () => {
  const { data: session } = useSession();
  const toast = useToast();

  // State Management
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [bulkMarking, setBulkMarking] = useState(false);
  const [completionReason, setCompletionReason] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");

  // Pagination State
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 1
  });

  // Filter Data State
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // Debounce & Abort Controller
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Fetch courses and batches on mount
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        setCourseLoading(true);
        setBatchLoading(true);
        
        const [coursesRes, batchesRes] = await Promise.all([
          fetch("/api/v1/courses", { headers: { Accept: "application/json" } }),
          fetch("/api/v1/batches", { headers: { Accept: "application/json" } })
        ]);

        if (coursesRes.ok) {
          const data = await coursesRes.json();
          setCourses(data.courses || []);
        }

        if (batchesRes.ok) {
          const data = await batchesRes.json();
          setBatches(data.batches || []);
        }
      } catch (error) {
        console.error("Error fetching filter data:", error);
      } finally {
        setCourseLoading(false);
        setBatchLoading(false);
      }
    };

    fetchFilterData();
  }, []);

  // Main fetch students function
  const fetchStudents = useCallback(async (pageNum = 1) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: pagination.limit.toString(),
        status: statusFilter,
        search: searchTerm,
        ...(courseId && { courseId }),
        ...(batchId && { batchId }),
        role: "student"
      });

      const res = await fetch(`/api/v1/students?${params.toString()}`, {
        headers: { Accept: "application/json" },
        signal: abortControllerRef.current.signal,
        cache: "no-store"
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }

      const data = await res.json();
      setStudents(data.students || []);
      
      if (data.pagination) {
        setPagination(prev => ({
          ...prev,
          page: data.pagination.page,
          total: data.pagination.total,
          pages: data.pagination.pages
        }));
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Error fetching students:", error);
        toast.error("Failed to load students");
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, courseId, batchId, pagination.limit, toast]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchStudents(1);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, fetchStudents]);

  // Fetch on filter/status change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchStudents(1);
  }, [statusFilter, courseId, batchId, fetchStudents]);

  // Fetch on page change
  useEffect(() => {
    fetchStudents(pagination.page);
  }, [pagination.page, fetchStudents]);

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

  // Select/deselect all on current page
  const toggleSelectAll = useCallback(() => {
    if (selectedStudents.size === students.length && students.length > 0) {
      setSelectedStudents(new Set());
    } else {
      const allIds = new Set(students.map((s) => s._id));
      setSelectedStudents(allIds);
    }
  }, [students, selectedStudents]);

  // Bulk mark as completed
  const handleBulkMarkCompleted = async () => {
    if (selectedStudents.size === 0) {
      toast.warning("Please select students to mark as completed");
      return;
    }

    if (!completionReason.trim()) {
      toast.warning("Please enter a completion reason");
      return;
    }

    // Hard cap check
    if (selectedStudents.size > 1000) {
      toast.error("Maximum 1,000 students per operation. Please refine your selection.");
      return;
    }

    // Double-lock for >50 students
    if (selectedStudents.size > 50) {
      setShowConfirmModal(true);
      return;
    }

    // Proceed with marking
    await performBulkMark();
  };

  const performBulkMark = async () => {
    setShowConfirmModal(false);
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
        
        // Refresh the current page
        fetchStudents(pagination.page);
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
        fetchStudents(pagination.page);
      } else {
        toast.error("Failed to mark student as completed");
      }
    } catch (error) {
      console.error("Error marking student completed:", error);
      toast.error("Error marking student as completed");
    }
  };

  // Calculate pagination info
  const startIdx = (pagination.page - 1) * pagination.limit + 1;
  const endIdx = Math.min(pagination.page * pagination.limit, pagination.total);

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
            <Select
              value={courseId}
              onChange={(value) => setCourseId(value)}
              options={[
                { value: "", label: "All Courses" },
                ...(courseLoading ? [] : courses.map(c => ({ label: c.name, value: c._id })))
              ]}
              disabled={courseLoading}
            />
            <Select
              value={batchId}
              onChange={(value) => setBatchId(value)}
              options={[
                { value: "", label: "All Batches" },
                ...(batchLoading ? [] : batches.map(b => ({ label: b.name, value: b._id })))
              ]}
              disabled={batchLoading}
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
          ) : students.length === 0 ? (
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
                        selectedStudents.size === students.length &&
                        students.length > 0
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
                {students.map((student) => (
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

              {/* Pagination Controls */}
              <div className="border-t border-slate-200 p-4 flex justify-between items-center bg-slate-50">
                <div className="text-sm text-slate-600">
                  {pagination.total > 0 
                    ? `Showing ${startIdx}-${endIdx} of ${pagination.total} students`
                    : "No students"
                  }
                </div>
                
                <div className="flex gap-2 items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1 || loading}
                    icon={<ChevronLeft size={16} />}
                  >
                    Previous
                  </Button>
                  
                  <div className="text-sm font-medium">
                    Page {pagination.page} of {pagination.pages}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.pages || loading}
                    icon={<ChevronRight size={16} />}
                  >
                    Next
                  </Button>

                  <Select
                    value={pagination.limit.toString()}
                    onChange={(value) => {
                      setPagination(prev => ({ ...prev, limit: parseInt(value), page: 1 }));
                    }}
                    options={[
                      { value: "10", label: "10 per page" },
                      { value: "25", label: "25 per page" },
                      { value: "50", label: "50 per page" }
                    ]}
                    buttonClassName="min-w-fit"
                  />
                </div>
              </div>
            </>
          )}
        </Card>
      </motion.div>

      {/* Confirmation Modal for >50 students */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Bulk Operation"
      >
        <div className="space-y-4">
          <p className="text-slate-700">
            You are about to mark <strong>{selectedStudents.size} students</strong> as completed.
          </p>
          <p className="text-slate-600 text-sm">
            Their batch enrollment statuses will be updated to "completed". If they have no other active batch enrollments, their global status will automatically change to COMPLETED.
          </p>
          <p className="text-slate-600 text-sm font-medium">
            Reason: <em>{completionReason}</em>
          </p>
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={performBulkMark}
              disabled={bulkMarking}
              icon={bulkMarking ? <Loader className="animate-spin" size={16} /> : <Check size={16} />}
            >
              {bulkMarking ? "Processing..." : "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>

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
                <li>Select multiple students and mark them as completed together (max 1,000 per operation)</li>
                <li>Or use the checkbox on each row to mark individual students</li>
                <li>Completion reason is required for bulk operations</li>
                <li>Filter by Course or Batch to refine your selection</li>
                <li>Students with no other active batches will automatically move to COMPLETED status</li>
              </ul>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default CompletionTrackingPage;
