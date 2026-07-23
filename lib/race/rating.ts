export interface RatingCompetitor {
  id: string;
  rating: number;
  placement: number;
  dnf?: boolean;
  suspicious?: boolean;
}

export interface RatingChange extends RatingCompetitor {
  change: number;
  nextRating: number;
}

export function calculateRaceRatings(
  competitors: RatingCompetitor[],
  kFactor = 24,
  cap = 40,
): RatingChange[] {
  return competitors.map((player) => {
    if (player.dnf || player.suspicious || competitors.length < 2) {
      return { ...player, change: 0, nextRating: player.rating };
    }
    const opponents = competitors.filter(
      (opponent) => opponent.id !== player.id,
    );
    const expected =
      opponents.reduce(
        (total, opponent) =>
          total + 1 / (1 + 10 ** ((opponent.rating - player.rating) / 400)),
        0,
      ) / opponents.length;
    const actual =
      opponents.reduce((total, opponent) => {
        if (player.placement < opponent.placement) return total + 1;
        if (player.placement === opponent.placement) return total + 0.5;
        return total;
      }, 0) / opponents.length;
    const change = Math.max(
      -cap,
      Math.min(cap, Math.round(kFactor * (actual - expected))),
    );
    return {
      ...player,
      change,
      nextRating: Math.max(100, player.rating + change),
    };
  });
}
