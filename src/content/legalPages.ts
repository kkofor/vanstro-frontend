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
    "Questions about this page or any of our legal terms may be directed to:\nVanStro Global Supply Inc.\n856 Century Street, Winnipeg, Manitoba R3H 0M5, Canada\nEmail: support@vanstro.ca\nPhone: 204-221-2288\nWebsite: vanstro.ca",
    index
  );
}

export const legalPageEntries: LegalPageEntry[] = [
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
        'VanStro Global Supply Inc. ("VanStro", "we", "our") is committed to protecting your personal information in accordance with the Personal Information Protection and Electronic Documents Act (PIPEDA), Quebec\'s Act respecting the protection of personal information in the private sector (Law 25), and other applicable Canadian privacy laws. This Policy explains what information we collect, how we use it, with whom we share it, and the rights you have.\n\nAn "independent local dealer" is an independently owned and operated dealer participating in the VanStro network. After this definition, we use "local dealer."',
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
        "We disclose personal information only as necessary to fulfill the purposes set out above, to the following categories of recipients:\n- Service providers retained to perform functions on our behalf, such as payment processing, shipping and logistics, IT hosting, design software, and customer relationship management, under contractual obligations of confidentiality and data protection.\n- With your consent or where otherwise permitted by law, the local dealer selected for your order, to the extent reasonably necessary to arrange fulfillment, pickup, delivery, returns or post-sale assistance.\n- If you separately request installation or another dealer service, an installer or other service provider when the disclosure is necessary for the service you requested or is otherwise permitted by law.\n- Affiliated entities of VanStro Global Supply Inc., including the supply chain partner Qingdao Wanshituo Trading Co., Ltd., strictly for order fulfillment, product quality coordination, and online marketing operations, under written confidentiality and data protection terms.\n- Government authorities, regulators, or law enforcement, where required by law or to protect our legal rights.\n- Successors in connection with a corporate transaction, such as a merger, acquisition, or sale of assets, subject to confidentiality protections.\n\nForms identify whether information is submitted to VanStro, to a local dealer or to both before you submit it.",
        5
      ),
      section(
        "7. Cross-Border Transfers",
        "Some of our service providers and affiliates are located outside Canada, including in the United States, Singapore, the Republic of Korea, and the People's Republic of China. When personal information is transferred outside Canada, it may be accessed by foreign courts, law enforcement, and national security authorities under the laws of the receiving country. We use contractual safeguards and security measures designed to provide a comparable level of protection. By using the Website or providing your information, you acknowledge that such cross-border transfers may occur.",
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
        "Subject to applicable law, you have the following rights with respect to your personal information:\n- Access: request confirmation that we hold information about you and obtain a copy.\n- Correction: request that we correct inaccurate or incomplete information.\n- Withdrawal of consent: withdraw consent to the collection, use, or disclosure of your information, subject to legal or contractual restrictions.\n- Deletion: request deletion when your information is no longer required and is not required to be retained by law.\n- Portability: request transfer of your information in a structured, commonly used format, where applicable under Quebec Law 25.\n- Complaint: file a complaint with our Privacy Officer or with the Office of the Privacy Commissioner of Canada or your provincial regulator.\n\nTo exercise these rights, contact our Privacy Officer. We will respond within 30 days of receiving a valid request. We may need to verify your identity before providing information.",
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
    label: "VanStro & Local Dealer Responsibilities",
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
