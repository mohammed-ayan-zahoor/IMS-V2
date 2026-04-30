"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
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
  EyeOff,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldOff
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import DocumentIssuanceDialog from "@/components/admin/DocumentIssuanceDialog";
import CertificateVisibilityModal from "@/components/admin/CertificateVisibilityModal";

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
  const [showToStudent, setShowToStudent] = useState(false);
  const [showGeneratedOnly, setShowGeneratedOnly] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState({});
  const [bulkToggling, setBulkToggling] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [instituteType, setInstituteType] = useState('VOCATIONAL');

  // Modal States
  const [issuanceDialog, setIssuanceDialog] = useState({
    isOpen: false,
    student: null,
    template: null
  });
  
  const [visibilityModal, setVisibilityModal] = useState({
    isOpen: false,
    student: null
  });

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
   const [batchCertificates, setBatchCertificates] = useState({}); // Track certificate IDs per batch

  // Debounce & Abort Controller
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

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
        ...(selectedTemplateId && { templateId: selectedTemplateId }),
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
  }, [statusFilter, searchTerm, courseId, batchId, selectedTemplateId, pagination.limit, toast]);

  // Clear selection when filters change to avoid bulk-action mistakes
  useEffect(() => {
    setSelectedStudents(new Set());
  }, [courseId, batchId, statusFilter, searchTerm, selectedTemplateId]);

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

       if (!batchId) {
         toast.warning("Please select a specific Batch from the filters to specify the course context for these certificates.");
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
             templateId: selectedTemplateId,
             batchId: batchId,
             visibleToStudent: showToStudent
           }),
         });

       const result = await res.json();

       if (res.ok) {
         if (result.successCount > 0 || result.skippedCount > 0) {
           toast.success(
             `Processed: ${result.successCount} generated` + 
             (result.skippedCount > 0 ? `, ${result.skippedCount} skipped (already issued)` : "")
           );
         }
         
         if (result.failedCount > 0) {
           toast.error(
             `Failed to generate ${result.failedCount} certificate(s).`
           );
         }
         
         if (result.certificates && result.certificates.length > 0) {
           const certMap = new Map();
           result.certificates.forEach(c => certMap.set(c.studentId.toString(), c.certificateId));
           setStudents(prev => prev.map(student => {
             const sId = student._id.toString();
             if (certMap.has(sId)) {
               return { ...student, isTemplateIssued: true, targetCertificateId: certMap.get(sId) };
             }
             return student;
           }));
         }
         fetchStudents(pagination.page);
       } else {
         toast.error(result.error || "Failed to generate certificates");
       }
     } catch (error) {
       console.error("Error generating certificates:", error);
       toast.error("Error generating certificates");
     } finally {
       setBulkGenerating(false);
     }
   };

    // Toggle Certificate Visibility
    const toggleVisibility = async (certificateId, studentId) => {
      if (!certificateId) return;
      
      try {
        setTogglingVisibility(prev => ({ ...prev, [certificateId]: true }));
        const res = await fetch(`/api/v1/certificates/${certificateId}/toggle-visibility`, {
          method: "PATCH"
        });
        
        if (res.ok) {
          const data = await res.json();
          toast.success(data.message);
          
          setStudents(prev => prev.map(s => {
            const currentCertId = s.certificateId?._id || s.certificateId;
            if (currentCertId && currentCertId.toString() === certificateId.toString()) {
              return {
                ...s,
                certificateId: typeof s.certificateId === 'string' 
                  ? s.certificateId 
                  : { ...s.certificateId, visibleToStudent: data.visibleToStudent }
              };
            }
            return s;
          }));
        } else {
          toast.error("Failed to toggle visibility");
        }
      } catch (error) {
        console.error("Toggle Visibility Error:", error);
        toast.error("An error occurred");
      } finally {
        setTogglingVisibility(prev => ({ ...prev, [certificateId]: false }));
      }
    };
    
    // Bulk Toggle Visibility
    const handleBulkVisibility = async (visible) => {
        if (selectedStudents.size === 0) {
            toast.warning(`Please select students to ${visible ? "show" : "hide"} certificates for`);
            return;
        }

        if (!batchId) {
            toast.warning(`Please select a specific Batch to specify the context for ${visible ? "showing" : "hiding"} these certificates.`);
            return;
        }

        const studentIdsArray = Array.from(selectedStudents);
        
        const certificateIds = studentIdsArray
            .map(studentId => {
                const student = students.find(s => s._id.toString() === studentId.toString());
                return student?.targetCertificateId;
            })
            .filter(id => !!id);
            
        if (certificateIds.length === 0) {
            toast.error(`None of the selected students have this specific certificate generated`);
            return;
        }
        
        try {
            setBulkToggling(true);
            const res = await fetch("/api/v1/certificates/bulk-visibility", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: certificateIds, visible })
            });
            
            if (res.ok) {
                toast.success(`Updated visibility for ${certificateIds.length} certificates`);
                
                // Update local state for immediate visual feedback
                const updatedIds = new Set(certificateIds.map(id => id.toString()));
                
                setStudents(prev => prev.map(s => {
                    const certId = s.certificateId?._id || s.certificateId;
                    const targetId = s.targetCertificateId;
                    
                    const isCertMatched = certId && updatedIds.has(certId.toString());
                    const isTargetMatched = targetId && updatedIds.has(targetId.toString());

                    if (isCertMatched || isTargetMatched) {
                        return {
                            ...s,
                            certificateId: typeof s.certificateId === 'string' 
                                ? s.certificateId 
                                : s.certificateId ? { ...s.certificateId, visibleToStudent: visible } : null
                        };
                    }
                    return s;
                }));
                
                // Still re-fetch to ensure everything is in sync with server
                fetchStudents(pagination.page);
            } else {
                toast.error("Failed to update bulk visibility");
            }
        } catch (error) {
            console.error("Bulk Visibility Error:", error);
            toast.error("An error occurred");
        } finally {
            setBulkToggling(false);
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

  const startIdx = (pagination.page - 1) * pagination.limit + 1;
  const endIdx = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-6 p-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="premium-card-hover">
          <CardHeader className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Certificate Management</h1>
              <p className="text-sm text-slate-500 mt-1">Generate and manage student certificates</p>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card padding="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "COMPLETED", label: "Completed" },
                { value: "DROPPED", label: "Dropped" },
              ]}
            />
            <Select
              value={courseId}
              onChange={(value) => {
                setCourseId(value);
                setBatchId(""); // Reset batch when course changes
              }}
              options={[{ value: "", label: instituteType === 'SCHOOL' ? "All Standards" : "All Courses" }, ...courses.map(c => ({ label: c.name, value: c._id }))]}
              disabled={courseLoading}
            />
            <Select
              value={batchId}
              onChange={(value) => setBatchId(value)}
              options={[
                { value: "", label: instituteType === 'SCHOOL' ? "All Sections" : "All Batches" }, 
                ...batches
                  .filter(b => !courseId || b.course?._id === courseId || b.course === courseId)
                  .map(b => ({ label: b.name, value: b._id }))
              ]}
              disabled={batchLoading}
            />
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Filter:</span>
                <button
                    onClick={() => setShowGeneratedOnly(!showGeneratedOnly)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                        showGeneratedOnly ? "bg-premium-blue text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200"
                    )}
                >
                    <Award size={12} />
                    {showGeneratedOnly ? "Generated" : "All"}
                </button>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-600 block mb-1">Certificate Template</label>
              <select
                value={selectedTemplateId || ""}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium"
              >
                <option value="">Select a template</option>
                {templates.map(t => <option key={t._id} value={t._id}>{t.name} {t.isDefault ? "(Default)" : ""}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-blue-100 shadow-sm">
                <input 
                    type="checkbox" 
                    id="showToStudent" 
                    checked={showToStudent}
                    onChange={(e) => setShowToStudent(e.target.checked)}
                    className="w-4 h-4 rounded text-premium-blue"
                />
                <label htmlFor="showToStudent" className="text-sm font-bold text-slate-700 cursor-pointer flex items-center gap-2">
                    {showToStudent ? <Eye size={14} className="text-blue-600" /> : <EyeOff size={14} className="text-slate-400" />}
                    Show Immediately
                </label>
            </div>
          </div>

          {selectedStudents.size > 0 && (
            <div className="flex gap-3 justify-between items-center mt-4 pt-4 border-t border-slate-100">
              <div className="text-sm font-medium text-slate-600">
                <span className="text-premium-blue">{selectedStudents.size}</span> students selected
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedStudents(new Set())}>Clear</Button>
                <Button variant="primary" size="sm" onClick={handleBulkGenerateCertificates} disabled={bulkGenerating} icon={<Award size={16} />}>
                   {bulkGenerating ? "Generating..." : "Generate Certificates"}
                </Button>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleBulkVisibility(true)} 
                    disabled={bulkToggling}
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                    icon={<Eye size={14} />}
                  >
                    Show
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleBulkVisibility(false)} 
                    disabled={bulkToggling}
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    icon={<EyeOff size={14} />}
                  >
                    Hide
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
        <Card padding="p-0" className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-12"><Loader className="animate-spin text-slate-300" /></div>
          ) : (
            <>
              {(() => {
                const filteredStudents = showGeneratedOnly ? students.filter(s => s.certificateId) : students;
                if (filteredStudents.length === 0) return <div className="p-12 text-center text-slate-400 text-sm">No students matching filters.</div>;

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <th className="p-4 w-10">
                            <input type="checkbox" checked={selectedStudents.size === filteredStudents.length} onChange={() => setSelectedStudents(selectedStudents.size === filteredStudents.length ? new Set() : new Set(filteredStudents.map(s => s._id)))} className="rounded" />
                          </th>
                          <th className="p-4">Name</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Completed Date</th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map(student => (
                          <tr key={student._id} className={cn("hover:bg-slate-50/50 transition-colors", selectedStudents.has(student._id) && "bg-blue-50/30")}>
                            <td className="p-4">
                              <input type="checkbox" checked={selectedStudents.has(student._id)} onChange={() => toggleStudentSelection(student._id)} className="rounded" />
                            </td>
                            <td className="p-4 font-medium text-slate-900">{student.name}</td>
                            <td className="p-4 text-sm text-slate-500">{student.email}</td>
                            <td className="p-4 text-sm text-slate-500">
                                {student.completedAt ? (
                                    <div className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" />{formatDate(student.completedAt)}</div>
                                ) : "—"}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {student.isTemplateIssued ? (
                                  <>
                                    <Badge variant="success">Template Issued</Badge>
                                    <button
                                      onClick={() => setVisibilityModal({ isOpen: true, student })}
                                      className="p-1.5 rounded-lg border transition-all bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"
                                      title="Manage Document Visibility"
                                    >
                                      <Eye size={12} />
                                    </button>
                                  </>
                                ) : student.certificateId ? (
                                    <div className="flex flex-col items-center gap-1">
                                        <Badge variant="neutral">Other Documents</Badge>
                                        <button
                                            onClick={() => setVisibilityModal({ isOpen: true, student })}
                                            className="text-[9px] font-black text-blue-500 uppercase hover:underline"
                                        >
                                            View All
                                        </button>
                                    </div>
                                ) : <Badge variant="warning">Not Issued</Badge>}
                              </div>
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    {student.isTemplateIssued ? (
                                        <button 
                                            onClick={() => {
                                                const template = templates.find(t => t._id === selectedTemplateId);
                                                setIssuanceDialog({ isOpen: true, student, template });
                                            }} 
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="View/Re-issue Duplicate"
                                        >
                                            <RefreshCw size={18} />
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => {
                                                const template = templates.find(t => t._id === selectedTemplateId);
                                                setIssuanceDialog({ isOpen: true, student, template });
                                            }} 
                                            className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                            title="Issue New Certificate"
                                        >
                                            <Award size={18} />
                                        </button>
                                    )}
                                </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              <div className="border-t border-slate-200 p-4 flex justify-between items-center bg-slate-50/50">
                <div className="text-xs text-slate-500 font-medium">Showing {startIdx}-{endIdx} of {pagination.total} students</div>
                <div className="flex gap-2 items-center">
                  <Button variant="ghost" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1} icon={<ChevronLeft size={16} />}>Prev</Button>
                  <span className="text-xs font-bold text-slate-600">Page {pagination.page} of {pagination.pages}</span>
                  <Button variant="ghost" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page === pagination.pages} icon={<ChevronRight size={16} />}>Next</Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </motion.div>

      <DocumentIssuanceDialog
        isOpen={issuanceDialog.isOpen}
        student={issuanceDialog.student}
        template={issuanceDialog.template}
        templates={templates}
        onClose={() => setIssuanceDialog({ ...issuanceDialog, isOpen: false })}
        onSuccess={() => fetchStudents(pagination.page)}
      />
      <CertificateVisibilityModal
        isOpen={visibilityModal.isOpen}
        student={visibilityModal.student}
        onClose={() => {
          setVisibilityModal({ ...visibilityModal, isOpen: false });
          fetchStudents(pagination.page); // Refresh main table to reflect any global visibility changes if needed
        }}
      />
    </div>
  );
};

export default CertificateManagementPage;
