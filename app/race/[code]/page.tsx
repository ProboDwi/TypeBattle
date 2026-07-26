import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import {
  RaceResults,
  type RaceResultView,
} from "@/components/race/race-results";
import {
  RaceRoomClient,
  type RaceParticipantView,
  type RaceRoomView,
} from "@/components/race/race-room-client";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Room Balapan" };

export default async function RaceRoomPage({
  params,
}: PageProps<"/race/[code]">) {
  const viewer = await requireUser();
  const { code } = await params;
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("race_rooms")
    .select(
      "id,code,name,host_id,status,visibility,max_players,difficulty,category_id,starts_at,typing_texts(id,title,content,difficulty)",
    )
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!room) notFound();
  const [{ data: rawParticipants }, { data: categories }] = await Promise.all([
    supabase
      .from("race_participants")
      .select(
        "id,user_id,is_ready,is_bot,bot_target_wpm,connection_status,race_status,progress,current_character,incorrect_keystrokes,total_keystrokes,last_sequence,wpm,placement,finish_nonce,profiles(username,display_name,avatar_seed,rating)",
      )
      .eq("race_room_id", room.id)
      .not("race_status", "in", "(left,kicked)")
      .order("joined_at"),
    supabase.from("text_categories").select("id,name").order("name"),
  ]);
  if (
    !rawParticipants?.some(
      (participant) => participant.user_id === viewer.user.id,
    )
  )
    notFound();
  const participants: RaceParticipantView[] = rawParticipants.map(
    (participant) => {
      const profile = participant.profiles as {
        username?: string;
        display_name?: string;
        avatar_seed?: string;
        rating?: number;
      } | null;
      return {
        id: String(participant.id),
        userId: String(participant.user_id),
        username: profile?.username ?? "player",
        displayName: profile?.display_name ?? "Pemain",
        avatarSeed: profile?.avatar_seed ?? String(participant.user_id),
        rating: Number(profile?.rating ?? 1000),
        isBot: Boolean(participant.is_bot),
        botTargetWpm: participant.bot_target_wpm
          ? Number(participant.bot_target_wpm)
          : null,
        isReady: Boolean(participant.is_ready),
        connectionStatus: String(participant.connection_status),
        raceStatus: String(participant.race_status),
        progress: Number(participant.progress),
        currentCharacter: Number(participant.current_character),
        incorrectKeystrokes: Number(participant.incorrect_keystrokes),
        totalKeystrokes: Number(participant.total_keystrokes),
        lastSequence: Number(participant.last_sequence),
        wpm: Number(participant.wpm ?? 0),
        placement: participant.placement ? Number(participant.placement) : null,
        finishNonce:
          participant.user_id === viewer.user.id
            ? String(participant.finish_nonce)
            : null,
      };
    },
  );
  if (room.status === "finished" || room.status === "cancelled") {
    const { data: rawResults } = await supabase
      .from("race_results")
      .select(
        "user_id,placement,wpm,accuracy,incorrect_keystrokes,duration_ms,rating_change",
      )
      .eq("race_room_id", room.id)
      .order("placement");
    const results: RaceResultView[] = participants.map((participant) => {
      const result = rawResults?.find(
        (item) => item.user_id === participant.userId,
      );
      return {
        userId: participant.userId,
        username: participant.username,
        displayName: participant.displayName,
        avatarSeed: participant.avatarSeed,
        isBot: participant.isBot,
        placement: result ? Number(result.placement) : null,
        wpm: result ? Number(result.wpm) : null,
        accuracy: result ? Number(result.accuracy) : null,
        errors: result ? Number(result.incorrect_keystrokes) : null,
        durationMs: result ? Number(result.duration_ms) : null,
        ratingChange: result ? Number(result.rating_change) : null,
        status: result ? "finished" : "dnf",
      };
    });
    return (
      <>
        <SiteHeader />
        <main className="page-shell min-h-[75vh] py-10">
          <RaceResults
            roomName={String(room.name)}
            code={String(room.code)}
            results={results}
          />
        </main>
      </>
    );
  }
  const rawText = room.typing_texts as {
    id?: string;
    title?: string;
    content?: string;
    difficulty?: string;
  } | null;
  const roomView: RaceRoomView = {
    id: String(room.id),
    code: String(room.code),
    name: String(room.name),
    hostId: String(room.host_id),
    status: String(room.status),
    visibility: room.visibility as "public" | "private",
    maxPlayers: Number(room.max_players),
    difficulty: room.difficulty ? String(room.difficulty) : null,
    categoryId: room.category_id ? String(room.category_id) : null,
    startsAt: room.starts_at ? String(room.starts_at) : null,
    text: rawText?.id
      ? {
          id: String(rawText.id),
          title: String(rawText.title),
          content: String(rawText.content),
          difficulty: String(rawText.difficulty),
        }
      : null,
  };
  return (
    <>
      <SiteHeader />
      <main className="page-shell min-h-[80vh] py-6 sm:py-10">
        <RaceRoomClient
          initialRoom={roomView}
          initialParticipants={participants}
          viewerId={viewer.user.id}
          categories={(categories ?? []).map((item) => ({
            id: String(item.id),
            name: String(item.name),
          }))}
        />
      </main>
    </>
  );
}
