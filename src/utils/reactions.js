/**
 * U2U Message Reactions Logic
 * 
 * Invariants:
 * 1. Each user can have AT MOST ONE active reaction per message.
 * 2. Selecting a different reaction replaces the previous one.
 * 3. Selecting the currently active reaction toggles it off.
 * 4. Distinct users maintain their own independent reactions.
 */

/**
 * Applies or toggles a user's reaction on a message's reaction map.
 * 
 * @param {Record<string, string[]>} currentReactions - Map of emoji -> array of senderIds
 * @param {string} userId - The user performing the reaction
 * @param {string} newEmoji - The emoji token or unicode character
 * @returns {Record<string, string[]>} The new sanitized reactions map
 */
export function applyUserReaction(currentReactions = {}, userId, newEmoji) {
  if (!userId || !newEmoji) return currentReactions || {};

  const updated = {};

  if (currentReactions && typeof currentReactions === 'object') {
    for (const [key, senders] of Object.entries(currentReactions)) {
      if (Array.isArray(senders)) {
        // Strip userId from all existing reactions to ensure at most one reaction per user
        const filtered = senders.filter(id => id !== userId);
        if (filtered.length > 0) {
          updated[key] = filtered;
        }
      }
    }
  }

  // Check if the user already had this exact emoji active
  const hadThisEmoji = Boolean(
    currentReactions &&
    typeof currentReactions === 'object' &&
    Array.isArray(currentReactions[newEmoji]) &&
    currentReactions[newEmoji].includes(userId)
  );

  // If user already had this emoji -> toggle off (already removed from updated)
  // If user did not have this emoji -> replace previous reaction with newEmoji
  if (!hadThisEmoji) {
    if (!updated[newEmoji]) {
      updated[newEmoji] = [];
    }
    updated[newEmoji].push(userId);
  }

  return updated;
}

/**
 * Returns the single active emoji token/unicode that a user reacted with on a message, if any.
 * 
 * @param {Record<string, string[]>} reactions
 * @param {string} userId
 * @returns {string | null}
 */
export function getUserReaction(reactions = {}, userId) {
  if (!reactions || !userId || typeof reactions !== 'object') return null;
  for (const [emoji, senders] of Object.entries(reactions)) {
    if (Array.isArray(senders) && senders.includes(userId)) {
      return emoji;
    }
  }
  return null;
}
