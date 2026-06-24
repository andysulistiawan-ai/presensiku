import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Upload, Settings, Save, X, Plus, Trash2, AlertCircle, 
  Download, FileText, CheckCircle2, AlertTriangle, Users, 
  Eye, Sun, Moon, HelpCircle, FileSpreadsheet, ChevronDown
} from 'lucide-react';

export default function App() {
  // --- States ---
  const [rawData, setRawData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Theme State
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('presensiku_theme') || 'light';
    }
    return 'light';
  });

  // Global Parameters
  const [hk, setHk] = useState(22); // Hari Kerja default
  const [isHkEdited, setIsHkEdited] = useState(false); // Mode auto atau manual untuk HK
  const [onTimeLimit, setOnTimeLimit] = useState('08:00:59'); // Batas On Time Baru
  const [maxCi, setMaxCi] = useState('09:00:59');
  const [minCo, setMinCo] = useState('15:00:00');
  
  // Overrides & Mappings
  // overrides format: { "NamaResmi_Tanggal": "Value" }
  const [overrides, setOverrides] = useState({});
  
  // nameMapping format: { "NamaFinger": "Nama Resmi" }
  const [nameMapping, setNameMapping] = useState(() => {
    try {
      const saved = localStorage.getItem('attendance_name_mapping');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Save Name Mapping to LocalStorage to persist setups
  useEffect(() => {
    localStorage.setItem('attendance_name_mapping', JSON.stringify(nameMapping));
  }, [nameMapping]);

  // Apply root theme class
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('presensiku_theme', theme);
  }, [theme]);
  
  // UI States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false); // State untuk modal preview summary
  const [tempMappingKey, setTempMappingKey] = useState('');
  const [tempMappingValue, setTempMappingValue] = useState('');

  // --- Helper Functions ---
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const timeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    const hrs = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    const secs = parts[2] ? (parseInt(parts[2], 10) || 0) : 0;
    return hrs * 3600 + mins * 60 + secs;
  };

  const titleCase = (str) => {
    if (!str) return str;
    return str.replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(0);
    const [d, m, y] = parts;
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  };

  const getDayInfo = (dateStr) => {
    const date = parseDate(dateStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = days[date.getDay()];
    // Hari Sabtu dan Minggu berwarna merah
    const isRedDay = dayName === 'Sabtu' || dayName === 'Minggu';
    return { dayName, isRedDay };
  };

  // Robust CSV Parser with smart delimiter detector
  const parseCSV = (text) => {
    // Smart Delimiter Detection: Semicolon (Indonesian config) vs Comma
    const firstLine = text.split('\n')[0];
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i+1];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        row.push('');
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
        lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    
    if (lines.length < 2) return [];
    const headers = lines[0].map(h => h.trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i];
      if (values.length < headers.length) continue;
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = (values[idx] || '').trim();
      });
      data.push(obj);
    }
    return data;
  };

  const processTextData = (text, name) => {
    const parsed = parseCSV(text);
    if (parsed.length > 0) {
      setRawData(parsed);
      setFileName(name);
      setOverrides({}); // Reset manual adjustment jika upload file baru
      setIsHkEdited(false); // Kembalikan HK ke mode Auto
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      processTextData(event.target.result, file.name);
    };
    reader.readAsText(file);
  };

  // Drag and Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        processTextData(event.target.result, file.name);
      };
      reader.readAsText(file);
    }
  };

  // --- Core Logic & Data Transformation ---
  const processedData = useMemo(() => {
    if (rawData.length === 0) return { dates: [], employees: [], maxCalculatedHk: 0, alertCount: 0 };

    // 1. Ambil & Urutkan Tanggal Secara Unik
    const uniqueDatesSet = new Set();
    rawData.forEach(row => {
      if (row.Tanggal) uniqueDatesSet.add(row.Tanggal);
    });
    const sortedDates = Array.from(uniqueDatesSet).sort((a, b) => parseDate(a) - parseDate(b));

    // 2. Kelompokkan Data Berdasarkan Nama Fingerprint -> Di-mapping ke Nama Resmi
    const employeeMap = {};
    
    rawData.forEach(row => {
      const fingerName = row.Nama;
      if (!fingerName) return;
      
      const officialName = titleCase(nameMapping[fingerName] || fingerName);
      
      if (!employeeMap[officialName]) {
        employeeMap[officialName] = {
          originalName: fingerName,
          officialName: officialName,
          records: {},
          ciCount: 0
        };
      }
      
      if (row.Tanggal) {
        employeeMap[officialName].records[row.Tanggal] = row;
        // Hitung CI murni (jika ada jam masuk / Scan 1)
        if (row['Scan 1']) {
          employeeMap[officialName].ciCount += 1;
        }
      }
    });

    // 3. Proses Status Absensi Masing-masing Karyawan
    const employees = Object.values(employeeMap).sort((a, b) => a.officialName.localeCompare(b.officialName));
    
    const onTimeSec = timeToSeconds(onTimeLimit);
    const maxCiSec = timeToSeconds(maxCi);
    const minCoSec = timeToSeconds(minCo);
    const saturdayMinCoSec = timeToSeconds('13:58:00'); // Batas khusus hari Sabtu

    let maxCalculatedHk = 0;
    let alertCount = 0;

    const finalEmployees = employees.map(emp => {
      const rowData = {
        originalName: emp.originalName,
        officialName: emp.officialName,
        ci: emp.ciCount,
        off: 0, // Akan dihitung setelah nilai HK ditentukan
        dailyStatus: {},
        dailyLate: {}, // Menyimpan status terlambat per hari
        totalHk: 0,
        totalI: 0,
        totalS: 0,
        totalC: 0,
        totalTerlambat: 0 // Menyimpan jumlah hari terlambat (Batas On Time s/d MAX CI)
      };

      sortedDates.forEach(date => {
        const record = emp.records[date];
        const overrideKey = `${emp.officialName}_${date}`;
        let status = '0'; // Default jika karyawan tidak absen di tanggal tersebut (Kondisi A)
        
        // Deteksi hari untuk menentukan target batas pulang
        const { dayName } = getDayInfo(date);
        const currentMinCoSec = dayName === 'Sabtu' ? saturdayMinCoSec : minCoSec;

        if (record) {
          const scan1 = record['Scan 1'];
          const scan2 = record['Scan 2'];

          if (scan1 && !scan2) {
            status = 'NO CO'; // Kondisi C
          } else if (scan1 && scan2) {
            const s1Sec = timeToSeconds(scan1);
            const s2Sec = timeToSeconds(scan2);

            // Kondisi B: Tepat waktu masuk & tepat waktu pulang (atau lebih)
            if (s1Sec <= maxCiSec && s2Sec >= currentMinCoSec) {
              status = '1';
            } 
            // Kondisi D: Terlambat masuk, tapi pulang sesuai jadwal (atau lebih)
            else if (s1Sec > maxCiSec && s2Sec >= currentMinCoSec) {
              status = '0.5';
            }
            // Kondisi E: Tepat waktu masuk, tapi pulang lebih cepat
            else if (s1Sec <= maxCiSec && s2Sec < currentMinCoSec) {
              status = '0.5';
            }
            // Terlambat masuk & pulang lebih cepat
            else if (s1Sec > maxCiSec && s2Sec < currentMinCoSec) {
              status = '0.5';
            }
          }
        }

        // Terapkan penyesuaian manual (Override) jika ada
        const finalStatus = overrides[overrideKey] !== undefined ? overrides[overrideKey] : status;
        rowData.dailyStatus[date] = finalStatus;

        // Hitung total ringkasan per karyawan
        if (finalStatus === '1') rowData.totalHk += 1;
        if (finalStatus === '0.5') rowData.totalHk += 0.5;
        if (finalStatus === 'I') rowData.totalI += 1;
        if (finalStatus === 'S') rowData.totalS += 1;
        if (finalStatus === 'C') rowData.totalC += 1;
        if (finalStatus === 'NO CO') alertCount += 1;
      });

      // Hitung Frekuensi Terlambat (Scan 1 berada di antara Batas On Time & Batas Telat)
      sortedDates.forEach(date => {
        const record = emp.records[date];
        if (record && record['Scan 1']) {
          const s1Sec = timeToSeconds(record['Scan 1']);
          if (s1Sec >= onTimeSec && s1Sec <= maxCiSec) {
            rowData.totalTerlambat += 1;
            rowData.dailyLate[date] = true;
          }
        }
      });

      // Cari nilai HK tertinggi dari seluruh karyawan
      if (rowData.totalHk > maxCalculatedHk) {
        maxCalculatedHk = rowData.totalHk;
      }

      return rowData;
    });

    // Hitung ulang kolom OFF setelah nilai HK final/akhir didapatkan
    const calculatedHkValue = isHkEdited ? hk : maxCalculatedHk;
    finalEmployees.forEach(emp => {
      emp.off = Math.max(0, calculatedHkValue - emp.ci);
    });

    return { dates: sortedDates, employees: finalEmployees, maxCalculatedHk, alertCount };
  }, [rawData, nameMapping, hk, onTimeLimit, maxCi, minCo, overrides, isHkEdited]);

  // Efek untuk otomatis menyetel nilai HK sesuai dengan nilai tertinggi di kolom Total HK
  useEffect(() => {
    if (!isHkEdited && processedData.maxCalculatedHk !== undefined) {
      if (hk !== processedData.maxCalculatedHk && processedData.maxCalculatedHk > 0) {
        setHk(processedData.maxCalculatedHk);
      }
    }
  }, [processedData.maxCalculatedHk, isHkEdited, hk]);

  // --- Handlers ---
  const handleStatusChange = (officialName, date, newValue) => {
    setOverrides(prev => ({
      ...prev,
      [`${officialName}_${date}`]: newValue
    }));
  };

  const addMapping = () => {
    if (tempMappingKey.trim() && tempMappingValue.trim()) {
      setNameMapping(prev => ({
        ...prev,
        [tempMappingKey.trim()]: tempMappingValue.trim()
      }));
      setTempMappingKey('');
      setTempMappingValue('');
    }
  };

  const removeMapping = (key) => {
    const newMap = { ...nameMapping };
    delete newMap[key];
    setNameMapping(newMap);
  };

  // --- Batch Import/Export Mappings ---
  const exportMappingTemplate = () => {
    let csvContent = "Nama Fingerprint,Nama Resmi\n";
    const uniqueNames = new Set();
    rawData.forEach(row => {
      if (row.Nama) uniqueNames.add(row.Nama);
    });

    if (uniqueNames.size > 0) {
      Array.from(uniqueNames).forEach(name => {
        const resmi = nameMapping[name] || '';
        csvContent += `"${name}","${resmi}"\n`;
      });
    } else {
      // Fallback contoh jika belum ada data yang diupload
      Object.entries(nameMapping).forEach(([finger, resmi]) => {
        csvContent += `"${finger}","${resmi}"\n`;
      });
      if (Object.keys(nameMapping).length === 0) {
        csvContent += `"Contoh Fingerprint","Nama Resmi Karyawan"\n`;
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Template_Mapping_Nama_Resmi.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportMapping = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
      if (lines.length < 2) return;

      const newMapping = { ...nameMapping };
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
        if (match.length >= 2) {
          const finger = match[0].replace(/^"|"$/g, '').trim();
          const resmi = match[1].replace(/^"|"$/g, '').trim();
          if (finger && resmi) {
            newMapping[finger] = resmi;
          }
        }
      }
      setNameMapping(newMapping);
    };
    reader.readAsText(file);
    e.target.value = null; // Reset file input
  };

  // --- Export Summary Excel-Style CSV ---
  const downloadSummaryCSV = () => {
    let csvContent = "\uFEFF"; // BOM untuk UTF-8 Microsoft Excel
    csvContent += "DASHBOARD PRESENSI OFFICE,,,,,,,\n";
    const startD = processedData.dates[0] || 'Tgl Mulai';
    const endD = processedData.dates[processedData.dates.length - 1] || 'Tgl Akhir';
    csvContent += `PERIODE (${startD} - ${endD}),,,,,,,\n\n`;
    csvContent += "No.,Nama Karyawan,Total Terlambat,Izin Dokter,Cuti,Lembur/Jam,Total Izin Akhir,Ket,Sisa Cuti\n";

    processedData.employees.forEach((emp, index) => {
      const totalTerlambat = emp.totalTerlambat > 0 ? emp.totalTerlambat : 0;
      const izinDokter = emp.totalS > 0 ? emp.totalS : 0;
      const cuti = emp.totalC > 0 ? emp.totalC : 0;
      const totalIzinAkhir = emp.totalI > 0 ? emp.totalI : 0;
      csvContent += `${index + 1},"${emp.officialName}",${totalTerlambat},${izinDokter},${cuti},,${totalIzinAkhir},,\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `DASHBOARD_PRESENSI_${startD}_S_D_${endD}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Dropdown Options & Coloring ---
  const statusOptions = ['0', '1', 'NO CO', '0.5', 'S', 'I', 'C'];

  const getStatusColor = (status) => {
    switch(status) {
      case '1': 
        return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-950/60 border-emerald-300/50 dark:border-emerald-800/40';
      case '0': 
        return 'bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/30 border-rose-200/50 dark:border-rose-900/30';
      case '0.5': 
        return 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-950/60 border-amber-300/50 dark:border-amber-800/40';
      case 'NO CO': 
        return 'bg-rose-600 dark:bg-rose-700 text-white font-bold animate-pulse hover:bg-rose-700 dark:hover:bg-rose-600 border-rose-700 dark:border-rose-600';
      case 'S': 
        return 'bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-950/60 border-sky-300/50 dark:border-sky-800/40';
      case 'I': 
        return 'bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-950/60 border-purple-300/50 dark:border-purple-800/40';
      case 'C': 
        return 'bg-teal-100 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-950/60 border-teal-300/50 dark:border-teal-800/40';
      default: 
        return 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-300 border-slate-200 dark:border-zinc-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 font-sans transition-colors duration-300 flex flex-col">
      
      {/* HEADER BAR */}
      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/10">
            <FileSpreadsheet size={22} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Presensiku
              <span className="text-[10px] tracking-widest font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30">v1.1</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Analisis instan & penyesuaian data absensi sidik jari</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {rawData.length > 0 && (
            <button 
              onClick={() => setIsPreviewOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white px-4.5 py-2.5 rounded-xl transition-all duration-300 shadow-md shadow-emerald-600/10 dark:shadow-none hover:shadow-lg text-sm font-semibold cursor-pointer"
            >
              <Eye size={16} />
              <span>Preview Summary</span>
            </button>
          )}

          <label className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white px-4.5 py-2.5 rounded-xl cursor-pointer transition-all duration-300 shadow-md shadow-indigo-600/10 dark:shadow-none hover:shadow-lg text-sm font-semibold">
            <Upload size={16} />
            <span>Upload CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-200 px-4.5 py-2.5 rounded-xl transition-all duration-300 shadow-xs text-sm font-semibold cursor-pointer"
          >
            <Settings size={16} />
            <span>Nama Resmi</span>
          </button>

          <button 
            onClick={toggleTheme}
            className="p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-750 text-slate-500 dark:text-zinc-400 transition-all cursor-pointer shadow-xs"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="p-6 space-y-6 flex-1 flex flex-col justify-start">
        
        {rawData.length === 0 ? (
          /* EMPTY STATE */
          <div className="flex-1 flex items-center justify-center py-10">
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full max-w-xl p-12 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-500 bg-white dark:bg-zinc-900/50 ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 scale-[1.02] shadow-2xl shadow-indigo-500/5 dark:shadow-none' 
                  : 'border-slate-300 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-zinc-700 shadow-xs hover:shadow-md'
              }`}
            >
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload} 
              />
              <div className={`p-6 rounded-2xl mb-5 transition-all duration-500 ${
                isDragging 
                  ? 'bg-indigo-500 text-white scale-110 rotate-6 shadow-lg shadow-indigo-500/20' 
                  : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-105'
              }`}>
                <Upload size={38} className={isDragging ? 'animate-bounce' : ''} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Unggah Data Fingerprint Anda</h2>
              <p className="text-slate-500 dark:text-zinc-400 text-sm max-w-sm mb-6 leading-relaxed">
                Tarik dan lepas berkas <strong className="text-slate-700 dark:text-zinc-200">CSV</strong> absensi di sini, atau klik untuk memilih file dari perangkat Anda.
              </p>
              
              <div className="flex gap-3 text-[11px] text-slate-400 dark:text-zinc-500 font-medium">
                <span className="bg-slate-100 dark:bg-zinc-800 px-3 py-1 rounded-md">Separasi Komo/Semicolon</span>
                <span className="bg-slate-100 dark:bg-zinc-800 px-3 py-1 rounded-md">Real-time Pemetaan</span>
              </div>
            </div>
          </div>
        ) : (
          /* WORKSPACE ACTIVE */
          <div className="space-y-6 animate-fade-in-up">
            
            {/* STATS & PARAMETERS LAYOUT */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* PARAMETERS SECTIONS */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-xs border border-slate-200/80 dark:border-zinc-800 xl:col-span-2">
                <div className="flex items-center gap-2 mb-5 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800 pb-3">
                  <Settings size={14} />
                  <span>Parameter Perhitungan Global</span>
                </div>
                
                {/* ALIGNED INPUT PANEL */}
                <div className="flex flex-wrap gap-5 items-start">
                  
                  {/* Hari Kerja (HK) */}
                  <div className="flex flex-col">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Hari Kerja (HK)</label>
                    <input 
                      type="number" 
                      step="0.5"
                      value={hk} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setIsHkEdited(false);
                          setHk(processedData.maxCalculatedHk || 0);
                        } else {
                          setIsHkEdited(true);
                          setHk(Number(val));
                        }
                      }}
                      className={`w-28 px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm ${
                        !isHkEdited 
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400 font-bold shadow-xs shadow-indigo-500/5' 
                          : 'border-slate-250 dark:border-zinc-700 text-slate-800 dark:text-zinc-150 font-semibold bg-white dark:bg-zinc-850'
                      }`}
                      title={!isHkEdited ? "Nilai otomatis diambil dari Max Total HK karyawan" : "Nilai disunting manual"}
                    />
                    <div className="mt-1.5 min-h-[20px]">
                      {!isHkEdited && (
                        <span className="text-[9px] text-indigo-600 dark:text-indigo-450 font-bold bg-indigo-50/80 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-100/50 dark:border-indigo-900/30 whitespace-nowrap">
                          *Auto Max HK
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Batas On Time (BARU) */}
                  <div className="flex flex-col">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Batas On Time</label>
                    <input 
                      type="time" step="1" 
                      value={onTimeLimit} 
                      onChange={(e) => setOnTimeLimit(e.target.value)}
                      className="w-36 px-3.5 py-2.5 border border-slate-250 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-semibold text-slate-800 dark:text-zinc-150 bg-white dark:bg-zinc-850"
                    />
                    <div className="mt-1.5 min-h-[20px]">
                      <span className="text-[9px] text-indigo-600 dark:text-indigo-450 font-bold bg-indigo-50/80 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-100/50 dark:border-indigo-900/30 whitespace-nowrap">
                        *Terlambat jika &ge; batas ini
                      </span>
                    </div>
                  </div>

                  {/* Batas Telat (MAX CI) */}
                  <div className="flex flex-col">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Batas Telat (MAX CI)</label>
                    <input 
                      type="time" step="1" 
                      value={maxCi} 
                      onChange={(e) => setMaxCi(e.target.value)}
                      className="w-36 px-3.5 py-2.5 border border-slate-250 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-semibold text-slate-800 dark:text-zinc-150 bg-white dark:bg-zinc-850"
                    />
                  </div>

                  {/* Batas Pulang (MIN CO) */}
                  <div className="flex flex-col">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Batas Pulang (MIN CO)</label>
                    <input 
                      type="time" step="1" 
                      value={minCo} 
                      onChange={(e) => setMinCo(e.target.value)}
                      className="w-36 px-3.5 py-2.5 border border-slate-250 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-semibold text-slate-800 dark:text-zinc-150 bg-white dark:bg-zinc-850"
                    />
                    <div className="mt-1.5 min-h-[20px]">
                      <span className="text-[9px] text-amber-600 dark:text-amber-450 font-bold bg-amber-50/80 dark:bg-amber-950/20 px-2 py-0.5 rounded border border-amber-100/50 dark:border-amber-900/30 whitespace-nowrap">
                        *Khusus Sabtu = 13:58
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* QUICK STATS CARDS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow duration-300">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Total Staf</span>
                    <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      <Users size={16} />
                    </span>
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2">{processedData.employees.length}</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1.5 truncate" title={fileName}>File: {fileName}</p>
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-350 ${
                  processedData.alertCount > 0 
                    ? 'bg-rose-50/55 dark:bg-rose-950/10 border-rose-100/85 dark:border-rose-900/20' 
                    : 'bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800'
                }`}>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Laporan NO CO</span>
                    <span className={`p-1.5 rounded-lg transition-colors ${
                      processedData.alertCount > 0 
                        ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-450 animate-pulse' 
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-450'
                    }`}>
                      <AlertTriangle size={16} />
                    </span>
                  </div>
                  <div>
                    <p className={`text-3xl font-extrabold tracking-tight mt-2 ${
                      processedData.alertCount > 0 ? 'text-rose-600 dark:text-rose-450' : 'text-slate-900 dark:text-white'
                    }`}>
                      {processedData.alertCount}
                    </p>
                    <p className="text-[10px] text-slate-450 dark:text-zinc-400 mt-1.5">Checkout kosong (perlu verifikasi)</p>
                  </div>
                </div>
              </div>

            </div>

            {/* INTERACTIVE TABLE CONTAINER */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-250/70 dark:border-zinc-800 overflow-hidden flex flex-col">
              <div className="overflow-x-auto relative" style={{ maxHeight: 'calc(100vh - 310px)' }}>
                <table className="w-full text-sm text-left whitespace-nowrap border-collapse">
                  <thead className="text-[11px] text-slate-650 dark:text-zinc-400 uppercase bg-slate-50 dark:bg-zinc-850 sticky top-0 z-20 shadow-xs border-b border-slate-200/80 dark:border-zinc-800">
                    <tr>
                      {/* Name Header - Sticky Left 1 */}
                      <th className="px-4 py-3.5 border-r border-slate-200/60 dark:border-zinc-800 sticky left-0 bg-slate-50 dark:bg-zinc-850 z-30 w-[160px] min-w-[160px] max-w-[160px] truncate font-bold text-slate-700 dark:text-zinc-300">
                        Nama (Fingerprint)
                      </th>
                      {/* Official Name Header - Sticky Left 2 */}
                      <th className="px-4 py-3.5 border-r border-slate-200/60 dark:border-zinc-800 sticky left-[160px] bg-indigo-50 dark:bg-zinc-850 text-indigo-900 dark:text-indigo-450 z-30 w-[180px] min-w-[180px] max-w-[180px] truncate font-bold">
                        Nama Resmi
                      </th>
                      
                      <th className="px-3 py-3.5 border-r border-slate-200/60 dark:border-zinc-800 text-center w-[55px] min-w-[55px] text-slate-600 dark:text-zinc-400" title="Total Scan 1 (Check In)">CI</th>
                      <th className="px-3 py-3.5 border-r border-slate-200/60 dark:border-zinc-800 text-center text-rose-600 dark:text-rose-450 w-[60px] min-w-[60px]" title="Selisih HK - CI">OFF</th>
                      
                      {/* DYNAMIC DATE COLUMNS */}
                      {processedData.dates.map(date => {
                        const { dayName, isRedDay } = getDayInfo(date);
                        return (
                          <th key={date} className="px-2 py-2 border-r border-slate-200/60 dark:border-zinc-800 text-center min-w-[95px] w-[95px] bg-slate-50 dark:bg-zinc-850">
                            <div className={`text-[8.5px] tracking-wider mb-0.5 uppercase font-black ${isRedDay ? 'text-rose-600 dark:text-rose-450' : 'text-slate-500 dark:text-zinc-500'}`}>
                              {dayName}
                            </div>
                            <div className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                              {date.substring(0, 5)}
                            </div>
                          </th>
                        );
                      })}
                      
                      {/* SUMMARY HEADERS - Sticky Right */}
                      <th className="px-3 py-3.5 text-center bg-indigo-50 dark:bg-zinc-850 text-indigo-900 dark:text-indigo-450 sticky right-[225px] z-30 font-bold border-l border-indigo-200 dark:border-zinc-850 w-[70px] min-w-[70px] max-w-[70px]">
                        Total HK
                      </th>
                      <th className="px-3 py-3.5 text-center bg-purple-50 dark:bg-zinc-850 text-purple-900 dark:text-purple-400 sticky right-[175px] z-30 font-bold border-l border-purple-200/40 dark:border-zinc-850 w-[50px] min-w-[50px] max-w-[50px]">
                        Izin
                      </th>
                      <th className="px-3 py-3.5 text-center bg-sky-50 dark:bg-zinc-850 text-sky-900 dark:text-sky-400 sticky right-[125px] z-30 font-bold border-l border-sky-200/40 dark:border-zinc-850 w-[50px] min-w-[50px] max-w-[50px]">
                        Sakit
                      </th>
                      <th className="px-3 py-3.5 text-center bg-teal-50 dark:bg-zinc-850 text-teal-900 dark:text-teal-450 sticky right-[75px] z-30 font-bold border-l border-teal-200/40 dark:border-zinc-850 w-[50px] min-w-[50px] max-w-[50px]">
                        Cuti
                      </th>
                      <th className="px-3 py-3.5 text-center bg-rose-50 dark:bg-zinc-850 text-rose-900 dark:text-rose-455 sticky right-0 z-30 font-bold border-l border-rose-200/40 dark:border-zinc-850 w-[75px] min-w-[75px] max-w-[75px]">
                        Terlambat
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-zinc-800">
                    {processedData.employees.map((emp, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-850/40 group transition-all duration-150">
                        {/* Name - Sticky Left 1 */}
                        <td className="px-4 py-2 border-r border-slate-200/60 dark:border-zinc-800 sticky left-0 bg-white dark:bg-zinc-900 group-hover:bg-slate-50 dark:group-hover:bg-zinc-850 z-10 text-slate-500 dark:text-zinc-400 text-xs w-[160px] min-w-[160px] max-w-[160px] truncate transition-colors duration-150">
                          {emp.originalName}
                        </td>
                        {/* Official Name - Sticky Left 2 */}
                        <td className="px-4 py-2 border-r border-slate-200/60 dark:border-zinc-800 sticky left-[160px] bg-indigo-50 dark:bg-zinc-900 group-hover:bg-indigo-100 dark:group-hover:bg-zinc-850 z-10 font-bold text-indigo-950 dark:text-indigo-200 text-xs w-[180px] min-w-[180px] max-w-[180px] truncate transition-colors duration-150">
                          {emp.officialName}
                        </td>
                        
                        <td className="px-3 py-2 border-r border-slate-200/60 dark:border-zinc-800 text-center font-bold text-slate-700 dark:text-zinc-300 w-[55px] min-w-[55px] text-xs bg-white dark:bg-zinc-900 group-hover:bg-slate-50/80 dark:group-hover:bg-zinc-850/80 transition-colors duration-150">
                          {emp.ci}
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200/60 dark:border-zinc-800 text-center font-black text-rose-500 dark:text-rose-450 w-[60px] min-w-[60px] text-xs bg-white dark:bg-zinc-900 group-hover:bg-slate-50/80 dark:group-hover:bg-zinc-850/80 transition-colors duration-150">
                          {emp.off}
                        </td>
                        
                        {/* DYNAMIC DROPDOWN STATUS SELECTION */}
                        {processedData.dates.map(date => {
                          const status = emp.dailyStatus[date];
                          const isLate = emp.dailyLate && emp.dailyLate[date];
                          const cellBg = isLate 
                            ? 'bg-rose-200/60 dark:bg-rose-900/40' 
                            : 'bg-white dark:bg-zinc-900';
                          const hoverBg = isLate
                            ? 'group-hover:bg-rose-200/80 dark:group-hover:bg-rose-900/60'
                            : 'group-hover:bg-slate-50/30 dark:group-hover:bg-zinc-850/30';
                          return (
                            <td key={date} className={`px-1.5 py-1.5 border-r border-slate-200/60 dark:border-zinc-800 text-center min-w-[95px] w-[95px] ${cellBg} ${hoverBg} transition-colors duration-150`}>
                              <div className="relative inline-block w-full">
                                <select 
                                  value={status}
                                  onChange={(e) => handleStatusChange(emp.officialName, date, e.target.value)}
                                  className={`w-full text-center text-xs font-bold rounded-lg py-1 px-1.5 border cursor-pointer outline-none transition-all duration-150 ${getStatusColor(status)} shadow-2xs appearance-none`}
                                  title={`Ubah status ${emp.officialName} tanggal ${date}`}
                                >
                                  {statusOptions.map(opt => (
                                    <option key={opt} value={opt} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 font-semibold">{opt}</option>
                                  ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center px-1 text-slate-400 dark:text-zinc-500">
                                  <ChevronDown size={10} className="hidden group-hover:block" />
                                </div>
                              </div>
                            </td>
                          );
                        })}
                        
                        {/* SUMMARY COLUMNS - Sticky Right */}
                        <td className="px-3 py-2 text-center bg-indigo-50 dark:bg-indigo-950 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 font-extrabold text-indigo-800 dark:text-indigo-400 sticky right-[225px] z-10 border-l border-indigo-100 dark:border-indigo-900 text-xs w-[70px] min-w-[70px] max-w-[70px] transition-colors duration-150">
                          {emp.totalHk}
                        </td>
                        <td className="px-3 py-2 text-center bg-purple-50 dark:bg-purple-950 group-hover:bg-purple-100 dark:group-hover:bg-purple-900 text-purple-700 dark:text-purple-400 font-bold sticky right-[175px] z-10 border-l border-purple-100 dark:border-purple-900 text-xs w-[50px] min-w-[50px] max-w-[50px] transition-colors duration-150">
                          {emp.totalI}
                        </td>
                        <td className="px-3 py-2 text-center bg-sky-50 dark:bg-sky-950 group-hover:bg-sky-100 dark:group-hover:bg-sky-900 text-sky-700 dark:text-sky-400 font-bold sticky right-[125px] z-10 border-l border-sky-100 dark:border-sky-900 text-xs w-[50px] min-w-[50px] max-w-[50px] transition-colors duration-150">
                          {emp.totalS}
                        </td>
                        <td className="px-3 py-2 text-center bg-teal-50 dark:bg-teal-950 group-hover:bg-teal-100 dark:group-hover:bg-teal-900 text-teal-700 dark:text-teal-455 font-bold sticky right-[75px] z-10 border-l border-teal-100 dark:border-teal-900 text-xs w-[50px] min-w-[50px] max-w-[50px] transition-colors duration-150">
                          {emp.totalC}
                        </td>
                        <td className="px-3 py-2 text-center bg-rose-50 dark:bg-rose-955 group-hover:bg-rose-100 dark:group-hover:bg-rose-900 text-rose-800 dark:text-rose-400 font-extrabold sticky right-0 z-10 border-l border-rose-150 dark:border-rose-900 text-xs w-[75px] min-w-[75px] max-w-[75px] transition-colors duration-150">
                          {emp.totalTerlambat}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-850/50 px-6 py-3.5 border-t border-slate-200/80 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-400 flex flex-col sm:flex-row justify-between items-center gap-2">
                <span className="font-medium">Total Karyawan Terdaftar: <strong className="text-slate-700 dark:text-white font-bold">{processedData.employees.length}</strong></span>
                <span className="text-[10px] bg-slate-200/80 dark:bg-zinc-800 px-2.5 py-1 rounded-md text-slate-650 dark:text-zinc-355 font-bold">Diurutkan berdasarkan Nama Resmi (A to Z)</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* EXCEL SUMMARY PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-slate-950/60 dark:bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in-up">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-zinc-800 animate-scale-in">
            
            <div className="px-6 py-4 border-b border-slate-150 dark:border-zinc-850 flex justify-between items-center bg-slate-50 dark:bg-zinc-850">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
                <FileText size={18} className="text-emerald-600 dark:text-emerald-500"/> 
                Preview Output Laporan Summary (Excel Style)
              </h3>
              <button 
                onClick={() => setIsPreviewOpen(false)} 
                className="text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-100 dark:bg-zinc-950">
              
              {/* EXCEL SHEET BOARD */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-slate-200/80 dark:border-zinc-800 space-y-4 font-mono text-xs overflow-x-auto">
                
                {/* Excel Headers styling */}
                <div className="text-center space-y-1 pb-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-wider">DASHBOARD PRESENSI OFFICE</h2>
                  <p className="text-[10px] font-bold text-slate-450 dark:text-zinc-400 uppercase">
                    PERIODE ({processedData.dates[0] || 'TGL MULAI'} - {processedData.dates[processedData.dates.length - 1] || 'TGL AKHIR'})
                  </p>
                </div>

                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse bg-white dark:bg-zinc-900">
                    <thead>
                      <tr className="bg-slate-150/70 dark:bg-zinc-800 border-b border-slate-300/80 dark:border-zinc-700">
                        <th className="px-3 py-2.5 border-r border-slate-200 dark:border-zinc-700 text-center font-bold text-slate-700 dark:text-zinc-300 w-12">No.</th>
                        <th className="px-4 py-2.5 border-r border-slate-200 dark:border-zinc-700 font-bold text-slate-700 dark:text-zinc-300">Nama Karyawan</th>
                        <th className="px-3 py-2.5 border-r border-slate-200 dark:border-zinc-700 text-center font-bold text-slate-700 dark:text-zinc-300">Total Terlambat</th>
                        <th className="px-3 py-2.5 border-r border-slate-200 dark:border-zinc-700 text-center font-bold text-slate-700 dark:text-zinc-300">Izin Dokter</th>
                        <th className="px-3 py-2.5 border-r border-slate-200 dark:border-zinc-700 text-center font-bold text-slate-700 dark:text-zinc-300">Cuti</th>
                        <th className="px-3 py-2.5 border-r border-slate-200 dark:border-zinc-700 text-center font-medium text-slate-400 dark:text-zinc-500 italic">Lembur/Jam</th>
                        <th className="px-3 py-2.5 border-r border-slate-200 dark:border-zinc-700 text-center font-bold text-slate-700 dark:text-zinc-300">Total Izin Akhir</th>
                        <th className="px-3 py-2.5 border-r border-slate-200 dark:border-zinc-700 text-center font-medium text-slate-400 dark:text-zinc-500 italic">Ket</th>
                        <th className="px-3 py-2.5 text-center font-medium text-slate-400 dark:text-zinc-500 italic">Sisa Cuti</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedData.employees.map((emp, idx) => (
                        <tr key={idx} className="border-b border-slate-150 dark:border-zinc-800 hover:bg-slate-50/50 dark:hover:bg-zinc-800/40">
                          <td className="px-3 py-2.5 border-r border-slate-200 dark:border-zinc-700 text-center text-slate-550 dark:text-zinc-450">{idx + 1}</td>
                          <td className="px-4 py-2.5 border-r border-slate-200 dark:border-zinc-700 font-bold text-slate-800 dark:text-zinc-200">{emp.officialName}</td>
                          <td className="px-3 py-2.5 border-r border-slate-200 dark:border-zinc-700 text-center font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10">
                            {emp.totalTerlambat > 0 ? emp.totalTerlambat : ''}
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-200 dark:border-zinc-700 text-center font-semibold text-sky-700 dark:text-sky-400 bg-sky-50/30 dark:bg-sky-950/10">
                            {emp.totalS > 0 ? emp.totalS : ''}
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-200 dark:border-zinc-700 text-center font-semibold text-teal-700 dark:text-teal-400 bg-teal-50/30 dark:bg-teal-950/10">
                            {emp.totalC > 0 ? emp.totalC : ''}
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-200 dark:border-zinc-700 text-center text-slate-400 dark:text-zinc-650 italic bg-slate-50/30 dark:bg-zinc-950/20"></td>
                          <td className="px-3 py-2.5 border-r border-slate-200 dark:border-zinc-700 text-center font-semibold text-purple-700 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/10">
                            {emp.totalI > 0 ? emp.totalI : ''}
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-200 dark:border-zinc-700 text-center text-slate-400 dark:text-zinc-650 italic bg-slate-50/30 dark:bg-zinc-950/20"></td>
                          <td className="px-3 py-2.5 text-center text-slate-400 dark:text-zinc-650 italic bg-slate-50/30 dark:bg-zinc-950/20"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
            
            <div className="px-6 py-4 border-t border-slate-150 dark:border-zinc-850 bg-slate-50 dark:bg-zinc-850 flex justify-between items-center">
              <button 
                onClick={downloadSummaryCSV}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2.5 cursor-pointer"
              >
                <Download size={14} />
                <span>Unduh XLS/CSV Summary</span>
              </button>
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="bg-slate-800 hover:bg-slate-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SETTINGS / NAME MAPPING MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-950/60 dark:bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in-up">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-zinc-800 animate-scale-in">
            
            <div className="px-6 py-4 border-b border-slate-150 dark:border-zinc-850 flex justify-between items-center bg-slate-50 dark:bg-zinc-850">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
                <Settings size={18} className="text-indigo-600 dark:text-indigo-400"/> 
                Pengaturan Nama Resmi Karyawan
              </h3>
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <p className="text-[11px] text-slate-650 dark:text-zinc-400 leading-relaxed bg-blue-50/40 dark:bg-blue-950/10 p-4 rounded-xl border border-blue-100/35 dark:border-blue-900/15">
                Gunakan menu ini untuk memetakan nama mentah keluaran mesin fingerprint ke nama resmi karyawan untuk pelaporan. Nama Resmi inilah yang akan muncul sebagai acuan utama di ringkasan absensi.
              </p>

              {/* BATCH IMPORT EXPORT BUBBLE */}
              <div className="flex flex-col md:flex-row gap-4 bg-indigo-50/30 dark:bg-indigo-950/10 p-5 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/20 items-start md:items-center justify-between">
                <div className="text-[11px] text-indigo-950 dark:text-indigo-300">
                  <p className="font-extrabold text-xs mb-0.5">Ekspor & Impor Pemetaan Massal</p>
                  <p className="opacity-90 dark:opacity-80 leading-relaxed max-w-md">Download template yang otomatis mencatat seluruh nama fingerprint unik dari data aktif Anda, isi Nama Resmi di Excel, lalu upload kembali berkas tersebut.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={exportMappingTemplate}
                    className="flex-1 md:flex-none justify-center bg-white dark:bg-zinc-800 text-indigo-750 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-zinc-750 border border-indigo-200/60 dark:border-zinc-700 px-3 py-2 rounded-xl flex items-center gap-2 transition text-[11px] font-bold shadow-2xs cursor-pointer"
                  >
                    <Download size={13} /> Ekspor
                  </button>
                  <label className="flex-1 md:flex-none justify-center bg-indigo-655 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition text-[11px] font-bold shadow-2xs cursor-pointer">
                    <Upload size={13} /> Impor
                    <input type="file" accept=".csv" className="hidden" onChange={handleImportMapping} />
                  </label>
                </div>
              </div>

              {/* Manual Mapping Form */}
              <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800">
                <p className="text-[10px] font-black text-slate-700 dark:text-zinc-350 mb-3 uppercase tracking-wider">Tambah Aturan Manual</p>
                <div className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-zinc-455 uppercase tracking-wider mb-1">Nama Fingerprint</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: Budi S."
                      value={tempMappingKey}
                      onChange={(e) => setTempMappingKey(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-250 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-150 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-zinc-455 uppercase tracking-wider mb-1">Nama Resmi</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: Budi Santoso"
                      value={tempMappingValue}
                      onChange={(e) => setTempMappingValue(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-250 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-150 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs"
                    />
                  </div>
                  <button 
                    onClick={addMapping}
                    className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition text-xs font-bold shadow-xs h-[38px] w-full md:w-auto justify-center cursor-pointer"
                  >
                    <Plus size={14} /> Tambah
                  </button>
                </div>
              </div>

              {/* Current Mapping List */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-700 dark:text-zinc-350 uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-zinc-800">
                  Daftar Pemetaan Aktif ({Object.keys(nameMapping).length})
                </h4>
                {Object.keys(nameMapping).length === 0 ? (
                  <div className="text-center py-6 text-slate-400 dark:text-zinc-550 text-xs italic">Belum ada pemetaan nama. Semua nama menggunakan data fingerprint asli.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
                    {Object.entries(nameMapping).map(([finger, resmi]) => (
                      <div key={finger} className="flex justify-between items-center p-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-3xs hover:border-slate-350 dark:hover:border-zinc-700 transition duration-150">
                        <div className="overflow-hidden mr-2">
                          <div className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono line-clamp-1">{finger}</div>
                          <div className="text-xs font-bold text-slate-700 dark:text-zinc-200 line-clamp-1">{resmi}</div>
                        </div>
                        <button 
                          onClick={() => removeMapping(finger)}
                          className="text-rose-400 hover:text-rose-600 dark:text-rose-500 dark:hover:text-rose-400 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition flex-shrink-0 cursor-pointer"
                          title="Hapus pemetaan"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
            
            <div className="px-6 py-4 border-t border-slate-150 dark:border-zinc-850 bg-slate-50 dark:bg-zinc-850 flex justify-end">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="bg-slate-800 hover:bg-slate-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Simpan & Terapkan
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="py-4 border-t border-slate-200/80 dark:border-zinc-800 text-center text-[10px] text-slate-400 dark:text-zinc-500">
        <p>&copy; {new Date().getFullYear()} Presensiku. Dibuat untuk Efisiensi Pengelolaan Absensi Kantor.</p>
      </footer>

    </div>
  );
}
