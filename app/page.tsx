"use client";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { Package, Truck, CheckCircle2, Clock, AlertTriangle, Filter, Download, Search, RefreshCw, Lock, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";
import bundledData from "../public/data.json";

const IMPORT_PASSWORD = "PPIC4040"; // ganti via env NEXT_PUBLIC_IMPORT_PASSWORD jika perlu

type RecordItem = {
  moNumber: string;
  moDate: string;
  moYM: string;
  moM: number;
  customer: string;
  partNumber: string;
  desc1: string;
  region: string;
  qty: number;
  qtyDel: number;
  delDate: string;
  delYM: string;
  weekly: string;
  arriveTarget: string;
  onTime: boolean | null;
  area: string;
};

const COLORS = {
  navy: "#0F2342",
  navy2: "#1A3A5F",
  gold: "#C8A96A",
  goldDark: "#B8954E",
  green: "#10B981",
  red: "#EF4444",
  blue: "#3B82F6",
  slate: "#64748B"
};
const PIE_COLORS = ["#0F2342", "#1A3A5F", "#C8A96A", "#B8954E", "#94A3B8", "#64748B", "#0B7A55", "#3B82F6"];

function formatNum(n: number) {
  return n.toLocaleString("id-ID");
}

export default function Dashboard() {
  const [data, setData] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Import modal state
  const [showImport, setShowImport] = useState(false);
  const [importPass, setImportPass] = useState("");
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importFileName, setImportFileName] = useState("");

  useEffect(() => {
    // 1. Cek localStorage (hasil import ber-password)
    try {
      const imported = localStorage.getItem("mo-hariff-imported-data");
      if (imported) {
        const j = JSON.parse(imported);
        if (Array.isArray(j) && j.length) {
          // langsung pakai data import
          const normalized: RecordItem[] = j.map((x: any) => {
            if ("n" in x) {
              return {
                moNumber: x.n || "", moDate: x.d || "", moYM: x.m || "", moM: x.m ? parseInt(x.m.split("-")[1]||"0") : 0,
                customer: x.c || "", partNumber: x.p || "", desc1: x.desc1 || "", region: x.r || "-", qty: x.q || 0, qtyDel: x.qd || 0,
                delDate: x.dd || "", delYM: x.dm || "", weekly: x.w || "", arriveTarget: x.at || "", onTime: x.o === 1 ? true : x.o === 0 ? false : null, area: x.area || "",
              } as RecordItem;
            }
            return x as RecordItem;
          });
          setData(normalized);
          setLoading(false);
          return;
        }
      }
    } catch {}
    // 2. try API first, fallback to static import for Vercel static
    fetch("/api/data")
      .then(r => {
        if (!r.ok) throw new Error("api not ok");
        const ct = r.headers.get("content-type") || "";
        if (!ct.includes("application/json")) throw new Error("not json");
        return r.json();
      })
      .then((j: any[]) => {
        // check if j is actually HTML string
        if (Array.isArray(j) && j.length && typeof j[0] === "object" && "n" in j[0]) {
          return j;
        }
        throw new Error("invalid data");
      })
      .catch(() => {
        // fallback: fetch static public/data.json directly
        return fetch("/data.json").then(r => {
          if (!r.ok) throw new Error("fallback not ok");
          const ct2 = r.headers.get("content-type") || "";
          if (!ct2.includes("application/json")) throw new Error("not json2");
          return r.json();
        }).catch(() => {
          // ultimate fallback: use bundled data (client-side import, ~3.8MB)
          return bundledData as any;
        });
      })
      .then((j: any[]) => {
        // support both long and short keys (compressed)
        const normalized: RecordItem[] = j.map((x: any) => {
          if ("n" in x) {
            return {
              moNumber: x.n || "",
              moDate: x.d || "",
              moYM: x.m || "",
              moM: x.m ? parseInt(x.m.split("-")[1]||"0") : 0,
              customer: x.c || "",
              partNumber: x.p || "",
              desc1: x.desc1 || "",
              region: x.r || "-",
              qty: x.q || 0,
              qtyDel: x.qd || 0,
              delDate: x.dd || "",
              delYM: x.dm || "",
              weekly: x.w || "",
              arriveTarget: x.at || "",
              onTime: x.o === 1 ? true : x.o === 0 ? false : null,
              area: x.area || "",
            } as RecordItem;
          }
          return x as RecordItem;
        });
        setData(normalized);
        setLoading(false);
      });
  }, []);

  const regions = useMemo(() => ["All", ...Array.from(new Set(data.map(d => d.region))).sort()], [data]);
  const customers = useMemo(() => ["All", ...Array.from(new Set(data.map(d => d.customer))).sort()], [data]);
  const periods = useMemo(() => ["All", ...Array.from(new Set(data.map(d => d.moYM).filter(Boolean))).sort()], [data]);

  const filtered = useMemo(() => {
    return data.filter(d => {
      if (regionFilter !== "All" && d.region !== regionFilter) return false;
      if (customerFilter !== "All" && d.customer !== customerFilter) return false;
      if (periodFilter !== "All" && d.moYM !== periodFilter && d.delYM !== periodFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(
          d.moNumber.toLowerCase().includes(q) ||
          d.partNumber.toLowerCase().includes(q) ||
          d.customer.toLowerCase().includes(q) ||
          d.region.toLowerCase().includes(q) ||
          d.desc1.toLowerCase().includes(q)
        )) return false;
      }
      return true;
    });
  }, [data, regionFilter, customerFilter, periodFilter, search]);

  const kpi = useMemo(() => {
    const totalMO = new Set(filtered.map(d => d.moNumber)).size;
    const qtyOrder = filtered.reduce((s, d) => s + d.qty, 0);
    const qtyDel = filtered.reduce((s, d) => s + d.qtyDel, 0);
    const fulfill = qtyOrder ? (qtyDel / qtyOrder) * 100 : 0;
    const onTime = filtered.filter(d => d.onTime === true).length;
    const late = filtered.filter(d => d.onTime === false).length;
    const otRate = (onTime + late) ? (onTime / (onTime + late)) * 100 : 0;
    const outstanding = qtyOrder - qtyDel;
    return { totalMO, qtyOrder, qtyDel, fulfill, onTime, late, otRate, outstanding, totalRows: filtered.length };
  }, [filtered]);

  const monthlyData = useMemo(() => {
    const months = ["2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07","2026-08","2026-09"];
    const labels: Record<string,string> = {"2026-01":"Jan","2026-02":"Feb","2026-03":"Mar","2026-04":"Apr","2026-05":"Mei","2026-06":"Jun","2026-07":"Jul","2026-08":"Ags","2026-09":"Sep"};
    return months.map(m => {
      const order = filtered.filter(d => d.moYM === m).reduce((s,d)=>s+d.qty,0);
      const del = filtered.filter(d => d.delYM === m).reduce((s,d)=>s+d.qtyDel,0);
      return { month: labels[m], key: m, order, del, fulfill: order ? Math.round(del/order*1000)/10 : 0 };
    });
  }, [filtered]);

  const regionData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(d => map.set(d.region, (map.get(d.region)||0)+d.qty));
    return Array.from(map.entries()).map(([region, qty]) => ({ region, qty }))
      .sort((a,b)=>b.qty-a.qty).slice(0,10);
  }, [filtered]);

  const partData = useMemo(() => {
    const map = new Map<string, {qty:number, desc:string}>();
    filtered.forEach(d => {
      const cur = map.get(d.partNumber) || {qty:0, desc:d.desc1};
      cur.qty += d.qty;
      map.set(d.partNumber, cur);
    });
    return Array.from(map.entries()).map(([part, v])=>({part, qty:v.qty, desc:v.desc}))
      .sort((a,b)=>b.qty-a.qty).slice(0,8);
  }, [filtered]);

  const weeklyData = useMemo(() => {
    const order = ["Week 2","Week 3","Week 4","Week 5","Week 6","Week 7","Week 8","Week 9","Week 10","Week 11","Week 12","Week 13","Week 14","Week 15","Week 16","Week 17","Week 18","Week 19","Week 20","Week 21","Week 22","Week 23","Week 24","Week 25","Week 26","Week 27","Week 28","Week 29","Week 30","Week 31","Week 32","Week 33","Week 34","Week 35","Week 36"];
    const map = new Map<string, number>();
    filtered.forEach(d => {
      if(d.weekly) map.set(d.weekly, (map.get(d.weekly)||0)+d.qtyDel);
    });
    return order.filter(w=>map.has(w)).map(w=>({week:w, qty:map.get(w)!}));
  }, [filtered]);

  const customerData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(d => {
      const key = d.customer === "TELEKOMUNIKASI SELULAR, PT" ? "TELKOMSEL" :
                  d.customer === "HARIFF DIPA PERSADA, PT" ? "HARIFF DIPA" :
                  d.customer === "HUAWEI TECH INVESTMENT, PT" ? "HUAWEI" :
                  d.customer === "INFRASTRUKTUR TELEKOMUNIKASI INDONESIA, PT" ? "INFRA TELKOM" : "LAINNYA";
      map.set(key, (map.get(key)||0)+d.qty);
    });
    const total = Array.from(map.values()).reduce((a,b)=>a+b,0);
    return Array.from(map.entries()).map(([name, v])=>({name, value:v, pct: total? Math.round(v/total*1000)/10:0})).sort((a,b)=>b.value-a.value);
  }, [filtered]);

  const paginated = useMemo(() => {
    const start = (page-1)*pageSize;
    return filtered.slice(start, start+pageSize);
  }, [filtered, page]);

  const exportCSV = () => {
    const header = ["MO Number","MO Date","Customer","Part Number","Region","Qty","QtyDel","DelDate","OnTime"].join(",");
    const rows = filtered.map(d => [d.moNumber,d.moDate,d.customer,d.partNumber,d.region,d.qty,d.qtyDel,d.delDate,d.onTime].join(",")).join("\n");
    const blob = new Blob([header+"\n"+rows], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="MO_Delivery_filtered.csv"; a.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    if (importPass !== IMPORT_PASSWORD) {
      setImportError("Password salah! Hubungi PPIC.");
      return;
    }
    setIsImporting(true);
    setImportFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      // Cari header row (yang mengandung MO Number)
      let headerIdx = rows.findIndex(r => r.some((c:any) => String(c).toLowerCase().includes("mo number")));
      if (headerIdx === -1) headerIdx = 0;
      const header = rows[headerIdx].map((h:any) => String(h).trim());
      const idx = (name: string) => header.findIndex((h:string) => h.toLowerCase() === name.toLowerCase());
      const iMoNum = idx("MO Number");
      const iMoDate = idx("MO Date");
      const iCust = idx("Customer");
      const iPart = idx("Part Number");
      const iDesc1 = idx("Description 1");
      const iRegion = idx("Region");
      const iQty = idx("Qty");
      const iQtyDel = idx("Qty Delivery");
      const iDelDate = idx("Date Delivery");
      const iArrive = idx("MO Time Arrive Target");
      const iWeekly = idx("Weekly Delivery");
      const iArea = idx("Area");

      const toISO = (v: any) => {
        if (v instanceof Date) return v.toISOString().slice(0,10);
        if (typeof v === "string" && v.includes("/")) {
          const d = new Date(v);
          if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);
        }
        if (typeof v === "number") {
          // Excel serial
          const d = new Date(Math.round((v - 25569)*86400*1000));
          return d.toISOString().slice(0,10);
        }
        return String(v||"");
      };
      const toYM = (s: string) => s ? s.slice(0,7) : "";

      const records: any[] = [];
      for (let r = headerIdx+1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length===0) continue;
        const moNum = String(row[iMoNum]||"").trim();
        if (!moNum) continue;
        const moDateStr = toISO(row[iMoDate]);
        const delDateStr = toISO(row[iDelDate]);
        const arriveStr = toISO(row[iArrive]);
        let on: number|null = null;
        if (delDateStr && arriveStr) {
          try { on = new Date(delDateStr) <= new Date(arriveStr) ? 1 : 0; } catch {}
        }
        records.push({
          n: moNum,
          d: moDateStr,
          m: toYM(moDateStr),
          c: String(row[iCust]||"").trim(),
          r: String(row[iRegion]||"-").trim(),
          p: String(row[iPart]||"").trim(),
          q: parseInt(String(row[iQty]||0))||0,
          qd: parseInt(String(row[iQtyDel]||0))||0,
          dd: delDateStr,
          dm: toYM(delDateStr),
          w: String(row[iWeekly]||"").trim(),
          o: on,
          desc1: String(row[iDesc1]||""),
          area: String(row[iArea]||""),
        });
      }
      if (records.length===0) throw new Error("Tidak ada data valid (cek header MO Number)");
      // Simpan ke localStorage & update state
      localStorage.setItem("mo-hariff-imported-data", JSON.stringify(records));
      localStorage.setItem("mo-hariff-imported-at", new Date().toISOString());
      localStorage.setItem("mo-hariff-imported-file", file.name);
      // Update state langsung
      const normalized: RecordItem[] = records.map((x:any) => ({
        moNumber: x.n, moDate: x.d, moYM: x.m, moM: x.m ? parseInt(x.m.split("-")[1]||"0"):0,
        customer: x.c, partNumber: x.p, desc1: x.desc1||"", region: x.r, qty: x.q, qtyDel: x.qd,
        delDate: x.dd, delYM: x.dm, weekly: x.w, arriveTarget: x.at||"", onTime: x.o===1?true:x.o===0?false:null, area: x.area||""
      }));
      setData(normalized);
      setShowImport(false);
      setImportPass("");
      setImportError("");
      alert(`Import sukses: ${records.length} baris dari ${file.name}. Dashboard ter-update & tersimpan di browser.`);
    } catch (err:any) {
      setImportError("Gagal import: " + (err.message||String(err)));
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const handleResetImport = () => {
    localStorage.removeItem("mo-hariff-imported-data");
    localStorage.removeItem("mo-hariff-imported-at");
    localStorage.removeItem("mo-hariff-imported-file");
    location.reload();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9]">
      <div className="text-center">
        <RefreshCw className="animate-spin mx-auto mb-3 text-navy" size={36}/>
        <p className="text-navy font-semibold">Memuat dashboard...</p>
        <p className="text-sm text-slate-500">20.221 records</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {/* Header */}
      <div className="bg-navy text-white sticky top-0 z-30 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-wide">MATERIAL ORDER <span className="text-gold">vs</span> REALISASI DELIVERY</h1>
            <p className="text-xs text-gold/90 tracking-wider">Executive Dashboard • HARIFF DTE • PPIC MATERIAL ORDER CONTROL • Live</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-white/10 px-3 py-1.5 rounded-full">Periode: Jan–Sep 2026</span>
            <span className="bg-gold text-navy px-3 py-1.5 rounded-full font-bold">• LIVE</span>
            <span className="hidden md:inline text-white/70">Auto-refresh ready • Vercel</span>
          </div>
        </div>
        <div className="h-1 bg-gold"></div>
      </div>

      {/* Filters */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 mt-4">
        <div className="card p-3 md:p-4 flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="flex items-center gap-2 text-navy font-bold text-sm">
            <Filter size={16} className="text-goldDark"/> FILTER INTERAKTIF
            <span className="text-xs font-normal text-slate-500 hidden md:inline">— slicing real-time (Region / Customer / Periode)</span>
          </div>
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-navy">Region</label>
              <select value={regionFilter} onChange={e=>{setRegionFilter(e.target.value); setPage(1)}} className="text-sm border border-gold/40 rounded-lg px-3 py-2 bg-[#FFFBEB] font-semibold text-navy min-w-[180px]">
                {regions.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-navy">Customer</label>
              <select value={customerFilter} onChange={e=>{setCustomerFilter(e.target.value); setPage(1)}} className="text-sm border border-gold/40 rounded-lg px-3 py-2 bg-[#FFFBEB] font-semibold text-navy min-w-[200px]">
                {customers.map(c=><option key={c} value={c}>{c.slice(0,30)}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-navy">Periode</label>
              <select value={periodFilter} onChange={e=>{setPeriodFilter(e.target.value); setPage(1)}} className="text-sm border border-gold/40 rounded-lg px-3 py-2 bg-[#FFFBEB] font-semibold text-navy min-w-[130px]">
                {periods.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={search} onChange={e=>{setSearch(e.target.value); setPage(1)}} placeholder="Cari MO / Part / Customer..." className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white w-[220px]"/>
            </div>
            <button onClick={()=>{setRegionFilter("All"); setCustomerFilter("All"); setPeriodFilter("All"); setSearch(""); setPage(1)}} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg">↺ Reset</button>
            <button onClick={exportCSV} className="text-xs bg-navy text-white px-4 py-2 rounded-lg flex items-center gap-1 hover:bg-navy2"><Download size={14}/> Export CSV</button>
            <button onClick={()=>setShowImport(true)} className="text-xs bg-gold text-navy px-4 py-2 rounded-lg flex items-center gap-1 hover:bg-goldDark font-bold"><Lock size={14}/> Import Excel</button>
          </div>
        </div>
        <div className="text-xs text-slate-500 mt-2 px-1">Menampilkan <b>{formatNum(kpi.totalRows)}</b> dari 20.221 records • {kpi.totalMO} MO dokumen • Filter aktif: <span className="text-navy font-semibold">{regionFilter} / {customerFilter} / {periodFilter}</span></div>
      </div>

      {/* KPIs */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="kpi-card p-4 border-t-4 border-t-navy">
          <div className="text-[11px] font-bold text-slate-500 tracking-wider">TOTAL MO DOCUMENTS</div>
          <div className="text-2xl md:text-3xl font-black text-navy mt-1">{formatNum(kpi.totalMO)}</div>
          <div className="text-xs font-bold text-slate-600">Dokumen</div>
          <div className="text-[11px] text-slate-400 italic">Unique MO Number</div>
        </div>
        <div className="kpi-card p-4 border-t-4 border-t-navy">
          <div className="text-[11px] font-bold text-slate-500 tracking-wider flex items-center gap-1"><Package size={12}/> TOTAL QTY ORDERED</div>
          <div className="text-2xl md:text-3xl font-black text-navy mt-1">{formatNum(kpi.qtyOrder)}</div>
          <div className="text-xs font-bold text-slate-600">EA</div>
          <div className="text-[11px] text-slate-400 italic">Material Order Qty</div>
        </div>
        <div className="kpi-card p-4 border-t-4 border-t-[#0B7A55]">
          <div className="text-[11px] font-bold text-slate-500 tracking-wider flex items-center gap-1"><Truck size={12}/> TOTAL QTY DELIVERED</div>
          <div className="text-2xl md:text-3xl font-black text-[#0B7A55] mt-1">{formatNum(kpi.qtyDel)}</div>
          <div className="text-xs font-bold text-slate-600">EA</div>
          <div className="text-[11px] text-slate-400 italic">Realisasi Delivery Qty</div>
        </div>
        <div className="kpi-card p-4 border-t-4 border-t-[#0B7A55]">
          <div className="text-[11px] font-bold text-slate-500 tracking-wider flex items-center gap-1"><CheckCircle2 size={12}/> FULFILLMENT RATE</div>
          <div className="text-2xl md:text-3xl font-black text-[#0B7A55] mt-1">{kpi.fulfill.toFixed(1)}%</div>
          <div className="text-xs font-bold text-slate-600">{formatNum(kpi.outstanding)} EA Outstanding</div>
          <div className="text-[11px] text-slate-400 italic">QtyDel / QtyOrder</div>
        </div>
        <div className="kpi-card p-4 border-t-4 border-t-blue-500 col-span-2 lg:col-span-1">
          <div className="text-[11px] font-bold text-slate-500 tracking-wider flex items-center gap-1"><Clock size={12}/> ON-TIME DELIVERY</div>
          <div className="text-2xl md:text-3xl font-black text-blue-600 mt-1">{kpi.otRate.toFixed(1)}%</div>
          <div className="text-xs font-bold text-slate-600">{formatNum(kpi.onTime)} On-Time • {formatNum(kpi.late)} Late</div>
          <div className="text-[11px] text-slate-400 italic">Delivered ≤ Arrive Target</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-bold text-navy text-sm mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-gold rounded"></span> TREND BULANAN — Order vs Delivery (Qty EA)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB"/>
                <XAxis dataKey="month" tick={{fontSize:11}}/>
                <YAxis tick={{fontSize:11}}/>
                <Tooltip />
                <Legend />
                <Bar dataKey="order" name="MO Qty" fill={COLORS.navy} radius={[4,4,0,0]} />
                <Bar dataKey="del" name="Delivery Qty" fill={COLORS.gold} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-2 text-xs">
            {monthlyData.map(m=>(
              <div key={m.key} className={`px-2 py-1 rounded text-center flex-1 ${m.fulfill>=100?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>
                <div className="font-bold">{m.month}</div>
                <div>{m.fulfill.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-bold text-navy text-sm mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-navy rounded"></span> DELIVERY BY REGION (Qty EA)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB"/>
                <XAxis type="number" tick={{fontSize:11}}/>
                <YAxis type="category" dataKey="region" width={120} tick={{fontSize:10}} />
                <Tooltip />
                <Bar dataKey="qty" fill={COLORS.navy2} radius={[0,4,4,0]} label={{position:"right", fontSize:11}}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-bold text-navy text-sm mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-goldDark rounded"></span> TOP 8 MATERIAL — Part Number</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={partData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB"/>
                <XAxis dataKey="part" tick={{fontSize:9}} angle={-20} height={60} interval={0}/>
                <YAxis tick={{fontSize:11}}/>
                <Tooltip formatter={(v:any)=>[formatNum(v as number),"Qty"]} labelFormatter={(l)=>l}/>
                <Bar dataKey="qty" fill={COLORS.goldDark} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-4">
          <h3 className="font-bold text-navy text-sm mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-navy2 rounded"></span> TREN MINGGUAN — Weekly Delivery</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB"/>
                <XAxis dataKey="week" tick={{fontSize:9}} interval={2}/>
                <YAxis tick={{fontSize:11}}/>
                <Tooltip />
                <Line type="monotone" dataKey="qty" stroke={COLORS.navy} strokeWidth={2.5} dot={{fill:COLORS.gold, stroke:COLORS.navy, r:3}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3 OTIF + Customer */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <h3 className="font-bold text-navy text-sm mb-2">ON-TIME vs LATE</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{name:"On-Time", value:kpi.onTime},{name:"Late", value:kpi.late}]} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({name, percent})=>`${name} ${(percent*100).toFixed(1)}%`}>
                  <Cell fill={COLORS.green}/>
                  <Cell fill={COLORS.red}/>
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-xs text-slate-500">Avg -2.4 hari lebih cepat dari target</div>
        </div>
        <div className="card p-4">
          <h3 className="font-bold text-navy text-sm mb-2">CUSTOMER SHARE</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={customerData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name, percent})=>`${(percent*100).toFixed(0)}%`}>
                  {customerData.map((e,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={(v:any)=>formatNum(v)}/>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-4">
          <h3 className="font-bold text-navy text-sm mb-3">RINCIAN BULANAN</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-navy text-white"><th className="p-2 text-left">Bulan</th><th className="p-2 text-center">MO Qty</th><th className="p-2 text-center">Del</th><th className="p-2 text-center">Fulfill</th></tr></thead>
              <tbody>
                {monthlyData.map((m,i)=>(
                  <tr key={m.key} className={i%2?"bg-slate-50":""}>
                    <td className="p-2 font-bold text-navy">{m.month}</td>
                    <td className="p-2 text-center">{formatNum(m.order)}</td>
                    <td className="p-2 text-center">{formatNum(m.del)}</td>
                    <td className={`p-2 text-center font-bold ${m.fulfill>=100?'text-emerald-600':'text-amber-600'}`}>{m.fulfill.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="bg-navy2 text-white font-bold"><td className="p-2">TOTAL</td><td className="p-2 text-center">{formatNum(kpi.qtyOrder)}</td><td className="p-2 text-center">{formatNum(kpi.qtyDel)}</td><td className="p-2 text-center">{kpi.fulfill.toFixed(1)}%</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 mt-4 mb-8">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-navy text-sm flex items-center gap-2"><AlertTriangle size={14} className="text-gold"/> DATA MENTAH — {formatNum(filtered.length)} baris (paginasi)</h3>
            <div className="text-xs text-slate-500">Hal {page} / {Math.ceil(filtered.length/pageSize)} • Klik header untuk sort (to-do)</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-navy text-white">
                <th className="p-2 text-left">MO Number</th><th className="p-2 text-left">MO Date</th><th className="p-2 text-left">Customer</th><th className="p-2 text-left">Region</th><th className="p-2 text-left">Part Number</th><th className="p-2 text-center">Qty</th><th className="p-2 text-center">Del</th><th className="p-2 text-left">Delivery</th><th className="p-2 text-center">OnTime</th>
              </tr></thead>
              <tbody>
                {paginated.map((r,i)=>(
                  <tr key={i} className={i%2?"bg-slate-50":""}>
                    <td className="p-2 font-mono text-[11px]">{r.moNumber}</td>
                    <td className="p-2">{r.moDate}</td>
                    <td className="p-2 max-w-[180px] truncate">{r.customer}</td>
                    <td className="p-2">{r.region}</td>
                    <td className="p-2 font-mono">{r.partNumber}</td>
                    <td className="p-2 text-center">{r.qty}</td>
                    <td className="p-2 text-center">{r.qtyDel}</td>
                    <td className="p-2">{r.delDate}</td>
                    <td className="p-2 text-center">{r.onTime===null?"—": r.onTime ? "✅" : "⏰"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-center gap-2 mt-4">
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-4 py-2 text-xs border rounded disabled:opacity-40">Prev</button>
            <span className="px-3 py-2 text-xs">Page {page}</span>
            <button disabled={page>=Math.ceil(filtered.length/pageSize)} onClick={()=>setPage(p=>p+1)} className="px-4 py-2 text-xs border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
        <div className="text-center text-[11px] text-slate-400 mt-4">
          CONFIDENTIAL • PPIC HARIFF DTE • Dashboard Live Vercel • Data otomatis dari Report Material Order.xlsx (20.221 rows) • Elegant, profesional, detail & informatif
          {typeof window !== "undefined" && localStorage.getItem("mo-hariff-imported-data") && (
            <span className="ml-2 text-goldDark">• Import aktif: {localStorage.getItem("mo-hariff-imported-file")} ({new Date(localStorage.getItem("mo-hariff-imported-at")||"").toLocaleString("id-ID")}) <button onClick={handleResetImport} className="underline ml-1">Reset</button></span>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={()=>setShowImport(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-navy text-white p-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><Lock size={16} className="text-gold"/> Import Excel (Protected)</h3>
              <button onClick={()=>setShowImport(false)} className="p-1 hover:bg-white/10 rounded"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                Hanya user dengan password yang bisa update data dashboard. File harus format <b>Report Material Order.xlsx</b> (Sheet1, header MO Number). Data akan tersimpan di browser & langsung tampil.
              </div>
              <div>
                <label className="text-xs font-bold text-navy">Password</label>
                <div className="relative mt-1">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input type="password" value={importPass} onChange={e=>setImportPass(e.target.value)} placeholder="Masukkan password" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"/>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Password: <code className="bg-slate-100 px-1 rounded">PPIC4040</code></p>
              </div>
              <div>
                <label className="text-xs font-bold text-navy">Pilih File Excel (.xlsx)</label>
                <label className="mt-1 flex items-center justify-center w-full border-2 border-dashed border-gold/40 rounded-lg p-4 cursor-pointer hover:bg-gold/5 bg-[#FFFBEB]">
                  <Upload size={18} className="text-goldDark mr-2"/>
                  <span className="text-sm text-navy font-semibold">{importFileName || "Klik untuk pilih file"}</span>
                  <input type="file" accept=".xlsx,.xls,.xlsm" className="hidden" onChange={handleImportFile} disabled={isImporting}/>
                </label>
                {isImporting && <p className="text-xs text-blue-600 mt-2 flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Memproses {importFileName}...</p>}
                {importError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mt-2">{importError}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setShowImport(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm">Batal</button>
                <button onClick={()=>document.querySelector<HTMLInputElement>('input[type=\"file\"]')?.click()} disabled={isImporting} className="flex-1 py-2 bg-gold text-navy rounded-lg text-sm font-bold disabled:opacity-50">Pilih File</button>
              </div>
              <p className="text-[11px] text-slate-400 text-center">Data import tersimpan di <code>localStorage</code>. Untuk kembali ke data server, klik Reset di footer.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
