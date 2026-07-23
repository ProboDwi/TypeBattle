const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(random: () => number = Math.random): string {
  return Array.from({ length: 6 }, () => {
    const index = Math.min(
      ROOM_ALPHABET.length - 1,
      Math.floor(Math.max(0, random()) * ROOM_ALPHABET.length),
    );
    return ROOM_ALPHABET[index];
  }).join("");
}

export function isValidRoomCode(value: string): boolean {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(value);
}
