# Financial Storyboard — design source

Extracted from the Claude Design bundle (`Financial_Storyboard.html`, kept alongside). Each `.html` here opens standalone in a browser. Each `.src.html` is the unpacked template with its `renderVals()` / `buildFlow()` logic — the spec for the calculation engine.

| # | Screen | Rendered | Source |
|---|---|---|---|
| 0 | Entry A · Lead popup with Financial Storyboard button | [00-LeadPopup.html](00-LeadPopup.html) | [00-LeadPopup.src.html](00-LeadPopup.src.html) |
| 1 | Entry B · Sidebar › Financial Storyboard (all leads) | [01-Storyboards.html](01-Storyboards.html) | [01-Storyboards.src.html](01-Storyboards.src.html) |
| 2 | Step 1 · Fill & Calculate (Hibah) | [02-Main.html](02-Main.html) | [02-Main.src.html](02-Main.src.html) |
| 3 | Step 2 · Explanation (2D scenes + script) | [03-Explain.html](03-Explain.html) | [03-Explain.src.html](03-Explain.src.html) |
| 4 | Step 3 · Rejection Risk | [04-Risk.html](04-Risk.html) | [04-Risk.src.html](04-Risk.src.html) |
| 5 | Step 4 · Objection | [05-Objections.html](05-Objections.html) | [05-Objections.src.html](05-Objections.src.html) |
| 6 | Medical Card · Step 1 · Fill & Calculate | [06-MedMain.html](06-MedMain.html) | [06-MedMain.src.html](06-MedMain.src.html) |
| 7 | Medical Card · Step 2 · Explanation | [07-MedExplain.html](07-MedExplain.html) | [07-MedExplain.src.html](07-MedExplain.src.html) |
| 8 | Medical Card · Step 3 · Rejection Risk | [08-MedRisk.html](08-MedRisk.html) | [08-MedRisk.src.html](08-MedRisk.src.html) |
| 9 | Medical Card · Step 4 · Objection | [09-MedObjections.html](09-MedObjections.html) | [09-MedObjections.src.html](09-MedObjections.src.html) |
| 10 | Critical Illness · Step 1 · Fill & Calculate | [10-CiMain.html](10-CiMain.html) | [10-CiMain.src.html](10-CiMain.src.html) |
| 11 | Critical Illness · Step 2 · Explanation | [11-CiExplain.html](11-CiExplain.html) | [11-CiExplain.src.html](11-CiExplain.src.html) |
| 12 | Critical Illness · Step 3 · Rejection Risk | [12-CiRisk.html](12-CiRisk.html) | [12-CiRisk.src.html](12-CiRisk.src.html) |
| 13 | Critical Illness · Step 4 · Objection | [13-CiObjections.html](13-CiObjections.html) | [13-CiObjections.src.html](13-CiObjections.src.html) |
| 14 | Business Protection · Step 1 · Fill & Calculate | [14-BizMain.html](14-BizMain.html) | [14-BizMain.src.html](14-BizMain.src.html) |
| 15 | Business Protection · Step 2 · Explanation | [15-BizExplain.html](15-BizExplain.html) | [15-BizExplain.src.html](15-BizExplain.src.html) |
| 16 | Business Protection · Step 3 · Rejection Risk | [16-BizRisk.html](16-BizRisk.html) | [16-BizRisk.src.html](16-BizRisk.src.html) |
| 17 | Business Protection · Step 4 · Objection | [17-BizObjections.html](17-BizObjections.html) | [17-BizObjections.src.html](17-BizObjections.src.html) |
| 18 | Portal 1 · Log in (full name + phone) | [18-PortalLogin.html](18-PortalLogin.html) | [18-PortalLogin.src.html](18-PortalLogin.src.html) |
| 19 | Portal 2 · WhatsApp code (Recommended) | [19-PortalVerify.html](19-PortalVerify.html) | [19-PortalVerify.src.html](19-PortalVerify.src.html) |
| 20 | Portal 3 · My saved storyboards | [20-PortalHome.html](20-PortalHome.html) | [20-PortalHome.src.html](20-PortalHome.src.html) |
| 21 | Portal 4 · Storyboard view (client-safe) | [21-PortalStory.html](21-PortalStory.html) | [21-PortalStory.src.html](21-PortalStory.src.html) |

## Phase 0 decisions that override the design

- PortalVerify (WhatsApp OTP) is **dropped**. The portal uses a magic link plus full name and phone.
- Medical bill costs and the 15% medical inflation become editable placeholders with a source field.
- The CI "[Your story]" becomes an empty, agent-only field.
- Hibah "fills the gap · 100%" becomes "could fill the gap, subject to the PDS & certificate terms".
- Hibah copy is fixed to "Default: replace 80%".
- Module 5, Mortgage (MRTT vs MLTT), has no design here. It is designed in Phase 4b.

Full plan: [PLAN.md](PLAN.md).
