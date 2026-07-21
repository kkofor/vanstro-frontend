import type { Metadata } from "next";

export type LegalPageSection = {
  title: string;
  body: string;
  accent?: string;
  icon?: "file" | "shield" | "truck" | "clipboard" | "users" | "briefcase";
};

export type LegalPageLink = {
  label: string;
  href: string;
  shortLabel?: string;
};

export type LegalPageEntry = {
  slug: string;
  title: string;
  description: string;
  intro: string;
  updated?: string;
  sourceSummary?: string;
  sections: LegalPageSection[];
  summaryTitle: string;
  summaryBody: string;
  supportNote?: string;
  primaryCta: LegalPageLink;
  secondaryCta: LegalPageLink;
};

const iconCycle: Array<LegalPageSection["icon"]> = [
  "file",
  "clipboard",
  "shield",
  "truck",
  "users",
  "briefcase"
];

function section(
  title: string,
  body: string,
  index: number,
  accent?: string
): LegalPageSection {
  return {
    title,
    body,
    accent,
    icon: iconCycle[index % iconCycle.length]
  };
}

function contactSection(index: number): LegalPageSection {
  return section(
    "Contact Us",
    "Questions about this page or any of our legal terms may be directed to:\nVanStro Global Supply Inc.\n856 Century Street, Winnipeg, Manitoba R3H 0M5, Canada\nEmail: info@vanstro.ca\nPhone: 204-221-2288\nWebsite: vanstro.ca",
    index,
    "Official contact block required by the VanStro legal footer implementation brief."
  );
}

export const legalPageEntries: LegalPageEntry[] = [
  {
    slug: "legal-disclaimer",
    title: "Legal Disclaimer",
    description: "Legal disclaimer content from the VanStro legacy site.",
    intro:
      "Important notes about website information, product references, pricing, images, liability and governing law.",
    updated: "Last updated: 2026-05-16",
    sourceSummary: "Effective Date: May 12, 2026",
    sections: [
      section(
        "1. Informational Purpose Only",
        "The information, specifications, dimensions, images, pricing, and other content presented on this website are provided for general informational and display purposes only and do not constitute professional advice of any kind.",
        0
      ),
      section(
        "2. Subject to Change Without Notice",
        "All product specifications, designs, materials, finishes, colours, dimensions, and prices are subject to change at any time without prior notice. VanStro Global Supply Inc. reserves the right to update, modify, or discontinue any product or content at its sole discretion.",
        1
      ),
      section(
        "3. Product Images",
        "Product images may differ from actual products due to manufacturing variations, screen settings, lighting, and natural material differences. Wood grain, stone veining, and other natural finishes are inherently unique; no two units will be identical.",
        2
      ),
      section(
        "4. Pricing and Charges",
        "All prices displayed on this website are suggested retail prices for reference only and do not include shipping, delivery, installation, taxes, duties, or other applicable charges unless expressly stated otherwise. Shipping costs vary depending on delivery location and order quantity and will be quoted separately. Applicable federal Goods and Services Tax (GST) and any provincial sales tax (PST, RST, QST, or HST as applicable) will be added at the time of invoicing.",
        3,
        "Important: displayed prices are reference prices only; taxes, shipping, delivery, installation, duties and other charges may be added separately."
      ),
      section(
        "5. No Binding Offer",
        "Nothing on this website constitutes a binding offer, contract, guarantee, or warranty. Final product specifications, pricing, and commercial terms are determined by the applicable written quotations, purchase agreements, invoices, and other formal contractual documents issued by VanStro Global Supply Inc.",
        4,
        "Important: binding terms come only from formal VanStro quotations, purchase agreements, invoices or other contractual documents."
      ),
      section(
        "6. Accuracy and Limitation of Liability",
        "VanStro Global Supply Inc. makes reasonable efforts to ensure the accuracy of information published on this website but does not warrant that the content is complete, current, or free from error. To the maximum extent permitted by applicable law, VanStro Global Supply Inc. assumes no responsibility or liability for errors, omissions, typographical inaccuracies, or any direct, indirect, incidental, special, or consequential damages arising from reliance on information contained on this website.",
        5
      ),
      section(
        "7. Reservation of Rights",
        "VanStro Global Supply Inc. reserves the right to interpret, modify, update, or discontinue any content, product, price, or service described on this website at any time and without prior notice.",
        6
      ),
      section(
        "8. Third-Party Links",
        "This website may contain links to third-party websites or resources. Such links are provided for convenience only. VanStro Global Supply Inc. has no control over the content of such external sites and is not responsible for their availability, accuracy, or content.",
        7
      ),
      section(
        "9. Governing Law",
        "This disclaimer is governed by the laws of the Province of Manitoba and the federal laws of Canada applicable therein, without regard to conflict-of-law principles.",
        8
      ),
      contactSection(9)
    ],
    summaryTitle: "Need a confirmed answer?",
    summaryBody:
      "For binding product details, project support or order-specific guidance, contact VanStro support or the independent dealer selected for the order before placing it.",
    supportNote: "Best for: product specifications, pricing references, website information, and quotation confirmation.",
    primaryCta: { label: "Contact support", href: "/contact" },
    secondaryCta: { label: "Shop products", href: "/products" }
  },
  {
    slug: "terms-and-conditions",
    title: "Terms and Conditions",
    description: "Terms and Conditions content from the VanStro legacy site.",
    intro:
      "Terms governing access to the VanStro website, permitted use, pricing references, intellectual property and legal responsibilities.",
    updated: "Last updated: 2026-05-16",
    sourceSummary: "Effective Date: May 12, 2026",
    sections: [
      section(
        "1. Acceptance of Terms",
        'By accessing or using vanstro.ca (the "Website"), you agree to be bound by these Terms and Conditions and by our Privacy Policy and Cookie Policy. If you do not agree, you must not use the Website.',
        0,
        "Important: the formal implementation brief identifies vanstro.ca as the public website domain for these legal terms."
      ),
      section(
        "2. Eligibility",
        "The Website is intended for business users and adult consumers located in Canada. By using the Website, you represent that you are at least the age of majority in your province of residence and have the legal capacity to enter into binding agreements.",
        1
      ),
      section(
        "3. Permitted Use",
        "You may use the Website to browse product information, request quotations, communicate with our team, and access publicly available resources. You agree not to:\n- interfere with the operation or security of the Website;\n- attempt to gain unauthorized access to any system, account, or data;\n- use automated tools to scrape, harvest, or extract content for commercial purposes without written consent;\n- upload, transmit, or distribute viruses, malicious code, or unlawful material;\n- use the Website to infringe the intellectual property, privacy, or other rights of any person.",
        2
      ),
      section(
        "4. Intellectual Property",
        "All content on the Website - including text, graphics, product images, logos, technical drawings, and software - is the property of VanStro Global Supply Inc. or its licensors and is protected by Canadian and international intellectual property laws. You may not copy, reproduce, distribute, publish, or create derivative works from any part of the Website without prior written consent, except for personal, non-commercial reference.",
        3
      ),
      section(
        "5. Quotations, Orders, and Pricing",
        "Information presented on the Website does not constitute a binding offer. Binding terms are established only by a written quotation, purchase agreement, or invoice issued by VanStro Global Supply Inc. Prices shown on the Website are suggested retail prices for reference; final pricing is set out in the applicable contractual documents and may vary based on order volume, customization, freight, taxes, and other factors.",
        4
      ),
      section(
        "6. Warranties and Disclaimers",
        'Product warranties, where offered, are governed by the separate VanStro Limited Warranty documentation accompanying the product. Except as expressly set out in such written warranty, the Website and its content are provided on an "as is" and "as available" basis without representations, warranties, or conditions of any kind, whether express, implied, statutory, or otherwise, including merchantability, fitness for a particular purpose, and non-infringement, to the maximum extent permitted by applicable law.',
        5,
        "Important: product warranty rights are controlled by separate written VanStro Limited Warranty documentation, not by general website content."
      ),
      section(
        "7. Limitation of Liability",
        "To the maximum extent permitted by applicable law, VanStro Global Supply Inc. and its affiliates, officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenues, data, or goodwill, arising out of or related to the use of, or inability to use, the Website. Nothing in these Terms limits or excludes liability that cannot be limited or excluded under applicable consumer protection law.",
        6
      ),
      section(
        "8. Indemnification",
        "You agree to indemnify and hold harmless VanStro Global Supply Inc. and its affiliates from and against any claim, demand, loss, liability, or expense (including reasonable legal fees) arising from your breach of these Terms or your misuse of the Website.",
        7
      ),
      section(
        "9. Modifications",
        "VanStro Global Supply Inc. may revise these Terms at any time by posting an updated version on the Website. The revised Terms take effect on the date of posting. Continued use of the Website after that date constitutes acceptance of the revised Terms.",
        8
      ),
      section(
        "10. Termination",
        "VanStro Global Supply Inc. may, in its sole discretion and without notice, suspend or terminate your access to the Website if it believes you have violated these Terms or applicable law.",
        9
      ),
      section(
        "11. Governing Law and Jurisdiction",
        "These Terms are governed by the laws of the Province of Manitoba and the federal laws of Canada applicable therein. Any dispute arising out of or relating to these Terms or the Website shall be brought before the courts located in Winnipeg, Manitoba, except that consumers may bring proceedings in the courts of their province of residence as required by applicable law.",
        10
      ),
      section(
        "12. Severability",
        "If any provision of these Terms is held to be invalid or unenforceable, that provision shall be severed, and the remaining provisions shall continue in full force and effect.",
        11
      ),
      section(
        "13. Entire Agreement",
        "These Terms, together with the Privacy Policy, Cookie Policy, Legal Disclaimer, and any contractual documents issued by VanStro Global Supply Inc., constitute the entire agreement between you and VanStro Global Supply Inc. regarding the Website.",
        12
      ),
      contactSection(13)
    ],
    summaryTitle: "Questions about ordering terms?",
    summaryBody:
      "Our support team can explain the current storefront flow and route policy questions to the right dealer or platform contact.",
    supportNote: "Best for: quote terms, order documents, product warranty routing, and website terms questions.",
    primaryCta: { label: "Contact support", href: "/contact" },
    secondaryCta: { label: "View return policy", href: "/return-policy" }
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    description: "Privacy Policy content from the VanStro legacy site.",
    intro:
      "How VanStro collects, uses, shares, protects and retains personal information under Canadian privacy law.",
    updated: "Last updated: 2026-05-16",
    sourceSummary: "Effective Date: May 12, 2026",
    sections: [
      section(
        "1. Our Commitment",
        'VanStro Global Supply Inc. ("VanStro", "we", "our") is committed to protecting your personal information in accordance with the Personal Information Protection and Electronic Documents Act (PIPEDA), Quebec\'s Act respecting the protection of personal information in the private sector (Law 25), and other applicable Canadian privacy laws. This Policy explains what information we collect, how we use it, with whom we share it, and the rights you have.',
        0
      ),
      section(
        "2. Privacy Officer",
        "Our Privacy Officer is responsible for compliance with this Policy. You may contact the Privacy Officer at info@vanstro.ca or by mail at 856 Century Street, Winnipeg, Manitoba R3H 0M5.",
        1,
        "Important: privacy rights requests and consent withdrawal should be directed to the Privacy Officer at info@vanstro.ca."
      ),
      section(
        "3. Information We Collect",
        "We collect personal information that you provide directly and information generated automatically as you interact with the Website:\n- Identification and contact information: name, email address, telephone number, mailing address, company name, and role.\n- Transactional information: products and services you inquire about, quotations issued, orders placed, payment status, and delivery records.\n- Technical information: IP address, browser type, device identifiers, operating system, referring URL, pages visited, and timestamps.\n- Communication records: messages you send to us, customer service tickets, and meeting notes.\n- Marketing information: subscription preferences, event registrations, and survey responses, where you provide them.",
        2
      ),
      section(
        "4. Purposes of Use",
        "We use personal information for the following purposes:\n- Responding to inquiries, preparing quotations, fulfilling orders, and providing customer service.\n- Managing dealer and supplier relationships, including credit and onboarding processes.\n- Improving the Website, our products, and our services through analytics and research.\n- Complying with legal obligations and protecting our legal rights and the safety of others.\n- Sending marketing communications about products, promotions, and events, where you have consented to receive them.",
        3
      ),
      section(
        "5. Legal Basis and Consent",
        "We collect, use, and disclose personal information only with your knowledge and consent, except where authorized or required by law. Consent may be express or implied depending on the sensitivity of the information. You may withdraw consent at any time, subject to legal or contractual restrictions and reasonable notice, by contacting our Privacy Officer.",
        4
      ),
      section(
        "6. Disclosure to Third Parties",
        "We disclose personal information only as necessary to fulfill the purposes set out above, to the following categories of recipients:\n- Service providers retained to perform functions on our behalf, such as payment processing, shipping and logistics, IT hosting, design software, and customer relationship management, under contractual obligations of confidentiality and data protection.\n- Participating independent dealers and installers to fulfill orders and provide post-sale service.\n- Affiliated entities of VanStro Global Supply Inc., including the supply chain partner Qingdao Wanshituo Trading Co., Ltd., strictly for order fulfillment, product quality coordination, and online marketing operations, under written confidentiality and data protection terms.\n- Government authorities, regulators, or law enforcement, where required by law or to protect our legal rights.\n- Successors in connection with a corporate transaction, such as a merger, acquisition, or sale of assets, subject to confidentiality protections.",
        5
      ),
      section(
        "7. Cross-Border Transfers",
        "Some of our service providers and affiliates are located outside Canada, including in the United States, Singapore, the Republic of Korea, and the People's Republic of China. When personal information is transferred outside Canada, it may be accessed by foreign courts, law enforcement, and national security authorities under the laws of the receiving country. We use contractual safeguards and security measures designed to provide a comparable level of protection. By using the Website or providing your information, you acknowledge such cross-border transfers may occur.",
        6
      ),
      section(
        "8. Retention",
        "We retain personal information only as long as necessary for the purposes for which it was collected, to fulfill our legal and contractual obligations, and to resolve disputes. When no longer required, personal information is destroyed, deleted, or rendered anonymous in accordance with our retention schedule.",
        7
      ),
      section(
        "9. Safeguards",
        "We maintain physical, organizational, and technical safeguards appropriate to the sensitivity of personal information, including access controls, encryption in transit, secure storage, staff confidentiality undertakings, and regular security reviews. No method of transmission or storage is completely secure; we cannot guarantee absolute security.",
        8
      ),
      section(
        "10. Your Rights",
        "Subject to applicable law, you have the following rights with respect to your personal information:\n- Access: request confirmation that we hold information about you and obtain a copy.\n- Correction: request that we correct inaccurate or incomplete information.\n- Withdrawal of consent: withdraw consent to the collection, use, or disclosure of your information, subject to legal or contractual restrictions.\n- Deletion: request deletion of your information where no longer required and not otherwise retained under law.\n- Portability: request transfer of your information in a structured, commonly used format, where applicable under Quebec Law 25.\n- Complaint: file a complaint with our Privacy Officer or with the Office of the Privacy Commissioner of Canada or your provincial regulator.\n\nTo exercise these rights, contact our Privacy Officer. We will respond within 30 days of receiving a valid request. We may need to verify your identity before providing information.",
        9,
        "Important: VanStro will respond within 30 days after receiving a valid request, subject to identity verification."
      ),
      section(
        "11. Children's Privacy",
        "The Website is not directed to children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided personal information to us, please contact our Privacy Officer and we will take appropriate steps.",
        10
      ),
      section(
        "12. Automated Decision-Making",
        "We do not currently use personal information to make decisions about you based solely on automated processing. If this changes, we will inform you in accordance with applicable law and provide the rights of access and explanation required under Quebec Law 25.",
        11
      ),
      section(
        "13. Changes to This Policy",
        "We may update this Policy from time to time. The updated Policy will be posted on the Website with a revised Effective Date. We encourage you to review this Policy periodically.",
        12
      ),
      contactSection(13)
    ],
    summaryTitle: "Cookie controls",
    summaryBody:
      "Visitors can adjust optional cookie preferences without leaving the site.",
    supportNote: "Privacy requests should go to the Privacy Officer at info@vanstro.ca. We may need to verify your identity.",
    primaryCta: { label: "Open cookie settings", href: "/cookie-settings" },
    secondaryCta: { label: "Contact support", href: "/contact" }
  },
  {
    slug: "cookie-settings",
    title: "Cookie Preferences",
    description: "Cookie Policy content and preference controls from the VanStro legacy site.",
    intro:
      "How VanStro uses cookies and similar technologies, and how visitors can manage optional cookie categories.",
    updated: "Last updated: 2026-05-16",
    sourceSummary: "Effective Date: May 12, 2026",
    sections: [
      section(
        "1. What Are Cookies",
        'A cookie is a small text file placed on your device by a website you visit. Cookies are widely used to make websites work, improve performance, remember preferences, and enable analytics. This Policy uses the term "cookies" to also refer to similar technologies such as pixels, local storage, and software development kits.',
        0
      ),
      section(
        "2. Categories of Cookies We Use",
        "2.1 Strictly Necessary\n- These cookies are required for the Website to function. They support session management, security, language selection, and recording your cookie consent state. They cannot be disabled in our settings panel.\n\n2.2 Functional\n- These cookies remember choices that improve your experience, such as your region, recently viewed products, and saved design tool state. They are not loaded unless you opt in.\n\n2.3 Analytics\n- These cookies help us measure how visitors use the Website, such as which pages are most visited, so we can improve content and performance. We configure analytics tools to anonymize IP addresses and limit data retention. They are not loaded unless you opt in.\n\n2.4 Marketing\n- These cookies support advertising and re-engagement, including cross-site retargeting and social media pixels. They are not loaded unless you opt in.",
        1,
        "Important: Functional, analytics and marketing cookies are non-essential and should remain off unless the visitor opts in."
      ),
      section(
        "3. Your Choices",
        'On your first visit, a cookie banner is presented with three equally prominent options: Accept All, Reject All, and Customize. You may change your selection at any time by clicking "Cookie Settings" in the footer. Withdrawing consent removes the corresponding non-essential cookies on the next page load.',
        2,
        "Important: Accept All, Reject All and Customize must be equally prominent, and consent must remain revocable from the footer."
      ),
      section(
        "4. Browser Controls",
        "In addition to our settings, you may control cookies through your browser. Most browsers allow you to view, delete, and block cookies. Disabling strictly necessary cookies may prevent parts of the Website from functioning properly.",
        3
      ),
      section(
        "5. Third-Party Cookies",
        "Some cookies are placed by third parties acting on our behalf - for example, analytics or marketing providers. These third parties process data under contractual obligations consistent with this Policy and our Privacy Policy. A current list of categories and providers is available on request from info@vanstro.ca.",
        4
      ),
      section(
        "6. Consent Records",
        "We retain a record of your consent choices, including the timestamp and the categories accepted or rejected, for up to 24 months. This record is used to demonstrate compliance with applicable privacy law.",
        5,
        "Important: consent records should retain timestamp and accepted/rejected categories for up to 24 months."
      ),
      section(
        "7. Changes to This Policy",
        "We may update this Cookie Policy from time to time. The updated Policy will be posted on the Website with a revised Effective Date.",
        6
      ),
      contactSection(7)
    ],
    summaryTitle: "Manage optional cookies",
    summaryBody:
      "Required cookies stay active. Functional, analytics, and targeting cookies can be changed from the preferences control.",
    supportNote: "Consent choices can be changed at any time. Optional cookies remain off unless you opt in.",
    primaryCta: { label: "Manage preferences", href: "#cookie-controls" },
    secondaryCta: { label: "Privacy policy", href: "/privacy" }
  },
  {
    slug: "return-policy",
    title: "Return Policy",
    description:
      "Return conditions for retail customers and professional or wholesale clients purchasing kitchen cabinets and bathroom vanities through the VanStro dealer network.",
    intro:
      "Return conditions and procedures for retail customers and professional or wholesale clients within the VanStro dealer network.",
    updated: "Effective Date: May 12, 2026",
    sourceSummary:
      "Applicable to Retail Customers and Professional / Wholesale Clients - Kitchen Cabinets and Bathroom Vanities.",
    sections: [
      section(
        "Our Commitment",
        "If we supplied the wrong product or made a shipping error, you pay nothing - we will make it right.\n\nIf you change your mind, return the product unopened within 7 days and no restocking fee applies.\n\nIf the packaging has been opened, a restocking fee applies.",
        0,
        "Wrong product or shipping error: no charge. Unopened retail return within 7 days: no restocking fee. Opened packaging: a restocking fee applies."
      ),
      section(
        "1. Purpose",
        'This policy sets out the conditions and procedures for returns of products supplied by VanStro Global Supply Inc. ("VanStro"). It applies only to VanStro-supplied products and does not govern a dealer\'s independently provided services, other product lines or unrelated business operations.',
        1
      ),
      section(
        "2. Scope and Application",
        "This policy applies to purchases by two classes of customers:\n- Retail Customers\n- Professional / Wholesale Clients - builders, contractors, designers, and commercial customers\n\nIt does not apply to VanStro's dealers, whose rights and obligations are set out in the applicable dealer cooperation agreement. Where a separate written agreement exists, that agreement prevails.",
        2
      ),
      section(
        "3. Sales Channel, Delivery and Scope of Responsibility",
        'VanStro sells through its dealer network. Each sale to a customer is completed by a dealer, who holds the inventory and handles delivery and returns. This policy sets the return terms for VanStro-supplied products.\n\nIn this policy, "Delivery" means the handover of the goods to the customer by the dealer. All time periods run from the date of Delivery.\n\nOwnership and risk pass to the customer on Delivery. The customer should inspect the goods on Delivery; by accepting Delivery, the customer accepts their quantity and external condition.\n\nTransportation, installation, and other on-site or extended services are arranged between the customer and the relevant dealer.',
        3,
        "Important: ownership and risk pass to the customer on Delivery, and return time periods run from the Delivery date."
      ),
      section(
        "4. Return Authorization",
        "For returns and related enquiries, the customer should contact the customer service of the local dealer from whom the product was purchased.\n\nAll returns must be authorized in advance. The dealer reviews the request against this policy and, if eligible, obtains a Return Merchandise Authorization (RMA) number from VanStro; the product is then returned to the dealer.\n\nPlease obtain an RMA number before returning any product; returns received without one cannot be processed.",
        4,
        "Important: returns received without a valid RMA number cannot be processed."
      ),
      section(
        "5. Complaints and Escalation to the Platform",
        "Returns are handled by the dealer. If a dealer does not follow this policy, or the customer considers its handling of a return unreasonable, the customer may complain to VanStro at complaints@vanstro.ca.\n\nVanStro will review whether the VanStro product-return requirements were correctly applied and, where appropriate, address the product-supply issue within VanStro's responsibility. VanStro's direct involvement is limited to such escalations.",
        5
      ),
      section(
        "6. Return Eligibility and Conditions",
        "Standard stock products may be returned to the dealer within seven (7) days after Delivery if all of the following are met:\n- Product has not been installed\n- Product has not been used\n- Product remains in original packaging\n- Product is in resalable condition\n- Product is free from damage",
        6,
        "Important: eligible standard stock products must be returned within seven (7) days after Delivery and must remain unused, uninstalled, packaged, resalable and undamaged."
      ),
      section(
        "7. Non-Returnable Items",
        "The following products are non-returnable:\n- Installed products\n- Custom-made products - special sizes, special colors, custom configurations, and special-order items",
        7
      ),
      section(
        "8. Return Charges",
        "1. Our error - no charge. Where a return results from an incorrect product supplied, a shipping error, or damage occurring before Delivery, no charge of any kind applies. The dealer arranges replacement or a full refund, including return transportation.\n\nClaims relating to product defects are handled under the VanStro Cabinetry Warranty Policy and are not treated as returns under this policy.\n\n2. Retail Customers - unopened packaging - no restocking fee. Where a Retail Customer returns a standard stock product in its original packaging, unopened and with seals intact, within seven (7) days after Delivery, no restocking fee applies. The customer arranges and bears return transportation.\n\n3. Retail Customers - opened packaging - 20%. Where the packaging has been opened but the product has not been installed or used and remains in resalable condition, a restocking fee of twenty percent (20%) of the product price applies, covering inspection, repackaging, relabeling, and inventory processing.\n\n4. Professional / Wholesale Clients - 20%. Paragraph 2 does not apply to Professional / Wholesale Clients. Approved returns by Professional / Wholesale Clients are subject to a restocking fee of twenty percent (20%) of the product price.",
        8,
        "Retail customers returning unopened standard stock products within seven (7) days pay no restocking fee. Opened retail returns and approved professional or wholesale returns are subject to a twenty percent (20%) restocking fee."
      ),
      section(
        "9. Refunds",
        "Approved refunds are issued to the original payment method, less any applicable restocking fee, within five (5) business days after the dealer has received and inspected the returned product. Depending on your bank or card issuer, funds may take additional time to appear in your account.",
        9
      ),
      section(
        "10. Inspection Rights",
        "VanStro or its dealer may inspect any product before a return is approved.\n- Photographs\n- Video evidence\n- Third-party inspection\n- Physical inspection",
        10
      ),
      section(
        "11. Exclusions",
        "A return will not be accepted in the following situations:\n- Improper installation\n- Improper handling\n- Abuse or misuse\n- Customer-caused damage\n- Normal wear and tear\n- Improper storage\n- Transportation damage or loss occurring after Delivery",
        11
      ),
      section(
        "12. Policy Updates",
        "The version of this policy in effect on the date of Delivery applies to your purchase. VanStro may update this policy from time to time; updates do not affect purchases already delivered.",
        12
      )
    ],
    summaryTitle: "Need help with a return?",
    summaryBody:
      "Start with the local dealer from whom the product was purchased. VanStro can review policy escalations where dealer handling appears inconsistent with this policy.",
    supportNote: "Have your dealer name, order reference, delivery date, photos, and RMA status ready before escalating.",
    primaryCta: { label: "Contact support", href: "/contact" },
    secondaryCta: { label: "Track an order", href: "/orders/demo-order" }
  },
  {
    slug: "dealer-services-and-responsibility",
    title: "Dealer Services & Platform Responsibility Boundary Policy",
    description: "Dealer Services and Responsibility content from the VanStro legacy site.",
    intro:
      "Responsibility boundaries between VanStro as the product supply platform and independent dealers providing extended services.",
    updated: "Last updated: 2026-05-16",
    sourceSummary:
      "Boundary of responsibility between VanStro (the Platform) and its independent dealers for product supply and dealer-provided extended services. V2026-1.3",
    sections: [
      section(
        "1. Purpose",
        'This Policy defines the boundary of responsibility between VanStro Global Supply Inc. ("VanStro" or the "Platform") and its dealers in relation to product supply and dealer-provided extended services, including delivery, installation, measurement, renovation support, disposal, project coordination, and after-sales support.\n\nIt exists to keep responsibilities transparent to customers while protecting the independent operation of VanStro\'s dealer network.',
        0
      ),
      section(
        "2. Two Layers of Business",
        "Customer interactions fall into two distinct layers, each governed by a different responsible party:\n\n(a) Product Supply (Platform layer). VanStro supplies the products and is the responsible party for the products it supplies. Product orders and product payments are processed through the VanStro platform.\n\n(b) Dealer Extended Services (Dealer layer). Delivery, installation, measurement, renovation support, disposal, project coordination, and similar services are the dealer's own services. The dealer contracts directly with the customer for these services. VanStro is not a party to them.\n\nThese two layers are separate transactions, even where they relate to the same project. Unless expressly stated in writing, a product order does not include any dealer service.",
        1
      ),
      section(
        "3. VanStro Platform Responsibilities (Product Supply)",
        "As the product supply platform, VanStro is responsible for:\n- Product sourcing and supply\n- Inventory and product-information management\n- The online product catalog and ordering system\n- Product and platform promotion\n- Development of the dealer network\n\nVanStro does not directly provide, and does not hold itself out as providing: delivery, installation, site measurement, renovation, project management, disposal, or on-site support services. These are performed by dealers under Section 4, unless VanStro states otherwise in writing.",
        2
      ),
      section(
        "4. Dealer Responsibilities (Extended Services)",
        "Dealers are independently owned and operated businesses. No dealer may bind VanStro. Each dealer manages its own day-to-day operations, personnel, marketing, customer relationships, resale and service pricing, and services. A dealer may, at its own discretion, provide extended services such as:\n- Product delivery and transport\n- Installation\n- Removal and installation\n- Site measurement\n- Design consultation\n- Renovation support\n- Disposal\n- Project coordination\n- Extended service packages\n- Additional after-sales services\n\nThe availability, scope, and price of these services vary by dealer and by dealer service area. Dealer service areas record the locations where a dealer can support customers.",
        3
      ),
      section(
        "5. Customer Frontline and Escalation",
        "The local dealer is the customer's single point of contact for all enquiries, orders, delivery, returns and exchanges, services, and after-sales support. VanStro does not operate a direct-to-customer service channel for routine matters.\n\nVanStro acts as a backstop for escalation only. Where a product or policy matter is not resolved by the dealer, the customer may escalate that matter to VanStro, which will then review it.\n\nFor dealer extended services, the dealer is the responsible party. A customer may report dealer conduct to VanStro, and VanStro may take such reports into account in managing its dealer relationships, but VanStro does not thereby assume responsibility for the service itself.",
        4
      ),
      section(
        "6. Website Handling of Dealer Extended Services",
        "The VanStro website presents dealer extended services in a way that keeps the platform layer and the dealer layer clearly separated.\n\nDealer pages and mini-sites may show dealer name, ID, contact information, dealer service area, business hours, available services, indicative service pricing, appointment or enquiry forms, and a link to the dealer's own website. Every page or section that presents dealer services carries a clear notice that services are provided by the independent dealer and not by VanStro.\n\nService enquiries, quotations, and bookings submitted through a dealer page are routed to the dealer for handling. VanStro does not quote, schedule, or manage dealer services. Service requests and payments are kept separate from the product checkout flow.",
        5
      ),
      section(
        "7. Service Pricing and Payments",
        "Dealer services are separate from VanStro product sales. Service fees - which may include delivery, installation, measurement, renovation, disposal, project management, and other service charges - are set by the dealer alone. Unless stated in writing, service fees are not included in VanStro product pricing.\n\nPayment for dealer services is collected by the dealer directly; VanStro does not collect, process, or manage dealer service fees. The dealer is solely responsible for service quotations, invoicing, collection, performance, warranty, and the handling of any service dispute.",
        6
      ),
      section(
        "8. Service Liability",
        "Dealer extended services are performed by the dealer as an independent business. The dealer is solely responsible for service quality, scheduling, installation workmanship, service personnel, project execution, and service warranty.\n\nVanStro is not responsible for dealer service pricing, scheduling, workmanship, delays, or any service-related dispute. Nothing on the platform, including the display of a dealer's services, makes VanStro a party to, or guarantor of, a dealer's services.",
        7
      ),
      section(
        "9. Customer Information and Referrals",
        "At the customer's request, VanStro may provide contact information for one or more participating independent dealers that report serving the customer's location. A listing or referral does not guarantee any volume and does not require the customer or dealer to proceed. Where customer information is shared with a dealer for this purpose, it is shared only to the extent needed for the requested referral and is handled in accordance with the VanStro Privacy Policy and applicable privacy law, including PIPEDA and Quebec's Law 25.",
        8
      ),
      section(
        "10. Taxes",
        "VanStro and the dealer are each responsible for charging and remitting the applicable GST/HST and provincial sales tax on their own supplies - VanStro on the products it supplies, and the dealer on the services it provides.",
        9
      ),
      section(
        "11. Final Interpretation",
        "VanStro may update this Policy as the platform and dealer network continue to develop.",
        10
      ),
      section(
        "Appendix - Recommended On-Page Disclosure Text",
        "A. On dealer service pages:\n\"The services on this page are provided by [Dealer Name], an independent dealer, not by VanStro. When you request a service, you enter into an agreement directly with the dealer. The dealer sets its own pricing and is responsible for performing the service. VanStro supplies the products only.\"\n\nB. At handoff to a dealer's own website:\n\"You are leaving VanStro and going to [Dealer Name]'s own website. The dealer's terms, pricing, and policies will apply.\"\n\nC. On a platform-hosted dealer mini-page:\n\"This page is hosted on VanStro for [Dealer Name], an independent dealer, but it presents the dealer's own business. The services here are provided, priced, and paid for through the dealer, not VanStro. VanStro is not a party to these services and supplies the products only.\"",
        11
      )
    ],
    summaryTitle: "Interested in joining the program?",
    summaryBody:
      "Dealer applicants can review the program and submit their company details for a follow-up conversation.",
    supportNote: "Best for: dealer service boundaries, platform responsibility, service pricing handoff, and escalation routing.",
    primaryCta: { label: "Become a dealer", href: "/dealers/apply" },
    secondaryCta: { label: "Contact support", href: "/contact" }
  },
  {
    slug: "careers",
    title: "Careers",
    description: "Join Us content adapted from the VanStro legacy site.",
    intro:
      "Join the VanStro team. Share your profile, preferred work type, work authorization and available regions so the team can follow up.",
    sections: [
      section(
        "Application Information",
        "The legacy VanStro Join Us page collects a candidate's full name, phone, email, city, position applied for, work experience, expected salary, available date, and profile summary.",
        0
      ),
      section(
        "Expected Work Type",
        "Applicants can indicate whether they are looking for full-time, part-time, or internship opportunities.",
        1
      ),
      section(
        "Current Work Authorization",
        "The legacy form asks applicants to identify current work authorization, including Canadian Citizen, Permanent Resident, Work Permit, or Study Permit.",
        2
      ),
      section(
        "Available Regions",
        "Current public career and service-region communication should route through the Winnipeg team unless VanStro publishes additional openings.",
        3
      ),
      section(
        "Resume Upload",
        "Candidates can upload a resume and include a profile summary so VanStro can review fit for future roles or regional opportunities.",
        4
      )
    ],
    summaryTitle: "Want to introduce yourself?",
    summaryBody:
      "Send a short message with your background, preferred role and available region, and the team can follow up when there is a fit.",
    supportNote: "Include your work authorization, preferred region, availability, and resume or portfolio link.",
    primaryCta: { label: "Contact VanStro", href: "/contact" },
    secondaryCta: { label: "Learn about VanStro", href: "/about" }
  }
];

export const legalNavLinks: LegalPageLink[] = [
  { label: "Legal Disclaimer", shortLabel: "Disclaimer", href: "/legal-disclaimer" },
  { label: "Terms and Conditions", shortLabel: "Terms", href: "/terms-and-conditions" },
  { label: "Privacy Policy", shortLabel: "Privacy", href: "/privacy" },
  { label: "Cookie Preferences", shortLabel: "Cookies", href: "/cookie-settings" },
  { label: "Return Policy", shortLabel: "Returns", href: "/return-policy" },
  {
    label: "Dealer Services & Responsibility",
    shortLabel: "Dealer Services",
    href: "/dealer-services-and-responsibility"
  },
  { label: "Careers", shortLabel: "Careers", href: "/careers" }
];

export const footerLegalLinks: LegalPageLink[] = legalNavLinks.filter(
  (link) => link.href !== "/cookie-settings"
);

export function getLegalPageBySlug(slug: string) {
  return legalPageEntries.find((entry) => entry.slug === slug);
}

export function requireLegalPage(slug: string): LegalPageEntry {
  const entry = getLegalPageBySlug(slug);

  if (!entry) {
    throw new Error(`Missing legal page content for ${slug}.`);
  }

  return entry;
}

export function buildLegalMetadata(entry: LegalPageEntry): Metadata {
  return {
    title: entry.title,
    description: entry.description
  };
}
