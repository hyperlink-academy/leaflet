"use server";
import { cookies } from "next/headers";
import { v7 } from "uuid";
import { getIdentityData } from "./getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";

export async function getPollData(entity_sets: string[]) {
  let voter_token = (await cookies()).get("poll_voter_token")?.value;

  const { data: polls, error } = await supabaseServerClient
    .from("poll_votes_on_entity")
    .select(
      `
      poll_entity,
      voter_token,
      option_entity,
      entities!poll_votes_on_entity_poll_entity_fkey!inner(set)
    `,
    )
    .in("entities.set", entity_sets);

  if (error) throw error;

  let pollVotes = polls
    .reduce<
      Array<{
        poll_entity: string;
        votes: { option_entity: string; voter_token: string }[];
      }>
    >((acc, p) => {
      let x = acc.find((a) => a.poll_entity === p.poll_entity);
      if (!x)
        acc.push({
          poll_entity: p.poll_entity,
          votes: [p],
        });
      else x.votes.push(p);
      return acc;
    }, [])
    .map((poll) => {
      return {
        poll_entity: poll.poll_entity,
        unique_votes: poll.votes.reduce<string[]>((acc, v) => {
          if (!acc.includes(v.voter_token)) acc.push(v.voter_token);
          return acc;
        }, []).length,
        votesByOption: poll.votes.reduce<{
          [key: string]: number;
        }>((acc, v) => {
          if (!acc[v.option_entity]) acc[v.option_entity] = 0;
          acc[v.option_entity] = acc[v.option_entity] + 1;
          return acc;
        }, {}),
      };
    });

  return {
    pollVotes,
    polls: polls.map((p) => ({
      poll_votes_on_entity: {
        ...p,
        voter_token: voter_token === p.voter_token ? voter_token : undefined,
      },
    })),
    voter_token,
  };
}

export async function voteOnPoll(
  poll_entity: string,
  option_entities: string[],
) {
  let voter_token = (await cookies()).get("poll_voter_token")?.value;
  if (!voter_token) {
    let identity = await getIdentityData();
    if (identity) voter_token = identity.id;
    else voter_token = v7();
    (await cookies()).set("poll_voter_token", voter_token, {
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    });
  }
  const { data: existingVotes, error: selectError } = await supabaseServerClient
    .from("poll_votes_on_entity")
    .select("*")
    .eq("poll_entity", poll_entity);

  if (selectError) throw selectError;

  const existingVote = existingVotes?.find(
    (v) => v.voter_token === voter_token,
  );

  if (existingVote) {
    const { error: deleteError } = await supabaseServerClient
      .from("poll_votes_on_entity")
      .delete()
      .eq("voter_token", voter_token)
      .eq("poll_entity", poll_entity);

    if (deleteError) throw deleteError;
  }

  const { error: insertError } = await supabaseServerClient
    .from("poll_votes_on_entity")
    .insert(
      option_entities.map((option_entity) => ({
        option_entity,
        poll_entity,
        voter_token,
      })),
    );

  if (insertError) throw insertError;

  return;
}
