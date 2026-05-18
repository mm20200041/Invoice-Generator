import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"
import { format } from "date-fns"
import type { Invoice, LineItem, SenderSnapshot, ClientSnapshot } from "@/lib/db/invoices"
import type { CurrencyCode } from "@/lib/validators/profile"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  text: {
    fontSize: 10,
    marginBottom: 2,
  },
  bold: {
    fontWeight: "bold",
  },
  twoColumn: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  column: {
    flex: 1,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 6,
    marginBottom: 6,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  tableColDescription: {
    flex: 4,
  },
  tableColQuantity: {
    flex: 1.5,
    textAlign: "center",
  },
  tableColUnitPrice: {
    flex: 1.5,
    textAlign: "right",
  },
  tableColVat: {
    flex: 1,
    textAlign: "right",
  },
  tableColAmount: {
    flex: 1.5,
    textAlign: "right",
  },
  totals: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#000",
    paddingTop: 10,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  totalLabel: {
    width: 100,
    textAlign: "right",
    marginRight: 10,
  },
  totalValue: {
    width: 80,
    textAlign: "right",
  },
  grandTotal: {
    fontWeight: "bold",
    fontSize: 12,
  },
  comments: {
    marginTop: 30,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
  },
  commentsTitle: {
    fontWeight: "bold",
    marginBottom: 6,
  },
})

function formatCurrency(amount: number, currency: CurrencyCode): string {
  const symbols: Record<CurrencyCode, string> = {
    EUR: "€",
    USD: "$",
    GBP: "£",
    CHF: "CHF ",
  }
  const symbol = symbols[currency]
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${symbol}${formatted}`
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, yyyy")
}

function formatQuantity(quantity: number, unitType: string): string {
  if (unitType === "hours") {
    return `${quantity.toFixed(2)} hrs`
  }
  return quantity.toFixed(2)
}

interface InvoiceDocumentProps {
  invoice: Invoice
  lineItems: LineItem[]
}

export function InvoiceDocument({ invoice, lineItems }: InvoiceDocumentProps) {
  const sender = invoice.sender_snapshot as SenderSnapshot
  const client = invoice.client_snapshot as ClientSnapshot

  const senderName = sender.company_name || sender.full_name || ""
  const clientName = client.company_name || client.full_name || ""

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.subtitle}>{invoice.number}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.text}>
              <Text style={styles.bold}>Date: </Text>
              {formatDate(invoice.invoice_date)}
            </Text>
            <Text style={styles.text}>
              <Text style={styles.bold}>Due Date: </Text>
              {formatDate(invoice.due_date)}
            </Text>
          </View>
        </View>

        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>From</Text>
            {senderName && <Text style={[styles.text, styles.bold]}>{senderName}</Text>}
            {sender.full_name && sender.company_name && (
              <Text style={styles.text}>{sender.full_name}</Text>
            )}
            {sender.address && <Text style={styles.text}>{sender.address}</Text>}
            {sender.vat_id && <Text style={styles.text}>VAT: {sender.vat_id}</Text>}
            {sender.email && <Text style={styles.text}>{sender.email}</Text>}
            {sender.website && <Text style={styles.text}>{sender.website}</Text>}
          </View>

          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            {clientName && <Text style={[styles.text, styles.bold]}>{clientName}</Text>}
            {client.full_name && client.company_name && (
              <Text style={styles.text}>{client.full_name}</Text>
            )}
            {client.address && <Text style={styles.text}>{client.address}</Text>}
            {client.vat_id && <Text style={styles.text}>VAT: {client.vat_id}</Text>}
            {client.email && <Text style={styles.text}>{client.email}</Text>}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableColDescription}>Description</Text>
            <Text style={styles.tableColQuantity}>Quantity</Text>
            <Text style={styles.tableColUnitPrice}>Unit Price</Text>
            <Text style={styles.tableColVat}>VAT %</Text>
            <Text style={styles.tableColAmount}>Amount</Text>
          </View>

          {lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.tableColDescription}>{item.description}</Text>
              <Text style={styles.tableColQuantity}>
                {formatQuantity(item.quantity, item.unit_type)}
              </Text>
              <Text style={styles.tableColUnitPrice}>
                {formatCurrency(item.unit_price, invoice.currency)}
              </Text>
              <Text style={styles.tableColVat}>{item.vat_rate}%</Text>
              <Text style={styles.tableColAmount}>
                {formatCurrency(item.line_subtotal, invoice.currency)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(invoice.subtotal, invoice.currency)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(invoice.tax_total, invoice.currency)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, styles.grandTotal]}>Total:</Text>
            <Text style={[styles.totalValue, styles.grandTotal]}>
              {formatCurrency(invoice.total, invoice.currency)}
            </Text>
          </View>
        </View>

        {invoice.comments && (
          <View style={styles.comments}>
            <Text style={styles.commentsTitle}>Comments</Text>
            <Text style={styles.text}>{invoice.comments}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}

export default InvoiceDocument
