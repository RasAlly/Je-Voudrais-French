/**
 * Grammar topics: a short explanation (sections with tables/examples) plus a
 * pool of drill questions. Hand-written so the rules and answers are reliable.
 *
 * Question sentences use "___" for the blank.
 */

export type GrammarQuestion =
  | {
      kind: "choice";
      prompt: string;
      sentence: string;
      options: string[];
      answer: string;
      en?: string;
      explain: string;
    }
  | {
      kind: "type";
      prompt: string;
      /** With "___" → type the missing part; without → type the whole answer. */
      sentence: string;
      /** Accepted answers; the first one is shown as the correct answer. */
      answer: string[];
      en?: string;
      explain: string;
    };

export interface GrammarSection {
  heading: string;
  body?: string;
  /** First row is the header row. */
  table?: string[][];
  examples?: { fr: string; en: string }[];
}

export interface GrammarTopic {
  id: string;
  title: string;
  en: string;
  summary: string;
  sections: GrammarSection[];
  questions: GrammarQuestion[];
}

/** The full French sentence for a question once answered (for read-aloud). */
export function answeredSentence(q: GrammarQuestion) {
  const a = q.kind === "choice" ? q.answer : q.answer[0];
  if (!q.sentence.includes("___")) return a;
  const s = q.sentence
    .replace(/\s*\([^)]*\)\s*$/, "") // drop hints like "(être)"
    .replace("___", a)
    .replace(/'\s+/g, "'");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const choice = (
  sentence: string,
  options: string[],
  answer: string,
  explain: string,
  extra: { prompt?: string; en?: string } = {},
): GrammarQuestion => ({
  kind: "choice",
  prompt: extra.prompt ?? "Fill in the blank",
  sentence,
  options,
  answer,
  explain,
  en: extra.en,
});

const blank = (
  sentence: string,
  answer: string | string[],
  explain: string,
  extra: { prompt?: string; en?: string } = {},
): GrammarQuestion => ({
  kind: "type",
  prompt: extra.prompt ?? "Type the missing word",
  sentence,
  answer: Array.isArray(answer) ? answer : [answer],
  explain,
  en: extra.en,
});

const rewrite = (
  prompt: string,
  sentence: string,
  answer: string | string[],
  explain: string,
  en?: string,
): GrammarQuestion => ({
  kind: "type",
  prompt,
  sentence,
  answer: Array.isArray(answer) ? answer : [answer],
  explain,
  en,
});

export const GRAMMAR: GrammarTopic[] = [
  // ---------------------------------------------------------------------------
  {
    id: "articles",
    title: "Les articles",
    en: "Articles & gender",
    summary: "le, la, l', les · un, une, des",
    sections: [
      {
        heading: "Every noun has a gender",
        body: "French nouns are masculine or feminine, and the article in front changes to match. Learn each new noun with its article: not just “maison”, but “la maison”.",
        table: [
          ["", "masculine", "feminine", "plural"],
          ["the", "le", "la", "les"],
          ["a / some", "un", "une", "des"],
        ],
        examples: [
          { fr: "le livre", en: "the book" },
          { fr: "la table", en: "the table" },
          { fr: "les enfants", en: "the children" },
          { fr: "une idée", en: "an idea" },
        ],
      },
      {
        heading: "l' before a vowel",
        body: "le and la both become l' before a vowel or a silent h. un and une never shorten.",
        examples: [
          { fr: "l'ami", en: "the (male) friend" },
          { fr: "l'école", en: "the school" },
          { fr: "l'hôtel", en: "the hotel" },
        ],
      },
      {
        heading: "Clues from the ending",
        body: "Not perfect, but very useful:",
        table: [
          ["usually feminine", "usually masculine"],
          ["-tion, -sion (la nation)", "-ment (le moment)"],
          ["-té (la liberté)", "-age (le fromage)*"],
          ["-ence, -ance (la chance)", "-eau (le bateau)*"],
          ["-ette, -ure (la voiture)", "-isme (le tourisme)"],
        ],
        examples: [{ fr: "*la plage, la page, l'image (f.) · l'eau, la peau (f.)", en: "common exceptions" }],
      },
    ],
    questions: [
      choice("___ livre", ["le", "la", "l'", "les"], "le", "livre is masculine → le livre."),
      choice("___ maison", ["le", "la", "l'", "les"], "la", "maison is feminine → la maison."),
      choice("___ école", ["le", "la", "l'", "les"], "l'", "école starts with a vowel, so la → l'école."),
      choice("___ enfants", ["le", "la", "l'", "les"], "les", "Plural nouns take les, whatever their gender."),
      choice(
        "___ hôtel",
        ["le", "la", "l'", "les"],
        "l'",
        "The h in hôtel is silent, so it acts like a vowel → l'hôtel.",
      ),
      choice("___ télévision", ["le", "la", "l'", "les"], "la", "Words ending in -sion are feminine → la télévision."),
      choice(
        "___ fromage",
        ["le", "la", "l'", "les"],
        "le",
        "Words ending in -age are usually masculine → le fromage.",
      ),
      choice(
        "___ information",
        ["le", "la", "l'", "les"],
        "l'",
        "information is feminine but starts with a vowel → l'information.",
      ),
      choice("J'ai ___ chat.", ["un", "une", "des"], "un", "chat is masculine → un chat.", { en: "I have a cat." }),
      choice("C'est ___ bonne idée.", ["un", "une", "des"], "une", "idée is feminine → une idée.", {
        en: "It's a good idea.",
      }),
      choice("Il y a ___ pommes sur la table.", ["un", "une", "des"], "des", "Plural “some” → des.", {
        en: "There are (some) apples on the table.",
      }),
      choice(
        "Nous avons ___ problème.",
        ["un", "une", "des"],
        "un",
        "problème is masculine even though it ends in -e → un problème.",
        { en: "We have a problem." },
      ),
      choice(
        "___ voiture de Paul est rouge.",
        ["Le", "La", "L'", "Les"],
        "La",
        "voiture (-ure) is feminine → la voiture.",
        { en: "Paul's car is red." },
      ),
      choice("Elle achète ___ fleurs.", ["un", "une", "des"], "des", "Plural “some” → des fleurs.", {
        en: "She's buying (some) flowers.",
      }),
      choice("___ moment", ["le", "la", "l'", "les"], "le", "Words ending in -ment are masculine → le moment."),
      choice("___ liberté", ["le", "la", "l'", "les"], "la", "Words ending in -té are feminine → la liberté."),
      rewrite("Translate", "the house", "la maison", "maison is feminine → la maison."),
      rewrite("Translate", "a coffee", "un café", "café is masculine → un café."),
      rewrite("Translate", "the friends", ["les amis", "les amies"], "Plural → les. (Spoken, the s links: les‿amis.)"),
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "etre-avoir",
    title: "Être et avoir",
    en: "To be & to have",
    summary: "The two most important verbs",
    sections: [
      {
        heading: "Present tense",
        body: "Both verbs are irregular, so learn them by heart. on (“we / people”) uses the same form as il and elle.",
        table: [
          ["", "être (to be)", "avoir (to have)"],
          ["je / j'", "je suis", "j'ai"],
          ["tu", "tu es", "tu as"],
          ["il / elle / on", "il est", "il a"],
          ["nous", "nous sommes", "nous avons"],
          ["vous", "vous êtes", "vous avez"],
          ["ils / elles", "ils sont", "ils ont"],
        ],
      },
      {
        heading: "Where English uses “to be”, French often uses avoir",
        body: "Age and many physical feelings use avoir.",
        examples: [
          { fr: "J'ai vingt ans.", en: "I'm twenty (years old)." },
          { fr: "J'ai faim. / J'ai soif.", en: "I'm hungry. / I'm thirsty." },
          { fr: "Il a froid. / Elle a chaud.", en: "He's cold. / She's hot." },
          { fr: "Nous avons peur.", en: "We're scared." },
        ],
      },
    ],
    questions: [
      blank("Je ___ fatigué. (être)", "suis", "je → je suis.", { prompt: "Conjugate the verb", en: "I'm tired." }),
      blank("Tu ___ français ? (être)", "es", "tu → tu es.", { prompt: "Conjugate the verb", en: "Are you French?" }),
      blank("Elle ___ médecin. (être)", "est", "elle → elle est.", {
        prompt: "Conjugate the verb",
        en: "She's a doctor.",
      }),
      blank("Nous ___ en retard. (être)", "sommes", "nous → nous sommes.", {
        prompt: "Conjugate the verb",
        en: "We're late.",
      }),
      blank("Vous ___ très gentils. (être)", "êtes", "vous → vous êtes.", {
        prompt: "Conjugate the verb",
        en: "You're very kind.",
      }),
      blank("Ils ___ à Paris. (être)", "sont", "ils → ils sont.", {
        prompt: "Conjugate the verb",
        en: "They're in Paris.",
      }),
      blank("___ un chien. (je, avoir)", ["j'ai"], "je + ai → j'ai (je shortens before a vowel).", {
        prompt: "Conjugate the verb",
        en: "I have a dog.",
      }),
      blank("Tu ___ un frère ? (avoir)", "as", "tu → tu as.", {
        prompt: "Conjugate the verb",
        en: "Do you have a brother?",
      }),
      blank("Il ___ froid. (avoir)", "a", "il → il a. Feeling cold uses avoir.", {
        prompt: "Conjugate the verb",
        en: "He's cold.",
      }),
      blank("Nous ___ faim. (avoir)", "avons", "nous → nous avons. Hunger uses avoir.", {
        prompt: "Conjugate the verb",
        en: "We're hungry.",
      }),
      blank("Vous ___ des questions ? (avoir)", "avez", "vous → vous avez.", {
        prompt: "Conjugate the verb",
        en: "Do you have any questions?",
      }),
      blank("Elles ___ deux enfants. (avoir)", "ont", "elles → elles ont.", {
        prompt: "Conjugate the verb",
        en: "They have two children.",
      }),
      blank("On ___ soif. (avoir)", "a", "on uses the il/elle form → on a.", {
        prompt: "Conjugate the verb",
        en: "We're thirsty.",
      }),
      choice("___ vingt-cinq ans.", ["Je suis", "J'ai"], "J'ai", "Age uses avoir: J'ai vingt-cinq ans.", {
        en: "I'm twenty-five.",
      }),
      choice("___ peur des araignées.", ["Je suis", "J'ai"], "J'ai", "Fear uses avoir: avoir peur.", {
        en: "I'm scared of spiders.",
      }),
      choice("Il ___ content.", ["est", "a"], "est", "Describing someone (an adjective) uses être.", {
        en: "He's happy.",
      }),
      choice("Elles ___ chaud.", ["sont", "ont"], "ont", "Feeling hot uses avoir: avoir chaud.", {
        en: "They're hot.",
      }),
      choice("Nous ___ étudiants.", ["sommes", "avons"], "sommes", "Saying what someone is uses être.", {
        en: "We're students.",
      }),
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "er-verbs",
    title: "Les verbes en -er",
    en: "Regular -er verbs",
    summary: "parler, aimer, habiter…",
    sections: [
      {
        heading: "The pattern",
        body: "Most French verbs end in -er and follow one pattern: drop -er, then add the ending. The -e, -es and -ent endings are all silent, so parle, parles and parlent sound the same.",
        table: [
          ["", "ending", "parler (to speak)"],
          ["je", "-e", "je parle"],
          ["tu", "-es", "tu parles"],
          ["il / elle / on", "-e", "il parle"],
          ["nous", "-ons", "nous parlons"],
          ["vous", "-ez", "vous parlez"],
          ["ils / elles", "-ent", "ils parlent"],
        ],
      },
      {
        heading: "Watch out",
        body: "je → j' before a vowel or silent h. Verbs in -ger and -cer change slightly with nous to keep their sound.",
        examples: [
          { fr: "j'aime, j'habite", en: "I like, I live" },
          { fr: "nous mangeons", en: "we eat (keeps the soft g)" },
          { fr: "nous commençons", en: "we begin (keeps the soft c)" },
        ],
      },
    ],
    questions: [
      blank("Je ___ français. (parler)", "parle", "je → -e: je parle.", {
        prompt: "Conjugate the verb",
        en: "I speak French.",
      }),
      blank("Tu ___ où ? (habiter)", "habites", "tu → -es: tu habites.", {
        prompt: "Conjugate the verb",
        en: "Where do you live?",
      }),
      blank("Il ___ le café. (aimer)", "aime", "il → -e: il aime.", {
        prompt: "Conjugate the verb",
        en: "He likes coffee.",
      }),
      blank("Nous ___ une pizza. (manger)", "mangeons", "-ger verbs keep an e with nous: nous mangeons.", {
        prompt: "Conjugate the verb",
        en: "We're eating a pizza.",
      }),
      blank("Nous ___ à huit heures. (commencer)", "commençons", "-cer verbs take ç with nous: nous commençons.", {
        prompt: "Conjugate the verb",
        en: "We start at eight.",
      }),
      blank("Vous ___ ensemble ? (travailler)", "travaillez", "vous → -ez: vous travaillez.", {
        prompt: "Conjugate the verb",
        en: "Do you work together?",
      }),
      blank("Elles ___ la radio. (écouter)", "écoutent", "elles → -ent: elles écoutent.", {
        prompt: "Conjugate the verb",
        en: "They're listening to the radio.",
      }),
      blank("Tu ___ la télé ? (regarder)", "regardes", "tu → -es: tu regardes.", {
        prompt: "Conjugate the verb",
        en: "Are you watching TV?",
      }),
      blank("Ils ___ beaucoup. (parler)", "parlent", "ils → -ent: ils parlent.", {
        prompt: "Conjugate the verb",
        en: "They talk a lot.",
      }),
      blank("Vous ___ quoi ? (chercher)", "cherchez", "vous → -ez: vous cherchez.", {
        prompt: "Conjugate the verb",
        en: "What are you looking for?",
      }),
      blank("On ___ au parc. (marcher)", "marche", "on uses the il form → on marche.", {
        prompt: "Conjugate the verb",
        en: "We're walking in the park.",
      }),
      blank("___ Paris. (je, aimer)", ["j'aime"], "je → j' before a vowel: j'aime.", {
        prompt: "Conjugate the verb",
        en: "I love Paris.",
      }),
      choice("Ils ___ anglais.", ["parle", "parles", "parlent", "parlez"], "parlent", "ils → -ent.", {
        prompt: "Pick the right form",
        en: "They speak English.",
      }),
      choice("Vous ___ ici ?", ["habite", "habitez", "habitons", "habitent"], "habitez", "vous → -ez.", {
        prompt: "Pick the right form",
        en: "Do you live here?",
      }),
      choice("Nous ___ la musique.", ["aime", "aimons", "aimez", "aiment"], "aimons", "nous → -ons.", {
        prompt: "Pick the right form",
        en: "We love music.",
      }),
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "negation",
    title: "La négation",
    en: "Negation",
    summary: "ne… pas, jamais, plus, rien",
    sections: [
      {
        heading: "ne … pas wraps the verb",
        body: "Put ne before the verb and pas after it. ne becomes n' before a vowel. In casual speech the ne is often dropped (“je sais pas”), but write it.",
        examples: [
          { fr: "Je ne parle pas allemand.", en: "I don't speak German." },
          { fr: "Il n'aime pas le thé.", en: "He doesn't like tea." },
        ],
      },
      {
        heading: "Other negatives work the same way",
        table: [
          ["", "meaning", "example"],
          ["ne … jamais", "never", "Je ne fume jamais."],
          ["ne … plus", "no longer, not anymore", "Il ne travaille plus ici."],
          ["ne … rien", "nothing", "Je ne vois rien."],
        ],
      },
      {
        heading: "un, une, des → de after a negative",
        body: "After a negative, un / une / des (and du / de la) become de, or d' before a vowel. The exception is être: “Ce n'est pas un problème.”",
        examples: [
          { fr: "J'ai un chat. → Je n'ai pas de chat.", en: "I have a cat. → I don't have a cat." },
          { fr: "Elle a des enfants. → Elle n'a pas d'enfants.", en: "She has children. → She doesn't have children." },
        ],
      },
    ],
    questions: [
      rewrite(
        "Make it negative",
        "Je parle anglais.",
        "Je ne parle pas anglais.",
        "ne before the verb, pas after.",
        "I don't speak English.",
      ),
      rewrite(
        "Make it negative",
        "Il aime le fromage.",
        "Il n'aime pas le fromage.",
        "ne → n' before a vowel: n'aime.",
        "He doesn't like cheese.",
      ),
      rewrite(
        "Make it negative",
        "Nous sommes fatigués.",
        "Nous ne sommes pas fatigués.",
        "ne before the verb, pas after.",
        "We're not tired.",
      ),
      rewrite(
        "Make it negative",
        "Tu habites ici.",
        "Tu n'habites pas ici.",
        "habites starts with a silent h → n'habites.",
        "You don't live here.",
      ),
      rewrite(
        "Make it negative",
        "J'ai un vélo.",
        "Je n'ai pas de vélo.",
        "un becomes de after a negative.",
        "I don't have a bike.",
      ),
      rewrite(
        "Make it negative",
        "Elle a des enfants.",
        "Elle n'a pas d'enfants.",
        "des becomes d' (before a vowel) after a negative.",
        "She doesn't have children.",
      ),
      rewrite(
        "Make it negative",
        "Ils mangent de la viande.",
        "Ils ne mangent pas de viande.",
        "de la also becomes de after a negative.",
        "They don't eat meat.",
      ),
      rewrite(
        "Make it negative",
        "C'est un problème.",
        "Ce n'est pas un problème.",
        "With être, un stays: ce n'est pas un problème.",
        "It's not a problem.",
      ),
      choice("Je ne fume ___.", ["pas", "jamais", "plus", "rien"], "jamais", "never → ne … jamais.", {
        prompt: "Pick the word",
        en: "I never smoke.",
      }),
      choice("Il ne travaille ___ ici.", ["pas", "jamais", "plus", "rien"], "plus", "not anymore → ne … plus.", {
        prompt: "Pick the word",
        en: "He doesn't work here anymore.",
      }),
      choice("Je ne vois ___.", ["pas", "jamais", "plus", "rien"], "rien", "nothing → ne … rien.", {
        prompt: "Pick the word",
        en: "I can't see anything.",
      }),
      choice("Je n'ai pas ___ voiture.", ["de", "une", "la"], "de", "une becomes de after a negative.", {
        en: "I don't have a car.",
      }),
      choice("Ce n'est pas ___ problème.", ["un", "de"], "un", "With être, un/une stay the same.", {
        en: "It's not a problem.",
      }),
      choice("Nous ___ allons pas au cinéma.", ["ne", "n'", "pas"], "n'", "ne → n' before the vowel in allons.", {
        en: "We're not going to the cinema.",
      }),
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "adjectives",
    title: "Les adjectifs",
    en: "Adjective agreement",
    summary: "petit, petite, petits, petites",
    sections: [
      {
        heading: "Adjectives match the noun",
        body: "Add -e for feminine and -s for plural. If the adjective already ends in -e, the feminine doesn't change (rouge, rouge). If it ends in -s or -x, the masculine plural doesn't change.",
        table: [
          ["", "singular", "plural"],
          ["masculine", "grand", "grands"],
          ["feminine", "grande", "grandes"],
        ],
        examples: [
          { fr: "un homme grand → une femme grande", en: "a tall man → a tall woman" },
          { fr: "des livres intéressants", en: "interesting books" },
        ],
      },
      {
        heading: "Common irregular feminines",
        table: [
          ["masculine", "feminine"],
          ["beau", "belle"],
          ["nouveau", "nouvelle"],
          ["vieux", "vieille"],
          ["bon", "bonne"],
          ["gentil", "gentille"],
          ["heureux", "heureuse"],
          ["sportif", "sportive"],
          ["blanc", "blanche"],
        ],
      },
      {
        heading: "Where they go",
        body: "Most adjectives come after the noun. A small group comes before — remember BAGS: Beauty (beau, joli), Age (jeune, vieux, nouveau), Goodness (bon, mauvais), Size (grand, petit). For a mixed group of men and women, use the masculine plural.",
        examples: [
          { fr: "une voiture rouge", en: "a red car" },
          { fr: "une petite maison", en: "a small house" },
          { fr: "Paul et Marie sont contents.", en: "Paul and Marie are happy." },
        ],
      },
    ],
    questions: [
      choice(
        "une robe ___ (vert)",
        ["vert", "verte", "verts", "vertes"],
        "verte",
        "robe is feminine singular → add -e.",
        { prompt: "Pick the right form", en: "a green dress" },
      ),
      choice(
        "des livres ___ (intéressant)",
        ["intéressant", "intéressante", "intéressants", "intéressantes"],
        "intéressants",
        "livres is masculine plural → add -s.",
        { prompt: "Pick the right form", en: "interesting books" },
      ),
      choice(
        "Les filles sont ___. (content)",
        ["content", "contente", "contents", "contentes"],
        "contentes",
        "filles is feminine plural → add -es.",
        { prompt: "Pick the right form", en: "The girls are happy." },
      ),
      choice("une ___ maison (beau)", ["beau", "belle", "beaux", "belles"], "belle", "beau → belle in the feminine.", {
        prompt: "Pick the right form",
        en: "a beautiful house",
      }),
      choice("C'est une ___ idée. (bon)", ["bon", "bonne", "bons", "bonnes"], "bonne", "bon doubles the n: bonne.", {
        prompt: "Pick the right form",
        en: "It's a good idea.",
      }),
      choice(
        "une femme ___ (heureux)",
        ["heureux", "heureuse", "heureuses"],
        "heureuse",
        "-eux → -euse in the feminine.",
        { prompt: "Pick the right form", en: "a happy woman" },
      ),
      choice(
        "Paul et Marie sont ___. (fatigué)",
        ["fatigué", "fatiguée", "fatigués", "fatiguées"],
        "fatigués",
        "A mixed group takes the masculine plural.",
        { prompt: "Pick the right form", en: "Paul and Marie are tired." },
      ),
      choice(
        "a red car",
        ["une rouge voiture", "une voiture rouge"],
        "une voiture rouge",
        "Colours go after the noun.",
        { prompt: "Which is correct?" },
      ),
      choice(
        "a small house",
        ["une petite maison", "une maison petite"],
        "une petite maison",
        "petit is a “size” adjective (BAGS) → before the noun.",
        { prompt: "Which is correct?" },
      ),
      choice(
        "an old man",
        ["un vieux homme", "un homme vieux", "un vieil homme"],
        "un vieil homme",
        "vieux becomes vieil before a vowel or silent h — a bonus rule!",
        { prompt: "Which is correct?" },
      ),
      blank("La soupe est ___. (chaud)", "chaude", "soupe is feminine → chaude.", {
        prompt: "Make it agree",
        en: "The soup is hot.",
      }),
      blank("Les chiens sont ___. (noir)", "noirs", "chiens is masculine plural → noirs.", {
        prompt: "Make it agree",
        en: "The dogs are black.",
      }),
      blank("Elle est très ___. (sportif)", "sportive", "-if → -ive in the feminine.", {
        prompt: "Make it agree",
        en: "She's very sporty.",
      }),
      blank("Les fleurs sont ___. (blanc)", "blanches", "blanc → blanche, plural blanches.", {
        prompt: "Make it agree",
        en: "The flowers are white.",
      }),
      blank("Mes amies sont ___. (gentil)", "gentilles", "gentil → gentille, plural gentilles.", {
        prompt: "Make it agree",
        en: "My (female) friends are kind.",
      }),
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "questions",
    title: "Poser des questions",
    en: "Asking questions",
    summary: "est-ce que, inversion, question words",
    sections: [
      {
        heading: "Three ways to ask a yes/no question",
        table: [
          ["style", "example"],
          ["Rising voice (casual)", "Tu parles français ?"],
          ["Est-ce que (everyday)", "Est-ce que tu parles français ?"],
          ["Inversion (formal)", "Parles-tu français ?"],
        ],
        body: "With inversion, the verb and pronoun swap and get a hyphen. If the verb ends in a vowel before il / elle / on, add -t- for sound: Parle-t-il français ?",
      },
      {
        heading: "Question words",
        table: [
          ["word", "meaning"],
          ["qui", "who"],
          ["que / qu'est-ce que", "what"],
          ["où", "where"],
          ["quand", "when"],
          ["comment", "how"],
          ["pourquoi", "why"],
          ["combien", "how much / how many"],
          ["quel, quelle, quels, quelles", "which / what (agrees with the noun)"],
        ],
        examples: [
          { fr: "Où est-ce que tu habites ?", en: "Where do you live?" },
          { fr: "Qu'est-ce que tu fais ?", en: "What are you doing?" },
          { fr: "Quelle heure est-il ?", en: "What time is it?" },
        ],
      },
    ],
    questions: [
      choice("___ est-ce que tu habites ?", ["Où", "Quand", "Qui", "Comment"], "Où", "where → où.", {
        prompt: "Pick the question word",
        en: "Where do you live?",
      }),
      choice("___ coûte ce livre ?", ["Combien", "Comment", "Pourquoi", "Qui"], "Combien", "how much → combien.", {
        prompt: "Pick the question word",
        en: "How much is this book?",
      }),
      choice(
        "___ heure est-il ?",
        ["Quel", "Quelle", "Quels", "Quelles"],
        "Quelle",
        "heure is feminine singular → quelle.",
        { prompt: "Pick the right form", en: "What time is it?" },
      ),
      choice(
        "___ est ton film préféré ?",
        ["Quel", "Quelle", "Quels", "Quelles"],
        "Quel",
        "film is masculine singular → quel.",
        { prompt: "Pick the right form", en: "What's your favourite film?" },
      ),
      choice(
        "___ tu fais ce soir ?",
        ["Qu'est-ce que", "Est-ce que", "Où est-ce que"],
        "Qu'est-ce que",
        "what … ? → qu'est-ce que.",
        { prompt: "Pick the right start", en: "What are you doing tonight?" },
      ),
      choice("___ tu apprends le français ?", ["Pourquoi", "Combien", "Quel", "Qui"], "Pourquoi", "why → pourquoi.", {
        prompt: "Pick the question word",
        en: "Why are you learning French?",
      }),
      choice("___ est-ce que tu arrives ?", ["Quand", "Quoi", "Quelle", "Qui"], "Quand", "when → quand.", {
        prompt: "Pick the question word",
        en: "When are you arriving?",
      }),
      choice(
        "___ s'appelle ton frère ?",
        ["Comment", "Combien", "Où", "Quel"],
        "Comment",
        "French asks “how is he called?” → comment.",
        { prompt: "Pick the question word", en: "What's your brother's name?" },
      ),
      rewrite(
        "Make a question with est-ce que",
        "Tu parles français.",
        "Est-ce que tu parles français ?",
        "Put est-ce que in front of the statement.",
        "Do you speak French?",
      ),
      rewrite(
        "Make a question with est-ce que",
        "Vous aimez le café.",
        "Est-ce que vous aimez le café ?",
        "Put est-ce que in front of the statement.",
        "Do you like coffee?",
      ),
      rewrite(
        "Make a question with est-ce que",
        "Il a une voiture.",
        ["Est-ce qu'il a une voiture ?"],
        "que → qu' before il: est-ce qu'il.",
        "Does he have a car?",
      ),
      rewrite(
        "Make an inversion question",
        "Vous habitez ici.",
        "Habitez-vous ici ?",
        "Swap the verb and pronoun, add a hyphen.",
        "Do you live here?",
      ),
      rewrite(
        "Make an inversion question",
        "Il parle anglais.",
        "Parle-t-il anglais ?",
        "parle ends in a vowel, so add -t- before il.",
        "Does he speak English?",
      ),
      rewrite(
        "Make an inversion question",
        "Tu es prêt.",
        "Es-tu prêt ?",
        "Swap the verb and pronoun, add a hyphen.",
        "Are you ready?",
      ),
    ],
  },
];

export const grammarById = new Map(GRAMMAR.map((t) => [t.id, t]));
