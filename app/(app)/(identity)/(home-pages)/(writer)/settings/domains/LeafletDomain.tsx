"use client";
import { removeDomainRoute } from "actions/domains";
import {
  useIdentityData,
  mutateIdentityData,
} from "components/IdentityProvider";
import type { CustomDomain } from "./DomainList";
import { UnassignButton } from "./UnassignButton";
import { DomainVerification } from "./DomainVerification";
import { DeleteDomainButton } from "./DeleteDomainButton";
import { getLeafletTitle } from "src/utils/getLeafletTitle";

export function LeafletDomain(props: { domain: CustomDomain }) {
  let { mutate: mutateIdentity } = useIdentityData();
  let domain = props.domain.domain;
  let routes = props.domain.custom_domain_routes;

  return (
    <>
      <div className="flex flex-col gap-1 w-full ">
        <div className="flex gap-2 items-start">
          <div className="grow truncate min-w-0 font-bold">{domain}</div>
          <DeleteDomainButton domain={domain} />
        </div>
        <DomainVerification domain={domain} />
        <div className="flex flex-col gap-1 py-1">
          {routes.map((route) => (
            <>
              <div
                key={route.id}
                className="flex gap-2 items-center justify-between"
              >
                <a
                  href={`/${route.edit_permission_token}`}
                  className="truncate min-w-0 text-tertiary no-underline! flex gap-2"
                >
                  <div className="text-secondary truncate min-w-0 ">
                    {" "}
                    {route.route}
                  </div>

                  <div className="grow truncate min-w-0 italic">
                    -{" "}
                    {route.leaflet ? getLeafletTitle(route.leaflet) : undefined}
                  </div>
                </a>
                <UnassignButton
                  linked={route.route}
                  onUnassign={async () => {
                    mutateIdentityData(mutateIdentity, (draft) => {
                      let domainData = draft.custom_domains.find(
                        (d) => d.domain === domain,
                      );
                      if (domainData)
                        domainData.custom_domain_routes =
                          domainData.custom_domain_routes.filter(
                            (r) => r.id !== route.id,
                          );
                    });
                    await removeDomainRoute({ routeId: route.id });
                  }}
                />
              </div>
              <hr className="last:hidden border-dashed" />
            </>
          ))}
        </div>
      </div>
      <hr className="last:hidden" />
    </>
  );
}
