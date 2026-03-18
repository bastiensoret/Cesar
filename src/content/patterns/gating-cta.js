export const GATING_CTA_PATTERNS = [
  // ---- FR: "Commente + emoji/mot" (strict form) ----
  {
    id: 'cta_comment_emoji',
    regex:
      /commente[zrs]?\s*[\"«»\u201C\u201D']?\s*[🔥💡🚀💥✅⚡️💰🙌👇❤️💜🖤💪🏆⭐️🎯🤖🧠🔄]+/gi,
    label: 'Asks to comment an emoji',
    weight: 35,
  },
  {
    id: 'cta_comment_word',
    regex: /commente[zrs]?\s*[\"«»\u201C\u201D']\s*\w{2,20}\s*[\"«»\u201C\u201D']/gi,
    label: 'Asks to comment a keyword',
    weight: 35,
  },

  // ---- FR: "Laisser un commentaire" + envoi (the Pierre E. pattern) ----
  {
    id: 'cta_laisser_commentaire',
    regex: /laisse[rzs]?\s+(un |ton |votre )?commentaires?/gi,
    label: 'Asks to leave a comment',
    weight: 30,
  },

  // ---- FR: "je t'envoie / je vous envoie / t'envoyer" + anything ----
  {
    id: 'cta_send_promise_fr',
    regex:
      /(je\s+(t['']|vous\s?)(envoie|partage|donne|file|transmets|enverrai)|pour que je puisse\s+t['']envoyer|je t['']envoie|et je t['']envoie)/gi,
    label: 'Promises to send a resource',
    weight: 30,
  },

  // ---- FR: "envoyer les ressources / le lien par MP/DM" ----
  {
    id: 'cta_send_by_mp',
    regex:
      /(envoyer|envoie|partager|transmettre).{0,30}(par |en |via )?(MP|DM|message priv|inbox|pv)/gi,
    label: 'Sends via DM',
    weight: 30,
  },

  // ---- FR: DM/MP standalone request ----
  {
    id: 'cta_dm_fr',
    regex:
      /(envoie|envoi|écris|contacte).{0,10}(moi|nous)?.{0,10}(en )?(DM|MP|message priv[ée]|inbox|pv)\b/gi,
    label: 'Redirects to DMs',
    weight: 25,
  },

  // ---- FR: "1ère relation" / "connexion" gating ----
  {
    id: 'cta_connection_gate',
    regex:
      /(1[eè]re relation|premi[eè]re relation|être connect[ée]|ajoute[zr]?.moi|connecte[zr]?.toi)/gi,
    label: 'Requires connection first',
    weight: 20,
  },

  // ---- FR: Like/follow/repost pour recevoir ----
  {
    id: 'cta_follow_like_repost',
    regex:
      /(like|aime|partage[zr]?|repost|repartage|follow|suis|abonne).{0,25}(pour recevoir|pour que je|et je t|pour avoir|pour obtenir)/gi,
    label: 'Like/follow/repost to receive',
    weight: 30,
  },

  // ---- FR: "ceux qui repostent" / "ceux qui commentent" ----
  {
    id: 'cta_ceux_qui',
    regex: /(ceux|celles) qui (repostent|commentent|partagent|likent|s['']abonnent)/gi,
    label: 'Rewards those who engage',
    weight: 25,
  },

  // ---- FR: "Lien en commentaire" ----
  {
    id: 'cta_link_in_comments',
    regex:
      /(lien|link)\s.{0,15}(en |dans (les? )?|in (the )?)(commentaire|comment|bio|profil)/gi,
    label: 'Link in comments',
    weight: 20,
  },

  // ---- FR: Combo "commentaire + envoie" dans la même phrase ----
  {
    id: 'cta_comment_then_send',
    regex:
      /commentaire.{0,30}(je t|et je|pour que).{0,20}(envoie|partage|donne|transmets)/gi,
    label: "Comment and I'll send",
    weight: 35,
  },

  // ---- EN: Comment + emoji ----
  {
    id: 'cta_comment_emoji_en',
    regex:
      /comment\s*[\"«»\u201C\u201D']?\s*[🔥💡🚀💥✅⚡️💰🙌👇❤️💜🖤💪🏆⭐️🎯🤖🧠🔄]+/gi,
    label: 'Asks to comment an emoji',
    weight: 35,
  },
  {
    id: 'cta_comment_word_en',
    regex:
      /comment\s*[\"«»\u201C\u201D']\s*\w{2,20}\s*[\"«»\u201C\u201D']\s*(below|and|to|for)/gi,
    label: 'Asks to comment a keyword',
    weight: 35,
  },

  // ---- EN: Send promise ----
  {
    id: 'cta_send_promise_en',
    regex:
      /(I['']ll\s+(send|share|give|DM)|send you|DM me|I['']ll DM).{0,25}(the link|the resource|the guide|the template|the doc|the file|the prompt|the repo|it to you|everyone)/gi,
    label: 'Promises to send a resource',
    weight: 30,
  },

  // ---- EN: "Leave a comment" / "drop a comment" ----
  {
    id: 'cta_leave_comment_en',
    regex: /(leave|drop)\s+a\s+comment/gi,
    label: 'Asks to leave a comment',
    weight: 30,
  },
];
