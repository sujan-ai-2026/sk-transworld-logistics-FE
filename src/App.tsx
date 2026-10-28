import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  calculateDashboardMetrics,
  calculateInvoiceTotals,
  calculateJobProfitability,
  getDefaultDashboardFilters,
  type DashboardFilters,
} from './data/calculations.js'
import { DEMO_DATA } from './data/demoData.js'
import { acceptQuotationAndCreateJob, createJobFromInput, getJobCloseReadiness, getJobListRecords, getDefaultJobFilters, validateJobCreateInput, type JobCreateInput, type JobFilters } from './data/jobs.js'
import { CustomsWorkspace } from './components/CustomsWorkspace.js'
import { ForwardingWorkspace } from './components/ForwardingWorkspace.js'
import { HaulageWorkspace } from './components/HaulageWorkspace.js'
import { updateCustomsStep, updateShipmentMilestone, type CustomsWorkflowStep } from './data/shipments.js'
import { WarehouseWorkspace } from './components/WarehouseWorkspace.js'
import { DocumentsWorkspace } from './components/DocumentsWorkspace.js'
import { FinanceWorkspace, type FinanceView } from './components/FinanceWorkspace.js'
import AlertsWorkspace from './components/AlertsWorkspace.js'
import CustomerPortal from './components/CustomerPortal.js'
import QuotationsWorkspace from './components/QuotationsWorkspace.js'
import MasterDataWorkspace from './components/MasterDataWorkspace.js'
import { MainContentBackground } from './components/MainContentBackground.js'
import { LogisticsAnimation } from './components/LogisticsAnimation.js'
import { useConfirmation } from './components/useConfirmation.js'
import type { ActivityEvent, BankTransaction, ChargeSuggestion, CustomsCase, CustomsStepStatus, CustomerInvoice, Department, DemoDataset, DocumentRecord, Job, OperationalAlert, OperationalMilestone, PaymentRequest, PaymentVoucher, StockMovement, SupplierCost, WarehouseActivity } from './data/model.js'
import './App.css'
import truckIcon from './assets/simple-blue-delivery-truck-icon-vector-60918322-Photoroom.png'

type PageId =
  | 'dashboard'
  | 'quotations'
  | 'jobs'
  | 'forwarding'
  | 'customs'
  | 'haulage'
  | 'warehouse'
  | 'documents'
  | 'billing'
  | 'job-costing'
  | 'alerts'
  | 'customer-portal'
  | 'master-data'

type IconName =
  | 'dashboard'
  | 'quote'
  | 'jobs'
  | 'ship'
  | 'customs'
  | 'truck'
  | 'warehouse'
  | 'documents'
  | 'billing'
  | 'reports'
  | 'alerts'
  | 'portal'
  | 'settings'
  | 'search'
  | 'bell'
  | 'chevron'
  | 'menu'
  | 'close'
  | 'arrow'
  | 'layers'
  | 'clock'
  | 'shield'

type NavigationItem = {
  id: PageId
  label: string
  icon: IconName
}

const navigationGroups: { label: string; items: NavigationItem[] }[] = [
  {
    label: 'Workspace',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: 'dashboard' }],
  },
  {
    label: 'Operations',
    items: [
      { id: 'quotations', label: 'Quotations & Tariffs', icon: 'quote' },
      { id: 'jobs', label: 'Jobs / Dockets', icon: 'jobs' },
      { id: 'forwarding', label: 'Freight Forwarding', icon: 'ship' },
      { id: 'customs', label: 'Customs Clearance', icon: 'customs' },
      { id: 'haulage', label: 'Haulage / Fleet', icon: 'truck' },
      { id: 'warehouse', label: 'Warehouse & Inventory', icon: 'warehouse' },
      { id: 'documents', label: 'Documents', icon: 'documents' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'billing', label: 'Billing & Finance', icon: 'billing' },
      { id: 'job-costing', label: 'Job Costing & Reports', icon: 'reports' },
    ],
  },
  {
    label: 'Workspace tools',
    items: [
      { id: 'alerts', label: 'Alerts & Reminders', icon: 'alerts' },
      { id: 'customer-portal', label: 'Customer Portal', icon: 'portal' },
      { id: 'master-data', label: 'Master Data & Settings', icon: 'settings' },
    ],
  },
]

const allNavigationItems = navigationGroups.flatMap((group) => group.items)

const iconContent: Record<IconName, ReactNode> = {
  dashboard: (
    <>
      <rect x="3.25" y="3.25" width="7" height="7" rx="1.5" />
      <rect x="13.75" y="3.25" width="7" height="4.25" rx="1.5" />
      <rect x="13.75" y="10.75" width="7" height="10" rx="1.5" />
      <rect x="3.25" y="13.25" width="7" height="7.5" rx="1.5" />
    </>
  ),
  quote: (
    <>
      <path d="M7 3.5h8l4.5 4.5v12a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M14.5 3.75V8.5H19M8.5 13h7M8.5 16.5h7" />
    </>
  ),
  jobs: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M8 5.5V4.25A1.75 1.75 0 0 1 9.75 2.5h4.5A1.75 1.75 0 0 1 16 4.25V5.5M3.75 11.5h16.5M10 11.5v2h4v-2" />
    </>
  ),
  ship: (
    <>
      <path d="M3 13.5h18l-2.25 5.25a2 2 0 0 1-1.85 1.25H7.1a2 2 0 0 1-1.85-1.25L3 13.5Z" />
      <path d="M5 10.5h14l2 3H3l2-3ZM8 10.5V5.25h8v5.25M10 5.25V3h4v2.25M3 21.5c1.25-1 2.5-1 3.75 0s2.5 1 3.75 0 2.5-1 3.75 0 2.5 1 3.75 0 2.5-1 3.75 0" />
    </>
  ),
  customs: (
    <>
      <path d="m12 2.75 8 3.5v5.1c0 5.25-3.4 8.5-8 9.9-4.6-1.4-8-4.65-8-9.9v-5.1l8-3.5Z" />
      <path d="m8.5 12 2.25 2.25L15.75 9" />
    </>
  ),
  truck: (
    <>
      <path d="M2.75 6.25h11.5v11.5H2.75zM14.25 10h4l3 3.5v4.25h-7" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M17 10v3.5h4.1" />
    </>
  ),
  warehouse: (
    <>
      <path d="m3 10 9-7 9 7v10.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" />
      <path d="M8 21.5v-8h8v8M7 10.5h.01M12 10.5h.01M17 10.5h.01" />
    </>
  ),
  documents: (
    <>
      <path d="M7 3h7l5 5v12a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5A2 2 0 0 1 7 3Z" />
      <path d="M14 3.5V8h4.5M8.5 13h7M8.5 16.5h7" />
    </>
  ),
  billing: (
    <>
      <rect x="3.25" y="5" width="17.5" height="14.5" rx="2" />
      <path d="M7.5 9.5h9M7.5 13h3M3.5 8.5h17" />
    </>
  ),
  reports: (
    <>
      <path d="M4 20.5h17M6.5 17v-5M11.5 17V6M16.5 17V9M21 17V3" />
    </>
  ),
  alerts: (
    <>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
    </>
  ),
  portal: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 12h17M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="m19.4 15 .1.1 1.25 1-1.5 2.6-1.55-.65a8.4 8.4 0 0 1-1.6.95l-.25 1.7h-3l-.3-1.7a8.4 8.4 0 0 1-1.6-.95l-1.55.65-1.5-2.6 1.3-1a7 7 0 0 1 0-1.9l-1.3-1 1.5-2.6 1.55.65a8.4 8.4 0 0 1 1.6-.95l.3-1.7h3l.25 1.7a8.4 8.4 0 0 1 1.6.95l1.55-.65 1.5 2.6-1.25 1a7 7 0 0 1-.1 1.8Z" />
    </>
  ),
  search: (
    <>
      <circle cx="10.75" cy="10.75" r="6.75" />
      <path d="m16 16 4.25 4.25" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
    </>
  ),
  chevron: <path d="m7 10 5 5 5-5" />,
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  shield: (
    <>
      <path d="m12 2.75 8 3.5v5.1c0 5.25-3.4 8.5-8 9.9-4.6-1.4-8-4.65-8-9.9v-5.1l8-3.5Z" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
}

function Icon({
  name,
  size = 20,
}: {
  name: IconName
  size?: number
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconContent[name]}
    </svg>
  )
}


function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard')
  const [selectedJobNo, setSelectedJobNo] = useState<string | null>(null)
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [financeView, setFinanceView] = useState<FinanceView>('register')
  const [createdJobs, setCreatedJobs] = useState<Job[]>([])
  const [linkedQuotationJobs, setLinkedQuotationJobs] = useState<Record<string, string>>({})
  const [closedJobs, setClosedJobs] = useState<Record<string, { reason: string; approvedBy: string }>>({})
  const [milestoneUpdates, setMilestoneUpdates] = useState<Record<string, OperationalMilestone>>({})
  const [customsCaseUpdates, setCustomsCaseUpdates] = useState<Record<string, CustomsCase>>({})
  const [warehouseActivityUpdates, setWarehouseActivityUpdates] = useState<Record<string, WarehouseActivity>>({})
  const [addedStockMovements, setAddedStockMovements] = useState<StockMovement[]>([])
  const [storageChargeUpdates, setStorageChargeUpdates] = useState<Record<string, ChargeSuggestion>>({})
  const [addedStorageCharges, setAddedStorageCharges] = useState<ChargeSuggestion[]>([])
  const [documentUpdates, setDocumentUpdates] = useState<Record<string, DocumentRecord>>({})
  const [addedDocuments, setAddedDocuments] = useState<DocumentRecord[]>([])
  const [documentActivity, setDocumentActivity] = useState<ActivityEvent[]>([])
  const [financeChargeUpdates, setFinanceChargeUpdates] = useState<Record<string, ChargeSuggestion>>({})
  const [addedFinanceCharges, setAddedFinanceCharges] = useState<ChargeSuggestion[]>([])
  const [invoiceUpdates, setInvoiceUpdates] = useState<Record<string, CustomerInvoice>>({})
  const [addedInvoices, setAddedInvoices] = useState<CustomerInvoice[]>([])
  const [supplierCostUpdates, setSupplierCostUpdates] = useState<Record<string, SupplierCost>>({})
  const [paymentRequestUpdates, setPaymentRequestUpdates] = useState<Record<string, PaymentRequest>>({})
  const [paymentVoucherUpdates, setPaymentVoucherUpdates] = useState<Record<string, PaymentVoucher>>({})
  const [bankTransactionUpdates, setBankTransactionUpdates] = useState<Record<string, BankTransaction>>({})
  const [alertUpdates, setAlertUpdates] = useState<Record<string, OperationalAlert>>({})
  const [searchValue, setSearchValue] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [activePopover, setActivePopover] = useState<'notifications' | 'profile' | null>(
    null,
  )
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const appDataset = useMemo<DemoDataset>(
    () => ({
      ...DEMO_DATA,
      jobs: [...DEMO_DATA.jobs, ...createdJobs],
      documents: [...DEMO_DATA.documents, ...addedDocuments].map((document) => documentUpdates[document.id] ?? document),
      activity: [...DEMO_DATA.activity, ...documentActivity],
      milestones: DEMO_DATA.milestones.map((milestone) => milestoneUpdates[milestone.id] ?? milestone),
      customsCases: DEMO_DATA.customsCases.map((customsCase) => customsCaseUpdates[customsCase.id] ?? customsCase),
      warehouseActivities: DEMO_DATA.warehouseActivities.map((activity) => warehouseActivityUpdates[activity.id] ?? activity),
      stockMovements: [...DEMO_DATA.stockMovements, ...addedStockMovements],
      charges: [...DEMO_DATA.charges, ...addedStorageCharges, ...addedFinanceCharges].map((charge) => financeChargeUpdates[charge.id] ?? storageChargeUpdates[charge.id] ?? charge),
      invoices: [...DEMO_DATA.invoices, ...addedInvoices].map((invoice) => invoiceUpdates[invoice.id] ?? invoice),
      supplierCosts: DEMO_DATA.supplierCosts.map((cost) => supplierCostUpdates[cost.id] ?? cost),
      paymentRequests: DEMO_DATA.paymentRequests.map((request) => paymentRequestUpdates[request.id] ?? request),
      paymentVouchers: DEMO_DATA.paymentVouchers.map((voucher) => paymentVoucherUpdates[voucher.id] ?? voucher),
      bankTransactions: DEMO_DATA.bankTransactions.map((transaction) => bankTransactionUpdates[transaction.id] ?? transaction),
      alerts: DEMO_DATA.alerts.map((alert) => alertUpdates[alert.id] ?? alert),
      quotations: DEMO_DATA.quotations.map((quotation) => ({
        ...quotation,
        ...(linkedQuotationJobs[quotation.id]
          ? {
            linkedJobNo: linkedQuotationJobs[quotation.id],
            status: 'accepted' as const,
          }
          : {}),
      })),
    }),
    [
      createdJobs,
      addedDocuments,
      documentUpdates,
      documentActivity,
      financeChargeUpdates,
      addedFinanceCharges,
      invoiceUpdates,
      addedInvoices,
      supplierCostUpdates,
      paymentRequestUpdates,
      paymentVoucherUpdates,
      bankTransactionUpdates,
      alertUpdates,
      linkedQuotationJobs,
      milestoneUpdates,
      customsCaseUpdates,
      warehouseActivityUpdates,
      addedStockMovements,
      storageChargeUpdates,
      addedStorageCharges,
    ],
  )

  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setActivePopover(null)
        setMobileNavOpen(false)
        searchInputRef.current?.focus()
        setSearchOpen(true)
      }
    }

    window.addEventListener('keydown', handleSearchShortcut)
    return () => window.removeEventListener('keydown', handleSearchShortcut)
  }, [])

  const activeItem = allNavigationItems.find((item) => item.id === activePage)
  const matchingPages = allNavigationItems.filter((item) =>
    item.label.toLowerCase().includes(searchValue.trim().toLowerCase()),
  )

  function navigateTo(page: PageId) {
    setActivePage(page)
    if (page !== 'billing') setSelectedInvoiceId(null)
    setMobileNavOpen(false)
    setSearchOpen(false)
    setSearchValue('')
    setActivePopover(null)
  }

  function openJob(jobNo: string) {
    setSelectedJobNo(jobNo)
    navigateTo('jobs')
  }

  function openShipment(shipmentId: string) {
    setSelectedShipmentId(shipmentId)
    navigateTo('forwarding')
  }

  function openInvoice(invoiceId: string) {
    setSelectedInvoiceId(invoiceId)
    setFinanceView('register')
    navigateTo('billing')
  }

  function handleCreateJob(job: Job) {
    setCreatedJobs((current) => [...current, job])
    const quotationId = job.quotationId
    if (quotationId) {
      setLinkedQuotationJobs((current) => ({ ...current, [quotationId]: job.jobNo }))
    }
    setSelectedJobNo(job.jobNo)
  }

  function handleUpdateMilestone(milestoneId: string, status: OperationalMilestone['status']) {
    const milestone = appDataset.milestones.find((record) => record.id === milestoneId)
    if (!milestone) throw new Error(`Milestone not found: ${milestoneId}`)
    setMilestoneUpdates((current) => ({
      ...current,
      [milestoneId]: updateShipmentMilestone(milestone, status, appDataset.metadata.asOfDate),
    }))
  }

  function handleUpdateCustomsStep(
    customsCaseId: string,
    step: CustomsWorkflowStep,
    status: CustomsStepStatus | 'paid' | 'pending',
  ) {
    const customsCase = appDataset.customsCases.find((record) => record.id === customsCaseId)
    if (!customsCase) throw new Error(`Customs case not found: ${customsCaseId}`)
    setCustomsCaseUpdates((current) => ({
      ...current,
      [customsCaseId]: updateCustomsStep(
        customsCase,
        step,
        status,
        appDataset.metadata.asOfDate,
      ),
    }))
  }

  function handleUpdateWarehouseActivity(
    activityId: string,
    status: WarehouseActivity['status'],
  ) {
    const activity = appDataset.warehouseActivities.find((record) => record.id === activityId)
    if (!activity) throw new Error(`Warehouse activity not found: ${activityId}`)
    setWarehouseActivityUpdates((current) => ({
      ...current,
      [activityId]: { ...activity, status, scheduledDate: appDataset.metadata.asOfDate },
    }))
  }

  function handleAddStockAdjustment(movement: StockMovement) {
    const receipt = appDataset.warehouseReceipts.find((record) => record.id === movement.receiptId)
    if (!receipt || receipt.jobNo !== movement.jobNo) {
      throw new Error('Stock adjustment must reference a warehouse receipt from the same Job No.')
    }
    if (appDataset.stockMovements.some((record) => record.id === movement.id)) {
      throw new Error(`Stock movement ID already exists: ${movement.id}`)
    }
    setAddedStockMovements((current) => [...current, movement])
  }

  function handleCreateStorageCharge(charge: ChargeSuggestion) {
    if (appDataset.charges.some((record) => record.sourceEventId === charge.sourceEventId)) {
      throw new Error('A storage charge already exists for this receipt and billing period.')
    }
    setAddedStorageCharges((current) => [...current, charge])
  }

  function handleUpdateStorageCharge(chargeId: string, status: ChargeSuggestion['status']) {
    const charge = appDataset.charges.find((record) => record.id === chargeId)
    if (!charge || !charge.sourceEventId.startsWith('storage:')) {
      throw new Error(`Storage charge suggestion not found: ${chargeId}`)
    }
    setStorageChargeUpdates((current) => ({
      ...current,
      [chargeId]: { ...charge, status },
    }))
  }

  function recordDocumentActivity(document: DocumentRecord, description: string) {
    const job = appDataset.jobs.find((record) => record.jobNo === document.jobNo)
    if (!job) throw new Error(`Cannot record document activity for unknown job: ${document.jobNo}`)
    setDocumentActivity((current) => [
      ...current,
      {
        id: `ACT-DOC-${document.id}-${current.length + 1}`,
        jobNo: document.jobNo,
        actor: 'Demo workspace user',
        description,
        department: job.serviceDepartments[0] ?? 'forwarding',
        occurredAt: appDataset.metadata.asOfDate,
      },
    ])
  }

  function handleSaveDocument(document: DocumentRecord, activityDescription: string) {
    if (!appDataset.jobs.some((job) => job.jobNo === document.jobNo)) {
      throw new Error(`Document references unknown Job No.: ${document.jobNo}`)
    }
    const existing = appDataset.documents.some((record) => record.id === document.id)
    if (existing) {
      setDocumentUpdates((current) => ({ ...current, [document.id]: document }))
    } else {
      setAddedDocuments((current) => [...current, document])
    }
    recordDocumentActivity(document, activityDescription)
  }

  function handleClassifyDocument(documentId: string, access: DocumentRecord['access']) {
    const document = appDataset.documents.find((record) => record.id === documentId)
    if (!document || document.status !== 'available') {
      throw new Error(`Available document not found for classification: ${documentId}`)
    }
    const updated = { ...document, access }
    setDocumentUpdates((current) => ({ ...current, [documentId]: updated }))
    recordDocumentActivity(
      updated,
      access === 'customer_approved'
        ? `Document explicitly approved for customer sharing: ${documentId}`
        : `Customer sharing revoked; document reclassified internal: ${documentId}`,
    )
  }

  function recordFinanceActivity(jobNo: string, description: string, department: Department = 'forwarding') {
    const job = appDataset.jobs.find((record) => record.jobNo === jobNo)
    if (!job) {
      throw new Error(`Cannot record finance activity for unknown job: ${jobNo}`)
    }
    setDocumentActivity((current) => {
      const newEvent: ActivityEvent = {
        id: `ACT-FIN-${current.length + 1}-${crypto.randomUUID()}`,
        jobNo,
        actor: 'Finance reviewer (demo)',
        description,
        department,
        occurredAt: appDataset.metadata.asOfDate,
      }
      return [...current, newEvent]
    })
  }

  function handleAddFinanceCharge(charge: ChargeSuggestion) {
    if (!appDataset.jobs.some((job) => job.jobNo === charge.jobNo)) {
      throw new Error(`Finance charge references unknown Job No.: ${charge.jobNo}`)
    }
    if (appDataset.charges.some((record) => record.id === charge.id || record.sourceEventId === charge.sourceEventId)) {
      throw new Error(`Charge or source event already exists: ${charge.sourceEventId}`)
    }
    setAddedFinanceCharges((current) => [...current, charge])
    recordFinanceActivity(charge.jobNo, `Draft charge suggestion created: ${charge.description} from ${charge.sourceEventId}`, charge.department)
  }

  function handleUpdateFinanceCharge(charge: ChargeSuggestion) {
    const existing = appDataset.charges.find((record) => record.id === charge.id)
    if (!existing) throw new Error(`Finance charge not found: ${charge.id}`)
    if (charge.status === 'invoiced' && !charge.invoiceId) {
      throw new Error('An invoiced charge must link to its customer invoice.')
    }
    setFinanceChargeUpdates((current) => ({ ...current, [charge.id]: charge }))
    recordFinanceActivity(charge.jobNo, `Charge ${charge.id} state recorded as ${charge.status}${charge.cancellationReason ? ` · ${charge.cancellationReason}` : ''}`, charge.department)
  }

  function handleCreateFinanceInvoice(invoice: CustomerInvoice) {
    if (appDataset.invoices.some((record) => record.id === invoice.id)) {
      throw new Error(`Invoice already exists: ${invoice.id}`)
    }
    if (!invoice.chargeIds.length || invoice.chargeIds.some((id) => !appDataset.charges.some((charge) => charge.id === id && charge.jobNo === invoice.jobNo && charge.status === 'approved' && charge.performed))) {
      throw new Error('Invoice must reference approved performed charges from the same Job No.')
    }
    setAddedInvoices((current) => [...current, invoice])
    for (const chargeId of invoice.chargeIds) {
      const charge = appDataset.charges.find((record) => record.id === chargeId)
      if (charge) setFinanceChargeUpdates((current) => ({ ...current, [chargeId]: { ...charge, status: 'invoiced', invoiceId: invoice.id } }))
    }
    recordFinanceActivity(invoice.jobNo, `Draft customer invoice ${invoice.id} created from approved charge lines`)
  }

  function handleUpdateFinanceInvoice(invoice: CustomerInvoice) {
    if (!appDataset.invoices.some((record) => record.id === invoice.id)) {
      throw new Error(`Customer invoice not found: ${invoice.id}`)
    }
    setInvoiceUpdates((current) => ({ ...current, [invoice.id]: invoice }))
    const department = appDataset.jobs.find((job) => job.jobNo === invoice.jobNo)?.serviceDepartments[0] ?? 'forwarding'
    recordFinanceActivity(invoice.jobNo, `Customer invoice ${invoice.id} state recorded as ${invoice.status}${invoice.cancellationReason ? ` · ${invoice.cancellationReason}` : ''}`, department)
  }

  function handleUpdateSupplierCost(cost: SupplierCost) {
    if (!appDataset.supplierCosts.some((record) => record.id === cost.id)) {
      throw new Error(`Supplier cost not found: ${cost.id}`)
    }
    setSupplierCostUpdates((current) => ({ ...current, [cost.id]: cost }))
    recordFinanceActivity(cost.jobNo, `Supplier cost ${cost.id} finance state updated: ${cost.approvalStatus}`, cost.department)
  }

  function handleUpdatePaymentRequest(request: PaymentRequest) {
    if (!appDataset.paymentRequests.some((record) => record.id === request.id)) {
      throw new Error(`Payment request not found: ${request.id}`)
    }
    setPaymentRequestUpdates((current) => ({ ...current, [request.id]: request }))
    recordFinanceActivity(request.jobNo, `Payment request ${request.id} state recorded as ${request.status}`)
  }

  function handleUpdatePaymentVoucher(voucher: PaymentVoucher) {
    if (!appDataset.paymentVouchers.some((record) => record.id === voucher.id)) {
      throw new Error(`Payment voucher not found: ${voucher.id}`)
    }
    setPaymentVoucherUpdates((current) => ({ ...current, [voucher.id]: voucher }))
    if (voucher.jobNo) recordFinanceActivity(voucher.jobNo, `Payment voucher ${voucher.id} state recorded as ${voucher.status}`)
  }

  function handleUpdateBankTransaction(transaction: BankTransaction) {
    if (!appDataset.bankTransactions.some((record) => record.id === transaction.id)) {
      throw new Error(`Bank transaction not found: ${transaction.id}`)
    }
    setBankTransactionUpdates((current) => ({ ...current, [transaction.id]: transaction }))
  }

  function handleUpdateAlert(alert: OperationalAlert) {
    if (!appDataset.alerts.some((record) => record.id === alert.id)) {
      throw new Error(`Operational alert not found: ${alert.id}`)
    }
    if (!alert.owner.trim()) throw new Error('Alert owner cannot be empty.')
    setAlertUpdates((current) => ({ ...current, [alert.id]: alert }))
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setSearchOpen(false)
      setSearchValue('')
    }

    if (event.key === 'Enter' && matchingPages[0]) {
      navigateTo(matchingPages[0].id)
    }
  }

  return (
    <div
      className="app-shell"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setActivePopover(null)
          setMobileNavOpen(false)
          setSearchOpen(false)
        }
      }}
    >
      {mobileNavOpen && (
        <button
          className="mobile-nav-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside className={`sidebar${mobileNavOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <img src={truckIcon} alt="Truck Icon" style={{ width: 50, height: 50 }} />

          <span className="brand-copy">
            <span className="brand-name">SK Transworld</span>
            <span className="brand-caption">LOGISTICS · MALAYSIA</span>
          </span>
          <button
            className="icon-button sidebar-close"
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-avatar">SK</span>
          <span className="workspace-copy">
            <span className="workspace-label">Workspace</span>
            <span className="workspace-name">Transworld Malaysia</span>
          </span>
          <Icon name="chevron" size={16} />
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigationGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              {group.items.map((item) => (
                <button
                  aria-current={activePage === item.id ? 'page' : undefined}
                  className={`nav-item${activePage === item.id ? ' nav-item--active' : ''}`}
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  type="button"
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-rule" />
          <div className="connection-status">
            <span className="status-dot status-dot--amber" />
            <span>Prototype workspace</span>
          </div>
          <p>External services are not connected</p>
        </div>
      </aside>

      <div className="main-column">
        <MainContentBackground />
        <header className="topbar">
          <div className="topbar-leading">
            <button
              className="icon-button mobile-menu-button"
              type="button"
              aria-label="Open navigation"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
            >
              <Icon name="menu" />
            </button>
            <div className="breadcrumbs">
              <span>Transworld Malaysia</span>
              <span className="breadcrumb-divider">/</span>
              <span className="breadcrumb-current">{activeItem?.label}</span>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="global-search">
              <Icon name="search" size={18} />
              <input
                aria-label="Search workspaces"
                autoComplete="off"
                ref={searchInputRef}
                type="search"
                onChange={(event) => {
                  setSearchValue(event.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search workspaces"
                value={searchValue}
              />
              <kbd>⌘ K</kbd>
              {searchOpen && (
                <div className="search-results">
                  <span className="popover-eyebrow">
                    {searchValue.trim() ? 'Matching workspaces' : 'Go to'}
                  </span>
                  {matchingPages.length > 0 ? (
                    matchingPages.slice(0, 6).map((item) => (
                      <button
                        className="search-result"
                        key={item.id}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => navigateTo(item.id)}
                        type="button"
                      >
                        <Icon name={item.icon} size={17} />
                        <span>{item.label}</span>
                        <Icon name="arrow" size={16} />
                      </button>
                    ))
                  ) : (
                    <p className="search-empty">No workspaces match that search.</p>
                  )}
                  <p className="search-hint">Press Enter to open the first result · Esc to close</p>
                </div>
              )}
            </div>

            <div className="topbar-divider" />

            <div className="popover-anchor">
              <button
                className={`icon-button topbar-icon${activePopover === 'notifications' ? ' icon-button--active' : ''}`}
                type="button"
                aria-label="Workspace status"
                aria-expanded={activePopover === 'notifications'}
                onClick={() =>
                  setActivePopover(
                    activePopover === 'notifications' ? null : 'notifications',
                  )
                }
              >
                <Icon name="bell" size={19} />
                <span className="notification-indicator" />
              </button>
              {activePopover === 'notifications' && (
                <div className="utility-popover status-popover">
                  <div className="popover-heading">
                    <span className="popover-eyebrow">Workspace status</span>
                    {/* <span className="status-badge status-badge--amber">
                      {DEMO_DATA.metadata.label}
                    </span> */}
                  </div>
                  <p className="popover-message">
                    This prototype has no live shipment alerts or external service
                    connections.
                  </p>
                  <button
                    className="popover-link"
                    type="button"
                    onClick={() => navigateTo('alerts')}
                  >
                    Open alerts workspace <Icon name="arrow" size={15} />
                  </button>
                </div>
              )}
            </div>

            <div className="popover-anchor">
              <button
                className="profile-button"
                type="button"
                aria-expanded={activePopover === 'profile'}
                onClick={() =>
                  setActivePopover(activePopover === 'profile' ? null : 'profile')
                }
              >
                <span className="profile-avatar">ST</span>
                <span className="profile-copy">
                  {/* <span className="profile-name">{DEMO_DATA.metadata.label}</span> */}
                  <span className="profile-role">Prototype view</span>
                </span>
                <Icon name="chevron" size={15} />
              </button>
              {activePopover === 'profile' && (
                <div className="utility-popover profile-popover">
                  <span className="popover-eyebrow">Prototype workspace</span>
                  <p className="popover-message">
                    Role-based access and sign-in are not configured in this frontend.
                  </p>
                  <button
                    className="popover-link"
                    type="button"
                    onClick={() => navigateTo('master-data')}
                  >
                    Master data & settings <Icon name="arrow" size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main
          className="page-content"
          onClick={() => {
            setSearchOpen(false)
            setActivePopover(null)
          }}
        >
          <div className="page-heading-row">
            <div>
              <div className="page-eyebrow">
                <span className="eyebrow-line" />
                SK TRANSWORLD LOGISTICS
              </div>
              <h1>{activePage === 'jobs' && selectedJobNo ? selectedJobNo : activeItem?.label}</h1>
              <p className="page-description">
                {activePage === 'jobs' && selectedJobNo
                  ? 'Shared job detail · operations and financial status tracked separately.'
                  : activePage === 'dashboard'
                    ? 'A connected workspace for logistics operations, finance and job follow-up.'
                    : activePage === 'quotations'
                      ? 'Manage customer quotations and supplier tariff visibility.'
                      : activePage === 'master-data'
                        ? 'Manage shared reference data for logistics operations and finance.'
                        : `A shared workspace for ${activeItem?.label.toLowerCase()}, connected through one Job No.`}
              </p>
            </div>
          </div>

          {activePage === 'dashboard' ? (
            <DashboardHome onNavigate={navigateTo} onOpenJob={openJob} onOpenShipment={openShipment} />
          ) : activePage === 'quotations' ? (
            <QuotationsWorkspace dataset={appDataset} />
          ) : activePage === 'jobs' ? (
            <JobsWorkspace
              dataset={appDataset}
              selectedJobNo={selectedJobNo}
              onOpenJob={openJob}
              onBackToList={() => setSelectedJobNo(null)}
              onCreateJob={handleCreateJob}
              onNavigate={navigateTo}
              onOpenShipment={openShipment}
              onOpenInvoice={openInvoice}
              closedJobs={closedJobs}
              onCloseJob={(jobNo, exception) =>
                setClosedJobs((current) => ({ ...current, [jobNo]: exception ?? { reason: '', approvedBy: '' } }))
              }
              onReopenJob={(jobNo) =>
                setClosedJobs((current) => {
                  const next = { ...current }
                  delete next[jobNo]
                  return next
                })
              }
            />
          ) : activePage === 'haulage' ? (
            <HaulageWorkspace onOpenJob={openJob} />
          ) : activePage === 'forwarding' ? (
            <ForwardingWorkspace
              dataset={appDataset}
              selectedShipmentId={selectedShipmentId ?? undefined}
              onSelectShipment={setSelectedShipmentId}
              onOpenJob={openJob}
              onOpenInvoice={openInvoice}
              onOpenJobCosting={(jobNo) => {
                setSelectedJobNo(jobNo)
                navigateTo('job-costing')
              }}
              onUpdateMilestone={handleUpdateMilestone}
            />
          ) : activePage === 'customs' ? (
            <CustomsWorkspace
              dataset={appDataset}
              onOpenJob={openJob}
              onUpdateMilestone={handleUpdateMilestone}
              onUpdateCustomsStep={handleUpdateCustomsStep}
            />
          ) : activePage === 'warehouse' ? (
            <WarehouseWorkspace
              dataset={appDataset}
              onOpenJob={openJob}
              onUpdateActivity={handleUpdateWarehouseActivity}
              onAddStockAdjustment={handleAddStockAdjustment}
              onCreateStorageCharge={handleCreateStorageCharge}
              onUpdateStorageCharge={handleUpdateStorageCharge}
            />
          ) : activePage === 'documents' ? (
            <DocumentsWorkspace
              dataset={appDataset}
              initialJobNo={selectedJobNo}
              onOpenJob={openJob}
              onSaveDocument={handleSaveDocument}
              onClassifyDocument={handleClassifyDocument}
            />
          ) : activePage === 'customer-portal' ? (
            <CustomerPortal
              dataset={appDataset}
              onExitToStaffWorkspace={() => navigateTo('dashboard')}
            />
          ) : activePage === 'alerts' ? (
            <AlertsWorkspace
              dataset={appDataset}
              onUpdateAlert={handleUpdateAlert}
              onOpenJob={openJob}
              onNavigate={navigateTo}
            />
          ) : activePage === 'billing' || activePage === 'job-costing' ? (
            <FinanceWorkspace
              dataset={appDataset}
              jobCosting={activePage === 'job-costing'}
              financeView={financeView}
              onFinanceViewChange={setFinanceView}
              selectedInvoiceId={selectedInvoiceId ?? undefined}
              onOpenJob={openJob}
              onOpenShipment={openShipment}
              onAddCharge={handleAddFinanceCharge}
              onUpdateCharge={handleUpdateFinanceCharge}
              onCreateInvoice={handleCreateFinanceInvoice}
              onUpdateInvoice={handleUpdateFinanceInvoice}
              onUpdateSupplierCost={handleUpdateSupplierCost}
              onUpdatePaymentRequest={handleUpdatePaymentRequest}
              onUpdateVoucher={handleUpdatePaymentVoucher}
              onUpdateBankTransaction={handleUpdateBankTransaction}
            />
          ) : activePage === 'master-data' ? (
            <MasterDataWorkspace dataset={appDataset} onNavigate={navigateTo} />
          ) : (
            <WorkspacePlaceholder item={activeItem} onNavigate={navigateTo} />
          )}

          <footer className="page-footer">
            <span>SK Transworld Logistics · Malaysia</span>
            {/* <span>
              <span className="footer-dot" />
              Prototype · integrations not connected
            </span> */}
          </footer>
        </main>
      </div>
    </div>
  )
}

const jobTabs = [
  'Overview',
  'Forwarding',
  'Customs',
  'Haulage',
  'Warehouse',
  'Documents',
  'Charges & Costs',
  'Invoices',
  'Job Costing',
  'Activity / Audit',
] as const

type JobTab = (typeof jobTabs)[number]

type LinkedRecord = {
  id: string
  title: string
  detail: string
  status?: string
  target: PageId
  shipmentId?: string
  invoiceId?: string
}

function JobsWorkspace({
  dataset,
  selectedJobNo,
  onOpenJob,
  onBackToList,
  onCreateJob,
  onNavigate,
  onOpenShipment,
  onOpenInvoice,
  closedJobs,
  onCloseJob,
  onReopenJob,
}: {
  dataset: DemoDataset
  selectedJobNo: string | null
  onOpenJob: (jobNo: string) => void
  onBackToList: () => void
  onCreateJob: (job: Job) => void
  onNavigate: (page: PageId) => void
  onOpenShipment: (shipmentId: string) => void
  onOpenInvoice: (invoiceId: string) => void
  closedJobs: Record<string, { reason: string; approvedBy: string }>
  onCloseJob: (jobNo: string, exception?: { reason: string; approvedBy: string }) => void
  onReopenJob: (jobNo: string) => void
}) {
  const confirm = useConfirmation()
  const [filters, setFilters] = useState<JobFilters>(getDefaultJobFilters())
  const [createOpen, setCreateOpen] = useState(false)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<JobTab>('Overview')
  const [exceptionReason, setExceptionReason] = useState('')
  const [exceptionApprover, setExceptionApprover] = useState('')
  const [exceptionApproved, setExceptionApproved] = useState(false)
  const [form, setForm] = useState<JobCreateInput>({
    customerId: '',
    quotationId: '',
    description: '',
    serviceDepartments: [],
    owner: '',
    createdDate: dataset.metadata.asOfDate,
    eta: '',
  })

  const rows = getJobListRecords(dataset, filters)
  const selectedJob = selectedJobNo
    ? dataset.jobs.find((job) => job.jobNo === selectedJobNo)
    : undefined
  const selectedCustomer = selectedJob
    ? dataset.customers.find((customer) => customer.id === selectedJob.customerId)
    : undefined
  const selectedShipments = selectedJob
    ? dataset.shipments.filter((shipment) => shipment.jobNo === selectedJob.jobNo)
    : []
  const selectedContainers = selectedJob
    ? dataset.containers.filter((container) => container.jobNo === selectedJob.jobNo)
    : []
  const selectedTrips = selectedJob
    ? dataset.trips.filter((trip) => trip.jobNo === selectedJob.jobNo)
    : []
  const selectedDocuments = selectedJob
    ? dataset.documents.filter((document) => document.jobNo === selectedJob.jobNo)
    : []
  const selectedCharges = selectedJob
    ? dataset.charges.filter((charge) => charge.jobNo === selectedJob.jobNo)
    : []
  const selectedCosts = selectedJob
    ? dataset.supplierCosts.filter((cost) => cost.jobNo === selectedJob.jobNo)
    : []
  const selectedInvoices = selectedJob
    ? dataset.invoices.filter((invoice) => invoice.jobNo === selectedJob.jobNo)
    : []
  const selectedCustomsCases = selectedJob
    ? dataset.customsCases.filter((customsCase) => customsCase.jobNo === selectedJob.jobNo)
    : []
  const selectedReceipts = selectedJob
    ? dataset.warehouseReceipts.filter((receipt) => receipt.jobNo === selectedJob.jobNo)
    : []
  const selectedActivity = selectedJob
    ? dataset.activity.filter((event) => event.jobNo === selectedJob.jobNo)
    : []
  const selectedQuotation = form.quotationId
    ? dataset.quotations.find((quotation) => quotation.id === form.quotationId)
    : undefined
  const readiness = selectedJob
    ? getJobCloseReadiness(
      dataset,
      selectedJob.jobNo,
      exceptionApproved && exceptionReason.trim() && exceptionApprover.trim()
        ? { reason: exceptionReason, approvedBy: exceptionApprover }
        : undefined,
    )
    : undefined
  const exceptionForClosedJob = selectedJob ? closedJobs[selectedJob.jobNo] : undefined
  const currency = new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: dataset.metadata.currency,
    maximumFractionDigits: 2,
  })

  function formatDate(date: string | null): string {
    if (!date) return '—'
    return new Intl.DateTimeFormat('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }).format(
      new Date(`${date}T00:00:00`),
    )
  }

  function label(value: string): string {
    return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  }

  function toggleSort(sortBy: JobFilters['sortBy']) {
    setFilters((current) => ({
      ...current,
      sortBy,
      sortDirection:
        current.sortBy === sortBy && current.sortDirection === 'asc' ? 'desc' : 'asc',
    }))
  }

  function chooseQuotation(quotationId: string) {
    const quotation = dataset.quotations.find((record) => record.id === quotationId)
    if (!quotation) {
      setForm((current) => ({ ...current, quotationId: '' }))
      return
    }
    const departments = [...new Set(quotation.lines.map((line) => line.department))]
    setForm((current) => ({
      ...current,
      quotationId,
      customerId: quotation.customerId,
      description: quotation.lines.map((line) => line.description).join(' · '),
      serviceDepartments: departments,
    }))
  }

  function submitCreateJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateJobCreateInput(dataset, form)
    setFormErrors(errors)
    if (errors.length > 0) return

    let newJob: Job
    try {
      newJob = form.quotationId
        ? acceptQuotationAndCreateJob(dataset, form).job
        : createJobFromInput(dataset, form)
    } catch (error) {
      setFormErrors([error instanceof Error ? error.message : 'Unable to create the job.'])
      return
    }

    void confirm({
      title: form.quotationId ? 'Convert quotation to a job?' : 'Create this job?',
      message: form.quotationId
        ? `Create ${newJob.jobNo} from the selected quotation and mark that quotation accepted?`
        : `Create illustrative Job No. ${newJob.jobNo} for ${dataset.customers.find((customer) => customer.id === newJob.customerId)?.name ?? 'the selected customer'}?`,
      confirmLabel: form.quotationId ? 'Convert to job' : 'Create job',
      warningIcon: true,
      details: 'This creates a local demo record. Job numbering remains illustrative and Pending Business Clarification.',
    }, () => {
      onCreateJob(newJob)
      setActiveTab('Overview')
      setFormErrors([])
      setCreateOpen(false)
      setForm({
        customerId: '',
        quotationId: '',
        description: '',
        serviceDepartments: [],
        owner: '',
        createdDate: dataset.metadata.asOfDate,
        eta: '',
      })
    })
  }

  function toggleDepartment(department: Department) {
    setForm((current) => ({
      ...current,
      serviceDepartments: current.serviceDepartments.includes(department)
        ? current.serviceDepartments.filter((item) => item !== department)
        : [...current.serviceDepartments, department],
    }))
  }

  function recordList(records: LinkedRecord[], empty: string) {
    if (records.length === 0) return <p className="job-empty">{empty}</p>
    return (
      <div className="job-linked-list">
        {records.map((record) => (
          <button
            className="job-linked-record"
            key={record.id}
            type="button"
            onClick={() => {
              if (record.shipmentId) onOpenShipment(record.shipmentId)
              else if (record.invoiceId) onOpenInvoice(record.invoiceId)
              else onNavigate(record.target)
            }}
          >
            <span className="job-linked-record-copy">
              <strong>{record.title}</strong>
              <span>{record.detail}</span>
            </span>
            {record.status && <span className="job-record-status">{label(record.status)}</span>}
            <Icon name="arrow" size={15} />
          </button>
        ))}
      </div>
    )
  }

  function jobTabContents() {
    if (!selectedJob) return null
    const profit = calculateJobProfitability(dataset, selectedJob.jobNo)
    const commonShipmentRecords = selectedShipments.map((shipment) => ({
      id: shipment.id,
      title: `${shipment.mode} ${label(shipment.movement)} · ${shipment.vessel}`,
      detail: `${shipment.houseBillNo ?? 'No HBL'} / ${shipment.masterBillNo ?? 'No MBL'} · ETD ${formatDate(shipment.etd)} · ETA ${formatDate(shipment.eta)} · ${shipment.trackingSource}`,
      status: shipment.trackingSource,
      target: 'forwarding' as const,
      shipmentId: shipment.id,
    }))

    switch (activeTab) {
      case 'Forwarding':
        return (
          <>
            <h3>Shipments & containers</h3>
            {recordList(commonShipmentRecords, 'No forwarding shipment is linked to this job.')}
            {recordList(
              selectedContainers.map((container) => ({
                id: container.id,
                title: `${container.containerNo} · ${container.sizeType}`,
                detail: `${container.grossWeightKg.toLocaleString()} kg · ${container.volumeCBM} CBM · free time ${formatDate(container.freeTimeExpiryDate)}`,
                status: container.status,
                target: 'forwarding',
              })),
              'No containers are linked to this job.',
            )}
            {recordList(
              dataset.milestones
                .filter((milestone) => milestone.jobNo === selectedJob.jobNo)
                .map((milestone) => ({
                  id: milestone.id,
                  title: milestone.title,
                  detail: `${label(milestone.department)} · ${milestone.source} · ${formatDate(milestone.occurredAt)}`,
                  status: milestone.status,
                  target: 'forwarding',
                })),
              'No shipment milestones are recorded.',
            )}
          </>
        )
      case 'Customs':
        return (
          <>
            <h3>Customs declarations & release</h3>
            {recordList(
              selectedCustomsCases.map((item) => ({
                id: item.id,
                title: `${item.declarationType} · ${item.containerNo}`,
                detail: `Duty ${currency.format(item.dutyRM)} · SST ${currency.format(item.sstRM)} · approval ${label(item.approvalStatus)} · EDO ${label(item.edoStatus)}`,
                status: item.declarationStatus,
                target: 'customs',
              })),
              'No customs case is linked to this job.',
            )}
          </>
        )
      case 'Haulage':
        return (
          <>
            <h3>Trips, fleet & POD</h3>
            {recordList(
              selectedTrips.map((trip) => {
                const truck = dataset.trucks.find((record) => record.id === trip.truckId)
                const driver = dataset.drivers.find((record) => record.id === trip.driverId)
                return {
                  id: trip.id,
                  title: `${trip.id} · ${trip.containerNo}`,
                  detail: `${trip.route} · ${truck?.registrationNo ?? 'Truck unassigned'} · ${driver?.name ?? 'Driver unassigned'} · GPS ${trip.gpsStatus}`,
                  status: trip.podStatus,
                  target: 'haulage' as const,
                }
              }),
              'No trip is linked to this job.',
            )}
            {recordList(
              dataset.tripMilestones
                .filter((milestone) => selectedTrips.some((trip) => trip.id === milestone.tripId))
                .map((milestone) => ({
                  id: milestone.id,
                  title: milestone.title,
                  detail: `Trip ${milestone.tripId} · ${formatDate(milestone.occurredAt)}`,
                  status: milestone.status,
                  target: 'haulage',
                })),
              'No trip milestones are recorded.',
            )}
          </>
        )
      case 'Warehouse':
        return (
          <>
            <h3>Warehouse receipts & stock</h3>
            {recordList(
              selectedReceipts.map((receipt) => ({
                id: receipt.id,
                title: `${receipt.grnNo} · ${receipt.containerNo}`,
                detail: `${receipt.cartons} cartons · ${receipt.pallets} pallets · ${receipt.volumeCBM} CBM · ${receipt.location}`,
                status: receipt.status,
                target: 'warehouse',
              })),
              'No warehouse receipt is linked to this job.',
            )}
            {recordList(
              dataset.stockMovements
                .filter((movement) => movement.jobNo === selectedJob.jobNo)
                .map((movement) => ({
                  id: movement.id,
                  title: `${movement.sku} · ${movement.direction} ${movement.quantity} ${movement.unit}`,
                  detail: `${movement.description} · ${formatDate(movement.occurredAt)}${movement.reason ? ` · ${movement.reason}` : ''}`,
                  target: 'warehouse',
                })),
              'No stock movements are recorded.',
            )}
            {recordList(
              dataset.warehouseActivities
                .filter((activity) => activity.jobNo === selectedJob.jobNo)
                .map((activity) => ({
                  id: activity.id,
                  title: label(activity.type),
                  detail: `Scheduled ${formatDate(activity.scheduledDate)}`,
                  status: activity.status,
                  target: 'warehouse',
                })),
              'No warehouse activities are recorded.',
            )}
          </>
        )
      case 'Documents':
        return (
          <>
            <div className="job-detail-section-heading">
              <div><span className="section-eyebrow">JOB FOLDER</span><h3>Documents & required-document gaps</h3></div>
              <button className="button button--secondary" type="button" onClick={() => onNavigate('documents')}>Open searchable folder</button>
            </div>
            {recordList(
              selectedDocuments.map((document) => ({
                id: document.id,
                title: `${label(document.type)}${document.fileName ? ` · ${document.fileName}` : ''}`,
                detail: `${document.access} · v${document.version} · ${document.uploadedBy ?? 'No uploader'} · ${formatDate(document.uploadedAt)}`,
                status: document.status,
                target: 'documents',
              })),
              'No documents are linked to this job.',
            )}
          </>
        )
      case 'Charges & Costs':
        return (
          <>
            <h3>Performed charges & supplier costs</h3>
            {recordList(
              selectedCharges.map((charge) => ({
                id: charge.id,
                title: `${charge.description} · ${currency.format(charge.amountRM)}`,
                detail: `${label(charge.department)} · source ${charge.sourceEventId} · ${charge.performed ? 'performed' : 'not performed'} · illustrative rate`,
                status: charge.status,
                target: 'billing',
              })),
              'No operational charge is linked to this job.',
            )}
            {recordList(
              selectedCosts.map((cost) => ({
                id: cost.id,
                title: `${cost.description} · ${currency.format(cost.amountRM)}`,
                detail: `${label(cost.department)} · ${label(cost.costType)} · ${label(cost.paymentStatus)}`,
                status: cost.approvalStatus,
                target: 'billing',
              })),
              'No supplier cost is linked to this job.',
            )}
          </>
        )
      case 'Invoices':
        return (
          <>
            <h3>Customer invoices & payment status</h3>
            {recordList(
              selectedInvoices.map((invoice) => ({
                id: invoice.id,
                title: invoice.id,
                detail: `${formatDate(invoice.invoiceDate)} · due ${formatDate(invoice.dueDate)} · ${currency.format(calculateInvoiceTotals(dataset, invoice.id).subtotalRM)} · e-invoice ${label(invoice.eInvoiceStatus)}`,
                status: invoice.status,
                target: 'billing',
                invoiceId: invoice.id,
              })),
              'No customer invoice is linked to this job.',
            )}
          </>
        )
      case 'Job Costing':
        return (
          <>
            <h3>Revenue, costs & gross profit</h3>
            <div className="job-costing-grid">
              <JobValue label="Performed revenue" value={currency.format(profit.revenueRM)} />
              <JobValue label="Actual supplier costs" value={currency.format(profit.actualCostsRM)} />
              <JobValue label="Estimated costs" value={currency.format(profit.estimatedCostsRM)} />
              <JobValue label="Actual gross profit" value={currency.format(profit.actualMarginRM)} />
              <JobValue label="Projected margin" value={currency.format(profit.projectedMarginRM)} />
            </div>
            <p className="job-pending-note">Rates and accounting treatment are illustrative and remain Pending Business Clarification.</p>
          </>
        )
      case 'Activity / Audit':
        return (
          <>
            <h3>Job activity history</h3>
            {recordList(
              selectedActivity.map((event) => ({
                id: event.id,
                title: event.description,
                detail: `${event.actor} · ${label(event.department)} · ${formatDate(event.occurredAt)}`,
                target: 'jobs',
              })),
              'No activity is recorded for this job.',
            )}
          </>
        )
      default: {
        const quote = dataset.quotations.find((quotation) => quotation.id === selectedJob.quotationId)
        const closeReadiness = readiness
        return (
          <>
            <div className="job-overview-grid">
              <JobValue label="Customer" value={selectedCustomer?.name ?? 'Unknown customer'} />
              <JobValue label="Job created" value={formatDate(selectedJob.createdDate)} />
              <JobValue label="ETA" value={formatDate(selectedJob.eta)} />
              <JobValue label="Owner" value={selectedJob.owner} />
              <JobValue label="Service departments" value={selectedJob.serviceDepartments.map(label).join(', ')} />
              <JobValue label="Quotation" value={quote?.id ?? 'No linked quotation'} />
            </div>
            <div className="job-status-pair">
              <span><small>Operational status</small><strong>{label(selectedJob.operationalStatus)}</strong></span>
              <span><small>Financial / billing status</small><strong>{label(selectedJob.financialStatus)}</strong></span>
            </div>
            {selectedJob.description && <p className="job-description">{selectedJob.description}</p>}
            <div className="logistics-animation-callout job-progress-illustration">
              <LogisticsAnimation name="truckMoving" width={126} height={66} />
              <span className="logistics-animation-copy"><strong>Illustrative transport visual</strong><small>Demo artwork only · not live GPS or job progress</small></span>
            </div>
            {closeReadiness && (
              <section className="job-close-panel" aria-labelledby="job-close-title">
                <div className="job-detail-section-heading">
                  <div><span className="section-eyebrow">CLOSE-OUT CHECK</span><h3 id="job-close-title">Job close blockers</h3></div>
                  {closedJobs[selectedJob.jobNo] ? <span className="job-record-status">Closed · demo</span> : null}
                </div>
                {closeReadiness.blockers.length > 0 ? (
                  <ul className="job-blocker-list">{closeReadiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
                ) : <p className="job-empty">No operational, billing or document blockers remain.</p>}
                {closeReadiness.unbilledCharges.length > 0 &&
                  recordList(closeReadiness.unbilledCharges.map((charge) => ({
                    id: charge.id,
                    title: `${charge.description} · ${currency.format(charge.amountRM)}`,
                    detail: `Source ${charge.sourceEventId}`,
                    status: charge.status,
                    target: 'billing',
                  })), 'No performed unbilled charges.')}
                {closeReadiness.missingDocuments.length > 0 &&
                  recordList(closeReadiness.missingDocuments.map((document) => ({
                    id: document.id,
                    title: label(document.type),
                    detail: `Missing document · ${document.containerNo ?? selectedJob.jobNo}`,
                    status: 'missing',
                    target: 'documents',
                  })), 'No required documents are missing.')}
                {closeReadiness.unpaidInvoices.length > 0 &&
                  recordList(closeReadiness.unpaidInvoices.map((invoice) => ({
                    id: invoice.id,
                    title: invoice.id,
                    detail: `Due ${formatDate(invoice.dueDate)} · ${currency.format(calculateInvoiceTotals(dataset, invoice.id).outstandingRM)}`,
                    status: invoice.status,
                    target: 'billing',
                    invoiceId: invoice.id,
                  })), 'No unpaid customer invoices.')}
                {!closedJobs[selectedJob.jobNo] && closeReadiness.blockers.some((blocker) => blocker !== 'Operational work is not marked delivered.') && (
                  <div className="job-exception-fields">
                    <label>Approved exception reason<input value={exceptionReason} onChange={(event) => setExceptionReason(event.target.value)} placeholder="Enter documented exception reason" /></label>
                    <label>Approved by<input value={exceptionApprover} onChange={(event) => setExceptionApprover(event.target.value)} placeholder="Approver name" /></label>
                    <label className="job-checkbox-label"><input type="checkbox" checked={exceptionApproved} onChange={(event) => setExceptionApproved(event.target.checked)} />Approved exception recorded for this demo</label>
                  </div>
                )}
                <div className="job-close-actions">
                  {closedJobs[selectedJob.jobNo] ? (
                    <button className="button button--secondary" type="button" onClick={() => void confirm({
                      title: 'Reopen this job?',
                      message: `Reopen ${selectedJob.jobNo} and return it to the active job register?`,
                      confirmLabel: 'Reopen job',
                      warningIcon: true,
                    }, () => onReopenJob(selectedJob.jobNo))}>Reopen job (demo)</button>
                  ) : (
                    <button
                      className="button button--primary"
                      type="button"
                      disabled={!closeReadiness.canClose}
                      onClick={() => void confirm({
                        title: 'Close this job?',
                        message: `Close ${selectedJob.jobNo} after reviewing the displayed close-out readiness?`,
                        confirmLabel: 'Close job',
                        warningIcon: true,
                        variant: 'warning',
                        details: 'Job closure is a local demo action. Operational and financial statuses remain separate.',
                      }, () => onCloseJob(
                        selectedJob.jobNo,
                        exceptionApproved && exceptionReason.trim() && exceptionApprover.trim()
                          ? { reason: exceptionReason.trim(), approvedBy: exceptionApprover.trim() }
                          : undefined,
                      ))}
                    >
                      Close job (demo)
                    </button>
                  )}
                  {!closeReadiness.canClose && !closedJobs[selectedJob.jobNo] && <span>Complete required delivery or record an approved exception for billing/document blockers.</span>}
                </div>
                {exceptionForClosedJob?.reason && <p className="job-pending-note">Demo exception: {exceptionForClosedJob.reason} · approved by {exceptionForClosedJob.approvedBy}</p>}
              </section>
            )}
          </>
        )
      }
    }
  }

  if (selectedJobNo && selectedJob) {
    return (
      <div className="job-detail-layout">
        <div className="job-detail-toolbar">
          <button className="dashboard-text-link" type="button" onClick={onBackToList}>← All jobs</button>
          {/* <span className="status-badge status-badge--blue">{dataset.metadata.label}</span> */}
        </div>
        <section className="job-detail-card">
          <div className="job-identity-row">
            <div><span className="section-eyebrow">SHARED JOB RECORD</span><h2>{selectedJob.jobNo}</h2><p>{selectedCustomer?.name} · {selectedJob.description}</p></div>
            <button className="button button--secondary" type="button" onClick={() => onNavigate('jobs')}>Job No. stays linked</button>
          </div>
          <div className="job-status-pair">
            <span><small>Operational</small><strong>{label(selectedJob.operationalStatus)}</strong></span>
            <span><small>Financial / billing</small><strong>{label(selectedJob.financialStatus)}</strong></span>
          </div>
          <div className="job-tabs" role="tablist" aria-label="Job detail sections">
            {jobTabs.map((tab) => (
              <button
                aria-selected={activeTab === tab}
                className={`job-tab${activeTab === tab ? ' job-tab--active' : ''}`}
                id={`job-tab-${tab.toLowerCase().replaceAll(/[^a-z]+/g, '-')}`}
                key={tab}
                onClick={() => setActiveTab(tab)}
                role="tab"
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>
          <section
            className="job-tab-panel"
            role="tabpanel"
            aria-labelledby={`job-tab-${activeTab.toLowerCase().replaceAll(/[^a-z]+/g, '-')}`}
          >
            {jobTabContents()}
          </section>
        </section>
        <div className="job-cross-module-links">
          <span>Open linked module:</span>
          {([
            ['Forwarding', 'forwarding'],
            ['Customs', 'customs'],
            ['Haulage', 'haulage'],
            ['Warehouse', 'warehouse'],
            ['Documents', 'documents'],
            ['Billing', 'billing'],
            ['Job Costing', 'job-costing'],
          ] as const).map(([name, page]) => (
            <button key={page} type="button" onClick={() => onNavigate(page)}>{name}</button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="jobs-workspace">
      <div className="jobs-toolbar">
        <div></div>
        <div className="jobs-toolbar-actions">
          {/* <span className="status-badge status-badge--blue">{dataset.metadata.label}</span> */}
          <button className="button button--primary" type="button" onClick={() => setCreateOpen(true)}>Create job <Icon name="arrow" size={16} /></button>
        </div>
      </div>
      <section className="job-filter-card" aria-label="Job filters">
        <label className="job-search-label">Search jobs, customer, container, BL, vessel or status<input aria-label="Search jobs" type="search" value={filters.search} placeholder="e.g. SKI2610028, MSCU…, Selat Horizon" onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} /></label>
        <label>Customer<select value={filters.customerId} onChange={(event) => setFilters((current) => ({ ...current, customerId: event.target.value }))}><option value="">All customers</option>{dataset.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
        <label>Service<select value={filters.department} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value as Department | '' }))}><option value="">All services</option>{(['forwarding', 'customs', 'haulage', 'warehouse'] as Department[]).map((department) => <option key={department} value={department}>{label(department)}</option>)}</select></label>
        <label>Operational status<select value={filters.operationalStatus} onChange={(event) => setFilters((current) => ({ ...current, operationalStatus: event.target.value as JobFilters['operationalStatus'] }))}><option value="">All statuses</option>{(['awaiting_customs', 'in_transit', 'in_warehouse', 'delivered'] as const).map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
        <label>Billing status<select value={filters.financialStatus} onChange={(event) => setFilters((current) => ({ ...current, financialStatus: event.target.value as JobFilters['financialStatus'] }))}><option value="">All billing states</option>{(['unbilled', 'partially_billed', 'invoiced', 'paid'] as const).map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
        <label>Created from<input aria-label="Created from" type="date" value={filters.fromDate} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))} /></label>
        <label>Created to<input aria-label="Created to" type="date" value={filters.toDate} onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))} /></label>
        <button className="dashboard-reset" type="button" onClick={() => setFilters(getDefaultJobFilters())}>Clear filters</button>
      </section>
      <section className="job-table-card" aria-label="Jobs and dockets">
        <div className="job-table-summary">{rows.length} {rows.length === 1 ? 'job' : 'jobs'} · values linked by shared Job No.</div>
        {rows.length > 0 ? (
          <div className="job-table-scroll"><table className="job-table"><thead><tr>
            <th><button onClick={() => toggleSort('jobNo')}>Job No. ↕</button></th>
            <th><button onClick={() => toggleSort('customer')}>Customer ↕</button></th>
            <th><button onClick={() => toggleSort('service')}>Service / type ↕</button></th>
            <th>Containers</th>
            <th><button onClick={() => toggleSort('eta')}>ETA / ETD ↕</button></th>
            <th><button onClick={() => toggleSort('owner')}>Owner ↕</button></th>
            <th><button onClick={() => toggleSort('operationalStatus')}>Operational ↕</button></th>
            <th><button onClick={() => toggleSort('financialStatus')}>Billing ↕</button></th>
            <th>Documents</th>
          </tr></thead><tbody>
              {rows.map((row) => (
                <tr key={row.job.jobNo}>
                  <td><button className="job-number-link" type="button" onClick={() => { setActiveTab('Overview'); onOpenJob(row.job.jobNo) }}>{row.job.jobNo}</button><span className="job-table-secondary">{row.job.description}</span></td>
                  <td>{row.customerName}</td>
                  <td>{row.job.serviceDepartments.map(label).join(', ')}<span className="job-table-secondary">{row.shipmentTypes.join(', ') || 'No shipment'}</span></td>
                  <td>{row.containerNumbers.length ? row.containerNumbers.map((containerNo) => <button className="job-container-link" type="button" key={containerNo} onClick={() => { setActiveTab('Overview'); onOpenJob(row.job.jobNo) }}>{containerNo}</button>) : '—'}</td>
                  <td><span>ETA {formatDate(row.eta)}</span><span className="job-table-secondary">ETD {formatDate(row.etd)}</span></td>
                  <td>{row.job.owner}</td>
                  <td><span className={`dashboard-status dashboard-status--${row.job.operationalStatus}`}>{label(row.job.operationalStatus)}</span></td>
                  <td><span className={`dashboard-status dashboard-status--${row.job.financialStatus}`}>{label(row.job.financialStatus)}</span></td>
                  <td>{row.hasMissingDocuments ? <button className="missing-document-badge" type="button" onClick={() => { onOpenJob(row.job.jobNo); setActiveTab('Documents') }}>Missing</button> : <span className="job-document-ok">No recorded gaps</span>}</td>
                </tr>
              ))}
            </tbody></table></div>
        ) : <p className="job-empty job-empty--large">No jobs match your search and filters.</p>}
      </section>

      {createOpen && (
        <div className="job-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false) }}>
          <section aria-labelledby="create-job-title" aria-modal="true" className="job-create-modal" role="dialog">
            <div className="job-create-heading"><div><span className="section-eyebrow">ILLUSTRATIVE LOCAL RECORD</span><h2 id="create-job-title">Create job / docket</h2></div><button className="icon-button" aria-label="Close create job" type="button" onClick={() => setCreateOpen(false)}><Icon name="close" size={18} /></button></div>
            <p className="job-pending-note">Job numbering and workflow rules are illustrative and Pending Business Clarification. No server save occurs.</p>
            <form className="job-create-form" onSubmit={submitCreateJob} noValidate>
              <label>Quotation (optional)<select value={form.quotationId} onChange={(event) => chooseQuotation(event.target.value)}><option value="">No quotation</option>{dataset.quotations.filter((quotation) => !quotation.linkedJobNo && quotation.status !== 'expired' && quotation.validUntil >= form.createdDate).map((quotation) => { const customer = dataset.customers.find((record) => record.id === quotation.customerId); return <option key={quotation.id} value={quotation.id}>{quotation.id} · {customer?.name} · {label(quotation.status)}</option> })}</select></label>
              <label>Customer<select required value={form.customerId} onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value, quotationId: '' }))}><option value="">Select customer</option>{dataset.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
              <label className="job-create-full">Job description<input required value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Shipment / service description" /></label>
              <fieldset className="job-department-select"><legend>Service departments</legend>{(['forwarding', 'customs', 'haulage', 'warehouse'] as Department[]).map((department) => <label key={department}><input type="checkbox" checked={form.serviceDepartments.includes(department)} onChange={() => toggleDepartment(department)} />{label(department)}</label>)}</fieldset>
              <label>Job owner<input required value={form.owner} onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))} placeholder="Name" /></label>
              <label>Job date<input required type="date" value={form.createdDate} onChange={(event) => setForm((current) => ({ ...current, createdDate: event.target.value }))} /></label>
              <label>ETA (optional)<input type="date" value={form.eta} onChange={(event) => setForm((current) => ({ ...current, eta: event.target.value }))} /></label>
              {selectedQuotation && <div className="job-quotation-preview job-create-full"><strong>Quotation rates carried forward for reference</strong>{selectedQuotation.lines.map((line) => <span key={line.id}>{label(line.department)} · {line.description} · {currency.format(line.rateRM)} / {line.unit}</span>)}</div>}
              {formErrors.length > 0 && <ul className="job-form-errors job-create-full" role="alert">{formErrors.map((error) => <li key={error}>{error}</li>)}</ul>}
              <div className="job-create-actions job-create-full"><button className="button button--secondary" type="button" onClick={() => setCreateOpen(false)}>Cancel</button><button className="button button--primary" type="submit">Create illustrative job</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

function JobValue({ label, value }: { label: string; value: string }) {
  return <div className="job-value"><span>{label}</span><strong>{value}</strong></div>
}

function DashboardHome({
  onNavigate,
  onOpenJob,
  onOpenShipment,
}: {
  onNavigate: (page: PageId) => void
  onOpenJob: (jobNo: string) => void
  onOpenShipment: (shipmentId: string) => void
}) {
  const defaultFilters = getDefaultDashboardFilters(DEMO_DATA)
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters)
  const metrics = calculateDashboardMetrics(DEMO_DATA, filters)
  const currency = new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: DEMO_DATA.metadata.currency,
    maximumFractionDigits: 0,
  })
  const dateLabel = (date: string | null) =>
    date
      ? new Intl.DateTimeFormat('en-MY', { day: '2-digit', month: 'short' }).format(
        new Date(`${date}T00:00:00`),
      )
      : '—'
  const statusLabel = (status: string) =>
    status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  const maxDepartmentRevenue = Math.max(
    ...metrics.departmentRevenue.map((department) => department.revenueRM),
    1,
  )

  function updateFilters(update: Partial<DashboardFilters>) {
    setFilters((current) => ({ ...current, ...update }))
  }

  const operationalKpis = [
    { label: 'Deliveries today', value: metrics.deliveriesToday, detail: 'Completed trips', page: 'haulage' as const },
    { label: 'Containers arriving', value: metrics.containersArriving, detail: 'ETA in selected dates', page: 'forwarding' as const },
    { label: 'Customs pending', value: metrics.customsPending, detail: 'Open declaration / approval', page: 'customs' as const },
    { label: 'EDO pending', value: metrics.edoPending, detail: 'Release not completed', page: 'customs' as const },
    { label: 'Warehouse deliveries', value: metrics.warehouseDeliveries, detail: 'Planned in selected dates', page: 'warehouse' as const },
    { label: 'Trucks required', value: metrics.trucksRequired, detail: 'Planned / active trips', page: 'haulage' as const },
  ]
  const financeKpis = [
    { label: "Today's invoiced revenue", value: currency.format(metrics.revenueTodayRM), detail: `Invoice date ${dateLabel(DEMO_DATA.metadata.asOfDate)}`, page: 'billing' as const },
    { label: 'Month-to-date revenue', value: currency.format(metrics.revenueMonthToDateRM), detail: 'Customer invoice value', page: 'billing' as const },
    { label: 'Customer outstanding', value: currency.format(metrics.customerOutstandingRM), detail: 'Unpaid invoice balance', page: 'billing' as const },
    { label: 'Supplier payable', value: currency.format(metrics.supplierPayableRM), detail: 'Approved actual costs · unpaid', page: 'billing' as const },
    { label: 'Job gross profitability', value: currency.format(metrics.jobProfitabilityRM), detail: 'Actual margin · jobs created in range', page: 'job-costing' as const },
  ]

  return (
    <div className="dashboard-layout executive-dashboard">
      <section className="dashboard-filter-panel" aria-label="Dashboard filters">
        <div>
          <span className="section-eyebrow">EXECUTIVE OVERVIEW</span>
          <h2>Operations and finance at a glance</h2>
          <p>
            Shared Job No. records · Snapshot {dateLabel(DEMO_DATA.metadata.asOfDate)}
          </p>
        </div>
        <div className="dashboard-filters">
          <label>
            From
            <input
              aria-label="Filter from date"
              type="date"
              value={filters.fromDate}
              max={filters.toDate}
              onChange={(event) => {
                if (event.target.value) updateFilters({ fromDate: event.target.value })
              }}
            />
          </label>
          <label>
            To
            <input
              aria-label="Filter to date"
              type="date"
              value={filters.toDate}
              min={filters.fromDate}
              onChange={(event) => {
                if (event.target.value) updateFilters({ toDate: event.target.value })
              }}
            />
          </label>
          <label>
            Customer
            <select
              aria-label="Filter by customer"
              value={filters.customerId}
              onChange={(event) => updateFilters({ customerId: event.target.value })}
            >
              <option value="">All customers</option>
              {DEMO_DATA.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </label>
          <button
            className="dashboard-reset"
            type="button"
            onClick={() => setFilters(defaultFilters)}
          >
            Reset
          </button>
        </div>
      </section>

      <section aria-labelledby="operations-kpi-title">
        <div className="dashboard-section-heading">
          <div>
            <span className="section-eyebrow">DERIVED FROM DEMO RECORDS</span>
            <h2 id="operations-kpi-title">Operational pulse</h2>
          </div>
          <span className="dashboard-caption">Period-based on selected dates</span>
        </div>
        <div className="dashboard-kpi-grid dashboard-kpi-grid--six">
          {operationalKpis.map((kpi) => (
            <button
              className="dashboard-kpi"
              key={kpi.label}
              type="button"
              onClick={() => onNavigate(kpi.page)}
            >
              <span className="dashboard-kpi-label">{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <span className="dashboard-kpi-detail">{kpi.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="finance-kpi-title">
        <div className="dashboard-section-heading">
          <div>
            <span className="section-eyebrow">INVOICED AND APPROVED RECORDS</span>
            <h2 id="finance-kpi-title">Financial snapshot</h2>
          </div>
          <span className="dashboard-caption">RM · illustrative values</span>
        </div>
        <div className="dashboard-kpi-grid dashboard-kpi-grid--five">
          {financeKpis.map((kpi) => (
            <button
              className="dashboard-kpi dashboard-kpi--finance"
              key={kpi.label}
              type="button"
              onClick={() => onNavigate(kpi.page)}
            >
              <span className="dashboard-kpi-label">{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <span className="dashboard-kpi-detail">{kpi.detail}</span>
            </button>
          ))}
        </div>
      </section>

      {/* <section className="logistics-animation-callout dashboard-logistics-illustration" aria-label="Illustrative logistics activity">
        <div className="logistics-animation-pair">
          <LogisticsAnimation name="truckMoving" width={150} height={72} />
        </div>
        <span className="logistics-animation-copy"><strong>Logistics activity · illustrative</strong><small>Vehicle and cargo visuals are not live tracking or operational status indicators.</small></span>
          <LogisticsAnimation name="containerShipping" width={110} height={72} />

      </section> */}

      <div className="dashboard-two-column">
        <section className="dashboard-card" aria-labelledby="department-title">
          <div className="dashboard-section-heading">
            <div>
              <span className="section-eyebrow">INVOICED CHARGES</span>
              <h2 id="department-title">Department revenue</h2>
            </div>
            <button className="dashboard-text-link" type="button" onClick={() => onNavigate('job-costing')}>
              Reports <Icon name="arrow" size={14} />
            </button>
          </div>
          <div className="department-bars">
            {metrics.departmentRevenue.map((department) => (
              <div className="department-bar-row" key={department.department}>
                <div className="department-bar-meta">
                  <span>{statusLabel(department.department)}</span>
                  <strong>{currency.format(department.revenueRM)}</strong>
                </div>
                <div className="department-bar-track">
                  <span style={{ width: `${(department.revenueRM / maxDepartmentRevenue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-card dashboard-quick-actions" aria-labelledby="quick-actions-title">
          <div className="dashboard-section-heading">
            <div>
              <span className="section-eyebrow">WORKSPACE SHORTCUTS</span>
              <h2 id="quick-actions-title">Quick actions</h2>
            </div>
          </div>
          <div className="dashboard-action-grid">
            {([
              ['Create / view jobs', 'jobs', 'jobs'],
              ['Review customs', 'customs', 'customs'],
              ['Plan haulage', 'truck', 'haulage'],
              ['Open finance', 'billing', 'billing'],
            ] as const).map(([label, icon, page]) => (
              <button className="dashboard-action" type="button" key={page} onClick={() => onNavigate(page)}>
                <Icon name={icon} size={17} />
                <span>{label}</span>
                <Icon name="arrow" size={14} />
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="dashboard-card dashboard-table-card" aria-labelledby="shipment-table-title">
        <div className="dashboard-section-heading dashboard-table-heading">
          <div>
            <span className="section-eyebrow">SHARED JOB + SHIPMENT RECORDS</span>
            <h2 id="shipment-table-title">Shipments and milestones</h2>
          </div>
          <button className="dashboard-text-link" type="button" onClick={() => onNavigate('jobs')}>
            All jobs <Icon name="arrow" size={14} />
          </button>
        </div>
        {metrics.shipmentRows.length > 0 ? (
          <div className="dashboard-table-scroll">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Shipment ID</th>
                  <th>Job No. / Customer</th>
                  <th>Container</th>
                  <th>Latest milestone</th>
                  <th>ETA / ETD</th>
                  <th>Owner</th>
                  <th>Operational</th>
                  <th>Billing</th>
                </tr>
              </thead>
              <tbody>
                {metrics.shipmentRows.map((row) => (
                  <tr key={row.containerNo}>
                    <td>
                      <button className="dashboard-record-link" type="button" onClick={() => onOpenShipment(row.shipmentId)}>
                        {row.shipmentId}
                      </button>
                    </td>
                    <td>
                      <button className="dashboard-record-link" type="button" onClick={() => onOpenJob(row.jobNo)}>
                        {row.jobNo}
                      </button>
                      <span className="dashboard-table-secondary">{row.customerName}</span>
                    </td>
                    <td>{row.containerNo}</td>
                    <td>{row.milestone}</td>
                    <td>
                      <span>ETA {dateLabel(row.eta)}</span>
                      <span className="dashboard-table-secondary">ETD {dateLabel(row.etd)}</span>
                    </td>
                    <td>{row.owner}</td>
                    <td><span className={`dashboard-status dashboard-status--${row.operationalStatus}`}>{statusLabel(row.operationalStatus)}</span></td>
                    <td><span className={`dashboard-status dashboard-status--${row.financialStatus}`}>{statusLabel(row.financialStatus)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="dashboard-empty">No shipment records match these filters.</p>
        )}
      </section>

      <div className="dashboard-two-column dashboard-two-column--bottom">
        <section className="dashboard-card" aria-labelledby="alerts-title">
          <div className="dashboard-section-heading">
            <div>
              <span className="section-eyebrow">EXCEPTIONS TO REVIEW</span>
              <h2 id="alerts-title">Operational and finance alerts</h2>
            </div>
            <button className="dashboard-text-link" type="button" onClick={() => onNavigate('alerts')}>
              Alerts <Icon name="arrow" size={14} />
            </button>
          </div>
          {metrics.alerts.length > 0 ? (
            <ul className="dashboard-list">
              {metrics.alerts.map((alert) => (
                <li key={alert.id}>
                  <button className="dashboard-list-link" type="button" onClick={() => onNavigate(alert.type === 'overdue_payment' ? 'billing' : alert.type === 'vehicle_compliance' ? 'haulage' : alert.type === 'long_stay_cargo' ? 'warehouse' : alert.type === 'missing_document' ? 'documents' : 'customs')}>
                    <span className={`dashboard-severity dashboard-severity--${alert.severity}`} />
                    <span className="dashboard-list-copy">
                      <strong>{alert.title}</strong>
                      <span>{alert.jobNo ?? alert.truckId} · {alert.owner} · Due {dateLabel(alert.dueDate)}</span>
                    </span>
                    <Icon name="arrow" size={15} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-empty">No alerts match these filters.</p>
          )}
        </section>

        <section className="dashboard-card" aria-labelledby="activity-title">
          <div className="dashboard-section-heading">
            <div>
              <span className="section-eyebrow">SHARED JOB HISTORY</span>
              <h2 id="activity-title">Recent activity</h2>
            </div>
            <span className="dashboard-caption">Demo activity only</span>
          </div>
          {metrics.activity.length > 0 ? (
            <ul className="dashboard-list dashboard-activity-list">
              {metrics.activity.slice(0, 5).map((event) => (
                <li key={event.id}>
                  <button className="dashboard-list-link" type="button" onClick={() => onOpenJob(event.jobNo)}>
                    <span className="dashboard-activity-dot" />
                    <span className="dashboard-list-copy">
                      <strong>{event.description}</strong>
                      <span>{event.actor} · {event.jobNo} · {dateLabel(event.occurredAt)}</span>
                    </span>
                    <Icon name="arrow" size={15} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-empty">No recent activity matches these filters.</p>
          )}
        </section>
      </div>

      <p className="dashboard-demo-note">
        <span className="status-dot status-dot--amber" />
        Demo Data · Values are calculated from the shared illustrative records. Carrier tracking,
        GPS, customs status and external finance integrations are not connected.
      </p>
    </div>
  )
}

function WorkspacePlaceholder({
  item,
  onNavigate,
}: {
  item: NavigationItem | undefined
  onNavigate: (page: PageId) => void
}) {
  if (!item) {
    return null
  }

  return (
    <section className="module-placeholder">
      <span className="placeholder-icon">
        <Icon name={item.icon} size={24} />
      </span>
      <span className="section-eyebrow">WORKSPACE</span>
      <h2>{item.label}</h2>
      <p>
        This workspace is part of the shared application shell. Its operational
        screens and Job No.-linked records will be introduced in the corresponding
        implementation step.
      </p>
      <div className="placeholder-divider" />
      <div className="placeholder-meta">
        <span>
          <span className="status-dot status-dot--amber" />
          Demo / not connected
        </span>
        <span>Business rules remain subject to confirmation</span>
      </div>
      <button
        className="button button--secondary"
        type="button"
        onClick={() => onNavigate('dashboard')}
      >
        Return to dashboard <Icon name="arrow" size={16} />
      </button>
    </section>
  )
}

export default App
