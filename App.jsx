import React, { useState, useMemo, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  query, 
  deleteDoc, 
  updateDoc, 
  enableIndexedDbPersistence 
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Receipt, 
  Settings, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar,
  ArrowUpRight,
  ArrowDownLeft, 
  Filter,
  Download, 
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Smartphone,
  Palette,
  Trash2,
  Target,
  AlertTriangle,
  PieChart as PieIcon,
  User,
  Moon,
  Sun,
  FileText,
  FileSpreadsheet,
  PiggyBank,
  Gift,
  ShoppingBag,
  Building2,
  Cloud,
  Mail,
  RefreshCw,
  WifiOff
} from 'lucide-react';

// --- Firebase Configuration ---
  apiKey: "AIzaSyAQo8hMmZ6hgqhga6-oSFw_tG8NEfg8jv0",
  authDomain: "promint-99f8e.firebaseapp.com",
  projectId: "promint-99f8e",
  storageBucket: "promint-99f8e.firebasestorage.app",
  messagingSenderId: "263707102690",
  appId: "1:263707102690:web:2c7116155bbe8acb743dbb",
  measurementId: "G-8KNZ8B883B"

// --- Enable Offline Persistence ---
// This allows the app to work fully offline and sync later.
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
    } else if (err.code === 'unimplemented') {
      console.warn("The current browser does not support all of the features required to enable persistence");
    }
  });
} catch (e) {
  console.error("Offline setup error", e);
}

// --- Assets: Premium Typographic Centered PM Logo ---
const PROMINT_LOGO_SVG = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="premiumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#D946EF;stop-opacity:1" />
    </linearGradient>
    <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="12" />
      <feOffset dx="0" dy="8" result="offsetblur" />
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.4" />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" rx="140" fill="url(#premiumGrad)"/>
  <g filter="url(#logoShadow)" transform="translate(-71.5, 0)">
    <path d="M140 380V132H250C315 132 340 170 340 215C340 260 315 298 250 298H195V380H140ZM195 245H245C275 245 285 235 285 215C285 195 275 185 245 185H195V245Z" fill="white"/>
    <path d="M340 380V132H400L450 240L500 132H560V380H505V210L450 320L395 210V380H340Z" fill="white" transform="translate(-45, 0)"/>
    <rect x="290" y="245" width="55" height="135" fill="white" opacity="1"/>
  </g>
</svg>
`;

const LOGO_DATA_URL = `data:image/svg+xml;base64,${btoa(PROMINT_LOGO_SVG)}`;

const CURRENCY_OPTIONS = [
  { code: 'USD', label: 'USD ($)', symbol: '$' },
  { code: 'LKR', label: 'LKR (Rs.)', symbol: 'Rs.' },
  { code: 'EUR', label: 'EUR (€)', symbol: '€' },
  { code: 'GBP', label: 'GBP (£)', symbol: '£' },
  { code: 'INR', label: 'INR (₹)', symbol: '₹' },
  { code: 'JPY', label: 'JPY (¥)', symbol: '¥' },
  { code: 'CAD', label: 'CAD ($)', symbol: '$' },
  { code: 'AUD', label: 'AUD ($)', symbol: '$' },
  { code: 'AED', label: 'AED (د.إ)', symbol: 'د.إ' },
  { code: 'CNY', label: 'CNY (¥)', symbol: '¥' },
];

const PRESET_COLORS = [
  '#A855F7', '#7C3AED', '#D946EF', '#6366F1', '#EC4899', 
  '#FF7043', '#66BB6A', '#42A5F5', '#FFCA28', '#26A69A'
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [accounts] = useState([
    { id: '1', name: 'Checking', balance: 0 },
    { id: '2', name: 'Savings', balance: 0 },
  ]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [profile, setProfile] = useState({
    name: 'User',
    email: '',
    currency: 'LKR'
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);

  // --- Auth & Initial Setup ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Inject PWA Manifest & Meta
    const meta = document.createElement('meta');
    meta.name = "apple-mobile-web-app-capable";
    meta.content = "yes";
    document.head.appendChild(meta);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Firestore Real-time Sync ---
  useEffect(() => {
    if (!user) return;

    setSyncing(true);
    const uid = user.uid;

    const txRef = collection(db, 'artifacts', appId, 'users', uid, 'transactions');
    const catRef = collection(db, 'artifacts', appId, 'users', uid, 'categories');
    const budRef = collection(db, 'artifacts', appId, 'users', uid, 'budgets');
    const savRef = collection(db, 'artifacts', appId, 'users', uid, 'savingsGoals');
    const profileRef = doc(db, 'artifacts', appId, 'users', uid, 'settings', 'profile');

    const unsubTx = onSnapshot(txRef, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.date.localeCompare(a.date)));
      setSyncing(false);
    }, () => setSyncing(false));

    const unsubCat = onSnapshot(catRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(data.length > 0 ? data : [
        { id: '1', name: 'Food', color: '#FF7043', type: 'Expense' },
        { id: '2', name: 'Salary', color: '#66BB6A', type: 'Income' },
        { id: '3', name: 'Rent', color: '#7E57C2', type: 'Expense' }
      ]);
    });

    const unsubBud = onSnapshot(budRef, (snapshot) => {
      setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSav = onSnapshot(savRef, (snapshot) => {
      setSavingsGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProfile = onSnapshot(profileRef, (doc) => {
      if (doc.exists()) setProfile(doc.data());
    });

    return () => { unsubTx(); unsubCat(); unsubBud(); unsubSav(); unsubProfile(); };
  }, [user]);

  // --- Derived Calculations ---
  const currentMonthKey = new Date().toISOString().slice(0, 7);

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'Income').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const expenses = transactions.filter(t => t.type === 'Expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
    return { 
      income, 
      expenses, 
      net: income + expenses, 
      balance: (income + expenses) 
    };
  }, [transactions]);

  const budgetPerformance = useMemo(() => {
    return budgets.map(b => {
      const actual = transactions
        .filter(t => t.category === b.category && t.date.startsWith(b.month))
        .reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0);
      return { 
        ...b, 
        actual, 
        remaining: b.amount - actual, 
        percent: b.amount > 0 ? Math.min((actual / b.amount) * 100, 100) : 0, 
        isOver: actual > b.amount 
      };
    });
  }, [budgets, transactions]);

  const totalBudgetStats = useMemo(() => {
    const currentBudgets = budgets.filter(b => b.month === currentMonthKey);
    const totalAllocated = currentBudgets.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalSpent = currentBudgets.reduce((acc, b) => {
      const actual = transactions
        .filter(t => t.category === b.category && t.date.startsWith(currentMonthKey))
        .reduce((sum, curr) => sum + Math.abs(Number(curr.amount)), 0);
      return acc + actual;
    }, 0);

    return { totalAllocated, totalSpent, isOver: totalSpent > totalAllocated, remaining: totalAllocated - totalSpent, percent: totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0 };
  }, [budgets, transactions, currentMonthKey]);

  const savingsStats = useMemo(() => {
    const totalInAccount = 0; // Handled by cumulative logic or initial balance in setup
    const totalSaved = transactions.filter(t => t.category === 'Savings' || t.type === 'Transfer').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const allocated = savingsGoals.reduce((acc, curr) => acc + Number(curr.saved), 0);
    return { total: Math.max(0, totalSaved), allocated, remaining: Math.max(0, totalSaved - allocated) };
  }, [transactions, savingsGoals]);

  const todayDate = new Date().toISOString().split('T')[0];
  const firstOfMonthDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [reportRange, setReportRange] = useState({ start: firstOfMonthDate, end: todayDate });

  const reportTransactions = useMemo(() => {
    return transactions.filter(t => t.date >= reportRange.start && t.date <= reportRange.end);
  }, [transactions, reportRange]);

  const reportSummary = useMemo(() => {
    const income = reportTransactions.filter(t => t.type === 'Income').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const expense = reportTransactions.filter(t => t.type === 'Expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
    return { income, expense, net: income + expense };
  }, [reportTransactions]);

  // --- Handlers ---
  const saveToCloud = async (collectionName, id, data) => {
    if (!user) return;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, collectionName, id);
    await setDoc(ref, data, { merge: true });
  };

  const removeFromCloud = async (collectionName, id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, collectionName, id));
  };

  const addTransaction = (newTx) => {
    const id = Date.now().toString();
    saveToCloud('transactions', id, newTx);
    setIsModalOpen(false);
  };

  const deleteTransaction = (id) => removeFromCloud('transactions', id);

  const addCategory = (newCat) => {
    const id = Date.now().toString();
    saveToCloud('categories', id, newCat);
    setIsCategoryModalOpen(false);
  };

  const deleteCategory = (id) => removeFromCloud('categories', id);

  const addBudget = (newBudget) => {
    const id = Date.now().toString();
    saveToCloud('budgets', id, newBudget);
    setIsBudgetModalOpen(false);
  };

  const deleteBudget = (id) => removeFromCloud('budgets', id);

  const addSavingsGoal = (newGoal) => {
    const id = Date.now().toString();
    saveToCloud('savingsGoals', id, newGoal);
    setIsGoalModalOpen(false);
  };

  const deleteSavingsGoal = (id) => removeFromCloud('savingsGoals', id);

  const updateProfile = (data) => {
    if (!user) return;
    setProfile(data);
    setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), data);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: profile.currency 
    }).format(val);
  };

  const exportReport = () => {
    const headers = ["Date", "Type", "Category", "Notes", "Amount"];
    const rows = reportTransactions.map(t => [t.date, t.type, t.category, `"${t.notes}"`, t.amount]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `PROMINT_Report_${reportRange.start}_to_${reportRange.end}.csv`);
    link.click();
  };

  const emailBackup = () => {
    const data = { transactions, budgets, savingsGoals, profile };
    const dateStr = new Date().toLocaleDateString();
    
    let csvSummary = "DATE,TYPE,CATEGORY,DESCRIPTION,AMOUNT\n";
    transactions.slice(0, 100).forEach(t => {
      csvSummary += `${t.date},${t.type},${t.category},"${t.notes}",${t.amount}\n`;
    });

    const body = `PROMINT SECURE DATA BACKUP\n----------------------------\nExport Date: ${dateStr}\nUser: ${profile.name}\nNet Balance: ${formatCurrency(stats.balance)}\n\nRECENT TRANSACTIONS (CSV):\n${csvSummary}\n\nRAW SYSTEM DATA (FOR RESTORE):\n${JSON.stringify(data)}`;
    
    window.location.href = `mailto:${profile.email}?subject=PROMINT Data Backup - ${dateStr}&body=${encodeURIComponent(body)}`;
  };

  const getGoalIcon = (iconName) => {
    switch(iconName) {
      case 'Gift': return <Gift size={18} />;
      case 'Building2': return <Building2 size={18} />;
      default: return <ShoppingBag size={18} />;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex font-sans pb-20 md:pb-0`}>
      
      {/* Sidebar (Desktop) */}
      <nav className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-600 rounded-xl overflow-hidden shadow-lg shadow-violet-200">
            <img src={LOGO_DATA_URL} alt="PROMINT" className="w-full h-full object-cover" />
          </div>
          <span className="text-violet-600 dark:text-violet-400 font-black text-2xl tracking-tighter">PROMINT</span>
        </div>
        <div className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={18}/>} label="Dashboard" />
          <NavItem active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<Receipt size={18}/>} label="Transactions" />
          <NavItem active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} icon={<Target size={18}/>} label="Budgets" />
          <NavItem active={activeTab === 'savings'} onClick={() => setActiveTab('savings')} icon={<PiggyBank size={18}/>} label="Savings" />
          <NavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FileText size={18}/>} label="Reports" />
          <NavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={18}/>} label="Profile" />
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18}/>} label="Settings" />
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button onClick={() => setIsModalOpen(true)} className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-violet-100">
            <Plus size={18} /> Add Entry
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto max-h-screen p-4 md:p-8">
        <header className="flex justify-between items-center mb-8 pt-4 md:pt-0">
          <div className="flex items-center gap-4">
            <div className="md:hidden w-8 h-8 bg-violet-600 rounded-lg overflow-hidden">
               <img src={LOGO_DATA_URL} alt="PROMINT" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold dark:text-white capitalize tracking-tight hidden md:block">{activeTab}</h1>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                {!isOnline ? <WifiOff size={12} className="text-rose-500" /> : syncing ? <RefreshCw size={12} className="animate-spin text-violet-500" /> : <CheckCircle2 size={12} className="text-emerald-500" />}
                {!isOnline ? 'Offline Mode' : syncing ? 'Syncing Cloud...' : 'Encrypted & Safe'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div onClick={() => setActiveTab('profile')} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-full cursor-pointer hover:border-violet-400">
              <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold uppercase">{profile.name.charAt(0)}</div>
              <span className="hidden sm:inline text-sm font-bold dark:text-slate-200">{profile.name}</span>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Net Balance" value={formatCurrency(stats.balance)} icon={<Wallet size={20}/>} bg="bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400" />
              <StatCard label="Income" value={formatCurrency(stats.income)} icon={<ArrowUpRight size={20}/>} bg="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" />
              <StatCard label="Expenses" value={formatCurrency(stats.expenses)} icon={<ArrowDownLeft size={20}/>} bg="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400" />
              <StatCard label="Savings" value={formatCurrency(savingsStats.total)} icon={<PiggyBank size={20}/>} bg="bg-fuchsia-50 dark:bg-fuchsia-950/30 text-fuchsia-600 dark:text-fuchsia-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-hidden relative transition-all">
                   <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><PieIcon size={18} className="text-violet-600" /> Budget Overview</h3>
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative w-32 h-32 flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="58" fill="transparent" stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} strokeWidth="10" />
                        <circle cx="64" cy="64" r="58" fill="transparent" stroke={totalBudgetStats.isOver ? '#f43f5e' : '#7c3aed'} strokeWidth="10" strokeDasharray={364} strokeDashoffset={364 - (364 * Math.min(totalBudgetStats.percent, 100)) / 100} strokeLinecap="round" className="transition-all duration-1000" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className={`text-xl font-black ${totalBudgetStats.isOver ? 'text-rose-600' : 'text-violet-600 dark:text-violet-400'}`}>{Math.round(totalBudgetStats.percent)}%</span>
                        <span className="text-[9px] uppercase font-bold text-slate-400">Used</span>
                      </div>
                    </div>
                    <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <DetailBox label="Allocated" value={formatCurrency(totalBudgetStats.totalAllocated)} />
                      <DetailBox label="Spent" value={formatCurrency(totalBudgetStats.totalSpent)} color={totalBudgetStats.isOver ? 'text-rose-600' : 'text-emerald-600'} />
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center justify-between">
                    <span>Recent Activity</span>
                    <button onClick={() => setActiveTab('transactions')} className="text-xs text-violet-600 hover:underline">View All</button>
                  </h3>
                  <div className="space-y-4">
                    {transactions.slice(0, 5).map(tx => (
                      <TransactionRow key={tx.id} tx={tx} category={categories.find(c => c.name === tx.category)} onDelete={deleteTransaction} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 self-start">
                <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><PiggyBank size={18} className="text-fuchsia-500" /> Savings Goals</h3>
                <div className="space-y-4">
                  {savingsGoals.length > 0 ? savingsGoals.map(goal => (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                        <span className="dark:text-slate-300">{goal.name}</span>
                        <span className="text-slate-400">{formatCurrency(goal.saved)} / {formatCurrency(goal.target)}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-fuchsia-500 transition-all" style={{ width: `${Math.min((goal.saved / goal.target) * 100, 100)}%` }} />
                      </div>
                    </div>
                  )) : <p className="text-xs text-slate-400 italic">No goals active.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'savings' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard label="Total Saved" value={formatCurrency(savingsStats.total)} icon={<PiggyBank size={20}/>} bg="bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400" />
              <StatCard label="Reserved for Goals" value={formatCurrency(savingsStats.allocated)} icon={<Target size={20}/>} bg="bg-fuchsia-50 dark:bg-fuchsia-950/30 text-fuchsia-600 dark:text-fuchsia-400" />
              <StatCard label="Free Savings" value={formatCurrency(savingsStats.remaining)} icon={<Wallet size={20}/>} bg="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold dark:text-white">Savings Buckets</h3>
                <button onClick={() => setIsGoalModalOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95 shadow-lg">
                  <Plus size={18} /> New Goal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savingsGoals.map(goal => (
                  <div key={goal.id} className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 group relative overflow-hidden transition-all hover:border-violet-300 dark:hover:border-violet-800">
                    <button onClick={() => deleteSavingsGoal(goal.id)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-violet-600 mb-4 shadow-sm">
                      {getGoalIcon(goal.icon)}
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-white mb-1">{goal.name}</h4>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-4 tracking-wider">Target: {formatCurrency(goal.target)}</div>
                    <div className="space-y-2">
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 transition-all duration-1000" style={{ width: `${Math.min((goal.saved / goal.target) * 100, 100)}%` }} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-black text-slate-800 dark:text-white">{formatCurrency(goal.saved)}</span>
                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{Math.round((goal.saved / goal.target) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Budgets Tab */}
        {activeTab === 'budgets' && (
          <div className="animate-in fade-in duration-500 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold dark:text-white tracking-tight">Financial Targets</h2>
              <button onClick={() => setIsBudgetModalOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg active:scale-95">
                <Plus size={18} /> New Target
              </button>
            </div>
            
            {budgetPerformance.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {budgetPerformance.map(bp => (
                  <div key={bp.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:border-violet-300 transition-all relative group">
                    <button onClick={() => deleteBudget(bp.id)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                    <div className="mb-4">
                      <h4 className="font-bold text-slate-800 dark:text-white text-lg tracking-tight">{bp.category}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{bp.month}</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="text-2xl font-black text-violet-600 dark:text-violet-400">{formatCurrency(bp.amount)}</div>
                        <div className={`text-[10px] font-bold uppercase ${bp.isOver ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {bp.isOver ? `Over by ${formatCurrency(Math.abs(bp.remaining))}` : `${formatCurrency(bp.remaining)} left`}
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-700 ${bp.isOver ? 'bg-rose-500' : 'bg-violet-500'}`} style={{ width: `${bp.percent}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-20 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-violet-50 dark:bg-violet-950/20 rounded-2xl flex items-center justify-center text-violet-400"><Target size={32} /></div>
                <h3 className="text-lg font-bold dark:text-white">No active targets found</h3>
                <button onClick={() => setIsBudgetModalOpen(true)} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold">Create Target</button>
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div className="space-y-4 flex-1">
                  <h2 className="text-xl font-bold dark:text-white flex items-center gap-2"><Calendar className="text-violet-600" size={24} /> Period Report</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">From</label>
                      <input type="date" value={reportRange.start} onChange={(e) => setReportRange({ ...reportRange, start: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">To</label>
                      <input type="date" value={reportRange.end} onChange={(e) => setReportRange({ ...reportRange, end: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                  </div>
                </div>
                <button onClick={exportReport} disabled={reportTransactions.length === 0} className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95">
                  <FileSpreadsheet size={20} /> Export CSV
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-2">Total Income</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-500">{formatCurrency(reportSummary.income)}</p>
                </div>
                <div className="p-6 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                  <p className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 mb-2">Total Expenses</p>
                  <p className="text-2xl font-bold text-rose-700 dark:text-rose-500">{formatCurrency(reportSummary.expense)}</p>
                </div>
                <div className="p-6 bg-violet-50 dark:bg-violet-950/20 rounded-2xl border border-violet-100 dark:border-violet-900/30">
                  <p className="text-[10px] font-black uppercase text-violet-600 dark:text-violet-400 mb-2">Net Cash Flow</p>
                  <p className="text-2xl font-bold text-violet-700 dark:text-violet-500">{formatCurrency(reportSummary.net)}</p>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Preview ({reportTransactions.length})</h4>
                <div className="max-h-80 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {reportTransactions.length > 0 ? reportTransactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="text-[10px] font-bold text-slate-400 font-mono w-20">{tx.date}</div>
                        <div><p className="text-sm font-bold dark:text-white">{tx.notes}</p><p className="text-[9px] uppercase font-bold text-slate-400">{tx.category}</p></div>
                      </div>
                      <p className={`text-sm font-black ${tx.type === 'Income' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{tx.type === 'Income' ? '+' : ''}{formatCurrency(tx.amount)}</p>
                    </div>
                  )) : <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400">No records found.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl animate-in slide-in-from-right-4 duration-500 space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
              <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2"><User size={20} className="text-violet-600" /> Identity Profile</h3>
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); updateProfile(profile); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                    <input type="text" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Currency Ecosystem</label>
                    <select value={profile.currency} onChange={(e) => setProfile({...profile, currency: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-violet-500">
                      {CURRENCY_OPTIONS.map(opt => <option key={opt.code} value={opt.code}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gmail for Backup</label>
                    <input type="email" value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95">Save Profile</button>
                  <button onClick={emailBackup} type="button" className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <Mail size={18} /> Gmail Backup
                  </button>
                </div>
              </form>
            </div>
            <div className="p-6 bg-violet-50 dark:bg-violet-950/20 rounded-3xl border border-violet-100 dark:border-violet-900/30">
               <h4 className="font-bold text-violet-800 dark:text-violet-400 mb-2 flex items-center gap-2"><Cloud size={18}/> Secure Storage</h4>
               <p className="text-[11px] text-violet-600 dark:text-violet-300 leading-relaxed uppercase font-bold tracking-tight">Your data is stored locally for offline use and synced to your private PROMINT cloud.</p>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Search entries..." className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-violet-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-[10px] font-bold uppercase tracking-widest"><th className="px-6 py-4">Date</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Description</th><th className="px-6 py-4 text-right">Amount</th><th className="px-6 py-4 text-center">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.filter(t => t.notes.toLowerCase().includes(searchQuery.toLowerCase())).map(tx => {
                    const cat = categories.find(c => c.name === tx.category);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-colors">
                        <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 font-mono">{tx.date}</td>
                        <td className="px-6 py-4 text-[10px]"><span className="px-2 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: cat ? `${cat.color}15` : '#f1f5f9', color: cat ? cat.color : '#64748b' }}>{tx.category}</span></td>
                        <td className="px-6 py-4 text-sm text-slate-800 dark:text-slate-200 font-medium">{tx.notes}</td>
                        <td className={`px-6 py-4 text-sm text-right font-black ${tx.type === 'Income' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{tx.type === 'Income' ? '+' : ''}{formatCurrency(tx.amount)}</td>
                        <td className="px-6 py-4 text-center"><button onClick={() => deleteTransaction(tx.id)} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex justify-between items-center">
                <span>Manage Categories</span>
                <button onClick={() => setIsCategoryModalOpen(true)} className="text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg active:scale-95 transition-all">Add New</button>
              </h3>
              <div className="space-y-3">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: cat.color }} /><span className="font-bold text-sm dark:text-slate-300">{cat.name}</span></div>
                    <button onClick={() => deleteCategory(cat.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- Modals --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Add Record</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
            </div>
            <form className="p-6 space-y-5" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addTransaction({
                date: new Date().toISOString().split('T')[0],
                type: formData.get('type'),
                category: formData.get('category'),
                account: 'Checking',
                amount: formData.get('type') === 'Expense' ? -Math.abs(Number(formData.get('amount'))) : Math.abs(Number(formData.get('amount'))),
                notes: formData.get('notes'),
              });
            }}>
              <div className="grid grid-cols-2 gap-4">
                <label className="cursor-pointer">
                  <input type="radio" name="type" value="Expense" defaultChecked className="hidden peer" />
                  <div className="text-center p-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 peer-checked:border-rose-500 peer-checked:bg-rose-50 dark:peer-checked:bg-rose-950/20 peer-checked:text-rose-700 dark:peer-checked:text-rose-400 font-bold text-sm transition-all uppercase tracking-widest">Expense</div>
                </label>
                <label className="cursor-pointer">
                  <input type="radio" name="type" value="Income" className="hidden peer" />
                  <div className="text-center p-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-950/20 peer-checked:text-emerald-700 dark:peer-checked:text-emerald-400 font-bold text-sm transition-all uppercase tracking-widest">Income</div>
                </label>
              </div>
              <input required name="amount" type="number" step="0.01" placeholder="0.00" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-2xl dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Category</label>
                <select name="category" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500">
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <input name="notes" placeholder="Notes..." className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
              <button className="w-full bg-violet-900 hover:bg-violet-800 text-white py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95">Save</button>
            </form>
          </div>
        </div>
      )}

      {/* Goal Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><Target size={20} className="text-violet-600" /> New Goal</h3>
              <button onClick={() => setIsGoalModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
            </div>
            <form className="p-6 space-y-5" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addSavingsGoal({ name: formData.get('name'), target: parseFloat(formData.get('target')), saved: parseFloat(formData.get('saved')), icon: formData.get('icon') });
            }}>
              <input required name="name" placeholder="Target Name (e.g. Car)" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
              <div className="grid grid-cols-2 gap-4">
                <input required name="target" type="number" placeholder="Target 0.00" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
                <input required name="saved" type="number" placeholder="Already Saved" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <select name="icon" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500">
                <option value="ShoppingBag">Purchase / Needs</option>
                <option value="Gift">Gifts / Personal</option>
                <option value="Building2">Investments</option>
              </select>
              <button className="w-full bg-violet-600 hover:bg-violet-700 text-white py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95">Allocate</button>
            </form>
          </div>
        </div>
      )}

      {/* Category Creation Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><Palette size={20} className="text-violet-600" /> New Category</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
            </div>
            <form className="p-6 space-y-5" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addCategory({ name: formData.get('name'), type: formData.get('type'), color: formData.get('color') });
            }}>
              <input required name="name" placeholder="Category Name" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
              <select name="type" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium dark:text-white outline-none focus:ring-2 focus:ring-violet-500"><option value="Expense">Expense</option><option value="Income">Income</option></select>
              <div className="grid grid-cols-5 gap-2">{PRESET_COLORS.map(color => (
                <label key={color} className="relative cursor-pointer"><input type="radio" name="color" value={color} defaultChecked={color === PRESET_COLORS[0]} className="hidden peer" /><div className="w-full aspect-square rounded-lg border-2 border-transparent peer-checked:border-violet-600 dark:peer-checked:border-white peer-checked:scale-90 transition-all shadow-sm" style={{ backgroundColor: color }} /></label>
              ))}</div>
              <button className="w-full bg-violet-600 hover:bg-violet-700 text-white py-4 rounded-xl font-bold mt-2 shadow-lg active:scale-95 transition-transform">Create</button>
            </form>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><Target size={20} className="text-violet-600" /> Set Monthly Target</h3>
              <button onClick={() => setIsBudgetModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
            </div>
            <form className="p-6 space-y-5" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addBudget({ category: formData.get('category'), amount: parseFloat(formData.get('amount')), month: formData.get('month') });
            }}>
              <input required name="category" type="text" placeholder="Target Name (e.g. Shopping)" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
              <input required name="amount" type="number" step="0.01" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-violet-500" placeholder="Limit Amount" />
              <input required name="month" type="month" defaultValue={currentMonthKey} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
              <button className="w-full bg-violet-600 hover:bg-violet-700 text-white py-4 rounded-xl font-bold mt-2 transition-all shadow-lg active:scale-95 tracking-widest uppercase text-xs">Lock Target</button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-4 py-3 md:hidden flex justify-between items-center z-50 overflow-x-auto whitespace-nowrap">
        <MobileNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20}/>} />
        <MobileNavItem active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<Receipt size={20}/>} />
        <button onClick={() => setIsModalOpen(true)} className="flex-shrink-0 w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center -mt-8 shadow-xl border-4 border-white dark:border-slate-900 active:scale-90 transition-all"><Plus size={28} /></button>
        <MobileNavItem active={activeTab === 'savings'} onClick={() => setActiveTab('savings')} icon={<PiggyBank size={20}/>} />
        <MobileNavItem active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} icon={<Target size={20}/>} />
        <MobileNavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FileText size={20}/>} />
        <MobileNavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={20}/>} />
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ddd6fe; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #4c1d95; }
      `}</style>
    </div>
  );
}

// --- Subcomponents ---

function NavItem({ active, icon, label, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 font-bold shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{icon} <span className="text-sm tracking-tight">{label}</span></button>
  );
}

function MobileNavItem({ active, icon, onClick }) {
  return (
    <button onClick={onClick} className={`p-3 transition-colors rounded-xl ${active ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-slate-400 dark:text-slate-500'}`}>{icon}</button>
  );
}

function StatCard({ label, value, icon, bg }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-violet-400 transition-colors">
      <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110`}>{icon}</div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-xl font-black dark:text-white tracking-tight">{value}</div>
    </div>
  );
}

function DetailBox({ label, value, color = "text-slate-800 dark:text-white" }) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
      <p className="text-[10px] uppercase font-black text-slate-400 mb-1">{label}</p>
      <p className={`text-xl font-black tracking-tight ${color}`}>{value}</p>
    </div>
  );
}

function TransactionRow({ tx, category, onDelete }) {
  return (
    <div className="flex items-center justify-between p-1 group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm" style={{ backgroundColor: category?.color || '#cbd5e1' }}>{tx.category.charAt(0)}</div>
        <div>
          <div className="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-1">{tx.notes}</div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{tx.category}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className={`text-sm font-black whitespace-nowrap ${tx.type === 'Income' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{tx.type === 'Income' ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tx.amount)}</div>
        <button onClick={() => onDelete(tx.id)} className="p-1.5 text-slate-200 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
