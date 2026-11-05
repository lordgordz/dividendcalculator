/* Dividend Benefit Illustration Engine — standalone, no dependencies.
   Mirrors the logic of the Excel workbook (quarterly compounding, 10th cutoff, 25th payout). */
(function (root) {
  'use strict';
  const P = {
    SP:  { id: 'SP',  name: 'Invest Easy Cash', short: 'Invest Easy Cash', legacy: 'Single Premium (5% p.a.)',  rate: 0.05, kind: 'lump', admin: 0.03, lock: 0, min: 0 },
    AH:  { id: 'AH',  name: 'Ad-Hoc Top Up (7% p.a.)', short: 'Ad-Hoc Top Up', legacy: 'Ad-Hoc Top Up (7% p.a.)',   rate: 0.07, kind: 'lump', admin: 0.03, lock: 0, min: 0 },
    FP:  { id: 'FP',  name: 'AIA Platinum Wealth Venture 3.0 (5-pay)', short: 'Wealth Venture 3.0 (5-pay)', legacy: '5-Pay (7% p.a.)',           rate: 0.07, kind: 'regular', term: 5, lock: 8,  min: 18000 },
    EP:  { id: 'EP',  name: 'AIA Wealth Venture', short: 'AIA Wealth Venture', legacy: '8-Pay (7% p.a.)',           rate: 0.07, kind: 'regular', term: 8, lock: 11, min: 7800 },
    TP:  { id: 'TP',  name: 'AIA Platinum Wealth Venture 3.0 (2-pay)', short: 'Wealth Venture 3.0 (2-pay)', legacy: '2-Pay (7% p.a.)',           rate: 0.07, kind: 'regular', term: 2, lock: 8,  min: 48000, yearlyOnly: true },
    SRS: { id: 'SRS', name: 'AIA Platinum Wealth Venture 3.0 (SRS)', short: 'Wealth Venture 3.0 (SRS)', legacy: 'SRS Single Pay (7% p.a.)',  rate: 0.07, kind: 'lump', admin: 0,    lock: 8,  min: 15000 }
  };
  const BY_NAME = {}; Object.values(P).forEach(p => { BY_NAME[p.name] = p; BY_NAME[p.legacy] = p; });
  const PER = { 'Yearly': 1, 'Semi-Annual': 2, 'Quarterly': 4, 'Monthly': 12 };

  // ---- dates (UTC) ----
  function mk(y, m, d) { return Date.UTC(y, m - 1, d); }
  function parts(t) { const x = new Date(t); return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() }; }
  function edate(t, months) {
    const { y, m, d } = parts(t); const tot = (y * 12 + (m - 1)) + months;
    const ny = Math.floor(tot / 12), nm = tot % 12 + 1;
    const dim = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
    return mk(ny, nm, Math.min(d, dim));
  }
  function qual(t) { // quarter whose 25th the date qualifies for (10th cutoff)
    const { y, m, d } = parts(t); const qm = 3 * Math.ceil(m / 3);
    if (m < qm || d <= 10) return mk(y, qm, 25);
    return qm === 12 ? mk(y + 1, 3, 25) : mk(y, qm + 3, 25);
  }
  function horizon(age) { return Math.max(1, Math.min(100 - age, 85)); }

  // ---- welcome bonus tiers (% of each year's annual premium) ----
  function tier(id, A) {
    if (id === 'FP') return A >= 42000 ? [3, 4, 5] : A >= 24000 ? [3] : [];
    if (id === 'EP') return A >= 12000 ? [3, 5, 7, 9, 11] : A >= 9000 ? [3, 4, 5, 7, 7] : A >= 7800 ? [1, 3, 5, 7] : [];
    if (id === 'TP') return A >= 138000 ? [2, 3] : A >= 84000 ? [2] : [];
    return [];
  }
  function checkMin(id, amount) {
    const p = P[id]; if (!p.min) return null;
    if (amount < p.min) return `Below the $${p.min.toLocaleString('en-US')} minimum ${p.kind === 'regular' ? 'annual premium' : 'amount'} for ${p.name}`;
    return null;
  }

  /** Quarterly projection of one product (no withdrawals). */
  function project(o) {
    const p = P[o.product], N = o.years * 4, reinv = o.option === 'Reinvest';
    const qr = p.rate / 4, A = o.amount, inv = o.invDate;
    const dates = [qual(inv)]; for (let i = 1; i < N; i++) dates.push(edate(dates[i - 1], 3));
    const C = new Array(N).fill(0), Wc = new Array(N).fill(0);
    if (p.kind === 'lump') C[0] = A * (1 - p.admin);
    else {
      const per = p.yearlyOnly ? 1 : PER[o.freq || 'Yearly'], t = tier(p.id, A);
      for (let n = 1; n <= p.term * per; n++) {
        const d = edate(inv, (12 / per) * (n - 1)), yr = Math.floor((n - 1) / per) + 1, amt = A / per;
        const i = dates.indexOf(qual(d));
        if (i >= 0) { C[i] += amt; Wc[i] += amt * ((t[yr - 1] || 0) / 100); }
      }
    }
    const rows = []; let e = 0, f = 0, g = 0, h = 0, cum = 0, cash = 0, wel = 0, invb = 0, perf = 0;
    for (let q = 0; q < N; q++) {
      const yr = Math.floor(q / 4) + 1, prev = e + f;
      e += C[q]; f += Wc[q]; wel += Wc[q];
      if (dates[q] === qual(edate(inv, 12 * (yr - 1)))) {
        let ib = 0, pb = 0;
        if (p.id === 'FP') { if (yr >= 8 && yr <= 11) ib = 0.025 * A; if (yr >= 8) pb = 0.004 * prev; }
        if (p.id === 'EP') { if (yr >= 9 && yr <= 12) ib = 0.025 * A; if (yr >= 9) pb = 0.003 * prev; }
        if (p.id === 'TP' && yr >= 8 && yr <= 11) ib = 0.01 * A;
        if (p.id === 'SRS' && yr >= 8 && yr <= 11) ib = 0.005 * A;
        f += ib + pb; invb += ib; perf += pb;
      }
      g = q > 0 ? g + (reinv ? h : 0) : 0;
      h = (e + f + g) * qr; cum += h; if (!reinv) cash += h;
      rows.push({ q: q + 1, year: yr, qtr: (q % 4) + 1, date: dates[q], main: e, bonus: f, welcome: wel, investment: invb, performance: perf,
        divAcct: g + (reinv ? h : 0), qDiv: h, cumDiv: cum, cashPaid: cash, total: e + f + g + (reinv ? h : 0) });
    }
    return rows;
  }

  /** Quarterly projection with ad-hoc withdrawals (dividends first, then capital once unlocked). */
  function projectWithdrawals(o, wd) {
    const p = P[o.product], N = o.years * 4, reinv = o.option === 'Reinvest', qr = p.rate / 4;
    const base = project(o), sched = {};
    (wd || []).forEach(w => { if (w.year >= 1 && w.amount > 0) { const k = qual(edate(o.invDate, 12 * (w.year - 1))); sched[k] = (sched[k] || 0) + w.amount; } });
    const rows = []; let K = 0, L = 0, M = 0, prevEF = 0, cumW = 0, cumShort = 0;
    for (let q = 0; q < N; q++) {
      const b = base[q], yr = b.year, ef = b.main + b.bonus;
      const c = (p.id === 'SP' || p.id === 'AH') ? (q === 0 ? b.main : 0) : ef - prevEF; prevEF = ef;
      const D = q === 0 ? c : K + c, E = q === 0 ? 0 : L + (reinv ? M : 0), F = sched[b.date] || 0;
      const open = p.kind === 'lump' ? (p.lock === 0 || yr >= p.lock) : yr >= p.lock;
      const H = Math.min(F, E + (open ? D : 0)), I = Math.min(H, E), J = H - I;
      K = D - J; L = E - I; M = (K + L) * qr; cumW += H; cumShort += F - H;
      rows.push({ q: q + 1, year: yr, qtr: b.qtr, date: b.date, capital: K, divAcct: L + (reinv ? M : 0), qDiv: M, withdrawn: H, scheduled: F,
        shortfall: F - H, cumWithdrawn: cumW, total: K + L + (reinv ? M : 0), locked: !open });
    }
    return rows;
  }

  /** Mixed planning: regular-pay plan + lump-sum policy funding premiums from year 2. wd = user withdrawals (waterfall: lump div > lump cap > reg div > reg cap). */
  function mixed(o, wd) {
    const rp = P[o.regProduct], lp = P[o.lumpProduct], N = o.years * 4;
    const rReinv = o.regOption === 'Reinvest', lReinv = o.lumpOption === 'Reinvest';
    const reg = project({ product: o.regProduct, amount: o.regPremium, invDate: o.invDate, freq: 'Yearly', option: o.regOption, years: o.years });
    const dates = reg.map(r => r.date), lr = lp.rate / 4, rr = rp.rate / 4;
    const prem = {}; for (let y = 2; y <= rp.term; y++) { const k = qual(edate(o.invDate, 12 * (y - 1))); prem[k] = (prem[k] || 0) + o.regPremium; }
    const usr = {}; (wd || []).forEach(w => { if (w.year >= 1 && w.amount > 0) { const k = qual(edate(o.invDate, 12 * (w.year - 1))); usr[k] = (usr[k] || 0) + w.amount; } });
    const rows = []; let Q = 0, R = 0, S = 0, T = 0, U = 0, V = 0, prevReg = 0, cumW = 0, cumPrem = 0, cumShort = 0;
    for (let q = 0; q < N; q++) {
      const yr = reg[q].year, Pq = q === 0 ? 0 : (prem[dates[q]] || 0);
      const Cl = q === 0 ? o.lumpAmount * (1 - lp.admin) : -Math.min(Pq, Q);
      const regEF = reg[q].main + reg[q].bonus, Fr = regEF - prevReg; prevReg = regEF;
      let D, E, G, H, premDiv = 0;
      if (q === 0) { D = Cl; E = 0; G = Fr; H = 0; }
      else {
        const av = R + (lReinv ? U : 0); premDiv = Math.min(Pq + Cl, av);
        D = Q + Cl; E = av - premDiv; G = S + Fr; H = T + (rReinv ? V : 0);
      }
      cumPrem += -Cl * (q === 0 ? 0 : 1) + premDiv; cumShort += Pq - (q === 0 ? 0 : (-Cl + premDiv));
      const I = usr[dates[q]] || 0, open = yr >= rp.lock;
      const K = Math.min(I, E), L = Math.min(I - K, D), M = Math.min(I - K - L, H), N_ = Math.min(I - K - L - M, open ? G : 0), O = K + L + M + N_;
      Q = D - L; R = E - K; S = G - N_; T = H - M; U = (Q + R) * lr; V = (S + T) * rr; cumW += O;
      const W = Q + R + (lReinv ? U : 0), X = S + T + (rReinv ? V : 0);
      rows.push({ q: q + 1, year: yr, qtr: reg[q].qtr, date: dates[q], regMain: S, regDiv: X - S, regTotal: X, lumpCap: Q, lumpDiv: W - Q, lumpTotal: W,
        qDiv: U + V, withdrawn: O, scheduled: I, shortfall: I - O, premiumDue: Pq, premiumShort: Pq - (q === 0 ? 0 : (-Cl + premDiv)), cumWithdrawn: cumW, total: W + X });
    }
    return rows;
  }

  function yearly(rows, pick) { // last quarter of each year
    const out = []; for (let i = 3; i < rows.length; i += 4) out.push(pick ? pick(rows[i], rows.slice(i - 3, i + 1)) : rows[i]); return out;
  }

  const api = { PRODUCTS: P, BY_NAME, PER, qual, edate, mk, parts, horizon, tier, checkMin, project, projectWithdrawals, mixed, yearly };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DivEngine = api;
})(typeof self !== 'undefined' ? self : this);
