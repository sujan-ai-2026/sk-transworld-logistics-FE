import { calculateInvoiceTotals } from './calculations.js'
import type {
  CustomerInvoice,
  DateOnly,
  DemoDataset,
  Department,
  LedgerAccount,
  OpeningBalance,
  SupplierCost,
} from './model.js'

export interface JournalLine {
  accountId: string
  debitRM: number
  creditRM: number
}

export interface JournalEntry {
  id: string
  date: DateOnly
  description: string
  sourceType: 'opening' | 'invoice' | 'receipt' | 'supplier_cost' | 'supplier_payment' | 'operating_expense'
  sourceId: string
  illustrative: true
  lines: JournalLine[]
}

export interface StatementLine {
  accountId: string
  accountName: string
  amountRM: number
  sourceIds: string[]
}

export interface ProfitAndLossReport {
  startDate: DateOnly
  endDate: DateOnly
  previousStartDate: DateOnly
  previousEndDate: DateOnly
  prototype: true
  assumptions: string[]
  revenueLines: StatementLine[]
  directCostLines: StatementLine[]
  operatingExpenseLines: StatementLine[]
  recognizedRevenueRM: number
  directCostsRM: number
  grossProfitRM: number
  grossMarginPercent: number | null
  operatingExpensesRM: number
  netProfitRM: number
  netMarginPercent: number | null
  previous: {
    recognizedRevenueRM: number
    directCostsRM: number
    grossProfitRM: number
    operatingExpensesRM: number
    netProfitRM: number
    hasRecognizedActivity: boolean
  }
}

export interface BalanceSheetSectionLine {
  accountId: string
  accountName: string
  amountRM: number
  recorded: boolean
}

export interface BalanceSheetReport {
  asOfDate: DateOnly
  prototype: true
  openingBalancesRecorded: boolean
  assumptions: string[]
  warnings: string[]
  cashRM: number
  receivablesRM: number
  inventoryRM: number
  inventoryRecorded: boolean
  otherAssetsRM: number
  totalAssetsRM: number
  payablesRM: number
  loansRM: number
  loansRecorded: boolean
  taxLiabilitiesRM: number
  taxRecorded: boolean
  totalLiabilitiesRM: number
  contributedCapitalRM: number
  retainedEarningsRM: number
  totalEquityRM: number
  totalLiabilitiesAndEquityRM: number
  unexplainedDifferenceRM: number
  equationHolds: boolean
  assetLines: BalanceSheetSectionLine[]
  liabilityLines: BalanceSheetSectionLine[]
  equityLines: BalanceSheetSectionLine[]
}

export const LEDGER_ACCOUNTS: LedgerAccount[] = [
  { id: '1000', code: '1000', name: 'Cash and bank', type: 'asset', subtype: 'cash' },
  { id: '1100', code: '1100', name: 'Accounts receivable', type: 'asset', subtype: 'receivable' },
  { id: '1200', code: '1200', name: 'Inventory', type: 'asset', subtype: 'inventory' },
  { id: '1900', code: '1900', name: 'Other assets', type: 'asset', subtype: 'other_asset' },
  { id: '2000', code: '2000', name: 'Accounts payable', type: 'liability', subtype: 'payable' },
  { id: '2100', code: '2100', name: 'Loans and borrowings', type: 'liability', subtype: 'loan' },
  { id: '2200', code: '2200', name: 'Tax liabilities', type: 'liability', subtype: 'tax' },
  { id: '3000', code: '3000', name: 'Contributed capital', type: 'equity', subtype: 'capital' },
  { id: '4000', code: '4000', name: 'Forwarding revenue', type: 'revenue', subtype: 'revenue' },
  { id: '4010', code: '4010', name: 'Haulage revenue', type: 'revenue', subtype: 'revenue' },
  { id: '4020', code: '4020', name: 'Customs revenue', type: 'revenue', subtype: 'revenue' },
  { id: '4030', code: '4030', name: 'Warehouse revenue', type: 'revenue', subtype: 'revenue' },
  { id: '5000', code: '5000', name: 'Haulage / trucking costs', type: 'expense', subtype: 'direct_cost' },
  { id: '5010', code: '5010', name: 'Toll and fuel costs', type: 'expense', subtype: 'direct_cost' },
  { id: '5020', code: '5020', name: 'Freight and port costs', type: 'expense', subtype: 'direct_cost' },
  { id: '5030', code: '5030', name: 'Warehouse and handling costs', type: 'expense', subtype: 'direct_cost' },
  { id: '5040', code: '5040', name: 'Other direct costs', type: 'expense', subtype: 'direct_cost' },
  { id: '5050', code: '5050', name: 'Customs service costs', type: 'expense', subtype: 'direct_cost' },
  { id: '6000', code: '6000', name: 'Operating expenses', type: 'expense', subtype: 'operating_expense' },
]

const ACCOUNT_BY_ID = new Map(LEDGER_ACCOUNTS.map((account) => [account.id, account]))

const REVENUE_ACCOUNT_BY_DEPARTMENT: Record<Department, string> = {
  forwarding: '4000',
  haulage: '4010',
  customs: '4020',
  warehouse: '4030',
}

const COST_ACCOUNT_BY_CATEGORY: Record<SupplierCost['category'], string> = {
  trucking: '5000',
  toll: '5010',
  fuel: '5010',
  port: '5020',
  warehouse: '5030',
  other: '5040',
}

const RECOGNIZED_INVOICE_STATUSES: CustomerInvoice['status'][] = [
  'approved',
  'demo_submitted',
  'paid',
  'overdue',
]

function roundRM(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

function parseIsoDate(value: DateOnly, label: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError(`Invalid ${label}: ${value}`)
  }
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RangeError(`Invalid ${label}: ${value}`)
  }
  return date
}

function addDays(value: DateOnly, days: number): DateOnly {
  const date = parseIsoDate(value, 'date')
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function line(accountId: string, debitRM: number, creditRM: number): JournalLine {
  return { accountId, debitRM: roundRM(debitRM), creditRM: roundRM(creditRM) }
}

function assertBalanced(entry: JournalEntry): void {
  const debit = roundRM(entry.lines.reduce((total, item) => total + item.debitRM, 0))
  const credit = roundRM(entry.lines.reduce((total, item) => total + item.creditRM, 0))
  if (debit !== credit) {
    throw new Error(`Journal entry ${entry.id} is not balanced (${debit} debit / ${credit} credit).`)
  }
}

function isRecognizedInvoice(invoice: CustomerInvoice): boolean {
  return RECOGNIZED_INVOICE_STATUSES.includes(invoice.status)
}

function isPostedActualCost(cost: SupplierCost): boolean {
  return cost.costType === 'actual' && cost.approvalStatus === 'approved'
}

function paymentDateForCost(dataset: DemoDataset, cost: SupplierCost): DateOnly | null {
  if (cost.paymentStatus !== 'paid') return null
  const voucher = dataset.paymentVouchers.find(
    (record) =>
      record.supplierCostId === cost.id &&
      record.status === 'paid' &&
      record.voucherType === 'supplier_payment',
  )
  return voucher?.voucherDate ?? cost.recordedDate
}

export function getPreviousPeriod(startDate: DateOnly, endDate: DateOnly): { startDate: DateOnly; endDate: DateOnly } {
  parseIsoDate(startDate, 'start date')
  parseIsoDate(endDate, 'end date')
  if (startDate > endDate) {
    throw new RangeError('Reporting period start date must be on or before the end date.')
  }
  const start = parseIsoDate(startDate, 'start date')
  const end = parseIsoDate(endDate, 'end date')
  const lengthDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  const previousEndDate = addDays(startDate, -1)
  const previousStartDate = addDays(previousEndDate, 1 - lengthDays)
  return { startDate: previousStartDate, endDate: previousEndDate }
}

export function defaultReportingPeriod(asOfDate: DateOnly): { startDate: DateOnly; endDate: DateOnly } {
  parseIsoDate(asOfDate, 'as-of date')
  return { startDate: `${asOfDate.slice(0, 8)}01`, endDate: asOfDate }
}

export function buildIllustrativeJournal(dataset: DemoDataset): JournalEntry[] {
  const entries: JournalEntry[] = []

  const openingByDate = new Map<DateOnly, OpeningBalance[]>()
  for (const opening of dataset.openingBalances) {
    const current = openingByDate.get(opening.asOfDate) ?? []
    current.push(opening)
    openingByDate.set(opening.asOfDate, current)
  }
  for (const [date, openings] of openingByDate) {
    const entry: JournalEntry = {
      id: `JE-OPEN-${date.replaceAll('-', '')}`,
      date,
      description: 'Illustrative opening balances',
      sourceType: 'opening',
      sourceId: `opening:${date}`,
      illustrative: true,
      lines: openings.map((opening) => line(opening.accountId, opening.debitRM, opening.creditRM)),
    }
    assertBalanced(entry)
    entries.push(entry)
  }

  for (const invoice of dataset.invoices) {
    if (!isRecognizedInvoice(invoice)) continue
    const totals = calculateInvoiceTotals(dataset, invoice.id)
    const revenueByAccount = new Map<string, number>()
    for (const chargeId of invoice.chargeIds) {
      const charge = dataset.charges.find((record) => record.id === chargeId)
      if (!charge) continue
      const accountId = REVENUE_ACCOUNT_BY_DEPARTMENT[charge.department]
      revenueByAccount.set(accountId, (revenueByAccount.get(accountId) ?? 0) + charge.amountRM)
    }
    const revenueLines = [...revenueByAccount.entries()].map(([accountId, amountRM]) => line(accountId, 0, amountRM))
    const invoiceEntry: JournalEntry = {
      id: `JE-${invoice.id}`,
      date: invoice.invoiceDate,
      description: `Recognized invoiced revenue ${invoice.id}`,
      sourceType: 'invoice',
      sourceId: invoice.id,
      illustrative: true,
      lines: [line('1100', totals.subtotalRM, 0), ...revenueLines],
    }
    assertBalanced(invoiceEntry)
    entries.push(invoiceEntry)

    if (totals.paidRM > 0) {
      const receiptEntry: JournalEntry = {
        id: `JE-RCPT-${invoice.id}`,
        date: invoice.invoiceDate,
        description: `Customer receipt recorded on ${invoice.id}`,
        sourceType: 'receipt',
        sourceId: invoice.id,
        illustrative: true,
        lines: [line('1000', totals.paidRM, 0), line('1100', 0, totals.paidRM)],
      }
      assertBalanced(receiptEntry)
      entries.push(receiptEntry)
    }
  }

  const paidCostIds = new Set<string>()
  for (const cost of dataset.supplierCosts) {
    if (!isPostedActualCost(cost)) continue
    const accountId = cost.department === 'customs' && cost.category === 'other'
      ? '5050'
      : COST_ACCOUNT_BY_CATEGORY[cost.category]
    const costEntry: JournalEntry = {
      id: `JE-${cost.id}`,
      date: cost.recordedDate,
      description: `Direct cost ${cost.id}`,
      sourceType: 'supplier_cost',
      sourceId: cost.id,
      illustrative: true,
      lines: [line(accountId, cost.amountRM, 0), line('2000', 0, cost.amountRM)],
    }
    assertBalanced(costEntry)
    entries.push(costEntry)

    const paidOn = paymentDateForCost(dataset, cost)
    if (paidOn) {
      paidCostIds.add(cost.id)
      const paymentEntry: JournalEntry = {
        id: `JE-PAY-${cost.id}`,
        date: paidOn,
        description: `Supplier payment for ${cost.id}`,
        sourceType: 'supplier_payment',
        sourceId: cost.id,
        illustrative: true,
        lines: [line('2000', cost.amountRM, 0), line('1000', 0, cost.amountRM)],
      }
      assertBalanced(paymentEntry)
      entries.push(paymentEntry)
    }
  }

  for (const voucher of dataset.paymentVouchers) {
    if (voucher.voucherType !== 'manual_expense') continue
    if (!['approved', 'paid'].includes(voucher.status)) continue
    if (voucher.supplierCostId && paidCostIds.has(voucher.supplierCostId)) continue
    const expenseEntry: JournalEntry = {
      id: `JE-${voucher.id}`,
      date: voucher.voucherDate,
      description: `Operating expense voucher ${voucher.id}`,
      sourceType: 'operating_expense',
      sourceId: voucher.id,
      illustrative: true,
      lines: voucher.status === 'paid'
        ? [line('6000', voucher.amountRM, 0), line('1000', 0, voucher.amountRM)]
        : [line('6000', voucher.amountRM, 0), line('2000', 0, voucher.amountRM)],
    }
    assertBalanced(expenseEntry)
    entries.push(expenseEntry)
  }

  return entries.sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id))
}

function accountBalance(
  entries: JournalEntry[],
  accountId: string,
  asOfDate: DateOnly,
  options: { fromDate?: DateOnly } = {},
): { debitRM: number; creditRM: number; netRM: number; sourceIds: string[] } {
  const account = ACCOUNT_BY_ID.get(accountId)
  if (!account) throw new Error(`Unknown ledger account: ${accountId}`)
  let debitRM = 0
  let creditRM = 0
  const sourceIds: string[] = []
  for (const entry of entries) {
    if (entry.date > asOfDate) continue
    if (options.fromDate && entry.date < options.fromDate) continue
    for (const item of entry.lines) {
      if (item.accountId !== accountId) continue
      debitRM += item.debitRM
      creditRM += item.creditRM
      if (!sourceIds.includes(entry.sourceId)) sourceIds.push(entry.sourceId)
    }
  }
  debitRM = roundRM(debitRM)
  creditRM = roundRM(creditRM)
  const signed = account.type === 'asset' || account.type === 'expense'
    ? roundRM(debitRM - creditRM)
    : roundRM(creditRM - debitRM)
  return { debitRM, creditRM, netRM: signed, sourceIds }
}

function collectLines(
  entries: JournalEntry[],
  accountIds: string[],
  startDate: DateOnly,
  endDate: DateOnly,
): StatementLine[] {
  return accountIds.flatMap((accountId) => {
    const account = ACCOUNT_BY_ID.get(accountId)
    if (!account) return []
    const balance = accountBalance(entries, accountId, endDate, { fromDate: startDate })
    if (balance.netRM === 0) return []
    return [{
      accountId,
      accountName: account.name,
      amountRM: balance.netRM,
      sourceIds: balance.sourceIds,
    }]
  })
}

const STATEMENT_ASSUMPTIONS = [
  'Prototype only — not an audited, management-approved or statutory financial statement.',
  'Recognized revenue is invoiced customer charges on non-cancelled, non-draft invoices. Quotations and uninvoiced performed work are excluded.',
  'Direct costs are approved actual supplier costs. Estimated costs and costs still pending Finance approval are excluded.',
  'Customer receipts reduce receivables and increase cash; they are not additional revenue.',
  'Supplier payments settle accounts payable; they are not additional cost.',
  'Manual expense vouchers post to operating expenses only when approved or paid, and only when they are not already linked to a posted supplier cost.',
  'Unmatched bank-feed rows are not posted to the ledger.',
  'Warehouse stock is operational cargo, not a valued inventory balance.',
  'Customs duty/SST on declarations is not treated as a company tax liability unless a tax ledger record exists.',
  'Customer receipts without a separate receipt date are dated on the related invoice date.',
  'Currency is Malaysian Ringgit (MYR). Recognition, tax and period-close rules remain Pending Business Clarification.',
]

function profitAndLossForPeriod(
  entries: JournalEntry[],
  startDate: DateOnly,
  endDate: DateOnly,
): Omit<ProfitAndLossReport, 'previous' | 'previousStartDate' | 'previousEndDate' | 'prototype' | 'assumptions'> {
  const revenueLines = collectLines(entries, ['4000', '4010', '4020', '4030'], startDate, endDate)
  const directCostLines = collectLines(entries, ['5000', '5010', '5020', '5030', '5040', '5050'], startDate, endDate)
  const operatingExpenseLines = collectLines(entries, ['6000'], startDate, endDate)
  const recognizedRevenueRM = roundRM(revenueLines.reduce((total, item) => total + item.amountRM, 0))
  const directCostsRM = roundRM(directCostLines.reduce((total, item) => total + item.amountRM, 0))
  const operatingExpensesRM = roundRM(operatingExpenseLines.reduce((total, item) => total + item.amountRM, 0))
  const grossProfitRM = roundRM(recognizedRevenueRM - directCostsRM)
  const netProfitRM = roundRM(grossProfitRM - operatingExpensesRM)
  return {
    startDate,
    endDate,
    revenueLines,
    directCostLines,
    operatingExpenseLines,
    recognizedRevenueRM,
    directCostsRM,
    grossProfitRM,
    grossMarginPercent: recognizedRevenueRM > 0 ? roundRM((grossProfitRM / recognizedRevenueRM) * 100) : null,
    operatingExpensesRM,
    netProfitRM,
    netMarginPercent: recognizedRevenueRM > 0 ? roundRM((netProfitRM / recognizedRevenueRM) * 100) : null,
  }
}

export function calculateProfitAndLoss(
  dataset: DemoDataset,
  startDate: DateOnly,
  endDate: DateOnly,
): ProfitAndLossReport {
  parseIsoDate(startDate, 'start date')
  parseIsoDate(endDate, 'end date')
  if (startDate > endDate) {
    throw new RangeError('Reporting period start date must be on or before the end date.')
  }
  const previous = getPreviousPeriod(startDate, endDate)
  const entries = buildIllustrativeJournal(dataset)
  const current = profitAndLossForPeriod(entries, startDate, endDate)
  const prior = profitAndLossForPeriod(entries, previous.startDate, previous.endDate)
  return {
    ...current,
    previousStartDate: previous.startDate,
    previousEndDate: previous.endDate,
    prototype: true,
    assumptions: STATEMENT_ASSUMPTIONS,
    previous: {
      recognizedRevenueRM: prior.recognizedRevenueRM,
      directCostsRM: prior.directCostsRM,
      grossProfitRM: prior.grossProfitRM,
      operatingExpensesRM: prior.operatingExpensesRM,
      netProfitRM: prior.netProfitRM,
      hasRecognizedActivity:
        prior.recognizedRevenueRM !== 0 ||
        prior.directCostsRM !== 0 ||
        prior.operatingExpensesRM !== 0,
    },
  }
}

export function calculateBalanceSheet(dataset: DemoDataset, asOfDate: DateOnly): BalanceSheetReport {
  parseIsoDate(asOfDate, 'as-of date')
  const entries = buildIllustrativeJournal(dataset)
  const openingBalancesRecorded = dataset.openingBalances.some((opening) => opening.asOfDate <= asOfDate)
  const cashBalance = accountBalance(entries, '1000', asOfDate)
  const receivablesBalance = accountBalance(entries, '1100', asOfDate)
  const inventoryBalance = accountBalance(entries, '1200', asOfDate).netRM
  const otherAssetsBalance = accountBalance(entries, '1900', asOfDate)
  const payablesBalance = accountBalance(entries, '2000', asOfDate)
  const loansRM = accountBalance(entries, '2100', asOfDate).netRM
  const taxLiabilitiesRM = accountBalance(entries, '2200', asOfDate).netRM
  const contributedCapitalBalance = accountBalance(entries, '3000', asOfDate)
  const cashRM = cashBalance.netRM
  const receivablesRM = receivablesBalance.netRM
  const otherAssetsRM = otherAssetsBalance.netRM
  const payablesRM = payablesBalance.netRM
  const contributedCapitalRM = contributedCapitalBalance.netRM
  const revenueToDate = roundRM(
    ['4000', '4010', '4020', '4030']
      .reduce((total, accountId) => total + accountBalance(entries, accountId, asOfDate).netRM, 0),
  )
  const expenseToDate = roundRM(
    ['5000', '5010', '5020', '5030', '5040', '5050', '6000']
      .reduce((total, accountId) => total + accountBalance(entries, accountId, asOfDate).netRM, 0),
  )
  const retainedEarningsRM = roundRM(revenueToDate - expenseToDate)
  const inventoryRecorded = inventoryBalance !== 0
  const loansRecorded = accountBalance(entries, '2100', asOfDate).sourceIds.length > 0
  const taxRecorded = accountBalance(entries, '2200', asOfDate).sourceIds.length > 0
  const totalAssetsRM = roundRM(cashRM + receivablesRM + inventoryBalance + otherAssetsRM)
  const totalLiabilitiesRM = roundRM(payablesRM + loansRM + taxLiabilitiesRM)
  const totalEquityRM = roundRM(contributedCapitalRM + retainedEarningsRM)
  const totalLiabilitiesAndEquityRM = roundRM(totalLiabilitiesRM + totalEquityRM)
  const unexplainedDifferenceRM = roundRM(totalAssetsRM - totalLiabilitiesAndEquityRM)
  const warnings = [
    'This is a prototype statement generated from illustrative demo records. It is not audited and is not a statutory financial statement.',
  ]
  if (!openingBalancesRecorded) {
    warnings.push('Opening balances are not recorded for this as-of date. Figures reflect posted operational entries only.')
  } else {
    const openingAccountIds = new Set(
      dataset.openingBalances
        .filter((opening) => opening.asOfDate <= asOfDate)
        .map((opening) => opening.accountId),
    )
    const expectedOpeningAccounts = ['1000', '1100', '1200', '1900', '2000', '2100', '2200', '3000']
    const missingOpeningAccounts = expectedOpeningAccounts.filter((accountId) => !openingAccountIds.has(accountId))
    if (missingOpeningAccounts.length) {
      warnings.push(`Opening balance coverage is incomplete. No opening value is recorded for: ${missingOpeningAccounts.map((accountId) => ACCOUNT_BY_ID.get(accountId)?.name ?? accountId).join(', ')}.`)
    }
  }
  if (!inventoryRecorded) {
    warnings.push('No valued inventory balance is recorded. Warehouse stock remains operational cargo only.')
  }
  if (!loansRecorded) {
    warnings.push('No loan or borrowing records are posted.')
  }
  if (!taxRecorded) {
    warnings.push('No company tax-liability ledger records are posted. Customs duty/SST on declarations is not treated as tax payable.')
  }
  if (Math.abs(unexplainedDifferenceRM) >= 0.005) {
    warnings.push(`Accounting equation difference of ${unexplainedDifferenceRM.toFixed(2)} is shown and is not plugged into an unexplained balancing line.`)
  }

  const assetLines: BalanceSheetSectionLine[] = [
    { accountId: '1000', accountName: 'Cash and bank', amountRM: cashRM, recorded: cashBalance.sourceIds.length > 0 },
    { accountId: '1100', accountName: 'Accounts receivable', amountRM: receivablesRM, recorded: receivablesBalance.sourceIds.length > 0 },
    { accountId: '1200', accountName: 'Inventory', amountRM: inventoryBalance, recorded: inventoryRecorded },
    { accountId: '1900', accountName: 'Other assets', amountRM: otherAssetsRM, recorded: otherAssetsBalance.sourceIds.length > 0 },
  ]
  const liabilityLines: BalanceSheetSectionLine[] = [
    { accountId: '2000', accountName: 'Accounts payable', amountRM: payablesRM, recorded: payablesBalance.sourceIds.length > 0 },
    { accountId: '2100', accountName: 'Loans and borrowings', amountRM: loansRM, recorded: loansRecorded },
    { accountId: '2200', accountName: 'Tax liabilities', amountRM: taxLiabilitiesRM, recorded: taxRecorded },
  ]
  const equityLines: BalanceSheetSectionLine[] = [
    { accountId: '3000', accountName: 'Contributed capital', amountRM: contributedCapitalRM, recorded: contributedCapitalBalance.sourceIds.length > 0 },
    {
      accountId: 'RE',
      accountName: 'Accumulated result (retained earnings)',
      amountRM: retainedEarningsRM,
      recorded: ['4000', '4010', '4020', '4030', '5000', '5010', '5020', '5030', '5040', '5050', '6000']
        .some((accountId) => accountBalance(entries, accountId, asOfDate).sourceIds.length > 0),
    },
  ]

  return {
    asOfDate,
    prototype: true,
    openingBalancesRecorded,
    assumptions: STATEMENT_ASSUMPTIONS,
    warnings,
    cashRM,
    receivablesRM,
    inventoryRM: inventoryBalance,
    inventoryRecorded,
    otherAssetsRM,
    totalAssetsRM,
    payablesRM,
    loansRM,
    loansRecorded,
    taxLiabilitiesRM,
    taxRecorded,
    totalLiabilitiesRM,
    contributedCapitalRM,
    retainedEarningsRM,
    totalEquityRM,
    totalLiabilitiesAndEquityRM,
    unexplainedDifferenceRM,
    equationHolds: Math.abs(unexplainedDifferenceRM) < 0.005,
    assetLines,
    liabilityLines,
    equityLines,
  }
}

export function formatMYR(amount: number): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
