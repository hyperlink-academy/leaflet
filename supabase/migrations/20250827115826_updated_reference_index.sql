CREATE INDEX CONCURRENTLY facts_reference_idx2 ON public.facts USING btree (((data ->> 'value'::text))) WHERE (((data ->> 'type'::text) = 'reference'::text) OR ((data ->> 'type'::text) = 'ordered-reference'::text) OR ((data ->> 'type'::text) = 'spatial-reference'::text));
drop index facts_reference_idx;
