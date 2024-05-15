export default function DocumentPage(props: { params: { doc_id: string } }) {
  return <div className="text-blue-400">doc_id: {props.params.doc_id}</div>;
}
