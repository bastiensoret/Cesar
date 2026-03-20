export const THIRD_PARTY_PATTERNS = [
  {
    id: 'tp_launched_fr',
    regex:
      /([\p{L}\w\s]{2,30})\s+(vient de|viennent de)\s+(sortir|lancer|publier|créer|dévoiler|annoncer|release)/giu,
    label: 'Third-party launch mentioned',
    weight: 35,
  },
  {
    id: 'tp_has_created_fr',
    regex:
      /([\p{L}\w\s]{2,20})\s+(a créé|a sorti|a lancé|a développé|a publié|a release|a déployé|a open.?sourcé)/giu,
    label: 'Third-party creation mentioned',
    weight: 35,
  },
  {
    id: 'tp_project_of_fr',
    regex:
      /(le projet|l['']outil|la plateforme|le plugin|l['']extension|le repo|le framework)\s+(de|d['']|by)\s+/gi,
    label: "References someone else's project",
    weight: 30,
  },
  {
    id: 'tp_official_fr',
    regex:
      /(doc(umentation)?\s+officielle|site officiel|page officielle|repo officiel|github officiel)/gi,
    label: 'References official documentation',
    weight: 25,
  },
  {
    id: 'tp_launched_en',
    regex:
      /([\p{L}\w\s]{2,30})\s+(just launched|just released|just dropped|just announced|just shipped|just open.?sourced)/giu,
    label: 'References a third-party launch',
    weight: 35,
  },
  {
    id: 'tp_has_created_en',
    regex:
      /([\p{L}\w\s]{2,20})\s+(created|built|released|launched|published|shipped|open.?sourced)\s+(a |an |the |this )/giu,
    label: "References someone else's creation",
    weight: 35,
  },
  {
    id: 'tp_known_tool',
    regex:
      /\b(Google|OpenAI|Anthropic|Microsoft|Meta|Apple|Amazon|AWS|Notion|Figma|Canva|Zapier|Make\.com|n8n|Airtable|Stripe|Vercel|Supabase|HubSpot|Salesforce)\b.{0,40}(vient de|a sorti|a lancé|a créé|just|released|launched|new|nouveau|nouvelle)/gi,
    label: 'Major company launch mentioned',
    weight: 30,
  },
  {
    id: 'tp_known_product',
    regex:
      /\b(Claude Code|ChatGPT|GPT-?[45o]|Gemini|Copilot|Midjourney|DALL[·\-]?E|Sora|Cursor|Windsurf|Bolt|v0|Lovable|Replit Agent|Devin|Google Workspace CLI|MCP)\b/gi,
    label: 'Known third-party product mentioned',
    weight: 20,
  },
  {
    id: 'tp_repackage_fr',
    regex:
      /(je (te |vous )?(résume|récapitule|explique|décortique|décompose|vulgarise|traduis|simplifie))\s.{0,30}(l['']outil|le projet|la mise à jour|la feature|la nouvelle|le nouveau)/gi,
    label: 'Summarizes third-party content',
    weight: 25,
  },
  {
    id: 'tp_repackage_en',
    regex:
      /(I (broke down|summarized|simplified|explained|unpacked|decoded))\s.{0,30}(the tool|the project|the update|the feature|the new|their)/gi,
    label: 'Summarizes third-party content',
    weight: 25,
  },
  {
    id: 'tp_hype_fr',
    regex:
      /(dinguerie|game.?changer|révolution|pépite|bombe|ouf|fou|incroyable|énorme|monstrueux).{0,30}(outil|tool|projet|produit|update|feature|lancement|release)/gi,
    label: 'Hype around third-party product',
    weight: 15,
  },
];
