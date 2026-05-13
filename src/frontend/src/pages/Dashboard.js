import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    getGroups, createGroup, deleteGroup, getGroupMembers, addGroupMember, removeGroupMember,
    getExpenses, addExpense, scanReceipt, addItemizedReceipt, updateExpense, deleteExpense,
    getDebts, createDebt, deleteDebt, getDebtSummary, getDebtHistory,
    getFriendsByUser, addFriend, removeFriend,
    getUsers,
} from '../api';
import './Dashboard.css';

const DASHBOARD_PREFS_KEY = 'splitmate_dashboard_prefs';
const MAX_RECEIPT_IMAGE_SIZE = 10 * 1024 * 1024;
const RECEIPT_IMAGE_ACCEPT = 'image/png,image/jpeg,image/bmp,image/tiff,.tif,.tiff';
const RECEIPT_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'bmp', 'tif', 'tiff'];

function Dashboard() {
    const navigate = useNavigate();
    const receiptInputRef = useRef(null);
    const [user, setUser] = useState(null);
    const [groups, setGroups] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [debts, setDebts] = useState([]);
    const [friends, setFriends] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [debtSummary, setDebtSummary] = useState(null);
    const [transactionHistory, setTransactionHistory] = useState([]);
    const [tab, setTab] = useState(() => {
        try {
            const savedPrefs = JSON.parse(localStorage.getItem(DASHBOARD_PREFS_KEY) || '{}');
            return savedPrefs.tab || 'expenses';
        } catch {
            return 'expenses';
        }
    });
    const [apiOk, setApiOk] = useState(true);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [searchQuery, setSearchQuery] = useState(() => {
        try {
            const savedPrefs = JSON.parse(localStorage.getItem(DASHBOARD_PREFS_KEY) || '{}');
            return savedPrefs.searchQuery || '';
        } catch {
            return '';
        }
    });
    const [editingExpense, setEditingExpense] = useState(null);
    const [expenseSort, setExpenseSort] = useState(() => {
        try {
            const savedPrefs = JSON.parse(localStorage.getItem(DASHBOARD_PREFS_KEY) || '{}');
            return savedPrefs.expenseSort || 'date_desc';
        } catch {
            return 'date_desc';
        }
    });
    const [onlyMyExpenses, setOnlyMyExpenses] = useState(() => {
        try {
            const savedPrefs = JSON.parse(localStorage.getItem(DASHBOARD_PREFS_KEY) || '{}');
            return savedPrefs.onlyMyExpenses ?? true;
        } catch {
            return true;
        }
    });
    const [onlyMyDebts, setOnlyMyDebts] = useState(() => {
        try {
            const savedPrefs = JSON.parse(localStorage.getItem(DASHBOARD_PREFS_KEY) || '{}');
            return savedPrefs.onlyMyDebts ?? true;
        } catch {
            return true;
        }
    });

    const showToast = useCallback((msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // Modals
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [showGroupForm, setShowGroupForm] = useState(false);
    const [showDebtForm, setShowDebtForm] = useState(false);
    const [showFriendForm, setShowFriendForm] = useState(false);
    const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', groupId: 0 });
    const [receiptScan, setReceiptScan] = useState({ loading: false, fileName: '', rawText: '', error: '' });
    const [receiptPreviewUrl, setReceiptPreviewUrl] = useState('');
    const [receiptItems, setReceiptItems] = useState([]);
    const [savingItemizedReceipt, setSavingItemizedReceipt] = useState(false);
    const [groupForm, setGroupForm] = useState({ username: '' });
    const [debtForm, setDebtForm] = useState({ toUserId: '', amount: '', expenseId: 0 });
    const [friendForm, setFriendForm] = useState({ friendId: '' });

    // Group members
    const [expandedGroupId, setExpandedGroupId] = useState(null);
    const [groupMembers, setGroupMembers] = useState({});
    const [addMemberByGroup, setAddMemberByGroup] = useState({});
    const [groupExpenseByGroup, setGroupExpenseByGroup] = useState({});

    useEffect(() => {
        const saved = localStorage.getItem('splitmate_user');
        let parsedUser = null;
        if (saved) {
            try {
                parsedUser = JSON.parse(saved);
                if (parsedUser?.id) {
                    setUser(parsedUser);
                }
            } catch {
                localStorage.removeItem('splitmate_user');
            }
        }
        loadData(parsedUser);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const dashboardPrefs = {
            tab,
            searchQuery,
            expenseSort,
            onlyMyExpenses,
            onlyMyDebts,
        };
        localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(dashboardPrefs));
    }, [tab, searchQuery, expenseSort, onlyMyExpenses, onlyMyDebts]);

    useEffect(() => {
        return () => {
            if (receiptPreviewUrl) {
                URL.revokeObjectURL(receiptPreviewUrl);
            }
        };
    }, [receiptPreviewUrl]);

    // Load debt summary when user becomes available
    useEffect(() => {
        if (user?.id) {
            loadDebtSummary(user.id);
        }
    }, [user]);

    async function loadData(currentUser = user) {
        setLoading(true);
        try {
            const [g, e, d, u] = await Promise.allSettled([
                getGroups(),
                getExpenses(),
                getDebts(),
                getUsers(),
            ]);

            const [f, h] = currentUser?.id
                ? await Promise.allSettled([getFriendsByUser(currentUser.id), getDebtHistory(currentUser.id)])
                : [{ status: 'fulfilled', value: [] }, { status: 'fulfilled', value: [] }];

            if (g.status === 'fulfilled') setGroups(g.value);
            if (e.status === 'fulfilled') setExpenses(e.value);
            if (d.status === 'fulfilled') setDebts(d.value);
            if (u.status === 'fulfilled') setAllUsers(u.value);
            if (f.status === 'fulfilled') setFriends(f.value);
            if (h.status === 'fulfilled') setTransactionHistory(h.value);

            const hasAnySuccess = [g, e, d, u, f, h].some(result => result.status === 'fulfilled');
            setApiOk(hasAnySuccess);
        } catch {
            setApiOk(false);
        } finally {
            setLoading(false);
        }
    }

    async function loadDebtSummary(userId) {
        try {
            const summary = await getDebtSummary(userId);
            setDebtSummary(summary);
        } catch {
            // silently fail — summary is optional
        }
    }

    const resetReceiptScan = () => {
        setReceiptScan({ loading: false, fileName: '', rawText: '', error: '' });
        setReceiptPreviewUrl('');
        setReceiptItems([]);
    };

    const openReceiptPicker = () => {
        setShowExpenseForm(true);
        window.setTimeout(() => receiptInputRef.current?.click(), 0);
    };

    const normalizeReceiptAmount = (amount) => {
        const value = Number.parseFloat(String(amount || '').replace(',', '.'));
        return Number.isFinite(value) && value > 0 ? value.toFixed(2) : '';
    };

    const buildReceiptDescription = (fileName) => {
        const name = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
        return name ? `Bon - ${name}` : 'Bon scanat';
    };

    const createReceiptItem = (item = {}) => ({
        localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        description: item.description || '',
        amount: normalizeReceiptAmount(item.amount),
        consumerUserIds: item.consumerUserIds || [],
    });

    const normalizeReceiptItems = (items = []) => {
        return items
            .map(item => createReceiptItem(item))
            .filter(item => item.description.trim() && item.amount);
    };

    const isSupportedReceiptImage = (file) => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        const hasSupportedExtension = RECEIPT_IMAGE_EXTENSIONS.includes(extension);
        const hasImageType = !file.type || file.type.startsWith('image/');
        return hasSupportedExtension && hasImageType;
    };

    const ensureGroupMembersLoaded = async (groupId) => {
        const numericGroupId = parseInt(groupId) || 0;
        if (!numericGroupId) return [];

        if (groupMembers[numericGroupId]) {
            return groupMembers[numericGroupId];
        }

        try {
            const members = await getGroupMembers(numericGroupId);
            setGroupMembers(prev => ({ ...prev, [numericGroupId]: members }));
            return members;
        } catch {
            setGroupMembers(prev => ({ ...prev, [numericGroupId]: [] }));
            return [];
        }
    };

    const handleExpenseGroupChange = async (groupId) => {
        setExpenseForm(prev => ({ ...prev, groupId }));
        if (receiptItems.length > 0 || receiptScan.rawText) {
            await ensureGroupMembersLoaded(groupId);
        }
    };

    const updateReceiptItem = (localId, patch) => {
        setReceiptItems(prev => prev.map(item =>
            item.localId === localId ? { ...item, ...patch } : item
        ));
    };

    const toggleReceiptConsumer = (localId, userId) => {
        setReceiptItems(prev => prev.map(item => {
            if (item.localId !== localId) return item;

            const isSelected = item.consumerUserIds.includes(userId);
            return {
                ...item,
                consumerUserIds: isSelected
                    ? item.consumerUserIds.filter(id => id !== userId)
                    : [...item.consumerUserIds, userId],
            };
        }));
    };

    const addManualReceiptItem = () => {
        setReceiptItems(prev => [...prev, createReceiptItem({ description: 'Produs', amount: '' })]);
    };

    const removeReceiptItem = (localId) => {
        setReceiptItems(prev => prev.filter(item => item.localId !== localId));
    };

    const handleSaveItemizedReceipt = async () => {
        const groupId = parseInt(expenseForm.groupId) || 0;
        if (!groupId) {
            showToast('Alege un grup pentru bonul itemizat.', 'error');
            return;
        }

        const members = await ensureGroupMembersLoaded(groupId);
        if (members.length === 0) {
            showToast('Grupul nu are membri disponibili pentru impartire.', 'error');
            return;
        }

        const validItems = receiptItems
            .map(item => ({
                ...item,
                description: item.description.trim(),
                amount: normalizeReceiptAmount(item.amount),
                consumerUserIds: item.consumerUserIds,
            }))
            .filter(item => item.description && item.amount);

        if (validItems.length === 0) {
            showToast('Adauga cel putin un produs valid din bon.', 'error');
            return;
        }

        const firstUnassigned = validItems.find(item => item.consumerUserIds.length === 0);
        if (firstUnassigned) {
            showToast(`Selecteaza cine a consumat: ${firstUnassigned.description}.`, 'error');
            return;
        }

        setSavingItemizedReceipt(true);
        try {
            await addItemizedReceipt({
                payerId: user?.id || 0,
                groupId,
                date: new Date().toISOString(),
                items: validItems.map(item => ({
                    description: item.description,
                    amount: parseFloat(item.amount),
                    consumerUserIds: item.consumerUserIds,
                })),
            });

            setExpenseForm({ description: '', amount: '', groupId: 0 });
            resetReceiptScan();
            setShowExpenseForm(false);
            await loadData(user);
            if (user?.id) await loadDebtSummary(user.id);
            showToast('Bon itemizat salvat. Datoriile au fost calculate pe produse.');
        } catch (err) {
            showToast(err.message || 'Eroare la salvarea bonului itemizat.', 'error');
        } finally {
            setSavingItemizedReceipt(false);
        }
    };

    const handleReceiptFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!isSupportedReceiptImage(file)) {
            showToast('Alege un bon in format JPG, PNG, BMP sau TIFF.', 'error');
            e.target.value = '';
            return;
        }

        if (file.size > MAX_RECEIPT_IMAGE_SIZE) {
            showToast('Imaginea bonului trebuie sa aiba cel mult 10 MB.', 'error');
            e.target.value = '';
            return;
        }

        setShowExpenseForm(true);
        setReceiptPreviewUrl(URL.createObjectURL(file));
        setReceiptScan({ loading: true, fileName: file.name, rawText: '', error: '' });

        try {
            const result = await scanReceipt(file);
            const detectedAmount = normalizeReceiptAmount(result?.amount);
            const detectedItems = normalizeReceiptItems(result?.items || []);
            setReceiptItems(detectedItems);

            setExpenseForm(prev => ({
                ...prev,
                amount: detectedAmount || prev.amount,
                description: prev.description.trim() ? prev.description : buildReceiptDescription(file.name),
            }));

            setReceiptScan({
                loading: false,
                fileName: file.name,
                rawText: result?.rawText || '',
                error: detectedAmount ? '' : 'Bonul a fost citit, dar suma nu a putut fi detectata automat.',
            });

            if (parseInt(expenseForm.groupId) > 0) {
                await ensureGroupMembersLoaded(expenseForm.groupId);
            }

            if (detectedAmount) {
                const itemText = detectedItems.length === 1 ? '1 produs detectat' : `${detectedItems.length} produse detectate`;
                showToast(`${itemText}. Total: ${detectedAmount} RON.`);
            } else {
                showToast('Bon scanat. Completeaza manual suma inainte de salvare.', 'error');
            }
        } catch (err) {
            setReceiptScan({
                loading: false,
                fileName: file.name,
                rawText: '',
                error: err.message || 'Scanarea bonului a esuat.',
            });
            showToast(err.message || 'Eroare la scanarea bonului.', 'error');
        } finally {
            e.target.value = '';
        }
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!expenseForm.description || !expenseForm.amount) return;
        try {
            await addExpense({
                id: 0,
                amount: parseFloat(expenseForm.amount),
                date: new Date().toISOString(),
                description: expenseForm.description,
                payerId: user?.id || 0,
                payer: null,
                groupId: parseInt(expenseForm.groupId) || 0,
                group: null,
            });
            setExpenseForm({ description: '', amount: '', groupId: 0 });
            resetReceiptScan();
            setShowExpenseForm(false);
            loadData(user);
            showToast('Cheltuială adăugată cu succes!');
        } catch (err) {
            showToast(err.message || 'Eroare la adăugarea cheltuielii.', 'error');
        }
    };

    const handleAddGroupExpense = async (groupId) => {
        const groupExpenseForm = groupExpenseByGroup[groupId] || { description: '', amount: '' };
        if (!groupExpenseForm.description || !groupExpenseForm.amount) return;
        try {
            await addExpense({
                id: 0,
                amount: parseFloat(groupExpenseForm.amount),
                date: new Date().toISOString(),
                description: groupExpenseForm.description,
                payerId: user?.id || 0,
                payer: null,
                groupId: groupId,
                group: null,
            });
            setGroupExpenseByGroup(prev => ({ ...prev, [groupId]: { description: '', amount: '' } }));
            loadData(user);
            showToast('Cheltuială de grup adăugată!');
        } catch (err) {
            showToast(err.message || 'Eroare la adăugarea cheltuielii în grup.', 'error');
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm('Sigur vrei să ștergi această cheltuială?')) return;
        try {
            await deleteExpense(id);
            loadData(user);
            showToast('Cheltuială ștearsă.');
        } catch {
            showToast('Eroare la ștergerea cheltuielii.', 'error');
        }
    };

    const handleEditExpense = async (id, data) => {
        try {
            setEditingExpense(id);
            await updateExpense(id, data);
            loadData(user);
            showToast('Cheltuială actualizată!');
        } catch (err) {
            showToast(err.message || 'Eroare la editare.', 'error');
        } finally {
            setEditingExpense(null);
        }
    };

    const handleStartEditExpense = async (exp) => {
        const description = window.prompt('Descriere nouă:', exp.description);
        if (description === null) return;

        const amountRaw = window.prompt('Sumă nouă (RON):', String(exp.amount));
        if (amountRaw === null) return;

        const amount = parseFloat(amountRaw);
        if (!description.trim() || Number.isNaN(amount) || amount <= 0) {
            showToast('Descrierea și suma trebuie să fie valide.', 'error');
            return;
        }

        await handleEditExpense(exp.id, { description: description.trim(), amount });
    };

    const handleAddGroup = async (e) => {
        e.preventDefault();
        if (!groupForm.username) return;
        try {
            await createGroup({
                groupName: groupForm.username,
                ownerUserId: user?.id || 0,
            });
            setGroupForm({ username: '' });
            setShowGroupForm(false);
            loadData(user);
            showToast('Grup creat cu succes!');
        } catch (err) {
            showToast(err.message || 'Eroare la crearea grupului.', 'error');
        }
    };

    const handleDeleteGroup = async (id) => {
        if (!window.confirm('Sigur vrei să ștergi acest grup? Se vor șterge și cheltuielile asociate.')) return;
        try {
            await deleteGroup(id);
            setExpandedGroupId(null);
            loadData(user);
            showToast('Grup șters cu succes.');
        } catch {
            showToast('Eroare la ștergerea grupului.', 'error');
        }
    };

    const toggleGroupExpand = async (groupId) => {
        if (expandedGroupId === groupId) {
            setExpandedGroupId(null);
            return;
        }
        setExpandedGroupId(groupId);
        try {
            const members = await getGroupMembers(groupId);
            setGroupMembers((prev) => ({ ...prev, [groupId]: members }));
        } catch {
            setGroupMembers((prev) => ({ ...prev, [groupId]: [] }));
        }
    };

    const handleAddMember = async (groupId) => {
        const addMemberUserId = addMemberByGroup[groupId] || '';
        if (!addMemberUserId) return;
        try {
            await addGroupMember(groupId, parseInt(addMemberUserId));
            setAddMemberByGroup(prev => ({ ...prev, [groupId]: '' }));
            const members = await getGroupMembers(groupId);
            setGroupMembers((prev) => ({ ...prev, [groupId]: members }));
            loadData(user);
        } catch (err) {
            showToast(err.message || 'Eroare la adăugarea membrului.', 'error');
        }
    };

    const handleRemoveMember = async (groupId, userId) => {
        if (!window.confirm('Sigur vrei să elimini acest membru?')) return;
        try {
            await removeGroupMember(groupId, userId);
            const members = await getGroupMembers(groupId);
            setGroupMembers((prev) => ({ ...prev, [groupId]: members }));
            loadData(user);
        } catch {
            showToast('Eroare la eliminarea membrului.', 'error');
        }
    };

    const handleAddDebt = async (e) => {
        e.preventDefault();
        if (!debtForm.toUserId || !debtForm.amount) return;
        try {
            await createDebt({
                id: 0,
                amount: parseFloat(debtForm.amount),
                fromUserId: user?.id || 0,
                fromUser: null,
                toUserId: parseInt(debtForm.toUserId),
                toUser: null,
                expenseId: parseInt(debtForm.expenseId) || 0,
            });
            setDebtForm({ toUserId: '', amount: '', expenseId: 0 });
            setShowDebtForm(false);
            loadData(user);
            if (user?.id) loadDebtSummary(user.id);
            showToast('Datorie adăugată!');
        } catch {
            showToast('Eroare la crearea datoriei.', 'error');
        }
    };

    const handleSettleDebt = async (id) => {
        if (!window.confirm('Marchezi această datorie ca plătită?')) return;
        try {
            await deleteDebt(id);
            loadData(user);
            if (user?.id) loadDebtSummary(user.id);
            showToast('Datorie decontată! ✓');
        } catch {
            showToast('Eroare la decontare.', 'error');
        }
    };

    const handleDeleteDebt = async (id) => {
        if (!window.confirm('Sigur vrei să ștergi această datorie?')) return;
        try {
            await deleteDebt(id);
            loadData(user);
            if (user?.id) loadDebtSummary(user.id);
            showToast('Datorie ștearsă.');
        } catch {
            showToast('Eroare la ștergerea datoriei.', 'error');
        }
    };

    const handleAddFriend = async (e) => {
        e.preventDefault();
        if (!friendForm.friendId) return;
        try {
            await addFriend({
                userId: user?.id || 0,
                user: null,
                friendId: parseInt(friendForm.friendId),
                friend: null,
            });
            setFriendForm({ friendId: '' });
            setShowFriendForm(false);
            loadData(user);
            showToast('Prieten adăugat!');
        } catch {
            showToast('Eroare la adăugarea prietenului.', 'error');
        }
    };

    const handleRemoveFriend = async (friendId) => {
        if (!user?.id) return;
        if (!window.confirm('Sigur vrei să elimini acest prieten?')) return;
        try {
            await removeFriend(user.id, friendId);
            loadData(user);
            showToast('Prieten eliminat.');
        } catch {
            showToast('Eroare la ștergerea prietenului.', 'error');
        }
    };

    const getUserName = (userId) => {
        const u = allUsers.find(u => u.id === userId);
        return u ? u.username : `User #${userId}`;
    };

    const getGroupName = (groupId) => {
        if (!groupId) return null;
        const g = groups.find(g => g.id === groupId);
        return g ? (g.groupName || g.username) : null;
    };

    const normalizedSearch = searchQuery.trim().toLowerCase();
    const filteredExpenses = expenses
        .filter(exp => !onlyMyExpenses || exp.payerId === user?.id)
        .filter(exp =>
            !normalizedSearch
            || exp.description.toLowerCase().includes(normalizedSearch)
            || (getGroupName(exp.groupId) || '').toLowerCase().includes(normalizedSearch))
        .sort((a, b) => {
            if (expenseSort === 'amount_desc') return b.amount - a.amount;
            if (expenseSort === 'amount_asc') return a.amount - b.amount;
            return new Date(b.date) - new Date(a.date);
        });

    const filteredDebts = debts
        .filter(d => !onlyMyDebts || d.fromUserId === user?.id || d.toUserId === user?.id)
        .filter(d => !normalizedSearch
            || getUserName(d.fromUserId).toLowerCase().includes(normalizedSearch)
            || getUserName(d.toUserId).toLowerCase().includes(normalizedSearch));

    const expenseGroupId = parseInt(expenseForm.groupId) || 0;
    const receiptGroupMembers = expenseGroupId ? (groupMembers[expenseGroupId] || []) : [];
    const receiptItemsTotal = receiptItems
        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
        .toFixed(2);
    const receiptReadyToAssign = Boolean(receiptScan.rawText || receiptItems.length > 0);
    const receiptHasUnassignedItems = receiptItems.some(item => item.consumerUserIds.length === 0);

    const logout = () => {
        localStorage.removeItem('splitmate_user');
        navigate('/');
    };

    // Pie chart SVG for debt summary
    const renderPieChart = () => {
        if (!debtSummary || (debtSummary.totalToReceive === 0 && debtSummary.totalToPay === 0)) {
            return null;
        }
        const total = debtSummary.totalToReceive + debtSummary.totalToPay;
        const receiveAngle = (debtSummary.totalToReceive / total) * 360;
        const receiveRad = (receiveAngle * Math.PI) / 180;

        // SVG arc calculations
        const cx = 60, cy = 60, r = 50;
        const x1 = cx + r * Math.sin(receiveRad);
        const y1 = cy - r * Math.cos(receiveRad);
        const largeArc = receiveAngle > 180 ? 1 : 0;

        return (
            <svg width="120" height="120" viewBox="0 0 120 120" className="dash-pie">
                {/* Pay slice (full circle as background) */}
                <circle cx={cx} cy={cy} r={r} fill="#e8692a" />
                {/* Receive slice */}
                {debtSummary.totalToReceive > 0 && (
                    <path
                        d={`M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 ${largeArc},1 ${x1},${y1} Z`}
                        fill="#7dd4c8"
                    />
                )}
                {/* Inner circle */}
                <circle cx={cx} cy={cy} r="22" fill="var(--bg-secondary)" />
            </svg>
        );
    };

    return (
        <div className="dash">
            {/* Top bar */}
            <header className="dash-header">
                <Link to="/" className="dash-logo">
                    <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
                        <circle cx="50" cy="50" r="46" fill="#1a5c6b" stroke="#13444f" strokeWidth="4" />
                        <path d="M50 4 A46 46 0 0 1 96 50 L50 50 Z" fill="#7dd4c8" />
                        <path d="M96 50 A46 46 0 0 1 50 96 L50 50 Z" fill="#e8692a" />
                        <path d="M50 96 A46 46 0 0 1 4 50 L50 50 Z" fill="#f09a5e" />
                        <circle cx="50" cy="50" r="18" fill="#1a5c6b" />
                        <text x="50" y="57" textAnchor="middle" fill="#7dd4c8" fontSize="24" fontWeight="bold">$</text>
                    </svg>
                    <span>SplitMate</span>
                </Link>
                <div className="dash-user">
                    {user && <span className="dash-username">{user.username}</span>}
                    <Link to="/my-account" className="dash-logout">My Account</Link>
                    <button onClick={logout} className="dash-logout">Ieși</button>
                </div>
            </header>

            <main className="dash-main">
                {!apiOk && (
                    <div className="dash-warning">
                        API-ul nu răspunde. Pornește backend-ul pe <code>localhost:7252</code>.
                    </div>
                )}
                {toast && (
                    <div className={`dash-warning ${toast.type === 'error' ? '' : 'dash-warning--ok'}`}>
                        {toast.msg}
                    </div>
                )}

                {/* Debt Summary Card */}
                {debtSummary && (debtSummary.totalToReceive > 0 || debtSummary.totalToPay > 0) && (
                    <div className="dash-summary">
                        <div className="dash-summary-info">
                            <h3>Sumar financiar</h3>
                            <div className="dash-summary-rows">
                                <div className="dash-summary-row">
                                    <span className="dash-summary-dot dash-summary-dot--receive"></span>
                                    <span>De primit</span>
                                    <strong className="dash-summary-val dash-summary-val--receive">
                                        +{debtSummary.totalToReceive} RON
                                    </strong>
                                </div>
                                <div className="dash-summary-row">
                                    <span className="dash-summary-dot dash-summary-dot--pay"></span>
                                    <span>De plătit</span>
                                    <strong className="dash-summary-val dash-summary-val--pay">
                                        -{debtSummary.totalToPay} RON
                                    </strong>
                                </div>
                                <div className="dash-summary-row dash-summary-row--balance">
                                    <span>Balanță</span>
                                    <strong className={`dash-summary-val ${debtSummary.balance >= 0 ? 'dash-summary-val--receive' : 'dash-summary-val--pay'}`}>
                                        {debtSummary.balance >= 0 ? '+' : ''}{debtSummary.balance} RON
                                    </strong>
                                </div>
                            </div>
                        </div>
                        <div className="dash-summary-chart">
                            {renderPieChart()}
                        </div>
                    </div>
                )}

                {/* Stats row */}
                <div className="dash-stats">
                    <div className="dash-stat">
                        <span className="dash-stat-num">{groups.length}</span>
                        <span className="dash-stat-label">Grupuri</span>
                    </div>
                    <div className="dash-stat">
                        <span className="dash-stat-num">{expenses.length}</span>
                        <span className="dash-stat-label">Cheltuieli</span>
                    </div>
                    <div className="dash-stat">
                        <span className="dash-stat-num">{debts.length}</span>
                        <span className="dash-stat-label">Datorii</span>
                    </div>
                    <div className="dash-stat">
                        <span className="dash-stat-num">{friends.length}</span>
                        <span className="dash-stat-label">Prieteni</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="dash-actions">
                    <input
                        ref={receiptInputRef}
                        type="file"
                        accept={RECEIPT_IMAGE_ACCEPT}
                        className="dash-file-input"
                        onChange={handleReceiptFileChange}
                    />
                    <button onClick={() => setShowExpenseForm(true)} className="dash-action-btn dash-action-btn--primary">
                        + Cheltuială nouă
                    </button>
                    <button
                        type="button"
                        onClick={openReceiptPicker}
                        className="dash-action-btn dash-action-btn--scan"
                        disabled={receiptScan.loading}
                    >
                        {receiptScan.loading ? 'Se scaneaza...' : 'Scaneaza bon'}
                    </button>
                    <button onClick={() => setShowGroupForm(true)} className="dash-action-btn">
                        + Grup nou
                    </button>
                    <button onClick={() => setShowDebtForm(true)} className="dash-action-btn">
                        + Datorie nouă
                    </button>
                    <button onClick={() => setShowFriendForm(true)} className="dash-action-btn">
                        + Adaugă prieten
                    </button>
                </div>

                {/* Expense form */}
                {showExpenseForm && (
                    <form onSubmit={handleAddExpense} className="dash-form">
                        <h3>Adaugă cheltuială</h3>
                        <div className="dash-receipt">
                            <button
                                type="button"
                                className="dash-receipt-upload"
                                onClick={openReceiptPicker}
                                disabled={receiptScan.loading}
                            >
                                <span className="dash-receipt-upload-title">
                                    {receiptScan.loading ? 'Se scaneaza bonul...' : 'Adauga poza bonului'}
                                </span>
                                <span className="dash-receipt-upload-subtitle">
                                    {receiptScan.fileName || 'JPG, PNG, BMP, TIFF'}
                                </span>
                            </button>

                            {(receiptPreviewUrl || receiptScan.rawText || receiptScan.error) && (
                                <div className="dash-receipt-result">
                                    {receiptPreviewUrl && (
                                        <div className="dash-receipt-preview">
                                            <img src={receiptPreviewUrl} alt="Bon selectat" />
                                        </div>
                                    )}
                                    <div className="dash-receipt-meta">
                                        {receiptScan.loading && <span>OCR in lucru...</span>}
                                        {receiptScan.error && <span className="dash-receipt-error">{receiptScan.error}</span>}
                                        {receiptScan.rawText && (
                                            <details className="dash-receipt-text">
                                                <summary>Text OCR</summary>
                                                <pre>{receiptScan.rawText}</pre>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <input
                            type="text"
                            placeholder="Descriere (ex: Pizza)"
                            value={expenseForm.description}
                            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                        />
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Sumă (RON)"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        />
                        <select
                            className="dash-form-select"
                            value={expenseForm.groupId}
                            onChange={(e) => handleExpenseGroupChange(e.target.value)}
                        >
                            <option value={0}>— Fără grup (cheltuială personală) —</option>
                            {groups.map((g) => (
                                <option key={g.id} value={g.id}>{g.groupName || g.username}</option>
                            ))}
                        </select>

                        {receiptReadyToAssign && (
                            <div className="dash-receipt-items">
                                <div className="dash-receipt-items-head">
                                    <div>
                                        <span className="dash-receipt-items-title">Produse detectate</span>
                                        <span className="dash-receipt-items-subtitle">Total randuri: {receiptItemsTotal} RON</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="dash-action-btn dash-receipt-add-row"
                                        onClick={addManualReceiptItem}
                                    >
                                        + Produs
                                    </button>
                                </div>

                                {!expenseGroupId && (
                                    <p className="dash-receipt-note">Alege un grup ca sa poti bifa cine a consumat fiecare produs.</p>
                                )}

                                {expenseGroupId > 0 && receiptGroupMembers.length === 0 && (
                                    <p className="dash-receipt-note">Nu am gasit membri pentru grupul selectat.</p>
                                )}

                                {receiptItems.length === 0 && (
                                    <p className="dash-receipt-note">Nu am detectat produse clare. Adauga randurile manual.</p>
                                )}

                                {receiptItems.map((item) => (
                                    <div className="dash-receipt-item" key={item.localId}>
                                        <div className="dash-receipt-item-fields">
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => updateReceiptItem(item.localId, { description: e.target.value })}
                                                placeholder="Produs"
                                            />
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={item.amount}
                                                onChange={(e) => updateReceiptItem(item.localId, { amount: e.target.value })}
                                                placeholder="Suma"
                                            />
                                            <button
                                                type="button"
                                                className="dash-delete-btn"
                                                onClick={() => removeReceiptItem(item.localId)}
                                                title="Sterge produs"
                                            >
                                                x
                                            </button>
                                        </div>

                                        {expenseGroupId > 0 && (
                                            <div className="dash-consumer-chips">
                                                {receiptGroupMembers.map((member) => {
                                                    const isSelected = item.consumerUserIds.includes(member.id);
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={member.id}
                                                            className={`dash-consumer-chip ${isSelected ? 'dash-consumer-chip--active' : ''}`}
                                                            onClick={() => toggleReceiptConsumer(item.localId, member.id)}
                                                        >
                                                            {member.username}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    className="dash-action-btn dash-action-btn--primary"
                                    onClick={handleSaveItemizedReceipt}
                                    disabled={savingItemizedReceipt || receiptItems.length === 0 || receiptHasUnassignedItems || !expenseGroupId}
                                >
                                    {savingItemizedReceipt ? 'Se salveaza...' : 'Salveaza bon itemizat'}
                                </button>
                            </div>
                        )}
                        <div className="dash-form-btns">
                            <button type="submit" className={`dash-action-btn ${receiptItems.length ? '' : 'dash-action-btn--primary'}`}>
                                {receiptItems.length ? 'Salveaza ca total' : 'Adaugă'}
                            </button>
                            <button type="button" onClick={() => { resetReceiptScan(); setShowExpenseForm(false); }} className="dash-action-btn">Anulează</button>
                        </div>
                    </form>
                )}

                {/* Group form */}
                {showGroupForm && (
                    <form onSubmit={handleAddGroup} className="dash-form">
                        <h3>Creează grup</h3>
                        <input
                            type="text"
                            placeholder="Numele grupului (ex: Chirie apartament)"
                            value={groupForm.username}
                            onChange={(e) => setGroupForm({ ...groupForm, username: e.target.value })}
                        />
                        <div className="dash-form-btns">
                            <button type="submit" className="dash-action-btn dash-action-btn--primary">Creează</button>
                            <button type="button" onClick={() => setShowGroupForm(false)} className="dash-action-btn">Anulează</button>
                        </div>
                    </form>
                )}

                {/* Debt form */}
                {showDebtForm && (
                    <form onSubmit={handleAddDebt} className="dash-form">
                        <h3>Adaugă datorie</h3>
                        <select
                            value={debtForm.toUserId}
                            onChange={(e) => setDebtForm({ ...debtForm, toUserId: e.target.value })}
                            className="dash-form-select"
                        >
                            <option value="">— Selectează utilizatorul —</option>
                            {allUsers
                                .filter(u => u.id !== user?.id)
                                .map(u => (
                                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                                ))}
                        </select>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Sumă (RON)"
                            value={debtForm.amount}
                            onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })}
                        />
                        <div className="dash-form-btns">
                            <button type="submit" className="dash-action-btn dash-action-btn--primary">Adaugă</button>
                            <button type="button" onClick={() => setShowDebtForm(false)} className="dash-action-btn">Anulează</button>
                        </div>
                    </form>
                )}

                {/* Friend form */}
                {showFriendForm && (
                    <form onSubmit={handleAddFriend} className="dash-form">
                        <h3>Adaugă prieten</h3>
                        <select
                            value={friendForm.friendId}
                            onChange={(e) => setFriendForm({ ...friendForm, friendId: e.target.value })}
                            className="dash-form-select"
                        >
                            <option value="">— Selectează utilizatorul —</option>
                            {allUsers
                                .filter(u => u.id !== user?.id)
                                .map(u => (
                                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                                ))}
                        </select>
                        <div className="dash-form-btns">
                            <button type="submit" className="dash-action-btn dash-action-btn--primary">Adaugă</button>
                            <button type="button" onClick={() => setShowFriendForm(false)} className="dash-action-btn">Anulează</button>
                        </div>
                    </form>
                )}

                {/* Tabs */}
                <div className="dash-tabs">
                    <button
                        className={`dash-tab ${tab === 'expenses' ? 'dash-tab--active' : ''}`}
                        onClick={() => setTab('expenses')}
                    >
                        Cheltuieli
                    </button>
                    <button
                        className={`dash-tab ${tab === 'groups' ? 'dash-tab--active' : ''}`}
                        onClick={() => setTab('groups')}
                    >
                        Grupuri
                    </button>
                    <button
                        className={`dash-tab ${tab === 'debts' ? 'dash-tab--active' : ''}`}
                        onClick={() => setTab('debts')}
                    >
                        Datorii
                    </button>
                    <button
                        className={`dash-tab ${tab === 'friends' ? 'dash-tab--active' : ''}`}
                        onClick={() => setTab('friends')}
                    >
                        Prieteni
                    </button>
                    <button
                        className={`dash-tab ${tab === 'history' ? 'dash-tab--active' : ''}`}
                        onClick={() => setTab('history')}
                    >
                        Istoric
                    </button>
                </div>

                <div className="dash-actions" style={{ marginTop: 8 }}>
                    <input
                        type="text"
                        className="dash-form-select"
                        placeholder="Caută după nume, descriere, grup..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {tab === 'expenses' && (
                        <>
                            <button className="dash-action-btn" onClick={() => setOnlyMyExpenses(v => !v)}>
                                {onlyMyExpenses ? 'Afișează toate cheltuielile' : 'Doar cheltuielile mele'}
                            </button>
                            <select
                                className="dash-form-select"
                                value={expenseSort}
                                onChange={(e) => setExpenseSort(e.target.value)}
                            >
                                <option value="date_desc">Sortare: cele mai noi</option>
                                <option value="amount_desc">Sortare: sumă descrescător</option>
                                <option value="amount_asc">Sortare: sumă crescător</option>
                            </select>
                        </>
                    )}
                    {tab === 'debts' && (
                        <button className="dash-action-btn" onClick={() => setOnlyMyDebts(v => !v)}>
                            {onlyMyDebts ? 'Afișează toate datoriile' : 'Doar datoriile mele'}
                        </button>
                    )}
                </div>

                {/* Tab content */}
                <div className="dash-content">
                    {loading && <p className="dash-empty">Se încarcă datele...</p>}
                    {tab === 'expenses' && (
                        filteredExpenses.length === 0
                            ? <p className="dash-empty">Nicio cheltuială încă. Adaugă una!</p>
                            : <div className="dash-list">
                                {filteredExpenses.map((exp) => (
                                    <div className="dash-list-item" key={exp.id}>
                                        <div>
                                            <span className="dash-list-title">{exp.description}</span>
                                            <span className="dash-list-date">
                                                {new Date(exp.date).toLocaleDateString('ro-RO')}
                                                {getGroupName(exp.groupId) && (
                                                    <span className="dash-list-group-tag"> · {getGroupName(exp.groupId)}</span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="dash-list-right">
                                            <span className="dash-list-amount">{exp.amount} RON</span>
                                            <button
                                                className="dash-action-btn"
                                                onClick={() => handleStartEditExpense(exp)}
                                                disabled={editingExpense === exp.id}
                                                title="Editează cheltuiala"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="dash-delete-btn"
                                                onClick={() => handleDeleteExpense(exp.id)}
                                                title="Șterge cheltuiala"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                    )}

                    {tab === 'groups' && (
                        groups.length === 0
                            ? <p className="dash-empty">Niciun grup. Creează unul!</p>
                            : <div className="dash-list">
                                {groups.map((g) => (
                                    <div className={`dash-group-card ${expandedGroupId === g.id ? 'dash-group-card--open' : ''}`} key={g.id}>
                                        <div className="dash-list-item dash-group-header" onClick={() => toggleGroupExpand(g.id)}>
                                            <div>
                                                <span className="dash-list-title">{g.username || g.groupName}</span>
                                                <span className="dash-list-date">
                                                    {groupMembers[g.id]?.length || 0} membri
                                                </span>
                                            </div>
                                            <div className="dash-list-right">
                                                <button
                                                    className="dash-delete-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteGroup(g.id);
                                                    }}
                                                    title="Șterge grupul"
                                                >
                                                    ✕
                                                </button>
                                                <span className={`dash-group-arrow ${expandedGroupId === g.id ? 'dash-group-arrow--open' : ''}`}>▸</span>
                                            </div>
                                        </div>

                                        {expandedGroupId === g.id && (
                                            <div className="dash-group-body">
                                                {/* Members list */}
                                                {(groupMembers[g.id] || []).length === 0 ? (
                                                    <p className="dash-group-empty">Niciun membru. Adaugă pe cineva!</p>
                                                ) : (
                                                    <div className="dash-group-members">
                                                        {(groupMembers[g.id] || []).map((m) => (
                                                            <div className="dash-group-member" key={m.id}>
                                                                <div className="dash-friend-avatar">{m.username?.[0]?.toUpperCase() || '?'}</div>
                                                                <div className="dash-group-member-info">
                                                                    <span className="dash-group-member-name">{m.username}</span>
                                                                    <span className="dash-group-member-email">{m.email}</span>
                                                                </div>
                                                                <button
                                                                    className="dash-delete-btn"
                                                                    onClick={() => handleRemoveMember(g.id, m.id)}
                                                                    title="Elimină din grup"
                                                                >✕</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Add member form */}
                                                <div className="dash-group-add">
                                                    <select
                                                        className="dash-form-select"
                                                        value={addMemberByGroup[g.id] || ''}
                                                        onChange={(e) => setAddMemberByGroup(prev => ({ ...prev, [g.id]: e.target.value }))}
                                                    >
                                                        <option value="">— Alege utilizator —</option>
                                                        {allUsers
                                                            .filter((u) => !(groupMembers[g.id] || []).some((m) => m.id === u.id))
                                                            .map((u) => (
                                                                <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                                                            ))}
                                                    </select>
                                                    <button
                                                        className="dash-action-btn dash-action-btn--primary dash-group-add-btn"
                                                        onClick={() => handleAddMember(g.id)}
                                                        disabled={!(addMemberByGroup[g.id] || '')}
                                                    >+ Adaugă</button>
                                                </div>

                                                {/* Group expenses */}
                                                <div className="dash-group-section">
                                                    <h4 className="dash-group-section-title">💰 Cheltuieli din grup</h4>
                                                    {expenses.filter(exp => exp.groupId === g.id).length === 0 ? (
                                                        <p className="dash-group-empty">Nicio cheltuială în acest grup.</p>
                                                    ) : (
                                                        <div className="dash-group-expenses">
                                                            {expenses.filter(exp => exp.groupId === g.id).map(exp => (
                                                                <div className="dash-group-expense" key={exp.id}>
                                                                    <div className="dash-group-expense-info">
                                                                        <span className="dash-group-member-name">{exp.description}</span>
                                                                        <span className="dash-group-member-email">
                                                                            {new Date(exp.date).toLocaleDateString('ro-RO')} · {getUserName(exp.payerId || 0)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="dash-list-right">
                                                                        <span className="dash-list-amount">{exp.amount} RON</span>
                                                                        <button
                                                                            className="dash-delete-btn"
                                                                            onClick={() => handleDeleteExpense(exp.id)}
                                                                            title="Șterge cheltuiala"
                                                                        >✕</button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <div className="dash-group-expense-total">
                                                                Total: {expenses.filter(exp => exp.groupId === g.id).reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)} RON
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Inline add expense to group */}
                                                    <div className="dash-group-add-expense">
                                                        <input
                                                            type="text"
                                                            placeholder="Descriere cheltuială"
                                                            value={groupExpenseByGroup[g.id]?.description || ''}
                                                            onChange={(e) => setGroupExpenseByGroup(prev => ({
                                                                ...prev,
                                                                [g.id]: { ...(prev[g.id] || { description: '', amount: '' }), description: e.target.value }
                                                            }))}
                                                        />
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            placeholder="Sumă"
                                                            value={groupExpenseByGroup[g.id]?.amount || ''}
                                                            onChange={(e) => setGroupExpenseByGroup(prev => ({
                                                                ...prev,
                                                                [g.id]: { ...(prev[g.id] || { description: '', amount: '' }), amount: e.target.value }
                                                            }))}
                                                        />
                                                        <button
                                                            className="dash-action-btn dash-action-btn--primary dash-group-add-btn"
                                                            onClick={() => handleAddGroupExpense(g.id)}
                                                            disabled={!(groupExpenseByGroup[g.id]?.description && groupExpenseByGroup[g.id]?.amount)}
                                                        >+ Adaugă</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                    )}

                    {tab === 'debts' && (
                        filteredDebts.length === 0
                            ? <p className="dash-empty">Nicio datorie. Ești la zero!</p>
                            : <div className="dash-list">
                                {filteredDebts.map((d) => (
                                    <div className="dash-list-item" key={d.id}>
                                        <div>
                                            <span className="dash-list-title">
                                                {getUserName(d.fromUserId)} → {getUserName(d.toUserId)}
                                            </span>
                                            <span className="dash-list-date">
                                                {d.fromUserId === user?.id ? 'Tu datorezi' : 'Ți se datorează'}
                                            </span>
                                        </div>
                                        <div className="dash-list-right">
                                            <span className={`dash-list-amount ${d.fromUserId === user?.id ? 'dash-list-amount--negative' : ''}`}>
                                                {d.fromUserId === user?.id ? '-' : '+'}{d.amount} RON
                                            </span>
                                            {(d.fromUserId === user?.id || d.toUserId === user?.id) && (
                                                <button
                                                    className="dash-action-btn"
                                                    onClick={() => handleSettleDebt(d.id)}
                                                    title="Marchează ca decontată"
                                                >
                                                    Decontează
                                                </button>
                                            )}
                                            <button
                                                className="dash-delete-btn"
                                                onClick={() => handleDeleteDebt(d.id)}
                                                title="Șterge datoria"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                    )}

                    {tab === 'friends' && (
                        friends.length === 0
                            ? <p className="dash-empty">Niciun prieten adăugat. Adaugă unul!</p>
                            : <div className="dash-list">
                                {friends.map((f, i) => (
                                    <div className="dash-list-item" key={i}>
                                        <div className="dash-friend-info">
                                            <span className="dash-friend-avatar">
                                                {getUserName(f.friendId).charAt(0).toUpperCase()}
                                            </span>
                                            <div>
                                                <span className="dash-list-title">{getUserName(f.friendId)}</span>
                                                <span className="dash-list-date">
                                                    Prieten al lui {getUserName(f.userId)}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            className="dash-delete-btn"
                                            onClick={() => handleRemoveFriend(f.friendId)}
                                            title="Elimină prieten"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                    )}

                    {tab === 'history' && (
                        transactionHistory.length === 0
                            ? <p className="dash-empty">Nu există tranzacții încă.</p>
                            : <div className="dash-list">
                                {transactionHistory.map((item) => (
                                    <div className="dash-list-item" key={item.id}>
                                        <div>
                                            <span className="dash-list-title">
                                                {item.fromUsername} → {item.toUsername}
                                            </span>
                                            <span className="dash-list-date">
                                                {item.transactionDate
                                                    ? new Date(item.transactionDate).toLocaleDateString('ro-RO')
                                                    : 'Fără dată'}
                                                {' · '}
                                                {item.expenseDescription}
                                            </span>
                                        </div>
                                        <div className="dash-list-right">
                                            <span className={`dash-list-amount ${item.direction === 'outgoing' ? 'dash-list-amount--negative' : ''}`}>
                                                {item.direction === 'outgoing' ? '-' : '+'}{item.amount} RON
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default Dashboard;
