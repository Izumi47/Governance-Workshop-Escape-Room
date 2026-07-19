/**
 * Game content — edit chambers and questions here.
 * Replace placeholder ALM/SOP items with your org-specific content.
 *
 * Question types:
 * - choice (default): options[] + correct (0-based index)
 * - fill: text with ___ blank + answers[] (accepted variants, case-insensitive)
 * - checkbox: options[] + correct ([0-based indices]) — select all that apply
 */
window.GAME_DATA = {
  title: "The Data Governance Vault",
  timeBonusMax: 50,

  // Leaderboard: hidden from players by default. Facilitators use ?facilitator=1
  // Set showToUsers: true when you want everyone to see it again.
  leaderboard: {
    showToUsers: false,
    facilitatorParam: "facilitator"
  },

  practice: {
    timeLimitMin: 90
  },

  tiers: [
    { minScore: 900, eyebrow: "Governance Champion", title: "Flawless Escape!", message: "Outstanding — you know the vault rules inside and out." },
    { minScore: 600, eyebrow: "Vault Specialist", title: "You Escaped!", message: "Solid governance instincts. A few gaps to review, but you're free." },
    { minScore: 300, eyebrow: "Almost There", title: "Door Unlocked… Barely", message: "You made it out, but the vault flagged several policy gaps." },
    { minScore: 0, eyebrow: "Training Required", title: "Reality Check", message: "The vault keeps its secrets. Review the governance docs and try again." }
  ],

  chambers: [
    {
      id: "python",
      name: "Python Chamber",
      icon: "🐍",
      wireColor: "#3dd68c",
      description: "Scripts, repos, and secrets — prove you know how Python work stays compliant.",
      questions: [
        {
          id: "py-1",
          text: "Where should API keys and connection strings live in a governed Python project?",
          options: [
            "Hard-coded in source files for easy access",
            "Environment variables or a secure secrets store",
            "In a public README for team visibility",
            "Committed in a shared .env file on GitHub"
          ],
          correct: 1,
          timeLimit: 2,
          basePoints: 100,
          explain: "Secrets belong in environment variables or a managed secrets store — never in source control or public docs."
        },
        {
          id: "py-2",
          type: "fill",
          text: "A requirements.txt or pyproject.toml pins reproducible ___ for audit and deployment.",
          answers: ["dependencies", "dependency versions", "package dependencies"],
          timeLimit: 45,
          basePoints: 100,
          explain: "Pinning dependencies ensures reproducible builds and makes audits and deployments traceable."
        },
        {
          id: "py-3",
          type: "checkbox",
          text: "Before merging Python code to main, which steps should typically happen? (Select all that apply)",
          options: [
            "Peer review",
            "Automated checks (lint/tests) pass",
            "Direct push by any developer",
            "Skip documentation updates"
          ],
          correct: [0, 1],
          timeLimit: 60,
          basePoints: 100,
          explain: "Governed repos require peer review and passing automated checks before code reaches main."
        }
      ]
    },
    {
      id: "powerbi",
      name: "Power BI Chamber",
      icon: "📊",
      wireColor: "#59c2ff",
      description: "Workspaces, datasets, and sharing — navigate the BI governance maze.",
      questions: [
        {
          id: "pbi-1",
          text: "Who should have Build permission on a production Power BI dataset?",
          options: [
            "Everyone in the organisation",
            "Only users who need to create reports against governed data",
            "External contractors by default",
            "Anyone with a Pro licence"
          ],
          correct: 1,
          timeLimit: 60,
          basePoints: 100
        },
        {
          id: "pbi-2",
          type: "fill",
          text: "Dataset ___ signals to consumers that a dataset meets quality and ownership standards.",
          answers: ["certification", "certified"],
          timeLimit: 45,
          basePoints: 100
        },
        {
          id: "pbi-3",
          text: "Where should development and production Power BI assets typically be separated?",
          options: [
            "Same workspace with no naming convention",
            "Dedicated workspaces aligned to environment (dev/test/prod)",
            "Personal My Workspace only",
            "One shared folder on a local drive"
          ],
          correct: 1,
          timeLimit: 45,
          basePoints: 100
        }
      ]
    },
    {
      id: "alm",
      name: "ALM Chamber",
      icon: "🔄",
      wireColor: "#f0a030",
      description: "Power Platform pipelines and environments — move solutions safely to production.",
      questions: [
        {
          id: "alm-1",
          text: "In Power Platform ALM, what is the recommended flow for solution changes?",
          options: [
            "Edit directly in production",
            "Develop in a lower environment, then deploy through a pipeline",
            "Export from prod and import back to prod",
            "Email .zip files between admins"
          ],
          correct: 1,
          timeLimit: 60,
          basePoints: 100
        },
        {
          id: "alm-2",
          text: "What does a deployment pipeline primarily help teams do?",
          options: [
            "Replace the need for testing",
            "Promote solutions across environments with controlled stages",
            "Delete unused apps automatically",
            "Bypass security roles"
          ],
          correct: 1,
          timeLimit: 45,
          basePoints: 100
        },
        {
          id: "alm-3",
          text: "Before deploying a canvas app update to production, you should:",
          options: [
            "Skip validation if the change is small",
            "Test in dev/test and validate data connections and permissions",
            "Publish from a personal environment",
            "Rename the app only"
          ],
          correct: 1,
          timeLimit: 45,
          basePoints: 100
        }
      ]
    },
    {
      id: "sop",
      name: "SOP Chamber",
      icon: "📋",
      wireColor: "#f07178",
      description: "Standard operating procedures — the final lock between you and freedom.",
      questions: [
        {
          id: "sop-1",
          text: "A new production dataset is requested. According to typical SOP, what happens first?",
          options: [
            "Publish immediately to save time",
            "Submit a change request and get required approvals",
            "Share via anonymous link",
            "Copy from a colleague's desktop"
          ],
          correct: 1,
          timeLimit: 60,
          basePoints: 100
        },
        {
          id: "sop-2",
          text: "Where should governance decisions and exceptions be documented?",
          options: [
            "In private chat only",
            "In the approved register or ticket system defined by SOP",
            "Nowhere if everyone agrees verbally",
            "On a sticky note"
          ],
          correct: 1,
          timeLimit: 45,
          basePoints: 100
        },
        {
          id: "sop-3",
          text: "When an incident affects governed data assets, the SOP usually requires:",
          options: [
            "Silence until it fixes itself",
            "Timely reporting, containment, and post-incident review",
            "Deleting all logs",
            "Rotating blame across teams"
          ],
          correct: 1,
          timeLimit: 45,
          basePoints: 100
        }
      ]
    }
  ]
};
