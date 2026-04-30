# QUICK FEE SYSTEM REFERENCE - IMS-V2

## Current Architecture Overview

```
STUDENT ENROLLS IN BATCH
        ↓
    Fee Created
    - totalAmount: taken from Course.fees.amount
    - OR: customAmount from FeePreset (override)
    - status: 'not_started'
    - installments: [] (empty initially)
        ↓
ADMIN RECORDS PAYMENT
    - Direct: Pay specific installment amount on specific dueDate
    - Waterfall: Partial payment auto-splits across installments
        ↓
Pre-save Hook Recalculates:
    - paidAmount (sum of paid installments)
    - balanceAmount (totalAmount - discount + charges - paid)
    - status (not_started/partial/paid/overdue)
        ↓
ADMIN APPLIES DISCOUNT
    - Absolute amount only (not percentage)
    - Cascades to pending installments
        ↓
FEE FULLY PAID or CANCELLED
```

---

## CURRENT SYSTEM CAPABILITIES

### ✅ Supported Features
- [x] Multi-installment fees
- [x] 5 Payment Methods: Cash, Card, UPI, Bank Transfer, Cheque
- [x] Two Payment Modes: Direct + Waterfall (partial payment split)
- [x] Discount management (absolute amounts)
- [x] Extra charges management
- [x] Fee status tracking (6 statuses)
- [x] Soft delete with audit trail
- [x] Collection reports
- [x] Outstanding balance tracking
- [x] Batch-wise fee aggregation

### ❌ NOT Supported (Current Gaps)
- [ ] Percentage-based discounts
- [ ] Late fees / Penalties
- [ ] Multiple fee heads per student (Admission + Tuition + Library separately)
- [ ] Receipt model (inline in Fee.installments)
- [ ] Refunds with account reversal (only cancel + pro-rate)
- [ ] Duplicate payment prevention
- [ ] Fee transfer when student changes batch
- [ ] Payment plan/EMI scheduling
- [ ] SMS reminders for due fees
- [ ] Partial installment payment (must pay full installment)
- [ ] Concession/Waiver tracking separately

---

## DATA MODEL SUMMARY

### Fee Collection Structure
```javascript
Fee {
  institute: ObjectId
  student: ObjectId
  batch: ObjectId
  
  totalAmount: 5000          // Base fee
  
  discount: {
    amount: 500              // ₹500 off
    reason: "Merit"
    appliedBy: adminId
    appliedAt: Date
  }
  
  extraCharges: {
    amount: 200              // ₹200 extra
    reason: "Late fee"
    appliedBy: adminId
    appliedAt: Date
  }
  
  installments: [
    {
      amount: 1175           // (5000 - 500 + 200) / 4 = 1175
      dueDate: "2024-06-01"
      paidDate: "2024-06-10"
      status: "paid"
      paymentMethod: "cash"
      collectedBy: "Mr. Sharma"
      notes: "Received at office"
    },
    {
      amount: 1175
      dueDate: "2024-07-01"
      status: "pending"
    }
    // ... more installments
  ]
  
  paidAmount: 1175           // Auto-calculated
  balanceAmount: 3525        // Auto-calculated: (5000-500+200) - 1175
  status: "partial"          // Auto-calculated based on paid/balance
}
```

---

## PAYMENT FLOW - STEP BY STEP

### Scenario 1: Direct Payment
```
Fee: ₹5000, 4 installments (₹1250 each)
Installment 1 due June 1
Admin records: Payment of ₹1250 on June 5, method: Cash

Result:
- Installment 1: status='paid', paidDate=June 5, paymentMethod='cash'
- Fee.paidAmount = 1250
- Fee.status = 'partial' (because more installments pending)
```

### Scenario 2: Waterfall Payment (Partial)
```
Fee: ₹5000, 4 installments (₹1250 each)
All installments due June 1
Admin records: Payment of ₹3000 (partial, not aligned to any installment)

Result:
- Installment 1: status='paid', amount=1250
- Installment 2: status='paid', amount=1250  
- Installment 3: status='paid', amount=500 (only partial paid)
- Installment 4: status='pending', amount=1250
- Fee.paidAmount = 3000
- Fee.status = 'partial'
```

### Scenario 3: Apply Discount Then Pay
```
Fee: ₹5000, Installment 1 (₹1250) due June 1
Admin applies: ₹500 discount
Admin records: Payment of ₹1000

Result:
- totalAmount = 5000
- discount = 500
- finalAmount = 4500 (5000 - 500)
- Installment 1: amount=1000, status='paid'
- Fee.paidAmount = 1000
- Fee.balanceAmount = 3500 (4500 - 1000)
```

---

## API ENDPOINTS - Current Implementation

### Fee CRUD
```
GET    /api/v1/fees                    - List all fees (with filters)
POST   /api/v1/fees                    - Create new fee
GET    /api/v1/fees/{id}               - Get specific fee details
PATCH  /api/v1/fees/{id}               - Update fee (discount/charges)
DELETE /api/v1/fees/{id}               - Hard delete fee
```

### Payments & Transactions
```
POST   /api/v1/fees/{id}/payment       - Record payment (direct or waterfall)
POST   /api/v1/fees/{id}/cancel        - Cancel fee (pro-rate refund)
```

### Fee Presets (Templates)
```
GET    /api/v1/fee-presets             - List presets
POST   /api/v1/fee-presets             - Create preset
PATCH  /api/v1/fee-presets/{id}        - Update preset
DELETE /api/v1/fee-presets/{id}        - Delete preset
```

### Collectors (Payment Collectors)
```
GET    /api/v1/collectors              - List payment collectors
POST   /api/v1/collectors              - Add new collector
PATCH  /api/v1/collectors/{id}         - Update collector
DELETE /api/v1/collectors/{id}         - Delete collector
```

### Student View
```
GET    /api/v1/student/fees            - Get logged-in student's fees
```

### Reports
```
GET    /api/v1/reports/collections     - Collection report (paid installments)
```

---

## BUSINESS RULES - Current Implementation

### Creation Rules
- ✅ Fee created automatically on student batch enrollment
- ✅ Can use Course.fees.amount OR FeePreset.amount (override)
- ✅ Can have multiple installments or single installment
- ❌ Cannot have partial installment payment (must pay full installment in direct mode)

### Payment Rules
- ✅ Multiple payment methods supported
- ✅ Payment tracking with collector name & notes
- ✅ Waterfall mode splits partial payments intelligently
- ❌ Cannot pay more than balance amount (waterfall blocked for overpayment)
- ❌ No duplicate payment prevention
- ❌ No minimum payment amount

### Discount Rules
- ✅ Absolute amounts only (e.g., ₹500 off)
- ✅ Can apply discount before or after partial payment
- ✅ Discount cascades to pending installments
- ❌ Cannot apply percentage-based discounts
- ❌ Cannot apply discount after fee is fully paid
- ✅ Track discount reason & who applied it

### Status Rules
- Auto-calculated based on:
  - paidAmount = 0 → 'not_started'
  - paidAmount > 0 AND paidAmount < finalAmount → 'partial'
  - paidAmount >= finalAmount → 'paid'
  - Any installment dueDate < today AND status='pending' → 'overdue'
  - Explicitly marked → 'cancelled' or 'refunded'

### Deletion Rules
- ✅ Fees can be hard-deleted (loses all history)
- ❌ No soft delete for fees
- ❌ Cannot restore deleted fee

---

## SPECIAL SCENARIOS - Current Handling

### 1. Fee Increase Mid-Year
**Current:** Use `extraCharges` field
```javascript
// Before: totalAmount = 5000
// Admin adds: extraCharges = 200
// Result: finalAmount = 5000 + 200 = 5200
```

### 2. Fee Discount Mid-Year
**Current:** Use `discount` field (automatic)

### 3. Student Changes Batch
**Current:** Fee is NOT transferred
- Old fee remains (can be cancelled)
- New fee created for new batch

### 4. Student Drops Out Mid-Year
**Current:** Fee is deleted (hard delete)
- All payment history lost
- No refund tracking

### 5. Refund Processing
**Current:** Via `cancelFee()` method
- Pro-rates any paid amount
- Marks installments as 'waived'
- Does NOT reverse payment to account
- No refund tracking

### 6. Overpayment
**Current:** Not allowed
- Waterfall payment blocked if would overpay
- Admin must manually handle overpayment (give credit note, etc.)

---

## VALIDATION & CONSTRAINTS

### Pre-save Validations (Fee.js lines 83-102)
- ✅ Installment amounts must sum to: totalAmount - discount + extraCharges
- ✅ Tolerance: 0.01 (for floating point errors)
- ✅ Recalculates paidAmount from all paid installments
- ✅ Recalculates balanceAmount
- ✅ Auto-updates status

### Payment Recording Validations
- ✅ Amount must not exceed balance
- ✅ Payment date cannot be in future
- ✅ Payment method must be valid enum
- ✅ Waterfall mode prevents overpayment

### Index Constraints
- ✅ Unique: { institute, student, batch } with soft delete filter
  - Ensures one fee per student per batch
- ❌ No duplicate payment prevention index
- ❌ No duplicate fee creation prevention (at DB level, only at app logic)

---

## CODE LOCATIONS

| Component | File Path | Lines | Purpose |
|-----------|-----------|-------|---------|
| Fee Model | `/models/Fee.js` | 104 | Main fee schema + pre-save hook |
| FeePreset Model | `/models/FeePreset.js` | 43 | Fee templates per course |
| Collector Model | `/models/Collector.js` | 43 | Payment collectors |
| Fee Service | `/services/feeService.js` | 545 | All fee logic (create, pay, discount, cancel) |
| Student Service | `/services/studentService.js` | 813 | Student enrollment (triggers fee creation) |
| Fee API Routes | `/app/api/v1/fees/` | Multiple | All fee endpoints |
| Admin UI | `/app/admin/fees/page.jsx` | ? | Fee management dashboard |
| Student UI | `/app/student/fees/page.jsx` | ? | Student fee view |

---

## PERFORMANCE CONSIDERATIONS

### Indexes
- ✅ institute (1): Fast institute queries
- ✅ batch (1): Fast batch queries
- ✅ student + batch (1): Fast student fee lookup
- ✅ deletedAt (1): Fast active fee queries

### Potential Bottlenecks
- ⚠️ Aggregation on large installment arrays (if many payments)
- ⚠️ Fee status calculation on every save (runs pre-hook)
- ⚠️ No pagination on collection reports (could be slow with 10k+ fees)

---

## SUMMARY TABLE

| Aspect | Current State | Notes |
|--------|---------------|-------|
| **Fee Structure** | Single fee per student + installments | No split by type (Admission/Tuition/Library) |
| **Payment Methods** | 5 types (cash, card, UPI, bank, cheque) | ✅ Comprehensive |
| **Discounts** | Absolute amounts | ❌ No percentages |
| **Receipts** | Inline in Fee.installments | ❌ No separate receipt model |
| **Refunds** | Pro-rated via cancelFee() | ❌ No account reversal |
| **Installments** | Flexible, auto-calculated | ✅ Waterfall payment support |
| **Overdue Tracking** | Auto-detected via dueDate | ✅ Works |
| **Late Fees** | Not implemented | ❌ Manual management only |
| **Reports** | Collections + Outstanding | ✅ Basic but functional |
| **Audit Trail** | deletedBy, deletedAt for fees | ⚠️ Limited for payments |
| **Multi-head Fees** | Not supported | ❌ Single fee per student |

---

## Ready for Your Updates!

I have complete context of:
- ✅ How fees are created and assigned
- ✅ How payments are recorded and split
- ✅ How discounts and charges work
- ✅ How statuses are calculated
- ✅ All API endpoints and their logic
- ✅ Current limitations and gaps
- ✅ Data models and relationships

**What updates do you want to implement?**

