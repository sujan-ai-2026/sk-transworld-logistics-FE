export type DateOnly = string
export type CurrencyCode = 'MYR'

export type Department =
  | 'forwarding'
  | 'customs'
  | 'haulage'
  | 'warehouse'

export type JobOperationalStatus =
  | 'awaiting_customs'
  | 'in_transit'
  | 'in_warehouse'
  | 'delivered'

export type JobFinancialStatus =
  | 'unbilled'
  | 'partially_billed'
  | 'invoiced'
  | 'paid'

export interface DemoMetadata {
  label: 'Demo Data'
  asOfDate: DateOnly
  currency: CurrencyCode
  jobNumberNote: 'Illustrative numbering — Pending Business Clarification'
  integrationNotice: 'External integrations are demo / unconfigured'
}

export interface Customer {
  id: string
  code: string
  name: string
  city: string
  country: 'Malaysia'
}

export interface Supplier {
  id: string
  code: string
  name: string
  service: 'carrier' | 'haulage' | 'terminal' | 'warehouse'
}

export interface QuotationLine {
  id: string
  department: Department
  description: string
  quantity: number
  unit: string
  rateRM: number
}

export interface Quotation {
  id: string
  customerId: string
  status: 'draft' | 'sent' | 'accepted' | 'expired'
  issuedDate: DateOnly
  validUntil: DateOnly
  currency: CurrencyCode
  lines: QuotationLine[]
  linkedJobNo?: string
  illustrative: true
}

export interface Job {
  jobNo: string
  customerId: string
  quotationId?: string
  description: string
  serviceDepartments: Department[]
  owner: string
  createdDate: DateOnly
  eta: DateOnly | null
  operationalStatus: JobOperationalStatus
  financialStatus: JobFinancialStatus
}

export interface Shipment {
  id: string
  jobNo: string
  mode: 'FCL' | 'LCL'
  movement: 'import' | 'export' | 'transshipment'
  carrierId: string
  coLoader?: string
  vessel: string
  voyage: string
  origin: string
  destination: string
  etd: DateOnly | null
  eta: DateOnly | null
  masterBillNo: string | null
  houseBillNo: string | null
  trackingSource: 'manual' | 'imported' | 'integration_verified'
  lastUpdated: DateOnly
}

export interface Container {
  id: string
  shipmentId: string
  jobNo: string
  containerNo: string
  sizeType: '20GP' | '40GP' | '40HC' | 'LCL'
  status: 'booked' | 'in_transit' | 'at_port' | 'in_warehouse' | 'delivered'
  eta: DateOnly | null
  freeTimeExpiryDate: DateOnly | null
  freeDaysAllowed: number | null
  grossWeightKg: number
  volumeCBM: number
}

export interface OperationalMilestone {
  id: string
  jobNo: string
  containerNo?: string
  department: Department
  title: string
  status: 'completed' | 'in_progress' | 'pending'
  occurredAt: DateOnly
  source: 'manual' | 'imported' | 'integration_verified'
}

export type CustomsDeclarationType =
  | 'K1'
  | 'K2'
  | 'K3'
  | 'K4'
  | 'K5'
  | 'K8'
  | 'ZB'
  | 'DG'
  | 'DSO'
  | 'IGM'

export type CustomsStepStatus = 'pending' | 'in_progress' | 'complete' | 'not_required'

export interface CustomsCase {
  id: string
  jobNo: string
  containerNo: string
  declarationType: CustomsDeclarationType
  declarationReference: string | null
  declarationStatus: CustomsStepStatus
  dutyRM: number
  sstRM: number
  paymentStatus: 'pending' | 'paid' | 'not_required'
  ssrStatus: CustomsStepStatus
  inspectionStatus: CustomsStepStatus
  approvalStatus: CustomsStepStatus
  edoStatus: CustomsStepStatus
  gatePassStatus: CustomsStepStatus
  updatedAt: DateOnly
}

export interface Truck {
  id: string
  registrationNo: string
  makeModel: string
  status: 'available' | 'on_trip' | 'maintenance'
  capacityKg: number
  capacityCBM: number
  roadTaxExpiry: DateOnly
  insuranceExpiry: DateOnly
}

export interface Trailer {
  id: string
  registrationNo: string
  type: 'container_chassis' | 'box_trailer' | 'flatbed'
  status: 'available' | 'assigned' | 'maintenance'
}

export interface Driver {
  id: string
  name: string
  phone: string
  licenceClass: string
  status: 'available' | 'on_trip' | 'off_duty'
}

export interface Trip {
  id: string
  jobNo: string
  containerNo: string
  truckId: string
  trailerId: string
  driverId: string
  subcontractorId?: string
  route: string
  scheduledDate: DateOnly
  deliveryDate: DateOnly | null
  status: 'planned' | 'in_transit' | 'delivered' | 'cancelled'
  podStatus: 'pending' | 'demo_received' | 'not_required'
  gpsStatus: 'demo_not_connected' | 'provider_unconfigured'
}

export interface TripMilestone {
  id: string
  tripId: string
  title: string
  status: 'completed' | 'in_progress' | 'pending'
  occurredAt: DateOnly | null
}

export interface WarehouseReceipt {
  id: string
  jobNo: string
  containerNo: string
  grnNo: string
  receivedDate: DateOnly
  status: 'receiving' | 'stored' | 'partially_dispatched' | 'dispatched'
  cartons: number
  pallets: number
  volumeCBM: number
  weightKg: number
  location: string
}

export interface StockMovement {
  id: string
  jobNo: string
  receiptId: string
  sku: string
  description: string
  direction: 'in' | 'out' | 'adjustment'
  quantity: number
  unit: 'carton' | 'pallet'
  occurredAt: DateOnly
  reason?: string
  discrepancyType?: 'damage' | 'shortage' | 'overage' | 'correction'
  evidenceReference?: string
  binLocation?: string
  batchLot?: string
  expiryDate?: DateOnly
}

export interface WarehouseActivity {
  id: string
  jobNo: string
  receiptId: string
  type:
    | 'receiving'
    | 'unloading'
    | 'palletisation'
    | 'labelling'
    | 'storage'
    | 'handling'
    | 'picking'
    | 'packing'
    | 'loading'
    | 'dispatch'
    | 'pod'
    | 'delivery'
  scheduledDate: DateOnly
  status: 'planned' | 'in_progress' | 'completed'
}

export interface DocumentRecord {
  id: string
  jobNo: string
  containerNo?: string
  tripId?: string
  invoiceId?: string
  type:
    | 'commercial_invoice'
    | 'packing_list'
    | 'BL'
    | 'HBL'
    | 'MBL'
    | 'K1'
    | 'K2'
    | 'K3'
    | 'K4'
    | 'K5'
    | 'K8'
    | 'ZB'
    | 'DG'
    | 'DSO'
    | 'IGM'
    | 'customs_supporting_document'
    | 'EDO'
    | 'LOI'
    | 'delivery_order'
    | 'gate_pass'
    | 'POD'
    | 'photo'
    | 'correspondence'
  fileName: string | null
  status: 'available' | 'pending_review' | 'missing'
  access: 'internal' | 'customer_approved'
  version: number
  uploadedBy: string | null
  uploadedAt: DateOnly | null
  history?: DocumentVersion[]
}

export interface DocumentVersion {
  version: number
  fileName: string
  uploadedBy: string
  uploadedAt: DateOnly
}

export interface ChargeSuggestion {
  id: string
  jobNo: string
  department: Department
  description: string
  sourceEventId: string
  quantity: number
  unit: string
  amountRM: number
  performed: boolean
  status: 'draft' | 'approved' | 'invoiced' | 'waived' | 'cancelled' | 'reversed'
  invoiceId?: string
  illustrativeRate: boolean
  adjustmentReason?: string
  cancellationReason?: string
  approvedBy?: string
  approvedAt?: DateOnly
}

export interface SupplierCost {
  id: string
  jobNo: string
  supplierId: string
  tripId?: string
  department: Department
  category: 'trucking' | 'toll' | 'fuel' | 'port' | 'warehouse' | 'other'
  description: string
  amountRM: number
  costType: 'actual' | 'estimated'
  approvalStatus: 'pending' | 'approved'
  paymentStatus: 'unpaid' | 'paid' | 'not_due'
  recordedDate: DateOnly
  supplierInvoiceRef?: string
  financeReviewedBy?: string
  financeReviewedAt?: DateOnly
}

export interface StorageRateRule {
  id: string
  customerId: string
  basis: 'cbm_per_day' | 'pallet_per_day' | 'carton_per_month'
  rateRM: number
  freeDays: number
  policyStatus: 'Pending Business Clarification'
  illustrative: true
}

export interface PaymentRequest {
  id: string
  jobNo: string
  supplierId: string
  description: string
  amountRM: number
  requestType: 'customer_reimbursement' | 'operational_advance'
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'cancelled'
  requestedDate: DateOnly
}

export interface CustomerInvoice {
  id: string
  jobNo: string
  customerId: string
  invoiceDate: DateOnly
  dueDate: DateOnly
  chargeIds: string[]
  amountPaidRM: number
  status: 'draft' | 'approved' | 'demo_submitted' | 'paid' | 'overdue' | 'cancelled'
  eInvoiceStatus: 'not_ready' | 'demo_submitted' | 'demo_rejected'
  eInvoiceReference: string | null
  eInvoiceError?: string
  emailStatus: 'not_sent' | 'demo_sent'
  cancellationReason?: string
  financeApprovedBy?: string
}

export interface PaymentVoucher {
  id: string
  supplierId: string
  supplierCostId?: string
  jobNo?: string
  voucherType: 'supplier_payment' | 'manual_expense'
  voucherDate: DateOnly
  amountRM: number
  status: 'draft' | 'approved' | 'paid' | 'cancelled'
  illustrative: true
  cancellationReason?: string
}

export interface BankTransaction {
  id: string
  transactionDate: DateOnly
  description: string
  amountRM: number
  direction: 'inflow' | 'outflow'
  matchedRecordId: string | null
  reconciliationStatus: 'unmatched' | 'matched' | 'reconciled'
}

export interface LedgerAccount {
  id: string
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  subtype: 'cash' | 'receivable' | 'inventory' | 'other_asset' | 'payable' | 'loan' | 'tax' | 'capital' | 'revenue' | 'direct_cost' | 'operating_expense'
}

export interface OpeningBalance {
  id: string
  accountId: string
  asOfDate: DateOnly
  debitRM: number
  creditRM: number
  illustrative: true
  assumption: string
}

export type AlertType =
  | 'free_time_expiry'
  | 'edo_pending'
  | 'overdue_payment'
  | 'long_stay_cargo'
  | 'missing_document'
  | 'vehicle_compliance'
  | 'milestone_overdue'

export interface OperationalAlert {
  id: string
  type: AlertType
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  jobNo?: string
  containerNo?: string
  invoiceId?: string
  truckId?: string
  owner: string
  createdAt: DateOnly
  dueDate: DateOnly | null
  status: 'open' | 'acknowledged' | 'resolved'
  acknowledgedAt?: DateOnly
  acknowledgedBy?: string
  resolvedAt?: DateOnly
  notes?: string[]
  escalationCount: number
  nextAction: string
}

export interface ActivityEvent {
  id: string
  jobNo: string
  actor: string
  description: string
  department: Department
  occurredAt: DateOnly
}

export interface DemoDataset {
  metadata: DemoMetadata
  customers: Customer[]
  suppliers: Supplier[]
  quotations: Quotation[]
  jobs: Job[]
  shipments: Shipment[]
  containers: Container[]
  milestones: OperationalMilestone[]
  customsCases: CustomsCase[]
  trucks: Truck[]
  trailers: Trailer[]
  drivers: Driver[]
  trips: Trip[]
  tripMilestones: TripMilestone[]
  warehouseReceipts: WarehouseReceipt[]
  stockMovements: StockMovement[]
  warehouseActivities: WarehouseActivity[]
  documents: DocumentRecord[]
  charges: ChargeSuggestion[]
  supplierCosts: SupplierCost[]
  storageRates: StorageRateRule[]
  paymentRequests: PaymentRequest[]
  invoices: CustomerInvoice[]
  paymentVouchers: PaymentVoucher[]
  bankTransactions: BankTransaction[]
  openingBalances: OpeningBalance[]
  alerts: OperationalAlert[]
  activity: ActivityEvent[]
}
