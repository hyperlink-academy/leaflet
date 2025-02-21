"use server";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, inArray } from "drizzle-orm";
import postgres from "postgres";
import { entities, poll_votes_on_entity } from "drizzle/schema";
import { cookies } from "next/headers";
import { v7 } from "uuid";

export async function getPollData(entity_sets: string[]) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  let voter_token = cookies().get("poll_voter_token")?.value;

  const db = drizzle(client);
  const polls = await db
    .select({
      poll_votes_on_entity: {
        poll_entity: poll_votes_on_entity.poll_entity,
        voter_token: poll_votes_on_entity.voter_token,
        option_entity: poll_votes_on_entity.option_entity,
      },
    })
    .from(poll_votes_on_entity)
    .innerJoin(entities, eq(entities.id, poll_votes_on_entity.poll_entity))
    .where(and(inArray(entities.set, entity_sets)));

  let pollVotes = polls
    .reduce<
      Array<{
        poll_entity: string;
        votes: { option_entity: string; voter_token: string }[];
      }>
    >((acc, p) => {
      let x = acc.find(
        (a) => a.poll_entity === p.poll_votes_on_entity.poll_entity,
      );
      if (!x)
        acc.push({
          poll_entity: p.poll_votes_on_entity.poll_entity,
          votes: [p.poll_votes_on_entity],
        });
      else x.votes.push(p.poll_votes_on_entity);
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
        ...p.poll_votes_on_entity,
        voter_token:
          voter_token === p.poll_votes_on_entity.voter_token
            ? voter_token
            : undefined,
      },
    })),
    voter_token,
  };
}

export async function voteOnPoll(
  poll_entity: string,
  option_entities: string[],
) {
  let voter_token = cookies().get("poll_voter_token")?.value;
  if (!voter_token) {
    voter_token = v7();
    cookies().set("poll_voter_token", voter_token);
  }
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);

  const pollVote = await db
    .select()
    .from(poll_votes_on_entity)
    .where(eq(poll_votes_on_entity.poll_entity, poll_entity));

  if (
    pollVote.find((v) => {
      return v.voter_token === voter_token;
    })
  ) {
    await db
      .delete(poll_votes_on_entity)
      .where(
        and(
          eq(poll_votes_on_entity.voter_token, voter_token),
          eq(poll_votes_on_entity.poll_entity, poll_entity),
        ),
      );
  }

  await db.insert(poll_votes_on_entity).values(
    option_entities.map((option_entity) => ({
      option_entity,
      poll_entity,
      voter_token,
    })),
  );
}
