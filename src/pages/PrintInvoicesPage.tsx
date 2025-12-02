import React, { useEffect, useMemo } from "react";

type InternetRecord = {
  id: number;
  username: string;
  fullname: string;
  city: string;
  village: string;
  due_date: string | null;
  amount: number;
  invoiced: boolean;
  invoice_number?: number | null;
  payment: "paid" | "unpaid" | "partial";
  status: "active" | "stopped";
};

const getCurrentDateValue = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const getDisplayDate = (iso?: string | null) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return iso || "";
  }
};

const escapeHtml = (s: any) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const PrintInvoicesPage: React.FC = () => {
  const rows: InternetRecord[] = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("print_invoices_rows");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const nowIso = getCurrentDateValue();
  const nowDisplay = getDisplayDate(nowIso);

  useEffect(() => {
    if (rows.length > 0) {
      const t = setTimeout(() => window.print(), 150);
      return () => clearTimeout(t);
    }
  }, [rows.length]);

  if (rows.length === 0) {
    return (
      <div style={{ padding: 24, fontFamily: "Segoe UI, Arial, sans-serif" }}>
        No invoices to print.
      </div>
    );
  }

  return (
    <div className="print-root">
      <style>{`
        @page { size: A4; margin: 8mm; }
        * { box-sizing: border-box; }

        body, .print-root {
          margin: 0;
          padding: 0;
          background: #fff;
          font-family: "Segoe UI", Arial, sans-serif;
          color: #111827;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 6mm;
        }

        .invoice-wrap {
          break-inside: avoid;
          page-break-inside: avoid;
          width: 100%;
        }

        .page-break {
          break-after: page;
          page-break-after: always;
        }

        .invoice {
          border: 1px solid #d0d5dd;
          border-radius: 10px;
          overflow: hidden;
          font-size: 11px;
        }

        .invoice-sections {
          display: flex;
          height: 100%;
        }

        .invoice-stub {
          width: 32%;
          padding: 8px 10px;
          border-right: 1px dotted #cbd5e1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .invoice-main {
          flex: 1;
          padding: 8px 10px;
        }

        /* TITLES */
        .title-stub {
          font-size: 16px;
          font-weight: 900;
          text-align: center;
          margin-bottom: 2px;
        }

        .title-main {
          font-size: 18px;
          font-weight: 900;
          text-align: center;
          margin-bottom: 2px;
        }

        .stub-meta {
          font-size: 9px;
          color: #555;
          margin-top: 2px;
          text-align: center;
        }

        .stub-no {
          margin-top: 8px;
          font-size: 13px;
          font-weight: 900;
          color: #d32f2f;
          text-align: left;
        }

        .stub-no small {
          display: block;
          font-size: 8px;
          color: #777;
          margin-bottom: 1px;
        }

        .stub-amount {
          margin-top: 12px;
          font-size: 10px;
          font-weight: 700;
          text-align: center;
        }

        .top-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 6px;
          padding-bottom: 5px;
          border-bottom: 1px dashed #d0d5dd;
          margin-bottom: 6px;
        }

        .top-left {
          text-align: center;
        }

        .meta {
          font-size: 9px;
          color: #555;
          margin-top: 2px;
        }

        .invoice-no {
          font-size: 16px;
          font-weight: 900;
          color: #d32f2f;
          text-align: right;
        }

        .invoice-no small {
          display: block;
          font-size: 9px;
          color: #777;
          margin-bottom: 1px;
        }

        .body {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 8px;
        }

        .label {
          font-size: 9px;
          color: #6b7280;
          margin-top: 5px;
        }

        .value {
          font-size: 11px;
          font-weight: 700;
          margin-top: 2px;
        }

        .amount-box {
          border: 1px solid #e0e0e0;
          background: #f8fafc;
          border-radius: 8px;
          padding: 7px 6px;
          text-align: center;
        }

        .amount-title {
          font-size: 10px;
          font-weight: 700;
          margin-bottom: 3px;
        }

        .amount {
          font-size: 18px;
          font-weight: 900;
          line-height: 1.1;
        }

        .currency {
          font-size: 10px;
          font-weight: 700;
          color: #6b7280;
        }

        .badge {
          margin-top: 5px;
          background: #e8f5e9;
          color: #1b5e20;
          font-size: 9px;
          padding: 3px 6px;
          border-radius: 6px;
          font-weight: 800;
        }

        .note {
          border: 1px dashed #cbd5e1;
          background: #f8fafc;
          border-radius: 7px;
          padding: 5px 6px;
          font-size: 9px;
          margin-top: 4px;
          text-align: right;
          line-height: 1.3;
        }

        .warn-title {
          margin-top: 6px;
          font-size: 11px;
          font-weight: 900;
          color: #b71c1c;
          text-align: right;
        }

        .warn {
          background: #fff5f5;
          color: #b71c1c;
          border-radius: 7px;
          padding: 5px 6px;
          font-size: 9px;
          font-weight: 800;
          text-align: right;
          margin-top: 5px;
        }

        @media print {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="grid">
        {rows.map((r, idx) => {
          const invoiceNo = String(r.invoice_number ?? r.id).padStart(6, "0");
          const amount = Number(r.amount || 0).toFixed(2);
          const due = getDisplayDate(r.due_date);
          const city = escapeHtml(r.city);
          const village = escapeHtml(r.village);
          const name = escapeHtml(r.fullname);
          const username = escapeHtml(r.username);

          const breakClass = (idx + 1) % 4 === 0 ? "page-break" : "";

          return (
            <div className={`invoice-wrap ${breakClass}`} key={r.id}>
              <div className="invoice">
                <div className="invoice-sections">
                  {/* Left stub */}
                  <div className="invoice-stub">
                    <div>
                      <div className="title-stub">H&amp;M Net</div>
                      <div className="stub-meta">Barja</div>
                      <div className="stub-meta">Date: {nowDisplay}</div>
                      <div className="stub-amount">
                        قيمة الاشتراك: {amount} USD
                      </div>
                    </div>
                    <div className="stub-no">
                      <small>No.</small>
                      {invoiceNo}
                    </div>
                  </div>

                  {/* Main part */}
                  <div className="invoice-main">
                    <div className="top-row">
                      <div className="top-left">
                        <div className="title-main">H&amp;M Net</div>
                        <div className="meta">Barja</div>
                        <div className="meta">Date: {nowDisplay}</div>
                      </div>

                      <div className="invoice-no">
                        <small>No.</small>
                        {invoiceNo}
                      </div>
                    </div>

                    <div className="body">
                      <div>
                        <div className="label">اسم المشترك</div>
                        <div className="value">{name}</div>

                        <div className="label">اسم المستخدم</div>
                        <div className="value">{username}</div>

                        <div className="label">العنوان</div>
                        <div className="value">
                          {city}
                          {village ? " - " + village : ""}
                        </div>
                      </div>

                      <div className="amount-box">
                        <div className="amount-title">قيمة الاشتراك</div>
                        <div className="amount">
                          {amount} <span className="currency">USD</span>
                        </div>

                        <div className="label" style={{ marginTop: "6px" }}>
                          الاستحقاق
                        </div>
                        <div className="badge">{due || "—"}</div>
                      </div>
                    </div>

                    <div className="warn-title">تنبيه هام</div>

                    <div className="note">
                      في حال تريد قطع خدمة الانترنت، يرجى إبلاغنا بذلك قبل شهر
                      بالاتصال بنا على الرقم 03/044549.
                    </div>
                    <div className="note">
                      في حال أي عطل يرجى الإبلاغ على 03/685475 – وسام الحاج.
                    </div>

                    <div className="warn">
                      الرجاء عدم الدفع إلا عند استلام الوصل مختوماً، تحت طائلة
                      المسؤولية.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PrintInvoicesPage;
