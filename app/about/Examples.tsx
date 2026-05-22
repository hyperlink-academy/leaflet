import { GoToArrow } from "components/Icons/GoToArrow";
import { supabaseServerClient } from "supabase/serverClient";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { PubListing } from "app/(app)/(home-pages)/p/[didOrHandle]/PubListing";
import { idResolver } from "app/(app)/(home-pages)/reader/idResolver";
import { SpeedyLink } from "components/SpeedyLink";

const pubs = [
  "at://did:plc:e27b62phtzr3sjgs3zwdbctq/site.standard.publication/3lyevoglvs224", // zjsm.fm
  "at://did:plc:b2p6rujcgpenbtcjposmjuc3/site.standard.publication/3m3axfv5hms24", // Cosmik Labs
  "at://did:plc:x2xmijn2egk5g67u3cwkddzy/site.standard.publication/3m2avdoogvs2f", // Aaron Ross Powell's Blog
  "at://did:plc:qsn6ihzsby2lr2r3sl4z3bgf/site.standard.publication/3lunssrkwqc27", // Eva's Garden
  "at://did:plc:oyvx5qyivlj3s6fnbxpnadba/site.standard.publication/3m3bgolkrvs2c", // Cat Café
  "at://did:plc:bsxmru6yec5sy42azm7cnrqq/site.standard.publication/3lwk77r5y422r", // leaf litter
  "at://did:plc:2zmxikig2sj7gqaezl5gntae/site.standard.publication/3lusxwydhqs2i", // How Streamplace Works
  "at://did:plc:jl5dgp7xb34xfqlpywt7kcp5/site.standard.publication/3lx4aluuanc27", // hyper girl shares hyperlinks

  "at://did:plc:7kjkqt7amna7pih3lcvpf7g2/site.standard.publication/3lptkwbkdws2l", // Dreaming at the Edge of the Apocalypse
  "at://did:plc:lulmyldiq4sb2ikags5sfb25/site.standard.publication/3lw5apjilmc2v", // microcosm
  "at://did:plc:mdjhvva6vlrswsj26cftjttd/site.standard.publication/3lwyzotjqu22i", // Connected Places
];

async function getExamplePub(uri: string) {
  const { data: publications } = await supabaseServerClient
    .from("publications")
    .select("*")
    .eq("uri", uri)
    .limit(1);
  const publication = publications?.[0];
  if (!publication) return null;
  const record = normalizePublicationRecord(publication.record);
  if (!record) return null;
  const id = await idResolver.did.resolve(publication.identity_did);
  const authorProfile = id?.alsoKnownAs?.[0]
    ? { handle: `@${id.alsoKnownAs[0].slice(5)}` }
    : undefined;
  return { uri: publication.uri, record, authorProfile };
}

export const Examples = async () => {
  const examplePubs = (await Promise.all(pubs.map(getExamplePub))).filter(
    (pub): pub is NonNullable<typeof pub> => pub !== null,
  );

  const pubsWithMargins = examplePubs.map((pub) => ({
    ...pub,
    topMargin: `${Math.floor(Math.random() * 6) * 10}px`,
  }));

  const renderPub = (
    pub: (typeof pubsWithMargins)[number],
    keySuffix: string,
  ) => (
    <div
      key={`${pub.uri}-${keySuffix}`}
      aria-hidden={keySuffix === "dup" ? true : undefined}
      className="w-xs text-base shrink-0 flex flex-col mr-8 pb-2"
    >
      <div
        className="spacer w-full shrink-0"
        style={{ height: pub.topMargin }}
      />
      <PubListing
        uri={pub.uri}
        record={pub.record}
        authorProfile={pub.authorProfile}
      />
    </div>
  );

  return (
    <div className="aboutExamples mx-auto pt-32 sm:pt-48 text-center w-full">
      <h2>Loved by thousands of writers</h2>
      <SpeedyLink
        href="/reader"
        className="no-underline! flex gap-2 w-fit items-center font-bold text-[#57822B] mx-auto"
      >
        <p>Explore More</p>
        <GoToArrow className="scale-110" />
      </SpeedyLink>
      <div className="pubAndPostCarousel overflow-hidden pt-12 w-screen sm:-mx-12 -mx-4">
        <div className="pubAndPostCarouselTrack flex w-max">
          {pubsWithMargins.map((pub) => renderPub(pub, "orig"))}
          {pubsWithMargins.map((pub) => renderPub(pub, "dup"))}
        </div>
      </div>
    </div>
  );
};
