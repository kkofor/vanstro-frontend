import type { Metadata } from "next";
import { DEFAULT_LOCALE, type SiteLocale } from "@/lib/i18n/locale";

// COUNSEL CONFIRMATION REQUIRED: Retain the informational-translation notice below.
// Confirm separately, for each Quebec-facing page and transaction, whether an
// English-prevails statement is valid and appropriate. No such validity is asserted here.
export const FRENCH_LEGAL_TRANSLATION_NOTICE = "Traduction à titre informatif.";

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
  translationNotice?: string;
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
    "Questions about this page or any of our legal terms may be directed to:\nVanStro Global Supply Inc.\n856 Century Street, Winnipeg, Manitoba R3H 0M5, Canada\nEmail: support@vanstro.ca\nPhone: 204-221-2288\nWebsite: vanstro.ca",
    index
  );
}

const englishLegalPageEntries: LegalPageEntry[] = [
  {
    slug: "legal-disclaimer",
    title: "Legal Disclaimer",
    description: "Legal disclaimer content from the VanStro legacy site.",
    intro:
      "Important notes about website information, product references, pricing, images, liability and governing law.",
    updated: "Last updated: May 16, 2026",
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
        "Unless expressly stated otherwise, displayed prices exclude applicable GST/HST and provincial sales taxes, including PST, RST or QST where applicable. Shipping, delivery, installation and other agreed charges may be added separately. Customs duties or import charges apply only where relevant to the transaction.",
        3,
        "Displayed prices are estimates unless expressly identified as final. Applicable taxes and separately agreed charges are confirmed in the order documents."
      ),
      section(
        "5. No Binding Offer",
        "General website content does not create a binding offer, contract, guarantee or warranty. Any applicable product warranty will be identified in the written documents provided for the product or order. Final product specifications, pricing and commercial terms are determined by the applicable order confirmation, invoice or other written sales document. Nothing in this disclaimer limits any right or remedy that cannot be excluded under applicable law.",
        4,
        "Binding terms are identified in the applicable order confirmation, invoice or other written sales document."
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
      "For binding product details, project support or order-specific guidance, contact VanStro support or the local dealer selected for the order before placing it.",
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
    updated: "Last updated: May 16, 2026",
    sourceSummary: "Effective Date: May 12, 2026",
    sections: [
      section(
        "1. Acceptance of Terms",
        'By accessing or using vanstro.ca (the "Website"), you agree to be bound by these Terms and Conditions and by our Privacy Policy and Cookie Policy. If you do not agree, you must not use the Website.',
        0
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
        'Product information and displayed prices on the Website do not constitute a binding offer. A product order becomes binding only when it is accepted in an order confirmation, invoice or other written sales document.\n\nThe "Seller" for each order is the entity identified as the seller on the applicable order confirmation or invoice. The same document identifies the applicable price, taxes, payment terms, fulfillment arrangements and any additional charges.\n\nPrices displayed before checkout are estimates unless expressly identified as final. The final product price, applicable GST/HST and provincial sales taxes, including PST, RST or QST where applicable, and any separately agreed charges are shown in the applicable order confirmation or invoice.\n\nThe local dealer selected for the order may provide local fulfillment, pickup, delivery coordination, returns handling and post-sale assistance. The local dealer is the Seller only where the applicable order confirmation or invoice identifies it as the Seller.',
        4
      ),
      section(
        "6. Warranties and Disclaimers",
        'A product is covered by an express warranty only if a written warranty is identified in the applicable product or order documents and is made available to the purchaser. Warranty coverage, duration, exclusions and claim procedures are governed by that written warranty.\n\nExcept as expressly set out in an applicable written warranty, the Website and its content are provided on an "as is" and "as available" basis to the maximum extent permitted by applicable law. Nothing in these Terms excludes or limits any statutory warranty, condition, right or remedy that cannot lawfully be excluded or limited.',
        5
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
      "Our support team can explain the current ordering process and direct policy questions to the appropriate VanStro team or local dealer.",
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
    updated: "Last updated: May 16, 2026",
    sourceSummary: "Effective Date: May 12, 2026",
    sections: [
      section(
        "1. Our Commitment",
        'VanStro Global Supply Inc. ("VanStro", "we", "our") is committed to protecting your personal information in accordance with the Personal Information Protection and Electronic Documents Act (PIPEDA), Quebec\'s Act respecting the protection of personal information in the private sector, as amended by the Act to modernize legislative provisions as regards the protection of personal information (Law 25), and other applicable Canadian privacy laws. This Policy explains what information we collect, how we use it, with whom we share it, and the rights you have.\n\nAn "independent local dealer" is an independently owned and operated dealer participating in the VanStro network. After this definition, we use "local dealer."',
        0
      ),
      section(
        "2. Privacy Officer",
        "Our Privacy Officer is responsible for compliance with this Policy. You may contact the Privacy Officer at support@vanstro.ca or by mail at 856 Century Street, Winnipeg, Manitoba R3H 0M5.",
        1,
        "Important: privacy rights requests and consent withdrawal should be directed to the Privacy Officer at support@vanstro.ca."
      ),
      section(
        "3. Information We Collect",
        "We collect personal information that you provide directly and information generated automatically as you interact with the Website:\n- Identification and contact information: name, email address, telephone number, mailing address, company name, and role.\n- Transactional information: products and services you inquire about, quotations issued, orders placed, payment status, and delivery records.\n- Technical information: IP address, browser type, device identifiers, operating system, referring URL, pages visited, and timestamps.\n- Communication records: messages you send to us, customer service tickets, and meeting notes.\n- Marketing information: subscription preferences, event registrations, and survey responses, where you provide them.\n- Applicant information: information submitted for employment or other opportunities, such as your resume or curriculum vitae, employment and education history, qualifications, profile summary, position and work-type preferences, expected salary, availability, location, work authorization, references, portfolio links, and interview or assessment notes. Please do not provide sensitive personal information that we have not requested.",
        2
      ),
      section(
        "4. Purposes of Use",
        "We use personal information for the following purposes:\n- Responding to inquiries, preparing quotations, fulfilling orders, and providing customer service.\n- Managing dealer and supplier relationships, including credit and onboarding processes.\n- Receiving and evaluating applications, verifying qualifications and references where permitted, communicating with applicants, arranging interviews or assessments, making recruitment or engagement decisions, and keeping records for legal, administrative, and future-opportunity purposes where permitted.\n- Improving the Website, our products, and our services through analytics and research.\n- Complying with legal obligations and protecting our legal rights and the safety of others.\n- Sending marketing communications about products, promotions, and events, where you have consented to receive them.",
        3
      ),
      section(
        "5. Legal Basis and Consent",
        "We collect, use, and disclose personal information only with your knowledge and consent, except where authorized or required by law. Consent may be express or implied depending on the sensitivity of the information. You may withdraw consent at any time, subject to legal or contractual restrictions and reasonable notice, by contacting our Privacy Officer.",
        4
      ),
      // BUSINESS/COUNSEL CONFIRMATION REQUIRED: Confirm whether Qingdao Wanshituo
      // Trading Co., Ltd. receives or can access personal information and, if so, its
      // actual relationship, role, data categories, purposes, locations, practices and
      // written terms. Do not characterize the entity or add it as a recipient until confirmed.
      section(
        "6. Disclosure to Third Parties",
        "We disclose personal information only as necessary to fulfill the purposes set out above, to the following categories of recipients:\n- Service providers retained to perform functions on our behalf, such as payment processing, shipping and logistics, IT hosting, design software, customer relationship management, recruitment administration and applicant assessment, under contractual obligations of confidentiality and data protection.\n- With your consent or where otherwise permitted by law, the local dealer selected for your order, to the extent reasonably necessary to arrange fulfillment, pickup, delivery, returns or post-sale assistance.\n- If you separately request installation or another dealer service, an installer or other service provider when the disclosure is necessary for the service you requested or is otherwise permitted by law.\n- Government authorities, regulators, or law enforcement, where required by law or to protect our legal rights.\n- Successors in connection with a corporate transaction, such as a merger, acquisition, or sale of assets, subject to confidentiality protections.\n\nForms identify whether information is submitted to VanStro, to a local dealer or to both before you submit it.",
        5
      ),
      // BUSINESS/COUNSEL CONFIRMATION REQUIRED: Verify actual recipients and
      // processing locations before naming any country in the disclosure below.
      section(
        "7. Cross-Border Transfers",
        "Some service providers or other recipients we use may process personal information outside Canada. When personal information is transferred outside Canada, it may be accessed by foreign courts, law enforcement, and national security authorities under the laws of the receiving country. We use contractual safeguards and security measures designed to protect personal information. Contact the Privacy Officer for information about the processing of personal information outside Canada.",
        6
      ),
      // BUSINESS/COUNSEL CONFIRMATION REQUIRED: Confirm whether applicant data is
      // collected, the actual purposes, future-opportunity use, retention period or
      // criteria, and alignment with the operational retention schedule before publication.
      section(
        "8. Retention",
        "We retain personal information only as long as necessary for the purposes for which it was collected, to fulfill our legal and contractual obligations, and to resolve disputes. Applicant records are retained for the recruitment or engagement process and, if disclosed at or before collection, for a defined period to consider the applicant for future opportunities, subject to legal requirements. The applicable period or criteria will be communicated at or before collection. When no longer required, personal information is securely destroyed or deleted, or anonymized where permitted by applicable law and for a serious and legitimate purpose, in accordance with our retention schedule.",
        7
      ),
      section(
        "9. Safeguards",
        "We maintain physical, organizational, and technical safeguards appropriate to the sensitivity of personal information, including access controls, encryption in transit, secure storage, staff confidentiality undertakings, and regular security reviews. No method of transmission or storage is completely secure; we cannot guarantee absolute security.",
        8
      ),
      section(
        "10. Your Rights",
        "Subject to applicable law and its exceptions, you may have the following rights with respect to your personal information:\n- Access: request confirmation that we hold personal information about you, obtain access to it and, where required, receive information about its use and disclosure.\n- Correction: request correction of inaccurate, incomplete or equivocal personal information.\n- Withdrawal of consent: withdraw consent to the collection, use, or disclosure of your information, subject to legal or contractual restrictions and reasonable notice; withdrawal may affect our ability to provide a requested product, service or opportunity.\n- De-indexation or cessation of dissemination: where Quebec law applies and its statutory conditions are met, request that dissemination of personal information cease or that a hyperlink providing access to it be de-indexed or re-indexed.\n- Deletion: ask us to delete personal information. This is not an absolute right; we may decline or limit the request where retention or processing remains permitted or required by law, including for legal, contractual, security, recordkeeping or dispute-management purposes.\n- Portability: where Quebec law applies, request computerized personal information collected from you in a structured, commonly used technological format. This right is subject to the statutory conditions and exceptions, including that disclosure must not raise serious practical difficulties and must not disclose personal information created or inferred from information about you.\n- Automated decisions: if a decision based exclusively on automated processing is made about you, receive notice and, on request, information required by applicable Quebec law, submit observations and request review by a person able to review the decision.\n- Complaint: file a complaint with our Privacy Officer. You may also contact the Office of the Privacy Commissioner of Canada or the applicable provincial regulator. In Quebec, the regulator is the Commission d’accès à l’information du Québec (CAI).\n\nTo exercise these rights, contact our Privacy Officer. We will respond within the period required by applicable law. For an access or correction request governed by Quebec law, the general response period is 30 days after receipt, subject to any lawful extension. We may need to verify your identity and may request information reasonably necessary to process the request.",
        9,
        "Important: VanStro will respond within 30 days after receiving a valid request, subject to identity verification."
      ),
      section(
        "11. Children's Privacy",
        "The Website is not directed to children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided personal information to us, please contact our Privacy Officer and we will take appropriate steps.",
        10
      ),
      // BUSINESS/COUNSEL CONFIRMATION REQUIRED: Verify the current-state statement
      // below against website, ordering, fraud, credit, recruitment, marketing and
      // customer-support systems before publication.
      section(
        "12. Automated Decision-Making",
        "We do not currently make decisions about you based exclusively on automated processing of personal information. If we introduce such a process, we will provide notice no later than when we inform you of the decision and, on request, provide the information required by applicable law, including the personal information used, the principal factors and parameters that led to the decision, and the right to have the personal information used corrected. Where Quebec law applies, you may submit observations to a member of our personnel who is in a position to review the decision.",
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
    supportNote: "Privacy requests should go to the Privacy Officer at support@vanstro.ca. We may need to verify your identity.",
    primaryCta: { label: "Open cookie settings", href: "/cookie-settings" },
    secondaryCta: { label: "Contact support", href: "/contact" }
  },
  {
    slug: "cookie-settings",
    title: "Cookie Preferences",
    description: "Cookie Policy content and preference controls from the VanStro legacy site.",
    intro:
      "How VanStro uses cookies and similar technologies, and how visitors can manage optional cookie categories.",
    updated: "Last updated: May 16, 2026",
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
        "Some cookies are placed by third parties acting on our behalf - for example, analytics or marketing providers. These third parties process data under contractual obligations consistent with this Policy and our Privacy Policy. A current list of categories and providers is available on request from support@vanstro.ca.",
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
        'The "Seller" for an order is the entity identified as the seller on the applicable order confirmation or invoice.\n\nThe local dealer selected for the order is the customer\'s first point of contact for pickup, delivery coordination, return requests and product-support routing. The local dealer may perform these functions on behalf of the Seller and is not necessarily the Seller.\n\nIn this Policy, "Delivery" means the handover of the products to the customer or the customer\'s authorized recipient by the local dealer or carrier. Return time periods run from the date of Delivery.\n\nThe customer should inspect the shipment at Delivery for quantity, incorrect items and visible damage. Visible shortages or damage should be noted on the delivery record and reported to the local dealer as soon as reasonably possible.\n\nDamage that could not reasonably be discovered during the initial inspection is "concealed damage." Concealed damage should be reported promptly after discovery, together with photographs of the product, packaging and shipping labels where available.\n\nSigning a delivery record confirms receipt only. It does not waive a claim for concealed damage, a product defect or any statutory right that cannot be waived.\n\nTitle and risk of loss pass at the time stated in the applicable sales document, subject to applicable law. Risk does not pass before the products are delivered to the customer or the customer\'s authorized recipient.\n\nHome delivery, installation and other on-site services are arranged separately with the relevant local dealer unless expressly included in the order documents.',
        3,
        "Inspect visible condition at Delivery and report concealed damage promptly after discovery. Signing confirms receipt only."
      ),
      section(
        "4. Return Authorization",
        'Before sending or bringing back a product, contact the local dealer selected for the order to request return authorization. If the return is eligible, the local dealer will provide a Return Merchandise Authorization ("RMA") number and return instructions.\n\nThe local dealer is responsible for obtaining any internal approval required from VanStro. Do not return a product before receiving the RMA number and instructions. Nothing in this process limits a statutory right or remedy that cannot be waived.',
        4,
        "Contact your local dealer for an RMA number and return instructions before returning a product."
      ),
      section(
        "5. Complaints and Escalation to VanStro",
        "Return requests are routed through the local dealer. If the local dealer does not follow this Policy, or the customer considers its handling unreasonable, the customer may complain to VanStro at complaints@vanstro.ca.\n\nVanStro will review whether the product-return requirements were correctly applied and, where appropriate, address the product-supply issue within VanStro's responsibility.",
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
        "1. Our error - no charge. Where a return results from an incorrect product supplied, a shipping error, or damage occurring before Delivery, no charge applies. The local dealer coordinates the replacement or refund process, including return transportation.\n\nA return request concerns a change of mind or another return permitted by this Policy. A claim that a product was defective, misdescribed or not of acceptable quality will be assessed under the applicable sales documents and applicable law. If an express written product warranty applies, its coverage and claim procedure will be identified in the documents provided for the product or order. Nothing in this Policy limits any statutory right or remedy.\n\n2. Retail Customers - unopened packaging - no restocking fee. Where a Retail Customer returns a standard stock product in its original packaging, unopened and with seals intact, within seven (7) days after Delivery, no restocking fee applies. The customer arranges and bears return transportation.\n\n3. Retail Customers - opened packaging - 20%. Where the packaging has been opened but the product has not been installed or used and remains in resalable condition, a restocking fee of twenty percent (20%) of the product price applies, covering inspection, repackaging, relabeling, and inventory processing.\n\n4. Professional / Wholesale Clients - 20%. Paragraph 2 does not apply to Professional / Wholesale Clients. Approved returns by Professional / Wholesale Clients are subject to a restocking fee of twenty percent (20%) of the product price.\n\nRestocking charges apply only to eligible change-of-mind returns. They do not apply to an incorrect product, pre-delivery damage, a product defect or any circumstance in which applicable law requires another remedy.",
        8,
        "Eligible change-of-mind returns may be subject to restocking charges; incorrect, damaged or defective products are assessed separately."
      ),
      section(
        "9. Refunds",
        "Where a refund is approved, the Seller or its authorized payment processor will issue the refund to the original payment method, less any lawful restocking fee, within five (5) business days after the returned product has been received and inspected. If the original payment method is unavailable, the Seller will provide another lawful refund method. Processing times imposed by a bank or payment provider are outside the Seller's control.",
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
    title: "VanStro and Local Dealer Responsibilities",
    description: "How product orders and separately offered local dealer services are handled.",
    intro:
      "Which parts of a product order are handled through VanStro and which services may be provided separately by a local dealer.",
    updated: "Last updated: May 16, 2026",
    sourceSummary: "Product-order and local dealer service responsibilities. Version 2026-1.3",
    sections: [
      section(
        "1. Purpose and Definitions",
        'This page explains which parts of a product order are handled through VanStro and which services may be provided separately by an independent local dealer.\n\nAn "independent local dealer" is an independently owned and operated business participating in the VanStro network. After this definition, we use "local dealer."\n\nThe "Seller" is the entity identified as the seller on the applicable order confirmation or invoice. "Dealer Services" are delivery, installation, measurement, renovation, disposal or other services separately quoted and provided by a local dealer.',
        0
      ),
      section(
        "2. Product Orders and Seller Identification",
        "The Seller for each product order is identified on the applicable order confirmation or invoice. Product payments may be processed through the VanStro website or an authorized payment provider for the Seller identified in that document.\n\nThe local dealer selected for the order may handle local inventory, pickup, delivery coordination, returns and post-sale assistance. These fulfillment activities do not by themselves determine whether the local dealer or VanStro is the Seller.\n\nOrder fulfillment means preparing the product for pickup or another delivery method stated in the order documents. Home delivery, site delivery, installation and other on-site services are separate Dealer Services unless the order documents expressly include them.",
        1
      ),
      section(
        "3. VanStro Responsibilities",
        "VanStro manages:\n- Product sourcing and supply coordination\n- Product and inventory information\n- The online catalog and ordering system\n- Product information and network support\n\nThe applicable order documents identify the Seller, product price, taxes, payment terms and included fulfillment arrangements. VanStro does not provide installation, site measurement, renovation, disposal or other on-site services unless expressly stated in writing.",
        2
      ),
      section(
        "4. Local Dealer Responsibilities",
        "Local dealers are independently owned and operated businesses. A local dealer manages its own personnel, marketing, customer relationships, service pricing and Dealer Services. A local dealer may offer:\n- Home or site delivery\n- Installation\n- Site measurement\n- Design consultation\n- Renovation support\n- Removal or disposal\n- Project coordination\n- Additional after-sales services\n\nThe availability, scope and price of Dealer Services vary by local dealer and service area.",
        3
      ),
      section(
        "5. Customer Contact and Escalation",
        "For routine order matters, the selected local dealer is the customer's primary contact for availability, pickup, delivery coordination, return requests and post-sale assistance.\n\nA customer may escalate an unresolved product or policy matter to VanStro for review. For separately quoted Dealer Services, the local dealer is the responsible service provider. Reporting dealer conduct to VanStro does not make VanStro a party to the service agreement.",
        4
      ),
      section(
        "6. Dealer Services on the Website",
        "A dealer page may display the local dealer's contact information, service area, business hours, available services and enquiry options. Dealer Services shown on such a page are provided by the local dealer, not by VanStro.\n\nService enquiries, quotations and bookings are routed to the local dealer. Dealer Service requests and payments are separate from the product checkout flow unless the applicable order documents expressly state otherwise.",
        5
      ),
      section(
        "7. Service Pricing, Payment and Warranty",
        "The local dealer sets the scope, price and schedule for its separately offered Dealer Services and collects payment for those services directly. Unless expressly included in the applicable order documents, Dealer Service fees are not included in the product price.\n\nThe local dealer is solely responsible for its separate service quotation, invoice, payment collection, scheduling, personnel, workmanship and any service warranty it offers. A dealer service warranty does not replace or modify any product warranty or statutory product right.",
        6
      ),
      section(
        "8. Service Responsibility",
        "Dealer Services are performed by the local dealer as an independent business. The local dealer is responsible for service quality, scheduling, personnel, workmanship and project execution.\n\nVanStro is not a party to, or guarantor of, a separate Dealer Service agreement unless VanStro expressly agrees otherwise in writing.",
        7
      ),
      section(
        "9. Customer Information and Referrals",
        "At the customer's request, VanStro may provide contact information for local dealers that indicate they serve the customer's location. A listing or referral does not require the customer or local dealer to proceed. Customer information is shared only as described in the VanStro Privacy Policy and as permitted by applicable law.",
        8
      ),
      section(
        "10. Taxes",
        "The party making a taxable supply is responsible for charging, collecting and remitting the taxes it is legally required to collect for that supply.\n\nDepending on the province or territory and the nature of the transaction, applicable taxes may include GST/HST and provincial sales taxes, including PST, RST or QST. The applicable invoice identifies the supplier, taxable amounts and taxes charged.",
        9
      ),
      section(
        "11. Policy Updates",
        "VanStro may update this page as its ordering process and local dealer network develop. The updated version applies from the date shown on this page, subject to applicable law.",
        10
      )
    ],
    summaryTitle: "Need help understanding responsibilities?",
    summaryBody:
      "Contact VanStro for product-policy questions or your selected local dealer for availability, pickup, delivery coordination and separately offered local services.",
    supportNote: "Product orders and Dealer Services are separate unless the order documents expressly include both.",
    primaryCta: { label: "Contact support", href: "/contact" },
    secondaryCta: { label: "Become a dealer", href: "/dealers/apply" }
  },
  {
    slug: "careers",
    title: "Careers",
    description: "Learn how to express interest in career opportunities with VanStro.",
    intro:
      "VanStro currently accepts general expressions of interest through the contact page. Published openings and their requirements will be listed on this website when available.",
    sections: [
      section(
        "How to Get in Touch",
        "Use the contact page to send a brief introduction and describe the type of role that interests you. This is a general inquiry, not a formal job application or a promise that a position is available.",
        0
      ),
      section(
        "Information You May Include",
        "You may include your relevant background, preferred type of work, location, availability, and any work-authorization information that is relevant to the role you are seeking. Please do not provide sensitive personal information that we have not requested.",
        1
      ),
      section(
        "Résumé or Portfolio",
        "This website does not currently accept résumé uploads. If helpful, include a link to a résumé, portfolio, or professional profile in your message.",
        2
      ),
      section(
        "What Happens Next",
        "VanStro reviews career inquiries against current business needs. We may contact you if further information or a conversation is appropriate, but we cannot guarantee a response, interview, or employment opportunity.",
        3
      )
    ],
    summaryTitle: "Interested in working with VanStro?",
    summaryBody:
      "Send a brief introduction through the contact page. The team will provide next steps if there is a suitable opening.",
    supportNote: "Choose Careers as the contact topic. Include a résumé or portfolio link only if you want VanStro to review it.",
    primaryCta: { label: "Contact VanStro", href: "/contact?topic=careers" },
    secondaryCta: { label: "Learn about VanStro", href: "/about" }
  }
];

const frenchContact = (index: number) => section(
  "Nous joindre",
  "Toute question concernant cette page ou l’une de nos conditions juridiques peut être adressée à :\nVanStro Global Supply Inc.\n856 Century Street, Winnipeg (Manitoba) R3H 0M5, Canada\nCourriel : support@vanstro.ca\nTéléphone : 204-221-2288\nSite Web : vanstro.ca",
  index
);

const frenchLegalPageEntries: LegalPageEntry[] = [
  {
    slug: "legal-disclaimer",
    title: "Avis juridique",
    description: "Contenu de l’avis juridique provenant de l’ancien site de VanStro.",
    intro: "Renseignements importants concernant l’information du site Web, les références aux produits, les prix, les images, la responsabilité et le droit applicable.",
    updated: "Dernière mise à jour : 16 mai 2026",
    sourceSummary: "Date d’entrée en vigueur : 12 mai 2026",
    translationNotice: FRENCH_LEGAL_TRANSLATION_NOTICE,
    sections: [
      section("1. À titre informatif seulement", "Les renseignements, spécifications, dimensions, images, prix et autres contenus présentés sur ce site Web sont fournis uniquement à des fins générales d’information et de présentation et ne constituent aucun conseil professionnel de quelque nature que ce soit.", 0),
      section("2. Modifications sans préavis", "Toutes les spécifications, conceptions, matières, finitions, couleurs et dimensions des produits ainsi que tous les prix peuvent être modifiés en tout temps sans préavis. VanStro Global Supply Inc. se réserve le droit de mettre à jour, de modifier ou d’abandonner tout produit ou contenu, à son entière discrétion.", 1),
      section("3. Images des produits", "Les images des produits peuvent différer des produits réels en raison des variations de fabrication, des réglages d’écran, de l’éclairage et des différences propres aux matières naturelles. Le grain du bois, les veinures de la pierre et les autres finitions naturelles sont intrinsèquement uniques; aucune unité ne sera identique à une autre.", 2),
      section("4. Prix et frais", "Sauf indication expresse contraire, les prix affichés excluent la TPS/TVH applicable et les taxes de vente provinciales, y compris la TVP, la TVD ou la TVQ, selon le cas. Les frais d’expédition, de livraison, d’installation et autres frais convenus peuvent être ajoutés séparément. Les droits de douane ou frais d’importation ne s’appliquent que lorsqu’ils sont pertinents à l’opération.", 3, "Les prix affichés sont des estimations, sauf s’ils sont expressément indiqués comme définitifs. Les taxes applicables et les frais convenus séparément sont confirmés dans les documents de commande."),
      section("5. Aucune offre ferme", "Le contenu général du site Web ne crée aucune offre ferme, aucun contrat, aucune promesse de résultat (« guarantee ») ni aucune garantie de produit (« warranty »). Toute garantie de produit applicable sera indiquée dans les documents écrits fournis pour le produit ou la commande. Les spécifications finales du produit, les prix et les conditions commerciales sont déterminés dans la confirmation de commande, la facture ou tout autre document de vente écrit applicable. Le présent avis ne limite aucun droit ni recours qui ne peut être exclu en vertu du droit applicable.", 4, "Les conditions ayant force obligatoire sont indiquées dans la confirmation de commande, la facture ou tout autre document de vente écrit applicable."),
      section("6. Exactitude et limitation de responsabilité", "VanStro Global Supply Inc. déploie des efforts raisonnables pour assurer l’exactitude des renseignements publiés sur ce site Web, mais ne garantit pas que le contenu est complet, à jour ou exempt d’erreurs. Dans toute la mesure permise par le droit applicable, VanStro Global Supply Inc. décline toute responsabilité à l’égard des erreurs, omissions ou inexactitudes typographiques, ainsi que de tout dommage direct, indirect, accessoire, particulier ou consécutif découlant du fait de se fier aux renseignements contenus sur ce site Web.", 5),
      section("7. Réserve de droits", "VanStro Global Supply Inc. se réserve le droit d’interpréter, de modifier, de mettre à jour ou d’abandonner tout contenu, produit, prix ou service décrit sur ce site Web, en tout temps et sans préavis.", 6),
      section("8. Liens de tiers", "Ce site Web peut contenir des liens vers des sites Web ou des ressources de tiers. Ces liens sont fournis uniquement pour votre commodité. VanStro Global Supply Inc. n’exerce aucun contrôle sur le contenu de ces sites externes et n’est pas responsable de leur disponibilité, de leur exactitude ni de leur contenu.", 7),
      section("9. Droit applicable", "Le présent avis est régi par les lois de la province du Manitoba et les lois fédérales du Canada qui s’y appliquent, sans égard aux principes relatifs aux conflits de lois.", 8),
      frenchContact(9)
    ],
    summaryTitle: "Besoin d’une réponse confirmée?",
    summaryBody: "Pour obtenir des renseignements sur les produits ayant force obligatoire, du soutien relatif à un projet ou des conseils propres à une commande, communiquez avec le soutien de VanStro ou le détaillant local choisi pour la commande avant de la passer.",
    supportNote: "Pertinent pour : spécifications des produits, références de prix, renseignements du site Web et confirmation des devis.",
    primaryCta: { label: "Communiquer avec le soutien", href: "/contact" },
    secondaryCta: { label: "Magasiner les produits", href: "/products" }
  },
  {
    slug: "terms-and-conditions",
    title: "Conditions générales",
    description: "Contenu des conditions générales provenant de l’ancien site de VanStro.",
    intro: "Conditions régissant l’accès au site Web de VanStro, les utilisations permises, les références de prix, la propriété intellectuelle et les responsabilités juridiques.",
    updated: "Dernière mise à jour : 16 mai 2026",
    sourceSummary: "Date d’entrée en vigueur : 12 mai 2026",
    translationNotice: FRENCH_LEGAL_TRANSLATION_NOTICE,
    sections: [
      section("1. Acceptation des conditions", "En accédant à vanstro.ca (le « Site Web ») ou en l’utilisant, vous acceptez d’être lié par les présentes conditions générales ainsi que par notre Politique de confidentialité et notre Politique relative aux témoins. Si vous ne les acceptez pas, vous ne devez pas utiliser le Site Web.", 0),
      section("2. Admissibilité", "Le Site Web est destiné aux utilisateurs commerciaux et aux consommateurs adultes situés au Canada. En utilisant le Site Web, vous déclarez avoir au moins atteint l’âge de la majorité dans votre province de résidence et avoir la capacité juridique de conclure des ententes ayant force obligatoire.", 1),
      section("3. Utilisation permise", "Vous pouvez utiliser le Site Web pour consulter des renseignements sur les produits, demander des devis, communiquer avec notre équipe et accéder aux ressources accessibles au public. Vous acceptez de ne pas :\n- nuire au fonctionnement ou à la sécurité du Site Web;\n- tenter d’obtenir un accès non autorisé à un système, à un compte ou à des données;\n- utiliser des outils automatisés pour extraire, recueillir ou prélever du contenu à des fins commerciales sans consentement écrit;\n- téléverser, transmettre ou distribuer des virus, du code malveillant ou du contenu illicite;\n- utiliser le Site Web de manière à porter atteinte aux droits de propriété intellectuelle, à la vie privée ou aux autres droits de quiconque.", 2),
      section("4. Propriété intellectuelle", "Tout le contenu du Site Web — y compris les textes, éléments graphiques, images de produits, logos, dessins techniques et logiciels — appartient à VanStro Global Supply Inc. ou à ses concédants et est protégé par les lois canadiennes et internationales sur la propriété intellectuelle. Vous ne pouvez copier, reproduire, distribuer ou publier une partie du Site Web ni créer des œuvres dérivées de celle-ci sans consentement écrit préalable, sauf à des fins de consultation personnelle et non commerciale.", 3),
      section("5. Devis, commandes et prix", "Les renseignements sur les produits et les prix affichés sur le Site Web ne constituent pas une offre ferme. Une commande de produit ne devient obligatoire que lorsqu’elle est acceptée dans une confirmation de commande, une facture ou un autre document de vente écrit.\n\nLe « Vendeur » de chaque commande est l’entité désignée comme vendeur dans la confirmation de commande ou la facture applicable. Le même document indique le prix applicable, les taxes, les modalités de paiement, les dispositions d’exécution et tous frais supplémentaires.\n\nLes prix affichés avant le paiement sont des estimations, sauf s’ils sont expressément indiqués comme définitifs. Le prix final du produit, la TPS/TVH et les taxes de vente provinciales applicables, y compris la TVP, la TVD ou la TVQ, selon le cas, ainsi que tous frais convenus séparément figurent dans la confirmation de commande ou la facture applicable.\n\nLe détaillant local choisi pour la commande peut assurer l’exécution locale, le ramassage, la coordination de la livraison, le traitement des retours et l’assistance après-vente. Le détaillant local n’est le Vendeur que lorsque la confirmation de commande ou la facture applicable le désigne comme tel.", 4),
      section("6. Garanties et exclusions", "Un produit n’est couvert par une garantie expresse que si une garantie écrite est indiquée dans les documents applicables au produit ou à la commande et est mise à la disposition de l’acheteur. La couverture, la durée, les exclusions et la procédure de réclamation sont régies par cette garantie écrite.\n\nSauf disposition expresse d’une garantie écrite applicable, le Site Web et son contenu sont fournis « tels quels » et « selon leur disponibilité », dans toute la mesure permise par le droit applicable. Les présentes conditions n’excluent ni ne limitent aucune garantie légale, condition, aucun droit ni recours qui ne peut légalement être exclu ou limité.", 5),
      section("7. Limitation de responsabilité", "Dans toute la mesure permise par le droit applicable, VanStro Global Supply Inc. et les membres de son groupe, ses dirigeants, employés et mandataires ne peuvent être tenus responsables de dommages indirects, accessoires, particuliers, consécutifs ou punitifs, ni d’une perte de bénéfices, de revenus, de données ou d’achalandage découlant de l’utilisation du Site Web ou de l’impossibilité de l’utiliser, ou s’y rapportant. Les présentes conditions ne limitent ni n’excluent aucune responsabilité qui ne peut être limitée ou exclue en vertu des lois applicables sur la protection du consommateur.", 6),
      section("8. Indemnisation", "Vous acceptez d’indemniser et de tenir à couvert VanStro Global Supply Inc. et les membres de son groupe à l’égard de toute réclamation, demande, perte, responsabilité ou dépense (y compris les frais juridiques raisonnables) découlant de votre violation des présentes conditions ou de votre utilisation abusive du Site Web.", 7),
      section("9. Modifications", "VanStro Global Supply Inc. peut réviser les présentes conditions en tout temps en publiant une version mise à jour sur le Site Web. Les conditions révisées entrent en vigueur à la date de leur publication. Le fait de continuer à utiliser le Site Web après cette date constitue une acceptation des conditions révisées.", 8),
      section("10. Résiliation", "VanStro Global Supply Inc. peut, à son entière discrétion et sans préavis, suspendre ou résilier votre accès au Site Web si elle estime que vous avez contrevenu aux présentes conditions ou au droit applicable.", 9),
      section("11. Droit applicable et compétence", "Les présentes conditions sont régies par les lois de la province du Manitoba et les lois fédérales du Canada qui s’y appliquent. Tout différend découlant des présentes conditions ou du Site Web, ou s’y rapportant, doit être porté devant les tribunaux situés à Winnipeg, au Manitoba, sous réserve du droit des consommateurs d’intenter une procédure devant les tribunaux de leur province de résidence lorsque le droit applicable l’exige.", 10),
      section("12. Divisibilité", "Si une disposition des présentes conditions est jugée invalide ou inexécutoire, elle sera dissociée et les autres dispositions demeureront pleinement en vigueur.", 11),
      section("13. Intégralité de l’entente", "Les présentes conditions, conjointement avec la Politique de confidentialité, la Politique relative aux témoins, l’Avis juridique et tous les documents contractuels émis par VanStro Global Supply Inc., constituent l’intégralité de l’entente entre vous et VanStro Global Supply Inc. concernant le Site Web.", 12),
      frenchContact(13)
    ],
    summaryTitle: "Des questions sur les conditions de commande?",
    summaryBody: "Notre équipe de soutien peut expliquer le processus de commande actuel et acheminer les questions de politique à l’équipe de VanStro ou au détaillant local approprié.",
    supportNote: "Pertinent pour : conditions des devis, documents de commande, acheminement des demandes de garantie de produit et questions sur les conditions du site Web.",
    primaryCta: { label: "Communiquer avec le soutien", href: "/contact" },
    secondaryCta: { label: "Voir la politique de retour", href: "/return-policy" }
  },
  {
    slug: "privacy",
    title: "Politique de confidentialité",
    description: "Contenu de la Politique de confidentialité provenant de l’ancien site de VanStro.",
    intro: "Façon dont VanStro recueille, utilise, communique, protège et conserve les renseignements personnels conformément aux lois canadiennes sur la protection de la vie privée.",
    updated: "Dernière mise à jour : 16 mai 2026",
    sourceSummary: "Date d’entrée en vigueur : 12 mai 2026",
    translationNotice: FRENCH_LEGAL_TRANSLATION_NOTICE,
    sections: [
      section("1. Notre engagement", "VanStro Global Supply Inc. (« VanStro », « nous », « notre ») s’engage à protéger vos renseignements personnels conformément à la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE), à la Loi sur la protection des renseignements personnels dans le secteur privé, telle que modifiée par la Loi modernisant des dispositions législatives en matière de protection des renseignements personnels (loi 25), et aux autres lois canadiennes applicables en matière de protection de la vie privée. La présente Politique explique les renseignements que nous recueillons, l’utilisation que nous en faisons, les personnes auxquelles nous les communiquons et les droits dont vous disposez.\n\nUn « détaillant local indépendant » est un détaillant détenu et exploité de façon indépendante qui participe au réseau VanStro. Après cette définition, nous employons « détaillant local ».", 0),
      section("2. Responsable de la protection des renseignements personnels", "Notre responsable de la protection des renseignements personnels veille au respect de la présente Politique. Vous pouvez communiquer avec cette personne à support@vanstro.ca ou par la poste au 856 Century Street, Winnipeg (Manitoba) R3H 0M5.", 1, "Important : les demandes relatives aux droits à la vie privée et au retrait du consentement doivent être adressées au responsable de la protection des renseignements personnels à support@vanstro.ca."),
      section("3. Renseignements que nous recueillons", "Nous recueillons les renseignements personnels que vous fournissez directement ainsi que les renseignements générés automatiquement lorsque vous interagissez avec le Site Web :\n- Renseignements d’identification et coordonnées : nom, adresse courriel, numéro de téléphone, adresse postale, nom de l’entreprise et fonction.\n- Renseignements transactionnels : produits et services au sujet desquels vous vous renseignez, devis émis, commandes passées, état du paiement et dossiers de livraison.\n- Renseignements techniques : adresse IP, type de navigateur, identifiants de l’appareil, système d’exploitation, URL de provenance, pages consultées et horodatages.\n- Dossiers de communication : messages que vous nous envoyez, billets du service à la clientèle et notes de réunion.\n- Renseignements de marketing : préférences d’abonnement, inscriptions à des événements et réponses aux sondages, lorsque vous les fournissez.\n- Renseignements sur les personnes candidates : renseignements transmis pour un emploi ou une autre occasion, comme le curriculum vitæ, les antécédents professionnels et scolaires, les qualifications, le résumé de profil, les préférences de poste et de type de travail, le salaire attendu, les disponibilités, le lieu, l’autorisation de travail, les références, les liens vers un portfolio et les notes d’entrevue ou d’évaluation. Veuillez ne pas fournir de renseignements personnels sensibles que nous n’avons pas demandés.", 2),
      section("4. Fins de l’utilisation", "Nous utilisons les renseignements personnels aux fins suivantes :\n- Répondre aux demandes, préparer des devis, exécuter les commandes et fournir le service à la clientèle.\n- Gérer les relations avec les détaillants et les fournisseurs, y compris les processus de crédit et d’intégration.\n- Recevoir et évaluer les candidatures, vérifier les qualifications et les références lorsque la loi le permet, communiquer avec les personnes candidates, organiser des entrevues ou des évaluations, prendre des décisions de recrutement ou d’engagement et conserver des dossiers à des fins juridiques, administratives et de possibilités futures lorsque la loi le permet.\n- Améliorer le Site Web, nos produits et nos services au moyen d’analyses et de recherches.\n- Respecter les obligations légales et protéger nos droits ainsi que la sécurité d’autrui.\n- Envoyer des communications de marketing sur les produits, promotions et événements lorsque vous avez consenti à les recevoir.", 3),
      section("5. Fondement juridique et consentement", "Nous recueillons, utilisons et communiquons des renseignements personnels uniquement à votre connaissance et avec votre consentement, sauf lorsque la loi l’autorise ou l’exige. Selon la sensibilité des renseignements, le consentement peut être exprès ou implicite. Vous pouvez retirer votre consentement en tout temps, sous réserve de restrictions légales ou contractuelles et d’un préavis raisonnable, en communiquant avec notre responsable de la protection des renseignements personnels.", 4),
      // CONFIRMATION PAR L’ENTREPRISE ET LE CONSEILLER JURIDIQUE REQUISE : confirmer
      // si Qingdao Wanshituo Trading Co., Ltd. reçoit des renseignements personnels ou
      // peut y accéder ainsi que sa relation, son rôle, les données, les fins, les lieux,
      // les pratiques et les modalités écrites. Ne pas qualifier ni ajouter ce destinataire avant confirmation.
      section("6. Communication à des tiers", "Nous communiquons des renseignements personnels uniquement dans la mesure nécessaire à la réalisation des fins énoncées ci-dessus, aux catégories de destinataires suivantes :\n- Fournisseurs de services retenus pour exercer des fonctions en notre nom, notamment le traitement des paiements, l’expédition et la logistique, l’hébergement informatique, les logiciels de conception, la gestion de la relation client, l’administration du recrutement et l’évaluation des candidatures, sous réserve d’obligations contractuelles de confidentialité et de protection des données.\n- Avec votre consentement ou lorsque la loi le permet autrement, le détaillant local choisi pour votre commande, dans la mesure raisonnablement nécessaire pour organiser l’exécution, le ramassage, la livraison, les retours ou l’assistance après-vente.\n- Si vous demandez séparément une installation ou un autre service de détaillant, un installateur ou un autre fournisseur de services lorsque la communication est nécessaire au service demandé ou autrement permise par la loi.\n- Les autorités gouvernementales, organismes de réglementation ou organismes d’application de la loi lorsque la loi l’exige ou afin de protéger nos droits.\n- Les successeurs dans le cadre d’une opération commerciale, comme une fusion, une acquisition ou une vente d’actifs, sous réserve de mesures de protection de la confidentialité.\n\nAvant l’envoi, les formulaires indiquent si les renseignements sont transmis à VanStro, à un détaillant local ou aux deux.", 5),
      // CONFIRMATION PAR L’ENTREPRISE ET LE CONSEILLER JURIDIQUE REQUISE : vérifier
      // les destinataires et lieux réels de traitement avant de nommer un pays.
      section("7. Transferts transfrontaliers", "Certains fournisseurs de services ou autres destinataires que nous utilisons peuvent traiter des renseignements personnels à l’extérieur du Canada. Lorsque des renseignements personnels sont transférés à l’extérieur du Canada, ils peuvent être accessibles aux tribunaux, aux organismes d’application de la loi et aux autorités de sécurité nationale étrangers en vertu des lois du pays destinataire. Nous employons des garanties contractuelles et des mesures de sécurité conçues pour protéger les renseignements personnels. Communiquez avec le responsable de la protection des renseignements personnels pour obtenir de l’information sur le traitement des renseignements personnels à l’extérieur du Canada.", 6),
      // CONFIRMATION PAR L’ENTREPRISE ET LE CONSEILLER JURIDIQUE REQUISE : confirmer
      // la collecte de données de candidature, les fins, l’utilisation future, la période
      // ou les critères de conservation et leur concordance opérationnelle avant publication.
      section("8. Conservation", "Nous ne conservons les renseignements personnels que pendant la période nécessaire aux fins pour lesquelles ils ont été recueillis, au respect de nos obligations légales et contractuelles et au règlement des différends. Les dossiers de candidature sont conservés pendant le processus de recrutement ou d’engagement et, si cette fin est indiquée au plus tard au moment de la collecte, pendant une période déterminée afin de considérer la candidature pour de futures occasions, sous réserve des exigences légales. La période applicable ou les critères servant à la déterminer seront communiqués au plus tard au moment de la collecte. Lorsqu’ils ne sont plus nécessaires, les renseignements personnels sont détruits ou supprimés de façon sécuritaire, ou anonymisés lorsque le droit applicable le permet et à des fins sérieuses et légitimes, conformément à notre calendrier de conservation.", 7),
      section("9. Mesures de protection", "Nous maintenons des mesures de protection matérielles, organisationnelles et techniques adaptées à la sensibilité des renseignements personnels, y compris des contrôles d’accès, le chiffrement en transit, un stockage sécurisé, des engagements de confidentialité du personnel et des examens de sécurité réguliers. Aucune méthode de transmission ou de stockage n’est entièrement sûre; nous ne pouvons garantir une sécurité absolue.", 8),
      section("10. Vos droits", "Sous réserve du droit applicable, de ses conditions et de ses exceptions, vous pouvez disposer des droits suivants à l’égard de vos renseignements personnels :\n- Accès : demander la confirmation que nous détenons des renseignements personnels à votre sujet, y avoir accès et, lorsque la loi l’exige, obtenir de l’information sur leur utilisation et leur communication.\n- Rectification : demander la correction de renseignements personnels inexacts, incomplets ou équivoques.\n- Retrait du consentement : retirer votre consentement à la collecte, à l’utilisation ou à la communication de vos renseignements, sous réserve des restrictions légales ou contractuelles et d’un préavis raisonnable; ce retrait peut limiter notre capacité à fournir un produit, un service ou une occasion demandés.\n- Cessation de la diffusion ou désindexation : lorsque la législation québécoise s’applique et que ses conditions sont remplies, demander la cessation de la diffusion de renseignements personnels ou la désindexation ou la réindexation d’un hyperlien qui permet d’y accéder.\n- Suppression : nous demander de supprimer des renseignements personnels. Ce droit n’est pas absolu; nous pouvons refuser ou limiter la demande lorsque la conservation ou le traitement demeure permis ou exigé par la loi, notamment à des fins juridiques, contractuelles, de sécurité, de tenue de dossiers ou de gestion des différends.\n- Portabilité : lorsque la législation québécoise s’applique, demander que les renseignements personnels informatisés recueillis auprès de vous vous soient communiqués ou soient, à votre demande, communiqués à une personne ou à un organisme autorisé dans un format technologique structuré et couramment utilisé. Ce droit est assujetti aux conditions et exceptions prévues par la loi, notamment lorsque la communication soulève des difficultés pratiques sérieuses, et ne vise pas les renseignements créés ou inférés à partir de renseignements vous concernant.\n- Décisions automatisées : si une décision fondée exclusivement sur un traitement automatisé est prise à votre sujet, recevoir l’avis requis et, sur demande, les renseignements exigés par la législation québécoise applicable, présenter vos observations et demander un examen par une personne en mesure de réviser la décision.\n- Plainte : déposer une plainte auprès de notre responsable de la protection des renseignements personnels. Vous pouvez également communiquer avec le Commissariat à la protection de la vie privée du Canada ou l’organisme provincial compétent. Au Québec, cet organisme est la Commission d’accès à l’information du Québec (CAI).\n\nPour exercer ces droits, communiquez avec notre responsable de la protection des renseignements personnels. Nous répondrons dans le délai prévu par le droit applicable. Pour une demande d’accès ou de rectification régie par la législation québécoise, le délai de réponse général est de 30 jours suivant sa réception, sous réserve de toute prolongation permise par la loi. Nous pourrions devoir vérifier votre identité et demander les renseignements raisonnablement nécessaires au traitement de la demande.", 9, "Important : les droits et les délais dépendent du droit applicable, de ses conditions et de ses exceptions."),
      section("11. Vie privée des enfants", "Le Site Web ne s’adresse pas aux enfants de moins de 13 ans. Nous ne recueillons pas sciemment de renseignements personnels auprès d’enfants. Si vous croyez qu’un enfant nous a fourni des renseignements personnels, veuillez communiquer avec notre responsable de la protection des renseignements personnels; nous prendrons alors les mesures appropriées.", 10),
      // CONFIRMATION PAR L’ENTREPRISE ET LE CONSEILLER JURIDIQUE REQUISE : vérifier
      // l’énoncé actuel ci-dessous dans tous les systèmes pertinents avant publication.
      section("12. Prise de décision automatisée", "Nous ne prenons actuellement aucune décision à votre sujet fondée exclusivement sur un traitement automatisé de renseignements personnels. Si nous instaurons un tel processus, nous fournirons l’avis requis au plus tard lorsque nous vous informerons de la décision et, sur demande, les renseignements exigés par le droit applicable, notamment les renseignements personnels utilisés, les principaux facteurs et paramètres ayant mené à la décision et le droit de faire rectifier les renseignements personnels utilisés. Lorsque la législation québécoise s’applique, vous pourrez présenter vos observations à un membre de notre personnel en mesure de réviser la décision.", 11),
      section("13. Modifications de la présente Politique", "Nous pouvons mettre à jour la présente Politique de temps à autre. La Politique mise à jour sera publiée sur le Site Web avec une date d’entrée en vigueur révisée. Nous vous encourageons à la consulter périodiquement.", 12),
      frenchContact(13)
    ],
    summaryTitle: "Contrôles des témoins",
    summaryBody: "Les visiteurs peuvent régler leurs préférences relatives aux témoins facultatifs sans quitter le site.",
    supportNote: "Les demandes relatives à la vie privée doivent être envoyées au responsable de la protection des renseignements personnels à support@vanstro.ca. Nous pourrions devoir vérifier votre identité.",
    primaryCta: { label: "Ouvrir les paramètres des témoins", href: "/cookie-settings" },
    secondaryCta: { label: "Communiquer avec le soutien", href: "/contact" }
  },
  {
    slug: "cookie-settings",
    title: "Préférences relatives aux témoins",
    description: "Contenu de la Politique relative aux témoins et contrôles des préférences provenant de l’ancien site de VanStro.",
    intro: "Façon dont VanStro utilise les témoins et technologies semblables et dont les visiteurs peuvent gérer les catégories de témoins facultatifs.",
    updated: "Dernière mise à jour : 16 mai 2026",
    sourceSummary: "Date d’entrée en vigueur : 12 mai 2026",
    translationNotice: FRENCH_LEGAL_TRANSLATION_NOTICE,
    sections: [
      section("1. Que sont les témoins?", "Un témoin est un petit fichier texte placé sur votre appareil par un site Web que vous visitez. Les témoins sont largement utilisés pour faire fonctionner les sites Web, améliorer leur rendement, mémoriser les préférences et permettre l’analyse. Dans la présente Politique, le terme « témoins » désigne également les technologies semblables, comme les pixels, le stockage local et les trousses de développement logiciel.", 0),
      section("2. Catégories de témoins que nous utilisons", "2.1 Strictement nécessaires\n- Ces témoins sont nécessaires au fonctionnement du Site Web. Ils prennent en charge la gestion des sessions, la sécurité, le choix de la langue et l’enregistrement de l’état de votre consentement aux témoins. Ils ne peuvent être désactivés dans notre panneau de paramètres.\n\n2.2 Fonctionnels\n- Ces témoins mémorisent les choix qui améliorent votre expérience, notamment votre région, les produits consultés récemment et l’état enregistré de l’outil de conception. Ils ne sont chargés que si vous y consentez.\n\n2.3 Analyse\n- Ces témoins nous aident à mesurer l’utilisation du Site Web par les visiteurs, notamment les pages les plus consultées, afin d’améliorer le contenu et le rendement. Nous configurons les outils d’analyse de manière à anonymiser les adresses IP et à limiter la conservation des données. Ils ne sont chargés que si vous y consentez.\n\n2.4 Marketing\n- Ces témoins servent à la publicité et au réengagement, y compris le reciblage intersites et les pixels de médias sociaux. Ils ne sont chargés que si vous y consentez.", 1, "Important : les témoins fonctionnels, d’analyse et de marketing ne sont pas essentiels et doivent demeurer désactivés à moins que le visiteur y consente."),
      section("3. Vos choix", "Lors de votre première visite, une bannière de témoins présente trois options d’importance égale : Tout accepter, Tout refuser et Personnaliser. Vous pouvez modifier votre choix en tout temps en cliquant sur « Paramètres des témoins » dans le pied de page. Le retrait du consentement supprime les témoins non essentiels correspondants au prochain chargement de page.", 2, "Important : Tout accepter, Tout refuser et Personnaliser doivent avoir une importance égale, et le consentement doit pouvoir être retiré depuis le pied de page."),
      section("4. Contrôles du navigateur", "En plus de nos paramètres, vous pouvez contrôler les témoins dans votre navigateur. La plupart des navigateurs permettent de consulter, de supprimer et de bloquer les témoins. La désactivation des témoins strictement nécessaires peut empêcher certaines parties du Site Web de fonctionner correctement.", 3),
      section("5. Témoins de tiers", "Certains témoins sont placés par des tiers qui agissent en notre nom, par exemple des fournisseurs de services d’analyse ou de marketing. Ces tiers traitent les données conformément à des obligations contractuelles compatibles avec la présente Politique et notre Politique de confidentialité. Une liste à jour des catégories et fournisseurs peut être obtenue sur demande à support@vanstro.ca.", 4),
      section("6. Registres de consentement", "Nous conservons un registre de vos choix de consentement, y compris l’horodatage et les catégories acceptées ou refusées, pendant une période maximale de 24 mois. Ce registre sert à démontrer le respect des lois applicables sur la protection de la vie privée.", 5, "Important : les registres de consentement doivent conserver l’horodatage et les catégories acceptées ou refusées pendant une période maximale de 24 mois."),
      section("7. Modifications de la présente Politique", "Nous pouvons mettre à jour la présente Politique relative aux témoins de temps à autre. La Politique mise à jour sera publiée sur le Site Web avec une date d’entrée en vigueur révisée.", 6),
      frenchContact(7)
    ],
    summaryTitle: "Gérer les témoins facultatifs",
    summaryBody: "Les témoins nécessaires demeurent actifs. Les témoins fonctionnels, d’analyse et de ciblage peuvent être modifiés au moyen du contrôle des préférences.",
    supportNote: "Les choix de consentement peuvent être modifiés en tout temps. Les témoins facultatifs demeurent désactivés à moins que vous y consentiez.",
    primaryCta: { label: "Gérer les préférences", href: "#cookie-controls" },
    secondaryCta: { label: "Politique de confidentialité", href: "/privacy" }
  },
  {
    slug: "return-policy",
    title: "Politique de retour",
    description: "Conditions de retour applicables aux clients de détail et aux clients professionnels ou grossistes qui achètent des armoires de cuisine et des meubles-lavabos par l’intermédiaire du réseau de détaillants VanStro.",
    intro: "Conditions et procédures de retour pour les clients de détail et les clients professionnels ou grossistes du réseau de détaillants VanStro.",
    updated: "Date d’entrée en vigueur : 12 mai 2026",
    sourceSummary: "Applicable aux clients de détail et aux clients professionnels ou grossistes — armoires de cuisine et meubles-lavabos.",
    translationNotice: FRENCH_LEGAL_TRANSLATION_NOTICE,
    sections: [
      section("Notre engagement", "Si nous avons fourni le mauvais produit ou commis une erreur d’expédition, vous ne payez rien — nous corrigerons la situation.\n\nSi vous changez d’avis, retournez le produit non ouvert dans les 7 jours et aucuns frais de remise en stock ne s’appliqueront.\n\nSi l’emballage a été ouvert, des frais de remise en stock s’appliquent.", 0, "Mauvais produit ou erreur d’expédition : aucuns frais. Retour au détail non ouvert dans les 7 jours : aucuns frais de remise en stock. Emballage ouvert : des frais de remise en stock s’appliquent."),
      section("1. Objet", "La présente politique énonce les conditions et procédures de retour des produits fournis par VanStro Global Supply Inc. (« VanStro »). Elle ne s’applique qu’aux produits fournis par VanStro et ne régit pas les services fournis indépendamment par un détaillant, les autres gammes de produits ni les activités commerciales sans lien.", 1),
      section("2. Portée et application", "La présente politique s’applique aux achats effectués par deux catégories de clients :\n- Clients de détail\n- Clients professionnels ou grossistes — constructeurs, entrepreneurs, concepteurs et clients commerciaux\n\nElle ne s’applique pas aux détaillants de VanStro, dont les droits et obligations sont énoncés dans l’entente de collaboration avec le détaillant applicable. Lorsqu’une entente écrite distincte existe, celle-ci prévaut.", 2),
      section("3. Canal de vente, Livraison et étendue des responsabilités", "Le « Vendeur » d’une commande est l’entité désignée comme vendeur dans la confirmation de commande ou la facture applicable.\n\nLe détaillant local choisi pour la commande est le premier point de contact du client pour le ramassage, la coordination de la livraison, les demandes de retour et l’acheminement du soutien relatif aux produits. Le détaillant local peut exercer ces fonctions pour le compte du Vendeur sans nécessairement être le Vendeur.\n\nDans la présente Politique, « Livraison » désigne la remise des produits au client ou à son destinataire autorisé par le détaillant local ou le transporteur. Les délais de retour courent à compter de la date de Livraison.\n\nÀ la Livraison, le client devrait inspecter l’envoi pour vérifier la quantité, les articles incorrects et les dommages visibles. Toute quantité manquante ou tout dommage visible devrait être indiqué sur le bordereau de livraison et signalé au détaillant local dès que raisonnablement possible.\n\nUn dommage qui ne pouvait raisonnablement être découvert lors de l’inspection initiale constitue un « dommage dissimulé ». Il devrait être signalé rapidement après sa découverte, avec des photographies du produit, de l’emballage et des étiquettes d’expédition, lorsqu’elles sont disponibles.\n\nLa signature d’un bordereau de livraison confirme uniquement la réception. Elle ne constitue pas une renonciation à une réclamation pour dommage dissimulé ou défaut du produit ni à un droit prévu par la loi auquel il ne peut être renoncé.\n\nLe titre de propriété et le risque de perte sont transférés au moment indiqué dans le document de vente applicable, sous réserve du droit applicable. Le risque n’est pas transféré avant que les produits soient livrés au client ou à son destinataire autorisé.\n\nLa livraison à domicile, l’installation et les autres services sur place sont convenus séparément avec le détaillant local concerné, sauf s’ils sont expressément inclus dans les documents de commande.", 3, "Inspectez l’état visible à la Livraison et signalez rapidement tout dommage dissimulé après sa découverte. La signature confirme uniquement la réception."),
      section("4. Autorisation de retour", "Avant d’expédier ou de rapporter un produit, communiquez avec le détaillant local choisi pour la commande afin de demander une autorisation de retour. Si le retour est admissible, le détaillant local fournira un numéro d’autorisation de retour de marchandise (« ARM ») et les instructions de retour.\n\nLe détaillant local doit obtenir toute approbation interne requise de VanStro. Ne retournez aucun produit avant d’avoir reçu le numéro d’ARM et les instructions. Ce processus ne limite aucun droit ni recours prévu par la loi auquel il ne peut être renoncé.", 4, "Communiquez avec votre détaillant local afin d’obtenir un numéro d’ARM et les instructions avant de retourner un produit."),
      section("5. Plaintes et transmission à VanStro", "Les demandes de retour sont d’abord acheminées par l’intermédiaire du détaillant local. Si celui-ci ne suit pas la présente Politique ou si le client considère que le traitement de sa demande est déraisonnable, le client peut transmettre la plainte à VanStro pour examen à complaints@vanstro.ca.\n\nVanStro vérifiera si les exigences relatives au retour ont été correctement appliquées et, s’il y a lieu, traitera le problème d’approvisionnement du produit relevant de sa responsabilité.", 5),
      section("6. Admissibilité et conditions du retour", "Les produits courants en stock peuvent être retournés au détaillant dans les sept (7) jours suivant la Livraison si toutes les conditions suivantes sont remplies :\n- Le produit n’a pas été installé\n- Le produit n’a pas été utilisé\n- Le produit demeure dans son emballage d’origine\n- Le produit est dans un état permettant sa revente\n- Le produit est exempt de dommages", 6, "Important : les produits courants en stock admissibles doivent être retournés dans les sept (7) jours suivant la Livraison et demeurer inutilisés, non installés, emballés, revendables et non endommagés."),
      section("7. Articles non retournables", "Les produits suivants ne peuvent être retournés :\n- Produits installés\n- Produits sur mesure — dimensions spéciales, couleurs spéciales, configurations personnalisées et articles en commande spéciale", 7),
      section("8. Frais de retour", "1. Notre erreur — aucuns frais. Lorsqu’un retour découle de la fourniture d’un produit incorrect, d’une erreur d’expédition ou d’un dommage survenu avant la Livraison, aucuns frais ne s’appliquent. Le détaillant local coordonne le remplacement ou le remboursement, y compris le transport de retour.\n\nUne demande de retour concerne un changement d’avis ou un autre retour permis par la présente Politique. Une réclamation selon laquelle un produit était défectueux, mal décrit ou de qualité inacceptable sera évaluée selon les documents de vente applicables et le droit applicable. Si une garantie écrite expresse s’applique, sa couverture et sa procédure de réclamation seront indiquées dans les documents fournis pour le produit ou la commande. La présente Politique ne limite aucun droit ni recours prévu par la loi.\n\n2. Clients de détail — emballage non ouvert — aucuns frais de remise en stock. Lorsqu’un Client de détail retourne un produit courant en stock dans son emballage d’origine, non ouvert et dont les sceaux sont intacts, dans les sept (7) jours suivant la Livraison, aucuns frais de remise en stock ne s’appliquent. Le client organise et assume le transport de retour.\n\n3. Clients de détail — emballage ouvert — 20 %. Lorsque l’emballage a été ouvert, mais que le produit n’a pas été installé ni utilisé et demeure dans un état permettant sa revente, des frais de remise en stock correspondant à vingt pour cent (20 %) du prix du produit s’appliquent pour couvrir l’inspection, le réemballage, le réétiquetage et le traitement des stocks.\n\n4. Clients professionnels ou grossistes — 20 %. Le paragraphe 2 ne s’applique pas aux Clients professionnels ou grossistes. Leurs retours approuvés sont assujettis à des frais de remise en stock correspondant à vingt pour cent (20 %) du prix du produit.\n\nLes frais de remise en stock ne s’appliquent qu’aux retours admissibles pour changement d’avis. Ils ne s’appliquent pas à un produit incorrect, à un dommage antérieur à la livraison, à un défaut du produit ni à toute situation où le droit applicable exige un autre recours.", 8, "Les retours admissibles pour changement d’avis peuvent entraîner des frais de remise en stock; les produits incorrects, endommagés ou défectueux sont évalués séparément."),
      section("9. Remboursements", "Lorsqu’un remboursement est approuvé, le Vendeur ou son processeur de paiement autorisé l’effectuera selon le mode de paiement initial, moins tous frais licites de remise en stock, dans les cinq (5) jours ouvrables suivant la réception et l’inspection du produit retourné. Si le mode de paiement initial n’est pas disponible, le Vendeur offrira un autre mode de remboursement licite. Les délais de traitement imposés par une banque ou un fournisseur de paiement échappent au contrôle du Vendeur.", 9),
      section("10. Droits d’inspection", "VanStro ou son détaillant peut inspecter tout produit avant d’approuver un retour.\n- Photographies\n- Preuve vidéo\n- Inspection par un tiers\n- Inspection matérielle", 10),
      section("11. Exclusions", "Un retour ne sera pas accepté dans les situations suivantes :\n- Installation inadéquate\n- Manutention inadéquate\n- Usage abusif ou mauvais usage\n- Dommage causé par le client\n- Usure normale\n- Entreposage inadéquat\n- Dommage ou perte pendant le transport survenant après la Livraison", 11),
      section("12. Mises à jour de la Politique", "La version de la présente politique en vigueur à la date de la Livraison s’applique à votre achat. VanStro peut la mettre à jour de temps à autre; les mises à jour n’ont aucune incidence sur les achats déjà livrés.", 12)
    ],
    summaryTitle: "Besoin d’aide pour un retour?",
    summaryBody: "Commencez par le détaillant local auprès duquel le produit a été acheté. VanStro peut examiner une plainte transmise lorsque le traitement du détaillant semble incompatible avec la présente Politique.",
    supportNote: "Avant de faire remonter la demande, ayez en main le nom du détaillant, la référence de commande, la date de livraison, les photos et l’état de l’ARM.",
    primaryCta: { label: "Communiquer avec le soutien", href: "/contact" },
    secondaryCta: { label: "Suivre une commande", href: "/orders/demo-order" }
  },
  {
    slug: "dealer-services-and-responsibility",
    title: "Responsabilités de VanStro et des détaillants locaux",
    description: "Façon dont sont traitées les commandes de produits et les services offerts séparément par les détaillants locaux.",
    intro: "Éléments d’une commande de produits traités par VanStro et services pouvant être fournis séparément par un détaillant local.",
    updated: "Dernière mise à jour : 16 mai 2026",
    sourceSummary: "Responsabilités relatives aux commandes de produits et aux services des détaillants locaux. Version 2026-1.3",
    translationNotice: FRENCH_LEGAL_TRANSLATION_NOTICE,
    sections: [
      section("1. Objet et définitions", "La présente page explique les éléments d’une commande de produits qui sont traités par VanStro et les services qui peuvent être fournis séparément par un détaillant local indépendant.\n\nUn « détaillant local indépendant » est une entreprise détenue et exploitée de façon indépendante qui participe au réseau VanStro. Après cette définition, nous employons « détaillant local ».\n\nLe « Vendeur » est l’entité désignée comme vendeur dans la confirmation de commande ou la facture applicable. Les « Services du détaillant » désignent la livraison, l’installation, la prise de mesures, la rénovation, l’élimination ou d’autres services faisant l’objet d’un devis distinct et fournis par un détaillant local.", 0),
      section("2. Commandes de produits et désignation du Vendeur", "Le Vendeur de chaque commande de produits est indiqué dans la confirmation de commande ou la facture applicable. Les paiements des produits peuvent être traités par le site Web de VanStro ou par un fournisseur de paiement autorisé pour le Vendeur désigné dans ce document.\n\nLe détaillant local choisi pour la commande peut gérer les stocks locaux, le ramassage, la coordination de la livraison, les retours et l’assistance après-vente. Ces activités d’exécution ne déterminent pas à elles seules si le détaillant local ou VanStro est le Vendeur.\n\nL’exécution d’une commande consiste à préparer le produit pour le ramassage ou un autre mode de livraison indiqué dans les documents de commande. La livraison à domicile ou sur le chantier, l’installation et les autres services sur place sont des Services du détaillant distincts, sauf si les documents de commande les incluent expressément.", 1),
      section("3. Responsabilités de VanStro", "VanStro gère :\n- L’approvisionnement en produits et sa coordination\n- Les renseignements sur les produits et les stocks\n- Le catalogue et le système de commande en ligne\n- Les renseignements sur les produits et le soutien au réseau\n\nLes documents de commande applicables indiquent le Vendeur, le prix du produit, les taxes, les modalités de paiement et les dispositions d’exécution incluses. VanStro ne fournit aucun service d’installation, de prise de mesures sur place, de rénovation, d’élimination ni aucun autre service sur place, sauf indication écrite expresse.", 2),
      section("4. Responsabilités du détaillant local", "Les détaillants locaux sont des entreprises détenues et exploitées de façon indépendante. Chaque détaillant local gère son propre personnel, son marketing, ses relations avec la clientèle, la tarification de ses services et ses Services du détaillant. Il peut offrir :\n- Livraison à domicile ou sur le chantier\n- Installation\n- Prise de mesures sur place\n- Consultation en conception\n- Soutien à la rénovation\n- Enlèvement ou élimination\n- Coordination de projet\n- Services après-vente supplémentaires\n\nLa disponibilité, la portée et le prix des Services du détaillant varient selon le détaillant local et la zone de service.", 3),
      section("5. Communication avec le client et transmission des questions non résolues", "Pour les questions courantes relatives à une commande, le détaillant local choisi est le principal interlocuteur du client concernant la disponibilité, le ramassage, la coordination de la livraison, les demandes de retour et l’assistance après-vente.\n\nLe client peut soumettre à VanStro une question de produit ou de politique non résolue aux fins d’examen. Pour les Services du détaillant faisant l’objet d’un devis distinct, le détaillant local est le fournisseur de services responsable. Le signalement à VanStro de la conduite d’un détaillant ne fait pas de VanStro une partie à l’entente de services.", 4),
      section("6. Services du détaillant sur le Site Web", "Une page de détaillant peut présenter ses coordonnées, sa zone de service, ses heures d’ouverture, les services offerts et les options de demande de renseignements. Les Services du détaillant affichés sur une telle page sont fournis par le détaillant local, et non par VanStro.\n\nLes demandes de services, devis et réservations sont acheminées au détaillant local. Les demandes et paiements relatifs aux Services du détaillant sont distincts du processus de paiement des produits, sauf indication expresse contraire dans les documents de commande applicables.", 5),
      section("7. Prix, paiement et garantie des services", "Le détaillant local fixe la portée, le prix et l’échéancier des Services du détaillant qu’il offre séparément et en perçoit directement le paiement. Sauf s’ils sont expressément inclus dans les documents de commande applicables, les frais des Services du détaillant ne sont pas compris dans le prix du produit.\n\nLe détaillant local est seul responsable de son devis de services distinct, de sa facture, de la perception du paiement, de l’établissement de l’échéancier, de son personnel, de la qualité d’exécution et de toute garantie de service qu’il offre. Une garantie de service du détaillant ne remplace ni ne modifie aucune garantie de produit ni aucun droit légal relatif au produit.", 6),
      section("8. Responsabilité des services", "Les Services du détaillant sont exécutés par le détaillant local à titre d’entreprise indépendante. Il est responsable de la qualité des services, de l’échéancier, du personnel, de la qualité d’exécution et de la réalisation du projet.\n\nVanStro n’est ni partie ni garante d’une entente distincte de Services du détaillant, sauf si elle en convient expressément autrement par écrit.", 7),
      section("9. Renseignements sur les clients et recommandations", "À la demande du client, VanStro peut fournir les coordonnées de détaillants locaux qui indiquent desservir son emplacement. Une inscription ou une recommandation n’oblige ni le client ni le détaillant local à donner suite. Les renseignements sur le client ne sont communiqués que de la manière décrite dans la Politique de confidentialité de VanStro et selon ce que permet le droit applicable.", 8),
      section("10. Taxes", "La partie qui effectue une fourniture taxable doit facturer, percevoir et remettre les taxes qu’elle est légalement tenue de percevoir pour cette fourniture.\n\nSelon la province ou le territoire et la nature de l’opération, les taxes applicables peuvent comprendre la TPS/TVH et les taxes de vente provinciales, y compris la TVP, la TVD ou la TVQ. La facture applicable indique le fournisseur, les montants taxables et les taxes facturées.", 9),
      section("11. Mises à jour de la politique", "VanStro peut mettre à jour la présente page à mesure que son processus de commande et son réseau de détaillants locaux évoluent. La version mise à jour s’applique à compter de la date indiquée sur cette page, sous réserve du droit applicable.", 10)
    ],
    summaryTitle: "Besoin d’aide pour comprendre les responsabilités?",
    summaryBody: "Communiquez avec VanStro pour toute question sur les politiques relatives aux produits ou avec le détaillant local choisi pour la disponibilité, le ramassage, la coordination de la livraison et les services locaux offerts séparément.",
    supportNote: "Les commandes de produits et les Services du détaillant sont distincts, sauf si les documents de commande incluent expressément les deux.",
    primaryCta: { label: "Communiquer avec le soutien", href: "/contact" },
    secondaryCta: { label: "Devenir détaillant", href: "/dealers/apply" }
  },
  {
    slug: "careers",
    title: "Carrières",
    description: "Découvrez comment manifester votre intérêt pour des possibilités de carrière chez VanStro.",
    intro: "VanStro accepte actuellement les manifestations d’intérêt générales par l’intermédiaire de la page de contact. Les postes disponibles et leurs exigences seront publiés sur ce site lorsqu’ils seront offerts.",
    translationNotice: FRENCH_LEGAL_TRANSLATION_NOTICE,
    sections: [
      section("Comment communiquer avec nous", "Utilisez la page de contact pour envoyer une brève présentation et décrire le type de poste qui vous intéresse. Il s’agit d’une demande générale, et non d’une candidature officielle ni d’une promesse qu’un poste est disponible.", 0),
      section("Renseignements que vous pouvez inclure", "Vous pouvez indiquer votre expérience pertinente, le type de travail recherché, votre emplacement, vos disponibilités et les renseignements sur votre autorisation de travail qui sont pertinents pour le poste recherché. Veuillez ne pas fournir de renseignements personnels sensibles que nous n’avons pas demandés.", 1),
      section("Curriculum vitæ ou portfolio", "Ce site Web n’accepte pas actuellement le téléversement de curriculum vitæ. Si cela est utile, ajoutez à votre message un lien vers un curriculum vitæ, un portfolio ou un profil professionnel.", 2),
      section("Prochaines étapes", "VanStro évalue les demandes relatives aux carrières en fonction de ses besoins actuels. Nous pouvons communiquer avec vous si des renseignements supplémentaires ou une discussion sont appropriés, mais nous ne pouvons garantir une réponse, une entrevue ou une possibilité d’emploi.", 3)
    ],
    summaryTitle: "Vous souhaitez travailler chez VanStro?",
    summaryBody: "Envoyez une brève présentation par la page de contact. L’équipe vous indiquera les prochaines étapes si un poste approprié est disponible.",
    supportNote: "Choisissez Carrières comme sujet de contact. Ajoutez un lien vers un curriculum vitæ ou un portfolio seulement si vous souhaitez que VanStro l’examine.",
    primaryCta: { label: "Communiquer avec VanStro", href: "/contact?topic=careers" },
    secondaryCta: { label: "Découvrir VanStro", href: "/about" }
  }
];

const englishLegalNavLinks: LegalPageLink[] = [
  { label: "Legal Disclaimer", shortLabel: "Disclaimer", href: "/legal-disclaimer" },
  { label: "Terms and Conditions", shortLabel: "Terms", href: "/terms-and-conditions" },
  { label: "Privacy Policy", shortLabel: "Privacy", href: "/privacy" },
  { label: "Cookie Preferences", shortLabel: "Cookies", href: "/cookie-settings" },
  { label: "Return Policy", shortLabel: "Returns", href: "/return-policy" },
  { label: "VanStro & Local Dealer Responsibilities", shortLabel: "Dealer Services", href: "/dealer-services-and-responsibility" },
  { label: "Careers", shortLabel: "Careers", href: "/careers" }
];

const frenchLegalNavLinks: LegalPageLink[] = [
  { label: "Avis juridique", shortLabel: "Avis", href: "/legal-disclaimer" },
  { label: "Conditions générales", shortLabel: "Conditions", href: "/terms-and-conditions" },
  { label: "Politique de confidentialité", shortLabel: "Confidentialité", href: "/privacy" },
  { label: "Préférences relatives aux témoins", shortLabel: "Témoins", href: "/cookie-settings" },
  { label: "Politique de retour", shortLabel: "Retours", href: "/return-policy" },
  { label: "Responsabilités de VanStro et des détaillants locaux", shortLabel: "Services", href: "/dealer-services-and-responsibility" },
  { label: "Carrières", shortLabel: "Carrières", href: "/careers" }
];

export const legalPageEntries = englishLegalPageEntries;
export const legalNavLinks = englishLegalNavLinks;
export const footerLegalLinks: LegalPageLink[] = legalNavLinks.filter((link) => link.href !== "/cookie-settings");

export function getLegalNavLinks(locale: SiteLocale = DEFAULT_LOCALE): LegalPageLink[] {
  return locale === "fr-CA" ? frenchLegalNavLinks : englishLegalNavLinks;
}

export function getLegalPageBySlug(slug: string, locale: SiteLocale = DEFAULT_LOCALE) {
  const entries = locale === "fr-CA" ? frenchLegalPageEntries : englishLegalPageEntries;
  return entries.find((entry) => entry.slug === slug);
}

export function requireLegalPage(slug: string, locale: SiteLocale = DEFAULT_LOCALE): LegalPageEntry {
  const entry = getLegalPageBySlug(slug, locale);

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
