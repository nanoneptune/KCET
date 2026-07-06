const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPortal.tsx', 'utf-8');

// Replace the right card header to include tabs
const tabsHeader = `
            {/* Headers & Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="font-display font-bold text-lg text-gray-900">
                  Karnataka Database Directory
                </h2>
                <div className="flex space-x-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('colleges')}
                    className={\`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all \${viewMode === 'colleges' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}\`}
                  >
                    Colleges
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('students')}
                    className={\`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all \${viewMode === 'students' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}\`}
                  >
                    Students
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={handleExportTotalDatabase}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-3 py-1.5 text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold rounded-lg transition-all"
                >
                  <Database className="h-3.5 w-3.5" />
                  <span>Total Database CSV</span>
                </button>
                
                <button
                  onClick={viewMode === 'colleges' ? handleExportPDF : handleExportStudentsPDF}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-3 py-1.5 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold rounded-lg transition-all cursor-pointer"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>PDF</span>
                </button>
                
                <button
                  onClick={viewMode === 'colleges' ? handleExportCSV : handleExportStudentsCSV}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-3 py-1.5 text-xs border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold rounded-lg transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>

                {viewMode === 'colleges' && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-3 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-all cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Smart Scrape (CSV/PDF)</span>
                    </button>
                    <input
                      type="file"
                      accept=".csv, .pdf"
                      ref={fileInputRef}
                      onChange={handleSmartUpload}
                      className="hidden"
                    />
                  </>
                )}
              </div>
            </div>
`;

content = content.replace(/\{\/\* Headers & Actions \*\/\}(.|\n)*?(?=\{\/\* Keyword Search \*\/})/m, tabsHeader);

// Add missing imports
content = content.replace(/import \{([^}]+)\} from "lucide-react";/, 'import {$1, Database, Users} from "lucide-react";');

fs.writeFileSync('src/components/AdminPortal.tsx', content);
