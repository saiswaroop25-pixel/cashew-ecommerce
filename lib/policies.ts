import { FLAT_SHIPPING_PAISE, FREE_SHIPPING_THRESHOLD_PAISE } from "@/lib/pricing";
import type { LegalSlug } from "@/lib/legal";
import type { ResolvedSite } from "@/lib/site";

/**
 * The words of every policy page. They describe what this shop actually does with data and money.
 * Terms that are the business's own decision (how long customers have to report a problem, how long refunds take)
 * are the constants below, so one edit changes every page. Have a lawyer review the final text before you rely on it.
 */
export const POLICY_TERMS = {
  /** Hours after delivery within which a damaged, spoiled or wrong item must be reported. */
  reportWithinHours: 48,
  /** Typical time for a refund to reach the customer's account after it is issued. */
  refundDays: "5 to 7 working days",
  /** How quickly we aim to answer a privacy request. */
  privacyReplyDays: 30,
  lastUpdated: "14 November 2026",
} as const;

export type Section = { heading: string; paragraphs?: string[]; bullets?: string[] };
export type Policy = { intro?: string; sections: Section[] };

const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

export function getPolicy(slug: LegalSlug, c: ResolvedSite): Policy {
  const who = c.legalName || c.name;
  const contactLine = [c.email && `email ${c.email}`, c.phone && `phone ${c.phone}`].filter(Boolean).join(", ");
  const grievance = c.grievanceEmail || c.email;

  switch (slug) {
    case "privacy-policy":
      return {
        intro: `${who} ("we") runs this online shop. This page explains what personal data we collect, why, who helps us handle it, how long we keep it and how you can control it. It follows the principles of India's Digital Personal Data Protection Act, 2023.`,
        sections: [
          {
            heading: "What we collect, and why",
            bullets: [
              "Account: your name, email address and a password (stored only as a secure hash by our sign-in provider). Used to let you sign in and see your orders.",
              "Orders: your name, email, mobile number, delivery address and any delivery note you type. Used to take payment, deliver the order, send order updates and keep accounting records.",
              "Payments: the payment is taken by Razorpay. We receive the payment status and reference numbers, never your card, UPI or bank details.",
              "Bulk enquiries: your name, company, email, phone, location and what you want to buy. Used only to reply with a quotation.",
              "Newsletter: your email address and the time you agreed. Used only to send the newsletter, and only if you ticked the box.",
              "Privacy requests: your email and what you ask for, so we can act on it.",
              "Security: to stop abuse we keep short-lived counters of attempts, stored as scrambled values rather than your actual address.",
            ],
          },
          {
            heading: "What we do not do",
            bullets: [
              "We do not sell your data.",
              "We do not use advertising or tracking cookies, and we do not run analytics that follow you across sites.",
              "We do not ask for information we do not need. Where a field is optional it says so.",
            ],
          },
          {
            heading: "Who helps us handle your data",
            paragraphs: ["These services process data on our behalf, only to run the shop:"],
            bullets: [
              "Supabase: sign-in, database and picture storage.",
              "Razorpay: card, UPI and net-banking payments.",
              "Resend: sending order and enquiry emails.",
              "Vercel: hosting the website.",
              "Delivery partners receive your name, address and phone number when we ship an order.",
            ],
          },
          {
            heading: "How long we keep it",
            bullets: [
              "Order and payment records are kept for as long as the law requires for accounting and tax.",
              "Account details are kept until you ask us to delete the account.",
              "Newsletter details are kept until you unsubscribe.",
              "Enquiries are kept for as long as needed to deal with them and for a reasonable time afterwards.",
            ],
          },
          {
            heading: "Your rights",
            paragraphs: [
              "You can ask to see the data we hold about you, to correct it, to delete it, or to withdraw consent for emails. You can unsubscribe from the newsletter at any time with the link in every email.",
              `Use the data request form on this website, or write to us. We aim to reply within ${POLICY_TERMS.privacyReplyDays} days. We may need to confirm that the request comes from you, and we may keep records the law requires us to keep (such as invoices), which we will tell you about.`,
            ],
          },
          {
            heading: "Children",
            paragraphs: ["This shop is for adults. We do not knowingly collect data from children."],
          },
          {
            heading: "Complaints",
            paragraphs: [
              `${c.grievanceName ? `Our grievance officer is ${c.grievanceName}. ` : ""}${grievance ? `Write to ${grievance}.` : "Use the details on our Contact page."} If you are not satisfied with our reply you may complain to the Data Protection Board of India.`,
            ],
          },
          { heading: "Changes", paragraphs: ["If we change this policy we will update the date at the top of the page."] },
        ],
      };

    case "terms":
      return {
        intro: `These terms apply when you use this website or buy from ${who}. By placing an order you agree to them.`,
        sections: [
          {
            heading: "Our products and prices",
            bullets: [
              "All prices are in Indian rupees (INR). The total shown at checkout, including any delivery charge, is the amount you pay. We do not add further charges after that.",
              "Product pictures are for illustration. Weights, grades and pack sizes are as written on the product page.",
              "We may correct a pricing or description mistake. If that happens before dispatch we will tell you and you can cancel for a full refund.",
            ],
          },
          {
            heading: "Orders and payment",
            bullets: [
              "Placing an order is an offer to buy. It is accepted when payment is confirmed and you receive our email.",
              "Payment is handled by Razorpay. If an order is not paid in time it expires and the items are released back to stock.",
              "If an item runs out after you pay, we will refund you in full.",
            ],
          },
          {
            heading: "Delivery, returns and refunds",
            paragraphs: ["See our Shipping Policy and our Refund & Cancellation Policy. They form part of these terms."],
          },
          {
            heading: "Bulk orders",
            paragraphs: ["A bulk enquiry is a request for a quotation, not an order. A quotation is valid for the period it states. Bulk orders are confirmed only in writing by us."],
          },
          {
            heading: "Your account",
            bullets: [
              "Keep your password private. You are responsible for activity on your account.",
              "Give accurate details so we can deliver your order.",
              "Do not misuse the website: no automated scraping, no attempts to break in, no false orders.",
            ],
          },
          {
            heading: "Food information",
            paragraphs: [
              "Cashews are a tree nut and can cause severe allergic reactions. Check the label before you eat. Information on this website is general; the label on the pack is what applies.",
            ],
          },
          {
            heading: "Liability",
            paragraphs: [
              "Nothing in these terms limits your rights under Indian consumer law. Subject to that, our liability for any order is limited to the amount you paid for it.",
            ],
          },
          {
            heading: "Law and disputes",
            paragraphs: [
              "These terms are governed by the laws of India. Courts at the place of our registered address (see the Contact page) have jurisdiction. Please contact us first so we can try to put things right.",
            ],
          },
          { heading: "Contact", paragraphs: [contactLine ? `You can reach us by ${contactLine}.` : "See the Contact page for our details."] },
        ],
      };

    case "returns-policy":
      return {
        intro: "Cashews are a food product, so we cannot take back opened or unwanted items. We will always put things right if something is wrong with your order.",
        sections: [
          {
            heading: "When you get a refund or replacement",
            bullets: [
              "The item arrived damaged, spoiled or leaking.",
              "You received the wrong product, grade or pack size.",
              "Items are missing from your order.",
              "We could not deliver your order.",
            ],
          },
          {
            heading: "How to report a problem",
            paragraphs: [
              `Contact us within ${POLICY_TERMS.reportWithinHours} hours of delivery${c.email ? ` at ${c.email}` : ""}. Include your order number and a photo of the pack and the problem. We will reply with a refund or a replacement, whichever you prefer where stock allows.`,
            ],
          },
          {
            heading: "Cancelling an order",
            paragraphs: [
              "You can cancel before we dispatch the order by contacting us as soon as possible. Once an order has shipped it cannot be cancelled, but the rules above still apply on delivery.",
            ],
          },
          {
            heading: "How refunds are paid",
            paragraphs: [
              `Refunds go back to the original payment method through Razorpay and normally reach you in ${POLICY_TERMS.refundDays} after we issue them. Your bank may take a little longer. You will get an email when a refund is issued.`,
            ],
          },
          {
            heading: "Bulk orders",
            paragraphs: ["Terms for bulk orders are written in the quotation we send you."],
          },
        ],
      };

    case "shipping-policy":
      return {
        intro: "We deliver within India.",
        sections: [
          {
            heading: "Delivery charges",
            bullets: [
              `Orders of ${inr(FREE_SHIPPING_THRESHOLD_PAISE)} or more (after any discount) ship free.`,
              `Smaller orders pay a flat ${inr(FLAT_SHIPPING_PAISE)} for delivery.`,
              "The delivery charge is shown in your cart and again at checkout, before you pay. There are no other charges.",
            ],
          },
          {
            heading: "Dispatch and delivery",
            bullets: [
              "We dispatch after your payment is confirmed.",
              "Delivery time depends on your location and the courier. We email you when your order ships.",
              "Please give a complete address and a working mobile number so the courier can reach you.",
            ],
          },
          {
            heading: "Problems with delivery",
            paragraphs: ["If your order is delayed, damaged or lost, contact us and we will sort it out. See the Refund & Cancellation Policy."],
          },
        ],
      };

    case "cookie-policy":
      return {
        intro: "Cookies are small files a website stores in your browser. This shop uses only the few it needs to work. It does not use advertising, tracking or analytics cookies.",
        sections: [
          {
            heading: "Cookies we use",
            bullets: [
              "cart_token (up to 30 days): remembers the items in your cart if you are not signed in.",
              "Sign-in cookies (while you are signed in): keep you signed in securely. Set only after you sign in.",
              "Payment cookies: when you open the payment window, Razorpay may set its own cookies to process and secure the payment. See Razorpay's privacy policy.",
            ],
          },
          {
            heading: "Other storage",
            paragraphs: ["Your choice on the cookie notice is saved in your browser's local storage on your device. It is not sent to us."],
          },
          {
            heading: "Fonts and images",
            paragraphs: [
              "Fonts are served from our own website, so your browser does not contact Google to load them. Pictures are served from our own storage.",
            ],
          },
          {
            heading: "Your control",
            paragraphs: ["You can delete or block cookies in your browser settings. The cart and sign-in will not work without them."],
          },
        ],
      };

    case "photo-credits":
      return {
        intro: "How the pictures and fonts on this site are licensed.",
        sections: [
          {
            heading: "Our own pictures",
            paragraphs: ["The home-page photograph of cashew kernels in a basket and the broken-cashews product photograph were supplied by the business, which holds the rights to use them."],
          },
          {
            heading: "Fonts",
            bullets: [
              "Playfair Display (headings) by Claus Eggers Sørensen, licensed under the SIL Open Font License 1.1.",
              "Inter (text) by Rasmus Andersson, licensed under the SIL Open Font License 1.1.",
              "Both are free to use on a commercial website and are served from our own site.",
            ],
          },
          {
            heading: "Illustrative photographs from Wikimedia Commons",
            paragraphs: ["Some pictures are illustrative images from Wikimedia Commons. They are not pictures of our own products or facility and will be replaced with our own photographs."],
            bullets: [
              "Salted cashews: \"Roasted salted jumbo cashews\" by Famartin, CC BY-SA 4.0.",
              "Cashew fruit on the tree: Plant Industry, CSIRO, CC BY 3.0.",
              "Cashew apples with the nut attached: Prabhupuducherry, CC BY-SA 4.0.",
              "Raw cashew nut on the ground: Gvhufm, CC BY-SA 3.0.",
              "Cashew shelling machine: Dinura Pradeep Balasooriya, CC BY-SA 2.0.",
              "Shelling and kernel separation: Sandeep Vengurlekar, CC0.",
              "Peeling cashew kernels: -JvL- (Netherlands), CC BY 2.0.",
              "Other product photographs: Fumikas Sagisavas (CC0), Khoule23 (public domain) and Daderot (CC0).",
            ],
          },
          {
            heading: "Licences",
            paragraphs: ["creativecommons.org/licenses/by/3.0, by/2.0, by-sa/2.0, by-sa/3.0, by-sa/4.0 and creativecommons.org/publicdomain/zero/1.0. Originals are on commons.wikimedia.org. Icons are from the Lucide set (ISC licence)."],
          },
        ],
      };
  }
}
