import React, { useState, useEffect, useMemo } from 'react';

import { Upload, Settings, Save, X, Plus, Trash2, AlertCircle, Download, FileText, CheckCircle2, AlertTriangle, Users, Eye } from 'lucide-react';



export default function App() {

&#x20; // --- States ---

&#x20; const \[rawData, setRawData] = useState(\[]);

&#x20; const \[fileName, setFileName] = useState('');

&#x20; 

&#x20; // Global Parameters

&#x20; const \[hk, setHk] = useState(22); // Hari Kerja default

&#x20; const \[isHkEdited, setIsHkEdited] = useState(false); // Mode auto atau manual untuk HK

&#x20; const \[onTimeLimit, setOnTimeLimit] = useState('08:00:59'); // Batas On Time Baru

&#x20; const \[maxCi, setMaxCi] = useState('09:00:00');

&#x20; const \[minCo, setMinCo] = useState('15:00:00');

&#x20; 

&#x20; // Overrides \& Mappings

&#x20; // overrides format: { "NamaResmi\_Tanggal": "Value" }

&#x20; const \[overrides, setOverrides] = useState({});

&#x20; 

&#x20; // nameMapping format: { "NamaFinger": "Nama Resmi" }

&#x20; const \[nameMapping, setNameMapping] = useState(() => {

&#x20;   try {

&#x20;     const saved = localStorage.getItem('attendance\_name\_mapping');

&#x20;     return saved ? JSON.parse(saved) : {};

&#x20;   } catch (e) {

&#x20;     return {};

&#x20;   }

&#x20; });



&#x20; // Save Name Mapping to LocalStorage to persist setups

&#x20; useEffect(() => {

&#x20;   localStorage.setItem('attendance\_name\_mapping', JSON.stringify(nameMapping));

&#x20; }, \[nameMapping]);

&#x20; 

&#x20; // UI States

&#x20; const \[isSettingsOpen, setIsSettingsOpen] = useState(false);

&#x20; const \[isPreviewOpen, setIsPreviewOpen] = useState(false); // State untuk modal preview summary

&#x20; const \[tempMappingKey, setTempMappingKey] = useState('');

&#x20; const \[tempMappingValue, setTempMappingValue] = useState('');



&#x20; // --- Helper Functions ---

&#x20; const timeToSeconds = (timeStr) => {

&#x20;   if (!timeStr) return 0;

&#x20;   const parts = timeStr.split(':');

&#x20;   if (parts.length < 2) return 0;

&#x20;   const hrs = parseInt(parts\[0], 10) || 0;

&#x20;   const mins = parseInt(parts\[1], 10) || 0;

&#x20;   const secs = parts\[2] ? (parseInt(parts\[2], 10) || 0) : 0;

&#x20;   return hrs \* 3600 + mins \* 60 + secs;

&#x20; };



&#x20; const parseDate = (dateStr) => {

&#x20;   if (!dateStr) return new Date(0);

&#x20;   const parts = dateStr.split('-');

&#x20;   if (parts.length !== 3) return new Date(0);

&#x20;   const \[d, m, y] = parts;

&#x20;   return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));

&#x20; };



&#x20; const getDayInfo = (dateStr) => {

&#x20;   const date = parseDate(dateStr);

&#x20;   const days = \['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

&#x20;   const dayName = days\[date.getDay()];

&#x20;   // Hari Sabtu dan Minggu berwarna merah

&#x20;   const isRedDay = dayName === 'Sabtu' || dayName === 'Minggu';

&#x20;   return { dayName, isRedDay };

&#x20; };



&#x20; // Robust CSV Parser that handles commas inside quotes

&#x20; const parseCSV = (text) => {

&#x20;   const lines = \[];

&#x20;   let row = \[""];

&#x20;   let inQuotes = false;



&#x20;   for (let i = 0; i < text.length; i++) {

&#x20;     const char = text\[i];

&#x20;     const nextChar = text\[i+1];

&#x20;     if (char === '"') {

&#x20;       inQuotes = !inQuotes;

&#x20;     } else if (char === ',' \&\& !inQuotes) {

&#x20;       row.push('');

&#x20;     } else if ((char === '\\r' || char === '\\n') \&\& !inQuotes) {

&#x20;       if (char === '\\r' \&\& nextChar === '\\n') {

&#x20;         i++; // skip \\n

&#x20;       }

&#x20;       lines.push(row);

&#x20;       row = \[""];

&#x20;     } else {

&#x20;       row\[row.length - 1] += char;

&#x20;     }

&#x20;   }

&#x20;   if (row.length > 1 || row\[0] !== "") {

&#x20;     lines.push(row);

&#x20;   }

&#x20;   

&#x20;   if (lines.length < 2) return \[];

&#x20;   const headers = lines\[0].map(h => h.trim());

&#x20;   const data = \[];

&#x20;   for (let i = 1; i < lines.length; i++) {

&#x20;     const values = lines\[i];

&#x20;     if (values.length < headers.length) continue;

&#x20;     const obj = {};

&#x20;     headers.forEach((h, idx) => {

&#x20;       obj\[h] = (values\[idx] || '').trim();

&#x20;     });

&#x20;     data.push(obj);

&#x20;   }

&#x20;   return data;

&#x20; };



&#x20; const handleFileUpload = (e) => {

&#x20;   const file = e.target.files\[0];

&#x20;   if (!file) return;

&#x20;   setFileName(file.name);



&#x20;   const reader = new FileReader();

&#x20;   reader.onload = (event) => {

&#x20;     const text = event.target.result;

&#x20;     const parsed = parseCSV(text);

&#x20;     if (parsed.length > 0) {

&#x20;       setRawData(parsed);

&#x20;       setOverrides({}); // Reset manual adjustment jika upload file baru

&#x20;       setIsHkEdited(false); // Kembalikan HK ke mode Auto

&#x20;     }

&#x20;   };

&#x20;   reader.readAsText(file);

&#x20; };



&#x20; // --- Core Logic \& Data Transformation ---

&#x20; const processedData = useMemo(() => {

&#x20;   if (rawData.length === 0) return { dates: \[], employees: \[], maxCalculatedHk: 0, alertCount: 0 };



&#x20;   // 1. Ambil \& Urutkan Tanggal Secara Unik

&#x20;   const uniqueDatesSet = new Set();

&#x20;   rawData.forEach(row => {

&#x20;     if (row.Tanggal) uniqueDatesSet.add(row.Tanggal);

&#x20;   });

&#x20;   const sortedDates = Array.from(uniqueDatesSet).sort((a, b) => parseDate(a) - parseDate(b));



&#x20;   // 2. Kelompokkan Data Berdasarkan Nama Fingerprint -> Di-mapping ke Nama Resmi

&#x20;   const employeeMap = {};

&#x20;   

&#x20;   rawData.forEach(row => {

&#x20;     const fingerName = row.Nama;

&#x20;     if (!fingerName) return;

&#x20;     

&#x20;     const officialName = nameMapping\[fingerName] || fingerName;

&#x20;     

&#x20;     if (!employeeMap\[officialName]) {

&#x20;       employeeMap\[officialName] = {

&#x20;         originalName: fingerName,

&#x20;         officialName: officialName,

&#x20;         records: {},

&#x20;         ciCount: 0

&#x20;       };

&#x20;     }

&#x20;     

&#x20;     if (row.Tanggal) {

&#x20;       employeeMap\[officialName].records\[row.Tanggal] = row;

&#x20;       // Hitung CI murni (jika ada jam masuk / Scan 1)

&#x20;       if (row\['Scan 1']) {

&#x20;         employeeMap\[officialName].ciCount += 1;

&#x20;       }

&#x20;     }

&#x20;   });



&#x20;   // 3. Proses Status Absensi Masing-masing Karyawan

&#x20;   const employees = Object.values(employeeMap).sort((a, b) => a.officialName.localeCompare(b.officialName));

&#x20;   

&#x20;   const onTimeSec = timeToSeconds(onTimeLimit);

&#x20;   const maxCiSec = timeToSeconds(maxCi);

&#x20;   const minCoSec = timeToSeconds(minCo);

&#x20;   const saturdayMinCoSec = timeToSeconds('13:58:00'); // Batas khusus hari Sabtu



&#x20;   let maxCalculatedHk = 0;

&#x20;   let alertCount = 0;



&#x20;   const finalEmployees = employees.map(emp => {

&#x20;     const rowData = {

&#x20;       originalName: emp.originalName,

&#x20;       officialName: emp.officialName,

&#x20;       ci: emp.ciCount,

&#x20;       off: 0, // Akan dihitung setelah nilai HK ditentukan

&#x20;       dailyStatus: {},

&#x20;       totalHk: 0,

&#x20;       totalI: 0,

&#x20;       totalS: 0,

&#x20;       totalC: 0,

&#x20;       totalTerlambat: 0 // Menyimpan jumlah hari terlambat (Batas On Time s/d MAX CI)

&#x20;     };



&#x20;     sortedDates.forEach(date => {

&#x20;       const record = emp.records\[date];

&#x20;       const overrideKey = `${emp.officialName}\_${date}`;

&#x20;       let status = '0'; // Default jika karyawan tidak absen di tanggal tersebut (Kondisi A)

&#x20;       

&#x20;       // Deteksi hari untuk menentukan target batas pulang

&#x20;       const { dayName } = getDayInfo(date);

&#x20;       const currentMinCoSec = dayName === 'Sabtu' ? saturdayMinCoSec : minCoSec;



&#x20;       if (record) {

&#x20;         const scan1 = record\['Scan 1'];

&#x20;         const scan2 = record\['Scan 2'];



&#x20;         if (scan1 \&\& !scan2) {

&#x20;           status = 'NO CO'; // Kondisi C

&#x20;         } else if (scan1 \&\& scan2) {

&#x20;           const s1Sec = timeToSeconds(scan1);

&#x20;           const s2Sec = timeToSeconds(scan2);



&#x20;           // Kondisi B: Tepat waktu masuk \& tepat waktu pulang (atau lebih)

&#x20;           if (s1Sec <= maxCiSec \&\& s2Sec >= currentMinCoSec) {

&#x20;             status = '1';

&#x20;           } 

&#x20;           // Kondisi D: Terlambat masuk, tapi pulang sesuai jadwal (atau lebih)

&#x20;           else if (s1Sec > maxCiSec \&\& s2Sec >= currentMinCoSec) {

&#x20;             status = '0.5';

&#x20;           }

&#x20;           // Kondisi E: Tepat waktu masuk, tapi pulang lebih cepat

&#x20;           else if (s1Sec <= maxCiSec \&\& s2Sec < currentMinCoSec) {

&#x20;             status = '0.5';

&#x20;           }

&#x20;           // Terlambat masuk \& pulang lebih cepat

&#x20;           else if (s1Sec > maxCiSec \&\& s2Sec < currentMinCoSec) {

&#x20;             status = '0.5';

&#x20;           }

&#x20;         }

&#x20;       }



&#x20;       // Terapkan penyesuaian manual (Override) jika ada

&#x20;       const finalStatus = overrides\[overrideKey] !== undefined ? overrides\[overrideKey] : status;

&#x20;       rowData.dailyStatus\[date] = finalStatus;



&#x20;       // Hitung total ringkasan per karyawan

&#x20;       if (finalStatus === '1') rowData.totalHk += 1;

&#x20;       if (finalStatus === '0.5') rowData.totalHk += 0.5;

&#x20;       if (finalStatus === 'I') rowData.totalI += 1;

&#x20;       if (finalStatus === 'S') rowData.totalS += 1;

&#x20;       if (finalStatus === 'C') rowData.totalC += 1;

&#x20;       if (finalStatus === 'NO CO') alertCount += 1;

&#x20;     });



&#x20;     // Hitung Frekuensi Terlambat (Scan 1 berada di antara Batas On Time \& Batas Telat)

&#x20;     sortedDates.forEach(date => {

&#x20;       const record = emp.records\[date];

&#x20;       if (record \&\& record\['Scan 1']) {

&#x20;         const s1Sec = timeToSeconds(record\['Scan 1']);

&#x20;         if (s1Sec >= onTimeSec \&\& s1Sec <= maxCiSec) {

&#x20;           rowData.totalTerlambat += 1;

&#x20;         }

&#x20;       }

&#x20;     });



&#x20;     // Cari nilai HK tertinggi dari seluruh karyawan

&#x20;     if (rowData.totalHk > maxCalculatedHk) {

&#x20;       maxCalculatedHk = rowData.totalHk;

&#x20;     }



&#x20;     return rowData;

&#x20;   });



&#x20;   // Hitung ulang kolom OFF setelah nilai HK final/akhir didapatkan

&#x20;   const calculatedHkValue = isHkEdited ? hk : maxCalculatedHk;

&#x20;   finalEmployees.forEach(emp => {

&#x20;     emp.off = Math.max(0, calculatedHkValue - emp.ci);

&#x20;   });



&#x20;   return { dates: sortedDates, employees: finalEmployees, maxCalculatedHk, alertCount };

&#x20; }, \[rawData, nameMapping, hk, onTimeLimit, maxCi, minCo, overrides, isHkEdited]);



&#x20; // Efek untuk otomatis menyetel nilai HK sesuai dengan nilai tertinggi di kolom Total HK

&#x20; useEffect(() => {

&#x20;   if (!isHkEdited \&\& processedData.maxCalculatedHk !== undefined) {

&#x20;     if (hk !== processedData.maxCalculatedHk \&\& processedData.maxCalculatedHk > 0) {

&#x20;       setHk(processedData.maxCalculatedHk);

&#x20;     }

&#x20;   }

&#x20; }, \[processedData.maxCalculatedHk, isHkEdited, hk]);



&#x20; // --- Handlers ---

&#x20; const handleStatusChange = (officialName, date, newValue) => {

&#x20;   setOverrides(prev => ({

&#x20;     ...prev,

&#x20;     \[`${officialName}\_${date}`]: newValue

&#x20;   }));

&#x20; };



&#x20; const addMapping = () => {

&#x20;   if (tempMappingKey.trim() \&\& tempMappingValue.trim()) {

&#x20;     setNameMapping(prev => ({

&#x20;       ...prev,

&#x20;       \[tempMappingKey.trim()]: tempMappingValue.trim()

&#x20;     }));

&#x20;     setTempMappingKey('');

&#x20;     setTempMappingValue('');

&#x20;   }

&#x20; };



&#x20; const removeMapping = (key) => {

&#x20;   const newMap = { ...nameMapping };

&#x20;   delete newMap\[key];

&#x20;   setNameMapping(newMap);

&#x20; };



&#x20; // --- Batch Import/Export Mappings ---

&#x20; const exportMappingTemplate = () => {

&#x20;   let csvContent = "Nama Fingerprint,Nama Resmi\\n";

&#x20;   const uniqueNames = new Set();

&#x20;   rawData.forEach(row => {

&#x20;     if (row.Nama) uniqueNames.add(row.Nama);

&#x20;   });



&#x20;   if (uniqueNames.size > 0) {

&#x20;     Array.from(uniqueNames).forEach(name => {

&#x20;       const resmi = nameMapping\[name] || '';

&#x20;       csvContent += `"${name}","${resmi}"\\n`;

&#x20;     });

&#x20;   } else {

&#x20;     // Fallback contoh jika belum ada data yang diupload

&#x20;     Object.entries(nameMapping).forEach((\[finger, resmi]) => {

&#x20;       csvContent += `"${finger}","${resmi}"\\n`;

&#x20;     });

&#x20;     if (Object.keys(nameMapping).length === 0) {

&#x20;       csvContent += `"Contoh Fingerprint","Nama Resmi Karyawan"\\n`;

&#x20;     }

&#x20;   }



&#x20;   const blob = new Blob(\[csvContent], { type: 'text/csv;charset=utf-8;' });

&#x20;   const url = URL.createObjectURL(blob);

&#x20;   const link = document.createElement("a");

&#x20;   link.setAttribute("href", url);

&#x20;   link.setAttribute("download", "Template\_Mapping\_Nama\_Resmi.csv");

&#x20;   document.body.appendChild(link);

&#x20;   link.click();

&#x20;   document.body.removeChild(link);

&#x20; };



&#x20; const handleImportMapping = (e) => {

&#x20;   const file = e.target.files\[0];

&#x20;   if (!file) return;

&#x20;   

&#x20;   const reader = new FileReader();

&#x20;   reader.onload = (event) => {

&#x20;     const text = event.target.result;

&#x20;     const lines = text.split(/\\r?\\n/).filter(l => l.trim() !== '');

&#x20;     if (lines.length < 2) return;



&#x20;     const newMapping = { ...nameMapping };

&#x20;     for (let i = 1; i < lines.length; i++) {

&#x20;       const line = lines\[i];

&#x20;       const match = line.match(/(".\*?"|\[^",\\s]+)(?=\\s\*,|\\s\*$)/g) || line.split(',');

&#x20;       if (match.length >= 2) {

&#x20;         const finger = match\[0].replace(/^"|"$/g, '').trim();

&#x20;         const resmi = match\[1].replace(/^"|"$/g, '').trim();

&#x20;         if (finger \&\& resmi) {

&#x20;           newMapping\[finger] = resmi;

&#x20;         }

&#x20;       }

&#x20;     }

&#x20;     setNameMapping(newMapping);

&#x20;   };

&#x20;   reader.readAsText(file);

&#x20;   e.target.value = null; // Reset file input

&#x20; };



&#x20; // --- Export Summary Excel-Style CSV ---

&#x20; const downloadSummaryCSV = () => {

&#x20;   let csvContent = "\\uFEFF"; // BOM untuk UTF-8 Microsoft Excel

&#x20;   csvContent += "DASHBOARD PRESENSI OFFICE,,,,,,\\n";

&#x20;   const startD = processedData.dates\[0] || 'Tgl Mulai';

&#x20;   const endD = processedData.dates\[processedData.dates.length - 1] || 'Tgl Akhir';

&#x20;   csvContent += `PERIODE (${startD} - ${endD}),,,,,,\\n\\n`;

&#x20;   csvContent += "No.,Nama Karyawan,Total Terlambat,Izin Dokter,Cuti,Lembur/Jam,Total Izin Akhir,Ket,Sisa Cuti\\n";



&#x20;   processedData.employees.forEach((emp, index) => {

&#x20;     const totalTerlambat = emp.totalTerlambat > 0 ? emp.totalTerlambat : '';

&#x20;     const izinDokter = emp.totalS > 0 ? emp.totalS : '';

&#x20;     const cuti = emp.totalC > 0 ? emp.totalC : '';

&#x20;     const totalIzinAkhir = emp.totalI > 0 ? emp.totalI : '';

&#x20;     csvContent += `${index + 1},"${emp.officialName}",${totalTerlambat},${izinDokter},${cuti},,${totalIzinAkhir},,\\n`;

&#x20;   });



&#x20;   const blob = new Blob(\[csvContent], { type: 'text/csv;charset=utf-8;' });

&#x20;   const url = URL.createObjectURL(blob);

&#x20;   const link = document.createElement("a");

&#x20;   link.setAttribute("href", url);

&#x20;   link.setAttribute("download", `DASHBOARD\_PRESENSI\_${startD}\_S\_D\_${endD}.csv`);

&#x20;   document.body.appendChild(link);

&#x20;   link.click();

&#x20;   document.body.removeChild(link);

&#x20; };



&#x20; // --- Dropdown Options \& Coloring ---

&#x20; const statusOptions = \['0', '1', 'NO CO', '0.5', 'S', 'I', 'C'];



&#x20; const getStatusColor = (status) => {

&#x20;   switch(status) {

&#x20;     case '1': return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300';

&#x20;     case '0': return 'bg-rose-50 text-rose-500 hover:bg-rose-100 border-rose-200';

&#x20;     case '0.5': return 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300';

&#x20;     case 'NO CO': return 'bg-rose-600 text-white font-bold animate-pulse hover:bg-rose-700 border-rose-700';

&#x20;     case 'S': return 'bg-sky-100 text-sky-800 hover:bg-sky-200 border-sky-300';

&#x20;     case 'I': return 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-300';

&#x20;     case 'C': return 'bg-teal-100 text-teal-800 hover:bg-teal-200 border-teal-300';

&#x20;     default: return 'bg-slate-100 text-slate-800';

&#x20;   }

&#x20; };



&#x20; return (

&#x20;   <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">

&#x20;     

&#x20;     {/\* HEADER BAR \*/}

&#x20;     <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-40 shadow-xs">

&#x20;       <div>

&#x20;         <div className="flex items-center gap-2">

&#x20;           <span className="p-1.5 bg-indigo-600 text-white rounded-lg">

&#x20;             <FileText size={20} />

&#x20;           </span>

&#x20;           <h1 className="text-xl font-bold text-slate-900 tracking-tight">Presensi Dashboard</h1>

&#x20;         </div>

&#x20;         <p className="text-xs text-slate-500 mt-0.5">Analisis instan \& penyesuaian data absensi sidik jari</p>

&#x20;       </div>

&#x20;       

&#x20;       <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">

&#x20;         {rawData.length > 0 \&\& (

&#x20;           <button 

&#x20;             onClick={() => setIsPreviewOpen(true)}

&#x20;             className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg transition-all shadow-sm hover:shadow-md text-sm font-semibold"

&#x20;           >

&#x20;             <Eye size={16} />

&#x20;             <span>Preview Summary</span>

&#x20;           </button>

&#x20;         )}

&#x20;         <label className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg cursor-pointer transition-all shadow-sm hover:shadow-md text-sm font-semibold">

&#x20;           <Upload size={16} />

&#x20;           <span>Upload Absensi (CSV)</span>

&#x20;           <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />

&#x20;         </label>

&#x20;         <button 

&#x20;           onClick={() => setIsSettingsOpen(true)}

&#x20;           className="flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg transition-all shadow-xs text-sm font-semibold"

&#x20;         >

&#x20;           <Settings size={16} />

&#x20;           <span>Set Nama Resmi</span>

&#x20;         </button>

&#x20;       </div>

&#x20;     </header>



&#x20;     {/\* MAIN LAYOUT \*/}

&#x20;     <main className="p-6 space-y-6">

&#x20;       

&#x20;       {rawData.length === 0 ? (

&#x20;         /\* EMPTY STATE \*/

&#x20;         <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center max-w-xl mx-auto mt-16 shadow-sm">

&#x20;           <div className="bg-indigo-50 p-5 rounded-2xl mb-4 text-indigo-600">

&#x20;             <Upload size={40} />

&#x20;           </div>

&#x20;           <h2 className="text-lg font-bold text-slate-900 mb-1">Unggah Data Fingerprint Anda</h2>

&#x20;           <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">

&#x20;             Mulai dengan mengunggah berkas CSV hasil ekspor sidik jari. Sistem akan langsung memetakan nama, menghitung hari kerja secara real-time, dan menandai kejanggalan absensi.

&#x20;           </p>

&#x20;           <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl cursor-pointer transition font-semibold text-sm shadow-sm inline-flex items-center gap-2">

&#x20;             <Upload size={16} />

&#x20;             Pilih Berkas CSV

&#x20;             <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />

&#x20;           </label>

&#x20;         </div>

&#x20;       ) : (

&#x20;         /\* WORKSPACE ACTIVE \*/

&#x20;         <div className="space-y-6">

&#x20;           

&#x20;           {/\* STATS \& PARAMETERS LAYOUT \*/}

&#x20;           <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

&#x20;             

&#x20;             {/\* PARAMETERS SECTIONS \*/}

&#x20;             <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 xl:col-span-2">

&#x20;               <div className="flex items-center gap-2 mb-5 text-indigo-700 font-bold text-sm uppercase tracking-wider border-b border-slate-100 pb-3">

&#x20;                 <Settings size={16} />

&#x20;                 <span>Parameter Perhitungan Global</span>

&#x20;               </div>

&#x20;               

&#x20;               {/\* ALIGNED INPUT PANEL \*/}

&#x20;               <div className="flex flex-wrap gap-6 items-start">

&#x20;                 

&#x20;                 {/\* Hari Kerja (HK) \*/}

&#x20;                 <div className="flex flex-col">

&#x20;                   <label className="block text-\[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Hari Kerja (HK)</label>

&#x20;                   <input 

&#x20;                     type="number" 

&#x20;                     step="0.5"

&#x20;                     value={hk} 

&#x20;                     onChange={(e) => {

&#x20;                       const val = e.target.value;

&#x20;                       if (val === '') {

&#x20;                         setIsHkEdited(false);

&#x20;                         setHk(processedData.maxCalculatedHk || 0);

&#x20;                       } else {

&#x20;                         setIsHkEdited(true);

&#x20;                         setHk(Number(val));

&#x20;                       }

&#x20;                     }}

&#x20;                     className={`w-28 px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm ${!isHkEdited ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'border-slate-300 text-slate-800 font-semibold'}`}

&#x20;                     title={!isHkEdited ? "Nilai otomatis diambil dari Max Total HK karyawan" : "Nilai disunting manual"}

&#x20;                   />

&#x20;                   <div className="mt-1.5 min-h-\[20px]">

&#x20;                     {!isHkEdited \&\& (

&#x20;                       <span className="text-\[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 whitespace-nowrap">

&#x20;                         \*Auto Max HK

&#x20;                       </span>

&#x20;                     )}

&#x20;                   </div>

&#x20;                 </div>



&#x20;                 {/\* Batas On Time (BARU) \*/}

&#x20;                 <div className="flex flex-col">

&#x20;                   <label className="block text-\[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Batas On Time</label>

&#x20;                   <input 

&#x20;                     type="time" step="1" 

&#x20;                     value={onTimeLimit} 

&#x20;                     onChange={(e) => setOnTimeLimit(e.target.value)}

&#x20;                     className="w-36 px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-semibold text-slate-800 bg-white"

&#x20;                   />

&#x20;                   <div className="mt-1.5 min-h-\[20px]">

&#x20;                     <span className="text-\[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 whitespace-nowrap">

&#x20;                       \*Terlambat jika \&ge; batas ini

&#x20;                     </span>

&#x20;                   </div>

&#x20;                 </div>



&#x20;                 {/\* Batas Telat (MAX CI) \*/}

&#x20;                 <div className="flex flex-col">

&#x20;                   <label className="block text-\[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Batas Telat (MAX CI)</label>

&#x20;                   <input 

&#x20;                     type="time" step="1" 

&#x20;                     value={maxCi} 

&#x20;                     onChange={(e) => setMaxCi(e.target.value)}

&#x20;                     className="w-36 px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-semibold text-slate-800 bg-white"

&#x20;                   />

&#x20;                   <div className="mt-1.5 min-h-\[20px]"></div> {/\* Spacer agar seimbang \*/}

&#x20;                 </div>



&#x20;                 {/\* Batas Pulang (MIN CO) \*/}

&#x20;                 <div className="flex flex-col">

&#x20;                   <label className="block text-\[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Batas Pulang (MIN CO)</label>

&#x20;                   <input 

&#x20;                     type="time" step="1" 

&#x20;                     value={minCo} 

&#x20;                     onChange={(e) => setMinCo(e.target.value)}

&#x20;                     className="w-36 px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-semibold text-slate-800 bg-white"

&#x20;                   />

&#x20;                   <div className="mt-1.5 min-h-\[20px]">

&#x20;                     <span className="text-\[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 whitespace-nowrap">

&#x20;                       \*Khusus Sabtu = 13:58

&#x20;                     </span>

&#x20;                   </div>

&#x20;                 </div>



&#x20;               </div>

&#x20;             </div>



&#x20;             {/\* QUICK STATS CARDS \*/}

&#x20;             <div className="grid grid-cols-2 gap-4">

&#x20;               <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-xs">

&#x20;                 <div className="flex justify-between items-start">

&#x20;                   <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Staf</span>

&#x20;                   <span className="p-1 bg-indigo-50 text-indigo-600 rounded-lg">

&#x20;                     <Users size={16} />

&#x20;                   </span>

&#x20;                 </div>

&#x20;                 <div>

&#x20;                   <p className="text-2xl font-bold text-slate-900 mt-2">{processedData.employees.length}</p>

&#x20;                   <p className="text-\[11px] text-slate-400 mt-1 line-clamp-1">File: {fileName}</p>

&#x20;                 </div>

&#x20;               </div>



&#x20;               <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-xs transition-colors ${processedData.alertCount > 0 ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-200'}`}>

&#x20;                 <div className="flex justify-between items-start">

&#x20;                   <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Laporan NO CO</span>

&#x20;                   <span className={`p-1 rounded-lg ${processedData.alertCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>

&#x20;                     <AlertTriangle size={16} />

&#x20;                   </span>

&#x20;                 </div>

&#x20;                 <div>

&#x20;                   <p className={`text-2xl font-bold mt-2 ${processedData.alertCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>

&#x20;                     {processedData.alertCount}

&#x20;                   </p>

&#x20;                   <p className="text-\[11px] text-slate-500 mt-1">Butuh verifikasi / checkout kosong</p>

&#x20;                 </div>

&#x20;               </div>

&#x20;             </div>



&#x20;           </div>



&#x20;           {/\* INTERACTIVE TABLE CONTAINER \*/}

&#x20;           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">

&#x20;             <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 290px)' }}>

&#x20;               <table className="w-full text-sm text-left whitespace-nowrap border-collapse">

&#x20;                 <thead className="text-xs text-slate-600 uppercase bg-slate-100 sticky top-0 z-20 shadow-xs">

&#x20;                   <tr>

&#x20;                     {/\* Name Header - Sticky Left 1 \*/}

&#x20;                     <th className="px-4 py-3 border-r sticky left-0 bg-slate-100 z-30 w-\[160px] min-w-\[160px] max-w-\[160px] truncate text-slate-700 font-bold border-b border-slate-200">

&#x20;                       Nama (Fingerprint)

&#x20;                     </th>

&#x20;                     {/\* Official Name Header - Sticky Left 2 \*/}

&#x20;                     <th className="px-4 py-3 border-r sticky left-\[160px] bg-indigo-100 text-indigo-900 z-30 w-\[180px] min-w-\[180px] max-w-\[180px] truncate font-bold border-b border-slate-200">

&#x20;                       Nama Resmi

&#x20;                     </th>

&#x20;                     

&#x20;                     <th className="px-3 py-3 border-r text-center w-\[55px] min-w-\[55px] border-b border-slate-200" title="Total Scan 1 (Check In)">CI</th>

&#x20;                     <th className="px-3 py-3 border-r text-center text-rose-600 w-\[60px] min-w-\[60px] border-b border-slate-200" title="Selisih HK - CI">OFF</th>

&#x20;                     

&#x20;                     {/\* DYNAMIC DATE COLUMNS \*/}

&#x20;                     {processedData.dates.map(date => {

&#x20;                       const { dayName, isRedDay } = getDayInfo(date);

&#x20;                       return (

&#x20;                         <th key={date} className="px-2 py-2 border-r text-center min-w-\[90px] w-\[90px] border-b border-slate-200 bg-slate-100">

&#x20;                           <div className={`text-\[9px] tracking-wider mb-0.5 uppercase font-extrabold ${isRedDay ? 'text-rose-600' : 'text-slate-500'}`}>

&#x20;                             {dayName}

&#x20;                           </div>

&#x20;                           <div className="text-xs font-bold text-slate-700">

&#x20;                             {date.substring(0, 5)}

&#x20;                           </div>

&#x20;                         </th>

&#x20;                       );

&#x20;                     })}

&#x20;                     

&#x20;                     {/\* SUMMARY HEADERS - Sticky Right \*/}

&#x20;                     <th className="px-3 py-3 text-center bg-indigo-100 text-indigo-900 sticky right-\[150px] z-30 font-bold border-l border-indigo-200 border-b border-slate-200 w-\[70px] min-w-\[70px] max-w-\[70px]">

&#x20;                       Total HK

&#x20;                     </th>

&#x20;                     <th className="px-3 py-3 text-center bg-purple-100 text-purple-900 sticky right-\[100px] z-30 font-bold border-b border-slate-200 w-\[50px] min-w-\[50px] max-w-\[50px]">

&#x20;                       Izin

&#x20;                     </th>

&#x20;                     <th className="px-3 py-3 text-center bg-sky-100 text-sky-900 sticky right-\[50px] z-30 font-bold border-b border-slate-200 w-\[50px] min-w-\[50px] max-w-\[50px]">

&#x20;                       Sakit

&#x20;                     </th>

&#x20;                     <th className="px-3 py-3 text-center bg-teal-100 text-teal-900 sticky right-0 z-30 font-bold border-b border-slate-200 w-\[50px] min-w-\[50px] max-w-\[50px]">

&#x20;                       Cuti

&#x20;                     </th>

&#x20;                   </tr>

&#x20;                 </thead>

&#x20;                 <tbody>

&#x20;                   {processedData.employees.map((emp, idx) => (

&#x20;                     <tr key={idx} className="border-b border-slate-150 hover:bg-slate-50 group transition-all">

&#x20;                       {/\* Name - Sticky Left 1 \*/}

&#x20;                       <td className="px-4 py-2 border-r sticky left-0 bg-white group-hover:bg-slate-50 z-10 text-slate-500 text-xs w-\[160px] min-w-\[160px] max-w-\[160px] truncate">

&#x20;                         {emp.originalName}

&#x20;                       </td>

&#x20;                       {/\* Official Name - Sticky Left 2 (Solid Background to prevent scroll-through bleed) \*/}

&#x20;                       <td className="px-4 py-2 border-r sticky left-\[160px] bg-indigo-50 group-hover:bg-indigo-100/90 z-10 font-bold text-indigo-950 text-xs w-\[180px] min-w-\[180px] max-w-\[180px] truncate">

&#x20;                         {emp.officialName}

&#x20;                       </td>

&#x20;                       

&#x20;                       <td className="px-3 py-2 border-r text-center font-bold text-slate-700 w-\[55px] min-w-\[55px] text-xs">

&#x20;                         {emp.ci}

&#x20;                       </td>

&#x20;                       <td className="px-3 py-2 border-r text-center font-extrabold text-rose-500 w-\[60px] min-w-\[60px] text-xs">

&#x20;                         {emp.off}

&#x20;                       </td>

&#x20;                       

&#x20;                       {/\* DYNAMIC DROPDOWN STATUS SELECTION \*/}

&#x20;                       {processedData.dates.map(date => {

&#x20;                         const status = emp.dailyStatus\[date];

&#x20;                         return (

&#x20;                           <td key={date} className="px-1.5 py-1.5 border-r text-center min-w-\[90px] w-\[90px]">

&#x20;                             <select 

&#x20;                               value={status}

&#x20;                               onChange={(e) => handleStatusChange(emp.officialName, date, e.target.value)}

&#x20;                               className={`w-full text-center text-xs font-bold rounded-lg py-1 px-1 border border-slate-200/40 cursor-pointer outline-none transition-all ${getStatusColor(status)} shadow-xs`}

&#x20;                               title={`Ubah status ${emp.officialName} tanggal ${date}`}

&#x20;                             >

&#x20;                               {statusOptions.map(opt => (

&#x20;                                 <option key={opt} value={opt} className="bg-white text-slate-800 font-semibold">{opt}</option>

&#x20;                               ))}

&#x20;                             </select>

&#x20;                           </td>

&#x20;                         );

&#x20;                       })}

&#x20;                       

&#x20;                       {/\* SUMMARY COLUMNS - Sticky Right (Solid Backgrounds to avoid bleed) \*/}

&#x20;                       <td className="px-3 py-2 text-center bg-indigo-50 group-hover:bg-indigo-100 font-extrabold text-indigo-800 sticky right-\[150px] z-10 border-l border-indigo-100 text-xs w-\[70px] min-w-\[70px] max-w-\[70px]">

&#x20;                         {emp.totalHk}

&#x20;                       </td>

&#x20;                       <td className="px-3 py-2 text-center bg-purple-50 group-hover:bg-purple-100 text-purple-700 font-bold sticky right-\[100px] z-10 text-xs w-\[50px] min-w-\[50px] max-w-\[50px]">

&#x20;                         {emp.totalI}

&#x20;                       </td>

&#x20;                       <td className="px-3 py-2 text-center bg-sky-50 group-hover:bg-sky-100 text-sky-700 font-bold sticky right-\[50px] z-10 text-xs w-\[50px] min-w-\[50px] max-w-\[50px]">

&#x20;                         {emp.totalS}

&#x20;                       </td>

&#x20;                       <td className="px-3 py-2 text-center bg-teal-50 group-hover:bg-teal-100 text-teal-700 font-bold sticky right-0 z-10 text-xs w-\[50px] min-w-\[50px] max-w-\[50px]">

&#x20;                         {emp.totalC}

&#x20;                       </td>

&#x20;                     </tr>

&#x20;                   ))}

&#x20;                 </tbody>

&#x20;               </table>

&#x20;             </div>

&#x20;             <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">

&#x20;               <span className="font-medium">Total Karyawan Terdaftar: <strong className="text-slate-700 font-bold">{processedData.employees.length}</strong></span>

&#x20;               <span className="text-\[11px] bg-slate-200 px-2.5 py-1 rounded-md text-slate-600 font-medium">Diurutkan berdasarkan Nama Resmi (A to Z)</span>

&#x20;             </div>

&#x20;           </div>

&#x20;         </div>

&#x20;       )}

&#x20;     </main>



&#x20;     {/\* EXCEL SUMMARY PREVIEW MODAL \*/}

&#x20;     {isPreviewOpen \&\& (

&#x20;       <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">

&#x20;         <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-\[90vh] border border-slate-200">

&#x20;           

&#x20;           <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">

&#x20;             <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">

&#x20;               <FileText size={18} className="text-emerald-600"/> 

&#x20;               Preview Output Laporan Summary

&#x20;             </h3>

&#x20;             <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition">

&#x20;               <X size={20} />

&#x20;             </button>

&#x20;           </div>

&#x20;           

&#x20;           <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-100">

&#x20;             

&#x20;             {/\* EXCEL SHEET BOARD \*/}

&#x20;             <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200 space-y-4 font-mono text-xs">

&#x20;               

&#x20;               {/\* Excel Headers styling \*/}

&#x20;               <div className="text-center space-y-1">

&#x20;                 <h2 className="text-lg font-bold text-slate-900 tracking-wider">DASHBOARD PRESENSI OFFICE</h2>

&#x20;                 <p className="text-xs font-semibold text-slate-500 uppercase">

&#x20;                   PERIODE MARET ({processedData.dates\[0] || 'TGL MULAI'} - {processedData.dates\[processedData.dates.length - 1] || 'TGL AKHIR'})

&#x20;                 </p>

&#x20;               </div>



&#x20;               <div className="overflow-x-auto border border-slate-200 rounded-lg">

&#x20;                 <table className="w-full text-left border-collapse bg-white">

&#x20;                   <thead>

&#x20;                     <tr className="bg-slate-100 border-b border-slate-300">

&#x20;                       <th className="px-3 py-2.5 border-r border-slate-200 text-center font-bold text-slate-700 w-12">No.</th>

&#x20;                       <th className="px-4 py-2.5 border-r border-slate-200 font-bold text-slate-700">Nama Karyawan</th>

&#x20;                       <th className="px-3 py-2.5 border-r border-slate-200 text-center font-bold text-slate-700">Total Terlambat</th>

&#x20;                       <th className="px-3 py-2.5 border-r border-slate-200 text-center font-bold text-slate-700">Izin Dokter</th>

&#x20;                       <th className="px-3 py-2.5 border-r border-slate-200 text-center font-bold text-slate-700">Cuti</th>

&#x20;                       <th className="px-3 py-2.5 border-r border-slate-200 text-center font-bold text-slate-500 italic">Lembur/Jam</th>

&#x20;                       <th className="px-3 py-2.5 border-r border-slate-200 text-center font-bold text-slate-700">Total Izin Akhir</th>

&#x20;                       <th className="px-3 py-2.5 border-r border-slate-200 text-center font-bold text-slate-500 italic">Ket</th>

&#x20;                       <th className="px-3 py-2.5 text-center font-bold text-slate-500 italic">Sisa Cuti</th>

&#x20;                     </tr>

&#x20;                   </thead>

&#x20;                   <tbody>

&#x20;                     {processedData.employees.map((emp, idx) => (

&#x20;                       <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50/50">

&#x20;                         <td className="px-3 py-2 border-r border-slate-200 text-center text-slate-500">{idx + 1}</td>

&#x20;                         <td className="px-4 py-2 border-r border-slate-200 font-bold text-slate-800">{emp.officialName}</td>

&#x20;                         <td className="px-3 py-2 border-r border-slate-200 text-center font-semibold text-amber-700 bg-amber-50/20">

&#x20;                           {emp.totalTerlambat > 0 ? emp.totalTerlambat : ''}

&#x20;                         </td>

&#x20;                         <td className="px-3 py-2 border-r border-slate-200 text-center font-semibold text-sky-700 bg-sky-50/20">

&#x20;                           {emp.totalS > 0 ? emp.totalS : ''}

&#x20;                         </td>

&#x20;                         <td className="px-3 py-2 border-r border-slate-200 text-center font-semibold text-teal-700 bg-teal-50/20">

&#x20;                           {emp.totalC > 0 ? emp.totalC : ''}

&#x20;                         </td>

&#x20;                         <td className="px-3 py-2 border-r border-slate-200 text-center text-slate-400 italic bg-slate-50/30"></td>

&#x20;                         <td className="px-3 py-2 border-r border-slate-200 text-center font-semibold text-purple-700 bg-purple-50/20">

&#x20;                           {emp.totalI > 0 ? emp.totalI : ''}

&#x20;                         </td>

&#x20;                         <td className="px-3 py-2 border-r border-slate-200 text-center text-slate-400 italic bg-slate-50/30"></td>

&#x20;                         <td className="px-3 py-2 text-center text-slate-400 italic bg-slate-50/30"></td>

&#x20;                       </tr>

&#x20;                     ))}

&#x20;                   </tbody>

&#x20;                 </table>

&#x20;               </div>



&#x20;             </div>



&#x20;           </div>

&#x20;           

&#x20;           <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">

&#x20;             <button 

&#x20;               onClick={downloadSummaryCSV}

&#x20;               className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2"

&#x20;             >

&#x20;               <Download size={14} />

&#x20;               <span>Download XLS/CSV Summary</span>

&#x20;             </button>

&#x20;             <button 

&#x20;               onClick={() => setIsPreviewOpen(false)}

&#x20;               className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs"

&#x20;             >

&#x20;               Tutup

&#x20;             </button>

&#x20;           </div>



&#x20;         </div>

&#x20;       </div>

&#x20;     )}



&#x20;     {/\* SETTINGS / NAME MAPPING MODAL \*/}

&#x20;     {isSettingsOpen \&\& (

&#x20;       <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">

&#x20;         <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-\[90vh] border border-slate-200">

&#x20;           

&#x20;           <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">

&#x20;             <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">

&#x20;               <Settings size={18} className="text-indigo-600"/> 

&#x20;               Pengaturan Nama Resmi

&#x20;             </h3>

&#x20;             <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition">

&#x20;               <X size={20} />

&#x20;             </button>

&#x20;           </div>

&#x20;           

&#x20;           <div className="p-6 overflow-y-auto flex-1 space-y-6">

&#x20;             <p className="text-xs text-slate-600 leading-relaxed bg-blue-50/50 p-4 rounded-xl border border-blue-100">

&#x20;               Gunakan menu ini untuk memetakan nama mentah keluaran mesin fingerprint ke nama resmi karyawan untuk pelaporan. Nama Resmi inilah yang akan muncul sebagai acuan utama di ringkasan absensi.

&#x20;             </p>



&#x20;             {/\* BATCH IMPORT EXPORT BUBBLE \*/}

&#x20;             <div className="flex flex-col md:flex-row gap-4 bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 items-start md:items-center justify-between">

&#x20;               <div className="text-xs text-indigo-900">

&#x20;                 <p className="font-extrabold text-sm mb-0.5">Ekspor \& Impor Pemetaan Massal</p>

&#x20;                 <p className="opacity-90 leading-relaxed max-w-md">Download template yang otomatis mencatat seluruh nama fingerprint unik dari data aktif Anda, isi Nama Resmi di Excel, lalu upload kembali berkas tersebut.</p>

&#x20;               </div>

&#x20;               <div className="flex gap-2 w-full md:w-auto">

&#x20;                 <button 

&#x20;                   onClick={exportMappingTemplate}

&#x20;                   className="flex-1 md:flex-none justify-center bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-2 rounded-xl flex items-center gap-2 transition text-xs font-bold shadow-xs"

&#x20;                 >

&#x20;                   <Download size={14} /> Ekspor Template

&#x20;                 </button>

&#x20;                 <label className="flex-1 md:flex-none justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition text-xs font-bold shadow-xs cursor-pointer">

&#x20;                   <Upload size={14} /> Impor CSV

&#x20;                   <input type="file" accept=".csv" className="hidden" onChange={handleImportMapping} />

&#x20;                 </label>

&#x20;               </div>

&#x20;             </div>



&#x20;             {/\* Manual Mapping Form \*/}

&#x20;             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">

&#x20;               <p className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Tambah Aturan Manual</p>

&#x20;               <div className="flex flex-col md:flex-row gap-3 items-end">

&#x20;                 <div className="flex-1 w-full">

&#x20;                   <label className="block text-\[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Fingerprint</label>

&#x20;                   <input 

&#x20;                     type="text" 

&#x20;                     placeholder="Contoh: Budi S."

&#x20;                     value={tempMappingKey}

&#x20;                     onChange={(e) => setTempMappingKey(e.target.value)}

&#x20;                     className="w-full px-3.5 py-2 border border-slate-300 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs"

&#x20;                   />

&#x20;                 </div>

&#x20;                 <div className="flex-1 w-full">

&#x20;                   <label className="block text-\[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Resmi</label>

&#x20;                   <input 

&#x20;                     type="text" 

&#x20;                     placeholder="Contoh: Budi Santoso"

&#x20;                     value={tempMappingValue}

&#x20;                     onChange={(e) => setTempMappingValue(e.target.value)}

&#x20;                     className="w-full px-3.5 py-2 border border-slate-300 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs"

&#x20;                   />

&#x20;                 </div>

&#x20;                 <button 

&#x20;                   onClick={addMapping}

&#x20;                   className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition text-xs font-bold shadow-xs h-\[34px] w-full md:w-auto justify-center"

&#x20;                 >

&#x20;                   <Plus size={14} /> Tambah

&#x20;                 </button>

&#x20;               </div>

&#x20;             </div>



&#x20;             {/\* Current Mapping List \*/}

&#x20;             <div className="space-y-2">

&#x20;               <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-100">

&#x20;                 Daftar Pemetaan Aktif ({Object.keys(nameMapping).length})

&#x20;               </h4>

&#x20;               {Object.keys(nameMapping).length === 0 ? (

&#x20;                 <div className="text-center py-6 text-slate-400 text-xs italic">Belum ada pemetaan nama. Semua nama menggunakan data fingerprint asli.</div>

&#x20;               ) : (

&#x20;                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-\[220px] overflow-y-auto pr-1">

&#x20;                   {Object.entries(nameMapping).map((\[finger, resmi]) => (

&#x20;                     <div key={finger} className="flex justify-between items-center p-2.5 border border-slate-200 rounded-lg bg-white shadow-2xs hover:border-slate-300 transition">

&#x20;                       <div className="overflow-hidden mr-2">

&#x20;                         <div className="text-\[10px] text-slate-400 font-mono line-clamp-1">{finger}</div>

&#x20;                         <div className="text-xs font-bold text-slate-700 line-clamp-1">{resmi}</div>

&#x20;                       </div>

&#x20;                       <button 

&#x20;                         onClick={() => removeMapping(finger)}

&#x20;                         className="text-rose-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition flex-shrink-0"

&#x20;                         title="Hapus pemetaan"

&#x20;                       >

&#x20;                         <Trash2 size={14} />

&#x20;                       </button>

&#x20;                     </div>

&#x20;                   ))}

&#x20;                 </div>

&#x20;               )}

&#x20;             </div>



&#x20;           </div>

&#x20;           

&#x20;           <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end">

&#x20;             <button 

&#x20;               onClick={() => setIsSettingsOpen(false)}

&#x20;               className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-xs"

&#x20;             >

&#x20;               Simpan \& Terapkan

&#x20;             </button>

&#x20;           </div>



&#x20;         </div>

&#x20;       </div>

&#x20;     )}



&#x20;   </div>

&#x20; );

}

