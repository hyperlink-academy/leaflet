"use client";
import { removeDomainRoute } from "actions/domains";
import {
  useIdentityData,
  mutateIdentityData,
} from "components/IdentityProvider";
import type { CustomDomain } from "./DomainTab";
import { UnassignButton } from "./UnassignButton";
import { DomainVerification } from "./DomainVerification";
import { DeleteDomainButton } from "./DeleteDomainButton";
import { getLeafletTitle } from "src/utils/getLeafletTitle";
import { SpeedyLink } from "components/SpeedyLink";

export function LeafletDomain(props: { domain: CustomDomain }) {
  let { mutate: mutateIdentity } = useIdentityData();
  let domain = props.domain.domain;
  let routes = props.domain.custom_domain_routes;

  return (
    <>
      <div className="flex flex-col w-full opaque-container px-2 py-1">
        <div className="flex gap-2 items-center  ">
          <div className="grow truncate min-w-0 font-bold">{domain}</div>
          <DeleteDomainButton domain={domain} />
        </div>

        <div className="flex flex-col">
          <hr className="my-1 -mx-2" />

          {routes.map((route) => (
            <>
              <div
                key={route.id}
                className="flex gap-2 items-center justify-between"
              >
                <SpeedyLink
                  href={`/${route.edit_permission_token}`}
                  className="truncate min-w-0 text-tertiary no-underline! flex gap-2 hover:text-accent-contrast"
                >
                  <div className=" truncate min-w-0 ">{route.route}</div>

                  <div className="grow truncate min-w-0 italic">
                    -{" "}
                    {route.leaflet ? getLeafletTitle(route.leaflet) : undefined}
                  </div>
                </SpeedyLink>
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
    </>
  );
}
