import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import type { LineItem } from "./QuoteLineItems";
import { useCompanySettings, type CompanySettings } from "@/hooks/useCompanySettings";

interface QuotePdfData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  projectDescription: string;
  templateType: string;
  items: LineItem[];
  taxRate: number;
  depositPercent?: number;
  validUntil: string;
  notes: string;
}

const generatePdfHtml = (data: QuotePdfData, company?: CompanySettings) => {
  const subtotal = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const taxAmount = subtotal * (data.taxRate / 100);
  const total = subtotal + taxAmount;
  const depositAmount = data.depositPercent ? (total * (data.depositPercent / 100)) : 0;
  const balanceAmount = total - depositAmount;

  const templateLabels: Record<string, string> = {
    interior: "Intérieur",
    exterior: "Extérieur",
    commercial: "Commercial",
  };

  const companyName = company?.company_name || "Peinture Rémy Ouellette (P.R.O.)";
  const companyAddress = company?.company_address || "6-725 Boulevard Industriel\nSaint-Jean-sur-Richelieu QC\nJ3B 7R9";
  const companyPhone = company?.company_phone || "5148863227";
  const companyEmail = company?.company_email || "info@peinturero.com";
  const licenseRbq = company?.license_rbq || "5849-1499-01";
  const taxTps = company?.tax_tps || "712784941RT0001";
  const taxTvq = company?.tax_tvq || "4003412763TQ0001";
  
  // Utilise un logo fictif ressemblant à votre image jusqu'à ce que vous ajoutiez le vôtre dans vos réglages.
  const logoUrl = company?.logo_url || "";

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${companyName}" style="max-height:80px;object-fit:contain;margin-bottom:15px;float:right;" />`
    : `<div style="float:right; text-align:right;">
         <h1 style="color:#E47C24; font-size:42px; font-style:italic; margin:0; padding:10px 20px; display:inline-block; border-radius:10px; font-family:'Brush Script MT', cursive; font-weight:800; letter-spacing:4px">P.R.O.</h1>
         <div style="font-size:10px; letter-spacing:2px; color:#555; text-transform:uppercase; margin-top:-5px; font-weight:600;">Peinture Rémy Ouellette</div>
       </div>`;

  const contactParts = [companyAddress, companyPhone, companyEmail].filter(Boolean).join(" • ");

  const itemRows = data.items
    .filter((item) => item.quantity > 0)
    .map(
      (item) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;">${item.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:center;">${item.unit}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right;">${item.unitPrice.toFixed(2)} $</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:600;">${(item.unitPrice * item.quantity).toFixed(2)} $</td>
    </tr>
  `
    )
    .join("");

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Devis - ${data.clientName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #222; padding: 30px; max-width: 800px; margin: 0 auto; }
    
    .header { width: 100%; display: flex; justify-content: space-between; margin-bottom: 20px; }
    .company { display: inline-block; vertical-align: top; max-width: 60%; }
    .company h1 { font-size: 18px; color: #162446; font-weight: 700; margin-bottom: 8px; }
    .company p { font-size: 10px; color: #444; margin-top: 2px; line-height: 1.4; }
    .logo-container { float: right; margin-top: -10px; }
    
    .quote-title { color: #f48020; font-size: 20px; font-weight: 600; margin: 20px 0 10px 0; clear: both; }
    
    .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 11px; }
    .recipient { max-width: 50%; }
    .recipient div { color: #666; text-transform: uppercase; font-size: 9px; margin-bottom: 4px; }
    .recipient p { font-weight: 600; margin-bottom: 3px; }
    .recipient p.addr { font-weight: normal; color: #444; margin-top: 2px; line-height: 1.4; }
    
    .quote-meta table { width: 220px; font-size: 10px; border: none; margin-bottom:0; }
    .quote-meta td { padding: 3px 5px; border: none; }
    .quote-meta td:first-child { color: #888; text-transform: uppercase; text-align: left; background: none; }
    .quote-meta td:last-child { font-weight: 600; text-align: right; background: none; }
    
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; border-bottom: 1px solid #eee; }
    .items-table th { background: #fdf1e5 !important; color: #e47c24 !important; padding: 6px 8px !important; font-size: 9px !important; text-transform: uppercase !important; font-weight: 600 !important; border-top: 1px solid #fdf1e5; border-bottom: 1px solid #fdf1e5;; }
    .items-table th:first-child { text-align: left !important; border-radius: 0; }
    .items-table th:nth-child(2) { text-align: left !important; }
    .items-table th:nth-child(n+3) { text-align: right !important; }
    .items-table th:last-child { border-radius: 0;}
    
    .items-table td { padding: 8px 8px; border-bottom: 1px solid #f9f9f9; vertical-align: top; }
    .items-table td.col-desc { color: #555; }
    .items-table td:nth-child(n+3) { text-align: right; }
    
    .summary-section { display: flex; justify-content: space-between; margin-top: 15px; }
    .description-box { width: 48%; font-size: 9px; color: #666; line-height: 1.4; padding-right: 15px; }
    .description-box p { margin-bottom: 8px; }
    
    .totals-box { width: 45%; font-size: 10px; margin-top:5px; }
    .totals-row { display: flex; justify-content: space-between; padding: 3px 0; }
    .totals-row:first-child { color: #555; padding-bottom: 5px; }
    .totals-row.tps, .totals-row.tvq { color: #555; }
    .totals-row.total { padding-top: 10px; margin-top: 8px; border-top: 1px solid #eee; font-size: 14px; font-weight: 700; color: #111; }
    
    .taxes-summary { margin-top: 15px; font-size: 9px; width: 100%; }
    .taxes-title { color: #e47c24; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
    .taxes-table { width: 100%; border-collapse: collapse; }
    .taxes-table th { background: #fdf1e5 !important; color: #e47c24 !important; padding: 3px 8px !important; text-transform: uppercase !important; font-weight: 600 !important; text-align: right !important; border-radius:0; border:0;}
    .taxes-table th:first-child { text-align: left !important; }
    .taxes-table th:last-child { border-radius:0; }
    .taxes-table td { padding: 4px 8px; text-align: right; border-bottom: 1px solid #f9f9f9; }
    .taxes-table td:first-child { text-align: left; font-weight: bold; }
    
    .signatures { margin-top: 30px; font-size: 10px; color: #666; }
    .sig-line { display: flex; justify-content: flex-start; margin-bottom: 15px; }
    .sig-label { width: 90px; }
    .sig-field { flex-grow: 1; border-bottom: 1px solid #ccc; max-width: 350px; }
    
    .footer { text-align: center; font-size: 9px; color: #888; border-top: 1px solid #eee; padding-top: 8px; margin-top: 50px; line-height:1.4; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">
      <h1>${companyName}</h1>
      <p>${contactParts}</p>
    </div>
    <div class="logo-container">
      ${logoHtml}
    </div>
  </div>

  <div class="quote-title">Devis</div>

  <div class="info-section">
    <div class="recipient">
      <div>ADRESSE</div>
      <p>${data.clientName}</p>
      ${data.clientPhone ? `<p class="addr">${data.clientPhone}</p>` : ""}
      ${data.clientAddress ? `<p class="addr">${data.clientAddress.replace(/\n/g, '<br/>')}</p>` : ""}
    </div>
    <div class="quote-meta">
      <table>
        <tr>
          <td>DEVIS N°</td>
          <td>${Math.floor(Math.random() * 900) + 1000}</td>
        </tr>
        <tr>
          <td>DATE</td>
          <td>${new Date().toLocaleDateString("fr-CA", { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/-/g, '/')}</td>
        </tr>
        ${data.validUntil ? `
        <tr>
          <td>DATE D'EXPIRATION</td>
          <td>${new Date(data.validUntil).toLocaleDateString("fr-CA", { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/-/g, '/')}</td>
        </tr>` : ""}
      </table>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 15%">DATE</th>
        <th style="width: 25%">ACTIVITÉ</th>
        <th style="width: 35%">DESCRIPTION</th>
        <th style="width: 5%">QTÉ</th>
        <th style="width: 10%">TAUX</th>
        <th style="width: 10%">MONTANT</th>
      </tr>
    </thead>
    <tbody>
      ${data.items
        .map(
          (item) => `
      <tr>
        <td></td>
        <td><strong>${item.name}</strong></td>
        <td class="col-desc">${item.description || "—"}</td>
        <td>${item.quantity.toLocaleString("fr-CA")}</td>
        <td>${item.unitPrice.toLocaleString("fr-CA", { minimumFractionDigits: 2 })}</td>
        <td>${(item.quantity * item.unitPrice).toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <div class="summary-section">
    <div class="description-box">
      ${data.projectDescription ? `<p>Pour le projet : ${data.projectDescription.replace(/\n/g, '<br/>')}</p>` : ""}
      ${data.notes ? `<p>${data.notes.replace(/\n/g, '<br/><br/>')}</p>` : ""}
    </div>
    
    <div class="totals-box">
      <div class="totals-row">
        <span>TOTAL PARTIEL</span>
        <span>${subtotal.toLocaleString("fr-CA", { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="totals-row tps">
        <span>TPS @ 5%</span>
        <span>${(subtotal * 0.05).toLocaleString("fr-CA", { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="totals-row tvq">
        <span>TVQ @ 9.975%</span>
        <span>${(subtotal * 0.09975).toLocaleString("fr-CA", { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="totals-row total">
        <span>TOTAL</span>
        <span>${total.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</span>
      </div>
      ${data.depositPercent ? `
      <div class="totals-row" style="margin-top:10px; color:#e47c24;">
        <span>ACOMPTE REQUIS (${data.depositPercent}%)</span>
        <span>${depositAmount.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</span>
      </div>
      <div class="totals-row" style="font-weight:600; color:#555;">
        <span>SOLDE À PAYER</span>
        <span>${balanceAmount.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</span>
      </div>` : ""}
    </div>
  </div>

  <div class="taxes-summary">
    <div class="taxes-title">SOMMAIRE DE LA TAXE DE VENTE</div>
    <table class="taxes-table">
      <thead>
        <tr>
          <th style="width:50%">TAUX</th>
          <th style="width:25%">TAXE</th>
          <th style="width:25%">NET</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>TPS @ 5%</td>
          <td>${(subtotal * 0.05).toLocaleString("fr-CA", { minimumFractionDigits: 2 })}</td>
          <td>${subtotal.toLocaleString("fr-CA", { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>TVQ @ 9,975%</td>
          <td>${(subtotal * 0.09975).toLocaleString("fr-CA", { minimumFractionDigits: 2 })}</td>
          <td>${subtotal.toLocaleString("fr-CA", { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="signatures">
    <div class="sig-line">
      <div class="sig-label">Accepté par</div>
      <div class="sig-field"></div>
    </div>
    <div class="sig-line">
      <div class="sig-label">Date d'acceptation</div>
      <div class="sig-field"></div>
    </div>
  </div>

  <div class="footer">
    <p>Paiement par virement Interac au info@peinturero.com, par carte de crédit ou en argent comptant. Un intérêt de 2% mensuel (26.78% par année) sera facturé le lendemain de la date d'échéance. Merci!</p>
    <p>Page 1 of 1</p>
  </div>
</body>
</html>`;
};

interface QuotePdfGeneratorProps {
  data: QuotePdfData;
  disabled?: boolean;
}

const QuotePdfGenerator = ({ data, disabled }: QuotePdfGeneratorProps) => {
  const { data: company } = useCompanySettings();

  const handleGenerate = () => {
    const html = generatePdfHtml(data, company);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  return (
    <Button variant="gold" onClick={handleGenerate} disabled={disabled} className="gap-2">
      <FileDown className="w-4 h-4" />
      Générer PDF
    </Button>
  );
};

export default QuotePdfGenerator;
export type { QuotePdfData };
