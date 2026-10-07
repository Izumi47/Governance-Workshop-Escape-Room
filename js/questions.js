/**
 * Game content — Finance Python & Power BI governance (Draft v1).
 *
 * Question types:
 * - choice (default): options[] + correct (0-based index)
 * - fill: text with ___ blank + answers[] (accepted variants, case-insensitive)
 * - checkbox: options[] + correct ([0-based indices]) — select all that apply
 *
 * Each question: 45s (40 questions = 30 minutes max).
 */
window.GAME_DATA = {
  title: "The Data Governance Vault",
  timeBonusMax: 50,

  // Shuffle all questions into one mixed deck at session start (categories kept for progress).
  shuffleQuestions: true,
  // Shuffle multiple-choice / checkbox option order (remaps correct indices).
  shuffleOptions: true,

  // Leaderboard: hidden from players by default. Facilitators use ?facilitator=1
  // Set showToUsers: true when you want everyone to see it again.
  leaderboard: {
    showToUsers: false,
    facilitatorParam: "facilitator"
  },

  practice: {
    timeLimitMin: 90
  },

  // Score bands for 40 questions × 100 base (+ up to 50 speed). Max ≈ 6000.
  tiers: [
    { minScore: 4500, eyebrow: "Governance Champion", title: "Flawless Escape!", message: "Outstanding — you know the vault rules inside and out." },
    { minScore: 3000, eyebrow: "Vault Specialist", title: "You Escaped!", message: "Solid governance instincts. A few gaps to review, but you're free." },
    { minScore: 1500, eyebrow: "Almost There", title: "Door Unlocked… Barely", message: "You made it out, but the vault flagged several policy gaps." },
    { minScore: 0, eyebrow: "Training Required", title: "Reality Check", message: "The vault keeps its secrets. Review the governance docs and try again." }
  ],

  chambers: [
    {
      id: "python",
      name: "Python Chamber",
      icon: "assets/icons/python.png",
      iconLabel: "PY",
      wireColor: "#3dd68c",
      description: "Finance Python projects — ownership, build standards, and supportability.",
      questions: [
        {
          id: "py-1",
          text: "Why does the Python governance standard emphasise understandable, repeatable solutions?",
          options: [
            "So projects can later be maintained by users with limited Python experience",
            "So developers never need to write documentation",
            "So scripts can skip approval if they run on a desktop",
            "So packages can be installed without a dependency file"
          ],
          correct: 0,
          timeLimit: 45,
          basePoints: 100,
          explain: "The standard is designed for projects that may later be maintained by users with limited Python experience."
        },
        {
          id: "py-2",
          type: "checkbox",
          text: "Which Python work does this standard apply to? (Select all that apply)",
          options: [
            "Scripts for reporting, reconciliations, automation, or data preparation",
            "Scheduled Python jobs and desktop-run Python tools",
            "Solutions whose outputs are consumed by Finance, Power BI, or other processes",
            "Only experimental notebooks that never leave a personal laptop"
          ],
          correct: [0, 1, 2],
          timeLimit: 45,
          basePoints: 100,
          explain: "It covers Finance Python scripts, scheduled/desktop tools, and solutions feeding Finance, Power BI, or other business processes."
        },
        {
          id: "py-3",
          text: "Before go-live, every Python project must have a named:",
          options: [
            "Primary owner only",
            "Primary owner, backup owner, and line manager",
            "Backup owner only",
            "External contractor as sole owner"
          ],
          correct: 1,
          timeLimit: 45,
          basePoints: 100,
          explain: "Mandatory requirements include a named primary owner, backup owner, and line manager."
        },
        {
          id: "py-4",
          type: "fill",
          text: "Every Python project must include a dependency file such as ___.",
          answers: ["requirements.txt", "requirements", "a requirements.txt"],
          timeLimit: 45,
          basePoints: 100,
          explain: "A dependency file such as requirements.txt is mandatory before go-live."
        },
        {
          id: "py-5",
          text: "What is the rule on hard-coded user-specific paths in production Python code?",
          options: [
            "They are encouraged for clarity",
            "They are not allowed — use dynamic, relative, environment, or configurable paths",
            "They are fine if left in comments",
            "They are required for SharePoint uploads"
          ],
          correct: 1,
          timeLimit: 45,
          basePoints: 100,
          explain: "Hard-coded user-specific paths are not allowed in production code."
        },
        {
          id: "py-6",
          text: "Where must passwords, tokens, or secrets NOT be stored?",
          options: [
            "Only in a password manager",
            "Directly in code or documentation",
            "Only in environment variables",
            "Only in an approved secrets store"
          ],
          correct: 1,
          timeLimit: 45,
          basePoints: 100,
          explain: "Do not store passwords, tokens, or secrets directly in code or documentation."
        },
        {
          id: "py-7",
          type: "checkbox",
          text: "What are the minimum environment expectations? (Select all that apply)",
          options: [
            "Python version documented",
            "requirements.txt or equivalent available",
            "Setup steps tested by someone other than the original developer where practical",
            "Any Python version is fine if it runs once on the author's machine"
          ],
          correct: [0, 1, 2],
          timeLimit: 45,
          basePoints: 100,
          explain: "Document the Python version, ship a reproducible dependency file, and have setup tested by someone else where practical."
        },
        {
          id: "py-8",
          text: "Operational readiness requires documenting which of the following?",
          options: [
            "Only the author's preferred IDE theme",
            "Triggers, schedules, runtime expectations, expected outputs, and recovery steps",
            "Marketing copy for the project name",
            "Personal OneDrive shortcuts only"
          ],
          correct: 1,
          timeLimit: 45,
          basePoints: 100,
          explain: "Triggers, schedules, runtime expectations, outputs, failure points, and recovery steps must be documented."
        },
        {
          id: "py-9",
          text: "Documentation must be complete enough for a backup owner to answer questions such as:",
          options: [
            "How to install and run it, what Python version and libraries it needs, and how to resolve common errors",
            "Only the project owner's favourite coffee order",
            "Only which laptop brand was used",
            "Nothing — verbal handover is enough"
          ],
          correct: 0,
          timeLimit: 45,
          basePoints: 100,
          explain: "Docs must let a backup owner install, run, understand dependencies, check outputs, and resolve common errors."
        },
        {
          id: "py-10",
          type: "checkbox",
          text: "A Python project is not governance-ready unless which are true? (Select all that apply)",
          options: [
            "Owner and backup owner are named",
            "SharePoint folder is complete and approval evidence is retained",
            "Handover has been completed",
            "Hard-coded personal paths remain undocumented in production"
          ],
          correct: [0, 1, 2],
          timeLimit: 45,
          basePoints: 100,
          explain: "Acceptance requires named owners, complete SharePoint evidence, completed handover, and removal or controlled justification of personal paths."
        }
      ]
    },
    {
      id: "powerbi",
      name: "Power BI Chamber",
      icon: "assets/icons/power-bi.png",
      iconLabel: "PBI",
      wireColor: "#59c2ff",
      description: "Reports, models, and workspaces — prove Finance Power BI stays maintainable.",
      questions: [
        {
          id: "pbi-1",
          text: "What is the goal of the Power BI governance standard?",
          options: [
            "Make every report, dataset, semantic model, and dashboard understandable without undocumented knowledge",
            "Allow personal My Workspace as the only publish location",
            "Remove the need for owners or backup owners",
            "Ban documentation for calculated measures"
          ],
          correct: 0,
          timeLimit: 45,
          basePoints: 100,
          explain: "Every report, dataset, semantic model, and dashboard must be understandable and maintainable by another team member."
        },
        {
          id: "pbi-2",
          type: "checkbox",
          text: "This Power BI standard applies to: (Select all that apply)",
          options: [
            "Power BI reports and dashboards",
            "Power BI datasets or semantic models",
            "Published content in the department workspace",
            "Solutions with Power Automate or Power Apps dependencies"
          ],
          correct: [0, 1, 2, 3],
          timeLimit: 45,
          basePoints: 100,
          explain: "It covers reports, dashboards, datasets/semantic models, department workspace content, and Power Automate/Apps dependencies."
        },
        {
          id: "pbi-3",
          text: "Which storage must NOT be treated as the primary governed production data dependency?",
          options: [
            "Business-accessible SharePoint sources where appropriate",
            "Local storage, personal OneDrive folders, and Box",
            "Approved enterprise source systems",
            "Documented departmental data platforms"
          ],
          correct: 1,
          timeLimit: 45,
          basePoints: 100,
          explain: "Local storage, personal OneDrive folders, and Box must not be the primary governed production dependency."
        },
        {
          id: "pbi-4",
          type: "fill",
          text: "___ is on hold unless separately approved as a Power BI data source.",
          answers: ["Dataverse", "Microsoft Dataverse"],
          timeLimit: 45,
          basePoints: 100,
          explain: "Dataverse is on hold unless separately approved."
        },
        {
          id: "pbi-5",
          type: "checkbox",
          text: "Data model transparency requires documenting: (Select all that apply)",
          options: [
            "Source systems and source locations",
            "Tables loaded and Power Query transformations",
            "Calculated columns, measures, relationships, and assumptions",
            "Row-level security design, if used"
          ],
          correct: [0, 1, 2, 3],
          timeLimit: 45,
          basePoints: 100,
          explain: "Document sources, tables, transformations, measures/columns, relationships/assumptions, and RLS if used."
        },
        {
          id: "pbi-6",
          text: "Where must Power BI content be published?",
          options: [
            "Any personal My Workspace",
            "The approved department workspace",
            "A public anonymous link only",
            "A local .pbix left on a desktop"
          ],
          correct: 1,
          timeLimit: 45,
          basePoints: 100,
          explain: "Content must be published in the approved department workspace."
        },
        {
          id: "pbi-7",
          text: "What refresh information must be recorded?",
          options: [
            "Nothing — refresh is optional to document",
            "Refresh ownership and contact details",
            "Only the colour of the report theme",
            "Only the author's personal email nickname"
          ],
          correct: 1,
          timeLimit: 45,
          basePoints: 100,
          explain: "Refresh ownership and contact details must be recorded."
        },
        {
          id: "pbi-8",
          text: "Support-ready documentation should make clear what to do when:",
          options: [
            "Numbers look wrong, and how common failures are recovered",
            "The author is on holiday and unreachable forever",
            "Users want to skip workspace security",
            "Local CSV files replace all governed sources"
          ],
          correct: 0,
          timeLimit: 45,
          basePoints: 100,
          explain: "Docs must cover purpose, sources, refresh ownership, access, checks when numbers look wrong, and recovery from common failures."
        },
        {
          id: "pbi-9",
          text: "The SharePoint governance folder must contain or reference the latest approved:",
          options: [
            "Screenshot of the author's desktop wallpaper",
            ".pbix file or reference to the managed source location",
            "Personal OneDrive sync cache only",
            "Unsigned draft with no approval evidence"
          ],
          correct: 1,
          timeLimit: 45,
          basePoints: 100,
          explain: "SharePoint must include the completed docs and the latest approved .pbix (or managed source reference)."
        },
        {
          id: "pbi-10",
          type: "checkbox",
          text: "A Power BI project is not governance-ready unless: (Select all that apply)",
          options: [
            "Owner and backup owner are named",
            "Data sources, tables, transformations, and measures are documented",
            "Publish location, refresh settings, and contacts are documented",
            "SharePoint is complete, approvals retained, and handover completed"
          ],
          correct: [0, 1, 2, 3],
          timeLimit: 45,
          basePoints: 100,
          explain: "The minimum acceptance checklist requires ownership, full model docs, publish/refresh documentation, SharePoint completeness, approvals, and handover."
        }
      ]
    },
    {
      id: "alm",
      name: "ALM Chamber",
      icon: "assets/icons/power-apps.png",
      iconLabel: "ALM",
      wireColor: "#f0a030",
      description: "Go-live, handover, and ongoing ownership — keep solutions supportable over time.",
      questions: [
        {
          id: "alm-1",
          text: "What is the purpose of ALM governance for Power Platform solutions?",
          options: [
            "Ensure solutions are secure, compliant, scalable, and ready for deployment",
            "Allow solutions to move directly from an idea to production without review",
            "Replace security roles with one shared account",
            "Limit governance to the day the solution is deployed"
          ],
          correct: 0,
          timeLimit: 45,
          basePoints: 100,
          explain: "ALM governance helps ensure Power Platform solutions are secure, compliant, scalable, and ready for deployment."
        },
        {
          id: "alm-2",
          text: "Which sequence is the standard ALM environment pathway?",
          options: [
            "DEV > UAT > PROD",
            "PROD > UAT > DEV",
            "DEV > PROD > UAT",
            "One shared environment only"
          ],
          correct: 0,
          timeLimit: 45,
          basePoints: 100,
          explain: "The deck defines the standard pathway as DEV for development, UAT for testing, then PROD for full deployment."
        },
        {
          id: "alm-3",
          text: "Which statement best matches the deck's database-selection guidance?",
          options: [
            "Choose between SharePoint List and Dataverse based on users, data volume, and external-data needs",
            "Always use Dataverse regardless of data size or user count",
            "Always use local files for transactional data",
            "Choose the database only after production deployment"
          ],
          correct: 0,
          timeLimit: 45,
          basePoints: 100,
          explain: "The deck frames database selection around user count, data volume, and whether the solution uses external data, with SharePoint List and Dataverse as the main choices."
        },
        {
          id: "alm-4",
          text: "Which platform is used for the new idea, environment-access, and solution-review requests described in the deck?",
          options: [
            "LCNC C4E Empower Suite",
            "An unauthorised My Workspace",
            "A personal OneDrive folder",
            "A private chat with no recorded request"
          ],
          correct: 0,
          timeLimit: 45,
          basePoints: 100,
          explain: "The deck routes new idea, environment access, and solution review requests through the LCNC C4E Empower Suite."
        },
        {
          id: "alm-5",
          type: "checkbox",
          text: "What information is requested when gaining access to an ALM environment? (Select all that apply)",
          options: [
            "Business case",
            "Criticality",
            "Power Platform component",
            "Additional contacts",
            "An unapproved personal workspace name"
          ],
          correct: [0, 1, 2, 3],
          timeLimit: 45,
          basePoints: 100,
          explain: "The environment access form asks for the business case, criticality, Power Platform component, and additional contacts."
        },
        {
          id: "alm-6",
          type: "checkbox",
          text: "For Dataverse tables, what does the deck say must be configured? (Select all that apply)",
          options: [
            "Appropriate security roles",
            "Privileges, access level, and role depth",
            "Users or teams assigned through Active Directory",
            "One global role that gives every user organisation-wide access"
          ],
          correct: [0, 1, 2],
          timeLimit: 45,
          basePoints: 100,
          explain: "Dataverse governance requires appropriate table security roles, configured privileges/access levels/role depth, and controlled assignment to users or teams."
        },
        {
          id: "alm-7",
          text: "For external data, when does the deck say a Transfer Impact Assessment (TIA) applies?",
          options: [
            "When EU/UK personal data is shared with a third party outside AstraZeneca",
            "For every SharePoint List regardless of its data",
            "Only after a solution is already in production",
            "Only when no data leaves the Office 365 environment"
          ],
          correct: 0,
          timeLimit: 45,
          basePoints: 100,
          explain: "The deck marks TIA as applicable to external data when EU/UK personal data is shared with a third party outside AstraZeneca."
        },
        {
          id: "alm-8",
          text: "Which sequence matches the deck's route for preparing a solution for production review?",
          options: [
            "Package the project into a Power Apps solution, then raise a Solution Review request to Production in Empower Suite",
            "Publish directly from a personal environment and request review afterwards",
            "Skip compliance details and submit only after deployment",
            "Keep the project outside Power Apps Solutions until production"
          ],
          correct: 0,
          timeLimit: 45,
          basePoints: 100,
          explain: "The deck instructs teams to package projects into a solution and then raise a Solution Review request to Production through the LCNC C4E Empower Suite."
        },
        {
          id: "alm-9",
          type: "checkbox",
          text: "What does ongoing governance require after deployment? (Select all that apply)",
          options: [
            "Request analytics usage reports and monitor app, flow, or agent usage",
            "Raise minor enhancements or bug fixes as needed",
            "Follow up with the project owner for major upgrades",
            "Treat deployment as the end of governance"
          ],
          correct: [0, 1, 2],
          timeLimit: 45,
          basePoints: 100,
          explain: "Deployment is not the end: teams should monitor usage, raise minor enhancements or bug fixes, and involve the project owner for major upgrades."
        },
        {
          id: "alm-10",
          text: "Power Automate flows must also follow:",
          options: [
            "Structured ALM and ownership rules",
            "Only ad-hoc personal ownership",
            "No deployment or monitoring process",
            "Power BI-only governance requirements"
          ],
          correct: 0,
          timeLimit: 45,
          basePoints: 100,
          explain: "The deck states that Power Automate flows must follow structured ALM and ownership rules too."
        }
      ]
    },
    {
      id: "sop",
      name: "SOP Chamber",
      icon: "assets/icons/sop.png",
      iconLabel: "SOP",
      wireColor: "#f07178",
      description: "Intake, SharePoint records, and approvals — the final lock on governed go-live.",
      questions: [
        {
          id: "sop-1",
          type: "fill",
          text: "All digital projects require a unique ID for identification, record and governance reference. This ID is called ___.",
          answers: ["IdeAZ", "ideaz"],
          timeLimit: 45,
          basePoints: 100,
          explain: "IdeAZ is the unique ID used as the governance reference for every digital project."
        },
        {
          id: "sop-2",
          type: "checkbox",
          text: "Which of the following content(s) is/are NOT required in the technical SOP? (Select all that apply)",
          options: [
            "User Guide",
            "Technical Guide",
            "Approval supporting document",
            "Business Continuity Plan"
          ],
          correct: [0, 2],
          timeLimit: 45,
          basePoints: 100,
          explain: "The User Guide and approval supporting documents are not required in the technical SOP."
        },
        {
          id: "sop-3",
          type: "checkbox",
          text: "What are the example required documentation for Python documentation? (Select all that apply)",
          options: [
            "Preinstallation of library and packages",
            "Recording of the process",
            "Details of input files",
            "Expected output files"
          ],
          correct: [0, 2, 3],
          timeLimit: 45,
          basePoints: 100,
          explain: "Python documentation covers library/package preinstallation, input file details, and expected output files."
        },
        {
          id: "sop-4",
          type: "checkbox",
          text: "What are the example required documentation for PowerBI documentation? (Select all that apply)",
          options: [
            "Step by step explanation of the overall PowerBI interface",
            "Explanation of measures created",
            "List of relationships",
            "Documentation of tables"
          ],
          correct: [1, 2, 3],
          timeLimit: 45,
          basePoints: 100,
          explain: "PowerBI documentation covers measures, relationships, and tables — not a walkthrough of the interface."
        },
        {
          id: "sop-5",
          type: "checkbox",
          text: "Which of the following statement(s) is/are false? (Select all that apply)",
          options: [
            "The Digital CoE team are the reviewers of the technical SOP",
            "The line managers are usually the approvers of the technical SOP",
            "The draft of the technical guide needs to follow 1:1 with the structure of the template given",
            "All out of scope activities needs to be justified"
          ],
          correct: [2],
          timeLimit: 45,
          basePoints: 100,
          explain: "The draft does not need to follow the template structure 1:1; the other statements are true."
        },
        {
          id: "sop-6",
          text: "The naming convention for all your digital projects should consist of:",
          options: [
            "Digital project name & PIC name",
            "IdeAZ & PIC name",
            "It is up to the owner as long as it is saved in the correct folder",
            "IdeAZ & Digital project name"
          ],
          correct: 3,
          timeLimit: 45,
          basePoints: 100,
          explain: "Digital projects are named using the IdeAZ and the digital project name."
        },
        {
          id: "sop-7",
          type: "fill",
          text: "The purpose of a ___ table is to clearly define the responsibilities of relevant activities and promote accountability.",
          answers: ["RACI", "RACI table"],
          timeLimit: 45,
          basePoints: 100,
          explain: "A RACI table defines responsibilities and promotes accountability."
        },
        {
          id: "sop-8",
          text: "Based on BCP tiering, a digital tool whereby a short operational disruption is acceptable, is usually classified as:",
          options: [
            "Tier 1 (Mission Critical)",
            "Tier 2 (Important Tool)",
            "Tier 3 (Informational Tool)",
            "Tier 4 (Minimal impact)"
          ],
          correct: 1,
          timeLimit: 45,
          basePoints: 100,
          explain: "Tools that can tolerate a short operational disruption are Tier 2 (Important Tool)."
        },
        {
          id: "sop-9",
          text: "An example of a digital tool that is normally classified as Tier 3 (Informational Tool) would be:",
          options: [
            "Employee payment run related",
            "Supplier payment flow",
            "KPI dashboards",
            "Daily operational trackers"
          ],
          correct: 2,
          timeLimit: 45,
          basePoints: 100,
          explain: "KPI dashboards are typically Tier 3 (Informational Tool)."
        },
        {
          id: "sop-10",
          type: "checkbox",
          text: "Why is a technical SOP important? (Select all that apply)",
          options: [
            "Promote stability and sustainability especially when original owner is no longer around",
            "Increase transparency and accessibility of the digital tool",
            "Makes it easier for technical team to troubleshoot and provide support",
            "Improve governance"
          ],
          correct: [0, 1, 2, 3],
          timeLimit: 45,
          basePoints: 100,
          explain: "A technical SOP supports stability, transparency, easier support, and better governance."
        }
      ]
    }
  ]
};
