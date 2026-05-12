import React, { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Download, FileText, Search, Loader2, Filter, FileCode } from 'lucide-react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export default function EndpointsCatalog() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [securityFilter, setSecurityFilter] = useState('');

  useEffect(() => {
    const fetchEndpoints = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/endpoint-catalog`);
        setData(response.data || []);
      } catch (error) {
        console.error('Error fetching endpoints:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEndpoints();
  }, []);

  const columns = useMemo(() => [
    {
      accessorKey: 'path',
      header: 'Endpoint Path',
      cell: (info) => <span className="font-mono text-sm text-blue-600 dark:text-blue-400">{info.getValue()}</span>,
    },
    {
      accessorKey: 'method',
      header: 'Method',
      cell: (info) => {
        const method = info.getValue();
        const colors = {
          GET: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400',
          POST: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400',
          PUT: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400',
          DELETE: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400',
        };
        return (
          <span className={`px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wider font-bold ${colors[method] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
            {method}
          </span>
        );
      },
    },
    {
      accessorKey: 'department',
      header: 'Department',
      cell: (info) => <span className="font-medium text-slate-700 dark:text-slate-300">{info.getValue()}</span>,
    },
    {
      accessorKey: 'securityLevel',
      header: 'Security Level',
      cell: (info) => {
        const val = info.getValue();
        const colors = {
          Admin: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400',
          User: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400',
          Public: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400',
        };
        const colorClass = colors[val] || 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
        return (
          <span className={`px-2 py-1 rounded-full text-[11px] font-semibold border ${colorClass}`}>
            {val}
          </span>
        );
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => <span className="text-sm text-slate-500 dark:text-slate-400">{info.getValue()}</span>,
    },
  ], []);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchDept = departmentFilter ? item.department === departmentFilter : true;
      const matchMethod = methodFilter ? item.method === methodFilter : true;
      const matchSec = securityFilter ? item.securityLevel === securityFilter : true;
      return matchDept && matchMethod && matchSec;
    });
  }, [data, departmentFilter, methodFilter, securityFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
      },
      sorting: [
        { id: 'department', desc: false }
      ]
    },
  });

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('API Endpoints Catalog', 14, 15);
    
    const tableData = table.getFilteredRowModel().rows.map(row => [
      row.original.path,
      row.original.method,
      row.original.department,
      row.original.securityLevel,
      row.original.description
    ]);

    doc.autoTable({
      head: [['Path', 'Method', 'Department', 'Security', 'Description']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] } // Slate 900
    });

    doc.save('Endpoints_Catalog.pdf');
  };

  const exportDOCX = async () => {
    const tableData = table.getFilteredRowModel().rows.map(row => 
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(row.original.path)] }),
          new TableCell({ children: [new Paragraph(row.original.method)] }),
          new TableCell({ children: [new Paragraph(row.original.department)] }),
          new TableCell({ children: [new Paragraph(row.original.securityLevel)] }),
          new TableCell({ children: [new Paragraph(row.original.description)] }),
        ],
      })
    );

    const headerRow = new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Path', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Method', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Department', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Security', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Description', bold: true })] })] }),
      ],
    });

    const docxTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: "single", size: 1 },
        bottom: { style: "single", size: 1 },
        left: { style: "single", size: 1 },
        right: { style: "single", size: 1 },
        insideHorizontal: { style: "single", size: 1 },
        insideVertical: { style: "single", size: 1 },
      },
      rows: [headerRow, ...tableData],
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: 'API Endpoints Catalog',
            heading: HeadingLevel.HEADING_1,
          }),
          docxTable,
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'Endpoints_Catalog.docx');
  };

  const uniqueDepartments = [...new Set(data.map(d => d.department))].sort();
  const uniqueMethods = [...new Set(data.map(d => d.method))].sort();
  const uniqueSecurity = [...new Set(data.map(d => d.securityLevel))].sort();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0d0d0d]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d0d0d] p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-white dark:bg-[#141414] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-white/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileCode className="w-7 h-7 text-blue-600" />
                System Endpoints Catalog
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Complete registry of all available API endpoints, methods, and security requirements.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 rounded-xl transition-colors font-semibold text-sm border border-red-200 dark:border-red-900/50 shadow-sm"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={exportDOCX}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl transition-colors font-semibold text-sm shadow-sm shadow-blue-500/20"
              >
                <Download className="w-4 h-4" />
                Export DOCX
              </button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white dark:bg-[#141414] rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/5 rounded-xl flex-1 min-w-[200px] border border-transparent focus-within:border-blue-500/50 focus-within:bg-white dark:focus-within:bg-[#1a1a1a] transition-all">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search endpoints..."
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="text-sm border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-[#1a1a1a] text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-colors"
              >
                <option value="">All Departments</option>
                {uniqueDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            
            <select
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              className="text-sm border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-[#1a1a1a] text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-colors"
            >
              <option value="">All Methods</option>
              {uniqueMethods.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>

            <select
              value={securityFilter}
              onChange={e => setSecurityFilter(e.target.value)}
              className="text-sm border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-[#1a1a1a] text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-colors"
            >
              <option value="">All Security Levels</option>
              {uniqueSecurity.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white dark:bg-[#141414] rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold border-b border-slate-200 dark:border-white/10">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th 
                        key={header.id} 
                        className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors select-none group"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          <span className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors">
                            {{
                              asc: '↑',
                              desc: '↓',
                            }[header.column.getIsSorted()] ?? ''}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500">
                      No endpoints found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr 
                      key={row.id} 
                      className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{table.getRowModel().rows.length}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredData.length}</span> results
            </span>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </button>
              <button
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
