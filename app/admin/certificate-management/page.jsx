"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Calendar,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { motion } from "framer-motion";

const CertificateManagementPage = () => {
  const { data: session } = useSession();
  const toast = useToast();

  // State Management
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);

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

  // State for batch selection menu
  const [batchMenuOpen, setBatchMenuOpen] = useState(null); // studentId that has menu open
  const [studentBatches, setStudentBatches] = useState({}); // cache of studentId -> batches
  const [loadingBatches, setLoadingBatches] = useState({}); // track which students are loading batches

   // Fetch courses and batches on mount
   useEffect(() => {
     const fetchFilterData = async () => {
       try {
         setCourseLoading(true);
         setBatchLoading(true);
         setTemplatesLoading(true);
         
         const [coursesRes, batchesRes, templatesRes] = await Promise.all([
           fetch("/api/v1/courses", { headers: { Accept: "application/json" } }),
           fetch("/api/v1/batches", { headers: { Accept: "application/json" } }),
           fetch("/api/v1/certificate-templates", { headers: { Accept: "application/json" } })
         ]);

         if (coursesRes.ok) {
           const data = await coursesRes.json();
           setCourses(data.courses || []);
         }

         if (batchesRes.ok) {
           const data = await batchesRes.json();
           setBatches(data.batches || []);
         }

         if (templatesRes.ok) {
           const data = await templatesRes.json();
           setTemplates(data.data || []);
           // Set the default template if available
           const defaultTemplate = data.data?.find(t => t.isDefault);
           if (defaultTemplate) {
             setSelectedTemplateId(defaultTemplate._id);
           } else if (data.data?.length > 0) {
             setSelectedTemplateId(data.data[0]._id);
           }
         }
       } catch (error) {
         console.error("Error fetching filter data:", error);
       } finally {
         setCourseLoading(false);
         setBatchLoading(false);
         setTemplatesLoading(false);
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
         body: JSON.stringify({ 
           studentIds,
           templateId: selectedTemplateId 
         }),
       });

       const result = await res.json();

       if (res.ok) {
         if (result.successCount > 0) {
           toast.success(
             `Successfully generated ${result.successCount} certificate(s)`
           );
         }
         
         if (result.failedCount > 0) {
           toast.error(
             `Failed to generate ${result.failedCount} certificate(s). ${result.errors.map(e => `${e.name}: ${e.error}`).join('; ')}`
           );
         }
         
         setSelectedStudents(new Set());
         
         // Refresh students list
         fetchStudents(pagination.page);
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
   const generateCertificateForStudent = async (studentId, batchId) => {
      if (!batchId) {
        toast.error("Batch ID is required");
        return;
      }

      try {
        const res = await fetch("/api/v1/students/bulk-generate-certificates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            studentIds: [studentId],
            templateId: selectedTemplateId,
            batchId: batchId
          }),
        });

        const result = await res.json();

        if (res.ok) {
          if (result.successCount > 0) {
            toast.success("Certificate generated successfully");
          }
          
          if (result.failedCount > 0) {
            toast.error(`Failed: ${result.errors[0]?.error || 'Unknown error'}`);
          }
          
          fetchStudents(pagination.page);
        } else {
          toast.error(result.error || "Failed to generate certificate");
        }
      } catch (error) {
        console.error("Error generating certificate:", error);
        toast.error("Error generating certificate");
      }
    };

    // Fetch batches for a student
    const fetchStudentBatches = async (studentId) => {
      try {
        setLoadingBatches(prev => ({ ...prev, [studentId]: true }));
        const res = await fetch(`/api/v1/batches?enrolledStudents=${studentId}`, {
          headers: { "Content-Type": "application/json" }
        });
        
        if (res.ok) {
          const data = await res.json();
          const batches = data.batches || [];
          setStudentBatches(prev => ({ ...prev, [studentId]: batches }));
          return batches;
        }
      } catch (error) {
        console.error("Error fetching student batches:", error);
        toast.error("Failed to load batches");
      } finally {
        setLoadingBatches(prev => ({ ...prev, [studentId]: false }));
      }
      return [];
    };

   // Download certificate - regenerate with latest template first
   const downloadCertificate = async (student) => {
     try {
       const studentId = student._id;
       const certificateId = student.certificateId;

       // Check if we have cached batches
       let batches = studentBatches[studentId];
       
       if (!batches) {
         // Fetch batches for this student
         batches = await fetchStudentBatches(studentId);
       }

       if (!batches || batches.length === 0) {
         toast.error("Student is not enrolled in any batch");
         return;
       }

       // If only one batch, auto-select
       if (batches.length === 1) {
         await regenerateAndDownload(studentId, certificateId, batches[0]._id);
       } else {
         // Multiple batches - open menu to select
         setBatchMenuOpen(studentId);
       }
     } catch (error) {
       console.error("Error in downloadCertificate:", error);
       toast.error("Error preparing certificate download");
     }
   };

   // Regenerate certificate with new template and download
   const regenerateAndDownload = async (studentId, certificateId, batchId) => {
     try {
       // Step 1: Regenerate certificate with latest template
       await generateCertificateForStudent(studentId, batchId);
       
       // Step 2: Download the regenerated certificate
       const res = await fetch(`/api/v1/students/certificates/${certificateId}/download`);
       if (res.ok) {
         const blob = await res.blob();
         const url = window.URL.createObjectURL(blob);
         const a = document.createElement("a");
         a.href = url;
         
         // Extract filename from Content-Disposition header if available
         const disposition = res.headers.get('Content-Disposition');
         let filename = 'certificate.pdf';
         if (disposition) {
           const matches = disposition.match(/filename="(.+?)"/);
           if (matches) filename = matches[1];
         }
         
         a.download = filename;
         document.body.appendChild(a);
         a.click();
         window.URL.revokeObjectURL(url);
         document.body.removeChild(a);
         toast.success("Certificate regenerated and downloaded");
       } else {
         toast.error("Failed to download certificate");
       }
       
       // Close batch menu
       setBatchMenuOpen(null);
     } catch (error) {
       console.error("Error regenerating and downloading certificate:", error);
       toast.error("Error regenerating certificate");
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Input
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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

          {/* Certificate Template Selection */}
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex-1">
              <label className="text-sm font-bold text-slate-700 block mb-2">
                Certificate Template
              </label>
              <select
                value={selectedTemplateId || ""}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={templatesLoading || templates.length === 0}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
              >
                <option value="">
                  {templatesLoading ? "Loading templates..." : "Select a template"}
                </option>
                {templates.map(template => (
                  <option key={template._id} value={template._id}>
                    {template.name} {template.isDefault ? "(Default)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {templates.length === 0 ? "No templates available. Create one in settings first." : "Select the template to use for certificate generation"}
              </p>
            </div>
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
                  <div className="col-span-2">Email</div>
                  <div className="col-span-2">Completed</div>
                  <div className="col-span-2">Certificate</div>
                  <div className="col-span-2">Actions</div>
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
                    <div className="col-span-2 flex items-center gap-2 relative">
                      {student.certificateId ? (
                        <>
                          <button
                            onClick={() => downloadCertificate(student)}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors relative"
                            title="Regenerate with latest template and download"
                            disabled={loadingBatches[student._id]}
                          >
                            {loadingBatches[student._id] ? (
                              <Loader size={18} className="animate-spin" />
                            ) : (
                              <Download size={18} />
                            )}
                          </button>

                          {/* Batch Selection Menu */}
                          {batchMenuOpen === student._id && studentBatches[student._id]?.length > 1 && (
                            <div className="absolute top-8 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg">
                              {studentBatches[student._id].map((batch) => (
                                <button
                                  key={batch._id}
                                  onClick={() => regenerateAndDownload(student._id, student.certificateId, batch._id)}
                                  className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 first:rounded-t-lg last:rounded-b-lg"
                                >
                                  {batch.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            // For generate button, also need batch selection
                            if (studentBatches[student._id]?.length > 0) {
                              // Already have batches cached
                              if (studentBatches[student._id].length === 1) {
                                generateCertificateForStudent(student._id, studentBatches[student._id][0]._id);
                              } else {
                                setBatchMenuOpen(student._id);
                              }
                            } else {
                              // Fetch batches first
                              fetchStudentBatches(student._id).then(batches => {
                                if (batches.length === 1) {
                                  generateCertificateForStudent(student._id, batches[0]._id);
                                } else if (batches.length > 1) {
                                  setBatchMenuOpen(student._id);
                                }
                              });
                            }
                          }}
                          className="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Generate certificate"
                          disabled={loadingBatches[student._id]}
                        >
                          {loadingBatches[student._id] ? (
                            <Loader size={18} className="animate-spin" />
                          ) : (
                            <RefreshCw size={18} />
                          )}
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
                <li>Filter by Course or Batch to refine your selection</li>
              </ul>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default CertificateManagementPage;
