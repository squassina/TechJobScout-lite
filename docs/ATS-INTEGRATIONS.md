# ATS integrations and source reliability

TechJobScout Lite calls public job-board endpoints directly from the browser. It does not scrape authenticated pages, run a server-side proxy or bypass provider access controls.

| Source | Integration | Key constraint |
|---|---|---|
| Greenhouse | Public board API | Public board slug |
| Ashby | Public posting API | Board name |
| Lever | Public postings API | Site slug |
| Workable | Public widget API | Account slug |
| SmartRecruiters | Public postings API | Company/board identifier; detail enrichment is best effort |
| Recruitee | Public offers API | Company subdomain |
| Gupy | Public jobs API | Numeric company ID and pagination |
| Workday / other | Manual HTTPS link | No direct API integration |

HTTP 403/404 can indicate access restrictions or an incorrect board identifier. Network errors and browser CORS restrictions can make a public endpoint unavailable. A successful HTTP response does not guarantee usable job records. Detail enrichment is best effort, and postings can change after search; verify the original URL before applying.

The live validator (`npm run check:ats`) checks endpoints from Node.js. Success confirms server-side reachability and expected response structure at validation time; it does not prove that GitHub Pages can access the endpoint because Node.js is not subject to browser CORS enforcement.
