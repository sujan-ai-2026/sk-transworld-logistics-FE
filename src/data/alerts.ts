import type { DateOnly, OperationalAlert } from './model.js'

function parseDate(date: DateOnly): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new RangeError(`Invalid date: ${date}`)
  }
  const timestamp = Date.parse(`${date}T00:00:00.000Z`)
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) {
    throw new RangeError(`Invalid date: ${date}`)
  }
  return timestamp
}

export function getAlertAgeLabel(alert: OperationalAlert, asOfDate: DateOnly): string {
  const today = parseDate(asOfDate)
  const referenceDate = alert.dueDate ?? alert.createdAt
  const days = Math.floor((today - parseDate(referenceDate)) / 86_400_000)
  if (alert.dueDate && days > 0) return `${days} day${days === 1 ? '' : 's'} overdue`
  if (alert.dueDate && days < 0) {
    const remaining = Math.abs(days)
    return `Due in ${remaining} day${remaining === 1 ? '' : 's'}`
  }
  if (alert.dueDate) return 'Due today'
  return `Open ${days} day${days === 1 ? '' : 's'}`
}
