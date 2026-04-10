import type { CustomDomain } from "./DomainList";

export type DomainAssignment =
  | { type: "unassigned" }
  | { type: "publication" }
  | { type: "document"; routes: string[] };

export function getDomainAssignment(domain: CustomDomain): DomainAssignment {
  if (domain.publication_domains && domain.publication_domains.length > 0) {
    return { type: "publication" };
  }
  if (domain.custom_domain_routes && domain.custom_domain_routes.length > 0) {
    return {
      type: "document",
      routes: domain.custom_domain_routes.map((r) => r.route),
    };
  }
  return { type: "unassigned" };
}

export function describeAssignment(assignment: DomainAssignment): string {
  switch (assignment.type) {
    case "publication":
      return "publication";
    case "document":
      return assignment.routes.length === 1
        ? "1 leaflet"
        : `${assignment.routes.length} leaflets`;
    case "unassigned":
      return "";
  }
}
