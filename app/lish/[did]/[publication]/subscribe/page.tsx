export default function SubscribePage() {
  let pubRecord = document.documents_in_publications[0]?.publications
    .record as PubLeafletPublication.Record;

  let hasPageBackground = !!pubRecord.theme?.showPageBackground;

  return (
    <PublicationThemeProvider
      record={pubRecord}
      pub_creator={
        document.documents_in_publications[0].publications.identity_did
      }
    >
      <PublicationBackgroundProvider
        record={pubRecord}
        pub_creator={
          document.documents_in_publications[0].publications.identity_did
        }
      >
        hello
      </PublicationBackgroundProvider>
    </PublicationThemeProvider>
  );
}
