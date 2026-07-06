const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPortal.tsx', 'utf-8');

const stateCode = `
  const [viewMode, setViewMode] = useState<'colleges'|'students'>('colleges');
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/students/all", { headers: adminAuth })
      .then(r => r.json())
      .then(d => {
        if (d.data) setStudents(d.data);
      })
      .catch(console.error);
  }, [adminAuth]);

  const handleExportStudentsCSV = () => {
    if (students.length === 0) return alert("No students available.");
    const headers = ["Email", "First Name", "Last Name", "Verified", "CET Rank", "DCET Score"];
    const rows = students.map(s => [
      s.email,
      s.firstName,
      s.lastName,
      s.isVerified ? "Yes" : "No",
      s.cetRank || "-",
      s.dcetScore || "-"
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => '"' + c + '"').join(","))].join("\\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTotalDatabase = () => {
    handleExportCSV();
    setTimeout(handleExportStudentsCSV, 500);
  };

  const handleExportStudentsPDF = () => {
    try {
      // Create HTML table and print it, as jspdf is available but we can do a quick window.print for the students table
      const printWindow = window.open("", "_blank");
      if (!printWindow) return alert("Pop-ups blocked");
      printWindow.document.write("<html><head><title>Students Export</title><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid black; padding: 8px; text-align: left; }</style></head><body>");
      printWindow.document.write("<h2>Students Database</h2><table><tr><th>Email</th><th>Name</th><th>Verified</th><th>CET Rank</th></tr>");
      students.forEach(s => {
        printWindow.document.write(\`<tr><td>\${s.email}</td><td>\${s.firstName} \${s.lastName}</td><td>\${s.isVerified ? "Yes" : "No"}</td><td>\${s.cetRank || "-"}</td></tr>\`);
      });
      printWindow.document.write("</table></body></html>");
      printWindow.document.close();
      printWindow.print();
    } catch (e) {
      alert("Failed to export PDF");
    }
  };

  const handleSmartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });

      const res = await fetch("/api/admin/smart-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          data: base64Data,
          adminCode: adminAuth.admincode
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(\`Successfully scraped and merged data for \${data.updatedCount} colleges! Refreshing...\`);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      setErrorMsg("Smart Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
`;

content = content.replace(/const \[isEditing, setIsEditing\] = useState\(false\);/, stateCode + '\n  const [isEditing, setIsEditing] = useState(false);');

// Replace List Table entirely with a conditional rendering
const listTable = `
            {/* List Table */}
            {viewMode === 'colleges' ? (
              <div className="border border-gray-100 rounded-2xl overflow-hidden overflow-x-auto bg-slate-50/50 max-h-[580px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-gray-100 text-gray-500 font-bold">
                      <th className="p-3">College & Location</th>
                      <th className="p-3">Course Branches</th>
                      <th className="p-3 text-center">Packages</th>
                      <th className="p-3 text-right">Max Fee</th>
                      <th className="p-3 text-center">Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredColleges.length > 0 ? (
                      filteredColleges.map((college) => (
                        <tr key={college.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-3">
                            <span className="font-extrabold text-gray-900 block">{college.name}</span>
                            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{college.locationAddress || college.place}</span>
                            <span className="text-[10px] text-gray-400 flex items-center mt-0.5">
                              <MapPin className="h-2.5 w-2.5 mr-0.5" />
                              {college.place}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {college.courses && college.courses.length > 0 ? (
                                college.courses.map((c, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-md border border-blue-100" title={\`Fees: ₹\${c.fees.toLocaleString()}\`}>
                                    {c.courseName}
                                  </span>
                                ))
                              ) : (
                                <span className="px-1.5 py-0.5 bg-gray-50 text-gray-500 text-[10px] font-semibold rounded-md">
                                  {college.course}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono">
                            <span className="block text-[10px] text-emerald-700">Avg: {college.averagePackage} LPA</span>
                            <span className="block text-[10px] text-rose-700">Max: {college.highestPackage} LPA</span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-gray-700">
                            ₹{college.fees.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleEditCollege(college)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit College"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => onDeleteCollege(college.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete College"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          No colleges found in the database.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border border-gray-100 rounded-2xl overflow-hidden overflow-x-auto bg-slate-50/50 max-h-[580px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-gray-100 text-gray-500 font-bold">
                      <th className="p-3">Student Email</th>
                      <th className="p-3">Full Name</th>
                      <th className="p-3 text-center">Verified</th>
                      <th className="p-3 text-right">CET Rank</th>
                      <th className="p-3 text-right">DCET Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {students.map((student, i) => (
                      <tr key={i} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-3 font-semibold text-gray-900">{student.email}</td>
                        <td className="p-3">{student.firstName} {student.lastName}</td>
                        <td className="p-3 text-center">
                          {student.isVerified ? 
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">Verified</span> : 
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">Pending</span>}
                        </td>
                        <td className="p-3 text-right font-mono">{student.cetRank || "-"}</td>
                        <td className="p-3 text-right font-mono">{student.dcetScore || "-"}</td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          No students found in the database.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
`;

content = content.replace(/\{\/\* List Table \*\/\}(.|\n)*?(?=<\/div>\n\n        \{\/\* Admin Instructions \*\/})/m, listTable + '\n');
fs.writeFileSync('src/components/AdminPortal.tsx', content);
