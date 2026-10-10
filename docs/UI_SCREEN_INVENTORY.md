# Screen inventory

| ID | Route | Origin |
|---|---|---|
| M00 | /login | Adapted boxed login |
| M01 | /employee | Newly composed from template cards/buttons |
| M02 | /employee/report | Newly composed photo and optional description form |
| M03 | /employee/submitted/:id | Newly composed confirmation |
| M04 | /employee/requests | Template cards adapted for mobile |
| M05 | /employee/requests/:id | Shared detail composition |
| D00 | /it/login | Adapted boxed login |
| D01 | /it/inbox | Original ticket summary/list design and FullLayout adapted |
| D02 | /it/tickets/:id | Newly composed template detail cards/forms |
| D03 | /it/history | Existing TanStack DataTable with status/department filters |
| D04 | /it/employees | Existing Table primitives with mock account toggles |
| Extra | /employee/contact | Minimal contact guidance without invented phone number |

Original unrelated template routes remain available as reference pages. ITCare navigation contains only inbox, history and employees. Root routes to employee login. ITCare routes enforce mock role selection; this is not security.
