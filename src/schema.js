export const incidentTriageFormat = {
  type: "json_schema",
  retryCount: 2,
  schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "One paragraph summarizing what is happening and why it matters."
      },
      severity: {
        type: "string",
        enum: ["sev0", "sev1", "sev2", "sev3"],
        description: "Incident severity level."
      },
      confidence: {
        type: "number",
        description: "Confidence in the top hypothesis from 0 to 1."
      },
      user_impact: {
        type: "string",
        description: "Short description of the user-visible impact."
      },
      blast_radius: {
        type: "array",
        items: { type: "string" },
        description: "Affected systems, regions, tenants, or cohorts."
      },
      evidence: {
        type: "array",
        items: { type: "string" },
        description: "Concrete observations only."
      },
      hypotheses: {
        type: "array",
        items: {
          type: "object",
          properties: {
            rank: { type: "number" },
            title: { type: "string" },
            confidence: { type: "number" },
            why: { type: "string" },
            confirm_by: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["rank", "title", "confidence", "why"]
        },
        description: "Ranked hypotheses."
      },
      recommended_actions: {
        type: "array",
        items: { type: "string" },
        description: "Smallest safe next actions."
      },
      escalate_now: {
        type: "boolean",
        description: "Whether immediate escalation is warranted."
      },
      open_questions: {
        type: "array",
        items: { type: "string" },
        description: "Important unanswered questions."
      }
    },
    required: [
      "summary",
      "severity",
      "confidence",
      "user_impact",
      "blast_radius",
      "evidence",
      "hypotheses",
      "recommended_actions",
      "escalate_now",
      "open_questions"
    ]
  }
}
