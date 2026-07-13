'use client';

import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { useCollection, useDoc, useUser, useFirebase, useFirestore } from '@/firebase';
import { collection, doc, setDoc, addDoc, query, orderBy, limit, deleteDoc, writeBatch, serverTimestamp, Firestore, Query, DocumentReference, where } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { isWithinInterval, parseISO, startOfDay, endOfDay, isBefore, isAfter, addDays } from 'date-fns';

export type Role = 'player' | 'admin' | 'kassenwart' | 'strafenwart' | 'coach' | 'assistant_coach';

export interface Player {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  balance: number;
  treasuryBalance: number; 
  isFeeExempt?: boolean;
  lastIntroSeenRoles?: Role[];
}

export interface Expense {
  id: string;
  playerId: string;
  playerName: string;
  itemType: 'beer' | 'crate';
  cost: number;
  date: string;
}

export interface Payment {
  id: string;
  playerId: string;
  playerName: string;
  amount: number;
  date: string;
  recordedBy: string;
}

export interface MembershipFee {
  id: string;
  playerId: string;
  type: 'monthly' | 'annual';
  month?: number; 
  year: number; 
  amount: number;
  datePaid: string;
}

export interface MembershipTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'sponsor' | 'donation' | 'other' | 'expense';
  date: string;
  recordedBy: string;
  targetPlayerId?: string;
}

export interface Reimbursement {
  id: string;
  playerId: string;
  playerName: string;
  description: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed';
  payoutDate?: string;
  recordedBy: string;
}

export interface TreasuryExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  recordedBy: string;
}

export interface Fine {
  id: string;
  playerId: string;
  playerName: string;
  reason: string;
  amount: number;
  date: string;
  recordedBy: string;
  isPaid?: boolean;
}

export interface FineType {
  id: string;
  name: string;
  amount: number;
}

export interface TeamEvent {
  id: string;
  title: string;
  description?: string;
  type: 'training' | 'match' | 'social';
  date: string; 
  location?: string;
}

export interface Attendance {
  id: string;
  eventId: string;
  playerId: string;
  playerName: string;
  status: 'going' | 'declined';
  reason?: string;
  updatedAt: string;
}

export interface Absence {
  id: string;
  playerId: string;
  playerName: string;
  type: 'vacation' | 'injury' | 'illness' | 'work' | 'other';
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface LineupPosition {
  playerId: string;
  positionId: string;
}

export interface Lineup {
  id: string;
  eventId: string;
  formation: string;
  startingEleven: LineupPosition[];
  substitutes: string[]; 
  updatedAt: string;
}

export interface Ticker {
  id: string;
  homeScore: number;
  awayScore: number;
  operatorId: string | null;
  operatorName: string | null;
  status: 'pre' | 'live' | 'finished';
  updatedAt: string;
}

export interface TickerEvent {
  id: string;
  eventId: string;
  type: 'goal' | 'sub' | 'comment' | 'card' | 'status' | 'goal_opponent';
  minute: number;
  playerId?: string;
  playerName?: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  playerOutId?: string;
  playerOutName?: string;
  playerInId?: string;
  playerInName?: string;
  text?: string;
  timestamp: string;
}

export interface MatchComment {
  id: string;
  eventId: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: string;
  expiresAt: string;
}

export interface AppSettings {
  beerPrice: number;
  cratePrice: number;
  monthlyFee: number;
  annualFee: number;
  paypalMeLink: string;
  clubhousePaypalEmail: string;
  treasuryPaypalEmail: string;
  footballDeLink?: string;
  fupaLink?: string;
  lastClubhouseResetDate?: string;
}

export const BEER_PRICE = 1.50;
export const CRATE_PRICE = 35.00;
export const MONTHLY_FEE = 15.00;
export const ANNUAL_FEE = 150.00;

export const FEE_MONTHS = [7, 8, 9, 10, 11, 0, 1, 2, 3, 4];

export const PAYPAL_ME_LINK = "";
export const CLUBHOUSE_PAYPAL_EMAIL = "";
export const TREASURY_PAYPAL_EMAIL = "";

const cleanData = (obj: any) => {
  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (val !== undefined && val !== null) {
      if (typeof val === 'number' && isNaN(val)) return;
      newObj[key] = val;
    }
  });
  return newObj;
};

interface StoreContextType {
  players: Player[];
  expenses: Expense[];
  payments: Payment[];
  membershipFees: MembershipFee[];
  membershipTransactions: MembershipTransaction[];
  reimbursements: Reimbursement[];
  treasuryExpenses: TreasuryExpense[];
  fines: Fine[];
  fineCatalog: FineType[];
  teamEvents: TeamEvent[];
  attendance: Attendance[];
  lineups: Lineup[];
  absences: Absence[];
  tickers: Ticker[];
  tickerEvents: TickerEvent[];
  matchComments: MatchComment[];
  currentUserProfile: Player | null;
  settings: AppSettings;
  loading: boolean;
  totalMannschaftskasse: number;
  totalBierkasse: number;
  bierkasseLiquidity: number;
  addExpense: (playerId: string, itemType: 'beer' | 'crate') => void;
  deleteExpense: (expenseId: string) => void;
  recordPayment: (playerId: string, amount: number, account?: 'drinks' | 'treasury') => void;
  deletePayment: (paymentId: string) => void;
  addMembershipFee: (playerId: string, type: 'monthly' | 'annual', year: number, month?: number) => void;
  deleteMembershipFee: (feeId: string) => void;
  addMembershipTransaction: (description: string, amount: number, type: 'sponsor' | 'donation' | 'other' | 'expense', targetPlayerId?: string) => void;
  deleteMembershipTransaction: (transactionId: string) => void;
  addReimbursement: (playerId: string, description: string, amount: number) => void;
  confirmReimbursement: (reimbursementId: string) => void;
  deleteReimbursement: (reimbursementId: string) => void;
  addTreasuryExpense: (description: string, amount: number) => void;
  deleteTreasuryExpense: (expenseId: string) => void;
  recordClubhousePayment: (amount: number) => void;
  addFine: (playerId: string, reason: string, amount: number) => void;
  markFineAsPaid: (fineId: string) => void;
  deleteFine: (fineId: string) => void;
  updateFineType: (id: string, name: string, amount: number) => Promise<void>;
  addFineType: (name: string, amount: number) => Promise<void>;
  deleteFineType: (id: string) => Promise<void>;
  addTeamEvent: (event: Omit<TeamEvent, 'id'>) => Promise<void>;
  updateTeamEvent: (id: string, updates: Partial<TeamEvent>) => Promise<void>;
  deleteTeamEvent: (id: string) => Promise<void>;
  upsertAttendance: (eventId: string, status: 'going' | 'declined', reason?: string) => Promise<void>;
  updatePlayerAttendance: (eventId: string, playerId: string, playerName: string, status: 'going' | 'declined' | null, reason?: string) => Promise<void>;
  addAbsence: (data: Omit<Absence, 'id' | 'playerId' | 'playerName'>) => Promise<void>;
  deleteAbsence: (id: string) => Promise<void>;
  upsertLineup: (eventId: string, data: Omit<Lineup, 'id' | 'eventId' | 'updatedAt'>) => Promise<void>;
  claimTicker: (eventId: string) => Promise<void>;
  releaseTicker: (eventId: string) => Promise<void>;
  finishTicker: (eventId: string) => Promise<void>;
  updateTickerScore: (eventId: string, home: number, away: number) => Promise<void>;
  addTickerEvent: (eventId: string, event: Omit<TickerEvent, 'id' | 'eventId' | 'timestamp'>) => Promise<void>;
  deleteTickerEvent: (eventId: string, event: TickerEvent) => Promise<void>;
  addMatchComment: (eventId: string, text: string) => Promise<void>;
  addBezahlkiste: () => void;
  addPlayer: (name: string, email: string, roles: Role[], uid?: string, isFeeExempt?: boolean) => Promise<void>;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  deletePlayer: (id: string) => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetClubhouseSeason: () => Promise<void>;
  markIntroSeen: (roles: Role[]) => Promise<void>;
  closeSeason: (year: number) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const db = useFirestore();
  const { user, loading: authLoading } = useUser();

  const playersQuery = useMemo(() => db ? collection(db, 'players') as Query<Omit<Player, 'id'>> : null, [db]);
  const { data: playersData, loading: playersLoading } = useCollection<Omit<Player, 'id'>>(playersQuery);

  const expensesQuery = useMemo(() => db ? query(collection(db, 'expenses'), orderBy('date', 'desc'), limit(150)) as Query<Omit<Expense, 'id'>> : null, [db]);
  const { data: expensesData, loading: expensesLoading } = useCollection<Omit<Expense, 'id'>>(expensesQuery);

  const paymentsQuery = useMemo(() => db ? query(collection(db, 'payments'), orderBy('date', 'desc'), limit(150)) as Query<Omit<Payment, 'id'>> : null, [db]);
  const { data: paymentsData, loading: paymentsLoading } = useCollection<Omit<Payment, 'id'>>(paymentsQuery);

  const feesQuery = useMemo(() => db ? collection(db, 'membershipFees') as Query<Omit<MembershipFee, 'id'>> : null, [db]);
  const { data: feesData, loading: feesLoading } = useCollection<Omit<MembershipFee, 'id'>>(feesQuery);

  const mTransactionsQuery = useMemo(() => db ? query(collection(db, 'membershipTransactions'), orderBy('date', 'desc')) as Query<Omit<MembershipTransaction, 'id'>> : null, [db]);
  const { data: mTransactionsData, loading: mTransactionsLoading } = useCollection<Omit<MembershipTransaction, 'id'>>(mTransactionsQuery);

  const reimbursementsQuery = useMemo(() => db ? query(collection(db, 'reimbursements'), orderBy('date', 'desc')) as Query<Omit<Reimbursement, 'id'>> : null, [db]);
  const { data: reimbursementsData, loading: reimbursementsLoading } = useCollection<Omit<Reimbursement, 'id'>>(reimbursementsQuery);

  const tExpensesQuery = useMemo(() => db ? query(collection(db, 'treasuryExpenses'), orderBy('date', 'desc'), limit(150)) as Query<Omit<TreasuryExpense, 'id'>> : null, [db]);
  const { data: tExpensesData, loading: tExpensesLoading } = useCollection<Omit<TreasuryExpense, 'id'>>(tExpensesQuery);

  const finesQuery = useMemo(() => db ? query(collection(db, 'fines'), orderBy('date', 'desc')) as Query<Omit<Fine, 'id'>> : null, [db]);
  const { data: finesData, loading: finesLoading } = useCollection<Omit<Fine, 'id'>>(finesQuery);

  const fineCatalogQuery = useMemo(() => db ? query(collection(db, 'fineCatalog'), orderBy('name', 'asc')) as Query<Omit<FineType, 'id'>> : null, [db]);
  const { data: fineCatalogData, loading: fineCatalogLoading } = useCollection<Omit<FineType, 'id'>>(fineCatalogQuery);

  const teamEventsQuery = useMemo(() => db ? query(collection(db, 'teamEvents'), orderBy('date', 'asc')) as Query<Omit<TeamEvent, 'id'>> : null, [db]);
  const { data: teamEventsData, loading: teamEventsLoading } = useCollection<Omit<TeamEvent, 'id'>>(teamEventsQuery);

  const attendanceQuery = useMemo(() => db ? collection(db, 'eventAttendance') as Query<Omit<Attendance, 'id'>> : null, [db]);
  const { data: attendanceData, loading: attendanceLoading } = useCollection<Omit<Attendance, 'id'>>(attendanceQuery);

  const absencesQuery = useMemo(() => db ? collection(db, 'absences') as Query<Omit<Absence, 'id'>> : null, [db]);
  const { data: absencesData, loading: absencesLoading } = useCollection<Omit<Absence, 'id'>>(absencesQuery);

  const lineupsQuery = useMemo(() => db ? collection(db, 'lineups') as Query<Omit<Lineup, 'id'>> : null, [db]);
  const { data: lineupsData, loading: lineupsLoading } = useCollection<Omit<Lineup, 'id'>>(lineupsQuery);

  const tickersQuery = useMemo(() => db ? collection(db, 'tickers') as Query<Omit<Ticker, 'id'>> : null, [db]);
  const { data: tickersData, loading: tickersLoading } = useCollection<Omit<Ticker, 'id'>>(tickersQuery);

  const tickerEventsQuery = useMemo(() => db ? query(collection(db, 'tickerEvents'), orderBy('timestamp', 'desc')) as Query<Omit<TickerEvent, 'id'>> : null, [db]);
  const { data: tickerEventsData, loading: tickerEventsLoading } = useCollection<Omit<TickerEvent, 'id'>>(tickerEventsQuery);

  const matchCommentsQuery = useMemo(() => db ? query(collection(db, 'matchComments'), orderBy('timestamp', 'desc')) as Query<Omit<MatchComment, 'id'>> : null, [db]);
  const { data: matchCommentsData, loading: matchCommentsLoading } = useCollection<Omit<MatchComment, 'id'>>(matchCommentsQuery);

  const settingsRef = useMemo(() => db ? doc(db, 'settings', 'global') as DocumentReference<AppSettings> : null, [db]);
  const { data: settingsData, loading: settingsLoading } = useDoc<AppSettings>(settingsRef);

  const players = useMemo(() => playersData?.map(d => ({ 
    ...d.data, 
    id: d.id,
    balance: d.data.balance ?? 0,
    treasuryBalance: d.data.treasuryBalance ?? 0,
    roles: d.data.roles || ['player']
  })) || [], [playersData]);

  const activePlayerIds = useMemo(() => new Set(players.map(p => p.id)), [players]);

  const expenses = useMemo(() => expensesData?.map(d => ({ ...d.data, id: d.id })) || [], [expensesData]);
  const payments = useMemo(() => paymentsData?.map(d => ({ ...d.data, id: d.id })) || [], [paymentsData]);
  const membershipFees = useMemo(() => feesData?.map(d => ({ ...d.data, id: d.id })) || [], [feesData]);
  const membershipTransactions = useMemo(() => mTransactionsData?.map(d => ({ ...d.data, id: d.id })) || [], [mTransactionsData]);
  const reimbursements = useMemo(() => reimbursementsData?.map(d => ({ ...d.data, id: d.id })) || [], [reimbursementsData]);
  const treasuryExpenses = useMemo(() => tExpensesData?.map(d => ({ ...d.data, id: d.id })) || [], [tExpensesData]);
  const fines = useMemo(() => finesData?.map(d => ({ ...d.data, id: d.id })) || [], [finesData]);
  const fineCatalog = useMemo(() => fineCatalogData?.map(d => ({ ...d.data, id: d.id })) || [], [fineCatalogData]);
  const teamEvents = useMemo(() => teamEventsData?.map(d => ({ ...d.data, id: d.id })) || [], [teamEventsData]);
  const tickers = useMemo(() => tickersData?.map(d => ({ ...d.data, id: d.id })) || [], [tickersData]);
  const tickerEvents = useMemo(() => tickerEventsData?.map(d => ({ ...d.data, id: d.id })).filter(e => e.type !== 'goal' || activePlayerIds.has(e.playerId || '')) || [], [tickerEventsData, activePlayerIds]);
  const matchComments = useMemo(() => matchCommentsData?.map(d => ({ ...d.data, id: d.id })) || [], [matchCommentsData]);
  
  const attendance = useMemo(() => attendanceData?.map(d => ({ ...d.data, id: d.id })).filter(a => activePlayerIds.has(a.playerId)) || [], [attendanceData, activePlayerIds]);
  const absences = useMemo(() => absencesData?.map(d => ({ ...d.data, id: d.id })).filter(a => activePlayerIds.has(a.playerId)) || [], [absencesData, activePlayerIds]);
  const lineups = useMemo(() => lineupsData?.map(d => ({
    ...d.data,
    id: d.id,
    startingEleven: (d.data.startingEleven || []).filter(pos => activePlayerIds.has(pos.playerId)),
    substitutes: (d.data.substitutes || []).filter(id => activePlayerIds.has(id))
  })) || [], [lineupsData, activePlayerIds]);

  const settings = useMemo<AppSettings>(() => ({
    beerPrice: settingsData?.beerPrice ?? BEER_PRICE,
    cratePrice: settingsData?.cratePrice ?? CRATE_PRICE,
    monthlyFee: settingsData?.monthlyFee ?? MONTHLY_FEE,
    annualFee: settingsData?.annualFee ?? ANNUAL_FEE,
    paypalMeLink: settingsData?.paypalMeLink ?? PAYPAL_ME_LINK,
    clubhousePaypalEmail: settingsData?.clubhousePaypalEmail ?? CLUBHOUSE_PAYPAL_EMAIL,
    treasuryPaypalEmail: settingsData?.treasuryPaypalEmail ?? TREASURY_PAYPAL_EMAIL,
    footballDeLink: settingsData?.footballDeLink || "",
    fupaLink: settingsData?.fupaLink || "",
    lastClubhouseResetDate: settingsData?.lastClubhouseResetDate || "",
  }), [settingsData]);

  const currentUserProfile = useMemo(() => user ? players.find(p => p.id === user.uid) || null : null, [user, players]);

  const totalMannschaftskasse = useMemo(() => {
    const feeSum = membershipFees.reduce((sum, f) => sum + f.amount, 0);
    const finesSum = fines.filter(f => f.isPaid).reduce((sum, f) => sum + f.amount, 0);
    const transactionSum = membershipTransactions.reduce((sum, t) => t.type === 'expense' ? sum - t.amount : sum + t.amount, 0);
    return feeSum + finesSum + transactionSum;
  }, [membershipFees, membershipTransactions, fines]);

  const { totalBierkasse, bierkasseLiquidity } = useMemo(() => {
    const cashIn = payments.reduce((sum, p) => sum + p.amount, 0);
    
    // Variable: Eingetragene Getränke pro Spieler (Erhöhen den Stand, da Forderung/Umsatz)
    const playerSales = expenses
      .filter(e => e.playerId !== 'clubhouse')
      .reduce((sum, e) => sum + e.cost, 0);

    // NEU: Nur tatsächliche Zahlungen an das Vereinsheim verringern den Stand der Bierkasse
    const clubhousePayments = treasuryExpenses
      .filter(t => t.description.includes("Vereinsheim"))
      .reduce((sum, t) => sum + t.amount, 0);

    const cashOut = treasuryExpenses.reduce((sum, t) => sum + t.amount, 0);

    return {
      // Stand = Umsatz (Spieler) - Tatsächliche Ausgaben (Vereinsheim) + Einmalige Korrektur
      totalBierkasse: playerSales - clubhousePayments + 70.00,
      bierkasseLiquidity: cashIn - cashOut
    };
  }, [payments, expenses, treasuryExpenses]);

  const handleMutationError = (path: string, operation: SecurityRuleContext['operation'], data?: any) => (error: any) => {
    const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: data });
    errorEmitter.emit('permission-error', permissionError);
  };

  const addExpense = (playerId: string, itemType: 'beer' | 'crate') => {
    if (!db) return;
    const cost = itemType === 'beer' ? settings.beerPrice : settings.cratePrice;
    const player = players.find(p => p.id === playerId);
    if (!player && playerId !== 'clubhouse') return;
    const playerName = playerId === 'clubhouse' ? 'Bezahlkiste (Mannschaft)' : (player?.name || 'Unbekannt');
    const expenseData = { playerId, playerName, itemType, cost, date: new Date().toISOString() };
    addDoc(collection(db, 'expenses'), expenseData).catch(handleMutationError('expenses', 'create', expenseData));
    if (player) {
      setDoc(doc(db, 'players', playerId), { balance: (player.balance || 0) - cost }, { merge: true }).catch(handleMutationError(`players/${playerId}`, 'update'));
    }
  };

  const deleteExpense = (expenseId: string) => {
    if (!db) return;
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;
    const player = players.find(p => p.id === expense.playerId);
    deleteDoc(doc(db, 'expenses', expenseId)).catch(handleMutationError(`expenses/${expenseId}`, 'delete'));
    if (player) {
      setDoc(doc(db, 'players', player.id), { balance: (player.balance || 0) + expense.cost }, { merge: true }).catch(handleMutationError(`players/${player.id}`, 'update'));
    }
  };

  const recordPayment = (playerId: string, amount: number, account: 'drinks' | 'treasury' = 'drinks') => {
    if (!db || !currentUserProfile) return;
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    if (account === 'drinks') {
      const paymentData = { playerId, playerName: player.name, amount, date: new Date().toISOString(), recordedBy: currentUserProfile.id };
      addDoc(collection(db, 'payments'), paymentData).catch(handleMutationError('payments', 'create', paymentData));
      setDoc(doc(db, 'players', playerId), { balance: (player.balance || 0) + amount }, { merge: true }).catch(handleMutationError(`players/${playerId}`, 'update'));
    } else {
      addMembershipTransaction(`Zahlung: ${player.name}`, amount, 'other', playerId);
    }
  };

  const deletePayment = (paymentId: string) => {
    if (!db) return;
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;
    const player = players.find(p => p.id === payment.playerId);
    deleteDoc(doc(db, 'payments', paymentId)).catch(handleMutationError('payments', 'delete'));
    if (player) setDoc(doc(db, 'players', player.id), { balance: (player.balance || 0) - payment.amount }, { merge: true }).catch(handleMutationError(`players/${player.id}`, 'update'));
  };

  const addMembershipFee = (playerId: string, type: 'monthly' | 'annual', year: number, month?: number) => {
    if (!db) return;
    const amount = type === 'monthly' ? settings.monthlyFee : settings.annualFee;
    const feeData = cleanData({ playerId, type, year, amount, datePaid: new Date().toISOString(), month });
    addDoc(collection(db, 'membershipFees'), feeData).catch(handleMutationError('membershipFees', 'create', feeData));
  };

  const deleteMembershipFee = (feeId: string) => {
    if (!db) return;
    deleteDoc(doc(db, 'membershipFees', feeId)).catch(handleMutationError('membershipFees', 'delete'));
  };

  const addMembershipTransaction = (description: string, amount: number, type: 'sponsor' | 'donation' | 'other' | 'expense', targetPlayerId?: string) => {
    if (!db || !currentUserProfile) return;
    const txData = cleanData({ description, amount, type, date: new Date().toISOString(), recordedBy: currentUserProfile.id, targetPlayerId });
    addDoc(collection(db, 'membershipTransactions'), txData).catch(handleMutationError('membershipTransactions', 'create', txData));
    if (targetPlayerId) {
      const player = players.find(p => p.id === targetPlayerId);
      if (player) {
        const adjustment = type === 'expense' ? -amount : amount;
        setDoc(doc(db, 'players', targetPlayerId), { treasuryBalance: (player.treasuryBalance || 0) + adjustment }, { merge: true }).catch(handleMutationError(`players/${targetPlayerId}`, 'update'));
      }
    }
  };

  const deleteMembershipTransaction = (transactionId: string) => {
    if (!db) return;
    const tx = membershipTransactions.find(t => t.id === transactionId);
    if (!tx) return;
    deleteDoc(doc(db, 'membershipTransactions', transactionId)).catch(handleMutationError('membershipTransactions', 'delete'));
    if (tx.targetPlayerId) {
      const player = players.find(p => p.id === tx.targetPlayerId);
      if (player) {
        const adjustment = tx.type === 'expense' ? tx.amount : -tx.amount;
        setDoc(doc(db, 'players', tx.targetPlayerId), { treasuryBalance: (player.treasuryBalance || 0) + adjustment }, { merge: true }).catch(handleMutationError(`players/${tx.targetPlayerId}`, 'update'));
      }
    }
  };

  const addReimbursement = (playerId: string, description: string, amount: number) => {
    if (!db || !currentUserProfile) return;
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    const data = {
      playerId,
      playerName: player.name,
      description,
      amount,
      date: new Date().toISOString(),
      status: 'pending',
      recordedBy: currentUserProfile.id
    };
    addDoc(collection(db, 'reimbursements'), data).catch(handleMutationError('reimbursements', 'create', data));
  };

  const confirmReimbursement = (reimbursementId: string) => {
    if (!db || !currentUserProfile) return;
    const rb = reimbursements.find(r => r.id === reimbursementId);
    if (!rb) return;

    const batch = writeBatch(db);
    batch.update(doc(db, 'reimbursements', reimbursementId), { 
      status: 'completed', 
      payoutDate: new Date().toISOString() 
    });
    
    const txRef = doc(collection(db, 'membershipTransactions'));
    batch.set(txRef, {
      description: `Rückzahlung an ${rb.playerName}: ${rb.description}`,
      amount: rb.amount,
      type: 'expense',
      date: new Date().toISOString(),
      recordedBy: currentUserProfile.id,
      targetPlayerId: rb.playerId
    });

    batch.commit().catch(handleMutationError('reimbursements', 'update'));
  };

  const deleteReimbursement = (reimbursementId: string) => {
    if (!db) return;
    deleteDoc(doc(db, 'reimbursements', reimbursementId)).catch(handleMutationError('reimbursements', 'delete'));
  };

  const addTreasuryExpense = (description: string, amount: number) => {
    if (!db || !currentUserProfile) return;
    const expData = { description, amount, date: new Date().toISOString(), recordedBy: currentUserProfile.id };
    addDoc(collection(db, 'treasuryExpenses'), expData).catch(handleMutationError('treasuryExpenses', 'create', expData));
  };

  const deleteTreasuryExpense = (expenseId: string) => {
    if (!db) return;
    deleteDoc(doc(db, 'treasuryExpenses', expenseId)).catch(handleMutationError(`treasuryExpenses/${expenseId}`, 'delete'));
  };

  const recordClubhousePayment = (amount: number) => {
    if (!db || !currentUserProfile) return;
    addDoc(collection(db, 'treasuryExpenses'), { description: "Abrechnung Vereinsheim", amount, date: new Date().toISOString(), recordedBy: currentUserProfile.id }).catch(handleMutationError('treasuryExpenses', 'create'));
  };

  const addFine = (playerId: string, reason: string, amount: number) => {
    if (!db || !currentUserProfile) return;
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    const fineData = { playerId, playerName: player.name, reason, amount, date: new Date().toISOString(), recordedBy: currentUserProfile.id, isPaid: false };
    addDoc(collection(db, 'fines'), fineData).catch(handleMutationError('fines', 'create', fineData));
  };

  const markFineAsPaid = (fineId: string) => {
    if (!db) return;
    setDoc(doc(db, 'fines', fineId), { isPaid: true }, { merge: true }).catch(handleMutationError(`fines/${fineId}`, 'update'));
  };

  const deleteFine = (fineId: string) => {
    if (!db) return;
    deleteDoc(doc(db, 'fines', fineId)).catch(handleMutationError(`fines/${fineId}`, 'delete'));
  };

  const updateFineType = async (id: string, name: string, amount: number) => {
    if (!db) return;
    setDoc(doc(db, 'fineCatalog', id), { name, amount }, { merge: true }).catch(handleMutationError(`fineCatalog/${id}`, 'update'));
  };

  const addFineType = async (name: string, amount: number) => {
    if (!db) return;
    addDoc(collection(db, 'fineCatalog'), { name, amount }).catch(handleMutationError('fineCatalog', 'create'));
  };

  const deleteFineType = async (id: string) => {
    if (!db) return;
    deleteDoc(doc(db, 'fineCatalog', id)).catch(handleMutationError(`fineCatalog/${id}`, 'delete'));
  };

  const addTeamEvent = async (event: Omit<TeamEvent, 'id'>) => {
    if (!db) return;
    const newDoc = await addDoc(collection(db, 'teamEvents'), cleanData(event)).catch(handleMutationError('teamEvents', 'create'));
    if (newDoc) {
      const eventDate = startOfDay(parseISO(event.date));
      absences.forEach(abs => {
        if (eventDate >= startOfDay(parseISO(abs.startDate)) && eventDate <= endOfDay(parseISO(abs.endDate))) {
          updatePlayerAttendance(newDoc.id, abs.playerId, abs.playerName, 'declined', `Abwesend: ${abs.type}`);
        }
      });
    }
  };

  const updateTeamEvent = async (id: string, updates: Partial<TeamEvent>) => {
    if (!db) return;
    setDoc(doc(db, 'teamEvents', id), cleanData(updates), { merge: true }).catch(handleMutationError(`teamEvents/${id}`, 'update'));
  };

  const deleteTeamEvent = async (id: string) => {
    if (!db) return;
    deleteDoc(doc(db, 'teamEvents', id)).catch(handleMutationError(`teamEvents/${id}`, 'delete'));
  };

  const upsertAttendance = async (eventId: string, status: 'going' | 'declined', reason?: string) => {
    if (!db || !currentUserProfile) return;
    const docId = `${eventId}_${currentUserProfile.id}`;
    const data = cleanData({ eventId, playerId: currentUserProfile.id, playerName: currentUserProfile.name, status, updatedAt: new Date().toISOString(), reason });
    setDoc(doc(db, 'eventAttendance', docId), data, { merge: true }).catch(handleMutationError(`eventAttendance/${docId}`, 'write', data));
  };

  const updatePlayerAttendance = async (eventId: string, playerId: string, playerName: string, status: 'going' | 'declined' | null, reason?: string) => {
    if (!db) return;
    const docId = `${eventId}_${playerId}`;
    if (status === null) {
      deleteDoc(doc(db, 'eventAttendance', docId)).catch(handleMutationError(`eventAttendance/${docId}`, 'delete'));
      return;
    }
    const data = cleanData({ eventId, playerId, playerName, status, updatedAt: new Date().toISOString(), reason });
    setDoc(doc(db, 'eventAttendance', docId), data, { merge: true }).catch(handleMutationError(`eventAttendance/${docId}`, 'write', data));
  };

  const addAbsence = async (data: Omit<Absence, 'id' | 'playerId' | 'playerName'>) => {
    if (!db || !currentUserProfile) return;
    const absData = cleanData({ ...data, playerId: currentUserProfile.id, playerName: currentUserProfile.name });
    await addDoc(collection(db, 'absences'), absData).catch(handleMutationError('absences', 'create'));
    const start = startOfDay(parseISO(data.startDate));
    const end = endOfDay(parseISO(data.endDate));
    teamEvents.forEach(event => {
      const d = parseISO(event.date);
      if (d >= start && d <= end) updatePlayerAttendance(event.id, currentUserProfile.id, currentUserProfile.name, 'declined', `Abwesend: ${data.type}`);
    });
  };

  const deleteAbsence = async (id: string) => {
    if (!db) return;
    deleteDoc(doc(db, 'absences', id)).catch(handleMutationError(`absences/${id}`, 'delete'));
  };

  const upsertLineup = async (eventId: string, data: Omit<Lineup, 'id' | 'eventId' | 'updatedAt'>) => {
    if (!db) return;
    const lineupData = { ...data, eventId, updatedAt: new Date().toISOString() };
    setDoc(doc(db, 'lineups', eventId), lineupData, { merge: true }).catch(handleMutationError(`lineups/${eventId}`, 'write'));
  };

  const claimTicker = async (eventId: string) => {
    if (!db || !currentUserProfile) return;
    setDoc(doc(db, 'tickers', eventId), cleanData({ operatorId: currentUserProfile.id, operatorName: currentUserProfile.name, updatedAt: new Date().toISOString(), status: 'live' }), { merge: true }).catch(handleMutationError(`tickers/${eventId}`, 'update'));
  };

  const releaseTicker = async (eventId: string) => {
    if (!db) return;
    setDoc(doc(db, 'tickers', eventId), { operatorId: null, operatorName: null, updatedAt: new Date().toISOString() }, { merge: true }).catch(handleMutationError(`tickers/${eventId}`, 'update'));
  };

  const finishTicker = async (eventId: string) => {
    if (!db) return;
    setDoc(doc(db, 'tickers', eventId), { status: 'finished', operatorId: null, operatorName: null, updatedAt: new Date().toISOString() }, { merge: true }).catch(handleMutationError(`tickers/${eventId}`, 'update'));
  };

  const updateTickerScore = async (eventId: string, home: number, away: number) => {
    if (!db) return;
    setDoc(doc(db, 'tickers', eventId), cleanData({ homeScore: home, awayScore: away, updatedAt: new Date().toISOString() }), { merge: true }).catch(handleMutationError(`tickers/${eventId}`, 'update'));
  };

  const addTickerEvent = async (eventId: string, event: Omit<TickerEvent, 'id' | 'eventId' | 'timestamp'>) => {
    if (!db) return;
    const data = cleanData({ ...event, eventId, timestamp: new Date().toISOString() });
    addDoc(collection(db, 'tickerEvents'), data).catch(handleMutationError('tickerEvents', 'create', data));
  };

  const deleteTickerEvent = async (eventId: string, event: TickerEvent) => {
    if (!db) return;
    if (event.type === 'goal' || event.type === 'goal_opponent') {
      const ticker = tickers.find(t => t.id === eventId);
      if (ticker) {
        let h = ticker.homeScore || 0;
        let a = ticker.awayScore || 0;
        if (event.type === 'goal') h = Math.max(0, h - 1);
        else a = Math.max(0, a - 1);
        updateTickerScore(eventId, h, a);
      }
    }
    deleteDoc(doc(db, 'tickerEvents', event.id)).catch(handleMutationError(`tickerEvents/${event.id}`, 'delete'));
  };

  const addMatchComment = async (eventId: string, text: string) => {
    if (!db || !currentUserProfile) return;
    const event = teamEvents.find(e => e.id === eventId);
    if (!event) return;
    
    const expiresAt = addDays(startOfDay(parseISO(event.date)), 1).toISOString();
    const commentData = {
      eventId,
      playerId: currentUserProfile.id,
      playerName: currentUserProfile.name,
      text,
      timestamp: new Date().toISOString(),
      expiresAt
    };
    addDoc(collection(db, 'matchComments'), commentData).catch(handleMutationError('matchComments', 'create', commentData));
  };

  const addBezahlkiste = () => {
    if (!db) return;
    addDoc(collection(db, 'expenses'), { playerId: 'clubhouse', playerName: 'Bezahlkiste (Mannschaft)', itemType: 'crate', cost: settings.cratePrice, date: new Date().toISOString() }).catch(handleMutationError('expenses', 'create'));
  };

  const addPlayer = async (name: string, email: string, roles: Role[], uid?: string, isFeeExempt: boolean = false) => {
    if (!db) return;
    const playerRef = uid ? doc(db, 'players', uid) : doc(collection(db, 'players'));
    const data = { name, email, roles, balance: 0, treasuryBalance: 0, isFeeExempt };
    await setDoc(playerRef, data, { merge: true }).catch(handleMutationError(`players/${playerRef.id}`, uid ? 'update' : 'create', data));
  };

  const updatePlayer = (id: string, updates: Partial<Player>) => {
    if (!db) return;
    setDoc(doc(db, 'players', id), cleanData(updates), { merge: true }).catch(handleMutationError(`players/${id}`, 'update'));
  };

  const deletePlayer = async (id: string) => {
    if (!db) return;
    deleteDoc(doc(db, 'players', id)).catch(handleMutationError(`players/${id}`, 'delete'));
  };

  const updateSettings = async (updates: Partial<AppSettings>) => {
    if (!db) return;
    setDoc(doc(db, 'settings', 'global'), cleanData(updates), { merge: true }).catch(handleMutationError('settings/global', 'update'));
  };

  const resetClubhouseSeason = async () => {
    if (!db) return;
    setDoc(doc(db, 'settings', 'global'), { lastClubhouseResetDate: new Date().toISOString() }, { merge: true }).catch(handleMutationError('settings/global', 'update'));
  };

  const markIntroSeen = async (roles: Role[]) => {
    if (!db || !currentUserProfile) return;
    setDoc(doc(db, 'players', currentUserProfile.id), { lastIntroSeenRoles: roles }, { merge: true }).catch(handleMutationError(`players/${currentUserProfile.id}`, 'update'));
  };

  const closeSeason = async (year: number) => {
    if (!db || !currentUserProfile) return;
    const batch = writeBatch(db);
    players.forEach(p => {
      if (p.isFeeExempt || p.email === 'kasse@kickoff.de') return;
      const pFees = membershipFees.filter(f => f.playerId === p.id && f.year === year);
      if (!pFees.some(f => f.type === 'annual')) {
        const unpaid = Math.max(0, 10 - pFees.filter(f => f.type === 'monthly').length);
        if (unpaid > 0) batch.update(doc(db, 'players', p.id), { treasuryBalance: (p.treasuryBalance || 0) - (unpaid * settings.monthlyFee) });
      }
    });
    batch.set(doc(collection(db, 'membershipTransactions')), { description: `Saisonübertrag aus ${year}/${(year+1)%100}`, amount: totalMannschaftskasse, type: 'other', date: new Date().toISOString(), recordedBy: currentUserProfile.id });
    await batch.commit();
  };

  const loadingState = authLoading || (players.length === 0 && playersLoading) || settingsLoading || (teamEvents.length === 0 && teamEventsLoading);

  return (
    <StoreContext.Provider value={{ 
      players, expenses, payments, membershipFees, membershipTransactions, reimbursements, treasuryExpenses, fines, fineCatalog, teamEvents, attendance, absences, lineups, tickers, tickerEvents, matchComments, currentUserProfile, settings, loading: loadingState, totalMannschaftskasse, totalBierkasse, bierkasseLiquidity,
      addExpense, deleteExpense, recordPayment, deletePayment, addMembershipFee, deleteMembershipFee, addMembershipTransaction, deleteMembershipTransaction, addReimbursement, confirmReimbursement, deleteReimbursement, addTreasuryExpense, deleteTreasuryExpense, recordClubhousePayment, addFine, markFineAsPaid, deleteFine, updateFineType, addFineType, deleteFineType,
      addTeamEvent, updateTeamEvent, deleteTeamEvent, upsertAttendance, updatePlayerAttendance, addAbsence, deleteAbsence, upsertLineup, claimTicker, releaseTicker, finishTicker, updateTickerScore, addTickerEvent, deleteTickerEvent, addMatchComment, addBezahlkiste, addPlayer, updatePlayer, deletePlayer, updateSettings, resetClubhouseSeason, markIntroSeen, closeSeason
    }}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}
