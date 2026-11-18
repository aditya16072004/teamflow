# TeamFlow — Collaborative Task Management
A full-stack task and team management web application built with **React, Vite, Tailwind CSS, and Supabase** for the **KODBEES technical assessment**. TeamFlow brings personal tasks, team workspaces, assignments, deadlines, and collaboration into one interface.
> **Project status:** Core task and team workflows have been developed. Some integrations (Google OAuth, confirmation emails, SMS MFA, and production deployment) require external configuration and end-to-end verification. The optional collaboration enhancements described below are based on the latest shared source files; verify that they are included in the version committed to this repository.
## Features
### Authentication and profiles
- Email/password registration and sign-in using Supabase Auth
- Google OAuth sign-in (requires Google and Supabase provider configuration)
- Registration fields for full name, gender, date of birth, and international-format mobile number
- Profile completion flow for Google users when required information is missing
- Login error dialog and success notifications for signup, login, and logout
- Profile name editing and avatar upload (requires an `avatars` storage bucket and policies)
- Optional email confirmation (requires working Supabase Auth email delivery)
**Important:** A mobile number saved in profile metadata is **not** the same as a verified phone number. Mandatory SMS OTP / phone MFA is **not active** until an SMS provider, factor enrollment, verification, and server-side authorization are configured.
### Task management
- Create, view, update, and delete tasks
- Set descriptions, priorities, statuses, and due dates
- Personal tasks and shared team tasks
- Assign team tasks to team members
- Search, filter, and view task summaries
- Dashboard statistics and deadline calendar
### Team collaboration
- Create teams and manage memberships
- Invite members by email and accept pending invitations
- Owner/member roles with task-management restrictions
- Invitation email delivery through a Supabase Edge Function and Resend (optional; requires configuration)
### Additional collaboration features
The latest shared enhanced application source includes:
- Drag-and-drop Kanban board with **To Do**, **In Progress**, and **Completed** columns
- Task comments
- Activity history
- Supabase Realtime subscriptions for shared-data refresh
- In-app activity notifications (not push notifications)
- Dark-mode toggle
Comments and activity history require the accompanying SQL migration. Realtime requires publication configuration. These features should be tested against your Supabase project before claiming production readiness.
## Tech stack
| Layer | Technology |
| --- | --- |
| Frontend | React, JavaScript (JSX), Vite |
| Styling | Tailwind CSS, custom CSS |
| Icons | Lucide React |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Authorization | PostgreSQL Row Level Security (RLS) |
| File storage | Supabase Storage |
| Live data | Supabase Realtime |
| Optional email | Supabase Edge Functions, Resend |
| Hosting | Vercel (recommended; deploy separately) |
## Getting started

### Prerequisites
- Node.js and npm
- A Supabase project
- Git
### 1. Clone the repository
```bash
git clone https://github.com/aditya16072004/teamflow.git
cd teamflow
```
### 2. Install dependencies
```bash
npm install
```
### 3. Configure environment variables
Create a `.env` file in the project root:
```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
```
Use the exact environment variable names referenced by `src/lib/supabase.js` if they differ. Obtain the values from your Supabase project's API settings.
**Never commit `.env`, service-role keys, Resend API keys, Google client secrets, or Twilio credentials.** The frontend Supabase publishable/anon key is designed to be public, but database access must be protected by RLS.
### 4. Configure Supabase
1. Create or connect a Supabase project.
2. Enable Email authentication under **Authentication → Providers**.
3. Create the application's `tasks`, `teams`, `team_members`, and `team_invitations` tables and apply the project's RLS policies and invitation-acceptance function.
4. If using the optional collaboration enhancements, apply the included `TeamFlow_All_Features.sql` migration **only after reviewing it against your current schema**. It adds comments/activity support and attempts to configure Realtime.
5. If using profile photos, create and secure the `avatars` storage bucket with appropriate user-scoped policies.
6. Configure the **Authentication → URL Configuration** site URL and allowed redirects for local development and production.
> **Schema note:** The optional migration assumes `tasks.id` uses UUID and that team membership columns match the existing application. Do not run an incompatible migration blindly. Database migrations and RLS rules must be reviewed for the actual deployed schema.
### 5. Start the development server
```bash
npm run dev
```
Open the local URL shown by Vite (commonly `http://localhost:5173`).
### 6. Build for production
```bash
npm run build
npm run preview
```
## Optional integrations

### Google sign-in
1. Create an OAuth web client in Google Cloud Console.
2. Add the **Supabase Auth callback URL** as an authorized redirect URI in Google Cloud.
3. Enable the Google provider in Supabase Auth and provide the OAuth client credentials there.
4. Allow your local and deployed app URLs in Supabase Auth URL Configuration.
5. Test new and existing Google accounts, including the required-profile completion flow.
Standard Google OAuth profile data generally includes name, email, and possibly an avatar. It does **not** reliably provide date of birth, gender, or phone number; collect missing fields in the app.
### Confirmation and invitation emails
- **Signup confirmation:** Configure Supabase Auth email delivery, preferably using verified-domain custom SMTP for real recipients.
- **Team invitations:** Configure the `send-team-invitation` Supabase Edge Function, its required secrets (including `RESEND_API_KEY`, `TEAMFLOW_FROM_EMAIL`, and `TEAMFLOW_APP_URL`), and a verified sending domain.
- These are separate email systems; configuring invitation delivery does not automatically configure Auth confirmation messages.
### SMS MFA
Phone-based OTP is a **planned integration**, not an enabled security control. To require it, configure an SMS provider supported by Supabase, enroll and verify phone factors, enforce `aal2` for protected operations, and add recovery and rate-limiting procedures. Do not rely on a frontend-only OTP dialog for access control.
## Project structure
A typical layout for this Vite application is:
```text
teamflow/
├── public/
├── src/
│   ├── App.jsx               # Dashboard, tasks, teams, collaboration
│   ├── Auth.jsx              # Login, signup, Google OAuth
│   ├── Auth.css              # Authentication styles
│   ├── lib/
│   │   └── supabase.js       # Supabase client
│   ├── main.jsx              # React entry point
│   └── TeamFlow_Dark_Mode.css # Optional enhanced UI stylesheet
├── .env                      # Local secrets; not committed
├── .gitignore
├── package.json
└── README.md
```
The actual repository layout may differ; this is an orientation guide rather than an audited file inventory.
## Access control and security
- Enable RLS on all application tables and define policies based on authenticated user identity, team membership, and ownership.
- Enforce task permissions **in database policies**, not only by hiding UI buttons.
- Restrict comments and activity records to users who may access the associated tasks.
- Restrict avatar uploads to user-owned paths.
- Treat profile fields (especially date of birth and phone number) as personal information; minimize access and retention.
- Avoid storing secrets in client-side `VITE_` variables.
- Review all policies and SQL functions, especially `SECURITY DEFINER` functions, before production deployment.
## Testing checklist
- [ ] Email/password signup, confirmation, login, and logout
- [ ] Google sign-in and completion of required profile fields
- [ ] Create, edit, delete, assign, and filter tasks
- [ ] Drag a task between Kanban columns and confirm the change persists
- [ ] Create a team and invite another account
- [ ] Accept an invitation and verify membership
- [ ] Post a comment and verify visibility from another authorized account
- [ ] Confirm activity history and in-app notifications
- [ ] Confirm Realtime updates between two sessions
- [ ] Verify calendar deadlines and dark-mode persistence
- [ ] Confirm unauthorized users cannot read or modify other teams' data
- [ ] Test responsive layouts, loading states, and error handling
- [ ] Confirm the production OAuth redirect and email links work
## Deployment (Vercel)
1. Push your latest working code to GitHub.
2. Import this repository into [Vercel](https://vercel.com/new).
3. Select the **Vite** framework preset.
4. Set build command to `npm run build` and output directory to `dist`.
5. Configure the same public Supabase environment variables used locally.
6. Deploy, then update Supabase Auth's site URL and redirect allow list with your Vercel URL.
7. Update `TEAMFLOW_APP_URL` for invitation emails, if used.
8. Run the testing checklist against the deployed app.
A successful Vercel build does not by itself verify Supabase policies, email delivery, or OAuth callbacks.
## Future improvements
- Fully enforced phone MFA and account recovery
- Verified production email delivery and bounce monitoring
- Automated unit, integration, and end-to-end tests
- More granular team roles and permissions
- Accessibility and performance audits
## Repository
**GitHub:** https://github.com/aditya16072004/teamflow
## Author
Developed by **Aditya Kumar Jha** as part of the **KODBEES technical assessment**.
## License
No license is specified here. Add a `LICENSE` file if you intend to grant reuse permissions.
## Live Demo
🚀 **TeamFlow is deployed on Vercel!**
**Live Application:** https://teamflow-three-omega.vercel.app/
**GitHub Repository:** https://github.com/aditya16072004/teamflow