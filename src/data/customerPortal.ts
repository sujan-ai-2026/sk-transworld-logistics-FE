import type { ChargeSuggestion, CustomerInvoice, DemoDataset, DocumentRecord, Job } from './model.js'

export interface CustomerPortalCharge {
  id: string
  jobNo: string
  invoiceId: string
  category: ChargeSuggestion['department']
  description: string
  amountRM: number
  invoiceStatus: CustomerInvoice['status']
}

export interface CustomerPortalData {
  jobs: Job[]
  documents: DocumentRecord[]
  charges: CustomerPortalCharge[]
}

const customerVisibleInvoiceStatuses = new Set<CustomerInvoice['status']>([
  'approved',
  'demo_submitted',
  'paid',
  'overdue',
])

export function getCustomerPortalData(dataset: DemoDataset, customerId: string): CustomerPortalData {
  if (!dataset.customers.some((customer) => customer.id === customerId)) {
    throw new Error(`Customer not found: ${customerId}`)
  }

  const jobs = dataset.jobs.filter((job) => job.customerId === customerId)
  const jobNumbers = new Set(jobs.map((job) => job.jobNo))
  const documents = dataset.documents.filter(
    (document) =>
      jobNumbers.has(document.jobNo) &&
      document.status === 'available' &&
      document.access === 'customer_approved',
  )
  const invoices = dataset.invoices.filter(
    (invoice) =>
      invoice.customerId === customerId &&
      jobNumbers.has(invoice.jobNo) &&
      customerVisibleInvoiceStatuses.has(invoice.status),
  )
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]))
  const charges = dataset.charges.flatMap((charge) => {
    if (
      !jobNumbers.has(charge.jobNo) ||
      charge.status !== 'invoiced' ||
      !charge.invoiceId
    ) {
      return []
    }
    const invoice = invoiceById.get(charge.invoiceId)
    if (!invoice || !invoice.chargeIds.includes(charge.id)) return []
    return [{
      id: charge.id,
      jobNo: charge.jobNo,
      invoiceId: invoice.id,
      category: charge.department,
      description: charge.description,
      amountRM: charge.amountRM,
      invoiceStatus: invoice.status,
    }]
  })

  return { jobs, documents, charges }
}
