-- Add tags column to leaflets_in_publications for publication drafts
ALTER TABLE "public"."leaflets_in_publications"
ADD COLUMN "tags" text[] DEFAULT ARRAY[]::text[];

-- Add tags column to leaflets_to_documents for standalone document drafts
ALTER TABLE "public"."leaflets_to_documents"
ADD COLUMN "tags" text[] DEFAULT ARRAY[]::text[];
