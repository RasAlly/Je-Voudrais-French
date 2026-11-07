/**
 * Course content. Each item is a word or phrase; the app generates
 * exercises (listen, choose, translate, arrange, speak) from these.
 *
 * Add new lessons here — item ids must be globally unique and stable,
 * since spaced-repetition progress is keyed on them.
 */
export interface Item {
  id: string;
  fr: string;
  en: string;
  /** Other acceptable English answers */
  alt?: string[];
  /** Short grammar / usage note shown when the item is introduced */
  note?: string;
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  items: Item[];
}

export interface Unit {
  id: string;
  title: string;
  /** English translation of the title */
  en: string;
  lessons: Lesson[];
}

export const curriculum: Unit[] = [
  {
    id: "u1",
    title: "Les bases",
    en: "The basics",
    lessons: [
      {
        id: "greetings",
        title: "Salutations",
        subtitle: "Hello & goodbye",
        items: [
          { id: "bonjour", fr: "bonjour", en: "hello", alt: ["good morning", "good day"] },
          { id: "salut", fr: "salut", en: "hi", alt: ["bye"], note: "Informal — use with friends." },
          { id: "bonsoir", fr: "bonsoir", en: "good evening" },
          { id: "au-revoir", fr: "au revoir", en: "goodbye", alt: ["bye"] },
          { id: "a-bientot", fr: "à bientôt", en: "see you soon" },
          { id: "bonne-nuit", fr: "bonne nuit", en: "good night" },
          { id: "ca-va", fr: "ça va ?", en: "how are you?", alt: ["how's it going?", "are you ok?"] },
          { id: "ca-va-bien", fr: "ça va bien, merci", en: "I'm doing well, thanks", alt: ["i'm well, thank you", "i am fine, thanks"] },
        ],
      },
      {
        id: "politeness",
        title: "La politesse",
        subtitle: "Please, thank you, sorry",
        items: [
          { id: "merci", fr: "merci", en: "thank you", alt: ["thanks"] },
          { id: "merci-beaucoup", fr: "merci beaucoup", en: "thank you very much", alt: ["thanks a lot"] },
          { id: "svp", fr: "s'il vous plaît", en: "please", note: "Formal / plural. Informal: s'il te plaît." },
          { id: "de-rien", fr: "de rien", en: "you're welcome", alt: ["no problem"] },
          { id: "excusez-moi", fr: "excusez-moi", en: "excuse me" },
          { id: "pardon", fr: "pardon", en: "sorry", alt: ["pardon", "excuse me"] },
          { id: "oui", fr: "oui", en: "yes" },
          { id: "non", fr: "non", en: "no" },
        ],
      },
    ],
  },
  {
    id: "u2",
    title: "Se présenter",
    en: "Introducing yourself",
    lessons: [
      {
        id: "intro",
        title: "Je m'appelle…",
        subtitle: "Introducing yourself",
        items: [
          { id: "je-mappelle", fr: "je m'appelle Paul", en: "my name is Paul", alt: ["i am called paul"] },
          { id: "comment-tu", fr: "comment tu t'appelles ?", en: "what's your name?", alt: ["what is your name?"], note: "Informal. Formal: comment vous appelez-vous ?" },
          { id: "enchante", fr: "enchanté", en: "nice to meet you", alt: ["pleased to meet you"], note: "A woman writes enchantée — same pronunciation." },
          { id: "je-suis", fr: "je suis", en: "I am" },
          { id: "jhabite", fr: "j'habite à Paris", en: "I live in Paris" },
          { id: "je-viens", fr: "je viens des États-Unis", en: "I come from the United States", alt: ["i am from the united states", "i'm from the us"] },
          { id: "je-parle", fr: "je parle un peu français", en: "I speak a little French" },
        ],
      },
      {
        id: "numbers",
        title: "Les nombres",
        subtitle: "One to ten",
        items: [
          { id: "n1", fr: "un", en: "one", alt: ["1", "a"] },
          { id: "n2", fr: "deux", en: "two", alt: ["2"] },
          { id: "n3", fr: "trois", en: "three", alt: ["3"] },
          { id: "n4", fr: "quatre", en: "four", alt: ["4"] },
          { id: "n5", fr: "cinq", en: "five", alt: ["5"] },
          { id: "n6", fr: "six", en: "six", alt: ["6"] },
          { id: "n7", fr: "sept", en: "seven", alt: ["7"] },
          { id: "n8", fr: "huit", en: "eight", alt: ["8"] },
          { id: "n9", fr: "neuf", en: "nine", alt: ["9"] },
          { id: "n10", fr: "dix", en: "ten", alt: ["10"] },
        ],
      },
    ],
  },
  {
    id: "u3",
    title: "Au café",
    en: "At the café",
    lessons: [
      {
        id: "cafe",
        title: "Au café",
        subtitle: "Ordering a drink",
        items: [
          { id: "un-cafe", fr: "un café", en: "a coffee" },
          { id: "un-the", fr: "un thé", en: "a tea" },
          { id: "de-leau", fr: "de l'eau", en: "some water", alt: ["water"] },
          { id: "un-croissant", fr: "un croissant", en: "a croissant" },
          { id: "le-pain", fr: "le pain", en: "the bread", alt: ["bread"] },
          { id: "je-voudrais", fr: "je voudrais un café", en: "I would like a coffee", alt: ["i'd like a coffee"], note: "Je voudrais is the polite way to order." },
          { id: "laddition", fr: "l'addition, s'il vous plaît", en: "the check, please", alt: ["the bill, please"] },
          { id: "cest-combien", fr: "c'est combien ?", en: "how much is it?", alt: ["how much?"] },
        ],
      },
      {
        id: "food",
        title: "La nourriture",
        subtitle: "Food basics",
        items: [
          { id: "le-fromage", fr: "le fromage", en: "the cheese", alt: ["cheese"] },
          { id: "la-pomme", fr: "la pomme", en: "the apple", alt: ["apple"] },
          { id: "le-vin", fr: "le vin", en: "the wine", alt: ["wine"] },
          { id: "le-poulet", fr: "le poulet", en: "the chicken", alt: ["chicken"] },
          { id: "jai-faim", fr: "j'ai faim", en: "I'm hungry", alt: ["i am hungry"], note: "Literally “I have hunger” — French uses avoir." },
          { id: "jai-soif", fr: "j'ai soif", en: "I'm thirsty", alt: ["i am thirsty"] },
          { id: "cest-delicieux", fr: "c'est délicieux", en: "it's delicious", alt: ["it is delicious"] },
        ],
      },
    ],
  },
  {
    id: "u4",
    title: "En ville",
    en: "In town",
    lessons: [
      {
        id: "directions",
        title: "Les directions",
        subtitle: "Finding your way",
        items: [
          { id: "ou-est", fr: "où est la gare ?", en: "where is the train station?", alt: ["where is the station?"] },
          { id: "a-gauche", fr: "à gauche", en: "on the left", alt: ["left", "to the left"] },
          { id: "a-droite", fr: "à droite", en: "on the right", alt: ["right", "to the right"] },
          { id: "tout-droit", fr: "tout droit", en: "straight ahead", alt: ["straight"] },
          { id: "pres-dici", fr: "près d'ici", en: "near here", alt: ["nearby", "close by"] },
          { id: "loin", fr: "loin", en: "far" },
          { id: "je-suis-perdu", fr: "je suis perdu", en: "I'm lost", alt: ["i am lost"], note: "A woman says je suis perdue." },
        ],
      },
      {
        id: "verbs1",
        title: "Verbes essentiels",
        subtitle: "To be, to have, to go",
        items: [
          { id: "tu-es", fr: "tu es", en: "you are" },
          { id: "il-est", fr: "il est", en: "he is", alt: ["it is"] },
          { id: "jai", fr: "j'ai", en: "I have" },
          { id: "nous-avons", fr: "nous avons", en: "we have" },
          { id: "je-vais", fr: "je vais", en: "I go", alt: ["i am going", "i'm going"] },
          { id: "on-y-va", fr: "on y va !", en: "let's go!", alt: ["let's go"] },
          { id: "je-fais", fr: "je fais", en: "I do", alt: ["i make"] },
          { id: "je-comprends-pas", fr: "je ne comprends pas", en: "I don't understand", alt: ["i do not understand"] },
        ],
      },
      {
        id: "time",
        title: "Le temps",
        subtitle: "Days & time words",
        items: [
          { id: "aujourdhui", fr: "aujourd'hui", en: "today" },
          { id: "demain", fr: "demain", en: "tomorrow" },
          { id: "hier", fr: "hier", en: "yesterday" },
          { id: "lundi", fr: "lundi", en: "Monday" },
          { id: "vendredi", fr: "vendredi", en: "Friday" },
          { id: "le-week-end", fr: "le week-end", en: "the weekend", alt: ["weekend"] },
          { id: "quelle-heure", fr: "quelle heure est-il ?", en: "what time is it?" },
        ],
      },
    ],
  },
];

export const itemsById = new Map<string, Item>();
export const lessonsById = new Map<string, Lesson>();
/** item id → the unit it belongs to (used for flashcard decks) */
export const unitOfItem = new Map<string, string>();
for (const unit of curriculum) {
  for (const lesson of unit.lessons) {
    lessonsById.set(lesson.id, lesson);
    for (const item of lesson.items) {
      itemsById.set(item.id, item);
      unitOfItem.set(item.id, unit.id);
    }
  }
}
