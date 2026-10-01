// What's new in the CRM, in plain language for agents.
//
// Entries are written by Claude alongside each release, from what actually
// shipped. Add new entries at the TOP (newest first). One entry per release
// day; keep the headline short and describe each item as what changed for the
// agent and why it helps -- no file names or technical terms.

export type ChangeKind = "new" | "improved" | "fixed";

export type ChangelogEntry = {
  date: string; // YYYY-MM-DD
  title: string;
  items: { kind: ChangeKind; text: string }[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-10-01",
    title: "Support menu, a simpler Medical Card quotation and a system colour",
    items: [
      { kind: "new", text: "A Support menu now sits above Training in the sidebar, with Tickets, Changelog (this page) and Roadmap." },
      { kind: "new", text: "A simpler Medical Card quotation sheet: compare Option 1 and Option 2 side by side with riders, in the same look as the quotation you already know. Find it in the Quotation launcher, on a lead and in the pipeline card menu." },
      { kind: "new", text: "SuperAdmin can now choose the system colour, Prestige Blue or Great Eastern Red, or a custom colour, with a live preview." },
      { kind: "improved", text: "The sidebar stays on screen while you scroll a long page, so Training, your profile and Sign Out are always within reach." },
      { kind: "improved", text: "\"Standard sum covered\" is now called \"Basic Sum Covered (BSC)\" in Settings > Benefits." },
    ],
  },
  {
    date: "2026-09-28",
    title: "Smoother on your phone, plus a team leaderboard",
    items: [
      { kind: "new", text: "On mobile, swipe across your Dashboard between Personal Sales, Team Sales, Leaderboard and Calendar instead of scrolling past them." },
      { kind: "new", text: "Managers get a leaderboard ranking agents by this year's inforced ANC. SuperAdmin can view it but is never ranked." },
      { kind: "new", text: "The notification bell now also reminds you of birthdays in the next 7 days, contributions due soon and overdue contributions." },
      { kind: "new", text: "My Team has an optional organisation chart view next to the roster table." },
      { kind: "improved", text: "Clicking a case in Manage Cases opens its details in a pop-up instead of expanding in the list." },
      { kind: "improved", text: "Leads, Pipeline, Lead Generation and Appointments are tighter and cleaner on small screens." },
      { kind: "improved", text: "The client portal link in Servicing is now a \"View link\" button with Copy and Share via WhatsApp." },
      { kind: "fixed", text: "A sliver of the page header no longer shows behind the mobile menu." },
      { kind: "fixed", text: "Some buttons no longer run off the edge of narrow phone screens (Lead Generation, Appointments)." },
    ],
  },
  {
    date: "2026-09-27",
    title: "Agent landing pages, branding and a native-app feel",
    items: [
      { kind: "new", text: "A new Agent Landing Page template in Lead Generation, with your own logo, header image and photo, and a short lead form that creates Warm leads for you." },
      { kind: "new", text: "SuperAdmin can upload the insurer logo and a cover image for agent landing pages in Settings > Branding." },
      { kind: "new", text: "A Training link in the menu opens the training site in a new tab." },
      { kind: "new", text: "Pipeline on mobile: swipe between stages, press and hold to drag a card, and Undo a move." },
      { kind: "new", text: "The Servicing calendar shows birthday cakes for your clients, and tapping a day lists its contributions and birthdays." },
      { kind: "new", text: "Your clients' portal now has a \"how to pay\" guide for JomPAY and Easi-Pay on certificates with contributions due." },
      { kind: "new", text: "SuperAdmin can delete a lead straight from the list: a trash icon on desktop, swipe left on mobile. Deleted leads can still be restored." },
      { kind: "new", text: "A friendlier welcome when you log in, with a different greeting each time." },
      { kind: "improved", text: "Manage Cases and Servicing are now top-level menu items, and Servicing replaces Quote in the mobile bottom bar." },
      { kind: "improved", text: "Clicking a client in Servicing opens their details, contribution checklist and portal link in a pop-up." },
      { kind: "improved", text: "Pipeline moves feel instant." },
      { kind: "improved", text: "Page headers stay in view as you scroll on mobile, and the app respects the notch and bottom bar on newer phones." },
      { kind: "fixed", text: "The mobile menu's Sign Out is now a small icon, so you no longer log out by accident when opening the menu." },
      { kind: "fixed", text: "The client portal link no longer spills past the edge of its card in Servicing." },
      { kind: "fixed", text: "The notification bell and Quick Action menu no longer get cut off on small phones." },
    ],
  },
  {
    date: "2026-09-24",
    title: "Faster pages and clearer Dashboard numbers",
    items: [
      { kind: "improved", text: "Pages load noticeably faster, roughly a fifth less to download on the Dashboard and Lead pages." },
      { kind: "improved", text: "Everything that loads your leads and cases is quicker, and your data stays just as protected." },
      { kind: "improved", text: "Dashboard has a Personal Sales card for everyone, plus Whole Team Sales for SuperAdmin and Group Managers or Downline Team Sales for Unit Managers." },
      { kind: "improved", text: "This Month Target, Current Month ANC and closings now sit together in one block with its own progress bar, and it uses your own monthly target." },
      { kind: "improved", text: "The yearly ANC cards now show Total Inforced and Total Collected for the year." },
      { kind: "fixed", text: "Team Performance no longer measures team ANC against a personal yearly goal." },
      { kind: "fixed", text: "Deleted leads are no longer counted in your Dashboard figures." },
    ],
  },
  {
    date: "2026-09-17",
    title: "Client portal shows what is due",
    items: [
      { kind: "new", text: "Each certificate in the client portal now shows the amount currently due, with every unpaid date listed, or CLEAR when nothing is owed." },
      { kind: "new", text: "Servicing calendar has a bell showing how many contributions are overdue and the total owed. Click it to jump to the oldest unpaid day." },
      { kind: "new", text: "Each benefit in the portal shows the description you set in Settings > Benefits." },
      { kind: "improved", text: "The portal's certificates button now reads \"View All Certificates\", and the WhatsApp message you forward uses the agency's own wording." },
      { kind: "improved", text: "Benefit status on the case form is a dropdown: Inforce, Inforce Potential Lapse or Lapsed." },
      { kind: "fixed", text: "Text on the \"amount due\" card in the portal was hard to read. It is now clear." },
    ],
  },
  {
    date: "2026-09-16",
    title: "Your profile, client privacy and plan categories",
    items: [
      { kind: "new", text: "A My Profile tab in Settings lets every agent update their own name, phone and email." },
      { kind: "new", text: "The client portal has a WhatsApp Agent button in its header, once your phone number is saved." },
      { kind: "new", text: "Plan categories, a personal Dashboard, and two full client guides." },
      { kind: "improved", text: "Servicing now shows each client's email beside their NRIC, and flags in red when either is missing." },
      { kind: "improved", text: "Client details sit in their own column on Submit Case and Servicing." },
      { kind: "fixed", text: "Your client's own email on the lead is now accepted when you file a case. Before, you could be blocked even though the email was already there." },
      { kind: "fixed", text: "Important privacy fix: a client logged in to the portal could see other clients' certificates. Each client now sees only their own." },
    ],
  },
  {
    date: "2026-09-15",
    title: "Client portal for your clients",
    items: [
      { kind: "new", text: "A view-only portal where your clients can see their certificates." },
      { kind: "new", text: "Clients log in with their NRIC, and see several certificates as separate cards with category badges." },
    ],
  },
  {
    date: "2026-09-14",
    title: "Cases, ANC and Dashboard targets, tidied up",
    items: [
      { kind: "improved", text: "ANC on the Dashboard is now counted from signed cases, with new ANC Inforced and ANC Collected cards." },
      { kind: "improved", text: "Servicing shows a collected figure and a JomPAY reminder, and the closing date now follows the certificate." },
      { kind: "improved", text: "Submit Case no longer asks for Plan Type, has a religion dropdown, and defaults smoker status." },
      { kind: "improved", text: "Dashboard targets are named Yearly Target and Monthly Target, and the layout is more compact." },
      { kind: "fixed", text: "Dates across the app now follow Malaysia time everywhere." },
      { kind: "fixed", text: "Missing closing dates were filled in and the lead number sequence was cleaned up." },
    ],
  },
  {
    date: "2026-09-13",
    title: "Manage Cases and Servicing arrive",
    items: [
      { kind: "new", text: "Submit a case from a lead. The case form takes nominee phone numbers and picks benefits from a fixed list." },
      { kind: "new", text: "A Submission stage in the pipeline and a Servicing section for clients after they are inforced." },
      { kind: "new", text: "Each lead gets its own lead number." },
      { kind: "improved", text: "Servicing handover and contribution schedules are worked out for you, with labelled boxes that are easier to read." },
      { kind: "fixed", text: "Dashboard dates now follow Malaysia time rather than your device's clock." },
    ],
  },
  {
    date: "2026-09-11",
    title: "A more useful Dashboard and Statistics",
    items: [
      { kind: "new", text: "Dashboard has a live clock, Manage Widgets to choose what you see, and a Sales/Leads split." },
      { kind: "new", text: "A Needs follow-up card on the Dashboard shows leads waiting on you." },
      { kind: "new", text: "Statistics opens on your own personal performance, and you can drill down by anyone you are allowed to see." },
      { kind: "new", text: "A long-form Medical Card funnel template in Lead Generation." },
      { kind: "new", text: "Managers can reset a user's password from Edit User." },
      { kind: "improved", text: "The goal panel is reordered with a gold progress bar, and the pipeline splits ANC by stage." },
      { kind: "improved", text: "Long lead lists on the Dashboard stop at six rows and scroll." },
    ],
  },
  {
    date: "2026-09-10",
    title: "ANC goals and a daily scoreboard",
    items: [
      { kind: "new", text: "Dashboard tracks your ANC goal and shows a daily approach scoreboard and a gold closing card." },
      { kind: "improved", text: "On Lead Detail the WhatsApp Flow card is repositioned and the template list is capped to six rows." },
      { kind: "fixed", text: "Fixed a few bugs reported from live use, including deleting a user and the WhatsApp share button." },
    ],
  },
  {
    date: "2026-09-09",
    title: "Closing scripts, lead numbers and mobile leads",
    items: [
      { kind: "new", text: "Closing Scripts libraries under WA Flow, including Medical Card and Hibah & Faraid, usable right from Lead Detail." },
      { kind: "new", text: "Lead numbers, family and relatives on a lead, a Quick Action button, and birthday cards." },
      { kind: "new", text: "Potential ANC and plan interest on Sales Pipeline cards." },
      { kind: "improved", text: "Everyone now creates their own leads." },
      { kind: "improved", text: "Mobile Leads list is easier to use, and the sidebar submenus open with a chevron." },
      { kind: "improved", text: "You are now asked to confirm before deleting something or exporting." },
      { kind: "fixed", text: "Daily counts now follow Malaysia time." },
    ],
  },
  {
    date: "2026-09-08",
    title: "Lead Generation grows up",
    items: [
      { kind: "new", text: "My Team now shows your whole organisation." },
      { kind: "improved", text: "Deleted leads can be recovered, and QuickQuote forms and Lead Generation are in English with a cleaner look." },
      { kind: "fixed", text: "Invite and password reset links now work reliably." },
    ],
  },
  {
    date: "2026-09-07",
    title: "Lead Generation: your own landing pages",
    items: [
      { kind: "new", text: "Build your own landing page with a built-in page builder, and capture leads straight into your pipeline." },
    ],
  },
  {
    date: "2026-09-06",
    title: "Appointments, WA Flow board and a faster, safer CRM",
    items: [
      { kind: "new", text: "Appointments, with an Appointment stage in the pipeline and a notification bell." },
      { kind: "new", text: "A WA Flow board, a WhatsApp card on Lead Detail, and lead rebalancing for managers." },
      { kind: "new", text: "A Servicing stage, and Dashboard headline cards tied to the calendar." },
      { kind: "improved", text: "Pages respond faster, and saving targets is quicker." },
      { kind: "improved", text: "Your data is better protected, with extra safeguards added after a full security review." },
    ],
  },
  {
    date: "2026-09-05",
    title: "Recruit agents, quotations that behave, mobile menu",
    items: [
      { kind: "new", text: "Recruit new agents with a shareable link, with manager approval before they join." },
      { kind: "new", text: "Everyone can set targets for themselves and their downline." },
      { kind: "new", text: "A dedicated Invite agent shortcut, an occupation class dropdown on leads, and clickable links in quotation PDFs." },
      { kind: "new", text: "On mobile, a Menu drawer replaces the Me tab, and the activity calendar opens a day's detail." },
      { kind: "improved", text: "Quotation PDFs are now a single A4 portrait page, named after the lead, with your sign-off." },
      { kind: "improved", text: "Saving a quotation updates the existing one for that lead and product instead of making duplicates." },
      { kind: "improved", text: "Inactive team members no longer receive new leads." },
      { kind: "fixed", text: "Blank quotation PDFs and a Dashboard crash on the activity calendar were fixed." },
    ],
  },
  {
    date: "2026-09-02",
    title: "Easier invites and quotation management",
    items: [
      { kind: "new", text: "Edit a quotation or delete it, one at a time or in bulk." },
      { kind: "new", text: "Share an invite straight to WhatsApp, and edit a user's name, email and phone." },
      { kind: "improved", text: "WA Flow placeholders now read as {{Name}} and similar, which are easier to understand." },
      { kind: "fixed", text: "Invite and password reset emails are now delivered reliably." },
    ],
  },
  {
    date: "2026-08-30",
    title: "Quotation Customizer and a new Aspirant Unit Manager role",
    items: [
      { kind: "new", text: "A Quotation Customizer, with quotations saved on each lead and a quick preview." },
      { kind: "new", text: "A new Aspirant Unit Manager role, leads assigned by rank, and password reset." },
      { kind: "new", text: "Import leads from a Google Sheet." },
      { kind: "improved", text: "Pipeline cards: drag the whole card, with a stage dropdown instead of Move buttons." },
      { kind: "improved", text: "Delete a lead from inside its Edit window." },
      { kind: "improved", text: "Add and Edit Lead now cover every field, with postcode and agent remarks, and Lead Detail's stage and owner are fully editable." },
      { kind: "fixed", text: "The Dashboard ANC label now shows the correct figure." },
    ],
  },
  {
    date: "2026-08-28",
    title: "Settings, quotation calculators and a full quality pass",
    items: [
      { kind: "new", text: "Quotation calculators open inside the CRM, pre-filled with the lead's details." },
      { kind: "new", text: "A Settings area for SuperAdmin, and unit managers can now set targets." },
      { kind: "improved", text: "Leads Manager actions are simpler and Pipeline drag-and-drop was checked and tidied." },
      { kind: "improved", text: "A full check of every screen on a phone found and fixed layout problems on six screens." },
      { kind: "improved", text: "Security and data-protection checks across the app, and clearer messages if the connection drops mid-save." },
    ],
  },
  {
    date: "2026-08-27",
    title: "Prestige Legacy CRM goes live",
    items: [
      { kind: "new", text: "Login, Dashboard, Leads Manager, Lead Detail, Sales Pipeline, My Team, WA Flow and Statistics." },
      { kind: "new", text: "Friendly empty-state messages when a list has nothing in it yet." },
    ],
  },
];
