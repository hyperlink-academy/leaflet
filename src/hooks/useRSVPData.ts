import { getRSVPData } from "actions/getRSVPData";
import { useReplicache } from "src/replicache";
import useSWR from "swr";

export function useRSVPData() {
  let { permission_token } = useReplicache();
  return useSWR(`identity`, () =>
    getRSVPData(
      permission_token.permission_token_rights.map((pr) => pr.entity_set),
    ),
  );
}
