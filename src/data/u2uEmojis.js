// U2U — Comprehensive Emoji Library & U2U Originals Dataset

export const U2U_ORIGINALS = [
  {
    id: 'u2u-heart',
    name: 'U2U Heart',
    token: ':u2u-heart:',
    keywords: ['heart', 'love', 'u2u', 'ember', 'private', 'connection', 'together', 'romance', 'couple'],
    description: 'Signature warm ember heart with central U2U peer connection'
  },
  {
    id: 'u2u-secret',
    name: 'U2U Secret',
    token: ':u2u-secret:',
    keywords: ['secret', 'lock', 'secure', 'private', 'confidential', 'safe', 'keyhole', 'hidden'],
    description: 'Obsidian lock cylinder with warm ember shackle and golden keyhole'
  },
  {
    id: 'u2u-connection',
    name: 'U2U Connection',
    token: ':u2u-connection:',
    keywords: ['connection', 'nodes', 'link', 'peers', 'two', 'connected', 'network', 'p2p'],
    description: 'Dual peer nodes united by a warm active pulse bridge'
  },
  {
    id: 'u2u-cipher',
    name: 'U2U Cipher',
    token: ':u2u-cipher:',
    keywords: ['cipher', 'shield', 'security', 'guard', 'defense', 'key', 'cryptography', 'private'],
    description: 'Geometric privacy shield defending a golden key emblem'
  },
  {
    id: 'u2u-eyes',
    name: 'U2U Private Eyes',
    token: ':u2u-eyes:',
    keywords: ['eyes', 'private', 'look', 'peek', 'see', 'watch', 'confidential', 'curious', 'visor'],
    description: 'Friendly curious eyes peering behind a confidentiality visor'
  },
  {
    id: 'u2u-shhh',
    name: 'U2U Shhh',
    token: ':u2u-shhh:',
    keywords: ['shhh', 'quiet', 'silence', 'secret', 'confidential', 'whisper', 'lips', 'hush'],
    description: 'Expressive smiling face with index finger to lips'
  },
  {
    id: 'u2u-together',
    name: 'U2U Together',
    token: ':u2u-together:',
    keywords: ['together', 'friends', 'duo', 'pair', 'hug', 'warmth', 'friendship', 'us', 'two'],
    description: 'Two smiling circle companions leaning together in solidarity'
  },
  {
    id: 'u2u-encrypted-heart',
    name: 'U2U Encrypted Heart',
    token: ':u2u-encrypted-heart:',
    keywords: ['heart', 'encrypted', 'love', 'safe', 'padlock', 'locked', 'trust', 'protected'],
    description: 'Warm ember heart secured by a top padlock clasp'
  },
  {
    id: 'u2u-connected',
    name: 'U2U Connected',
    token: ':u2u-connected:',
    keywords: ['connected', 'handshake', 'hands', 'trust', 'deal', 'agreement', 'partner', 'friend'],
    description: 'Two hands meeting in a friendly, trusting horizontal clasp'
  },
  {
    id: 'u2u-locked',
    name: 'U2U Locked',
    token: ':u2u-locked:',
    keywords: ['locked', 'padlock', 'lock', 'secure', 'tumbler', 'key', 'closed', 'safe'],
    description: 'Solid tumbler padlock with ember active LED indicator'
  },
  {
    id: 'u2u-spark',
    name: 'U2U Spark',
    token: ':u2u-spark:',
    keywords: ['spark', 'star', 'magic', 'sparkle', 'burst', 'idea', 'glow', 'twinkle', 'fire'],
    description: 'Four-pointed warm conversation starburst with golden core'
  },
  {
    id: 'u2u-love',
    name: 'U2U Love',
    token: ':u2u-love:',
    keywords: ['love', 'heart', 'face', 'smile', 'eyes', 'adoring', 'crush', 'romantic', 'happy'],
    description: 'Smiling round face with warm ember heart eyes'
  }
];

export const U2U_TOKEN_MAP = Object.fromEntries(
  U2U_ORIGINALS.map(item => [item.token, item])
);

// Top quick reactions shown in the 3-dot message menu
export const QUICK_REACTIONS = [
  ':u2u-heart:',
  '❤️',
  '🔥',
  '😂',
  ':u2u-shhh:',
  '👍',
  ':u2u-spark:'
];

// Complete Standard Unicode Emoji Categories
export const EMOJI_CATEGORIES = [
  {
    id: 'u2u-originals',
    label: 'U2U Originals',
    icon: 'sparkles',
    isOriginals: true,
    items: U2U_ORIGINALS
  },
  {
    id: 'smileys',
    label: 'Smileys & Emotion',
    icon: 'smile',
    items: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
      '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄',
      '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '😵‍💫', '🤯', '🤠',
      '🥳', '🥸', '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁', '☹️',
      '😮', '😯', '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰',
      '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫',
      '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩',
      '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹',
      '😻', '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊'
    ]
  },
  {
    id: 'people',
    label: 'People & Body',
    icon: 'user',
    items: [
      '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '🫷',
      '🫸', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙',
      '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊',
      '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏',
      '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻',
      '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄',
      '🫦', '💋', '🫂', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨',
      '🧔', '🧔‍♂️', '🧔‍♀️', '👩', '🧓', '👴', '👵', '🙍', '🙎', '🙅',
      '🙆', '💁', '🙋', '🧏', '🙇', '🤦', '🤷', '🧑‍⚕️', '🧑‍🎓', '🧑‍🏫',
      '🧑‍⚖️', '🧑‍🌾', '🧑‍🍳', '🧑‍🔧', '🧑‍🏭', '🧑‍💼', '🧑‍🔬', '🧑‍💻', '🧑‍🎤', '🧑‍🎨',
      '🧑‍✈️', '🧑‍🚀', '🧑‍🚒', '👮', '🕵️', '💂', '🥷', '👷', '🤴', '👸',
      '👳', '👲', '🧕', '🤵', '👰', '🤰', '🤱', '💃', '🕺', '🚶'
    ]
  },
  {
    id: 'animals',
    label: 'Animals & Nature',
    icon: 'paw',
    items: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨',
      '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🐒', '🐔', '🐧',
      '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗',
      '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰',
      '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎',
      '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟',
      '🐬', '🐳', '🐋', '🦈', '🐊', '🐆', '🐅', '🐃', '🐂', '🐄',
      '🦌', '🐪', '🐫', '🦙', '🦒', '🐘', '🦣', '🦏', '🦛', '🐁',
      '🐀', '🐇', '🐿️', '🦫', '🦔', '🌲', '🌳', '🌴', '🌵', '🌾',
      '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🪨', '🌸', '💮',
      '🪷', '🌺', '🌻', '🌼', '🌷', '🌹', '🥀', '🌱', '🪴', '🌲'
    ]
  },
  {
    id: 'food',
    label: 'Food & Drink',
    icon: 'utensils',
    items: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
      '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑',
      '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅',
      '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳',
      '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟',
      '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘',
      '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪',
      '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧',
      '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫',
      '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🫖',
      '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃',
      '🫗', '🥤', '🧋', '🧃', '🧉', '🧊'
    ]
  },
  {
    id: 'activities',
    label: 'Activities',
    icon: 'activity',
    items: [
      '⚽', '⚾', '🥎', '🏀', '🏐', '🏈', '🏉', '🎾', '🥏', '🎳',
      '🏏', '🏑', '🏒', '🥍', '🏓', '🏸', '🥊', '🥋', '🥅', '⛳',
      '⛸️', '🎣', '🤿', '🎽', '🎿', '🛷', '🥌', '🎯', '🪀', '🪁',
      '🔫', '🎱', '🔮', '🪄', '🎮', '🕹️', '🎰', '🎲', '🧩', '🧸',
      '🪅', '🪩', '🪆', '🃏', '🀄', '🎭', '🎨', '🧵', '🪡', '🧶',
      '🎪', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕',
      '🎻', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎟️', '🎫', '🎬'
    ]
  },
  {
    id: 'travel',
    label: 'Travel & Places',
    icon: 'car',
    items: [
      '🚗', '🚙', '🛻', '🚚', '🚛', '🚜', '🏎️', '🏍️', '🛵', '🚲',
      '🛴', '🛹', '🛼', '🛞', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡',
      '🚠', '🚟', '🚃', '🚋', '🚅', '🚄', '🚆', '🚇', '🚈', '🚉',
      '🚊', '🚝', '🚞', '🚢', '🛳️', '🛥️', '🚤', '⛴️', '⛵', '🛶',
      '⚓', '🛟', '✈️', '🛫', '🛬', '💺', '🚁', '🛰️', '🚀', '🛸',
      '🧳', '⌛', '⏳', '⌚', '⏰', '⏱️', '⏲️', '🕰️', '🗺️', '🧭',
      '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🏟️',
      '🏛️', '🏗️', '🧱', '🛖', '🏘️', '🏚️', '🏠', '🏡', '🏢', '🏣',
      '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰',
      '💒', '🗼', '🗽', '⛪', '🕌', '🛕', '⛩️', '🕋', '⛲', '⛺'
    ]
  },
  {
    id: 'objects',
    label: 'Objects',
    icon: 'lightbulb',
    items: [
      '💡', '🔦', '🏮', '🪔', '🕯️', '📱', '📲', '☎️', '📞', '📟',
      '📠', '🔋', '🪫', '🔌', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️',
      '💽', '💾', '💿', '📀', '🧮', '🎥', '🎞️', '📽️', '📺', '📷',
      '📸', '📹', '📼', '🔍', '🔎', '🔬', '🔭', '📡', '💸', '💵',
      '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🧰', '🔧',
      '🪛', '🔨', '⚒️', '🛠️', '⛏️', '🪓', '🪚', '🔩', '⚙️', '🪤',
      '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🔪', '🗡️', '⚔️', '🛡️',
      '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '🪞',
      '🪟', '🛎️', '🚪', '🛗', '🪑', '🛋️', '🛏️', '🛌', '🛍️', '🛒',
      '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '📦', '🏷️',
      '✉️', '📩', '📨', '📧', '💌', '📮', '📯', '📜', '📃', '📄',
      '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🪪',
      '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰',
      '📓', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🔗', '📎',
      '🖇️', '📐', '📏', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️',
      '🖍️', '📝', '✏️', '🔒', '🔓', '🔏', '🔐', '🗝️'
    ]
  },
  {
    id: 'symbols',
    label: 'Symbols',
    icon: 'heart',
    items: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '🩷',
      '🩵', '🩶', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
      '💝', '💟', '☮️', '✝️', '☪️', '🪯', '🕉️', '☸️', '✡️', '🔯',
      '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌',
      '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑',
      '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️',
      '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️',
      '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛',
      '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵',
      '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️',
      '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️',
      '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿',
      '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼',
      '🚻', '🚮', '🎦', '📶', '🈁', '🆖', '🆗', '🆙', '🆒', '🆕',
      '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣',
      '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '▶️', '⏸️', '⏹️', '⏺️',
      '⏭️', '⏮️', '⏩', '⏪', '🔼', '🔽', '⏫', '⏬', '➡️', '⬅️',
      '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '🔄', '🔃',
      '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️',
      '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜',
      '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫',
      '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🟥', '🟧',
      '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔉', '🔊',
      '🔇', '🔔', '🔕'
    ]
  },
  {
    id: 'flags',
    label: 'Flags',
    icon: 'flag',
    items: [
      '🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇺🇸', '🇬🇧', '🇨🇦',
      '🇦🇺', '🇩🇪', '🇫🇷', '🇮🇹', '🇪🇸', '🇯🇵', '🇰🇷', '🇨🇳', '🇮🇳', '🇧🇷',
      '🇲🇽', '🇿🇦', '🇳🇬', '🇪🇬', '🇸🇦', '🇦🇪', '🇹🇷', '🇷🇺', '🇺🇦', '🇮🇩',
      '🇵🇰', '🇵🇭', '🇻🇳', '🇹🇭', '🇲🇾', '🇸🇬', '🇮🇪', '🇳🇱', '🇧🇪', '🇨🇭',
      '🇦🇹', '🇸🇪', '🇳🇴', '🇩🇰', '🇫🇮', '🇵🇱', '🇬🇷', '🇵🇹', '🇳🇿', '🇦🇷'
    ]
  }
];

// Comprehensive search index mapping keywords to standard Unicode emojis
export const EMOJI_KEYWORD_INDEX = {
  love: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '🩷', '🩵', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '😍', '🥰', '😘', '🫶', '💏', '💑'],
  heart: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '🩷', '🩵', '🩶', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🫀', '😍', '🥰'],
  laugh: ['😂', '🤣', '😆', '😅', '😹', '😃', '😄', '😁', '😸'],
  smile: ['😊', '🙂', '😃', '😄', '😁', '🥰', '😇', '☺️', '😌', '😺', '😸'],
  fire: ['🔥', '🚒', '👨‍🚒', '🧯', '🧨', '🌋', '♨️', '🥵'],
  sad: ['😢', '😭', '🙁', '☹️', '😞', '😔', '🥺', '😿', '😥', '😓', '💔'],
  angry: ['😠', '😡', '🤬', '👿', '💢', '😤', '😾'],
  cat: ['🐱', '🐈', '🐈‍⬛', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
  dog: ['🐶', '🐕', '🦮', '🐕‍🦺', '🐩', '🐾', '🐺', '🦊'],
  car: ['🚗', '🚙', '🛻', '🏎️', '🚘', '🚖', '🏎️', '🚕', '🚓'],
  food: ['🍕', '🍔', '🍟', '🌭', '🍿', '🥪', '🌮', '🌯', '🥗', '🍝', '🍜', '🍣', '🍱', '🍩', '🍪', '🍫', '🍎', '🍓'],
  party: ['🎉', '🥳', '🎊', '🍾', '🪅', '🎈', '🎂', '🥂', '🍻', '🕺', '💃', '🪩'],
  kiss: ['😘', '😗', '😙', '😚', '💋', '🫦', '💏', '👩‍❤️‍💋‍👨', '👨‍❤️‍💋‍👨'],
  secret: ['🤫', '🤐', '🔒', '🗝️', '🕵️', '🔏', '🔐', '🛡️', '🕶️'],
  lock: ['🔒', '🔓', '🔏', '🔐', '🗝️', '🛡️'],
  happy: ['😊', '😀', '😃', '😄', '😁', '😆', '🥰', '😍', '🥳', '✨'],
  cry: ['😢', '😭', '😿', '🥺', '😥', '💧'],
  thumb: ['👍', '👎'],
  ok: ['👌', '🆗', '👍', '✅'],
  clap: ['👏', '🙌'],
  hand: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '✊', '👊', '👏', '🙌', '🫶', '🤝', '🙏'],
  wave: ['👋', '🌊'],
  muscle: ['💪', '🦾', '🏋️'],
  cool: ['😎', '🕶️', '🧊', '🤙', '🆒'],
  sleep: ['😴', '😪', '💤', '🛌', '🥱'],
  money: ['💰', '💵', '💸', '💳', '🪙', '🤑', '💎'],
  star: ['⭐', '🌟', '✨', '💫', '🌠', '🤩'],
  sun: ['☀️', '🌞', '🌅', '🌄', '🌤️'],
  moon: ['🌙', '🌕', '🌖', '🌗', '🌘', '🌑', '🌚'],
  music: ['🎵', '🎶', '🎧', '🎤', '🎸', '🎹', '🥁'],
  coffee: ['☕', '🧋', '🍵', '🫖'],
  beer: ['🍺', '🍻'],
  wine: ['🍷', '🥂', '🍾', '🍸', '🍹'],
  pizza: ['🍕'],
  burger: ['🍔'],
  check: ['✅', '✔️', '☑️'],
  warning: ['⚠️', '🚨', '⛔', '🚫', '🛑'],
  time: ['⏰', '⏱️', '⏳', '⌛', '🕰️', '⌚']
};

// Common Unicode emoji names for preview & tooltips
export const EMOJI_NAMES = {
  // Smileys
  '😀': 'Grinning Face', '😃': 'Grinning Face with Big Eyes', '😄': 'Grinning Face with Smiling Eyes',
  '😁': 'Beaming Face with Smiling Eyes', '😆': 'Grinning Squinting Face', '😅': 'Grinning Face with Sweat',
  '🤣': 'Rolling on the Floor Laughing', '😂': 'Face with Tears of Joy', '🙂': 'Slightly Smiling Face',
  '🙃': 'Upside-Down Face', '😉': 'Winking Face', '😊': 'Smiling Face with Smiling Eyes',
  '😇': 'Smiling Face with Halo', '🥰': 'Smiling Face with Hearts', '😍': 'Heart Eyes',
  '🤩': 'Star-Struck', '😘': 'Face Blowing a Kiss', '😗': 'Kissing Face', '😚': 'Kissing Face with Closed Eyes',
  '😙': 'Kissing Face with Smiling Eyes', '😋': 'Face Savoring Food', '😛': 'Face with Tongue',
  '😜': 'Winking Face with Tongue', '🤪': 'Zany Face', '😝': 'Squinting Face with Tongue',
  '🤑': 'Money-Mouth Face', '🤗': 'Smiling Face with Open Hands', '🤭': 'Face with Hand Over Mouth',
  '🤫': 'Shushing Face', '🤔': 'Thinking Face', '🤐': 'Zipper-Mouth Face', '🤨': 'Face with Raised Eyebrow',
  '😐': 'Neutral Face', '😑': 'Expressionless Face', '😶': 'Face Without Mouth', '😏': 'Smirking Face',
  '😒': 'Unamused Face', '🙄': 'Face with Rolling Eyes', '😬': 'Grimacing Face', '😮‍💨': 'Face Exhaling',
  '🤥': 'Lying Face', '😌': 'Relieved Face', '😔': 'Pensive Face', '😪': 'Sleepy Face',
  '🤤': 'Drooling Face', '😴': 'Sleeping Face', '😷': 'Face with Medical Mask', '🤒': 'Face with Thermometer',
  '🤕': 'Face with Head-Bandage', '🤢': 'Nauseated Face', '🤮': 'Face Vomiting', '🤧': 'Sneezing Face',
  '🥵': 'Hot Face', '🥶': 'Cold Face', '🥴': 'Woozy Face', '😵': 'Dizzy Face', '🤯': 'Exploding Head',
  '🤠': 'Cowboy Hat Face', '🥳': 'Partying Face', '🥸': 'Disguised Face', '😎': 'Smiling Face with Sunglasses',
  '🤓': 'Nerd Face', '🧐': 'Face with Monocle', '😕': 'Confused Face', '😟': 'Worried Face',
  '🙁': 'Slightly Frowning Face', '😮': 'Face with Open Mouth', '😯': 'Hushed Face', '😲': 'Astonished Face',
  '😳': 'Flushed Face', '🥺': 'Pleading Face', '😦': 'Frowning Face with Open Mouth',
  '😧': 'Anguished Face', '😨': 'Fearful Face', '😰': 'Anxious Face with Sweat', '😥': 'Sad but Relieved Face',
  '😢': 'Crying Face', '😭': 'Loudly Crying Face', '😱': 'Face Screaming in Fear', '😖': 'Confounded Face',
  '😣': 'Persevering Face', '😞': 'Disappointed Face', '😓': 'Downcast Face with Sweat', '😩': 'Weary Face',
  '😫': 'Tired Face', '🥱': 'Yawning Face', '😤': 'Face with Steam From Nose', '😡': 'Enraged Face',
  '😠': 'Angry Face', '🤬': 'Face with Symbols on Mouth', '😈': 'Smiling Face with Horns',
  '👿': 'Angry Face with Horns', '💀': 'Skull', '☠️': 'Skull and Crossbones', '💩': 'Pile of Poo',
  '🤡': 'Clown Face', '👹': 'Ogre', '👺': 'Goblin', '👻': 'Ghost', '👽': 'Alien', '🤖': 'Robot',
  '😺': 'Grinning Cat', '😸': 'Grinning Cat with Smiling Eyes', '😹': 'Cat with Tears of Joy',
  '😻': 'Smiling Cat with Heart-Eyes', '😼': 'Cat with Wry Smile', '😽': 'Kissing Cat',
  '🙀': 'Weary Cat', '😿': 'Crying Cat', '😾': 'Pouting Cat',

  // Hand gestures
  '👋': 'Waving Hand', '🤚': 'Raised Back of Hand', '🖐️': 'Hand with Fingers Splayed',
  '✋': 'Raised Hand', '🖖': 'Vulcan Salute', '👌': 'OK Hand', '🤌': 'Pinched Fingers',
  '🤏': 'Pinching Hand', '✌️': 'Victory Hand', '🤞': 'Crossed Fingers', '🫰': 'Hand with Index Finger and Thumb Crossed',
  '🤟': 'Love-You Gesture', '🤘': 'Sign of the Horns', '🤙': 'Call Me Hand', '👈': 'Backhand Index Pointing Left',
  '👉': 'Backhand Index Pointing Right', '👆': 'Backhand Index Pointing Up', '🖕': 'Middle Finger',
  '👇': 'Backhand Index Pointing Down', '☝️': 'Index Pointing Up', '👍': 'Thumbs Up', '👎': 'Thumbs Down',
  '✊': 'Raised Fist', '👊': 'Oncoming Fist', '🤛': 'Left-Facing Fist', '🤜': 'Right-Facing Fist',
  '👏': 'Clapping Hands', '🙌': 'Raising Hands', '🫶': 'Heart Hands', '👐': 'Open Hands',
  '🤲': 'Palms Up Together', '🤝': 'Handshake', '🙏': 'Folded Hands', '💪': 'Flexed Biceps',

  // Hearts & Symbols
  '❤️': 'Red Heart', '🧡': 'Orange Heart', '💛': 'Yellow Heart', '💚': 'Green Heart',
  '💙': 'Blue Heart', '💜': 'Purple Heart', '🖤': 'Black Heart', '🤍': 'White Heart',
  '🤎': 'Brown Heart', '🩷': 'Pink Heart', '🩵': 'Light Blue Heart', '🩶': 'Grey Heart',
  '💔': 'Broken Heart', '❣️': 'Heart Exclamation', '💕': 'Two Hearts', '💞': 'Revolving Hearts',
  '💓': 'Beating Heart', '💗': 'Growing Heart', '💖': 'Sparkling Heart', '💘': 'Heart with Arrow',
  '💝': 'Heart with Ribbon', '💟': 'Heart Decoration', '🔥': 'Fire', '✨': 'Sparkles',
  '⭐': 'Star', '🌟': 'Glowing Star', '💫': 'Dizzy Star', '🎉': 'Party Popper', '🎊': 'Confetti Ball',
  '🔒': 'Locked Padlock', '🔓': 'Unlocked Padlock', '🔏': 'Locked with Pen', '🔐': 'Locked with Key',
  '🗝️': 'Old Key', '🔑': 'Key', '🛡️': 'Shield', '☕': 'Hot Beverage', '🍺': 'Beer Mug',
  '🍕': 'Pizza', '🍔': 'Hamburger', '🚗': 'Automobile', '✈️': 'Airplane', '🚀': 'Rocket'
};

/**
 * Smart emoji search across U2U Originals and standard Unicode emojis
 */
export function searchEmojis(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    return { originals: [], standard: [] };
  }

  // 1. Match U2U Originals
  const matchedOriginals = U2U_ORIGINALS.filter(item =>
    item.name.toLowerCase().includes(q) ||
    item.id.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    item.keywords.some(k => k.includes(q) || q.includes(k))
  );

  // 2. Match standard emojis from keyword index
  const standardSet = new Set();

  for (const [keyword, emojis] of Object.entries(EMOJI_KEYWORD_INDEX)) {
    if (keyword.includes(q) || q.includes(keyword)) {
      emojis.forEach(e => standardSet.add(e));
    }
  }

  // 3. Match from category names
  EMOJI_CATEGORIES.forEach(cat => {
    if (cat.isOriginals) return;
    if (cat.label.toLowerCase().includes(q) || cat.id.toLowerCase().includes(q)) {
      cat.items.slice(0, 16).forEach(e => standardSet.add(e));
    }
  });

  return {
    originals: matchedOriginals,
    standard: Array.from(standardSet)
  };
}

/**
 * Get display name/details for any emoji token or unicode character
 */
export function getEmojiDetails(emojiValue) {
  if (!emojiValue) return null;

  // U2U Original
  if (emojiValue.startsWith(':u2u-') && emojiValue.endsWith(':')) {
    const origId = emojiValue.slice(1, -1);
    const item = U2U_ORIGINALS.find(o => o.id === origId || o.token === emojiValue);
    if (item) {
      return {
        isOriginal: true,
        id: item.id,
        name: item.name,
        description: item.description,
        token: item.token
      };
    }
  }

  // Standard Unicode Emoji
  const name = EMOJI_NAMES[emojiValue] || null;
  return {
    isOriginal: false,
    value: emojiValue,
    name: name || 'Emoji',
    description: null
  };
}

