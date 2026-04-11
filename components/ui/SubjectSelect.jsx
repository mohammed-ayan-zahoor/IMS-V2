"use client";

import Select from "@/components/ui/Select";

/**
 * A reusable subject selector for exam forms.
 * Filters subjects based on the selected course's allowed subjects,
 * falling back to all subjects if the course has none tagged.
 *
 * @param {Object}   props
 * @param {string}   props.value          - Current subject ID (or empty string / null)
 * @param {Function} props.onChange        - Called with (subjectId | null)
 * @param {Array}    props.subjects       - Full list of available subjects [{ _id, name }]
 * @param {Array}    props.courses        - Full list of courses [{ _id, subjects: [...ids] }]
 * @param {string}   props.selectedCourse - Currently selected course ID
 */
export default function SubjectSelect({ value, onChange, subjects = [], courses = [], selectedCourse = "" }) {
    const courseData = courses.find(c => String(c._id) === String(selectedCourse));
    const allowedIds = courseData?.subjects || [];

    // If a course is selected, only show subjects assigned to that course.
    // Otherwise, show all available subjects.
    const filteredSubjects = selectedCourse
        ? subjects.filter(s => allowedIds.some(aid => String(aid) === String(s._id || s)))
        : subjects;

    return (
        <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
                {selectedCourse ? "Course Subject" : "Select Subject"} (Optional)
            </label>
            <Select
                value={value || ""}
                onChange={(val) => onChange(val || null)}
                placeholder={selectedCourse && filteredSubjects.length === 0 ? "No subjects assigned to this course" : "-- No Subject (General Exam) --"}
                disabled={selectedCourse && filteredSubjects.length === 0 && !value}
                options={[
                    { label: "-- No Subject (General Exam) --", value: "" },
                    ...filteredSubjects.map(s => ({ label: s.name, value: s._id }))
                ]}
            />
            {selectedCourse && filteredSubjects.length === 0 && (
                <p className="text-[10px] text-amber-600 font-medium ml-1">
                    Tip: Assign subjects to this course in Course Management first.
                </p>
            )}
        </div>
    );
}
