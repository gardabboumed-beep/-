/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  FileText, 
  Receipt, 
  CheckCircle2, 
  XCircle, 
  Printer, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  User,
  Settings as SettingsIcon,
  Download,
  Milk,
  Trash2
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday, 
  addMonths, 
  subMonths,
  getDay,
  isWeekend
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Tunisian Currency Tafqeet Function
function tafqeetTunisian(amount: number): string {
  const dinars = Math.floor(amount);
  const millimes = Math.round((amount - dinars) * 1000);

  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(n: number): string {
    if (n === 0) return '';
    let result = '';
    
    // Hundreds
    if (n >= 100) {
      result += hundreds[Math.floor(n / 100)];
      n %= 100;
      if (n > 0) result += ' و ';
    }
    
    // Tens & Units
    if (n > 0) {
      if (n < 20) {
        result += units[n];
      } else {
        const unit = n % 10;
        const ten = Math.floor(n / 10);
        if (unit > 0) {
          result += units[unit] + ' و ' + tens[ten];
        } else {
          result += tens[ten];
        }
      }
    }
    return result;
  }

  function formatNumber(num: number): string {
    if (num === 0) return 'صفر';
    if (num === 1) return 'واحد';
    if (num === 2) return 'اثنان';
    
    let result = '';
    if (num >= 1000) {
      const thousands = Math.floor(num / 1000);
      if (thousands === 1) result += 'ألف';
      else if (thousands === 2) result += 'ألفين';
      else if (thousands >= 3 && thousands <= 10) result += convertGroup(thousands) + ' آلاف';
      else result += convertGroup(thousands) + ' ألف';
      
      num %= 1000;
      if (num > 0) result += ' و ';
    }
    
    if (num > 0) {
      result += convertGroup(num);
    }
    
    return result;
  }

  let finalStr = '';
  
  if (dinars > 0) {
    if (dinars === 1) finalStr += 'دينار واحد';
    else if (dinars === 2) finalStr += 'ديناران';
    else if (dinars >= 3 && dinars <= 10) finalStr += formatNumber(dinars) + ' دنانير';
    else finalStr += formatNumber(dinars) + ' ديناراً';
  }

  if (millimes > 0) {
    if (dinars > 0) finalStr += ' و ';
    if (millimes === 1) finalStr += 'مليم واحد';
    else if (millimes >= 3 && millimes <= 10) finalStr += formatNumber(millimes) + ' مليمات';
    else finalStr += formatNumber(millimes) + ' مليم';
  }

  return finalStr || 'صفر دينار';
}

// Tunisian Date Formatting Helper
const tunisianMonths: {[key: string]: string} = {
  'يناير': 'جانفي',
  'فبراير': 'فيفري',
  'مارس': 'مارس',
  'أبريل': 'أفريل',
  'مايو': 'ماي',
  'يونيو': 'جوان',
  'يوليو': 'جويلية',
  'أغسطس': 'أوت',
  'سبتمبر': 'سبتمبر',
  'أكتوبر': 'أكتوبر',
  'نوفمبر': 'نوفمبر',
  'ديسمبر': 'ديسمبر'
};

const formatTunisianMonth = (date: Date) => {
  const standard = format(date, 'MMMM', { locale: ar });
  return tunisianMonths[standard] || standard;
};

const formatFullTunisianDate = (date: Date) => {
  const day = format(date, 'dd');
  const month = formatTunisianMonth(date);
  const year = format(date, 'yyyy');
  return `${day} ${month} ${year}`;
};

const formatTunisianMonthYear = (date: Date) => {
  const month = formatTunisianMonth(date);
  const year = format(date, 'yyyy');
  return `${month} ${year}`;
};

// Types
interface AttendanceData {
  [dateKey: string]: 'absent' | 'none'; // Only need to track absence now
}

interface WorkerProfile {
  name: string;
  bottlesPerDay: number;
  pricePerBottle: number;
  invoiceDescription: string;
}

interface SupplierInfo {
  name: string;
  address: string;
  taxId: string;
  phone: string;
  invoiceNumber: string;
  logo?: string;
  themeColor?: string;
  customHeader?: string;
  customFooter?: string;
  fontFamily?: 'sans' | 'elegant' | 'formal' | 'standard' | 'mono';
}

interface SchoolInfo {
  name: string;
}

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceData>(() => {
    const saved = localStorage.getItem('milk_attendance');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [profile, setProfile] = useState<WorkerProfile>(() => {
    const saved = localStorage.getItem('worker_profile');
    return saved ? JSON.parse(saved) : {
      name: "محمد العامري",
      bottlesPerDay: 2,
      pricePerBottle: 1.550,
      invoiceDescription: "شراء قارورات حليب طازج يومية للعمال"
    };
  });

  const [supplier, setSupplier] = useState<SupplierInfo>(() => {
    const saved = localStorage.getItem('supplier_info');
    return saved ? JSON.parse(saved) : {
      name: "مركز توزيع الحليب التونسي",
      address: "تونس العاصمة، شارع النصر",
      taxId: "1234567-TR-000",
      phone: "+216 71 000 000",
      invoiceNumber: "001",
      themeColor: "#0f172a"
    };
  });

  const [reportStartDate, setReportStartDate] = useState(() => startOfMonth(new Date()));
  const [reportEndDate, setReportEndDate] = useState(() => endOfMonth(new Date()));

  const [school, setSchool] = useState<SchoolInfo>(() => {
    const saved = localStorage.getItem('school_info');
    return saved ? JSON.parse(saved) : {
      name: "المدرسة الابتدائية بالحي"
    };
  });

  const [shareStatus, setShareStatus] = useState<'idle' | 'success'>('idle');

  const generateShareLink = () => {
    try {
      const data = {
        attendance,
        profile,
        supplier,
        school
      };
      const json = JSON.stringify(data);
      const encoded = btoa(unescape(encodeURIComponent(json)));
      const url = new URL(window.location.href);
      url.hash = `data=${encoded}`;
      const finalUrl = url.toString();
      
      // Attempt to copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(finalUrl).then(() => {
          setShareStatus('success');
          setTimeout(() => setShareStatus('idle'), 3000);
          alert('✅ تم نسخ "رابط البيانات" بنجاح!\n\nمهم جداً: هذا الرابط يحتوي على كل الأسماء والحضور. أرسل هذا الرابط تحديداً عبر واتساب، وعندما يفتحه الطرف الآخر سيجد كل البيانات موجودة عنده.');
        }).catch(() => {
          // Fallback if clipboard fails
          prompt('لم نتمكن من النسخ تلقائياً، يرجى نسخ هذا الرابط يدوياً وإرساله:', finalUrl);
        });
      } else {
        prompt('يرجى نسخ هذا الرابط يدوياً وإرساله:', finalUrl);
      }
    } catch (e) {
      alert('حدث خطأ أثناء توليد الرابط. يرجى المحاولة مرة أخرى.');
    }
  };

  // Check for data in URL on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#data=')) {
      try {
        const encoded = hash.split('=')[1];
        const json = decodeURIComponent(escape(atob(encoded)));
        const data = JSON.parse(json);
        
        if (data.attendance) setAttendance(data.attendance);
        if (data.profile) setProfile(data.profile);
        if (data.supplier) setSupplier(data.supplier);
        if (data.school) setSchool(data.school);
        
        // Remove hash to clean up URL
        window.history.replaceState(null, '', window.location.pathname);
        alert('تم تحميل البيانات من الرابط بنجاح!');
      } catch (err) {
        console.error('Failed to load shared data', err);
      }
    }
  }, []);

  const exportData = () => {
    const data = {
      attendance,
      profile,
      supplier,
      school
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `milk_manager_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.attendance) setAttendance(data.attendance);
        if (data.profile) setProfile(data.profile);
        if (data.supplier) setSupplier(data.supplier);
        if (data.school) setSchool(data.school);
        alert('تم استيراد البيانات بنجاح!');
      } catch (err) {
        alert('خطأ في قراءة ملف النسخة الاحتياطية');
      }
    };
    reader.readAsText(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 2 ميجابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSupplier(prev => ({
        ...prev,
        logo: event.target?.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setSupplier(prev => ({
      ...prev,
      logo: undefined
    }));
  };

  const themes = [
    { name: 'الافتراضي (أسود)', color: '#0f172a' },
    { name: 'أزرق ملكي', color: '#1d4ed8' },
    { name: 'أزرق ليلي', color: '#1e3a8a' },
    { name: 'أخضر محترف', color: '#15803d' },
    { name: 'بورجوندي', color: '#7f1d1d' },
    { name: 'رمادي فحمي', color: '#374151' },
  ];

  const fontStyles = [
    { name: 'افتراضي (بسيط)', value: 'sans', class: 'font-sans' },
    { name: 'أنيق (تجوال)', value: 'elegant', class: 'font-elegant' },
    { name: 'رسمي (الأميري)', value: 'formal', class: 'font-formal' },
    { name: 'كلاسيكي (كايرو)', value: 'standard', class: 'font-standard' },
    { name: 'تقني (مونو)', value: 'mono', class: 'font-mono' },
  ];

  const currentTheme = supplier.themeColor || '#0f172a';
  const currentFontClass = `font-${supplier.fontFamily || 'sans'}`;

  const [view, setView] = useState<'calendar' | 'invoice' | 'receipt' | 'attendance_report' | 'settings'>('calendar');

  // Persistence
  useEffect(() => {
    localStorage.setItem('milk_attendance', JSON.stringify(attendance));
    localStorage.setItem('worker_profile', JSON.stringify(profile));
    localStorage.setItem('supplier_info', JSON.stringify(supplier));
    localStorage.setItem('school_info', JSON.stringify(school));
  }, [attendance, profile, supplier, school]);

  // Calendar logic for input view
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonthView = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const stats = useMemo(() => {
    const daysInPeriod = eachDayOfInterval({ start: reportStartDate, end: reportEndDate });
    let absent = 0;
    let workDaysInPeriod = 0;

    daysInPeriod.forEach(day => {
      // Sunday is 0 in date-fns getDay()
      if (getDay(day) === 0) return;

      workDaysInPeriod++;
      const key = format(day, 'yyyy-MM-dd');
      if (attendance[key] === 'absent') absent++;
    });

    const worked = workDaysInPeriod - absent;
    const totalBottles = worked * profile.bottlesPerDay;
    const totalPrice = totalBottles * profile.pricePerBottle;

    return { worked, absent, totalBottles, totalPrice, periodDays: workDaysInPeriod };
  }, [attendance, reportStartDate, reportEndDate, profile]);

  const toggleDayStatus = (date: Date) => {
    // Sunday is 0
    if (getDay(date) === 0) return;
    
    const key = format(date, 'yyyy-MM-dd');
    setAttendance(prev => ({
      ...prev,
      [key]: prev[key] === 'absent' ? 'none' : 'absent'
    }));
  };

  const handlePrint = () => {
    // 1. Try to focus the window first
    window.focus();
    
    // 2. Small delay to ensure focus and layout are ready
    setTimeout(() => {
      try {
        // 3. Attempt to print
        const printSuccess = window.print();
        
        // Note: window.print() usually returns undefined, so we can't easily check success.
        // But we can check if it threw an error.
      } catch (e) {
        console.error('Print failed:', e);
        alert('حدث خطأ أثناء محاولة الطباعة. يرجى التأكد من فتح التطبيق في نافذة مستقلة (عبر السهم في الزاوية العلوية) والمحاولة مرة أخرى.');
      }
    }, 500);
  };

  useEffect(() => {
    document.title = "مدير وصولات الحليب";
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans" dir="rtl">
      {/* Sidebar / Navigation */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-slate-900 tracking-tight">إدارة وصولات الحليب</h1>
            <p className="text-xs text-slate-500 font-medium">سجل الحضور والمشتريات</p>
          </div>
        </div>

        <nav className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setView('calendar')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
              view === 'calendar' ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            الجدول الرئيسي
          </button>
          <button 
            onClick={() => setView('attendance_report')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
              view === 'attendance_report' ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            جدول الحضور
          </button>
          <button 
            onClick={() => setView('invoice')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
              view === 'invoice' ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            الفاتورة
          </button>
          <button 
            onClick={() => setView('receipt')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
              view === 'receipt' ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            وصل الاستلام
          </button>
          <button 
            onClick={() => setView('settings')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
              view === 'settings' ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            الإعدادات
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.open(window.location.href, '_blank')}
            className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="افتح في نافذة جديدة لحل مشاكل الطباعة"
          >
            <SettingsIcon className="w-4 h-4" />
            فتح في نافذة جديدة (للتباعة)
          </button>
          <button 
            onClick={generateShareLink}
            className={cn(
              "hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 cursor-pointer border",
              shareStatus === 'success' 
                ? "bg-green-600 text-white border-green-500" 
                : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
            )}
            title="انسخ رابطاً يحتوي على كل البيانات لمشاركته"
          >
            <Receipt className="w-4 h-4" />
            {shareStatus === 'success' ? 'تم نسخ الرابط' : 'مشاركة البيانات'}
          </button>
          <div className="text-left hidden md:block">
            <p className="text-sm font-bold text-slate-900">{profile.name}</p>
            <p className="text-xs text-slate-500">عامل</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 border border-white shadow-sm">
            <User className="w-6 h-6" />
          </div>
        </div>
      </header>
      
      {/* Mobile Help / Print Button */}
      <div className="lg:hidden p-3 bg-orange-600 text-white flex items-center justify-between no-print border-b border-orange-500">
        <span className="text-xs font-bold">مشاكل في الطباعة؟</span>
        <button 
          onClick={() => window.open(window.location.href, '_blank')}
          className="bg-white text-orange-600 px-4 py-2 rounded-lg text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          افتح في نافذة جديدة
        </button>
      </div>

      {/* Mobile Share Button */}
      <div className="md:hidden p-4 bg-blue-600 text-white flex items-center justify-between no-print">
        <span className="text-xs font-bold">لحفظ البيانات أو إرسالها للغير:</span>
        <button 
          onClick={generateShareLink}
          className="bg-white text-blue-600 px-4 py-2 rounded-lg text-xs font-black shadow-sm"
        >
          {shareStatus === 'success' ? '✅ تم النسخ' : 'اضغط للنسخ والإرسال'}
        </button>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait" initial={false}>
          {view === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-12">
                <div className="border-b border-slate-100 pb-8">
                  <h2 className="text-2xl font-black text-slate-900 mb-2">الإعدادات العامة</h2>
                  <p className="text-slate-500 text-sm">تحكم في كافة بيانات المدرسة، المزود والعامل</p>
                </div>

                <div>
                   <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <SettingsIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold">إعدادات المدرسة</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase">اسم المدرسة</label>
                      <input 
                        type="text" 
                        value={school.name}
                        onChange={(e) => setSchool({...school, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                   <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <SettingsIcon className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-bold">بيانات المزود وتخصيص القالب</h3>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      <div className="space-y-4">
                        <label className="text-xs font-black text-slate-400 uppercase block">شعار الشركة (اختياري)</label>
                        <div className="flex items-center gap-6">
                          <div className={cn(
                            "w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-white shadow-sm",
                            supplier.logo ? "border-blue-200" : "border-slate-200"
                          )}>
                            {supplier.logo ? (
                              <img src={supplier.logo} alt="Logo preview" className="w-full h-full object-contain" />
                            ) : (
                              <User className="w-8 h-8 text-slate-300" />
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="inline-block bg-white border border-slate-200 text-slate-900 px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:bg-slate-50 transition-all cursor-pointer">
                              {supplier.logo ? 'تغيير الشعار' : 'تحميل الشعار'}
                              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            </label>
                            {supplier.logo && (
                              <button 
                                onClick={removeLogo}
                                className="block text-red-600 text-[10px] font-bold hover:underline"
                              >
                                حذف الشعار
                              </button>
                            )}
                            <p className="text-[10px] text-slate-400">يفضل صورة مربعة بخلفية بيضاء (PNG/JPG)</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-black text-slate-400 uppercase block">تنسيق ومعلومات إضافية</label>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-2">
                             <label className="text-[10px] font-bold text-slate-500">نوع الخط</label>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {fontStyles.map((font) => (
                                <button
                                  key={font.value}
                                  onClick={() => setSupplier({...supplier, fontFamily: font.value as any})}
                                  className={cn(
                                    "flex items-center justify-center p-2 rounded-xl border-2 transition-all text-xs",
                                    (supplier.fontFamily || 'sans') === font.value 
                                      ? "border-blue-600 bg-white shadow-sm" 
                                      : "border-transparent bg-slate-100 hover:bg-white"
                                  )}
                                >
                                  <span className={font.class}>{font.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500">عنوان علوي مخصص (سيظهر في أعلى كل وثيقة)</label>
                            <input 
                              type="text"
                              placeholder="مثال: الجمهورية التونسية - وزارة التربية"
                              value={supplier.customHeader || ''}
                              onChange={(e) => setSupplier({...supplier, customHeader: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500">تذييل مخصص (سيظهر في أسفل كل وثيقة)</label>
                            <input 
                              type="text"
                              placeholder="مثال: شكراً لتعاملكم معنا"
                              value={supplier.customFooter || ''}
                              onChange={(e) => setSupplier({...supplier, customFooter: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase">اسم المزود / الشركة</label>
                      <input 
                        type="text" 
                        value={supplier.name}
                        onChange={(e) => setSupplier({...supplier, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase">المعرف الجبائي</label>
                      <input 
                        type="text" 
                        value={supplier.taxId}
                        onChange={(e) => setSupplier({...supplier, taxId: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase">العنوان</label>
                      <input 
                        type="text" 
                        value={supplier.address}
                        onChange={(e) => setSupplier({...supplier, address: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase">رقم الهاتف</label>
                      <input 
                        type="text" 
                        value={supplier.phone}
                        onChange={(e) => setSupplier({...supplier, phone: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase">رقم الفاتورة التالي</label>
                      <input 
                        type="text" 
                        value={supplier.invoiceNumber}
                        onChange={(e) => setSupplier({...supplier, invoiceNumber: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                   <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <User className="w-5 h-5 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold">إعدادات العامل</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase">اسم العامل</label>
                      <input 
                        type="text" 
                        value={profile.name}
                        onChange={(e) => setProfile({...profile, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase">عدد القارورات يومياً</label>
                      <input 
                        type="number" 
                        value={profile.bottlesPerDay}
                        onChange={(e) => setProfile({...profile, bottlesPerDay: Number(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase">سعر القارورة (TND)</label>
                      <input 
                        type="number" 
                        step="0.001"
                        value={profile.pricePerBottle}
                        onChange={(e) => setProfile({...profile, pricePerBottle: Number(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase">وصف الخدمة في الفاتورة</label>
                      <input 
                        type="text" 
                        value={profile.invoiceDescription}
                        onChange={(e) => setProfile({...profile, invoiceDescription: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Receipt className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold">مشاركة البيانات ومزامنتها</h3>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-6">
                    <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                       تنبيه هام جداً ✋
                    </h4>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      الرابط الذي يظهر في أعلى المتصفح (أو زر المشاركة الخاص بالمنصة) لا ينقل بياناتك الشخصية. 
                      لإرسال البيانات (الحضور، الأسماء، التواريخ) لشخص آخر، **يجب** أن تضغط على الزر الأزرق أدناه:
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={generateShareLink}
                      className={cn(
                        "flex items-center gap-2 px-8 py-4 rounded-xl text-md font-black shadow-xl transition-all active:scale-95 cursor-pointer border-2",
                        shareStatus === 'success' 
                          ? "bg-green-600 text-white border-green-700" 
                          : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                      )}
                    >
                      <Receipt className="w-5 h-5" />
                      {shareStatus === 'success' ? 'تم نسخ الرابط بنجاح!' : 'نسخ رابط البيانات لإرساله (واتساب)'}
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 opacity-60">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Download className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold">النسخة الاحتياطية (ملفات)</h3>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => {
                        const confirmClear = confirm('هل أنت متأكد من مسح جميع البيانات؟ لا يمكن التراجع عن هذه الخطوة.');
                        if (confirmClear) {
                          localStorage.clear();
                          window.location.reload();
                        }
                      }}
                      className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-6 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-red-100 transition-all active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      مسح كافة البيانات (تصفير)
                    </button>
                    <button 
                      onClick={exportData}
                      className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-slate-100 hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      تصدير نسخة احتياطية (JSON)
                    </button>
                    <label className="flex items-center gap-2 bg-white border border-slate-200 text-slate-900 px-6 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
                      <FileText className="w-4 h-4" />
                      استرجاع نسخة احتياطية
                      <input 
                        type="file" 
                        accept=".json" 
                        onChange={importData}
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'calendar' && (
            <motion.div 
              key="calendar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Header with Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition hover:shadow-md">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">أيام العمل</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{stats.worked}</p>
                  <p className="text-xs text-slate-500 mt-1">يوم مسجل كعمل</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition hover:shadow-md">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-red-50 rounded-lg">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">أيام الغياب</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{stats.absent}</p>
                  <p className="text-xs text-slate-500 mt-1">يوم مسجل كغياب</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition hover:shadow-md">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">القارورات</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{stats.totalBottles}</p>
                  <p className="text-xs text-slate-500 mt-1">المستحق لشهر {formatTunisianMonth(currentDate)}</p>
                </div>

                <div className="bg-blue-600 p-6 rounded-2xl border border-blue-500 shadow-lg shadow-blue-100 text-white">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-bold text-white/80 bg-white/10 px-2 py-0.5 rounded-full">إجمالي المبلغ</span>
                  </div>
                  <p className="text-2xl font-black">{stats.totalPrice.toFixed(3)}</p>
                  <p className="text-xs text-white/70 mt-1">دينار تونسي (TND)</p>
                </div>
              </div>

              {/* Calendar Grid Container */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 rounded-xl">
                      <CalendarIcon className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{formatTunisianMonthYear(currentDate)}</h2>
                      <p className="text-xs text-slate-500">انقر على اليوم لتغيير الحالة</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                      className="p-2 hover:bg-white rounded-lg transition-all text-slate-600 cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setCurrentDate(new Date())}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      اليوم
                    </button>
                    <button 
                      onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                      className="p-2 hover:bg-white rounded-lg transition-all text-slate-600 cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
                    {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day) => (
                      <div key={day} className="bg-slate-50 py-4 text-center">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{day}</span>
                      </div>
                    ))}
                    
                    {/* Padding for start of month */}
                    {Array.from({ length: getDay(monthStart) }).map((_, i) => (
                      <div key={`pad-${i}`} className="bg-slate-50/50 min-h-[100px]" />
                    ))}

                    {daysInMonthView.map((day) => {
                      const key = format(day, 'yyyy-MM-dd');
                      const status = attendance[key];
                      const isTodayDate = isToday(day);
                      const isSundayDay = getDay(day) === 0;

                      return (
                        <button
                          key={key}
                          onClick={() => toggleDayStatus(day)}
                          disabled={isSundayDay}
                          className={cn(
                            "min-h-[100px] p-3 text-right flex flex-col justify-between transition-all group cursor-pointer disabled:cursor-default",
                            status === 'absent' ? "bg-red-50 hover:bg-red-100" : 
                            isSundayDay ? "bg-slate-100/50" : "bg-white hover:bg-slate-50"
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <span className={cn(
                              "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all",
                              isTodayDate ? "bg-blue-600 text-white shadow-md ring-4 ring-blue-100" : 
                              isSundayDay ? "text-slate-300" : "text-slate-400 group-hover:text-slate-900"
                            )}>
                              {format(day, 'd')}
                            </span>
                            {isSundayDay ? (
                                <div className="w-2 h-2 bg-slate-200 rounded-full" />
                            ) : status === 'absent' ? (
                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                            ) : (
                                <div className="w-2 h-2 bg-green-500 rounded-full opacity-30" />
                            )}
                          </div>

                          <div className="mt-auto">
                            {isSundayDay ? (
                              <span className="text-[10px] font-black text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded uppercase">راحة</span>
                            ) : status === 'absent' ? (
                              <span className="text-[10px] font-black text-red-700 bg-red-100 px-1.5 py-0.5 rounded uppercase">غائب</span>
                            ) : (
                              <span className="text-[10px] font-black text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded uppercase group-hover:bg-green-50 group-hover:text-green-600 group-hover:border-green-200">عمل</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Share Info Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Receipt className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold">مشاركة الرابط (هام جداً)</h3>
                </div>
                <p className="text-sm text-slate-600 mb-6 font-bold">
                  البيانات محفوظة محلياً في متصفحك. لإرسال البيانات لشخص آخر، يجب استخدام زر المشاركة باللون الأزرق.
                </p>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <button 
                    onClick={generateShareLink}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-md font-black shadow-lg transition-all active:scale-95 cursor-pointer border-2",
                      shareStatus === 'success' 
                        ? "bg-green-600 text-white border-green-700" 
                        : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                    )}
                  >
                    <Receipt className="w-5 h-5" />
                    {shareStatus === 'success' ? 'تم نسخ الرابط بنجاح!' : 'نسخ رابط البيانات لإرساله للغير'}
                  </button>
                  <button 
                    onClick={() => setView('settings')}
                    className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-md font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 cursor-pointer border border-slate-200"
                  >
                    <SettingsIcon className="w-5 h-5" />
                    الإعدادات العامة
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'attendance_report' && (
            <motion.div 
              key="attendance_report"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className={cn("bg-white border-2 max-w-4xl mx-auto mb-12 shadow-none", currentFontClass)} style={{ borderColor: currentTheme }}
            >
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-lg text-green-600">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-600">جدول الحضور والغياب التفصيلي</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex flex-col">
                          <label className="text-[10px] text-slate-400 font-bold mb-1">من تاريخ</label>
                          <input 
                            type="date" 
                            value={format(reportStartDate, 'yyyy-MM-dd')}
                            onChange={(e) => setReportStartDate(new Date(e.target.value))}
                            className="text-xs border rounded-lg px-2 py-1.5 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        </div>
                        <span className="text-xs text-slate-400 pt-5">إلى</span>
                        <div className="flex flex-col">
                          <label className="text-[10px] text-slate-400 font-bold mb-1">إلى تاريخ</label>
                          <input 
                            type="date" 
                            value={format(reportEndDate, 'yyyy-MM-dd')}
                            onChange={(e) => setReportEndDate(new Date(e.target.value))}
                            className="text-xs border rounded-lg px-2 py-1.5 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <button 
                      onClick={handlePrint}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      طباعة التقرير
                    </button>
                    <p className="text-[10px] text-slate-500 font-bold">إذا لم تظهر نافذة الطباعة، اضغط على زر "فتح في نافذة جديدة" البرتقالي في أعلى الصفحة</p>
                  </div>
                </div>

                <div className="p-12 pt-24 print-content pr-20 relative">
                  {/* Custom Header if exists */}
                  {supplier.customHeader && (
                    <div className="absolute top-8 left-0 right-0 text-center no-print-none hidden print:block">
                      <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{supplier.customHeader}</p>
                    </div>
                  )}

                  {/* Header Section */}
                  <div className="flex justify-between items-start mb-12 border-b-2 pb-8" style={{ borderColor: currentTheme }}>
                    <div className="text-right pr-20"> {/* Increased padding-right to avoid edge icons */}
                      <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{school.name}</h2>
                      <p className="text-slate-500 font-bold">
                        الفترة من {format(reportStartDate, 'dd-MM-yyyy')} إلى {format(reportEndDate, 'dd-MM-yyyy')}
                      </p>
                    </div>
                    {supplier.logo && (
                      <div className="h-20 w-32 border border-slate-100 bg-white rounded-xl p-2 shadow-sm ml-4">
                        <img src={supplier.logo} alt="Supplier Logo" className="w-full h-full object-contain" />
                      </div>
                    )}
                  </div>

                  <div className="text-center mb-12">
                    <div className="inline-block relative">
                      <h3 className="text-xl font-bold bg-slate-100 px-8 py-2 rounded-full border border-slate-200">
                        جدول تفصيلي لأيام العمل والغياب
                      </h3>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-1" style={{ backgroundColor: currentTheme }} />
                    </div>
                  </div>

                  {/* Table */}
                  <div className="mb-12">
                    <table className="w-full border-collapse border-2 text-sm" style={{ borderColor: currentTheme }}>
                      <thead>
                        <tr className="bg-slate-50 border-b-2" style={{ borderColor: currentTheme }}>
                          <th className="border-2 p-4 text-right font-black" style={{ borderColor: currentTheme }}>اسم العامل</th>
                          <th className="border-2 p-4 text-center font-black" style={{ borderColor: currentTheme }}>عدد أيام الفترة</th>
                          <th className="border-2 p-4 text-center font-black" style={{ borderColor: currentTheme }}>عدد أيام الغياب</th>
                          <th className="border-2 p-4 text-center font-black" style={{ borderColor: currentTheme }}>العدد الفعلي (أيام العمل)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border-2 p-4 font-bold" style={{ borderColor: currentTheme }}>{profile.name}</td>
                          <td className="border-2 p-4 text-center font-bold" style={{ borderColor: currentTheme }}>{stats.periodDays}</td>
                          <td className="border-2 p-4 text-center font-bold text-red-600" style={{ borderColor: currentTheme }}>{stats.absent}</td>
                          <td className="border-2 p-4 text-center font-black text-green-700 bg-green-50" style={{ borderColor: currentTheme }}>{stats.worked}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                {/* Signature Section */}
                <div className="mt-20 flex justify-end">
                  <div className="text-center min-w-[200px] border-t-2 pt-4" style={{ borderColor: currentTheme }}>
                    <p className="font-black text-slate-900">إمضاء المدير</p>
                    <div className="h-24" />
                  </div>
                </div>

                {/* Custom Footer if exists */}
                {supplier.customFooter && (
                  <div className="mt-12 pt-8 border-t border-slate-100 text-center no-print-none hidden print:block">
                    <p className="text-xs text-slate-400 font-bold">{supplier.customFooter}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'invoice' && (
            <motion.div 
              key="invoice"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className={cn("bg-white border-2 max-w-4xl mx-auto mb-12 shadow-none", currentFontClass)} style={{ borderColor: currentTheme }}
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-600">عرض الفاتورة للمزود</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex flex-col">
                        <label className="text-[10px] text-slate-400 font-bold mb-1">من تاريخ</label>
                        <input 
                          type="date" 
                          value={format(reportStartDate, 'yyyy-MM-dd')}
                          onChange={(e) => setReportStartDate(new Date(e.target.value))}
                          className="text-xs border rounded-lg px-2 py-1.5 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                      <span className="text-xs text-slate-400 pt-5">إلى</span>
                      <div className="flex flex-col">
                        <label className="text-[10px] text-slate-400 font-bold mb-1">إلى تاريخ</label>
                        <input 
                          type="date" 
                          value={format(reportEndDate, 'yyyy-MM-dd')}
                          onChange={(e) => setReportEndDate(new Date(e.target.value))}
                          className="text-xs border rounded-lg px-2 py-1.5 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة الفاتورة
                  </button>
                  <p className="text-[10px] text-slate-500 font-bold">إذا لم تفتح نافذة الطباعة، استعمل الزر البرتقالي في أعلى الصفحة (فتح في نافذة جديدة)</p>
                </div>
              </div>

              <div className="p-12 pt-24 print-content pr-20 relative">
                {/* Custom Header if exists */}
                {supplier.customHeader && (
                  <div className="absolute top-8 left-0 right-0 text-center no-print-none hidden print:block">
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{supplier.customHeader}</p>
                  </div>
                )}

                {/* Invoice Header */}
                <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-8 border-b-4 pb-8" style={{ borderColor: currentTheme }}>
                  <div className="flex items-center gap-6 pr-10">
                    {supplier.logo && (
                      <div className="w-24 h-24 bg-white rounded-xl border border-slate-100 p-2 shadow-sm">
                        <img src={supplier.logo} alt="Supplier Logo" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div>
                      <p className="font-black text-slate-900 text-3xl mb-1">{supplier.name}</p>
                      <p className="text-slate-600 text-sm font-bold">{supplier.address}</p>
                      <p className="text-slate-600 text-sm font-bold">الهاتف: {supplier.phone}</p>
                      <p className="text-slate-600 text-sm font-bold">المعرف الجبائي: {supplier.taxId}</p>
                    </div>
                  </div>
                  <div className="text-left md:text-left">
                    <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">فاتورة عدد {supplier.invoiceNumber}</h2>
                    <div className="space-y-1">
                      <p className="text-slate-700 text-sm font-black">التاريخ المستخرج: {formatFullTunisianDate(new Date())}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-12 py-4">
                  <div className="border-r-4 pr-6" style={{ borderColor: currentTheme }}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">موجهة إلى</label>
                    <p className="font-black text-slate-900 text-2xl tracking-tight">{school.name}</p>
                  </div>
                  <div className="text-left flex flex-col justify-center">
                  </div>
                </div>

                {/* Table */}
                <div className="mb-12">
                  <table className="w-full border-collapse border-2 text-sm" style={{ borderColor: currentTheme }}>
                    <thead>
                      <tr className="bg-slate-50 border-b-2" style={{ borderColor: currentTheme }}>
                        <th className="py-4 px-6 text-right font-black uppercase tracking-wider border-l-2" style={{ borderColor: currentTheme }}>الوصف</th>
                        <th className="py-4 px-6 text-center font-black uppercase tracking-wider border-l-2" style={{ borderColor: currentTheme }}>الكمية (قارورة)</th>
                        <th className="py-4 px-6 text-center font-black uppercase tracking-wider border-l-2" style={{ borderColor: currentTheme }}>سعر الوحدة</th>
                        <th className="py-4 px-6 text-left font-black uppercase tracking-wider">المجموع</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b-2" style={{ borderColor: currentTheme }}>
                        <td className="py-5 px-6 border-l-2" style={{ borderColor: currentTheme }}>
                          <p className="font-black text-slate-900 text-base">{profile.invoiceDescription}</p>
                        </td>
                        <td className="py-5 px-6 text-center font-black text-slate-700 border-l-2 text-lg" style={{ borderColor: currentTheme }}>{stats.totalBottles} قارورة</td>
                        <td className="py-5 px-6 text-center font-black text-slate-700 border-l-2 text-lg" style={{ borderColor: currentTheme }}>{profile.pricePerBottle.toFixed(3)} <span className="text-[10px]">TND</span></td>
                        <td className="py-5 px-6 text-left font-black text-slate-900 text-xl">{stats.totalPrice.toFixed(3)} <span className="text-sm">TND</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals Section */}
                <div className="flex flex-col items-end mb-12 text-black">
                  <div className="w-full max-w-[400px] space-y-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>المجموع الصافي:</span>
                      <span>TND {stats.totalPrice.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>الأداء على القيمة المضافة:</span>
                      <span>TND 0.000</span>
                    </div>
                    <div className="pt-4 border-t-4 flex justify-between text-3xl font-black" style={{ borderColor: currentTheme }}>
                      <span>الإجمالي:</span>
                      <span style={{ color: currentTheme }}>TND {stats.totalPrice.toFixed(3)}</span>
                    </div>
                  </div>
                </div>

                {/* Stop Amount in Words */}
                <div className="mt-8 p-8 bg-slate-50 border-4 border-double" style={{ borderColor: currentTheme }}>
                  <p className="text-lg font-black text-slate-900 leading-relaxed text-center">
                    أوقفت هذه الفاتورة بمبلغ قدره: <span className="underline decoration-slate-200 underline-offset-8 decoration-4" style={{ color: currentTheme }}>{tafqeetTunisian(stats.totalPrice)}</span>
                  </p>
                </div>

                {/* Footer Signatures */}
                <div className="mt-16 flex justify-start">
                  <div className="border-t-2 pt-6 w-full max-w-[300px]" style={{ borderColor: currentTheme }}>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-12">إمضاء المزود</p>
                    <div className="h-24" />
                  </div>
                </div>

                {/* Custom Footer if exists */}
                {supplier.customFooter && (
                  <div className="mt-12 pt-8 border-t border-slate-100 text-center no-print-none hidden print:block">
                    <p className="text-xs text-slate-400 font-bold">{supplier.customFooter}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'receipt' && (
            <motion.div 
              key="receipt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-3xl mx-auto space-y-8"
            >
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm no-print">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">إعداد وصل الاستلام</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex flex-col">
                        <label className="text-[10px] text-slate-400 font-bold mb-1">من تاريخ</label>
                        <input 
                          type="date" 
                          value={format(reportStartDate, 'yyyy-MM-dd')}
                          onChange={(e) => setReportStartDate(new Date(e.target.value))}
                          className="text-xs border rounded-lg px-2 py-1.5 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                      <span className="text-xs text-slate-400 pt-5">إلى</span>
                      <div className="flex flex-col">
                        <label className="text-[10px] text-slate-400 font-bold mb-1">إلى تاريخ</label>
                        <input 
                          type="date" 
                          value={format(reportEndDate, 'yyyy-MM-dd')}
                          onChange={(e) => setReportEndDate(new Date(e.target.value))}
                          className="text-xs border rounded-lg px-2 py-1.5 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={cn("bg-white border-2 p-8 pt-24 shadow-none print-content relative w-full pr-20", currentFontClass)} style={{ borderColor: currentTheme }}>
                <div className="relative z-10">
                  {/* Custom Header if exists */}
                  {supplier.customHeader && (
                    <div className="absolute top-8 left-0 right-0 text-center no-print-none hidden print:block">
                      <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{supplier.customHeader}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-12 text-black pr-10">
                    <div className="flex items-center gap-6">
                      {supplier.logo && (
                        <div className="w-16 h-16 bg-white rounded-lg border border-slate-100 p-1">
                          <img src={supplier.logo} alt="Supplier Logo" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="text-right">
                        <h3 className="text-xl font-black">{school.name}</h3>
                        <p className="text-xs font-bold">وصل استلام حليب</p>
                      </div>
                    </div>
                    <div className="text-left font-black text-xs">
                      الرقم: {format(currentDate, 'yyyyMM')}-{supplier.invoiceNumber}
                    </div>
                  </div>

                  <div className="flex justify-center mb-10">
                    <div className="border-2 px-10 py-3 rounded-full" style={{ borderColor: currentTheme }}>
                       <h2 className="text-2xl font-black text-slate-900">وصل استلام حصة الحليب</h2>
                    </div>
                  </div>
                  
                  <div className="space-y-8 text-slate-900 leading-relaxed mb-12 text-justify-arabic px-4">
                    <p className="text-xl">
                      أنا الموقع أسفله السيد <span className="font-black border-b-2 px-2" style={{ borderColor: currentTheme }}>{profile.name}</span> ، 
                      أقر بأنني قد استلمت وصلاً لشراء عدد <span className="font-black border-b-2 px-2" style={{ borderColor: currentTheme }}>{stats.totalBottles}</span> قارورة حليب، 
                      وذلك عن الفترة الممتدة من <span className="font-bold border-b-2 px-2" style={{ borderColor: currentTheme }}>{format(reportStartDate, 'dd-MM-yyyy')}</span> إلى <span className="font-bold border-b-2 px-2" style={{ borderColor: currentTheme }}>{format(reportEndDate, 'dd-MM-yyyy')}</span>.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 border-y-2 w-full mb-16" style={{ borderColor: currentTheme }}>
                    <div className="border-l-2 p-8 flex flex-col items-center justify-center" style={{ borderColor: currentTheme }}>
                      <p className="text-sm font-black text-slate-500 mb-2 uppercase">إجمالي القوارير</p>
                      <p className="text-4xl font-black text-slate-900">{stats.totalBottles} قارورة</p>
                    </div>
                    <div className="p-8 flex flex-col items-center justify-center">
                      <p className="text-sm font-black text-slate-500 mb-2 uppercase">عدد أيام العمل</p>
                      <p className="text-4xl font-black text-slate-900">{stats.worked} يوم</p>
                    </div>
                  </div>

                  <div className="mt-20 flex justify-between items-end px-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-500 mb-1">حرر بتاريخ</p>
                      <p className="font-black text-slate-900 text-xl">{formatFullTunisianDate(new Date())}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-400 text-sm">إمضاء العامل بصحة الاستلام ..........................................</p>
                    </div>
                  </div>

                  {/* Custom Footer if exists */}
                  {supplier.customFooter && (
                    <div className="mt-12 pt-8 border-t border-slate-100 text-center no-print-none hidden print:block">
                      <p className="text-xs text-slate-400 font-bold">{supplier.customFooter}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 no-print">
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 cursor-pointer"
                >
                  <Printer className="w-5 h-5" />
                  طباعة نسخة الاستلام
                </button>
                <p className="text-xs text-orange-600 font-bold flex items-center gap-1">
                  💡 ملاحظة: لنجاح الطباعة، تأكد من استعمال زر "فتح في نافذة جديدة" في أعلى الشاشة أولاً.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-8 bg-slate-100 border-t border-slate-200 no-print text-center">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
          نظام إدارة وصولات الحليب - {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
