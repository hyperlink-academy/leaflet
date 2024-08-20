export default function UnsubscribePage(props: {
  params: { subscription_id: string };
}) {
  let action = async function () {
    "use server";
  };
  return (
    <div>
      <h1>Unsubscribe</h1>
      <form action={action}>
        <button type="submit">unsubscribe</button>
      </form>
    </div>
  );
}
